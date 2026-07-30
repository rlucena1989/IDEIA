import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import { AdapterBase } from '@ideia/adapter-base';
import type { InitResult, CommandResult, QualityGateResult } from '@ideia/adapter-base';
import { scaffoldProject, generateController, writeFiles } from './generator';
const logger = createLogger('index');

export class SwiftAdapter extends AdapterBase {
  readonly name = 'swift';
  readonly language = 'swift';
  readonly capabilities = ['detect', 'init', 'generateController', 'runLint', 'runTests', 'runBuild', 'qualityGate'];

  detect(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'Package.swift'))) return true;
    const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.swift')) return true;
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
      const targetDir = destDir || path.join(process.cwd(), 'Sources', 'Controllers');
      writeFiles(generateController(entityName, targetDir));
      resolve(targetDir);
    });
  }

  generateTemplate(type: string): Promise<string> { return this.generateController(type); }

  runLint(root?: string): Promise<CommandResult> {
    const r = root || this.config.projectRoot || process.cwd();
    return this.exec('swift format lint', r);
  }

  runTests(root?: string): Promise<CommandResult> {
    const r = root || this.config.projectRoot || process.cwd();
    return this.exec('swift test', r);
  }

  runBuild(root?: string): Promise<CommandResult> {
    const r = root || this.config.projectRoot || process.cwd();
    return this.exec('swift build', r);
  }

  qualityGate(root?: string): Promise<QualityGateResult> {
    const r = root || this.config.projectRoot || process.cwd();
    const issues: string[] = [];
    if (!fs.existsSync(path.join(r, 'Package.swift'))) issues.push('Package.swift not found');
    if (!fs.existsSync(path.join(r, 'Sources'))) issues.push('Sources/ not found');
    return Promise.resolve({ passed: issues.length === 0, score: Math.max(0, 100 - issues.length * 50), issues });
  }
}

export function createSwiftAdapter(): SwiftAdapter { return new SwiftAdapter(); }
export const name = 'swift';
export const capabilities = ['detect', 'init', 'generateController', 'runLint', 'runTests', 'runBuild', 'qualityGate'];
export const detect = (projectRoot: string): boolean => new SwiftAdapter().detect(projectRoot);
export const init = (pn: string, o?: Record<string, unknown>): Promise<InitResult> => new SwiftAdapter().init(pn, o);
export const generateTemplate = (type: string): Promise<string> => new SwiftAdapter().generateTemplate(type);
export const runLint = (root?: string): Promise<CommandResult> => new SwiftAdapter().runLint(root);
export const runTests = (root?: string): Promise<CommandResult> => new SwiftAdapter().runTests(root);
export const runBuild = (root?: string): Promise<CommandResult> => new SwiftAdapter().runBuild(root);
export const qualityGate = (root?: string): Promise<QualityGateResult> => new SwiftAdapter().qualityGate(root);
