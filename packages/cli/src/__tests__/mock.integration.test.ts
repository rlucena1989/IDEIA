import { MockShell, MockFileSystem, MockHttpClient, MockIOContainer } from '../io/mock';

describe('MockShell', () => {
  let shell: MockShell;
  beforeEach(() => { shell = new MockShell(); });

  it('returns default result for unknown command', () => {
    const r = shell.exec('echo', ['hi']);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('returns registered result for matching command', () => {
    shell._addResult('git', ['status'], { status: 0, stdout: 'clean', stderr: '' });
    const r = shell.exec('git', ['status']);
    expect(r.stdout).toBe('clean');
    expect(r.status).toBe(0);
  });

  it('uses default when no registered result matches', () => {
    shell._setDefault({ status: 1, stdout: '', stderr: 'error' });
    const r = shell.exec('git', ['push']);
    expect(r.status).toBe(1);
    expect(r.stderr).toBe('error');
  });

  it('execString returns stdout and status', () => {
    shell._addResult('git', ['status'], { status: 0, stdout: 'clean', stderr: '' });
    const r = shell.execString('git status');
    expect(r.stdout).toBe('clean');
    expect(r.status).toBe(0);
  });

  it('reset clears results', () => {
    shell._addResult('git', ['log'], { status: 0, stdout: 'log', stderr: '' });
    shell._reset();
    const r = shell.exec('git', ['log']);
    expect(r.stdout).toBe('');
  });
});

describe('MockFileSystem', () => {
  let fs: MockFileSystem;
  beforeEach(() => { fs = new MockFileSystem(); });

  it('exists returns false by default', () => {
    expect(fs.exists('/any/file')).toBe(false);
  });

  it('exists returns true after adding file', () => {
    fs.write('/test.txt', 'hello');
    expect(fs.exists('/test.txt')).toBe(true);
  });

  it('read returns written content', () => {
    fs.write('/data.txt', 'test content');
    expect(fs.read('/data.txt', 'utf8')).toBe('test content');
  });

  it('readDir lists files', () => {
    fs.write('/dir/a.txt', 'a');
    fs.write('/dir/b.txt', 'b');
    const files = fs.readDir('/dir');
    expect(files).toContain('a.txt');
    expect(files).toContain('b.txt');
  });

  it('readDirEntries returns directory entries', () => {
    fs.write('/root/sub/file.txt', 'x');
    const entries = fs.readDirEntries('/root');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some(e => e.name === 'sub')).toBe(true);
  });

  it('remove deletes file', () => {
    fs.write('/tmp/test.txt', 'x');
    fs.remove('/tmp/test.txt');
    expect(fs.exists('/tmp/test.txt')).toBe(false);
  });

  it('mkDir creates directory', () => {
    fs.mkDir('/new/dir');
    expect(fs.exists('/new/dir')).toBe(true);
  });

  it('copy duplicates file', () => {
    fs.write('/src.txt', 'data');
    fs.copy('/src.txt', '/dst.txt');
    expect(fs.read('/dst.txt', 'utf8')).toBe('data');
  });

  it('append adds to existing content', () => {
    fs.write('/log.txt', 'line1\n');
    fs.append('/log.txt', 'line2\n');
    expect(fs.read('/log.txt', 'utf8')).toBe('line1\nline2\n');
  });

  it('stat returns file info', () => {
    fs.write('/f.txt', 'data');
    const s = fs.stat('/f.txt');
    expect(s.size).toBeGreaterThan(0);
    expect(typeof s.mtimeMs).toBe('number');
  });
});

describe('MockHttpClient', () => {
  let http: MockHttpClient;
  beforeEach(() => { http = new MockHttpClient(); });

  it('get returns default for unknown URL', async () => {
    const r = await http.get('http://example.com');
    expect(r.status).toBe(200);
    expect(r.data).toBeDefined();
  });

  it('post returns response', async () => {
    const r = await http.post('http://test.com/api', { key: 'val' });
    expect(r.status).toBe(200);
  });

  it('_addResult registers custom response', async () => {
    http._addResult('http://test.com/custom', { status: 404, data: '{}' });
    const r = await http.get('http://test.com/custom');
    expect(r.status).toBe(404);
  });
});

describe('MockFileSystem (advanced)', () => {
  let fs: MockFileSystem;
  beforeEach(() => { fs = new MockFileSystem(); });

  it('_addFile creates file and parent dirs', () => {
    (fs as any)._addFile('/a/b/c.txt', 'content');
    expect(fs.exists('/a/b/c.txt')).toBe(true);
    expect(fs.exists('/a/b')).toBe(true);
  });

  it('_addDir creates directory', () => {
    (fs as any)._addDir('/some/dir');
    expect(fs.exists('/some/dir')).toBe(true);
  });

  it('readBuffer returns Buffer', () => {
    fs.write('/buf.bin', 'binary data');
    const buf = fs.readBuffer('/buf.bin');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString()).toBe('binary data');
  });

  it('readBuffer throws for missing file', () => {
    expect(() => fs.readBuffer('/nope')).toThrow('ENOENT');
  });

  it('ensureDir creates directory', () => {
    fs.ensureDir('/ensured/path');
    expect(fs.exists('/ensured/path')).toBe(true);
  });

  it('cwd returns current working directory', () => {
    const cwd = fs.cwd();
    expect(typeof cwd).toBe('string');
    expect(cwd.length).toBeGreaterThan(0);
  });
});

describe('MockIOContainer', () => {
  it('creates IO container with all components', () => {
    const io = new MockIOContainer();
    expect(io.shell).toBeDefined();
    expect(io.fs).toBeDefined();
    expect(io.http).toBeDefined();
  });

  it('reset clears all mocks', () => {
    const io = new MockIOContainer();
    io.fs.write('/test.txt', 'x');
    io._reset();
    expect(io.fs.exists('/test.txt')).toBe(false);
  });
});
