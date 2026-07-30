import { createLogger } from '@ideia/logger';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { SchemaEntry } from './types';
import { SchemaRegistry } from './schema-registry';
const logger = createLogger('schema-registry');

export interface DiscoveredSchema {
  filePath: string;
  schemaName: string;
  content: string;
  format: 'zod' | 'typescript' | 'json' | 'yaml';
}

export interface DiscoveryOptions {
  rootDir?: string;
  patterns?: string[];
  maxDepth?: number;
}

const DEFAULT_PATTERNS = [
  '**/schemas/**/*.ts',
  '**/*.schema.ts',
  '**/*.zod.ts',
  '**/types.ts',
];

const ZOD_OBJECT_RE = /export\s+(const|class|interface|type)\s+(\w+)[\s\S]*?(?:extends\s+)?(?:z\.object|ZodType|zod)/g;
const INTERFACE_RE = /export\s+interface\s+(\w+)\s*\{/g;
const TYPE_RE = /export\s+type\s+(\w+)\s*=\s*\{/g;

export class SchemaDiscovery {
  private registry: SchemaRegistry;
  private options: Required<DiscoveryOptions>;

  constructor(registry: SchemaRegistry, options?: DiscoveryOptions) {
    this.registry = registry;
    this.options = {
      rootDir: options?.rootDir ?? process.cwd(),
      patterns: options?.patterns ?? DEFAULT_PATTERNS,
      maxDepth: options?.maxDepth ?? 20,
    };
  }

  scan(): DiscoveredSchema[] {
    const results: DiscoveredSchema[] = [];
    const root = resolve(this.options.rootDir);
    this.walkDir(root, 0, results);
    return results;
  }

  scanAndRegister(): SchemaEntry[] {
    const discovered = this.scan();
    const registered: SchemaEntry[] = [];
    for (const ds of discovered) {
      const existing = this.registry.findByName(ds.schemaName);
      if (!existing) {
        const entry = this.registry.register(
          ds.schemaName,
          ds.format,
          ds.content,
          `Auto-discovered from ${ds.filePath}`,
          ['auto-discovered'],
        );
        registered.push(entry);
      }
    }
    return registered;
  }

  private walkDir(dir: string, depth: number, results: DiscoveredSchema[]): void {
    if (depth > this.options.maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch (__err) {
      logger.error('Error in walkDir readdir', { dir, error: String(__err) });
      return;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      let stat: ReturnType<typeof statSync>;
      try {
        stat = statSync(fullPath);
} catch (__err) {
      logger.error('Error in walkDir stat', { fullPath, error: String(__err) });
        continue;
      }
      if (stat.isDirectory()) {
        if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
          this.walkDir(fullPath, depth + 1, results);
        }
      } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.json') || entry.endsWith('.yaml'))) {
        const matched = this.matchesPattern(entry);
        if (matched) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const schemas = this.extractSchemas(fullPath, content);
            results.push(...schemas);
    } catch (__err) {
      logger.error('Error in walkDir readFile', { fullPath, error: String(__err) });
    }
        }
      }
    }
  }

  private matchesPattern(filename: string): boolean {
    for (const p of this.options.patterns) {
      const globPart = p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\//g, '[/\\\\]');
      const re = new RegExp(`^${globPart}$`, 'i');
      if (re.test(filename)) return true;
    }
    return false;
  }

  private extractSchemas(filePath: string, content: string): DiscoveredSchema[] {
    const results: DiscoveredSchema[] = [];
    const relPath = relative(this.options.rootDir, filePath);

    let match: RegExpExecArray | null;
    ZOD_OBJECT_RE.lastIndex = 0;
    while ((match = ZOD_OBJECT_RE.exec(content)) !== null) {
      if (match[2]) {
        results.push({
          filePath: relPath,
          schemaName: match[2],
          content: match[0],
          format: 'zod',
        });
      }
    }

    INTERFACE_RE.lastIndex = 0;
    while ((match = INTERFACE_RE.exec(content)) !== null) {
      if (match[1]) {
        const braceCount = this.extractBraceBlock(content, match.index);
        results.push({
          filePath: relPath,
          schemaName: match[1],
          content: braceCount,
          format: 'typescript',
        });
      }
    }

    TYPE_RE.lastIndex = 0;
    while ((match = TYPE_RE.exec(content)) !== null) {
      if (match[1]) {
        const braceCount = this.extractBraceBlock(content, match.index);
        results.push({
          filePath: relPath,
          schemaName: match[1],
          content: braceCount,
          format: 'typescript',
        });
      }
    }

    return results;
  }

  private extractBraceBlock(content: string, startIndex: number): string {
    let braceCount = 0;
    let inBlock = false;
    let endIndex = startIndex;
    for (let i = startIndex; i < content.length; i++) {
      const ch = content[i];
      if (ch === '{') {
        braceCount++;
        inBlock = true;
      } else if (ch === '}') {
        braceCount--;
        if (inBlock && braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
    return content.slice(startIndex, endIndex);
  }
}

export function createSchemaDiscovery(registry: SchemaRegistry, options?: DiscoveryOptions): SchemaDiscovery {
  return new SchemaDiscovery(registry, options);
}
