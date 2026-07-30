import { FeatureRegistry } from './feature-registry';
import { createLogger } from '@ideia/logger';
const logger = createLogger('integration-orchestrator');

export interface IntegrationConfig {
  features: string[];
  validateDependencies: boolean;
  strictMode: boolean;
  timeoutMs: number;
}

export interface IntegrationResult {
  success: boolean;
  featureId: string;
  checks: { name: string; passed: boolean; error: string | null }[];
  durationMs: number;
  error: string | null;
}

export class IntegrationOrchestrator {
  private _registry: FeatureRegistry;
  private _config: IntegrationConfig;

  constructor(registry: FeatureRegistry, config?: Partial<IntegrationConfig>) {
    this._registry = registry;
    this._config = { ...this._getDefaultConfig(), ...config };
  }

  async orchestrate(): Promise<IntegrationResult[]> {
    if (this._config.features.length === 0) {
      return [];
    }
    const results: IntegrationResult[] = [];
    for (const featureId of this._config.features) {
      const result = await this._checkFeature(featureId);
      results.push(result);
    }
    return results;
  }

  private async _checkFeature(id: string): Promise<IntegrationResult> {
    const start = Date.now();
    const checks: { name: string; passed: boolean; error: string | null }[] = [];

    const feature = this._registry.get(id);

    if (!feature) {
      return {
        success: false,
        featureId: id,
        checks: [{ name: 'feature-exists', passed: false, error: `Feature "${id}" not found` }],
        durationMs: Date.now() - start,
        error: `Feature "${id}" not found`
      };
    }

    checks.push({ name: 'feature-exists', passed: true, error: null });

    if (this._config.validateDependencies) {
      const deps = this._resolveDependencies(id);
      let depsPassed = true;
      for (const depId of deps) {
        const depFeature = this._registry.get(depId);
        if (!depFeature) {
          depsPassed = false;
          checks.push({ name: `dependency-${depId}`, passed: false, error: `Dependency "${depId}" not found` });
        } else {
          checks.push({ name: `dependency-${depId}`, passed: true, error: null });
        }
      }
      if (!depsPassed && this._config.strictMode) {
        return {
          success: false,
          featureId: id,
          checks,
          durationMs: Date.now() - start,
          error: 'Dependencies not satisfied in strict mode'
        };
      }
    }

    const capabilitiesPassed = feature.capabilities.length > 0;
    checks.push({ name: 'capabilities-defined', passed: capabilitiesPassed, error: capabilitiesPassed ? null : 'No capabilities defined' });

    const statusValid = feature.status !== 'deprecated';
    checks.push({ name: 'status-valid', passed: statusValid, error: statusValid ? null : 'Feature is deprecated' });

    return {
      success: checks.every(c => c.passed),
      featureId: id,
      checks,
      durationMs: Date.now() - start,
      error: null
    };
  }

  private _resolveDependencies(featureId: string): string[] {
    const resolved: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [featureId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      const feature = this._registry.get(current);
      if (feature) {
        for (const dep of feature.dependencies) {
          if (!visited.has(dep.featureId)) {
            visited.add(dep.featureId);
            resolved.push(dep.featureId);
            queue.push(dep.featureId);
          }
        }
      }
    }
    return resolved;
  }

  private _getDefaultConfig(): IntegrationConfig {
    return { features: [], validateDependencies: true, strictMode: false, timeoutMs: 30000 };
  }

  validateFeatureGraph(): string[] {
    const graph = this._registry.getFeatureGraph();
    const cycles: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      const neighbors = graph.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            dfs(neighbor, [...path, neighbor]);
          } else if (recursionStack.has(neighbor)) {
            const cycle = [...path.slice(path.indexOf(neighbor)), neighbor].join(' -> ');
            cycles.push(cycle);
          }
        }
      }
      recursionStack.delete(node);
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, [node]);
      }
    }

    return cycles;
  }

  getEnabledCount(): number {
    return this._registry.getByStatus('completed').length;
  }

  getPlannedCount(): number {
    return this._registry.getByStatus('planned').length;
  }

  getProgressPercentage(): number {
    const all = this._registry.getAll();
    if (all.length === 0) return 0;
    const completed = this._registry.getByStatus('completed').length;
    return Math.round((completed / all.length) * 100);
  }
}
