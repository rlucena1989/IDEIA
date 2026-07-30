import { DefaultResourceProvider, DefaultFileService } from '../resource-file-service';
import { DefaultPathService } from '../uri-path';
import type { FileSystemProviderRegistry } from '@ideia/filesystem';

const mockStat = jest.fn();
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockDelete = jest.fn();
const mockRename = jest.fn();
const mockCopy = jest.fn();
const mockCreateDirectory = jest.fn();
const mockReadDirectory = jest.fn();
const mockWatch = jest.fn();

const mockProvider = {
  scheme: 'file',
  capabilities: {
    supportsFileReadWrite: true,
    supportsDirectoryRead: true,
    supportsCreateDelete: true,
    supportsRenameCopy: true,
    supportsWatching: true,
    supportsStreaming: false,
  },
  stat: mockStat,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  delete: mockDelete,
  rename: mockRename,
  copy: mockCopy,
  createDirectory: mockCreateDirectory,
  readDirectory: mockReadDirectory,
  watch: mockWatch,
};

const mockResolveProvider = jest.fn().mockReturnValue(mockProvider);
const mockRegistry = {
  register: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  resolveProvider: mockResolveProvider,
};

function fakeStat(overrides: Partial<{ uri: string; size: number; mtime: number; isDirectory: boolean; isSymbolicLink: boolean }> = {}) {
  return {
    uri: overrides.uri ?? 'file:///test.txt',
    type: 1,
    size: overrides.size ?? 100,
    mtime: overrides.mtime ?? Date.now(),
    ctime: Date.now(),
    isDirectory: overrides.isDirectory ?? false,
    isSymbolicLink: overrides.isSymbolicLink ?? false,
  };
}

describe('DefaultResourceProvider', () => {
  let provider: DefaultResourceProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new DefaultResourceProvider(mockRegistry as unknown as FileSystemProviderRegistry);
  });

  it('should read file content via provider', async () => {
    const content = new Uint8Array([104, 101, 108, 108, 111]);
    mockReadFile.mockResolvedValue(content);
    const result = await provider.read('file:///test.txt');
    expect(mockResolveProvider).toHaveBeenCalledWith('file:///test.txt');
    expect(mockReadFile).toHaveBeenCalledWith('file:///test.txt');
    expect(result).toBe(content);
  });

  it('should write file content via provider', async () => {
    const content = new Uint8Array([119, 111, 114, 108, 100]);
    mockWriteFile.mockResolvedValue(undefined);
    await provider.write('file:///out.txt', content);
    expect(mockWriteFile).toHaveBeenCalledWith('file:///out.txt', content);
  });

  it('should stat a resource', async () => {
    mockStat.mockResolvedValue(fakeStat({ uri: 'file:///test.txt', size: 200 }));
    const stat = await provider.stat('file:///test.txt');
    expect(stat.uri).toBe('file:///test.txt');
    expect(stat.size).toBe(200);
    expect(stat.isFile).toBe(true);
    expect(stat.isDirectory).toBe(false);
    expect(stat.mtime).toBeInstanceOf(Date);
  });

  it('should return isFile=false for directories', async () => {
    mockStat.mockResolvedValue(fakeStat({ isDirectory: true }));
    const stat = await provider.stat('file:///dir');
    expect(stat.isDirectory).toBe(true);
    expect(stat.isFile).toBe(false);
  });

  it('should watch a resource', () => {
    const disposable = { dispose: jest.fn() };
    mockWatch.mockReturnValue(disposable);
    const result = provider.watch('file:///watch-me');
    expect(result).toBe(disposable);
    expect(mockWatch).toHaveBeenCalledWith('file:///watch-me');
  });
});

describe('DefaultFileService', () => {
  let service: DefaultFileService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DefaultFileService(mockRegistry as unknown as FileSystemProviderRegistry, new DefaultPathService());
  });

  it('should read file', async () => {
    const content = new Uint8Array([1, 2, 3]);
    mockReadFile.mockResolvedValue(content);
    const result = await service.read('file:///read.txt');
    expect(result).toEqual(content);
  });

  it('should write file and fire change event', async () => {
    const content = new Uint8Array([4, 5, 6]);
    mockWriteFile.mockResolvedValue(undefined);
    const listener = jest.fn();
    service.onFileChanged(listener);
    await service.write('file:///write.txt', content);
    expect(listener).toHaveBeenCalledWith({ uri: 'file:///write.txt', type: 'updated' });
  });

  it('should delete file and fire change event', async () => {
    mockDelete.mockResolvedValue(undefined);
    const listener = jest.fn();
    service.onFileChanged(listener);
    await service.delete('file:///delete.txt');
    expect(listener).toHaveBeenCalledWith({ uri: 'file:///delete.txt', type: 'deleted' });
  });

  it('should delete with recursive option', async () => {
    mockDelete.mockResolvedValue(undefined);
    await service.delete('file:///dir', { recursive: true });
    expect(mockDelete).toHaveBeenCalledWith('file:///dir', { recursive: true });
  });

  it('should rename file and fire events', async () => {
    mockRename.mockResolvedValue(undefined);
    const listener = jest.fn();
    service.onFileChanged(listener);
    await service.rename('file:///old.txt', 'file:///new.txt');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith({ uri: 'file:///old.txt', type: 'deleted' });
    expect(listener).toHaveBeenCalledWith({ uri: 'file:///new.txt', type: 'created' });
  });

  it('should copy file and fire event', async () => {
    mockCopy.mockResolvedValue(undefined);
    const listener = jest.fn();
    service.onFileChanged(listener);
    await service.copy('file:///src.txt', 'file:///dst.txt');
    expect(listener).toHaveBeenCalledWith({ uri: 'file:///dst.txt', type: 'created' });
  });

  it('should create directory', async () => {
    mockCreateDirectory.mockResolvedValue(undefined);
    await service.createDirectory('file:///newdir');
    expect(mockCreateDirectory).toHaveBeenCalledWith('file:///newdir');
  });

  it('should stat a resource', async () => {
    mockStat.mockResolvedValue(fakeStat({ uri: 'file:///stat.txt', size: 42 }));
    const stat = await service.stat('file:///stat.txt');
    expect(stat.size).toBe(42);
    expect(stat.isFile).toBe(true);
  });

  it('should read directory', async () => {
    mockReadDirectory.mockResolvedValue([
      ['file.ts', 1],
      ['dir', 2],
    ]);
    const entries = await service.readDirectory('file:///');
    expect(entries).toEqual([['file.ts', false], ['dir', true]]);
  });

  describe('exists', () => {
    it('should return true when stat succeeds', async () => {
      mockStat.mockResolvedValue(fakeStat());
      const result = await service.exists('file:///exists.txt');
      expect(result).toBe(true);
    });

    it('should return false when stat throws', async () => {
      mockStat.mockRejectedValue(new Error('Not found'));
      const result = await service.exists('file:///missing.txt');
      expect(result).toBe(false);
    });
  });

  it('should watch a resource', () => {
    const disposable = { dispose: jest.fn() };
    mockWatch.mockReturnValue(disposable);
    const result = service.watch('file:///watch', { recursive: true, excludes: ['*.tmp'] });
    expect(result).toBe(disposable);
    expect(mockWatch).toHaveBeenCalledWith('file:///watch', { recursive: true, excludes: ['*.tmp'] });
  });
});
