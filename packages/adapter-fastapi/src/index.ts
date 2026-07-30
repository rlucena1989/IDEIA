import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import { AdapterBase } from '@ideia/adapter-base';
import type { InitResult, CommandResult, QualityGateResult } from '@ideia/adapter-base';
import { scaffoldProject, generateRouter, writeFiles } from './generator';

export interface FastAPIAdapterConfig {
  projectRoot?: string;
}

export class FastAPIAdapter extends AdapterBase {
  readonly name = 'fastapi';
  readonly language = 'python';
  readonly capabilities = [
    'detect', 'init', 'generateRouter', 'runLint',
    'runTests', 'runBuild', 'qualityGate',
  ];

  constructor(config: FastAPIAdapterConfig = {}) {
    super(config);
  }

  detect(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'pyproject.toml'))) {
      return true;
    }
    if (fs.existsSync(path.join(projectRoot, 'requirements.txt'))) {
      const content = fs.readFileSync(path.join(projectRoot, 'requirements.txt'), 'utf-8');
      if (content.includes('fastapi')) return true;
    }
    if (fs.existsSync(path.join(projectRoot, 'Pipfile'))) {
      const content = fs.readFileSync(path.join(projectRoot, 'Pipfile'), 'utf-8');
      if (content.includes('fastapi')) return true;
    }
    return false;
  }

  init(projectName: string, options?: Record<string, unknown>): Promise<InitResult> {
    return new Promise((resolve) => {
      try {
        const files = scaffoldProject(projectName);
        writeFiles(files);
        const filePaths = files.map(f => f.path);

        if (options?.generateExample) {
          const routerFiles = generateRouter(
            options.generateExample as string,
            path.join(projectName, 'src', 'routers'),
          );
          writeFiles(routerFiles);
          filePaths.push(...routerFiles.map(f => f.path));
        }

        resolve({ success: true, files: filePaths });
      } catch (_err) {
        resolve({ success: false, files: [] });
      }
    });
  }

  generateRouter(routerName: string, destDir?: string): Promise<string> {
    return new Promise((resolve) => {
      const targetDir = destDir || path.join(process.cwd(), 'src', 'routers');
      const files = generateRouter(routerName, targetDir);
      writeFiles(files);
      resolve(targetDir);
    });
  }

  generateTemplate(type: string): Promise<string> {
    return this.generateRouter(type);
  }

  runLint(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.exec('python -m ruff check src/', root);
  }

  runTests(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.exec('python -m pytest', root);
  }

  runBuild(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.exec('python -m compileall src/', root);
  }

  qualityGate(projectRoot?: string): Promise<QualityGateResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    const issues: string[] = [];

    if (!fs.existsSync(path.join(root, 'pyproject.toml')) && !fs.existsSync(path.join(root, 'requirements.txt'))) {
      issues.push('No Python project config found');
    }
    if (!fs.existsSync(path.join(root, 'src'))) {
      issues.push('src/ directory not found');
    }
    if (!fs.existsSync(path.join(root, 'src', 'main.py'))) {
      issues.push('src/main.py not found');
    }

    const score = Math.max(0, 100 - issues.length * 33);
    return Promise.resolve({
      passed: issues.length === 0,
      score,
      issues,
    });
  }

}

export function createFastAPIAdapter(config?: FastAPIAdapterConfig): FastAPIAdapter {
  return new FastAPIAdapter(config);
}

export const name = 'fastapi';
export const capabilities = ['detect', 'init', 'generateRouter', 'runLint', 'runTests', 'runBuild', 'qualityGate'];
export const detect = (projectRoot: string): boolean => new FastAPIAdapter().detect(projectRoot);
export const init = (projectName: string, options?: Record<string, unknown>): Promise<InitResult> =>
  new FastAPIAdapter().init(projectName, options);
export const generateTemplate = (type: string): Promise<string> => new FastAPIAdapter().generateTemplate(type);
export const runLint = (projectRoot?: string): Promise<CommandResult> => new FastAPIAdapter().runLint(projectRoot);
export const runTests = (projectRoot?: string): Promise<CommandResult> => new FastAPIAdapter().runTests(projectRoot);
export const runBuild = (projectRoot?: string): Promise<CommandResult> => new FastAPIAdapter().runBuild(projectRoot);
export const qualityGate = (projectRoot?: string): Promise<QualityGateResult> => new FastAPIAdapter().qualityGate(projectRoot);
