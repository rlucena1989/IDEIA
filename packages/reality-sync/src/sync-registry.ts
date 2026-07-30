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

function findRegistryEntry(lines: string[], keyword: string): number {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.toLowerCase().includes(keyword.toLowerCase())) return i;
  }
  return -1;
}

interface PackageInfo {
  name: string;
  hasTests: boolean;
  testCount: number;
}

function scanPackages(packagesDir: string): PackageInfo[] {
  const results: PackageInfo[] = [];
  try {
    for (const dir of fs.readdirSync(packagesDir)) {
      const pkgPath = path.join(packagesDir, dir);
      if (!fs.statSync(pkgPath).isDirectory()) continue;
      const pkgJsonPath = path.join(pkgPath, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) continue;
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        const name = pkg.name || dir;
        const testDir = path.join(pkgPath, '__tests__');
        const srcTestDir = path.join(pkgPath, 'src', '__tests__');
        const hasTests = fs.existsSync(testDir) || fs.existsSync(srcTestDir);
        let testCount = 0;
        if (hasTests) {
          const td = fs.existsSync(testDir) ? testDir : srcTestDir;
          testCount = fs.readdirSync(td).filter(f => f.endsWith('.ts') || f.endsWith('.js')).length;
        }
        results.push({ name, hasTests, testCount });
      } catch { /* skip invalid package.json */ }
    }
  } catch { /* skip unreadable dir */ }
  return results;
}

export function syncRegistry(config: SyncConfig): SyncResult {
  const start = Date.now();
  const actions: string[] = [];
  const errors: string[] = [];

  try {
    if (!fs.existsSync(config.registryPath)) {
      errors.push(`Registry not found at ${config.registryPath}`);
      return { ok: false, actions, errors, durationMs: Date.now() - start };
    }

    const packages = scanPackages(config.packagesDir);
    const lines = readLines(config.registryPath);
    let changed = false;

    const untested = packages.filter(p => !p.hasTests);
    const untestedLine = untested.map(p => `\`${p.name}\``).join(', ');

    if (untested.length > 0) {
      const idx = findRegistryEntry(lines, 'packages with no tests');
      if (idx >= 0) {
        const newLine = `| | ${packages.length} packages | ${untested.length} without tests: ${untestedLine} |`;
        if (lines[idx] !== newLine) {
          lines[idx] = newLine;
          changed = true;
          actions.push(`Updated package health: ${untested.length} untested`);
        }
      }
    }

    if (changed) {
      writeLines(config.registryPath, lines);
      actions.push(`Saved updated registry to ${config.registryPath}`);
    }

  } catch (_err) {
    errors.push(`Sync registry error: ${_err instanceof Error ? _err.message : String(_err)}`);
  }

  return { ok: errors.length === 0, actions, errors, durationMs: Date.now() - start };
}
