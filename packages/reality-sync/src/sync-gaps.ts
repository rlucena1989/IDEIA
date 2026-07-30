import * as fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import * as _path from 'node:path';
import { SyncResult, SyncConfig } from './types';

function readLines(p: string): string[] {
  return fs.readFileSync(p, 'utf-8').split('\n');
}

function writeLines(p: string, lines: string[]): void {
  fs.writeFileSync(p, lines.join('\n'), 'utf-8');
}

function _updateGapStatus(lines: string[], gapId: string, status: string): boolean {
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.includes(`G${gapId} —`) || line.includes(`G${gapId} `)) {
      if (!line.includes('✅') && status === 'resolved') {
        lines[i] = line.replace(/^(#+.*?)(\n|$)/, `$1 ✅`);
        changed = true;
      }
      break;
    }
  }
  return changed;
}

function updateResolvedCount(lines: string[]): boolean {
  let resolved = 0;
  for (const line of lines) {
    if (line.includes('✅ **RESOLVIDO**') || line.includes('✅ Resolvido')) resolved++;
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const match = line.match(/\*\*Resolvidos?\*\*:\s*(\d+)/);
    if (match) {
      const current = parseInt(match[1] ?? '0', 10);
      if (current !== resolved) {
        lines[i] = line.replace(/\*\*Resolvidos?\*\*:\s*\d+/, `**Resolvidos**: ${resolved}`);
        return true;
      }
    }
  }
  return false;
}

export function syncGaps(config: SyncConfig): SyncResult {
  const start = Date.now();
  const actions: string[] = [];
  const errors: string[] = [];

  try {
    const lines = readLines(config.gapsPath);
    let changed = false;

    if (updateResolvedCount(lines)) changed = true;

    if (changed) writeLines(config.gapsPath, lines);

    return { ok: errors.length === 0, actions, errors, durationMs: Date.now() - start };
  } catch (_err) {
    return { ok: false, actions, errors: [String(_err)], durationMs: Date.now() - start };
  }
}
