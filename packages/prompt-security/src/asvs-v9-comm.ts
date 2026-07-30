import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import type { AsvsCheck, AsvsCategory } from './asvs-types';
const logger = createLogger('asvs-v9-comm');

const CATEGORY: AsvsCategory = 'V9';

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

export function checkV9_1_1(rootDir: string): AsvsCheck {
  const httpsPatterns = scanFilesForPattern(rootDir, /(https:\/\/|tls:|createServer.*ssl|https\.createServer|forceSSL|sslRedirect|redirectSSL)/i);
  const tlsDeps = scanPackageJsonDeps(rootDir, ['https', 'spdy', 'http2']);
  const tlsInConfig = scanFilesForPattern(rootDir, /(minVersion|secureContext|secureOptions|SSL_OP_NO_TLSv1|requestCert|rejectUnauthorized)/i);
  const passed = httpsPatterns.length > 0 || tlsInConfig.length > 0;
  const evidence: string[] = [];
  if (httpsPatterns.length > 0) evidence.push(`TLS/HTTPS config: ${httpsPatterns.slice(0, 3).join(', ')}`);
  if (tlsInConfig.length > 0) evidence.push(`TLS options: ${tlsInConfig.slice(0, 3).join(', ')}`);
  if (tlsDeps.length > 0) evidence.push(`TLS deps: ${tlsDeps.join(', ')}`);
  if (!passed) evidence.push('No TLS/HTTPS configuration detected');
  return {
    id: '9.1.1',
    name: 'Verify TLS is used for all communications',
    category: CATEGORY,
    level: 1,
    passed,
    evidence: evidence.join(' | '),
  };
}

export function checkV9_1_2(rootDir: string): AsvsCheck {
  const certValidation = scanFilesForPattern(rootDir, /(rejectUnauthorized|checkServerIdentity|ca:|cert:|key:|pfx:|certificate.*valid|certificate.*check|cert.*verify|verify.*cert|trust.*cert)/i);
  const passed = certValidation.length > 0;
  const evidence: string[] = [];
  if (certValidation.length > 0) evidence.push(`Certificate validation: ${certValidation.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No certificate validation configuration detected');
  return { id: '9.1.2', name: 'Verify certificate validation is configured', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}

export function checkV9_2_1(rootDir: string): AsvsCheck {
  const tls13Config = scanFilesForPattern(rootDir, /(TLSv1\.3|tlsv1\.3|minVersion.*1\.3|TLS_AES|SSL_OP_NO_TLSv1)/i);
  const tls13Deps = scanPackageJsonDeps(rootDir, ['node:tls', 'tls']);
  const passed = tls13Config.length > 0;
  const evidence: string[] = [];
  if (tls13Config.length > 0) evidence.push(`TLS 1.3 config: ${tls13Config.join(', ')}`);
  if (tls13Deps.length > 0 && tls13Config.length === 0) evidence.push(`TLS module present but version not enforced`);
  if (!passed) evidence.push('TLS 1.3 is not explicitly enforced');
  return {
    id: '9.2.1',
    name: 'Verify TLS 1.3 is enforced',
    category: CATEGORY,
    level: 1,
    passed,
    evidence: evidence.join(' | '),
  };
}

export function checkV9_2_2(rootDir: string): AsvsCheck {
  const weakCipherPatterns = scanFilesForPattern(rootDir, /(SSL_OP_NO_SSLv2|SSL_OP_NO_SSLv3|SSL_OP_NO_TLSv1|SSL_OP_NO_TLSv1_1|ciphers:|secureOptions|ECDHE|TLS_ECDHE|TLS_AES|TLS_CHACHA20)/i);
  const cipherConfig = scanFilesForPattern(rootDir, /(ssl.*cipher|cipher.*suites|cipherSuites|ssl_ciphers|ssl.*protocol|protocol.*ssl|minVersion.*1\.2|minVersion.*1\.3)/i);
  const passed = weakCipherPatterns.length > 0 || cipherConfig.length > 0;
  const evidence: string[] = [];
  if (weakCipherPatterns.length > 0) evidence.push(`Cipher configuration: ${weakCipherPatterns.slice(0, 3).join(', ')}`);
  if (cipherConfig.length > 0) evidence.push(`Cipher suite config: ${cipherConfig.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No weak cipher suite disabling detected');
  return { id: '9.2.2', name: 'Verify weak cipher suites are disabled', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}

export function checkV9_3_1(rootDir: string): AsvsCheck {
  const hstsPatterns = scanFilesForPattern(rootDir, /(strict-transport-security|Strict-Transport-Security|HSTS|hsts|max-age=\d+|includeSubDomains|preload)/i);
  const hstsDeps = scanPackageJsonDeps(rootDir, ['hsts', 'helmet']);
  const passed = hstsPatterns.length > 0 || hstsDeps.length > 0;
  const evidence: string[] = [];
  if (hstsPatterns.length > 0) evidence.push(`HSTS headers: ${hstsPatterns.slice(0, 3).join(', ')}`);
  if (hstsDeps.length > 0) evidence.push(`HSTS deps: ${hstsDeps.join(', ')}`);
  if (!passed) evidence.push('No HSTS header configured');
  return { id: '9.3.1', name: 'Verify HSTS header is configured', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}

export function checkV9_4_1(rootDir: string): AsvsCheck {
  const certPinning = scanFilesForPattern(rootDir, /(certificate.?pinn|pinn.?cert|public.?key.?pinn|HPKP|expect-ct|Expect-CT|cert.*fingerprint|fingerprint.*cert|sha256.*cert|cert.*sha256)/i);
  const passed = certPinning.length > 0;
  const evidence: string[] = [];
  if (certPinning.length > 0) evidence.push(`Certificate pinning: ${certPinning.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No certificate pinning detected');
  return { id: '9.4.1', name: 'Verify certificate pinning for critical endpoints', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}

export function checkV9_5_1(rootDir: string): AsvsCheck {
  const mtlsPatterns = scanFilesForPattern(rootDir, /(mutual.*tls|m.?TLS|mTLS|client.?cert|clientCert|requestCert|rejectUnauthorized|two.?way.*ssl|2-way.*ssl|cert.*auth|certificate.*auth)/i);
  const passed = mtlsPatterns.length > 0;
  const evidence: string[] = [];
  if (mtlsPatterns.length > 0) evidence.push(`mTLS patterns: ${mtlsPatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No mTLS for service-to-service communication detected');
  return { id: '9.5.1', name: 'Verify mTLS for service-to-service communication', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}

export function runAllV9Checks(rootDir: string): AsvsCheck[] {
  return [
    checkV9_1_1(rootDir),
    checkV9_1_2(rootDir),
    checkV9_2_1(rootDir),
    checkV9_2_2(rootDir),
    checkV9_3_1(rootDir),
    checkV9_4_1(rootDir),
    checkV9_5_1(rootDir),
  ];
}
