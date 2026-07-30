import { ServiceCatalog } from './service-catalog';
import { createLogger } from '@ideia/logger';
import { ScorecardManager } from './scorecard-manager';
import { SelfServiceActions } from './self-service-actions';
import { TemplateRegistry } from './template-registry';
import { CatalogEntry, ScorecardResult, ActionDefinition, GoldenPathTemplate } from './types';
const logger = createLogger('developer-dashboard');

export interface DashboardOverview {
  totalServices: number;
  averageScore: number;
  topServices: CatalogEntry[];
  recentActions: number;
  templatesAvailable: number;
  scoreDistribution: Record<string, number>;
  pendingApprovals: number;
}

export class DeveloperDashboard {
  constructor(
    private _catalog: ServiceCatalog,
    private _scorecardManager: ScorecardManager,
    private _actions: SelfServiceActions,
    private _templateRegistry: TemplateRegistry,
  ) {}

  getOverview(): DashboardOverview {
    const services = this._catalog.list();
    const avgScore = services.length > 0
      ? services.reduce((s, e) => s + e.score, 0) / services.length
      : 0;
    const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const e of services) {
      dist[e.grade] = (dist[e.grade] ?? 0) + 1;
    }
    return {
      totalServices: services.length,
      averageScore: Math.round(avgScore),
      topServices: this._catalog.top(5),
      recentActions: this._actions.list().length,
      templatesAvailable: this._templateRegistry.count(),
      scoreDistribution: dist,
      pendingApprovals: 0,
    };
  }

  getServiceDetails(name: string): {
    entry: CatalogEntry | undefined;
    scorecard: ScorecardResult | null;
    scoreHistory: Array<{ timestamp: number; score: number; grade: string }>;
  } {
    const entry = this._catalog.get(name);
    const latest = this._scorecardManager.getLatest(name);
    const history = this._scorecardManager.getHistory(name, 10);
    return {
      entry,
      scorecard: latest ? { service: latest.service, score: latest.score, maxScore: latest.maxScore, grade: latest.grade, checks: latest.checks, timestamp: latest.timestamp } : null,
      scoreHistory: history.map(h => ({ timestamp: h.timestamp, score: h.score, grade: h.grade })),
    };
  }

  getAvailableActions(): ActionDefinition[] {
    return this._actions.list();
  }

  getTemplates(): GoldenPathTemplate[] {
    return this._templateRegistry.list();
  }

  getSearchResults(query: string): CatalogEntry[] {
    return this._catalog.search(query);
  }

  getTopByScore(n: number): CatalogEntry[] {
    return this._catalog.top(n);
  }

  getBottomByScore(n: number): CatalogEntry[] {
    return this._catalog.bottom(n);
  }
}
