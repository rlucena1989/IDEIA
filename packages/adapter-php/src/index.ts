import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { scaffoldProject, generateController, writeFiles } from './generator';

export interface InitResult { success: boolean; files: string[] }
export interface CommandResult { success: boolean; output: string }
export interface QualityGateResult { passed: boolean; score: number; issues: string[] }

export class PhpAdapter {
  readonly name = 'php';
  readonly capabilities = ['detect', 'init', 'generateController', 'runLint', 'runTests', 'runBuild', 'qualityGate'];

  detect(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'composer.json'))) return true;
    const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.php')) return true;
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

  generateController(entityName: string, destDir?: string): Promise<string> {
    return new Promise((resolve) => {
      const targetDir = destDir || path.join(process.cwd(), 'src', 'Controllers');
      writeFiles(generateController(entityName, targetDir));
      resolve(targetDir);
    });
  }

  generateTemplate(type: string): Promise<string> { return this.generateController(type); }
  runLint(root?: string): Promise<CommandResult> { return exec('php vendor/bin/phpcs --standard=PSR12 src/', root); }
  runTests(root?: string): Promise<CommandResult> { return exec('php vendor/bin/phpunit', root); }
  runBuild(root?: string): Promise<CommandResult> { return exec('php -l src/', root); }

  qualityGate(root?: string): Promise<QualityGateResult> {
    const r = root || process.cwd();
    const issues: string[] = [];
    if (!fs.existsSync(path.join(r, 'composer.json'))) issues.push('composer.json not found');
    if (!fs.existsSync(path.join(r, 'public', 'index.php'))) issues.push('public/index.php not found');
    return Promise.resolve({ passed: issues.length === 0, score: Math.max(0, 100 - issues.length * 50), issues });
  }
}

function exec(command: string, cwd?: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    try {
      const output = execSync(command, { cwd: cwd || process.cwd(), encoding: 'utf-8', stdio: 'pipe', timeout: 60000 });
      resolve({ success: true, output: output || '' });
    } catch (_err) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      resolve({ success: false, output: e.stdout || e.stderr || e.message || '' });
    }
  });
}

export function createPhpAdapter(): PhpAdapter { return new PhpAdapter(); }
export const name = 'php';
export const capabilities = ['detect', 'init', 'generateController', 'runLint', 'runTests', 'runBuild', 'qualityGate'];
export const detect = (projectRoot: string): boolean => new PhpAdapter().detect(projectRoot);
export const init = (pn: string, o?: Record<string, unknown>): Promise<InitResult> => new PhpAdapter().init(pn, o);
export const generateTemplate = (type: string): Promise<string> => new PhpAdapter().generateTemplate(type);
export const runLint = (root?: string): Promise<CommandResult> => new PhpAdapter().runLint(root);
export const runTests = (root?: string): Promise<CommandResult> => new PhpAdapter().runTests(root);
export const runBuild = (root?: string): Promise<CommandResult> => new PhpAdapter().runBuild(root);
export const qualityGate = (root?: string): Promise<QualityGateResult> => new PhpAdapter().qualityGate(root);
