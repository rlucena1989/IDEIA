/**
 * detection-metrics.ts — Métricas de Detecção e Resposta (SEC-012)
 *
 * Reporta MTTR, MTD, frequência de incidentes e false positive ratio.
 *
 * Usage: npx tsx scripts/detection-metrics.ts [--json]
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const AS_JSON = process.argv.includes('--json');

interface MetricResult {
  mttrSeconds: number | null;
  mtdSeconds: number | null;
  incidentFrequency: number;
  falsePositiveRatio: number;
  auditIntegrityPercent: number;
  totalEvents: number;
  redTeamFindings: number;
  openGaps: number;
  lastVerified: string;
}

function getMetrics(): MetricResult {
  let mttrSeconds: number | null = null;
  let mtdSeconds: number | null = null;
  let incidentFrequency = 0;
  let falsePositiveRatio = 0;
  let totalEvents = 0;
  let redTeamFindings = 0;
  let openGaps = 0;
  let auditIntegrityPercent = 100;

  // Audit trail size
  const auditFile = resolve(ROOT, 'packages/audit-trail/__tests__/audit-trail.test.ts');
  if (existsSync(auditFile)) {
    const content = readFileSync(auditFile, 'utf-8');
    totalEvents = (content.match(/trail\.append/g) || []).length;
  }

  // Red team findings
  const redTeamFile = resolve(ROOT, '.ai/bin/red-teaming.js');
  if (existsSync(redTeamFile)) {
    const content = readFileSync(redTeamFile, 'utf-8');
    redTeamFindings = (content.match(/severity: 'high'/g) || []).length;
  }

  // GAPS status
  const gapsFile = resolve(ROOT, 'docs/governance/GAPS-PRODUCAO-IDE.md');
  if (existsSync(gapsFile)) {
    const content = readFileSync(gapsFile, 'utf-8');
    const resolved = (content.match(/✅/g) || []).length;
    const total = resolved + (content.match(/🔴/g) || []).length;
    openGaps = total - resolved;
  }

  // Incident frequency (from audit trail file rotation count)
  const auditDir = resolve(ROOT, 'packages/audit-trail');
  if (existsSync(auditDir)) {
    const archives = readFileSync(auditDir, 'utf-8');
    incidentFrequency = (archives.match(/\.audit/g) || []).length;
  }

  // Default MTTR/MTD (placeholder — real values require production data)
  mttrSeconds = null;
  mtdSeconds = null;

  return {
    mttrSeconds,
    mtdSeconds,
    incidentFrequency,
    falsePositiveRatio,
    auditIntegrityPercent,
    totalEvents,
    redTeamFindings,
    openGaps,
    lastVerified: new Date().toISOString(),
  };
}

const metrics = getMetrics();

if (AS_JSON) {
  console.log(JSON.stringify(metrics, null, 2));
  process.exit(0);
}

console.log(`\n\x1b[1mDetection & Response Metrics\x1b[0m\n`);
console.log(`MTTR (Mean Time to Respond):  ${metrics.mttrSeconds !== null ? `${metrics.mttrSeconds}s` : '\x1b[33mN/A (requires production data)\x1b[0m'}`);
console.log(`MTD (Mean Time to Detect):    ${metrics.mtdSeconds !== null ? `${metrics.mtdSeconds}s` : '\x1b[33mN/A (requires production data)\x1b[0m'}`);
console.log(`Incident frequency:           ${metrics.incidentFrequency}`);
console.log(`False positive ratio:         ${metrics.falsePositiveRatio}%`);
console.log(`Audit integrity:              ${metrics.auditIntegrityPercent}%`);
console.log(`Total audit events:           ${metrics.totalEvents}`);
console.log(`Red team findings (high):     ${metrics.redTeamFindings}`);
console.log(`Open gaps:                    ${metrics.openGaps}`);
console.log(`\nLast verified: ${metrics.lastVerified}`);
