import { describe, it, expect, beforeEach } from '@jest/globals';
import { DefaultWorkspaceDataService, DefaultScopedStorageService } from '../src/workspace-data';
import { WorkspaceData } from '../src/types';

describe('DefaultWorkspaceDataService', () => {
  let service: DefaultWorkspaceDataService;

  beforeEach(() => {
    service = new DefaultWorkspaceDataService();
  });

  describe('constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(DefaultWorkspaceDataService);
    });
  });

  describe('parseWorkspaceFile', () => {
    it('should parse valid JSON', () => {
      const content = JSON.stringify({ folders: [{ path: '/test', name: 'test' }] });
      const data = service.parseWorkspaceFile(content);
      expect(data).toBeDefined();
      expect(data.folders).toHaveLength(1);
      expect(data.folders[0].path).toBe('/test');
    });

    it('should return empty folders on invalid JSON', () => {
      const data = service.parseWorkspaceFile('invalid json');
      expect(data).toEqual({ folders: [] });
    });

    it('should return empty folders on empty string', () => {
      const data = service.parseWorkspaceFile('');
      expect(data).toEqual({ folders: [] });
    });
  });

  describe('serializeWorkspaceData', () => {
    it('should serialize workspace data', () => {
      const data: WorkspaceData = {
        folders: [{ path: '/test', name: 'test' }],
        settings: { test: true },
      };
      const serialized = service.serializeWorkspaceData(data);
      expect(typeof serialized).toBe('string');
      expect(serialized).toContain('/test');
    });

    it('should format JSON with indentation', () => {
      const data: WorkspaceData = { folders: [] };
      const serialized = service.serializeWorkspaceData(data);
      expect(serialized).toContain('  ');
    });
  });
});

describe('DefaultScopedStorageService', () => {
  let service: DefaultScopedStorageService;

  beforeEach(() => {
    service = new DefaultScopedStorageService();
  });

  describe('constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(DefaultScopedStorageService);
    });
  });

  describe('getGlobal', () => {
    it('should return undefined for non-existent key', () => {
      const value = service.getGlobal('non-existent');
      expect(value).toBeUndefined();
    });

    it('should return stored value', () => {
      service.setGlobal('test-key', 'test-value');
      const value = service.getGlobal('test-key');
      expect(value).toBe('test-value');
    });
  });

  describe('setGlobal', () => {
    it('should store value', () => {
      service.setGlobal('test-key', 'test-value');
      const value = service.getGlobal('test-key');
      expect(value).toBe('test-value');
    });

    it('should overwrite existing value', () => {
      service.setGlobal('test-key', 'value-1');
      service.setGlobal('test-key', 'value-2');
      const value = service.getGlobal('test-key');
      expect(value).toBe('value-2');
    });
  });

  describe('getWorkspace', () => {
    it('should return undefined for non-existent key', () => {
      const value = service.getWorkspace('non-existent');
      expect(value).toBeUndefined();
    });

    it('should return stored value', () => {
      service.setWorkspace('test-key', 'test-value');
      const value = service.getWorkspace('test-key');
      expect(value).toBe('test-value');
    });
  });

  describe('setWorkspace', () => {
    it('should store value', () => {
      service.setWorkspace('test-key', 'test-value');
      const value = service.getWorkspace('test-key');
      expect(value).toBe('test-value');
    });
  });

  describe('getFolder', () => {
    it('should return undefined for non-existent key', () => {
      const value = service.getFolder('non-existent');
      expect(value).toBeUndefined();
    });

    it('should return stored value', () => {
      service.setFolder('test-key', 'test-value');
      const value = service.getFolder('test-key');
      expect(value).toBe('test-value');
    });
  });

  describe('setFolder', () => {
    it('should store value', () => {
      service.setFolder('test-key', 'test-value');
      const value = service.getFolder('test-key');
      expect(value).toBe('test-value');
    });
  });
});
