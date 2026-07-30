import path from 'node:path';
import { createLogger } from '@ideia/logger';
import type { AutonomyStatus, CoverageGap } from './types';
import { getIO } from '../io';
const logger = createLogger('status');

let _rootOverride = '';

export function setRootOverride(root: string): void {
  _rootOverride = root;
}

function getRoot(): string {
  return _rootOverride || getIO().fs.cwd();
}

function getStatusDir(): string {
  return path.join(getRoot(), '.ai-devkit');
}

function getStatusFile(): string {
  return path.join(getStatusDir(), 'autonomy-status.json');
}

export function buildAutonomyStatus(
  coverage: number,
  gaps: CoverageGap[],
  repaired: number,
): AutonomyStatus {
  return {
    lastRunAt: new Date().toISOString(),
    overallCoverage: coverage,
    gapsFound: gaps.length,
    gapsResolved: repaired,
    currentFocus: gaps[0]?.module,
    nextAction: gaps[repaired]?.id ?? 'review',
    blocked: gaps.length > 0 && repaired === 0,
    reason: gaps.length > 0 && repaired === 0 ? 'No gaps resolved in this cycle' : undefined,
  };
}

export function saveAutonomyStatus(status: AutonomyStatus): void {
  const dir = getStatusDir();
  if (!getIO().fs.exists(dir)) {
    getIO().fs.mkDir(dir, true);
  }
  getIO().fs.write(getStatusFile(), JSON.stringify(status, null, 2));
}

export function loadAutonomyStatus(): AutonomyStatus | null {
  try {
    const file = getStatusFile();
    if (getIO().fs.exists(file)) {
      const raw = getIO().fs.read(file, 'utf8');
      return JSON.parse(raw);
    }
    return null;
  } catch {
    return null;
  }
}
