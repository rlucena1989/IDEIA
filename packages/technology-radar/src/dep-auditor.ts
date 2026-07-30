
import { createLogger } from '@ideia/logger';
import { DepInfo } from './dep-scanner';

export interface VulnerabilityInfo {
  packageName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cve?: string;
  description: string;
  fixAvailable: boolean;
}

export interface OutdatedInfo {
  packageName: string;
  current: string;
  latest: string;
  age: 'major' | 'minor' | 'patch';
}

export interface DepAuditResult {
  scannedAt: string;
  vulnerabilities: VulnerabilityInfo[];
  outdated: OutdatedInfo[];
  summary: {
    totalVulnerabilities: number;
    criticalCount: number;
    highCount: number;
    outdatedCount: number;
    upToDateCount: number;
  };
}

const SEVERITY_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export class DepAuditor {
  private logger = createLogger('dep-auditor');
  private npmCache: Map<string, { version: string }>;

  constructor() {
    this.npmCache = new Map();
  }

  async auditDependencies(deps: DepInfo[]): Promise<DepAuditResult> {
    const vulnerabilities: VulnerabilityInfo[] = [];
    const outdated: OutdatedInfo[] = [];
    let upToDateCount = 0;

    for (const dep of deps) {
      try {
        const latest = await this.fetchLatestVersion(dep.name);
        if (latest) {
          const comparison = this.compareVersions(dep.version, latest);
          if (comparison === 'major' || comparison === 'minor') {
            outdated.push({
              packageName: dep.name,
              current: dep.version,
              latest,
              age: comparison,
            });
          } else if (comparison === null) {
            upToDateCount++;
          }
        }

        const vuln = await this.checkKnownVulnerability(dep.name, dep.version);
        if (vuln) {
          vulnerabilities.push(vuln);
        }
      } catch {
        /* skip unavailable packages */
      }
    }

    vulnerabilities.sort((a, b) => (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0));

    this.logger.info(
      `Dep audit: ${vulnerabilities.length} vulns, ${outdated.length} outdated, ${upToDateCount} up-to-date`
    );

    return {
      scannedAt: new Date().toISOString(),
      vulnerabilities,
      outdated,
      summary: {
        totalVulnerabilities: vulnerabilities.length,
        criticalCount: vulnerabilities.filter(v => v.severity === 'critical').length,
        highCount: vulnerabilities.filter(v => v.severity === 'high').length,
        outdatedCount: outdated.length,
        upToDateCount,
      },
    };
  }

  private async fetchLatestVersion(packageName: string): Promise<string | null> {
    const cached = this.npmCache.get(packageName);
    if (cached) return cached.version;

    try {
      const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`;
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json() as { version: string };
      this.npmCache.set(packageName, data);
      return data.version;
    } catch {
      return null;
    }
  }

  private compareVersions(current: string, latest: string): 'major' | 'minor' | 'patch' | null {
    const curParts = current.split('.').map(Number);
    const latParts = latest.split('.').map(Number);

    if (curParts.length < 2 || latParts.length < 2) return null;

    if (curParts[0] < latParts[0]) return 'major';
    if (curParts[0] === latParts[0] && curParts[1] < latParts[1]) return 'minor';
    if (curParts[0] === latParts[0] && curParts[1] === latParts[1] && curParts[2] < latParts[2]) return 'patch';
    return null;
  }

  private async checkKnownVulnerability(name: string, version: string): Promise<VulnerabilityInfo | null> {
    try {
      const url = `https://registry.npmjs.org/-/npm/v1/security/advisories?package=${encodeURIComponent(name)}&version=${encodeURIComponent(version)}`;
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json() as Array<{
        severity: string;
        cve?: string;
        title: string;
        vulnerable_versions: string;
        patch_versions: string;
      }>;

      if (Array.isArray(data) && data.length > 0) {
        const advisory = data[0];
        return {
          packageName: name,
          severity: advisory.severity as VulnerabilityInfo['severity'],
          cve: advisory.cve,
          description: advisory.title || `Vulnerability in ${name} ${version}`,
          fixAvailable: !!advisory.patch_versions,
        };
      }

      return null;
    } catch {
      return null;
    }
  }
}
