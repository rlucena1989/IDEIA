import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import { AdapterBase } from '@ideia/adapter-base';
import type { InitResult, CommandResult, QualityGateResult } from '@ideia/adapter-base';
import { scaffoldProject, generateController, writeFiles } from './generator';
const logger = createLogger('index');

export class RubyAdapter extends AdapterBase {
  readonly name = 'ruby';
  readonly language = 'ruby';
  readonly capabilities = ['detect', 'init', 'generateController', 'runLint', 'runTests', 'runBuild', 'qualityGate'];

  detect(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'Gemfile'))) return true;
    const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.rb') || entry.name.endsWith('.rake'))) return true;
    }
    return false;
  }

  init(projectName: string, _options?: Record<string, unknown>): Promise<InitResult> {
    return new Promise((resolve) => {
      try {
        writeFiles(scaffoldProject(projectName));
        resolve({ success: true, files: [projectName] });
      } catch { resolve({ success: false, files: [] }); }
    });
  }

  generateController(entityName: string, destDir?: string): Promise<string> {
    return new Promise((resolve) => {
      const targetDir = destDir || path.join(process.cwd(), 'app', 'controllers');
      writeFiles(generateController(entityName, targetDir));
      resolve(targetDir);
    });
  }

  generateTemplate(type: string): Promise<string> { return this.generateController(type); }
  runLint(root?: string): Promise<CommandResult> { return this.exec('rubocop', root); }
  runTests(root?: string): Promise<CommandResult> { return this.exec('rspec', root); }
  runBuild(root?: string): Promise<CommandResult> { return this.exec('ruby -c app.rb', root); }

  qualityGate(root?: string): Promise<QualityGateResult> {
    const r = root || this.config.projectRoot || process.cwd();
    const issues: string[] = [];
    if (!fs.existsSync(path.join(r, 'Gemfile'))) issues.push('Gemfile not found');
    if (!fs.existsSync(path.join(r, 'app.rb'))) issues.push('app.rb not found');
    return Promise.resolve({ passed: issues.length === 0, score: Math.max(0, 100 - issues.length * 50), issues });
  }
}

export function createRubyAdapter(): RubyAdapter { return new RubyAdapter(); }
export const name = 'ruby';
export const capabilities = ['detect', 'init', 'generateController', 'runLint', 'runTests', 'runBuild', 'qualityGate'];
export const detect = (projectRoot: string): boolean => new RubyAdapter().detect(projectRoot);
export const init = (pn: string, o?: Record<string, unknown>): Promise<InitResult> => new RubyAdapter().init(pn, o);
export const generateTemplate = (type: string): Promise<string> => new RubyAdapter().generateTemplate(type);
export const runLint = (root?: string): Promise<CommandResult> => new RubyAdapter().runLint(root);
export const runTests = (root?: string): Promise<CommandResult> => new RubyAdapter().runTests(root);
export const runBuild = (root?: string): Promise<CommandResult> => new RubyAdapter().runBuild(root);
export const qualityGate = (root?: string): Promise<QualityGateResult> => new RubyAdapter().qualityGate(root);
