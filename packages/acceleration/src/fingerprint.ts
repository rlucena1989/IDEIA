import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import crypto from 'node:crypto';
const logger = createLogger('fingerprint');

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', '.ai-devkit']);

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir)) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full, files);
      } else {
        files.push(full);
      }
    } catch {
      continue;
    }
  }
  return files;
}

export interface ProjectFingerprint {
  hash: string;
  files: number;
}

export function createProjectFingerprint(root = process.cwd()): ProjectFingerprint {
  const files = walk(root).sort();
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(file);
    try {
      hash.update(fs.readFileSync(file));
    } catch {
      hash.update('');
    }
  }
  return { hash: hash.digest('hex'), files: files.length };
}

export function createTextFingerprint(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
