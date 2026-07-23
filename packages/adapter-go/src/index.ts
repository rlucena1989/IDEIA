import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { scaffoldProject, generateHandler, writeFiles } from './generator';

export interface GoAdapterConfig {
  projectRoot?: string;
}

export interface InitResult {
  success: boolean;
  files: string[];
}

export interface CommandResult {
  success: boolean;
  output: string;
}

export interface QualityGateResult {
  passed: boolean;
  score: number;
  issues: string[];
}

export class GoAdapter {
  readonly name = 'go';
  readonly capabilities = [
    'detect', 'init', 'generateHandler', 'runLint',
    'runTests', 'runBuild', 'qualityGate',
  ];

  private config: GoAdapterConfig;

  constructor(config: GoAdapterConfig = {}) {
    this.config = config;
  }

  detect(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'go.mod'))) {
      return true;
    }
    const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.go')) {
        return true;
      }
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
          const handlerFiles = generateHandler(
            options.generateExample as string,
            path.join(projectName, 'internal', options.generateExample as string),
          );
          writeFiles(handlerFiles);
          filePaths.push(...handlerFiles.map(f => f.path));
        }

        resolve({ success: true, files: filePaths });
      } catch (_err) {
        resolve({ success: false, files: [] });
      }
    });
  }

  generateHandler(handlerName: string, destDir?: string): Promise<string> {
    return new Promise((resolve) => {
      const targetDir = destDir || path.join(process.cwd(), 'internal', handlerName);
      const files = generateHandler(handlerName, targetDir);
      writeFiles(files);
      resolve(targetDir);
    });
  }

  generateTemplate(type: string): Promise<string> {
    return this.generateHandler(type);
  }

  runLint(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.execCommand('go vet ./...', root);
  }

  runTests(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.execCommand('go test ./...', root);
  }

  runBuild(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.execCommand('go build ./...', root);
  }

  qualityGate(projectRoot?: string): Promise<QualityGateResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    const issues: string[] = [];

    if (!fs.existsSync(path.join(root, 'go.mod'))) {
      issues.push('go.mod not found');
    }
    const goFiles = fs.readdirSync(root).filter(f => f.endsWith('.go'));
    if (goFiles.length === 0) {
      const hasGoSubdirs = fs.readdirSync(root).some(entry => {
        const entryPath = path.join(root, entry);
        return fs.statSync(entryPath).isDirectory() &&
          fs.readdirSync(entryPath).some(f => f.endsWith('.go'));
      });
      if (!hasGoSubdirs) {
        issues.push('No Go source files found');
      }
    }

    const score = Math.max(0, 100 - issues.length * 33);
    return Promise.resolve({
      passed: issues.length === 0,
      score,
      issues,
    });
  }

  private execCommand(command: string, cwd: string): Promise<CommandResult> {
    return new Promise((resolve) => {
      try {
        const output = execSync(command, { cwd, encoding: 'utf-8', stdio: 'pipe', timeout: 60000 });
        resolve({ success: true, output: output || 'Command completed' });
      } catch (_err) {
        const error = err as { stdout?: string; stderr?: string; message?: string };
        resolve({
          success: false,
          output: error.stdout || error.stderr || error.message || 'Command failed',
        });
      }
    });
  }
}

export function createGoAdapter(config?: GoAdapterConfig): GoAdapter {
  return new GoAdapter(config);
}

export const name = 'go';
export const capabilities = ['detect', 'init', 'generateHandler', 'runLint', 'runTests', 'runBuild', 'qualityGate'];
export const detect = (projectRoot: string): boolean => new GoAdapter().detect(projectRoot);
export const init = (projectName: string, options?: Record<string, unknown>): Promise<InitResult> =>
  new GoAdapter().init(projectName, options);
export const generateTemplate = (type: string): Promise<string> => new GoAdapter().generateTemplate(type);
export const runLint = (projectRoot?: string): Promise<CommandResult> => new GoAdapter().runLint(projectRoot);
export const runTests = (projectRoot?: string): Promise<CommandResult> => new GoAdapter().runTests(projectRoot);
export const runBuild = (projectRoot?: string): Promise<CommandResult> => new GoAdapter().runBuild(projectRoot);
export const qualityGate = (projectRoot?: string): Promise<QualityGateResult> => new GoAdapter().qualityGate(projectRoot);
