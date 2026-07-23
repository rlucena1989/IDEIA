import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

/** Interface que define a estrutura de generated file. */
export interface GeneratedFile {
  path: string;
  content: string;
}

function loadSpec(filePath: string): { spec: Record<string, unknown>; name: string } {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, 'utf-8');
  let spec: Record<string, unknown>;
  if (ext === '.json') spec = JSON.parse(raw);
  else spec = parse(raw) as Record<string, unknown>;
  const name = (spec.info as Record<string, unknown>)?.title as string || path.basename(filePath, ext);
  return { spec, name };
}

/**
 * Processa pascal case.
 * @param str - Valor str.
 * @returns O resultado da operação.
 */
export function toPascalCase(str: string): string {
  return str.replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Processa camel case.
 * @param str - Valor str.
 * @returns O resultado da operação.
 */
export function toCamelCase(str: string): string {
  return str.replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^[A-Z]/, c => c.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Resolve ref.
 * @param ref - Valor ref.
 * @param spec - Valor spec.
 * @returns O resultado da operação.
 */
export function resolveRef(ref: string, spec: Record<string, unknown>): Record<string, unknown> | null {
  const parts = ref.replace('#/', '').split('/');
  let current: unknown = spec;
  for (const p of parts) {
    if (current && typeof current === 'object') current = (current as Record<string, unknown>)[p];
    else return null;
  }
  return current as Record<string, unknown> || null;
}

/**
 * Processa type from schema.
 * @param schema - Valor schema.
 * @param spec - Valor spec.
 * @param depth - Valor depth.
 * @returns O resultado da operação.
 */
export function tsTypeFromSchema(schema: Record<string, unknown>, spec: Record<string, unknown>, depth: number = 0): string {
  if (depth > 10) return 'unknown';

  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref as string, spec);
    const refName = (schema.$ref as string).split('/').pop() || 'Unknown';
    if (resolved) return refName;
    return 'unknown';
  }

  if (schema.allOf) return (schema.allOf as Array<Record<string, unknown>>).map(s => tsTypeFromSchema(s, spec, depth + 1)).join(' & ') || 'unknown';
  if (schema.oneOf) return (schema.oneOf as Array<Record<string, unknown>>).map(s => tsTypeFromSchema(s, spec, depth + 1)).join(' | ') || 'unknown';
  if (schema.anyOf) return (schema.anyOf as Array<Record<string, unknown>>).map(s => tsTypeFromSchema(s, spec, depth + 1)).join(' | ') || 'unknown';

  const type = schema.type as string || 'object';
  switch (type) {
    case 'string':
      if (schema.enum) return (schema.enum as string[]).map(e => `'${e}'`).join(' | ');
      if (schema.format === 'date-time') return 'string';
      if (schema.format === 'date') return 'string';
      if (schema.format === 'binary') return 'Blob';
      return 'string';
    case 'integer':
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'array': {
      if (schema.items) return `${tsTypeFromSchema(schema.items as Record<string, unknown>, spec, depth + 1)}[]`;
      return 'unknown[]';
    }
    case 'object':
    default: {
      if (schema.properties) {
        const props = schema.properties as Record<string, unknown>;
        const lines = Object.entries(props).map(([k, v]) => {
          const s = v as Record<string, unknown>;
          const required = (schema.required as string[] || []).includes(k);
          return `  ${k}${required ? '' : '?'}: ${tsTypeFromSchema(s, spec, depth + 1)};`;
        });
        return `{\n${lines.join('\n')}\n}`;
      }
      if (schema.additionalProperties) return `Record<string, ${tsTypeFromSchema(schema.additionalProperties as Record<string, unknown>, spec, depth + 1)}>`;
      return 'Record<string, unknown>';
    }
  }
}

/**
 * Gera client.
 * @param filePath - Valor path.
 * @param outDir - Valor dir.
 * @returns O resultado da operação.
 */
export function generateClient(filePath: string, outDir?: string): GeneratedFile[] {
  const { spec, name } = loadSpec(filePath);
  const files: GeneratedFile[] = [];
  const paths = spec.paths as Record<string, unknown> || {};
  const components = spec.components as Record<string, unknown> || {};
  const schemas = components.schemas as Record<string, unknown> || {};
  const types: string[] = [];
  const functions: string[] = [];

  for (const [schemaName, schemaDef] of Object.entries(schemas)) {
    const tsType = tsTypeFromSchema(schemaDef as Record<string, unknown>, spec);
    types.push(`export interface ${toPascalCase(schemaName)} ${tsType}`);
  }

  for (const [p, methods] of Object.entries(paths)) {
    if (typeof methods !== 'object') continue;
    for (const [method, op] of Object.entries(methods as Record<string, unknown>)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      const opObj = op as Record<string, unknown>;
      const opId = (opObj.operationId as string) || `${method}${toPascalCase(p)}`;
      const params: string[] = [];

      const parameters = opObj.parameters as Array<Record<string, unknown>> || [];
      for (const param of parameters) {
        const pName = param.name as string;
        const required = param.required as boolean || false;
        const schema = param.schema as Record<string, unknown> || {};
        const tsType = tsTypeFromSchema(schema, spec);
        params.push(`${pName}${required ? '' : '?'}: ${tsType}`);
      }

      const requestBody = opObj.requestBody as Record<string, unknown>;
      if (requestBody) {
        const content = requestBody.content as Record<string, unknown> || {};
        const jsonContent = content['application/json'] as Record<string, unknown>;
        if (jsonContent?.schema) {
          params.push(`body: ${tsTypeFromSchema(jsonContent.schema as Record<string, unknown>, spec)}`);
        }
      }

      const urlTemplate = p.replace(/\{([^}]+)\}/g, '${$1}');
      const paramDecl = params.length > 0 ? `params: { ${params.join('; ')} }` : '';

      functions.push(`export async function ${toCamelCase(opId)}(${paramDecl}): Promise<Response> {
  return fetch(\`${urlTemplate}\`, {
    method: '${method.toUpperCase()}',
    headers: { 'Content-Type': 'application/json' },
    ${requestBody ? `body: JSON.stringify(params.body),` : ''}
  });
}`);
    }
  }

  const typesContent = types.length > 0 ? types.join('\n\n') + '\n\n' : '// No schemas defined\n\n';
  const clientContent = functions.join('\n\n');
  const fullContent = `// Auto-generated client for ${name}\n// Generated by ai-devkit contract generate-client\n\n${typesContent}${clientContent}\n`;

  const outputPath = outDir ? path.join(outDir, `${toCamelCase(name)}-client.ts`) : `${toCamelCase(name)}-client.ts`;
  files.push({ path: outputPath, content: fullContent });

  return files;
}

/**
 * Gera server.
 * @param filePath - Valor path.
 * @param outDir - Valor dir.
 * @returns O resultado da operação.
 */
export function generateServer(filePath: string, outDir?: string): GeneratedFile[] {
  const { spec, name } = loadSpec(filePath);
  const files: GeneratedFile[] = [];
  const paths = spec.paths as Record<string, unknown> || {};
  const routes: string[] = [];

  routes.push(`import { Router, Request, Response } from 'express';\n`);

  for (const [p, methods] of Object.entries(paths)) {
    if (typeof methods !== 'object') continue;
    for (const [method, op] of Object.entries(methods as Record<string, unknown>)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      const opObj = op as Record<string, unknown>;
      const opId = (opObj.operationId as string) || `${method}${toPascalCase(p)}`;
      const summary = (opObj.summary as string) || '';

      routes.push(`// ${summary}`);
      routes.push(`router.${method}('${p}', async (req: Request, res: Response) => {`);
      routes.push(`  // Implementar logica do endpoint ${opId} (regras de negocio, validacao, persistencia)`);
      routes.push(`  res.status(501).json({ message: 'Not implemented: ${opId}' });`);
      routes.push(`});\n`);
    }
  }

  routes.push(`export default router;\n`);

  const fullContent = routes.join('\n');
  const outputPath = outDir ? path.join(outDir, `${toCamelCase(name)}-routes.ts`) : `${toCamelCase(name)}-routes.ts`;
  files.push({ path: outputPath, content: fullContent });

  return files;
}
