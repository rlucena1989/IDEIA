import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import { AdapterBase } from '@ideia/adapter-base';
import type { InitResult, CommandResult, QualityGateResult } from '@ideia/adapter-base';
import { scaffoldProject, generateEntity, writeFiles } from './generator';
import type { GeneratedFile } from './generator';
const logger = createLogger('index');

export interface TypeScriptAdapterConfig {
  projectRoot?: string;
}

export class TypeScriptAdapter extends AdapterBase {
  readonly name = 'typescript';
  readonly language = 'typescript';
  readonly capabilities = [
    'detect', 'init', 'generateEntity', 'runLint',
    'runTests', 'runBuild', 'qualityGate',
  ];

  constructor(config: TypeScriptAdapterConfig = {}) {
    super(config);
  }

  detect(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'tsconfig.json'))) {
      return true;
    }
    if (fs.existsSync(path.join(projectRoot, 'package.json'))) {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
      if (pkgJson.dependencies?.typescript || pkgJson.devDependencies?.typescript) {
        return true;
      }
    }
    const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.ts')) {
        return true;
      }
    }
    return false;
  }

  init(projectName: string, options?: Record<string, unknown>): Promise<InitResult> {
    return new Promise((resolve) => {
      try {
        const simpleName = path.basename(projectName).replace(/[^a-zA-Z0-9_-]/g, '') || 'app';
        const files = scaffoldProject(projectName, simpleName);
        writeFiles(files);
        const filePaths = files.map((f) => f.path);

        if (options?.generateExample) {
          const entityName = options.generateExample as string;
          const entityFiles = generateEntity(
            entityName,
            path.join(projectName, 'src', entityName),
          );
          writeFiles(entityFiles);
          filePaths.push(...entityFiles.map((f) => f.path));
        }

        resolve({ success: true, files: filePaths });
      } catch (_err) {
        resolve({ success: false, files: [] });
      }
    });
  }

  generateEntity(entityName: string, destDir?: string): Promise<string> {
    return new Promise((resolve) => {
      const targetDir = destDir || path.join(process.cwd(), 'src', entityName);
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
    return this.exec('npx eslint src --ext .ts', root);
  }

  runTests(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.exec('npm test', root);
  }

  runBuild(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.exec('npm run build', root);
  }

  qualityGate(projectRoot?: string): Promise<QualityGateResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    const issues: string[] = [];

    if (!fs.existsSync(path.join(root, 'tsconfig.json'))) {
      issues.push('tsconfig.json not found');
    }
    if (!fs.existsSync(path.join(root, 'package.json'))) {
      issues.push('package.json not found');
    }
    const srcDir = path.join(root, 'src');
    if (!fs.existsSync(srcDir)) {
      issues.push('src/ directory not found');
    }

    const score = Math.max(0, 100 - issues.length * 33);
    return Promise.resolve({
      passed: issues.length === 0,
      score,
      issues,
    });
  }
}

export function createTypeScriptAdapter(config?: TypeScriptAdapterConfig): TypeScriptAdapter {
  return new TypeScriptAdapter(config);
}

export const name = 'typescript';
export const capabilities = ['detect', 'init', 'generateEntity', 'runLint', 'runTests', 'runBuild', 'qualityGate'];
export const detect = (projectRoot: string): boolean => new TypeScriptAdapter().detect(projectRoot);
export const init = (projectName: string, options?: Record<string, unknown>): Promise<InitResult> =>
  new TypeScriptAdapter().init(projectName, options);
export const generateTemplate = (type: string): Promise<string> => new TypeScriptAdapter().generateTemplate(type);
export const runLint = (projectRoot?: string): Promise<CommandResult> => new TypeScriptAdapter().runLint(projectRoot);
export const runTests = (projectRoot?: string): Promise<CommandResult> => new TypeScriptAdapter().runTests(projectRoot);
export const runBuild = (projectRoot?: string): Promise<CommandResult> => new TypeScriptAdapter().runBuild(projectRoot);
export const qualityGate = (projectRoot?: string): Promise<QualityGateResult> => new TypeScriptAdapter().qualityGate(projectRoot);
