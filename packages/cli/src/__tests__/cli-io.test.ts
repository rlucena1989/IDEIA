import { describe, it, expect } from '@jest/globals';
import { MockShell, MockFileSystem, MockHttpClient, MockIOContainer } from '../io/mock';

describe('MockShell', () => {
  let shell: MockShell;

  beforeEach(() => { shell = new MockShell(); });

  it('deve retornar resultado default', () => {
    const r = shell.exec('ls', ['-la']);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('deve retornar resultado registrado por comando', () => {
    shell._addResult('git', ['status'], { status: 1, stdout: '', stderr: 'error' });
    const r = shell.exec('git', ['status']);
    expect(r.status).toBe(1);
    expect(r.stderr).toBe('error');
  });

  it('deve usar default quando comando nao registrado', () => {
    shell._setDefault({ status: 42, stdout: 'default', stderr: '' });
    const r = shell.exec('unknown', ['cmd']);
    expect(r.status).toBe(42);
    expect(r.stdout).toBe('default');
  });

  it('execString deve retornar resultado default', () => {
    shell._setDefault({ status: 42, stdout: 'default', stderr: '' });
    const r = shell.execString('node --version');
    expect(r.stdout).toBe('default');
    expect(r.status).toBe(42);
  });

  it('_reset deve limpar resultados', () => {
    shell._addResult('git', ['status'], { status: 0, stdout: '', stderr: '' });
    shell._reset();
    const r = shell.exec('git', ['status']);
    expect(r.stdout).toBe('');
  });
});

describe('MockFileSystem', () => {
  let fs: MockFileSystem;

  beforeEach(() => { fs = new MockFileSystem(); });

  it('exists deve retornar true para arquivo adicionado', () => {
    fs._addFile('/test/file.txt', 'content');
    expect(fs.exists('/test/file.txt')).toBe(true);
  });

  it('exists deve retornar false para arquivo inexistente', () => {
    expect(fs.exists('/nonexistent.txt')).toBe(false);
  });

  it('read deve retornar conteudo do arquivo', () => {
    fs._addFile('/test/file.txt', 'hello');
    expect(fs.read('/test/file.txt')).toBe('hello');
  });

  it('read deve lancar erro para arquivo nao encontrado', () => {
    expect(() => fs.read('/missing.txt')).toThrow('ENOENT');
  });

  it('write deve criar e sobrescrever arquivo', () => {
    fs.write('/test/file.txt', 'original');
    fs.write('/test/file.txt', 'updated');
    expect(fs.read('/test/file.txt')).toBe('updated');
  });

  it('append deve adicionar ao final', () => {
    fs.write('/test/file.txt', 'base');
    fs.append('/test/file.txt', '+extra');
    expect(fs.read('/test/file.txt')).toBe('base+extra');
  });

  it('readBuffer deve retornar Buffer', () => {
    fs._addFile('/test/data.bin', 'binary');
    const buf = fs.readBuffer('/test/data.bin');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString()).toBe('binary');
  });

  it('exists deve retornar true para diretorio', () => {
    fs._addDir('/mydir');
    expect(fs.exists('/mydir')).toBe(true);
  });

  it('readDir deve listar arquivos no diretorio', () => {
    fs._addFile('/dir/a.txt');
    fs._addFile('/dir/b.txt');
    const entries = fs.readDir('/dir');
    expect(entries).toContain('a.txt');
    expect(entries).toContain('b.txt');
  });

  it('readDirEntries deve incluir diretorios', () => {
    fs._addDir('/root/subdir');
    fs._addFile('/root/file.txt');
    const entries = fs.readDirEntries('/root');
    expect(entries.find(e => e.name === 'file.txt')?.isDirectory()).toBe(false);
    expect(entries.find(e => e.name === 'subdir')?.isDirectory()).toBe(true);
  });

  it('remove deve deletar arquivo', () => {
    fs._addFile('/tmp/test.txt');
    fs.remove('/tmp/test.txt');
    expect(fs.exists('/tmp/test.txt')).toBe(false);
  });

  it('copy deve duplicar conteudo', () => {
    fs._addFile('/src/file.txt', 'data');
    fs.copy('/src/file.txt', '/dst/file.txt');
    expect(fs.read('/dst/file.txt')).toBe('data');
  });

  it('ensureDir deve criar diretorio', () => {
    fs.ensureDir('/new/dir');
    expect(fs.exists('/new/dir')).toBe(true);
  });

  it('cwd deve retornar diretorio atual', () => {
    expect(fs.cwd()).toBe(process.cwd());
  });

  it('_getFiles deve retornar nomes de arquivos', () => {
    fs._addFile('/a/1.txt');
    fs._addFile('/a/2.txt');
    const files = fs._getFiles();
    expect(files.length).toBe(2);
  });

  it('stat deve retornar metadados', () => {
    fs._addFile('/test/stat.txt');
    const s = fs.stat('/test/stat.txt');
    expect(s.mtimeMs).toBeGreaterThan(0);
    expect(s.isDirectory()).toBe(false);
  });
});

describe('MockHttpClient', () => {
  let http: MockHttpClient;

  beforeEach(() => { http = new MockHttpClient(); });

  it('post deve retornar resultado default', async () => {
    const r = await http.post('http://example.com/api', {});
    expect(r.status).toBe(200);
  });

  it('get deve retornar resultado registrado', async () => {
    http._addResult('http://api.test/data', { status: 404, data: 'not found' });
    const r = await http.get('http://api.test/data');
    expect(r.status).toBe(404);
  });

  it('_reset deve limpar resultados', async () => {
    http._addResult('http://api.test', { status: 500, data: 'err' });
    http._reset();
    const r = await http.post('http://api.test', {});
    expect(r.status).toBe(200);
  });
});

describe('MockIOContainer', () => {
  let io: MockIOContainer;

  beforeEach(() => { io = new MockIOContainer(); });

  it('deve ter shell, fs e http', () => {
    expect(io.shell).toBeDefined();
    expect(io.fs).toBeDefined();
    expect(io.http).toBeDefined();
  });

  it('_reset deve limpar todos os mocks', () => {
    io.fs._addFile('/tmp/x.txt');
    io.shell._addResult('cmd', [], { status: 1, stdout: '', stderr: '' });
    io.http._addResult('url', { status: 500, data: '' });
    io._reset();
    expect(io.fs.exists('/tmp/x.txt')).toBe(false);
    expect(io.http._reset).toBeDefined();
  });

  it('setupProject deve criar estrutura de projeto', () => {
    io.setupProject('meu-projeto');
    expect(io.fs.exists('package.json')).toBe(true);
    expect(io.fs.exists('.ai/laws.yaml')).toBe(true);
  });
});
