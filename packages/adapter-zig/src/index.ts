import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import { AdapterBase } from '@ideia/adapter-base';
import type { InitResult, CommandResult, QualityGateResult } from '@ideia/adapter-base';
import { scaffoldProject, generateModule, writeFiles } from './generator';
const logger = createLogger('index');

export class ZigAdapter extends AdapterBase {
  readonly name = 'zig';
  readonly language = 'zig';
  readonly capabilities = ['detect', 'init', 'generateModule', 'runLint', 'runTests', 'runBuild', 'qualityGate'];

  detect(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'build.zig'))) return true;
    const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.zig')) return true;
    }
    return false;
  }

  init(projectName: string, _options?: Record<string, unknown>): Promise<InitResult> {
    return new Promise((resolve) => {
      try { writeFiles(scaffoldProject(projectName)); resolve({ success: true, files: [projectName] }); }
      catch { resolve({ success: false, files: [] }); }
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

  runLint(root?: string): Promise<CommandResult> {
    const r = root || this.config.projectRoot || process.cwd();
    return this.exec('zig fmt --check src/', r);
  }

  runTests(root?: string): Promise<CommandResult> {
    const r = root || this.config.projectRoot || process.cwd();
    return this.exec('zig test src/main.zig', r);
  }

  runBuild(root?: string): Promise<CommandResult> {
    const r = root || this.config.projectRoot || process.cwd();
    return this.exec('zig build', r);
  }

  qualityGate(root?: string): Promise<QualityGateResult> {
    const r = root || this.config.projectRoot || process.cwd();
    const issues: string[] = [];
    if (!fs.existsSync(path.join(r, 'build.zig'))) issues.push('build.zig not found');
    if (!fs.existsSync(path.join(r, 'src'))) issues.push('src/ not found');
    return Promise.resolve({ passed: issues.length === 0, score: Math.max(0, 100 - issues.length * 50), issues });
  }
}

export function createZigAdapter(): ZigAdapter { return new ZigAdapter(); }
export const name = 'zig';
export const capabilities = ['detect', 'init', 'generateModule', 'runLint', 'runTests', 'runBuild', 'qualityGate'];
export const detect = (projectRoot: string): boolean => new ZigAdapter().detect(projectRoot);
export const init = (pn: string, o?: Record<string, unknown>): Promise<InitResult> => new ZigAdapter().init(pn, o);
export const generateTemplate = (type: string): Promise<string> => new ZigAdapter().generateTemplate(type);
export const runLint = (root?: string): Promise<CommandResult> => new ZigAdapter().runLint(root);
export const runTests = (root?: string): Promise<CommandResult> => new ZigAdapter().runTests(root);
export const runBuild = (root?: string): Promise<CommandResult> => new ZigAdapter().runBuild(root);
export const qualityGate = (root?: string): Promise<QualityGateResult> => new ZigAdapter().qualityGate(root);
