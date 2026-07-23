# ESTUDO S45 - Theia Workspace, Resources & URI System

> **Arquitetura do sistema de workspace, recursos, URIs e integracao com sistema de arquivos no Theia**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial - URI system, WorkspaceService, ResourceProvider, FileSystem providers, FileService, Watcher, TextModelService, PathService |
## Sumario

1. [Introducao](#1-introducao)
2. [URI System](#2-uri-system)
3. [Workspace Service](#3-workspace-service)
4. [Resource Provider](#4-resource-provider)
5. [File System Providers](#5-file-system-providers)
6. [File Service](#6-file-service)
7. [Watch System](#7-watch-system)
8. [Workspace Input/Output](#8-workspace-inputoutput)
9. [Text Model Service](#9-text-model-service)
10. [Path Service](#10-path-service)
11. [Resource Context Key](#11-resource-context-key)
12. [IDEIA-specific Enhancements](#12-ideia-specific-enhancements)
13. [Code Examples](#13-code-examples)
14. [Conexoes](#14-conexoes)
15. [Plano de Implementacao](#15-plano-de-implementacao)

---

## 1. Introducao

### 1.1 O que e a camada de Workspace/Resource

A camada de Workspace, Resources e URI do Theia e a abstracao fundamental sobre a qual toda a IDE e construida. Ela fornece:

- **URI System** - representacao universal de recursos (arquivos locais, remotos, em memoria, plugins)
- **Workspace Service** - gerenciamento de pastas do projeto, multi-root, trust e storage
- **Resource Provider** - abstracao de leitura/escrita de conteudo independente do protocolo
- **File System Providers** - implementacoes concretas (disco, memoria, zip, remoto)
- **File Service** - operacoes de arquivo com coalescencia, atomicidade e watch
- **Text Model Service** - modelos de texto em memoria com ref counting e save
- **Path Service** - manipulacao de paths cross-platform

`
+------------------------------------------------------------------+
|                  THEIA WORKSPACE & RESOURCE LAYER                   |
|                                                                      |
|  +--------------------------------------------------------------+  |
|  |                      WorkspaceService                          |  |
|  |  roots, trust, storage, workspace file, recent workspaces      |  |
|  +---------------------------+----------------------------------+  |
|                              |                                      |
|  +---------------------------v----------------------------------+  |
|  |               ResourceProvider / FileService                   |  |
|  |  read, write, watch, access, metadata, encoding, streaming     |  |
|  +-------------+---------------------------+--------------------+  |
|                |                           |                        |
|  +-------------v----------+  +-------------v-----------+          |
|  |  FileSystemProvider    |  |   TextModelService       |          |
|  |  (disk, mem, zip,      |  |   (ITextModel, ref        |          |
|  |   remote)              |  |    counting, save)        |          |
|  +------------------------+  +--------------------------+          |
|                |                                                     |
|  +-------------v-----------------------------------------------+  |
|  |                      URI / Path                               |  |
|  |  scheme, authority, path, query, fragment, resolution, glob   |  |
|  +--------------------------------------------------------------+  |
|                                                                      |
+------------------------------------------------------------------+
`

### 1.2 Arquitetura em camadas

Cada camada depende apenas da camada inferior, seguindo o principio de segregacao do Theia:

| Camada | Depende de | Responsabilidade |
|--------|-----------|-----------------|
| URI | Nenhuma | Representacao imutavel de identificador de recurso |
| Path | Nenhuma | Manipulacao de paths de arquivo (normalizacao, join, relative) |
| ResourceProvider | URI, Event | Abstracao de recurso unico (read/write/stream) |
| FileSystemProvider | URI, Path | Implementacao concreta de operacoes de FS por scheme |
| FileService | ResourceProvider, FileSystemProvider | Orquestracao de operacoes de arquivo com watch |
| TextModelService | ResourceProvider, FileService | Modelo de texto em memoria com dirty tracking |
| WorkspaceService | FileService, ResourceProvider | Gerenciamento de pastas do workspace |
| Watcher | FileService, Event | Monitoramento de mudancas no FS |

### 1.3 Pacotes Theia envolvidos

| Pacote | Responsabilidade | Artefatos Principais |
|--------|-----------------|----------------------|
| @theia/core | URI, Path, Event, Disposable, ResourceProvider | URI, Path, IResourceProvider, Resource |
| @theia/filesystem | FileService, FileSystemProvider, Watcher | FileService, FileSystemProvider, FileStat, FileWatcher |
| @theia/workspace | WorkspaceService, workspace file | WorkspaceService, WorkspaceInput, WorkspaceData |
| @theia/editor | TextModelService, ITextModel | TextModelService, ITextModel, ModelRef |
| @theia/filesystem/lib/common/filesystem-watcher-protocol | Watch events | FileChangeEvent, FileChangeType, WatchOptions |
| @theia/vs-code-extension | Override/extension URI schemes | VSCODE_SCHEME, inMemoryScheme |

---
## 2. URI System

### 2.1 URI Class

A classe URI do Theia e imutavel e representa um identificador uniforme de recurso. Ela e baseada no padrao RFC 3986 com extensoes para ambientes de IDE.

```
URI = scheme ":" hier-part [ "?" query ] [ "#" fragment ]
hier-part = "//" authority path-abempty / path-absolute / path-rootless / path-empty
```

```typescript
export class URI {
    protected readonly codeUri: Uri; // Monaco Uri

    constructor(uri?: string | Uri | URI) {
        if (!uri) { this.codeUri = Uri.parse(''); }
        else if (typeof uri === 'string') { this.codeUri = Uri.parse(uri); }
        else if (uri instanceof URI) { this.codeUri = uri.codeUri; }
        else { this.codeUri = uri; }
    }

    get scheme(): string { return this.codeUri.scheme; }
    get authority(): string { return this.codeUri.authority; }
    get path(): Path { return new Path(this.codeUri.path); }
    get query(): string { return this.codeUri.query ?? ''; }
    get fragment(): string { return this.codeUri.fragment ?? ''; }

    withScheme(scheme: string): URI { return new URI(this.codeUri.with({ scheme })); }
    withAuthority(authority: string): URI { return new URI(this.codeUri.with({ authority })); }
    withPath(path: Path | string): URI { return new URI(this.codeUri.with({ path: path.toString() })); }
    withQuery(query: string): URI { return new URI(this.codeUri.with({ query })); }
    withFragment(fragment: string): URI { return new URI(this.codeUri.with({ fragment })); }
}
```

Properties of URI class:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| scheme | string | Resource protocol | 'file', 'inmemory', 'theia' |
| authority | string | Authority component (host) | 'localhost:3000', '' |
| path | Path | Resource path | '/home/user/file.ts' |
| query | string | Query string | 'line=10&col=5' |
| fragment | string | Fragment | 'L10', 'selection' |

### 2.2 URI Parsing & Validation

Theia delegates URI parsing to Monaco Editor (Uri.parse), implementing full RFC 3986 parser.

```typescript
export class URIValidator {
    static readonly SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*$/;
    static readonly URI_PATTERN = /^([a-zA-Z][a-zA-Z0-9+.-]*):(\/\/[^\/]*)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/;

    static isValid(uri: string): boolean { return this.URI_PATTERN.test(uri); }
    static validateScheme(scheme: string): boolean { return this.SCHEME_PATTERN.test(scheme); }

    static assertValid(uri: string | URI): void {
        const str = typeof uri === 'string' ? uri : uri.toString();
        if (!this.isValid(str)) throw new Error('Invalid URI: ' + str);
    }

    static isAbsolute(path: string): boolean { return path.startsWith('/'); }
    static normalizeScheme(scheme: string): string { return scheme.toLowerCase(); }
}
```

### 2.3 URI Resolution & Comparison

```typescript
export class URI {
    resolve(relative: string | URI): URI {
        const rel = typeof relative === 'string' ? new URI(relative) : relative;
        if (rel.scheme && rel.scheme.length > 0) return rel;
        if (rel.path.isAbsolute) return this.withPath(rel.path);
        const basePath = this.path.dir.toString();
        const resolvedPath = Path.join(basePath, rel.path.toString());
        return this.withPath(resolvedPath).withQuery(rel.query).withFragment(rel.fragment);
    }

    relativeTo(base: URI): URI | undefined {
        const basePath = base.path.toString();
        const thisPath = this.path.toString();
        if (!thisPath.startsWith(basePath)) return;
        const relPath = thisPath.slice(basePath.length).replace(/^\//, '');
        return new URI().withPath(relPath).withQuery(this.query).withFragment(this.fragment);
    }

    equals(other: URI, exact = false): boolean {
        if (exact) return this.toString() === other.toString();
        return this.scheme.toLowerCase() === other.scheme.toLowerCase()
            && this.authority.toLowerCase() === other.authority.toLowerCase()
            && this.path.toString().toLowerCase() === other.path.toString().toLowerCase()
            && this.query === other.query
            && this.fragment === other.fragment;
    }

    isEqualOrParent(other: URI): boolean {
        const thisStr = this.path.toString().replace(/\/$/, '');
        const otherStr = other.path.toString().replace(/\/$/, '');
        return otherStr.startsWith(thisStr);
    }
}
```
### 2.4 URI Serialization

```typescript
export class URI {
    toString(skipEncoding?: boolean): string {
        return this.codeUri.toString(skipEncoding);
    }

    toJSON(): any {
        return {
            scheme: this.scheme, authority: this.authority,
            path: this.path.toString(), query: this.query, fragment: this.fragment
        };
    }

    toFsPath(): string {
        if (this.scheme !== 'file') {
            throw new Error('Cannot convert non-file URI to fsPath: ' + this.toString());
        }
        return this.path.toString();
    }

    toDisplayString(): string {
        if (this.scheme === 'file') return this.path.toString();
        return this.toString();
    }

    static revive(data: any): URI {
        if (data instanceof URI) return data;
        if (typeof data === 'string') return new URI(data);
        if (data && data.scheme) {
            let uri = new URI().withScheme(data.scheme).withPath(data.path ?? '');
            if (data.authority) uri = uri.withAuthority(data.authority);
            if (data.query) uri = uri.withQuery(data.query);
            if (data.fragment) uri = uri.withFragment(data.fragment);
            return uri;
        }
        throw new Error('Cannot revive URI from: ' + JSON.stringify(data));
    }
}
```

### 2.5 Custom URI Schemes

Theia supports custom schemes registered by extensions:

| Scheme | Provider | Usage |
|--------|----------|-------|
| file | Disk | Local filesystem files |
| inmemory | InMemory | In-memory resources (build output, temp) |
| theia | TheiaCore | Built-in Theia resources |
| plugin | PluginHost | VS Code extension resources |
| vscode | VSCodeCompat | VS Code extension compatibility |
| zip | ZipProvider | Files inside ZIP archives |
| output | OutputService | Output channels as resources |

```typescript
// Custom scheme registration via FileSystemProvider
export interface FileSystemProvider {
    readonly scheme: string;
    // ... operations
}

// FileService maintains scheme -> provider map
export class FileService {
    private readonly providers = new Map<string, FileSystemProvider>();

    registerProvider(scheme: string, provider: FileSystemProvider): Disposable {
        this.providers.set(scheme, provider);
        return Disposable.create(() => this.providers.delete(scheme));
    }

    getProvider(scheme: string): FileSystemProvider | undefined {
        return this.providers.get(scheme);
    }
}
```

### 2.6 URI Codec & Encoding

```typescript
export class URLCodec {
    static encodePath(path: string): string {
        return path.split('/').map(segment =>
            encodeURIComponent(segment)
                .replace(/%2F/g, '/').replace(/%3A/g, ':')
                .replace(/%40/g, '@').replace(/%24/g, '$')
                .replace(/%2C/g, ',')
        ).join('/');
    }

    static decodePath(encoded: string): string {
        return encoded.split('/').map(segment =>
            decodeURIComponent(segment)
        ).join('/');
    }

    static normalize(uri: string): string {
        try {
            const parsed = new URL(uri);
            return parsed.toString();
        } catch {
            return uri.replace(/ /g, '%20')
                .replace(/\[/g, '%5B').replace(/\]/g, '%5D')
                .replace(/\|/g, '%7C');
        }
    }

    static fromFsPath(fsPath: string): string {
        const normalized = fsPath.replace(/\\/g, '/');
        if (normalized.startsWith('/')) return 'file://' + normalized;
        if (/^[a-zA-Z]:\//.test(normalized)) return 'file:///' + normalized;
        return 'file:///' + normalized;
    }
}
```

---

## 3. Workspace Service

### 3.1 WorkspaceService Interface

The WorkspaceService is the central point for workspace management. It is registered as a singleton in the Inversify container.

```typescript
export interface WorkspaceService {
    readonly workspace: WorkspaceInput | undefined;
    readonly roots: Promise<URI[]>;
    readonly isMultiRoot: boolean;
    readonly isFolderWorkspace: boolean;
    readonly isWorkspaceFile: boolean;
    readonly saved: boolean;
    readonly trusted: boolean;

    getRoot(uri: URI): Promise<URI | undefined>;
    getWorkspaceFile(): URI | undefined;
    getWorkspaceRootUri(): URI | undefined;

    open(uri: URI, options?: WorkspaceInput): Promise<void>;
    close(): Promise<void>;
    save(): Promise<void>;

    getRecentWorkspaces(): Promise<RecentWorkspace[]>;
    addRecentWorkspace(uri: URI): Promise<void>;
    removeRecentWorkspace(uri: URI): Promise<void>;

    readonly onRootChanged: Event<URI[]>;
    readonly onWorkspaceLocationChanged: Event<URI | undefined>;
    readonly onWorkspaceSaved: Event<void>;

    requestTrust(): Promise<boolean>;
    isTrusted(): boolean;
    markAsTrusted(): Promise<void>;
}
```
### 3.2 Workspace Roots Management

Root management follows the multi-root model:

```
+------------------------------------------------------------------+
|                         WorkspaceService                           |
|                                                                     |
|  roots: URI[]                                                       |
|    +-- URI('file:///home/user/project-a')   [Root 0]                |
|    +-- URI('file:///home/user/project-b')   [Root 1]                |
|    +-- URI('file:///home/user/libs/shared') [Root 2]                |
|                                                                     |
|  getRoot(uri: URI): URI | undefined                                 |
|    +-- Returns the most specific root containing `uri`              |
|                                                                     |
|  onRootChanged: Event<URI[]>                                        |
|    +-- Fired when roots are added/removed                          |
+------------------------------------------------------------------+
```

```typescript
export class DefaultWorkspaceService implements WorkspaceService {
    protected _roots: URI[] = [];
    protected _workspaceFile: URI | undefined;
    protected _trusted = false;

    constructor(
        @inject(FileService) protected readonly fileService: FileService,
        @inject(StorageService) protected readonly storage: StorageService,
        @inject(ILogger) protected readonly logger: ILogger
    ) {}

    get roots(): Promise<URI[]> { return Promise.resolve([...this._roots]); }

    async getRoot(uri: URI): Promise<URI | undefined> {
        const roots = await this.roots;
        return roots.find(root => uri.isEqualOrParent(root));
    }

    async addRoot(root: URI): Promise<void> {
        if (this._roots.some(r => r.toString() === root.toString())) return;
        this._roots.push(root);
        this._onRootChanged.fire([...this._roots]);
    }

    async removeRoot(root: URI): Promise<void> {
        const idx = this._roots.findIndex(r => r.equals(root));
        if (idx >= 0) {
            this._roots.splice(idx, 1);
            this._onRootChanged.fire([...this._roots]);
        }
    }

    async setRoots(roots: URI[]): Promise<void> {
        this._roots = [...roots];
        this._onRootChanged.fire([...this._roots]);
    }

    get isMultiRoot(): boolean { return this._roots.length > 1; }
    get isFolderWorkspace(): boolean { return !this._workspaceFile && this._roots.length === 1; }
    get isWorkspaceFile(): boolean { return !!this._workspaceFile; }
}
```

### 3.3 Multi-Root Workspace File (.theia-workspace)

The .theia-workspace format (compatible with .code-workspace) is a JSON file describing workspace folders, settings, and recommended extensions.

```typescript
export interface WorkspaceData {
    folders: WorkspaceFolderDescription[];
    settings?: { [key: string]: any };
    extensions?: { recommendations?: string[]; unwantedRecommendations?: string[]; };
}

export interface WorkspaceFolderDescription {
    path: string;
    name?: string;
}

// .theia-workspace file format:
// { "folders": [
//     { "path": "/home/user/frontend" },
//     { "name": "Backend", "path": "/home/user/backend" }
//   ],
//   "settings": { "editor.tabSize": 2 },
//   "extensions": { "recommendations": ["dbaeumer.vscode-eslint"] }
// }

export class WorkspaceDataParser {
    static async parse(content: string): Promise<WorkspaceData> {
        const data = JSON.parse(content);
        if (!data.folders || !Array.isArray(data.folders)) {
            throw new Error('Invalid workspace file: "folders" array required');
        }
        return {
            folders: data.folders.map((f: any) => ({ path: f.path, name: f.name })),
            settings: data.settings || {},
            extensions: data.extensions
        };
    }

    static serialize(data: WorkspaceData): string {
        return JSON.stringify(data, null, 4);
    }
}
```

### 3.4 Workspace vs Folder Mode

| Mode | Description | File | Roots |
|------|-------------|------|-------|
| Folder | Single folder opened | None | 1 (the folder) |
| Workspace | Multi-root with config file | .theia-workspace | 1+ |

```typescript
export class WorkspaceService {
    get isFolderWorkspace(): boolean {
        return this._workspaceFile === undefined && this._roots.length === 1;
    }

    get isWorkspaceFile(): boolean {
        return this._workspaceFile !== undefined;
    }

    get workspace(): WorkspaceInput | undefined {
        if (this._workspaceFile) {
            return { resource: this._workspaceFile, name: this._workspaceFile.path.base };
        }
        if (this._roots.length === 1) {
            return { resource: this._roots[0], name: this._roots[0].path.base };
        }
        return undefined;
    }

    async getWorkspaceStorageUri(): Promise<URI> {
        if (this._workspaceFile) return this._workspaceFile;
        const roots = await this.roots;
        if (roots.length === 1) return roots[0];
        const hash = await this.computeRootsHash(roots);
        return new URI().withScheme('workspace-storage').withPath('/' + hash);
    }

    private async computeRootsHash(roots: URI[]): Promise<string> {
        const concatenated = roots.map(r => r.toString()).sort().join('|');
        const encoder = new TextEncoder();
        const data = encoder.encode(concatenated);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    }
}
```
### 3.5 Recent Workspaces

```typescript
export interface RecentWorkspace {
    uri: URI;
    label: string;
    timestamp: number;
    lastOpened: Date;
}

export const RECENT_WORKSPACES_KEY = 'recentWorkspaces';
export const MAX_RECENT_WORKSPACES = 20;

export class RecentWorkspacesManager {
    constructor(@inject(StorageService) protected readonly storage: StorageService) {}

    async getRecent(): Promise<RecentWorkspace[]> {
        const data = await this.storage.getData<RecentWorkspace[]>(RECENT_WORKSPACES_KEY);
        return data ?? [];
    }

    async addRecent(uri: URI): Promise<void> {
        let recent = await this.getRecent();
        recent = recent.filter(r => !r.uri.equals(uri));
        recent.unshift({
            uri, label: uri.path.base || uri.toString(),
            timestamp: Date.now(), lastOpened: new Date()
        });
        if (recent.length > MAX_RECENT_WORKSPACES) recent = recent.slice(0, MAX_RECENT_WORKSPACES);
        await this.storage.setData(RECENT_WORKSPACES_KEY, recent);
    }

    async removeRecent(uri: URI): Promise<void> {
        let recent = await this.getRecent();
        recent = recent.filter(r => !r.uri.equals(uri));
        await this.storage.setData(RECENT_WORKSPACES_KEY, recent);
    }

    async clearRecent(): Promise<void> {
        await this.storage.setData(RECENT_WORKSPACES_KEY, []);
    }
}
```

### 3.6 Workspace Trust Model

The Theia trust model evaluates whether a workspace is trustworthy before enabling potentially dangerous features.

```typescript
export enum WorkspaceTrustState {
    Unknown = 'unknown', Trusted = 'trusted',
    Untrusted = 'untrusted', Restricted = 'restricted'
}

export class WorkspaceTrustService {
    protected trustCache = new Map<string, WorkspaceTrustState>();

    constructor(
        @inject(FileService) protected readonly fileService: FileService,
        @inject(StorageService) protected readonly storage: StorageService
    ) {}

    async evaluateWorkspace(roots: URI[]): Promise<WorkspaceTrustState> {
        const results = await Promise.all(roots.map(root => this.evaluateRoot(root)));
        const states = new Set(results);
        if (states.size === 1 && states.has(WorkspaceTrustState.Trusted)) return WorkspaceTrustState.Trusted;
        if (states.has(WorkspaceTrustState.Untrusted)) return WorkspaceTrustState.Untrusted;
        if (states.has(WorkspaceTrustState.Restricted)) return WorkspaceTrustState.Restricted;
        return WorkspaceTrustState.Unknown;
    }

    protected async evaluateRoot(root: URI): Promise<WorkspaceTrustState> {
        const key = root.toString();
        const cached = this.trustCache.get(key);
        if (cached) return cached;

        const gitDir = root.resolve('.git');
        try {
            const stat = await this.fileService.stat(gitDir);
            if (stat && stat.isDirectory) {
                this.trustCache.set(key, WorkspaceTrustState.Trusted);
                return WorkspaceTrustState.Trusted;
            }
        } catch {}

        const manifests = ['package.json', 'Cargo.toml', 'pyproject.toml', 'go.mod'];
        for (const manifest of manifests) {
            try {
                const stat = await this.fileService.stat(root.resolve(manifest));
                if (stat && stat.isFile) {
                    this.trustCache.set(key, WorkspaceTrustState.Trusted);
                    return WorkspaceTrustState.Trusted;
                }
            } catch {}
        }

        const pathStr = root.path.toString();
        const untrustedPatterns = ['/tmp/', '/var/tmp/', '/Users/Shared/'];
        if (untrustedPatterns.some(p => pathStr.includes(p))) return WorkspaceTrustState.Untrusted;

        this.trustCache.set(key, WorkspaceTrustState.Restricted);
        return WorkspaceTrustState.Restricted;
    }

    async markTrusted(uri: URI): Promise<void> {
        this.trustCache.set(uri.toString(), WorkspaceTrustState.Trusted);
        await this.persistTrustedWorkspaces();
    }

    async persistTrustedWorkspaces(): Promise<void> {
        const trusted: string[] = [];
        for (const [uri, state] of this.trustCache) {
            if (state === WorkspaceTrustState.Trusted) trusted.push(uri);
        }
        await this.storage.setData('trustedWorkspaces', trusted);
    }
}
```

### 3.7 Workspace Data Storage

The StorageService provides key-value persistence scoped by workspace.

```typescript
export interface StorageService {
    getData<T>(key: string): Promise<T | undefined>;
    setData<T>(key: string, data: T): Promise<void>;
    removeData(key: string): Promise<void>;
}

// Storage scopes:
// 1. Global: shared across all workspaces
// 2. Workspace: specific to the opened workspace
// 3. Folder: specific to each folder (multi-root)

export class ScopedStorageService implements StorageService {
    constructor(
        protected readonly storageService: StorageService,
        protected readonly scopePrefix: string
    ) {}

    async getData<T>(key: string): Promise<T | undefined> {
        return this.storageService.getData(this.scopePrefix + ':' + key);
    }

    async setData<T>(key: string, data: T): Promise<void> {
        return this.storageService.setData(this.scopePrefix + ':' + key, data);
    }

    async removeData(key: string): Promise<void> {
        return this.storageService.removeData(this.scopePrefix + ':' + key);
    }
}
```
---

## 4. Resource Provider

### 4.1 IResourceProvider Interface

The IResourceProvider is the lowest-level abstraction for resource content access.

```typescript
export interface IResourceProvider {
    resolve(uri: URI): Promise<Resource>;
}

export interface Resource {
    readonly uri: URI;
    readonly encoding: string;
    readonly mtime: number;
    readonly etag: string;
    readonly isReadonly: boolean;

    readContents(options?: ReadOptions): Promise<string>;
    readStream(options?: ReadOptions): Promise<ReadableStream<string>>;
    writeContents(content: string, options?: WriteOptions): Promise<void>;
    writeStream(stream: ReadableStream<string>, options?: WriteOptions): Promise<void>;
    dispose(): void;
}

export interface ReadOptions { encoding?: string; position?: number; length?: number; }
export interface WriteOptions { encoding?: string; overwrite?: boolean; create?: boolean; backup?: boolean; }
```

### 4.2 Resource Creation & Disposal

```typescript
export class DefaultResourceProvider implements IResourceProvider {
    constructor(@inject(FileService) protected readonly fileService: FileService) {}

    async resolve(uri: URI): Promise<Resource> {
        const stat = await this.fileService.stat(uri).catch(() => undefined);
        return new DefaultResource(uri, this.fileService, stat);
    }
}

export class DefaultResource implements Resource {
    private _disposed = false;
    private readonly _encoding: string;
    private readonly _mtime: number;
    private readonly _etag: string;

    constructor(
        public readonly uri: URI,
        protected readonly fileService: FileService,
        protected readonly stat?: FileStat
    ) {
        this._encoding = 'utf-8';
        this._mtime = stat?.mtime ?? Date.now();
        this._etag = this.computeEtag();
    }

    get encoding(): string { return this._encoding; }
    get mtime(): number { return this._mtime; }
    get etag(): string { return this._etag; }
    get isReadonly(): boolean { return this.stat?.permissions?.writable === false; }

    async readContents(options?: ReadOptions): Promise<string> {
        this.assertNotDisposed();
        const content = await this.fileService.read(this.uri);
        return new TextDecoder(this._encoding).decode(content);
    }

    async readStream(options?: ReadOptions): Promise<ReadableStream<string>> {
        this.assertNotDisposed();
        const stream = await this.fileService.readStream(this.uri);
        return stream.pipeThrough(new TextDecoderStream(this._encoding));
    }

    async writeContents(content: string, options?: WriteOptions): Promise<void> {
        this.assertNotDisposed();
        const encoder = new TextEncoder();
        await this.fileService.write(this.uri, encoder.encode(content), {
            overwrite: options?.overwrite ?? true, create: options?.create ?? true
        });
    }

    async writeStream(stream: ReadableStream<string>, options?: WriteOptions): Promise<void> {
        this.assertNotDisposed();
        const binaryStream = stream.pipeThrough(new TextEncoderStream());
        await this.fileService.writeStream(this.uri, binaryStream, {
            overwrite: options?.overwrite ?? true
        });
    }

    dispose(): void { this._disposed = true; }
    protected computeEtag(): string { return this.uri.toString() + ':' + this._mtime + ':' + (this.stat?.size ?? 0); }
    protected assertNotDisposed(): void { if (this._disposed) throw new Error('Resource disposed: ' + this.uri.toString()); }
}
```

### 4.3 Resource Streaming

```typescript
export class ResourceStreamManager {
    async readInChunks(
        resource: Resource, chunkSize: number,
        onChunk: (chunk: string) => Promise<void>
    ): Promise<void> {
        const stream = await resource.readStream();
        const reader = stream.getReader();
        try {
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) { if (buffer.length > 0) await onChunk(buffer); break; }
                buffer += value;
                while (buffer.length >= chunkSize) {
                    const chunk = buffer.slice(0, chunkSize);
                    buffer = buffer.slice(chunkSize);
                    await onChunk(chunk);
                }
            }
        } finally { reader.releaseLock(); }
    }

    async pipeResourceToTarget(source: Resource, target: Resource): Promise<void> {
        const readStream = await source.readStream();
        const decodedStream = readStream.pipeThrough(new TextEncoderStream());
        await target.writeStream(decodedStream as unknown as ReadableStream<string>);
    }
}
```

### 4.4 Resource Watching & Access Checks

```typescript
export interface ResourceWatcher {
    onDidChange: Event<ResourceChangeEvent>;
    dispose(): void;
}

export interface ResourceChangeEvent {
    uri: URI;
    type: 'created' | 'updated' | 'deleted';
    resource: Resource;
}

export class ResourceWatchService {
    protected watchers = new Map<string, ResourceWatcher>();

    constructor(
        @inject(FileService) protected readonly fileService: FileService,
        @inject(IResourceProvider) protected readonly resourceProvider: IResourceProvider
    ) {}

    async watch(uri: URI): Promise<ResourceWatcher> {
        const key = uri.toString();
        if (this.watchers.has(key)) return this.watchers.get(key)!;

        const watcher = await this.fileService.watch(uri);
        const resource = await this.resourceProvider.resolve(uri);

        const adapted: ResourceWatcher = {
            onDidChange: (listener) => {
                return watcher.onDidChange(async (changes) => {
                    for (const change of changes) {
                        if (change.resource.toString() === key) {
                            listener({
                                uri: change.resource,
                                type: this.mapChangeType(change.type),
                                resource: await this.resourceProvider.resolve(uri)
                            });
                        }
                    }
                });
            },
            dispose: () => { watcher.dispose(); this.watchers.delete(key); }
        };

        this.watchers.set(key, adapted);
        return adapted;
    }

    protected mapChangeType(type: FileChangeType): 'created' | 'updated' | 'deleted' {
        switch (type) {
            case FileChangeType.CREATED: return 'created';
            case FileChangeType.UPDATED: return 'updated';
            case FileChangeType.DELETED: return 'deleted';
        }
    }
}
```
---

## 5. File System Providers

### 5.1 Provider Registration & Capabilities

Theia registers FileSystemProvider implementations associated with URI schemes. Each provider declares its capabilities.

```typescript
export interface FileSystemProviderCapabilities {
    reading: boolean; writing: boolean; watching: boolean;
    streaming: boolean; trash: boolean; symlinks: boolean;
    atomicWrite: boolean; fileLocks: boolean; pathCaseSensitive: boolean;
}

export const DEFAULT_CAPABILITIES: FileSystemProviderCapabilities = {
    reading: true, writing: true, watching: false,
    streaming: false, trash: false, symlinks: false,
    atomicWrite: true, fileLocks: false,
    pathCaseSensitive: process.platform !== 'win32'
};

export interface FileSystemProvider {
    readonly scheme: string;
    readonly capabilities: FileSystemProviderCapabilities;
    readonly onDidChange: Event<FileChange[]>;

    stat(uri: URI): Promise<FileStat>;
    readFile(uri: URI): Promise<Uint8Array>;
    writeFile(uri: URI, content: Uint8Array, options?: FileWriteOptions): Promise<void>;
    readDirectory(uri: URI): Promise<[string, FileType][]>;
    createDirectory(uri: URI): Promise<void>;
    delete(uri: URI, options?: FileDeleteOptions): Promise<void>;
    rename(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void>;
    copy(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void>;
    readFileStream(uri: URI): Promise<ReadableStream<Uint8Array>>;
    writeFileStream(uri: URI, stream: ReadableStream<Uint8Array>, options?: FileWriteOptions): Promise<void>;
    watch(resource: URI, options?: WatchOptions): Disposable & { onDidChange: Event<FileChange[]> };
    access(uri: URI, mode: number): Promise<boolean>;
}
```

### 5.2 DiskFileSystemProvider

```typescript
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';

export class DiskFileSystemProvider implements FileSystemProvider {
    readonly scheme = 'file';
    readonly capabilities: FileSystemProviderCapabilities = {
        ...DEFAULT_CAPABILITIES, watching: true, streaming: true,
        trash: true, symlinks: true, atomicWrite: true,
        pathCaseSensitive: process.platform !== 'win32'
    };

    protected readonly changeEmitter = new Emitter<FileChange[]>();
    get onDidChange(): Event<FileChange[]> { return this.changeEmitter.event; }

    protected uriToFsPath(uri: URI): string {
        if (uri.scheme !== 'file') throw new Error('Expected file scheme, got ' + uri.scheme);
        return uri.path.toString();
    }

    async stat(uri: URI): Promise<FileStat> {
        const fsPath = this.uriToFsPath(uri);
        const stats = await fsp.stat(fsPath);
        return {
            type: stats.isFile() ? FileType.FILE : stats.isDirectory() ? FileType.DIRECTORY
                : stats.isSymbolicLink() ? FileType.SYMBOLIC_LINK : FileType.UNKNOWN,
            ctime: stats.ctimeMs, mtime: stats.mtimeMs, size: stats.size,
            permissions: {
                readable: (stats.mode & 0o444) !== 0,
                writable: (stats.mode & 0o222) !== 0,
                executable: (stats.mode & 0o111) !== 0
            }
        };
    }

    async readFile(uri: URI): Promise<Uint8Array> { return fsp.readFile(this.uriToFsPath(uri)); }

    async writeFile(uri: URI, content: Uint8Array, options?: FileWriteOptions): Promise<void> {
        const fsPath = this.uriToFsPath(uri);
        if (options?.atomic !== false) {
            const tmpPath = fsPath + '.~theia-tmp';
            await fsp.writeFile(tmpPath, content);
            await fsp.rename(tmpPath, fsPath);
        } else {
            await fsp.writeFile(fsPath, content);
        }
    }

    async readDirectory(uri: URI): Promise<[string, FileType][]> {
        const fsPath = this.uriToFsPath(uri);
        const entries = await fsp.readdir(fsPath, { withFileTypes: true });
        return entries.map((entry): [string, FileType] => [
            entry.name,
            entry.isFile() ? FileType.FILE : entry.isDirectory() ? FileType.DIRECTORY
                : entry.isSymbolicLink() ? FileType.SYMBOLIC_LINK : FileType.UNKNOWN
        ]);
    }

    async createDirectory(uri: URI): Promise<void> { await fsp.mkdir(this.uriToFsPath(uri), { recursive: true }); }

    async delete(uri: URI, options?: FileDeleteOptions): Promise<void> {
        const fsPath = this.uriToFsPath(uri);
        if (options?.useTrash) { await this.moveToTrash(fsPath); }
        else { await fsp.rm(fsPath, { recursive: options?.recursive ?? false, force: true }); }
    }

    async rename(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void> {
        const srcPath = this.uriToFsPath(source);
        const tgtPath = this.uriToFsPath(target);
        if (options?.overwrite) await fsp.unlink(tgtPath).catch(() => {});
        await fsp.rename(srcPath, tgtPath);
    }

    async copy(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void> {
        const srcPath = this.uriToFsPath(source);
        const tgtPath = this.uriToFsPath(target);
        await fsp.cp(srcPath, tgtPath, { recursive: true, force: options?.overwrite ?? false });
    }

    async readFileStream(uri: URI): Promise<ReadableStream<Uint8Array>> {
        const fsPath = this.uriToFsPath(uri);
        const nodeStream = fs.createReadStream(fsPath);
        return new ReadableStream({
            start(controller) {
                nodeStream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
                nodeStream.on('end', () => controller.close());
                nodeStream.on('error', (err) => controller.error(err));
            }
        });
    }

    async access(uri: URI, mode: number): Promise<boolean> {
        try { await fsp.access(this.uriToFsPath(uri), mode); return true; }
        catch { return false; }
    }
}
```
### 5.3 InMemoryFileSystemProvider

```typescript
export class InMemoryFileSystemProvider implements FileSystemProvider {
    readonly scheme = 'inmemory';
    readonly capabilities: FileSystemProviderCapabilities = {
        ...DEFAULT_CAPABILITIES, watching: true, pathCaseSensitive: true
    };

    protected readonly store = new Map<string, InMemoryEntry>();
    protected readonly changeEmitter = new Emitter<FileChange[]>();
    get onDidChange(): Event<FileChange[]> { return this.changeEmitter.event; }

    protected normalizePath(uri: URI): string {
        return uri.path.toString().replace(/\/$/, '') || '/';
    }

    async stat(uri: URI): Promise<FileStat> {
        const path = this.normalizePath(uri);
        const entry = this.store.get(path);
        if (!entry) throw new FileNotFound(uri);
        return {
            type: entry.type, ctime: entry.ctime, mtime: entry.mtime,
            size: entry.type === FileType.FILE ? (entry as InMemoryFile).content.byteLength : 0,
            permissions: { readable: true, writable: true, executable: false }
        };
    }

    async readFile(uri: URI): Promise<Uint8Array> {
        const path = this.normalizePath(uri);
        const entry = this.store.get(path);
        if (!entry || entry.type !== FileType.FILE) throw new FileNotFound(uri);
        return (entry as InMemoryFile).content;
    }

    async writeFile(uri: URI, content: Uint8Array, options?: FileWriteOptions): Promise<void> {
        const path = this.normalizePath(uri);
        const existing = this.store.get(path) as InMemoryFile | undefined;
        this.store.set(path, {
            type: FileType.FILE, name: uri.path.base, content,
            ctime: existing?.ctime ?? Date.now(), mtime: Date.now()
        });
        this.ensureParentDirectories(path);
        this.changeEmitter.fire([{ resource: uri, type: existing ? FileChangeType.UPDATED : FileChangeType.CREATED }]);
    }

    async readDirectory(uri: URI): Promise<[string, FileType][]> {
        const path = this.normalizePath(uri);
        const prefix = path === '/' ? '' : path + '/';
        const entries = new Map<string, FileType>();
        for (const [key, entry] of this.store) {
            if (key.startsWith(prefix) && key !== path) {
                const relative = key.slice(prefix.length);
                const name = relative.split('/')[0];
                if (!entries.has(name)) entries.set(name, entry.type);
            }
        }
        return Array.from(entries.entries());
    }

    async createDirectory(uri: URI): Promise<void> {
        const path = this.normalizePath(uri);
        if (this.store.has(path)) return;
        this.store.set(path, { type: FileType.DIRECTORY, name: uri.path.base, ctime: Date.now(), mtime: Date.now() });
        this.ensureParentDirectories(path);
        this.changeEmitter.fire([{ resource: uri, type: FileChangeType.CREATED }]);
    }

    async delete(uri: URI, options?: FileDeleteOptions): Promise<void> {
        const path = this.normalizePath(uri);
        if (options?.recursive) {
            const prefix = path === '/' ? '' : path + '/';
            for (const key of this.store.keys()) {
                if (key === path || key.startsWith(prefix)) this.store.delete(key);
            }
        } else { this.store.delete(path); }
        this.changeEmitter.fire([{ resource: uri, type: FileChangeType.DELETED }]);
    }

    async rename(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void> {
        const content = await this.readFile(source);
        await this.writeFile(target, content);
        await this.delete(source);
    }

    async copy(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void> {
        const content = await this.readFile(source);
        await this.writeFile(target, content);
    }

    watch(resource: URI, options?: WatchOptions): Disposable & { onDidChange: Event<FileChange[]> } {
        return { onDidChange: this.changeEmitter.event, dispose: () => {} };
    }

    async access(uri: URI, mode: number): Promise<boolean> {
        return this.store.has(this.normalizePath(uri));
    }

    protected ensureParentDirectories(path: string): void {
        const parts = path.split('/').filter(Boolean);
        let current = '';
        for (const part of parts.slice(0, -1)) {
            current += '/' + part;
            if (!this.store.has(current)) {
                this.store.set(current, { type: FileType.DIRECTORY, name: part, ctime: Date.now(), mtime: Date.now() });
            }
        }
    }
}

interface InMemoryEntry { type: FileType; name: string; ctime: number; mtime: number; }
interface InMemoryFile extends InMemoryEntry { type: FileType.FILE; content: Uint8Array; }
```

### 5.4 ZipFileSystemProvider

```typescript
export class ZipFileSystemProvider implements FileSystemProvider {
    readonly scheme = 'zip';
    readonly capabilities: FileSystemProviderCapabilities = {
        ...DEFAULT_CAPABILITIES, writing: false, streaming: false, pathCaseSensitive: false
    };

    protected archives = new Map<string, Map<string, Uint8Array>>();
    protected readonly changeEmitter = new Emitter<FileChange[]>();
    get onDidChange(): Event<FileChange[]> { return this.changeEmitter.event; }

    // URI: zip:///path/to/archive.zip/path/inside/file.ts
    protected parseZipUri(uri: URI): { archivePath: string; internalPath: string } {
        const fullPath = uri.path.toString();
        const zipIndex = fullPath.indexOf('.zip/');
        if (zipIndex === -1) throw new Error('Invalid zip URI: ' + uri.toString());
        return { archivePath: fullPath.slice(0, zipIndex + 4), internalPath: fullPath.slice(zipIndex + 4) };
    }

    async loadArchive(archivePath: string): Promise<Map<string, Uint8Array>> {
        if (this.archives.has(archivePath)) return this.archives.get(archivePath)!;
        const buffer = await fsp.readFile(archivePath);
        const { default: AdmZip } = await import('adm-zip');
        const zip = new AdmZip(buffer);
        const entries = new Map<string, Uint8Array>();
        for (const entry of zip.getEntries()) {
            if (!entry.isDirectory) entries.set(entry.entryName, entry.getData());
        }
        this.archives.set(archivePath, entries);
        return entries;
    }

    async stat(uri: URI): Promise<FileStat> {
        const { archivePath, internalPath } = this.parseZipUri(uri);
        const entries = await this.loadArchive(archivePath);
        const cleanPath = internalPath.replace(/^\//, '');
        if (entries.has(cleanPath)) return { type: FileType.FILE, ctime: 0, mtime: 0, size: entries.get(cleanPath)!.byteLength };
        const isDir = Array.from(entries.keys()).some(k => k.startsWith(cleanPath + '/'));
        if (isDir) return { type: FileType.DIRECTORY, ctime: 0, mtime: 0, size: 0 };
        throw new FileNotFound(uri);
    }

    async readFile(uri: URI): Promise<Uint8Array> {
        const { archivePath, internalPath } = this.parseZipUri(uri);
        const entries = await this.loadArchive(archivePath);
        const content = entries.get(internalPath.replace(/^\//, ''));
        if (!content) throw new FileNotFound(uri);
        return content;
    }
}
```
### 5.5 RemoteFileSystemProvider

```typescript
export class RemoteFileSystemProvider implements FileSystemProvider {
    readonly scheme: string;
    readonly capabilities: FileSystemProviderCapabilities = {
        ...DEFAULT_CAPABILITIES, streaming: true, pathCaseSensitive: false
    };

    protected readonly changeEmitter = new Emitter<FileChange[]>();
    get onDidChange(): Event<FileChange[]> { return this.changeEmitter.event; }

    constructor(public readonly scheme: string, protected readonly connection: RemoteConnection) {}

    async stat(uri: URI): Promise<FileStat> {
        return this.connection.sendRequest('stat', { uri: uri.toString() });
    }

    async readFile(uri: URI): Promise<Uint8Array> {
        const base64 = await this.connection.sendRequest('readFile', { uri: uri.toString() });
        return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    }

    async writeFile(uri: URI, content: Uint8Array, options?: FileWriteOptions): Promise<void> {
        const base64 = btoa(String.fromCharCode(...content));
        await this.connection.sendRequest('writeFile', { uri: uri.toString(), content: base64, options });
    }

    async readDirectory(uri: URI): Promise<[string, FileType][]> {
        return this.connection.sendRequest('readDirectory', { uri: uri.toString() });
    }

    async createDirectory(uri: URI): Promise<void> {
        await this.connection.sendRequest('createDirectory', { uri: uri.toString() });
    }

    async delete(uri: URI, options?: FileDeleteOptions): Promise<void> {
        await this.connection.sendRequest('delete', { uri: uri.toString(), options });
    }

    async rename(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void> {
        await this.connection.sendRequest('rename', { source: source.toString(), target: target.toString(), options });
    }

    async copy(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void> {
        await this.connection.sendRequest('copy', { source: source.toString(), target: target.toString(), options });
    }
}

interface RemoteConnection {
    sendRequest(method: string, params: any): Promise<any>;
}
```

### 5.6 Custom Provider Registration

```typescript
export class FileSystemProviderRegistry {
    protected readonly providers = new Map<string, FileSystemProvider>();
    protected readonly priorityList: FileSystemProvider[] = [];

    registerProvider(scheme: string, provider: FileSystemProvider): Disposable {
        this.providers.set(scheme, provider);
        this.priorityList.push(provider);
        return Disposable.create(() => {
            this.providers.delete(scheme);
            const idx = this.priorityList.indexOf(provider);
            if (idx >= 0) this.priorityList.splice(idx, 1);
        });
    }

    getProvider(uri: URI): FileSystemProvider {
        const scheme = uri.scheme;
        const provider = this.providers.get(scheme);
        if (!provider) throw new Error('No FileSystemProvider for scheme: ' + scheme);
        return provider;
    }

    hasProvider(scheme: string): boolean { return this.providers.has(scheme); }
    getAllProviders(): FileSystemProvider[] { return [...this.providers.values()]; }
    getAvailableSchemes(): string[] { return Array.from(this.providers.keys()); }
}

// Example: VS Code plugin file system provider
@injectable()
export class PluginFileSystemProvider implements FileSystemProvider {
    readonly scheme = 'vscode';
    readonly capabilities: FileSystemProviderCapabilities = {
        reading: true, writing: false, watching: false, streaming: false,
        trash: false, symlinks: false, atomicWrite: false, fileLocks: false, pathCaseSensitive: true
    };

    protected readonly changeEmitter = new Emitter<FileChange[]>();
    get onDidChange(): Event<FileChange[]> { return this.changeEmitter.event; }

    async stat(uri: URI): Promise<FileStat> {
        return { type: FileType.FILE, ctime: 0, mtime: 0, size: 0 };
    }

    async readFile(uri: URI): Promise<Uint8Array> {
        const resourcePath = uri.path.toString();
        const response = await fetch(resourcePath);
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
    }
}
```

---

## 6. File Service

### 6.1 FileService Interface

The FileService is the high-level abstraction for file operations.

```typescript
export interface FileService {
    read(uri: URI, options?: FileReadOptions): Promise<Uint8Array>;
    readStream(uri: URI, options?: FileReadOptions): Promise<ReadableStream<Uint8Array>>;
    write(uri: URI, content: Uint8Array, options?: FileWriteOptions): Promise<void>;
    writeStream(uri: URI, stream: ReadableStream<Uint8Array>, options?: FileWriteOptions): Promise<void>;
    create(uri: URI, options?: FileCreateOptions): Promise<void>;
    delete(uri: URI, options?: FileDeleteOptions): Promise<void>;
    rename(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void>;
    copy(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void>;
    stat(uri: URI): Promise<FileStat>;
    access(uri: URI, mode?: number): Promise<boolean>;
    readDirectory(uri: URI): Promise<[string, FileType][]>;
    createDirectory(uri: URI): Promise<void>;
    watch(uri: URI, options?: WatchOptions): Promise<Disposable & { onDidChange: Event<FileChange[]> }>;
    readonly onDidChange: Event<FileChangeEvent>;
    readonly onDidCreate: Event<FileChange>;
    readonly onDidDelete: Event<FileChange>;
    readonly onDidRename: Event<FileRenameEvent>;
}
```
### 6.2 File Operations

```typescript
export class DefaultFileService implements FileService {
    protected readonly changeEmitter = new Emitter<FileChangeEvent>();
    protected readonly renameEmitter = new Emitter<FileRenameEvent>();

    get onDidChange(): Event<FileChangeEvent> { return this.changeEmitter.event; }
    get onDidCreate(): Event<FileChange> { return this.filterEvent(FileChangeType.CREATED); }
    get onDidDelete(): Event<FileChange> { return this.filterEvent(FileChangeType.DELETED); }
    get onDidRename(): Event<FileRenameEvent> { return this.renameEmitter.event; }

    constructor(@inject(FileSystemProviderRegistry) protected readonly registry: FileSystemProviderRegistry) {}

    protected getProvider(uri: URI): FileSystemProvider { return this.registry.getProvider(uri); }

    async read(uri: URI, options?: FileReadOptions): Promise<Uint8Array> {
        return this.getProvider(uri).readFile(uri);
    }

    async readStream(uri: URI, options?: FileReadOptions): Promise<ReadableStream<Uint8Array>> {
        const provider = this.getProvider(uri);
        if (provider.capabilities.streaming) return provider.readFileStream(uri);
        const content = await provider.readFile(uri);
        return new ReadableStream({ start(controller) { controller.enqueue(content); controller.close(); } });
    }

    async write(uri: URI, content: Uint8Array, options?: FileWriteOptions): Promise<void> {
        const provider = this.getProvider(uri);
        const isNew = await this.isNewFile(uri);
        await provider.writeFile(uri, content, options);
        this.changeEmitter.fire([{ resource: uri, type: isNew ? FileChangeType.CREATED : FileChangeType.UPDATED }]);
    }

    async delete(uri: URI, options?: FileDeleteOptions): Promise<void> {
        await this.getProvider(uri).delete(uri, options);
        this.changeEmitter.fire([{ resource: uri, type: FileChangeType.DELETED }]);
    }

    async rename(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void> {
        await this.getProvider(source).rename(source, target, options);
        this.renameEmitter.fire({ oldResource: source, newResource: target });
        this.changeEmitter.fire([
            { resource: source, type: FileChangeType.DELETED },
            { resource: target, type: FileChangeType.CREATED }
        ]);
    }

    async copy(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void> {
        await this.getProvider(source).copy(source, target, options);
        this.changeEmitter.fire([{ resource: target, type: FileChangeType.CREATED }]);
    }

    async stat(uri: URI): Promise<FileStat> { return this.getProvider(uri).stat(uri); }
    async access(uri: URI, mode?: number): Promise<boolean> { return this.getProvider(uri).access(uri, mode ?? 0); }
    async readDirectory(uri: URI): Promise<[string, FileType][]> { return this.getProvider(uri).readDirectory(uri); }
    async createDirectory(uri: URI): Promise<void> {
        await this.getProvider(uri).createDirectory(uri);
        this.changeEmitter.fire([{ resource: uri, type: FileChangeType.CREATED }]);
    }

    protected async isNewFile(uri: URI): Promise<boolean> {
        try { await this.stat(uri); return false; } catch { return true; }
    }

    protected filterEvent(type: FileChangeType): Event<FileChange> {
        return (listener) => this.onDidChange((events) => {
            for (const event of events) { if (event.type === type) listener(event); }
        });
    }
}
```

### 6.3 Operation Options

```typescript
export interface FileReadOptions { encoding?: string; position?: number; length?: number; }
export interface FileWriteOptions {
    overwrite?: boolean; create?: boolean; createParents?: boolean;
    atomic?: boolean; encoding?: string; lock?: boolean; backup?: boolean;
}
export interface FileDeleteOptions { recursive?: boolean; useTrash?: boolean; moveToTrash?: boolean; }
export interface FileOverwriteOptions { overwrite?: boolean; }
export interface FileCreateOptions { overwrite?: boolean; createParents?: boolean; }
```

### 6.4 File Change Coalescing

```typescript
export class FileChangeCoalescer {
    protected readonly pending = new Map<string, FileChangeType>();
    protected flushTimeout: ReturnType<typeof setTimeout> | undefined;

    constructor(
        protected readonly emitter: Emitter<FileChangeEvent>,
        protected readonly coalesceWindow = 100
    ) {}

    push(change: FileChange): void {
        const key = change.resource.toString();
        const existing = this.pending.get(key);
        if (existing === FileChangeType.DELETED) return;
        if (existing === FileChangeType.CREATED && change.type === FileChangeType.DELETED) {
            this.pending.delete(key); return;
        }
        this.pending.set(key, change.type);
        if (!this.flushTimeout) this.flushTimeout = setTimeout(() => this.flush(), this.coalesceWindow);
    }

    pushBatch(changes: FileChange[]): void { for (const change of changes) this.push(change); }

    protected flush(): void {
        if (this.pending.size === 0) return;
        const events: FileChange[] = [];
        for (const [uri, type] of this.pending) events.push({ resource: new URI(uri), type });
        this.pending.clear();
        this.flushTimeout = undefined;
        this.emitter.fire(events);
    }

    dispose(): void {
        if (this.flushTimeout) { clearTimeout(this.flushTimeout); this.flushTimeout = undefined; }
        this.pending.clear();
    }
}
```
---

## 7. Watch System

### 7.1 FileWatcher

Theia uses a multi-layer watch system that abstracts native OS mechanisms.

```typescript
export interface FileWatcher {
    readonly onDidChange: Event<FileChange[]>;
    readonly onDidError: Event<Error>;
    dispose(): void;
}

export type WatcherBackend = 'native' | 'chokidar' | 'polling' | 'fs.watch';

export interface WatcherOptions {
    recursive: boolean; excludes: string[]; includes: string[]; depth: number;
    debounceMs: number; throttleMs: number; pollingIntervalMs: number;
    backend: WatcherBackend; followSymlinks: boolean;
}

export const DEFAULT_WATCHER_OPTIONS: WatcherOptions = {
    recursive: true,
    excludes: ['**/node_modules/**', '**/.git/**', '**/.hg/**', '**/.svn/**',
               '**/__pycache__/**', '**/.DS_Store', '**/Thumbs.db'],
    includes: [], depth: 0,
    debounceMs: 150, throttleMs: 200, pollingIntervalMs: 3000,
    backend: 'native', followSymlinks: false
};
```

### 7.2 Watch Strategy (native vs polling)

Theia automatically selects the best watch strategy based on the platform:

```
                         Watcher Strategy Selection
                                    |
        +---------------------------+---------------------------+
        |                           |                           |
    macOS FSEvents           Windows ReadDirChanges        Linux inotify
        |                           |                           |
        +---------------------------+---------------------------+
                                    |
                          chokidar fallback
                                    |
                          polling fallback
```

```typescript
export class WatcherStrategySelector {
    detectBestBackend(): WatcherBackend {
        if (process.platform === 'darwin') {
            try { require.resolve('fsevents'); return 'native'; }
            catch { return 'chokidar'; }
        }
        if (process.platform === 'win32') return 'chokidar';
        if (process.platform === 'linux') return 'chokidar';
        return 'polling';
    }

    async createWatcher(uri: URI, options: WatcherOptions): Promise<FileWatcher> {
        const backend = options.backend === 'native' ? this.detectBestBackend() : options.backend;
        switch (backend) {
            case 'native': return this.createChokidarWatcher(uri, options);
            case 'chokidar': return this.createChokidarWatcher(uri, options);
            case 'polling': return this.createPollingWatcher(uri, options);
            default: return this.createChokidarWatcher(uri, options);
        }
    }

    protected async createChokidarWatcher(uri: URI, options: WatcherOptions): Promise<FileWatcher> {
        const fsPath = uri.path.toString();
        const chokidar = await import('chokidar');
        const emitter = new Emitter<FileChange[]>();
        const errorEmitter = new Emitter<Error>();

        const raw = chokidar.watch(fsPath, {
            ignored: options.excludes, ignoreInitial: true,
            followSymlinks: options.followSymlinks,
            depth: options.depth || undefined,
            interval: options.pollingIntervalMs
        });

        raw.on('add', (p) => emitter.fire([{ resource: new URI().withScheme('file').withPath(p), type: FileChangeType.CREATED }]));
        raw.on('change', (p) => emitter.fire([{ resource: new URI().withScheme('file').withPath(p), type: FileChangeType.UPDATED }]));
        raw.on('unlink', (p) => emitter.fire([{ resource: new URI().withScheme('file').withPath(p), type: FileChangeType.DELETED }]));
        raw.on('addDir', (p) => emitter.fire([{ resource: new URI().withScheme('file').withPath(p), type: FileChangeType.CREATED }]));
        raw.on('unlinkDir', (p) => emitter.fire([{ resource: new URI().withScheme('file').withPath(p), type: FileChangeType.DELETED }]));
        raw.on('error', (e) => errorEmitter.fire(e));

        return {
            onDidChange: this.decorateWithDebounce(emitter, options),
            onDidError: errorEmitter.event,
            dispose: () => raw.close()
        };
    }

    protected decorateWithDebounce(emitter: Emitter<FileChange[]>, options: WatcherOptions): Event<FileChange[]> {
        let pending: FileChange[] = [];
        let timeout: ReturnType<typeof setTimeout> | undefined;
        let lastEmit = 0;

        return (listener) => emitter.event((events) => {
            pending.push(...events);
            const now = Date.now();
            if (now - lastEmit >= options.throttleMs) {
                if (pending.length === 0) return;
                const batch = [...pending]; pending = []; lastEmit = now;
                listener(batch);
            } else if (!timeout) {
                timeout = setTimeout(() => {
                    if (pending.length === 0) return;
                    const batch = [...pending]; pending = []; lastEmit = Date.now();
                    if (timeout) { clearTimeout(timeout); timeout = undefined; }
                    listener(batch);
                }, options.debounceMs);
            }
        });
    }
}
```

### 7.3 Watch Lifetime & Error Handling

```typescript
export class WatcherLifetimeManager {
    protected readonly activeWatchers = new Map<string, FileWatcher>();
    protected readonly watcherErrors = new Map<string, Error[]>();
    protected readonly MAX_RETRIES = 3;
    protected readonly RETRY_DELAY_MS = 2000;

    constructor(protected readonly watcherFactory: WatcherStrategySelector) {}

    async watch(uri: URI, options?: Partial<WatcherOptions>): Promise<FileWatcher> {
        const key = uri.toString();
        const existing = this.activeWatchers.get(key);
        if (existing) return existing;

        const watcher = await this.createWithRetry(uri, options);
        this.activeWatchers.set(key, watcher);

        watcher.onDidError((error) => this.handleWatcherError(key, error));
        return watcher;
    }

    protected async createWithRetry(uri: URI, options?: Partial<WatcherOptions>): Promise<FileWatcher> {
        let lastError: Error | undefined;
        for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) await new Promise(r => setTimeout(r, this.RETRY_DELAY_MS * attempt));
                return await this.watcherFactory.createWatcher(uri, { ...DEFAULT_WATCHER_OPTIONS, ...options });
            } catch (error) { lastError = error as Error; }
        }
        return this.watcherFactory.createWatcher(uri, { ...DEFAULT_WATCHER_OPTIONS, ...options, backend: 'polling', pollingIntervalMs: 5000 });
    }

    protected handleWatcherError(key: string, error: Error): void {
        const errors = this.watcherErrors.get(key) ?? [];
        errors.push(error);
        this.watcherErrors.set(key, errors);
        if (errors.length >= 3) this.restartWatcher(key);
    }

    protected async restartWatcher(key: string): Promise<void> {
        const existing = this.activeWatchers.get(key);
        if (existing) { existing.dispose(); this.activeWatchers.delete(key); }
        this.watcherErrors.delete(key);
        const watcher = await this.watcherFactory.createWatcher(new URI(key), {
            ...DEFAULT_WATCHER_OPTIONS, backend: 'polling', pollingIntervalMs: 5000
        });
        this.activeWatchers.set(key, watcher);
    }

    unwatch(uri: URI): void {
        const key = uri.toString();
        const watcher = this.activeWatchers.get(key);
        if (watcher) { watcher.dispose(); this.activeWatchers.delete(key); this.watcherErrors.delete(key); }
    }

    disposeAll(): void {
        for (const [, watcher] of this.activeWatchers) watcher.dispose();
        this.activeWatchers.clear(); this.watcherErrors.clear();
    }
}
```
---

## 8. Workspace Input/Output

### 8.1 FileStat & File Metadata

```typescript
export enum FileType { UNKNOWN = 0, FILE = 1, DIRECTORY = 2, SYMBOLIC_LINK = 64 }

export interface FileStat {
    type: FileType; ctime: number; mtime: number; size: number;
    permissions?: FilePermissions;
}

export interface FilePermissions { readable: boolean; writable: boolean; executable: boolean; }

export interface FileInfo extends FileStat {
    uri: URI; name: string; isSymbolicLink: boolean; isReadonly: boolean;
}

export function statToFileInfo(uri: URI, stat: FileStat): FileInfo {
    return {
        uri, name: uri.path.base, type: stat.type,
        ctime: stat.ctime, mtime: stat.mtime, size: stat.size,
        permissions: stat.permissions,
        isSymbolicLink: stat.type === FileType.SYMBOLIC_LINK,
        isReadonly: stat.permissions?.writable === false
    };
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024; const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
}
```

### 8.2 Directory Listing with Sorting

```typescript
export class DirectoryLister {
    constructor(@inject(FileService) protected readonly fileService: FileService) {}

    async listDirectory(uri: URI, options?: {
        sortBy?: 'name' | 'type' | 'size' | 'modified';
        sortOrder?: 'asc' | 'desc'; excludePatterns?: string[]; includeHidden?: boolean;
    }): Promise<FileInfo[]> {
        const entries = await this.fileService.readDirectory(uri);
        const filtered = entries.filter(([name]) => {
            if (!options?.includeHidden && name.startsWith('.')) return false;
            if (options?.excludePatterns) return !options.excludePatterns.some(p => this.matchGlob(name, p));
            return true;
        });

        const withStats = await Promise.all(filtered.map(async ([name, type]) => {
            const childUri = uri.resolve(name);
            try {
                const stat = await this.fileService.stat(childUri);
                return statToFileInfo(childUri, stat);
            } catch { return { uri: childUri, name, type, ctime: 0, mtime: 0, size: 0, isSymbolicLink: false, isReadonly: true }; }
        }));

        const dirs = withStats.filter(e => e.type === FileType.DIRECTORY);
        const files = withStats.filter(e => e.type !== FileType.DIRECTORY);
        const sortFn = this.getSortFunction(options?.sortBy ?? 'name', options?.sortOrder ?? 'asc');
        dirs.sort(sortFn); files.sort(sortFn);
        return [...dirs, ...files];
    }

    protected getSortFunction(sortBy: string, order: string): (a: FileInfo, b: FileInfo) => number {
        const dir = order === 'desc' ? -1 : 1;
        switch (sortBy) {
            case 'name': return (a, b) => dir * a.name.localeCompare(b.name);
            case 'type': return (a, b) => {
                const extA = a.name.split('.').pop() || '';
                const extB = b.name.split('.').pop() || '';
                return dir * extA.localeCompare(extB);
            };
            case 'size': return (a, b) => dir * (a.size - b.size);
            case 'modified': return (a, b) => dir * (a.mtime - b.mtime);
            default: return (a, b) => a.name.localeCompare(b.name);
        }
    }

    protected matchGlob(name: string, pattern: string): boolean {
        const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.') + '$');
        return regex.test(name);
    }
}
```

### 8.3 Binary vs Text Detection

```typescript
export class FileTypeDetector {
    static readonly TEXT_EXTENSIONS = new Set([
        '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
        '.json', '.jsonc', '.yaml', '.yml', '.toml',
        '.md', '.mdx', '.txt', '.html', '.htm', '.xml',
        '.css', '.scss', '.less', '.styl',
        '.py', '.rs', '.go', '.java', '.cpp', '.c', '.h', '.hpp',
        '.rb', '.php', '.swift', '.kt', '.sh', '.bash', '.ps1',
        '.sql', '.graphql', '.proto', '.env', '.gitignore',
    ]);

    static readonly BINARY_EXTENSIONS = new Set([
        '.png', '.jpg', '.jpeg', '.gif', '.ico',
        '.woff', '.woff2', '.ttf', '.eot', '.otf',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
        '.zip', '.tar', '.gz', '.7z', '.rar',
        '.exe', '.dll', '.so', '.dylib',
        '.class', '.pyc', '.pyo',
        '.mp3', '.mp4', '.avi', '.mov', '.mkv',
        '.wasm',
    ]);

    static isBinaryUri(uri: URI): boolean {
        const ext = uri.path.ext.toLowerCase();
        if (this.BINARY_EXTENSIONS.has(ext)) return true;
        if (this.TEXT_EXTENSIONS.has(ext)) return false;
        return false;
    }

    static isBinaryContent(buffer: Uint8Array): boolean {
        if (buffer.length === 0) return false;
        const checkLen = Math.min(buffer.length, 8192);
        let nullCount = 0;
        for (let i = 0; i < checkLen; i++) { if (buffer[i] === 0) nullCount++; }
        return nullCount > checkLen * 0.01;
    }

    static async detect(uri: URI, fileService: FileService): Promise<'text' | 'binary'> {
        if (this.isBinaryUri(uri)) return 'binary';
        if (!this.TEXT_EXTENSIONS.has(uri.path.ext.toLowerCase())) {
            try {
                const content = await fileService.read(uri);
                return this.isBinaryContent(content) ? 'binary' : 'text';
            } catch { return 'binary'; }
        }
        return 'text';
    }
}
```
### 8.4 Large File Preview

```typescript
export class LargeFileHandler {
    static readonly PREVIEW_LIMIT = 50 * 1024 * 1024; // 50 MB
    static readonly FULL_LIMIT = 2 * 1024 * 1024;     // 2 MB
    static readonly MAX_LIMIT = 250 * 1024 * 1024;    // 250 MB

    static getMode(size: number): 'full' | 'preview' | 'structural' | 'reject' {
        if (size > this.MAX_LIMIT) return 'reject';
        if (size <= this.FULL_LIMIT) return 'full';
        if (size <= this.PREVIEW_LIMIT) return 'preview';
        return 'structural';
    }

    static async readPreview(uri: URI, fileService: FileService, maxLines = 1000): Promise<{ lines: string[]; truncated: boolean }> {
        const stat = await fileService.stat(uri);
        const mode = this.getMode(stat.size);
        if (mode === 'reject') throw new Error('File too large: ' + uri.toString());

        const stream = await fileService.readStream(uri);
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        const lines: string[] = [];
        let buffer = ''; let lineCount = 0; let truncated = false;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n');
                for (let i = 0; i < parts.length - 1 && lineCount < maxLines; i++) {
                    lines.push(parts[i]); lineCount++;
                }
                buffer = parts[parts.length - 1];
                if (lineCount >= maxLines && !done) { truncated = true; break; }
            }
            if (lineCount < maxLines && buffer.length > 0) lines.push(buffer);
        } finally { reader.releaseLock(); }
        return { lines, truncated };
    }
}
```

---

## 9. Text Model Service

### 9.1 TextModelService Interface

TextModelService manages in-memory text models representing opened file contents.

```typescript
export interface TextModelService {
    createModelReference(uri: URI): Promise<Reference<ITextModel>>;
    getModel(uri: URI): ITextModel | undefined;
    getModels(): ITextModel[];
    onDidCreateModel: Event<ITextModel>;
    onDidRemoveModel: Event<ITextModel>;
}

export interface Reference<T> extends Disposable {
    readonly object: T;
}

export interface ITextModel extends Disposable {
    readonly uri: URI;
    readonly languageId: string;
    readonly encoding: string;
    readonly versionId: number;
    readonly dirty: boolean;
    readonly readonly: boolean;

    getText(): string;
    getTextRange(start: number, end: number): string;
    getLineCount(): number;
    getLineContent(line: number): string;
    getPositionAt(offset: number): Position;
    getOffsetAt(position: Position): number;

    setText(newText: string): void;
    applyEdits(edits: TextEdit[]): void;

    save(): Promise<void>;
    reload(): Promise<void>;

    onDidChangeContent: Event<TextModelContentChangeEvent>;
    onDidChangeDirty: Event<boolean>;
    onDidSaveModel: Event<URI>;
}
```

### 9.2 ITextModel & Model Lifecycle

```typescript
export class DefaultTextModel implements ITextModel {
    protected _versionId = 0;
    protected _dirty = false;
    protected _text: string;
    protected readonly changeEmitter = new Emitter<TextModelContentChangeEvent>();
    protected readonly dirtyEmitter = new Emitter<boolean>();
    protected readonly saveEmitter = new Emitter<URI>();
    protected _disposed = false;

    constructor(
        public readonly uri: URI, public readonly languageId: string,
        public readonly encoding: string, initialText = '',
        public readonly readonly = false,
        @inject(FileService) protected readonly fileService: FileService
    ) { this._text = initialText; }

    get versionId(): number { return this._versionId; }
    get dirty(): boolean { return this._dirty; }
    getText(): string { return this._text; }

    getLineContent(line: number): string {
        const lines = this._text.split('\n');
        return (line >= 0 && line < lines.length) ? lines[line] : '';
    }

    getPositionAt(offset: number): Position {
        const textBefore = this._text.slice(0, offset);
        const line = textBefore.split('\n').length - 1;
        const lastNewline = textBefore.lastIndexOf('\n');
        const column = offset - (lastNewline >= 0 ? lastNewline + 1 : 0);
        return { line, column };
    }

    setText(newText: string): void {
        this._text = newText; this._versionId++; this._dirty = true;
        this.changeEmitter.fire({ model: this, changes: [], versionId: this._versionId });
        this.dirtyEmitter.fire(true);
    }

    applyEdits(edits: TextEdit[]): void {
        const sorted = [...edits].sort((a, b) =>
            b.range.startLine - a.range.startLine || b.range.startColumn - a.range.startColumn
        );
        for (const edit of sorted) {
            const startOffset = this.getOffsetAt(edit.range.start);
            const endOffset = this.getOffsetAt(edit.range.end);
            this._text = this._text.slice(0, startOffset) + edit.text + this._text.slice(endOffset);
        }
        this._versionId++; this._dirty = true;
        this.changeEmitter.fire({ model: this, changes: edits, versionId: this._versionId });
        this.dirtyEmitter.fire(true);
    }

    async save(): Promise<void> {
        if (!this._dirty) return;
        await this.fileService.write(this.uri, new TextEncoder().encode(this._text));
        this._dirty = false; this.dirtyEmitter.fire(false); this.saveEmitter.fire(this.uri);
    }

    async reload(): Promise<void> {
        const content = await this.fileService.read(this.uri);
        this._text = new TextDecoder(this.encoding).decode(content);
        this._versionId++; this._dirty = false; this.dirtyEmitter.fire(false);
    }

    get onDidChangeContent(): Event<TextModelContentChangeEvent> { return this.changeEmitter.event; }
    get onDidChangeDirty(): Event<boolean> { return this.dirtyEmitter.event; }
    get onDidSaveModel(): Event<URI> { return this.saveEmitter.event; }

    dispose(): void { this._disposed = true; this.changeEmitter.dispose(); this.dirtyEmitter.dispose(); this.saveEmitter.dispose(); }
}
```

### 9.3 Model Reference Counting & Dispose

```typescript
export class ReferenceCountingManager {
    protected references = new Map<string, number>();
    protected models = new Map<string, ITextModel>();
    protected readonly removeEmitter = new Emitter<ITextModel>();
    get onDidRemoveModel(): Event<ITextModel> { return this.removeEmitter.event; }

    acquire(uri: URI, model: ITextModel): Reference<ITextModel> {
        const key = uri.toString();
        const count = this.references.get(key) ?? 0;
        this.references.set(key, count + 1);
        this.models.set(key, model);
        return { object: model, dispose: () => this.release(key) };
    }

    protected release(key: string): void {
        const count = this.references.get(key);
        if (count === undefined) return;
        if (count <= 1) {
            const model = this.models.get(key);
            if (model) { this.removeEmitter.fire(model); model.dispose(); this.models.delete(key); }
            this.references.delete(key);
        } else { this.references.set(key, count - 1); }
    }

    getModel(uri: URI): ITextModel | undefined { return this.models.get(uri.toString()); }
    getRefCount(uri: URI): number { return this.references.get(uri.toString()) ?? 0; }
}
```
---

## 10. Path Service

### 10.1 Path Class Architecture

The Path class is the fundamental building block for filesystem path manipulation in Theia.

```typescript
export class Path {
    protected _raw: string;
    protected _normalized: string;

    constructor(path: string) {
        this._raw = path;
        this._normalized = this.normalize(path);
    }

    get raw(): string { return this._raw; }
    get normalized(): string { return this._normalized; }

    // Components
    get scheme(): string { return ''; } // Path has no scheme
    get isAbsolute(): boolean { return this._normalized.startsWith('/'); }
    get isRoot(): boolean { return this._normalized === '/'; }
    get root(): Path { return this.isAbsolute ? new Path('/') : new Path(''); }
    get base(): string { return this._normalized.split('/').filter(Boolean).pop() ?? ''; }
    get name(): string {
        const base = this.base;
        const dotIndex = base.lastIndexOf('.');
        return dotIndex > 0 ? base.slice(0, dotIndex) : base;
    }
    get ext(): string {
        const base = this.base;
        const dotIndex = base.lastIndexOf('.');
        return dotIndex >= 0 ? base.slice(dotIndex) : '';
    }
    get dir(): Path {
        const parts = this._normalized.split('/').filter(Boolean);
        parts.pop();
        if (parts.length === 0) return this.isAbsolute ? new Path('/') : new Path('');
        return new Path((this.isAbsolute ? '/' : '') + parts.join('/'));
    }

    toString(): string { return this._normalized; }

    // Returns a relative path from this to the given path
    relative(other: Path): Path | undefined {
        const thisParts = this._normalized.split('/').filter(Boolean);
        const otherParts = other._normalized.split('/').filter(Boolean);
        let i = 0;
        while (i < thisParts.length && i < otherParts.length && thisParts[i] === otherParts[i]) i++;
        const ups = thisParts.length - i;
        const downs = otherParts.slice(i);
        const relativeParts = [...Array(ups).fill('..'), ...downs];
        return relativeParts.length > 0 ? new Path(relativeParts.join('/')) : undefined;
    }

    // Join paths
    static join(...segments: string[]): string {
        const parts: string[] = [];
        for (const seg of segments) {
            if (!seg) continue;
            if (seg.startsWith('/')) {
                parts.length = 0;
                parts.push(...seg.split('/').filter(Boolean));
            } else {
                parts.push(...seg.split('/').filter(Boolean));
            }
        }
        return '/' + parts.join('/');
    }

    protected normalize(p: string): string {
        // Normalize path separators
        let normalized = p.replace(/\\/g, '/');
        // Remove trailing slash (except for root)
        if (normalized.length > 1 && normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }
        // Resolve . and ..
        const parts = normalized.split('/');
        const resolved: string[] = [];
        for (const part of parts) {
            if (part === '.' || part === '') continue;
            if (part === '..') { resolved.pop(); }
            else { resolved.push(part); }
        }
        const result = (normalized.startsWith('/') ? '/' : '') + resolved.join('/');
        return result || '/';
    }

    equals(other: Path): boolean {
        return this._normalized === other._normalized;
    }

    static compare(a: Path, b: Path): number {
        return a._normalized.localeCompare(b._normalized);
    }
}
```

### 10.2 Path Glob Matching

```typescript
export class PathGlobMatcher {
    static match(path: string, pattern: string): boolean {
        const regexStr = this.globToRegex(pattern);
        const normalized = path.replace(/\\/g, '/');
        return new RegExp('^' + regexStr + '$', 'i').test(normalized);
    }

    static filter(paths: string[], patterns: string[]): string[] {
        const includes = patterns.filter(p => !p.startsWith('!'));
        const excludes = patterns.filter(p => p.startsWith('!')).map(p => p.slice(1));

        return paths.filter(p => {
            const included = includes.length === 0 || includes.some(inc => this.match(p, inc));
            const excluded = excludes.some(exc => this.match(p, exc));
            return included && !excluded;
        });
    }

    static globToRegex(pattern: string): string {
        let regex = '';
        let i = 0;
        while (i < pattern.length) {
            const c = pattern[i];
            if (c === '*') {
                if (i + 1 < pattern.length && pattern[i + 1] === '*') {
                    regex += '.*';
                    i += 2;
                    if (i < pattern.length && pattern[i] === '/') i++;
                } else {
                    regex += '[^/]*';
                    i++;
                }
            } else if (c === '?') {
                regex += '.';
                i++;
            } else if (c === '.') {
                regex += '\\.';
                i++;
            } else if (c === '{') {
                const end = pattern.indexOf('}', i);
                const choices = pattern.slice(i + 1, end).split(',');
                regex += '(' + choices.map(c => this.globToRegex(c.trim())).join('|') + ')';
                i = end + 1;
            } else if (c === '[') {
                const end = pattern.indexOf(']', i);
                regex += pattern.slice(i, end + 1);
                i = end + 1;
            } else {
                regex += c;
                i++;
            }
        }
        return regex;
    }
}
```

### 10.3 Path Extension Handling

```typescript
export class PathExtensionHandler {
    static readonly ARCHIVE_EXTENSIONS = new Set(['.zip', '.tar', '.gz', '.7z', '.rar']);
    static readonly CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.cpp', '.c']);

    static isArchive(ext: string): boolean {
        return this.ARCHIVE_EXTENSIONS.has(ext.toLowerCase());
    }

    static isCodeFile(ext: string): boolean {
        return this.CODE_EXTENSIONS.has(ext.toLowerCase());
    }

    static isMinified(name: string): boolean {
        return name.includes('.min.') || name.includes('.bundle.') || name.includes('.chunk.');
    }

    static getLanguageFromExtension(ext: string): string | undefined {
        const map: Record<string, string> = {
            '.ts': 'typescript', '.tsx': 'typescriptreact', '.js': 'javascript',
            '.jsx': 'javascriptreact', '.json': 'json', '.md': 'markdown',
            '.py': 'python', '.rs': 'rust', '.go': 'go',
            '.java': 'java', '.cpp': 'cpp', '.c': 'c',
            '.html': 'html', '.css': 'css', '.scss': 'scss',
            '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
            '.xml': 'xml', '.sql': 'sql', '.sh': 'shellscript',
        };
        return map[ext.toLowerCase()];
    }
}
```

---

## 11. Resource Context Key

### 11.1 Workspace When Clauses

Theia uses when clauses to conditionally enable commands and UI elements based on workspace and resource context.

```typescript
// Built-in workspace context keys:
// workspaceFolderCount   - number of workspace folders
// isMultiRoot            - true if more than one root
// workspaceTrusted       - true if workspace is trusted
// resourceScheme         - URI scheme of the active resource
// resourceFilename       - filename of the active resource
// resourceExt            - extension of the active resource
// resourceLangId         - language ID of the active resource
// inWorkspace            - true if active resource is within workspace
// activeEditorIsDirty    - true if active editor has unsaved changes

export class WorkspaceContextKeys {
    static readonly WORKSPACE_FOLDER_COUNT = 'workspaceFolderCount';
    static readonly IS_MULTI_ROOT = 'isMultiRoot';
    static readonly WORKSPACE_TRUSTED = 'workspaceTrusted';
    static readonly RESOURCE_SCHEME = 'resourceScheme';
    static readonly RESOURCE_FILENAME = 'resourceFilename';
    static readonly RESOURCE_EXT = 'resourceExt';
    static readonly RESOURCE_LANG_ID = 'resourceLangId';
    static readonly IN_WORKSPACE = 'inWorkspace';
    static readonly ACTIVE_EDITOR_DIRTY = 'activeEditorIsDirty';

    // All context keys with their types
    static readonly ALL: Record<string, string> = {
        [this.WORKSPACE_FOLDER_COUNT]: 'number',
        [this.IS_MULTI_ROOT]: 'boolean',
        [this.WORKSPACE_TRUSTED]: 'boolean',
        [this.RESOURCE_SCHEME]: 'string',
        [this.RESOURCE_FILENAME]: 'string',
        [this.RESOURCE_EXT]: 'string',
        [this.RESOURCE_LANG_ID]: 'string',
        [this.IN_WORKSPACE]: 'boolean',
        [this.ACTIVE_EDITOR_DIRTY]: 'boolean',
    };
}

// Example when clause usage:
// "when": "resourceExt == .ts && workspaceFolderCount >= 2"
// "when": "resourceScheme == file && isMultiRoot"
// "when": "activeEditorIsDirty && resourceLangId == typescript"
```
---

## 12. IDEIA-specific Enhancements

### 12.1 Virtual Workspace Overlays

IDEIA extends the workspace model with virtual overlays that layer AI-generated content on top of the real filesystem.

```typescript
@injectable()
export class IDEIAVirtualOverlayProvider implements FileSystemProvider {
    readonly scheme = 'ideia-overlay';
    readonly capabilities: FileSystemProviderCapabilities = {
        ...DEFAULT_CAPABILITIES, watching: true, pathCaseSensitive: false
    };

    // Maps real URIs to overlay (suggested) content
    protected overlays = new Map<string, Uint8Array>();
    protected readonly changeEmitter = new Emitter<FileChange[]>();
    get onDidChange(): Event<FileChange[]> { return this.changeEmitter.event; }

    async applySuggestion(originalUri: URI, suggestedContent: Uint8Array): Promise<void> {
        const key = originalUri.toString();
        this.overlays.set(key, suggestedContent);
        this.changeEmitter.fire([{ resource: originalUri, type: FileChangeType.UPDATED }]);
    }

    async clearSuggestion(originalUri: URI): Promise<void> {
        const key = originalUri.toString();
        this.overlays.delete(key);
        this.changeEmitter.fire([{ resource: originalUri, type: FileChangeType.UPDATED }]);
    }

    hasOverlay(uri: URI): boolean { return this.overlays.has(uri.toString()); }

    async stat(uri: URI): Promise<FileStat> {
        return { type: FileType.FILE, ctime: Date.now(), mtime: Date.now(), size: this.overlays.get(uri.toString())?.length ?? 0 };
    }

    async readFile(uri: URI): Promise<Uint8Array> {
        const content = this.overlays.get(uri.toString());
        if (!content) throw new Error('No overlay for: ' + uri.toString());
        return content;
    }
}
```

### 12.2 AI-Aware Resource Metadata

IDEIA attaches AI-specific metadata to resources for agent annotations.

```typescript
export interface IDEIAResourceMetadata {
    lastAgentAccess: number;
    agentAnnotations: AgentAnnotation[];
    relevanceScore: number;
    suggestedActions: SuggestedAction[];
}

export interface AgentAnnotation {
    agentId: string;
    timestamp: number;
    type: 'analysis' | 'suggestion' | 'warning' | 'review';
    message: string;
}

export interface SuggestedAction {
    type: 'refactor' | 'fix' | 'optimize' | 'document';
    description: string;
    priority: number;
}

export class IDEIAResourceMetadataService {
    protected metadata = new Map<string, IDEIAResourceMetadata>();

    getMetadata(uri: URI): IDEIAResourceMetadata | undefined {
        return this.metadata.get(uri.toString());
    }

    setMetadata(uri: URI, metadata: IDEIAResourceMetadata): void {
        this.metadata.set(uri.toString(), metadata);
    }

    addAnnotation(uri: URI, annotation: AgentAnnotation): void {
        const key = uri.toString();
        const existing = this.metadata.get(key) ?? {
            lastAgentAccess: Date.now(), agentAnnotations: [], relevanceScore: 0, suggestedActions: []
        };
        existing.agentAnnotations.push(annotation);
        existing.lastAgentAccess = Date.now();
        this.metadata.set(key, existing);
    }

    clearAnnotations(uri: URI): void {
        const key = uri.toString();
        const existing = this.metadata.get(key);
        if (existing) {
            existing.agentAnnotations = [];
            this.metadata.set(key, existing);
        }
    }
}
```

### 12.3 Context-Rich File Access with Agent Permissions

```typescript
@injectable()
export class IDEIAFileAccessController {
    constructor(
        @inject(FileService) protected readonly fileService: FileService,
        @inject(IDEIAResourceMetadataService) protected readonly metadataService: IDEIAResourceMetadataService
    ) {}

    async agentRead(uri: URI, agentId: string): Promise<Uint8Array> {
        await this.checkAgentPermission(uri, agentId, 'read');

        // Track access
        this.metadataService.addAnnotation(uri, {
            agentId, timestamp: Date.now(),
            type: 'analysis', message: 'Agent ' + agentId + ' read this file'
        });

        return this.fileService.read(uri);
    }

    async agentWrite(uri: URI, content: Uint8Array, agentId: string): Promise<void> {
        await this.checkAgentPermission(uri, agentId, 'write');

        // Create backup before agent writes
        try {
            const original = await this.fileService.read(uri);
            await this.fileService.write(uri + '.ideia-backup', original);
        } catch {}

        await this.fileService.write(uri, content);

        this.metadataService.addAnnotation(uri, {
            agentId, timestamp: Date.now(),
            type: 'suggestion', message: 'Agent ' + agentId + ' modified this file'
        });
    }

    protected async checkAgentPermission(uri: URI, agentId: string, operation: string): Promise<void> {
        const root = await this.getWorkspaceRoot(uri);
        if (!root) throw new Error('File outside workspace: ' + uri.toString());
        // Additional policy checks delegated to PolicyEngine
    }

    protected async getWorkspaceRoot(uri: URI): Promise<URI | undefined> {
        // Delegate to WorkspaceService
        throw new Error('Not implemented');
    }
}
```

### 12.4 Temp Workspace for Agent Operations

```typescript
@injectable()
export class IDEIATempWorkspace {
    constructor(
        @inject(InMemoryFileSystemProvider) protected readonly memFs: InMemoryFileSystemProvider,
        @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService
    ) {}

    async createTempRoot(label: string): Promise<URI> {
        const tempUri = new URI().withScheme('inmemory').withPath('/tmp/' + label + '/' + Date.now());
        await this.memFs.createDirectory(tempUri);
        return tempUri;
    }

    async writeTempFile(tempRoot: URI, relativePath: string, content: Uint8Array): Promise<URI> {
        const fileUri = tempRoot.resolve(relativePath);
        await this.memFs.writeFile(fileUri, content);
        return fileUri;
    }

    async readTempFile(uri: URI): Promise<Uint8Array> {
        return this.memFs.readFile(uri);
    }

    async listTempFiles(tempRoot: URI): Promise<URI[]> {
        const entries = await this.memFs.readDirectory(tempRoot);
        return entries.map(([name]) => tempRoot.resolve(name));
    }

    async disposeTempRoot(tempRoot: URI): Promise<void> {
        await this.memFs.delete(tempRoot, { recursive: true });
    }

    // Agent task workspace: auto-cleaned temp workspace for a specific task
    async createAgentTaskWorkspace(taskId: string): Promise<URI> {
        return this.createTempRoot('agent-task-' + taskId);
    }
}
```

---

## 13. Code Examples

### 13.1 URI Creation & Manipulation

```typescript
import { URI } from '@theia/core/lib/common/uri';

// Creating URIs
const fileUri = new URI('file:///home/user/project/src/index.ts');
const fromFsPath = URI.fromFilePath('/home/user/project/package.json');
const inMemory = new URI('inmemory:///tmp/build-output/bundle.js');

// URI components
console.log(fileUri.scheme);      // 'file'
console.log(fileUri.path.toString()); // '/home/user/project/src/index.ts'
console.log(fileUri.path.base);   // 'index.ts'
console.log(fileUri.path.ext);    // '.ts'
console.log(fileUri.path.name);   // 'index'

// URI manipulation (immutable - returns new URIs)
const parent = fileUri.parent;                    // file:///home/user/project/src
const withQuery = fileUri.withQuery('line=10');   // file:///.../index.ts?line=10
const withFragment = fileUri.withFragment('L10'); // file:///.../index.ts#L10

// Resolution
const resolved = fileUri.resolve('../utils/helpers.ts');
// file:///home/user/project/src/utils/helpers.ts

const relative = fileUri.relativeTo(new URI('file:///home/user/project'));
// src/index.ts

// Comparison
const same = fileUri.equals(new URI('file:///home/user/project/src/index.ts')); // true
const isParent = new URI('file:///home/user/project').isEqualOrParent(fileUri); // true
```
### 13.2 WorkspaceService Root Management

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { URI } from '@theia/core/lib/common/uri';
import { FileService } from '@theia/filesystem/lib/browser/file-service';

@injectable()
export class IDEIAWorkspaceManager {
    constructor(
        @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService,
        @inject(FileService) protected readonly fileService: FileService
    ) {}

    async initializeWorkspace(): Promise<void> {
        const roots = await this.workspaceService.roots;

        console.log('Workspace roots:', roots.map(r => r.toString()));

        // Check if multi-root
        if (this.workspaceService.isMultiRoot) {
            console.log('Multi-root workspace with ' + roots.length + ' roots');
        }

        // Get workspace file location
        const wsFile = this.workspaceService.getWorkspaceFile();
        if (wsFile) {
            console.log('Workspace file:', wsFile.toString());
        }

        // Get root for a specific URI
        const fileUri = new URI('file:///home/user/project/src/file.ts');
        const root = await this.workspaceService.getRoot(fileUri);
        if (root) {
            console.log('File belongs to root:', root.toString());
        }

        // Listen for root changes
        this.workspaceService.onRootChanged((newRoots) => {
            console.log('Roots changed:', newRoots.map(r => r.toString()));
        });
    }

    async addFolderToWorkspace(folderUri: URI): Promise<void> {
        // Check if folder exists
        try {
            const stat = await this.fileService.stat(folderUri);
            if (stat && stat.isDirectory) {
                // In a real Theia extension, use workspaceService.addRoot
                console.log('Adding folder:', folderUri.toString());
            }
        } catch {
            console.error('Folder does not exist:', folderUri.toString());
        }
    }
}
```

### 13.3 Custom FileSystemProvider Registration

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import {
    FileSystemProvider, FileStat, FileType, FileChange,
    FileChangeType, FileWriteOptions, FileDeleteOptions, FileOverwriteOptions
} from '@theia/filesystem/lib/common/filesystem-provider';
import { URI } from '@theia/core/lib/common/uri';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { Disposable } from '@theia/core/lib/common/disposable';

// A simple encrypted file system provider
@injectable()
export class EncryptedFileSystemProvider implements FileSystemProvider {
    readonly scheme = 'encrypted';
    readonly capabilities = {
        reading: true, writing: true, watching: false,
        streaming: false, trash: false, symlinks: false,
        atomicWrite: false, fileLocks: false, pathCaseSensitive: true
    };

    protected readonly changeEmitter = new Emitter<FileChange[]>();
    get onDidChange(): Event<FileChange[]> { return this.changeEmitter.event; }

    constructor(@inject(FileService) protected readonly fileService: FileService) {}

    protected getRealUri(uri: URI): URI {
        return new URI().withScheme('file').withPath('/encrypted-vault' + uri.path.toString());
    }

    protected encrypt(data: Uint8Array): Uint8Array {
        // Simple XOR for demo; real impl uses AES-GCM
        const key = 0xAB;
        return Uint8Array.from(data.map(b => b ^ key));
    }

    protected decrypt(data: Uint8Array): Uint8Array {
        return this.encrypt(data); // XOR is symmetric
    }

    async stat(uri: URI): Promise<FileStat> {
        const realUri = this.getRealUri(uri);
        return this.fileService.stat(realUri);
    }

    async readFile(uri: URI): Promise<Uint8Array> {
        const realUri = this.getRealUri(uri);
        const encrypted = await this.fileService.read(realUri);
        return this.decrypt(encrypted);
    }

    async writeFile(uri: URI, content: Uint8Array, options?: FileWriteOptions): Promise<void> {
        const realUri = this.getRealUri(uri);
        const encrypted = this.encrypt(content);
        await this.fileService.write(realUri, encrypted, options);
        this.changeEmitter.fire([{ resource: uri, type: FileChangeType.UPDATED }]);
    }

    // Other required methods...
    async readDirectory(uri: URI): Promise<[string, FileType][]> { return []; }
    async createDirectory(uri: URI): Promise<void> {}
    async delete(uri: URI, options?: FileDeleteOptions): Promise<void> {}
    async rename(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void> {}
    async copy(source: URI, target: URI, options?: FileOverwriteOptions): Promise<void> {}
}

// Register the provider
@injectable()
export class EncryptedFSRegistration {
    constructor(
        @inject(FileService) protected readonly fileService: FileService,
        @inject(EncryptedFileSystemProvider) protected readonly provider: EncryptedFileSystemProvider
    ) {}

    @postConstruct()
    init(): void {
        this.fileService.registerProvider('encrypted', this.provider);
        console.log('Encrypted FS provider registered');
    }
}
```
### 13.4 FileService File Watcher Setup

```typescript
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileChangeType } from '@theia/filesystem/lib/common/filesystem-watcher-protocol';
import { URI } from '@theia/core/lib/common/uri';
import { Disposable } from '@theia/core/lib/common/disposable';

@injectable()
export class IDEIAFileWatcherExample {
    protected watcherDisposable: Disposable | undefined;

    constructor(@inject(FileService) protected readonly fileService: FileService) {}

    @postConstruct()
    init(): void {
        this.fileService.onDidChange((changes) => {
            for (const change of changes) {
                const uriStr = change.resource.toString();
                switch (change.type) {
                    case FileChangeType.CREATED:
                        console.log('Created:', uriStr);
                        break;
                    case FileChangeType.UPDATED:
                        console.log('Updated:', uriStr);
                        break;
                    case FileChangeType.DELETED:
                        console.log('Deleted:', uriStr);
                        break;
                }
            }
        });

        this.fileService.onDidCreate((change) => {
            console.log('File created:', change.resource.toString());
        });

        this.fileService.onDidDelete((change) => {
            console.log('File deleted:', change.resource.toString());
        });
    }

    async watchDirectory(uri: URI): Promise<void> {
        const watcher = await this.fileService.watch(uri, {
            recursive: true,
            excludes: ['**/node_modules/**', '**/.git/**']
        });

        this.watcherDisposable = watcher.onDidChange((changes) => {
            for (const change of changes) {
                console.log('Watch event:', FileChangeType[change.type], change.resource.toString());
            }
        });
    }

    dispose(): void {
        if (this.watcherDisposable) {
            this.watcherDisposable.dispose();
            this.watcherDisposable = undefined;
        }
    }
}
```

### 13.5 TextModelService Access & Model Operations

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { TextModelService } from '@theia/editor/lib/browser/text-model-service';
import { ITextModel } from '@theia/editor/lib/browser/text-model';
import { URI } from '@theia/core/lib/common/uri';
import { Reference } from '@theia/core/lib/common/reference';

@injectable()
export class IDEIATextModelExample {
    protected modelRef: Reference<ITextModel> | undefined;

    constructor(
        @inject(TextModelService) protected readonly textModelService: TextModelService
    ) {}

    async openAndEdit(uri: URI): Promise<void> {
        // Acquire model reference (opens file if not already open)
        this.modelRef = await this.textModelService.createModelReference(uri);
        const model = this.modelRef.object;

        console.log('Model loaded:', {
            uri: model.uri.toString(),
            languageId: model.languageId,
            encoding: model.encoding,
            versionId: model.versionId,
            dirty: model.dirty,
            lineCount: model.getLineCount()
        });

        // Read current content
        const content = model.getText();
        console.log('Content length:', content.length);

        // Listen for changes
        model.onDidChangeContent((event) => {
            console.log('Content changed, version:', event.versionId);
        });

        model.onDidChangeDirty((dirty) => {
            console.log('Dirty state changed:', dirty);
        });

        model.onDidSaveModel((savedUri) => {
            console.log('Model saved:', savedUri.toString());
        });

        // Edit the model
        model.applyEdits([{
            range: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
            text: '// Edited by IDEIA agent\n'
        }]);

        // Save to disk
        await model.save();

        // Reload from disk
        await model.reload();
    }

    async closeModel(): Promise<void> {
        if (this.modelRef) {
            this.modelRef.dispose(); // Releases reference; when count=0, model is disposed
            this.modelRef = undefined;
        }
    }
}
```

### 13.6 Path Resolution & Glob Matching

```typescript
import { Path } from '@theia/core/lib/common/path';
import { PathGlobMatcher } from '@theia/core/lib/common/path-glob';

// Path creation and components
const filePath = new Path('/home/user/project/src/components/Button.tsx');

console.log(filePath.isAbsolute);      // true
console.log(filePath.base);             // 'Button.tsx'
console.log(filePath.name);             // 'Button'
console.log(filePath.ext);              // '.tsx'
console.log(filePath.dir.toString());  // '/home/user/project/src/components'

// Path joining
const joined = Path.join('/home/user', 'project', 'src', 'index.ts');
console.log(joined); // '/home/user/project/src/index.ts'

// Relative paths
const base = new Path('/home/user/project');
const full = new Path('/home/user/project/src/app.ts');
const relative = base.relative(full);
console.log(relative?.toString()); // 'src/app.ts'

// Glob matching
const testPath = '/home/user/project/src/components/Button.tsx';

console.log(PathGlobMatcher.match(testPath, '**/*.tsx'));       // true
console.log(PathGlobMatcher.match(testPath, '**/Button.*'));    // true
console.log(PathGlobMatcher.match(testPath, '*.tsx'));          // false
console.log(PathGlobMatcher.match(testPath, '**/components/*')); // true

// Pattern filtering
const files = [
    '/home/user/src/app.ts',
    '/home/user/src/utils.ts',
    '/home/user/dist/bundle.js',
    '/home/user/node_modules/pkg/index.js'
];

const filtered = PathGlobMatcher.filter(files, [
    '**/*.ts',
    '!**/node_modules/**'
]);
console.log(filtered); // ['/home/user/src/app.ts', '/home/user/src/utils.ts']
```
---

## 14. Conexoes

| Estudo | Conexao com S45 |
|--------|-----------------|
| **S34 (Editor Widget)** | O EditorWidget usa TextModelService para criar modelos de texto do arquivo aberto. TextModelService depende de FileService para ler/escrever o conteudo. A URI do editor e resolvida via WorkspaceService para determinar o root. |
| **S35 (FileSystem/Workspace)** | S35 foca na abstracao VFS generica e provedores. S45 foca na integracao desses provedores com o WorkspaceService, ResourceProvider, TextModelService e PathService. S35 prove os providers concretos (DiskFS, MemoryFS); S45 orquestra o ciclo de vida dos recursos. |
| **S36 (Extension Host)** | O Extension Host do Theia consome o FileService para operacoes de arquivo (vscode.workspace.fs). Custom URI schemes registrados por extensoes (plugin://) sao FileSystemProviders registrados no FileService. |
| **S37 (Search/SCM/Task)** | Search usa FileService para ler arquivos durante a busca. SCM opera sobre o workspace roots (WorkspaceService) para determinar escopo. Tasks herdam o workspace como contexto de execucao. |
| **S42 (DI/Inversify)** | FileService, WorkspaceService, TextModelService, ResourceProvider e Path sao todos injetados via Inversify DI. Factories de Resource e Model seguem o padrao de DI do Theia. FileSystemProviders sao registrados dinamicamente no container. |
| **S43 (Views)** | A File Explorer view depende do WorkspaceService para obter roots, do FileService para ler diretorios e do FileWatcher para atualizar a tree. A view de Outline depende do TextModelService para obter o modelo ativo. |
| **S44 (Shell)** | O ApplicationShell gerencia widgets que exibem recursos — editores, exploradores, paineis. O WorkspaceService notifica o shell quando roots mudam. O layout state e armazenado via StorageService (escopado por workspace). |
| **S38 (Editor Intelligence)** | Inteligencia do editor (code actions, diagnostics) opera sobre ITextModel. O modelo fornece getText() para analise e applyEdits() para correcoes. O FileService e usado para salvar. |
| **S39 (Settings/Keybindings)** | Workspace settings (.theia-workspace) sao lidas pelo WorkspaceDataParser. Folder-specific settings dependem do root resolution (getRoot). When clauses usam resource context keys como resourceExt, resourceScheme. |
| **S11 (Theia Integration)** | Theia Integration define como a IDEIA se acopla ao ecossistema Theia. S45 e o estudo fundamental que descreve a camada de recursos sobre a qual tudo se apoia. |
| **S46 (Problem/Output)** | Problems view usa as diagnostics que operam sobre ITextModel. Output view prove recursos (output scheme) via um FileSystemProvider que expoe canais de output como arquivos. |

---

## 15. Plano de Implementacao

### Fase 1 — URI & Path System (2 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| S45-T1 | Implementar camada de abstracao URI com suporte a todos os schemes do Theia (file, inmemory, theia, plugin, zip) | 6h |
| S45-T2 | Criar URIValidator com validacao RFC 3986 e normalizacao cross-platform | 4h |
| S45-T3 | Implementar PathService completo com normalize, join, relative, glob | 6h |
| S45-T4 | Adicionar suporte a URI codec para Windows paths e percent-encoding | 3h |

### Fase 2 — File System Providers (3 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| S45-T5 | Implementar DiskFileSystemProvider com operacoes atomicas e streaming | 8h |
| S45-T6 | Implementar InMemoryFileSystemProvider para build output e temp files | 6h |
| S45-T7 | Implementar ZipFileSystemProvider para navegacao dentro de ZIPs | 6h |
| S45-T8 | Criar FileSystemProviderRegistry com registro dinamico e resolucao por scheme | 4h |
| S45-T9 | Implementar PluginFileSystemProvider para recursos de extensoes VS Code | 4h |

### Fase 3 — FileService & Watcher (3 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| S45-T10 | Implementar DefaultFileService com delegacao a providers e eventos | 8h |
| S45-T11 | Implementar FileChangeCoalescer para batching de eventos | 4h |
| S45-T12 | Criar WatcherStrategySelector com suporte a native, chokidar e polling | 8h |
| S45-T13 | Implementar WatcherLifetimeManager com retry, restart e fallback | 6h |
| S45-T14 | Adicionar WatchDebouncer com exclusion patterns e throttle | 4h |

### Fase 4 — WorkspaceService & ResourceProvider (3 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| S45-T15 | Implementar DefaultWorkspaceService com multi-root, workspace file e storage | 8h |
| S45-T16 | Criar WorkspaceDataParser para .theia-workspace files | 4h |
| S45-T17 | Implementar WorkspaceTrustService com avaliacao de confiabilidade | 6h |
| S45-T18 | Criar DefaultResourceProvider e DefaultResource com read/write/stream | 6h |
| S45-T19 | Implementar ScopedStorageService com escopo global, workspace e folder | 4h |

### Fase 5 — TextModelService & Directory Services (3 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| S45-T20 | Implementar DefaultTextModel com dirty tracking, edits e save | 8h |
| S45-T21 | Criar ReferenceCountingManager para gerenciamento de ciclo de vida | 4h |
| S45-T22 | Implementar DirectoryLister com sorting e filtering | 6h |
| S45-T23 | Criar FileTypeDetector para binary vs text detection | 4h |
| S45-T24 | Implementar LargeFileHandler com preview e structural modes | 4h |

### Fase 6 — IDEIA Enhancements & Testes (3 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| S45-T25 | Implementar IDEIAVirtualOverlayProvider para sugestoes de agente | 6h |
| S45-T26 | Criar IDEIAResourceMetadataService para anotacoes de agente | 4h |
| S45-T27 | Implementar IDEIAFileAccessController com permissoes de agente | 6h |
| S45-T28 | Criar IDEIATempWorkspace para operacoes temporarias de agente | 4h |
| S45-T29 | Testes unitarios para URI, Path e Glob matching | 6h |
| S45-T30 | Testes de integracao para FileService, Watcher e WorkspaceService | 8h |
| S45-T31 | Testes de contract para FileSystemProvider interface | 4h |

**Total estimado:** 17-20 dias / ~140-160 horas

### Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| Compatibilidade com VS Code workspace files (.code-workspace) | Alto | Implementar WorkspaceDataParser que le ambos formatos |
| Cross-platform path handling (Windows vs POSIX) | Alto | Usar Path class com normalizacao explicita; testar em matrix Win/Linux/Mac |
| Watcher performance em monorepos grandes (node_modules) | Medio | Exclusion patterns default; fallback a polling com intervalo alto |
| Concorrencia em operacoes de arquivo | Medio | FileChangeCoalescer com batching; lock opcional por arquivo |
| Vazamento de memoria em modelos nao dispostos | Medio | ReferenceCountingManager garante que modelos sao dispostos ao fechar ultimo editor |
| Compatibilidade com Remote FS | Medio | RemoteFileSystemProvider como abstracao; RemoteConnection via NATS |

---

> **Fim do ESTUDO S45 — Theia Workspace, Resources & URI System**
> Proximo: ESTUDO S46 — Theia Problem/Output System
