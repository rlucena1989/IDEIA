import { ServiceCatalog } from './catalog';
import { createLogger } from '@ideia/logger';
import { GoldenPathRegistry } from './golden-paths';
import { ServiceScorecard } from './scorecard';
import { SelfServiceRegistry } from './actions';
import { ServiceDefinition, GoldenPath, SelfServiceAction } from './types';
import { BackstageAdapter } from './backstage-adapter';
import { readdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
const logger = createLogger('idp-orchestrator');

export interface IDPOrchestratorConfig {
  enableScorecards: boolean;
  enableSelfService: boolean;
  enableGoldenPaths: boolean;
  enableBackstageSync: boolean;
  autoRegisterBuiltins: boolean;
}

export interface IDPStatus {
  services: number;
  goldenPaths: number;
  scorecards: number;
  actions: number;
  health: 'healthy' | 'degraded' | 'down';
  lastSync: string | null;
}

const DEFAULT_CONFIG: IDPOrchestratorConfig = {
  enableScorecards: true,
  enableSelfService: true,
  enableGoldenPaths: true,
  enableBackstageSync: true,
  autoRegisterBuiltins: true,
};

const BUILTIN_SERVICES: ServiceDefinition[] = [
  { id: '@ideia/service-catalog', name: 'ServiceCatalog', description: 'Internal Developer Platform service registry', owner: 'platform', language: 'typescript', tags: ['core', 'catalog'], repository: 'github.com/anomalyco/ideia', status: 'active', score: 85, grade: 'A' },
  { id: '@ideia/event-bus', name: 'EventBus', description: 'NATS JetStream event bus', owner: 'platform', language: 'typescript', tags: ['core', 'messaging'], repository: 'github.com/anomalyco/ideia', status: 'active', score: 90, grade: 'A' },
  { id: '@ideia/agent-runtime', name: 'AgentRuntime', description: 'Multi-agent orchestration engine', owner: 'agents', language: 'typescript', tags: ['core', 'agents'], repository: 'github.com/anomalyco/ideia', status: 'active', score: 82, grade: 'B' },
  { id: '@ideia/security-policy', name: 'SecurityPolicy', description: 'Policy engine with 27 patterns', owner: 'security', language: 'typescript', tags: ['core', 'security'], repository: 'github.com/anomalyco/ideia', status: 'active', score: 88, grade: 'A' },
  { id: '@ideia/prompt-pipeline', name: 'PromptPipeline', description: 'Guard, classify, enrich, optimize, plan, format pipeline', owner: 'ai', language: 'typescript', tags: ['core', 'ai', 'pipeline'], repository: 'github.com/anomalyco/ideia', status: 'active', score: 86, grade: 'A' },
  { id: '@ideia/theia-plugin', name: 'TheiaPlugin', description: 'IDE integration with 10 widgets', owner: 'platform', language: 'typescript', tags: ['core', 'ide'], repository: 'github.com/anomalyco/ideia', status: 'active', score: 84, grade: 'B' },
];

const BUILTIN_GOLDEN_PATHS: GoldenPath[] = [
  {
    id: 'gp-new-service', name: 'New Service', description: 'Scaffold a new microservice', category: 'scaffold',
    steps: [
      { id: 'gp-ns-1', title: 'Initialize', command: 'IDEIA init service', description: 'Create service structure', optional: false },
      { id: 'gp-ns-2', title: 'Configure', command: 'IDEIA configure', description: 'Set up configuration', optional: false },
      { id: 'gp-ns-3', title: 'Implement', command: '', description: 'Implement business logic', optional: false },
      { id: 'gp-ns-4', title: 'Test', command: 'npm test', description: 'Run tests', optional: false },
      { id: 'gp-ns-5', title: 'Deploy', command: 'IDEIA deploy', description: 'Deploy to production', optional: true },
    ],
    estimatedMinutes: 120, tags: ['service', 'scaffold'],
  },
  {
    id: 'gp-new-api', name: 'New API', description: 'Create a new REST API', category: 'scaffold',
    steps: [
      { id: 'gp-na-1', title: 'Design', command: '', description: 'Design API spec', optional: false },
      { id: 'gp-na-2', title: 'Scaffold', command: 'IDEIA gen api', description: 'Generate API code', optional: false },
      { id: 'gp-na-3', title: 'Implement', command: '', description: 'Implement endpoints', optional: false },
      { id: 'gp-na-4', title: 'Document', command: '', description: 'Generate docs', optional: true },
    ],
    estimatedMinutes: 90, tags: ['api', 'scaffold'],
  },
  {
    id: 'gp-add-database', name: 'Add Database', description: 'Provision and connect a database', category: 'infrastructure',
    steps: [
      { id: 'gp-db-1', title: 'Choose Engine', command: '', description: 'Select database type', optional: false },
      { id: 'gp-db-2', title: 'Provision', command: 'IDEIA infra db create', description: 'Create database', optional: false },
      { id: 'gp-db-3', title: 'Connect', command: '', description: 'Connect service to DB', optional: false },
    ],
    estimatedMinutes: 60, tags: ['database', 'infrastructure'],
  },
];

const BUILTIN_ACTIONS: SelfServiceAction[] = [
  { id: 'act-scaffold-service', name: 'Scaffold Service', description: 'Create new microservice', type: 'scaffold', params: [{ name: 'name', type: 'string', required: true }, { name: 'language', type: 'string', required: false, default: 'typescript' }] },
  { id: 'act-run-tests', name: 'Run Tests', description: 'Execute test suite', type: 'test', params: [{ name: 'package', type: 'string', required: true }, { name: 'coverage', type: 'boolean', required: false, default: false }] },
  { id: 'act-deploy-canary', name: 'Canary Deploy', description: 'Deploy with canary strategy', type: 'deploy', params: [{ name: 'service', type: 'string', required: true }, { name: 'percentage', type: 'number', required: false, default: 10 }] },
  { id: 'act-generate-docs', name: 'Generate Docs', description: 'Generate API documentation', type: 'docs', params: [{ name: 'format', type: 'string', required: false, default: 'markdown' }] },
];

export class IDPOrchestrator {
  private catalog: ServiceCatalog;
  private goldenPaths: GoldenPathRegistry;
  private scorecard: ServiceScorecard;
  private registry: SelfServiceRegistry;
  private config: IDPOrchestratorConfig;
  private adapter: BackstageAdapter;
  private initialized = false;

  constructor(
    catalog: ServiceCatalog,
    goldenPaths: GoldenPathRegistry,
    scorecard: ServiceScorecard,
    registry: SelfServiceRegistry,
    config?: Partial<IDPOrchestratorConfig>,
  ) {
    this.catalog = catalog;
    this.goldenPaths = goldenPaths;
    this.scorecard = scorecard;
    this.registry = registry;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.adapter = new BackstageAdapter();
  }

  async initialize(): Promise<void> {
    if (this.config.autoRegisterBuiltins) {
      this._registerBuiltins();
      this._registerGoldenPaths();
    }
    this.initialized = true;
  }

  getStatus(): IDPStatus {
    const allHealthy = this.initialized;
    const services = this.catalog.count();
    const goldenPaths = this.goldenPaths.count();
    const scorecards = this.scorecard.getLeaderboard().length;
    const actions = this.registry.count();
    const health: IDPStatus['health'] = allHealthy ? 'healthy' : services > 0 ? 'degraded' : 'down';
    return { services, goldenPaths, scorecards, actions, health, lastSync: new Date().toISOString() };
  }

  executeAction(actionId: string, params: Record<string, string>): { success: boolean; output: string } {
    return this.registry.execute(actionId, params);
  }

  async discoverServices(workspacePath?: string): Promise<ServiceDefinition[]> {
    const root = workspacePath ?? process.cwd();
    if (!existsSync(root)) return [];
    const entries = readdirSync(root, { withFileTypes: true });
    const services: ServiceDefinition[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgPath = join(root, entry.name, 'package.json');
      if (existsSync(pkgPath)) {
        try {
          const content = readFileSync(pkgPath, 'utf-8');
          const pkg = JSON.parse(content);
          services.push({
            id: pkg.name ?? entry.name,
            name: (pkg.name as string) ?? entry.name,
            description: (pkg.description as string) ?? '',
            owner: (pkg.author as string) ?? 'unknown',
            language: 'typescript',
            tags: [],
            repository: (pkg.repository?.url as string) ?? (pkg.repository as string) ?? '',
            status: 'active' as const,
            score: 50,
            grade: 'C' as const,
          });
        } catch {
          continue;
        }
      }
    }
    return services;
  }

  async generateBackstageCatalog(): Promise<string> {
    const services = this.catalog.list();
    return this.adapter.toCatalogYaml(services);
  }

  private _registerBuiltins(): void {
    for (const svc of BUILTIN_SERVICES) {
      this.catalog.register(svc);
    }
  }

  private _registerGoldenPaths(): void {
    for (const gp of BUILTIN_GOLDEN_PATHS) {
      this.goldenPaths.register(gp);
    }
    for (const action of BUILTIN_ACTIONS) {
      this.registry.register(action);
    }
  }
}
