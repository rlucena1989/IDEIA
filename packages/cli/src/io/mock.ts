import type { Shell, ShellResult, FileSystem, HttpClient, IOContainer } from './interfaces';
import path from 'node:path';

/** Classe responsável por processa shell. */
export class MockShell implements Shell {
  private results: Map<string, ShellResult> = new Map();
  private defaultResult: ShellResult = { status: 0, stdout: '', stderr: '' };

  _reset(): void { this.results.clear(); this.defaultResult = { status: 0, stdout: '', stderr: '' }; }
  _setDefault(result: ShellResult): void { this.defaultResult = result; }
  _addResult(command: string, args: string[], result: ShellResult): void {
    this.results.set(command + ' ' + args.join(' '), result);
  }

  exec(command: string, args: string[], _cwd?: string, _timeout?: number): ShellResult {
    const key = command + ' ' + args.join(' ');
    return this.results.get(key) || this.defaultResult;
  }

  execString(command: string, _cwd?: string): { stdout: string; status: number } {
    const result = this.results.get(command) || this.defaultResult;
    return { stdout: result.stdout, status: result.status };
  }
}

/** Classe responsável por processa file system. */
export class MockFileSystem implements FileSystem {
  private files: Map<string, string | Buffer> = new Map();
  private dirs: Set<string> = new Set();

  _reset(): void { this.files.clear(); this.dirs.clear(); }
  _addFile(filePath: string, content: string = ''): void {
    this.files.set(path.resolve(filePath), content);
    this._ensureParentDirs(filePath);
  }
  _addDir(dirPath: string): void { this.dirs.add(path.resolve(dirPath)); }
  _getFiles(): string[] { return Array.from(this.files.keys()); }

  private _ensureParentDirs(filePath: string): void {
    const dir = path.dirname(path.resolve(filePath));
    this.dirs.add(dir);
    const parent = path.dirname(dir);
    if (parent !== dir) this._ensureParentDirs(dir);
  }

  exists(filePath: string): boolean {
    const resolved = path.resolve(filePath);
    return this.files.has(resolved) || this.dirs.has(resolved);
  }
  read(filePath: string, _encoding?: string): string {
    const resolved = path.resolve(filePath);
    const content = this.files.get(resolved);
    if (content === undefined) throw Object.assign(new Error(`ENOENT: ${resolved}`), { code: 'ENOENT' });
    return typeof content === 'string' ? content : content.toString();
  }
  readBuffer(filePath: string): Buffer {
    const resolved = path.resolve(filePath);
    const content = this.files.get(resolved);
    if (content === undefined) throw Object.assign(new Error(`ENOENT: ${resolved}`), { code: 'ENOENT' });
    return typeof content === 'string' ? Buffer.from(content) : content;
  }
  write(filePath: string, content: string): void {
    this.files.set(path.resolve(filePath), content);
    this._ensureParentDirs(filePath);
  }
  append(filePath: string, content: string): void {
    const resolved = path.resolve(filePath);
    const existing = this.files.get(resolved) || '';
    this.files.set(resolved, existing + content);
  }
  mkDir(dirPath: string, _recursive?: boolean): void {
    this.dirs.add(path.resolve(dirPath));
  }
  readDir(dirPath: string): string[] {
    const resolved = path.resolve(dirPath);
    return Array.from(this.files.keys())
      .filter(f => f.startsWith(resolved + path.sep))
      .map(f => f.slice(resolved.length + 1))
      .filter(f => !f.includes(path.sep));
  }
  readDirEntries(dirPath: string): { name: string; isDirectory: () => boolean; isFile: () => boolean }[] {
    const resolved = path.resolve(dirPath);
    const entries = new Map<string, boolean>();
    for (const f of this.files.keys()) {
      if (f.startsWith(resolved + path.sep)) {
        const rel = f.slice(resolved.length + 1);
        const name = rel.split(path.sep)[0];
        if (name) entries.set(name, false);
      }
    }
    for (const d of this.dirs) {
      if (d.startsWith(resolved + path.sep)) {
        const rel = d.slice(resolved.length + 1);
        const name = rel.split(path.sep)[0];
        if (name && !entries.has(name)) entries.set(name, true);
      }
    }
    return Array.from(entries.entries()).map(([name, isDir]) => ({
      name, isDirectory: () => isDir, isFile: () => !isDir,
    }));
  }
  stat(filePath: string): { mtimeMs: number; size: number; isDirectory: () => boolean } {
    const resolved = path.resolve(filePath);
    const content = this.files.get(resolved);
    return { mtimeMs: Date.now(), size: content instanceof Buffer ? content.length : (content || '').length, isDirectory: () => this.dirs.has(resolved) };
  }
  remove(filePath: string, _opts?: { recursive?: boolean; force?: boolean }): void {
    const resolved = path.resolve(filePath);
    this.files.delete(resolved);
    this.dirs.delete(resolved);
  }
  copy(src: string, dest: string): void {
    const resolved = path.resolve(dest);
    const content = this.files.get(path.resolve(src));
    if (content !== undefined) this.files.set(resolved, content);
  }
  ensureDir(dirPath: string): void { this.dirs.add(path.resolve(dirPath)); }
  cwd(): string { return process.cwd(); }
}

/** Classe responsável por processa http client. */
export class MockHttpClient implements HttpClient {
  private results: Map<string, { status: number; data: string }> = new Map();
  private defaultResult = { status: 200, data: '{}' };

  _reset(): void { this.results.clear(); }
  _addResult(url: string, result: { status: number; data: string }): void { this.results.set(url, result); }

  async post(url: string, _body: unknown, _headers?: Record<string, string>, _timeout?: number): Promise<{ status: number; data: string }> {
    return this.results.get(url) || this.defaultResult;
  }
  async get(url: string, _timeout?: number): Promise<{ status: number; data: string }> {
    return this.results.get(url) || this.defaultResult;
  }
}

/** Classe responsável por processa i o container. */
export class MockIOContainer implements IOContainer {
  shell: MockShell = new MockShell();
  fs: MockFileSystem = new MockFileSystem();
  http: MockHttpClient = new MockHttpClient();

  _reset(): void { this.shell._reset(); this.fs._reset(); this.http._reset(); }

  setupProject(name: string = 'test-project'): void {
    const root = process.cwd();
    this.fs._addDir(root);
    this.fs._addFile(root + path.sep + 'package.json', JSON.stringify({ name, version: '1.0.0' }));
    this.fs._addFile(root + path.sep + 'tsconfig.json', '{}');
    this.fs._addDir(root + path.sep + '.ai');
    this.fs._addFile(root + path.sep + '.ai' + path.sep + 'laws.yaml', 'rules: []');
    this.fs._addFile(root + path.sep + '.ai' + path.sep + 'project-manifest.yaml', 'project: { name: "test" }');
    this.fs._addFile(root + path.sep + 'README.md', '# Test');
    this.fs._addFile(root + path.sep + '.gitignore', 'node_modules');
    this.shell._setDefault({ status: 0, stdout: 'mocked', stderr: '' });
  }
}
