import { existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { MCPMarketplace, createMarketplace } from '../src/marketplace';
import type { MarketplaceServerEntry } from '../src/marketplace';

const TEST_DIR = join(process.cwd(), '.ai-test-mcp');

function makeDirs(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function cleanDir(dir: string): void {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

beforeEach(() => { makeDirs(TEST_DIR); });
afterEach(() => { cleanDir(TEST_DIR); });

describe('MCPMarketplace', () => {
  it('can be created with defaults', () => {
    const m = createMarketplace();
    expect(m).toBeInstanceOf(MCPMarketplace);
  });

  it('can be created with custom config', () => {
    const m = createMarketplace({ registryUrl: 'https://custom.registry', storageDir: TEST_DIR });
    expect(m).toBeInstanceOf(MCPMarketplace);
  });

  it('starts with no installed servers', () => {
    const m = createMarketplace({ registryUrl: 'https://test.registry', storageDir: TEST_DIR });
    expect(m.getInstalledServers()).toHaveLength(0);
  });

  it('isInstalled returns false for unknown server', () => {
    const m = createMarketplace({ registryUrl: 'https://test.registry', storageDir: TEST_DIR });
    expect(m.isInstalled('nonexistent')).toBe(false);
  });

  it('discover returns empty array when registry unreachable', async () => {
    const m = createMarketplace({ registryUrl: 'https://invalid.local/mcp', storageDir: TEST_DIR });
    const servers = await m.discover();
    expect(Array.isArray(servers)).toBe(true);
  });

  it('install throws when server not found in registry', async () => {
    const m = createMarketplace({ registryUrl: 'https://invalid.local/mcp', storageDir: TEST_DIR });
    await expect(m.install('nonexistent-server')).rejects.toThrow();
  });

  it('uninstall does not throw when server not installed', () => {
    const m = createMarketplace({ registryUrl: 'https://test.registry', storageDir: TEST_DIR });
    expect(m.uninstall('nonexistent')).toBe(false);
  });

  it('publish returns ok with url', async () => {
    const m = createMarketplace({ registryUrl: 'https://test.registry', storageDir: TEST_DIR });
    const server = { name: 'test', version: '1.0', tools: [], resources: [], prompts: [] };
    const result = await m.publish(server);
    expect(result.ok).toBe(true);
    expect(result.url).toContain('test');
  });

  it('getTools returns empty array initially', () => {
    const m = createMarketplace({ registryUrl: 'https://test.registry', storageDir: TEST_DIR });
    expect(m.getTools()).toHaveLength(0);
  });

  it('callTool returns error for unknown tool', async () => {
    const m = createMarketplace({ registryUrl: 'https://test.registry', storageDir: TEST_DIR });
    const result = await m.callTool('nonexistent', {});
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('persists installed servers to disk and restores them', () => {
    const registryUrl = 'https://test.registry';
    const dir = join(TEST_DIR, 'restore-test');
    makeDirs(dir);

    const m1 = createMarketplace({ registryUrl, storageDir: dir }) as any;
    const entry: MarketplaceServerEntry = {
      name: 'persisted-server', version: '1.0', description: 'Persisted',
      registryUrl, tools: [], installedAt: new Date().toISOString(),
    };
    m1.installed.set('persisted-server', entry);
    m1.saveInstalled();

    const m2 = createMarketplace({ registryUrl, storageDir: dir });
    expect(m2.isInstalled('persisted-server')).toBe(true);
  });
});
