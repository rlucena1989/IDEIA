# ESTUDO S48 — Theia CLI, Backend & Service Lifecycle

> **Arquitetura do backend Theia: servicos backend, ciclo de vida da aplicacao, comandos CLI, inicializacao do servidor, comunicacao frontend/backend, WebSocket, plugin host, Electron backend e logging**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — Theia backend application, CLI commands, server startup, JSON-RPC, WebSocket, Electron, logging, IDEIA backend services |

---

## Sumario

1. [Introducao](#1-introducao)
    - 1.1 [Arquitetura Backend do Theia](#11-arquitetura-backend-do-theia)
    - 1.2 [Separacao de Processos: Backend vs Frontend](#12-separacao-de-processos-backend-vs-frontend)
    - 1.3 [CLI Entry Points](#13-cli-entry-points)
    - 1.4 [Server Lifecycle & Backend Service Registration](#14-server-lifecycle--backend-service-registration)

2. [Backend Application](#2-backend-application)
    - 2.1 [BackendApplication Class](#21-backendapplication-class)
    - 2.2 [BackendApplicationContribution](#22-backendapplicationcontribution)
    - 2.3 [Backend Initialization Sequence](#23-backend-initialization-sequence)
    - 2.4 [Backend Shutdown & Cleanup](#24-backend-shutdown--cleanup)
    - 2.5 [Backend Configuration & CLI Args](#25-backend-configuration--cli-args)

3. [Backend Service Lifecycle](#3-backend-service-lifecycle)
    - 3.1 [Lifecycle Phases](#31-lifecycle-phases)
    - 3.2 [Lifecycle Hooks](#32-lifecycle-hooks)
    - 3.3 [Eager vs Lazy Services](#33-eager-vs-lazy-services)
    - 3.4 [Service Dependencies & Injection Order](#34-service-dependencies--injection-order)
    - 3.5 [Circular Dependency Handling](#35-circular-dependency-handling)
    - 3.6 [Service State Monitoring](#36-service-state-monitoring)

4. [CLI Architecture](#4-cli-architecture)
    - 4.1 [Theia CLI Entry Points](#41-theia-cli-entry-points)
    - 4.2 [CLI Command Parser](#42-cli-command-parser)
    - 4.3 [CLICommandContribution](#43-clicommandcontribution)
    - 4.4 [CLI Argument Parsing](#44-cli-argument-parsing)
    - 4.5 [Command Handler Registration](#45-command-handler-registration)
    - 4.6 [Exit Code Handling](#46-exit-code-handling)
    - 4.7 [CLI Logging](#47-cli-logging)

5. [Server Startup](#5-server-startup)
    - 5.1 [Theia Server Bootstrap](#51-theia-server-bootstrap)
    - 5.2 [HTTP/HTTPS Server Creation](#52-httphttps-server-creation)
    - 5.3 [WebSocket Server Setup](#53-websocket-server-setup)
    - 5.4 [Express.js Middleware Integration](#54-expressjs-middleware-integration)
    - 5.5 [Static File Serving](#55-static-file-serving)
    - 5.6 [API Endpoint Registration](#56-api-endpoint-registration)
    - 5.7 [CORS Configuration](#57-cors-configuration)

6. [Frontend/Backend Communication](#6-frontendbackend-communication)
    - 6.1 [JSON-RPC over WebSocket](#61-json-rpc-over-websocket)
    - 6.2 [Connection Service](#62-connection-service)
    - 6.3 [Channel Creation](#63-channel-creation)
    - 6.4 [RPC Proxy Generation](#64-rpc-proxy-generation)
    - 6.5 [Promise Handling over RPC](#65-promise-handling-over-rpc)
    - 6.6 [Event Handling over RPC](#66-event-handling-over-rpc)
    - 6.7 [Connection Lifecycle](#67-connection-lifecycle)

7. [WebSocket Connection](#7-websocket-connection)
    - 7.1 [WebSocket Channel Manager](#71-websocket-channel-manager)
    - 7.2 [Connection Authentication](#72-connection-authentication)
    - 7.3 [Reconnection Strategy](#73-reconnection-strategy)
    - 7.4 [Heartbeat & Keep-Alive](#74-heartbeat--keep-alive)
    - 7.5 [Message Framing](#75-message-framing)
    - 7.6 [Message Compression](#76-message-compression)
    - 7.7 [Connection Multiplexing](#77-connection-multiplexing)

8. [Backend Contributions](#8-backend-contributions)
    - 8.1 [BackendApplicationContribution: onStart, onStop](#81-backendapplicationcontribution-onstart-onstop)
    - 8.2 [Backend Command Contribution](#82-backend-command-contribution)
    - 8.3 [Backend Task Provider](#83-backend-task-provider)
    - 8.4 [Backend File System Provider](#84-backend-file-system-provider)
    - 8.5 [Backend Search Provider](#85-backend-search-provider)
    - 8.6 [Backend Terminal Service](#86-backend-terminal-service)

9. [Plug-in Host](#9-plug-in-host)
    - 9.1 [Plugin Server Process](#91-plugin-server-process)
    - 9.2 [Plugin Deployment](#92-plugin-deployment)
    - 9.3 [Plugin Process Management](#93-plugin-process-management)
    - 9.4 [Plugin Resource Management](#94-plugin-resource-management)
    - 9.5 [Plugin Isolation](#95-plugin-isolation)

10. [Electron Backend](#10-electron-backend)
    - 10.1 [Electron Main Process](#101-electron-main-process)
    - 10.2 [Electron Window Management](#102-electron-window-management)
    - 10.3 [Electron IPC vs WebSocket](#103-electron-ipc-vs-websocket)
    - 10.4 [Native Dialog Access](#104-native-dialog-access)
    - 10.5 [Native Menu Integration](#105-native-menu-integration)
    - 10.6 [Shell Integration](#106-shell-integration)
    - 10.7 [Auto-Updater](#107-auto-updater)

11. [CLI Tooling](#11-cli-tooling)
    - 11.1 [Theia Extension Generator](#111-theia-extension-generator)
    - 11.2 [Theia Build](#112-theia-build)
    - 11.3 [Theia Docker](#113-theia-docker)
    - 11.4 [CLI for Managing Extensions](#114-cli-for-managing-extensions)
    - 11.5 [Dev Mode vs Production Mode](#115-dev-mode-vs-production-mode)

12. [Logging](#12-logging)
    - 12.1 [ILogger & LoggerFactory](#121-ilogger--loggerfactory)
    - 12.2 [Log Levels](#122-log-levels)
    - 12.3 [Log Format](#123-log-format)
    - 12.4 [Log Output: Console, File, Backend](#124-log-output-console-file-backend)
    - 12.5 [Log Rotation](#125-log-rotation)
    - 12.6 [Performance Logging](#126-performance-logging)
    - 12.7 [Log Correlation IDs](#127-log-correlation-ids)

13. [IDEIA Backend Services](#13-ideia-backend-services)
    - 13.1 [Agent Execution Service](#131-agent-execution-service)
    - 13.2 [LLM Proxy Service](#132-llm-proxy-service)
    - 13.3 [Project Analysis Service](#133-project-analysis-service)
    - 13.4 [Background Task Service](#134-background-task-service)
    - 13.5 [Agent Session Persistence](#135-agent-session-persistence)

14. [Startup Optimization](#14-startup-optimization)
    - 14.1 [Lazy Module Loading](#141-lazy-module-loading)
    - 14.2 [Progressive Startup](#142-progressive-startup)
    - 14.3 [Startup Phases](#143-startup-phases)
    - 14.4 [Background Initialization](#144-background-initialization)
    - 14.5 [WebSocket Connection Early](#145-websocket-connection-early)
    - 14.6 [Loading Screen](#146-loading-screen)

15. [Code Examples](#15-code-examples)
    - 15.1 [BackendApplicationContribution Startup](#151-backendapplicationcontribution-startup)
    - 15.2 [JSON-RPC Channel Setup](#152-json-rpc-channel-setup)
    - 15.3 [CLI Command Contribution](#153-cli-command-contribution)
    - 15.4 [WebSocket Connection with Reconnection](#154-websocket-connection-with-reconnection)
    - 15.5 [Backend Service with Lifecycle Hooks](#155-backend-service-with-lifecycle-hooks)
    - 15.6 [Logger Setup](#156-logger-setup)

16. [Conexoes](#16-conexoes)

17. [Plano de Implementacao](#17-plano-de-implementacao)
    - 17.1 [Fases](#171-fases)
    - 17.2 [Pacotes](#172-pacotes)
    - 17.3 [Marcos](#173-marcos)
    - 17.4 [Riscos](#174-riscos)

---

## 1. Introducao

### 1.1 Arquitetura Backend do Theia

O backend do Theia e um servidor Node.js responsavel por toda a logica que nao deve executar no navegador: sistema de arquivos, processos, comunicacao com LSP/DAP, gerenciamento de extensoes, conexoes WebSocket, servico de terminal e persistencia. Ele e construido sobre tres pilares arquiteturais:

```
+-------------------------------------------------------------------+
|                    THEIA BACKEND ARCHITECTURE                      |
|                                                                     |
|  +------------------+  +------------------+  +-------------------+ |
|  | CLI Layer        |  | HTTP Server      |  | WebSocket Server  | |
|  | (yargs/commander)|  | (Express.js)     |  | (ws / uWebSockets)| |
|  +--------+---------+  +--------+---------+  +---------+---------+ |
|           |                      |                       |          |
|  +--------v----------------------v-----------------------v------+  |
|  |                BACKEND APPLICATION CONTAINER                  |  |
|  |  +---------------------------------------------------------+ |  |
|  |  | BackendApplicationContribution[]                         | |  |
|  |  | BackendApplication (onStart, onStop)                     | |  |
|  |  | ConnectionHandlers, RPC services, Logger, FileSystem     | |  |
|  |  +---------------------------------------------------------+ |  |
|  +------------------------------------+--------------------------+  |
|                                       |                              |
|  +------------------------------------v--------------------------+  |
|  |  INFRASTRUCTURE LAYER                                         |  |
|  |  +------------+  +------------+  +-------------------------+   |  |
|  |  | Process    |  | File System|  | Plugin Host (child      |   |  |
|  |  | Manager    |  | Watcher    |  | process for extensions) |   |  |
|  |  +------------+  +------------+  +-------------------------+   |  |
|  +--------------------------------------------------------------+  |
+-------------------------------------------------------------------+
```

O container Inversify no backend e configurado separadamente do container frontend. Cada um tem seu proprio conjunto de bindings, modules e escopos. Backend services sao tipicamente singletons (escopo de aplicacao), enquanto objetos de requisicao podem ser transientes.

### 1.2 Separacao de Processos: Backend vs Frontend

Theia opera em dois processos distintos, diferentemente de editores monoliticos:

| Aspecto | Backend (Node.js) | Frontend (Browser/Electron Renderer) |
|---------|------------------|--------------------------------------|
| Runtime | Node.js 20+ | Browser (Chromium) / Electron renderer |
| Responsabilidade | FS, processos, LSP, DAP, plugins, terminal | UI, widgets, Monaco editor, keybindings |
| Ciclo de vida | Servidor continuo | Sessao do browser (recarregavel) |
| Estado | Persistente (memoria + disco) | Volatil (perde ao recarregar) |
| DI Container | `@theia/core/lib/node/backend-application` | `@theia/core/lib/browser/frontend-application` |
| Comunicacao | JSON-RPC sobre WebSocket | WebSocket client -> Backend |

```
+------------------------------------------------------------------+
|                          DEPLOYMENT                               |
|  +---------------------------+  +-------------------------------+ |
|  | Electron Mode             |  | Browser Mode (Theia Cloud)    | |
|  | +-------+  +-----------+  |  | +--------+  +--------------+ | |
|  | | Main  |  | Renderer  |  |  | |Browser |  | Theia        | | |
|  | |Process|  | (Frontend)|  |  | |Client  |  | Backend      | | |
|  | +---+---+  +-----+-----+  |  | |(FE)    |  | Server (BE)  | | |
|  |     |            |         |  | +---+----+  +------+-------+ | |
|  |     |  Electron  |         |  |     |  WebSocket      |       | |
|  |     |  IPC       |         |  |     +------------------+       | |
|  |     +---v--------+         |  |     |  HTTP/WS        |       | |
|  |         | Backend          |  |     +------------------+       | |
|  |         | (Node.js)        |  +-------------------------------+  |
|  |         v                  |                                     |
|  |  +-------------+          |                                     |
|  |  | Backend     |          |                                     |
|  |  | Services    |          |                                     |
|  |  +-------------+          |                                     |
|  +---------------------------+                                     |
+------------------------------------------------------------------+
```

### 1.3 CLI Entry Points

O Theia expoe varios pontos de entrada CLI, definidos no `package.json` de cada aplicacao:

```json
{
    "bin": {
        "theia": "src/scripts/theia",
        "theia-server": "src/scripts/theia-server",
        "theia-build": "src/scripts/theia-build"
    },
    "scripts": {
        "start": "theia start --port 3000",
        "build": "theia build",
        "watch": "theia build --watch"
    }
}
```

Os entry points principais:
- `theia start` — Inicia o servidor backend (HTTP + WebSocket)
- `theia build` — Compila a aplicacao (bundler para frontend)
- `theia clean` — Limpa artefatos de build
- `theia download:plugins` — Baixa plugins declarados no `package.json`
- `theia rebrand` — Aplica branding na UI

### 1.4 Server Lifecycle & Backend Service Registration

O ciclo de vida do backend segue esta sequencia:

```
CLI: `theia start --port 3000`
  |
  v
  [1] CLI Parser (yargs/commander)
  |   - parse args: --port, --hostname, --ssl, --plugins, --root-dir
  |   - configura BackendApplicationConfig
  |
  v
  [2] Container Bootstrap
  |   - create Inversify container
  |   - load backend modules (ContainerModule[])
  |   - bind BackendApplicationConfig como valor
  |
  v
  [3] BackendApplication.configure()
  |   - resolve BackendApplicationContribution[]
  |   - initialize logging, file system, process manager
  |
  v
  [4] Server Creation
  |   - create HTTP/HTTPS server
  |   - attach Express.js middleware
  |   - create WebSocket server (ws / uWebSockets.js)
  |   - bind port
  |
  v
  [5] BackendApplication.start()
  |   - calls onStart() for each BackendApplicationContribution
  |   - contributions register ConnectionHandlers, RPC services, API routes
  |
  v
  [6] Server Listening
  |   - HTTP:3000 accepting connections
  |   - WebSocket: /ws ready for frontend/client connections
  |   - Plugin Host starts loading plugins
  |
  v
  [7] Frontend Connection
  |   - Browser/Electron opens index.html
  |   - Frontend app bootstraps
  |   - WebSocket connects to backend
  |   - JSON-RPC channels established
  |
  v
  [8] Active State
  |   - Services running
  |   - Handlers serving requests
  |   - File watchers active
  |
  v
  [9] Shutdown (SIGTERM/SIGINT)
      - BackendApplication.stop()
      - onStop() for each contribution
      - cleanup: close servers, kill processes, save state
      - exit
```

O registro de servicos backend e feito via ContainerModules que sao carregados pelo `BackendApplication`. Qualquer pacote pode contribuir servicos bindando um `BackendApplicationContribution`:

```typescript
export default new ContainerModule(bind => {
    bind(BackendApplicationContribution).to(IDEIABackendService).inSingletonScope();
    bind(ConnectionHandler).to(IDEIAConnectionHandler).inSingletonScope();
    bind(ILogger).to(BackendLogger).inSingletonScope();
});

---

## 2. Backend Application

### 2.1 BackendApplication Class

`BackendApplication` e a classe central que gerencia o ciclo de vida do servidor Theia. Ela esta em `@theia/core/lib/node/backend-application` e implementa:

```typescript
@injectable()
export class BackendApplication {
    @inject(BackendApplicationConfig)
    protected readonly config: BackendApplicationConfig;

    @inject(ContributionProvider)
    @named(BackendApplicationContribution)
    protected readonly contributions: ContributionProvider<BackendApplicationContribution>;

    @inject(ILogger)
    protected logger: ILogger;

    protected server: http.Server | https.Server | undefined;
    protected wsServer: ws.Server | undefined;

    async configure(): Promise<void> { ... }
    async start(port?: number, hostname?: string): Promise<void> { ... }
    async stop(): Promise<void> { ... }

    use(handler: express.Handler): void { ... }
}
```

### 2.2 BackendApplicationContribution

`BackendApplicationContribution` e a interface base para todos os servicos que precisam participar do startup/shutdown do backend:

```typescript
export interface BackendApplicationContribution {
    onStart?(app: BackendApplication): MaybePromise<void>;
    onStop?(app: BackendApplication): MaybePromise<void>;
    initialize?(): MaybePromise<void>;
}
```

Diferenca entre `initialize()` e `onStart()`:
- `initialize()` — chamado durante a fase de configuracao, antes do servidor HTTP ser criado. Usado para preparar recursos essenciais (banco de dados, sistema de arquivos).
- `onStart()` — chamado depois que o servidor HTTP ja esta ouvindo. Usado para registrar rotas, ConnectionHandlers, servicos que precisam do servidor ativo.
- `onStop()` — chamado durante shutdown. Usado para cleanup: fechar conexoes, salvar estado, matar processos filhos.

### 2.3 Backend Initialization Sequence

```
+-----------------------+
| CLI Entry: theia start|
+----------+------------+
           |
+----------v------------+
| Parse CLI args        |
| (--port, --hostname,  |
|  --ssl, --root-dir)   |
+----------+------------+
           |
+----------v------------+
| Create Inversify      |
| Container             |
| - load backend modules|
| - bind config         |
+----------+------------+
           |
+----------v------------+
| BackendApplication    |
| .configure()          |
|                       |
| 1. resolve logger     |
| 2. resolve FS provider|
| 3. call initialize()  |
|    on each contribution|
| 4. setup express app  |
+----------+------------+
           |
+----------v------------+
| BackendApplication    |
| .start()              |
|                       |
| 1. create HTTP server |
| 2. attach express     |
|    middleware          |
| 3. create WebSocket   |
|    server             |
| 4. bind port/hostname |
| 5. emit 'server:ready'|
| 6. call onStart()     |
|    on each contribution|
+----------+------------+
           |
+----------v------------+
| Server listening at   |
| http://0.0.0.0:3000   |
| WebSocket at ws://... |
+-----------------------+
```

### 2.4 Backend Shutdown & Cleanup

O shutdown do backend segue uma ordem precisa para evitar perda de dados e conexoes abortadas:

```typescript
async stop(): Promise<void> {
    this.logger.info('Shutting down Theia backend...');

    // 1. Stop accepting new connections
    this.server?.close();

    // 2. Notify contributions (reverse order)
    const reversed = [...this.contributions.getContributions()].reverse();
    for (const contrib of reversed) {
        if (contrib.onStop) {
            await contrib.onStop(this);
        }
    }

    // 3. Close WebSocket server
    this.wsServer?.close();

    // 4. Kill plugin host processes
    // (done by PluginHostContribution.onStop)

    // 5. Flush logs
    await this.logger.flush();

    this.logger.info('Theia backend shutdown complete');
    process.exit(0);
}
```

Os hook points de cleanup:

| Contribuicao | Responsabilidade no onStop |
|---|---|
| PluginHostContribution | Mata processo(s) do plugin host |
| FileSystemContribution | Fecha watchers, libera descritores |
| TerminalContribution | Mata process-pty survivors |
| ConnectionContribution | Fecha conexoes WebSocket ativas |
| TaskContribution | Cancela tasks em execucao |
| IDEIA SessionService | Persiste estado das sessoes de agente |

### 2.5 Backend Configuration & CLI Args

A configuracao do backend e fornecida via `BackendApplicationConfig`:

```typescript
export interface BackendApplicationConfig {
    port?: number;                    // default: 3000
    hostname?: string;                // default: 'localhost'
    ssl?: {
        certificate: string;
        key: string;
    };
    rootDir?: string;
    plugins?: string[];
    webSocketHeartbeatInterval?: number;
    maxWebSocketMessageSize?: number;
    cors?: {
        origin: string | string[];
        credentials?: boolean;
    };
    logLevel?: LogLevel;
}
```

CLI args mapeiam diretamente para este config:

```
theia start --port=4000 --hostname=0.0.0.0 --ssl.cert=cert.pem --ssl.key=key.pem

---

## 3. Backend Service Lifecycle

### 3.1 Lifecycle Phases

Cada servico backend Theia passa por ate 5 fases de ciclo de vida:

```
                  +-----------+
                  | Construct |
                  | (new())   |
                  +-----+-----+
                        |
                  +-----v-----+
                  | Inject    |  <- Inversify resolve: injeta dependencias
                  +-----+-----+
                        |
                  +-----v-----+
                  | Initialize|  <- BackendApplicationContribution.initialize()
                  +-----+-----+      Configura recursos, carrega dados
                        |
                  +-----v-----+
                  | Start     |  <- BackendApplicationContribution.onStart()
                  +-----+-----+      Servico operacional, registra handlers
                        |
                  +-----v-----+
                  | Active    |  <- Servico atendendo requisicoes
                  +-----+-----+
                        |
                  +-----v-----+
                  | Stop      |  <- BackendApplicationContribution.onStop()
                  +-----+-----+      Para operacoes, salva estado
                        |
                  +-----v-----+
                  | Dispose   |  <- Libera recursos, fecha handles
                  +-----------+
```

### 3.2 Lifecycle Hooks

Theia nao impoe uma interface de ciclo de vida unificada para todos os servicos. Em vez disso, cada servico implementa os hooks que precisa:

| Hook | Interface | Momento | Uso Tipico |
|------|-----------|---------|------------|
| `initialize()` | `BackendApplicationContribution` | Antes do servidor HTTP iniciar | Carregar config, conectar DB, inicializar cache |
| `onStart()` | `BackendApplicationContribution` | Depois do servidor HTTP iniciar | Registrar rotas, ConnectionHandlers, comecar a servir |
| `onStop()` | `BackendApplicationContribution` | Durante shutdown | Fechar conexoes, salvar estado, liberar recursos |
| `configure()` | `BackendApplicationContribution` (opt) | Durante configuracao | Configurar middleware express adicional |

Para servicos que nao sao `BackendApplicationContribution`, o padrao comum e usar um `LifecycleService` proprio:

```typescript
export interface IDEIALifecycleAware {
    onConstruct(): MaybePromise<void>;
    onStart(): MaybePromise<void>;
    onStop(): MaybePromise<void>;
    onDispose(): MaybePromise<void>;
}
```

### 3.3 Eager vs Lazy Services

No Inversify, servicos podem ser registrados como eager (inicializados imediatamente ao carregar o modulo) ou lazy (inicializados apenas quando solicitados):

| Tipo | Binding | Comportamento | Uso |
|------|---------|---------------|-----|
| Eager singleton | `inSingletonScope()` | Instancia criada no `container.load()` | Servicos essenciais que devem iniciar com o backend |
| Lazy singleton | `inSingletonScope()` sem eager | Instancia criada no primeiro `container.get()` | Servicos sob demanda, raramente usados |
| Transient | `inTransientScope()` | Nova instancia a cada `container.get()` | Objetos de requisicao, factory temporarios |

Para tornar um binding eager no Theia:

```typescript
bind(BackendApplicationContribution).to(MyService).inSingletonScope();
// BackendApplication.resolveContributions() chama todos os
// BackendApplicationContributions, efetivamente tornando-os eager
```

Alternativa manual:

```typescript
container.get(MyService); // Forca criacao
```

### 3.4 Service Dependencies & Injection Order

Dependencias entre servicos sao resolvidas pelo Inversify automaticamente. No entanto, a ORDEM de execucao dos hooks `onStart()` segue a ordem em que os modules foram carregados no container:

```
Container.load(moduleA, moduleB, moduleC)
  -> bind(BackendApplicationContribution).to(ServiceA)
  -> bind(BackendApplicationContribution).to(ServiceB)
  -> bind(BackendApplicationContribution).to(ServiceC)

Ordem de onStart(): ServiceA -> ServiceB -> ServiceC
Ordem de onStop():  ServiceC -> ServiceB -> ServiceA (reverso)
```

Para controlar dependencia explicita, usa-se o padrao `@inject`:

```typescript
@injectable()
export class AgentService implements BackendApplicationContribution {
    constructor(
        @inject(FileSystemProvider) private fs: FileSystemProvider,
        @inject(LLMProxyService) private llm: LLMProxyService,
        @inject(LoggerFactory) private loggerFactory: LoggerFactory
    ) {}
    // AgentService so inicia depois que FileSystemProvider, LLMProxyService
    // e LoggerFactory ja foram construidos
}
```

### 3.5 Circular Dependency Handling

Inversify detecta e previne dependencias circulares em tempo de resolucao:

```
Problema:
  ServiceA -> depende de -> ServiceB
  ServiceB -> depende de -> ServiceA
  Inversify lanca: CircularDependencyError

Solucoes:
  1. Lazy injection (post-construct):
     ServiceA nao injeta ServiceB no constructor,
     mas sim um Lazy<ServiceB> ou factory

  2. Event bus:
     ServiceA e ServiceB nao se conhecem,
     comunicam via EventBus (desacoplamento)

  3. Interface segregada:
     Extrair interface comum, quebrar dependencia
```

Exemplo com lazy injection:

```typescript
import { lazyInject } from '@theia/core/lib/common/lazy-inject';

@injectable()
export class ServiceA {
    @lazyInject(ServiceB)
    private readonly serviceB!: ServiceB;

    async onStart(): Promise<void> {
        // serviceB e resolvido apenas quando acessado
        await this.serviceB.initialize();
    }
}
```

### 3.6 Service State Monitoring

Cada servico pode expor seu estado para monitoramento:

```typescript
export enum ServiceState {
    CONSTRUCTED = 'constructed',
    INITIALIZED = 'initialized',
    STARTED = 'started',
    STOPPED = 'stopped',
    DISPOSED = 'disposed',
    ERROR = 'error',
}

export interface ServiceStateMonitor {
    getState(serviceId: string): ServiceState;
    onStateChange(serviceId: string, state: ServiceState): void;
    getServicesInState(state: ServiceState): string[];
    isHealthy(serviceId: string): boolean;
}
```

Implementacao tipica:

```typescript
@injectable()
export class BackendServiceRegistry {
    private states = new Map<string, ServiceState>();

    setState(serviceId: string, state: ServiceState): void {
        this.states.set(serviceId, state);
        this.logger.info(`Service ${serviceId} -> ${state}`);
    }

    getServicesInState(state: ServiceState): string[] {
        const result: string[] = [];
        for (const [id, s] of this.states) {
            if (s === state) result.push(id);
        }
        return result;
    }

    async waitForAllServices(): Promise<void> {
        const notStarted = this.getServicesInState(ServiceState.INITIALIZED);
        if (notStarted.length > 0) {
            throw new Error(`Services not started: ${notStarted.join(', ')}`);
        }
    }
}

---

## 4. CLI Architecture

### 4.1 Theia CLI Entry Points

O Theia fornece multiplos entry points de linha de comando:

```
theia (main entry)
  |-- start:    Inicia o servidor Theia
  |-- build:    Compila a aplicacao (webpack/bundler)
  |-- clean:    Limpa diretorios de build
  |-- download:plugins  Baixa plugins
  |-- rebrand:  Aplica branding customizado
  |-- configure: Gera configuracao do produto
  |-- version:  Exibe versao
  |-- help:     Exibe ajuda

theia-server (alias para theia start)
theia-build (alias para theia build)
```

O entry point principal e um script Node.js que:
1. Parseia argumentos
2. Seleciona o comando
3. Carrega o modulo correspondente
4. Executa com exit code apropriado

### 4.2 CLI Command Parser

O Theia usa yargs para parse de argumentos CLI:

```typescript
import yargs = require('yargs');

yargs
    .command('start', 'Start the Theia backend server', (yargs) => {
        yargs
            .option('port', { type: 'number', default: 3000 })
            .option('hostname', { type: 'string', default: 'localhost' })
            .option('ssl', { type: 'boolean', default: false })
            .option('plugins', { type: 'string', array: true })
            .option('log-level', { type: 'string', choices: ['error', 'warn', 'info', 'debug', 'trace'], default: 'info' })
            .option('root-dir', { type: 'string' })
            .option('cors-origin', { type: 'string' })
            .option('webSocketHeartbeatInterval', { type: 'number', default: 15000 })
            .option('maxWebSocketMessageSize', { type: 'number', default: 1048576 });
    }, async (argv) => {
        await startServer(argv);
    })
    .command('build', 'Build the Theia application', {}, async (argv) => {
        await buildApp(argv);
    })
    .command('clean', 'Clean build artifacts', {}, async () => {
        await clean();
    })
    .demandCommand(1, 'Please specify a command')
    .strict()
    .parse(process.argv.slice(2));
```

### 4.3 CLICommandContribution

`CLICommandContribution` e o ponto de extensao para adicionar comandos CLI customizados em extensoes:

```typescript
export interface CLICommandContribution {
    registerCommands(registry: CLICommandRegistry): void;
}

export interface CLICommandRegistry {
    registerCommand(
        command: CLICommand,
        handler: (args: Record<string, unknown>) => Promise<number>
    ): void;
}

export interface CLICommand {
    id: string;
    label: string;
    description: string;
    args?: CLIArgDef[];
}

export interface CLIArgDef {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array';
    demandOption?: boolean;
    default?: unknown;
    describe?: string;
    choices?: string[];
    alias?: string;
}
```

Para registrar um comando CLI customizado:

```typescript
@injectable()
export class IDEIACLICommandContribution implements CLICommandContribution {
    registerCommands(registry: CLICommandRegistry): void {
        registry.registerCommand(
            {
                id: 'ideia.agent.run',
                label: 'Run IDEIA Agent',
                description: 'Execute an agent task in the workspace',
                args: [
                    { name: 'task', type: 'string', demandOption: true, describe: 'Task description' },
                    { name: 'level', type: 'string', default: 'N2', describe: 'Autonomy level' },
                    { name: 'output', alias: 'o', type: 'string', describe: 'Output file path' },
                ]
            },
            async (args) => {
                await this.agentService.run(args.task as string, args.level as string);
                return 0;
            }
        );
    }
}
```

### 4.4 CLI Argument Parsing

O parsing de argumentos CLI segue este fluxo:

```
process.argv
  |
  v
yargs.parse(argv)
  |-- normaliza args (--camel-case -> camelCase)
  |-- aplica defaults
  |-- valida tipos e choices
  |-- exibe erro se argumento obrigatorio faltando
  |-- executa handler do comando
  |
  v
argv objeto com:
  {
    port: 3000,
    hostname: 'localhost',
    ssl: false,
    plugins: ['./plugins'],
    'log-level': 'info',
    _: [],
    $0: 'theia'
  }
```

O Theia converte automaticamente `--log-level` para `logLevel` (camelCase) e disponibiliza no container Inversify como `CLIArgs`.

### 4.5 Command Handler Registration

Handlers de comando sao registrados no `CLICommandRegistry`:

```typescript
@injectable()
export class CLICommandRegistry {
    private commands = new Map<string, CLICommandDef>();

    registerCommand(
        command: CLICommand,
        handler: (args: Record<string, unknown>) => Promise<number>
    ): void {
        const id = command.id;
        if (this.commands.has(id)) {
            this.logger.warn(`Overriding CLI command: ${id}`);
        }
        this.commands.set(id, { command, handler });
    }

    async execute(id: string, args: Record<string, unknown>): Promise<number> {
        const def = this.commands.get(id);
        if (!def) {
            this.logger.error(`Unknown CLI command: ${id}`);
            return 1;
        }
        try {
            return await def.handler(args);
        } catch (err) {
            this.logger.error(`Command ${id} failed`, err);
            return 1;
        }
    }

    getCommands(): CLICommand[] {
        return Array.from(this.commands.values()).map(c => c.command);
    }
}
```

### 4.6 Exit Code Handling

O Theia segue a convencao de exit codes POSIX:

| Exit Code | Significado | Uso |
|-----------|-------------|-----|
| 0 | Sucesso | Comando executou sem erros |
| 1 | Erro generico | Excecao nao tratada, falha conhecida |
| 2 | Erro de uso | Argumentos invalidos, comando desconhecido |
| 126 | Comando nao executavel | Erro de permissao |
| 130 | Interrompido | SIGINT (Ctrl+C) |
| 143 | Terminado | SIGTERM (shutdown) |

```typescript
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    app.stop().then(() => process.exit(130));
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    app.stop().then(() => process.exit(143));
});
```

### 4.7 CLI Logging

O logging CLI difere do logging interno do servidor:

```typescript
export interface CLILogger {
    info(msg: string, ...args: unknown[]): void;
    warn(msg: string, ...args: unknown[]): void;
    error(msg: string, ...args: unknown[]): void;
    debug(msg: string, ...args: unknown[]): void;
    setLevel(level: LogLevel): void;
}

@injectable()
export class CLILoggerImpl implements CLILogger {
    private level: LogLevel = LogLevel.INFO;

    setLevel(level: LogLevel): void {
        this.level = level;
    }

    info(msg: string, ...args: unknown[]): void {
        if (this.level >= LogLevel.INFO) {
            console.log(`[INFO] ${msg}`, ...args);
        }
    }

    error(msg: string, ...args: unknown[]): void {
        if (this.level >= LogLevel.ERROR) {
            console.error(`[ERROR] ${msg}`, ...args);
        }
    }

    debug(msg: string, ...args: unknown[]): void {
        if (this.level >= LogLevel.DEBUG) {
            console.debug(`[DEBUG] ${msg}`, ...args);
        }
    }
}

---

## 5. Server Startup

### 5.1 Theia Server Bootstrap

O bootstrap do servidor ocorre em `@theia/core/lib/node/backend-application-module`:

```typescript
export async function startServer(config: BackendApplicationConfig): Promise<void> {
    const container = new Container();
    container.load(backendApplicationModule);
    container.bind(BackendApplicationConfig).toConstantValue(config);

    const app = container.get(BackendApplication);
    await app.configure();
    await app.start(config.port, config.hostname);

    app.logger.info(`Theia backend listening on http://${config.hostname}:${config.port}`);
}
```

### 5.2 HTTP/HTTPS Server Creation

A criacao do servidor HTTP suporta modo SSL (HTTPS) e plano (HTTP):

```typescript
async start(port?: number, hostname?: string): Promise<void> {
    const { port: configPort, hostname: configHostname, ssl } = this.config;

    const finalPort = port ?? configPort ?? 3000;
    const finalHostname = hostname ?? configHostname ?? 'localhost';

    if (ssl) {
        const httpsOpts = {
            cert: await readFile(ssl.certificate),
            key: await readFile(ssl.key)
        };
        this.server = https.createServer(httpsOpts, this.expressApp);
    } else {
        this.server = http.createServer(this.expressApp);
    }

    this.wsServer = new ws.Server({ server: this.server, path: '/ws' });

    return new Promise<void>((resolve, reject) => {
        this.server!.listen(finalPort, finalHostname, () => {
            this.logger.info(`Server listening on ${finalHostname}:${finalPort}`);
            resolve();
        });
        this.server!.on('error', reject);
    });
}
```

### 5.3 WebSocket Server Setup

O servidor WebSocket e montado sobre o mesmo servidor HTTP (same port, different upgrade path):

```typescript
import * as ws from 'ws';

// Criacao
this.wsServer = new ws.Server({
    server: this.server,
    path: '/ws',
    maxPayload: config.maxWebSocketMessageSize ?? 1024 * 1024 // 1MB
});

// Connection handling
this.wsServer.on('connection', (socket, request) => {
    this.logger.info(`WebSocket client connected from ${request.socket.remoteAddress}`);

    socket.on('message', (data) => {
        this.handleMessage(socket, data);
    });

    socket.on('close', (code, reason) => {
        this.logger.info(`WebSocket client disconnected: ${code}`);
    });

    socket.on('error', (err) => {
        this.logger.error(`WebSocket error:`, err.message);
    });
});
```

### 5.4 Express.js Middleware Integration

Theia usa Express.js como framework HTTP:

```typescript
const app = express();

// Parseamento de corpo
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compressao
app.use(compression());

// CORS
app.use(cors({
    origin: config.cors?.origin ?? '*',
    credentials: config.cors?.credentials ?? true
}));

// Static files
app.use(express.static(path.join(__dirname, '../../lib')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// API routes registradas por contribuicoes
app.use('/api', apiRouter);
```

Extensions e servicos adicionam middleware customizado via contribuicoes:

```typescript
@injectable()
export class IDEIAApiContribution implements BackendApplicationContribution {
    onStart(app: BackendApplication): void {
        const router = express.Router();
        router.use('/agents', this.agentRouter);
        router.use('/sessions', this.sessionRouter);
        router.use('/analysis', this.analysisRouter);
        app.use('/ideia', router);
    }
}
```

### 5.5 Static File Serving

O Theia serve arquivos estaticos do frontend compilado:

```typescript
const staticPaths = [
    path.join(__dirname, '../../lib'),
    path.join(__dirname, '../../lib/assets'),
    path.join(__dirname, '../../lib/locales'),
];

for (const staticPath of staticPaths) {
    if (fs.existsSync(staticPath)) {
        app.use(express.static(staticPath, {
            maxAge: '1y',
            immutable: true,
            setHeaders: (res, filePath) => {
                if (filePath.endsWith('.html')) {
                    res.setHeader('Cache-Control', 'no-cache');
                }
            }
        }));
    }
}

// Fallback para SPA
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/ws')) {
        res.sendFile(path.join(__dirname, '../../lib/index.html'));
    }
});
```

### 5.6 API Endpoint Registration

Endpoints de API sao registrados por servicos backend individuais:

```typescript
@injectable()
export class IDEIAAgentAPI implements BackendApplicationContribution {
    @inject(AgentService)
    private agentService: AgentService;

    onStart(app: BackendApplication): void {
        const router = express.Router();

        router.post('/run', async (req, res) => {
            try {
                const result = await this.agentService.run(req.body.task, req.body.level);
                res.json({ success: true, result });
            } catch (err) {
                res.status(500).json({ success: false, error: err.message });
            }
        });

        router.get('/status/:sessionId', async (req, res) => {
            const status = await this.agentService.getStatus(req.params.sessionId);
            res.json(status);
        });

        router.post('/cancel/:sessionId', async (req, res) => {
            await this.agentService.cancel(req.params.sessionId);
            res.json({ success: true });
        });

        app.use('/ideia/agents', router);
    }
}
```

### 5.7 CORS Configuration

O CORS e configurado para permitir conexoes de diferentes origens (essencial para Theia Cloud):

```typescript
import * as cors from 'cors';

function configureCORS(config: BackendApplicationConfig): cors.CorsOptions {
    const origin = config.cors?.origin;

    if (!origin) {
        return { origin: '*' };
    }

    if (typeof origin === 'string') {
        return {
            origin: origin.split(',').map(o => o.trim()),
            credentials: config.cors?.credentials ?? true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
            exposedHeaders: ['X-Request-ID'],
            maxAge: 86400
        };
    }

    return {
        origin,
        credentials: config.cors?.credentials ?? true
    };
}

---

## 6. Frontend/Backend Communication

### 6.1 JSON-RPC over WebSocket

A comunicacao entre frontend e backend no Theia usa JSON-RPC sobre WebSocket. O protocolo e implementado em `@theia/core/lib/common/messaging`:

```
Frontend (Browser/Electron)              Backend (Node.js)
  |                                          |
  |-- WebSocket connect ------------------>|
  |     ws://host:3000/ws                   |
  |                                          |
  |-- JSON-RPC Request ------------------->|
  |     {"jsonrpc":"2.0","id":1,            |
  |      "method":"service.method",         |
  |      "params":[...]}                    |
  |                                          |
  |<-- JSON-RPC Response -------------------|
  |     {"jsonrpc":"2.0","id":1,            |
  |      "result": {...}}                   |
  |                                          |
  |<-- JSON-RPC Notification --------------|
  |     {"jsonrpc":"2.0",                   |
  |      "method":"service.onEvent",        |
  |      "params":[...]}                    |
  |                                          |
```

Estrutura da mensagem JSON-RPC:

```typescript
interface JSONRPCMessage {
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

### 6.2 Connection Service

O `ConnectionService` gerencia o estabelecimento e ciclo de vida da conexao entre frontend e backend:

```typescript
@injectable()
export class ConnectionService {
    @inject(WebSocketConnectionProvider)
    private connectionProvider: WebSocketConnectionProvider;

    private connections = new Map<string, Channel>();

    openChannel(id: string): Channel {
        const channel = this.connectionProvider.openChannel(id);
        this.connections.set(id, channel);
        return channel;
    }

    closeChannel(id: string): void {
        const channel = this.connections.get(id);
        if (channel) {
            channel.close();
            this.connections.delete(id);
        }
    }

    getChannel(id: string): Channel | undefined {
        return this.connections.get(id);
    }
}
```

### 6.3 Channel Creation

Channels sao multiplexados sobre uma unica conexao WebSocket. Cada channel representa um servico RPC separado:

```
WebSocket Connection
  |
  +-- Channel 'agent-service'
  |     |-- RPC: agentService.run(task)
  |     |-- RPC: agentService.getStatus(id)
  |     |-- Notification: agentService.onProgress(data)
  |
  +-- Channel 'file-system'
  |     |-- RPC: fileSystem.readFile(path)
  |     |-- RPC: fileSystem.writeFile(path, content)
  |     |-- Notification: fileSystem.onDidChangeFile(changes)
  |
  +-- Channel 'terminal'
        |-- RPC: terminal.create(options)
        |-- RPC: terminal.write(id, data)
        |-- Notification: terminal.onData(id, data)
```

Criacao de channel no backend:

```typescript
@injectable()
export class AgentServiceChannel implements BackendApplicationContribution {
    @inject(ConnectionHandler)
    private connectionHandler: ConnectionHandler;

    onStart(): void {
        this.connectionHandler.listen('agent-service', (channel: Channel) => {
            this.setupRPC(channel);
        });
    }

    private setupRPC(channel: Channel): void {
        channel.onMessage((message: JSONRPCMessage) => {
            // Processa mensagem RPC
        });
    }
}
```

### 6.4 RPC Proxy Generation

O Theia fornece utilitarios para gerar proxies RPC automaticamente a partir de interfaces TypeScript:

```typescript
import { createProxy, createLocalProxy } from '@theia/core/lib/common/messaging/proxy-factory';

// Lado do FRONTEND: cria um proxy que invoca metodos no backend
interface AgentService {
    run(task: string, level: string): Promise<AgentResult>;
    getStatus(sessionId: string): Promise<AgentStatus>;
    cancel(sessionId: string): Promise<void>;
    onProgress(callback: (data: ProgressData) => void): Disposable;
}

// No frontend:
const channel = connectionService.openChannel('agent-service');
const agentService = createProxy<AgentService>(channel);
// Chamar agentService.run() envia JSON-RPC request para o backend
const result = await agentService.run('Implement feature X', 'N2');
```

`createLocalProxy` faz o inverso — expoe um objeto local como servico RPC para o outro lado:

```typescript
// Lado do BACKEND: expoe a implementacao real como servico RPC
@injectable()
export class AgentServiceImpl implements AgentService {
    async run(task: string, level: string): Promise<AgentResult> {
        return this.agentRuntime.execute(task, level);
    }

    async getStatus(sessionId: string): Promise<AgentStatus> {
        return this.sessionManager.getStatus(sessionId);
    }
}

// Registro no channel
channel.onMessage(createLocalProxy<AgentService>(agentServiceImpl, channel));
```

### 6.5 Promise Handling over RPC

Promises sao serializadas automaticamente pelo JSON-RPC. O proxy factory gerencia:

```typescript
// Frontend chama metodo que retorna Promise
const result: AgentResult = await agentService.run('task', 'N2');

// Isso gera:
// 1. Envia JSON-RPC request com id=1
// 2. Retorna Promise que resolve quando response chega
// 3. Timeout configurado (default: 60s)
// 4. Se timeout expirar, Promise rejeita com RPCTimeoutError

// Configuracao de timeout:
const agentService = createProxy<AgentService>(channel, {
    timeout: 120000 // 2 minutos para operacoes longas
});
```

### 6.6 Event Handling over RPC

Eventos do backend sao propagados para o frontend via JSON-RPC notifications:

```typescript
// Backend: emite evento
class AgentServiceImpl {
    private readonly onProgressEmitter = new Emitter<ProgressData>();

    get onProgress(): Event<ProgressData> {
        return this.onProgressEmitter.event;
    }

    async run(task: string, level: string): Promise<AgentResult> {
        this.onProgressEmitter.fire({ phase: 'planning', progress: 10 });
        // ... executa
        this.onProgressEmitter.fire({ phase: 'executing', progress: 50 });
        return result;
    }
}

// Frontend: recebe evento
const agentService = createProxy<AgentService>(channel);
const disposable = agentService.onProgress((data) => {
    console.log(`Agent progress: ${data.phase} ${data.progress}%`);
    updateUI(data);
});

disposable.dispose();
```

### 6.7 Connection Lifecycle

O ciclo de vida completo da conexao frontend/backend:

```
Frontend                          Backend
  |                                 |
  |-- HTTP GET /index.html ------->|
  |<-- HTML + JS bundles ----------|
  |                                 |
  | (Frontend bootstrap)            |
  |                                 |
  |-- WebSocket connect /ws ------>|
  |<-- WebSocket upgrade accepted --|
  |                                 |
  |-- JSON-RPC: open 'agent' ----->|
  |   channel                       |
  |<-- JSON-RPC: channel opened ----|
  |                                 |
  |-- RPC: initialize() ---------->|
  |   (pass capabilities,           |
  |    workspace info)              |
  |<-- RPC: initialized ------------|
  |   (backend sends config,        |
  |    available services)          |
  |                                 |
  |==== ACTIVE SESSION ============|
  |   |-- RPC calls              ->|
  |   |<- Notifications (events)  -|
  |                                 |
  |-- WebSocket close ------------>|
  |   (page reload, tab close,     |
  |    network failure)             |
  |                                 |
  |<-- Server cleanup --------------|
  |   (libera recursos da sessao)   |

---

## 7. WebSocket Connection

### 7.1 WebSocket Channel Manager

O WebSocket Channel Manager gerencia a multiplexacao de canais sobre uma unica conexao:

```typescript
export interface Channel {
    id: string;
    send(message: JSONRPCMessage): void;
    onMessage(callback: (message: JSONRPCMessage) => void): Disposable;
    close(): void;
    onClose(callback: () => void): Disposable;
}

@injectable()
export class WebSocketChannelManager {
    private channels = new Map<string, Channel>();
    private nextChannelId = 1;

    createChannel(socket: ws.WebSocket, servicePath: string): Channel {
        const id = `channel-${this.nextChannelId++}`;
        const channel = new WebSocketChannel(id, socket, servicePath);

        socket.on('message', (data: Buffer) => {
            const frame = this.decodeFrame(data);
            const targetChannel = this.channels.get(frame.channelId);
            if (targetChannel) {
                targetChannel.handleMessage(frame.payload);
            }
        });

        this.channels.set(id, channel);
        return channel;
    }

    private decodeFrame(data: Buffer): { channelId: string; payload: JSONRPCMessage } {
        const idLength = data.readUInt8(0);
        const channelId = data.toString('utf8', 1, 1 + idLength);
        const payload = JSON.parse(data.toString('utf8', 1 + idLength));
        return { channelId, payload };
    }
}
```

### 7.2 Connection Authentication

A autenticacao da conexao WebSocket pode ser feita de varias formas:

```typescript
// 1. Token via query parameter
const wsUrl = `ws://host:3000/ws?token=${authToken}`;
const socket = new WebSocket(wsUrl);

// Backend verifica token
this.wsServer.on('connection', (socket, request) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    if (!this.authService.validateToken(token)) {
        socket.close(4001, 'Authentication failed');
        return;
    }
});

// 2. Cookie-based auth
this.wsServer.on('connection', (socket, request) => {
    const cookies = parseCookies(request.headers.cookie || '');
    const sessionId = cookies['theia-session'];
    if (!this.sessionService.isValid(sessionId)) {
        socket.close(4001, 'Invalid session');
        return;
    }
});

// 3. Origin check (CSRF prevention)
this.wsServer.on('connection', (socket, request) => {
    const origin = request.headers.origin;
    if (!this.isAllowedOrigin(origin)) {
        socket.close(4002, 'Origin not allowed');
        return;
    }
});
```

### 7.3 Reconnection Strategy

O frontend implementa reconexao automatica com backoff exponencial:

```typescript
export class ReconnectingWebSocket {
    private socket: WebSocket | undefined;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private baseDelay = 1000;
    private maxDelay = 30000;

    connect(url: string): void {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            this.reconnectAttempts = 0;
            this.onConnected();
        };

        this.socket.onclose = (event) => {
            if (!event.wasClean) {
                this.scheduleReconnect(url);
            }
            this.onDisconnected();
        };

        this.socket.onerror = () => {
            // onclose sera chamado em seguida
        };
    }

    private scheduleReconnect(url: string): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.onMaxReconnectExceeded();
            return;
        }

        const delay = Math.min(
            this.baseDelay * Math.pow(2, this.reconnectAttempts),
            this.maxDelay
        );
        const jitter = delay * (0.8 + Math.random() * 0.4);

        this.reconnectAttempts++;
        setTimeout(() => this.connect(url), jitter);
    }
}
```

### 7.4 Heartbeat & Keep-Alive

Heartbeat mantem a conexao ativa e detecta desconexoes silenciosas:

```typescript
export class HeartbeatManager {
    private pingInterval: NodeJS.Timeout | undefined;
    private pongTimeout: NodeJS.Timeout | undefined;
    private readonly PING_INTERVAL = 15000;
    private readonly PONG_TIMEOUT = 5000;

    start(socket: ws.WebSocket): void {
        this.pingInterval = setInterval(() => {
            if (socket.readyState === ws.OPEN) {
                socket.ping();
                this.pongTimeout = setTimeout(() => {
                    this.logger.warn('WebSocket pong timeout, terminating');
                    socket.terminate();
                }, this.PONG_TIMEOUT);
            }
        }, this.PING_INTERVAL);

        socket.on('pong', () => {
            if (this.pongTimeout) {
                clearTimeout(this.pongTimeout);
                this.pongTimeout = undefined;
            }
        });
    }

    stop(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = undefined;
        }
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = undefined;
        }
    }
}
```

### 7.5 Message Framing

Mensagens sao enquadradas para suportar multiplexacao de channels:

```
 Frame Format (binary):
 +--------+----------------+--------------------------------+
 | 1 byte | Variable (N)   | Variable                       |
 | Channel| Channel ID     | JSON-RPC Message Body          |
 | Len (N)| (UTF-8)        | (JSON encoded)                 |
 +--------+----------------+--------------------------------+

 Example:
 +--------+----------------+--------------------------------+
 |  0x03  |  "agt"         | {"jsonrpc":"2.0","id":1,       |
 |        |                |  "method":"run","params":[...]}|
 +--------+----------------+--------------------------------+
```

### 7.6 Message Compression

Para mensagens grandes, o Theia suporta compressao opcional:

```typescript
import * as zlib from 'zlib';

export class CompressedWebSocket {
    private readonly THRESHOLD = 1024;

    send(socket: ws.WebSocket, message: object): void {
        const json = JSON.stringify(message);
        const buffer = Buffer.from(json, 'utf8');

        if (buffer.length > this.THRESHOLD) {
            zlib.gzip(buffer, (err, compressed) => {
                if (err) {
                    socket.send(buffer);
                } else {
                    const header = Buffer.alloc(1);
                    header.writeUInt8(1);
                    socket.send(Buffer.concat([header, compressed]));
                }
            });
        } else {
            const header = Buffer.alloc(1);
            header.writeUInt8(0);
            socket.send(Buffer.concat([header, buffer]));
        }
    }
}
```

### 7.7 Connection Multiplexing

Multiplos servicos compartilham a mesma conexao WebSocket via channel multiplexing:

```
Uma unica conexao WebSocket:
  +----------------------------------------------------------------+
  | [channel:agent]  | [channel:fs]  | [channel:terminal] | ...   |
  | RPC: run()       | RPC: read()   | RPC: create()      |       |
  | RPC: status()    | RPC: write()  | RPC: write()       |       |
  | Notif: progress  | Notif: watch  | Notif: data        |       |
  +----------------------------------------------------------------+
```

Beneficios:
- Uma unica conexao TCP (menos overhead de handshake)
- Certificado SSL unico
- Autenticacao unica
- Heartbeat unificado
- Menos descritores de arquivo no servidor

---

## 8. Backend Contributions

### 8.1 BackendApplicationContribution: onStart, onStop

`BackendApplicationContribution` e a interface primaria para estender o backend. Qualquer servico que implemente esta interface e automaticamente descoberto e executado pelo `BackendApplication`:

```typescript
@injectable()
export class MyBackendService implements BackendApplicationContribution {
    async onStart(app: BackendApplication): Promise<void> {
        await this.initializeResources();
        app.use('/api/myservice', this.router);
    }

    async onStop(app: BackendApplication): Promise<void> {
        await this.closeResources();
        await this.saveState();
    }
}
```

### 8.2 Backend Command Contribution

Comandos executados no backend (diferente de comandos CLI):

```typescript
export interface BackendCommandContribution {
    registerCommands(registry: BackendCommandRegistry): void;
}

@injectable()
export class IDEIABackendCommandContribution implements BackendCommandContribution {
    registerCommands(registry: BackendCommandRegistry): void {
        registry.registerCommand({
            id: 'ideia.agent.run',
            label: 'Run Agent Task',
            handler: async (args: { task: string; level: string }) => {
                return this.agentRuntime.execute(args.task, args.level);
            }
        });

        registry.registerCommand({
            id: 'ideia.agent.cancel',
            label: 'Cancel Agent Task',
            handler: async (args: { sessionId: string }) => {
                return this.agentRuntime.cancel(args.sessionId);
            }
        });
    }
}
```

### 8.3 Backend Task Provider

Tasks sao operacoes executadas em background no backend:

```typescript
@injectable()
export class IDEIATaskProvider implements BackendApplicationContribution {
    @inject(TaskServer)
    private taskServer: TaskServer;

    onStart(): void {
        this.taskServer.registerTaskProvider({
            provideTasks: async () => [
                {
                    type: 'ideia',
                    label: 'Analyze Project',
                    task: 'ideia.analysis',
                    config: { depth: 'full' }
                },
                {
                    type: 'ideia',
                    label: 'Generate Documentation',
                    task: 'ideia.docs',
                    config: { format: 'markdown' }
                }
            ],
            resolveTask: async (taskConfig) => {
                return {
                    ...taskConfig,
                    command: 'npx',
                    args: ['tsx', 'packages/cli/src/index.ts', 'analyze']
                };
            }
        });
    }
}
```

### 8.4 Backend File System Provider

O servico de sistema de arquivos do Theia e implementado no backend e exposto via RPC:

```typescript
@injectable()
export class IDEIAFileSystemProvider implements FileSystemProvider {
    async readFile(uri: string): Promise<Uint8Array> {
        const fsPath = FileUri.fsPath(uri);
        return fs.readFile(fsPath);
    }

    async writeFile(uri: string, content: Uint8Array): Promise<void> {
        const fsPath = FileUri.fsPath(uri);
        await fs.mkdir(path.dirname(fsPath), { recursive: true });
        return fs.writeFile(fsPath, content);
    }

    async watch(uri: string, options: WatchOptions): Promise<Disposable> {
        const fsPath = FileUri.fsPath(uri);
        const watcher = chokidar.watch(fsPath, {
            ignoreInitial: true,
            persistent: true
        });
        watcher.on('change', (changedPath) => {
            this.onDidChangeFile.fire([{
                uri: FileUri.create(changedPath).toString(),
                type: FileChangeType.UPDATED
            }]);
        });
        return Disposable.create(() => watcher.close());
    }
}
```

### 8.5 Backend Search Provider

Busca textual no workspace e feita no backend com acesso direto ao FS:

```typescript
@injectable()
export class IDEIASearchProvider implements SearchInWorkspaceServer {
    async search(pattern: string, rootUri: string, options?: SearchOptions): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        const rootPath = FileUri.fsPath(rootUri);

        const grep = exec('rg', ['--json', '--line-number', '--column', pattern, rootPath]);

        return new Promise((resolve, reject) => {
            grep.stdout.on('data', (data: Buffer) => {
                const lines = data.toString().split('\n').filter(Boolean);
                for (const line of lines) {
                    const parsed = JSON.parse(line);
                    if (parsed.type === 'match') {
                        results.push(this.parseMatch(parsed.data, rootUri));
                    }
                }
            });
            grep.on('close', (code) => resolve(results));
            grep.on('error', reject);
        });
    }
}
```

### 8.6 Backend Terminal Service

Terminais sao processos que executam no backend usando node-pty:

```typescript
@injectable()
export class IDEIATerminalService implements TerminalService {
    private terminals = new Map<string, TerminalProcess>();

    async create(options: TerminalOptions): Promise<string> {
        const process = new TerminalProcess({
            command: options.shellPath || process.env.SHELL || 'bash',
            args: options.args || [],
            cwd: options.cwd || process.cwd(),
            env: { ...process.env, ...options.env }
        });

        const id = `terminal-${Date.now()}`;
        this.terminals.set(id, process);

        process.onData(data => {
            this.onDataEmitter.fire({ terminalId: id, data });
        });

        process.onExit(event => {
            this.terminals.delete(id);
            this.onExitEmitter.fire({ terminalId: id, ...event });
        });

        return id;
    }

    async write(terminalId: string, data: string): Promise<void> {
        const process = this.terminals.get(terminalId);
        if (process) {
            process.write(data);
        }
    }

    async resize(terminalId: string, cols: number, rows: number): Promise<void> {
        const process = this.terminals.get(terminalId);
        if (process) {
            process.resize(cols, rows);
        }
    }
}

---

## 9. Plug-in Host

### 9.1 Plugin Server Process

Theia executa plugins (extensoes VS Code) em um processo filho separado chamado Plugin Host, criado via `child_process.fork()`:

```
Backend (Node.js)
  |
  +-- Plugin Host (child_process.fork)
  |     |-- Carrega plugins do diretorio de plugins
  |     |-- Executa codigo do plugin (JS/TS compilado)
  |     |-- Comunicacao via JSON-RPC sobre pipes IPC
  |     |-- Processo isolado: crash do plugin nao afeta backend
  |     |
  |     +-- Plugin A (VS Code extension)
  |     +-- Plugin B (VS Code extension)
  |     +-- Plugin C (Theia plugin)
  |
  +-- Plugin Host 2 (opcional, para isolamento adicional)
        |-- Plugins de terceiros nao confiaveis
        |-- Recursos limitados (CPU/memory cgroups)
```

### 9.2 Plugin Deployment

O gerenciamento de plugins e feito pelo `PluginDeployerService`:

```typescript
@injectable()
export class PluginDeployerService {
    async install(pluginUri: string): Promise<void> {
        const pluginPath = await this.downloadPlugin(pluginUri);
        await this.validatePlugin(pluginPath);
        const targetDir = path.join(this.pluginsDir, this.getPluginId(pluginPath));
        await this.extractPlugin(pluginPath, targetDir);
        await this.pluginHost.loadPlugin(targetDir);
        await this.savePluginList();
    }

    async uninstall(pluginId: string): Promise<void> {
        await this.pluginHost.unloadPlugin(pluginId);
        const pluginPath = path.join(this.pluginsDir, pluginId);
        await fs.promises.rm(pluginPath, { recursive: true });
        await this.savePluginList();
    }

    async update(pluginId: string): Promise<void> {
        const current = await this.getPluginManifest(pluginId);
        if (current.version !== current.latestVersion) {
            await this.uninstall(pluginId);
            await this.install(current.repository);
        }
    }
}
```

### 9.3 Plugin Process Management

O Plugin Host e um processo filho que requer gerenciamento cuidadoso:

```typescript
@injectable()
export class PluginHostProcess {
    private child: ChildProcess | undefined;
    private restartCount = 0;
    private readonly MAX_RESTARTS = 5;

    async start(): Promise<void> {
        const pluginHostPath = path.join(__dirname, 'plugin-host.js');

        this.child = fork(pluginHostPath, [], {
            execArgv: ['--max-old-space-size=512'],
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: {
                ...process.env,
                PLUGIN_DIR: this.pluginsDir,
                PARENT_PID: process.pid.toString()
            }
        });

        this.child.on('message', (msg: PluginHostMessage) => {
            this.handleMessage(msg);
        });

        this.child.on('exit', (code, signal) => {
            this.logger.warn(`Plugin Host exited (code=${code}, signal=${signal})`);
            if (this.restartCount < this.MAX_RESTARTS) {
                this.restartCount++;
                setTimeout(() => this.start(), 1000 * this.restartCount);
            } else {
                this.logger.error('Plugin Host max restarts exceeded');
            }
        });

        this.child.on('error', (err) => {
            this.logger.error('Plugin Host error:', err.message);
        });
    }

    async stop(): Promise<void> {
        if (this.child) {
            this.child.send({ type: 'shutdown' });
            setTimeout(() => {
                if (this.child && !this.child.killed) {
                    this.child.kill('SIGKILL');
                }
            }, 5000);
        }
    }
}
```

### 9.4 Plugin Resource Management

Cada plugin consome recursos que precisam ser monitorados e limitados:

| Recurso | Monitoramento | Limitacao |
|---------|---------------|-----------|
| Memoria | `process.memoryUsage()` via IPC heartbeat | `--max-old-space-size` no fork |
| CPU | `pidusage` ou `process.cpuUsage()` | `SIGSTOP` se acima do limite |
| File descriptors | `fs.readdir('/proc/self/fd')` (Linux) | `ulimit -n` configurado |
| Event listeners | `process.getMaxListeners()` | `setMaxListeners()` |

### 9.5 Plugin Isolation

Plugins sao isolados do backend principal por multiplas camadas:

```
Backend (sem plugin):
  |-- Node.js com acesso total ao sistema
  |-- Acesso a todos os modulos npm
  |-- Pode criar processos, acessar FS, rede

Plugin Host:
  |-- Processo filho com recursos limitados
  |-- API restrita (apenas via Extension API)
  |-- Sem acesso direto ao processo pai
  |-- Comunicacao apenas via IPC (JSON-RPC)
  |-- Pode ser morto sem afetar o backend

Plugin Individual:
  |-- Sandbox via vm.Script (codigo nao confiavel)
  |-- API proxy: apenas metodos explicitamente expostos
  |-- Timeout de execucao forcado
  |-- Sem require() para modulos arbitrarios

---

## 10. Electron Backend

### 10.1 Electron Main Process

No Electron, o backend Theia executa no processo main (Node.js). Diferente do modo browser, o backend Electron tem acesso a APIs nativas:

```
Electron Main Process (Node.js + Electron API)
  |-- BackendApplication (Theia)
  |-- Window management (BrowserWindow)
  |-- Native menus (Menu, MenuItem)
  |-- Native dialogs (dialog.showOpenDialog)
  |-- Tray (system tray icon)
  |-- Auto-updater (electron-updater)
  |-- IPC handlers (ipcMain)
  |
  +-- Renderer Process (Chromium)
       |-- FrontendApplication (Theia UI)
       |-- Monaco Editor
       |-- React widgets
       |-- JSON-RPC (via Electron IPC ou WebSocket local)
```

### 10.2 Electron Window Management

O gerenciamento de janelas e feito pelo `ElectronWindowManager`:

```typescript
@injectable()
export class ElectronWindowManager {
    private windows = new Map<string, BrowserWindow>();

    createWindow(options: ElectronWindowOptions): BrowserWindow {
        const win = new BrowserWindow({
            width: options.width || 1200,
            height: options.height || 800,
            minWidth: 800,
            minHeight: 600,
            title: 'IDEIA - AI Development Kit',
            titleBarStyle: 'hiddenInset',
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true
            }
        });

        win.loadURL(`file://${__dirname}/../../lib/index.html`);

        if (process.env.NODE_ENV === 'development') {
            win.webContents.openDevTools();
        }

        win.on('closed', () => {
            this.windows.delete(win.id.toString());
        });

        this.windows.set(win.id.toString(), win);
        return win;
    }

    closeAll(): void {
        for (const win of this.windows.values()) {
            win.close();
        }
    }
}
```

### 10.3 Electron IPC vs WebSocket

No Electron, a comunicacao entre processo main (backend) e renderer (frontend) pode ser feita de duas formas:

| Aspecto | Electron IPC | WebSocket (localhost) |
|---------|-------------|----------------------|
| Mecanismo | `ipcMain/ipcRenderer` | `ws://127.0.0.1:PORT` |
| Latencia | ~0.1ms (memoria compartilhada) | ~1ms (loopback TCP) |
| Codigo compartilhado | Nao (IPC especifico Electron) | Sim (mesmo JSON-RPC do browser) |
| Depuracao | DevTools do Electron | Ferramentas de rede padrao |
| Seguranca | Contexto isolado (preload.js) | Loopback, seguro |

O Theia padrao usa WebSocket local no Electron para manter compatibilidade com o modo browser, mas Electron IPC e usado para dialogs nativos e menus.

### 10.4 Native Dialog Access

```typescript
// Preload script (preload.js) expoe API limitada
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:open', options),
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:save', options),
    showMessageBox: (options) => ipcRenderer.invoke('dialog:message', options)
});

// Backend (main process)
ipcMain.handle('dialog:open', async (event, options) => {
    const result = await dialog.showOpenDialog(options);
    return result;
});

ipcMain.handle('dialog:save', async (event, options) => {
    const result = await dialog.showSaveDialog(options);
    return result;
});
```

### 10.5 Native Menu Integration

```typescript
import { Menu, BrowserWindow } from 'electron';

export function createApplicationMenu(): Menu {
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: 'File',
            submenu: [
                { label: 'New File', accelerator: 'CmdOrCtrl+N',
                  click: () => sendCommand('file.new') },
                { label: 'Open File...', accelerator: 'CmdOrCtrl+O',
                  click: () => sendCommand('file.open') },
                { type: 'separator' },
                { label: 'Save', accelerator: 'CmdOrCtrl+S',
                  click: () => sendCommand('file.save') },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' }, { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' }, { role: 'copy' },
                { role: 'paste' }, { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' }, { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' }, { role: 'zoomIn' },
                { role: 'zoomOut' }, { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    return Menu.buildFromTemplate(template);
}

function sendCommand(command: string): void {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.webContents.send('command', command);
    }
}
```

### 10.6 Shell Integration

Integracao com o sistema operacional:

```typescript
import { shell } from 'electron';

export class ElectronShellIntegration {
    openInTerminal(dirPath: string): void {
        const platform = process.platform;
        if (platform === 'win32') {
            exec(`start cmd /K "cd /d ${dirPath}"`);
        } else if (platform === 'darwin') {
            exec(`open -a Terminal "${dirPath}"`);
        } else {
            exec(`x-terminal-emulator -e "cd ${dirPath} && bash"`);
        }
    }

    openInFileManager(dirPath: string): void {
        shell.openPath(dirPath);
    }

    openExternal(url: string): void {
        shell.openExternal(url);
    }

    handleDeepLink(url: string): void {
        const parsed = new URL(url);
        if (parsed.protocol === 'ideia:') {
            const command = parsed.hostname;
            const params = Object.fromEntries(parsed.searchParams);
            this.executeCommand(command, params);
        }
    }
}
```

### 10.7 Auto-Updater

```typescript
import { autoUpdater } from 'electron-updater';

export class AppAutoUpdater {
    configure(): void {
        autoUpdater.setFeedURL({
            provider: 'github',
            repo: 'ideia',
            owner: 'ideia-org',
            private: false
        });

        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;

        autoUpdater.on('update-available', (info) => {
            this.mainWindow.webContents.send('update:available', info);
        });

        autoUpdater.on('download-progress', (progress) => {
            this.mainWindow.webContents.send('update:progress', progress);
        });

        autoUpdater.on('update-downloaded', () => {
            this.mainWindow.webContents.send('update:downloaded');
        });

        autoUpdater.on('error', (err) => {
            this.logger.error('Auto-update error:', err.message);
        });
    }

    checkForUpdates(): void {
        autoUpdater.checkForUpdates().catch(err => {
            this.logger.warn('Update check failed:', err.message);
        });
    }

    downloadUpdate(): void {
        autoUpdater.downloadUpdate();
    }

    quitAndInstall(): void {
        autoUpdater.quitAndInstall();
    }
}
```

---

## 11. CLI Tooling

### 11.1 Theia Extension Generator

O Yeoman generator `generator-theia-extension` scaffolding um novo projeto de extensao:

```bash
npm install -g yo generator-theia-extension
yo theia-extension

# Interactive prompts:
# ? Extension name: my-extension
# ? Extension description: My IDEIA extension
# ? Include frontend widget? Yes
# ? Include backend service? Yes
# ? Include VS Code compatibility? Yes
# ? Use React for widgets? Yes
```

Estrutura gerada:

```
my-extension/
  |-- src/
  |     |-- browser/
  |     |     |-- my-extension-frontend-module.ts
  |     |     |-- my-widget.tsx
  |     |-- node/
  |           |-- my-extension-backend-module.ts
  |           |-- my-service.ts
  |-- package.json
  |-- tsconfig.json
  |-- .eslintrc.json
```

### 11.2 Theia Build

O comando `theia build` compila a aplicacao Theia para producao:

```bash
theia build [options]

Options:
  --mode        build mode: production | development (default: production)
  --watch       watch mode: recompile on changes
  --config      webpack config path (default: webpack.config.js)
  --analyze     generate bundle analysis report
  --source-map  generate source maps

Process:
  1. Clean: remove lib/, dist/
  2. Compile TypeScript: tsc -b
  3. Bundle: webpack --mode production
  4. Generate: lib/index.html com hashes dos bundles
  5. Output: dist/ (frontend), lib/ (backend)
```

### 11.3 Theia Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx theia build --mode production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["npx", "theia", "start", "--port=3000", "--hostname=0.0.0.0"]
```

### 11.4 CLI for Managing Extensions

```bash
# Listar extensoes instaladas
theia extension:list

# Instalar extensao do OpenVSX
theia extension:install <publisher.extension@version>

# Desinstalar extensao
theia extension:uninstall <extension-id>

# Atualizar extensao
theia extension:update <extension-id>

# Empacotar extensao local
theia extension:package <directory>

# Publicar extensao no OpenVSX
theia extension:publish <path-to-vsix>
```

### 11.5 Dev Mode vs Production Mode

| Aspecto | Dev Mode | Production Mode |
|---------|----------|-----------------|
| Build | `--mode development` | `--mode production` |
| Source maps | Full | hidden-source-map |
| Minificacao | Nao | Sim (terser-webpack-plugin) |
| Hot reload | Webpack HMR | Nao |
| Log level | TRACE/DEBUG | INFO/WARN/ERROR |
| Performance profiling | Ativo | Inativo |
| SSL | HTTP | HTTPS recomendado |
| CORS | * (qualquer origem) | Origem explicita |
| Plugins | Todos (incluindo dev) | Apenas producao |
| Code splitting | Nao (unico bundle) | Code splitting + chunks |

```bash
# Dev mode
theia start --port=3000 --log-level=debug

# Production mode
NODE_ENV=production theia start --port=443 --ssl.cert=cert.pem --ssl.key=key.pem
```

---

## 12. Logging

### 12.1 ILogger & LoggerFactory

O sistema de logging do Theia e baseado em `ILogger` e `LoggerFactory`:

```typescript
export interface ILogger {
    trace(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    fatal(message: string, ...args: unknown[]): void;
    child(name: string): ILogger;
    setLevel(level: LogLevel): void;
    isEnabled(level: LogLevel): boolean;
    flush(): Promise<void>;
}

export interface LoggerFactory {
    (name: string): ILogger;
}
```

Uso tipico:

```typescript
@injectable()
export class AgentService {
    @inject(LoggerFactory)
    private loggerFactory: LoggerFactory;

    private logger: ILogger;

    @postConstruct()
    init(): void {
        this.logger = this.loggerFactory('agent-service');
    }

    async run(task: string): Promise<void> {
        this.logger.info('Running agent task', { task, level: 'N2' });
        try {
            const result = await this.execute(task);
            this.logger.debug('Task completed', { result });
        } catch (err) {
            this.logger.error('Task failed', { task, error: err.message });
            throw err;
        }
    }
}
```

### 12.2 Log Levels

| Level | Valor | Uso |
|-------|-------|-----|
| FATAL | 6 | Erro catastrofico, aplicacao vai abortar |
| ERROR | 5 | Erro de operacao, funcionalidade afetada |
| WARN | 4 | Situacao inesperada mas nao critica |
| INFO | 3 | Informacao normal de operacao |
| DEBUG | 2 | Informacao detalhada para debug |
| TRACE | 1 | Rastreamento fino, chamadas de funcao |

### 12.3 Log Format

Formato padrao de log no Theia:

```
[TIMESTAMP] [LEVEL] [CONTEXT] MESSAGE { structured_data }

[2026-07-22T10:30:00.123Z] [INFO] [agent-service] Running agent task {"task":"refactor module","level":"N2"}
[2026-07-22T10:30:00.456Z] [DEBUG] [agent-service.llm] LLM request {"model":"deepseek","tokens":450}
[2026-07-22T10:30:01.789Z] [WARN] [file-system] File not found {"uri":"file:///workspace/missing.ts"}
[2026-07-22T10:30:02.012Z] [ERROR] [connection] WebSocket error {"remoteAddress":"::1","error":"ECONNRESET"}
```

### 12.4 Log Output: Console, File, Backend

O Theia suporta multiplos sinks de log:

```typescript
@injectable()
export class BackendLogger implements ILogger {
    private sinks: LogSink[] = [];

    constructor() {
        this.sinks.push(new ConsoleLogSink());

        const logDir = process.env.THEIA_LOG_DIR || path.join(process.cwd(), '.theia/logs');
        if (fs.existsSync(logDir) || process.env.THEIA_LOG_DIR) {
            fs.mkdirSync(logDir, { recursive: true });
            this.sinks.push(new FileLogSink(logDir));
        }

        if (process.env.THEIA_LOGSTASH_URL) {
            this.sinks.push(new LogstashSink(process.env.THEIA_LOGSTASH_URL));
        }
    }

    info(message: string, ...args: unknown[]): void {
        const entry = this.formatEntry(LogLevel.INFO, message, args);
        for (const sink of this.sinks) {
            sink.write(entry, LogLevel.INFO);
        }
    }

    private formatEntry(level: LogLevel, message: string, args: unknown[]): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level: LogLevel[level],
            context: this.name,
            message,
            data: args.length > 0 ? args[0] : undefined,
            pid: process.pid
        };
    }
}
```

### 12.5 Log Rotation

```typescript
export class FileLogSink implements LogSink {
    private stream: fs.WriteStream;
    private currentDate: string;

    constructor(private logDir: string) {
        this.currentDate = this.getDateString();
        this.stream = this.createStream();
        this.scheduleRotation();
    }

    private createStream(): fs.WriteStream {
        const filePath = path.join(this.logDir, `theia-${this.currentDate}.log`);
        return fs.createWriteStream(filePath, { flags: 'a' });
    }

    private getDateString(): string {
        return new Date().toISOString().slice(0, 10);
    }

    private scheduleRotation(): void {
        setInterval(() => {
            const newDate = this.getDateString();
            if (newDate !== this.currentDate) {
                this.currentDate = newDate;
                this.stream.end();
                this.stream = this.createStream();
                this.cleanupOldLogs(30);
            }
        }, 60_000);
    }

    private cleanupOldLogs(retainDays: number): void {
        const cutoff = Date.now() - retainDays * 24 * 60 * 60 * 1000;
        for (const file of fs.readdirSync(this.logDir)) {
            const filePath = path.join(this.logDir, file);
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs < cutoff && file.endsWith('.log')) {
                fs.unlinkSync(filePath);
            }
        }
    }
}
```

### 12.6 Performance Logging

```typescript
export class PerformanceLogger {
    private marks = new Map<string, number>();

    constructor(private logger: ILogger) {}

    start(operation: string): void {
        this.marks.set(operation, performance.now());
        this.logger.debug(`PERF: ${operation} started`);
    }

    end(operation: string): void {
        const start = this.marks.get(operation);
        if (start !== undefined) {
            const duration = performance.now() - start;
            this.marks.delete(operation);
            this.logger.info(`PERF: ${operation} completed in ${duration.toFixed(2)}ms`);
        }
    }

    async measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        this.start(operation);
        try {
            return await fn();
        } finally {
            this.end(operation);
        }
    }
}
```

Uso:

```typescript
class AgentService {
    async run(task: string): Promise<AgentResult> {
        return this.perfLogger.measure('agent.run', async () => {
            // ...
        });
    }
}
```

### 12.7 Log Correlation IDs

Para rastrear requisicoes atraves de multiplos servicos:

```typescript
export class CorrelationContext {
    private static currentCorrelationId: string | undefined;

    static start(): string {
        this.currentCorrelationId = uuidv4();
        return this.currentCorrelationId;
    }

    static get(): string | undefined {
        return this.currentCorrelationId;
    }

    static set(id: string): void {
        this.currentCorrelationId = id;
    }

    static end(): void {
        this.currentCorrelationId = undefined;
    }
}

export class CorrelatedLogger implements ILogger {
    constructor(private inner: ILogger) {}

    private withCorrelation(args: unknown[]): unknown[] {
        const cid = CorrelationContext.get();
        if (cid) {
            const data = args[0] as Record<string, unknown> || {};
            return [{ ...data, correlationId: cid }];
        }
        return args;
    }

    info(message: string, ...args: unknown[]): void {
        this.inner.info(message, ...this.withCorrelation(args));
    }

    error(message: string, ...args: unknown[]): void {
        this.inner.error(message, ...this.withCorrelation(args));
    }
}

---

## 13. IDEIA Backend Services

### 13.1 Agent Execution Service

Servico backend que executa agentes IDEIA, gerenciando o ciclo de vida completo:

```typescript
@injectable()
export class IDEIAgentExecutionService implements BackendApplicationContribution {
    private activeSessions = new Map<string, AgentSession>();
    private readonly MAX_CONCURRENT = 5;

    @inject(LoggerFactory)
    private loggerFactory: LoggerFactory;
    private logger: ILogger;

    @postConstruct()
    init(): void {
        this.logger = this.loggerFactory('ideia-agent-execution');
    }

    async onStart(): Promise<void> {
        this.logger.info('IDEIA Agent Execution Service started');
        await this.resumePendingSessions();
    }

    async onStop(): Promise<void> {
        this.logger.info('IDEIA Agent Execution Service stopping');
        await this.pauseActiveSessions();
    }

    async startSession(task: string, level: string, workspaceUri: string): Promise<string> {
        if (this.activeSessions.size >= this.MAX_CONCURRENT) {
            throw new Error('Max concurrent sessions reached');
        }

        const session = new AgentSession({
            id: uuidv4(),
            task,
            level,
            workspaceUri,
            createdAt: new Date(),
            status: 'pending'
        });

        this.activeSessions.set(session.id, session);
        this.executeSession(session).catch(err => {
            this.logger.error('Session execution failed', err);
        });

        return session.id;
    }

    private async executeSession(session: AgentSession): Promise<void> {
        try {
            session.status = 'running';
            const result = await this.agentRuntime.execute(session);
            session.status = 'completed';
            session.result = result;
            session.completedAt = new Date();
        } catch (err) {
            session.status = 'failed';
            session.error = err.message;
        } finally {
            await this.persistSession(session);
        }
    }
}
```

### 13.2 LLM Proxy Service

Proxye para provedores de LLM, com fallback e rate limiting:

```typescript
@injectable()
export class IDEIALLMProxyService implements BackendApplicationContribution {
    private providers: LLMProvider[] = [];
    private rateLimiter: RateLimiter;

    @inject(LoggerFactory)
    private loggerFactory: LoggerFactory;
    private logger: ILogger;

    @postConstruct()
    init(): void {
        this.logger = this.loggerFactory('ideia-llm-proxy');
        this.rateLimiter = new RateLimiter({
            tokensPerInterval: 60,
            interval: 60000
        });
    }

    async onStart(): Promise<void> {
        this.providers = [
            new OllamaProvider({ baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434' }),
            new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
            new DeepSeekProvider({ apiKey: process.env.DEEPSEEK_API_KEY }),
        ];
        this.logger.info('LLM Proxy Service started', {
            providers: this.providers.map(p => p.name)
        });
    }

    async query(messages: LLMMessage[], options?: LLMQueryOptions): Promise<LLMResponse> {
        await this.rateLimiter.consume();

        let lastError: Error | undefined;
        for (const provider of this.providers) {
            if (!provider.isAvailable()) continue;
            try {
                return await provider.query(messages, options);
            } catch (err) {
                lastError = err;
                this.logger.warn('LLM provider failed, trying next', { provider: provider.name, error: err.message });
            }
        }
        throw new LLMQueryError('All providers failed', { cause: lastError });
    }
}
```

### 13.3 Project Analysis Service

```typescript
@injectable()
export class IDEIAProjectAnalysisService implements BackendApplicationContribution {
    @inject(FileSystemProvider)
    private fileSystem: FileSystemProvider;

    async analyzeProject(workspaceUri: string): Promise<ProjectAnalysis> {
        this.logger.info('Analyzing project', { workspaceUri });

        const fileCount = await this.countFiles(workspaceUri);
        const languages = await this.detectLanguages(workspaceUri);
        const dependencies = await this.analyzeDependencies(workspaceUri);
        const structure = await this.analyzeStructure(workspaceUri);

        return {
            uri: workspaceUri,
            name: path.basename(FileUri.fsPath(workspaceUri)),
            fileCount,
            languages,
            dependencies,
            structure,
            analyzedAt: new Date().toISOString()
        };
    }
}
```

### 13.4 Background Task Service

```typescript
@injectable()
export class IDEIABackgroundTaskService implements BackendApplicationContribution {
    private tasks = new Map<string, BackgroundTask>();
    private readonly TASK_TIMEOUT = 30 * 60 * 1000;

    submitTask<T>(type: string, payload: unknown): string {
        const taskId = uuidv4();
        const task: BackgroundTask = {
            id: taskId,
            type,
            payload,
            status: 'queued',
            createdAt: new Date(),
            controller: new AbortController()
        };
        this.tasks.set(taskId, task);
        this.processTask(task);
        return taskId;
    }

    private async processTask(task: BackgroundTask): Promise<void> {
        task.status = 'running';
        const timeout = setTimeout(() => {
            task.status = 'timeout';
            task.controller.abort();
        }, this.TASK_TIMEOUT);

        try {
            const handler = this.getHandler(task.type);
            const result = await handler(task.payload, task.controller.signal);
            task.status = 'completed';
            task.result = result;
            task.completedAt = new Date();
        } catch (err) {
            task.status = err.name === 'AbortError' ? 'cancelled' : 'failed';
            task.error = err.message;
        } finally {
            clearTimeout(timeout);
            this.emitTaskUpdate(task);
        }
    }
}
```

### 13.5 Agent Session Persistence

```typescript
@injectable()
export class IDEIAgentSessionPersistence {
    private readonly SESSIONS_DIR = '.ideia/sessions';

    async save(session: AgentSession): Promise<void> {
        const dir = path.join(process.cwd(), this.SESSIONS_DIR);
        await fs.mkdir(dir, { recursive: true });
        const filePath = path.join(dir, `${session.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
    }

    async load(sessionId: string): Promise<AgentSession | null> {
        const filePath = path.join(process.cwd(), this.SESSIONS_DIR, `${sessionId}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data) as AgentSession;
        } catch {
            return null;
        }
    }

    async loadAll(): Promise<AgentSession[]> {
        const dir = path.join(process.cwd(), this.SESSIONS_DIR);
        try {
            const files = await fs.readdir(dir);
            const sessions: AgentSession[] = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const data = await fs.readFile(path.join(dir, file), 'utf-8');
                    sessions.push(JSON.parse(data));
                }
            }
            return sessions.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        } catch {
            return [];
        }
    }

    async delete(sessionId: string): Promise<void> {
        const filePath = path.join(process.cwd(), this.SESSIONS_DIR, `${sessionId}.json`);
        try {
            await fs.unlink(filePath);
        } catch {
            // Arquivo ja nao existe
        }
    }
}
```

---

## 14. Startup Optimization

### 14.1 Lazy Module Loading

Modulos sao carregados sob demanda para reduzir o tempo de startup:

```typescript
@injectable()
export class LazyModuleLoader {
    private loaded = new Set<string>();

    async loadModule(modulePath: string): Promise<ContainerModule> {
        if (this.loaded.has(modulePath)) {
            throw new Error(`Module already loaded: ${modulePath}`);
        }
        const module = await import(modulePath);
        this.loaded.add(modulePath);
        return module.default as ContainerModule;
    }

    isLoaded(modulePath: string): boolean {
        return this.loaded.has(modulePath);
    }
}
```

### 14.2 Progressive Startup

O backend e iniciado em estagios para que a interface fique disponivel o mais rapido possivel:

```typescript
@injectable()
export class ProgressiveStartup {
    private stages: StartupStage[] = [];

    registerStage(name: string, priority: number, fn: () => Promise<void>): void {
        this.stages.push({ name, priority, fn });
    }

    async start(): Promise<void> {
        this.stages.sort((a, b) => a.priority - b.priority);

        const critical = this.stages.filter(s => s.priority <= 10);
        const deferrable = this.stages.filter(s => s.priority > 10);

        for (const stage of critical) {
            await stage.fn();
        }

        this.serverReady = true;

        for (const stage of deferrable) {
            stage.fn().catch(err => {
                this.logger.error(`Deferred startup stage failed: ${stage.name}`, err);
            });
        }
    }
}
```

### 14.3 Startup Phases

| Prioridade | Fase | Exemplos | Bloqueante? |
|------------|------|----------|-------------|
| 1 | Logger | Inicializar sistema de log | Sim |
| 2 | Config | Carregar configuracao | Sim |
| 3 | HTTP Server | Criar servidor HTTP + WS | Sim |
| 4 | Static Files | Servir frontend estatico | Sim |
| 5 | ConnectionHandler | Aceitar conexoes RPC | Sim |
| 10 | BackendContributions | Servicos essenciais (FS, terminal) | Sim |
| 20 | Plugin Host | Iniciar processo de plugins | Nao |
| 30 | File Watchers | Iniciar watch de diretorios | Nao |
| 40 | IDEIA Services | Agentes, LLM, analise | Nao |
| 50 | Background Tasks | Iniciar worker pool | Nao |
| 100 | Cache Warmup | Pre-aquecer caches | Nao |

### 14.4 Background Initialization

```typescript
export class BackgroundInitializer {
    private queue: (() => Promise<void>)[] = [];

    enqueue(fn: () => Promise<void>): void {
        this.queue.push(fn);
    }

    async start(): Promise<void> {
        while (this.queue.length > 0) {
            const fn = this.queue.shift()!;
            await new Promise(resolve => setTimeout(resolve, 100));
            fn().catch(err => {
                console.error('Background init failed:', err);
            });
        }
    }
}
```

### 14.5 WebSocket Connection Early

```html
<script>
    // Inicia conexao WebSocket imediatamente, antes do bundle React
    const ws = new WebSocket(`ws://${location.host}/ws`);

    const buffer = [];
    ws.onmessage = (event) => {
        buffer.push(JSON.parse(event.data));
    };

    // Quando o frontend estiver pronto, entrega as mensagens bufferizadas
    window.__WS_READY = (handler) => {
        for (const msg of buffer) {
            handler(msg);
        }
        ws.onmessage = (event) => {
            handler(JSON.parse(event.data));
        };
    };
</script>
```

### 14.6 Loading Screen

```html
<div id="loading-screen" style="position:fixed;top:0;left:0;width:100vw;height:100vh;
     background:#1e1e1e;display:flex;flex-direction:column;align-items:center;
     justify-content:center;color:#ccc;z-index:9999;">
    <div class="spinner"></div>
    <p>Initializing IDEIA...</p>
    <div class="progress-bar">
        <div id="progress-fill" style="width:0%;height:100%;background:#4EC9B0;transition:width 0.5s;"></div>
    </div>
    <p id="status-text" style="font-size:12px;color:#888;"></p>
</div>
<script src="bundle.js"></script>
```

---

## 15. Code Examples

### 15.1 BackendApplicationContribution Startup

```typescript
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { BackendApplicationContribution, BackendApplication } from '@theia/core/lib/node/backend-application';
import { ILogger } from '@theia/core/lib/common/logger';
import { LoggerFactory } from '@theia/core/lib/common/logger-factory';

@injectable()
export class IDEIAAgentBackendService implements BackendApplicationContribution {
    @inject(LoggerFactory)
    private readonly loggerFactory: LoggerFactory;
    private logger: ILogger;

    @postConstruct()
    init(): void {
        this.logger = this.loggerFactory('ideia-agent-backend');
    }

    async initialize(): Promise<void> {
        this.logger.info('Initializing IDEIA Agent Backend Service');
        await this.loadConfiguration();
        await this.connectToModelRegistry();
    }

    async onStart(app: BackendApplication): Promise<void> {
        this.logger.info('Starting IDEIA Agent Backend Service');
        app.use('/ideia/agents', this.createRouter());
    }

    async onStop(app: BackendApplication): Promise<void> {
        this.logger.info('Stopping IDEIA Agent Backend Service');
        await this.saveState();
        await this.disconnectFromModelRegistry();
    }

    private createRouter(): express.Router {
        const router = express.Router();
        router.post('/run', async (req, res) => {
            const { task, level, workspace } = req.body;
            const sessionId = await this.startSession(task, level, workspace);
            res.json({ success: true, sessionId });
        });
        return router;
    }
}
```

### 15.2 JSON-RPC Channel Setup

```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';

export const AgentService = Symbol('AgentService');
export interface AgentService {
    run(task: string, level?: string): Promise<AgentResult>;
    cancel(sessionId: string): Promise<void>;
    getStatus(sessionId: string): Promise<AgentStatus>;
}

export const AgentServiceModule = new ContainerModule(bind => {
    bind(AgentService).to(AgentServiceImpl).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx => {
        const agentService = ctx.container.get<AgentService>(AgentService);
        return new JsonRpcConnectionHandler<AgentService>('agent-service', () => agentService);
    }).inSingletonScope();
});

@injectable()
class AgentServiceImpl implements AgentService {
    async run(task: string, level: string = 'N2'): Promise<AgentResult> {
        return this.executeTask(task, level);
    }
    async cancel(sessionId: string): Promise<void> {
        return this.cancelTask(sessionId);
    }
    async getStatus(sessionId: string): Promise<AgentStatus> {
        return this.getSessionStatus(sessionId);
    }
}
```

### 15.3 CLI Command Contribution

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { CLICommandContribution, CLICommandRegistry, CLICommand } from '@theia/core/lib/node/cli-command-registry';

@injectable()
export class IDEIACLICommands implements CLICommandContribution {
    @inject(IDEIAgentExecutionService)
    private agentService: IDEIAgentExecutionService;

    registerCommands(registry: CLICommandRegistry): void {
        registry.registerCommand(
            {
                id: 'ideia.agent.run',
                label: 'Run an IDEIA agent task',
                description: 'Execute a task with specified autonomy level',
                args: [
                    { name: 'task', type: 'string', demandOption: true, describe: 'Task description' },
                    { name: 'level', type: 'string', default: 'N2', choices: ['N0', 'N1', 'N2', 'N3', 'N4'], describe: 'Autonomy level' },
                    { name: 'workspace', type: 'string', default: process.cwd(), describe: 'Workspace directory' },
                    { name: 'output', alias: 'o', type: 'string', describe: 'Output results to file' }
                ]
            },
            async (args) => {
                const sessionId = await this.agentService.startSession(
                    args.task as string, args.level as string, args.workspace as string
                );
                console.log(`Agent session started: ${sessionId}`);
                if (args.output) {
                    await this.waitAndSave(sessionId, args.output as string);
                }
                return 0;
            }
        );
    }
}
```

### 15.4 WebSocket Connection with Reconnection

```typescript
import { injectable, postConstruct } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { LoggerFactory } from '@theia/core/lib/common/logger-factory';
import { Emitter, Event } from '@theia/core/lib/common/event';

export interface ConnectionState {
    status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
    attempt: number;
    lastConnected?: Date;
}

@injectable()
export class IDEIAWebSocketClient {
    private readonly onStateChangedEmitter = new Emitter<ConnectionState>();
    readonly onStateChanged: Event<ConnectionState> = this.onStateChangedEmitter.event;

    private socket: WebSocket | undefined;
    private state: ConnectionState = { status: 'disconnected', attempt: 0 };
    private readonly BASE_DELAY = 1000;
    private readonly MAX_DELAY = 30000;
    private readonly MAX_ATTEMPTS = 10;

    @inject(LoggerFactory)
    private loggerFactory: LoggerFactory;
    private logger: ILogger;

    @postConstruct()
    init(): void {
        this.logger = this.loggerFactory('ideia-websocket');
    }

    connect(url: string, token?: string): void {
        const wsUrl = token ? `${url}?token=${token}` : url;
        this.setState('connecting');

        try {
            this.socket = new WebSocket(wsUrl);
        } catch (err) {
            this.logger.error('Failed to create WebSocket', err);
            this.scheduleReconnect(url, token);
            return;
        }

        this.socket.onopen = () => {
            this.logger.info('WebSocket connected');
            this.state.attempt = 0;
            this.state.lastConnected = new Date();
            this.setState('connected');
        };

        this.socket.onclose = (event) => {
            if (event.code === 1000 || event.code === 1001) {
                this.setState('disconnected');
            } else {
                this.scheduleReconnect(url, token);
            }
        };

        this.socket.onerror = () => {};

        this.socket.onmessage = (event) => {
            this.handleMessage(event.data);
        };
    }

    private scheduleReconnect(url: string, token?: string): void {
        if (this.state.attempt >= this.MAX_ATTEMPTS) {
            this.logger.error('Max reconnection attempts reached');
            this.setState('disconnected');
            return;
        }

        this.state.attempt++;
        const delay = Math.min(this.BASE_DELAY * Math.pow(2, this.state.attempt), this.MAX_DELAY);
        const jitter = delay * (0.8 + Math.random() * 0.4);

        this.setState('reconnecting');
        setTimeout(() => this.connect(url, token), jitter);
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.close(1000, 'Client disconnect');
            this.socket = undefined;
        }
        this.state.attempt = 0;
        this.setState('disconnected');
    }

    private setState(status: ConnectionState['status']): void {
        this.state.status = status;
        this.onStateChangedEmitter.fire({ ...this.state });
    }
}
```

### 15.5 Backend Service with Lifecycle Hooks

```typescript
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';

export enum ServiceState {
    CREATED = 'created',
    INITIALIZING = 'initializing',
    INITIALIZED = 'initialized',
    STARTING = 'starting',
    RUNNING = 'running',
    STOPPING = 'stopping',
    STOPPED = 'stopped',
    DISPOSED = 'disposed',
    ERROR = 'error',
}

@injectable()
export class IDEIALifecycleAwareService implements BackendApplicationContribution {
    private state: ServiceState = ServiceState.CREATED;

    getState(): ServiceState { return this.state; }

    async initialize(): Promise<void> {
        this.setState(ServiceState.INITIALIZING);
        try {
            await this.loadDependencies();
            await this.validateConfiguration();
            this.setState(ServiceState.INITIALIZED);
        } catch (err) {
            this.setState(ServiceState.ERROR);
            throw err;
        }
    }

    async onStart(): Promise<void> {
        this.setState(ServiceState.STARTING);
        try {
            await this.registerHandlers();
            await this.startBackgroundProcesses();
            this.setState(ServiceState.RUNNING);
        } catch (err) {
            this.setState(ServiceState.ERROR);
            throw err;
        }
    }

    async onStop(): Promise<void> {
        this.setState(ServiceState.STOPPING);
        try {
            await this.stopBackgroundProcesses();
            await this.persistState();
            this.setState(ServiceState.STOPPED);
        } catch (err) {
            this.setState(ServiceState.ERROR);
        }
    }

    private setState(state: ServiceState): void {
        this.state = state;
        process.emit('service:state', { service: 'IDEIALifecycleAwareService', state });
    }
}
```

### 15.6 Logger Setup

```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { LoggerFactory } from '@theia/core/lib/common/logger-factory';
import { LogLevel } from '@theia/core/lib/common/log-level';
import { BackendLogger } from '@theia/core/lib/node/backend-logger';
import { BackendApplicationConfig } from '@theia/core/lib/node/backend-application';

export function configureLogger(config: BackendApplicationConfig): void {
    const level = config.logLevel ?? LogLevel.INFO;
    const logDir = config.logDir ?? path.join(process.cwd(), '.theia/logs');
    fs.mkdirSync(logDir, { recursive: true });

    const logger = new BackendLogger({
        level,
        format: 'json',
        outputs: [
            { type: 'console', level: LogLevel.INFO },
            { type: 'file', path: path.join(logDir, 'ideia-backend.log'), level },
            { type: 'file', path: path.join(logDir, 'ideia-error.log'), level: LogLevel.ERROR },
        ],
        correlationId: true,
        performance: true,
    });

    process.on('uncaughtException', (err) => {
        logger.fatal('Uncaught exception', { error: err.message, stack: err.stack });
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled rejection', { reason });
    });
}
```

---

## 16. Conexoes

| Estudo | Conexao com S48 |
|--------|-----------------|
| **S11 (Theia IDE)** | A arquitetura geral do Theia fornece o contexto para backend e CLI. S48 detalha os mecanismos internos que S11 introduz em alto nivel. |
| **S42 (DI/Contributions)** | Backend services sao registrados via Inversify DI (ContainerModule). BackendApplicationContribution e registrado como toda contribuicao Theia. CLICommandContribution segue o mesmo padrao. |
| **S36 (Extension Host)** | Plugin Host (Secao 9) e um tipo especial de backend service que gerencia processos de extensao. A comunicacao JSON-RPC com plugins segue o mesmo padrao descrito na Secao 6. |
| **S44 (Shell/Layout)** | O frontend ApplicationShell se conecta ao backend via os canais RPC descritos na Secao 6. Status bar entries e activity bar items sao populados por dados do backend. |
| **S47 (Theia AI)** | Os servicos de IA (Secao 13) consomem LLM proxy e agent execution services que rodam no backend. A comunicacao entre widgets de IA no frontend e os agentes backend usa JSON-RPC. |
| **S34 (Editor)** | Monaco editor no frontend depende de backend para LSP, autocomplete, diagnostico e outras features de inteligencia. |
| **S35 (File System)** | O backend prove o sistema de arquivos (watchers, leitura, escrita) exposto via RPC para o frontend. |
| **S37 (Search/SCM/Task)** | Search no workspace executa ripgrep no backend. SCM consulta git no backend. Tasks executam comandos no backend. |
| **S41 (Remote/Web IDE)** | No Theia Cloud, o backend roda como servidor remoto. A comunicacao WebSocket (Secao 7) acontece sobre rede, exigindo autenticacao robusta (Secao 7.2) e reconexao (Secao 7.3). |
| **S45 (Keybindings)** | Keybindings sao processados no frontend, mas comandos podem ser delegados ao backend via comandos remotos. |
| **Electron Study** | No Electron (Secao 10), o backend roda no processo main. A comunicacao com o renderer pode usar IPC (Secao 10.3) ou WebSocket. |

---

## 17. Plano de Implementacao

### 17.1 Fases

| Fase | Tarefa | Esforco | Descricao |
|------|--------|---------|-----------|
| F1 | Core Backend Service | 8h | Implementar BackendApplicationContribution padrao, BackendApplicationConfig, servico de ciclo de vida base |
| F2 | CLI Command Framework | 6h | CLICommandContribution, CLICommandRegistry, yargs integration, argument parsing, exit codes |
| F3 | Server Bootstrap | 8h | HTTP/HTTPS server creation, Express middleware stack, WebSocket server, CORS, static files |
| F4 | JSON-RPC Channel | 8h | Channel multiplexing, ConnectionHandler, JsonRpcConnectionHandler, createProxy, createLocalProxy |
| F5 | WebSocket Connection | 6h | Reconnection strategy, heartbeat, authentication, message framing, compression |
| F6 | Backend Service Lifecycle | 6h | Service state machine, lifecycle hooks, eager/lazy, dependency ordering, state monitoring |
| F7 | Plugin Host Integration | 10h | Child process management, plugin deploy/undeploy, resource limits, isolation |
| F8 | Electron Backend | 8h | Window manager, IPC handlers, native dialogs, auto-updater, shell integration |
| F9 | Logging System | 6h | ILogger/LoggerFactory, log levels, file output, rotation, correlation IDs, performance logging |
| F10 | IDEIA Backend Services | 12h | Agent execution service, LLM proxy, project analysis, background tasks, session persistence |
| F11 | Startup Optimization | 6h | Lazy loading, progressive startup, background initialization, loading screen |
| F12 | Testes | 8h | Testes unitarios: service lifecycle, CLI commands, RPC channels, WebSocket reconnection |

### 17.2 Pacotes

| Package | Conteudo | Depende de |
|---------|----------|-----------|
| `packages/core-backend` | BackendApplication, BackendApplicationContribution, config | `@theia/core` |
| `packages/cli-framework` | CLICommandContribution, CLICommandRegistry, yargs wrapper | `core-backend` |
| `packages/server-bootstrap` | HTTP/WS server creation, Express middleware, CORS | `core-backend` |
| `packages/rpc-messaging` | Channel, JSON-RPC, createProxy, ConnectionHandler | `server-bootstrap` |
| `packages/websocket-client` | ReconnectingWebSocket, heartbeat, auth, compression | `rpc-messaging` |
| `packages/backend-logging` | ILogger, LoggerFactory, file output, rotation, correlation | `core-backend` |
| `packages/plugin-host` | Plugin process, deploy, resource limits, isolation | `core-backend` |
| `packages/ideia-backend` | Agent execution, LLM proxy, analysis, tasks, persistence | `rpc-messaging`, `backend-logging` |
| `packages/startup-optimizer` | LazyLoader, ProgressiveStartup, BackgroundInitializer | `core-backend` |

### 17.3 Marcos

| Marco | Prazo | Entregavel |
|-------|-------|-----------|
| M1 | Semana 1 | Core backend + CLI framework + server bootstrap (F1-F3) |
| M2 | Semana 2 | JSON-RPC channels + WebSocket + service lifecycle (F4-F6) |
| M3 | Semana 3 | Plugin host + Electron backend + logging (F7-F9) |
| M4 | Semana 4 | IDEIA backend services + startup optimization + testes (F10-F12) |

### 17.4 Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Incompatibilidade com versao do `ws` ou `express` no Theia | Media | Alto | Usar mesmas versoes que `@theia/core` |
| Plugin host crash causa perda de estado de plugins | Media | Alto | Persistir estado periodico, restart automatico |
| WebSocket reconnect loop em rede instavel | Alta | Medio | Jitter + max attempts + backoff exponencial |
| Vazamento de memoria em channels RPC nao fechados | Media | Alto | Channel registry com cleanup forcado no onStop |
| Conflito de ports com outros servicos | Baixa | Medio | Port discovery automatico, fallback |
| Complexidade de electron auto-updater cross-platform | Media | Medio | Testar em CI matrix (Win/Mac/Linux) |

---

> **Fim do ESTUDO S48** — Theia CLI, Backend & Service Lifecycle
>
> Proximo: ESTUDO S49 — Theia Plugin System & Extension API
