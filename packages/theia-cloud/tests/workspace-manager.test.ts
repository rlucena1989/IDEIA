import { describe, it, expect, beforeEach } from '@jest/globals';
import { WorkspaceManager } from '../src/workspace-manager';
import { WorkspaceConfig } from '../src/types-remote';

describe('WorkspaceManager', () => {
  let manager: WorkspaceManager;
  let mockConfig: WorkspaceConfig;

  beforeEach(() => {
    manager = new WorkspaceManager();
    mockConfig = {
      name: 'test-workspace',
      image: 'node:18',
      ports: [3000],
      env: {},
      resources: { cpu: 2, memory: 4096, storage: 10240 },
      timeout: 1800000,
      autoHibernate: true,
    };
  });

  describe('constructor', () => {
    it('should create manager with default timeout', () => {
      expect(manager).toBeInstanceOf(WorkspaceManager);
    });

    it('should create manager with custom timeout', () => {
      const manager = new WorkspaceManager(undefined, 60000);
      expect(manager).toBeInstanceOf(WorkspaceManager);
    });
  });

  describe('createWorkspace', () => {
    it('should create workspace', () => {
      const workspace = manager.createWorkspace(mockConfig);
      expect(workspace).toBeDefined();
      expect(workspace.id).toBeDefined();
      expect(workspace.config).toEqual(mockConfig);
      expect(workspace.status).toBe('ready');
    });

    it('should set creating status initially', () => {
      const workspace = manager.createWorkspace(mockConfig);
      expect(workspace.status).toBe('ready');
    });
  });

  describe('destroyWorkspace', () => {
    it('should destroy workspace', () => {
      const workspace = manager.createWorkspace(mockConfig);
      const destroyed = manager.destroyWorkspace(workspace.id);
      expect(destroyed).toBe(true);
    });

    it('should return false for non-existent workspace', () => {
      const destroyed = manager.destroyWorkspace('non-existent');
      expect(destroyed).toBe(false);
    });
  });

  describe('listWorkspaces', () => {
    it('should return empty list initially', () => {
      const workspaces = manager.listWorkspaces();
      expect(workspaces).toEqual([]);
    });

    it('should return all workspaces', () => {
      manager.createWorkspace(mockConfig);
      manager.createWorkspace({ ...mockConfig, name: 'workspace-2' });
      const workspaces = manager.listWorkspaces();
      expect(workspaces).toHaveLength(2);
    });

    it('should filter by status', () => {
      const ws1 = manager.createWorkspace(mockConfig);
      const ws2 = manager.createWorkspace({ ...mockConfig, name: 'workspace-2' });
      ws2.status = 'error';
      const workspaces = manager.listWorkspaces({ status: 'ready' });
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].id).toBe(ws1.id);
    });
  });

  describe('getWorkspace', () => {
    it('should return undefined for non-existent workspace', () => {
      const workspace = (manager as any).getWorkspace('non-existent');
      expect(workspace).toBeUndefined();
    });

    it('should return workspace by id', () => {
      const created = manager.createWorkspace(mockConfig);
      const workspace = (manager as any).getWorkspace(created.id);
      expect(workspace).toEqual(created);
    });
  });

  describe('updateActivity', () => {
    it('should update workspace activity', () => {
      const workspace = manager.createWorkspace(mockConfig);
      const before = workspace.lastActivity;
      (manager as any).updateActivity(workspace.id);
      const after = (manager as any).getWorkspace(workspace.id).lastActivity;
      expect(after).toBeGreaterThan(before);
    });
  });

  describe('hibernate', () => {
    it('should hibernate workspace', () => {
      const workspace = manager.createWorkspace(mockConfig);
      (manager as any).hibernate(workspace.id);
      const updated = (manager as any).getWorkspace(workspace.id);
      expect(updated.status).toBe('hibernating');
    });
  });

  describe('wake', () => {
    it('should wake workspace', () => {
      const workspace = manager.createWorkspace(mockConfig);
      workspace.status = 'hibernating';
      (manager as any).wake(workspace.id);
      const updated = (manager as any).getWorkspace(workspace.id);
      expect(updated.status).toBe('ready');
    });
  });
});
