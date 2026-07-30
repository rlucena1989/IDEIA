import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import { AdapterBase } from '@ideia/adapter-base';
import type { InitResult, CommandResult, QualityGateResult } from '@ideia/adapter-base';
import { scaffoldProject, generateModule, writeFiles } from './generator';
const logger = createLogger('index');

export class ElixirAdapter extends AdapterBase {
  readonly name = 'elixir';
  readonly language = 'elixir';
  readonly capabilities = ['detect', 'init', 'generateModule', 'runLint', 'runTests', 'runBuild', 'qualityGate'];

  detect(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'mix.exs'))) return true;
    const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.ex') || entry.name.endsWith('.exs'))) return true;
    }
    return false;
  }

  init(projectName: string, _options?: Record<string, unknown>): Promise<InitResult> {
    return new Promise((resolve) => {
      try {
        const files = scaffoldProject(projectName);
        writeFiles(files);
        resolve({ success: true, files: files.map(f => f.path) });
      } catch { resolve({ success: false, files: [] }); }
    });
  }

  generateModule(moduleName: string, destDir?: string): Promise<string> {
    return new Promise((resolve) => {
      const targetDir = destDir || path.join(process.cwd(), 'lib', moduleName);
      writeFiles(generateModule(moduleName, targetDir));
      resolve(targetDir);
    });
  }

  generateTemplate(type: string): Promise<string> { return this.generateModule(type); }
  runLint(root?: string): Promise<CommandResult> { return this.exec('mix format --check-formatted', root); }
  runTests(root?: string): Promise<CommandResult> { return this.exec('mix test', root); }
  runBuild(root?: string): Promise<CommandResult> { return this.exec('mix compile', root); }

  qualityGate(root?: string): Promise<QualityGateResult> {
    const r = root || this.config.projectRoot || process.cwd();
    const issues: string[] = [];
    if (!fs.existsSync(path.join(r, 'mix.exs'))) issues.push('mix.exs not found');
    if (!fs.existsSync(path.join(r, 'lib'))) issues.push('lib/ not found');
    return Promise.resolve({ passed: issues.length === 0, score: Math.max(0, 100 - issues.length * 50), issues });
  }
}

export function createElixirAdapter(): ElixirAdapter { return new ElixirAdapter(); }
export const name = 'elixir';
export const capabilities = ['detect', 'init', 'generateModule', 'runLint', 'runTests', 'runBuild', 'qualityGate'];
export const detect = (projectRoot: string): boolean => new ElixirAdapter().detect(projectRoot);
export const init = (pn: string, o?: Record<string, unknown>): Promise<InitResult> => new ElixirAdapter().init(pn, o);
export const generateTemplate = (type: string): Promise<string> => new ElixirAdapter().generateTemplate(type);
export const runLint = (root?: string): Promise<CommandResult> => new ElixirAdapter().runLint(root);
export const runTests = (root?: string): Promise<CommandResult> => new ElixirAdapter().runTests(root);
export const runBuild = (root?: string): Promise<CommandResult> => new ElixirAdapter().runBuild(root);
export const qualityGate = (root?: string): Promise<QualityGateResult> => new ElixirAdapter().qualityGate(root);
