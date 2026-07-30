import { createLogger } from '@ideia/logger';
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { createHash } from 'crypto';

const log = createLogger('data-layer:backup-verifier');

export interface BackupVerificationResult {
  backupPath: string;
  exists: boolean;
  sizeBytes: number;
  checksum: string;
  verified: boolean;
  errors: string[];
  verifiedAt: string;
}

export class BackupVerifier {
  private backupDir: string;

  constructor(backupDir?: string) {
    this.backupDir = resolve(backupDir ?? '.ai/backups/sqlite');
  }

  verify(backupPath: string): BackupVerificationResult {
    const errors: string[] = [];
    const fullPath = resolve(backupPath);
    const exists = existsSync(fullPath);
    let sizeBytes = 0;
    let checksum = '';

    if (!exists) {
      errors.push(`Backup file not found: ${backupPath}`);
      return { backupPath, exists: false, sizeBytes: 0, checksum: '', verified: false, errors, verifiedAt: new Date().toISOString() };
    }

    try {
      const stat = statSync(fullPath);
      sizeBytes = stat.size;
      if (sizeBytes === 0) errors.push('Backup file is empty');
    } catch (__err) {
      errors.push(`Cannot stat backup: ${__err instanceof Error ? __err.message : String(__err)}`);
    }

    try {
      const content = readFileSync(fullPath);
      checksum = createHash('sha256').update(content).digest('hex').slice(0, 16);
    } catch (__err) {
      errors.push(`Cannot read backup: ${__err instanceof Error ? __err.message : String(__err)}`);
    }

    const verified = errors.length === 0 && sizeBytes > 0;
    const result: BackupVerificationResult = { backupPath, exists, sizeBytes, checksum, verified, errors, verifiedAt: new Date().toISOString() };

    if (verified) {
      log.info(`Backup verified: ${backupPath} (${(sizeBytes / 1024).toFixed(1)}KB, sha256:${checksum})`);
      this.writeManifest(result);
    } else {
      log.warn(`Backup verification failed: ${backupPath}`, { errors });
    }

    return result;
  }

  verifyLatest(): BackupVerificationResult | null {
    try {
      if (!existsSync(this.backupDir)) return null;
      const files = require('fs').readdirSync(this.backupDir)
        .filter((f: string) => f.endsWith('.db'))
        .sort()
        .reverse();
      if (files.length === 0) return null;
      return this.verify(resolve(this.backupDir, files[0]));
    } catch {
      return null;
    }
  }

  verifyAll(): BackupVerificationResult[] {
    try {
      if (!existsSync(this.backupDir)) return [];
      return require('fs').readdirSync(this.backupDir)
        .filter((f: string) => f.endsWith('.db'))
        .sort()
        .map((f: string) => this.verify(resolve(this.backupDir, f)));
    } catch {
      return [];
    }
  }

  private writeManifest(result: BackupVerificationResult): void {
    try {
      const manifestPath = resolve(this.backupDir, 'verification-manifest.json');
      const dir = dirname(manifestPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      let manifest: BackupVerificationResult[] = [];
      if (existsSync(manifestPath)) {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      }
      manifest.push(result);
      if (manifest.length > 100) manifest = manifest.slice(-100);
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    } catch {
      /* silent */
    }
  }
}

export function createBackupVerifier(backupDir?: string): BackupVerifier {
  return new BackupVerifier(backupDir);
}
