import { describe, it, expect } from '@jest/globals';
import path from 'node:path';
import { MockShell, MockFileSystem, MockHttpClient, MockIOContainer } from '../mock';

describe('MockShell', () => {
  it('should return default result', () => {
    const shell = new MockShell();
    const result = shell.exec('echo', ['hello']);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('should return configured result for specific command', () => {
    const shell = new MockShell();
    shell._addResult('git', ['status'], { status: 0, stdout: 'clean', stderr: '' });
    const result = shell.exec('git', ['status']);
    expect(result.stdout).toBe('clean');
  });

  it('should return default result for unmatched command', () => {
    const shell = new MockShell();
    shell._addResult('git', ['status'], { status: 0, stdout: 'clean', stderr: '' });
    const result = shell.exec('echo', ['hello']);
    expect(result.stdout).toBe('');
  });

  it('_setDefault should change default result', () => {
    const shell = new MockShell();
    shell._setDefault({ status: 1, stdout: 'error', stderr: 'err' });
    expect(shell.exec('any', ['cmd']).status).toBe(1);
  });

  it('execString should work with default result', () => {
    const shell = new MockShell();
    shell._setDefault({ status: 0, stdout: 'default output', stderr: '' });
    const result = shell.execString('any command');
    expect(result.stdout).toBe('default output');
  });

  it('_reset should clear all results', () => {
    const shell = new MockShell();
    shell._addResult('git', ['status'], { status: 0, stdout: 'clean', stderr: '' });
    shell._reset();
    expect(shell.exec('git', ['status']).stdout).toBe('');
  });
});

describe('MockFileSystem', () => {
  it('should read written file', () => {
    const fs = new MockFileSystem();
    fs.write('/tmp/test.txt', 'hello');
    expect(fs.read('/tmp/test.txt')).toBe('hello');
  });

  it('should throw ENOENT for missing file', () => {
    const fs = new MockFileSystem();
    expect(() => fs.read('/nonexistent.txt')).toThrow();
  });

  it('exists should return true for existing files', () => {
    const fs = new MockFileSystem();
    fs._addFile('/tmp/test.txt', 'content');
    expect(fs.exists('/tmp/test.txt')).toBe(true);
  });

  it('exists should return false for non-existent files', () => {
    const fs = new MockFileSystem();
    expect(fs.exists('/nonexistent.txt')).toBe(false);
  });

  it('exists should return true for directories', () => {
    const fs = new MockFileSystem();
    fs._addDir('/tmp/mydir');
    expect(fs.exists('/tmp/mydir')).toBe(true);
  });

  it('append should add to existing content', () => {
    const fs = new MockFileSystem();
    fs.write('/tmp/log.txt', 'line1\n');
    fs.append('/tmp/log.txt', 'line2\n');
    expect(fs.read('/tmp/log.txt')).toBe('line1\nline2\n');
  });

  it('readBuffer should return Buffer', () => {
    const fs = new MockFileSystem();
    fs._addFile('/tmp/data.bin', 'binary');
    const buf = fs.readBuffer('/tmp/data.bin');
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it('mkDir should create directory', () => {
    const fs = new MockFileSystem();
    fs.mkDir('/tmp/newdir');
    expect(fs.exists('/tmp/newdir')).toBe(true);
  });

  it('readDir should list direct children files', () => {
    const fs = new MockFileSystem();
    fs._addFile('/tmp/a/file1.txt', '');
    fs._addFile('/tmp/a/file2.txt', '');
    fs._addFile('/tmp/a/sub/file3.txt', '');
    const files = fs.readDir('/tmp/a');
    expect(files).toContain('file1.txt');
    expect(files).toContain('file2.txt');
    expect(files).not.toContain('file3.txt');
  });

  it('readDirEntries should return entries with type info', () => {
    const fs = new MockFileSystem();
    fs._addFile('/root/file.ts', '');
    fs._addDir('/root/subdir');
    const entries = fs.readDirEntries('/root');
    const fileEntry = entries.find(e => e.name === 'file.ts');
    const dirEntry = entries.find(e => e.name === 'subdir');
    expect(fileEntry?.isFile()).toBe(true);
    expect(dirEntry?.isDirectory()).toBe(true);
  });

  it('remove should delete file', () => {
    const fs = new MockFileSystem();
    fs._addFile('/tmp/temp.txt', 'content');
    fs.remove('/tmp/temp.txt');
    expect(fs.exists('/tmp/temp.txt')).toBe(false);
  });

  it('copy should duplicate file content', () => {
    const fs = new MockFileSystem();
    fs._addFile('/src/file.txt', 'source content');
    fs.copy('/src/file.txt', '/dest/file.txt');
    expect(fs.read('/dest/file.txt')).toBe('source content');
  });

  it('stat should return metadata', () => {
    const fs = new MockFileSystem();
    fs._addFile('/tmp/data.txt', 'hello');
    const stats = fs.stat('/tmp/data.txt');
    expect(stats.size).toBe(5);
    expect(stats.mtimeMs).toBeGreaterThan(0);
    expect(stats.isDirectory()).toBe(false);
  });

  it('ensureDir should add directory', () => {
    const fs = new MockFileSystem();
    fs.ensureDir('/some/deep/path');
    expect(fs.exists('/some/deep/path')).toBe(true);
  });

  it('cwd should return current working directory', () => {
    const fs = new MockFileSystem();
    expect(fs.cwd()).toBe(process.cwd());
  });

  it('_getFiles should list all tracked files', () => {
    const fs = new MockFileSystem();
    fs._addFile('/a.txt', '');
    fs._addFile('/b.txt', '');
    expect(fs._getFiles().length).toBeGreaterThanOrEqual(2);
  });

  it('_reset should clear all files', () => {
    const fs = new MockFileSystem();
    fs._addFile('/tmp/file.txt', '');
    fs._reset();
    expect(fs.exists('/tmp/file.txt')).toBe(false);
  });
});

describe('MockHttpClient', () => {
  it('should return default 200 response', async () => {
    const http = new MockHttpClient();
    const result = await http.get('http://test.com');
    expect(result.status).toBe(200);
    expect(result.data).toBe('{}');
  });

  it('should return configured response', async () => {
    const http = new MockHttpClient();
    http._addResult('http://api.com/data', { status: 200, data: '{"key": "value"}' });
    const result = await http.get('http://api.com/data');
    expect(result.data).toBe('{"key": "value"}');
  });

  it('should support post requests', async () => {
    const http = new MockHttpClient();
    http._addResult('http://api.com/submit', { status: 201, data: '{"id": 1}' });
    const result = await http.post('http://api.com/submit', { name: 'test' });
    expect(result.status).toBe(201);
  });

  it('_reset should clear configured results', async () => {
    const http = new MockHttpClient();
    http._addResult('http://test.com', { status: 200, data: 'data' });
    http._reset();
    expect((await http.get('http://test.com')).status).toBe(200);
  });
});

describe('MockIOContainer', () => {
  it('should have all three components', () => {
    const io = new MockIOContainer();
    expect(io.shell).toBeInstanceOf(MockShell);
    expect(io.fs).toBeInstanceOf(MockFileSystem);
    expect(io.http).toBeInstanceOf(MockHttpClient);
  });

  it('_reset should reset all components', () => {
    const io = new MockIOContainer();
    io.fs._addFile('/test.txt', 'content');
    io.shell._addResult('cmd', [], { status: 1, stdout: '', stderr: '' });
    io._reset();
    expect(io.fs.exists('/test.txt')).toBe(false);
    expect(io.shell.exec('cmd', []).status).toBe(0);
  });

  it('setupProject should create project structure', () => {
    const io = new MockIOContainer();
    io.setupProject('test-project');
    const root = process.cwd();
    expect(io.fs.exists(path.join(root, 'package.json'))).toBe(true);
    expect(io.fs.exists(path.join(root, '.ai'))).toBe(true);
    expect(io.fs.exists(path.join(root, 'README.md'))).toBe(true);
  });

  it('setupProject should set default shell result', () => {
    const io = new MockIOContainer();
    io.setupProject();
    expect(io.shell.exec('any', ['command']).stdout).toBe('mocked');
  });

  it('setupProject package.json should have correct name', () => {
    const io = new MockIOContainer();
    io.setupProject('my-app');
    const root = process.cwd();
    const pkg = JSON.parse(io.fs.read(path.join(root, 'package.json')));
    expect(pkg.name).toBe('my-app');
  });
});
