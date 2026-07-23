import * as fs from 'node:fs';
import * as path from 'node:path';
import { DevkitState } from '../state/state-types';
import { CommandOutputEnvelope } from './output-contract';

export interface SyncResult {
  written: boolean;
  path: string;
  envelope?: CommandOutputEnvelope<{ path: string }>;
  error?: string;
}

export function syncStateToFile(state: DevkitState, outputPath: string): SyncResult {
  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(state, null, 2), 'utf-8');
    return {
      written: true,
      path: outputPath,
    };
  } catch (_err) {
    return {
      written: false,
      path: outputPath,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function getDefaultStatePath(cwd: string): string {
  return path.join(cwd, '.ai', 'state.json');
}
