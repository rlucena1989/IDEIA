# Estudo S36: Extension Host & Process Architecture para IDEIA
> **Arquitetura de processos de extensao para a IDEIA: isolamento, RPC, ciclo de vida, seguranca e integracao com o ecossistema de plugins**

| Versao | Data | Autor | Descricao |
| --- | --- | --- | --- |
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — Extension Host architecture |

---

## Indice
1. [Introducao](#1-introducao)

2. [Process Architecture Overview](#2-process-architecture-overview)

3. [Extension Host Process Model](#3-extension-host-process-model)

4. [Remote Extension Host](#4-remote-extension-host)

5. [Extension Activation and Deactivation](#5-extension-activation--deactivation)

6. [Extension API Proxy](#6-extension-api-proxy)

7. [RPC/Message Passing](#7-rpcmessage-passing)

8. [Extension Isolation](#8-extension-isolation)

9. [Extension Manifest](#9-extension-manifest)

10. [Extension Lifecycle Management](#10-extension-lifecycle-management)

11. [Extension API Surface](#11-extension-api-surface)

12. [Contribution Points System](#12-contribution-points-system)

13. [Web Workers for Extensions](#13-web-workers-for-extensions)

14. [Extension Security Model](#14-extension-security-model)

15. [Code Examples](#15-code-examples)

16. [Conexoes](#16-conexoes)

17. [Plano de Implementacao](#17-plano-de-implementacao)

---

## 1. Introducao
### 1.1 Por que Extension Hosts?
Extension hosts sao processos isolados que executam extensoes em um IDE. Eles sao um dos pilares arquiteturais mais importantes de editores modernos como VS Code e Theia. Sem extension hosts, extensoes compartilhariam o mesmo espaco de memoria do processo principal, acarretando tres problemas fundamentais:

1. **Isolamento de falhas:** Uma extensao com vazamento de memoria, looping infinito ou crash nao pode derrubar o editor inteiro. Com processos separados, apenas a extensao morre, o editor continua.

2. **Seguranca:** Extensoes de terceiros acessam o sistema de arquivos, rede, API do editor. Sem isolamento, uma extensao maliciosa teria acesso total ao processo do editor e a todos os seus dados.

3. **Performance:** Extensoes com uso intensivo de CPU (linters, analisadores estaticos, formatadores) precisam ser executadas em paralelo sem bloquear a UI.

```

                    VS Code / Theia Process Model

  +----------------------------------------------------------------------+
  |                    MAIN PROCESS (Electron / Theia)                    |
  |  +------------------+  +------------------+  +------------+         |
  |  | Window Manager   |  | Extension        |  | Workspace  |         |
  |  | Shell / UI       |  | Registry Service |  | Service    |         |
  |  +------------------+  +------------------+  +------------+         |
  +----------------------------------------------------------------------+
           |                      |                       |
           | IPC (JSON-RPC)       | IPC (JSON-RPC)        | IPC
           v                      v                       v
  +------------------+  +------------------+  +-------------------+
  | Extension Host   |  | Extension Host   |  | Debug             |
  | (Default)        |  | (Language)       |  | Process           |
  +------------------+  +------------------+  +-------------------+
           |
           v
  +---------------------+
  | Terminal Process    |
  | (node-pty)          |
  +---------------------+

```

### 1.2 O Padrao IExtensionHostRPCService
Tanto VS Code quanto Theia implementam o padrao IExtensionHostRPCService: uma interface que abstrai toda comunicacao entre o processo principal e os processos de extensao. O servico e responsavel por:

- Criar e gerenciar o ciclo de vida dos processos de extensao
- Encaminhar chamadas de API do processo principal para o extension host
- Roteear eventos do editor (abertura de arquivo, mudanca de configuracao) para as extensoes
- Gerenciar proxies de objetos entre processos
- Monitorar saude dos processos e reiniciar em caso de crash

### 1.3 Diferencas VS Code vs Theia
| Aspecto | VS Code | Theia |
| --- | --- | --- |
| Processo principal | Electron main process | Theia backend (Node.js) |
| IPC mecanismo | Pipe + JSON-RPC via ripgrep lib | JSON-RPC via @theia/core |
| Extension host criacao | child_process.fork() | child_process.fork() |
| Multiplos hosts | Sim (default + language) | Sim (plugin-ext) |
| Remoto | VS Code Server / Remote SSH | Theia Cloud |
| Web | VS Code for Web | Theia Web (nativo) |

### 1.4 Aplicacao na IDEIA
A IDEIA adotara o modelo de extension host do VS Code/Theia com as seguintes adaptacoes:

- Suporte nativo a agentes como extensoes (agentes sao extensoes especiais com API de LLM)
- Isolation reforcada com vm.Script + resource limits para extensoes de terceiros
- NATS JetStream como backbone de mensageria entre extension hosts e o core
- Multiplos profiles de extension host (default, agent, language, workspace)
- Hot-reload de extensoes em desenvolvimento

---

## 2. Process Architecture Overview
### 2.1 Hierarquia de Processos
```

                     IDEIA PROCESS TOPOLOGY

  +--------------------------------------------------------------------+
  |  MAIN PROCESS (Electron Main / Theia Backend)                      |
  |                                                                    |
  |  +-- Application Shell (window management, menus, statusbar)     |
  |  +-- Workspace Service (files, configurations, search)           |
  |  +-- Extension Registry (manifest parsing, activation mgmt)      |
  |  +-- Contribution Registry (commands, views, keybindings)        |
  |  +-- Language Server Manager (LSP client manager)                |
  |  +-- Debug Adapter Manager (DAP session manager)                 |
  |  +-- Terminal Service (node-pty session manager)                 |
  |  +-- NATS Client (event bus integration)                         |
  |  +-- AI Agent Orchestrator (LangGraph, agent execution)          |
  +--------------------------------------------------------------------+
                     |
  +--------------------------------------------------------------------+
  |  RENDERER PROCESS (Electron Renderer / Theia Frontend)            |
  |                                                                    |
  |  +-- Monaco Editor Instance                                      |
  |  +-- WebViews (extension webviews)                               |
  |  +-- Widgets (IDEIA plugins, Theia contributions)                |
  |  +-- StatusBar, ActivityBar, Panel views                         |
  |  +-- xterm.js Terminal instances                                 |
  +--------------------------------------------------------------------+

  +--------------------------------------------------------------------+
  |  EXTENSION HOST(S) -- child_process.fork()                         |
  |                                                                    |
  |  +-- ExtensionHost (Default)     -> general purpose extensions   |
  |  +-- ExtensionHost (Language)    -> language servers + providers  |
  |  +-- ExtensionHost (Agent)       -> AI agent extensions          |
  |  +-- ExtensionHost (Workspace)   -> per-workspace isolation      |
  |  +-- ExtensionHost (Remote)      -> remote/SSH extensions        |
  +--------------------------------------------------------------------+

  +--------------------------------------------------------------------+
  |  DEBUG PROCESSES -- child_process.spawn()                          |
  |  +-- Debug Adapter Process (Node.js)                              |
  |  +-- Debug Adapter Process (Python)                               |
  |  +-- Debug Adapter Process (GDB/LLDB)                             |
  +--------------------------------------------------------------------+

  +--------------------------------------------------------------------+
  |  TERMINAL PROCESSES -- node-pty spawn()                            |
  |  +-- PTY Session (PowerShell)                                     |
  |  +-- PTY Session (bash)                                           |
  |  +-- PTY Session (agent terminal)                                 |
  +--------------------------------------------------------------------+

```

### 2.2 IPC / Comunicacao entre Processos
| Canal | Protocolo | Uso | Latencia |
| --- | --- | --- | --- |
| Main <-> Extension Host | JSON-RPC via stdio pipe | Chamadas de API, eventos, proxies | <1ms |
| Main <-> Renderer | Electron IPC / WebSocket | Comandos UI, estado do editor | <1ms |
| Extension <-> Language Server | LSP via stdio/TCP | Completions, hover, diagnostics | <5ms |
| Extension <-> Debug Adapter | DAP via stdio/WebSocket | Debug sessions | <10ms |
| Main <-> Terminal | node-pty pipe | I/O do terminal | <2ms |
| Main <-> NATS | NATS JetStream client | Event bus, pub/sub | <5ms |
| Extension <-> Extension | NATS JetStream bridge | Comunicacao entre extensoes | <5ms |

### 2.3 Process Lifecycle Management
```

                    PROCESS LIFECYCLE

  MAIN PROCESS                       EXTENSION HOST
  -------------                       -------------
  +----------+                        +----------+
  | START    |----fork()------------->| INIT     |
  +----+-----+                        +----+-----+
       |                                   |
       | await initRPC()                   | Load bundled extensions
       v                                   v
  +----------+                        +----------+
  | READY    |<----ready ack----------| ACTIVE   |
  +----+-----+                        +----+-----+
       |                                   |
       | activateExtensions()              | onActivationEvent()
       v                                   v
  +----------+                        +----------+
  | RUNNING  |<----extension API-----| EXTENSIONS LOADED |
  +----+-----+                        +----+-----+
       |                                   |
       | shutdown()                        | deactivate()
       v                                   v
  +----------+                        +----------+
  | STOP     |----kill()------------->| DEAD     |
  +----------+                        +----------+

  ON CRASH:
  +----------+                        +----------+
  | DETECT   |----restart()---------->| FORK     |
  | EXIT     |                        | NEW      |
  | CODE = 0 |                        +----------+
  +----------+

```

### 2.4 Heartbeat e Saude
Cada extension host possui um mecanismo de heartbeat:

```typescript

interface ExtensionHostHealth {
  pid: number;
  uptime: number;
  memoryUsage: number;    // MB
  cpuUsage: number;       // percentage
  activeExtensions: number;
  lastHeartbeat: number;  // timestamp
  status: 'healthy' | 'unhealthy' | 'zombie' | 'crashed';
}

interface HeartbeatMessage {
  type: 'heartbeat';
  seq: number;
  timestamp: number;
  health: ExtensionHostHealth;
}

```

O processo principal espera heartbeats a cada 5 segundos. Se 3 heartbeats consecutivos sao perdidos (15s sem resposta), o processo e considerado "zombie" e forcado a morrer com SIGKILL. Um novo processo e criado em seguida com as mesmas extensoes carregadas.

---

## 3. Extension Host Process Model
### 3.1 Modelos de Extension Host
| Modelo | Descricao | Vantagens | Desvantagens | Usado por |
| --- | --- | --- | --- | --- |
| Single host | Um unico processo para todas as extensoes | Simples, baixo overhead | Um crash derruba todas extensoes | Theia (default) |
| Host por workspace | Um processo por workspace aberto | Isolamento entre projetos | Multiplos processos, mais memoria | VS Code (remoto) |
| Host por linguagem | Hosts dedicados para providers de linguagem | LSP providers isolados | Complexidade de gerenciamento | VS Code |
| Host por extensao | Cada extensao tem seu proprio processo | Isolamento total | Alto overhead de processos | Nao usado (inviavel) |
| Host pooling | Pool de N processos, extensoes distribuidas | Balanceamento, falha parcial | Roteamento complexo | IDEIA (proposto) |

### 3.2 IDEIA Extension Host Pooling
```

                    IDEIA EXTENSION HOST POOL

  +--------------+    +--------------+    +--------------+
  | Pool         |    | Pool         |    | Pool         |
  | Default      |    | Language     |    | Agent        |
  | (4 hosts)    |    | (2 hosts)    |    | (2 hosts)    |
  +--------------+    +--------------+    +--------------+
  | ext A, B     |    | ext LSP-py   |    | ext agent-X  |
  | ext C, D     |    | ext LSP-ts   |    | ext agent-Y  |
  | ext E, F     |    |              |    |              |
  | ext G, H     |    |              |    |              |
  +--------------+    +--------------+    +--------------+

  +------------------------------------------------------------------+
  |  Pool Scheduler (decide qual host recebe qual extensao)          |
  |                                                                  |
  |  - load-based: host com menos extensoes ativas recebe a nova    |
  |  - affinity-based: extensoes do mesmo publisher ficam juntas    |
  |  - capability-based: hosts com GPU affinity para ML extensions  |
  +------------------------------------------------------------------+

```

```typescript

interface ExtensionHostPoolConfig {
  pools: PoolDefinition[];
  scheduler: 'load' | 'affinity' | 'capability' | 'manual';
  maxHosts: number;
  minHosts: number;
  restartStrategy: 'immediate' | 'deferred' | 'manual';
}

interface PoolDefinition {
  name: string;
  purpose: 'default' | 'language' | 'agent' | 'workspace' | 'remote';
  minHosts: number;
  maxHosts: number;
  extensionsPerHost: number;
  affinityTags: string[];
  resourceLimits: ResourceLimits;
}

```

### 3.3 Host Affinity e Routing
```typescript

type ExtensionAffinityRule = {
  match: {
    extensionId?: string;
    publisher?: string;
    category?: ExtensionCategory;
    tags?: string[];
    activationEvents?: string[];
  };
  targetPool: string;
  isolated?: boolean;
};

const DEFAULT_AFFINITY_RULES: ExtensionAffinityRule[] = [
  { match: { activationEvents: ['onLanguage:*'] }, targetPool: 'language' },
  { match: { category: 'agent' }, targetPool: 'agent' },
  { match: { category: 'debug' }, targetPool: 'default', isolated: true },
  { match: {}, targetPool: 'default' },
];

```

### 3.4 Extension Host Process Creation
```typescript

import { fork } from 'child_process';
import { join } from 'path';

interface ExtensionHostProcessOptions {
  id: string;
  pool: string;
  extensions: string[];
  resourceLimits: ResourceLimits;
  environment: Record<string, string>;
}

class ExtensionHostManager {
  private hosts: Map<string, ExtensionHostProcess> = new Map();

  async createHost(options: ExtensionHostProcessOptions): Promise<ExtensionHostProcess> {
    const hostPath = join(__dirname, 'extension-host.js');
    const child = fork(hostPath, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: {
        ...process.env,
        ...options.environment,
        EXTENSION_HOST_ID: options.id,
        EXTENSION_HOST_POOL: options.pool,
      },
      execArgv: ['--max-old-space-size=512'],
    });

    const host = new ExtensionHostProcess(options.id, child, options.resourceLimits);
    this.hosts.set(options.id, host);
    this.setupHealthMonitoring(host);
    this.setupCrashRecovery(host, options);

    await host.waitForReady(5000);
    return host;
  }

  private setupCrashRecovery(host: ExtensionHostProcess, options: ExtensionHostProcessOptions) {
    host.on('exit', async (code: number, signal: string) => {
      if (code !== 0 && code !== null) {
        const retryDelay = Math.min(1000 * Math.pow(2, host.restartCount), 30000);
        setTimeout(async () => {
          const newHost = await this.createHost(options);
          this.emit('restarted', { oldId: host.id, newId: newHost.id });
        }, retryDelay);
      }
    });
  }
}

```

---

## 4. Remote Extension Host
### 4.1 Arquitetura Remota
Extension hosts remotos permitem que extensoes sejam executadas em uma maquina diferente (SSH, Docker, Theia Cloud). A arquitetura segue o modelo do VS Code Server:

```

  MAQUINA LOCAL                        MAQUINA REMOTA

  +--------------------+               +------------------------+
  | IDEIA Client       |               | IDEIA Server (agent)   |
  |                    |               |                        |
  |  +--------------+  |               |  +------------------+ |
  |  | Local        |  |               |  | Remote Extension | |
  |  | Extension    |  |               |  | Host             | |
  |  | Host         |  |               |  +------------------+ |
  |  +--------------+  |               |                        |
  |                    |   TLS/WSS     |  +------------------+ |
  |  +--------------+  |<------------->|  | File System      | |
  |  | Remote       |  |               |  | Tunnel           | |
  |  | Connection   |  |               |  +------------------+ |
  |  | Manager      |  |               |                        |
  |  +--------------+  |               |  +------------------+ |
  +--------------------+               |  | Port Forwarding  | |
                                        |  +------------------+ |
                                        +------------------------+

```

### 4.2 Protocolo de Comunicacao Remota
```typescript

interface RemoteExtensionHostMessage {
  id: string;
  method: string;
  params: unknown[];
  type: 'request' | 'response' | 'notification' | 'error';
  error?: { code: number; message: string; data?: unknown };
  transferable?: ArrayBuffer[];
  compressed?: boolean;
}

interface RemoteConnectionConfig {
  host: string;
  port: number;
  protocol: 'wss' | 'ws' | 'ssh';
  tunnelType: 'ssh' | 'vscode-tunnel' | 'direct';
  authentication: {
    type: 'password' | 'key' | 'token' | 'none';
    credentials?: string;
  };
  latencyCompensation: {
    enabled: boolean;
    bufferSize: number;
    timeout: number;
  };
  transport: {
    compression: boolean;
    batchInterval: number;
    maxBatchSize: number;
  };
}

```

### 4.3 Latency Compensation
```typescript

class LatencyCompensator {
  private predictionBuffer: Map<string, Prediction> = new Map();
  private config: LatencyCompConfig;
  private predictors: Map<string, Predictor> = new Map();

  constructor(config: LatencyCompConfig) {
    this.config = config;
    this.startHeartbeat();
  }

  async predict(method: string, params: unknown[]): Promise<unknown> {
    const requestPromise = this.sendRequest(method, params);

    if (this.predictors.has(method)) {
      const predictor = this.predictors.get(method)!;
      const localPrediction = predictor.predict(params);

      return Promise.race([
        requestPromise,
        localPrediction.then(result => {
          this.predictionBuffer.set(this.lastRequestId, result);
          return { predicted: true, data: result };
        }),
      ]);
    }

    return requestPromise;
  }

  private startHeartbeat() {
    setInterval(() => {
      const start = performance.now();
      this.sendNotification('ping').then(() => {
        const rtt = performance.now() - start;
        this.config.currentRTT = rtt;
      });
    }, 10000);
  }
}

```

### 4.4 Remote File System Tunnel
```typescript

interface RemoteFileSystemChannel {
  readFile(uri: URI): Promise<Uint8Array>;
  writeFile(uri: URI, content: Uint8Array): Promise<void>;
  stat(uri: URI): Promise<FileStat>;
  readDirectory(uri: URI): Promise<[string, FileType][]>;
  createDirectory(uri: URI): Promise<void>;
  delete(uri: URI, options: { recursive: boolean; useTrash: boolean }): Promise<void>;
  rename(source: URI, target: URI): Promise<void>;
  watch(uri: URI, options: WatchOptions): Promise<Disposable>;
  prefetch(uris: URI[]): Promise<void>;
  invalidate(uri: URI): Promise<void>;
}

```

---

## 5. Extension Activation and Deactivation
### 5.1 Activation Events
Extensoes sao carregadas sob demanda. O manifesto declara activationEvents que disparam o carregamento:

```typescript

type ActivationEvent =
  | `onLanguage:${string}`
  | `onCommand:${string}`
  | `onView:${string}`
  | `onCustomEditor:${string}`
  | `onStartupFinished`
  | `onFileSystem:${string}`
  | `onSearch:${string}`
  | `onDebug:${string}`
  | `onTerminal`
  | `onTaskType:${string}`
  | `onRenderer:${string}`
  | `onAuthenticationRequest`
  | `onUri:${string}`
  | `onWebviewPanel:${string}`
  | `onNotificationType:${string}`
  | '*'
  | `onEvent:${string}`
  | `onAgentTool:${string}`
  | `onIntent:${string}`;

```

### 5.2 Activation Pipeline
```

                    ACTIVATION PIPELINE

  Evento ocorre (ex: usuario abre arquivo .py)
         |
         v
  +-----------------+
  | Match           |--- Scaneia manifest de extensoes inativas
  | ActivationEvent |--- Encontra extensoes com onLanguage:python
  +--------+--------+
           |
           v
  +-----------------+
  | Queue Extension |--- Adiciona na fila de ativacao
  | For Activation  |--- Verifica dependencias
  +--------+--------+
           |
           v
  +-----------------+
  | Load Extension  |--- Carrega codigo do extension host
  | Module          |--- require() o modulo principal
  +--------+--------+
           |
           v
  +-----------------+
  | Call activate() |--- Executa funcao activate(context)
  |                 |--- Registra subscriptions via context
  +--------+--------+
           |
           v
  +-----------------+
  | Extension       |--- Marca como ativa
  | Active          |--- Emite evento onDidActivateExtension
  +-----------------+

```

### 5.3 Activation Queue com Dependencias
```typescript

interface ExtensionActivationRequest {
  extensionId: string;
  activationEvent: ActivationEvent;
  priority: number;
  dependencies: string[];
  timestamp: number;
  timeout: number;
}

class ActivationQueue {
  private queue: ExtensionActivationRequest[] = [];
  private activating: Set<string> = new Set();
  private activated: Set<string> = new Set();
  private processing = false;
  private registry: ExtensionRegistry;

  constructor(registry: ExtensionRegistry) {
    this.registry = registry;
  }

  enqueue(request: ExtensionActivationRequest): void {
    const unresolved = request.dependencies.filter(
      dep => !this.activated.has(dep)
    );

    if (unresolved.length > 0) {
      for (const dep of unresolved) {
        if (!this.activating.has(dep) && !this.activated.has(dep)) {
          this.enqueue({
            extensionId: dep,
            activationEvent: request.activationEvent,
            priority: request.priority - 1,
            dependencies: [],
            timestamp: Date.now(),
            timeout: 10000,
          });
        }
      }
    }

    this.queue.push(request);
    this.queue.sort((a, b) => a.priority - b.priority);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      if (this.activated.has(request.extensionId)) continue;
      if (Date.now() - request.timestamp > request.timeout) continue;

      try {
        this.activating.add(request.extensionId);
        const ext = this.registry.getExtension(request.extensionId);
        await ext.activate(request.activationEvent);
        this.activated.add(request.extensionId);
      } catch (err) {
        console.error('Failed to activate ' + request.extensionId + ':', err);
      } finally {
        this.activating.delete(request.extensionId);
      }
    }
    this.processing = false;
  }
}

```

### 5.4 Activation Timing Budget
| Evento | Budget | Observacao |
| --- | --- | --- |
| onLanguage | 5s | Ativacao para provider de linguagem |
| onCommand | 3s | Resposta imediata esperada |
| onView | 3s | View deve aparecer rapido |
| onStartupFinished | 30s | Startup total nao deve exceder |
| * (startup) | 10s | Extensoes sempre ativas |
| onDebug | 5s | Debug nao pode atrasar |
| onCustomEditor | 3s | Editor customizado deve abrir instantaneo |

Extensoes que excedem o budget tem a ativacao movida para background e recebem warning no log.

### 5.5 Deactivation e Cleanup
```typescript

interface ExtensionDeactivation {
  extensionId: string;
  reason: 'disable' | 'uninstall' | 'update' | 'host_shutdown' | 'crash' | 'user_action';
  graceful: boolean;
  timeout: number;
}

class DeactivationManager {
  private activated: Set<string> = new Set();
  private registry: ExtensionRegistry;

  constructor(registry: ExtensionRegistry) {
    this.registry = registry;
  }

  async deactivate(extensionId: string, reason: ExtensionDeactivation['reason']): Promise<void> {
    const ext = this.registry.getExtension(extensionId);
    if (!ext || !ext.isActive) return;

    const timeout = 5000;

    try {
      if (ext.module.deactivate) {
        await Promise.race([
          ext.module.deactivate(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Deactivation timeout')), timeout)
          ),
        ]);
      }
    } catch (err) {
      console.warn('Deactivation of ' + extensionId + ' failed:', err);
    } finally {
      ext.dispose();
      ext.isActive = false;
      this.activated.delete(extensionId);
    }
  }

  async deactivateAll(reason: ExtensionDeactivation['reason']): Promise<void> {
    const active = Array.from(this.activated);
    await Promise.allSettled(active.map(id => this.deactivate(id, reason)));
  }
}

```

---

## 6. Extension API Proxy
### 6.1 Proxy Pattern
O extension host nao possui acesso direto a API do editor. Toda API e exposta via proxy que serializa chamadas e as transmite via RPC:

```

      MAIN PROCESS                        EXTENSION HOST

  +------------------------+         +------------------------+
  | Real API Implementation |        | Extension Code         |
  |                        |        |                        |
  |  - window              |        |  const vscode =        |
  |  - workspace           |        |    require('vscode');  |
  |  - commands            |        |  vscode.window.        |
  |  - languages           |        |    showInformationMsg  |
  |  - ...                 |        |    ('hello');          |
  +-----------+------------+         +--------+--------------+
              |                              |
              | RPC Call                      |
              |                              |
  +-----------+------------+         +--------+--------------+
  | RPC Handler            |         | Proxy API (vscode.ts)  |
  |  - deserialize         |         |                        |
  |  - execute             | <-----> |  Proxy<typeof window> |
  |  - serialize result    |         |  -> serialize call    |
  +------------------------+         |  -> send via IPC      |
                                      |  -> deserialize result|
                                      +-----------------------+

```

### 6.2 Proxy Generation
```typescript

type ProxyTarget = Record<string, unknown>;
type RPCMethod = (method: string, ...args: unknown[]) => Promise<unknown>;

function createAPIProxy<T extends ProxyTarget>(
  namespace: string,
  callRPC: RPCMethod
): T {
  const cache = new Map<string, unknown>();

  const handler: ProxyHandler<ProxyTarget> = {
    get(_target: ProxyTarget, prop: string | symbol): unknown {
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'then') return undefined;
      const fullPath = cache.get(prop);
      if (fullPath) return fullPath;
      const proxy = createNestedProxy(namespace + '.' + String(prop), callRPC);
      cache.set(prop, proxy);
      return proxy;
    },
    apply(_target: ProxyTarget, _thisArg: unknown, args: unknown[]): Promise<unknown> {
      return callRPC(namespace, ...args);
    },
  };

  return new Proxy({}, handler) as T;
}

function createNestedProxy(path: string, callRPC: RPCMethod): unknown {
  const cache = new Map<string, unknown>();

  const handler: ProxyHandler<ProxyTarget> = {
    get(_target: ProxyTarget, prop: string | symbol): unknown {
      if (prop === 'then') return undefined;
      if (typeof prop === 'symbol') return undefined;
      const fullPath = path + '.' + String(prop);
      const cached = cache.get(fullPath);
      if (cached) return cached;
      const proxy = createNestedProxy(fullPath, callRPC);
      cache.set(fullPath, proxy);
      return proxy;
    },
    apply(_target: unknown, _thisArg: unknown, args: unknown[]): Promise<unknown> {
      return callRPC(path, ...args);
    },
  };

  return new Proxy(() => {}, handler);
}

```

### 6.3 Disposable Pattern
```typescript

interface Disposable {
  dispose(): void;
}

class DisposableStore {
  private disposables: Disposable[] = [];

  add(disposable: Disposable): Disposable {
    this.disposables.push(disposable);
    return disposable;
  }

  dispose(): void {
    let error: Error | undefined;
    for (const d of this.disposables) {
      try { d.dispose(); }
      catch (err) { error = err instanceof Error ? err : new Error(String(err)); }
    }
    this.disposables.length = 0;
    if (error) throw error;
  }

  static from(...disposables: Disposable[]): Disposable {
    const store = new DisposableStore();
    for (const d of disposables) store.add(d);
    return store;
  }

  static readonly None: Disposable = { dispose() {} };
}

class ExtensionContext {
  readonly subscriptions: DisposableStore = new DisposableStore();
  private _extensionPath: string;
  private _globalState: Memento;
  private _workspaceState: Memento;
  private _secrets: SecretStorage;

  constructor(options: ExtensionContextOptions) {
    this._extensionPath = options.extensionPath;
    this._globalState = options.globalState;
    this._workspaceState = options.workspaceState;
    this._secrets = options.secrets;
  }

  get extensionPath(): string { return this._extensionPath; }
  get globalState(): Memento { return this._globalState; }
  get workspaceState(): Memento { return this._workspaceState; }
  get secrets(): SecretStorage { return this._secrets; }
}

```

### 6.4 Event Emitters Across Processes
```typescript

interface Event<E> {
  (listener: (e: E) => unknown, thisArgs?: unknown, disposables?: Disposable[]): Disposable;
}

class Emitter<E> {
  private listeners: Set<{ listener: (e: E) => unknown; thisArgs?: unknown }> = new Set();

  get event(): Event<E> {
    return (listener: (e: E) => unknown, thisArgs?: unknown, disposables?: Disposable[]): Disposable => {
      const entry = { listener, thisArgs };
      this.listeners.add(entry);
      const disposable = { dispose: () => this.listeners.delete(entry) };
      if (disposables) disposables.push(disposable);
      return disposable;
    };
  }

  fire(event: E): void {
    for (const { listener, thisArgs } of this.listeners) {
      try {
        if (thisArgs) listener.call(thisArgs, event);
        else listener(event);
      } catch (err) {
        console.error('Emitter listener error:', err);
      }
    }
  }

  dispose(): void { this.listeners.clear(); }
}

class RemoteEventChannel<E> {
  private emitter = new Emitter<E>();
  private rpc: RPCClient;
  private eventName: string;

  constructor(rpc: RPCClient, eventName: string) {
    this.rpc = rpc;
    this.eventName = eventName;
    rpc.onNotification('event:' + eventName, (data: E) => { this.emitter.fire(data); });
  }

  get event(): Event<E> { return this.emitter.event; }
  fire(event: E): void {
    this.rpc.sendNotification('event:' + this.eventName, event);
    this.emitter.fire(event);
  }
  dispose(): void { this.emitter.dispose(); }
}

```

### 6.5 Cancellation Tokens
```typescript

interface CancellationToken {
  readonly isCancellationRequested: boolean;
  readonly onCancellationRequested: Event<void>;
}

class CancellationTokenSource {
  private _token: CancellationTokenImpl;
  private _emitter: Emitter<void>;

  constructor() {
    this._emitter = new Emitter<void>();
    this._token = new CancellationTokenImpl(this._emitter);
  }

  get token(): CancellationToken { return this._token; }

  cancel(): void {
    if (!this._token.isCancellationRequested) {
      this._token.isCancellationRequested = true;
      this._emitter.fire(undefined);
    }
  }

  dispose(): void { this._emitter.dispose(); }

  static readonly None: CancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: () => DisposableStore.None,
  };

  static readonly Cancelled: CancellationToken = {
    isCancellationRequested: true,
    onCancellationRequested: () => DisposableStore.None,
  };
}

class CancellationTokenImpl implements CancellationToken {
  isCancellationRequested = false;
  readonly onCancellationRequested: Event<void>;

  constructor(emitter: Emitter<void>) {
    this.onCancellationRequested = emitter.event;
  }
}

```

---

## 7. RPC / Message Passing
### 7.1 JSON-RPC Protocol
```typescript

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

```

### 7.2 Message Channel Architecture
```

                     MESSAGE CHANNEL ARCHITECTURE

  +--------------------------+    +----------------------------+
  | MAIN PROCESS              |    | EXTENSION HOST             |
  |                           |    |                            |
  |  +---------------------+ |    |  +---------------------+  |
  |  | RPC Server          | |    |  | RPC Client          |  |
  |  |                     | |    |  |                     |  |
  |  |  Handler Registry   |-|----|--|  Call Router       |  |
  |  |  Channel Manager    | |    |  |  Response Buffer   |  |
  |  |  Connection Pool    | |    |  |  Timeout Manager   |  |
  |  +---------------------+ |    |  +---------------------+  |
  +--------------------------+    +----------------------------+
           |                              |
           +------------------------------+
                   IPC Transport
              (stdio pipe / WebSocket)

  +-----------------------------------------------------------+
  |  TRANSPORT LAYER                                          |
  |                                                           |
  |  +-------------+  +-------------+  +-------------+       |
  |  | Pipe        |  | WebSocket   |  | MessagePort |       |
  |  | Transport   |  | Transport   |  | Transport   |       |
  |  +-------------+  +-------------+  +-------------+       |
  |  | stdio IPC   |  | WS / WSS    |  | Channel     |       |
  |  | local only  |  | remote      |  | messaging   |       |
  |  +-------------+  +-------------+  +-------------+       |
  +-----------------------------------------------------------+

```

### 7.3 Protocol Implementation
```typescript

interface MessageTransport {
  send(message: Buffer | string): void;
  onMessage(callback: (data: Buffer) => void): Disposable;
  onClose(callback: () => void): Disposable;
  onError(callback: (err: Error) => void): Disposable;
  close(): void;
}

class RPCProtocol {
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timer: NodeJS.Timeout;
  }>();
  private handlers = new Map<string, (params: unknown[]) => Promise<unknown>>();
  private transport: MessageTransport;
  private buffer = '';

  constructor(transport: MessageTransport) {
    this.transport = transport;
    this.transport.onMessage((data) => this.handleMessage(data));
  }

  registerMethod(name: string, handler: (params: unknown[]) => Promise<unknown>): void {
    this.handlers.set(name, handler);
  }

  async call(method: string, ...params: unknown[]): Promise<unknown> {
    const id = ++this.requestId;
    const timeout = 30000;
    const request: JSONRPCRequest = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('RPC timeout: ' + method));
      }, timeout);
      this.pendingRequests.set(id, { resolve, reject, timer });
      this.transport.send(JSON.stringify(request) + '\n');
    });
  }

  notify(method: string, ...params: unknown[]): void {
    const notification: JSONRPCNotification = { jsonrpc: '2.0', method, params };
    this.transport.send(JSON.stringify(notification) + '\n');
  }

  private async handleMessage(data: Buffer): Promise<void> {
    this.buffer += data.toString();
    const messages = this.buffer.split('\n');
    this.buffer = messages.pop() || '';

    for (const msg of messages) {
      if (!msg.trim()) continue;
      try {
        const parsed = JSON.parse(msg);
        if ('id' in parsed && parsed.id !== undefined) {
          if ('method' in parsed) await this.handleRequest(parsed);
          else this.handleResponse(parsed);
        } else this.handleNotification(parsed);
      } catch (err) { console.error('RPC parse error:', err); }
    }
  }

  private async handleRequest(request: JSONRPCRequest): Promise<void> {
    const handler = this.handlers.get(request.method);
    if (!handler) {
      this.transport.send(JSON.stringify({
        jsonrpc: '2.0', id: request.id,
        error: { code: -32601, message: 'Method not found: ' + request.method },
      }) + '\n');
      return;
    }
    try {
      const result = await handler(request.params as unknown[]);
      this.transport.send(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + '\n');
    } catch (err) {
      this.transport.send(JSON.stringify({
        jsonrpc: '2.0', id: request.id,
        error: { code: -32603, message: err instanceof Error ? err.message : String(err) },
      }) + '\n');
    }
  }

  private handleResponse(response: JSONRPCResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pendingRequests.delete(response.id);
    if (response.error) pending.reject(new Error(response.error.message));
    else pending.resolve(response.result);
  }

  private handleNotification(notification: JSONRPCNotification): void {
    const handler = this.handlers.get(notification.method);
    if (handler) {
      handler(notification.params as unknown[]).catch(err =>
        console.error('Notification handler error:', err));
    }
  }

  dispose(): void {
    for (const { reject, timer } of this.pendingRequests.values()) {
      clearTimeout(timer);
      reject(new Error('RPC connection closed'));
    }
    this.pendingRequests.clear();
    this.transport.close();
  }
}

```

### 7.4 Message Buffering e Batching
```typescript

class MessageBatcher {
  private buffer: JSONRPCRequest[] = [];
  private batchInterval: number;
  private maxBatchSize: number;
  private timer: NodeJS.Timeout | null = null;
  private transport: (batch: JSONRPCRequest[]) => void;

  constructor(transport: (batch: JSONRPCRequest[]) => void, options: { batchInterval: number; maxBatchSize: number }) {
    this.transport = transport;
    this.batchInterval = options.batchInterval;
    this.maxBatchSize = options.maxBatchSize;
  }

  send(request: JSONRPCRequest): void {
    this.buffer.push(request);
    if (this.buffer.length >= this.maxBatchSize) this.flush();
    else if (!this.timer) this.timer = setTimeout(() => this.flush(), this.batchInterval);
  }

  flush(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.maxBatchSize);
    this.transport(batch);
  }

  dispose(): void { this.flush(); }
}

```

### 7.5 Connection Lifecycle e Reconnection
```typescript

class RPCConnection {
  private transport: MessageTransport | null = null;
  private protocol: RPCProtocol | null = null;
  private state = { status: 'disconnected' as const, reconnectAttempts: 0 };
  private config = { maxReconnectAttempts: 10, reconnectDelay: 1000, maxReconnectDelay: 30000, pingInterval: 15000 };

  async connect(transportFactory: () => Promise<MessageTransport>): Promise<void> {
    this.state.status = 'connecting';
    try {
      this.transport = await transportFactory();
      this.protocol = new RPCProtocol(this.transport);
      this.state.status = 'connected';
      this.state.reconnectAttempts = 0;
      this.transport.onClose(() => this.onDisconnected());
    } catch { this.state.status = 'disconnected'; throw err; }
  }

  private onDisconnected(): void {
    this.state.status = 'reconnecting';
    if (this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
      const delay = Math.min(
        this.config.reconnectDelay * Math.pow(2, this.state.reconnectAttempts),
        this.config.maxReconnectDelay
      );
      this.state.reconnectAttempts++;
      setTimeout(() => this.reconnect(), delay);
    } else { this.state.status = 'closed'; }
  }

  private async reconnect(): Promise<void> { /* reconnection logic */ }
  async call(method: string, ...params: unknown[]): Promise<unknown> {
    if (!this.protocol || this.state.status !== 'connected') throw new Error('Not connected');
    return this.protocol.call(method, ...params);
  }
  notify(method: string, ...params: unknown[]): void { this.protocol?.notify(method, ...params); }
  registerMethod(name: string, handler: (params: unknown[]) => Promise<unknown>): void {
    this.protocol?.registerMethod(name, handler);
  }
  dispose(): void { this.state.status = 'closed'; this.protocol?.dispose(); }
}

```

---

## 8. Extension Isolation
### 8.1 Niveis de Isolamento
| Nivel | Mecanismo | Overhead | Seguranca | Caso de Uso |
| --- | --- | --- | --- | --- |
| N0 | Sem isolamento (in-process) | Zero | Baixa | Extensoes first-party, temas |
| N1 | child_process.fork() | Medio | Media | Extensoes de terceiros padrao |
| N2 | worker_threads | Baixo | Media | Extensoes leves, WebWorkers |
| N3 | vm.Script sandbox | Alto | Alta | Extensoes nao-confiaveis |
| N4 | Process + seccomp/AppArmor | Muito alto | Maxima | Extensoes empresariais |

### 8.2 Resource Limits
```typescript

interface ResourceLimits {
  cpu: { maxCores: number; maxPercentage: number; niceLevel: number };
  memory: { maxHeapMB: number; maxStackMB: number; maxArrayBufferMB: number };
  fileSystem: { maxOpenFiles: number; allowedPaths: string[]; readonly: boolean };
  network: { allowedHosts: string[]; maxSockets: number; allowLocalhost: boolean };
  process: { maxChildProcesses: number; maxThreads: number; allowFork: boolean };
  execution: { maxExecutionTime: number; maxLoopIterations: number; maxStackDepth: number; maxAllocations: number };
}

const DEFAULT_EXTENSION_LIMITS: ResourceLimits = {
  cpu: { maxCores: 1, maxPercentage: 50, niceLevel: 10 },
  memory: { maxHeapMB: 256, maxStackMB: 1, maxArrayBufferMB: 64 },
  fileSystem: { maxOpenFiles: 50, allowedPaths: [], readonly: true },
  network: { allowedHosts: ['*'], maxSockets: 10, allowLocalhost: true },
  process: { maxChildProcesses: 0, maxThreads: 4, allowFork: false },
  execution: { maxExecutionTime: 30000, maxLoopIterations: 1000000, maxStackDepth: 100, maxAllocations: 50000000 },
};

```

### 8.3 Process Isolation (N1)
```typescript

import { fork, ChildProcess } from 'child_process';
import { join } from 'path';

class ProcessIsolation {
  private host: ChildProcess;
  private resourceMonitor: ResourceMonitor;

  constructor(private extensionId: string, private limits: ResourceLimits) {
    this.host = fork(join(__dirname, 'sandbox-host.js'), [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: this.buildSandboxEnv(),
      execArgv: this.buildExecArgs(),
    });
    this.resourceMonitor = new ResourceMonitor(this.host, this.limits);
    this.resourceMonitor.start();
  }

  private buildSandboxEnv(): Record<string, string | undefined> {
    return {
      ...process.env,
      EXTENSION_ID: this.extensionId,
      ALLOWED_PATHS: this.limits.fileSystem.allowedPaths.join(path.delimiter),
      NODE_OPTIONS: '--max-old-space-size=' + this.limits.memory.maxHeapMB,
      SANDBOX_READONLY_FS: this.limits.fileSystem.readonly ? '1' : '0',
    };
  }

  private buildExecArgs(): string[] {
    return [
      '--max-old-space-size=' + this.limits.memory.maxHeapMB,
      '--disallow-code-generation-from-strings',
    ];
  }
}

class ResourceMonitor {
  private interval: NodeJS.Timeout | null = null;
  private lastCPUUsage = 0;

  constructor(private process: ChildProcess, private limits: ResourceLimits) {}
  start(): void { this.interval = setInterval(() => this.check(), 2000); }
  stop(): void { if (this.interval) { clearInterval(this.interval); this.interval = null; } }

  private check(): void {
    const usage = process.resourceUsage();
    const memMB = (usage.maxRSS || 0) / (1024 * 1024);
    if (memMB > this.limits.memory.maxHeapMB) { this.killWithReason('Memory limit exceeded'); return; }
    const cpuUsage = process.cpuUsage();
    const totalCPU = (cpuUsage.user + cpuUsage.system) / 1e6;
    const cpuDelta = totalCPU - this.lastCPUUsage;
    if (cpuDelta > (this.limits.cpu.maxPercentage * 20) / 100) { this.killWithReason('CPU limit exceeded'); return; }
    this.lastCPUUsage = totalCPU;
  }

  private killWithReason(reason: string): void {
    this.process.kill('SIGKILL');
    this.stop();
  }
}

```

### 8.4 VM Sandbox Isolation (N3)
```typescript

import vm from 'vm';

class VMSandbox {
  private context: vm.Context;

  constructor(options: { extensionId: string; extensionPath: string; apiProxy: Record<string, unknown> }) {
    const sandbox = {
      console, setTimeout, clearTimeout,
      setInterval: null, clearInterval: null, require: null, Buffer: undefined,
      __filename: path.join(options.extensionPath, 'extension.js'),
      __dirname: options.extensionPath,
      exports: {}, module: { exports: {} },
      vscode: options.apiProxy,
      IDEIA: options.apiProxy,
    };

    this.context = vm.createContext(sandbox, {
      name: 'Extension:' + options.extensionId,
      origin: options.extensionId,
      codeGeneration: { strings: false, wasm: false },
    });
  }

  async execute(code: string, timeout = 30000): Promise<unknown> {
    const script = new vm.Script(code, { filename: 'extension.js' });
    return script.runInContext(this.context, { timeout, breakOnSigint: true });
  }
}

```

### 8.5 Crash Recovery Strategy
| Cenario | Deteccao | Acao | Impacto |
| --- | --- | --- | --- |
| Process exit code != 0 | child_process.on(exit) | Restart extension host | 500ms downtime |
| Memory limit exceeded | ResourceMonitor > threshold | SIGKILL + restart | 100ms downtime |
| CPU spike > 80% sustained | ResourceMonitor 3 checks | SIGKILL + restart | 500ms downtime |
| Heartbeat timeout (15s) | Health monitor | SIGKILL + restart | 15s + 500ms |
| Infinite loop | VM timeout | VM abort + restart | Timeout config |
| IPC pipe broken | stream.on(error) | Restart host | 100ms downtime |
| Extension crash loop | >3 restarts in 60s | Disable extension | User notification |

---

## 9. Extension Manifest
### 9.1 package.json Contributions Schema
```typescript

interface ExtensionManifest {
  name: string;
  publisher: string;
  version: string;
  engines: { vscode?: string; IDEIA?: string };
  license?: string;
  displayName?: string;
  description?: string;
  categories?: ExtensionCategory[];
  keywords?: string[];
  main?: string;
  browser?: string;
  icon?: string;
  activationEvents?: ActivationEvent[];
  extensionDependencies?: string[];
  extensionPack?: string[];
  contributes?: ExtensionContributions;
  capabilities?: {
    virtualWorkspaces?: boolean | { supported: boolean; description: string };
    untrustedWorkspaces?: { supported: boolean; description: string };
  };
  ideia?: {
    agent?: boolean;
    agentTools?: string[];
    autonomyLevel?: 'N0' | 'N1' | 'N2' | 'N3' | 'N4';
    protected?: boolean;
    isolationLevel?: 'N0' | 'N1' | 'N2' | 'N3' | 'N4';
    permissions?: string[];
    hooks?: string[];
    requiredLLM?: boolean;
    requiredMemory?: boolean;
  };
  repository?: { url: string };
  homepage?: string;
  bugs?: { url: string };
}

type ExtensionCategory =
  | 'agent' | 'language' | 'theme' | 'snippet' | 'debugger'
  | 'formatter' | 'keymap' | 'linter' | 'extensionPack'
  | 'other' | 'notebook' | 'education' | 'dataScience'
  | 'testing' | 'chat' | 'visualization';

```

### 9.2 Contributions Schema
```typescript

interface ExtensionContributions {
  commands?: CommandContribution[];
  configuration?: Record<string, ConfigurationSchema>;
  configurationDefaults?: Record<string, unknown>;
  menus?: Record<string, MenuContribution[]>;
  keybindings?: KeybindingContribution[];
  viewsContainers?: Record<string, ViewContainer[]>;
  views?: Record<string, ViewContribution[]>;
  viewsWelcome?: ViewWelcomeContribution[];
  customEditors?: CustomEditorContribution[];
  languages?: LanguageContribution[];
  grammars?: GrammarContribution[];
  themes?: ThemeContribution[];
  iconThemes?: IconThemeContribution[];
  productIconThemes?: ProductIconThemeContribution[];
  snippets?: SnippetContribution[];
  semanticTokenScopes?: SemanticTokenScopeContribution[];
  semanticTokenModifiers?: SemanticTokenModifierContribution[];
  colors?: ColorContribution[];
  debuggers?: DebuggerContribution[];
  taskDefinitions?: TaskDefinitionContribution[];
  problemMatchers?: ProblemMatcherContribution[];
  walkthroughs?: WalkthroughContribution[];
  notebookRenderer?: NotebookRendererContribution[];
  authentication?: AuthenticationContribution[];
  copilotProviders?: CopilotProviderContribution[];
  agentProviders?: AgentProviderContribution[];
  memoryProviders?: MemoryProviderContribution[];
  speechProviders?: SpeechProviderContribution[];
}

interface CommandContribution {
  command: string;
  title: string;
  shortTitle?: string;
  category?: string;
  icon?: string | { light: string; dark: string };
  enablement?: string;
  tooltip?: string;
}

interface MenuContribution {
  command: string;
  submenu?: string;
  group?: string;
  when?: string;
  icon?: string | { light: string; dark: string };
  alt?: string;
}

interface ViewContribution {
  id: string;
  name: string;
  when?: string;
  icon?: string;
  contextualTitle?: string;
  type?: 'tree' | 'webview' | 'custom' | 'agent-chat';
}

```

### 9.3 Manifest Parser
```typescript

import { z } from 'zod';
import { readFileSync } from 'fs';

class ExtensionManifestParser {
  private schemas: Record<string, z.ZodType> = {};

  constructor() {
    this.schemas.commands = z.array(z.object({
      command: z.string().min(1),
      title: z.string().min(1),
      category: z.string().optional(),
      icon: z.union([z.string(), z.object({ light: z.string(), dark: z.string() })]).optional(),
      enablement: z.string().optional(),
      tooltip: z.string().optional(),
    }));

    this.schemas.views = z.record(z.string(), z.array(z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      when: z.string().optional(),
      icon: z.string().optional(),
      type: z.enum(['tree', 'webview', 'custom', 'agent-chat']).optional(),
    })));

    this.schemas.menus = z.record(z.string(), z.array(z.object({
      command: z.string().min(1),
      submenu: z.string().optional(),
      group: z.string().optional(),
      when: z.string().optional(),
    })));

    this.schemas.keybindings = z.array(z.object({
      command: z.string().min(1),
      key: z.string().min(1),
      when: z.string().optional(),
      mac: z.string().optional(),
      linux: z.string().optional(),
      win: z.string().optional(),
    }));

    this.schemas.languages = z.array(z.object({
      id: z.string().min(1),
      aliases: z.array(z.string()).optional(),
      extensions: z.array(z.string()).optional(),
      filenames: z.array(z.string()).optional(),
      filenamePatterns: z.array(z.string()).optional(),
      firstLine: z.string().optional(),
      configuration: z.string().optional(),
    }));
  }

  parse(manifestPath: string): ExtensionManifest | null {
    try {
      const raw = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      return this.validate(raw);
    } catch (err) {
      console.error('Failed to parse manifest:', err);
      return null;
    }
  }

  validate(raw: Record<string, unknown>): ExtensionManifest {
    if (!raw.name || typeof raw.name !== 'string') throw new Error('Missing name');
    if (!raw.version || typeof raw.version !== 'string') throw new Error('Missing version');
    if (!raw.publisher || typeof raw.publisher !== 'string') throw new Error('Missing publisher');
    if (raw.contributes && typeof raw.contributes === 'object') this.validateContributions(raw.contributes as Record<string, unknown>);
    return raw as ExtensionManifest;
  }

  private validateContributions(contributions: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(contributions)) {
      const schema = this.schemas[key];
      if (!schema) { console.warn('Unknown contribution point: ' + key); continue; }
      try { schema.parse(value); }
      catch (err) { throw new Error('Invalid contribution "' + key + '": ' + err); }
    }
  }
}

```

### 9.4 Extension Packs e Dependencias
```typescript

interface ExtensionDependencyGraph {
  nodes: Map<string, ExtensionNode>;
  edges: Array<[string, string]>;
}

interface ExtensionNode {
  id: string;
  version: string;
  dependencies: string[];
  extensionPack: string[];
  isActivated: boolean;
}

class DependencyResolver {
  resolve(graph: ExtensionDependencyGraph): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const visiting = new Set<string>();

    const dfs = (nodeId: string): void => {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) throw new Error('Circular dependency: ' + nodeId);
      visiting.add(nodeId);
      const node = graph.nodes.get(nodeId);
      if (!node) return;
      for (const dep of node.dependencies) dfs(dep);
      visiting.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
    };

    for (const nodeId of graph.nodes.keys()) dfs(nodeId);
    return order;
  }
}

```

---

## 10. Extension Lifecycle Management
### 10.1 Ciclo de Vida Completo
```

  +----------+  +----------+  +----------+  +----------+  +----------+
  | INSTALL  |->| ENABLE   |->| ACTIVATE  |->|DEACTIVATE|->|UNINSTALL |
  +----------+  +----------+  +----------+  +----------+  +----------+
      |              |             |             |             |
      | download     | user action | activation  | cleanup     | remove
      | validate     | or auto     | event       | dispose     | files
      | extract      |             |             |             |
      v              v             v             v             v
  +--------------------------------------------------------------------+
  |                          EXTENSION STORE                            |
  |  +----------+ +----------+ +----------+ +----------+ +----------+  |
  |  |Downloaded| |Pending   | |Active    | |Inactive  | |Removed   |  |
  |  |          | |Enable    | |          | |          | |          |  |
  |  +----------+ +----------+ +----------+ +----------+ +----------+  |
  +--------------------------------------------------------------------+

```

### 10.2 Extension Store Operations
```typescript

interface ExtensionStore {
  install(vsixPath: string): Promise<InstallResult>;
  installFromMarketplace(extensionId: string, version?: string): Promise<InstallResult>;
  enable(extensionId: string): Promise<void>;
  disable(extensionId: string): Promise<void>;
  checkForUpdates(): Promise<UpdateInfo[]>;
  update(extensionId: string, targetVersion?: string): Promise<InstallResult>;
  uninstall(extensionId: string): Promise<void>;
  getInstalled(): Promise<InstalledExtension[]>;
  getEnabled(): Promise<InstalledExtension[]>;
  isInstalled(extensionId: string): Promise<boolean>;
  getExtensionPath(extensionId: string): string;
  onDidInstall(cb: (ext: InstalledExtension) => void): Disposable;
  onDidUninstall(cb: (ext: InstalledExtension) => void): Disposable;
  onDidEnable(cb: (ext: InstalledExtension) => void): Disposable;
  onDidDisable(cb: (ext: InstalledExtension) => void): Disposable;
}

interface InstallResult {
  extensionId: string;
  version: string;
  installedPath: string;
  requiresRestart: boolean;
  warnings?: string[];
}

interface InstalledExtension {
  id: string;
  name: string;
  publisher: string;
  version: string;
  displayName: string;
  description: string;
  installedAt: number;
  updatedAt: number;
  isEnabled: boolean;
  isBuiltin: boolean;
  manifest: ExtensionManifest;
}

```

### 10.3 Version Management e Compatibilidade
```typescript

import semver from 'semver';

class ExtensionVersionManager {
  isCompatible(manifest: ExtensionManifest, ideiaVersion: string): boolean {
    const engine = manifest.engines?.IDEIA || manifest.engines?.vscode;
    if (!engine) return true;
    try { return semver.satisfies(ideiaVersion, engine); }
    catch { return false; }
  }

  async resolveDependencyVersion(dependencies: string[], availableVersions: Map<string, string[]>): Promise<Map<string, string>> {
    const resolved = new Map<string, string>();
    for (const dep of dependencies) {
      const versions = availableVersions.get(dep);
      if (!versions || versions.length === 0) throw new Error('No version found for: ' + dep);
      const sorted = versions.filter(v => !v.includes('-')).sort((a, b) => semver.compare(b, a));
      if (sorted.length > 0) resolved.set(dep, sorted[0]);
      else throw new Error('No stable version for: ' + dep);
    }
    return resolved;
  }
}

```

### 10.4 Marketplace Integration
```typescript

interface ExtensionMarketplace {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  getExtension(id: string): Promise<MarketplaceExtension | null>;
  getVersions(id: string): Promise<string[]>;
  download(id: string, version?: string): Promise<Buffer>;
  getStats(id: string): Promise<ExtensionStats>;
  publish(vsix: Buffer): Promise<PublishResult>;
}

interface SearchOptions {
  page?: number;
  pageSize?: number;
  category?: string;
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated';
  includePreRelease?: boolean;
  target?: 'vscode' | 'IDEIA';
}

interface SearchResult {
  id: string;
  name: string;
  publisher: string;
  version: string;
  displayName: string;
  description: string;
  icon: string;
  downloadCount: number;
  rating: number;
  lastUpdated: string;
  categories: string[];
  isCompatibleWithIDEIA: boolean;
}

```

---

## 11. Extension API Surface
### 11.1 API Categories
| Categoria | Namespace | Metodos Principais | Status |
| --- | --- | --- | --- |
| Window | window | showInformationMessage, createOutputChannel, createStatusBarItem, createTreeView, createWebviewPanel, activeTextEditor, showQuickPick, showOpenDialog, createTerminal | Full |
| Workspace | workspace | getConfiguration, workspaceFolders, fs, onDidChangeConfiguration, onDidChangeTextDocument, findFiles, saveAll | Full |
| Commands | commands | registerCommand, executeCommand, getCommands | Full |
| Languages | languages | registerCompletionItemProvider, registerHoverProvider, registerDefinitionProvider, registerDocumentSemanticTokensProvider, registerCodeActionsProvider, match | Full |
| Env | env | appName, appRoot, machineId, sessionId, language, shell, clipboard, openExternal | Full |
| Extensions | extensions | getExtension, all, onDidChange | Full |
| Debug | debug | startDebugging, registerDebugAdapterDescriptorFactory, activeDebugSession, breakpoints | Full |
| Tasks | tasks | registerTaskProvider, executeTask, taskExecutions | Full |
| Terminal | terminal | createTerminal, onDidCloseTerminal, onDidOpenTerminal | Full |
| Timeline | timeline | registerTimelineProvider | Partial |
| Tests | tests | createTestController, TestRun | Partial |
| Chat | chat | createChatProvider, ChatRequest, ChatResponseStream | IDEIA-Ext |
| LM | lm | selectChatModels, sendChatRequest, registerModelProvider | IDEIA-Ext |
| Agents | agents | createAgentProvider, registerAgentTool, AgentRequest, AgentContext | IDEIA-Ext |
| Memory | memory | storeValue, getValue, searchMemory, registerMemoryProvider | IDEIA-Ext |
| Speech | speech | SpeechProvider, createSpeechToText, createTextToSpeech | IDEIA-Ext |
| Notebooks | notebooks | registerNotebookContentProvider, registerNotebookKernel | Partial |
| SCM | scm | createSourceControl, SourceControl, SourceControlResourceGroup | Full |
| Authentication | authentication | getSession, onDidChangeSessions | Full |
| Secrets | secrets | store, get, delete | Full |

### 11.2 IDEIA-Extended API
```typescript

interface AgentProvider {
  name: string;
  providerType: 'chat' | 'tool' | 'memory' | 'hybrid';
  handleRequest(request: AgentRequest, context: AgentContext): AsyncIterable<AgentChunk>;
}

interface AgentRequest {
  id: string;
  sessionId: string;
  messages: ChatMessage[];
  tools?: AgentTool[];
  options?: { model?: string; temperature?: number; maxTokens?: number; stream?: boolean };
}

interface MemoryProvider {
  name: string;
  namespace: string;
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  search(query: string, options?: { limit?: number; filter?: Record<string, unknown> }): Promise<MemoryEntry[]>;
  clear(): Promise<void>;
}

interface SpeechProvider {
  name: string;
  capabilities: SpeechCapabilities;
  speechToText(audio: AudioBuffer, options?: STTOptions): AsyncIterable<string>;
  textToSpeech(text: string, options?: TTSOptions): AsyncIterable<AudioBuffer>;
}

interface SpeechCapabilities {
  stt: boolean;
  tts: boolean;
  languages: string[];
  streaming: boolean;
  realtime: boolean;
}

```

### 11.3 API Compatibility Layer
```typescript

const vscodeShim: Record<string, unknown> = {
  window: createAPIProxy('vscode.window', callRPC),
  workspace: createAPIProxy('vscode.workspace', callRPC),
  commands: createAPIProxy('vscode.commands', callRPC),
  languages: createAPIProxy('vscode.languages', callRPC),
  env: createAPIProxy('vscode.env', callRPC),
  extensions: createAPIProxy('vscode.extensions', callRPC),
  debug: createAPIProxy('vscode.debug', callRPC),
  tasks: createAPIProxy('vscode.tasks', callRPC),
  scm: createAPIProxy('vscode.scm', callRPC),
  authentication: createAPIProxy('vscode.authentication', callRPC),
  notebooks: createAPIProxy('vscode.notebooks', callRPC),
  timeline: createAPIProxy('vscode.timeline', callRPC),
  tests: createAPIProxy('vscode.tests', callRPC),
  agents: createAPIProxy('ideia.agents', callRPC),
  memory: createAPIProxy('ideia.memory', callRPC),
  speech: createAPIProxy('ideia.speech', callRPC),
  StatusBarAlignment: { Left: 1, Right: 2 },
  ViewColumn: { One: 1, Two: 2, Three: 3, Four: 4, Five: 5, Six: 6, Seven: 7, Eight: 8, Nine: 9 },
  FileType: { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 },
  Uri: class Uri {
    static parse(value: string) { return URI.parse(value); }
    static file(path: string) { return URI.file(path); }
  },
  Position: class Position { constructor(public line: number, public character: number) {} },
  Range: class Range { constructor(public start: Position, public end: Position) {} },
  CancellationTokenSource,
  Disposable: { from: (...d: Disposable[]) => DisposableStore.from(...d), None: DisposableStore.None },
  EventEmitter: Emitter,
  TreeItem: class TreeItem { constructor(public label: string, public collapsibleState?: number) {} },
  TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
};

```

---

## 12. Contribution Points System
### 12.1 Arquitetura de Contribution Registry
```

                    CONTRIBUTION POINT REGISTRY

  +-----------------------------------------------------------+
  |                    Main Registry                            |
  |  extensionManifest.contributes -> parsed -> registered    |
  +-----------------------------------------------------------+
           |          |          |           |
           v          v          v           v
  +----------+  +----------+  +----------+  +---------------+
  | Commands  |  | Views    |  | Menus    |  | Keybindings  |
  | Registry  |  | Registry |  | Registry |  | Registry     |
  +----------+  +----------+  +----------+  +---------------+
  | command   |  | view id  |  | menu loc |  | key + when   |
  | handler   |  | provider |  | items    |  | command      |
  +----------+  +----------+  +----------+  +---------------+
           |          |          |           |
           v          v          v           v
  +----------+  +----------+  +----------+  +---------------+
  | Monaco   |  | Theia    |  | Menu Bar |  | Keybinding   |
  | Actions  |  | Widgets  |  | Shell    |  | Service      |
  +----------+  +----------+  +----------+  +---------------+

```

### 12.2 Contribution Point Handlers
```typescript

interface ContributionPointHandler<T> {
  readonly id: string;
  readonly manifestKey: string;
  validate(contribution: unknown): T;
  register(extensionId: string, contribution: T): void;
  unregister(extensionId: string): void;
}

class CommandContributionHandler implements ContributionPointHandler<CommandContribution[]> {
  readonly id = 'commands';
  readonly manifestKey = 'commands';
  private commandRegistry: CommandRegistry;

  constructor(commandRegistry: CommandRegistry) { this.commandRegistry = commandRegistry; }

  validate(contribution: unknown): CommandContribution[] {
    return z.array(z.object({
      command: z.string().min(1),
      title: z.string().min(1),
      category: z.string().optional(),
      icon: z.union([z.string(), z.object({ light: z.string(), dark: z.string() })]).optional(),
      enablement: z.string().optional(),
      tooltip: z.string().optional(),
    })).parse(contribution);
  }

  register(extensionId: string, contributions: CommandContribution[]): void {
    for (const cmd of contributions) {
      this.commandRegistry.registerCommand({
        id: cmd.command, title: cmd.title, category: cmd.category,
        icon: cmd.icon, extensionId,
        enablement: cmd.enablement ? new WhenClause(cmd.enablement) : undefined,
      });
    }
  }

  unregister(extensionId: string): void { this.commandRegistry.unregisterByExtension(extensionId); }
}

```

### 12.3 Contribution Registration Pipeline
```typescript

class ContributionRegistry {
  private handlers = new Map<string, ContributionPointHandler<unknown>>();
  private extensionContributions = new Map<string, Set<string>>();

  registerHandler(handler: ContributionPointHandler<unknown>): void {
    this.handlers.set(handler.manifestKey, handler);
  }

  processExtension(extensionId: string, manifest: ExtensionManifest): void {
    const contributes = manifest.contributes;
    if (!contributes) return;
    const contributedTypes = new Set<string>();

    for (const [key, value] of Object.entries(contributes)) {
      const handler = this.handlers.get(key);
      if (!handler) { console.warn('No handler for: ' + key); continue; }
      try {
        const validated = handler.validate(value);
        handler.register(extensionId, validated);
        contributedTypes.add(key);
      } catch (err) {
        console.error('Failed to register ' + key + ' for ' + extensionId + ':', err);
      }
    }
    this.extensionContributions.set(extensionId, contributedTypes);
  }

  unregisterExtension(extensionId: string): void {
    const contributedTypes = this.extensionContributions.get(extensionId);
    if (!contributedTypes) return;
    for (const type of contributedTypes) this.handlers.get(type)?.unregister(extensionId);
    this.extensionContributions.delete(extensionId);
  }
}

```

### 12.4 When Clause Parser
```typescript

class WhenClause {
  private ast: WhenNode;

  constructor(private expression: string) {
    this.ast = this.parse(expression);
  }

  evaluate(context: WhenContext): boolean { return this.evaluateNode(this.ast, context); }

  private parse(expression: string): WhenNode {
    const tokens = this.tokenize(expression);
    return this.parseExpression(tokens, 0).node;
  }

  private tokenize(expression: string): WhenToken[] {
    const tokens: WhenToken[] = [];
    const regex = /\s*(=>|==|!=|=~|&&|\|\||[()!]|"[^"]*"|'[^']*'|[^\s()!&|]+)\s*/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(expression)) !== null) {
      const value = match[1];
      if (value === '&&') tokens.push({ type: 'AND' });
      else if (value === '||') tokens.push({ type: 'OR' });
      else if (value === '!') tokens.push({ type: 'NOT' });
      else if (value === '(') tokens.push({ type: 'LPAREN' });
      else if (value === ')') tokens.push({ type: 'RPAREN' });
      else if (value === '==') tokens.push({ type: 'EQ' });
      else if (value === '!=') tokens.push({ type: 'NEQ' });
      else if (value === '=~') tokens.push({ type: 'REGEX' });
      else if (value.startsWith('"') || value.startsWith("'")) {
        tokens.push({ type: 'STRING', value: value.slice(1, -1) });
      } else tokens.push({ type: 'IDENTIFIER', value });
    }
    return tokens;
  }

  private parseExpression(tokens: WhenToken[], pos: number): { node: WhenNode; pos: number } {
    let result = this.parseTerm(tokens, pos);
    while (result.pos < tokens.length && tokens[result.pos].type === 'OR') {
      const right = this.parseTerm(tokens, result.pos + 1);
      result = { node: { type: 'or', left: result.node, right: right.node }, pos: right.pos };
    }
    return result;
  }

  private parseTerm(tokens: WhenToken[], pos: number): { node: WhenNode; pos: number } {
    let result = this.parseFactor(tokens, pos);
    while (result.pos < tokens.length && tokens[result.pos].type === 'AND') {
      const right = this.parseFactor(tokens, result.pos + 1);
      result = { node: { type: 'and', left: result.node, right: right.node }, pos: right.pos };
    }
    return result;
  }

  private parseFactor(tokens: WhenToken[], pos: number): { node: WhenNode; pos: number } {
    if (pos >= tokens.length) throw new Error('Unexpected end');
    const token = tokens[pos];
    if (token.type === 'NOT') {
      const inner = this.parseFactor(tokens, pos + 1);
      return { node: { type: 'not', child: inner.node }, pos: inner.pos };
    }
    if (token.type === 'LPAREN') {
      const inner = this.parseExpression(tokens, pos + 1);
      if (inner.pos >= tokens.length || tokens[inner.pos].type !== 'RPAREN') throw new Error('Missing )');
      return { node: inner.node, pos: inner.pos + 1 };
    }
    if (token.type === 'IDENTIFIER') {
      if (pos + 2 < tokens.length && ['EQ', 'NEQ', 'REGEX'].includes(tokens[pos + 1].type)) {
        const op = tokens[pos + 1];
        const valueToken = tokens[pos + 2];
        const opStr = op.type === 'EQ' ? '==' : op.type === 'NEQ' ? '!=' : '=~';
        return { node: { type: 'compare', key: token.value!, operator: opStr, value: valueToken.value || '' }, pos: pos + 3 };
      }
      return { node: { type: 'contextKey', key: token.value! }, pos: pos + 1 };
    }
    throw new Error('Unexpected token: ' + token.type);
  }

  private evaluateNode(node: WhenNode, context: WhenContext): boolean {
    switch (node.type) {
      case 'and': return this.evaluateNode(node.left!, context) && this.evaluateNode(node.right!, context);
      case 'or': return this.evaluateNode(node.left!, context) || this.evaluateNode(node.right!, context);
      case 'not': return !this.evaluateNode(node.child!, context);
      case 'contextKey': return !!context.getContextKeyValue(node.key!);
      case 'compare':
        const actual = context.getContextKeyValue(node.key!);
        switch (node.operator) {
          case '==': return String(actual) === node.value;
          case '!=': return String(actual) !== node.value;
          case '=~': return new RegExp(node.value!).test(String(actual));
          default: return false;
        }
      default: return false;
    }
  }
}

type WhenToken = { type: 'AND' | 'OR' | 'NOT' | 'LPAREN' | 'RPAREN' | 'EQ' | 'NEQ' | 'REGEX' | 'IDENTIFIER' | 'STRING'; value?: string };
type WhenNode = { type: 'and' | 'or' | 'not' | 'contextKey' | 'compare'; left?: WhenNode; right?: WhenNode; child?: WhenNode; key?: string; operator?: string; value?: string };
interface WhenContext { getContextKeyValue(key: string): unknown; }

```

---

## 13. Web Workers for Extensions
### 13.1 Web Extension Host
```

                      BROWSER / WEB ENVIRONMENT

  +------------------------------------------------------------------+
  |  MAIN THREAD                                                     |
  |                                                                  |
  |  +-----------------+  +---------------+  +-------------------+  |
  |  | Monaco Editor   |  | Service       |  | IndexedDB         |  |
  |  |                 |  | Worker        |  | Storage           |  |
  |  +-----------------+  +---------------+  +-------------------+  |
  +------------------+----------------------------------------------+
           |                      |
           | postMessage()        | MessageChannel
           v                      v
  +------------------------------------------------------------------+
  |  WEB EXTENSION HOST POOL                                        |
  |                                                                  |
  |  +-----------------+  +-----------------+  +-----------------+   |
  |  | Worker 1        |  | Worker 2        |  | Worker 3        |  |
  |  | (ext A, B)      |  | (ext C)         |  | (ext D, E)      |  |
  |  +-----------------+  +-----------------+  +-----------------+   |
  |                                                                  |
  +------------------------------------------------------------------+
  +------------------------------------------------------------------+
  |  SERVICE WORKER (persistent background)                         |
  |  - Cache de recursos da extensao                               |
  |  - Sincronizacao offline                                        |
  |  - Push notifications                                           |
  +------------------------------------------------------------------+

```

### 13.2 Web Worker Extension Host
```typescript

class WebExtensionHostManager {
  private workers = new Map<string, Worker>();
  private channelPool = new Map<string, MessageChannel>();

  async createHost(extensionId: string): Promise<void> {
    const channel = new MessageChannel();
    const worker = new Worker(new URL('./web-extension-host.js', import.meta.url), {
      type: 'module', name: 'ext:' + extensionId,
    });

    worker.postMessage({
      type: 'init', extensionId,
      apiPort: channel.port1,
      config: { storageType: 'indexeddb', resourceLimits: { maxHeapMB: 64 } },
    }, [channel.port1]);

    this.channelPool.set(extensionId, channel);
    this.workers.set(extensionId, worker);

    worker.onmessage = (event) => this.handleWorkerMessage(extensionId, event);
    worker.onerror = (event) => {
      console.error('[' + extensionId + '] Worker error:', event.message);
      worker.terminate();
    };
  }
}

```

### 13.3 Web Extension Host (Worker)
```typescript

class WebExtensionWorkerHost {
  private apiPort: MessagePort | null = null;
  private extensionId = '';
  private rpcProtocol: RPCProtocol | null = null;

  async init(msg: { extensionId: string; apiPort: MessagePort; config: Record<string, unknown> }): Promise<void> {
    this.extensionId = msg.extensionId;
    this.apiPort = msg.apiPort;

    const transport: MessageTransport = {
      send: (data) => this.apiPort!.postMessage(data),
      onMessage: (cb) => {
        this.apiPort!.onmessage = (event) => cb(Buffer.from(event.data));
        return { dispose: () => { this.apiPort!.onmessage = null; } };
      },
      onClose: (cb) => { this.apiPort!.onmessageerror = () => cb(); return { dispose() {} }; },
      onError: (cb) => { self.onerror = (event) => cb(new Error(String(event))); return { dispose() {} }; },
      close: () => this.apiPort!.close(),
    };

    this.rpcProtocol = new RPCProtocol(transport);
    this.rpcProtocol.registerMethod('extension:activate', async (params) => this.activateExtension(params[0] as string));

    const extModule = await import('./extensions/' + this.extensionId + '/main.js');
    const context = new ExtensionContext({
      extensionPath: '/extensions/' + this.extensionId,
      globalState: new WebMemento('global'),
      workspaceState: new WebMemento('workspace-' + this.extensionId),
      secrets: new WebSecretStorage(),
    });

    await extModule.activate(context);
    self.postMessage({ type: 'activate:ready', extensionId: this.extensionId });
  }

  private async activateExtension(activationEvent: string): Promise<void> {
    // activation logic
  }
}

```

### 13.4 IndexedDB for Storage
```typescript

class WebMemento implements Memento {
  private db: IDBDatabase | null = null;

  constructor(private storeName: string) {}

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('extension-memento', 1);
      request.onupgradeneeded = () => request.result.createObjectStore(this.storeName);
      request.onsuccess = () => { this.db = request.result; resolve(this.db); };
      request.onerror = () => reject(request.error);
    });
  }

  async get(key: string): Promise<unknown> {
    const db = await this.openDB();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async set(key: string, value: unknown): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    return new Promise((resolve, reject) => {
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

```

---

## 14. Extension Security Model
### 14.1 Workspace Trust
```typescript

interface WorkspaceTrustState {
  isTrusted: boolean;
  trustLevel: 'untrusted' | 'partially-trusted' | 'trusted' | 'fully-trusted';
  restrictedFeatures: string[];
  allowedExtensions: string[];
  blockedExtensions: string[];
}

class WorkspaceTrustManager {
  private state: WorkspaceTrustState = {
    isTrusted: false,
    trustLevel: 'untrusted',
    restrictedFeatures: ['workspace.fs.write', 'debug.startDebugging', 'tasks.executeTask', 'terminal.create', 'shell.execution'],
    allowedExtensions: ['ideia.core-language-features', 'ideia.theme-defaults'],
    blockedExtensions: [],
  };

  isFeatureRestricted(feature: string): boolean {
    return !this.state.isTrusted && this.state.restrictedFeatures.includes(feature);
  }

  isExtensionAllowed(extensionId: string): boolean {
    return this.state.isTrusted || this.state.allowedExtensions.includes(extensionId);
  }

  getCapabilities(extensionId: string): Record<string, Record<string, boolean>> {
    const t = this.state.isTrusted;
    const a = this.isExtensionAllowed(extensionId);
    return {
      fileSystem: { read: t || a, write: t, execute: t },
      network: { fetch: true, listen: t },
      process: { spawn: t && a, fork: t },
      shell: { execute: t },
      debug: { start: t },
      terminal: { create: t, write: t },
    };
  }
}

```

### 14.2 Extension Permissions
```typescript

enum ExtensionPermission {
  FileSystemRead = 'filesystem.read',
  FileSystemWrite = 'filesystem.write',
  FileSystemDelete = 'filesystem.delete',
  NetworkFetch = 'network.fetch',
  NetworkListen = 'network.listen',
  ProcessSpawn = 'process.spawn',
  ProcessFork = 'process.fork',
  UIWebview = 'ui.webview',
  UINotification = 'ui.notification',
  DebugStart = 'debug.start',
  TerminalCreate = 'terminal.create',
  TerminalWrite = 'terminal.write',
  LLMAccess = 'llm.access',
  MemoryAccess = 'memory.access',
  AgentRegister = 'agent.register',
  ClipboardRead = 'clipboard.read',
  ClipboardWrite = 'clipboard.write',
  OpenExternal = 'open.external',
}

class ExtensionPermissionManager {
  private grantedPermissions = new Map<string, Set<ExtensionPermission>>();

  async requestPermissions(extensionId: string, permissions: ExtensionPermission[]): Promise<boolean> {
    const existing = this.grantedPermissions.get(extensionId) || new Set();
    for (const perm of permissions) {
      if (existing.has(perm)) continue;
      existing.add(perm);
    }
    this.grantedPermissions.set(extensionId, existing);
    return true;
  }

  hasPermission(extensionId: string, permission: ExtensionPermission): boolean {
    return this.grantedPermissions.get(extensionId)?.has(permission) ?? false;
  }

  revokeAll(extensionId: string): void { this.grantedPermissions.delete(extensionId); }
}

```

### 14.3 Restricted Mode
```typescript

class RestrictedModeManager {
  private isRestricted = false;
  private featureGates = new Map<string, boolean>([
    ['debug.start', false],
    ['task.execute', false],
    ['terminal.create', false],
    ['workspace.git', false],
    ['extension.install', true],
    ['extension.executeCommand', false],
    ['workspace.config.write', false],
  ]);

  enableRestrictedMode(): void { this.isRestricted = true; }
  disableRestrictedMode(): void { this.isRestricted = false; }
  isFeatureEnabled(feature: string): boolean {
    return !this.isRestricted || (this.featureGates.get(feature) ?? true);
  }
}

```

### 14.4 Extension Host Process Sandboxing
```typescript

import { spawn, ChildProcess } from 'child_process';

class ExtensionHostSandbox {
  private child: ChildProcess;

  constructor(extensionId: string, executable: string, args: string[]) {
    this.child = spawn(executable, args, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      windowsHide: true,
    });
    this.applyOSRestrictions();
  }

  private applyOSRestrictions(): void {
    const pid = this.child.pid;
    if (!pid) return;
    if (process.platform === 'linux') this.applyLinuxRestrictions(pid);
    else if (process.platform === 'win32') this.applyWindowsRestrictions(pid);
  }

  private applyLinuxRestrictions(pid: number): void {
    process.send?.({ type: 'seccomp:apply', pid });
    process.send?.({ type: 'cgroup:limit', pid, limits: { cpuMax: '50000 100000', memoryMax: '256M' } });
  }

  private applyWindowsRestrictions(pid: number): void {
    process.send?.({ type: 'job:create', pid, job: 'Global\\IDEIA_Job_' + pid, limits: { memoryLimit: 256 * 1024 * 1024 } });
  }

  kill(): void {
    if (process.platform === 'win32') require('child_process').execSync('taskkill /F /PID ' + this.child.pid, { stdio: 'ignore' });
    else this.child.kill('SIGKILL');
  }
}

```

---

## 15. Code Examples
### 15.1 ExtensionHostProcess Class
```typescript

import { fork, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { join } from 'path';

interface ExtensionHostOptions {
  id: string;
  pool: string;
  extensionsToLoad: string[];
  resourceLimits: ResourceLimits;
  extensionPaths: Map<string, string>;
  environment?: Record<string, string>;
}

class ExtensionHostProcess extends EventEmitter {
  public readonly id: string;
  public readonly pool: string;
  public readonly createdAt: number;
  public restartCount = 0;
  private child: ChildProcess | null = null;
  private rpc: RPCProtocol | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private options: ExtensionHostOptions;
  private activeExtensionIds = new Set<string>();
  private state: 'created' | 'starting' | 'ready' | 'active' | 'stopping' | 'dead' = 'created';

  constructor(options: ExtensionHostOptions) {
    super();
    this.id = options.id;
    this.pool = options.pool;
    this.options = options;
    this.createdAt = Date.now();
  }

  async start(): Promise<void> {
    this.state = 'starting';
    const hostScript = join(__dirname, 'extension-host-bootstrap.js');

    this.child = fork(hostScript, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: {
        ...process.env,
        ...this.options.environment,
        EXTENSION_HOST_ID: this.id,
        EXTENSION_HOST_POOL: this.pool,
      },
      execArgv: ['--max-old-space-size=' + this.options.resourceLimits.memory.maxHeapMB],
    });

    this.setupIPC();
    this.startHealthCheck();
    await this.waitForReady(10000);
    this.state = 'ready';
    this.emit('ready', this.id);
  }

  private setupIPC(): void {
    if (!this.child) return;
    const transport: MessageTransport = {
      send: (data) => this.child!.send(data),
      onMessage: (cb) => { this.child!.on('message', cb); return { dispose: () => this.child!.off('message', cb) }; },
      onClose: (cb) => { this.child!.on('exit', cb); return { dispose: () => this.child!.off('exit', cb) }; },
      onError: (cb) => { this.child!.on('error', cb); return { dispose: () => this.child!.off('error', cb) }; },
      close: () => this.child!.kill(),
    };
    this.rpc = new RPCProtocol(transport);

    this.child.on('exit', (code, signal) => {
      this.state = 'dead';
      this.stopHealthCheck();
      this.emit('exit', { hostId: this.id, code, signal, restartCount: this.restartCount });
    });
  }

  async loadExtension(extensionId: string): Promise<void> {
    const extPath = this.options.extensionPaths.get(extensionId);
    if (!extPath) throw new Error('Extension path not found: ' + extensionId);
    await this.rpc!.call('extension:load', { id: extensionId, path: extPath });
    this.activeExtensionIds.add(extensionId);
  }

  async activateExtension(extensionId: string, event: string): Promise<void> {
    await this.rpc!.call('extension:activate', { id: extensionId, event });
  }

  async deactivateExtension(extensionId: string): Promise<void> {
    await this.rpc!.call('extension:deactivate', { id: extensionId });
    this.activeExtensionIds.delete(extensionId);
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      try { await this.rpc!.call('health:check'); }
      catch { this.emit('health:failed', { hostId: this.id }); }
    }, 5000);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) { clearInterval(this.healthCheckTimer); this.healthCheckTimer = null; }
  }

  private waitForReady(timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
      this.rpc!.registerMethod('ready', async () => { clearTimeout(timer); resolve(); return {}; });
    });
  }

  async shutdown(): Promise<void> {
    this.state = 'stopping';
    await this.rpc?.call('shutdown');
    this.stopHealthCheck();
    this.child?.kill();
    this.state = 'dead';
  }

  getState(): string { return this.state; }
  getActiveExtensions(): string[] { return Array.from(this.activeExtensionIds); }
}

```

### 15.2 Extension Host Bootstrap
```typescript

import { parentPort } from 'worker_threads';

class ExtensionHostBootstrap {
  private rpc: RPCProtocol;
  private loadedExtensions = new Map<string, { module: any; isActive: boolean; context?: ExtensionContext }>();

  constructor() {
    this.rpc = new RPCProtocol(this.createTransport());
    this.registerCoreHandlers();
    this.notifyReady();
  }

  private createTransport(): MessageTransport {
    const port = parentPort || process;
    return {
      send: (data) => port.postMessage(data),
      onMessage: (cb) => { port.on('message', cb); return { dispose: () => port.off('message', cb) }; },
      onClose: (cb) => { port.on('close', cb); return { dispose: () => port.off('close', cb) }; },
      onError: (cb) => { port.on('error', cb); return { dispose: () => port.off('error', cb) }; },
      close: () => process.exit(0),
    };
  }

  private registerCoreHandlers(): void {
    this.rpc.registerMethod('extension:load', async (params) => {
      const { id, path } = params[0] as { id: string; path: string };
      try { this.loadedExtensions.set(id, { module: require(path), isActive: false }); return true; }
      catch { return false; }
    });

    this.rpc.registerMethod('extension:activate', async (params) => {
      const { id } = params[0] as { id: string };
      const ext = this.loadedExtensions.get(id);
      if (!ext || ext.isActive) return false;
      const context = new ExtensionContext({
        extensionPath: '/extensions/' + id,
        globalState: new Memento('global'),
        workspaceState: new Memento('workspace'),
        secrets: new SecretStorage(this.rpc),
      });
      await ext.module.activate(context);
      ext.isActive = true;
      ext.context = context;
      return true;
    });

    this.rpc.registerMethod('extension:deactivate', async (params) => {
      const { id } = params[0] as { id: string };
      const ext = this.loadedExtensions.get(id);
      if (!ext || !ext.isActive) return false;
      await ext.module.deactivate?.();
      ext.context?.subscriptions.dispose();
      ext.isActive = false;
      return true;
    });

    this.rpc.registerMethod('health:check', async () => ({
      pid: process.pid, uptime: process.uptime(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      activeExtensions: this.loadedExtensions.size,
    }));

    this.rpc.registerMethod('shutdown', async () => {
      for (const [, ext] of this.loadedExtensions) if (ext.isActive) await ext.module.deactivate?.();
      process.exit(0);
    });
  }

  private notifyReady(): void { this.rpc.notify('ready'); }
}

new ExtensionHostBootstrap();

```

### 15.3 Activation Event Handler
```typescript

class ActivationEventHandler {
  private handlers = new Map<string, Set<string>>();
  private activatedExtensions = new Set<string>();
  private extensionRegistry: ExtensionRegistry;

  constructor(registry: ExtensionRegistry) { this.extensionRegistry = registry; }

  registerExtension(extensionId: string, activationEvents: string[]): void {
    for (const event of activationEvents) {
      if (!this.handlers.has(event)) this.handlers.set(event, new Set());
      this.handlers.get(event)!.add(extensionId);
    }
  }

  async fireEvent(event: string): Promise<void> {
    const ids = this.handlers.get(event);
    if (!ids || ids.size === 0) return;

    const toActivate = Array.from(ids).filter(id => !this.activatedExtensions.has(id));
    if (toActivate.length === 0) return;

    await Promise.allSettled(toActivate.map(async (extId) => {
      try {
        const ext = this.extensionRegistry.getExtension(extId);
        const extEvents = ext.manifest.activationEvents || [];
        for (const extEvent of extEvents) {
          if (this.eventMatches(extEvent, event)) {
            await ext.activate(event);
            this.activatedExtensions.add(extId);
            break;
          }
        }
      } catch (err) { console.error('Failed to activate ' + extId + ':', err); }
    }));
  }

  private eventMatches(pattern: string, actual: string): boolean {
    if (pattern === '*') return true;
    const [pt, pv] = pattern.split(':');
    if (pv === '*') return actual.startsWith(pt + ':');
    return pattern === actual;
  }
}

```

### 15.4 Extension Manifest Example
```json
{
  "name": "my-extension",
  "publisher": "ideia",
  "version": "1.0.0",
  "engines": {
    "IDEIA": "^1.0.0"
  },
  "activationEvents": [
    "onLanguage:typescript",
    "onCommand:myExt.hello"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "myExt.hello",
        "title": "Say Hello",
        "category": "My Extension"
      }
    ],
    "keybindings": [
      {
        "command": "myExt.hello",
        "key": "ctrl+alt+h",
        "when": "editorTextFocus"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "command": "myExt.hello",
          "group": "navigation"
        }
      ]
    },
    "views": {
      "explorer": [
        {
          "id": "myExt.tree",
          "name": "My Tree"
        }
      ]
    },
    "languages": [
      {
        "id": "myLang",
        "aliases": [
          "My Language"
        ],
        "extensions": [
          ".mylang"
        ]
      }
    ]
  }
}
```

---

## 16. Conexoes
### 16.1 Estudos Relacionados
| Estudo | Relacao |
| --- | --- |
| S20 (Plugins/Ecossistema) | Define o ecossistema de plugins, marketplace e SDK que serao executados nos extension hosts. Extension Host e a camada de runtime que S20 consome. |
| S34 (Monaco Editor) | Monaco e o editor que recebe as contribuicoes das extensoes. A comunicacao entre extension host e Monaco se da via LSP e JSON-RPC. |
| S35 (FileSystem) | O sistema de arquivos e acessado por extensoes atraves do proxy de API. FileSystemProvider e registrado via contribution point. |
| S39 (Settings) | Configuracoes expostas as extensoes via workspace.getConfiguration com suporte a change notifications. Schema definido no contributes.configuration. |
| S4 (Seguranca) | Modelo de seguranca (workspace trust, permissions, restricted mode) depende do isolamento provido pelos extension hosts. |
| S5 (Orquestracao Multiagente) | Agentes como extensoes especiais executam em extension hosts dedicados (pool de agentes) via protocolo A2A/NATS. |
| S11 (Theia IDE) | Integracao com Theia via plugin-ext. Theia plugin system e a camada de UI que consome os contribution points. |
| S21 (Terminal/Debug) | Terminal e debug sao servicos do processo principal que extensoes controlam via API (window.createTerminal, debug.startDebugging). |

### 16.2 Contratos de Integracao
| Contrato | Origem | Destino | Protocolo |
| --- | --- | --- | --- |
| C-EH-01 | Extension Host | Main Process | JSON-RPC via stdio |
| C-EH-02 | Extension Host | Monaco Editor | LSP 3.18 |
| C-EH-03 | Extension Host | Debug Adapter | DAP 1.59 |
| C-EH-04 | Extension Host | NATS JetStream | NATS Pub/Sub |
| C-EH-05 | Extension Host | File System | FS Tunnel |
| C-EH-06 | Extension Host | Extension Host | NATS Bridge |
| C-EH-07 | Main Process | Extension Host | Heartbeat Health |
| C-EH-08 | Extension Host | Settings Service | JSON-RPC Config |

---

## 17. Plano de Implementacao
### 17.1 Tasks
| # | Task | Descricao | Prioridade | Esforco | Depende |
| --- | --- | --- | --- | --- | --- |
| EH-01 | RPC Protocol Core | RPCProtocol, MessageTransport, JSON-RPC 2.0 | P0 | 8h | -- |
| EH-02 | ExtensionHostProcess | Classe com fork, health check, restart | P0 | 12h | EH-01 |
| EH-03 | Extension Host Bootstrap | Bootstrap no processo filho | P0 | 8h | EH-01 |
| EH-04 | Activation Event System | ActivationEventHandler completo | P0 | 6h | EH-02 |
| EH-05 | API Proxy Generator | Proxy pattern com proxies aninhados | P0 | 8h | EH-01 |
| EH-06 | Disposable Pattern | Disposable, DisposableStore, ExtensionContext | P0 | 4h | -- |
| EH-07 | Emitter / Event Channel | RemoteEventChannel cross-process | P0 | 6h | EH-01 |
| EH-08 | Cancellation Token | CancellationTokenSource | P0 | 3h | EH-06 |
| EH-09 | Resource Limits | ResourceLimits, ResourceMonitor | P0 | 8h | EH-02 |
| EH-10 | Extension Manifest Parser | Parser com Zod schemas | P0 | 10h | -- |
| EH-11 | Contribution Registry | ContributionRegistry, handlers | P1 | 12h | EH-10 |
| EH-12 | When Clause Parser | Parser e evaluator | P1 | 8h | EH-11 |
| EH-13 | Extension Host Pool | Pool scheduler com afinidade | P1 | 10h | EH-02 |
| EH-14 | Extension Store | Instalacao, enable/disable, update | P1 | 12h | EH-13 |
| EH-15 | Dependency Resolver | Resolucao com topological sort | P1 | 6h | EH-10 |
| EH-16 | Crash Recovery | Restart com backoff e crash loop detection | P1 | 6h | EH-02 |
| EH-17 | Workspace Trust | WorkspaceTrustManager, restricted mode | P1 | 8h | EH-05 |
| EH-18 | Permission Manager | ExtensionPermissionManager | P1 | 6h | EH-17 |
| EH-19 | Remote Extension Host | Conexao WSS, latency compensation | P2 | 16h | EH-02 |
| EH-20 | Web Worker Host | WebExtensionHostManager | P2 | 12h | EH-01 |
| EH-21 | Service Worker | Offline e background tasks | P2 | 8h | EH-20 |
| EH-22 | VM Sandbox Isolation | VMSandbox com vm.createContext | P2 | 10h | EH-09 |
| EH-23 | IDEIA Extended API | API de agentes, memoria, speech | P2 | 12h | EH-05 |
| EH-24 | API Compatibility Shim | vscode.* compatibility shim | P2 | 8h | EH-05 |
| EH-25 | Message Batcher | MessageBatcher para batch remoto | P2 | 4h | EH-01 |
| EH-26 | VS Code Testing | Testar 10 extensoes populares | P3 | 16h | EH-24 |
| EH-27 | Performance Benchmarks | Latencia RPC, throughput, ativacao | P3 | 8h | EH-01 |
| EH-28 | Documentation | API, contribution points, guia migracao | P3 | 12h | EH-24 |

### 17.2 Tecnologias Recomendadas
| Prioridade | Tecnologia | Uso | Justificativa |
| --- | --- | --- | --- |
| P0 | Node.js child_process | Process isolation | fork() nativo, stdio/IPC pipes |
| P0 | Zod | Schema validation | Typesafe, auto-generates types |
| P0 | TypeScript Proxy | API proxy | Proxy handler para geracao automatica |
| P1 | semver | Version management | Compatibilidade de engines |
| P1 | webpack / esbuild | Extension bundling | Bundle para web workers |
| P2 | seccomp / AppArmor | Linux sandbox | OS-level isolation |
| P2 | Win32 Job Objects | Windows sandbox | Process group isolation |
| P2 | IndexedDB | Web storage | Persistencia para web extensions |

### 17.3 Roadmap
| Fase | Tasks | Estimativa | Resultado |
| --- | --- | --- | --- |
| Fase 1 (Core) | EH-01 a EH-10 | 73h | Extension host funcional com RPC, ativacao, proxy, resource limits |
| Fase 2 (Contribuicoes) | EH-11 a EH-18 | 68h | Sistema de contribuicoes completo com permissoes |
| Fase 3 (Remoto/Web) | EH-19 a EH-23 | 58h | Suporte remote SSH, web workers, API agentes |
| Fase 4 (Compatibilidade) | EH-24 a EH-28 | 60h | Compatibilidade VS Code, benchmarks, docs |

### 17.4 Riscos
1. **Performance de proxy:** Proxy aninhado com muitas chamadas RPC pode ter latencia alta. Mitigacao: batching de mensagens, cache de proxies.

2. **Consumo de memoria:** Multiplos extension hosts com fork() consomem memoria significativa. Mitigacao: host pooling com limite maximo de processos.

3. **Compatibilidade VS Code:** API incompleta pode impedir extensoes populares. Mitigacao: compatibility shim, CI com test suite de 10 extensoes.

4. **Seguranca de sandbox:** VM sandbox pode ser bypassada. Mitigacao: uso de child_process como fallback, resource limits restritos.

5. **Race conditions em ativacao:** Multiplas extensoes ativando concorrentemente podem causar conflitos. Mitigacao: activation queue com prioridades.

6. **Extension crash loop:** Extensao que crasha repetidamente pode consumir recursos. Mitigacao: crash loop detection apos 3 falhas em 60s.

7. **Web Worker limits:** Web Workers nao tem acesso a fs, net, child_process. Mitigacao: API proxy via MessageChannel.

---

## Referencias
1. **VS Code Extension Host** -- https://code.visualstudio.com/api/advanced-topics/extension-host
2. **VS Code Remote Development** -- https://code.visualstudio.com/docs/remote/remote-overview
3. **Theia Extension System** -- https://theia-ide.org/docs/plugin-dev
4. **JSON-RPC 2.0 Specification** -- https://www.jsonrpc.org/specification
5. **LSP 3.18** -- https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/
6. **DAP 1.59** -- https://microsoft.github.io/debug-adapter-protocol/specification
7. **OpenVSX** -- https://open-vsx.org
8. **Node.js child_process** -- https://nodejs.org/api/child_process.html
9. **Node.js VM** -- https://nodejs.org/api/vm.html
10. **Web Workers API** -- https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
