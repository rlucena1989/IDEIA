import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RAG_DIR } from './vector-store';

/** Interface que define a estrutura de file metadata. */
export interface FileMetadata {
  path: string;
  mtimeMs: number;
  fileSize: number;
  fileHash: string;
}

/** Interface que define a estrutura de index state. */
export interface IndexState {
  files: Record<string, FileMetadata>;
  lastIndexedAt: string;
}

const INDEX_STATE_FILE = 'index-state.json';

function getIndexStatePath(root: string): string {
  return path.join(root, RAG_DIR, INDEX_STATE_FILE);
}

/**
 * Carrega index state.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function loadIndexState(root: string): IndexState {
  const fp = getIndexStatePath(root);
  if (!fs.existsSync(fp)) return { files: {}, lastIndexedAt: '' };
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch { return { files: {}, lastIndexedAt: '' }; }
}

/**
 * Persiste index state.
 * @param root - Valor root.
 * @param state - Valor state.
 */
export function saveIndexState(root: string, state: IndexState): void {
  const fp = getIndexStatePath(root);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(state, null, 2));
}

/**
 * Processa file hash.
 * @param content - Valor content.
 * @returns O resultado da operação.
 */
export function computeFileHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Obtém current file metadata.
 * @param filePath - Valor path.
 * @returns O resultado da operação.
 */
export function getCurrentFileMetadata(filePath: string): FileMetadata | null {
  try {
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    return {
      path: filePath,
      mtimeMs: stat.mtimeMs,
      fileSize: stat.size,
      fileHash: computeFileHash(content),
    };
  } catch { return null; }
}

/**
 * Verifica se file changed.
 * @param root - Valor root.
 * @param filePath - Valor path.
 * @returns O resultado da operação.
 */
export function isFileChanged(root: string, filePath: string): boolean {
  const state = loadIndexState(root);
  const prev = state.files[filePath];
  if (!prev) return true;
  const current = getCurrentFileMetadata(filePath);
  if (!current) return true;
  return current.mtimeMs !== prev.mtimeMs || current.fileHash !== prev.fileHash || current.fileSize !== prev.fileSize;
}

/**
 * Processa freshness score.
 * @param mtimeMs - Valor ms.
 * @returns O resultado da operação.
 */
export function computeFreshnessScore(mtimeMs: number): number {
  const now = Date.now();
  const ageMs = now - mtimeMs;
  const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
  const clampedAge = Math.max(0, Math.min(ageMs, maxAgeMs));
  return 1 - (clampedAge / maxAgeMs);
}

/**
 * Processa recency weight.
 * @param mtimeMs - Valor ms.
 * @param halfLifeDays - Valor life days.
 * @returns O resultado da operação.
 */
export function computeRecencyWeight(mtimeMs: number, halfLifeDays: number = 7): number {
  const ageDays = (Date.now() - mtimeMs) / (24 * 60 * 60 * 1000);
  if (ageDays <= 0) return 1.0;
  return Math.pow(0.5, ageDays / halfLifeDays);
}
