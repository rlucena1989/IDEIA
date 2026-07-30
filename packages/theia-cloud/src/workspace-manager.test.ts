import { WorkspaceManager } from './workspace-manager';
import type { WorkspaceConfig } from './types-remote';

describe('WorkspaceManager', () => {
  let manager: WorkspaceManager;

  beforeEach(() => {
    manager = new WorkspaceManager();
  });

  const testConfig: WorkspaceConfig = {
    name: 'test-workspace',
    image: 'theia:latest',
    ports: [3000, 8080],
    env: { NODE_ENV: 'development' },
    resources: { cpu: 2, memory: 4, storage: 20 },
    timeout: 60000,
    autoHibernate: false,
  };

  it('createWorkspace creates with correct initial state', () => {
    const ws = manager.createWorkspace(testConfig);
    expect(ws.id).toBeDefined();
    expect(ws.config.name).toBe('test-workspace');
    expect(ws.config.image).toBe('theia:latest');
    expect(ws.config.resources.cpu).toBe(2);
    expect(ws.config.resources.memory).toBe(4);
    expect(ws.config.resources.storage).toBe(20);
    expect(ws.createdAt).toBeDefined();
    expect(ws.lastActivity).toBeDefined();
  });

  it('createWorkspace transitions to ready', () => {
    const ws = manager.createWorkspace(testConfig);
    expect(ws.status).toBe('ready');
  });

  it('getWorkspace returns correct instance', () => {
    const ws = manager.createWorkspace(testConfig);
    const retrieved = manager.getWorkspace(ws.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(ws.id);
    expect(retrieved?.config.name).toBe('test-workspace');
  });

  it('getWorkspace returns undefined for unknown id', () => {
    const result = manager.getWorkspace('unknown');
    expect(result).toBeUndefined();
  });

  it('listWorkspaces returns all workspaces', () => {
    manager.createWorkspace(testConfig);
    manager.createWorkspace({ ...testConfig, name: 'ws2' });
    const all = manager.listWorkspaces();
    expect(all.length).toBe(2);
  });

  it('listWorkspaces filters by status', () => {
    manager.createWorkspace(testConfig);
    manager.createWorkspace({ ...testConfig, name: 'ws2' });
    const active = manager.listWorkspaces({ status: 'ready' });
    expect(active.length).toBe(2);
    const hibernating = manager.listWorkspaces({ status: 'hibernating' });
    expect(hibernating.length).toBe(0);
  });

  it('hibernateWorkspace changes status to hibernating', () => {
    const ws = manager.createWorkspace(testConfig);
    const result = manager.hibernateWorkspace(ws.id);
    expect(result).toBe(true);
    const retrieved = manager.getWorkspace(ws.id);
    expect(retrieved?.status).toBe('hibernating');
  });

  it('hibernateWorkspace returns false for unknown id', () => {
    const result = manager.hibernateWorkspace('unknown');
    expect(result).toBe(false);
  });

  it('wakeWorkspace changes status to active', () => {
    const ws = manager.createWorkspace(testConfig);
    manager.hibernateWorkspace(ws.id);
    const result = manager.wakeWorkspace(ws.id);
    expect(result).toBe(true);
    const retrieved = manager.getWorkspace(ws.id);
    expect(retrieved?.status).toBe('active');
  });

  it('wakeWorkspace returns false for unknown id', () => {
    const result = manager.wakeWorkspace('unknown');
    expect(result).toBe(false);
  });

  it('destroyWorkspace removes workspace', () => {
    const ws = manager.createWorkspace(testConfig);
    const result = manager.destroyWorkspace(ws.id);
    expect(result).toBe(true);
    expect(manager.getWorkspace(ws.id)).toBeUndefined();
  });

  it('destroyWorkspace returns false for unknown id', () => {
    const result = manager.destroyWorkspace('unknown');
    expect(result).toBe(false);
  });
});
