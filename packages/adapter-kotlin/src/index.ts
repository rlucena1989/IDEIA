import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { scaffoldProject, generateController, writeFiles } from './generator';

export interface InitResult { success: boolean; files: string[] }
export interface CommandResult { success: boolean; output: string }
export interface QualityGateResult { passed: boolean; score: number; issues: string[] }

export class KotlinAdapter {
  readonly name = 'kotlin';
  readonly capabilities = ['detect', 'init', 'generateController', 'runLint', 'runTests', 'runBuild', 'qualityGate'];

  detect(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'build.gradle.kts'))) return true;
    const entries = fs.readdirSync(projectRoot, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.kt')) return true;
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
      const targetDir = destDir || path.join(process.cwd(), 'src', 'main', 'kotlin', 'com', 'example', 'controller');
      writeFiles(generateController(entityName, 'com.example.controller', targetDir));
      resolve(targetDir);
    });
  }

  generateTemplate(type: string): Promise<string> { return this.generateController(type); }
  runLint(root?: string): Promise<CommandResult> { return exec('./gradlew ktlintCheck', root); }
  runTests(root?: string): Promise<CommandResult> { return exec('./gradlew test', root); }
  runBuild(root?: string): Promise<CommandResult> { return exec('./gradlew build', root); }

  qualityGate(root?: string): Promise<QualityGateResult> {
    const r = root || process.cwd();
    const issues: string[] = [];
    if (!fs.existsSync(path.join(r, 'build.gradle.kts'))) issues.push('build.gradle.kts not found');
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

export function createKotlinAdapter(): KotlinAdapter { return new KotlinAdapter(); }
export const name = 'kotlin';
export const capabilities = ['detect', 'init', 'generateController', 'runLint', 'runTests', 'runBuild', 'qualityGate'];
export const detect = (projectRoot: string): boolean => new KotlinAdapter().detect(projectRoot);
export const init = (pn: string, o?: Record<string, unknown>): Promise<InitResult> => new KotlinAdapter().init(pn, o);
export const generateTemplate = (type: string): Promise<string> => new KotlinAdapter().generateTemplate(type);
export const runLint = (root?: string): Promise<CommandResult> => new KotlinAdapter().runLint(root);
export const runTests = (root?: string): Promise<CommandResult> => new KotlinAdapter().runTests(root);
export const runBuild = (root?: string): Promise<CommandResult> => new KotlinAdapter().runBuild(root);
export const qualityGate = (root?: string): Promise<QualityGateResult> => new KotlinAdapter().qualityGate(root);
