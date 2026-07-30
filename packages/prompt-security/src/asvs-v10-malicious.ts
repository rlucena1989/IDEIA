import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import type { AsvsCheck, AsvsCategory } from './asvs-types';
const logger = createLogger('asvs-v10-malicious');

const CATEGORY: AsvsCategory = 'V10';

function scanFilesForPattern(rootDir: string, pattern: RegExp, maxResults = 5): string[] {
  const results: string[] = [];
  function walk(dir: string) {
    if (results.length >= maxResults) return;
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (results.length >= maxResults) return;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          walk(full);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.json') || entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
          try {
            const content = fs.readFileSync(full, 'utf8');
            const match = content.match(pattern);
            if (match) {
              const relative = path.relative(rootDir, full);
              results.push(`${relative}: ${match[0].slice(0, 100)}`);
            }
          } catch {
          }
        }
      }
    } catch {
    }
  }
  walk(rootDir);
  return results;
}

function scanPackageJsonDeps(rootDir: string, depNames: string[]): string[] {
  const found: string[] = [];
  function walk(dir: string) {
    try {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const content = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const allDeps = { ...content.dependencies, ...content.devDependencies };
        for (const depName of depNames) {
          if (allDeps[depName]) {
            found.push(`${depName}@${allDeps[depName]} (in ${path.relative(rootDir, pkgPath)})`);
          }
        }
      }
    } catch {
    }
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          walk(path.join(dir, entry.name));
        }
      }
    } catch {
    }
  }
  walk(rootDir);
  return found;
}

export function checkV10_1_1(rootDir: string): AsvsCheck {
  const integrityPatterns = scanFilesForPattern(rootDir, /(integrity|subresource.?integrity|SRI|hash.*verify|checksum|sourceMap|source.?map|verify.*integrity|integrity.*check)/i);
  const buildScripts = scanFilesForPattern(rootDir, /("build":|"compile":|"bundle":).*--sourcemap|"sourceMap":\s*true/i);
  const sriInHtml = scanFilesForPattern(rootDir, /integrity=(sha[0-9]+|md5)/i);
  const passed = integrityPatterns.length > 0 || sriInHtml.length > 0;
  const evidence: string[] = [];
  if (integrityPatterns.length > 0) evidence.push(`Integrity checks: ${integrityPatterns.slice(0, 3).join(', ')}`);
  if (sriInHtml.length > 0) evidence.push(`SRI found: ${sriInHtml.slice(0, 3).join(', ')}`);
  if (buildScripts.length > 0) evidence.push(`Build process: ${buildScripts.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No code integrity or SRI checks detected');
  return {
    id: '10.1.1',
    name: 'Verify code integrity checks exist (source maps, SRI, build integrity)',
    category: CATEGORY,
    level: 1,
    passed,
    evidence: evidence.join(' | '),
  };
}

export function checkV10_2_1(rootDir: string): AsvsCheck {
  const codeReviewPatterns = scanFilesForPattern(rootDir, /(code.?review|security.?review|PR.*review|pull.?request.*review|review.*process|CODEOWNERS|reviewer|approv.*process|audit.*code)/i);
  const securityReviewPatterns = scanFilesForPattern(rootDir, /(security.?audit|audit.*code|audit.*depend|vulnerability.*scan|sast|static.?analysis|dynamic.*scan|dast|pen.?test)/i);
  const passed = codeReviewPatterns.length > 0 || securityReviewPatterns.length > 0;
  const evidence: string[] = [];
  if (codeReviewPatterns.length > 0) evidence.push(`Code review processes: ${codeReviewPatterns.slice(0, 3).join(', ')}`);
  if (securityReviewPatterns.length > 0) evidence.push(`Security analysis: ${securityReviewPatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No code review process for security detected');
  return { id: '10.2.1', name: 'Verify code review process includes security', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}

export function checkV10_3_1(rootDir: string): AsvsCheck {
  const antiTamperPatterns = scanFilesForPattern(rootDir, /(tamper|anti.?tamper|integrity.*check|checksum.*verify|code.?sign|signature.*verify|verify.*signature)/i);
  const lockFiles = scanFilesForPattern(rootDir, /(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|integrity.*lock)/i);
  const dependencyLock = scanFilesForPattern(rootDir, /"package-lock\.json"|"yarn\.lock"|"pnpm-lock/);
  const passed = antiTamperPatterns.length > 0 || lockFiles.length > 0;
  const evidence: string[] = [];
  if (antiTamperPatterns.length > 0) evidence.push(`Anti-tamper mechanisms: ${antiTamperPatterns.slice(0, 3).join(', ')}`);
  if (lockFiles.length > 0) evidence.push(`Dependency lock files: ${lockFiles.slice(0, 3).join(', ')}`);
  if (dependencyLock.length > 0) evidence.push(`Lock file references: ${dependencyLock.slice(0, 2).join(', ')}`);
  if (!passed) evidence.push('No anti-tampering or dependency lock verification detected');
  return {
    id: '10.3.1',
    name: 'Verify anti-tampering mechanisms exist for deployed code',
    category: CATEGORY,
    level: 1,
    passed,
    evidence: evidence.join(' | '),
  };
}

export function checkV10_4_1(rootDir: string): AsvsCheck {
  const ciPipeline = scanFilesForPattern(rootDir, /(CI|CD|pipeline|github.?actions|gitlab.?ci|circleci|jenkins|workflow|deploy|build.*pipeline)/i);
  const ciIntegrity = scanFilesForPattern(rootDir, /(checksum.*verify|hash.*check|sign.*artifact|integrity.*pipeline|pipeline.*integrity|secure.*pipeline|pipeline.*security|audit.*pipeline)/i);
  const passed = ciPipeline.length > 0 && ciIntegrity.length > 0;
  const evidence: string[] = [];
  if (ciPipeline.length > 0) evidence.push(`CI/CD pipeline: ${ciPipeline.slice(0, 3).join(', ')}`);
  if (ciIntegrity.length > 0) evidence.push(`Pipeline integrity: ${ciIntegrity.slice(0, 3).join(', ')}`);
  if (!passed && ciPipeline.length > 0) evidence.push('CI/CD detected without pipeline integrity verification');
  if (!passed && ciPipeline.length === 0) evidence.push('No CI/CD pipeline integrity detected');
  return { id: '10.4.1', name: 'Verify CI/CD pipeline integrity', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}

export function checkV10_5_1(rootDir: string): AsvsCheck {
  const vulnScanDeps = scanPackageJsonDeps(rootDir, ['snyk', 'npm-audit', 'audit-ci', '@snyk/protect', 'security-audit', 'dependabot', 'renovate', 'risk-evaluator']);
  const vulnScanPatterns = scanFilesForPattern(rootDir, /(npm.*audit|audit.*depend|vulnerability.*scan|snyk|dependabot|renovate|security.*audit|vuln.*check|CVE|CWE)/i);
  const passed = vulnScanDeps.length > 0 || vulnScanPatterns.length > 0;
  const evidence: string[] = [];
  if (vulnScanDeps.length > 0) evidence.push(`Vulnerability scanners: ${vulnScanDeps.join(', ')}`);
  if (vulnScanPatterns.length > 0) evidence.push(`Vulnerability patterns: ${vulnScanPatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No dependency vulnerability scanning detected');
  return { id: '10.5.1', name: 'Verify dependency vulnerability scanning', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}

export function checkV10_6_1(rootDir: string): AsvsCheck {
  const scaPatterns = scanFilesForPattern(rootDir, /(SCA|software.?composition.?analysis|sbom|bill.?of.?materials|cyclonedx|spdx|component.*inventory|third.?party.*audit|supply.?chain.*secure|supply.?chain.*risk)/i);
  const sbomFiles = scanFilesForPattern(rootDir, /(sbom|cyclonedx|spdx)/i);
  const passed = scaPatterns.length > 0 || sbomFiles.length > 0;
  const evidence: string[] = [];
  if (scaPatterns.length > 0) evidence.push(`SCA patterns: ${scaPatterns.slice(0, 3).join(', ')}`);
  if (sbomFiles.length > 0) evidence.push(`SBOM files: ${sbomFiles.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No software composition analysis detected');
  return { id: '10.6.1', name: 'Verify software composition analysis (SCA)', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}

export function checkV10_7_1(rootDir: string): AsvsCheck {
  const raspPatterns = scanFilesForPattern(rootDir, /(RASP|runtime.?self.?protection|runtime.?protect|app.?protect|app.?guard|application.*self.*protect|sqreen|contrast|aspect|runtime.*security)/i);
  const passed = raspPatterns.length > 0;
  const evidence: string[] = [];
  if (raspPatterns.length > 0) evidence.push(`RASP patterns: ${raspPatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No runtime application self-protection (RASP) detected');
  return { id: '10.7.1', name: 'Verify runtime application self-protection', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}

export function runAllV10Checks(rootDir: string): AsvsCheck[] {
  return [
    checkV10_1_1(rootDir),
    checkV10_2_1(rootDir),
    checkV10_3_1(rootDir),
    checkV10_4_1(rootDir),
    checkV10_5_1(rootDir),
    checkV10_6_1(rootDir),
    checkV10_7_1(rootDir),
  ];
}
