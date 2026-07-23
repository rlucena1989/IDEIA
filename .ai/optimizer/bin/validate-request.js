#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const requestPath = process.argv[2];
  if (!requestPath) {
    console.error('Usage: validate-request.js <request.json>');
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const root = process.cwd();
  const schemaPath = path.join(root, '.ai/optimizer/schemas/impact-request.schema.json');
  const inputPath = path.resolve(root, requestPath);

  if (!fs.existsSync(schemaPath)) {
    console.error('Schema not found. Run validate-optimizer-config.js first.');
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`Request file not found: ${inputPath}`);
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  const errors = [];
  for (const key of schema.required || []) {
    if (input[key] === undefined || input[key] === null || input[key] === '') {
      errors.push(`Campo obrigatório ausente: ${key}`);
    }
  }

  if (schema.properties?.task_hint?.enum && !schema.properties.task_hint.enum.includes(input.task_hint)) {
    errors.push(`task_hint inválido: "${input.task_hint}". Valores: ${schema.properties.task_hint.enum.join(', ')}`);
  }

  if (errors.length > 0) {
    console.error('Request validation failed:');
    for (const err of errors) console.error(`- ${err}`);
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  console.log('Request validation passed.');
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
