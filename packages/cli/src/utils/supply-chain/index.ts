import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createLogger } from '@ideia/logger';

const log = createLogger('supply-chain');

export interface CveEntry {
  package: string;
  version: string;
  cve: string;
  severity: string;
  fixVersion?: string;
}

export interface ScanResult {
  entries: CveEntry[];
  summary: { total: number; critical: number; high: number; medium: number; low: number };
}

export function scan(cwd: string): ScanResult {
  const entries: CveEntry[] = [];

  const pkgLock = path.join(cwd, 'package-lock.json');
  if (fs.existsSync(pkgLock)) {
    try {
      const result = spawnSync('npm', ['audit', '--json'], { cwd, encoding: 'utf-8', timeout: 30000 });
      if (result.stdout) {
        try {
          const audit = JSON.parse(result.stdout);
          if (audit.vulnerabilities) {
            for (const [pkg, data] of Object.entries(audit.vulnerabilities) as [string, { range?: string; cves?: string[]; severity?: string; fixAvailable?: { version?: string } }][]) {
              entries.push({
                package: pkg,
                version: data.range || 'unknown',
                cve: data.cves?.[0] || `NPM-${data.severity?.toUpperCase() || 'UNKNOWN'}`,
                severity: data.severity || 'medium',
                fixVersion: data.fixAvailable?.version,
              });
            }
          }
        } catch (err) {
          log.warn('Failed to parse npm audit output', { error: String(err) });
        }
      }
    } catch (err) {
      log.warn('npm audit failed', { error: String(err) });
    }
  }

  const yarnLock = path.join(cwd, 'yarn.lock');
  if (fs.existsSync(yarnLock)) {
    try {
      const result = spawnSync('yarn', ['audit', '--json'], { cwd, encoding: 'utf-8', timeout: 30000 });
      if (result.stdout) {
        const lines = result.stdout.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'auditAdvisory') {
              entries.push({
                package: data.data?.advisory?.package_name || 'unknown',
                version: data.data?.advisory?.vulnerable_versions || 'unknown',
                cve: data.data?.advisory?.cves?.[0] || data.data?.advisory?.id?.toString() || 'UNKNOWN',
                severity: data.data?.advisory?.severity || 'medium',
                fixVersion: data.data?.advisory?.patched_versions,
              });
            }
          } catch (err) {
            log.warn('Failed to parse yarn audit line', { error: String(err) });
          }
        }
      }
    } catch (err) {
      log.warn('yarn audit failed', { error: String(err) });
    }
  }

  const summary = { total: entries.length, critical: 0, high: 0, medium: 0, low: 0 };
  for (const e of entries) { const s = e.severity || 'low'; const count = (summary as Record<string, number>)[s] ?? 0; (summary as Record<string, number>)[s] = count + 1; }

  return { entries, summary };
}

export function generateSbom(cwd: string): Record<string, unknown> {
  const sbom: Record<string, unknown> = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    version: 1,
    metadata: { timestamp: new Date().toISOString(), tools: [{ vendor: 'ai-devkit', name: 'supply-chain' }] },
    components: [],
  };

  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      (sbom.components as Array<Record<string, unknown>>) = Object.entries(deps).map(([name, version]) => ({
        type: 'library',
        name,
        version: (version as string).replace(/^\^|~/, ''),
        purl: `pkg:npm/${name}@${(version as string).replace(/^\^|~/, '')}`,
      }));
    } catch (err) {
      log.warn('Failed to read package.json for SBOM', { error: String(err) });
    }
  }

  return sbom;
}

export function audit(entries: CveEntry[], baselinePath?: string): { changed: boolean; added: CveEntry[]; removed: CveEntry[] } {
  const result = { changed: false, added: entries, removed: [] as CveEntry[] };

  if (baselinePath && fs.existsSync(baselinePath)) {
    try {
      const baseline: CveEntry[] = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
      const baselineKeys = new Set(baseline.map(e => `${e.package}@${e.cve}`));
      result.added = entries.filter(e => !baselineKeys.has(`${e.package}@${e.cve}`));
      const currentKeys = new Set(entries.map(e => `${e.package}@${e.cve}`));
      result.removed = baseline.filter(e => !currentKeys.has(`${e.package}@${e.cve}`));
      result.changed = result.added.length > 0 || result.removed.length > 0;
    } catch (err) {
      log.warn('Failed to parse baseline', { error: String(err) });
    }
  }

  return result;
}

export function verifyPackage(name: string, cwd: string): { verified: boolean; integrity?: string; error?: string } {
  try {
    const result = spawnSync('npm', ['pack', name, '--dry-run', '--json'], { cwd, encoding: 'utf-8', timeout: 15000 });
    if (result.stdout) {
      const data = JSON.parse(result.stdout);
      return { verified: true, integrity: data[0]?.integrity || 'unknown' };
    }
    return { verified: false, error: result.stderr };
  } catch (err) {
    return { verified: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function printScanReport(result: ScanResult, cwd: string, json?: boolean): void {
  if (json) {
    log.info(JSON.stringify(result, null, 2));
    return;
  }

  const report = [`# Supply Chain Scan Report\n`, `Date: ${new Date().toISOString()}\n`];
  report.push(`\n## Summary\n| Severity | Count |\n|----------|-------|\n`);
  for (const sev of ['critical', 'high', 'medium', 'low']) report.push(`| ${sev} | ${(result.summary as Record<string, number>)[sev]} |\n`);
  report.push(`\n## Vulnerabilities (${result.entries.length})\n`);
  for (const e of result.entries) {
    report.push(`- [${e.severity.toUpperCase()}] ${e.package}@${e.version} — ${e.cve}`);
    if (e.fixVersion) report.push(` (fix: ${e.fixVersion})`);
    report.push('\n');
  }

  const reportStr = report.join('');
  const reportDir = path.join(cwd, '.ai', 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportFile = path.join(reportDir, `supply-chain-${Date.now()}.md`);
  fs.writeFileSync(reportFile, reportStr, 'utf-8');
  log.info(reportStr);
  log.info('\nRelatorio salvo: ${path.relative(cwd, reportFile)}');
}
