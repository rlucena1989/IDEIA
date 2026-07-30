import fs from 'node:fs/promises';
import { createLogger } from '@ideia/logger';
import type { TemplateContext } from './types';

export interface TemplateHelpers {
  camelCase: (str: string) => string;
  pascalCase: (str: string) => string;
  kebabCase: (str: string) => string;
  snakeCase: (str: string) => string;
  capitalize: (str: string) => string;
  pluralize: (str: string) => string;
  singularize: (str: string) => string;
  ifEquals: (a: unknown, b: unknown) => boolean;
  date: (format?: string) => string;
  indent: (str: string, level: number) => string;
}

export const defaultHelpers: TemplateHelpers = {
  camelCase: (str: string): string =>
    str.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase()).replace(/^[A-Z]/, c => c.toLowerCase()),

  pascalCase: (str: string): string =>
    str.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase()),

  kebabCase: (str: string): string =>
    str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[_]/g, '-'),

  snakeCase: (str: string): string =>
    str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/[-]/g, '_'),

  capitalize: (str: string): string =>
    str.charAt(0).toUpperCase() + str.slice(1),

  pluralize: (str: string): string => {
    const irregular: Record<string, string> = {
      person: 'people', child: 'children', mouse: 'mice',
      foot: 'feet', tooth: 'teeth', goose: 'geese',
    };
    if (irregular[str.toLowerCase()]) return irregular[str.toLowerCase()];
    if (str.endsWith('s') || str.endsWith('x') || str.endsWith('z') || str.endsWith('ch') || str.endsWith('sh')) return str + 'es';
    if (str.endsWith('y') && !/[aeiou]y$/.test(str)) return str.slice(0, -1) + 'ies';
    if (str.endsWith('f')) return str.slice(0, -1) + 'ves';
    if (str.endsWith('fe')) return str.slice(0, -2) + 'ves';
    return str + 's';
  },

  singularize: (str: string): string => {
    const irregular: Record<string, string> = {
      people: 'person', children: 'child', mice: 'mouse',
      feet: 'foot', teeth: 'tooth', geese: 'goose',
    };
    if (irregular[str.toLowerCase()]) return irregular[str.toLowerCase()];
    if (str.endsWith('ives')) return str.slice(0, -3) + 'ife';
    if (str.endsWith('ves')) return str.slice(0, -3) + 'f';
    if (str.endsWith('ies')) return str.slice(0, -3) + 'y';
    if (str.endsWith('ses') || str.endsWith('xes') || str.endsWith('zes') || str.endsWith('ches') || str.endsWith('shes')) return str.slice(0, -2);
    if (str.endsWith('s') && !str.endsWith('ss')) return str.slice(0, -1);
    return str;
  },

  ifEquals: (a: unknown, b: unknown): boolean => a === b,

  date: (format = 'ISO'): string => {
    const d = new Date();
    switch (format) {
      case 'YYYY-MM-DD': return d.toISOString().split('T')[0];
      case 'YYYY': return d.getFullYear().toString();
      case 'MM': return String(d.getMonth() + 1).padStart(2, '0');
      case 'DD': return String(d.getDate()).padStart(2, '0');
      default: return d.toISOString();
    }
  },

  indent: (str: string, level: number): string =>
    '  '.repeat(level) + str.replace(/\n/g, `\n${'  '.repeat(level)}`),
};

function computeDerivedVars(ctx: Record<string, unknown>): TemplateContext {
  const projectName = (ctx.projectName as string) || 'project';
  const description = (ctx.description as string) || '';
  const features = (ctx.features as string[]) || [];
  return {
    projectName,
    projectNamePascal: defaultHelpers.pascalCase(projectName),
    projectNameCamel: defaultHelpers.camelCase(projectName),
    projectNameKebab: defaultHelpers.kebabCase(projectName),
    projectNameSnake: defaultHelpers.snakeCase(projectName),
    description,
    features,
    createdAt: new Date().toISOString(),
    ideiaVersion: '1.0.0',
    nodeVersion: process.version,
    ...ctx,
  };
}

function evaluateExpression(expression: string, context: Record<string, unknown>): boolean {
  try {
    const keys = Object.keys(context);
    const values = Object.values(context);
    const fn = new Function(...keys, `return ${expression};`);
    return !!fn(...values);
  } catch {
    return false;
  }
}

function resolveTemplateVariable(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = context[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

export class TemplateEngine {
  private helpers: TemplateHelpers;

  constructor(helpers?: Partial<TemplateHelpers>) {
    this.helpers = { ...defaultHelpers, ...helpers };
  }

  getHelpers(): TemplateHelpers {
    return this.helpers;
  }

  render(template: string, context: Record<string, unknown>): string {
    const ctx = computeDerivedVars({ ...context, ...this.helpers });

    let result = template;

    result = result.replace(/<%= (\w+(?:\.\w+)*(?:\([^)]*\))?) %>/g, (_, expr) => {
      try {
        const keys = Object.keys(ctx);
        const values = Object.values(ctx);
        const fn = new Function(...keys, `return ${expr};`);
        const value = fn(...values);
        return value !== undefined && value !== null ? String(value) : '';
      } catch {
        return '';
      }
    });

    result = result.replace(/<%- (\w+(?:\.\w+)*(?:\([^)]*\))?) %>/g, (_, expr) => {
      try {
        const keys = Object.keys(ctx);
        const values = Object.values(ctx);
        const fn = new Function(...keys, `return ${expr};`);
        const value = fn(...values);
        return value !== undefined && value !== null ? String(value) : '';
      } catch {
        return '';
      }
    });

    result = this.processConditionals(result, ctx);

    result = this.processLoops(result, ctx);

    result = result.replace(/<%/g, '').replace(/%>/g, '');

    return result;
  }

  async renderFile(templatePath: string, context: Record<string, unknown>): Promise<string> {
    const content = await fs.readFile(templatePath, 'utf-8');
    return this.render(content, context);
  }

  renderPath(templatePath: string, context: Record<string, unknown>): string {
    return resolveTemplateVariable(templatePath, context);
  }

  evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    return evaluateExpression(condition, context);
  }

  private processConditionals(template: string, context: Record<string, unknown>): string {
    const ifRegex = /<% if\s*\(([^)]+)\)\s*%>([\s\S]*?)(?:<% else %>([\s\S]*?))?<% endif %>/g;
    return template.replace(ifRegex, (_, condition, ifBlock, elseBlock = '') => {
      const met = evaluateExpression(condition.trim(), context);
      return met ? ifBlock : elseBlock;
    });
  }

  private processLoops(template: string, context: Record<string, unknown>): string {
    const forRegex = /<% for\s*\((\w+)\s+of\s+(\w+)\)\s*%>([\s\S]*?)<% endfor %>/g;
    return template.replace(forRegex, (_, itemName, arrayName, block) => {
      const arr = context[arrayName.trim()] as unknown[];
      if (!Array.isArray(arr)) return '';
      return arr.map((item, index) => {
        const itemCtx = {
          ...context,
          [itemName.trim()]: item,
          [`${itemName}Index`]: index,
          [`${itemName}First`]: index === 0,
          [`${itemName}Last`]: index === arr.length - 1,
        };
        return this.render(block, itemCtx);
      }).join('');
    });
  }
}

export function buildTemplateContext(vars: Record<string, unknown>, additional?: Record<string, unknown>): TemplateContext {
  const merged = { ...vars, ...additional };
  return computeDerivedVars(merged);
}
