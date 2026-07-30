import { createLogger } from '@ideia/logger';
import {
  HealthChecker,
  ComponentHealth,
  HealthCheckResult,
  HealthCheckOptions,
  HealthCheckDependency,
  HealthReport,
  HealthStatus,
} from './types';
import { SystemChecker, ProcessChecker } from './system';
const logger = createLogger('health-checker');

function _topologicalSort(deps: HealthCheckDependency[]): string[] {
  const edges = new Map<string, string[]>();
  const allNodes = new Set<string>();

  for (const dep of deps) {
    allNodes.add(dep.name);
    edges.set(dep.name, dep.dependsOn);
    for (const d of dep.dependsOn) {
      allNodes.add(d);
      if (!edges.has(d)) edges.set(d, []);
    }
  }

  for (const node of allNodes) {
    if (!edges.has(node)) edges.set(node, []);
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: string[] = [];

  function visit(node: string): void {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      throw new Error(`Circular dependency detected involving: ${node}`);
    }
    visiting.add(node);
    const neighbors = edges.get(node) ?? [];
    for (const neighbor of neighbors) {
      visit(neighbor);
    }
    visiting.delete(node);
    visited.add(node);
    result.push(node);
  }

  for (const node of edges.keys()) {
    visit(node);
  }

  return result;
}

export class HealthCheckerEngine {
  private checkers = new Map<string, HealthChecker>();
  private startTime = Date.now();
  private dependencies: HealthCheckDependency[] = [];

  constructor(private options: HealthCheckOptions = {}) {
    if (options.includeSystem !== false) {
      this.register(new SystemChecker());
      this.register(new ProcessChecker());
    }
  }

  register(checker: HealthChecker, dependency?: HealthCheckDependency): void {
    this.checkers.set(checker.name, checker);
    if (dependency) {
      const existing = this.dependencies.findIndex((d) => d.name === checker.name);
      if (existing >= 0) {
        this.dependencies[existing] = dependency;
      } else {
        this.dependencies.push(dependency);
      }
    }
  }

  unregister(name: string): void {
    this.checkers.delete(name);
    this.dependencies = this.dependencies.filter((d) => d.name !== name);
  }

  setDependencies(deps: HealthCheckDependency[]): void {
    this.dependencies = deps;
  }

  getRegistered(): string[] {
    return [...this.checkers.keys()];
  }

  async check(): Promise<HealthCheckResult> {
    const entries = await this.runAllChecks();
    const status = this.calculateOverallStatus(entries);

    return {
      status,
      timestamp: new Date().toISOString(),
      version: this.options.version || '0.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: entries,
    };
  }

  async generateReport(): Promise<HealthReport> {
    const executionOrder = this.computeExecutionOrder();
    const checks = await this.runOrderedChecks(executionOrder);
    const status = this.calculateOverallStatus(checks);
    const total = checks.length;
    const healthyCount = checks.filter((c) => c.status === 'healthy').length;
    const degradedCount = checks.filter((c) => c.status === 'degraded').length;
    const unhealthyCount = checks.filter((c) => c.status === 'unhealthy').length;
    const totalLatency = checks.reduce((sum, c) => sum + (c.latency ?? 0), 0);

    const failedDependencies = checks.filter((c) => c.status === 'unhealthy').map((c) => c.name);

    return {
      status,
      timestamp: new Date().toISOString(),
      version: this.options.version || '0.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      components: checks,
      dependencies: [...this.dependencies],
    };
  }

  private async runAllChecks(): Promise<ComponentHealth[]> {
    return Promise.all(
      [...this.checkers.values()].map(async (checker) => {
        const start = Date.now();
        try {
          const result = await checker.check();
          result.latency = Date.now() - start;
          return result;
        } catch (err) {
          return {
            name: checker.name,
            status: 'unhealthy' as HealthStatus,
            message: `Error: ${err instanceof Error ? err.message : String(err)}`,
            latency: Date.now() - start,
          } as ComponentHealth;
        }
      }),
    );
  }

  private async runOrderedChecks(order: string[]): Promise<ComponentHealth[]> {
    const completed = new Map<string, ComponentHealth>();
    const results: ComponentHealth[] = [];

    for (const name of order) {
      const checker = this.checkers.get(name);
      if (!checker) continue;

      const dep = this.dependencies.find((d) => d.name === name);
      if (dep) {
        for (const depName of dep.dependsOn) {
          const depResult = completed.get(depName);
          if (depResult && depResult.status === 'unhealthy') {
            results.push({
              name,
              status: 'unhealthy' as HealthStatus,
              message: `Skipped: dependency "${depName}" is unhealthy`,
            });
            completed.set(name, {
              name,
              status: 'unhealthy' as HealthStatus,
              message: `Skipped: dependency "${depName}" is unhealthy`,
            });
            continue;
          }
        }
      }

      const start = Date.now();
      try {
        const result = await checker.check();
        result.latency = Date.now() - start;
        results.push(result);
        completed.set(name, result);
      } catch (err) {
        const failed: ComponentHealth = {
          name,
          status: 'unhealthy' as HealthStatus,
          message: `Error: ${err instanceof Error ? err.message : String(err)}`,
          latency: Date.now() - start,
        };
        results.push(failed);
        completed.set(name, failed);
      }
    }

    return results;
  }

  private computeExecutionOrder(): string[] {
    if (this.dependencies.length === 0) {
      return [...this.checkers.keys()];
    }

    const allDeps = new Map<string, string[]>();
    for (const name of this.checkers.keys()) {
      allDeps.set(name, []);
    }
    for (const dep of this.dependencies) {
      if (allDeps.has(dep.name)) {
        allDeps.set(dep.name, dep.dependsOn);
      }
    }

    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    function visit(node: string): void {
      if (visited.has(node)) return;
      if (visiting.has(node)) {
        throw new Error(`Circular dependency detected involving: ${node}`);
      }
      visiting.add(node);
      const neighbors = allDeps.get(node) ?? [];
      for (const neighbor of neighbors) {
        if (allDeps.has(neighbor)) {
          visit(neighbor);
        }
      }
      visiting.delete(node);
      visited.add(node);
      order.push(node);
    }

    for (const node of allDeps.keys()) {
      visit(node);
    }

    return order;
  }

  private calculateOverallStatus(checks: ComponentHealth[]): HealthStatus {
    const hasUnhealthy = checks.some((c) => c.status === 'unhealthy');
    const hasDegraded = checks.some((c) => c.status === 'degraded');
    if (hasUnhealthy) return 'unhealthy';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  }
}

export function createHealthChecker(options?: HealthCheckOptions): HealthCheckerEngine {
  return new HealthCheckerEngine(options);
}
