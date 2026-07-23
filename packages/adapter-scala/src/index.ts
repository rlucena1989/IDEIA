import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { scaffoldProject, generateController, writeFiles } from './generator';

export interface InitResult { success: boolean; files: string[] }
export interface CommandResult { success: boolean; output: string }
export interface QualityGateResult { passed: boolean; score: number; issues: string[] }

export class ScalaAdapter {
  readonly name = 'scala';
  readonly capabilities = ['detect', 'init', 'generateController', 'runLint', 'runTests', 'runBuild', 'qualityGate'];

  detect(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'build.sbt'))) return true;
    const entries = fs.readdirSync(projectRoot, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.scala')) return true;
    }
    return false;
  }

  init(projectName: string, _options?: Record<string, unknown>): Promise<InitResult> {
    return new Promise((resolve) => {
      try { writeFiles(scaffoldProject(projectName)); resolve({ success: true, files: [projectName] }); }
      catch { resolve({ success: false, files: [] }); }
    });
  }

  generateController(entityName: string, destDir?: string): Promise<string> {
    return new Promise((resolve) => {
      const targetDir = destDir || path.join(process.cwd(), 'src', 'main', 'scala', 'com', 'example', 'controller');
      writeFiles(generateController(entityName, 'com.example.controller', targetDir));
      resolve(targetDir);
    });
  }

  generateTemplate(type: string): Promise<string> { return this.generateController(type); }
  runLint(root?: string): Promise<CommandResult> { return exec('sbt scalafmtCheck', root); }
  runTests(root?: string): Promise<CommandResult> { return exec('sbt test', root); }
  runBuild(root?: string): Promise<CommandResult> { return exec('sbt compile', root); }

  qualityGate(root?: string): Promise<QualityGateResult> {
    const r = root || process.cwd();
    const issues: string[] = [];
    if (!fs.existsSync(path.join(r, 'build.sbt'))) issues.push('build.sbt not found');
    if (!fs.existsSync(path.join(r, 'src'))) issues.push('src/ not found');
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

export function createScalaAdapter(): ScalaAdapter { return new ScalaAdapter(); }
export const name = 'scala';
export const capabilities = ['detect', 'init', 'generateController', 'runLint', 'runTests', 'runBuild', 'qualityGate'];
export const detect = (projectRoot: string): boolean => new ScalaAdapter().detect(projectRoot);
export const init = (pn: string, o?: Record<string, unknown>): Promise<InitResult> => new ScalaAdapter().init(pn, o);
export const generateTemplate = (type: string): Promise<string> => new ScalaAdapter().generateTemplate(type);
export const runLint = (root?: string): Promise<CommandResult> => new ScalaAdapter().runLint(root);
export const runTests = (root?: string): Promise<CommandResult> => new ScalaAdapter().runTests(root);
export const runBuild = (root?: string): Promise<CommandResult> => new ScalaAdapter().runBuild(root);
export const qualityGate = (root?: string): Promise<QualityGateResult> => new ScalaAdapter().qualityGate(root);
