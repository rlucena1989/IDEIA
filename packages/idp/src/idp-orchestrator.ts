import { ServiceCatalog } from './service-catalog';
import { createLogger } from '@ideia/logger';
import { GoldenPathEngine } from './golden-path-engine';
import { ScorecardManager } from './scorecard-manager';
import { TemplateRegistry } from './template-registry';
import { SelfServiceActions } from './self-service-actions';
import { DeveloperDashboard } from './developer-dashboard';
import { BackstageCompatibilityBridge } from './backstage-compatibility-bridge';
import { IDPOrchestratorConfig, GoldenPathTemplate, ServiceDefinition, ActionDefinition, ScorecardResult, ScaffoldResult, CatalogEntry } from './types';
const logger = createLogger('idp-orchestrator');

export class IDPOrchestrator {
  private _catalog: ServiceCatalog;
  private _goldenPathEngine: GoldenPathEngine;
  private _scorecardManager: ScorecardManager;
  private _templateRegistry: TemplateRegistry;
  private _selfServiceActions: SelfServiceActions;
  private _dashboard: DeveloperDashboard;
  private _backstageBridge: BackstageCompatibilityBridge;
  private _config: IDPOrchestratorConfig;

  constructor(config?: Partial<IDPOrchestratorConfig>) {
    this._scorecardManager = new ScorecardManager();
    this._catalog = new ServiceCatalog(this._scorecardManager);
    this._goldenPathEngine = new GoldenPathEngine();
    this._templateRegistry = new TemplateRegistry();
    this._selfServiceActions = new SelfServiceActions();
    this._dashboard = new DeveloperDashboard(this._catalog, this._scorecardManager, this._selfServiceActions, this._templateRegistry);
    this._backstageBridge = new BackstageCompatibilityBridge(this._catalog);
    this._config = {
      autoDiscoverServices: config?.autoDiscoverServices ?? false,
      scorecardIntervalMs: config?.scorecardIntervalMs ?? 86400000,
      templateDirectories: config?.templateDirectories ?? [],
      enableBackstageSync: config?.enableBackstageSync ?? false,
    };
  }

  get catalog(): ServiceCatalog { return this._catalog; }
  get goldenPathEngine(): GoldenPathEngine { return this._goldenPathEngine; }
  get scorecardManager(): ScorecardManager { return this._scorecardManager; }
  get templateRegistry(): TemplateRegistry { return this._templateRegistry; }
  get selfServiceActions(): SelfServiceActions { return this._selfServiceActions; }
  get dashboard(): DeveloperDashboard { return this._dashboard; }
  get backstageBridge(): BackstageCompatibilityBridge { return this._backstageBridge; }

  async registerService(service: ServiceDefinition): Promise<CatalogEntry> {
    return this._catalog.register(service);
  }

  async scaffoldService(templateName: string, params: Record<string, string>, targetDir: string): Promise<ScaffoldResult> {
    const template = this._templateRegistry.get(templateName);
    if (!template) {
      return { success: false, error: `Template "${templateName}" not found` };
    }
    return this._goldenPathEngine.scaffold(template, params, targetDir);
  }

  async runAction(actionName: string, params: Record<string, string>, context: { user: string; role: string }) {
    return this._selfServiceActions.execute(actionName, params, context);
  }

  computeScorecard(service: string): Promise<ScorecardResult> {
    return this._scorecardManager.compute(service);
  }

  evaluateGate(service: string) {
    return this._scorecardManager.evaluateGate(service);
  }

  registerTemplate(template: GoldenPathTemplate): void {
    this._templateRegistry.register(template);
  }

  searchServices(query: string): CatalogEntry[] {
    return this._catalog.search(query);
  }

  getDashboardOverview() {
    return this._dashboard.getOverview();
  }

  async syncToBackstage(): Promise<number> {
    if (!this._config.enableBackstageSync) return 0;
    return this._backstageBridge.syncToBackstage();
  }

  getStats(): { catalogSize: number; templatesAvailable: number; actionsRegistered: number; averageScore: number } {
    const services = this._catalog.list();
    const avg = services.length > 0 ? services.reduce((s, e) => s + e.score, 0) / services.length : 0;
    return {
      catalogSize: services.length,
      templatesAvailable: this._templateRegistry.count(),
      actionsRegistered: this._selfServiceActions.list().length,
      averageScore: Math.round(avg),
    };
  }
}
