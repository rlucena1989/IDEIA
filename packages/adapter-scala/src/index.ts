import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import { AdapterBase } from '@ideia/adapter-base';
import type { InitResult, CommandResult, QualityGateResult } from '@ideia/adapter-base';
import { scaffoldProject, generateController, writeFiles } from './generator';
const logger = createLogger('index');

export class ScalaAdapter extends AdapterBase {
  readonly name = 'scala';
  readonly language = 'scala';
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

  runLint(root?: string): Promise<CommandResult> {
    const r = root || this.config.projectRoot || process.cwd();
    return this.exec('sbt scalafmtCheck', r);
  }

  runTests(root?: string): Promise<CommandResult> {
    const r = root || this.config.projectRoot || process.cwd();
    return this.exec('sbt test', r);
  }

  runBuild(root?: string): Promise<CommandResult> {
    const r = root || this.config.projectRoot || process.cwd();
    return this.exec('sbt compile', r);
  }

  qualityGate(root?: string): Promise<QualityGateResult> {
    const r = root || this.config.projectRoot || process.cwd();
    const issues: string[] = [];
    if (!fs.existsSync(path.join(r, 'build.sbt'))) issues.push('build.sbt not found');
    if (!fs.existsSync(path.join(r, 'src'))) issues.push('src/ not found');
    return Promise.resolve({ passed: issues.length === 0, score: Math.max(0, 100 - issues.length * 50), issues });
  }
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
