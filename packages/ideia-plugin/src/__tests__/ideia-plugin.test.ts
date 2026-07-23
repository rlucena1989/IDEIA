import * as fs from 'fs';
import * as path from 'path';

const PKG_PATH = path.resolve(__dirname, '../../package.json');
const SRC_DIR = path.resolve(__dirname, '..');

describe('ideia-plugin package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));

  it('has theiaExtensions field', () => {
    expect(pkg.theiaExtensions).toBeDefined();
    expect(Array.isArray(pkg.theiaExtensions)).toBe(true);
    expect(pkg.theiaExtensions.length).toBeGreaterThan(0);
  });

  it('theiaExtensions points to existing frontend module', () => {
    const fe = pkg.theiaExtensions[0]?.frontend;
    expect(fe).toBeDefined();
    const resolved = path.resolve(path.dirname(PKG_PATH), fe.replace('lib/', 'src/')) + '.ts';
    expect(fs.existsSync(resolved)).toBe(true);
  });

  it('theiaExtensions points to existing backend module', () => {
    const be = pkg.theiaExtensions[0]?.backend;
    expect(be).toBeDefined();
    const resolved = path.resolve(path.dirname(PKG_PATH), be.replace('lib/', 'src/')) + '.ts';
    expect(fs.existsSync(resolved)).toBe(true);
  });
});

describe('source file existence', () => {
  it('frontend module exists', () => {
    expect(fs.existsSync(path.join(SRC_DIR, 'browser/ideia-frontend-module.ts'))).toBe(true);
  });

  it('backend module exists', () => {
    expect(fs.existsSync(path.join(SRC_DIR, 'node/ideia-backend-module.ts'))).toBe(true);
  });

  it('common types exist', () => {
    expect(fs.existsSync(path.join(SRC_DIR, 'common/ideia-types.ts'))).toBe(true);
  });

  it('common protocol exists', () => {
    expect(fs.existsSync(path.join(SRC_DIR, 'common/ideia-protocol.ts'))).toBe(true);
  });

  it('all widget files exist', () => {
    const widgets = [
      'ideia-chat-widget.tsx', 'ideia-approval-widget.tsx', 'ideia-dashboard-widget.tsx',
      'ideia-diff-widget.tsx', 'ideia-file-widget.tsx', 'ideia-studies-widget.tsx',
      'ideia-suggestions-widget.tsx', 'ideia-security-widget.tsx', 'ideia-search-overlay.tsx',
    ];
    for (const w of widgets) {
      expect(fs.existsSync(path.join(SRC_DIR, 'browser', w))).toBe(true);
    }
  });

  it('all backend service files exist', () => {
    const services = [
      'ideia-chat-service.ts', 'ideia-task-service.ts', 'ideia-agent-service.ts',
      'ideia-memory-service.ts', 'ideia-dashboard-service.ts', 'ideia-suggestions-service.ts',
      'ideia-studies-service.ts', 'ideia-search-service.ts', 'ideia-security-service.ts',
    ];
    for (const s of services) {
      expect(fs.existsSync(path.join(SRC_DIR, 'node', s))).toBe(true);
    }
  });
});

describe('ideia-protocol constants', () => {
  it('exports all service paths', () => {
    const protocol = require('../common/ideia-protocol');
    const expectedPaths = [
      'IDEIA_CHAT_PATH', 'IDEIA_TASK_PATH', 'IDEIA_AGENT_PATH',
      'IDEIA_MEMORY_PATH', 'IDEIA_DASHBOARD_PATH', 'IDEIA_SUGGESTIONS_PATH',
      'IDEIA_STUDIES_PATH', 'IDEIA_SEARCH_PATH', 'IDEIA_SECURITY_PATH',
    ];
    for (const p of expectedPaths) {
      expect(protocol).toHaveProperty(p);
      expect(typeof protocol[p]).toBe('string');
      expect(protocol[p]).toMatch(/^\/services\//);
    }
  });

  it('exports all service symbols', () => {
    const protocol = require('../common/ideia-protocol');
    const expectedSymbols = [
      'IDEIA_CHAT_SERVICE', 'IDEIA_TASK_SERVICE', 'IDEIA_AGENT_SERVICE',
      'IDEIA_MEMORY_SERVICE', 'IDEIA_DASHBOARD_SERVICE', 'IDEIA_SUGGESTIONS_SERVICE',
      'IDEIA_STUDIES_SERVICE', 'IDEIA_SEARCH_SERVICE', 'IDEIA_SECURITY_SERVICE',
    ];
    for (const s of expectedSymbols) {
      expect(protocol).toHaveProperty(s);
      expect(typeof protocol[s]).toBe('symbol');
    }
  });
});

describe('ideia-types utilities', () => {
  it('createSSEEvent creates valid events', () => {
    const { createSSEEvent } = require('../common/ideia-types');
    const event = createSSEEvent('message', { text: 'hello' });
    expect(event).toBeDefined();
    expect(event.type).toBe('message');
    expect(event.data).toEqual({ text: 'hello' });
    expect(event.id).toBeDefined();
    expect(typeof event.id).toBe('string');
    expect(event.id.length).toBeGreaterThan(0);
    expect(event.timestamp).toBeDefined();
    expect(() => new Date(event.timestamp)).not.toThrow();
  });

  it('createSSEEvent accepts custom id', () => {
    const { createSSEEvent } = require('../common/ideia-types');
    const event = createSSEEvent('error', new Error('test'), 'custom-123');
    expect(event.id).toBe('custom-123');
    expect(event.type).toBe('error');
  });

  it('createSSEEvent supports all event types', () => {
    const { createSSEEvent } = require('../common/ideia-types');
    const types = ['message', 'tool_call', 'checkpoint', 'error', 'done', 'progress', 'heartbeat'] as const;
    for (const t of types) {
      const event = createSSEEvent(t, null);
      expect(event.type).toBe(t);
    }
  });

  it('createSSEEvent generates unique ids', () => {
    const { createSSEEvent } = require('../common/ideia-types');
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(createSSEEvent('message', null).id);
    }
    expect(ids.size).toBe(100);
  });
});

describe('module structure', () => {
  it('frontend module file imports ContainerModule', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'browser/ideia-frontend-module.ts'), 'utf-8');
    expect(content).toContain('ContainerModule');
    expect(content).toContain("from '@theia/core/shared/inversify'");
    expect(content).toContain('export default new ContainerModule(');
  });

  it('backend module file imports ContainerModule', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'node/ideia-backend-module.ts'), 'utf-8');
    expect(content).toContain('ContainerModule');
    expect(content).toContain("from '@theia/core/shared/inversify'");
    expect(content).toContain('export default new ContainerModule(');
  });

  it('frontend module references all widgets', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'browser/ideia-frontend-module.ts'), 'utf-8');
    const expectedWidgets = ['Chat', 'Diff', 'Approval', 'Dashboard', 'File', 'Studies', 'Suggestions', 'Security'];
    for (const w of expectedWidgets) {
      expect(content).toContain(`IDEIA_${w}Widget`);
    }
  });

  it('backend module references all services', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'node/ideia-backend-module.ts'), 'utf-8');
    const expectedServices = ['Chat', 'Agent', 'Memory', 'Dashboard', 'Suggestions', 'Studies', 'Search', 'Security'];
    for (const s of expectedServices) {
      expect(content).toContain(`IDEIA_${s}BackendService`);
    }
  });
});
