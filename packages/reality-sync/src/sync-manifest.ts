import * as fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import * as path from 'node:path';
import { SyncResult, SyncConfig } from './types';

function readLines(p: string): string[] {
  return fs.readFileSync(p, 'utf-8').split('\n');
}

function writeLines(p: string, lines: string[]): void {
  fs.writeFileSync(p, lines.join('\n'), 'utf-8');
}

function replaceTableRow(lines: string[], prefix: string, newRow: string): number {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith(prefix)) {
      lines[i] = newRow;
      return i;
    }
  }
  return -1;
}

function countPackages(packagesDir: string): number {
  try {
    return fs.readdirSync(packagesDir).filter(d =>
      fs.statSync(path.join(packagesDir, d)).isDirectory()
    ).length;
  } catch { return 0; }
}

function countTestFiles(root: string): number {
  let count = 0;
  function walk(dir: string): void {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') walk(full);
        else if (entry.isFile() && (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.ts'))) count++;
      }
    } catch { /* skip unreadable dirs */ }
  }
  walk(root);
  return count;
}

export function syncManifest(config: SyncConfig): SyncResult {
  const start = Date.now();
  const actions: string[] = [];
  const errors: string[] = [];

  try {
    if (!fs.existsSync(config.manifestPath)) {
      errors.push(`Manifest not found at ${config.manifestPath}`);
      return { ok: false, actions, errors, durationMs: Date.now() - start };
    }

    const lines = readLines(config.manifestPath);
    let changed = false;

    const pkgCount = countPackages(config.packagesDir);
    const testCount = countTestFiles(config.workspaceRoot);

    if (pkgCount > 0) {
      const pkgRow = `| **Packages** | | ${pkgCount} packages in workspace |`;
      const found = replaceTableRow(lines, '| **Packages** |', pkgRow);
      if (found >= 0) { actions.push(`Updated package count to ${pkgCount}`); changed = true; }
    }

    if (testCount > 0) {
      const testRow = `| **Tests** | | ${testCount} test files found |`;
      const found = replaceTableRow(lines, '| **Tests** |', testRow);
      if (found >= 0) { actions.push(`Updated test count to ${testCount}`); changed = true; }
    }

    if (changed) {
      writeLines(config.manifestPath, lines);
      actions.push(`Saved updated manifest to ${config.manifestPath}`);
    }

  } catch (_err) {
    errors.push(`Sync manifest error: ${_err instanceof Error ? _err.message : String(_err)}`);
  }

  return { ok: errors.length === 0, actions, errors, durationMs: Date.now() - start };
}
