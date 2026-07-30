import { describe, it, expect } from '@jest/globals';
import type { ShellResult, Shell, FileSystem, HttpClient, IOContainer } from '../interfaces';

describe('interfaces', () => {
  it('ShellResult should be constructible', () => {
    const result: ShellResult = { status: 0, stdout: 'output', stderr: '' };
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('output');
  });

  it('ShellResult should support non-zero status', () => {
    const result: ShellResult = { status: 1, stdout: '', stderr: 'error' };
    expect(result.status).toBe(1);
  });

  it('Shell interface should be well-shaped', () => {
    const shell: Shell = {
      exec: () => ({ status: 0, stdout: '', stderr: '' }),
      execString: () => ({ stdout: '', status: 0 }),
    };
    expect(shell.exec('test', [])).toHaveProperty('status');
    expect(shell.execString('test')).toHaveProperty('stdout');
  });

  it('FileSystem interface should be well-shaped', () => {
    const fs: FileSystem = {
      exists: () => true,
      read: () => '',
      readBuffer: () => Buffer.from(''),
      write: () => {},
      append: () => {},
      mkDir: () => {},
      readDir: () => [],
      readDirEntries: () => [],
      stat: () => ({ mtimeMs: 0, size: 0, isDirectory: () => false }),
      remove: () => {},
      copy: () => {},
      ensureDir: () => {},
      cwd: () => '',
    };
    expect(fs.exists('/test')).toBe(true);
    expect(fs.stat('/test').size).toBe(0);
    expect(Array.isArray(fs.readDir('/'))).toBe(true);
    expect(Array.isArray(fs.readDirEntries('/'))).toBe(true);
  });

  it('HttpClient interface should be well-shaped', async () => {
    const http: HttpClient = {
      post: async () => ({ status: 200, data: '{}' }),
      get: async () => ({ status: 200, data: '{}' }),
    };
    const postResult = await http.post('http://test.com', {});
    expect(postResult.status).toBe(200);
    const getResult = await http.get('http://test.com');
    expect(getResult.data).toBe('{}');
  });

  it('HttpClient should support error status', async () => {
    const http: HttpClient = {
      post: async () => ({ status: 500, data: 'error' }),
      get: async () => ({ status: 404, data: 'not found' }),
    };
    expect((await http.post('', {})).status).toBe(500);
    expect((await http.get('')).status).toBe(404);
  });

  it('IOContainer should compose all three interfaces', () => {
    const io: IOContainer = {
      shell: { exec: () => ({ status: 0, stdout: '', stderr: '' }), execString: () => ({ stdout: '', status: 0 }) },
      fs: {
        exists: () => true, read: () => '', readBuffer: () => Buffer.from(''),
        write: () => {}, append: () => {}, mkDir: () => {}, readDir: () => [],
        readDirEntries: () => [], stat: () => ({ mtimeMs: 0, size: 0, isDirectory: () => false }),
        remove: () => {}, copy: () => {}, ensureDir: () => {}, cwd: () => '',
      },
      http: { post: async () => ({ status: 200, data: '' }), get: async () => ({ status: 200, data: '' }) },
    };
    expect(io.shell).toBeDefined();
    expect(io.fs).toBeDefined();
    expect(io.http).toBeDefined();
  });
});
