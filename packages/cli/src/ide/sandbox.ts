import { Worker } from 'node:worker_threads';
import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';

const SANDBOX_DIR = '.ai/sandbox';

export interface SandboxRequest {
  code: string;
  language?: 'javascript' | 'typescript' | 'shell';
  timeout?: number;
  files?: Record<string, string>;
}

export interface SandboxResult {
  ok: boolean;
  output: string;
  error: string;
  durationMs: number;
  memoryMb: number;
}

function getSandboxDir(root: string): string {
  const dir = path.join(root, SANDBOX_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function workerScript(): string {
  return `
const { parentPort } = require('worker_threads');

Object.freeze(Object.prototype);
Object.freeze(Function.prototype);

parentPort.on('message', async (msg) => {
  const start = Date.now();
  const memStart = process.memoryUsage().heapUsed;

  try {
    let result = '';

    if (msg.language === 'shell') {
      const { execFile } = require('child_process');
      const [cmd, ...args] = parseCommand(msg.code);
      result = await new Promise((resolve, reject) => {
        execFile(cmd, args, {
          encoding: 'utf8',
          timeout: msg.timeout || 10000,
          maxBuffer: 1024 * 1024,
          windowsHide: true,
        }, (err, stdout) => {
          if (err) reject(err.message);
          else resolve(stdout.trim());
        });
      });
    } else {
      const vm = require('vm');
      const sandbox = {
        console: {
          log: (...args) => { result += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\\n'; },
          error: (...args) => { result += '[error] ' + args.map(String).join(' ') + '\\n'; },
        },
        Math, JSON, Date, Array, String, Number, Boolean, Map, Set, RegExp, Error,
        setTimeout: (fn, ms) => { const t = setTimeout(fn, Math.min(ms || 0, 5000)); },
        clearTimeout,
        setInterval: () => { throw new Error('setInterval not allowed in sandbox'); },
        require: () => { throw new Error('require not allowed in sandbox'); },
        process: undefined,
        global: undefined,
        globalThis: undefined,
      };
      const context = vm.createContext(sandbox);
      const script = new vm.Script('"use strict"; ' + msg.code);
      const fnResult = script.runInContext(context, { timeout: msg.timeout || 10000 });
      if (fnResult !== undefined) {
        result += String(fnResult);
      }
    }

    const memEnd = process.memoryUsage().heapUsed;
    parentPort.postMessage({
      ok: true,
      output: result || '',
      error: '',
      durationMs: Date.now() - start,
      memoryMb: Math.round((memEnd - memStart) / 1024 / 1024 * 100) / 100,
    });
  } catch (_err) {
    parentPort.postMessage({
      ok: false,
      output: '',
      error: err.message || String(err),
      durationMs: Date.now() - start,
      memoryMb: 0,
    });
  }
});

function parseCommand(command) {
  const parts = command.match(/(?:[^\\s"]+|"[^"]*")+/g) || [command];
  const cmd = (parts[0] || '').replace(/"/g, '');
  const args = parts.slice(1).map(a => a.replace(/"/g, ''));
  return [cmd, ...args];
}
`;
}

export async function runInSandbox(root: string, request: SandboxRequest): Promise<SandboxResult> {
  const sandboxDir = getSandboxDir(root);
  const workerFile = path.join(sandboxDir, 'sandbox-worker.js');
  fs.writeFileSync(workerFile, workerScript(), 'utf8');

  return new Promise((resolve) => {
    const start = Date.now();

    const worker = new Worker(workerFile, {
      resourceLimits: {
        maxOldGenerationSizeMb: 64,
        maxYoungGenerationSizeMb: 16,
        codeRangeSizeMb: 8,
      },
    });

    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        ok: false,
        output: '',
        error: `Sandbox timeout after ${(request.timeout || 15000) / 1000}s`,
        durationMs: Date.now() - start,
        memoryMb: 0,
      });
    }, (request.timeout || 15000) + 1000);

    worker.on('message', (result: SandboxResult) => {
      clearTimeout(timer);
      resolve(result);
      worker.terminate();
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, output: '', error: err.message, durationMs: Date.now() - start, memoryMb: 0 });
    });

    worker.on('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({ ok: false, output: '', error: `Worker exited with code ${code}`, durationMs: Date.now() - start, memoryMb: 0 });
      }
    });

    worker.postMessage({
      code: request.code,
      language: request.language || 'javascript',
      timeout: request.timeout || 10000,
    });
  });
}
