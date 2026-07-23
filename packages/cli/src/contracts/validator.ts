import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

/** Interface que define a estrutura de validation result. */
export interface ValidationResult {
  valid: boolean;
  specType: 'openapi' | 'asyncapi' | 'graphql' | 'unknown';
  errors: string[];
  warnings: string[];
  info: Record<string, unknown>;
}

function loadSpec(filePath: string): Record<string, unknown> {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, 'utf-8');
  if (ext === '.json') return JSON.parse(raw);
  if (ext === '.yaml' || ext === '.yml') return parse(raw) as Record<string, unknown>;
  try { return JSON.parse(raw); } catch { return parse(raw) as Record<string, unknown>; }
}

/**
 * Detecta type.
 * @param spec - Valor spec.
 * @returns O resultado da operação.
 */
export function detectType(spec: Record<string, unknown>): 'openapi' | 'asyncapi' | 'graphql' | 'unknown' {
  if (spec.openapi) return 'openapi';
  if (spec.asyncapi) return 'asyncapi';
  if (spec.__schema || (typeof spec.schema === 'object' && spec.schema !== null)) return 'graphql';
  return 'unknown';
}

function validateOpenAPI(spec: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: Record<string, unknown> = {};

  const version = spec.openapi;
  if (!version) errors.push('Campo "openapi" (versao) é obrigatorio');
  else if (!String(version).startsWith('3.')) warnings.push(`Versao OpenAPI "${version}" nao e 3.x — alguns recursos podem nao funcionar`);

  if (!spec.info || typeof spec.info !== 'object') errors.push('Campo "info" é obrigatorio');
  else {
    const i = spec.info as Record<string, unknown>;
    if (!i.title) errors.push('info.title é obrigatorio');
    if (!i.version) errors.push('info.version é obrigatorio');
    info.title = i.title || '(sem titulo)';
    info.version = i.version || '(sem versao)';
  }

  if (!spec.paths || typeof spec.paths !== 'object') errors.push('Campo "paths" é obrigatorio');
  else {
    const paths = spec.paths as Record<string, unknown>;
    const pathCount = Object.keys(paths).length;
    info.paths = pathCount;
    for (const [p, methods] of Object.entries(paths)) {
      if (typeof methods !== 'object') continue;
      for (const [method, op] of Object.entries(methods as Record<string, unknown>)) {
        if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method)) {
          const opObj = op as Record<string, unknown>;
          if (!opObj.operationId) warnings.push(`Path "${p}" method "${method}" sem operationId`);
          if (!opObj.responses) warnings.push(`Path "${p}" method "${method}" sem responses`);
        }
      }
    }
  }

  if (spec.components) {
    const c = spec.components as Record<string, unknown>;
    if (c.schemas) info.schemas = Object.keys(c.schemas as Record<string, unknown>).length;
    if (c.securitySchemes) info.securitySchemes = Object.keys(c.securitySchemes as Record<string, unknown>).length;
  }

  if (!spec.paths || Object.keys(spec.paths as Record<string, unknown>).length === 0) warnings.push('Nenhum path definido');

  return { valid: errors.length === 0, specType: 'openapi', errors, warnings, info };
}

function validateAsyncAPI(spec: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: Record<string, unknown> = {};

  const version = spec.asyncapi;
  if (!version) errors.push('Campo "asyncapi" (versao) é obrigatorio');
  info.asyncapi = version || '(desconhecido)';

  if (!spec.info || typeof spec.info !== 'object') errors.push('Campo "info" é obrigatorio');
  else {
    const i = spec.info as Record<string, unknown>;
    if (!i.title) errors.push('info.title é obrigatorio');
    if (!i.version) errors.push('info.version é obrigatorio');
    info.title = i.title || '(sem titulo)';
    info.version = i.version || '(sem versao)';
  }

  if (!spec.channels || typeof spec.channels !== 'object') errors.push('Campo "channels" é obrigatorio');
  else {
    const channels = spec.channels as Record<string, unknown>;
    info.channels = Object.keys(channels).length;
    if (Object.keys(channels).length === 0) warnings.push('Nenhum channel definido');
  }

  if (spec.components) {
    const c = spec.components as Record<string, unknown>;
    if (c.messages) info.messages = Object.keys(c.messages as Record<string, unknown>).length;
    if (c.schemas) info.schemas = Object.keys(c.schemas as Record<string, unknown>).length;
  }

  return { valid: errors.length === 0, specType: 'asyncapi', errors, warnings, info };
}

function validateGraphQL(spec: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: Record<string, unknown> = {};

  if (spec.__schema) {
    const schema = spec.__schema as Record<string, unknown>;
    const types = schema.types as Array<Record<string, unknown>> || [];
    const queryType = schema.queryType as Record<string, unknown>;
    info.types = types.length;
    info.queryType = queryType?.name || '(desconhecido)';

    const hasQuery = types.some((t: Record<string, unknown>) => t.name === 'Query');
    if (!hasQuery) errors.push('Schema nao possui tipo "Query" — consultas GraphQL nao funcionarao');

    const typeNames = types.map((t: Record<string, unknown>) => t.name).filter(Boolean);
    if (typeNames.length < 3) warnings.push('Schema possui poucos tipos — verifique se esta completo');
  } else if (spec.schema) {
    const s = spec.schema as Record<string, unknown>;
    info.type = s.kind || '(desconhecido)';
    if (s.fields) info.fields = (s.fields as Array<unknown>).length;
  } else {
    errors.push('Schema GraphQL nao reconhecido — necessario __schema ou schema');
  }

  return { valid: errors.length === 0, specType: 'graphql', errors, warnings, info };
}

/**
 * Valida spec.
 * @param filePath - Valor path.
 * @returns O resultado da operação.
 */
export function validateSpec(filePath: string): ValidationResult {
  const spec = loadSpec(filePath);
  const type = detectType(spec);

  switch (type) {
    case 'openapi': return validateOpenAPI(spec);
    case 'asyncapi': return validateAsyncAPI(spec);
    case 'graphql': return validateGraphQL(spec);
    default: return { valid: false, specType: 'unknown', errors: ['Tipo de spec nao reconhecido — use openapi, asyncapi ou graphql'], warnings: [], info: {} };
  }
}

/**
 * Detecta spec type.
 * @param filePath - Valor path.
 * @returns O resultado da operação.
 */
export function detectSpecType(filePath: string): string {
  const spec = loadSpec(filePath);
  return detectType(spec);
}
