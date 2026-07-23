# ESTUDO S35 — File System & Workspace Architecture

> **Arquitetura de sistema de arquivos virtual e modelo de workspace para IDEIA**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — VFS, providers, watching, workspace model, search, explorer |

---

## Sumario

1. [Introducao](#1-introducao)
2. [Virtual File System Architecture](#2-virtual-file-system-architecture)
3. [File System Provider Interface](#3-file-system-provider-interface)
4. [File Watching System](#4-file-watching-system)
5. [Workspace Model](#5-workspace-model)
6. [File System Operations Service](#6-file-system-operations-service)
7. [File Explorer / File Tree](#7-file-explorer--file-tree)
8. [Open Editors Model](#8-open-editors-model)
9. [Search System](#9-search-system)
10. [File Association & Language Detection](#10-file-association--language-detection)
11. [Bulk File Operations](#11-bulk-file-operations)
12. [Large File Handling](#12-large-file-handling)
13. [Encoding & Line Endings](#13-encoding--line-endings)
14. [Code Examples](#14-code-examples)
15. [Conexoes](#15-conexoes)
16. [Plano de Implementacao](#16-plano-de-implementacao)

---

## 1. Introducao

O sistema de arquivos e a espinha dorsal de qualquer IDE. Toda operacao — abrir arquivo, salvar, buscar, refatorar, debugar — passa pelo file system. A IDEIA requer uma abstracao de sistema de arquivos virtual (VFS) que permita tratar de forma uniforme arquivos locais, arquivos em memoria, arquivos remotos, arquivos dentro de ZIP, e referencias a git objects.

### 1.1 VFS Abstraction

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           IDEIA VIRTUAL FILE SYSTEM                           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      VFS Interface (FileSystemProvider)              │    │
│  │  stat | readFile | writeFile | readDirectory | createDirectory       │    │
│  │  delete | rename | watch | access | copy | move                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│         ┌──────────┬──────────────┼──────────────┬──────────────┐           │
│         ▼          ▼              ▼              ▼              ▼           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐     │
│  │ DiskFS   │ │ MemoryFS │ │ ZipFS    │ │ RemoteFS │ │ GitFS        │     │
│  │ (local)  │ │ (tmp)    │ │ (archive)│ │ (ssh/s3) │ │ (por commit) │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Workspace Model Evolution

| Geracao | Descricao | Exemplo |
|---------|-----------|---------|
| 1G | Pasta unica | `code .` abre diretorio como workspace |
| 2G | Multi-root workspace | Arquivo `.code-workspace` referencia varias pastas |
| 3G | Workspace virtual | VFS providers permitem workspace com repositorios remotos, arquivos em memoria |
| 4G | Workspace contextual | Workspace adaptativo baseado em tarefa — agentes determinam escopo |

A IDEIA implementa a geracao 3G desde o inicio, com suporte a multi-root nativo e providers virtuais.

---

## 2. Virtual File System Architecture

### 2.1 URI Scheme System

Cada provider e registrado com um scheme de URI. O VFS roteia operacoes para o provider correto baseado no scheme.

| Scheme | Provider | Exemplo URI |
|--------|----------|-------------|
| `file` | DiskFS | `file:///home/user/project/src/index.ts` |
| `inmemory` | MemoryFS | `inmemory:///tmp/build-output/bundle.js` |
| `zip` | ZipFS | `zip:///path/to/archive.zip/path/inside/file.ts` |
| `vscode` | VSCodeFS (built-in resources) | `vscode:///settings.json` |
| `git` | GitFS | `git:///repo.git/abc1234/src/main.ts` |
| `s3` | RemoteFS (S3) | `s3://bucket-name/path/to/file.ts` |
| `ssh` | RemoteFS (SSH) | `ssh://hostname/path/to/file.ts` |

### 2.2 URI Parsing

```typescript
interface VfsUri {
  scheme: string;       // 'file' | 'inmemory' | 'zip' | 'git' | ...
  authority: string;    // hostname, bucket name, empty for local
  path: string;         // /path/to/file.ts
  query: string;        // ?param=value
  fragment: string;     // #L10 for line references
}

function parseUri(uri: string): VfsUri {
  const match = uri.match(/^([a-z][a-z0-9+.-]*):\/\/([^\/]*)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i);
  if (!match) throw new Error(`Invalid URI: ${uri}`);
  return {
    scheme: match[1],
    authority: match[2],
    path: match[3] || '/',
    query: match[4] || '',
    fragment: match[5] || '',
  };
}

function joinPath(base: string, ...segments: string[]): string {
  const parts = base.replace(/\/$/, '').split('/');
  for (const seg of segments) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}
```

### 2.3 Streaming vs Buffered Operations

| Operacao | Buffered | Streaming | Quando usar |
|----------|----------|-----------|-------------|
| readFile | Buffer completo | ReadableStream | Arquivos < 50MB usam buffered; > 50MB streaming |
| writeFile | Buffer completo | WritableStream | Preferir streaming para uploads/downloads |
| readDirectory | Lista sincrona | AsyncIterable | Diretorios pequenos sync; grandes com iterador |
| watch | N/A | EventEmitter/AsyncIterable | Sempre streaming — eventos chegam continuamente |

```typescript
interface VfsReadOptions {
  streaming?: boolean;
  encoding?: BufferEncoding;
  range?: { start: number; end: number };
}

interface VfsWriteOptions {
  streaming?: boolean;
  encoding?: BufferEncoding;
  createParents?: boolean;
  lock?: boolean;
}
```

### 2.4 File Metadata

```typescript
interface FileMetadata {
  ctime: number;       // creation time (ms epoch)
  mtime: number;       // modification time (ms epoch)
  atime: number;       // access time (ms epoch)
  size: number;        // file size in bytes
  mode: number;        // unix file mode (permissions)
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  permissions: FilePermissions;
}

interface FilePermissions {
  readable: boolean;
  writable: boolean;
  executable: boolean;
}
```

---

## 3. File System Provider Interface

### 3.1 Core Interface

```typescript
export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export interface FileStat {
  type: FileType;
  ctime: number;
  mtime: number;
  size: number;
  permissions?: FilePermissions;
}

export interface FileChange {
  type: FileChangeType;
  uri: string;
}

export enum FileChangeType {
  Created = 1,
  Updated = 2,
  Deleted = 3,
}

export interface FileSystemProvider {
  readonly scheme: string;
  readonly capabilities: FileSystemProviderCapabilities;

  // --- Metadata ---
  stat(uri: string): Promise<FileStat>;
  access(uri: string, mode: number): Promise<boolean>;

  // --- Read ---
  readFile(uri: string, options?: VfsReadOptions): Promise<Uint8Array>;
  readFileStream(uri: string, options?: VfsReadOptions): Promise<ReadableStream<Uint8Array>>;
  readDirectory(uri: string): Promise<[string, FileType][]>;

  // --- Write ---
  writeFile(
    uri: string,
    content: Uint8Array | ReadableStream<Uint8Array>,
    options?: { create?: boolean; overwrite?: boolean; unlock?: boolean }
  ): Promise<void>;
  createDirectory(uri: string): Promise<void>;

  // --- Delete ---
  delete(uri: string, options?: { recursive?: boolean; useTrash?: boolean }): Promise<void>;

  // --- Rename / Copy ---
  rename(oldUri: string, newUri: string, options?: { overwrite?: boolean }): Promise<void>;
  copy(source: string, destination: string, options?: { overwrite?: boolean }): Promise<void>;

  // --- Watching ---
  watch(
    resource: string,
    options?: { recursive?: boolean; excludes?: string[] }
  ): Disposable & { onDidChange: Event<FileChange[]> };

  // --- Symlinks ---
  readlink(uri: string): Promise<string>;
  symlink(target: string, linkPath: string): Promise<void>;
}

export interface FileSystemProviderCapabilities {
  reading: boolean;
  writing: boolean;
  watching: boolean;
  streaming: boolean;
  trash: boolean;
  symlinks: boolean;
  atomicWrite: boolean;
  fileLocks: boolean;
}

export type Event<T> = (listener: (e: T) => void) => Disposable;

export interface Disposable {
  dispose(): void;
}
```

### 3.2 Recursive Operations

```typescript
export async function copyRecursive(
  provider: FileSystemProvider,
  source: string,
  destination: string
): Promise<void> {
  const stat = await provider.stat(source);

  if (stat.type === FileType.Directory) {
    await provider.createDirectory(destination);
    const entries = await provider.readDirectory(source);
    for (const [name] of entries) {
      const srcChild = joinPath(source, name);
      const dstChild = joinPath(destination, name);
      await copyRecursive(provider, srcChild, dstChild);
    }
  } else {
    const content = await provider.readFile(source);
    await provider.writeFile(destination, content, { overwrite: true });
  }
}

export async function deleteRecursive(
  provider: FileSystemProvider,
  uri: string
): Promise<void> {
  const stat = await provider.stat(uri);

  if (stat.type === FileType.Directory) {
    const entries = await provider.readDirectory(uri);
    for (const [name] of entries) {
      await deleteRecursive(provider, joinPath(uri, name));
    }
  }

  await provider.delete(uri);
}
```

### 3.3 Disk Provider Implementation Skeleton

```typescript
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

export class DiskFileSystemProvider implements FileSystemProvider {
  readonly scheme = 'file';
  readonly capabilities: FileSystemProviderCapabilities = {
    reading: true,
    writing: true,
    watching: true,
    streaming: true,
    trash: true,
    symlinks: true,
    atomicWrite: true,
    fileLocks: false,
  };

  private uriToPath(uri: string): string {
    const parsed = parseUri(uri);
    if (parsed.scheme !== 'file') {
      throw new Error(`Expected file scheme, got ${parsed.scheme}`);
    }
    return parsed.path;
  }

  async stat(uri: string): Promise<FileStat> {
    const p = this.uriToPath(uri);
    const s = await fsp.stat(p);
    return {
      type: s.isFile() ? FileType.File
        : s.isDirectory() ? FileType.Directory
        : s.isSymbolicLink() ? FileType.SymbolicLink
        : FileType.Unknown,
      ctime: s.ctimeMs,
      mtime: s.mtimeMs,
      size: s.size,
    };
  }

  async readFile(uri: string): Promise<Uint8Array> {
    const p = this.uriToPath(uri);
    return fsp.readFile(p);
  }

  async readFileStream(uri: string): Promise<ReadableStream<Uint8Array>> {
    const p = this.uriToPath(uri);
    const nodeStream = fs.createReadStream(p);
    return new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (err) => controller.error(err));
      },
    });
  }

  async writeFile(uri: string, content: Uint8Array | ReadableStream<Uint8Array>): Promise<void> {
    const p = this.uriToPath(uri);
    if (content instanceof Uint8Array) {
      await fsp.writeFile(p, content);
    } else {
      const reader = content.getReader();
      const writer = fs.createWriteStream(p);
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          writer.write(Buffer.from(value));
        }
      } finally {
        writer.close();
      }
    }
  }

  async readDirectory(uri: string): Promise<[string, FileType][]> {
    const p = this.uriToPath(uri);
    const entries = await fsp.readdir(p, { withFileTypes: true });
    return entries.map((e) => [
      e.name,
      e.isFile() ? FileType.File
        : e.isDirectory() ? FileType.Directory
        : e.isSymbolicLink() ? FileType.SymbolicLink
        : FileType.Unknown,
    ]);
  }

  async createDirectory(uri: string): Promise<void> {
    const p = this.uriToPath(uri);
    await fsp.mkdir(p, { recursive: true });
  }

  async delete(uri: string, options?: { recursive?: boolean; useTrash?: boolean }): Promise<void> {
    const p = this.uriToPath(uri);
    if (options?.useTrash) {
      // delegate to OS trash
      await trashFile(p);
    } else {
      await fsp.rm(p, { recursive: options?.recursive ?? false, force: true });
    }
  }

  async rename(oldUri: string, newUri: string, options?: { overwrite?: boolean }): Promise<void> {
    const oldP = this.uriToPath(oldUri);
    const newP = this.uriToPath(newUri);
    if (options?.overwrite) {
      await fsp.unlink(newP).catch(() => {});
    }
    await fsp.rename(oldP, newP);
  }

  async copy(source: string, destination: string, options?: { overwrite?: boolean }): Promise<void> {
    const srcP = this.uriToPath(source);
    const dstP = this.uriToPath(destination);
    await fsp.cp(srcP, dstP, {
      recursive: true,
      force: options?.overwrite ?? false,
    });
  }

  watch(resource: string, options?: { recursive?: boolean; excludes?: string[] }): Disposable & { onDidChange: Event<FileChange[]> } {
    // see section 4
    return createFileWatcher(this.uriToPath(resource), options);
  }
}
```

### 3.4 Memory Provider

```typescript
export class InMemoryFileSystemProvider implements FileSystemProvider {
  readonly scheme = 'inmemory';
  readonly capabilities: FileSystemProviderCapabilities = {
    reading: true,
    writing: true,
    watching: true,
    streaming: false,
    trash: false,
    symlinks: false,
    atomicWrite: true,
    fileLocks: false,
  };

  private root = new InMemoryDirectory('/', new Map());
  private changeEmitter = new EventEmitter<FileChange[]>();

  // -- In-memory tree structure --
  private getNode(uri: string): InMemoryNode | undefined {
    const parts = parseUri(uri).path.replace(/^\//, '').split('/').filter(Boolean);
    let current: InMemoryNode = this.root;
    for (const part of parts) {
      if (current.type !== 'directory') return undefined;
      const child = (current as InMemoryDirectory).children.get(part);
      if (!child) return undefined;
      current = child;
    }
    return current;
  }

  async stat(uri: string): Promise<FileStat> {
    const node = this.getNode(uri);
    if (!node) throw new FileNotFoundError(uri);
    return {
      type: node.type === 'file' ? FileType.File : FileType.Directory,
      ctime: node.ctime,
      mtime: node.mtime,
      size: node.type === 'file' ? (node as InMemoryFile).content.byteLength : 0,
    };
  }

  async readFile(uri: string): Promise<Uint8Array> {
    const node = this.getNode(uri);
    if (!node || node.type !== 'file') throw new FileNotFoundError(uri);
    return (node as InMemoryFile).content;
  }

  async writeFile(uri: string, content: Uint8Array): Promise<void> {
    const parts = parseUri(uri).path.replace(/^\//, '').split('/').filter(Boolean);
    const fileName = parts.pop()!;
    const dir = this.ensureDirectory('/', parts);
    const existing = dir.children.get(fileName);

    const file: InMemoryFile = {
      type: 'file',
      name: fileName,
      content,
      ctime: existing?.ctime ?? Date.now(),
      mtime: Date.now(),
    };
    dir.children.set(fileName, file);
    this.changeEmitter.emit([{ type: existing ? FileChangeType.Updated : FileChangeType.Created, uri }]);
  }

  async readDirectory(uri: string): Promise<[string, FileType][]> {
    const node = this.getNode(uri);
    if (!node || node.type !== 'directory') throw new FileNotFoundError(uri);
    return Array.from((node as InMemoryDirectory).children.entries()).map(
      ([name, child]) => [name, child.type === 'file' ? FileType.File : FileType.Directory]
    );
  }

  async createDirectory(uri: string): Promise<void> {
    const parts = parseUri(uri).path.replace(/^\//, '').split('/').filter(Boolean);
    this.ensureDirectory('/', parts);
    this.changeEmitter.emit([{ type: FileChangeType.Created, uri }]);
  }

  async delete(uri: string): Promise<void> {
    const parts = parseUri(uri).path.replace(/^\//, '').split('/').filter(Boolean);
    const name = parts.pop()!;
    const dir = this.getNode('file:///' + parts.join('/')) as InMemoryDirectory | undefined;
    if (!dir) throw new FileNotFoundError(uri);
    dir.children.delete(name);
    this.changeEmitter.emit([{ type: FileChangeType.Deleted, uri }]);
  }

  async rename(oldUri: string, newUri: string): Promise<void> {
    const content = await this.readFile(oldUri);
    await this.writeFile(newUri, content);
    await this.delete(oldUri);
  }

  async copy(source: string, destination: string): Promise<void> {
    const content = await this.readFile(source);
    await this.writeFile(destination, content);
  }

  watch(resource: string): Disposable & { onDidChange: Event<FileChange[]> } {
    return {
      onDidChange: (listener) => this.changeEmitter.on(listener),
      dispose: () => {},
    };
  }

  private ensureDirectory(base: string, parts: string[]): InMemoryDirectory {
    let current = base === '/' ? this.root : this.getNode('file:///' + base) as InMemoryDirectory;
    for (const part of parts) {
      if (!current.children.has(part)) {
        current.children.set(part, {
          type: 'directory',
          name: part,
          children: new Map(),
          ctime: Date.now(),
          mtime: Date.now(),
        });
      }
      const next = current.children.get(part)!;
      if (next.type !== 'directory') throw new Error(`Not a directory: ${part}`);
      current = next as InMemoryDirectory;
    }
    return current;
  }
}
```

---

## 4. File Watching System

### 4.1 Native Watching vs Polling

| Plataforma | Mecanismo Nativo | Biblioteca | Recursivo Nativo |
|------------|-----------------|------------|------------------|
| macOS | FSEvents | `fsevents` | Sim |
| Windows | ReadDirectoryChangesW | `@parcel/watcher` ou `chokidar` | Sim (Windows 10+) |
| Linux | inotify | `@parcel/watcher` ou `chokidar` | Sim |
| Linux (fallback) | stat polling | `chokidar` interval | Simulado |

### 4.2 Watcher Interface

```typescript
export interface FileWatcher {
  readonly onDidChange: Event<FileChange[]>;
  readonly onDidError: Event<Error>;
  dispose(): void;
}

export type WatcherBackend = 'native' | 'chokidar' | 'polling';

export interface WatcherOptions {
  recursive: boolean;
  excludes: string[];
  includes: string[];
  debounceMs: number;
  throttleMs: number;
  pollingIntervalMs: number;
  backend: WatcherBackend;
  followSymlinks: boolean;
}
```

### 4.3 Watcher Implementation

```typescript
export class FileWatcherService {
  private watchers = new Map<string, FileWatcher>();
  private chokidar: typeof import('chokidar') | null = null;

  private get defaultExcludes(): string[] {
    return ['**/node_modules/**', '**/.git/**', '**/.hg/**', '**/.svn/**',
            '**/__pycache__/**', '**/.DS_Store', '**/Thumbs.db'];
  }

  async watch(
    rootPath: string,
    options: Partial<WatcherOptions> = {}
  ): Promise<FileWatcher> {
    const opts: WatcherOptions = {
      recursive: true,
      excludes: this.defaultExcludes,
      includes: [],
      debounceMs: 100,
      throttleMs: 200,
      pollingIntervalMs: 3000,
      backend: await this.detectBestBackend(),
      followSymlinks: false,
      ...options,
    };

    const watcher = await this.createWatcher(rootPath, opts);
    this.watchers.set(rootPath, watcher);
    return watcher;
  }

  private async detectBestBackend(): Promise<WatcherBackend> {
    if (process.platform === 'darwin') {
      try {
        require.resolve('fsevents');
        return 'native';
      } catch {
        return 'chokidar';
      }
    }
    if (process.platform === 'win32' || process.platform === 'linux') {
      return 'chokidar';
    }
    return 'polling';
  }

  private async createWatcher(
    rootPath: string,
    opts: WatcherOptions
  ): Promise<FileWatcher> {
    if (opts.backend === 'native') {
      return this.createNativeWatcher(rootPath, opts);
    }

    const chokidar = await this.getChokidar();
    const raw = chokidar.watch(rootPath, {
      recursive: opts.recursive,
      ignored: opts.excludes,
      ignoreInitial: true,
      followSymlinks: opts.followSymlinks,
      interval: opts.pollingIntervalMs,
      binaryInterval: opts.pollingIntervalMs * 2,
    });

    return this.decorateWithDebounce(raw, opts);
  }

  private decorateWithDebounce(
    raw: import('chokidar').FSWatcher,
    opts: WatcherOptions
  ): FileWatcher {
    const debounced = new DebouncedEmitter<FileChange[]>(opts.debounceMs, opts.throttleMs);
    const errorEmitter = new EventEmitter<Error>();

    raw.on('add', (p) => debounced.emit([{ type: FileChangeType.Created, uri: `file://${p}` }]));
    raw.on('change', (p) => debounced.emit([{ type: FileChangeType.Updated, uri: `file://${p}` }]));
    raw.on('unlink', (p) => debounced.emit([{ type: FileChangeType.Deleted, uri: `file://${p}` }]));
    raw.on('addDir', (p) => debounced.emit([{ type: FileChangeType.Created, uri: `file://${p}` }]));
    raw.on('unlinkDir', (p) => debounced.emit([{ type: FileChangeType.Deleted, uri: `file://${p}` }]));
    raw.on('error', (e) => errorEmitter.emit(e));

    return {
      onDidChange: (listener) => debounced.on(listener),
      onDidError: (listener) => errorEmitter.on(listener),
      dispose: () => {
        raw.close();
        debounced.dispose();
      },
    };
  }

  unwatch(rootPath: string): void {
    const w = this.watchers.get(rootPath);
    if (w) {
      w.dispose();
      this.watchers.delete(rootPath);
    }
  }

  disposeAll(): void {
    for (const [, w] of this.watchers) w.dispose();
    this.watchers.clear();
  }

  private async getChokidar(): Promise<typeof import('chokidar')> {
    if (!this.chokidar) {
      this.chokidar = await import('chokidar');
    }
    return this.chokidar;
  }
}

// Debounce/throttle implementation
class DebouncedEmitter<T> {
  private listeners: Array<(e: T) => void> = [];
  private pending: T | undefined;
  private lastEmit = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private debounceMs: number,
    private throttleMs: number
  ) {}

  emit(event: T): void {
    this.pending = event;
    const now = Date.now();
    const elapsed = now - this.lastEmit;

    if (elapsed >= this.throttleMs) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.debounceMs);
    }
  }

  private flush(): void {
    if (this.pending) {
      this.lastEmit = Date.now();
      const evt = this.pending;
      this.pending = undefined;
      for (const listener of this.listeners) {
        listener(evt);
      }
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  on(listener: (e: T) => void): Disposable {
    this.listeners.push(listener);
    return { dispose: () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    }};
  }

  dispose(): void {
    this.listeners = [];
    clearTimeout(this.timer);
  }
}
```

### 4.4 Watcher Lifecycle

```
Estado: IDLE -> WATCHING -> PAUSED -> WATCHING -> DISPOSED

IDLE: watcher criado, ainda nao conectado
WATCHING: monitorando ativamente mudancas
PAUSED: suspenso temporariamente (ex: durante bulk operation)
DISPOSED: recursos liberados, nao pode ser reutilizado
```

```typescript
export enum WatcherState {
  Idle = 'idle',
  Watching = 'watching',
  Paused = 'paused',
  Disposed = 'disposed',
}

export class ManagedFileWatcher implements FileWatcher {
  private state: WatcherState = WatcherState.Idle;
  private inner: FileWatcher | null = null;
  private buffer: FileChange[] = [];

  readonly onDidChange: Event<FileChange[]>;
  readonly onDidError: Event<Error>;

  constructor(
    private factory: () => Promise<FileWatcher>,
    private maxBufferSize = 10000
  ) {
    // ...
  }

  async start(): Promise<void> {
    this.inner = await this.factory();
    this.state = WatcherState.Watching;
  }

  pause(): void {
    if (this.state === WatcherState.Watching) {
      this.state = WatcherState.Paused;
    }
  }

  resume(): void {
    if (this.state === WatcherState.Paused) {
      this.state = WatcherState.Watching;
      if (this.buffer.length > 0) {
        // flush buffered events
        this.emitChanges([...this.buffer]);
        this.buffer = [];
      }
    }
  }

  dispose(): void {
    this.state = WatcherState.Disposed;
    this.inner?.dispose();
    this.inner = null;
    this.buffer = [];
  }

  private emitChanges(changes: FileChange[]): void {
    // notify listeners
  }
}
```

---

## 5. Workspace Model

### 5.1 Multi-Root Workspace Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            WORKSPACE MODEL                                   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │  WorkspaceService                                                    │       │
│  │                                                                      │       │
│  │  ├── WorkspaceFolders: Folder[]                                     │       │
│  │  ├── activeFolder: Folder | undefined                               │       │
│  │  ├── workspaceFile: VfsUri | undefined                              │       │
│  │  ├── settings: WorkspaceSettings                                    │       │
│  │  ├── trust: WorkspaceTrust                                          │       │
│  │  └── storage: WorkspaceStorage                                      │       │
│  │                                                                      │       │
│  └──────────┬───────────────────────────────────────────────────────────┘       │
│             │                                                                     │
│     ┌───────┼───────────────┬──────────────────────┐                            │
│     ▼       ▼               ▼                      ▼                            │
│  ┌──────┐ ┌──────┐ ┌──────────────┐ ┌──────────────────────┐                  │
│  │Pasta │ │Pasta │ │ Pasta Remota │ │ ZIP (como workspace) │                  │
│  │ A    │ │ B    │ │ (S3/SSH)     │ │                     │                  │
│  └──────┘ └──────┘ └──────────────┘ └──────────────────────┘                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Workspace File Format (.code-workspace)

```json
{
  "folders": [
    { "path": "/home/user/project-frontend" },
    { "path": "/home/user/project-backend" },
    { "name": "Shared Library", "path": "/home/user/libs/shared" },
    { "path": "ssh://remote-server/production-config" }
  ],
  "settings": {
    "editor.tabSize": 2,
    "files.exclude": {
      "**/.git": true,
      "**/node_modules": true,
      "**/dist": true
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/vendor": true
    }
  },
  "extensions": {
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode"
    ]
  },
  "tasks": {
    "version": "2.0.0",
    "tasks": []
  },
  "launch": {
    "version": "0.2.0",
    "configurations": []
  }
}
```

### 5.3 Workspace Model Implementation

```typescript
export interface WorkspaceFolder {
  readonly uri: string;
  readonly name: string;
  readonly index: number;
  readonly provider: FileSystemProvider;
}

export interface WorkspaceSettings {
  files?: {
    exclude?: Record<string, boolean>;
    associations?: Record<string, string>;
    encoding?: string;
    autoSave?: AutoSaveConfig;
    watcherExclude?: Record<string, boolean>;
    trimTrailingWhitespace?: boolean;
    insertFinalNewline?: boolean;
  };
  editor?: {
    tabSize?: number;
    insertSpaces?: boolean;
    formatOnSave?: boolean;
    formatOnPaste?: boolean;
    wordWrap?: 'off' | 'on' | 'wordWrapColumn';
  };
  search?: {
    exclude?: Record<string, boolean>;
    include?: Record<string, boolean>;
    useRipgrep?: boolean;
    maxResults?: number;
  };
  [key: string]: unknown;
}

export interface AutoSaveConfig {
  enabled: boolean;
  strategy: 'afterDelay' | 'onFocusChange' | 'onWindowChange';
  delayMs: number;
}

export class WorkspaceService {
  private folders: WorkspaceFolder[] = [];
  private settings: WorkspaceSettings = {};
  private folderProviders = new Map<string, FileSystemProvider>();

  constructor(
    private providerRegistry: FileSystemProviderRegistry,
    private storageService: WorkspaceStorageService
  ) {}

  async openFile(workspaceFile: string): Promise<void> {
    const content = await this.providerRegistry.readFile(workspaceFile);
    const config = JSON.parse(new TextDecoder().decode(content));

    this.folders = [];
    for (const entry of config.folders || []) {
      await this.addFolder(entry.path, entry.name);
    }

    this.settings = config.settings || {};
    await this.storageService.loadWorkspaceState(workspaceFile);
  }

  async addFolder(uri: string, name?: string): Promise<WorkspaceFolder> {
    const provider = this.providerRegistry.getProvider(uri);
    const folder: WorkspaceFolder = {
      uri,
      name: name || this.deriveFolderName(uri),
      index: this.folders.length,
      provider,
    };
    this.folders.push(folder);
    this.folderProviders.set(uri, provider);

    // start watching the folder
    if (provider.capabilities.watching) {
      await this.startWatchingFolder(folder);
    }

    return folder;
  }

  removeFolder(uri: string): void {
    const idx = this.folders.findIndex((f) => f.uri === uri);
    if (idx >= 0) {
      this.stopWatchingFolder(this.folders[idx]);
      this.folders.splice(idx, 1);
      this.folderProviders.delete(uri);
      // re-index
      this.folders.forEach((f, i) => { f.index = i; });
    }
  }

  getFolder(uri: string): WorkspaceFolder | undefined {
    return this.folders.find((f) => uri.startsWith(f.uri));
  }

  getFolders(): readonly WorkspaceFolder[] {
    return this.folders;
  }

  async getConfiguration(section: string): Promise<unknown> {
    return this.resolveSettings(section);
  }

  async updateConfiguration(section: string, value: unknown): Promise<void> {
    this.setNestedSetting(this.settings, section, value);
    await this.saveWorkspaceFile();
  }

  private deriveFolderName(uri: string): string {
    const parsed = parseUri(uri);
    return parsed.path.split('/').filter(Boolean).pop() || parsed.scheme;
  }

  private resolveSettings(section: string): unknown {
    const parts = section.split('.');
    let current: unknown = this.settings;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  private setNestedSetting(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
}
```

### 5.4 Workspace Trust

```typescript
export enum WorkspaceTrustState {
  Unknown = 'unknown',
  Trusted = 'trusted',
  Untrusted = 'untrusted',
}

export interface WorkspaceTrust {
  state: WorkspaceTrustState;
  reason?: string;
  timestamp: number;
}

export class WorkspaceTrustService {
  private trustCache = new Map<string, WorkspaceTrustState>();

  async evaluateTrust(folders: WorkspaceFolder[]): Promise<WorkspaceTrust> {
    // Check each folder for trust indicators:
    // 1. Is it a known path? (e.g., /home/user, not /tmp)
    // 2. Does it have a .git folder?
    // 3. Is it listed in the trusted workspaces storage?
    // 4. Does it contain a package.json, Cargo.toml, etc.?

    for (const folder of folders) {
      const cached = this.trustCache.get(folder.uri);
      if (cached) continue;

      const trust = await this.evaluateSingleFolder(folder);
      this.trustCache.set(folder.uri, trust);
    }

    const allTrusted = folders.every(
      (f) => this.trustCache.get(f.uri) === WorkspaceTrustState.Trusted
    );

    return {
      state: allTrusted ? WorkspaceTrustState.Trusted : WorkspaceTrustState.Untrusted,
      timestamp: Date.now(),
    };
  }

  private async evaluateSingleFolder(folder: WorkspaceFolder): Promise<WorkspaceTrustState> {
    try {
      // Check for .git
      await folder.provider.stat(joinPath(folder.uri, '.git'));
      return WorkspaceTrustState.Trusted;
    } catch {
      // No .git — less trustworthy
    }

    // Check for project manifest files
    for (const manifest of ['package.json', 'Cargo.toml', 'pyproject.toml', 'go.mod', 'pom.xml']) {
      try {
        await folder.provider.stat(joinPath(folder.uri, manifest));
        return WorkspaceTrustState.Trusted;
      } catch {
        continue;
      }
    }

    return WorkspaceTrustState.Untrusted;
  }
}
```

### 5.5 Workspace Storage

```typescript
export interface WorkspaceStorage {
  globalStorage: StorageScope;     // ~/.config/ideia/User/
  workspaceStorage: StorageScope;   // ~/.config/ideia/Workspaces/{hash}/
  folderStorage: StorageScope;      // ~/.config/ideia/Workspaces/{hash}/{folder-hash}/
}

interface StorageScope {
  read(key: string): Promise<string | undefined>;
  write(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export class WorkspaceStorageService {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || path.join(os.homedir(), '.config', 'ideia');
  }

  getGlobalStorage(): StorageScope {
    return this.createScope('User');
  }

  getWorkspaceStorage(workspaceHash: string): StorageScope {
    return this.createScope(path.join('Workspaces', workspaceHash));
  }

  getFolderStorage(workspaceHash: string, folderHash: string): StorageScope {
    return this.createScope(path.join('Workspaces', workspaceHash, folderHash));
  }

  async loadWorkspaceState(workspaceFile: string): Promise<void> {
    const hash = this.hashWorkspace(workspaceFile);
    const scope = this.getWorkspaceStorage(hash);
    // load UI state: open editors, view positions, breakpoints, etc.
  }

  private createScope(subPath: string): StorageScope {
    const dir = path.join(this.basePath, subPath);
    return {
      read: async (key) => {
        try {
          return await fsp.readFile(path.join(dir, key), 'utf-8');
        } catch {
          return undefined;
        }
      },
      write: async (key, value) => {
        await fsp.mkdir(dir, { recursive: true });
        await fsp.writeFile(path.join(dir, key), value, 'utf-8');
      },
      delete: async (key) => {
        await fsp.unlink(path.join(dir, key)).catch(() => {});
      },
      keys: async () => {
        try {
          return await fsp.readdir(dir);
        } catch {
          return [];
        }
      },
    };
  }

  private hashWorkspace(uri: string): string {
    // deterministic hash for consistent folder naming
    let hash = 0;
    for (let i = 0; i < uri.length; i++) {
      const char = uri.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
```

---

## 6. File System Operations Service

### 6.1 Coalescing Writes

```typescript
export class FileOperationService {
  private pendingWrites = new Map<string, { content: Uint8Array; timer: ReturnType<typeof setTimeout> }>();
  private conflictResolver: ConflictResolver;

  constructor(
    private providerRegistry: FileSystemProviderRegistry,
    private autoSaveConfig: AutoSaveConfig
  ) {
    this.conflictResolver = new ConflictResolver();
  }

  async writeFile(uri: string, content: Uint8Array, options?: {
    encoding?: string;
    overwrite?: boolean;
    atomic?: boolean;
  }): Promise<void> {
    const provider = this.providerRegistry.getProvider(uri);

    if (options?.atomic !== false) {
      await this.atomicWrite(provider, uri, content);
    } else {
      await provider.writeFile(uri, content, { overwrite: options?.overwrite ?? true });
    }
  }

  private async atomicWrite(provider: FileSystemProvider, uri: string, content: Uint8Array): Promise<void> {
    // Write to temp file, then rename (atomic on most file systems)
    const tmpUri = uri + '.~ideia-tmp';
    await provider.writeFile(tmpUri, content, { overwrite: true });
    await provider.rename(tmpUri, uri, { overwrite: true });
  }

  // Coalescing: aggregate rapid writes to same file
  scheduleWrite(uri: string, content: Uint8Array, delayMs = 500): void {
    const existing = this.pendingWrites.get(uri);
    if (existing) {
      clearTimeout(existing.timer);
      existing.content = content;
      existing.timer = setTimeout(() => this.flushWrite(uri), delayMs);
    } else {
      const timer = setTimeout(() => this.flushWrite(uri), delayMs);
      this.pendingWrites.set(uri, { content, timer });
    }
  }

  private async flushWrite(uri: string): Promise<void> {
    const pending = this.pendingWrites.get(uri);
    if (!pending) return;
    this.pendingWrites.delete(uri);
    await this.writeFile(uri, pending.content);
  }

  flushAll(): Promise<void> {
    const uris = Array.from(this.pendingWrites.keys());
    return Promise.all(uris.map((uri) => this.flushWrite(uri))).then(() => {});
  }
}
```

### 6.2 Auto-Save Strategies

```typescript
export type AutoSaveStrategy = 'afterDelay' | 'onFocusChange' | 'onWindowChange';

export class AutoSaveService {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private dirtyDocuments = new Set<string>();

  constructor(
    private fileOpService: FileOperationService,
    private config: AutoSaveConfig
  ) {}

  markDirty(uri: string, content: Uint8Array): void {
    this.dirtyDocuments.add(uri);

    switch (this.config.strategy) {
      case 'afterDelay':
        this.scheduleAfterDelay(uri, content);
        break;
      case 'onFocusChange':
        // save triggered externally via focus change event
        break;
      case 'onWindowChange':
        // save triggered externally via window blur
        break;
    }
  }

  private scheduleAfterDelay(uri: string, content: Uint8Array): void {
    const existing = this.timers.get(uri);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.fileOpService.scheduleWrite(uri, content);
      this.dirtyDocuments.delete(uri);
      this.timers.delete(uri);
    }, this.config.delayMs);

    this.timers.set(uri, timer);
  }

  onFocusChange(uri: string, content: Uint8Array): void {
    if (this.config.strategy === 'onFocusChange' && this.dirtyDocuments.has(uri)) {
      this.fileOpService.scheduleWrite(uri, content);
      this.dirtyDocuments.delete(uri);
    }
  }

  onWindowChange(uris: Map<string, Uint8Array>): void {
    if (this.config.strategy === 'onWindowChange') {
      for (const [uri, content] of uris) {
        if (this.dirtyDocuments.has(uri)) {
          this.fileOpService.scheduleWrite(uri, content);
          this.dirtyDocuments.delete(uri);
        }
      }
    }
  }

  cancelPending(uri: string): void {
    const timer = this.timers.get(uri);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(uri);
    }
    this.dirtyDocuments.delete(uri);
  }
}
```

### 6.3 File Conflict Resolution

```typescript
export type ConflictResolution =
  | 'overwrite'
  | 'keepBoth'
  | 'skip'
  | 'merge'
  | 'showDiff';

export class ConflictResolver {
  resolve(
    localUri: string,
    localContent: Uint8Array,
    remoteContent: Uint8Array
  ): ConflictResolution {
    // 1. Check if local has unsaved changes
    // 2. If remote is newer, flag conflict
    // 3. If content identical, skip
    // 4. If local modified after read, ask user or use strategy

    const localStr = new TextDecoder().decode(localContent);
    const remoteStr = new TextDecoder().decode(remoteContent);

    if (localStr === remoteStr) return 'skip';

    // In headless/agent mode, auto-resolve with 'overwrite' or keep backup
    const hasAgentContext = process.env['IDEIA_AGENT_MODE'] === 'true';
    if (hasAgentContext) {
      return 'overwrite';
    }

    return 'showDiff';
  }

  async createBackup(uri: string, content: Uint8Array): Promise<string> {
    const backupUri = uri + '.' + Date.now() + '.bak';
    const provider = this.getProvider(uri);
    await provider.writeFile(backupUri, content);
    return backupUri;
  }

  private getProvider(uri: string): FileSystemProvider {
    // resolve from registry
    throw new Error('not implemented');
  }
}
```

### 6.4 Encoding Detection

```typescript
export class EncodingDetector {
  private static readonly UTF8_BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
  private static readonly UTF16LE_BOM = new Uint8Array([0xFF, 0xFE]);
  private static readonly UTF16BE_BOM = new Uint8Array([0xFE, 0xFF]);

  detectEncoding(buffer: Uint8Array): BufferEncoding {
    // Check BOM
    if (this.startsWith(buffer, this.UTF8_BOM)) return 'utf-8';
    if (this.startsWith(buffer, this.UTF16LE_BOM)) return 'utf-16le';
    if (this.startsWith(buffer, this.UTF16BE_BOM)) return 'utf-16be';

    // Check for null bytes (likely UTF-16)
    if (buffer.includes(0x00)) {
      return 'utf-16le';
    }

    // Check if valid UTF-8
    if (this.isValidUtf8(buffer)) return 'utf-8';

    // Fallback to latin1
    return 'latin1';
  }

  private startsWith(buffer: Uint8Array, prefix: Uint8Array): boolean {
    if (buffer.length < prefix.length) return false;
    for (let i = 0; i < prefix.length; i++) {
      if (buffer[i] !== prefix[i]) return false;
    }
    return true;
  }

  private isValidUtf8(buffer: Uint8Array): boolean {
    let i = 0;
    while (i < buffer.length) {
      const byte = buffer[i];
      if (byte <= 0x7F) {
        i += 1;
      } else if (byte >= 0xC2 && byte <= 0xDF) {
        if (i + 1 >= buffer.length || (buffer[i + 1] & 0xC0) !== 0x80) return false;
        i += 2;
      } else if (byte >= 0xE0 && byte <= 0xEF) {
        if (i + 2 >= buffer.length) return false;
        if ((buffer[i + 1] & 0xC0) !== 0x80 || (buffer[i + 2] & 0xC0) !== 0x80) return false;
        i += 3;
      } else if (byte >= 0xF0 && byte <= 0xF4) {
        if (i + 3 >= buffer.length) return false;
        if ((buffer[i + 1] & 0xC0) !== 0x80 || (buffer[i + 2] & 0xC0) !== 0x80 || (buffer[i + 3] & 0xC0) !== 0x80) return false;
        i += 4;
      } else {
        return false;
      }
    }
    return true;
  }

  stripBom(buffer: Uint8Array): Uint8Array {
    for (const bom of [this.UTF8_BOM, this.UTF16LE_BOM, this.UTF16BE_BOM]) {
      if (this.startsWith(buffer, bom)) {
        return buffer.slice(bom.length);
      }
    }
    return buffer;
  }
}
```

### 6.5 Binary File Detection

```typescript
export class BinaryFileDetector {
  private static readonly BINARY_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.tar', '.gz', '.7z', '.rar',
    '.exe', '.dll', '.so', '.dylib',
    '.o', '.obj', '.lib', '.a',
    '.class', '.pyc', '.pyo',
    '.ttf', '.otf', '.woff', '.woff2',
    '.mp3', '.mp4', '.avi', '.mov', '.mkv',
    '.wasm', '.dex', '.apk', '.aab',
  ]);

  private static readonly TEXT_EXTENSIONS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.json', '.jsonc', '.yaml', '.yml', '.toml',
    '.md', '.mdx', '.txt', '.html', '.htm', '.xml',
    '.css', '.scss', '.less', '.styl',
    '.py', '.rs', '.go', '.java', '.cpp', '.c', '.h', '.hpp',
    '.rb', '.php', '.swift', '.kt', '.scala',
    '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
    '.sql', '.graphql', '.proto',
    '.env', '.gitignore', '.dockerfile', '.editorconfig',
    '.tsbuildinfo',
  ]);

  isBinaryUri(uri: string): boolean {
    const ext = uri.toLowerCase().split('.').pop();
    if (!ext) return false;
    if (this.BINARY_EXTENSIONS.has('.' + ext)) return true;
    if (this.TEXT_EXTENSIONS.has('.' + ext)) return false;
    return false; // unknown — check content
  }

  isBinaryContent(buffer: Uint8Array): boolean {
    if (buffer.length === 0) return false;
    // Check first 8192 bytes for null bytes (binary heuristic)
    const checkLen = Math.min(buffer.length, 8192);
    let nullCount = 0;
    for (let i = 0; i < checkLen; i++) {
      if (buffer[i] === 0) nullCount++;
    }
    return nullCount > 0;
  }

  getSuggestedFileType(uri: string, buffer: Uint8Array): 'text' | 'binary' | 'unknown' {
    if (this.isBinaryUri(uri)) return 'binary';
    if (this.isBinaryContent(buffer)) return 'binary';
    return 'text';
  }
}
```

---

## 7. File Explorer / File Tree

### 7.1 Tree Data Model

```typescript
export interface FileTreeItem {
  uri: string;
  name: string;
  type: FileType;
  stat?: FileStat;
  depth: number;
  expanded: boolean;
  children?: FileTreeItem[];
  decorations?: FileDecoration[];
}

export interface FileDecoration {
  badge?: string;
  color?: string;
  tooltip?: string;
  strikeThrough?: boolean;
}

export enum SortOrder {
  NameAsc = 'name-asc',
  NameDesc = 'name-desc',
  TypeAsc = 'type-asc',
  TypeDesc = 'type-desc',
  ModifiedAsc = 'modified-asc',
  ModifiedDesc = 'modified-desc',
}

export class FileTreeModel {
  private roots: FileTreeItem[] = [];
  private flatCache = new Map<string, FileTreeItem>();
  private sortOrder: SortOrder = SortOrder.NameAsc;

  constructor(
    private workspaceService: WorkspaceService,
    private gitDecorationProvider?: GitDecorationProvider
  ) {}

  async refresh(): Promise<void> {
    this.flatCache.clear();
    this.roots = [];
    for (const folder of this.workspaceService.getFolders()) {
      const root = await this.buildTree(folder.uri, 0, true);
      this.roots.push(root);
    }
    this.sortChildren(this.roots);
  }

  private async buildTree(uri: string, depth: number, expanded: boolean): Promise<FileTreeItem> {
    const provider = this.workspaceService.getFolder(uri)?.provider;
    if (!provider) throw new Error(`No provider for ${uri}`);

    const stat = await provider.stat(uri);
    const parts = parseUri(uri);
    const name = parts.path.split('/').filter(Boolean).pop() || parts.scheme;

    const item: FileTreeItem = {
      uri,
      name: name || '/',
      type: stat.type,
      stat,
      depth,
      expanded,
    };

    this.flatCache.set(uri, item);

    if (stat.type === FileType.Directory && expanded) {
      const entries = await provider.readDirectory(uri);
      const children: FileTreeItem[] = [];

      for (const [entryName, entryType] of entries) {
        if (this.shouldExclude(entryName)) continue;
        const childUri = joinPath(uri, entryName);
        const child = await this.buildTree(childUri, depth + 1, false);
        children.push(child);
      }

      this.sortChildren(children);
      item.children = children;
    }

    // Apply git decorations
    if (this.gitDecorationProvider) {
      const dec = await this.gitDecorationProvider.getDecoration(uri);
      if (dec) item.decorations = [dec];
    }

    return item;
  }

  private sortChildren(items: FileTreeItem[]): void {
    // Directories first, then files
    const dirs = items.filter((i) => i.type === FileType.Directory);
    const files = items.filter((i) => i.type !== FileType.Directory);

    const sortFn = this.getSortFn();
    dirs.sort(sortFn);
    files.sort(sortFn);

    items.length = 0;
    items.push(...dirs, ...files);
  }

  private getSortFn(): (a: FileTreeItem, b: FileTreeItem) => number {
    switch (this.sortOrder) {
      case SortOrder.NameAsc:
        return (a, b) => a.name.localeCompare(b.name);
      case SortOrder.NameDesc:
        return (a, b) => b.name.localeCompare(a.name);
      case SortOrder.TypeAsc:
        return (a, b) => a.name.split('.').pop()!.localeCompare(b.name.split('.').pop()!);
      case SortOrder.TypeDesc:
        return (a, b) => b.name.split('.').pop()!.localeCompare(a.name.split('.').pop()!);
      case SortOrder.ModifiedAsc:
        return (a, b) => (a.stat?.mtime ?? 0) - (b.stat?.mtime ?? 0);
      case SortOrder.ModifiedDesc:
        return (a, b) => (b.stat?.mtime ?? 0) - (a.stat?.mtime ?? 0);
    }
  }

  private shouldExclude(name: string): boolean {
    // Respect files.exclude settings
    const excludePatterns = this.workspaceService.getConfiguration('files.exclude') as Record<string, boolean> || {};
    for (const [pattern, enabled] of Object.entries(excludePatterns)) {
      if (enabled && this.matchGlob(name, pattern)) return true;
    }
    return false;
  }

  private matchGlob(name: string, pattern: string): boolean {
    // simplified glob matching
    if (pattern.startsWith('**/')) {
      const suffix = pattern.slice(3);
      return name === suffix || name.endsWith('/' + suffix);
    }
    const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.') + '$');
    return regex.test(name);
  }

  getItem(uri: string): FileTreeItem | undefined {
    return this.flatCache.get(uri);
  }

  async toggleExpand(uri: string): Promise<void> {
    const item = this.flatCache.get(uri);
    if (item && item.type === FileType.Directory) {
      if (item.expanded) {
        item.expanded = false;
        item.children = undefined;
      } else {
        item.expanded = true;
        // re-fetch children
        const rebuilt = await this.buildTree(uri, item.depth, true);
        item.children = rebuilt.children;
      }
    }
  }

  setSortOrder(order: SortOrder): void {
    this.sortOrder = order;
  }
}
```

### 7.2 File Nesting

File nesting agrupa arquivos relacionados em uma mesma linha do explorer.

```
Sem nesting:
  component.ts
  component.css
  component.spec.ts
  component.html

Com nesting:
  component.ts
    component.css
    component.spec.ts
    component.html
```

```typescript
export interface FileNestingConfig {
  enabled: boolean;
  patterns: Record<string, string>;
  expandNested?: boolean;
}

export const DEFAULT_NESTING_PATTERNS: Record<string, string> = {
  '*.ts': '${capture}.js, ${capture}.d.ts, ${capture}.spec.ts, ${capture}.test.ts',
  '*.tsx': '${capture}.css, ${capture}.spec.tsx, ${capture}.test.tsx',
  '*.js': '${capture}.min.js, ${capture}.map',
  '*.jsx': '${capture}.css, ${capture}.spec.jsx',
  '*.css': '${capture}.css.map',
  '*.json': '${capture}.json5, ${capture}.jsonc',
  'package.json': '.npmrc, .yarnrc, yarn.lock, package-lock.json',
  'docker-compose.yml': '.env, .dockerignore',
};

export class FileNestingService {
  nest(items: FileTreeItem[], config: FileNestingConfig): FileTreeItem[] {
    if (!config.enabled) return items;

    const result: FileTreeItem[] = [];
    const remaining = new Set(items);

    for (const item of items) {
      if (!remaining.has(item)) continue;

      const children = this.findNestedChildren(item, items, config);
      if (children.length > 0) {
        const copy = { ...item, children: children.map((c) => {
          remaining.delete(c);
          return { ...c, depth: item.depth + 1 };
        })};
        result.push(copy);
        remaining.delete(item);
      }
    }

    // any remaining items (not nested) get appended
    for (const item of remaining) {
      result.push(item);
    }

    return result;
  }

  private findNestedChildren(parent: FileTreeItem, all: FileTreeItem[], config: FileNestingConfig): FileTreeItem[] {
    const children: FileTreeItem[] = [];
    const parentName = parent.name;

    // Try each pattern
    for (const [parentPattern, childPatterns] of Object.entries(config.patterns)) {
      if (!this.matchGlob(parentName, parentPattern)) continue;

      // Extract capture groups
      const captureMatch = parentName.match(this.globToRegex(parentPattern));
      const capture = captureMatch?.[0]?.replace(/\.[^.]+$/, '') || '';

      for (const childPattern of childPatterns.split(',').map((s) => s.trim())) {
        const expectedName = childPattern.replace('${capture}', capture);
        const child = all.find((a) => a.name === expectedName && a.uri !== parent.uri);
        if (child) children.push(child);
      }
    }

    return children;
  }

  private globToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regexStr = escaped.replace(/\*/g, '(.*)').replace(/\?/g, '(.)');
    return new RegExp('^' + regexStr + '$');
  }

  private matchGlob(name: string, pattern: string): boolean {
    const regex = this.globToRegex(pattern);
    return regex.test(name);
  }
}
```

### 7.3 Git Decoration Provider

```typescript
export interface GitDecorationProvider {
  getDecoration(uri: string): Promise<FileDecoration | undefined>;
}

export class DefaultGitDecorationProvider implements GitDecorationProvider {
  private gitStatusCache = new Map<string, string>();
  private gitDir: string | null = null;

  constructor(private workspaceUri: string) {}

  async initialize(): Promise<void> {
    try {
      this.gitDir = joinPath(this.workspaceUri, '.git');
      // read git index (simplified)
      // in production, use isomorphic-git or exec git status
    } catch {
      this.gitDir = null;
    }
  }

  async getDecoration(uri: string): Promise<FileDecoration | undefined> {
    if (!this.gitDir) return undefined;

    const status = this.gitStatusCache.get(uri);
    if (!status) return undefined;

    switch (status) {
      case 'modified':
        return { badge: 'M', color: 'yellow', tooltip: 'Modified' };
      case 'added':
        return { badge: 'A', color: 'green', tooltip: 'Added' };
      case 'deleted':
        return { badge: 'D', color: 'red', tooltip: 'Deleted', strikeThrough: true };
      case 'renamed':
        return { badge: 'R', color: 'cyan', tooltip: 'Renamed' };
      case 'untracked':
        return { badge: 'U', color: 'gray', tooltip: 'Untracked' };
      default:
        return undefined;
    }
  }
}
```

---

## 8. Open Editors Model

### 8.1 Tab Management

```typescript
export interface EditorTab {
  uri: string;
  title: string;
  description: string;
  dirty: boolean;
  pinned: boolean;
  preview: boolean;
  groupId: number;
  order: number;
  lastAccessed: number;
  encoding?: string;
  lineEnding?: LineEnding;
  selection?: { startLine: number; startCol: number; endLine: number; endCol: number };
  viewState?: Record<string, unknown>;
}

export type LineEnding = 'LF' | 'CRLF' | 'CR';

export class OpenEditorsModel {
  private tabs: EditorTab[] = [];
  private recentUris: string[] = [];
  private maxRecentItems = 100;

  open(uri: string, groupId = 0): EditorTab {
    const existing = this.tabs.find((t) => t.uri === uri);
    if (existing) {
      existing.lastAccessed = Date.now();
      this.addToRecent(uri);
      return existing;
    }

    const tab: EditorTab = {
      uri,
      title: this.deriveTitle(uri),
      description: this.deriveDescription(uri),
      dirty: false,
      pinned: false,
      preview: true,
      groupId,
      order: this.tabs.length,
      lastAccessed: Date.now(),
    };

    // Preview mode: replace last preview tab
    const lastPreview = this.tabs.find((t) => t.preview && !t.pinned);
    if (lastPreview && !lastPreview.dirty) {
      this.close(lastPreview.uri);
    }

    this.tabs.push(tab);
    this.addToRecent(uri);
    return tab;
  }

  close(uri: string): void {
    const idx = this.tabs.findIndex((t) => t.uri === uri);
    if (idx >= 0) {
      this.tabs.splice(idx, 1);
    }
  }

  markDirty(uri: string, dirty: boolean): void {
    const tab = this.tabs.find((t) => t.uri === uri);
    if (tab) tab.dirty = dirty;
  }

  pin(uri: string): void {
    const tab = this.tabs.find((t) => t.uri === uri);
    if (tab) {
      tab.pinned = true;
      tab.preview = false;
    }
  }

  unpin(uri: string): void {
    const tab = this.tabs.find((t) => t.uri === uri);
    if (tab) {
      tab.pinned = false;
    }
  }

  setGroupId(uri: string, groupId: number): void {
    const tab = this.tabs.find((t) => t.uri === uri);
    if (tab) tab.groupId = groupId;
  }

  getOpenTabs(): readonly EditorTab[] {
    return [...this.tabs];
  }

  getRecentUris(limit = 10): string[] {
    return this.recentUris.slice(0, limit);
  }

  isOpen(uri: string): boolean {
    return this.tabs.some((t) => t.uri === uri);
  }

  hasDirtyTabs(): boolean {
    return this.tabs.some((t) => t.dirty);
  }

  private addToRecent(uri: string): void {
    const idx = this.recentUris.indexOf(uri);
    if (idx >= 0) this.recentUris.splice(idx, 1);
    this.recentUris.unshift(uri);
    if (this.recentUris.length > this.maxRecentItems) {
      this.recentUris.pop();
    }
  }

  private deriveTitle(uri: string): string {
    const parts = parseUri(uri);
    return parts.path.split('/').filter(Boolean).pop() || parts.scheme;
  }

  private deriveDescription(uri: string): string {
    const parts = parseUri(uri);
    const parentPath = parts.path.split('/').slice(0, -1).join('/');
    return parentPath || parts.scheme;
  }
}
```

---

## 9. Search System

### 9.1 Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           SEARCH SYSTEM                                   │
│                                                                           │
│  ┌────────────────┐  ┌───────────────────┐  ┌───────────────────────┐   │
│  │ SearchService  │  │ RipgrepIntegration│  │ SearchProvider API    │   │
│  │ (orquestrador) │──│ (execucao rg)     │──│ (extensoes registram) │   │
│  └───────┬────────┘  └───────────────────┘  └───────────────────────┘   │
│          │                                                                │
│  ┌───────▼───────────────────────────────────────────────────────┐      │
│  │                     Search Results Model                       │      │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐    │      │
│  │  │ File Matches│  │ Line Matches│  │ Preview Context    │    │      │
│  │  └─────────────┘  └─────────────┘  └────────────────────┘    │      │
│  └───────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────┘
```

### 9.2 ripgrep Integration

```typescript
export interface SearchQuery {
  pattern: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  isWholeWord: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  maxResults: number;
  contextLines: number;
  includeHidden: boolean;
  respectGitignore: boolean;
  followSymlinks: boolean;
}

export interface SearchResult {
  uri: string;
  matches: LineMatch[];
  totalMatches: number;
}

export interface LineMatch {
  line: number;
  column: number;
  length: number;
  lineText: string;
  matchText: string;
  context?: {
    before: string[];
    after: string[];
  };
}

export interface SearchProgress {
  processedFiles: number;
  totalMatches: number;
  isComplete: boolean;
}

export class RipgrepSearchProvider {
  private rgPath: string;

  constructor() {
    this.rgPath = this.resolveRgPath();
  }

  private resolveRgPath(): string {
    const paths = [
      // bundled with IDEIA
      path.join(__dirname, '..', 'bin', process.platform === 'win32' ? 'rg.exe' : 'rg'),
      // system install
      'rg',
    ];
    for (const p of paths) {
      try {
        require.resolve(p);
        return p;
      } catch {}
    }
    return 'rg';
  }

  async search(
    query: SearchQuery,
    folders: string[],
    onProgress?: (progress: SearchProgress) => void,
    signal?: AbortSignal
  ): Promise<SearchResult[]> {
    const args = this.buildArgs(query, folders);

    const child = spawn(this.rgPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    if (signal) {
      signal.addEventListener('abort', () => {
        child.kill('SIGTERM');
      });
    }

    const results = new Map<string, SearchResult>();
    let processedFiles = 0;

    const rl = readline.createInterface({ input: child.stdout });

    return new Promise((resolve, reject) => {
      rl.on('line', (line: string) => {
        const parsed = this.parseRipgrepLine(line);
        if (!parsed) return;
        processedFiles++;

        const { uri, lineNum, col, matchLen, lineText } = parsed;

        if (!results.has(uri)) {
          results.set(uri, { uri, matches: [], totalMatches: 0 });
        }

        results.get(uri)!.matches.push({
          line: lineNum,
          column: col,
          length: matchLen,
          lineText,
          matchText: lineText.slice(col - 1, col - 1 + matchLen),
        });
        results.get(uri)!.totalMatches++;

        if (results.size >= query.maxResults) {
          child.kill('SIGTERM');
        }

        onProgress?.({ processedFiles, totalMatches: results.size, isComplete: false });
      });

      child.on('close', (code) => {
        if (code !== 0 && code !== 1) {
          reject(new Error(`ripgrep exited with code ${code}`));
          return;
        }
        onProgress?.({ processedFiles, totalMatches: results.size, isComplete: true });
        resolve(Array.from(results.values()));
      });

      child.on('error', reject);
    });
  }

  private buildArgs(query: SearchQuery, folders: string[]): string[] {
    const args: string[] = [
      '--json',              // JSON output for parsing
      '--max-count', '100',  // max matches per file
    ];

    if (query.isRegex) {
      args.push('--regexp', query.pattern);
    } else {
      args.push('--fixed-strings', query.pattern);
    }

    if (!query.isCaseSensitive) args.push('-i');
    if (query.isWholeWord) args.push('-w');
    if (!query.respectGitignore) args.push('--no-ignore');
    if (query.includeHidden) args.push('--hidden');
    if (query.followSymlinks) args.push('-L');

    if (query.contextLines > 0) {
      args.push('-C', String(query.contextLines));
    }

    for (const inc of query.includePatterns) {
      args.push('-g', inc);
    }
    for (const exc of query.excludePatterns) {
      args.push('-g', '!' + exc);
    }

    args.push(...folders);
    return args;
  }

  private parseRipgrepLine(line: string): {
    uri: string; lineNum: number; col: number; matchLen: number; lineText: string;
  } | null {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'match') {
        const data = parsed.data;
        const text = data.lines.text;
        const sub = data.submatches[0];
        return {
          uri: `file://${data.path.text}`,
          lineNum: data.line_number,
          col: sub.start + 1,
          matchLen: sub.end - sub.start,
          lineText: text.replace(/\n$/, ''),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  async replace(
    query: SearchQuery,
    folders: string[],
    replacement: string,
    dryRun = false
  ): Promise<{ uri: string; replacements: number }[]> {
    const args = this.buildArgs(query, folders);

    if (dryRun) {
      args.push('--count');
    } else {
      args.push('--replace', replacement);
    }

    // ripgrep does not support in-place replacement natively
    // We use it for matching, then perform replacements ourselves
    const results = await this.search(query, folders, undefined, undefined);
    const replaceResults: { uri: string; replacements: number }[] = [];

    for (const result of results) {
      const content = await this.readFile(result.uri);
      // Apply replacements line by line
      const lines = content.split('\n');
      let replaceCount = 0;

      for (const match of result.matches) {
        const lineIdx = match.line - 1;
        if (lineIdx >= 0 && lineIdx < lines.length) {
          const before = match.column - 1;
          const after = before + match.length;
          lines[lineIdx] = lines[lineIdx].slice(0, before) + replacement + lines[lineIdx].slice(after);
          replaceCount++;
        }
      }

      if (!dryRun && replaceCount > 0) {
        await this.writeFile(result.uri, lines.join('\n'));
      }

      replaceResults.push({ uri: result.uri, replacements: replaceCount });
    }

    return replaceResults;
  }

  private async readFile(uri: string): Promise<string> {
    // delegate to VFS
    throw new Error('not implemented');
  }

  private async writeFile(uri: string, content: string): Promise<void> {
    // delegate to VFS
    throw new Error('not implemented');
  }
}
```

### 9.3 Search Provider API

```typescript
export interface SearchProvider {
  readonly id: string;
  readonly label: string;

  search(
    query: SearchQuery,
    onProgress?: (result: SearchResult) => void,
    signal?: AbortSignal
  ): Promise<SearchResult[]>;
}

export class SearchService {
  private providers: SearchProvider[] = [];
  private defaultProvider: RipgrepSearchProvider;

  constructor() {
    this.defaultProvider = new RipgrepSearchProvider();
  }

  registerProvider(provider: SearchProvider): Disposable {
    this.providers.push(provider);
    return {
      dispose: () => {
        const idx = this.providers.indexOf(provider);
        if (idx >= 0) this.providers.splice(idx, 1);
      },
    };
  }

  async search(
    query: SearchQuery,
    folders: string[],
    onProgress?: (progress: SearchProgress) => void,
    signal?: AbortSignal
  ): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];

    // Use ripgrep by default
    const rgResults = await this.defaultProvider.search(query, folders, onProgress, signal);
    allResults.push(...rgResults);

    // Also query registered providers (e.g., git grep, semantic search)
    for (const provider of this.providers) {
      if (signal?.aborted) break;
      try {
        const results = await provider.search(query, onProgress, signal);
        allResults.push(...results);
      } catch (err) {
        console.error(`Search provider ${provider.id} failed:`, err);
      }
    }

    // Deduplicate and merge
    return this.mergeResults(allResults);
  }

  private mergeResults(results: SearchResult[]): SearchResult[] {
    const merged = new Map<string, SearchResult>();
    for (const r of results) {
      if (merged.has(r.uri)) {
        merged.get(r.uri)!.matches.push(...r.matches);
        merged.get(r.uri)!.totalMatches = r.matches.length;
      } else {
        merged.set(r.uri, { ...r, matches: [...r.matches] });
      }
    }
    return Array.from(merged.values());
  }

  // Search in open editors only
  async searchInOpenEditors(
    query: Pick<SearchQuery, 'pattern' | 'isRegex' | 'isCaseSensitive'>,
    openUris: string[]
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const uri of openUris) {
      const content = await this.defaultProvider['readFile'](uri);
      const lines = content.split('\n');
      const matches: LineMatch[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let idx = 0;

        while (idx < line.length) {
          let matchIdx: number;
          let matchLen: number;

          if (query.isRegex) {
            const re = new RegExp(query.pattern, query.isCaseSensitive ? 'g' : 'gi');
            const m = re.exec(line.slice(idx));
            if (!m) break;
            matchIdx = idx + m.index;
            matchLen = m[0].length;
          } else {
            const searchStr = query.isCaseSensitive ? line.slice(idx) : line.slice(idx).toLowerCase();
            const patternStr = query.isCaseSensitive ? query.pattern : query.pattern.toLowerCase();
            matchIdx = idx + searchStr.indexOf(patternStr);
            if (matchIdx < idx) break;
            matchLen = query.pattern.length;
          }

          matches.push({
            line: i + 1,
            column: matchIdx + 1,
            length: matchLen,
            lineText: line,
            matchText: line.slice(matchIdx, matchIdx + matchLen),
          });

          idx = matchIdx + matchLen;
        }
      }

      if (matches.length > 0) {
        results.push({ uri, matches, totalMatches: matches.length });
      }
    }

    return results;
  }
}
```

### 9.4 Search Query Syntax

```
# File filters
folder:src           # search only in src/
!folder:node_modules  # exclude node_modules
ext:ts               # only .ts files
ext:!js              # exclude .js files

# Content patterns
"exact string"       # exact match (escaped)
'case sensitive'     # case sensitive exact match
regex:foo.*bar       # regex match
whole:word           # whole word match

# Semantic (with search provider)
semantic:function    # search by semantic meaning

# Combined
ext:ts regex:class.*Factory folder:src/
```

---

## 10. File Association & Language Detection

### 10.1 Language Detection Pipeline

```
File URI
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Extension Match  ──── .ts -> TypeScript, .js -> JavaScript │
│  2. Filename Match   ──── Makefile -> Makefile                 │
│  3. Shebang Detection ──── #!/usr/bin/env node -> JavaScript   │
│  4. Content Detection ──── <html> -> HTML, <?xml> -> XML      │
│  5. User Override     ──── files.associations: {"*.jsx": "tsx"}│
└─────────────────────────────────────────────────────────────┘
   │
   ▼
Language ID (e.g., 'typescript', 'javascript', 'python')
```

### 10.2 Association Configuration

```typescript
export interface LanguageAssociation {
  id: string;
  aliases: string[];
  extensions: string[];
  filenames: string[];
  shebangs: string[];
  mimetypes: string[];
  config?: LanguageConfig;
}

export interface LanguageConfig {
  comments: { lineComment?: string; blockComment?: [string, string] };
  brackets: [string, string][];
  autoClosingPairs: [string, string][];
  surroundingPairs: [string, string][];
  folding: { markers?: { start: string; end: string } };
  wordPattern: string;
  indentationRules?: {
    increaseIndentPattern: string;
    decreaseIndentPattern: string;
  };
}

export class LanguageService {
  private associations: LanguageAssociation[] = [];
  private userOverrides: Record<string, string> = {};
  private contentDetectors: Array<(content: string) => string | null> = [];

  constructor() {
    this.registerBuiltinLanguages();
  }

  detectLanguage(uri: string, content?: string): string {
    // 1. User override (files.associations)
    const userOverride = this.checkUserOverride(uri);
    if (userOverride) return userOverride;

    // 2. Extension match
    const extension = uri.split('.').pop()?.toLowerCase();
    if (extension) {
      for (const lang of this.associations) {
        if (lang.extensions.includes('.' + extension)) {
          return lang.id;
        }
      }
    }

    // 3. Filename match
    const filename = uri.split('/').pop()?.split('\\').pop();
    if (filename) {
      for (const lang of this.associations) {
        if (lang.filenames.includes(filename)) {
          return lang.id;
        }
      }
    }

    // 4. Shebang detection
    if (content) {
      const shebang = this.detectShebang(content);
      if (shebang) {
        for (const lang of this.associations) {
          if (lang.shebangs.includes(shebang)) {
            return lang.id;
          }
        }
      }

      // 5. Content-based detection
      for (const detector of this.contentDetectors) {
        const result = detector(content);
        if (result) return result;
      }
    }

    return 'plaintext';
  }

  private detectShebang(content: string): string | null {
    const firstLine = content.split('\n')[0];
    const match = firstLine.match(/^#!\s*(?:\/usr\/bin\/env\s+)?(\w+)/);
    return match ? match[1] : null;
  }

  private checkUserOverride(uri: string): string | null {
    for (const [pattern, langId] of Object.entries(this.userOverrides)) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      const filename = uri.split('/').pop() || '';
      if (regex.test(filename)) return langId;
    }
    return null;
  }

  registerAssociation(assoc: LanguageAssociation): void {
    this.associations.push(assoc);
  }

  setUserOverrides(overrides: Record<string, string>): void {
    this.userOverrides = overrides;
  }

  registerContentDetector(detector: (content: string) => string | null): void {
    this.contentDetectors.push(detector);
  }

  getLanguageConfig(languageId: string): LanguageConfig | undefined {
    const assoc = this.associations.find((a) => a.id === languageId);
    return assoc?.config;
  }

  private registerBuiltinLanguages(): void {
    this.associations.push(
      {
        id: 'typescript',
        aliases: ['TypeScript', 'ts'],
        extensions: ['.ts', '.tsx', '.mts', '.cts'],
        filenames: ['tsconfig.json'],
        shebangs: ['ts-node'],
        config: {
          comments: { lineComment: '//', blockComment: ['/*', '*/'] },
          brackets: [['{', '}'], ['[', ']'], ['(', ')']],
          autoClosingPairs: [['{', '}'], ['[', ']'], ['(', ')'], ['"', '"'], ['\'', '\'']],
          surroundingPairs: [['{', '}'], ['[', ']'], ['(', ')'], ['"', '"'], ['\'', '\'']],
          folding: { markers: { start: '//#region', end: '//#endregion' } },
          wordPattern: '(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\\'\\"\\,\\.\\<\\>\\/\\?\\s]+)',
        },
      },
      {
        id: 'javascript',
        aliases: ['JavaScript', 'js'],
        extensions: ['.js', '.jsx', '.mjs', '.cjs'],
        filenames: ['package.json', '.eslintrc.js', 'webpack.config.js'],
        shebangs: ['node'],
        config: {
          comments: { lineComment: '//', blockComment: ['/*', '*/'] },
          brackets: [['{', '}'], ['[', ']'], ['(', ')']],
          autoClosingPairs: [['{', '}'], ['[', ']'], ['(', ')'], ['"', '"'], ['\'', '\'']],
          surroundingPairs: [['{', '}'], ['[', ']'], ['(', ')'], ['"', '"'], ['\'', '\'']],
          folding: { markers: { start: '//#region', end: '//#endregion' } },
          wordPattern: '(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\\'\\"\\,\\.\\<\\>\\/\\?\\s]+)',
        },
      },
      {
        id: 'python',
        aliases: ['Python', 'py'],
        extensions: ['.py', '.pyw', '.pyx'],
        filenames: ['setup.py', 'requirements.txt'],
        shebangs: ['python', 'python3'],
        config: {
          comments: { lineComment: '#' },
          brackets: [['{', '}'], ['[', ']'], ['(', ')']],
          autoClosingPairs: [['{', '}'], ['[', ']'], ['(', ')'], ['"', '"'], ['\'', '\'']],
          surroundingPairs: [['{', '}'], ['[', ']'], ['(', ')'], ['"', '"'], ['\'', '\'']],
          folding: { markers: { start: '#region', end: '#endregion' } },
          wordPattern: '(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\\'\\"\\,\\.\\<\\>\\/\\?\\s]+)',
        },
      }
    );

    this.contentDetectors.push(
      (content) => content.startsWith('<?xml') ? 'xml' : null,
      (content) => content.startsWith('<!DOCTYPE html') || content.includes('<html') ? 'html' : null,
      (content) => content.startsWith('{') && this.isValidJson(content) ? 'json' : null,
    );
  }

  private isValidJson(content: string): boolean {
    try { JSON.parse(content); return true; } catch { return false; }
  }
}
```

---

## 11. Bulk File Operations

### 11.1 Move/Rename Tracking

```typescript
export interface FileRename {
  oldUri: string;
  newUri: string;
}

export class BulkFileOperator {
  private renameHistory: FileRename[] = [];
  private undoStack: FileRename[][] = [];

  constructor(
    private fileOpService: FileOperationService,
    private providerRegistry: FileSystemProviderRegistry
  ) {}

  async moveFiles(renames: FileRename[], onProgress?: (current: number, total: number) => void): Promise<void> {
    const total = renames.length;
    const batch: FileRename[] = [];

    for (let i = 0; i < total; i++) {
      const { oldUri, newUri } = renames[i];
      const provider = this.providerRegistry.getProvider(oldUri);

      try {
        await provider.rename(oldUri, newUri, { overwrite: false });
        batch.push({ oldUri, newUri });
        this.renameHistory.push({ oldUri, newUri });
        onProgress?.(i + 1, total);
      } catch (err) {
        // Rollback on failure
        for (const r of batch) {
          try {
            const p = this.providerRegistry.getProvider(r.newUri);
            await p.rename(r.newUri, r.oldUri);
          } catch {}
        }
        throw err;
      }
    }

    this.undoStack.push(batch);
  }

  async copyFiles(sources: string[], destinationDir: string): Promise<string[]> {
    const created: string[] = [];
    for (const src of sources) {
      const name = src.split('/').pop() || src;
      const dst = joinPath(destinationDir, name);
      const provider = this.providerRegistry.getProvider(src);
      await provider.copy(src, dst, { overwrite: false });
      created.push(dst);
    }
    return created;
  }

  async deleteFiles(uris: string[], useTrash = true): Promise<void> {
    for (const uri of uris) {
      const provider = this.providerRegistry.getProvider(uri);
      await provider.delete(uri, { recursive: true, useTrash });
    }
  }

  async renameFolder(oldUri: string, newName: string): Promise<void> {
    const parts = parseUri(oldUri);
    const parentPath = parts.path.split('/').slice(0, -1).join('/');
    const newUri = `${parts.scheme}://${parts.authority}${parentPath}/${newName}`;

    // Collect all affected files for path updates
    const provider = this.providerRegistry.getProvider(oldUri);
    const allFiles = await this.collectAllFiles(oldUri, provider);
    const renames: FileRename[] = [];

    for (const file of allFiles) {
      const relativePath = file.slice(oldUri.length);
      renames.push({ oldUri: file, newUri: newUri + relativePath });
    }

    await this.moveFiles(renames);
  }

  private async collectAllFiles(uri: string, provider: FileSystemProvider): Promise<string[]> {
    const files: string[] = [];
    const entries = await provider.readDirectory(uri);
    for (const [name, type] of entries) {
      const childUri = joinPath(uri, name);
      if (type === FileType.Directory) {
        files.push(childUri);
        const subFiles = await this.collectAllFiles(childUri, provider);
        files.push(...subFiles);
      } else {
        files.push(childUri);
      }
    }
    return files;
  }

  undo(): Promise<void> {
    const batch = this.undoStack.pop();
    if (!batch) return Promise.resolve();

    const reverseRenames = batch.map((r) => ({ oldUri: r.newUri, newUri: r.oldUri })).reverse();
    return this.moveFiles(reverseRenames);
  }

  getRenameHistory(): readonly FileRename[] {
    return [...this.renameHistory];
  }
}
```

### 11.2 Refactoring Across Files

```typescript
export interface CrossFileRefactor {
  type: 'rename-symbol' | 'move-file' | 'rename-file' | 'extract-module';
  oldPath: string;
  newPath: string;
  affectedUris: string[];
  updateReferences: boolean;
}

export class RefactoringService {
  constructor(
    private bulkOperator: BulkFileOperator,
    private searchService: SearchService,
    private workspaceService: WorkspaceService
  ) {}

  async renameFile(oldUri: string, newName: string): Promise<CrossFileRefactor> {
    const parts = parseUri(oldUri);
    const parentPath = parts.path.split('/').slice(0, -1).join('/');
    const newUri = `${parts.scheme}://${parts.authority}${parentPath}/${newName}`;

    // Search for imports referencing this file
    const oldFilename = oldUri.split('/').pop()!;
    const oldImportPattern = this.getImportPattern(oldFilename);

    const importResults = await this.searchService.search({
      pattern: oldImportPattern,
      isRegex: true,
      isCaseSensitive: true,
      isWholeWord: false,
      includePatterns: [],
      excludePatterns: ['**/node_modules/**'],
      maxResults: 1000,
      contextLines: 0,
      includeHidden: false,
      respectGitignore: true,
      followSymlinks: false,
    }, this.workspaceService.getFolders().map((f) => f.uri));

    const affectedUris = importResults.map((r) => r.uri);

    // Execute move
    await this.bulkOperator.moveFiles([{ oldUri, newUri }]);

    // Update imports
    const newFilename = newName;
    for (const result of importResults) {
      const content = await this.readFile(result.uri);
      const updated = content.replace(
        new RegExp(this.escapeRegex(oldImportPattern), 'g'),
        newFilename.replace(/\.\w+$/, '')
      );
      await this.writeFile(result.uri, updated);
    }

    return {
      type: 'rename-file',
      oldPath: oldUri,
      newPath: newUri,
      affectedUris,
      updateReferences: true,
    };
  }

  private getImportPattern(filename: string): string {
    const base = filename.replace(/\.\w+$/, '');
    const ext = filename.match(/\.\w+$/)?.[0] || '';
    if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
      return `['"\`](\\.\\/)?${base}['"\`]`;
    }
    return `['"\`]${filename}['"\`]`;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async readFile(uri: string): Promise<string> {
    const provider = this.workspaceService.getFolder(uri)?.provider;
    if (!provider) throw new Error(`No provider for ${uri}`);
    const content = await provider.readFile(uri);
    return new TextDecoder().decode(content);
  }

  private async writeFile(uri: string, content: string): Promise<void> {
    const provider = this.workspaceService.getFolder(uri)?.provider;
    if (!provider) throw new Error(`No provider for ${uri}`);
    await provider.writeFile(uri, new TextEncoder().encode(content));
  }
}
```

---

## 12. Large File Handling

### 12.1 File Size Limits

```typescript
export class LargeFileHandler {
  static readonly PREVIEW_LIMIT = 50 * 1024 * 1024; // 50 MB
  static readonly WARNING_LIMIT = 10 * 1024 * 1024;  // 10 MB
  static readonly STRUCTURAL_NAV_LIMIT = 2 * 1024 * 1024; // 2 MB (lazy tokenization)
  static readonly MAX_FILE_SIZE = 250 * 1024 * 1024; // 250 MB hard limit

  async handleFileOpen(uri: string, size: number): Promise<'full' | 'preview' | 'structural' | 'reject'> {
    if (size > this.MAX_FILE_SIZE) {
      return 'reject';
    }

    if (size <= this.STRUCTURAL_NAV_LIMIT) {
      return 'full';
    }

    if (size <= this.PREVIEW_LIMIT) {
      return 'preview';
    }

    return 'structural';
  }

  async readPreview(uri: string, maxLines = 1000): Promise<string[]> {
    const provider = this.getProvider(uri);
    const stream = await provider.readFileStream(uri);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const lines: string[] = [];
    let buffer = '';

    try {
      let lineCount = 0;
      while (lineCount < maxLines) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');

        for (let i = 0; i < parts.length - 1 && lineCount < maxLines; i++) {
          lines.push(parts[i]);
          lineCount++;
        }

        buffer = parts[parts.length - 1];
      }

      if (lines.length < maxLines && buffer.length > 0) {
        lines.push(buffer);
      }

      return lines;
    } finally {
      reader.releaseLock();
    }
  }

  private getProvider(uri: string): FileSystemProvider {
    // resolve from registry
    throw new Error('not implemented');
  }
}
```

### 12.2 Structural Navigation

For very large files, rather than loading the full content, we provide structural navigation (fold, symbols, outline).

```typescript
export interface StructuralNode {
  name: string;
  kind: SymbolKind;
  range: { startLine: number; endLine: number };
  children: StructuralNode[];
}

export class StructuralNavigationService {
  async getStructure(uri: string): Promise<StructuralNode[]> {
    // Use the language's document symbol provider
    // For quick access, can also use regex-based heuristics
    const firstChunk = await this.readChunk(uri, 0, 100);

    if (this.looksLikeTypeScript(firstChunk)) {
      return this.extractTypeScriptStructure(uri);
    }
    if (this.looksLikePython(firstChunk)) {
      return this.extractPythonStructure(uri);
    }
    // fallback: section header detection
    return this.extractHeaders(firstChunk);
  }

  private async readChunk(uri: string, startLine: number, lineCount: number): Promise<string> {
    // read only a portion of the file
    throw new Error('not implemented');
  }

  private looksLikeTypeScript(content: string): boolean {
    return /^(import|export|interface|type|class|function|const)\s/m.test(content);
  }

  private looksLikePython(content: string): boolean {
    return /^(import|from|def |class |@)\s/m.test(content);
  }

  private extractHeaders(content: string): StructuralNode[] {
    const nodes: StructuralNode[] = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(#{1,6})\s+(.+)/);
      if (match) {
        nodes.push({
          name: match[2],
          kind: SymbolKind.String,
          range: { startLine: i + 1, endLine: i + 1 },
          children: [],
        });
      }
    }
    return nodes;
  }

  private async extractTypeScriptStructure(uri: string): Promise<StructuralNode[]> {
    // Full implementation would use the TypeScript AST
    // For now, regex-based quick extraction
    return [];
  }

  private async extractPythonStructure(uri: string): Promise<StructuralNode[]> {
    return [];
  }
}
```

---

## 13. Encoding & Line Endings

### 13.1 Encoding Conversion

```typescript
export type BufferEncoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'latin1' | 'iso-8859-1' | 'windows-1252' | 'ascii';

export class EncodingService {
  private detector = new EncodingDetector();

  decode(buffer: Uint8Array, encoding?: BufferEncoding): string {
    const enc = encoding || this.detector.detectEncoding(buffer);
    const withoutBom = this.detector.stripBom(buffer);

    switch (enc) {
      case 'utf-8':
        return new TextDecoder('utf-8', { fatal: false }).decode(withoutBom);
      case 'utf-16le':
        return new TextDecoder('utf-16le', { fatal: false }).decode(withoutBom);
      case 'utf-16be':
        return new TextDecoder('utf-16be', { fatal: false }).decode(withoutBom);
      case 'latin1':
      case 'iso-8859-1':
        return this.decodeLatin1(withoutBom);
      case 'windows-1252':
        return this.decodeWindows1252(withoutBom);
      case 'ascii':
        return new TextDecoder('ascii', { fatal: false }).decode(withoutBom);
      default:
        return new TextDecoder('utf-8', { fatal: false }).decode(withoutBom);
    }
  }

  encode(text: string, encoding: BufferEncoding): Uint8Array {
    switch (encoding) {
      case 'utf-8':
        return new TextEncoder().encode(text);
      case 'utf-16le':
        return this.encodeUtf16(text, false);
      case 'utf-16be':
        return this.encodeUtf16(text, true);
      case 'latin1':
      case 'iso-8859-1':
        return this.encodeLatin1(text);
      case 'ascii':
        return new TextEncoder().encode(text); // ASCII is subset of UTF-8
      default:
        return new TextEncoder().encode(text);
    }
  }

  private decodeLatin1(buffer: Uint8Array): string {
    let result = '';
    for (let i = 0; i < buffer.length; i++) {
      result += String.fromCharCode(buffer[i]);
    }
    return result;
  }

  private decodeWindows1252(buffer: Uint8Array): string {
    // Windows-1252 is mostly Latin-1 with extra chars in 0x80-0x9F
    const overrides: Record<number, string> = {
      0x80: '\u20AC', 0x82: '\u201A', 0x83: '\u0192', 0x84: '\u201E',
      0x85: '\u2026', 0x86: '\u2020', 0x87: '\u2021', 0x88: '\u02C6',
      0x89: '\u2030', 0x8A: '\u0160', 0x8B: '\u2039', 0x8C: '\u0152',
      0x8E: '\u017D', 0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C',
      0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
      0x98: '\u02DC', 0x99: '\u2122', 0x9A: '\u0161', 0x9B: '\u203A',
      0x9C: '\u0153', 0x9E: '\u017E', 0x9F: '\u0178',
    };

    let result = '';
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      result += overrides[byte] || String.fromCharCode(byte);
    }
    return result;
  }

  private encodeUtf16(text: string, bigEndian: boolean): Uint8Array {
    const encoder = bigEndian ? new TextEncoder() : new TextEncoder();
    const utf8 = encoder.encode(text);
    // Convert UTF-8 to UTF-16
    // Simplified: proper implementation requires full encoding conversion
    const buffer = new Uint8Array(utf8.length * 2 + 2);
    // Add BOM
    buffer[0] = bigEndian ? 0xFE : 0xFF;
    buffer[1] = bigEndian ? 0xFF : 0xFE;
    // ... actual conversion omitted for brevity
    return buffer;
  }

  private encodeLatin1(text: string): Uint8Array {
    const buffer = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      buffer[i] = text.charCodeAt(i) & 0xFF;
    }
    return buffer;
  }
}
```

### 13.2 Line Ending Normalization

```typescript
export class LineEndingService {
  detectLineEndings(content: string): { dominant: LineEnding; mixed: boolean; count: Record<string, number> } {
    const count = { LF: 0, CRLF: 0, CR: 0 };

    // Count CRLF first (two-char sequence)
    const crlfMatches = content.match(/\r\n/g);
    if (crlfMatches) count.CRLF = crlfMatches.length;

    // Count remaining CR
    const crMatches = content.match(/(?<!\r)\r/g);
    if (crMatches) count.CR = crMatches.length;

    // Count LF not preceded by CR
    const lfMatches = content.match(/(?<!\r)\n/g);
    if (lfMatches) count.LF = lfMatches.length;

    const total = count.LF + count.CRLF + count.CR;
    if (total === 0) return { dominant: 'LF', mixed: false, count };

    let dominant: LineEnding = 'LF';
    let max = count.LF;
    if (count.CRLF > max) { dominant = 'CRLF'; max = count.CRLF; }
    if (count.CR > max) { dominant = 'CR'; }

    const nonZero = Object.values(count).filter((c) => c > 0).length;

    return { dominant, mixed: nonZero > 1, count };
  }

  normalize(content: string, target: LineEnding): string {
    // First normalize everything to LF
    let result = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Then convert to target
    if (target === 'CRLF') {
      result = result.replace(/\n/g, '\r\n');
    } else if (target === 'CR') {
      result = result.replace(/\n/g, '\r');
    }

    return result;
  }

  normalizeBuffer(buffer: Uint8Array, target: LineEnding): Uint8Array {
    const decoder = new TextDecoder();
    const text = decoder.decode(buffer);
    const normalized = this.normalize(text, target);
    return new TextEncoder().encode(normalized);
  }

  // Ensure file ends with proper EOL
  ensureFinalNewline(content: string, target: LineEnding): string {
    const eol = target === 'CRLF' ? '\r\n' : target === 'CR' ? '\r' : '\n';
    if (!content.endsWith(eol)) {
      return content + eol;
    }
    return content;
  }

  // Strip trailing whitespace from each line
  trimTrailingWhitespace(content: string): string {
    return content.replace(/[ \t]+(\r?\n|\r)/g, '$1');
  }
}
```

---

## 14. Code Examples

### 14.1 Complete VFS Setup

```typescript
import { Container } from 'inversify';

export const TYPES = {
  FileSystemProviderRegistry: Symbol.for('FileSystemProviderRegistry'),
  WorkspaceService: Symbol.for('WorkspaceService'),
  FileOperationService: Symbol.for('FileOperationService'),
  FileWatcherService: Symbol.for('FileWatcherService'),
  SearchService: Symbol.for('SearchService'),
  LanguageService: Symbol.for('LanguageService'),
  OpenEditorsModel: Symbol.for('OpenEditorsModel'),
  FileTreeModel: Symbol.for('FileTreeModel'),
  BulkFileOperator: Symbol.for('BulkFileOperator'),
  EncodingService: Symbol.for('EncodingService'),
};

export class FileSystemProviderRegistry {
  private providers = new Map<string, FileSystemProvider>();

  register(provider: FileSystemProvider): void {
    this.providers.set(provider.scheme, provider);
  }

  getProvider(uri: string): FileSystemProvider {
    const { scheme } = parseUri(uri);
    const provider = this.providers.get(scheme);
    if (!provider) {
      throw new Error(`No provider registered for scheme: ${scheme}`);
    }
    return provider;
  }

  async readFile(uri: string): Promise<Uint8Array> {
    return this.getProvider(uri).readFile(uri);
  }

  async writeFile(uri: string, content: Uint8Array): Promise<void> {
    return this.getProvider(uri).writeFile(uri, content);
  }

  hasProvider(scheme: string): boolean {
    return this.providers.has(scheme);
  }

  getSchemes(): string[] {
    return Array.from(this.providers.keys());
  }
}

export function createDefaultFileSystemContainer(): Container {
  const container = new Container();

  // Core services
  container.bind<FileSystemProviderRegistry>(TYPES.FileSystemProviderRegistry)
    .toSelf().inSingletonScope();
  container.bind<WorkspaceService>(TYPES.WorkspaceService)
    .toSelf().inSingletonScope();
  container.bind<FileOperationService>(TYPES.FileOperationService)
    .toSelf().inSingletonScope();
  container.bind<FileWatcherService>(TYPES.FileWatcherService)
    .toSelf().inSingletonScope();
  container.bind<SearchService>(TYPES.SearchService)
    .toSelf().inSingletonScope();
  container.bind<LanguageService>(TYPES.LanguageService)
    .toSelf().inSingletonScope();
  container.bind<OpenEditorsModel>(TYPES.OpenEditorsModel)
    .toSelf().inSingletonScope();
  container.bind<FileTreeModel>(TYPES.FileTreeModel)
    .toSelf().inSingletonScope();
  container.bind<BulkFileOperator>(TYPES.BulkFileOperator)
    .toSelf().inSingletonScope();
  container.bind<EncodingService>(TYPES.EncodingService)
    .toSelf().inSingletonScope();

  // Register providers
  const registry = container.get<FileSystemProviderRegistry>(TYPES.FileSystemProviderRegistry);
  registry.register(new DiskFileSystemProvider());
  registry.register(new InMemoryFileSystemProvider());

  return container;
}
```

### 14.2 File Explorer with Virtual List

```typescript
// Virtual list rendering for large file trees
// Uses on-demand item resolution, not full tree rendering

interface VirtualListState {
  containerHeight: number;
  itemHeight: number;
  scrollTop: number;
  visibleItems: number;
  totalItems: number;
  overscan: number;
}

export class FileExplorerVirtualList {
  private state: VirtualListState = {
    containerHeight: 600,
    itemHeight: 22,
    scrollTop: 0,
    visibleItems: 0,
    totalItems: 0,
    overscan: 20,
  };

  private flattenedItems: FileTreeItem[] = [];
  private expandedSet = new Set<string>();

  constructor(private treeModel: FileTreeModel) {}

  async initialize(folderUri: string): Promise<void> {
    await this.treeModel.refresh();
    this.flattenTree();
  }

  private flattenTree(): void {
    this.flattenedItems = [];
    this.flattenNode(this.treeModel['roots'], 0);
    this.state.totalItems = this.flattenedItems.length;
  }

  private flattenNode(items: FileTreeItem[], depth: number): void {
    for (const item of items) {
      this.flattenedItems.push(item);
      if (item.type === FileType.Directory && item.expanded && item.children) {
        this.flattenNode(item.children, depth + 1);
      }
    }
  }

  getVisibleRange(): { startIndex: number; endIndex: number } {
    const { scrollTop, itemHeight, containerHeight, overscan } = this.state;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      this.flattenedItems.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }

  getItemStyle(index: number): React.CSSProperties {
    const { itemHeight } = this.state;
    return {
      position: 'absolute',
      top: index * itemHeight,
      height: itemHeight,
      left: 0,
      right: 0,
    };
  }

  getTotalHeight(): number {
    return this.flattenedItems.length * this.state.itemHeight;
  }

  onScroll(scrollTop: number): void {
    this.state.scrollTop = scrollTop;
  }

  async toggleExpand(uri: string): Promise<void> {
    await this.treeModel.toggleExpand(uri);
    this.flattenTree();
  }

  getItems(): FileTreeItem[] {
    return this.flattenedItems;
  }
}
```

### 14.3 Multi-Root Workspace Manager

```typescript
export class MultiRootWorkspaceManager {
  private workspaceService: WorkspaceService;
  private _onDidChangeFolders = new EventEmitter<WorkspaceFolder[]>();
  readonly onDidChangeFolders: Event<WorkspaceFolder[]> = (cb) => this._onDidChangeFolders.on(cb);

  constructor(
    private registry: FileSystemProviderRegistry,
    private storage: WorkspaceStorageService
  ) {
    this.workspaceService = new WorkspaceService(registry, storage);
  }

  async initializeFromCliArgs(args: string[]): Promise<void> {
    if (args.length === 0) {
      // Open current directory
      await this.workspaceService.addFolder('file:///' + process.cwd().replace(/\\/g, '/'));
    } else {
      for (const arg of args) {
        if (arg.endsWith('.code-workspace')) {
          await this.workspaceService.openFile('file:///' + path.resolve(arg).replace(/\\/g, '/'));
        } else {
          const absPath = path.resolve(arg).replace(/\\/g, '/');
          await this.workspaceService.addFolder('file:///' + absPath);
        }
      }
    }

    this._onDidChangeFolders.emit(this.workspaceService.getFolders());
  }

  async addFolder(uri: string): Promise<void> {
    const folder = await this.workspaceService.addFolder(uri);
    this._onDidChangeFolders.emit(this.workspaceService.getFolders());
  }

  removeFolder(uri: string): void {
    this.workspaceService.removeFolder(uri);
    this._onDidChangeFolders.emit(this.workspaceService.getFolders());
  }

  getFolders(): readonly WorkspaceFolder[] {
    return this.workspaceService.getFolders();
  }

  async saveWorkspaceAs(uri: string): Promise<void> {
    const folders = this.workspaceService.getFolders().map((f) => ({ path: f.uri }));
    const settings = await this.workspaceService.getConfiguration('') as WorkspaceSettings;

    const workspaceConfig = {
      folders,
      settings,
    };

    const content = new TextEncoder().encode(JSON.stringify(workspaceConfig, null, 2));
    await this.registry.writeFile(uri, content);
  }

  async getWorkspaceSettings(): Promise<WorkspaceSettings> {
    return this.workspaceService.getConfiguration('') as Promise<WorkspaceSettings>;
  }
}
```

---

## 15. Conexoes

### 15.1 S11 — Theia IDE Integration

O VFS da IDEIA segue o modelo de `FileSystemProvider` do Theia, que por sua vez e baseado no design do VS Code. A interface `FileSystemProvider` definida na secao 3 e compativel com a API Theia `FileSystemProvider` e pode ser registrada diretamente no Theia via Inversify DI.

```
Theia FileSystemProvider  ───►  IDEIA FileSystemProvider (mesma interface)
       │                                  │
       ▼                                  ▼
  TheiaFileChange              FileChange (mesmo modelo de eventos)
       │                                  │
       ▼                                  ▼
  Theia WorkspaceService     IDEIA WorkspaceService (extensao com multi-root v2)
```

Os watchers do file system (secao 4) usam `@parcel/watcher` e `chokidar` — ambos suportados pelo Theia. A migracao de watchers IDEIA para o Theia requer apenas o registro via `FileSystemWatcherManager` do Theia.

### 15.2 S21 — Terminal & Debug

O terminal (xterm.js) e o debugger (DAP) dependem do VFS para:
- **Terminal**: diretorio de trabalho corrente (cwd), leitura de scripts de shell, profile de terminal
- **DAP**: leitura de arquivos fonte para exibicao no DebugPanel, resolucao de breakpoints (URI -> path), source maps

```typescript
// Integration point: DAP source file resolution via VFS
export class DapSourceResolver {
  constructor(private registry: FileSystemProviderRegistry) {}

  async getSourceContent(source: {
    path?: string;
    sourceReference?: number;
  }): Promise<string | undefined> {
    if (source.path) {
      try {
        const content = await this.registry.readFile('file://' + source.path);
        return new TextDecoder().decode(content);
      } catch {
        return undefined;
      }
    }
    // handle sourceReference (in-memory chunks from debug adapter)
    return undefined;
  }
}
```

### 15.3 S34 — Monaco Editor

O Monaco Editor consome o VFS atraves de:
- **FileService**: resolucao de URIs para abrir arquivos
- **ModelService**: criacao de modelos de texto a partir de conteudo VFS
- **Save participate**: escrita do modelo de volta ao VFS
- **Encoding**: deteccao de encoding antes de criar o modelo

```typescript
// Bridge between VFS and Monaco
import { editor, Uri } from 'monaco-editor';

export class MonacoVfsBridge {
  constructor(
    private registry: FileSystemProviderRegistry,
    private encodingService: EncodingService
  ) {}

  async openInMonaco(vfsUri: string): Promise<editor.ITextModel> {
    const raw = await this.registry.readFile(vfsUri);
    const encoding = this.encodingService.detectEncoding(raw);
    const text = this.encodingService.decode(raw, encoding);
    const noBom = this.encodingService.detectEncoding(raw) !== 'utf-8'
      ? text
      : new TextDecoder().decode(this.stripBom(raw));

    const monacoUri = Uri.parse(vfsUri);
    return editor.createModel(noBom, undefined, monacoUri);
  }

  async saveFromMonaco(monacoUri: Uri): Promise<void> {
    const model = editor.getModel(monacoUri);
    if (!model) return;

    const text = model.getValue();
    const encoded = this.encodingService.encode(text, 'utf-8');
    await this.registry.writeFile(monacoUri.toString(), encoded);
  }

  private stripBom(buffer: Uint8Array): Uint8Array {
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return buffer.slice(3);
    }
    return buffer;
  }
}
```

### 15.4 S36 — Extension Host

O Extension Host (sistema de extensoes VS Code-compativel) acessa o VFS atraves da API `workspace.fs` e `FileSystemProvider`. Toda extensao que interage com o sistema de arquivos usa estas APIs:

```typescript
// VS Code Extension API exposed to extensions
interface ExtensionFileSystem {
  readonly fs: {
    stat(uri: Uri): Promise<FileStat>;
    readFile(uri: Uri): Promise<Uint8Array>;
    writeFile(uri: Uri, content: Uint8Array): Promise<void>;
    readDirectory(uri: Uri): Promise<[string, FileType][]>;
    createDirectory(uri: Uri): Promise<void>;
    delete(uri: Uri, options?: { recursive?: boolean; useTrash?: boolean }): Promise<void>;
    rename(source: Uri, target: Uri, options?: { overwrite?: boolean }): Promise<void>;
  };
  registerFileSystemProvider(scheme: string, provider: FileSystemProvider): Disposable;
}
```

### 15.5 Resumo de Conexoes

| Estudo | Conexao | Forma de Integracao |
|--------|---------|---------------------|
| S11 (Theia) | FileSystemProvider interface | Compatibilidade total de interface, registro via Inversify |
| S21 (Terminal/Debug) | CWD, source files, breakpoints | DapSourceResolver, terminal cwd management |
| S34 (Monaco) | Model creation, encoding, save | MonacoVfsBridge com encoding detection |
| S36 (Extension Host) | workspace.fs, provider registration | API compativel com VS Code, permissoes por scheme |
| S12 (Testes) | File mocking | InMemoryFileSystemProvider para testes sem IO |

---

## 16. Plano de Implementacao

### Fase 1 — VFS Core (1 semana)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 1.1 | Implementar `parseUri`, `joinPath`, tipos base (`FileType`, `FileStat`, `FileChange`) | 4h |
| 1.2 | Implementar `FileSystemProvider` interface e `FileSystemProviderRegistry` | 4h |
| 1.3 | Implementar `DiskFileSystemProvider` completo (stat, read, write, delete, rename, copy, createDirectory) | 8h |
| 1.4 | Implementar `InMemoryFileSystemProvider` | 6h |
| 1.5 | Implementar `FileWatcherService` com chokidar, debounce/throttle, exclude patterns | 8h |
| 1.6 | Testes de unidade para VFS (todos providers + watcher) | 8h |

**Total Fase 1:** 38h

### Fase 2 — Workspace & File Operations (1 semana)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 2.1 | Implementar `WorkspaceService` (multi-root, settings, storage) | 10h |
| 2.2 | Implementar `WorkspaceStorageService` (global, workspace, folder scope) | 6h |
| 2.3 | Implementar `WorkspaceTrustService` | 4h |
| 2.4 | Implementar `FileOperationService` (coalescing, atomic writes, auto-save) | 8h |
| 2.5 | Implementar `EncodingService` + `EncodingDetector` + `LineEndingService` | 8h |
| 2.6 | Implementar `BinaryFileDetector` + `LargeFileHandler` | 4h |
| 2.7 | Implementar `ConflictResolver` | 4h |
| 2.8 | Testes de unidade para workspace e file operations | 8h |

**Total Fase 2:** 52h

### Fase 3 — File Explorer & Open Editors (4 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 3.1 | Implementar `FileTreeModel` (build tree, sort, filter, exclude) | 8h |
| 3.2 | Implementar `FileNestingService` | 4h |
| 3.3 | Implementar `DefaultGitDecorationProvider` | 6h |
| 3.4 | Implementar `OpenEditorsModel` (tabs, dirty, pin, preview, recent) | 6h |
| 3.5 | Testes | 6h |

**Total Fase 3:** 30h

### Fase 4 — Search & Bulk Operations (4 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 4.1 | Implementar `RipgrepSearchProvider` (build args, parse JSON output, signals) | 10h |
| 4.2 | Implementar `SearchService` (multi-provider, merge, open editors search) | 6h |
| 4.3 | Implementar `BulkFileOperator` (move, copy, delete, rename folder, undo) | 8h |
| 4.4 | Implementar `RefactoringService` (rename file with import updates) | 6h |
| 4.5 | Testes | 8h |

**Total Fase 4:** 38h

### Fase 5 — Language Detection & Monaco Bridge (3 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 5.1 | Implementar `LanguageService` (extension, filename, shebang, content detection) | 8h |
| 5.2 | Implementar `MonacoVfsBridge` | 4h |
| 5.3 | Implementar `DapSourceResolver` | 4h |
| 5.4 | Theia DI container integration (bind all services) | 6h |
| 5.5 | Testes de integracao | 8h |

**Total Fase 5:** 30h

### Cronograma

```
Semana 1: Fase 1 (VFS Core)
Semana 2: Fase 2 (Workspace & File Operations)
Semana 3: Fase 3 (File Explorer) + inicio Fase 4
Semana 4: Fase 4 (Search) + Fase 5 (Language & Bridge)
```

**Esforco total estimado:** ~188h (4-5 semanas)
**Dependencias:** NATS (F1), Theia Core (S11), Monaco (S34)
**Entregavel:** `packages/ideia-filesystem/` com todos os modulos, 200+ testes
