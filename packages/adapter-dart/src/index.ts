import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { scaffoldProject, generateEntity, writeFiles } from './generator';

export interface DartAdapterConfig {
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

export class DartAdapter {
  readonly name = 'dart';
  readonly capabilities = [
    'detect', 'init', 'generateEntity', 'runLint',
    'runTests', 'runBuild', 'qualityGate',
  ];

  private config: DartAdapterConfig;

  constructor(config: DartAdapterConfig = {}) {
    this.config = config;
  }

  detect(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'pubspec.yaml'))) {
      return true;
    }
    const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.dart')) {
        return true;
      }
    }
    return false;
  }

  init(projectName: string, options?: Record<string, unknown>): Promise<InitResult> {
    return new Promise((resolve) => {
      try {
        const simpleName = path.basename(projectName).replace(/[^a-zA-Z0-9_-]/g, '_') || 'app';
        const files = scaffoldProject(projectName, simpleName);
        writeFiles(files);
        const filePaths = files.map(f => f.path);

        if (options?.generateExample) {
          const entityName = options.generateExample as string;
          const entityFiles = generateEntity(
            entityName,
            path.join(projectName, 'lib', entityName),
          );
          writeFiles(entityFiles);
          filePaths.push(...entityFiles.map(f => f.path));
        }

        resolve({ success: true, files: filePaths });
      } catch (_err) {
        resolve({ success: false, files: [] });
      }
    });
  }

  generateEntity(entityName: string, destDir?: string): Promise<string> {
    return new Promise((resolve) => {
      const targetDir = destDir || path.join(process.cwd(), 'lib', entityName);
      const files = generateEntity(entityName, targetDir);
      writeFiles(files);
      resolve(targetDir);
    });
  }

  generateTemplate(type: string): Promise<string> {
    return this.generateEntity(type);
  }

  runLint(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.execCommand('dart analyze', root);
  }

  runTests(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.execCommand('dart test', root);
  }

  runBuild(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.execCommand('dart compile exe bin/main.dart', root);
  }

  qualityGate(projectRoot?: string): Promise<QualityGateResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    const issues: string[] = [];

    if (!fs.existsSync(path.join(root, 'pubspec.yaml'))) {
      issues.push('pubspec.yaml not found');
    }
    const libDir = path.join(root, 'lib');
    if (!fs.existsSync(libDir)) {
      issues.push('lib/ directory not found');
    }
    if (!fs.existsSync(path.join(root, 'bin'))) {
      issues.push('bin/ directory not found');
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

export function createDartAdapter(config?: DartAdapterConfig): DartAdapter {
  return new DartAdapter(config);
}

export const name = 'dart';
export const capabilities = ['detect', 'init', 'generateEntity', 'runLint', 'runTests', 'runBuild', 'qualityGate'];
export const detect = (projectRoot: string): boolean => new DartAdapter().detect(projectRoot);
export const init = (projectName: string, options?: Record<string, unknown>): Promise<InitResult> =>
  new DartAdapter().init(projectName, options);
export const generateTemplate = (type: string): Promise<string> => new DartAdapter().generateTemplate(type);
export const runLint = (projectRoot?: string): Promise<CommandResult> => new DartAdapter().runLint(projectRoot);
export const runTests = (projectRoot?: string): Promise<CommandResult> => new DartAdapter().runTests(projectRoot);
export const runBuild = (projectRoot?: string): Promise<CommandResult> => new DartAdapter().runBuild(projectRoot);
export const qualityGate = (projectRoot?: string): Promise<QualityGateResult> => new DartAdapter().qualityGate(projectRoot);
