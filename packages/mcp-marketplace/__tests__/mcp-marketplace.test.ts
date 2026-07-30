import { MCPMarketplace } from '../src/mcp-marketplace';
import { MCPServerRegistry } from '../src/mcp-server-registry';
import { MCPClientManager } from '../src/mcp-client-manager';
import { ToolDiscoveryService } from '../src/tool-discovery-service';
import { PermissionManager } from '../src/permission-manager';
import { OfflineInstaller } from '../src/offline-installer';
import { MarketplaceCatalog } from '../src/marketplace-catalog';
import { PluginRatingEngine } from '../src/plugin-rating-engine';
import { MarketplacePackage, MCPServerDefinition, MCPToolDefinition, OfflineBundle, PermissionTier, PackageSource } from '../src/types';

function makePackage(name: string, overrides?: Partial<MarketplacePackage>): MarketplacePackage {
  return {
    id: name,
    name,
    version: '1.0.0',
    description: `Package ${name}`,
    category: 'communication',
    tags: [name, 'test'],
    tools: [{
      name: `${name}_tool`,
      description: `${name} tool`,
      inputSchema: { type: 'object', properties: { input: { type: 'string' } }, required: ['input'] },
      outputSchema: { type: 'object' },
      permissionTier: 'T1',
      category: 'communication',
    }],
    configSchema: {},
    permissions: ['T1'],
    source: 'official',
    verified: true,
    downloads: 1000,
    rating: 4.5,
    metadata: {},
    ...overrides,
  };
}

describe('MCPServerRegistry', () => {
  let registry: MCPServerRegistry;

  beforeEach(() => { registry = new MCPServerRegistry(); });

  test('should register and get server', () => {
    const server: MCPServerDefinition = {
      id: 'test', name: 'test-server', version: '1.0.0', description: 'test',
      tools: [], permissions: ['T1'], source: 'official', verified: true,
      downloads: 0, rating: 0, tags: [],
    };
    registry.register(server);
    expect(registry.get('test-server')).toBeDefined();
  });

  test('should list all servers', () => {
    expect(registry.list().length).toBe(0);
  });

  test('should search servers', () => {
    const server: MCPServerDefinition = {
      id: 's1', name: 'slack', version: '1.0.0', description: 'Slack integration',
      tools: [], permissions: ['T1'], source: 'official', verified: true,
      downloads: 0, rating: 0, tags: ['slack', 'communication'],
    };
    registry.register(server);
    const results = registry.search('slack');
    expect(results.length).toBe(1);
  });

  test('should find tool across servers', () => {
    const server: MCPServerDefinition = {
      id: 's2', name: 'github', version: '1.0.0', description: 'GitHub',
      tools: [{ name: 'create_pr', description: 'Create PR', inputSchema: {}, permissionTier: 'T1', category: 'code' }],
      permissions: ['T1'], source: 'official', verified: true,
      downloads: 0, rating: 0, tags: [],
    };
    registry.register(server);
    const found = registry.findTool('create_pr');
    expect(found).toBeDefined();
    expect(found!.server.name).toBe('github');
  });
});

describe('PermissionManager', () => {
  let pm: PermissionManager;

  beforeEach(() => { pm = new PermissionManager(); });

  test('should check tool permission', () => {
    const tool: MCPToolDefinition = {
      name: 'delete_file', description: 'Delete', inputSchema: {},
      permissionTier: 'T3', category: 'filesystem',
    };
    const check = pm.checkToolPermission(tool, 'user1');
    expect(check.tier).toBe('T1');
    expect(check.allowed).toBe(false);
  });

  test('should set user tier', () => {
    pm.setUserTier('admin', 'T4');
    expect(pm.getUserTier('admin')).toBe('T4');
  });
});

describe('OfflineInstaller', () => {
  let installer: OfflineInstaller;

  beforeEach(() => { installer = new OfflineInstaller(false); });

  test('should install bundle', async () => {
    const bundle: OfflineBundle = {
      formatVersion: '1.0', packageName: '@ideia/mcp-test', version: '1.0.0',
      createdAt: new Date().toISOString(),
      files: [{ path: 'dist/server.js', size: 100, sha256: 'a'.repeat(64) }],
      dependencies: [],
    };
    const result = await installer.install(bundle);
    expect(result.success).toBe(true);
  });

  test('should list installed', () => {
    expect(installer.listInstalled().length).toBe(0);
  });
});

describe('MarketplaceCatalog', () => {
  let catalog: MarketplaceCatalog;

  beforeEach(() => { catalog = new MarketplaceCatalog(); });

  test('should add and get package', () => {
    const pkg = makePackage('test-pkg');
    catalog.addPackage(pkg);
    expect(catalog.getPackage('test-pkg')).toBeDefined();
  });

  test('should search packages', () => {
    catalog.addPackage(makePackage('slack'));
    const results = catalog.search('slack');
    expect(results.length).toBe(1);
  });
});

describe('PluginRatingEngine', () => {
  let engine: PluginRatingEngine;

  beforeEach(() => { engine = new PluginRatingEngine(); });

  test('should score a package', async () => {
    const pkg = makePackage('rated-pkg', { downloads: 5000, rating: 4 });
    const rating = await engine.scorePackage(pkg);
    expect(rating.total).toBeGreaterThan(0);
    expect(rating.tier).toBeDefined();
  });

  test('should add review and get average rating', () => {
    engine.addReview({
      id: 'r1', packageName: 'pkg1', userId: 'u1', rating: 5,
      review: 'Great!', timestamp: new Date(), helpful: 0, verified: true,
    });
    engine.addReview({
      id: 'r2', packageName: 'pkg1', userId: 'u2', rating: 3,
      review: 'Okay', timestamp: new Date(), helpful: 0, verified: true,
    });
    expect(engine.getAverageRating('pkg1')).toBe(4);
  });
});

describe('MCPClientManager', () => {
  let cm: MCPClientManager;

  beforeEach(() => { cm = new MCPClientManager(); });

  test('should connect and disconnect', async () => {
    const conn = await cm.connect('server1', 'stdio', 'node server.js');
    expect(conn.serverId).toBe('server1');
    await cm.disconnect('server1');
    expect(cm.isConnected('server1')).toBe(false);
  });

  test('should return empty tools for unknown server', () => {
    const tools = cm.getTools('unknown');
    expect(tools.length).toBe(0);
  });
});

describe('ToolDiscoveryService', () => {
  test('should discover from dependencies', async () => {
    const registry = new MCPServerRegistry();
    const server: MCPServerDefinition = {
      id: 's1', name: 'slack', version: '1.0.0', description: 'Slack',
      tools: [], permissions: ['T1'], source: 'pre-installed', verified: true,
      downloads: 0, rating: 0, tags: ['slack'],
    };
    registry.register(server);
    const service = new ToolDiscoveryService(registry);
    const results = await service.discoverFromDependencies({ '@slack/client': '1.0.0' });
    expect(results.length).toBe(1);
  });

  test('should suggest tools by query', () => {
    const registry = new MCPServerRegistry();
    const service = new ToolDiscoveryService(registry);
    const tools = service.suggestTools('test');
    expect(Array.isArray(tools)).toBe(true);
  });
});

describe('MCPMarketplace', () => {
  let marketplace: MCPMarketplace;

  beforeEach(() => { marketplace = new MCPMarketplace(); });

  test('should install package', async () => {
    const pkg = makePackage('mcp-test');
    const result = await marketplace.installPackage(pkg);
    expect(result.success).toBe(true);
  });

  test('should search tools', async () => {
    const results = await marketplace.searchTools('test');
    expect(Array.isArray(results)).toBe(true);
  });

  test('should get rating for package', async () => {
    const pkg = makePackage('rated');
    await marketplace.installPackage(pkg);
    const rating = await marketplace.getRating('rated');
    expect(rating).toBeDefined();
    expect(rating!.total).toBeGreaterThan(0);
  });

  test('should get stats', async () => {
    const stats = await marketplace.getStats();
    expect(stats.totalPackages).toBe(0);
    expect(stats.totalTools).toBe(0);
  });

  test('should uninstall package', async () => {
    const pkg = makePackage('uninstall-me');
    await marketplace.installPackage(pkg);
    const removed = await marketplace.uninstallPackage('uninstall-me');
    expect(removed).toBe(true);
  });
});

describe('MCPServerRegistry additional', () => {
  let reg: MCPServerRegistry;
  beforeEach(() => { reg = new MCPServerRegistry(); });

  test('should list by category', () => {
    const server: MCPServerDefinition = {
      id: 's1', name: 'test', version: '1.0.0', description: 'test',
      tools: [{ name: 't1', description: 't1', inputSchema: {}, permissionTier: 'T1', category: 'filesystem' }],
      permissions: ['T1'], source: 'official', verified: true, downloads: 0, rating: 0, tags: [],
    };
    reg.register(server);
    expect(reg.listByCategory('filesystem').length).toBe(1);
  });

  test('should list by source', () => {
    const server: MCPServerDefinition = {
      id: 's2', name: 'pre', version: '1.0.0', description: 'pre',
      tools: [], permissions: ['T1'], source: 'pre-installed', verified: true, downloads: 0, rating: 0, tags: [],
    };
    reg.register(server);
    expect(reg.listBySource('pre-installed').length).toBe(1);
  });

  test('should get versions and count', () => {
    expect(reg.count()).toBe(0);
  });
});

describe('PermissionManager additional', () => {
  test('should check bulk permissions', () => {
    const pm = new PermissionManager();
    const tools: MCPToolDefinition[] = [
      { name: 'read', description: 'r', inputSchema: {}, permissionTier: 'T1', category: 'fs' },
      { name: 'write', description: 'w', inputSchema: {}, permissionTier: 'T2', category: 'fs' },
    ];
    const checks = pm.checkBulk(tools, 'user');
    expect(checks.length).toBe(2);
  });
});

describe('MarketplaceCatalog additional', () => {
  test('should list by category and source', () => {
    const catalog = new MarketplaceCatalog();
    catalog.addPackage(makePackage('pkg1', { category: 'db', source: 'official' }));
    expect(catalog.listByCategory('db').length).toBe(1);
    expect(catalog.listBySource('official').length).toBe(1);
  });

  test('should get categories', () => {
    const catalog = new MarketplaceCatalog();
    catalog.addPackage(makePackage('pkg1', { category: 'db' }));
    expect(catalog.getCategories()).toContain('db');
  });
});
