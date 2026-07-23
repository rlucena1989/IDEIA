import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from '../engine';

/** Interface que define a estrutura de field def. */
export interface FieldDef {
  name: string;
  type: 'String' | 'Int' | 'Float' | 'Boolean' | 'DateTime' | 'Json' | 'BigInt' | 'Decimal';
  optional?: boolean;
  unique?: boolean;
  default?: string;
  relation?: string;
}

/** Interface que define a estrutura de model def. */
export interface ModelDef {
  name: string;
  fields: FieldDef[];
}

function parseModels(input: string): ModelDef[] {
  const lines = input.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
  const models: ModelDef[] = [];
  let current: ModelDef | null = null;

  for (const line of lines) {
    const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      if (current) models.push(current);
      current = { name: modelMatch[1], fields: [] };
      continue;
    }
    if (line === '}' && current) {
      models.push(current);
      current = null;
      continue;
    }
    if (current && line.match(/^\w/)) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const f: FieldDef = { name: parts[0], type: parts[1] as FieldDef['type'] };
        if (line.includes('?')) f.optional = true;
        if (line.includes('@unique')) f.unique = true;
        if (line.includes('@default(')) {
          const m = line.match(/@default\(([^)]+)\)/);
          if (m) f.default = m[1];
        }
        current.fields.push(f);
      }
    }
  }
  return models;
}

/**
 * Gera prisma schema.
 * @param models - Valor models.
 * @returns O resultado da operação.
 */
export function generatePrismaSchema(models: ModelDef[]): string {
  const lines: string[] = ['generator client {', '  provider = "prisma-client-js"', '}', '', 'datasource db {', '  provider = "postgresql"', '  url      = env("DATABASE_URL")', '}', ''];
  for (const model of models) {
    lines.push(`model ${model.name} {`);
    lines.push('  id    Int     @id @default(autoincrement())');
    for (const f of model.fields) {
      const opt = f.optional ? '?' : '';
      const attrs = [f.unique ? '@unique' : '', f.default ? `@default(${f.default})` : ''].filter(Boolean).join(' ');
      lines.push(`  ${f.name} ${f.type}${opt}${attrs ? ' ' + attrs : ''}`);
    }
    lines.push('  createdAt DateTime @default(now())');
    lines.push('  updatedAt DateTime @updatedAt');
    lines.push('}', '');
  }
  return lines.join('\n');
}

/**
 * Gera type script types.
 * @param models - Valor models.
 * @returns O resultado da operação.
 */
export function generateTypeScriptTypes(models: ModelDef[]): string {
  return models.map(m => {
    const fields = m.fields.map(f => `  ${f.name}${f.optional ? '?' : ''}: ${f.type === 'DateTime' ? 'string' : f.type === 'Int' || f.type === 'BigInt' ? 'number' : f.type};`);
    return `export interface ${m.name} {\n  id: number;\n${fields.join('\n')}\n  createdAt: string;\n  updatedAt: string;\n}`;
  }).join('\n\n');
}

/** Interface que define a estrutura de schema options. */
export interface SchemaOptions extends GeneratorOptions {
  input?: string;
}

/**
 * Processa schema.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function schema(name: string, options: SchemaOptions): void {
  const vars = buildVars(name);
  const input = options.input || `model ${vars.Name} {\n  title String\n  description String?\n  status String @default("draft")\n}`;

  const models = parseModels(input);
  const prisma = generatePrismaSchema(models);
  const types = generateTypeScriptTypes(models);

  const files: FileEntry[] = [
    {
      path: `prisma/schema.prisma`,
      content: prisma,
    },
    {
      path: `src/generated/types.ts`,
      content: types,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Schema: ${name} (${models.length} modelos)`, result, options.dryRun);
}
