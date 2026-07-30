import { DefaultWorkspaceDataService, DefaultScopedStorageService } from '../workspace-data';
import { WorkspaceData } from '../types';

describe('DefaultWorkspaceDataService', () => {
  const service = new DefaultWorkspaceDataService();

  describe('parseWorkspaceFile', () => {
    it('should parse valid JSON workspace data', () => {
      const content = JSON.stringify({
        folders: [{ path: '/root', name: 'Root' }],
        settings: { theme: 'dark' },
        extensions: { recommended: ['ext1'] },
      });
      const result = service.parseWorkspaceFile(content);
      expect(result.folders).toHaveLength(1);
      expect(result.folders[0].path).toBe('/root');
      expect(result.folders[0].name).toBe('Root');
      expect(result.settings).toEqual({ theme: 'dark' });
      expect(result.extensions).toEqual({ recommended: ['ext1'] });
    });

    it('should return empty folders on parse error', () => {
      const result = service.parseWorkspaceFile('not-json');
      expect(result.folders).toEqual([]);
    });

    it('should return empty folders on invalid JSON', () => {
      const result = service.parseWorkspaceFile('{broken');
      expect(result.folders).toEqual([]);
    });

    it('should handle empty workspace', () => {
      const content = JSON.stringify({ folders: [] });
      const result = service.parseWorkspaceFile(content);
      expect(result.folders).toEqual([]);
    });

    it('should handle folder without name', () => {
      const content = JSON.stringify({ folders: [{ path: '/naked' }] });
      const result = service.parseWorkspaceFile(content);
      expect(result.folders[0].name).toBeUndefined();
    });
  });

  describe('serializeWorkspaceData', () => {
    it('should serialize workspace data to formatted JSON', () => {
      const data: WorkspaceData = {
        folders: [{ path: '/proj', name: 'Project' }],
      };
      const result = service.serializeWorkspaceData(data);
      const parsed = JSON.parse(result);
      expect(parsed.folders[0].path).toBe('/proj');
    });

    it('should preserve all fields', () => {
      const data: WorkspaceData = {
        folders: [{ path: '/a', name: 'A' }, { path: '/b' }],
        settings: { key: 'val' },
        extensions: { ids: ['e1'] },
      };
      const json = service.serializeWorkspaceData(data);
      const parsed = JSON.parse(json);
      expect(parsed.folders).toHaveLength(2);
      expect(parsed.settings.key).toBe('val');
      expect(parsed.extensions.ids).toEqual(['e1']);
    });

    it('should produce pretty-printed JSON', () => {
      const data: WorkspaceData = { folders: [{ path: '/x' }] };
      const result = service.serializeWorkspaceData(data);
      expect(result).toContain('\n  ');
    });
  });
});

describe('DefaultScopedStorageService', () => {
  const storage = new DefaultScopedStorageService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('global storage', () => {
    it('should store and retrieve global values', () => {
      storage.setGlobal('key1', 'value1');
      expect(storage.getGlobal('key1')).toBe('value1');
    });

    it('should return undefined for missing key', () => {
      expect(storage.getGlobal('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing key', () => {
      storage.setGlobal('key2', 'old');
      storage.setGlobal('key2', 'new');
      expect(storage.getGlobal('key2')).toBe('new');
    });
  });

  describe('workspace storage', () => {
    it('should store and retrieve workspace values', () => {
      storage.setWorkspace('wsKey', { nested: true });
      expect(storage.getWorkspace('wsKey')).toEqual({ nested: true });
    });

    it('should return undefined for missing key', () => {
      expect(storage.getWorkspace('missing')).toBeUndefined();
    });
  });

  describe('folder storage', () => {
    it('should store and retrieve folder values', () => {
      storage.setFolder('folderKey', 42);
      expect(storage.getFolder('folderKey')).toBe(42);
    });

    it('should return undefined for missing key', () => {
      expect(storage.getFolder('missing')).toBeUndefined();
    });
  });

  it('should keep scopes isolated', () => {
    storage.setGlobal('shared', 'global-val');
    storage.setWorkspace('shared', 'workspace-val');
    storage.setFolder('shared', 'folder-val');
    expect(storage.getGlobal('shared')).toBe('global-val');
    expect(storage.getWorkspace('shared')).toBe('workspace-val');
    expect(storage.getFolder('shared')).toBe('folder-val');
  });
});
