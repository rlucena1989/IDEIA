import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { parse } from 'yaml';

/** Interface que define a estrutura de lint issue. */
export interface LintIssue {
  severity: 'error' | 'warning' | 'info';
  rule: string;
  path: string;
  message: string;
}

/** Interface que define a estrutura de lint result. */
export interface LintResult {
  specType: string;
  issues: LintIssue[];
  score: number;
}

function loadSpec(filePath: string): { raw: string; spec: Record<string, unknown>; ext: string } {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, 'utf-8');
  let spec: Record<string, unknown>;
  if (ext === '.json') spec = JSON.parse(raw);
  else spec = parse(raw) as Record<string, unknown>;
  return { raw, spec, ext };
}

function lintOpenAPI(spec: Record<string, unknown>): LintIssue[] {
  const issues: LintIssue[] = [];

  if (!spec.servers) issues.push({ severity: 'warning', rule: 'no-servers', path: 'root', message: 'Nenhum server definido — spec pode nao ser executavel' });

  const paths = spec.paths as Record<string, unknown> || {};
  for (const [p, methods] of Object.entries(paths)) {
    if (typeof methods !== 'object') continue;
    for (const [method, op] of Object.entries(methods as Record<string, unknown>)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method)) continue;
      const opObj = op as Record<string, unknown>;

      if (!opObj.operationId) issues.push({ severity: 'warning', rule: 'operation-id', path: `${p}.${method}`, message: 'operationId ausente — documentacao automatica prejudicada' });

      if (method === 'get' && opObj.requestBody) issues.push({ severity: 'warning', rule: 'get-body', path: `${p}.${method}`, message: 'GET com requestBody — nao recomendado' });

      if (!opObj.responses) issues.push({ severity: 'error', rule: 'responses', path: `${p}.${method}`, message: 'Nenhuma resposta definida' });

      const responses = opObj.responses as Record<string, unknown> || {};
      if (!responses['200'] && !responses['201'] && !responses['204']) issues.push({ severity: 'warning', rule: 'success-response', path: `${p}.${method}`, message: 'Nenhuma resposta de sucesso (2xx) definida' });

      if (method === 'post' || method === 'put' || method === 'patch') {
        if (!responses['201'] && method === 'post') issues.push({ severity: 'info', rule: 'created-response', path: `${p}.${method}`, message: 'POST tipicamente retorna 201 Created' });
        if (!responses['400']) issues.push({ severity: 'info', rule: 'validation-response', path: `${p}.${method}`, message: 'Considere adicionar resposta 400 Bad Request' });
        if (!responses['422']) issues.push({ severity: 'info', rule: 'unprocessable-response', path: `${p}.${method}`, message: 'Considere adicionar resposta 422 Unprocessable Entity' });
      }
    }
  }

  const components = spec.components as Record<string, unknown> || {};
  const securitySchemes = components.securitySchemes as Record<string, unknown> || {};
  if (Object.keys(securitySchemes).length === 0) issues.push({ severity: 'warning', rule: 'security', path: 'root', message: 'Nenhum security scheme definido — considere adicionar autenticacao' });

  return issues;
}

function lintAsyncAPI(spec: Record<string, unknown>): LintIssue[] {
  const issues: LintIssue[] = [];

  const channels = spec.channels as Record<string, unknown> || {};
  if (Object.keys(channels).length === 0) issues.push({ severity: 'error', rule: 'no-channels', path: 'root', message: 'Nenhum channel definido' });

  for (const [ch, chObj] of Object.entries(channels)) {
    if (typeof chObj !== 'object') continue;
    const c = chObj as Record<string, unknown>;

    const subscribe = c.subscribe as Record<string, unknown>;
    const publish = c.publish as Record<string, unknown>;
    if (!subscribe && !publish) issues.push({ severity: 'error', rule: 'channel-operation', path: ch, message: 'Channel sem subscribe ou publish' });

    if (subscribe) {
      const msg = subscribe.message as Record<string, unknown>;
      if (!msg) issues.push({ severity: 'warning', rule: 'channel-message', path: `${ch}.subscribe`, message: 'Subscribe sem message definida' });
    }

    if (publish) {
      const msg = publish.message as Record<string, unknown>;
      if (!msg) issues.push({ severity: 'warning', rule: 'channel-message', path: `${ch}.publish`, message: 'Publish sem message definida' });
    }
  }

  const components = spec.components as Record<string, unknown> || {};
  const securitySchemes = components.securitySchemes as Record<string, unknown> || {};
  if (Object.keys(securitySchemes).length === 0) issues.push({ severity: 'info', rule: 'security', path: 'root', message: 'Nenhum security scheme definido' });

  return issues;
}

function lintGraphQL(spec: Record<string, unknown>): LintIssue[] {
  const issues: LintIssue[] = [];

  if (spec.__schema) {
    const schema = spec.__schema as Record<string, unknown>;
    const types = schema.types as Array<Record<string, unknown>> || [];

    const queryType = types.find(t => t.name === 'Query');
    const mutationType = types.find(t => t.name === 'Mutation');

    if (!queryType) issues.push({ severity: 'error', rule: 'no-query', path: 'root', message: 'Tipo Query nao encontrado — consultas nao funcionarao' });

    if (!mutationType) issues.push({ severity: 'info', rule: 'no-mutation', path: 'root', message: 'Tipo Mutation nao encontrado — apenas leitura' });

    for (const t of types) {
      const tName = t.name as string || '';
      if (['Query', 'Mutation', 'Subscription', '__Type', '__Schema', '__Field', '__InputValue', '__EnumValue', '__Directive'].includes(tName)) continue;
      const fields = t.fields as Array<Record<string, unknown>> || [];
      if (fields.length === 0 && !(t.kind === 'SCALAR' || t.kind === 'ENUM')) issues.push({ severity: 'warning', rule: 'empty-type', path: `type.${tName}`, message: `Tipo "${tName}" sem campos` });

      for (const f of fields) {
        const fName = f.name as string || '';
        if (!f.description && fName !== 'id') issues.push({ severity: 'info', rule: 'field-documentation', path: `type.${tName}.${fName}`, message: `Campo "${fName}" sem descricao` });
      }
    }
  }

  return issues;
}

/**
 * Analisa spec.
 * @param filePath - Valor path.
 * @returns O resultado da operação.
 */
export function lintSpec(filePath: string): LintResult {
  const { spec } = loadSpec(filePath);
  const specType = spec.openapi ? 'openapi' : spec.asyncapi ? 'asyncapi' : spec.__schema || spec.schema ? 'graphql' : 'unknown';
  let issues: LintIssue[] = [];

  switch (specType) {
    case 'openapi': issues = lintOpenAPI(spec); break;
    case 'asyncapi': issues = lintAsyncAPI(spec); break;
    case 'graphql': issues = lintGraphQL(spec); break;
    default: issues = [{ severity: 'error', rule: 'unknown-type', path: 'root', message: 'Tipo de spec nao reconhecido' }];
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const infos = issues.filter(i => i.severity === 'info').length;
  const maxScore = (errors + warnings + infos) * 10 || 10;
  const deductions = errors * 10 + warnings * 5 + infos * 2;
  const score = Math.max(0, 100 - (deductions / Math.max(maxScore, 1)) * 100);

  return { specType, issues, score: Math.round(score) };
}
