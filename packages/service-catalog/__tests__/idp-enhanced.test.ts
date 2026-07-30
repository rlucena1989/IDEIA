import { ServiceCatalog } from '../src/catalog';
import { GoldenPathRegistry } from '../src/golden-paths';
import { ServiceScorecard } from '../src/scorecard';
import { SelfServiceRegistry } from '../src/actions';
import { IDPOrchestrator } from '../src/idp-orchestrator';
import { BackstageAdapter } from '../src/backstage-adapter';
import { ServiceDefinition } from '../src/types';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('IDPOrchestrator', () => {
  let catalog: ServiceCatalog;
  let goldenPaths: GoldenPathRegistry;
  let scorecard: ServiceScorecard;
  let registry: SelfServiceRegistry;
  let orchestrator: IDPOrchestrator;

  beforeEach(() => {
    catalog = new ServiceCatalog();
    goldenPaths = new GoldenPathRegistry();
    scorecard = new ServiceScorecard(catalog);
    registry = new SelfServiceRegistry();
    orchestrator = new IDPOrchestrator(catalog, goldenPaths, scorecard, registry);
  });

  it('initialize registers built-ins', async () => {
    expect(catalog.count()).toBe(0);
    expect(goldenPaths.count()).toBe(0);
    expect(registry.count()).toBe(0);
    await orchestrator.initialize();
    expect(catalog.count()).toBe(6);
    expect(goldenPaths.count()).toBe(3);
    expect(registry.count()).toBe(4);
  });

  it('getStatus returns aggregate', async () => {
    await orchestrator.initialize();
    const status = orchestrator.getStatus();
    expect(status.services).toBe(6);
    expect(status.goldenPaths).toBe(3);
    expect(status.actions).toBe(4);
    expect(status.health).toBe('healthy');
    expect(status.lastSync).toBeTruthy();
  });

  it('executeAction with valid action', async () => {
    await orchestrator.initialize();
    const result = orchestrator.executeAction('act-scaffold-service', { name: 'my-api' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('Executed');
  });

  it('executeAction with invalid action returns failure', () => {
    const result = orchestrator.executeAction('nonexistent', {});
    expect(result.success).toBe(false);
    expect(result.output).toContain('not found');
  });

  it('generateBackstageCatalog returns valid YAML', async () => {
    await orchestrator.initialize();
    const yaml = await orchestrator.generateBackstageCatalog();
    expect(yaml).toContain('---');
    expect(yaml).toContain('apiVersion: backstage.io/v1alpha1');
    expect(yaml).toContain('kind: Component');
    expect(yaml).toContain('servicecatalog');
    expect(yaml).toContain('eventbus');
    const docs = yaml.split('---').filter(d => d.trim().length > 0);
    expect(docs.length).toBe(6);
  });

  it('discoverServices on empty workspace', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'idp-test-'));
    try {
      const services = await orchestrator.discoverServices(tmpDir);
      expect(services).toEqual([]);
    } finally {
      if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('discoverServices finds packages', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'idp-test-'));
    try {
      mkdirSync(join(tmpDir, 'my-service'), { recursive: true });
      writeFileSync(join(tmpDir, 'my-service', 'package.json'), JSON.stringify({ name: '@test/my-service', description: 'Test service' }));
      const services = await orchestrator.discoverServices(tmpDir);
      expect(services).toHaveLength(1);
      expect(services[0].id).toBe('@test/my-service');
      expect(services[0].description).toBe('Test service');
    } finally {
      if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('BackstageAdapter', () => {
  let adapter: BackstageAdapter;

  beforeEach(() => {
    adapter = new BackstageAdapter();
  });

  it('toBackstageEntity for Component kind', () => {
    const svc: ServiceDefinition = { id: 'my-svc', name: 'My Service', description: 'A service', owner: 'team-a', language: 'ts', tags: ['backend'], repository: 'github.com/example/svc', status: 'active', score: 80, grade: 'B' };
    const entity = adapter.toBackstageEntity(svc);
    expect(entity.apiVersion).toBe('backstage.io/v1alpha1');
    expect(entity.kind).toBe('Component');
    expect(entity.metadata.name).toBe('my-service');
    expect(entity.metadata.description).toBe('A service');
    expect(entity.spec?.owner).toBe('team-a');
  });

  it('toBackstageEntity for API kind', () => {
    const svc: ServiceDefinition = { id: 'my-api', name: 'My API', description: 'An API', owner: 'team-a', language: 'openapi', tags: ['api'], repository: '', status: 'active', score: 75, grade: 'B' };
    const entity = adapter.toBackstageEntity(svc);
    expect(entity.kind).toBe('API');
    expect(entity.spec?.type).toBe('openapi');
  });

  it('toBackstageEntity for Resource kind', () => {
    const svc: ServiceDefinition = { id: 'my-db', name: 'My Database', description: 'A database', owner: 'platform', language: 'sql', tags: ['resource'], repository: '', status: 'active', score: 70, grade: 'B' };
    const entity = adapter.toBackstageEntity(svc);
    expect(entity.kind).toBe('Resource');
    expect(entity.spec?.type).toBe('database');
  });

  it('toCatalogYaml produces multi-doc YAML', () => {
    const services: ServiceDefinition[] = [
      { id: 'svc1', name: 'Service One', description: 'First', owner: 'a', language: 'ts', tags: [], repository: '', status: 'active', score: 80, grade: 'B' },
      { id: 'svc2', name: 'Service Two', description: 'Second', owner: 'b', language: 'py', tags: ['api'], repository: '', status: 'planned', score: 40, grade: 'D' },
    ];
    const yaml = adapter.toCatalogYaml(services);
    expect(yaml).toContain('---');
    const docs = yaml.split('---').filter(d => d.trim().length > 0);
    expect(docs).toHaveLength(2);
    expect(docs[0]).toContain('service-one');
    expect(docs[1]).toContain('service-two');
  });

  it('fromBackstageEntity roundtrip', () => {
    const original: ServiceDefinition = { id: 'roundtrip-svc', name: 'Roundtrip Service', description: 'Roundtrip test', owner: 'team-x', language: 'typescript', tags: ['api'], repository: 'github.com/test/rt', status: 'active', score: 85, grade: 'A' };
    const entity = adapter.toBackstageEntity(original);
    const restored = adapter.fromBackstageEntity(entity);
    expect(restored.name).toBe('roundtrip-service');
    expect(restored.description).toBe('Roundtrip test');
    expect(restored.owner).toBe('team-x');
    expect(restored.tags).toContain('api');
  });

  it('toBackstageEntity handles all statuses', () => {
    const svc: ServiceDefinition = { id: 's', name: 'S', description: '', owner: 'o', language: 'ts', tags: [], repository: '', status: 'deprecated', score: 30, grade: 'F' };
    const entity = adapter.toBackstageEntity(svc);
    expect(entity.spec?.lifecycle).toBe('deprecated');
  });
});
