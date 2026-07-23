import { RealShell, RealFileSystem, RealHttpClient } from '../real';

jest.mock('https', () => ({
  request: jest.fn(),
}), { virtual: true });

const mockSpawnSync = jest.fn();
jest.mock('node:child_process', () => ({ spawnSync: (...args: unknown[]) => mockSpawnSync(...args) }));

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'real-'));
  mockSpawnSync.mockReset();
});
afterEach(() => { try { if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

describe('RealShell', () => {
  const shell = new RealShell();

  it('exec returns stdout on success', () => {
    mockSpawnSync.mockReturnValue({ status: 0, stdout: 'hello world', stderr: '' });
    const result = shell.exec('echo', ['hello']);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('hello world');
  });

  it('exec returns stderr on failure', () => {
    mockSpawnSync.mockReturnValue({ status: 1, stdout: '', stderr: 'error message' });
    const result = shell.exec('false', []);
    expect(result.status).toBe(1);
    expect(result.stderr).toBe('error message');
  });

  it('exec handles exception', () => {
    mockSpawnSync.mockImplementation(() => { throw new Error('ENOENT'); });
    const result = shell.exec('nonexistent', []);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('ENOENT');
  });

  it('execString returns stdout', () => {
    mockSpawnSync.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
    const result = shell.execString('echo ok');
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('ok');
  });

  it('execString handles errors', () => {
    mockSpawnSync.mockReturnValue({ status: 1, stdout: '', stderr: 'fail' });
    const r = shell.execString('false');
    expect(r.status).toBe(1);
  });

  it('execString handles exception', () => {
    mockSpawnSync.mockImplementation(() => { throw new Error('ENOENT'); });
    const r = shell.execString('nonexistent');
    expect(r.status).toBe(1);
  });
});

describe('RealFileSystem', () => {
  const fsys = new RealFileSystem();

  it('exists returns true for existing file', () => {
    const f = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(f, 'hello');
    expect(fsys.exists(f)).toBe(true);
  });

  it('exists returns false for non-existing file', () => {
    expect(fsys.exists(path.join(tmpDir, 'nonexistent'))).toBe(false);
  });

  it('read and write work', () => {
    const f = path.join(tmpDir, 'data.txt');
    fsys.write(f, 'test content');
    expect(fsys.read(f, 'utf8')).toBe('test content');
  });

  it('readDir lists files', () => {
    fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'a');
    fs.writeFileSync(path.join(tmpDir, 'b.txt'), 'b');
    const files = fsys.readDir(tmpDir);
    expect(files).toContain('a.txt');
    expect(files).toContain('b.txt');
  });

  it('mkDir creates directory', () => {
    const d = path.join(tmpDir, 'newdir');
    fsys.mkDir(d);
    expect(fs.existsSync(d)).toBe(true);
  });

  it('remove deletes file', () => {
    const f = path.join(tmpDir, 'delete-me.txt');
    fs.writeFileSync(f, 'bye');
    fsys.remove(f);
    expect(fs.existsSync(f)).toBe(false);
  });

  it('readDirEntries returns files with metadata', () => {
    fs.writeFileSync(path.join(tmpDir, 'myfile.txt'), 'data');
    const entries = fsys.readDirEntries(tmpDir);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some(e => e.name === 'myfile.txt' && e.isFile() && !e.isDirectory())).toBe(true);
  });

  it('stat returns file stats', () => {
    const f = path.join(tmpDir, 'stats.txt');
    fs.writeFileSync(f, 'data');
    const s = fsys.stat(f);
    expect(s.size).toBe(4);
    expect(typeof s.mtimeMs).toBe('number');
    expect(s.isDirectory()).toBe(false);
  });

  it('exists works', () => {
    const f = path.join(tmpDir, 'exists-test.txt');
    fs.writeFileSync(f, 'test');
    expect(fsys.exists(f)).toBe(true);
    expect(fsys.exists(path.join(tmpDir, 'nope'))).toBe(false);
  });

  it('readBuffer returns Buffer', () => {
    const f = path.join(tmpDir, 'buffer.bin');
    fs.writeFileSync(f, 'buffer content');
    const buf = fsys.readBuffer(f);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString()).toBe('buffer content');
  });

  it('append adds to file', () => {
    const f = path.join(tmpDir, 'append.txt');
    fsys.write(f, 'line1\n');
    fsys.append(f, 'line2\n');
    expect(fsys.read(f, 'utf8')).toBe('line1\nline2\n');
  });

  it('ensureDir creates directory', () => {
    const d = path.join(tmpDir, 'ensured', 'nested', 'dir');
    fsys.ensureDir(d);
    expect(fs.existsSync(d)).toBe(true);
  });

  it('cwd returns working directory', () => {
    expect(fsys.cwd()).toBe(process.cwd());
  });

  it('copy duplicates file', () => {
    const src = path.join(tmpDir, 'src.txt');
    const dst = path.join(tmpDir, 'dst.txt');
    fs.writeFileSync(src, 'copy content');
    fsys.copy(src, dst);
    expect(fs.readFileSync(dst, 'utf8')).toBe('copy content');
  });
});

describe('RealHttpClient', () => {
  let httpClient: RealHttpClient;
  beforeEach(() => { httpClient = new RealHttpClient(); });

  it('get returns response', async () => {
    const mockReq = { on: jest.fn((e: string, cb: () => void) => { if (e === 'error') cb(); }), end: jest.fn() };
    const mockRes = { on: jest.fn((e: string, cb: (d: Buffer) => void) => { if (e === 'data') cb(Buffer.from('ok')); if (e === 'end') cb({} as Buffer); }), statusCode: 200 };
    const https = await import('https');
    (https.request as jest.Mock).mockImplementation((_url: string, _opts: unknown, cb: (r: typeof mockRes) => void) => { cb(mockRes); return mockReq; });
    const result = await httpClient.get('https://example.com/api');
    expect(result.status).toBe(200);
    expect(result.data).toBe('ok');
  });

  it('post returns response', async () => {
    const mockReq = { on: jest.fn(), write: jest.fn(), end: jest.fn() };
    const mockRes = { on: jest.fn(), statusCode: 201 };
    const https = await import('https');
    (https.request as jest.Mock).mockImplementation((_url: string, _opts: unknown, cb: (r: typeof mockRes) => void) => {
      cb(mockRes);
      const calls = mockRes.on.mock.calls as Array<[string, (...args: unknown[]) => void]>;
      calls.forEach((c) => { if (c[0] === 'data') c[1]('{}'); if (c[0] === 'end') c[1](); });
      return mockReq;
    });
    const result = await httpClient.post('https://example.com/api', { key: 'val' });
    expect(result.status).toBe(201);
  });
});
