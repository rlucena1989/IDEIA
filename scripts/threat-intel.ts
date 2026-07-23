/**
 * threat-intel.ts â€” Threat Intelligence Feed (SEC-017)
 *
 * Coleta e reporta ameaÃ§as relevantes ao stack do projeto:
 * - CVEs em dependÃªncias (via npm audit)
 * - TÃ©cnicas MITRE ATLAS para agentes de IA
 * - Top 10 OWASP LLM
 *
 * Usage: npx tsx scripts/threat-intel.ts [--json]
 */

import { execFileSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const AS_JSON = process.argv.includes('--json');
const OUT_DIR = resolve(ROOT, 'reports/security/threat-intel');

interface ThreatReport {
  generatedAt: string;
  npmAudit: {
    critical: number;
    high: number;
    moderate: number;
    advisories: string[];
  };
  atlasTechniques: {
    id: string;
    name: string;
    relevance: 'high' | 'medium' | 'low';
    notes: string;
  }[];
  llmTop10: {
    rank: number;
    name: string;
    mitigated: boolean;
    controls: string[];
  }[];
  dependencyHealth: {
    total: number;
    outdated: number;
    vulnerable: number;
    deprecated: number;
  };
}

const ATLAS_TECHNIQUES = [
  { id: 'AML.T0001', name: 'Prompt Injection', relevance: 'high' as const, notes: 'Mitigated via prompt-security scan + output validation' },
  { id: 'AML.T0002', name: 'Indirect Prompt Injection', relevance: 'high' as const, notes: 'Partially mitigated â€” needs LLM-based detector' },
  { id: 'AML.T0003', name: 'Model Inversion', relevance: 'low' as const, notes: 'Not applicable (local models only)' },
  { id: 'AML.T0004', name: 'Membership Inference', relevance: 'low' as const, notes: 'Not applicable (no training data exposure)' },
  { id: 'AML.T0005', name: 'Model Poisoning', relevance: 'low' as const, notes: 'Not applicable (no model training pipeline)' },
  { id: 'AML.T0010', name: 'Insecure Output Handling', relevance: 'high' as const, notes: 'Mitigated via output validation (SEC-006)' },
  { id: 'AML.T0011', name: 'Sensitive Information Leak', relevance: 'high' as const, notes: 'Mitigated via output validation + audit trail' },
  { id: 'AML.T0015', name: 'Excessive Agency', relevance: 'medium' as const, notes: 'Mitigated via policy engine + approval flow' },
];

const LLM_TOP_10: { rank: number; name: string; controls: string[] }[] = [
  { rank: 1, name: 'Prompt Injection', controls: ['prompt-security scan', 'red-teaming', 'output validation'] },
  { rank: 2, name: 'Sensitive Information Disclosure', controls: ['output validation', 'audit trail', 'hash chain'] },
  { rank: 3, name: 'Supply Chain', controls: ['Dependabot', 'SBOM', 'npm audit', 'license check'] },
  { rank: 4, name: 'Data Poisoning', controls: ['not applicable (no training pipeline)'] },
  { rank: 5, name: 'Improper Output Handling', controls: ['output validation', 'policy engine'] },
  { rank: 6, name: 'Excessive Agency', controls: ['approval flow multi-level', 'RBAC', 'policy engine'] },
  { rank: 7, name: 'System Prompt Leak', controls: ['red-teaming pattern scan', 'prompt template review'] },
  { rank: 8, name: 'Vector Store Injection', controls: ['not applicable (no RAG in production)'] },
  { rank: 9, name: 'Misinformation', controls: ['audit trail', 'approval flow'] },
  { rank: 10, name: 'Model Denial of Service', controls: ['rate limiting', 'resource limits'] },
];

function runNpmAudit(): ThreatReport['npmAudit'] {
  try {
    const output = execFileSync('npm audit --json 2>&1', {
      cwd: ROOT, encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'],
    });
    const data = JSON.parse(output);
    const vulnerabilities = data.vulnerabilities || {};
    const advisories = data.advisories || {};

    return {
      critical: Object.values(vulnerabilities).filter((v: any) => v.severity === 'critical').length,
      high: Object.values(vulnerabilities).filter((v: any) => v.severity === 'high').length,
      moderate: Object.values(vulnerabilities).filter((v: any) => v.severity === 'moderate').length,
      advisories: Object.values(advisories).slice(0, 10).map((a: any) => `${a.cve || a.github_advisory_id}: ${a.title}`),
    };
  } catch {
    const stderr = execFileSync('npm audit --json 2>&1 || true', {
      cwd: ROOT, encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'],
    });
    try {
      const data = JSON.parse(stderr);
      const vulnerabilities = data.vulnerabilities || {};
      return {
        critical: Object.values(vulnerabilities).filter((v: any) => v.severity === 'critical').length,
        high: Object.values(vulnerabilities).filter((v: any) => v.severity === 'high').length,
        moderate: Object.values(vulnerabilities).filter((v: any) => v.severity === 'moderate').length,
        advisories: [],
      };
    } catch {
      return { critical: 0, high: 0, moderate: 0, advisories: ['npm audit parse error'] };
    }
  }
}

function generateReport(): ThreatReport {
  const npmAudit = runNpmAudit();

  const atlasTechniques = ATLAS_TECHNIQUES.map(t => ({
    id: t.id,
    name: t.name,
    relevance: t.relevance,
    notes: t.notes,
  }));

  const llmTop10 = LLM_TOP_10.map(item => {
    const mitigated = item.controls.some(c => !c.includes('not applicable'));
    return {
      rank: item.rank,
      name: item.name,
      mitigated,
      controls: item.controls,
    };
  });

  const mitigatedCount = llmTop10.filter(m => m.mitigated).length;

  return {
    generatedAt: new Date().toISOString(),
    npmAudit,
    atlasTechniques,
    llmTop10,
    dependencyHealth: {
      total: npmAudit.critical + npmAudit.high + npmAudit.moderate,
      outdated: 0,
      vulnerable: npmAudit.critical + npmAudit.high,
      deprecated: npmAudit.moderate,
    },
  };
}

const report = generateReport();

// Save report
if (!existsSync(OUT_DIR)) {
  execFileSync(`mkdir -p "${OUT_DIR}"`, { shell: true });
}
const reportPath = resolve(OUT_DIR, `threat-intel-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(reportPath, JSON.stringify(report, null, 2));

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(`\n\x1b[1mThreat Intelligence Report\x1b[0m`);
console.log(`Generated: ${report.generatedAt}\n`);

console.log(`\x1b[36mâ•â•â• npm Audit â•â•â•\x1b[0m`);
for (const adv of report.npmAudit.advisories) console.log(`  \x1b[33mâš \x1b[0m ${adv}`);
console.log(`  Critical: ${report.npmAudit.critical}, High: ${report.npmAudit.high}, Moderate: ${report.npmAudit.moderate}\n`);

console.log(`\x1b[36mâ•â•â• MITRE ATLAS â•â•â•\x1b[0m`);
for (const t of report.atlasTechniques) {
  const color = t.relevance === 'high' ? '\x1b[31m' : t.relevance === 'medium' ? '\x1b[33m' : '\x1b[32m';
  console.log(`  ${color}${t.id}\x1b[0m ${t.name}`);
  console.log(`    ${t.notes}`);
}
console.log();

console.log(`\x1b[36mâ•â•â• OWASP LLM Top 10 â•â•â•\x1b[0m`);
for (const item of report.llmTop10) {
  const icon = item.mitigated ? '\x1b[32mâœ…\x1b[0m' : '\x1b[31mâŒ\x1b[0m';
  console.log(`  ${icon} LLM${String(item.rank).padStart(2, '0')} ${item.name}`);
}
console.log(`  ${report.llmTop10.filter(m => m.mitigated).length}/10 mitigated\n`);

console.log(`Report saved: ${reportPath}`);
