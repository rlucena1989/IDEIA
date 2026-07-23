import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { scaffoldProject, generateModule, writeFiles } from './generator';

export interface InitResult { success: boolean; files: string[] }
export interface CommandResult { success: boolean; output: string }
export interface QualityGateResult { passed: boolean; score: number; issues: string[] }

export class HaskellAdapter {
  readonly name = 'haskell';
  readonly capabilities = ['detect', 'init', 'generateModule', 'runLint', 'runTests', 'runBuild', 'qualityGate'];

  detect(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'stack.yaml'))) return true;
    try {
      const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.hs') || entry.name.endsWith('.lhs') || entry.name.endsWith('.cabal'))) return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  init(projectName: string, _options?: Record<string, unknown>): Promise<InitResult> {
    return new Promise((resolve) => {
      try {
        writeFiles(scaffoldProject(projectName));
        resolve({ success: true, files: [projectName] });
      } catch { resolve({ success: false, files: [] }); }
    });
  }

  generateModule(moduleName: string, destDir?: string): Promise<string> {
    return new Promise((resolve) => {
      const targetDir = destDir || path.join(process.cwd(), 'src');
      writeFiles(generateModule(moduleName, targetDir));
      resolve(targetDir);
    });
  }

  generateTemplate(type: string): Promise<string> { return this.generateModule(type); }
  runLint(root?: string): Promise<CommandResult> { return exec('hlint src/', root); }
  runTests(root?: string): Promise<CommandResult> { return exec('stack test', root); }
  runBuild(root?: string): Promise<CommandResult> { return exec('stack build', root); }

  qualityGate(root?: string): Promise<QualityGateResult> {
    const r = root || process.cwd();
    const issues: string[] = [];
    if (!fs.existsSync(path.join(r, 'stack.yaml'))) {
      const hasCabal = fs.readdirSync(r).some(f => f.endsWith('.cabal'));
      if (!hasCabal) issues.push('No Haskell project config found');
    }
    const hasHs = fs.readdirSync(r).some(f => f.endsWith('.hs'));
    if (!hasHs) {
      const dirs = fs.readdirSync(r, { withFileTypes: true }).filter(d => d.isDirectory());
      const hasHsSub = dirs.some(d => {
        return fs.readdirSync(path.join(r, d.name)).some(f => f.endsWith('.hs'));
      });
      if (!hasHsSub) issues.push('No .hs files found');
    }
    return Promise.resolve({ passed: issues.length === 0, score: Math.max(0, 100 - issues.length * 50), issues });
  }
}

function exec(command: string, cwd?: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    try {
      const output = execSync(command, { cwd: cwd || process.cwd(), encoding: 'utf-8', stdio: 'pipe', timeout: 120000 });
      resolve({ success: true, output: output || '' });
    } catch (_err) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      resolve({ success: false, output: e.stdout || e.stderr || e.message || '' });
    }
  });
}

export function createHaskellAdapter(): HaskellAdapter { return new HaskellAdapter(); }
export const name = 'haskell';
export const capabilities = ['detect', 'init', 'generateModule', 'runLint', 'runTests', 'runBuild', 'qualityGate'];
export const detect = (projectRoot: string): boolean => new HaskellAdapter().detect(projectRoot);
export const init = (pn: string, o?: Record<string, unknown>): Promise<InitResult> => new HaskellAdapter().init(pn, o);
export const generateTemplate = (type: string): Promise<string> => new HaskellAdapter().generateTemplate(type);
export const runLint = (root?: string): Promise<CommandResult> => new HaskellAdapter().runLint(root);
export const runTests = (root?: string): Promise<CommandResult> => new HaskellAdapter().runTests(root);
export const runBuild = (root?: string): Promise<CommandResult> => new HaskellAdapter().runBuild(root);
export const qualityGate = (root?: string): Promise<QualityGateResult> => new HaskellAdapter().qualityGate(root);
