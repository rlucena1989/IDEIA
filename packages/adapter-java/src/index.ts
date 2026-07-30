import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import { AdapterBase } from '@ideia/adapter-base';
import type { InitResult, CommandResult, QualityGateResult } from '@ideia/adapter-base';
import { scaffoldProject, generateController, writeFiles } from './generator';

export interface JavaAdapterConfig {
  projectRoot?: string;
}

export class JavaAdapter extends AdapterBase {
  readonly name = 'java';
  readonly language = 'java';
  readonly capabilities = [
    'detect', 'init', 'generateController', 'runLint',
    'runTests', 'runBuild', 'qualityGate',
  ];

  constructor(config: JavaAdapterConfig = {}) {
    super(config);
  }

  detect(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'pom.xml'))) {
      return true;
    }
    if (fs.existsSync(path.join(projectRoot, 'build.gradle')) || fs.existsSync(path.join(projectRoot, 'build.gradle.kts'))) {
      return true;
    }
    const entries = fs.readdirSync(projectRoot, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.java')) {
        return true;
      }
    }
    return false;
  }

  init(projectName: string, options?: Record<string, unknown>): Promise<InitResult> {
    return new Promise((resolve) => {
      try {
        const groupId = (options?.groupId as string) || 'com.example';
        const simpleName = path.basename(projectName).replace(/[^a-zA-Z0-9_-]/g, '') || 'app';
        const files = scaffoldProject(projectName, groupId, simpleName);
        writeFiles(files);
        const filePaths = files.map(f => f.path);

        if (options?.generateExample) {
          const exampleName = options.generateExample as string;
          const pkgDir = path.join(projectName, 'src', 'main', 'java', ...groupId.split('.'), exampleName);
          const controllerFiles = generateController(`${groupId}.${exampleName}`, exampleName, pkgDir);
          writeFiles(controllerFiles);
          filePaths.push(...controllerFiles.map(f => f.path));
        }

        resolve({ success: true, files: filePaths });
      } catch (_err) {
        resolve({ success: false, files: [] });
      }
    });
  }

  generateController(entityName: string, destDir?: string): Promise<string> {
    return new Promise((resolve) => {
      const targetDir = destDir || path.join(process.cwd(), 'src', 'main', 'java', 'com', 'example', entityName);
      const files = generateController('com.example.' + entityName, entityName, targetDir);
      writeFiles(files);
      resolve(targetDir);
    });
  }

  generateTemplate(type: string): Promise<string> {
    return this.generateController(type);
  }

  runLint(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.exec('mvn checkstyle:check -q', root);
  }

  runTests(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.exec('mvn test -q', root);
  }

  runBuild(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.exec('mvn compile -q', root);
  }

  qualityGate(projectRoot?: string): Promise<QualityGateResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    const issues: string[] = [];

    if (!fs.existsSync(path.join(root, 'pom.xml'))) {
      issues.push('pom.xml not found');
    }
    if (!fs.existsSync(path.join(root, 'src'))) {
      issues.push('src/ directory not found');
    }
    const hasJava = this.findJavaFiles(root);
    if (!hasJava) {
      issues.push('No Java source files found');
    }

    const score = Math.max(0, 100 - issues.length * 33);
    return Promise.resolve({
      passed: issues.length === 0,
      score,
      issues,
    });
  }

  private findJavaFiles(dir: string): boolean {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.java')) return true;
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
          if (this.findJavaFiles(path.join(dir, entry.name))) return true;
        }
      }
    } catch {
      return false;
    }
    return false;
  }

}

export function createJavaAdapter(config?: JavaAdapterConfig): JavaAdapter {
  return new JavaAdapter(config);
}

export const name = 'java';
export const capabilities = ['detect', 'init', 'generateController', 'runLint', 'runTests', 'runBuild', 'qualityGate'];
export const detect = (projectRoot: string): boolean => new JavaAdapter().detect(projectRoot);
export const init = (projectName: string, options?: Record<string, unknown>): Promise<InitResult> =>
  new JavaAdapter().init(projectName, options);
export const generateTemplate = (type: string): Promise<string> => new JavaAdapter().generateTemplate(type);
export const runLint = (projectRoot?: string): Promise<CommandResult> => new JavaAdapter().runLint(projectRoot);
export const runTests = (projectRoot?: string): Promise<CommandResult> => new JavaAdapter().runTests(projectRoot);
export const runBuild = (projectRoot?: string): Promise<CommandResult> => new JavaAdapter().runBuild(projectRoot);
export const qualityGate = (projectRoot?: string): Promise<QualityGateResult> => new JavaAdapter().qualityGate(projectRoot);
