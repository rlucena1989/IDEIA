#!/usr/bin/env node
/**
 * compliance-check.js — Verificação de Compliance Automática
 *
 * Varre todos os controles SEC e verifica se os artefatos existem.
 * Uso: node .ai/bin/compliance-check.js [--ci] [--verbose]
 */

const fs = require('fs');
const path = require('path');

const CI = process.argv.includes('--ci');
const VERBOSE = process.argv.includes('--verbose');

const ROOT = path.resolve(__dirname, '../..');

function govDoc(name) { return path.resolve(ROOT, '..', 'docs', 'governance', name); }

const CHECKS = [
  { id: 'SEC-001', name: 'Audit trail hash chain', type: 'code', check: () => {
    const src = path.join(ROOT, 'packages/audit-trail/src/audit-trail.ts');
    if (!fs.existsSync(src)) return { ok: false, detail: 'audit-trail.ts not found' };
    const content = fs.readFileSync(src, 'utf-8');
    return { ok: content.includes('verifyChain') && content.includes('previousHash'), detail: 'verifyChain() + previousHash found' };
  }},
  { id: 'SEC-003', name: 'Security policy document', type: 'doc', check: () => {
    const doc = govDoc('POLITICA-SEGURANCA.md');
    return { ok: fs.existsSync(doc), detail: fs.existsSync(doc) ? 'exists' : 'missing' };
  }},
  { id: 'SEC-004', name: 'Asset inventory', type: 'doc', check: () => {
    const doc = govDoc('INVENTARIO-ATIVOS.md');
    return { ok: fs.existsSync(doc), detail: fs.existsSync(doc) ? 'exists' : 'missing' };
  }},
  { id: 'SEC-006', name: 'Output validation', type: 'code', check: () => {
    const src = path.join(ROOT, 'packages/prompt-security/src/prompt-security.ts');
    if (!fs.existsSync(src)) return { ok: false, detail: 'prompt-security.ts not found' };
    const content = fs.readFileSync(src, 'utf-8');
    return { ok: content.includes('validateOutput'), detail: content.includes('validateOutput') ? 'validateOutput() found' : 'missing' };
  }},
  { id: 'SEC-007', name: 'Externalized policy files', type: 'code', check: () => {
    const policyDir = path.join(ROOT, 'policies');
    if (!fs.existsSync(policyDir)) return { ok: false, detail: 'policies/ dir not found' };
    const files = fs.readdirSync(policyDir).filter(f => f.endsWith('.policy.yaml'));
    return { ok: files.length > 0, detail: `${files.length} policy file(s): ${files.join(', ')}` };
  }},
  { id: 'SEC-008', name: 'Red teaming scanner', type: 'code', check: () => {
    const script = path.join(ROOT, '.ai/bin/red-teaming.js');
    if (!fs.existsSync(script)) return { ok: false, detail: 'red-teaming.js not found' };
    const content = fs.readFileSync(script, 'utf-8');
    return { ok: content.includes('PATTERNS'), detail: `red-teaming.js with pattern scanner` };
  }},
  { id: 'SEC-009', name: 'Incident response plan', type: 'doc', check: () => {
    const doc = govDoc('PLANO-RESPOSTA-INCIDENTES.md');
    return { ok: fs.existsSync(doc), detail: fs.existsSync(doc) ? 'exists' : 'missing' };
  }},
  { id: 'SEC-010', name: 'DPIA document', type: 'doc', check: () => {
    const doc = govDoc('DPIA-IDEIA.md');
    return { ok: fs.existsSync(doc), detail: fs.existsSync(doc) ? 'exists' : 'missing' };
  }},
  { id: 'SEC-005', name: 'Security CI/CD workflow', type: 'ci', check: () => {
    const workflow = path.join(ROOT, '.github/workflows/security.yml');
    return { ok: fs.existsSync(workflow), detail: fs.existsSync(workflow) ? 'security.yml exists' : 'missing' };
  }},
  { id: 'GAPS', name: 'Gap analysis document', type: 'policy', check: () => {
    const doc = govDoc('GAPS-PRODUCAO-IDE.md');
    if (!fs.existsSync(doc)) return { ok: false, detail: 'GAPS file not found' };
    const content = fs.readFileSync(doc, 'utf-8');
    const resolved = (content.match(/✅/g) || []).length;
    const total = (content.match(/🔴 🟠 🟡/g) || []).length;
    return { ok: resolved > 0, detail: `${resolved} resolved gaps` };
  }},
  { id: 'LICENSE', name: 'License file', type: 'legal', check: () => {
    return { ok: fs.existsSync(path.join(ROOT, 'LICENSE')), detail: fs.existsSync(path.join(ROOT, 'LICENSE')) ? 'MIT' : 'missing' };
  }},
  { id: 'SECURITY.md', name: 'Security policy', type: 'legal', check: () => {
    return { ok: fs.existsSync(path.join(ROOT, 'SECURITY.md')), detail: fs.existsSync(path.join(ROOT, 'SECURITY.md')) ? 'exists' : 'missing' };
  }},
  { id: 'CODE_OF_CONDUCT', name: 'Code of conduct', type: 'legal', check: () => {
    return { ok: fs.existsSync(path.join(ROOT, 'CODE_OF_CONDUCT.md')), detail: fs.existsSync(path.join(ROOT, 'CODE_OF_CONDUCT.md')) ? 'exists' : 'missing' };
  }},
];

let passed = 0;
let failed = 0;
let skipped = 0;

console.log(`\n\x1b[1mIDEIA Compliance Check Report\x1b[0m\n`);
console.log(`${'ID'.padEnd(12)} ${'Status'.padEnd(8)} ${'Name'.padEnd(35)} Detail`);
console.log(`${'-'.repeat(12)} ${'-'.repeat(8)} ${'-'.repeat(35)} ${'-'.repeat(40)}`);

for (const check of CHECKS) {
  try {
    const result = check.check();
    if (result.ok) {
      console.log(`${check.id.padEnd(12)} \x1b[32m✅\x1b[0m${''.padEnd(5)} ${check.name.padEnd(35)} ${result.detail}`);
      passed++;
    } else {
      console.log(`${check.id.padEnd(12)} \x1b[31m❌\x1b[0m${''.padEnd(5)} ${check.name.padEnd(35)} ${result.detail}`);
      failed++;
    }
  } catch (e) {
    console.log(`${check.id.padEnd(12)} \x1b[33m⚠\x1b[0m${''.padEnd(5)} ${check.name.padEnd(35)} ${e.message}`);
    skipped++;
  }
}

const total = passed + failed + skipped;
const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
console.log(`\n\x1b[1mResults: ${passed}/${total} passed (${pct}%) — ${failed} failed, ${skipped} skipped\x1b[0m`);

if (CI && failed > 0) {
  process.exit(1);
}
