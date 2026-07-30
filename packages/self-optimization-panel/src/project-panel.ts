import { EventBus } from '@ideia/event-bus';
import { createLogger } from '@ideia/logger';
import {
  ProjectHealth,
  DependencyInfo,
  QualityReport,
  OptimizationSuggestion,
} from './types';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const _log = createLogger('project-panel');

export class ProjectPanel {
  private scannedDeps: DependencyInfo[] = [];
  private scannedConfigs: Record<string, unknown> = {};

  constructor(private eventBus?: EventBus) {}

  scanProjectConfigs(projectDir?: string): Record<string, unknown> {
    const dir = resolve(projectDir ?? process.cwd());
    const configs: Record<string, unknown> = {};

    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        configs.packageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      } catch { /* ignore */ }
    }

    const tsconfigPath = join(dir, 'tsconfig.json');
    if (existsSync(tsconfigPath)) {
      try {
        configs.tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
      } catch { /* ignore */ }
    }

    this.scannedConfigs = configs;
    return configs;
  }

  scanDependencies(projectDir?: string): DependencyInfo[] {
    const configs = this.scannedConfigs.packageJson
      ? this.scannedConfigs
      : this.scanProjectConfigs(projectDir);
    const pkg = configs.packageJson as Record<string, Record<string, string>> | undefined;
    if (!pkg) return this.getDependencies();

    const allDeps: DependencyInfo[] = [];
    const scan = (deps: Record<string, string> | undefined) => {
      if (!deps) return;
      for (const [name, version] of Object.entries(deps)) {
        allDeps.push({
          name,
          current: version.replace(/^[\^~]/, ''),
          latest: version.replace(/^[\^~]/, ''),
          outdated: false,
          critical: false,
        });
      }
    };
    scan(pkg.dependencies);
    scan(pkg.devDependencies);

    this.scannedDeps = allDeps;
    return allDeps;
  }

  generateProjectReport(): ProjectReport {
    const health = this.getProjectHealth();
    const deps = this.scannedDeps.length > 0 ? this.scannedDeps : this.getDependencies();
    const quality = this.getQualityReport();
    const suggestions = this.generateSuggestions(health, deps, quality);

    return {
      generatedAt: new Date().toISOString(),
      health,
      dependencies: deps,
      quality,
      suggestions,
      totalDeps: deps.length,
      outdatedDeps: deps.filter(d => d.outdated).length,
      configs: Object.keys(this.scannedConfigs),
    };
  }

  getProjectHealth(): ProjectHealth {
    return {
      overall: 74,
      codeQuality: 78,
      dependencyHealth: 65,
      testHealth: 72,
      docsHealth: 80,
    };
  }

  getDependencies(): DependencyInfo[] {
    return [
      { name: 'typescript', current: '5.4.5', latest: '5.5.2', outdated: true, critical: false },
      { name: 'eslint', current: '8.57.0', latest: '9.7.0', outdated: true, critical: false },
      { name: 'jest', current: '29.7.0', latest: '30.0.0', outdated: true, critical: false },
      { name: 'express', current: '4.19.2', latest: '4.19.2', outdated: false, critical: false },
      { name: 'ws', current: '8.17.0', latest: '8.17.1', outdated: true, critical: false },
    ];
  }

  getQualityReport(): QualityReport {
    return {
      lintScore: 88,
      typeScore: 92,
      complexityScore: 71,
      duplicationScore: 79,
      maintainabilityScore: 76,
    };
  }

  getSuggestions(): OptimizationSuggestion[] {
    return this.generateSuggestions(
      this.getProjectHealth(),
      this.getDependencies(),
      this.getQualityReport(),
    );
  }

  private generateSuggestions(
    health: ProjectHealth,
    deps: DependencyInfo[],
    quality: QualityReport,
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    const outdated = deps.filter(d => d.outdated);
    if (outdated.length > 0) {
      suggestions.push({
        id: 'opt-deps',
        category: 'dependencies',
        description: `${outdated.length} dependencies are outdated (e.g., ${outdated.slice(0, 3).map(d => d.name).join(', ')})`,
        impact: outdated.some(d => d.critical) ? 'high' : 'medium',
        effort: 'hours',
      });
    }

    if (health.testHealth < 80) {
      suggestions.push({
        id: 'opt-test',
        category: 'test',
        description: `Increase test coverage above 80% (current: ${health.testHealth})`,
        impact: 'high',
        effort: 'days',
      });
    }

    if (quality.complexityScore < 75) {
      suggestions.push({
        id: 'opt-complexity',
        category: 'code',
        description: `Refactor high-complexity modules (score: ${quality.complexityScore})`,
        impact: 'medium',
        effort: 'days',
      });
    }

    if (health.docsHealth < 80) {
      suggestions.push({
        id: 'opt-docs',
        category: 'docs',
        description: `Improve documentation (current: ${health.docsHealth})`,
        impact: 'low',
        effort: 'hours',
      });
    }

    if (quality.lintScore < 85) {
      suggestions.push({
        id: 'opt-lint',
        category: 'code',
        description: `Fix lint issues to improve score from ${quality.lintScore}`,
        impact: 'medium',
        effort: 'hours',
      });
    }

    return suggestions;
  }
}

export interface ProjectReport {
  generatedAt: string;
  health: ProjectHealth;
  dependencies: DependencyInfo[];
  quality: QualityReport;
  suggestions: OptimizationSuggestion[];
  totalDeps: number;
  outdatedDeps: number;
  configs: string[];
}

export function createProjectPanel(eventBus?: EventBus): ProjectPanel {
  return new ProjectPanel(eventBus);
}
