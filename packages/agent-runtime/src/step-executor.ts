import * as fsp from 'fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
import { ExecutableStep, StepExecutor } from './agent-runtime';
import { createLogger } from '@ideia/logger';

const log = createLogger('step-executor');

export interface FileSystemExecutorOptions {
  workspaceRoot?: string;
  allowedCommands?: RegExp[];
}

const DEFAULT_ALLOWED = [/^npm\s/, /^npx\s/, /^node\s/, /^ls\b/, /^dir\b/, /^cat\b/, /^type\b/, /^git\b/, /^echo\b/, /^mkdir\b/, /^cp\b/, /^copy\b/, /^mv\b/, /^move\b/];

function assertWithinWorkspace(workspaceRoot: string, resolvedPath: string): void {
  const relative = path.relative(workspaceRoot, resolvedPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path traversal blocked: ${resolvedPath} is outside workspace root ${workspaceRoot}`);
  }
}

export class FileSystemStepExecutor implements StepExecutor {
  private workspaceRoot: string;
  private allowedCommands: RegExp[];

  constructor(options?: FileSystemExecutorOptions) {
    this.workspaceRoot = path.resolve(options?.workspaceRoot || process.cwd());
    this.allowedCommands = options?.allowedCommands || DEFAULT_ALLOWED;
  }

  async execute(step: ExecutableStep): Promise<unknown> {
    switch (step.type) {
      case 'interpret':
      case 'evaluate':
      case 'notify':
      case 'log':
        return { logged: true, type: step.type, description: step.description };
      case 'update_memory':
        return { memory: 'updated', context: step.params };
      case 'request_approval':
      case 'wait_approval':
        return { approval: 'pending', type: step.type };
      case 'execute':
        return this.handleExecute(step);
      case 'tool_call':
        return this.handleToolCall(step);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async handleExecute(step: ExecutableStep): Promise<unknown> {
    const handler = step.handler || step.params?.handler as string || '';
    const resource = step.params?.resource as string || '';
    const content = step.params?.content as string || '';

    switch (handler) {
      case 'file.read':
      case 'readFile':
        return this.readFile(resource || content);
      case 'file.write':
      case 'writeFile':
        return this.writeFile(resource, content);
      case 'file.delete':
      case 'deleteFile':
        return this.deleteFile(resource);
      case 'file.create':
      case 'createFile':
        return this.writeFile(resource, content || '');
      case 'shell.exec':
      case 'runCommand':
        return this.runCommand(content || resource);
      case 'searchFiles':
        return this.searchFiles(resource);
      case 'getWorkspaceInfo':
        return this.getInfo();
      case 'audit_trail':
      case 'memory_store':
        return { [handler]: true, params: step.params };
      case 'approval_flow':
        return { approval: step.params?.conditional ? 'conditional' : 'required', reason: step.params?.reason };
      case 'notification':
        return { notified: true, reason: step.params?.reason };
      default:
        return this.runCommand(content || resource || handler);
    }
  }

  private async handleToolCall(step: ExecutableStep): Promise<unknown> {
    return this.handleExecute(step);
  }

  private resolvePath(filePath: string): string {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    assertWithinWorkspace(this.workspaceRoot, fullPath);
    return fullPath;
  }

  private async readFile(filePath: string): Promise<{ content: string }> {
    const fullPath = this.resolvePath(filePath);
    try {
      await fsp.access(fullPath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }
    return { content: await fsp.readFile(fullPath, 'utf-8') };
  }

  private async writeFile(filePath: string, content: string): Promise<{ path: string }> {
    const fullPath = this.resolvePath(filePath);
    const dir = path.dirname(fullPath);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(fullPath, content, 'utf-8');
    return { path: filePath };
  }

  private async deleteFile(filePath: string): Promise<{ path: string }> {
    const fullPath = this.resolvePath(filePath);
    try {
      await fsp.unlink(fullPath);
    } catch {
      log.debug('File not found for deletion', { path: filePath });
    }
    return { path: filePath };
  }

  private async runCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    const allowed = this.allowedCommands.some(r => r.test(command));
    if (!allowed) throw new Error(`Command not allowed: ${command}`);
    const [cmd, ...args] = parseCommand(command);
    try {
      const stdout = await new Promise<string>((resolve, reject) => {
        execFile(cmd, args, { cwd: this.workspaceRoot, encoding: 'utf-8', timeout: 30000, windowsHide: true }, (err, out) => {
          if (err) reject(err); else resolve(out);
        });
      });
      return { stdout: stdout.trim(), stderr: '' };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      return { stdout: (e.stdout || '').toString().trim(), stderr: (e.stderr || e.message || String(err)).toString().trim() };
    }
  }

  private async searchFiles(pattern: string): Promise<string[]> {
    const results: string[] = [];
    const walk = async (dir: string) => {
      try {
        const entries = await fsp.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') await walk(full);
          } else if (entry.isFile() && full.includes(pattern)) results.push(full);
        }
      } catch {
        log.error('Error walking directory', { dir });
      }
    };
    await walk(this.workspaceRoot);
    return results;
  }

  private async getInfo(): Promise<{ root: string; files: number; languages: string[] }> {
    const languages = new Set<string>();
    let count = 0;
    const walk = async (dir: string) => {
      try {
        const entries = await fsp.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') await walk(full);
          } else if (entry.isFile()) { count++; const ext = path.extname(full).slice(1); if (ext) languages.add(ext); }
        }
      } catch {
        log.error('Error walking directory for info', { dir });
      }
    };
    await walk(this.workspaceRoot);
    return { root: this.workspaceRoot, files: count, languages: Array.from(languages) };
  }
}

function parseCommand(command: string): [string, ...string[]] {
  const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [command];
  const cmd = parts[0]!.replace(/"/g, '');
  const args = parts.slice(1).map(a => a.replace(/"/g, ''));
  return [cmd, ...args];
}
