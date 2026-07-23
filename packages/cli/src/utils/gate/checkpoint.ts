import fs from 'node:fs';
import path from 'node:path';

/** Interface que define a estrutura de stage result. */
export interface StageResult {
  stage: string;
  passed: boolean;
  durationMs: number;
  output: string;
  exitCode: number;
}

/** Interface que define a estrutura de checkpoint. */
export interface Checkpoint {
  id: string;
  timestamp: string;
  stages: StageResult[];
  currentStage: number;
  completed: boolean;
}

const CHECKPOINT_DIR = '.ai/checkpoints';

function getCheckpointPath(cwd: string): string {
  return path.join(cwd, CHECKPOINT_DIR);
}

/**
 * Persiste gate checkpoint.
 * @param cwd - Valor cwd.
 * @param checkpoint - Valor checkpoint.
 */
export function saveGateCheckpoint(cwd: string, checkpoint: Checkpoint): void {
  const dir = getCheckpointPath(cwd);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${checkpoint.id}.json`), JSON.stringify(checkpoint, null, 2), 'utf-8');
  fs.writeFileSync(path.join(dir, 'latest.json'), JSON.stringify(checkpoint, null, 2), 'utf-8');
}

/**
 * Carrega latest gate checkpoint.
 * @param cwd - Valor cwd.
 * @returns O resultado da operação.
 */
export function loadLatestGateCheckpoint(cwd: string): Checkpoint | null {
  const latestPath = path.join(getCheckpointPath(cwd), 'latest.json');
  if (fs.existsSync(latestPath)) {
    try {
      return JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
    } catch { }
  }
  return null;
}

/**
 * Processa gate checkpoints.
 * @param cwd - Valor cwd.
 * @returns O resultado da operação.
 */
export function listGateCheckpoints(cwd: string): string[] {
  const dir = getCheckpointPath(cwd);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== 'latest.json')
    .map(f => f.replace('.json', ''));
}
