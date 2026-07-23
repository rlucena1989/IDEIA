import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { scaffoldProject, generateNestModule, writeFiles } from './generator';

export interface NestJSAdapterConfig {
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

export class NestJSAdapter {
  readonly name = 'nestjs';
  readonly capabilities = [
    'detect', 'init', 'generateModule', 'runLint',
    'runTests', 'runBuild', 'validateContracts', 'auditSecurity', 'qualityGate',
  ];

  private config: NestJSAdapterConfig;

  constructor(config: NestJSAdapterConfig = {}) {
    this.config = config;
  }

  detect(projectRoot: string): boolean {
    try {
      const pkgPath = path.join(projectRoot, 'package.json');
      if (!fs.existsSync(pkgPath)) return false;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return !!(pkg.dependencies && pkg.dependencies['@nestjs/core']);
    } catch {
      return false;
    }
  }

  init(projectName: string, options?: Record<string, unknown>): Promise<InitResult> {
    return new Promise((resolve) => {
      try {
        const files = scaffoldProject(projectName);
        writeFiles(files);
        const filePaths = files.map(f => f.path);

        if (options?.generateExample) {
          const exampleFiles = generateNestModule(
            options.generateExample as string,
            path.join(projectName, 'src', options.generateExample as string),
          );
          writeFiles(exampleFiles);
          filePaths.push(...exampleFiles.map(f => f.path));
        }

        resolve({ success: true, files: filePaths });
      } catch (_err) {
        resolve({ success: false, files: [] });
      }
    });
  }

  generateModule(moduleName: string, destDir?: string): Promise<string> {
    return new Promise((resolve) => {
      const targetDir = destDir || path.join(process.cwd(), 'src', moduleName);
      const files = generateNestModule(moduleName, targetDir);
      writeFiles(files);
      resolve(targetDir);
    });
  }

  generateTemplate(type: string): Promise<string> {
    return this.generateModule(type);
  }

  runLint(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.execCommand('npm run lint', root);
  }

  runTests(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.execCommand('npm run test', root);
  }

  runBuild(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    return this.execCommand('npm run build', root);
  }

  validateContracts(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    try {
      const mainPath = path.join(root, 'src', 'main.ts');
      if (fs.existsSync(mainPath)) {
        const content = fs.readFileSync(mainPath, 'utf-8');
        const issues: string[] = [];
        if (!content.includes('enableCors')) {
          issues.push('CORS not enabled in main.ts');
        }
        return Promise.resolve({
          success: issues.length === 0,
          output: issues.join('\n') || 'All contracts validated',
        });
      }
      return Promise.resolve({ success: true, output: 'No main.ts found, skipping' });
    } catch (_err) {
      return Promise.resolve({ success: false, output: String(err) });
    }
  }

  auditSecurity(projectRoot?: string): Promise<CommandResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    try {
      const mainPath = path.join(root, 'src', 'main.ts');
      const issues: string[] = [];
      if (fs.existsSync(mainPath)) {
        const content = fs.readFileSync(mainPath, 'utf-8');
        if (!content.includes('helmet')) issues.push('Helmet not configured');
        if (!content.includes('enableCors')) issues.push('CORS not enabled');
      }
      return Promise.resolve({
        success: issues.length === 0,
        output: issues.join('\n') || 'Security audit passed',
      });
    } catch (_err) {
      return Promise.resolve({ success: false, output: String(err) });
    }
  }

  qualityGate(projectRoot?: string): Promise<QualityGateResult> {
    const root = projectRoot || this.config.projectRoot || process.cwd();
    const issues: string[] = [];

    const pkgPath = path.join(root, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      issues.push('package.json not found');
    }

    const tsconfigPath = path.join(root, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      issues.push('tsconfig.json not found');
    }

    const nestCliPath = path.join(root, 'nest-cli.json');
    if (!fs.existsSync(nestCliPath)) {
      issues.push('nest-cli.json not found');
    }

    const srcPath = path.join(root, 'src');
    if (!fs.existsSync(srcPath)) {
      issues.push('src/ directory not found');
    }

    const score = Math.max(0, 100 - issues.length * 25);
    return Promise.resolve({
      passed: issues.length === 0,
      score,
      issues,
    });
  }

  private execCommand(command: string, cwd: string): Promise<CommandResult> {
    return new Promise((resolve) => {
      try {
        const output = execSync(command, { cwd, encoding: 'utf-8', stdio: 'pipe' });
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

export function createNestJSAdapter(config?: NestJSAdapterConfig): NestJSAdapter {
  return new NestJSAdapter(config);
}

export const name = 'nestjs';
export const capabilities = [
  'detect', 'init', 'generateModule', 'runLint',
  'runTests', 'runBuild', 'validateContracts', 'auditSecurity', 'qualityGate',
];
export const detect = (projectRoot: string): boolean => new NestJSAdapter().detect(projectRoot);
export const init = (projectName: string, options?: Record<string, unknown>): Promise<InitResult> =>
  new NestJSAdapter().init(projectName, options);
export const generateTemplate = (type: string): Promise<string> => new NestJSAdapter().generateTemplate(type);
export const runLint = (projectRoot?: string): Promise<CommandResult> => new NestJSAdapter().runLint(projectRoot);
export const runTests = (projectRoot?: string): Promise<CommandResult> => new NestJSAdapter().runTests(projectRoot);
export const runBuild = (projectRoot?: string): Promise<CommandResult> => new NestJSAdapter().runBuild(projectRoot);
export const qualityGate = (projectRoot?: string): Promise<QualityGateResult> => new NestJSAdapter().qualityGate(projectRoot);
export const validateContracts = (projectRoot?: string): Promise<CommandResult> => new NestJSAdapter().validateContracts(projectRoot);
export const auditSecurity = (projectRoot?: string): Promise<CommandResult> => new NestJSAdapter().auditSecurity(projectRoot);
