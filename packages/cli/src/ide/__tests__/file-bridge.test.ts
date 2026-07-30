import { FileBridge, type FsEntry } from '../file-bridge';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'filebridge-test-'));
});

afterEach(async () => {
  await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

describe('FileBridge', () => {
  describe('isPathSafe', () => {
    it('returns true for paths inside workspace', () => {
      const bridge = new FileBridge(tmpDir);
      expect(bridge.isPathSafe('file.txt')).toBe(true);
      expect(bridge.isPathSafe('subdir/file.js')).toBe(true);
    });

    it('returns false for paths outside workspace', () => {
      const bridge = new FileBridge(tmpDir);
      expect(bridge.isPathSafe('../outside.txt')).toBe(false);
      expect(bridge.isPathSafe('/etc/passwd')).toBe(false);
    });

    it('returns false for deeply nested traversal', () => {
      const bridge = new FileBridge(tmpDir);
      expect(bridge.isPathSafe('subdir/../../outside.txt')).toBe(false);
    });
  });

  describe('setRoot', () => {
    it('updates root path', () => {
      const bridge = new FileBridge(tmpDir);
      const newRoot = path.join(tmpDir, 'new-root');
      fs.mkdirSync(newRoot);
      bridge.setRoot(newRoot);
      expect(bridge.isPathSafe('file.txt')).toBe(true);
      expect(bridge.isPathSafe('../outside.txt')).toBe(false);
    });
  });

  describe('listDir', () => {
    it('returns sorted entries with dirs first', async () => {
      await fsp.mkdir(path.join(tmpDir, 'adir'));
      await fsp.writeFile(path.join(tmpDir, 'bfile.txt'), 'hello');
      await fsp.writeFile(path.join(tmpDir, 'afile.txt'), 'world');

      const bridge = new FileBridge(tmpDir);
      const entries = await bridge.listDir('');

      expect(entries).toHaveLength(3);
      expect(entries[0].type).toBe('dir');
      expect(entries[0].name).toBe('adir');
      expect(entries[1].name).toBe('afile.txt');
      expect(entries[2].name).toBe('bfile.txt');
    });

    it('returns FsEntry shape for each entry', async () => {
      await fsp.writeFile(path.join(tmpDir, 'test.txt'), 'data');

      const bridge = new FileBridge(tmpDir);
      const entries = await bridge.listDir('');

      expect(entries[0]).toMatchObject({
        name: 'test.txt',
        path: 'test.txt',
        type: 'file',
        size: 4,
      });
      expect(typeof entries[0].modifiedAt).toBe('string');
    });

    it('throws for paths outside workspace', async () => {
      const bridge = new FileBridge(tmpDir);
      await expect(bridge.listDir('../outside')).rejects.toThrow('Path outside workspace');
    });

    it('ignores files inside node_modules and .git directories', async () => {
      await fsp.mkdir(path.join(tmpDir, 'node_modules'));
      await fsp.writeFile(path.join(tmpDir, 'node_modules', 'pkg.js'), '');
      await fsp.writeFile(path.join(tmpDir, '.gitignore'), '');
      await fsp.writeFile(path.join(tmpDir, 'valid.js'), '');

      const bridge = new FileBridge(tmpDir);
      const entries = await bridge.listDir('');

      const names = entries.map(e => e.name);
      expect(names).toContain('node_modules');
      expect(names).toContain('valid.js');
      expect(names).toContain('.gitignore');
    });
  });

  describe('readFile', () => {
    it('reads text file content', async () => {
      await fsp.writeFile(path.join(tmpDir, 'hello.txt'), 'Hello World');

      const bridge = new FileBridge(tmpDir);
      const result = await bridge.readFile('hello.txt');

      expect(result.content).toBe('Hello World');
      expect(result.binary).toBe(false);
    });

    it('returns placeholder for binary extensions', async () => {
      await fsp.writeFile(path.join(tmpDir, 'image.png'), Buffer.alloc(10));

      const bridge = new FileBridge(tmpDir);
      const result = await bridge.readFile('image.png');

      expect(result.content).toContain('[binary file: image.png]');
      expect(result.binary).toBe(true);
    });

    it('throws for paths outside workspace', async () => {
      const bridge = new FileBridge(tmpDir);
      await expect(bridge.readFile('../secret.txt')).rejects.toThrow('Path outside workspace');
    });
  });

  describe('writeFile', () => {
    it('writes content to file, creating intermediate dirs', async () => {
      const bridge = new FileBridge(tmpDir);
      await bridge.writeFile('nested/deep/file.txt', 'content');

      const content = await fsp.readFile(path.join(tmpDir, 'nested', 'deep', 'file.txt'), 'utf8');
      expect(content).toBe('content');
    });

    it('throws for paths outside workspace', async () => {
      const bridge = new FileBridge(tmpDir);
      await expect(bridge.writeFile('../bad.txt', 'x')).rejects.toThrow('Path outside workspace');
    });

    it('emits change event on write', async () => {
      const bridge = new FileBridge(tmpDir);
      const changeHandler = jest.fn();
      bridge.on('change', changeHandler);
      await bridge.writeFile('written.txt', 'data');

      expect(changeHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'modify', path: 'written.txt' }),
      );
    });
  });

  describe('createFile', () => {
    it('creates a new empty file', async () => {
      const bridge = new FileBridge(tmpDir);
      await bridge.createFile('newfile.txt');

      const stat = await fsp.stat(path.join(tmpDir, 'newfile.txt'));
      expect(stat.isFile()).toBe(true);
    });

    it('throws for paths outside workspace', async () => {
      const bridge = new FileBridge(tmpDir);
      await expect(bridge.createFile('../bad.txt')).rejects.toThrow('Path outside workspace');
    });

    it('throws if file already exists', async () => {
      await fsp.writeFile(path.join(tmpDir, 'exists.txt'), '');
      const bridge = new FileBridge(tmpDir);
      await expect(bridge.createFile('exists.txt')).rejects.toThrow('File already exists');
    });

    it('emits change event', async () => {
      const bridge = new FileBridge(tmpDir);
      const handler = jest.fn();
      bridge.on('change', handler);
      await bridge.createFile('brandnew.txt');

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'create', path: 'brandnew.txt' }));
    });
  });

  describe('createDir', () => {
    it('creates a directory', async () => {
      const bridge = new FileBridge(tmpDir);
      await bridge.createDir('newdir');

      const stat = await fsp.stat(path.join(tmpDir, 'newdir'));
      expect(stat.isDirectory()).toBe(true);
    });

    it('creates nested directories recursively', async () => {
      const bridge = new FileBridge(tmpDir);
      await bridge.createDir('a/b/c');

      const stat = await fsp.stat(path.join(tmpDir, 'a', 'b', 'c'));
      expect(stat.isDirectory()).toBe(true);
    });

    it('throws for paths outside workspace', async () => {
      const bridge = new FileBridge(tmpDir);
      await expect(bridge.createDir('../bad')).rejects.toThrow('Path outside workspace');
    });
  });

  describe('rename', () => {
    it('renames a file', async () => {
      await fsp.writeFile(path.join(tmpDir, 'old.txt'), 'content');

      const bridge = new FileBridge(tmpDir);
      await bridge.rename('old.txt', 'new.txt');

      expect(fs.existsSync(path.join(tmpDir, 'old.txt'))).toBe(false);
      const content = await fsp.readFile(path.join(tmpDir, 'new.txt'), 'utf8');
      expect(content).toBe('content');
    });

    it('creates intermediate directory for target', async () => {
      await fsp.writeFile(path.join(tmpDir, 'source.txt'), 'data');

      const bridge = new FileBridge(tmpDir);
      await bridge.rename('source.txt', 'subdir/target.txt');

      expect(fs.existsSync(path.join(tmpDir, 'subdir', 'target.txt'))).toBe(true);
    });

    it('throws if source or target is outside workspace', async () => {
      const bridge = new FileBridge(tmpDir);
      await expect(bridge.rename('../bad.txt', 'ok.txt')).rejects.toThrow('Path outside workspace');
      await expect(bridge.rename('ok.txt', '../bad.txt')).rejects.toThrow('Path outside workspace');
    });

    it('emits delete and create events', async () => {
      await fsp.writeFile(path.join(tmpDir, 'old.txt'), 'x');
      const bridge = new FileBridge(tmpDir);
      const handler = jest.fn();
      bridge.on('change', handler);
      await bridge.rename('old.txt', 'new.txt');

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'delete', path: 'old.txt' }));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'create', path: 'new.txt' }));
    });
  });

  describe('delete', () => {
    it('deletes a file', async () => {
      await fsp.writeFile(path.join(tmpDir, 'todelete.txt'), 'bye');

      const bridge = new FileBridge(tmpDir);
      await bridge.delete('todelete.txt');

      expect(fs.existsSync(path.join(tmpDir, 'todelete.txt'))).toBe(false);
    });

    it('deletes a directory recursively', async () => {
      await fsp.mkdir(path.join(tmpDir, 'todir'), { recursive: true });
      await fsp.writeFile(path.join(tmpDir, 'todir', 'file.txt'), 'x');

      const bridge = new FileBridge(tmpDir);
      await bridge.delete('todir');

      expect(fs.existsSync(path.join(tmpDir, 'todir'))).toBe(false);
    });

    it('throws for paths outside workspace', async () => {
      const bridge = new FileBridge(tmpDir);
      await expect(bridge.delete('../bad')).rejects.toThrow('Path outside workspace');
    });

    it('emits change event', async () => {
      await fsp.writeFile(path.join(tmpDir, 'bye.txt'), 'x');
      const bridge = new FileBridge(tmpDir);
      const handler = jest.fn();
      bridge.on('change', handler);
      await bridge.delete('bye.txt');

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'delete', path: 'bye.txt' }));
    });
  });

  describe('searchFiles', () => {
    it('finds files matching pattern case-insensitively', async () => {
      await fsp.writeFile(path.join(tmpDir, 'hello.js'), '');
      await fsp.writeFile(path.join(tmpDir, 'HELLO.ts'), '');
      await fsp.writeFile(path.join(tmpDir, 'world.js'), '');

      const bridge = new FileBridge(tmpDir);
      const results = await bridge.searchFiles('hello');

      expect(results).toHaveLength(2);
      expect(results).toContain('hello.js');
      expect(results).toContain('HELLO.ts');
    });

    it('ignores node_modules paths', async () => {
      await fsp.mkdir(path.join(tmpDir, 'node_modules'), { recursive: true });
      await fsp.writeFile(path.join(tmpDir, 'node_modules', 'index.js'), '');

      const bridge = new FileBridge(tmpDir);
      const results = await bridge.searchFiles('index');

      expect(results).toHaveLength(0);
    });
  });
});
