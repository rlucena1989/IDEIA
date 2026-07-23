#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const { parseArgs, printHelp, ensureDir, log, info, warn } = require('./lib/common');
const { toPascalCase, toCamelCase } = require('../generators/helpers/naming');

const args = parseArgs(process.argv.slice(2));

if (args.help || args._.length === 0) {
  printHelp(
    'api-client-generate.js — Gera TypeScript API client a partir de spec OpenAPI 3',
    'node .ai/bin/api-client-generate.js <spec.yaml|json> [--name <name>] [--out <dir>]',
    [
      '--name <name>  Client name (default: derivado do filename)',
      '--out <dir>    Output dir (default: src/api-client/)',
    ]
  );
  process.exit(0);
}

const specFile = args._[0];
const specPath = path.resolve(process.cwd(), specFile);

if (!fs.existsSync(specPath)) {
  console.error(`Spec file not found: ${specFile}`);
  process.exit(1);
}

const clientName = toPascalCase(args.name || path.basename(specFile, path.extname(specFile)));
const outDir = args.out || path.join('src', 'api-client');
const templateDir = path.join(__dirname, '..', 'generators', 'templates', 'api-client');

let specContent = fs.readFileSync(specPath, 'utf-8');
let spec;

if (specFile.endsWith('.yaml') || specFile.endsWith('.yml')) {
  try {
    const yaml = require('js-yaml');
    spec = yaml.load(specContent);
  } catch (e) {
    console.error(`YAML parse error: ${e.message}`);
    process.exit(1);
  }
} else {
  try {
    spec = JSON.parse(specContent);
  } catch (e) {
    console.error(`JSON parse error: ${e.message}`);
    process.exit(1);
  }
}

if (!spec.openapi || !spec.openapi.startsWith('3')) {
  console.error('Only OpenAPI 3.x specs are supported.');
  process.exit(1);
}

function resolveRef(spec, ref) {
  if (!ref || !ref.startsWith('#/')) return null;
  const parts = ref.replace('#/', '').split('/');
  let current = spec;
  for (const part of parts) {
    current = current[part];
    if (!current) return null;
  }
  return current;
}

function schemaToTs(schema, spec) {
  if (!schema) return 'unknown';
  if (schema.$ref) {
    const resolved = resolveRef(spec, schema.$ref);
    if (resolved) return schemaToTs(resolved, spec);
    const refName = schema.$ref.split('/').pop();
    return toPascalCase(refName);
  }
  switch (schema.type) {
    case 'string': return 'string';
    case 'integer': case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'array':
      return `${schemaToTs(schema.items, spec)}[]`;
    case 'object': {
      if (schema.properties) {
        const props = Object.entries(schema.properties).map(([k, v]) => {
          const req = (schema.required || []).includes(k);
          return `  ${k}${req ? '' : '?'}: ${schemaToTs(v, spec)};`;
        }).join('\n');
        return `{\n${props}\n}`;
      }
      return 'Record<string, unknown>';
    }
    default: return 'unknown';
  }
}

const schemas = [];
const schemaDefs = spec.components?.schemas || {};
for (const [name, schema] of Object.entries(schemaDefs)) {
  const properties = [];
  if (schema.properties) {
    const required = schema.required || [];
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      properties.push({
        name: propName,
        type: schemaToTs(propSchema, spec),
        required: required.includes(propName),
      });
    }
  }
  schemas.push({ name: toPascalCase(name), properties });
}

const operations = [];
const paths = spec.paths || {};
for (const [pathStr, methods] of Object.entries(paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (['get', 'post', 'put', 'patch', 'delete'].indexOf(method) === -1) continue;
    const opId = op.operationId || `${method}${toPascalCase(pathStr.replace(/[{}\/]/g, '-'))}`;
    const funcName = toCamelCase(opId);

    const hasBody = ['post', 'put', 'patch'].includes(method);
    const hasParams = !!(op.parameters && op.parameters.length > 0);

    let bodyType = 'unknown';
    if (hasBody && op.requestBody) {
      const content = op.requestBody.content;
      if (content && content['application/json'] && content['application/json'].schema) {
        bodyType = schemaToTs(content['application/json'].schema, spec);
      }
    }

    let responseType = 'unknown';
    const okResp = op.responses?.['200'] || op.responses?.['201'] || op.responses?.['default'];
    if (okResp && okResp.content && okResp.content['application/json'] && okResp.content['application/json'].schema) {
      responseType = schemaToTs(okResp.content['application/json'].schema, spec);
    }

    let paramsType = 'Record<string, string>';
    if (hasParams) {
      const params = op.parameters.map(p => `  ${p.name}${p.required ? '' : '?'}: string;`).join('\n');
      paramsType = `{\n${params}\n}`;
    }

    operations.push({
      functionName: funcName,
      method,
      path: pathStr,
      hasBody,
      hasParams,
      bodyType,
      responseType,
      paramsType,
    });
  }
}

function renderTemplate(file, data) {
  const tpl = fs.readFileSync(path.join(templateDir, file), 'utf-8');
  return Handlebars.compile(tpl)(data);
}

const typesContent = renderTemplate('types.ts.hbs', { schemas });
const clientContent = renderTemplate('client.ts.hbs', { operations });

const outBase = path.join(process.cwd(), outDir);
const typesFile = path.join(outBase, 'types.ts');
const clientFile = path.join(outBase, 'client.ts');

let created = 0;
let skipped = 0;

for (const [filePath, content] of [[typesFile, typesContent], [clientFile, clientContent]]) {
  if (fs.existsSync(filePath)) {
    warn(`Skip (exists): ${path.relative(process.cwd(), filePath)}`);
    skipped++;
    continue;
  }
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
  log(`Create: ${path.relative(process.cwd(), filePath)}`);
  created++;
}

console.log('');
info(`Client: ${clientName}`);
info(`Schemas: ${schemas.length} | Operations: ${operations.length}`);
info(`Created: ${created} | Skipped: ${skipped}`);
