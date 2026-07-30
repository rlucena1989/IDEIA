import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
const logger = createLogger('deepwiki');

export interface ExtractedAPI {
  packageName: string;
  exports: string[];
  interfaces: string[];
  classes: string[];
  functions: string[];
  types: string[];
  dependencies: string[];
}

export interface DeepWikiConfig {
  packagesDir: string;
  outputDir: string;
}

export class DeepWikiGenerator {
  private config: DeepWikiConfig;

  constructor(config: DeepWikiConfig) {
    this.config = config;
  }

  generate(packageName: string): ExtractedAPI {
    const pkgDir = path.join(this.config.packagesDir, packageName, 'src');
    if (!fs.existsSync(pkgDir)) return { packageName, exports: [], interfaces: [], classes: [], functions: [], types: [], dependencies: [] };
    const exports: string[] = [];
    const interfaces: string[] = [];
    const classes: string[] = [];
    const functions: string[] = [];
    const types: string[] = [];
    const walkDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkDir(full);
        else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
          const content = fs.readFileSync(full, 'utf-8');
          const clean = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
          const exportMatches = clean.match(/export\s+(interface|class|type|function|const|enum|async\s+function)\s+(\w+)/g);
          if (exportMatches) {
            for (const m of exportMatches) {
              const parts = m.split(/\s+/);
              const hasAsync = parts.includes('async');
              const kind = parts.includes('interface') ? 'interface' : parts.includes('class') ? 'class' : parts.includes('type') ? 'type' : parts.includes('enum') ? 'enum' : (parts.includes('function') || hasAsync) ? 'function' : 'export';
              const name = parts[parts.length - 1];
              exports.push(name);
              if (kind === 'interface') interfaces.push(name);
              else if (kind === 'class') classes.push(name);
              else if (kind === 'function') functions.push(name);
              else if (kind === 'type' || kind === 'enum') types.push(name);
            }
          }
        }
      }
    };
    walkDir(pkgDir);
    const pkgJsonPath = path.join(this.config.packagesDir, packageName, 'package.json');
    let dependencies: string[] = [];
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        dependencies = Object.keys(pkg.dependencies || {}).filter((d: string) => d.startsWith('@ideia/'));
      } catch { dependencies = []; }
    }
    return { packageName, exports: [...new Set(exports)], interfaces, classes, functions, types, dependencies };
  }

  generateAll(): ExtractedAPI[] {
    if (!fs.existsSync(this.config.packagesDir)) return [];
    const results: ExtractedAPI[] = [];
    for (const entry of fs.readdirSync(this.config.packagesDir, { withFileTypes: true })) {
      if (entry.isDirectory() && fs.existsSync(path.join(this.config.packagesDir, entry.name, 'package.json'))) {
        results.push(this.generate(entry.name));
      }
    }
    return results.sort((a, b) => a.packageName.localeCompare(b.packageName));
  }

  generateMarkdown(apis: ExtractedAPI[]): string {
    const lines: string[] = [];
    lines.push('# DeepWiki — IDEIA API Documentation');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push(`**Packages:** ${apis.length}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    for (const api of apis) {
      lines.push(`## @ideia/${api.packageName}`);
      lines.push('');
      if (api.exports.length > 0) lines.push(`**Exports:** \`${api.exports.join('`, `')}\``);
      if (api.interfaces.length > 0) lines.push(`- Interfaces: ${api.interfaces.length}`);
      if (api.classes.length > 0) lines.push(`- Classes: ${api.classes.length}`);
      if (api.functions.length > 0) lines.push(`- Functions: ${api.functions.length}`);
      if (api.types.length > 0) lines.push(`- Types: ${api.types.length}`);
      if (api.dependencies.length > 0) lines.push(`- Internal deps: ${api.dependencies.join(', ')}`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
    return lines.join('\n');
  }
}

export function createDeepWikiGenerator(config: DeepWikiConfig): DeepWikiGenerator {
  return new DeepWikiGenerator(config);
}
