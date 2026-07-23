# ESTUDO S41 — Remote Development & Browser IDE Architecture

> **Arquitetura de desenvolvimento remoto e IDE web para a IDEIA: extensao de host remoto, SSH, containers, WSL, Web IDE (Theia Cloud), tunnels, PWA, workspace management, autenticacao e seguranca**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — Remote/Web IDE architecture, protocols, SSH, Dev Containers, Theia Cloud, tunnels, PWA |

---

## Sumario

1. [Introducao](#1-introducao)
2. [Remote Development Architecture Patterns](#2-remote-development-architecture-patterns)
3. [Remote Extension Host (VS Code Server Model)](#3-remote-extension-host-vs-code-server-model)
   - 3.1 [Connection Lifecycle](#31-connection-lifecycle)
   - 3.2 [Latency Compensation](#32-latency-compensation)
   - 3.3 [File System Access](#33-file-system-access)
4. [Dev Containers Specification](#4-dev-containers-specification)
5. [SSH Remote Architecture](#5-ssh-remote-architecture)
6. [WSL Architecture](#6-wsl-architecture)
7. [Browser/Web IDE (Theia Cloud Pattern)](#7-browserweb-ide-theia-cloud-pattern)
   - 7.1 [PWA Features](#71-pwa-features)
   - 7.2 [Web IDE Deployment](#72-web-ide-deployment)
   - 7.3 [Browser Compatibility](#73-browser-compatibility)
8. [Workspace & Session Management](#8-workspace--session-management)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Gateway / Tunnel Service](#10-gateway--tunnel-service)
11. [Performance & Optimization](#11-performance--optimization)
12. [Security Model](#12-security-model)
13. [Web IDE vs Desktop IDE Comparison](#13-web-ide-vs-desktop-ide-comparison)
14. [Code Examples](#14-code-examples)
15. [Conexoes](#15-conexoes)
16. [Plano de Implementacao](#16-plano-de-implementacao)

---

## 1. Introducao

A evolucao de IDEs locais para arquiteturas remotas, cloud e hibridas redefine como desenvolvedores interagem com seus ambientes de codigo. A IDEIA posiciona-se como plataforma que suporta todos os modos: local (desktop Electron), remoto (SSH/container), cloud (Theia Cloud) e hibrido (PWA + native shell).

### 1.1 Evolucao dos Modelos de IDE

```
Local-only (2000-2015)         Remote SSH (2015-2019)
  +------------------+           +------------------+
  |  IDE Process     |           |  Client (UI)     |
  |  (Editor, FS,    |           |  Thin shell      |
  |   Extensions,    |           +--------+---------+
  |   Terminal,      |                    |
  |   Debugger)      |           SSH      v
  +------------------+           +------------------+
                                 |  Server (Linux)   |
                                 |  All tools, FS,   |
                                 |  Extensions       |
                                 +------------------+

Cloud IDE (2019-2023)           Hybrid/PWA (2023+)
  +------------------+           +------------------+
  |  Browser         |           |  PWA (Offline)   |
  +--------+---------+           +--------+---------+
           |                               |
  WebSocket|                     Local     v Remote
           v                     +------------------+
  +------------------+           |  Desktop Shell   |
  |  Cloud Backend   |           |  (Electron)      |
  |  (Theia/K8s)     |           +--------+---------+
  +------------------+                     |
                                    SSH     v Containers
                                    +------------------+
                                    |  Remote Host     |
                                    +------------------+
```

### 1.2 Casos de Uso

| Caso de Uso | Descricao | Modo Ideal |
|-------------|-----------|-----------|
| Desenvolvimento remoto em servidor Linux | Dev conecta-se a servidor de alta performance via SSH | Remote SSH |
| Reproducao de ambiente com containers | Dev container com ferramentas pre-instaladas | Dev Containers |
| Desenvolvimento Windows + Linux | WSL 2 para ferramentas Linux nativas no Windows | WSL |
| Codespaces / Cloud IDE | Ambiente efemero via browser | Cloud (Theia) |
| Ambiente hibrido offline/online | PWA que funciona sem internet e sincroniza | Hybrid |
| Equipe distribuida mesma sessao | Colaboracao em tempo real | Cloud + Real-Time |

### 1.3 Trade-offs Fundamentais

| Dimensao | Local | Remote SSH | Cloud IDE | PWA Hybrid |
|----------|-------|------------|-----------|------------|
| Latencia | Nula | Media (RTT 10-100ms) | Alta (RTT 50-300ms) | Baixa (cache local) |
| Capacidade de processamento | Limitada ao hardware local | Toda capacidade do servidor | Toda capacidade do cloud | Local + Remote |
| Largura de banda | Nao se aplica | Media | Alta (streaming) | Baixa (diferenciais) |
| Seguranca | Total (local) | Chaves SSH | OAuth2 + RBAC | Token + session |
| Acesso a hardware | Completo | Limitado | GPU/NPU via cloud | Compartilhado |
| Trabalho offline | Completo | Impossivel | Parcial (PWA) | Total |
| Setup inicial | Instalar ferramentas | Setup SSH + server | Zero (browser) | Instalar app shell |
| Custo de infra | Hardware do dev | Servidor remoto | Cloud compute | Mix |

---

## 2. Remote Development Architecture Patterns

### 2.1 Modelos de Arquitetura

```
A. Local VS Remote Extension Host

Local:
+-----------------------------+     +-----------------------------+
|  UI Process                 |     |  Extension Host (local)     |
|  Monaco / UI                |<--->|  Extensions running local   |
|  File System Proxy          | IPC |  Language Servers           |
|  Terminal UI                |     |  Debug Adapters             |
+-----------------------------+     +-----------------------------+

Remote:
+-----------------------------+     +-----------------------------+
|  Client (UI only)           |     |  Remote Server              |
|  Monaco / UI                |     |  Extension Host (remote)    |
|  WebSocket/SSH/TCP          |<--->|  File System (remote)       |
|  Terminal Renderer          |     |  Language Servers           |
+-----------------------------+     +-----------------------------+
```

### 2.2 Protocolos de Comunicacao

| Protocolo | Transporte | Uso | Criptografia |
|-----------|-----------|-----|-------------|
| VS Code Remote Tunnels | WebSocket over HTTPS | Tunel entre cliente e servidor remoto | TLS 1.3 |
| Dev Containers Spec | Docker/Podman API | Container lifecycle | Docker TLS |
| SSH Protocol | TCP/22 | Autenticacao e tunel | SSH ciphers |
| JSON-RPC over WebSocket | WSS (WebSocket Secure) | Chamadas de API entre extension host e cliente | WSS (TLS) |
| JSON-RPC over Pipe | stdio (IPC) | Comunicacao local entre processos | N/A (local) |
| LSP over JSON-RPC | TCP ou stdio | Language server protocol | TLS ou pipe |
| DAP over JSON-RPC | TCP | Debug adapter protocol | TLS |

### 2.3 Tabela Comparativa de Arquiteturas

| Caracteristica | SSH Remote | Dev Containers | WSL | Theia Cloud | VS Code Tunnels |
|---------------|-----------|---------------|-----|-------------|-----------------|
| Host | Qualquer maquina SSH | Docker/Podman host | Windows com WSL | Kubernetes | Qualquer host |
| Cliente | VS Code/IDEIA | VS Code/IDEIA | VS Code/IDEIA | Browser | VS Code/IDEIA |
| Setup servidor | SSHD + node | Dockerfile | WSL install | Helm chart | tunnel-service |
| File System | Remote FS provider | Volume mount | Plan9 (WSL2) | Workspace PVC | Remote FS |
| Extensions | Remote host | Remote host | Remote host | Remote host | Remote host |
| Terminal | SSH channel | docker exec | wsl.exe | xterm.js | Terminal proxy |
| Port Forwarding | SSH -L | docker -p | wsl -- | K8s port-forward | Tunnel relay |
| Networking | SSH tunnel | Docker bridge | WSL vSwitch | K8s service mesh | Tunnel relay |
| Persistencia | Home dir | Volume bind | WSL home | PV/PVC | Home dir |
| Multi-session | Multiplex SSH | Multi container | Multi distro | Multi workspace | Multi tunnel |

---

## 3. Remote Extension Host (VS Code Server Model)

### 3.1 Arquitetura

O modelo VS Code Server separa o cliente (UI) do servidor (extension host + file system + language servers). A comunicacao ocorre via JSON-RPC sobre WebSocket ou TCP.

```
+-----------------------------+           +-----------------------------+
|  CLIENT (Browser/Desktop)   |           |  SERVER (Remote Machine)    |
|                             |           |                             |
|  +-----------------------+  |  JSON-RPC |  +-----------------------+   |
|  |  Monaco Editor (UI)   |  |<--------->|  |  Extension Host       |   |
|  |  - Syntax highlight   |  | over WSS  |  |  - Extensions runtime |   |
|  |  - Input handling     |  |           |  |  - Activation events  |   |
|  |  - Cursor rendering   |  |           |  |  - API proxy          |   |
|  +-----------------------+  |           |  +-----------------------+   |
|  +-----------------------+  |           |  +-----------------------+   |
|  |  Terminal Renderer    |  |  Xterm    |  |  Terminal Process     |   |
|  |  (xterm.js)           |  |  over WS  |  |  (bash, zsh, pwsh)    |   |
|  +-----------------------+  |           |  +-----------------------+   |
|  +-----------------------+  |           |  +-----------------------+   |
|  |  File Explorer UI     |  |  JSON-RPC |  |  File System          |   |
|  |  (Tree widget)        |  |<--------->|  |  (local OS fs)        |   |
|  +-----------------------+  |           |  +-----------------------+   |
|  +-----------------------+  |           |  +-----------------------+   |
|  |  Debugger UI          |  |  DAP-RPC  |  |  Debug Adapters       |   |
|  |  (Call stack, vars)   |  |<--------->|  |  (node, python, etc)  |   |
|  +-----------------------+  |           |  +-----------------------+   |
|  +-----------------------+  |           |  +-----------------------+   |
|  |  Local Cache          |  |           |  |  Language Servers     |   |
|  |  (IndexedDB, OPFS)    |  |           |  |  (LSP 3.18)           |   |
|  +-----------------------+  |           |  +-----------------------+   |
|                             |           |                             |
+-----------------------------+           +-----------------------------+
```

### 3.2 Protocolo de Mensagens

```typescript
// Message framing para JSON-RPC sobre WebSocket/TCP

interface MessageHeader {
  length: number;           // Comprimento do payload em bytes (4 bytes, big-endian)
  messageType: MessageType; // 0x01 = request, 0x02 = response, 0x03 = notification, 0x04 = cancel
  compression: Compression; // 0x00 = none, 0x01 = gzip, 0x02 = zstd
  streamId: number;         // Identificador de stream multiplexado (4 bytes)
}

enum MessageType {
  REQUEST = 0x01,
  RESPONSE = 0x02,
  NOTIFICATION = 0x03,
  CANCEL = 0x04,
}

enum Compression {
  NONE = 0x00,
  GZIP = 0x01,
  ZSTD = 0x02,
}

interface FramedMessage {
  header: MessageHeader;
  payload: Uint8Array; // JSON-RPC 2.0 payload serializado, opcionalmente comprimido
}

// JSON-RPC 2.0 Message
interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: unknown[];
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}
```

### 3.3 Protocol Buffers para Transporte Binario

Para payloads de alta frequencia (edicao de texto, cursor sync), JSON e custoso. Protocol Buffers reduzem tamanho da mensagem em ~60%.

```typescript
interface TextEditProto {
  uri: string;
  version: number;
  edits: EditDelta[];
}

interface EditDelta {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  text: string;
  textLength: number;
}

class BinaryMessageSerializer {
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  serializeEdit(edit: TextEditProto): Uint8Array {
    const parts: Uint8Array[] = [];
    const uriBytes = this.encoder.encode(edit.uri);
    const versionBuf = new Uint8Array(4);
    new DataView(versionBuf.buffer).setUint32(0, edit.version, false);
    parts.push(Uint8Array.from([uriBytes.length]));
    parts.push(uriBytes);
    parts.push(versionBuf);
    for (const delta of edit.edits) {
      parts.push(this.serializeDelta(delta));
    }
    const totalLen = parts.reduce((a, b) => a + b.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of parts) {
      result.set(p, offset);
      offset += p.length;
    }
    return result;
  }

  private serializeDelta(delta: EditDelta): Uint8Array {
    const textBytes = this.encoder.encode(delta.text);
    const header = new Uint8Array(16);
    const view = new DataView(header.buffer);
    view.setUint32(0, delta.startLine, false);
    view.setUint32(4, delta.startColumn, false);
    view.setUint32(8, delta.endLine, false);
    view.setUint32(12, delta.endColumn, false);
    const result = new Uint8Array(16 + textBytes.length);
    result.set(header, 0);
    result.set(textBytes, 16);
    return result;
  }
}
```

### 3.1 Connection Lifecycle

```
CLIENT                               SERVER
  |                                     |
  |--- 1. Handshake (HTTP Upgrade) ---->|  GET /remote/connect
  |<--- 2. 101 Switching Protocols -----|  WebSocket upgrade
  |                                     |
  |--- 3. Auth Request ---------------->|  { method: "auth", params: { token } }
  |<--- 4. Auth Response ---------------|  { result: { sessionId, capabilities } }
  |                                     |
  |--- 5. Capability Negotiation ------>|  { method: "capabilities", params: { version, features } }
  |<--- 6. Capabilities Response -------|  { result: { serverVersion, supportedFeatures } }
  |                                     |
  |<========= KEEP-ALIVE (15s) ========>|  Ping/Pong frames
  |                                     |
  |--- 7. Session Attachment ---------->|  { method: "session.attach", params: { workspaceId } }
  |<--- 8. Session State ---------------|  { result: { openFiles, cursorPos, dirtyFiles } }
  |                                     |
  |=========== Active Session ==========>|  Bidirectional RPC
  |                                     |
  |--- 9. Disconnect ------------------>|  WebSocket close frame
  |                                     |
  |--- 10. Reconnect ------------------>|  { method: "session.reconnect", params: { sessionId } }
  |<--- 11. Reconnect OK ---------------|  { result: { restored: true, missedMessages: [...] } }
```

```typescript
interface ConnectionManager {
  connect(options: RemoteConnectionOptions): Promise<RemoteSession>;
  disconnect(): Promise<void>;
  reconnect(sessionId: string): Promise<RemoteSession>;
  getStatus(): ConnectionStatus;
}

interface RemoteConnectionOptions {
  host: string;
  port: number;
  protocol: 'wss' | 'ws' | 'tcp';
  auth: {
    type: 'token' | 'ssh' | 'oauth2';
    credentials: string;
  };
  capabilities: ClientCapabilities;
}

interface RemoteSession {
  sessionId: string;
  serverVersion: string;
  workspaceId: string;
  capabilities: ServerCapabilities;
  messageBus: MessageBus;
  fileSystem: RemoteFileSystem;
}

interface ClientCapabilities {
  version: string;
  protocolVersion: number;
  features: {
    binaryTransport: boolean;
    streaming: boolean;
    compression: 'none' | 'gzip' | 'zstd';
    pwa: boolean;
    offlineSupport: boolean;
  };
}

interface ServerCapabilities {
  serverVersion: string;
  protocolVersion: number;
  features: {
    devcontainers: boolean;
    sshProxy: boolean;
    multiSession: boolean;
    collaboration: boolean;
    maxConcurrentEdits: number;
  };
  limits: {
    maxFileSize: number;
    maxWorkspaceCount: number;
    maxExtensionCount: number;
  };
}

enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  HANDSHAKE = 'handshake',
  AUTHENTICATING = 'authenticating',
  NEGOTIATING = 'negotiating',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  SUSPENDED = 'suspended',
}
```

### 3.2 Latency Compensation

```typescript
interface LatencyCompensator {
  localEcho(edit: TextEdit): Promise<void>;
  optimisticUpdate<T>(key: string, localValue: T, remoteUpdate: () => Promise<T>): Promise<T>;
  debouncedSave(uri: string, content: string, delayMs?: number): Promise<void>;
  predictiveRender(cursorPosition: Position, context: EditorContext): Promise<RenderPrediction>;
}

class LocalEchoImpl {
  private pendingEdits: Map<string, PendingEdit[]> = new Map();
  private serverVersion: Map<string, number> = new Map();

  applyLocalEdit(documentUri: string, edit: RawEdit): Promise<LocalEditResult> {
    const version = this.serverVersion.get(documentUri) ?? 0;
    const pending = this.pendingEdits.get(documentUri) ?? [];
    const localResult = { applied: true, version: version + 1, serverVersion: version };
    pending.push({ edit, localVersion: version + 1 });
    this.pendingEdits.set(documentUri, pending);
    this.sendToServer(documentUri, edit).then(serverResponse => {
      this.handleServerAck(documentUri, serverResponse);
    }).catch(() => {
      this.revertEdit(documentUri, edit);
    });
    return Promise.resolve(localResult);
  }

  private handleServerAck(uri: string, response: ServerAck): void {
    const pending = this.pendingEdits.get(uri) ?? [];
    const idx = pending.findIndex(p => p.localVersion === response.localVersion);
    if (idx >= 0) {
      pending.splice(idx, 1);
      this.serverVersion.set(uri, response.serverVersion);
    }
  }

  private revertEdit(uri: string, edit: RawEdit): void {
    // Reverte a edicao no modelo do Monaco
  }

  private async sendToServer(uri: string, edit: RawEdit): Promise<ServerAck> {
    return { localVersion: 0, serverVersion: 0 };
  }
}

class PredictiveEditor {
  private history: EditorAction[] = [];
  private config = { historySize: 1000, predictionWindow: 50, confidenceThreshold: 0.7 };

  predictNextActions(context: EditorContext): PredictedAction[] {
    const recentHistory = this.history.slice(-this.config.historySize);
    const patterns = this.detectPatterns(recentHistory);
    const predictions: PredictedAction[] = [];
    for (const pattern of patterns) {
      if (pattern.confidence > this.config.confidenceThreshold) {
        predictions.push({
          action: pattern.nextAction,
          confidence: pattern.confidence,
          estimatedTime: pattern.averageInterval,
        });
      }
    }
    return predictions;
  }

  private detectPatterns(history: EditorAction[]): DetectedPattern[] {
    return [];
  }
}
```

### 3.3 File System Access

O acesso ao sistema de arquivos remoto e feito atraves de um RemoteFileSystemProvider que implementa a mesma interface do VFS local, mas opera sobre conexao de rede.

```typescript
interface RemoteFileSystemProvider {
  readFile(uri: string, options?: ReadOptions): Promise<Uint8Array>;
  writeFile(uri: string, content: Uint8Array, options?: WriteOptions): Promise<void>;
  stat(uri: string): Promise<FileStat>;
  readDirectory(uri: string): Promise<[string, FileType][]>;
  createDirectory(uri: string): Promise<void>;
  delete(uri: string, options?: { recursive: boolean }): Promise<void>;
  rename(oldUri: string, newUri: string, options?: { overwrite: boolean }): Promise<void>;
  watch(uri: string, options: WatchOptions): Disposable;
  onDidChangeFile: Event<FileChangeEvent[]>;
  readFileStream(uri: string): ReadableStream<Uint8Array>;
  writeFileStream(uri: string): WritableStream<Uint8Array>;
  getFileChunks(uri: string, offset: number, size: number): Promise<Uint8Array>;
  computeDiff(uri: string, baseContent: Uint8Array): Promise<DiffResult>;
}

interface DiffResult {
  patches: Patch[];
  baseChecksum: string;
  newChecksum: string;
}

interface Patch {
  type: 'insert' | 'delete' | 'equal';
  chars: number;
  data?: string;
}

class ChunkedTransfer {
  private readonly CHUNK_SIZE = 256 * 1024;

  async readFileInChunks(provider: RemoteFileSystemProvider, uri: string): Promise<Uint8Array> {
    const stat = await provider.stat(uri);
    const totalSize = stat.size;
    const chunks: Uint8Array[] = [];
    for (let offset = 0; offset < totalSize; offset += this.CHUNK_SIZE) {
      const size = Math.min(this.CHUNK_SIZE, totalSize - offset);
      const chunk = await provider.getFileChunks(uri, offset, size);
      chunks.push(chunk);
    }
    const result = new Uint8Array(totalSize);
    let pos = 0;
    for (const chunk of chunks) {
      result.set(chunk, pos);
      pos += chunk.length;
    }
    return result;
  }
}

class RemoteFileWatcher {
  private BATCH_INTERVAL = 200;

  watch(uri: string, callback: (events: FileChangeEvent[]) => void): Disposable {
    const batchedEvents: FileChangeEvent[] = [];
    const handler = (events: FileChangeEvent[]) => {
      batchedEvents.push(...events);
      if (batchedEvents.length >= 50) callback(batchedEvents.splice(0));
    };
    const timer = setInterval(() => {
      if (batchedEvents.length > 0) callback(batchedEvents.splice(0));
    }, this.BATCH_INTERVAL);
    return { dispose: () => clearInterval(timer) };
  }
}
```

---

## 4. Dev Containers Specification

### 4.1 devcontainer.json Schema

A especificacao Dev Containers (v0.2) define um arquivo devcontainer.json na raiz do projeto que descreve como construir e configurar o ambiente de desenvolvimento.

```typescript
interface DevContainerConfig {
  image?: string;
  build?: DevContainerBuild;
  dockerFile?: string;
  dockerComposeFile?: string | string[];
  context?: string;
  features?: Record<string, FeatureConfig>;
  forwardPorts?: number[];
  portsAttributes?: Record<string, PortAttributes>;
  remoteUser?: string;
  containerUser?: string;
  containerEnv?: Record<string, string>;
  remoteEnv?: Record<string, string>;
  mountPoints?: MountPoint[];
  workspaceFolder?: string;
  workspaceMount?: string;
  shutdownAction?: 'none' | 'stopContainer' | 'stopCompose';
  postCreateCommand?: string | string[];
  postStartCommand?: string | string[];
  postAttachCommand?: string | string[];
  initializeCommand?: string | string[];
  customizations?: Record<string, unknown>;
  extensions?: string[];
  settings?: Record<string, unknown>;
  updateRemoteUserUID?: boolean;
  userEnvProbe?: 'loginInteractiveShell' | 'loginShell' | 'interactiveShell' | 'none';
  privileged?: boolean;
  capAdd?: string[];
  securityOpt?: string[];
  appPort?: number | number[];
}

interface DevContainerBuild {
  dockerfile: string;
  context?: string;
  args?: Record<string, string>;
  target?: string;
  cacheFrom?: string[];
  options?: string[];
}

interface FeatureConfig {
  version?: string;
  [key: string]: unknown;
}

interface PortAttributes {
  label?: string;
  protocol?: 'http' | 'https';
  onAutoForward?: 'notify' | 'openBrowser' | 'openPreview' | 'silent';
  requireLocalPort?: boolean;
  elevateIfNeeded?: boolean;
}

interface MountPoint {
  source: string;
  target: string;
  type?: 'bind' | 'volume' | 'tmpfs';
  readOnly?: boolean;
  consistency?: 'cached' | 'consistent' | 'delegated';
}

class DevContainerParser {
  parse(configPath: string): DevContainerConfig {
    const raw = JSON.parse(this.readFile(configPath));
    return this.validateConfig(raw);
  }

  private validateConfig(raw: unknown): DevContainerConfig {
    const config = raw as DevContainerConfig;
    if (!config.image && !config.build && !config.dockerFile && !config.dockerComposeFile) {
      throw new Error('devcontainer.json must specify image, build, dockerFile, or dockerComposeFile');
    }
    return config;
  }

  resolveFeatures(features: Record<string, FeatureConfig>): ResolvedFeature[] {
    return Object.entries(features).map(([name, config]) => ({
      id: name,
      version: config.version ?? 'latest',
      options: this.stripMetadata(config),
    }));
  }

  private stripMetadata(config: FeatureConfig): Record<string, unknown> {
    const { version, ...options } = config;
    return options;
  }

  private readFile(path: string): string {
    return '{}';
  }
}

interface ResolvedFeature {
  id: string;
  version: string;
  options: Record<string, unknown>;
}
```

### 4.2 Dev Container Features

```typescript
interface FeatureManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  documentationURL?: string;
  licenseURL?: string;
  options?: Record<string, FeatureOption>;
  containerEnv?: Record<string, string>;
  customizations?: Record<string, unknown>;
  mounts?: MountPoint[];
  init?: boolean;
  privileged?: boolean;
  capAdd?: string[];
  securityOpt?: string[];
  entrypoint?: string;
  installAfter?: string[];
  deprecated?: boolean;
}

interface FeatureOption {
  type: 'string' | 'boolean' | 'number';
  default?: string | boolean | number;
  description?: string;
  enum?: string[];
}

class FeatureResolver {
  private registry: Map<string, FeatureManifest> = new Map();

  registerFeature(manifest: FeatureManifest): void {
    this.registry.set(manifest.id, manifest);
  }

  resolveFeatureTree(config: DevContainerConfig): ResolvedFeatureGraph {
    const features = config.features ?? {};
    const graph: ResolvedFeatureGraph = { nodes: [], edges: [] };
    for (const [id, opts] of Object.entries(features)) {
      const manifest = this.registry.get(id);
      if (!manifest) throw new Error('Unknown feature: ' + id);
      graph.nodes.push({ id, version: opts.version ?? manifest.version, manifest, options: opts, order: graph.nodes.length });
      if (manifest.installAfter) {
        for (const depId of manifest.installAfter) {
          graph.edges.push({ from: id, to: depId });
        }
      }
    }
    return graph;
  }

  generateInstallScript(graph: ResolvedFeatureGraph): string {
    const lines: string[] = ['#!/bin/bash', 'set -e', ''];
    for (const node of graph.nodes) {
      if (node.manifest.entrypoint) {
        lines.push('echo "Installing ' + node.manifest.name + '..."');
        lines.push('curl -fsSL ' + node.manifest.entrypoint + ' | bash');
        lines.push('');
      }
    }
    return lines.join('\n');
  }
}

interface ResolvedFeatureGraph {
  nodes: FeatureNode[];
  edges: { from: string; to: string }[];
}

interface FeatureNode {
  id: string;
  version: string;
  manifest: FeatureManifest;
  options: Record<string, unknown>;
  order: number;
}
```

### 4.3 Pre-build Container Caching

```typescript
interface PreBuildCache {
  cacheContainer(config: DevContainerConfig): Promise<string>;
  findCached(config: DevContainerConfig): Promise<string | null>;
  invalidateCache(config: DevContainerConfig): Promise<void>;
}

class ContainerCacheManager {
  private cacheStore: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

  async computeCacheKey(config: DevContainerConfig): Promise<string> {
    const relevant = { image: config.image, build: config.build, dockerComposeFile: config.dockerComposeFile, features: config.features };
    const hash = await this.sha256(JSON.stringify(relevant));
    return 'devcontainer-cache-' + hash;
  }

  async cacheContainer(config: DevContainerConfig, imageRef: string): Promise<void> {
    const key = await this.computeCacheKey(config);
    this.cacheStore.set(key, { imageRef, createdAt: Date.now(), ttl: this.CACHE_TTL });
  }

  async findCached(config: DevContainerConfig): Promise<string | null> {
    const key = await this.computeCacheKey(config);
    const entry = this.cacheStore.get(key);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > entry.ttl) { this.cacheStore.delete(key); return null; }
    return entry.imageRef;
  }

  private async sha256(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

interface CacheEntry {
  imageRef: string;
  createdAt: number;
  ttl: number;
}
```

---

## 5. SSH Remote Architecture

### 5.1 SSH Connection Manager

```typescript
interface SshConnectionConfig {
  host: string;
  hostname: string;
  user: string;
  port: number;
  identityFile?: string[];
  localForward?: string[];
  remoteForward?: string[];
  proxyJump?: string;
  proxyCommand?: string;
  forwardAgent: boolean;
  serverAliveInterval: number;
  serverAliveCountMax: number;
  controlMaster: 'auto' | 'yes' | 'no';
  controlPath: string;
  controlPersist: string;
  compression: boolean;
  compressionLevel: number;
  logLevel: 'QUIET' | 'FATAL' | 'ERROR' | 'INFO' | 'VERBOSE' | 'DEBUG';
  preferredAuthentications: string;
  identitiesOnly: boolean;
  strictHostKeyChecking: 'yes' | 'no' | 'accept-new';
  knownHostsFile: string[];
  jumpHosts?: SshJumpHost[];
}

interface SshJumpHost {
  host: string;
  user: string;
  identityFile?: string;
  port: number;
}

class SshConfigParser {
  parse(configPath: string): Map<string, SshConnectionConfig> {
    const configs = new Map<string, SshConnectionConfig>();
    let currentHost: string | null = null;
    let currentConfig: Partial<SshConnectionConfig> = {};
    const content = this.readFile(configPath);
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || trimmed === '') continue;
      const match = trimmed.match(/^Host\s+(.+)$/i);
      if (match) {
        if (currentHost) configs.set(currentHost, this.toConfig(currentConfig));
        currentHost = match[1].trim();
        currentConfig = {};
        continue;
      }
      const kvMatch = trimmed.match(/^(\w+)\s+(.+)$/);
      if (kvMatch && currentHost) {
        this.setConfigValue(currentConfig, kvMatch[1].toLowerCase(), kvMatch[2].trim());
      }
    }
    if (currentHost) configs.set(currentHost, this.toConfig(currentConfig));
    return configs;
  }

  private setConfigValue(config: Partial<SshConnectionConfig>, key: string, value: string): void {
    switch (key) {
      case 'hostname': config.hostname = value; break;
      case 'user': config.user = value; break;
      case 'port': config.port = parseInt(value, 10); break;
      case 'identityfile': config.identityFile = [value]; break;
      case 'proxyjump': config.proxyJump = value; break;
      case 'forwardagent': config.forwardAgent = value === 'yes'; break;
      case 'serveraliveinterval': config.serverAliveInterval = parseInt(value, 10); break;
      case 'serveralivecountmax': config.serverAliveCountMax = parseInt(value, 10); break;
    }
  }

  private toConfig(partial: Partial<SshConnectionConfig>): SshConnectionConfig {
    return {
      host: '',
      hostname: 'localhost',
      user: process.env.USER ?? 'root',
      port: 22,
      forwardAgent: false,
      serverAliveInterval: 15,
      serverAliveCountMax: 3,
      controlMaster: 'auto',
      controlPath: '~/.ssh/controlmasters/%r@%h:%p',
      controlPersist: '10m',
      compression: true,
      compressionLevel: 6,
      logLevel: 'INFO',
      preferredAuthentications: 'publickey,password,keyboard-interactive',
      identitiesOnly: true,
      strictHostKeyChecking: 'accept-new',
      knownHostsFile: ['~/.ssh/known_hosts'],
      ...partial,
    };
  }

  private readFile(path: string): string { return ''; }
}
```

### 5.2 SSH Agent Forwarding

```typescript
class SshAgentForwarder {
  private agentSocket: string | null = null;

  async setupAgentForwarding(): Promise<void> {
    this.agentSocket = process.env.SSH_AUTH_SOCK ?? null;
    if (!this.agentSocket) throw new Error('SSH agent not available');
  }

  async forwardAgentToRemote(connection: SshConnection): Promise<void> {
    const result = await this.testAgentForwarding(connection);
    if (!result) throw new Error('SSH agent forwarding failed');
  }

  private async testAgentForwarding(connection: SshConnection): Promise<boolean> {
    return true;
  }

  async listKeys(): Promise<SshKeyInfo[]> {
    return [];
  }
}

interface SshKeyInfo {
  fingerprint: string;
  type: 'rsa' | 'ed25519' | 'ecdsa';
  comment: string;
  size: number;
}

interface SshConnection {
  hostname: string;
  port: number;
  user: string;
  controlPath: string;
  isAlive(): boolean;
  close(): Promise<void>;
}
```

### 5.3 SSH Jump Hosts

```typescript
interface JumpHostChain {
  hosts: SshJumpHost[];
  establish(): Promise<SshConnection>;
}

class JumpHostChainImpl implements JumpHostChain {
  hosts: SshJumpHost[];

  constructor(hosts: SshJumpHost[]) { this.hosts = hosts; }

  async establish(): Promise<SshConnection> {
    const proxyJump = this.hosts.map(h => h.user + '@' + h.host + ':' + h.port).join(',');
    const config: SshConnectionConfig = {
      host: 'final-target',
      hostname: this.hosts[this.hosts.length - 1].host,
      user: this.hosts[this.hosts.length - 1].user,
      port: this.hosts[this.hosts.length - 1].port,
      forwardAgent: true,
      serverAliveInterval: 15, serverAliveCountMax: 3,
      controlMaster: 'auto', controlPath: '~/.ssh/controlmasters/%r@%h:%p', controlPersist: '10m',
      compression: true, compressionLevel: 6, logLevel: 'INFO',
      preferredAuthentications: 'publickey,password,keyboard-interactive',
      identitiesOnly: true, strictHostKeyChecking: 'accept-new',
      knownHostsFile: ['~/.ssh/known_hosts'],
      proxyJump,
    };
    const multiplexer = new SshMultiplexer();
    return multiplexer.getConnection(config);
  }
}
```

---

## 6. WSL Architecture

### 6.1 WSL 1 vs WSL 2

| Caracteristica | WSL 1 | WSL 2 |
|---------------|-------|-------|
| Arquitetura | Traducao de syscalls | VM real com Kernel Linux |
| Kernel Linux | Nao (traducao Windows) | Sim (kernel real no Hyper-V) |
| Performance IO | Boa (acesso direto NTFS) | Lenta (9P protocol over virtio) |
| Compatibilidade syscalls | ~70% | ~99.9% |
| Suporte Docker | Limitado | Nativo (via WSL2 backend) |
| Acesso a dispositivos | Limitado | Mais completo |
| Consumo de RAM | Baixo | Alto (VM dedicada) |
| Networking | Compartilhado com Windows | NAT com port forwarding |
| Systemd | Nao | Sim (WSL 2 suporta) |

### 6.2 WSL Extension Host

```typescript
interface WslConfig {
  distribution: string;
  kernelCommandLine?: string;
  memory?: string;
  processors?: number;
  localhostForwarding: boolean;
  network: 'nat' | 'mirrored';
  autoProxy: boolean;
  dnsProxy: boolean;
  firewall: boolean;
  guiApplications: boolean;
  systemd: boolean;
  swap: string;
}

class WslManager {
  async listDistributions(): Promise<WslDistribution[]> {
    const output = await this.exec('wsl.exe', ['--list', '--verbose']);
    return this.parseWslList(output);
  }

  async installDistribution(name: string): Promise<void> {
    await this.exec('wsl.exe', ['--install', '-d', name]);
  }

  async setVersion(name: string, version: 1 | 2): Promise<void> {
    await this.exec('wsl.exe', ['--set-version', name, String(version)]);
  }

  async terminate(name: string): Promise<void> {
    await this.exec('wsl.exe', ['--terminate', name]);
  }

  async shutdown(): Promise<void> {
    await this.exec('wsl.exe', ['--shutdown']);
  }

  async exportDistro(name: string, outputPath: string): Promise<void> {
    await this.exec('wsl.exe', ['--export', name, outputPath]);
  }

  async importDistro(name: string, installPath: string, tarPath: string): Promise<void> {
    await this.exec('wsl.exe', ['--import', name, installPath, tarPath]);
  }

  private async exec(cmd: string, args: string[]): Promise<string> { return ''; }

  private parseWslList(output: string): WslDistribution[] {
    const lines = output.split('\n').filter(l => l.trim());
    const distros: WslDistribution[] = [];
    for (const line of lines.slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        distros.push({ name: parts[0], state: parts[1] as 'Running' | 'Stopped', version: parseInt(parts[2], 10), default: parts[3] === '*' });
      }
    }
    return distros;
  }
}

interface WslDistribution {
  name: string;
  state: 'Running' | 'Stopped';
  version: 1 | 2;
  default: boolean;
}

class WslFileSystemProvider {
  private readonly WSL_NETWORK_PATH = '\\\\wsl.localhost\\';

  translatePath(wslPath: string, distro: string): string {
    const normalizedPath = wslPath.replace(/\//g, '\\');
    return this.WSL_NETWORK_PATH + distro + normalizedPath;
  }

  async stat(wslPath: string, distro: string): Promise<FileStat> {
    const winPath = this.translatePath(wslPath, distro);
    return {} as FileStat;
  }

  async readFile(wslPath: string, distro: string): Promise<Uint8Array> {
    return new Uint8Array();
  }
}
```

---

## 7. Browser/Web IDE (Theia Cloud Pattern)

### 7.1 Arquitetura Theia Cloud

```
+------------------------------------------------------------------+
|  BROWSER (Theia Frontend)                                        |
|  +------------------------------------------------------------+  |
|  |  Theia Shell (React/Monaco)                                  |  |
|  |  Monaco Editor | Terminal (xterm.js) | Widgets | Panels     |  |
|  +------------------------------------------------------------+  |
|  |  Theia Frontend Services                                     |  |
|  |  - Command Service  - Preference Service  - Keybinding      |  |
|  +------------------------------------------------------------+  |
|  |  WebSocket Connection Manager                                |  |
|  |  - JSON-RPC over WSS   - Reconnection Logic  - Heartbeat    |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
           |                     WebSocket / WSS
           v
+------------------------------------------------------------------+
|  THEIA BACKEND (Node.js)                                         |
|  +------------------------------------------------------------+  |
|  |  Theia Backend Services                                     |  |
|  |  - Workspace Service  - File System  - Terminal Service    |  |
|  +------------------------------------------------------------+  |
|  |  Extension Host Manager                                      |  |
|  |  - Plugin Host Process  - Language Servers  - Debuggers     |  |
|  +------------------------------------------------------------+  |
|  |  NATS / Messaging Layer                                     |  |
|  +------------------------------------------------------------+  |
|  |  Authentication & Session                                   |  |
|  |  - OIDC Auth  - Session Store  - Workspace Isolation        |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
           |
           v
+------------------------------------------------------------------+
|  KUBERNETES / INFRA                                               |
|  - Workspace Pods  - PVC Storage  - Ingress/TLS  - Service Mesh  |
+------------------------------------------------------------------+
```

### 7.2 WebSocket Communication

```typescript
interface WebSocketTransport {
  connect(url: string, options: WsOptions): Promise<MessageBus>;
  disconnect(): Promise<void>;
  send(message: JsonRpcMessage): Promise<void>;
  onMessage(handler: (msg: JsonRpcMessage) => void): Disposable;
  onStatusChange(handler: (status: ConnectionStatus) => void): Disposable;
}

interface WsOptions {
  protocols?: string[];
  headers?: Record<string, string>;
  reconnect: boolean;
  reconnectDelay: number;
  maxReconnectDelay: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  heartbeatTimeout: number;
}

class WebSocketTransportImpl implements WebSocketTransport {
  private ws: WebSocket | null = null;
  private handlers: Map<string, (msg: JsonRpcMessage) => void> = new Map();
  private statusHandlers: ((status: ConnectionStatus) => void)[] = [];
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private reconnectAttempts = 0;
  private options: WsOptions;

  constructor(options?: Partial<WsOptions>) {
    this.options = {
      reconnect: true, reconnectDelay: 1000, maxReconnectDelay: 30000,
      maxReconnectAttempts: 10, heartbeatInterval: 15000, heartbeatTimeout: 30000,
      ...options,
    };
  }

  async connect(url: string): Promise<MessageBus> {
    return new Promise((resolve, reject) => {
      this.setStatus(ConnectionStatus.CONNECTING);
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.setStatus(ConnectionStatus.CONNECTED);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve(this.createMessageBus());
      };
      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.setStatus(ConnectionStatus.DISCONNECTED);
        this.handleReconnect();
      };
      this.ws.onerror = (error) => reject(error);
      this.ws.onmessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
          this.dispatch(JSON.parse(data));
        } catch (err) { /* ignore parse errors */ }
      };
    });
  }

  async disconnect(): Promise<void> {
    this.options.reconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close(1000, 'Client disconnect');
    this.ws = null;
    this.setStatus(ConnectionStatus.DISCONNECTED);
  }

  async send(message: JsonRpcMessage): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error('WebSocket not connected');
    this.ws.send(JSON.stringify(message));
  }

  onMessage(handler: (msg: JsonRpcMessage) => void): Disposable {
    const id = crypto.randomUUID();
    this.handlers.set(id, handler);
    return { dispose: () => this.handlers.delete(id) };
  }

  onStatusChange(handler: (status: ConnectionStatus) => void): Disposable {
    this.statusHandlers.push(handler);
    return { dispose: () => { const idx = this.statusHandlers.indexOf(handler); if (idx >= 0) this.statusHandlers.splice(idx, 1); } };
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    for (const h of this.statusHandlers) h(status);
  }

  private dispatch(message: JsonRpcMessage): void {
    for (const h of this.handlers.values()) h(message);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ jsonrpc: '2.0', method: 'ping', id: Date.now() }).catch(() => {});
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  private handleReconnect(): void {
    if (!this.options.reconnect || this.reconnectAttempts >= this.options.maxReconnectAttempts) return;
    this.setStatus(ConnectionStatus.RECONNECTING);
    this.reconnectAttempts++;
    const delay = Math.min(this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.options.maxReconnectDelay);
    this.reconnectTimer = setTimeout(() => this.connect(this.ws?.url ?? '').catch(() => {}), delay);
  }

  private createMessageBus(): MessageBus {
    return { send: (msg) => this.send(msg), onMessage: (handler) => this.onMessage(handler), dispose: () => this.disconnect() };
  }
}
```

### 7.1 PWA Features

```typescript
class PwaService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/', updateViaCache: 'none',
      });
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) this.notifyUpdate();
          });
        }
      });
      window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        this.deferredPrompt = event as BeforeInstallPromptEvent;
      });
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    } catch (error) {
      console.error('[PWA] Registration failed:', error);
    }
  }

  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) return false;
    this.deferredPrompt.prompt();
    const result = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    return result.outcome === 'accepted';
  }

  private notifyUpdate(): void {
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }

  private handleOnline(): void {
    if (this.swRegistration?.sync) this.swRegistration.sync.register('sync-workspace');
    window.dispatchEvent(new CustomEvent('pwa-online-mode'));
  }

  private handleOffline(): void {
    window.dispatchEvent(new CustomEvent('pwa-offline-mode'));
  }
}
```

### 7.2 Web IDE Deployment

```typescript
interface WebIdeDeploymentConfig {
  mode: 'single-user' | 'multi-tenant';
  workspaceStrategy: 'ephemeral' | 'persistent' | 'pre-built' | 'image-based';
  pooling: { enabled: boolean; minPoolSize: number; maxPoolSize: number; idleTimeout: number; warmUpImages: string[]; };
  scheduling: { strategy: 'round-robin' | 'least-loaded' | 'affinity'; maxWorkspacesPerNode: number; nodeSelector?: Record<string, string>; };
}

class WorkspacePool {
  private pool: WarmWorkspace[] = [];
  private config: WebIdeDeploymentConfig['pooling'];

  async initialize(config: WebIdeDeploymentConfig['pooling']): Promise<void> {
    this.config = config;
    for (let i = 0; i < config.minPoolSize; i++) {
      this.pool.push(await this.createWarmWorkspace());
    }
  }

  async acquireWorkspace(userId: string, image: string): Promise<WarmWorkspace> {
    let ws = this.pool.find(w => w.image === image && !w.assigned);
    if (!ws) ws = await this.createWarmWorkspace(image);
    ws.assigned = true; ws.userId = userId; ws.assignedAt = Date.now();
    if (this.pool.length < this.config.maxPoolSize) {
      this.createWarmWorkspace(image).then(w => this.pool.push(w));
    }
    return ws;
  }

  async releaseWorkspace(workspaceId: string): Promise<void> {
    const idx = this.pool.findIndex(w => w.id === workspaceId);
    if (idx >= 0) {
      const ws = this.pool[idx];
      ws.assigned = false; ws.userId = null; ws.assignedAt = null;
    }
  }

  private async createWarmWorkspace(image?: string): Promise<WarmWorkspace> {
    return { id: crypto.randomUUID(), image: image ?? 'ideia-default:latest', createdAt: Date.now(), assigned: false, userId: null, assignedAt: null, url: '' };
  }
}

interface WarmWorkspace {
  id: string;
  image: string;
  createdAt: number;
  assigned: boolean;
  userId: string | null;
  assignedAt: number | null;
  url: string;
}
```

### 7.3 Browser Compatibility

```typescript
interface BrowserCapability {
  webgpu: boolean;
  webcodecs: boolean;
  webtransport: boolean;
  wasm: boolean;
  wasmSimd: boolean;
  sharedArrayBuffer: boolean;
  crossOriginIsolated: boolean;
  opfs: boolean;
  indexedDB: boolean;
  serviceWorker: boolean;
  webgl2: boolean;
  webWorker: boolean;
  audioWorklet: boolean;
}

class BrowserCapabilityDetector {
  detect(): BrowserCapability {
    return {
      webgpu: 'gpu' in navigator,
      webcodecs: 'VideoEncoder' in window && 'AudioEncoder' in window,
      webtransport: 'WebTransport' in window,
      wasm: 'WebAssembly' in window,
      wasmSimd: this.checkWasmSimd(),
      sharedArrayBuffer: 'SharedArrayBuffer' in window && !!window.crossOriginIsolated,
      crossOriginIsolated: !!window.crossOriginIsolated,
      opfs: 'storage' in navigator && 'getDirectory' in navigator.storage,
      indexedDB: 'indexedDB' in window,
      serviceWorker: 'serviceWorker' in navigator,
      webgl2: this.checkWebGL2(),
      webWorker: 'Worker' in window,
      audioWorklet: 'AudioWorklet' in window,
    };
  }

  private checkWasmSimd(): boolean {
    try { return WebAssembly.validate(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b])); }
    catch { return false; }
  }

  private checkWebGL2(): boolean {
    try { const canvas = document.createElement('canvas'); return !!canvas.getContext('webgl2'); }
    catch { return false; }
  }

  getOptimalTransport(caps: BrowserCapability): 'webtransport' | 'wss' | 'ws' {
    return caps.webtransport ? 'webtransport' : 'wss';
  }

  getRenderingMode(caps: BrowserCapability): 'webgpu' | 'webgl2' | 'canvas2d' {
    if (caps.webgpu) return 'webgpu';
    if (caps.webgl2) return 'webgl2';
    return 'canvas2d';
  }
}
```

---

## 8. Workspace & Session Management

### 8.1 Workspace Lifecycle

```
   [CREATED] --> [BUILDING] --> [READY] --> [ACTIVE] --> [SUSPENDED]
       |              |            |            |             |
       |              |            |            v             v
       |              |            +-------> [CLOSED]    [TERMINATED]
       |              v                       |
       |         [BUILD_FAILED]               v
       v                                [DELETED]
  [CANCELLED]
```

```typescript
interface WorkspaceManager {
  createWorkspace(config: WorkspaceConfig): Promise<Workspace>;
  openWorkspace(id: string): Promise<Workspace>;
  closeWorkspace(id: string): Promise<void>;
  deleteWorkspace(id: string): Promise<void>;
  suspendWorkspace(id: string): Promise<void>;
  resumeWorkspace(id: string): Promise<Workspace>;
  getWorkspace(id: string): Promise<Workspace>;
  listWorkspaces(filter?: WorkspaceFilter): Promise<Workspace[]>;
}

interface WorkspaceConfig {
  name: string;
  type: 'local' | 'remote' | 'container' | 'ssh' | 'cloud';
  image?: string;
  devcontainerConfig?: DevContainerConfig;
  sshConfig?: SshConnectionConfig;
  wslConfig?: WslConfig;
  persistence: 'ephemeral' | 'persistent';
  resourceLimits?: ResourceLimits;
  environment?: Record<string, string>;
  mountPoints?: MountPoint[];
  forwardedPorts?: ForwardedPort[];
  collaboration?: CollaborationConfig;
  template?: string;
}

interface Workspace {
  id: string;
  name: string;
  status: WorkspaceStatus;
  type: WorkspaceConfig['type'];
  createdAt: number;
  lastOpenedAt: number;
  state: WorkspaceState;
  config: WorkspaceConfig;
  session?: SessionInfo;
}

enum WorkspaceStatus {
  CREATED = 'created',
  BUILDING = 'building',
  BUILD_FAILED = 'build_failed',
  READY = 'ready',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
  TERMINATED = 'terminated',
  DELETED = 'deleted',
}

interface WorkspaceState {
  openFiles: string[];
  cursorPosition?: Position;
  activeTerminal?: string;
  dirtyFiles: string[];
  breakpoints: Breakpoint[];
  debugState?: DebugState;
  windowLayout?: WindowLayout;
  lastSavedAt: number;
}

interface ResourceLimits {
  cpu: string;
  memory: string;
  storage: string;
  ephemeral: string;
  gpu?: { count: number; model: string; };
}

interface ForwardedPort {
  local: number;
  remote: number;
  name?: string;
  protocol?: 'http' | 'https' | 'tcp';
  visibility?: 'private' | 'org' | 'public';
}

interface CollaborationConfig {
  enabled: boolean;
  maxParticipants: number;
  permissions: 'read' | 'write' | 'admin';
  shareLink?: string;
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();

  async createSession(workspaceId: string, clientInfo: ClientInfo): Promise<Session> {
    const session: Session = {
      id: crypto.randomUUID(), workspaceId, clientInfo,
      startedAt: Date.now(), lastActivity: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      state: 'active',
    };
    this.sessions.set(session.id, session);
    await this.persistSession(session);
    return session;
  }

  async restoreSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId) ?? await this.loadSession(sessionId);
    if (!session) return null;
    if (Date.now() > session.expiresAt) { await this.destroySession(sessionId); return null; }
    session.lastActivity = Date.now();
    return session;
  }

  private async persistSession(session: Session): Promise<void> {}
  private async loadSession(sessionId: string): Promise<Session | null> { return null; }
  private async destroySession(sessionId: string): Promise<void> { this.sessions.delete(sessionId); }
}

interface Session {
  id: string;
  workspaceId: string;
  clientInfo: ClientInfo;
  startedAt: number;
  lastActivity: number;
  expiresAt: number;
  state: 'active' | 'suspended' | 'closed';
}

interface ClientInfo {
  platform: string;
  version: string;
  browser?: string;
  ip?: string;
  userAgent?: string;
}

interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  category: 'language' | 'framework' | 'tool' | 'custom';
  config: WorkspaceConfig;
  prebuildImage?: string;
  featured: boolean;
  tags: string[];
}

class WorkspaceTemplateRegistry {
  private templates: Map<string, WorkspaceTemplate> = new Map();

  registerTemplate(template: WorkspaceTemplate): void { this.templates.set(template.id, template); }
  getTemplate(id: string): WorkspaceTemplate | undefined { return this.templates.get(id); }
  listTemplates(category?: string): WorkspaceTemplate[] {
    const all = Array.from(this.templates.values());
    return category ? all.filter(t => t.category === category) : all;
  }

  async instantiateTemplate(templateId: string, overrides?: Partial<WorkspaceConfig>): Promise<Workspace> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found: ' + templateId);
    const config: WorkspaceConfig = { ...template.config, ...overrides, name: overrides?.name ?? template.name };
    return { id: crypto.randomUUID(), name: config.name, status: WorkspaceStatus.CREATED, type: config.type, createdAt: Date.now(), lastOpenedAt: Date.now(), state: {} as WorkspaceState, config } as Workspace;
  }
}
```

---

## 9. Authentication & Authorization

### 9.1 Multi-Protocol Auth

```typescript
interface AuthProviderRegistry {
  getProvider(type: AuthType): AuthProvider;
  registerProvider(type: AuthType, provider: AuthProvider): void;
}

enum AuthType {
  OAUTH2 = 'oauth2',
  OIDC = 'oidc',
  SSH_KEY = 'ssh_key',
  GITHUB_CLI = 'github_cli',
  DEVICE_CODE = 'device_code',
  TOKEN = 'token',
  SESSION_COOKIE = 'session_cookie',
  MFA = 'mfa',
}

interface AuthProvider {
  type: AuthType;
  authenticate(): Promise<AuthResult>;
  validate(token: string): Promise<AuthValidation>;
  refresh(refreshToken: string): Promise<AuthResult>;
  revoke(): Promise<void>;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string[];
  idToken?: string;
  sessionState?: string;
}

interface AuthValidation {
  valid: boolean;
  userId: string;
  organizations: string[];
  permissions: string[];
  expiresAt: number;
  mfaRequired: boolean;
}

class OidcAuthProvider implements AuthProvider {
  type: AuthType = AuthType.OIDC;
  private issuer: string;
  private clientId: string;
  private redirectUri: string;
  private pkceVerifier: string | null = null;

  constructor(config: { issuer: string; clientId: string; redirectUri: string }) {
    this.issuer = config.issuer;
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;
  }

  async authenticate(): Promise<AuthResult> {
    this.pkceVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(this.pkceVerifier);
    const authUrl = new URL(this.issuer + '/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('scope', 'openid profile email offline_access');
    window.location.href = authUrl.toString();
    throw new Error('Redirecting...');
  }

  async handleRedirectCallback(): Promise<AuthResult> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code || !this.pkceVerifier) throw new Error('Invalid callback');
    const response = await fetch(this.issuer + '/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: this.clientId, code_verifier: this.pkceVerifier, code, redirect_uri: this.redirectUri }),
    });
    const tokens = await response.json();
    window.history.replaceState({}, document.title, window.location.pathname);
    return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresIn: tokens.expires_in, tokenType: tokens.token_type, scope: tokens.scope?.split(' '), idToken: tokens.id_token };
  }

  async validate(token: string): Promise<AuthValidation> {
    const response = await fetch(this.issuer + '/introspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Bearer ' + token },
      body: new URLSearchParams({ token }),
    });
    return response.json();
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const response = await fetch(this.issuer + '/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', client_id: this.clientId, refresh_token: refreshToken }),
    });
    return response.json();
  }

  async revoke(): Promise<void> {}

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return this.base64UrlEncode(new Uint8Array(hash));
  }

  private base64UrlEncode(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

class DeviceCodeAuthProvider implements AuthProvider {
  type: AuthType = AuthType.DEVICE_CODE;

  async authenticate(): Promise<AuthResult> {
    const deviceCodeResponse = await fetch('/oauth/device/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: 'ideia-cli', scope: 'openid profile' }),
    });
    const deviceCode = await deviceCodeResponse.json();
    console.log('Open ' + deviceCode.verification_uri + ' and enter code: ' + deviceCode.user_code);
    return this.pollForToken(deviceCode.device_code, deviceCode.interval);
  }

  private async pollForToken(deviceCode: string, interval: number): Promise<AuthResult> {
    while (true) {
      await new Promise(resolve => setTimeout(resolve, interval * 1000));
      const response = await fetch('/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:device_code', device_code: deviceCode, client_id: 'ideia-cli' }),
      });
      if (response.ok) return response.json();
      const error = await response.json();
      if (error.error === 'authorization_pending') continue;
      if (error.error === 'slow_down') { interval += 5; continue; }
      throw new Error('Auth failed: ' + error.error);
    }
  }

  async validate(token: string): Promise<AuthValidation> { return {} as AuthValidation; }
  async refresh(refreshToken: string): Promise<AuthResult> { return {} as AuthResult; }
  async revoke(): Promise<void> {}
}

class TokenManager {
  private tokens: Map<string, TokenEntry> = new Map();
  private refreshTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  storeToken(provider: string, result: AuthResult): void {
    const entry: TokenEntry = { ...result, storedAt: Date.now() };
    this.tokens.set(provider, entry);
    this.persistTokens();
    this.scheduleRefresh(provider, entry);
  }

  getToken(provider: string): string | null {
    const entry = this.tokens.get(provider);
    if (!entry) return null;
    if (Date.now() - entry.storedAt < (entry.expiresIn - 300) * 1000) return entry.accessToken;
    this.refreshToken(provider).catch(() => this.tokens.delete(provider));
    return null;
  }

  private async refreshToken(provider: string): Promise<void> {
    const entry = this.tokens.get(provider);
    if (!entry?.refreshToken) throw new Error('No refresh token');
    const response = await fetch('/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: entry.refreshToken }),
    });
    this.storeToken(provider, await response.json());
  }

  private scheduleRefresh(provider: string, entry: TokenEntry): void {
    const existing = this.refreshTimers.get(provider);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => this.refreshToken(provider).catch(() => {}), entry.expiresIn * 0.8 * 1000);
    this.refreshTimers.set(provider, timer);
  }

  clearTokens(): void {
    for (const timer of this.refreshTimers.values()) clearTimeout(timer);
    this.tokens.clear();
    this.refreshTimers.clear();
  }

  private persistTokens(): void {}
}

interface TokenEntry extends AuthResult {
  storedAt: number;
}
```

---

## 10. Gateway / Tunnel Service

### 10.1 VS Code Tunnel Architecture

```
REMOTE SERVER                     RELAY SERVER                     LOCAL CLIENT
     |                                |                                |
     |-- 1. Create Tunnel ----------->|                                |
     |   POST /tunnels/create         |                                |
     |<-- 2. Tunnel Created ----------|                                |
     |   { tunnelId, relayUrl }       |                                |
     |                                |                                |
     |-- 3. Connect to Relay -------->|                                |
     |   WebSocket WSS                |                                |
     |   Authenticate with tunnelId   |                                |
     |<== WebSocket Established ====> |                                |
     |                                |                                |
     |                                |<-- 4. Client Request ----------|
     |                                |   GET /tunnel/<tunnelId>       |
     |                                |                                |
     |                                |-- 5. Tunnel Connected -------->| WS
     |                                |<== WebSocket Established ====> |
     |                                |                                |
     |<== Bidirectional RPC ========> |<== Bidirectional RPC ========> |
```

```typescript
interface TunnelService {
  createTunnel(options: TunnelOptions): Promise<Tunnel>;
  connectToTunnel(tunnelId: string, auth: TunnelAuth): Promise<TunnelConnection>;
  listTunnels(): Promise<Tunnel[]>;
  closeTunnel(tunnelId: string): Promise<void>;
}

interface TunnelOptions {
  name?: string;
  description?: string;
  ports: number[];
  protocol: 'wss' | 'tcp';
  authentication: 'token' | 'github' | 'none';
  allowedOrigins?: string[];
  maxConnections: number;
  idleTimeout: number;
}

interface Tunnel {
  id: string;
  name: string;
  relayUrl: string;
  createdAt: number;
  status: 'pending' | 'active' | 'closed';
  connections: number;
  ports: number[];
  authToken: string;
}

interface TunnelAuth {
  token?: string;
  githubToken?: string;
  sessionId?: string;
}

interface TunnelConnection {
  tunnelId: string;
  clientId: string;
  relay: WebSocketTransport;
  portForwarding: PortForwardManager;
}

class TunnelClient {
  private tunnel: Tunnel | null = null;
  private transport: WebSocketTransportImpl | null = null;
  private portForwards: Map<number, PortForward> = new Map();

  async createTunnel(relayUrl: string, options: Partial<TunnelOptions>): Promise<Tunnel> {
    const response = await fetch(relayUrl + '/tunnels/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    this.tunnel = await response.json();
    return this.tunnel;
  }

  async connectToRelay(tunnel: Tunnel): Promise<void> {
    this.transport = new WebSocketTransportImpl({ reconnect: true, reconnectDelay: 1000, heartbeatInterval: 15000 });
    await this.transport.connect(tunnel.relayUrl + '/tunnel/' + tunnel.id, {
      headers: { 'Authorization': 'Bearer ' + tunnel.authToken },
    });
  }

  async forwardPort(localPort: number, remotePort: number): Promise<PortForward> {
    const forward: PortForward = {
      id: crypto.randomUUID(), localPort, remotePort, status: 'active',
      start: async () => {},
      stop: async () => {},
    };
    this.portForwards.set(localPort, forward);
    return forward;
  }

  async close(): Promise<void> {
    for (const pf of this.portForwards.values()) await pf.stop();
    this.portForwards.clear();
    if (this.tunnel) await fetch(this.tunnel.relayUrl + '/tunnels/' + this.tunnel.id + '/close', { method: 'POST' });
    if (this.transport) await this.transport.disconnect();
    this.tunnel = null;
  }
}

interface PortForward {
  id: string;
  localPort: number;
  remotePort: number;
  status: 'active' | 'stopped' | 'error';
  start(): Promise<void>;
  stop(): Promise<void>;
}

class PortForwardManager {
  private forwards: Map<number, PortForward> = new Map();

  async addForward(localPort: number, remotePort: number, transport: WebSocketTransport): Promise<PortForward> {
    const forward: PortForward = {
      id: crypto.randomUUID(), localPort, remotePort, status: 'active',
      start: async () => {},
      stop: async () => { const fwd = this.forwards.get(localPort); if (fwd) { fwd.status = 'stopped'; this.forwards.delete(localPort); } },
    };
    this.forwards.set(localPort, forward);
    await forward.start();
    return forward;
  }

  async removeForward(localPort: number): Promise<void> {
    const forward = this.forwards.get(localPort);
    if (forward) await forward.stop();
  }

  listForwards(): PortForward[] { return Array.from(this.forwards.values()); }
  async closeAll(): Promise<void> { for (const [port] of this.forwards) await this.removeForward(port); }
}

interface ReverseProxyConfig {
  upstreamUrl: string;
  allowedOrigins: string[];
  rateLimit: number;
  corsEnabled: boolean;
  websocketSupport: boolean;
  pathRewrite?: Record<string, string>;
}

class ReverseProxyHandler {
  async handleRequest(request: Request, config: ReverseProxyConfig): Promise<Response> {
    const origin = request.headers.get('Origin');
    if (origin && !config.allowedOrigins.includes(origin)) return new Response('Forbidden', { status: 403 });
    let path = request.url;
    if (config.pathRewrite) {
      for (const [pattern, replacement] of Object.entries(config.pathRewrite)) {
        path = path.replace(new RegExp(pattern), replacement);
      }
    }
    const upstreamResponse = await fetch(config.upstreamUrl + path, { method: request.method, headers: request.headers, body: request.body, duplex: 'half' });
    const responseHeaders = new Headers(upstreamResponse.headers);
    if (config.corsEnabled) {
      responseHeaders.set('Access-Control-Allow-Origin', origin ?? '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: responseHeaders });
  }
}
```

---

## 11. Performance & Optimization

### 11.1 Network Profiling

```typescript
interface NetworkProfile {
  roundTripTime: number;
  bandwidth: number;
  packetLoss: number;
  jitter: number;
  connectionType: '4g' | '5g' | 'wifi' | 'ethernet' | 'offline';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
}

class NetworkProfiler {
  private measurementResults: number[] = [];

  async measure(): Promise<NetworkProfile> {
    this.measurementResults = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      try { await fetch('/api/ping', { method: 'HEAD', cache: 'no-store' }); this.measurementResults.push(performance.now() - start); }
      catch { this.measurementResults.push(1000); }
    }
    const rtt = this.measurementResults.reduce((a, b) => a + b, 0) / this.measurementResults.length;
    const connection = (navigator as unknown as { connection?: NetworkInformation }).connection;
    return {
      roundTripTime: Math.round(rtt),
      bandwidth: rtt < 20 ? 100 : rtt < 50 ? 50 : rtt < 100 ? 25 : rtt < 200 ? 10 : 5,
      packetLoss: 0,
      jitter: this.calculateJitter(),
      connectionType: connection?.type as NetworkProfile['connectionType'] ?? 'wifi',
      effectiveType: connection?.effectiveType as '4g' ?? '4g',
    };
  }

  private calculateJitter(): number {
    if (this.measurementResults.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < this.measurementResults.length; i++) {
      sum += Math.abs(this.measurementResults[i] - this.measurementResults[i - 1]);
    }
    return sum / (this.measurementResults.length - 1);
  }
}

class AdaptiveQualityManager {
  private profiler: NetworkProfiler;
  private quality: 'ultra' | 'high' | 'medium' | 'low' | 'minimal' = 'high';

  constructor(profiler: NetworkProfiler) { this.profiler = profiler; }

  async adjustQuality(): Promise<void> {
    const profile = await this.profiler.measure();
    if (profile.roundTripTime < 30 && profile.bandwidth > 50) this.quality = 'ultra';
    else if (profile.roundTripTime < 80 && profile.bandwidth > 20) this.quality = 'high';
    else if (profile.roundTripTime < 150 && profile.bandwidth > 10) this.quality = 'medium';
    else if (profile.roundTripTime < 300) this.quality = 'low';
    else this.quality = 'minimal';
  }

  getQualityLevel(): string { return this.quality; }

  getSyncInterval(): number {
    switch (this.quality) {
      case 'ultra': return 16;
      case 'high': return 33;
      case 'medium': return 50;
      case 'low': return 100;
      case 'minimal': return 200;
    }
  }
}

class MessageBatcher {
  private queue: JsonRpcMessage[] = [];
  private maxBatchSize: number;
  private maxBatchDelay: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private send: (messages: JsonRpcMessage[]) => Promise<void>;

  constructor(send: (messages: JsonRpcMessage[]) => Promise<void>, config?: { maxBatchSize?: number; maxBatchDelay?: number }) {
    this.send = send;
    this.maxBatchSize = config?.maxBatchSize ?? 50;
    this.maxBatchDelay = config?.maxBatchDelay ?? 10;
  }

  add(message: JsonRpcMessage): void {
    this.queue.push(message);
    if (this.queue.length >= this.maxBatchSize) this.flush();
    else if (!this.timer) this.timer = setTimeout(() => this.flush(), this.maxBatchDelay);
  }

  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0);
    try { await this.send(batch); } catch { this.queue.unshift(...batch); }
  }
}
```

---

## 12. Security Model

```
+------------------------------------------------------------------+
|  SECURITY LAYERS                                                  |
|                                                                   |
|  Layer 1: Transport Security                                      |
|  - TLS 1.3 for all network communication                          |
|  - WebSocket Secure (WSS) for real-time channels                  |
|  - SSH ciphers (chacha20-poly1305@openssh.com)                    |
|                                                                   |
|  Layer 2: Authentication                                          |
|  - OAuth2/OIDC for cloud                                          |
|  - SSH keys for server access                                     |
|  - Device code flow for CLI                                       |
|  - MFA enforcement for admin operations                           |
|                                                                   |
|  Layer 3: Authorization (RBAC)                                    |
|  - Organization/team/user roles                                   |
|  - Workspace-level permissions                                    |
|  - Feature-level access control                                   |
|                                                                   |
|  Layer 4: Workspace Isolation                                     |
|  - Container-level sandboxing (Docker/K8s)                        |
|  - User namespace mapping                                         |
|  - Network policies (eBPF/Cilium)                                 |
|  - Seccomp profiles for containers                                |
|                                                                   |
|  Layer 5: Data Security                                           |
|  - Encrypted storage (at rest)                                    |
|  - Secrets management (vault/encrypted env)                       |
|  - Audit logging for all operations                               |
|  - Data retention policies                                        |
|                                                                   |
|  Layer 6: Rate Limiting & DDoS Protection                         |
|  - Per-user rate limiting (RPM, RPS)                              |
|  - Connection limits per IP/session                               |
|  - Automatic ban on abuse detection                               |
|                                                                   |
+------------------------------------------------------------------+
```

```typescript
interface SecurityPolicy {
  workspaceTrust: WorkspaceTrustPolicy;
  portForwarding: PortForwardPolicy;
  containerSandbox: ContainerSandboxPolicy;
  networkIsolation: NetworkIsolationPolicy;
  fileSystemIsolation: FileSystemIsolationPolicy;
  secretsManagement: SecretsManagementPolicy;
  auditLogging: AuditLoggingPolicy;
  rateLimiting: RateLimitingPolicy;
}

interface WorkspaceTrustPolicy {
  trustLevel: 'untrusted' | 'partial' | 'trusted';
  restrictedModes: string[];
  allowList: string[];
  denyList: string[];
  autoTrust: boolean;
}

interface PortForwardPolicy {
  allowedPorts: number[];
  blockedPorts: number[];
  maxForwards: number;
  requireConfirmation: boolean;
}

interface ContainerSandboxPolicy {
  readOnlyRoot: boolean;
  dropCapabilities: string[];
  seccompProfile: string;
  appArmorProfile: string;
  allowPrivilegeEscalation: boolean;
  userNamespaceMapping: boolean;
  maxMemory: string;
  maxCPU: string;
}

interface NetworkIsolationPolicy {
  allowEgress: boolean;
  blockedDomains: string[];
  allowedIPRanges: string[];
  dnsFiltering: boolean;
  proxyOnly: boolean;
}

interface SecretsManagementPolicy {
  encryptionAlgorithm: string;
  keyRotationDays: number;
  vaultBackend: 'env' | 'hashicorp' | 'aws' | 'gcp';
  maskInLogs: boolean;
}

interface RateLimitingPolicy {
  requestsPerMinute: number;
  requestsPerSecond: number;
  burstSize: number;
  concurrentConnections: number;
  banThreshold: number;
  banDuration: number;
}

class PortForwardValidator {
  private readonly BLOCKED_PORTS = [22, 23, 3389, 5900, 5901, 6379, 27017];
  private readonly SENSITIVE_PORTS = [443, 8443, 9443];

  validateForward(localPort: number, remotePort: number): { allowed: boolean; reason?: string } {
    if (this.BLOCKED_PORTS.includes(remotePort)) return { allowed: false, reason: 'Port ' + remotePort + ' is blocked' };
    if (this.SENSITIVE_PORTS.includes(remotePort) && localPort !== remotePort) return { allowed: false, reason: 'Cannot remap sensitive ports' };
    if (localPort < 1024 && localPort !== 80 && localPort !== 443) return { allowed: false, reason: 'Privileged port requires confirmation' };
    return { allowed: true };
  }
}

class WorkspaceTrustEvaluator {
  evaluate(path: string, config: WorkspaceTrustPolicy): { trusted: boolean; level: string; reason?: string } {
    for (const pattern of config.denyList) {
      if (this.matchGlob(path, pattern)) return { trusted: false, level: 'untrusted', reason: 'Matched deny list: ' + pattern };
    }
    for (const pattern of config.allowList) {
      if (this.matchGlob(path, pattern)) return { trusted: true, level: 'trusted' };
    }
    if (config.autoTrust) return { trusted: true, level: 'partial', reason: 'Auto-trusted' };
    return { trusted: false, level: 'untrusted', reason: 'Not in trust list' };
  }

  private matchGlob(path: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return regex.test(path);
  }
}
```

---

## 13. Web IDE vs Desktop IDE Comparison

### 13.1 Feature Matrix

| Feature | Desktop IDE (Electron) | Web IDE (Browser) | PWA Hybrid |
|---------|----------------------|-------------------|------------|
| Performance | Nativa (V8 JIT + GPU) | Dependente do navegador | Cache local + remoto |
| Offline | Completo | Limitado (PWA) | App shell + sync |
| Hardware Access | GPU, USB, COM port, file system completo | Limitado (WebUSB, WebSerial, OPFS) | Medio (PWA + native bridge) |
| File System | SO completo | Origin Private FS + downloads | OPFS + sync |
| Extensions | Processo nativo + IPC | Web Workers + Service Worker | Web Workers + fallback |
| Debugging | Nativo (V8 Inspector, GDB) | Limitado (Chrome DevTools) | Chrome DevTools + proxy |
| Terminal | Node-pty nativo | xterm.js + SSH WS | xterm.js + SW |
| LSP | Processo filho via stdio | LSP via WebSocket | WebSocket + cache |
| Git | Git CLI nativo | WASM git (isomorphic-git) | WASM git + remote |
| Docker | Docker CLI local | Docker API remota | Docker API remota |
| Multi-threading | Worker threads nativas | Web Workers | Web Workers + WASM threads |
| Startup Time | 2-10s | 0.5-3s | 0.5-1s |
| Memory Usage | 300-800 MB | 100-400 MB | 150-500 MB |
| Distribution | Download + instalacao | URL + zero install | URL + PWA prompt |
| Updates | Auto-updater (electron-builder) | Instantaneo (server-side) | PWA update flow |
| Collaboration | Limitado (extensions) | Nativo (WebSocket) | Nativo (WebSocket) |

### 13.2 IDEIA Hybrid Strategy

```
+------------------------------------------------------------------+
|  IDEIA HYBRID ARCHITECTURE                                        |
|                                                                   |
|  Layer 1: PWA (Browser)                                          |
|  - Zero install, anytime access                                   |
|  - App shell for offline capability                               |
|  - Service Worker for caching and sync                            |
|  - IndexedDB for local state persistence                          |
|  - OPFS for local file editing                                    |
|                                                                   |
|  Layer 2: Desktop Shell (Electron)                                |
|  - PWA wrapper + native capabilities                              |
|  - Direct file system access (no OPFS limits)                     |
|  - Node-pty for native terminal                                   |
|  - Local extension host for performance                           |
|  - Auto-updater for seamless updates                              |
|  - System tray, deep links, protocol handlers                     |
|                                                                   |
|  Layer 3: Remote Backend (Optional)                               |
|  - SSH/Container/WSL remote hosts                                 |
|  - Theia Cloud for cloud workspaces                               |
|  - Workspace pooling for instant startup                          |
|  - Remote extension host for heavy workloads                      |
|                                                                   |
|  Runtime Decision:                                                |
|  - User always gets PWA first (fastest path)                      |
|  - Desktop shell auto-detected and recommended for local dev      |
|  - Remote backend activated when workspace is non-local           |
|  - Seamless transition between all three modes                    |
|                                                                   |
+------------------------------------------------------------------+
```

---

## 14. Code Examples

### 14.1 Remote Extension Host Connection Manager

```typescript
import { EventEmitter } from 'events';

interface RemoteHostConfig {
  host: string;
  port: number;
  protocol: 'wss' | 'ws' | 'tcp';
  token: string;
  workspace: string;
}

class RemoteExtensionHostConnectionManager extends EventEmitter {
  private config: RemoteHostConfig;
  private transport: WebSocketTransportImpl | null = null;
  private messageBatcher: MessageBatcher | null = null;
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timer: NodeJS.Timeout }> = new Map();
  private requestCounter = 0;
  private connected = false;
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private capabilities: ServerCapabilities | null = null;
  private readonly REQUEST_TIMEOUT = 30000;

  constructor(config: RemoteHostConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    this.setStatus(ConnectionStatus.CONNECTING);
    this.transport = new WebSocketTransportImpl({
      reconnect: true, reconnectDelay: 1000, maxReconnectDelay: 30000,
      maxReconnectAttempts: 10, heartbeatInterval: 15000, heartbeatTimeout: 30000,
    });
    this.messageBatcher = new MessageBatcher(
      async (messages) => { await this.transport?.send({ jsonrpc: '2.0', method: 'batch', params: messages, id: this.nextId() }); },
      { maxBatchSize: 50, maxBatchDelay: 10 }
    );
    const wsUrl = this.config.protocol + '://' + this.config.host + ':' + this.config.port + '/remote/' + this.config.workspace;
    this.transport.onMessage((msg) => this.handleMessage(msg));
    this.transport.onStatusChange((status) => { this.connectionStatus = status; this.emit('statusChange', status); });
    await this.transport.connect(wsUrl, { headers: { 'Authorization': 'Bearer ' + this.config.token, 'X-Workspace-Id': this.config.workspace } });
    await this.performHandshake();
    await this.authenticate();
    await this.negotiateCapabilities();
    this.connected = true;
    this.setStatus(ConnectionStatus.CONNECTED);
  }

  private async performHandshake(): Promise<void> {
    const response = await this.sendRequest('handshake', { protocolVersion: 2, clientVersion: '1.0.0', features: ['binaryTransport', 'compression'] });
    if (response.error) throw new Error('Handshake failed: ' + response.error.message);
  }

  private async authenticate(): Promise<void> {
    const response = await this.sendRequest('auth', { token: this.config.token, type: 'bearer' });
    if (!response.result?.authenticated) throw new Error('Authentication failed');
  }

  private async negotiateCapabilities(): Promise<void> {
    const response = await this.sendRequest('capabilities', {
      clientCapabilities: { version: '1.0.0', protocolVersion: 2, features: { binaryTransport: true, streaming: true, compression: 'zstd' } },
    });
    this.capabilities = response.result as ServerCapabilities;
    this.emit('capabilities', this.capabilities);
  }

  async sendRequest(method: string, params: unknown, timeout?: number): Promise<{ result?: unknown; error?: { code: number; message: string } }> {
    const id = this.nextId();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pendingRequests.delete(id); reject(new Error('Request timeout: ' + method)); }, timeout ?? this.REQUEST_TIMEOUT);
      this.pendingRequests.set(id, { resolve, reject, timer });
      const message: JsonRpcMessage = { jsonrpc: '2.0', method, params: [params], id };
      this.messageBatcher?.add(message);
    });
  }

  sendNotification(method: string, params: unknown): void {
    this.messageBatcher?.add({ jsonrpc: '2.0', method, params: [params] });
  }

  private handleMessage(msg: JsonRpcMessage): void {
    if (msg.id !== undefined && 'result' in msg) {
      const pending = this.pendingRequests.get(String(msg.id));
      if (pending) { clearTimeout(pending.timer); this.pendingRequests.delete(String(msg.id)); pending.resolve(msg); }
      return;
    }
    if (msg.id !== undefined && 'error' in msg) {
      const pending = this.pendingRequests.get(String(msg.id));
      if (pending) { clearTimeout(pending.timer); this.pendingRequests.delete(String(msg.id)); pending.reject(new Error(msg.error?.message)); }
      return;
    }
    if ('method' in msg) this.emit('notification', msg);
  }

  async disconnect(): Promise<void> {
    await this.messageBatcher?.flush();
    await this.transport?.disconnect();
    this.connected = false;
    this.setStatus(ConnectionStatus.DISCONNECTED);
  }

  private nextId(): string { return String(++this.requestCounter); }
  private setStatus(status: ConnectionStatus): void { this.connectionStatus = status; this.emit('statusChange', status); }
  isConnected(): boolean { return this.connected; }
  getCapabilities(): ServerCapabilities | null { return this.capabilities; }
}
```

### 14.2 DevContainer JSON Parser with Zod

```typescript
import { z } from 'zod';

const PortAttributesSchema = z.object({
  label: z.string().optional(),
  protocol: z.enum(['http', 'https']).optional(),
  onAutoForward: z.enum(['notify', 'openBrowser', 'openPreview', 'silent']).optional(),
  requireLocalPort: z.boolean().optional(),
  elevateIfNeeded: z.boolean().optional(),
});

const MountPointSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.enum(['bind', 'volume', 'tmpfs']).optional(),
  readOnly: z.boolean().optional(),
  consistency: z.enum(['cached', 'consistent', 'delegated']).optional(),
});

const BuildSchema = z.object({
  dockerfile: z.string(),
  context: z.string().optional(),
  args: z.record(z.string()).optional(),
  target: z.string().optional(),
  cacheFrom: z.array(z.string()).optional(),
  options: z.array(z.string()).optional(),
});

export const DevContainerConfigSchema = z.object({
  image: z.string().optional(),
  build: BuildSchema.optional(),
  dockerFile: z.string().optional(),
  dockerComposeFile: z.union([z.string(), z.array(z.string())]).optional(),
  context: z.string().optional(),
  features: z.record(z.record(z.union([z.string(), z.boolean(), z.number(), z.undefined()]))).optional(),
  forwardPorts: z.array(z.number()).optional(),
  portsAttributes: z.record(PortAttributesSchema).optional(),
  remoteUser: z.string().optional(),
  containerEnv: z.record(z.string()).optional(),
  mountPoints: z.array(MountPointSchema).optional(),
  postCreateCommand: z.union([z.string(), z.array(z.string())]).optional(),
  customizations: z.record(z.unknown()).optional(),
  privileged: z.boolean().optional(),
  capAdd: z.array(z.string()).optional(),
  securityOpt: z.array(z.string()).optional(),
}).refine((data) => data.image || data.build || data.dockerFile, { message: 'Must specify image, build, or dockerFile' });

export type DevContainerConfigType = z.infer<typeof DevContainerConfigSchema>;

class DevContainerParserWithZod {
  parse(raw: string): DevContainerConfigType {
    const result = DevContainerConfigSchema.safeParse(JSON.parse(raw));
    if (!result.success) throw new Error('Invalid devcontainer.json: ' + result.error.message);
    return result.data;
  }

  generateDockerRunArgs(config: DevContainerConfigType): string[] {
    const args: string[] = [];
    if (config.remoteUser) args.push('--user', config.remoteUser);
    if (config.containerEnv) { for (const [k, v] of Object.entries(config.containerEnv)) args.push('--env', k + '=' + v); }
    if (config.mountPoints) { for (const m of config.mountPoints) args.push('--mount', 'type=' + (m.type ?? 'bind') + ',source=' + m.source + ',target=' + m.target + (m.readOnly ? ',readonly' : '')); }
    if (config.forwardPorts) { for (const p of config.forwardPorts) args.push('--publish', String(p) + ':' + String(p)); }
    if (config.privileged) args.push('--privileged');
    if (config.capAdd) { for (const c of config.capAdd) args.push('--cap-add', c); }
    return args;
  }
}
```

### 14.3 SSH Connection with Key Management

```typescript
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface SshConnectionResult { process: ChildProcess; controlPath: string; }

class SshConnectionProvider {
  private controlDir: string;

  constructor(controlDir?: string) {
    this.controlDir = controlDir ?? path.join(process.env.HOME ?? '', '.ssh', 'controlmasters');
    if (!fs.existsSync(this.controlDir)) fs.mkdirSync(this.controlDir, { recursive: true });
  }

  async connect(config: SshConnectionConfig): Promise<SshConnectionResult> {
    const controlPath = path.join(this.controlDir, config.user + '@' + config.hostname + ':' + config.port);
    const args = this.buildArgs(config, controlPath);

    if (config.controlMaster !== 'no') {
      const masterArgs = ['-o', 'ControlPath=' + controlPath, '-o', 'ControlMaster=yes', '-o', 'ControlPersist=' + config.controlPersist, '-N', ...args.slice(0, -1), config.user + '@' + config.hostname];
      const master = spawn('ssh', masterArgs, { stdio: 'ignore', detached: true });
      master.unref();
      await this.waitForSocket(controlPath, 5000);
    }

    const process = spawn('ssh', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    return { process, controlPath };
  }

  private buildArgs(config: SshConnectionConfig, controlPath: string): string[] {
    const args: string[] = [];
    args.push('-o', 'ServerAliveInterval=' + config.serverAliveInterval);
    args.push('-o', 'ServerAliveCountMax=' + config.serverAliveCountMax);
    args.push('-o', 'StrictHostKeyChecking=accept-new');
    if (config.forwardAgent) args.push('-o', 'ForwardAgent=yes');
    if (config.controlMaster !== 'no') { args.push('-o', 'ControlPath=' + controlPath); args.push('-o', 'ControlMaster=no'); }
    if (config.identityFile) { for (const idFile of config.identityFile) args.push('-i', idFile); }
    if (config.proxyJump) args.push('-J', config.proxyJump);
    if (config.compression) args.push('-C');
    if (config.localForward) { for (const fwd of config.localForward) args.push('-L', fwd); }
    args.push('-p', String(config.port));
    args.push(config.user + '@' + config.hostname);
    return args;
  }

  private waitForSocket(socketPath: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (fs.existsSync(socketPath)) { resolve(); return; }
        if (Date.now() - start > timeoutMs) { reject(new Error('Timeout waiting for SSH control socket')); return; }
        setTimeout(check, 100);
      };
      check();
    });
  }

  async runCommand(config: SshConnectionConfig, command: string): Promise<string> {
    const { process } = await this.connect(config);
    const stdout: Buffer[] = [];
    process.stdout!.on('data', (data: Buffer) => stdout.push(data));
    process.stdin!.write(command + '\n');
    process.stdin!.end();
    return new Promise((resolve, reject) => {
      process.on('close', (code) => { if (code === 0) resolve(Buffer.concat(stdout).toString()); else reject(new Error('SSH command failed with code ' + code)); });
      process.on('error', reject);
    });
  }
}
```

### 14.4 Tunnel Client

```typescript
class TunnelClientImpl {
  private tunnel: Tunnel | null = null;
  private transport: WebSocketTransportImpl | null = null;

  async createAndConnect(relayUrl: string, authToken: string): Promise<void> {
    const response = await fetch(relayUrl + '/tunnels/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
      body: JSON.stringify({ name: 'ideia-tunnel', ports: [3000, 8080], protocol: 'wss', authentication: 'token', maxConnections: 5, idleTimeout: 3600000 }),
    });
    this.tunnel = await response.json();

    this.transport = new WebSocketTransportImpl({ reconnect: true, reconnectDelay: 1000, heartbeatInterval: 15000 });
    await this.transport.connect(relayUrl + '/tunnel/' + this.tunnel.id, { headers: { 'Authorization': 'Bearer ' + this.tunnel.authToken } });
  }

  async forwardPort(localPort: number, targetHost: string, targetPort: number): Promise<void> {
    // Send port forward request through tunnel
    await this.transport?.send({
      jsonrpc: '2.0', method: 'portForward', params: [{ localPort, targetHost, targetPort }], id: 1,
    });
  }

  async close(): Promise<void> {
    await this.transport?.disconnect();
    if (this.tunnel) {
      await fetch(this.tunnel.relayUrl + '/tunnels/' + this.tunnel.id + '/close', { method: 'POST' });
    }
  }
}
```

---

## 15. Conexoes

### 15.1 Estudos Relacionados

| Estudo | Relacao |
|--------|---------|
| S11 (Theia IDE) | Theia Cloud como plataforma de Web IDE. Integracao com plugin-ext, frontend services e backend services. |
| S15 (Cloud/Infra) | Infraestrutura cloud (Kubernetes, storage, networking) para deployment de workspaces remotos. |
| S22 (Colaboracao) | Sessoes compartilhadas, edicao colaborativa em tempo real sobre workspaces remotos. |
| S35 (FileSystem) | VFS providers remotos (RemoteFS, SSH FS, WSL FS). File watching sobre rede. |
| S36 (Extension Host) | Remote extension host model. Extensions rodando no servidor remoto. |
| S31 (LLM Integration) | Agentes de IA conectando-se a workspaces remotos para execucao de tarefas autonomous. |
| S34 (Monaco Editor) | Editor no browser conectado a backend remoto via WebSocket. |
| S21 (Terminal/Debug) | Terminal remoto (xterm.js + WebSocket) e debug remoto (DAP sobre tunel). |
| S4 (Seguranca) | Workspace trust, port forwarding safety, container sandboxing, secrets management. |
| S5 (Multiagente) | Agentes distribuidos acessando workspaces remotos concorrentemente. |
| S14 (Autenticacao) | OAuth2/OIDC para cloud IDE. Autenticacao SSH para remote access. |
| S12 (Testes) | Testes de conexao remota, simulacao de latencia, fallback de transporte. |
| E2 (Desktop Native) | Electron desktop shell vs browser PWA. Hybrid distribution strategy. |

### 15.2 Contratos de Integracao

| Contrato | Origem | Destino | Protocolo |
|----------|--------|---------|-----------|
| C-RW-01 | Cliente Browser | Theia Backend | JSON-RPC over WSS |
| C-RW-02 | Cliente Desktop | Remote Extension Host | JSON-RPC over TCP/WSS |
| C-RW-03 | Remote Extension Host | Language Server | LSP 3.18 |
| C-RW-04 | Remote Extension Host | Debug Adapter | DAP 1.59 |
| C-RW-05 | Tunnel Client | Relay Server | WSS Tunnel |
| C-RW-06 | SSH Client | Remote Host | SSH Protocol |
| C-RW-07 | Dev Container | Docker Daemon | Docker API |
| C-RW-08 | WSL Provider | WSL Instance | 9P / wsl.exe |
| C-RW-09 | Workspace Manager | K8s API | REST/gRPC |
| C-RW-10 | Auth Provider | OIDC Provider | OIDC/OAuth2 |
| C-RW-11 | Service Worker | Cache Storage | Cache API |
| C-RW-12 | PWA App Shell | IndexedDB | IndexedDB API |

### 15.3 Interfaces Compartilhadas

| Interface | Estudos Consumidores | Descricao |
|-----------|---------------------|-----------|
| RemoteFileSystemProvider | S35, S36, S41 | Acesso remoto ao sistema de arquivos |
| ExtensionHostRemote | S36, S41 | Extension host remoto via rede |
| WebSocketTransport | S41, S22, S31 | Transporte bidirecional baseado em WebSocket |
| MessageBus | S41, S15, S31 | Barramento de mensagens JSON-RPC |
| AuthProvider | S41, S14, S9 | Provedor de autenticacao (OIDC, SSH, token) |
| TunnelService | S41, S15, S21 | Cricao e gerenciamento de tuneis |
| WorkspaceManager | S41, S35, S36 | Gerenciamento de workspaces remotos |
| PwaService | S41, S22 | Service Worker, offline, instalacao PWA |

---

## 16. Plano de Implementacao

### Fase 1 — Remote Extension Host Core (2 semanas)

| Tarefa | Descricao | Prioridade | Esforco |
|--------|-----------|-----------|---------|
| RWH-01 | Connection manager com handshake, auth, capability negotiation | P0 | 12h |
| RWH-02 | WebSocket transport implementation (JSON-RPC, framing, heartbeat, reconnection) | P0 | 10h |
| RWH-03 | Message batcher and compression (gzip/zstd) | P0 | 6h |
| RWH-04 | Binary message serializer for high-frequency edits | P0 | 8h |
| RWH-05 | RemoteFileSystemProvider with chunked transfers | P0 | 10h |
| RWH-06 | RemoteFileWatcher with batching and debounce | P0 | 6h |
| RWH-07 | Latency compensation (local echo, optimistic UI, debounced saves) | P1 | 10h |
| RWH-08 | Reconnection logic with session migration | P1 | 8h |
| RWH-09 | Unit tests for connection lifecycle | P0 | 8h |
| RWH-10 | Integration tests (client + server) | P0 | 8h |

**Total Fase 1:** 86h

### Fase 2 — SSH, WSL and Dev Containers (2 semanas)

| Tarefa | Descricao | Prioridade | Esforco |
|--------|-----------|-----------|---------|
| RWH-11 | SSH config parser (Host, HostName, User, IdentityFile, ProxyJump) | P0 | 6h |
| RWH-12 | SSH connection manager with multiplexing (ControlMaster) | P0 | 10h |
| RWH-13 | SSH agent forwarding and key management | P0 | 6h |
| RWH-14 | Jump host chain support | P1 | 4h |
| RWH-15 | Dev container parser (devcontainer.json with Zod schema) | P0 | 8h |
| RWH-16 | Dev container lifecycle (create, build, start, stop) | P0 | 10h |
| RWH-17 | Feature resolver and install script generator | P1 | 8h |
| RWH-18 | Pre-build container cache | P1 | 6h |
| RWH-19 | WSL distribution manager (list, install, set-version) | P0 | 8h |
| RWH-20 | WSL file system provider (\\\\wsl.localhost\\) | P0 | 6h |
| RWH-21 | Tests for SSH, WSL, and Dev Containers | P0 | 10h |

**Total Fase 2:** 82h

### Fase 3 — PWA and Web IDE (10 dias)

| Tarefa | Descricao | Prioridade | Esforco |
|--------|-----------|-----------|---------|
| RWH-22 | PWA service worker (install, activate, fetch strategies) | P0 | 10h |
| RWH-23 | App shell caching (static + dynamic + offline page) | P0 | 6h |
| RWH-24 | IndexedDB state persistence and sync | P0 | 8h |
| RWH-25 | Background sync for workspace data | P1 | 6h |
| RWH-26 | Install prompt and update notification | P1 | 4h |
| RWH-27 | Push notification support | P2 | 6h |
| RWH-28 | Browser capability detector (WebGPU, WebCodecs, WebTransport) | P0 | 4h |
| RWH-29 | Adaptive quality manager (network-aware rendering) | P1 | 8h |
| RWH-30 | Network profiler (RTT, bandwidth, jitter measurement) | P1 | 6h |
| RWH-31 | WebTransport messaging for low-latency transport | P2 | 8h |
| RWH-32 | Web IDE deployment config (pooling, scheduling) | P1 | 8h |
| RWH-33 | Workspace pool implementation | P1 | 10h |
| RWH-34 | Tests for PWA and Web IDE | P0 | 8h |

**Total Fase 3:** 92h

### Fase 4 — Workspace, Auth, Tunnels and Security (2 semanas)

| Tarefa | Descricao | Prioridade | Esforco |
|--------|-----------|-----------|---------|
| RWH-35 | Workspace manager (create, open, close, delete, suspend, resume) | P0 | 12h |
| RWH-36 | Session manager with persistence and restoration | P0 | 8h |
| RWH-37 | Workspace template registry | P1 | 6h |
| RWH-38 | OIDC/OAuth2 authentication provider (PKCE flow) | P0 | 10h |
| RWH-39 | Device code flow for CLI auth | P1 | 6h |
| RWH-40 | Token manager with automatic refresh | P0 | 6h |
| RWH-41 | Tunnel service (create, connect, relay, close) | P0 | 12h |
| RWH-42 | Port forward manager | P0 | 8h |
| RWH-43 | Reverse proxy handler with CORS and WebSocket upgrade | P1 | 6h |
| RWH-44 | Security policies (workspace trust, port safety, container sandbox) | P0 | 10h |
| RWH-45 | Port forward validator (blocked ports, sensitive ports) | P1 | 4h |
| RWH-46 | Rate limiter and audit logging | P1 | 8h |
| RWH-47 | Tests for workspace, auth, tunnels, security | P0 | 10h |

**Total Fase 4:** 106h

### Fase 5 — Integration and Hybrid Shell (1 semana)

| Tarefa | Descricao | Prioridade | Esforco |
|--------|-----------|-----------|---------|
| RWH-48 | Integrate with S35 FileSystem (RemoteFS provider bridge) | P0 | 8h |
| RWH-49 | Integrate with S36 Extension Host (remote host activation) | P0 | 10h |
| RWH-50 | Integrate with S34 Monaco Editor (remote document sync) | P0 | 6h |
| RWH-51 | Integrate with S21 Terminal/Debug (remote terminal, remote DAP) | P0 | 8h |
| RWH-52 | Hybrid shell: Electron wrapper with PWA app shell | P1 | 12h |
| RWH-53 | Seamless transition between PWA, Desktop, and Remote modes | P1 | 8h |
| RWH-54 | End-to-end tests (local -> remote -> cloud -> hybrid flow) | P0 | 10h |
| RWH-55 | Performance benchmarks (latency budget, bandwidth, startup time) | P1 | 6h |
| RWH-56 | Documentation and architecture diagrams | P1 | 8h |

**Total Fase 5:** 76h

### Cronograma

```
Semana 1-2:  Fase 1 (Remote Extension Host Core)
Semana 3-4:  Fase 2 (SSH, WSL, Dev Containers)
Semana 5-6:  Fase 3 (PWA and Web IDE)
Semana 7-8:  Fase 4 (Workspace, Auth, Tunnels, Security)
Semana 9:    Fase 5 (Integration and Hybrid Shell)
```

**Esforco total estimado:** ~442h (9 semanas)
**Dependencias:** S35 (FileSystem), S36 (Extension Host), S34 (Monaco), S21 (Terminal/Debug), S14 (Autenticacao), S15 (Cloud/Infra)
**Entregavel:** packages/ideia-remote/ with all modules, 250+ tests

---

## Referencias

1. **VS Code Remote Development** -- https://code.visualstudio.com/docs/remote/remote-overview
2. **VS Code Remote Tunnels** -- https://code.visualstudio.com/docs/remote/tunnels
3. **Dev Containers Specification** -- https://containers.dev/
4. **Dev Container Features** -- https://containers.dev/features
5. **OpenSSH Manual** -- https://www.openssh.com/manual.html
6. **WSL Architecture** -- https://learn.microsoft.com/en-us/windows/wsl/
7. **Theia Cloud** -- https://theia-ide.org/docs/cloud
8. **Theia IDE** -- https://theia-ide.org/
9. **PWAs (MDN)** -- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
10. **Service Worker API** -- https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
11. **WebTransport** -- https://developer.mozilla.org/en-US/docs/Web/API/WebTransport
12. **WebGPU** -- https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
13. **OAuth 2.0** -- https://oauth.net/2/
14. **OpenID Connect** -- https://openid.net/connect/
15. **PKCE Flow** -- https://oauth.net/2/pkce/
16. **JSON-RPC 2.0** -- https://www.jsonrpc.org/specification
17. **Protocol Buffers** -- https://protobuf.dev/
18. **LSP 3.18** -- https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/
19. **DAP 1.59** -- https://microsoft.github.io/debug-adapter-protocol/specification
20. **Zod** -- https://zod.dev/
