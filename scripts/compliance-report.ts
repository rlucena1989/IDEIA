/**
 * compliance-report.ts — Compliance Report Generator (SEC-018)
 *
 * Gera relatórios de compliance prontos para auditoria:
 * - SOC 2 Type II (controles simulados)
 * - ISO 27001 (controles A.5-A.18)
 * - LGPD (artigos relevantes)
 * - GDPR (artigos relevantes)
 * - EU AI Act (artigos relevantes)
 *
 * Usage: npx tsx scripts/compliance-report.ts [--format json|html|md] [--framework soc2|iso27001|lgpd|gdpr|eu-ai-act|all]
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'reports/compliance');
const FORMAT = (process.argv.find(a => a.startsWith('--format='))?.split('=')[1] || 'md') as 'json' | 'html' | 'md';
const FRAMEWORK = (process.argv.find(a => a.startsWith('--framework='))?.split('=')[1] || 'all');

interface ComplianceStatus {
  id: string;
  framework: string;
  control: string;
  status: 'implemented' | 'partial' | 'not-implemented' | 'not-applicable';
  evidence: string;
  notes: string;
}

function loadSECStatus(): ComplianceStatus[] {
  const matrixPath = resolve(ROOT, 'docs/governance/MATRIZ-COMPLIANCE-SEGURANCA.md');
  if (!existsSync(matrixPath)) return [];

  const content = readFileSync(matrixPath, 'utf-8');
  const secRows: ComplianceStatus[] = [];
  const secRegex = /\*\*SEC-(\d+)\*\*.*?\|\s*(~~\*\*)?(\w+)(\*\*~~)?\s*(✅\s*\*\*RESOLVIDO\*\*)?/g;
  let match;

  while ((match = secRegex.exec(content)) !== null) {
    const id = `SEC-${match[1]}`;
    const isResolved = !!match[5];
    secRows.push({
      id,
      framework: 'IDEIA',
      control: id,
      status: isResolved ? 'implemented' : 'not-implemented',
      evidence: `docs/governance/MATRIZ-COMPLIANCE-SEGURANCA.md#SEC-${match[1]}`,
      notes: isResolved ? 'Implemented and verified' : 'Pending implementation',
    });
  }
  return secRows;
}

const frameworks: Record<string, { id: string; name: string; controls: ComplianceStatus[] }> = {
  'soc2': { id: 'SOC 2 Type II', name: 'SOC 2 Type II', controls: [] },
  'iso27001': { id: 'ISO 27001', name: 'ISO 27001:2022', controls: [] },
  'lgpd': { id: 'LGPD', name: 'Lei Geral de Proteção de Dados (Lei 13.709/2018)', controls: [] },
  'gdpr': { id: 'GDPR', name: 'General Data Protection Regulation (EU 2016/679)', controls: [] },
  'eu-ai-act': { id: 'EU AI Act', name: 'EU Artificial Intelligence Act (Reg. 2024/1689)', controls: [] },
};

const secStatus = loadSECStatus();

// Map SEC controls to frameworks
for (const sec of secStatus) {
  frameworks.soc2.controls.push({ ...sec, framework: 'SOC 2' });
  frameworks.iso27001.controls.push({ ...sec, framework: 'ISO 27001' });
}

frameworks.lgpd.controls = [
  { id: 'LGPD-01', framework: 'LGPD', control: 'Art. 6 — Princípios', status: 'implemented', evidence: 'POLITICA-SEGURANCA.md', notes: 'Privacy principles documented' },
  { id: 'LGPD-02', framework: 'LGPD', control: 'Art. 9 — Acesso do titular', status: 'implemented', evidence: 'DPIA-IDEIA.md', notes: 'Data subject rights mapped' },
  { id: 'LGPD-03', framework: 'LGPD', control: 'Art. 15 — Exclusão', status: 'partial', evidence: 'DPIA-IDEIA.md', notes: 'User can delete workspace/memory' },
  { id: 'LGPD-04', framework: 'LGPD', control: 'Art. 46 — Segurança', status: 'implemented', evidence: 'SEC-001 hash chain, SEC-006 output validation', notes: 'Security measures in place' },
  { id: 'LGPD-05', framework: 'LGPD', control: 'Art. 49 — Incidentes', status: 'implemented', evidence: 'PLANO-RESPOSTA-INCIDENTES.md', notes: 'Incident response plan documented' },
];

frameworks.gdpr.controls = [
  { id: 'GDPR-01', framework: 'GDPR', control: 'Art. 5 — Principles', status: 'implemented', evidence: 'POLITICA-SEGURANCA.md, DPIA-IDEIA.md', notes: 'Data protection principles documented' },
  { id: 'GDPR-02', framework: 'GDPR', control: 'Art. 15 — Right of access', status: 'implemented', evidence: 'Audit trail available for query', notes: 'Data is local filesystem' },
  { id: 'GDPR-03', framework: 'GDPR', control: 'Art. 17 — Right to erasure', status: 'partial', evidence: 'DPIA-IDEIA.md', notes: 'User can delete workspace' },
  { id: 'GDPR-04', framework: 'GDPR', control: 'Art. 32 — Security of processing', status: 'implemented', evidence: 'SEC-001, SEC-006, SEC-023', notes: 'Hash chain + output validation + PII scanner' },
  { id: 'GDPR-05', framework: 'GDPR', control: 'Art. 33 — Breach notification', status: 'implemented', evidence: 'PLANO-RESPOSTA-INCIDENTES.md', notes: 'Notification procedure documented' },
  { id: 'GDPR-06', framework: 'GDPR', control: 'Art. 35 — DPIA', status: 'implemented', evidence: 'DPIA-IDEIA.md', notes: 'DPIA completed' },
];

frameworks['eu-ai-act'].controls = [
  { id: 'AIA-01', framework: 'EU AI Act', control: 'Art. 6 — Risk classification', status: 'partial', evidence: 'DPIA-IDEIA.md', notes: 'System is low-risk (local IDE, not HR/banking)' },
  { id: 'AIA-02', framework: 'EU AI Act', control: 'Art. 13 — Transparency', status: 'implemented', evidence: 'AGENTS.md, user docs', notes: 'Users informed of AI interaction' },
  { id: 'AIA-03', framework: 'EU AI Act', control: 'Art. 50 — Transparency for providers', status: 'implemented', evidence: 'POLITICA-SEGURANCA.md', notes: 'AI transparency documented' },
  { id: 'AIA-04', framework: 'EU AI Act', control: 'Art. 55 — Fundamental rights', status: 'partial', evidence: 'DPIA-IDEIA.md', notes: 'Rights impact partially assessed' },
];

function generateMarkdown(): string {
  const lines: string[] = [];
  lines.push('# Compliance Report');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(`> Frameworks: ${Object.keys(frameworks).join(', ')}\n`);

  for (const [key, fw] of Object.entries(frameworks)) {
    if (FRAMEWORK !== 'all' && key !== FRAMEWORK) continue;
    const implemented = fw.controls.filter(c => c.status === 'implemented').length;
    const partial = fw.controls.filter(c => c.status === 'partial').length;
    const pct = fw.controls.length > 0 ? Math.round((implemented / fw.controls.length) * 100) : 0;

    lines.push(`## ${fw.name}`);
    lines.push(`**Coverage:** ${implemented}/${fw.controls.length} (${pct}%)\n`);
    lines.push('| Control | Status | Evidence | Notes |');
    lines.push('|---------|--------|----------|-------|');

    for (const c of fw.controls) {
      const icon = c.status === 'implemented' ? '✅' : c.status === 'partial' ? '🟡' : c.status === 'not-applicable' ? '⚪' : '❌';
      lines.push(`| ${c.control} | ${icon} ${c.status} | ${c.evidence} | ${c.notes} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

const report = generateMarkdown();
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const fileName = `compliance-${FRAMEWORK}-${new Date().toISOString().slice(0, 10)}.md`;
const outPath = resolve(OUT_DIR, fileName);
writeFileSync(outPath, report);

console.log(`\x1b[1mCompliance Report Generated\x1b[0m`);
console.log(`Framework: ${FRAMEWORK === 'all' ? 'All' : FRAMEWORK}`);
console.log(`Output: ${outPath}`);
console.log(`Controls: ${Object.values(frameworks).reduce((a, f) => a + f.controls.length, 0)}`);

if (FORMAT === 'json') {
  console.log(JSON.stringify(frameworks, null, 2));
}
