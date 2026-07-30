import { GoldenPathTemplate, TemplateFile, TemplateVariable, TemplateCondition, ScaffoldResult } from './types';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import * as fs from 'fs';
const logger = createLogger('golden-path-engine');

export class GoldenPathEngine {
  private _render: (content: string, params: Record<string, string>) => string;

  constructor() {
    this._render = (content, params) => {
      return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
        return params[key] !== undefined ? params[key] : match;
      });
    };
  }

  validateParams(template: GoldenPathTemplate, params: Record<string, string>): string[] {
    const errors: string[] = [];
    for (const v of template.variables) {
      if (v.required && !params[v.name]) {
        errors.push(`Missing required variable: ${v.name}`);
      }
      if (params[v.name] && v.validator && !v.validator(params[v.name])) {
        errors.push(`Invalid value for ${v.name}: ${params[v.name]}`);
      }
    }
    return errors;
  }

  getDefaultParams(template: GoldenPathTemplate): Record<string, string> {
    const defaults: Record<string, string> = {};
    for (const v of template.variables) {
      if (v.default !== undefined) {
        defaults[v.name] = v.default;
      }
    }
    return defaults;
  }

  renderContent(template: GoldenPathTemplate, params: Record<string, string>): Map<string, string> {
    const result = new Map<string, string>();
    for (const file of template.files) {
      if (this._shouldInclude(file.path, template.conditions, params)) {
        const rendered = this._render(file.content, params);
        result.set(file.path, rendered);
      }
    }
    return result;
  }

  async scaffold(
    template: GoldenPathTemplate,
    params: Record<string, string>,
    targetDir: string,
    dryRun = false,
  ): Promise<ScaffoldResult> {
    const errors = this.validateParams(template, params);
    if (errors.length > 0) {
      return { success: false, error: errors.join('; ') };
    }
    const merged = { ...this.getDefaultParams(template), ...params };
    const files = this.renderContent(template, merged);
    if (dryRun) {
      return { success: true, dryRun: true, files: Array.from(files.keys()) };
    }
    const created: string[] = [];
    for (const [relPath, content] of files) {
      const fullPath = path.resolve(targetDir, relPath);
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, content, 'utf-8');
      created.push(fullPath);
    }
    for (const action of template.postActions) {
      try {
        await this._executePostAction(action, targetDir, merged);
      } catch {
        // post-action failure is non-critical
      }
    }
    return { success: true, files: created };
  }

  private _shouldInclude(_filePath: string, conditions: Map<string, TemplateCondition>, _params: Record<string, string>): boolean {
    const cond = conditions.get(_filePath);
    if (!cond) return true;
    const value = _params[cond.variable];
    if (cond.equals !== undefined) return value === cond.equals;
    if (cond.notEquals !== undefined) return value !== cond.notEquals;
    if (cond.exists !== undefined) return cond.exists ? !!value : !value;
    return true;
  }

  private async _executePostAction(action: string, _dir: string, _params: Record<string, string>): Promise<void> {
    return;
  }
}
