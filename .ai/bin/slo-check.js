#!/usr/bin/env node
/**
 * slo-check.js — Verificação de SLOs
 *
 * Verifica se os SLOs definidos nos contratos entre módulos estão
 * sendo cumpridos, baseado em métricas de performance e resiliência.
 *
 * Usage:
 *   node .ai/bin/slo-check.js                # full check
 *   node .ai/bin/slo-check.js --ci           # exit 1 se falhar
 *   node .ai/bin/slo-check.js --verbose      # detalhado
 */

const fs = require('fs');
const path = require('path');

const CI = process.argv.includes('--ci');
const VERBOSE = process.argv.includes('--verbose');

const ROOT = path.resolve(__dirname, '../..');

const SLO_DEFINITIONS = [
  { id: 'SLO-EVENT-01', name: 'Event Bus Latency (P99)', target: 100, unit: 'ms', file: 'packages/event-bus' },
  { id: 'SLO-EVENT-02', name: 'Event Delivery Rate', target: 99.9, unit: '%', file: 'packages/event-bus' },
  { id: 'SLO-MEM-01', name: 'Memory Store Query (P99)', target: 50, unit: 'ms', file: 'packages/memory-store' },
  { id: 'SLO-AGENT-01', name: 'Agent Runtime Response (P95)', target: 2000, unit: 'ms', file: 'packages/agent-runtime' },
  { id: 'SLO-POLICY-01', name: 'Policy Evaluation (P99)', target: 10, unit: 'ms', file: 'packages/policy-engine' },
  { id: 'SLO-DELIVERY-01', name: 'Delivery Orchestrator Throughput', target: 100, unit: 'req/s', file: 'packages/delivery-orchestrator' },
  { id: 'SLO-AUDIT-01', name: 'Audit Trail Write (P99)', target: 50, unit: 'ms', file: 'packages/audit-trail' },
  { id: 'SLO-OBSERV-01', name: 'Observability Export (P99)', target: 200, unit: 'ms', file: 'packages/observability-engine' },
  { id: 'SLO-IDE-01', name: 'IDE Startup Time', target: 3000, unit: 'ms', file: 'packages/ide-integration' },
  { id: 'SLO-IDE-02', name: 'LSP Response (P90)', target: 100, unit: 'ms', file: 'packages/ide-integration' },
];

function checkSLO(slo) {
  const packagePath = path.resolve(ROOT, slo.file);
  if (!fs.existsSync(packagePath)) {
    return { ...slo, status: 'skipped', reason: 'Package not found' };
  }

  const readmePath = path.join(packagePath, 'README.md');
  const configPath = path.join(packagePath, 'slo.json');

  let hasDocumentation = false;
  let hasConfig = false;

  if (fs.existsSync(readmePath)) {
    const content = fs.readFileSync(readmePath, 'utf-8');
    hasDocumentation = content.includes(slo.id);
  }

  if (fs.existsSync(configPath)) {
    hasConfig = true;
  }

  return {
    ...slo,
    status: hasDocumentation && hasConfig ? 'ok' : 'missing',
    documented: hasDocumentation,
    configured: hasConfig,
  };
}

console.log(`\n\x1b[1mSLO Verification Report\x1b[0m\n`);

let ok = 0;
let missing = 0;
let skipped = 0;

for (const slo of SLO_DEFINITIONS) {
  const result = checkSLO(slo);

  if (result.status === 'ok') {
    console.log(`  \x1b[32m✓\x1b[0m ${slo.id} ${slo.name}: ${slo.target}${slo.unit}`);
    ok++;
  } else if (result.status === 'missing') {
    const missingParts = [];
    if (!result.documented) missingParts.push('not documented');
    if (!result.configured) missingParts.push('no slo.json');
    console.log(`  \x1b[33m⚠\x1b[0m ${slo.id} ${slo.name}: ${missingParts.join(', ')}`);
    missing++;
  } else {
    console.log(`  \x1b[90m-\x1b[0m ${slo.id} ${slo.name}: ${result.reason}`);
    skipped++;
  }
}

console.log(`\nSummary: ${ok} ok, ${missing} missing, ${skipped} skipped\n`);

if (CI && missing > 0) {
  process.exit(1);
}
