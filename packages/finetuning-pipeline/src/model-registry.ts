import { EvaluationResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('model-registry');

export type ActivationScope = 'global' | 'user' | 'project';

export interface ModelMetadata {
  name: string;
  version: string;
  description?: string;
  path?: string;
  tags?: string[];
  createdAt: string;
  evaluation?: EvaluationResult;
}

export interface ActiveModelEntry {
  modelName: string;
  scope: ActivationScope;
  scopeId?: string;
  activatedAt: string;
}

export class ModelRegistry {
  private models: Map<string, ModelMetadata> = new Map();
  private activeModels: ActiveModelEntry[] = [];

  registerModel(name: string, metadata: Omit<ModelMetadata, 'createdAt'>): ModelMetadata {
    if (this.models.has(name)) {
      throw new Error(`Model '${name}' is already registered`);
    }
    const full: ModelMetadata = { ...metadata, createdAt: new Date().toISOString() };
    this.models.set(name, full);
    return full;
  }

  getModel(name: string): ModelMetadata | undefined {
    return this.models.get(name);
  }

  listModels(filter?: { tag?: string; version?: string }): ModelMetadata[] {
    const all = Array.from(this.models.values());
    if (!filter) return all;
    return all.filter(m => {
      if (filter.tag && (!m.tags || !m.tags.includes(filter.tag))) return false;
      if (filter.version && m.version !== filter.version) return false;
      return true;
    });
  }

  setActiveModel(modelName: string, scope: ActivationScope, scopeId?: string): ActiveModelEntry {
    if (!this.models.has(modelName)) {
      throw new Error(`Model '${modelName}' is not registered`);
    }
    this.activeModels = this.activeModels.filter(
      a => !(a.scope === scope && a.scopeId === scopeId)
    );
    const entry: ActiveModelEntry = {
      modelName,
      scope,
      scopeId,
      activatedAt: new Date().toISOString(),
    };
    this.activeModels.push(entry);
    return entry;
  }

  getActiveModel(scope: ActivationScope, scopeId?: string): ModelMetadata | undefined {
    const entry = this.activeModels.find(
      a => a.scope === scope && a.scopeId === scopeId
    );
    if (!entry) return undefined;
    return this.models.get(entry.modelName);
  }

  compareModels(nameA: string, nameB: string): Record<string, { a: number; b: number; diff: number }> | null {
    const mA = this.models.get(nameA);
    const mB = this.models.get(nameB);
    if (!mA?.evaluation || !mB?.evaluation) return null;
    const scoresA = mA.evaluation.scores;
    const scoresB = mB.evaluation.scores;
    const keys = Object.keys(scoresA) as (keyof typeof scoresA)[];
    const result: Record<string, { a: number; b: number; diff: number }> = {};
    for (const key of keys) {
      const a = scoresA[key];
      const b = scoresB[key];
      result[key] = { a, b, diff: +(a - b).toFixed(4) };
    }
    return result;
  }
}
