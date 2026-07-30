import { IDPOrchestrator } from '../src/idp-orchestrator';
import { ServiceCatalog } from '../src/service-catalog';
import { GoldenPathEngine } from '../src/golden-path-engine';
import { ScorecardManager } from '../src/scorecard-manager';
import { TemplateRegistry } from '../src/template-registry';
import { SelfServiceActions } from '../src/self-service-actions';
import { DeveloperDashboard } from '../src/developer-dashboard';
import { BackstageCompatibilityBridge } from '../src/backstage-compatibility-bridge';
import { ServiceDefinition, GoldenPathTemplate, ActionDefinition } from '../src/types';

describe('ServiceCatalog', () => {
  let scorecardManager: ScorecardManager;
  let catalog: ServiceCatalog;

  beforeEach(() => {
    scorecardManager = new ScorecardManager();
    catalog = new ServiceCatalog(scorecardManager);
  });

  test('should register a service', async () => {
    const svc: ServiceDefinition = {
      name: 'my-api', type: 'api', owner: 'team-a', team: 'platform',
      repository: 'github.com/my-api', language: 'typescript',
      dependencies: [], apis: [], tags: ['api'], metadata: {},
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    const entry = await catalog.register(svc);
    expect(entry.service.name).toBe('my-api');
    expect(entry.score).toBeGreaterThanOrEqual(0);
  });

  test('should get service by name', async () => {
    const entry = catalog.get('non-existent');
    expect(entry).toBeUndefined();
  });

  test('should list all services', () => {
    expect(catalog.list().length).toBe(0);
  });

  test('should search services', async () => {
    const svc: ServiceDefinition = {
      name: 'search-test', type: 'api', owner: 'team', team: 'team',
      repository: '', language: 'ts', dependencies: [], apis: [],
      tags: ['test'], metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
    };
    await catalog.register(svc);
    const results = catalog.search('search-test');
    expect(results.length).toBe(1);
  });

  test('should get top n services by score', async () => {
    for (let i = 0; i < 5; i++) {
      await catalog.register({
        name: `svc-${i}`, type: 'api', owner: 'team', team: 'team',
        repository: '', language: 'ts', dependencies: [], apis: [],
        tags: [], metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
      });
    }
    const top = catalog.top(3);
    expect(top.length).toBe(3);
  });
});

describe('GoldenPathEngine', () => {
  let engine: GoldenPathEngine;

  beforeEach(() => { engine = new GoldenPathEngine(); });

  test('should validate params', () => {
    const template: GoldenPathTemplate = {
      name: 'node-api', description: 'Node API', version: '1.0.0',
      variables: [{ name: 'name', description: 'Service name', required: true }],
      files: [{ path: 'src/index.ts', content: '// {{name}}' }],
      conditions: new Map(), postActions: [],
    };
    const errors = engine.validateParams(template, {});
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('name');
  });

  test('should render content with params', () => {
    const template: GoldenPathTemplate = {
      name: 'test', description: 'test', version: '1.0.0',
      variables: [{ name: 'name', description: 'Name', required: true }],
      files: [{ path: 'hello.txt', content: 'Hello {{name}}!' }],
      conditions: new Map(), postActions: [],
    };
    const files = engine.renderContent(template, { name: 'World' });
    expect(files.get('hello.txt')).toBe('Hello World!');
  });

  test('should scaffold template', async () => {
    const template: GoldenPathTemplate = {
      name: 'scaffold-test', description: 'test', version: '1.0.0',
      variables: [{ name: 'name', description: 'Name', required: true }],
      files: [{ path: 'test.txt', content: '{{name}}' }],
      conditions: new Map(), postActions: [],
    };
    const result = await engine.scaffold(template, { name: 'test' }, '/tmp/scaffold-test', true);
    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
  });
});

describe('ScorecardManager', () => {
  let sm: ScorecardManager;

  beforeEach(() => { sm = new ScorecardManager(); });

  test('should compute scorecard', async () => {
    const result = await sm.compute('test-service');
    expect(result.service).toBe('test-service');
    expect(result.score).toBeGreaterThan(0);
    expect(result.grade).toBeDefined();
  });

  test('should evaluate gate', async () => {
    const gateResult = await sm.evaluateGate('gate-test');
    expect(gateResult.service).toBe('gate-test');
    expect(typeof gateResult.passed).toBe('boolean');
  });

  test('should get score history', async () => {
    await sm.compute('history-test');
    await sm.compute('history-test');
    const history = sm.getHistory('history-test');
    expect(history.length).toBe(2);
  });

  test('should get trend', async () => {
    const trend = await sm.getTrend('trend-test');
    expect(trend.direction).toBe('stable');
  });
});

describe('TemplateRegistry', () => {
  let reg: TemplateRegistry;

  beforeEach(() => { reg = new TemplateRegistry(); });

  test('should register and get template', () => {
    const tmpl: GoldenPathTemplate = {
      name: 'tmpl1', description: 'test', version: '1.0.0',
      variables: [], files: [], conditions: new Map(), postActions: [],
    };
    reg.register(tmpl);
    expect(reg.get('tmpl1')).toBeDefined();
  });

  test('should find best match', () => {
    const tmpl: GoldenPathTemplate = {
      name: 'node-express', description: 'Node Express API', version: '1.0.0',
      variables: [], files: [], conditions: new Map(), postActions: [],
    };
    reg.register(tmpl);
    const best = reg.findBestMatch('express');
    expect(best).toBeDefined();
    expect(best!.name).toBe('node-express');
  });
});

describe('SelfServiceActions', () => {
  let actions: SelfServiceActions;

  beforeEach(() => { actions = new SelfServiceActions(); });

  test('should list default actions', () => {
    const list = actions.list();
    expect(list.length).toBeGreaterThan(0);
  });

  test('should find actions by query', () => {
    const results = actions.find('create');
    expect(results.length).toBeGreaterThan(0);
  });

  test('should execute action', () => {
    const result = actions.execute('create-api', { name: 'my-svc' }, { user: 'dev', role: 'dev' });
    expect(result.success).toBe(true);
  });

  test('should reject action without permission', () => {
    const result = actions.execute('deploy-canary', {}, { user: 'dev', role: 'dev' });
    expect(result.success).toBe(false);
  });
});

describe('DeveloperDashboard', () => {
  test('should get overview', () => {
    const sm = new ScorecardManager();
    const catalog = new ServiceCatalog(sm);
    const actions = new SelfServiceActions();
    const templateReg = new TemplateRegistry();
    const dashboard = new DeveloperDashboard(catalog, sm, actions, templateReg);
    const overview = dashboard.getOverview();
    expect(overview.totalServices).toBe(0);
  });
});

describe('BackstageCompatibilityBridge', () => {
  test('should convert catalog entry to Backstage entity', async () => {
    const sm = new ScorecardManager();
    const catalog = new ServiceCatalog(sm);
    const bridge = new BackstageCompatibilityBridge(catalog);
    const svc: ServiceDefinition = {
      name: 'backstage-svc', type: 'api', owner: 'team-a', team: 'platform',
      repository: '', language: 'ts', dependencies: ['db'], apis: ['users-api'],
      tags: ['api'], metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
    };
    const entry = await catalog.register(svc);
    const entity = bridge.toBackstageEntity(entry);
    expect(entity.kind).toBe('Component');
    expect(entity.metadata.name).toBe('backstage-svc');
    expect(entity.spec.dependsOn).toContain('component:db');
  });
});

describe('IDPOrchestrator', () => {
  let orchestrator: IDPOrchestrator;

  beforeEach(() => { orchestrator = new IDPOrchestrator(); });

  test('should register service', async () => {
    const svc: ServiceDefinition = {
      name: 'orchestrator-svc', type: 'api', owner: 'team', team: 'team',
      repository: '', language: 'ts', dependencies: [], apis: [],
      tags: [], metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
    };
    const entry = await orchestrator.registerService(svc);
    expect(entry.service.name).toBe('orchestrator-svc');
  });

  test('should compute scorecard', async () => {
    const result = await orchestrator.computeScorecard('test-svc');
    expect(result.score).toBeGreaterThan(0);
  });

  test('should get dashboard overview', () => {
    const overview = orchestrator.getDashboardOverview();
    expect(overview.totalServices).toBe(0);
  });

  test('should get stats', () => {
    const stats = orchestrator.getStats();
    expect(stats.catalogSize).toBe(0);
    expect(stats.templatesAvailable).toBe(0);
    expect(stats.actionsRegistered).toBeGreaterThan(0);
  });

  test('should register template', () => {
    const tmpl: GoldenPathTemplate = {
      name: 'orchestrator-tmpl', description: 'test', version: '1.0.0',
      variables: [], files: [], conditions: new Map(), postActions: [],
    };
    orchestrator.registerTemplate(tmpl);
    expect(orchestrator.templateRegistry.count()).toBe(1);
  });

  test('should search services', async () => {
    const svc: ServiceDefinition = {
      name: 'searchable', type: 'api', owner: 'team', team: 'team',
      repository: '', language: 'ts', dependencies: [], apis: [],
      tags: ['searchable'], metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
    };
    await orchestrator.registerService(svc);
    const results = orchestrator.searchServices('searchable');
    expect(results.length).toBe(1);
  });

  describe('GoldenPathEngine additional', () => {
    test('should handle conditional includes', () => {
      const engine = new GoldenPathEngine();
      const template: GoldenPathTemplate = {
        name: 'conditional', description: 'test', version: '1.0.0',
        variables: [{ name: 'db', description: 'DB type', required: true }],
        files: [{ path: 'db/migrate.sql', content: '-- {{db}} migration' }],
        conditions: new Map([['db/migrate.sql', { variable: 'db', equals: 'postgres' }]]),
        postActions: [],
      };
      const withPostgres = engine.renderContent(template, { db: 'postgres' });
      expect(withPostgres.has('db/migrate.sql')).toBe(true);
      const withMysql = engine.renderContent(template, { db: 'mysql' });
      expect(withMysql.has('db/migrate.sql')).toBe(false);
    });
  });
});
