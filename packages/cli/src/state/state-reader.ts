import * as fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import * as path from 'node:path';
import { DevkitState } from './state-types';
import { buildDevkitState } from './state-builder';

export interface StateSource {
  path: string;
  exists: boolean;
  loaded: boolean;
}

export interface StateReadResult {
  state: DevkitState;
  source: StateSource;
}

export function readStateFromFile(filePath: string): DevkitState | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as DevkitState;
    return parsed;
  } catch {
    return null;
  }
}

export function resolveStatePath(cwd: string): string {
  const candidates = [
    path.join(cwd, '.ai', 'state.json'),
    path.join(cwd, 'state.json'),
    path.join(cwd, 'docs', 'governance', 'ai-devkit-state.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

export function readOrBuildState(cwd: string): StateReadResult {
  const statePath = resolveStatePath(cwd);
  const fileState = readStateFromFile(statePath);
  const exists = fs.existsSync(statePath);

  if (fileState) {
    return {
      state: fileState,
      source: { path: statePath, exists: true, loaded: true },
    };
  }

  return {
    state: buildDevkitState(),
    source: { path: statePath, exists, loaded: false },
  };
}
