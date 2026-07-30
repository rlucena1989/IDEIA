import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { ModelCapabilities, DEFAULT_MODEL_REGISTRY } from '../models';

const REGISTRY_PATH = '.ai/reports/experiments/models.json';

function registryPath(root: string): string {
  return path.join(root, REGISTRY_PATH);
}

/**
 * Carrega model registry.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function loadModelRegistry(root: string): ModelCapabilities[] {
  const rp = registryPath(root);
  if (!fs.existsSync(rp)) return [...DEFAULT_MODEL_REGISTRY];
  try {
    return JSON.parse(fs.readFileSync(rp, 'utf8')) as ModelCapabilities[];
  } catch {
    return [...DEFAULT_MODEL_REGISTRY];
  }
}

/**
 * Persiste model registry.
 * @param root - Valor root.
 * @param models - Valor models.
 */
export function saveModelRegistry(root: string, models: ModelCapabilities[]): void {
  fs.mkdirSync(path.dirname(registryPath(root)), { recursive: true });
  fs.writeFileSync(registryPath(root), JSON.stringify(models, null, 2));
}

/**
 * Processa model to registry.
 * @param root - Valor root.
 * @param entry - Valor entry.
 * @returns O resultado da operação.
 */
export function addModelToRegistry(root: string, entry: ModelCapabilities): ModelCapabilities[] {
  const models = loadModelRegistry(root);
  const existing = models.findIndex(m => m.modelId === entry.modelId && m.provider === entry.provider);
  if (existing >= 0) {
    models[existing] = entry;
  } else {
    models.push(entry);
  }
  saveModelRegistry(root, models);
  return models;
}

/**
 * Busca model in registry.
 * @param root - Valor root.
 * @param modelId - Valor id.
 * @returns O resultado da operação.
 */
export function findModelInRegistry(root: string, modelId: string): ModelCapabilities | undefined {
  const models = loadModelRegistry(root);
  return models.find(m => m.modelId === modelId);
}
