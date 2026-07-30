import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { ExperimentRun, ExperimentIndex } from './types';

const EXPERIMENTS_DIR = '.ai/reports/experiments';

function ensureDir(root: string): void {
  fs.mkdirSync(path.join(root, EXPERIMENTS_DIR), { recursive: true });
}

function indexPath(root: string): string {
  return path.join(root, EXPERIMENTS_DIR, 'index.json');
}

function experimentPath(root: string, id: string): string {
  return path.join(root, EXPERIMENTS_DIR, `${id}.json`);
}

/**
 * Carrega index.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function loadIndex(root: string): ExperimentIndex {
  const ip = indexPath(root);
  if (!fs.existsSync(ip)) return { experiments: [] };
  try {
    return JSON.parse(fs.readFileSync(ip, 'utf8')) as ExperimentIndex;
  } catch {
    return { experiments: [] };
  }
}

/**
 * Persiste experiment.
 * @param root - Valor root.
 * @param run - Executa run.
 */
export function saveExperiment(root: string, run: ExperimentRun): void {
  ensureDir(root);
  fs.writeFileSync(experimentPath(root, run.id), JSON.stringify(run, null, 2));

  const index = loadIndex(root);
  const existing = index.experiments.findIndex(e => e.id === run.id);
  const entry = { id: run.id, createdAt: run.createdAt, promptHash: run.promptHash, modelCount: run.results.length };
  if (existing >= 0) {
    index.experiments[existing] = entry;
  } else {
    index.experiments.unshift(entry);
  }
  fs.writeFileSync(indexPath(root), JSON.stringify(index, null, 2));
}

/**
 * Carrega experiment.
 * @param root - Valor root.
 * @param id - Valor id.
 * @returns O resultado da operação.
 */
export function loadExperiment(root: string, id: string): ExperimentRun | null {
  const ep = experimentPath(root, id);
  if (!fs.existsSync(ep)) return null;
  try {
    return JSON.parse(fs.readFileSync(ep, 'utf8')) as ExperimentRun;
  } catch {
    return null;
  }
}

/**
 * Processa experiments.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function listExperiments(root: string): ExperimentIndex['experiments'] {
  return loadIndex(root).experiments;
}
