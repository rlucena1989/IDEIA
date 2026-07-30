#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CERT_DIR = join(process.cwd(), 'certs');
const KEY_FILE = join(CERT_DIR, 'key.pem');
const CERT_FILE = join(CERT_DIR, 'cert.pem');
const CA_FILE = join(CERT_DIR, 'ca.pem');

function findOpenssl(): string | null {
  const candidates = process.platform === 'win32'
    ? ['openssl.exe', 'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe', 'C:\\Program Files\\OpenSSL\\bin\\openssl.exe']
    : ['openssl'];
  for (const c of candidates) {
    try { execFileSync(c, ['version'], { stdio: 'pipe' }); return c; } catch { /* next */ }
  }
  return null;
}

function main(): void {
  const force = process.argv.includes('--force');

  if (!force && existsSync(KEY_FILE) && existsSync(CERT_FILE)) {
    console.log('[certs] Certificates already exist. Use --force to regenerate.');
    process.exit(0);
  }

  if (!existsSync(CERT_DIR)) mkdirSync(CERT_DIR, { recursive: true });

  const openssl = findOpenssl();
  if (!openssl) {
    console.error('[certs] OpenSSL not found. Install OpenSSL or run manually:');
    console.error(`  openssl req -x509 -newkey rsa:2048 -keyout ${KEY_FILE} -out ${CERT_FILE} -days 3650 -nodes -subj "/C=BR/ST=SP/L=SaoPaulo/O=IDEIA/OU=Dev/CN=localhost"`);
    process.exit(1);
  }

  execFileSync(openssl, [
    'req', '-x509', '-newkey', 'rsa:2048',
    '-keyout', KEY_FILE, '-out', CERT_FILE,
    '-days', '3650', '-nodes',
    '-subj', '/C=BR/ST=SP/L=SaoPaulo/O=IDEIA/OU=Dev/CN=localhost',
  ], { stdio: 'pipe' });

  writeFileSync(CA_FILE, readFileSync(CERT_FILE));
  console.log('[certs] Development certificates generated successfully');
  console.log(`  Key:  ${KEY_FILE}`);
  console.log(`  Cert: ${CERT_FILE}`);
  console.log(`  CA:   ${CA_FILE}`);
  console.log('\nTo trust the certificate:');
  console.log('  Windows: certutil -addstore Root certs/ca.pem');
  console.log('  macOS:   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certs/ca.pem');
  console.log('  Linux:   sudo cp certs/ca.pem /usr/local/share/ca-certificates/ideia.crt && sudo update-ca-certificates');
}

main();
