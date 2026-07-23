# ESTUDO S47 — Theia AI, Agents & Intelligence Framework

> **Arquitetura de integracao de IA no Theia: AI core, AI providers, chat system, inline completions, agent as extension, context providers, code actions, widget de agente, comandos IA e governanca**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — Theia AI framework, agent contributions, chat system, inline completions, security model |

---

## Sumario

1. [Introducao](#1-introducao)
2. [Theia AI Core](#2-theia-ai-core)
3. [AI Provider Interface](#3-ai-provider-interface)
4. [AI Contribution Points](#4-ai-contribution-points)
5. [AI Chat System](#5-ai-chat-system)
6. [AI Inline Completions](#6-ai-inline-completions)
7. [AI Agent as Theia Extension](#7-ai-agent-as-theia-extension)
8. [AI Context Providers](#8-ai-context-providers)
9. [AI Code Actions](#9-ai-code-actions)
10. [AI Agent Interaction Widget](#10-ai-agent-interaction-widget)
11. [AI Agent as Theia Command](#11-ai-agent-as-theia-command)
12. [Workspace-wide AI Features](#12-workspace-wide-ai-features)
13. [Security & Governance](#13-security--governance)
14. [Code Examples](#14-code-examples)
15. [Conexoes](#15-conexoes)
16. [Plano de Implementacao](#16-plano-de-implementacao)

---

## 1. Introducao

### 1.1 Theia AI Framework Overview

O Theia AI Framework e o conjunto de servicos, contratos e pontos de extensao que permitem que extensoes integrem capacidades de inteligencia artificial na plataforma Theia. Diferente de abordagens standalone onde um LLM e chamado diretamente via HTTP, o Theia AI Framework fornece abstracoes que permitem que agentes de IA sejam registrados como contribuicoes nativas do Theia, aproveitando o sistema de injecao de dependencia, o barramento de comandos, o sistema de views e o ciclo de vida do editor.

```
+--------------------------------------------------------------------+
|                      THEIA AI FRAMEWORK                              |
|                                                                      |
|  +----------------------------------------------------------------+  |
|  |  LAYER 3: AI AGENTS & WIDGETS                                    |  |
|  |  +-------------+  +-------------+  +-------------------------+   |  |
|  |  | Chat Widget |  | Agent Panel |  | Inline Completion UI   |   |  |
|  |  +-------------+  +-------------+  +-------------------------+   |  |
|  +----------------------------------------------------------------+  |
|  |  LAYER 2: AI CONTRIBUTIONS                                       |  |
|  |  +-------------+  +-------------+  +-------------------------+   |  |
|  |  | AI Providers|  | AI Commands |  | AI Code Actions         |   |  |
|  |  | (LLM agnst) |  | (agent cmds)|  | (refactor, explain...)  |   |  |
|  |  +-------------+  +-------------+  +-------------------------+   |  |
|  +----------------------------------------------------------------+  |
|  |  LAYER 1: AI CORE                                                |  |
|  |  +-------------+  +-------------+  +-------------------------+   |  |
|  |  | AIManager   |  | AIProvider  |  | AIContextProvider       |   |  |
|  |  | (lifecycle) |  | (abstracao)|  | (context collection)    |   |  |
|  |  +-------------+  +-------------+  +-------------------------+   |  |
|  +----------------------------------------------------------------+  |
|                                                                      |
|  Base: @theia/core + @theia/ai + Inversify DI                       |
|  Editor: Monaco Editor via @theia/monaco-editor-core                |
+--------------------------------------------------------------------+
```

### 1.2 Theia AI vs Standalone LLM Integration

| Aspecto | Theia AI Framework | Standalone LLM Integration |
|---------|-------------------|---------------------------|
| Integracao | Contribuicoes DI nativas | HTTP calls diretas |
| Contexto | AIContextProvider com editor, workspace, diagnostics | Contexto manual |
| UI | Chat widget nativo, ghost text do Monaco | UI customizada |
| Comandos | CommandContribution com acesso ao backend AI | Acao isolada |
| Provedores | Multiplos AI providers com fallback | Provedor unico |
| Seguranca | AI permission model + approval flow | Seguranca ad-hoc |
| Audit trail | Theia logging + AI audit events | Nao existente |
| Extensibilidade | Qualquer extension registra AIProvider | Monolitico |

### 1.3 Architectural Layers

```
AI CORE (foundation)
  AIManager         -> Gerencia ciclo de vida de providers
  AIProvider        -> Abstracao de modelo de IA (Ollama, OpenAI, etc.)
  AIRequestModel    -> Estrutura de requisicao padronizada
  AIResponseHandler -> Processamento de resposta

AI CONTRIBUTIONS (integration layer)
  AIContribution    -> Ponto de extensao para registros de IA
  AIChatParticipant -> Participante do chat
  AIInlineCompletion -> Provider de completacao inline
  AICodeAction      -> Code action com suporte a IA

AGENT WIDGETS (UI layer)
  ChatWidget        -> Widget de chat nativo do Theia
  AgentPanel        -> Painel de interacao com agente
  InlineCompletion  -> Ghost text no editor
```

---

## 2. Theia AI Core

### 2.1 Theia AI Service Architecture

O nucleo do Theia AI e composto por servicos registrados no container Inversify que gerenciam provedores de IA, contextos e lifecycle de requisicoes.

```
+---------------------------+       +---------------------------+
|  Frontend (browser)      |       |  Backend (node)           |
|                           |       |                           |
|  +---------------------+ |       | +----------------------+  |
|  | AIManager (frontend)| |  RPC  | | AIManager (backend)  |  |
|  | ChatWidget          |<--------->| AIProviderRegistry   |  |
|  | InlineCompletionUI  | |       | | LLM Backends         |  |
|  | AgentPanel          | |       | | (Ollama, OpenAI, ...)|  |
|  +---------------------+ |       | +----------------------+  |
+---------------------------+       +---------------------------+
           |                                        |
           v                                        v
   +-------------------+                 +-------------------+
   | AIContextProvider |                 | AIRequestHandler  |
   | (editor, ws, git) |                 | response stream   |
   +-------------------+                 +-------------------+
```

### 2.2 AIManager

`AIManager` e o servico central que gerencia provedores de IA, requisicoes e ciclo de vida. Existe tanto no frontend quanto no backend, com comunicacao via RPC.

```typescript
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';

export const AIManager = Symbol('AIManager');

export interface AIManager {
  getProviders(): AIProviderDescription[];
  getActiveProvider(): string;
  setActiveProvider(id: string): void;
  sendRequest(request: AIRequest): Promise<AIResponse>;
  sendStreamRequest(request: AIRequest, callback: AIStreamCallback): Promise<void>;
  registerProvider(provider: AIProvider): void;
  unregisterProvider(id: string): void;
  getContextProviders(): AIContextProvider[];
}

export interface AIRequest {
  id: string;
  model: string;
  messages: AIMessage[];
  tools?: AIToolDefinition[];
  maxTokens?: number;
  temperature?: number;
  context?: Record<string, unknown>;
  sessionId?: string;
  userId?: string;
}

export interface AIResponse {
  id: string;
  requestId: string;
  content: string;
  toolCalls?: AIToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
  usage?: AIUsage;
  latency: number;
}

export interface AIProviderDescription {
  id: string;
  name: string;
  provider: string;
  model: string;
  capabilities: AICapability[];
  isActive: boolean;
  isAvailable: boolean;
}
```

### 2.3 AIProvider Interface

Todo provedor de IA no Theia implementa a interface `AIProvider`:

```typescript
export const AIProvider = Symbol('AIProvider');

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly model: string;
  readonly capabilities: AICapability[];
  canHandle(request: AIRequest): boolean;
  sendRequest(request: AIRequest): Promise<AIResponse>;
  sendStreamRequest(request: AIRequest, callback: AIStreamCallback): Promise<void>;
  getConfiguration(): AIProviderConfiguration;
  configure(config: Partial<AIProviderConfiguration>): void;
  ping(): Promise<boolean>;
}

export type AICapability = 'chat' | 'inline-completion' | 'code-generation' | 'embedding' | 'tool-use' | 'vision';

export interface AIProviderConfiguration {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  timeout: number;
  retryCount: number;
}
```

### 2.4 AIRequestModel e AIResponseHandler

```typescript
export interface AIRequestModel {
  id: string;
  type: 'chat' | 'inline-completion' | 'code-action';
  messages: AIMessage[];
  context: {
    editor?: EditorContext;
    workspace?: WorkspaceContext;
    diagnostics?: DiagnosticContext;
    git?: GitContext;
    files?: FileContext[];
  };
  options: {
    maxTokens: number;
    temperature: number;
    stopSequences?: string[];
    stream: boolean;
  };
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: AIToolCall[];
  name?: string;
}

export const AIResponseHandler = Symbol('AIResponseHandler');

export interface AIResponseHandler {
  handleResponse(response: AIResponse): Promise<void>;
  handleStreamChunk(chunk: AIStreamChunk): void;
  handleError(error: AIError): void;
  handleToolCall(toolCall: AIToolCall): Promise<AIToolResult>;
  abort(): void;
}
```

### 2.5 AI Request Lifecycle

Toda requisicao de IA no Theia segue um lifecycle padrao:

```
REQUEST LIFECYCLE

  1. COLLECT CONTEXT
     AIManager.queryContextProviders()
       -> AIContextProvider.collect(request)
       -> Contextos sao merged no AIRequestModel.context

  2. SELECT PROVIDER
     AIManager.selectProvider(request)
       -> Filtra providers por canHandle()
       -> Usa activeProvider ou fallback chain

  3. VALIDATE REQUEST
     OutputValidator.validate(request)
       -> Secrets scan
       -> Dangerous patterns check
       -> Extension type check

  4. PREPARE REQUEST
     Provider.buildRequest(request)
       -> Formata mensagens para o formato do provider
       -> Adiciona system prompt
       -> Configura tools se suportado

  5. SEND REQUEST
     Provider.sendStreamRequest(request, callback)
       -> Stream de chunks via SSE / WebSocket
       -> Callback e chamado para cada chunk

  6. PROCESS RESPONSE
     ResponseHandler.handleStreamChunk(chunk)
       -> Tokens sao acumulados
       -> Tool calls sao detectados e executados
       -> Output e validado

  7. PRESENT RESULT
     ResponseHandler.handleResponse(response)
       -> Chat: append ao chat widget
       -> Inline: ghost text no editor
       -> Code action: diff view ou aplicacao direta

  8. AUDIT
     AuditTrail.record(request, response)
       -> Log de requisicao completa
       -> Hash chain SHA-256
```

### 2.6 AI Model Registration

Modelos de IA sao registrados como bindings no container Inversify:

```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { AIProvider, AIManager } from '@theia/ai-core/lib/common';

export default new ContainerModule(bind => {
  bind(AIProvider).to(OllamaProvider).inSingletonScope();
  bind(AIProvider).to(OpenAIProvider).inSingletonScope();
  bind(AIProvider).to(DeepSeekProvider).inSingletonScope();
  bind(AIContextProvider).to(EditorContextProvider).inSingletonScope();
  bind(AIContextProvider).to(WorkspaceContextProvider).inSingletonScope();
  bind(AIContextProvider).to(DiagnosticsContextProvider).inSingletonScope();
  bind(AIContextProvider).to(GitContextProvider).inSingletonScope();
  bind(AIContextProvider).to(FileContextProvider).inSingletonScope();
});
```

O `AIManager` coleta todos os providers registrados no container e os gerencia:

```typescript
@injectable()
export class AIManagerImpl implements AIManager {
  @inject(ContributionProvider) @named(AIProvider)
  protected readonly aiProviders: ContributionProvider<AIProvider>;

  @inject(ContributionProvider) @named(AIContextProvider)
  protected readonly contextProviders: ContributionProvider<AIContextProvider>;

  @inject(AIOutputValidator)
  protected readonly outputValidator: AIOutputValidator;

  @inject(AIAuditService)
  protected readonly auditService: AIAuditService;

  protected activeProviderId: string;

  getProviders(): AIProviderDescription[] {
    return this.aiProviders.getContributions().map(p => ({
      id: p.id,
      name: p.name,
      provider: p.provider,
      model: p.model,
      capabilities: p.capabilities,
      isActive: p.id === this.activeProviderId,
      isAvailable: true,
    }));
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const provider = this.resolveProvider(request);
    const context = await this.collectContext(request);
    request.context = { ...request.context, ...context };

    const validation = await this.outputValidator.validate(request);
    if (!validation.passed) {
      throw new AIValidationError(validation.reason);
    }

    try {
      const response = await provider.sendRequest(request);
      response.latency = Date.now() - start;
      await this.auditService.record(request, response);
      return response;
    } catch (error) {
      await this.auditService.recordError(request, error);
      throw error;
    }
  }

  protected resolveProvider(request: AIRequest): AIProvider {
    const providers = this.aiProviders.getContributions();
    if (this.activeProviderId) {
      const active = providers.find(p => p.id === this.activeProviderId);
      if (active && active.canHandle(request)) return active;
    }
    for (const provider of providers) {
      if (provider.canHandle(request)) return provider;
    }
    throw new AIProviderNotFoundError('No suitable AI provider found');
  }

  protected async collectContext(request: AIRequest): Promise<Record<string, unknown>> {
    const contexts: Record<string, unknown> = {};
    for (const provider of this.contextProviders.getContributions()) {
      const result = await provider.collect(request);
      Object.assign(contexts, result);
    }
    return contexts;
  }
}
```
---

## 3. AI Provider Interface

### 3.1 Provider Abstractions

A interface `AIProvider` no Theia funciona como uma camada de abstracao entre o framework e diversos backends de LLM. Cada provider implementa a mesma interface, permitindo troca transparente entre provedores.

```
+----------------------------------------------------------------------+
|                        AIProvider Interface                             |
|                                                                        |
|  +------------------+  +------------------+  +------------------+      |
|  | OllamaProvider   |  | OpenAIProvider   |  | DeepSeekProvider |      |
|  | - llama3, codellama | - gpt-4o, gpt-4o-mini | - deepseek-coder  |      |
|  | - localhost:11434 |  | - api.openai.com |  | - api.deepseek   |      |
|  +------------------+  +------------------+  +------------------+      |
|                                                                        |
|  +------------------+  +------------------+  +------------------+      |
|  | AnthropicProvider|  | GoogleProvider   |  | CustomProvider   |      |
|  | - claude-3-opus  |  | - gemini-pro     |  | - qualquer LLM   |      |
|  +------------------+  +------------------+  +------------------+      |
|                                                                        |
|  Metodo de descoberta: ContributionProvider<AIProvider>                 |
|  Selecao: canHandle() + activeProviderId + fallback chain              |
+----------------------------------------------------------------------+
```

### 3.2 Provider Capabilities

```typescript
export interface AICapabilityDescriptor {
  type: AICapability;
  supported: boolean;
  config?: Record<string, unknown>;
  maxInputTokens?: number;
  maxOutputTokens?: number;
}

const OLLAMA_CAPABILITIES: AICapabilityDescriptor[] = [
  { type: 'chat', supported: true, maxInputTokens: 8192, maxOutputTokens: 4096 },
  { type: 'inline-completion', supported: true, maxInputTokens: 4096, maxOutputTokens: 256 },
  { type: 'code-generation', supported: true, maxInputTokens: 8192, maxOutputTokens: 4096 },
  { type: 'embedding', supported: true, maxInputTokens: 8192, maxOutputTokens: 1 },
  { type: 'tool-use', supported: true },
];

const OPENAI_CAPABILITIES: AICapabilityDescriptor[] = [
  { type: 'chat', supported: true, maxInputTokens: 128000, maxOutputTokens: 16384 },
  { type: 'inline-completion', supported: true, maxInputTokens: 8192, maxOutputTokens: 256 },
  { type: 'code-generation', supported: true, maxInputTokens: 128000, maxOutputTokens: 16384 },
  { type: 'embedding', supported: true, maxInputTokens: 8192, maxOutputTokens: 3072 },
  { type: 'tool-use', supported: true },
  { type: 'vision', supported: true },
];
```

### 3.3 Provider Fallback Strategy

```typescript
export interface AIFallbackStrategy {
  type: 'priority' | 'round-robin' | 'failover';
  providers: string[];
  timeout: number;
  maxRetries: number;
}

@injectable()
export class AIProviderFallback {
  async executeWithFallback<T>(
    request: AIRequest,
    primaryProvider: AIProvider,
    fallbackProviders: AIProvider[],
    fn: (provider: AIProvider) => Promise<T>
  ): Promise<T> {
    const providers = [primaryProvider, ...fallbackProviders];
    let lastError: Error | undefined;

    for (const provider of providers) {
      try {
        const result = await this.withTimeout(fn(provider), 30000);
        return result;
      } catch (error) {
        lastError = error;
        continue;
      }
    }
    throw new AIAllProvidersFailedError('All AI providers failed', lastError);
  }

  protected withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Provider timeout')), ms)
      ),
    ]);
  }
}
```

### 3.4 Provider Configuration

Cada provider expoe sua configuracao padrao e permite override via preferences do Theia:

```typescript
export const AIProviderPreferences = Symbol('AIProviderPreferences');

export interface AIProviderPreferenceSchema {
  'ai.provider.active': string;
  'ai.provider.ollama.baseUrl': string;
  'ai.provider.ollama.model': string;
  'ai.provider.openai.apiKey': string;
  'ai.provider.openai.model': string;
  'ai.provider.deepseek.apiKey': string;
  'ai.provider.deepseek.model': string;
  'ai.provider.fallback.enabled': boolean;
  'ai.provider.timeout': number;
  'ai.provider.maxRetries': number;
  'ai.request.maxTokens': number;
  'ai.request.temperature': number;
}

@injectable()
export class OllamaProvider implements AIProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama';
  readonly provider = 'ollama';
  readonly model = 'llama3';
  readonly capabilities: AICapability[] = ['chat', 'inline-completion', 'code-generation', 'embedding', 'tool-use'];

  @inject(AIProviderPreferences)
  protected preferences: AIProviderPreferences;

  protected baseUrl = 'http://localhost:11434';

  @postConstruct()
  protected init(): void {
    this.preferences.onPreferenceChanged(e => {
      if (e.preferenceName === 'ai.provider.ollama.baseUrl') {
        this.baseUrl = e.newValue;
      }
    });
  }

  canHandle(request: AIRequest): boolean {
    return request.model.startsWith('llama') || request.model.startsWith('codellama') || request.model.startsWith('deepseek');
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        stream: false,
        options: {
          num_predict: request.maxTokens ?? 2048,
          temperature: request.temperature ?? 0.7,
        },
      }),
    });
    const data = await response.json();
    return {
      id: crypto.randomUUID(),
      requestId: request.id,
      content: data.message.content,
      finishReason: 'stop',
      usage: { promptTokens: data.prompt_eval_count, completionTokens: data.eval_count },
      latency: 0,
    };
  }

  async sendStreamRequest(request: AIRequest, callback: AIStreamCallback): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        stream: true,
        options: {
          num_predict: request.maxTokens ?? 2048,
          temperature: request.temperature ?? 0.7,
        },
      }),
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        const chunk = JSON.parse(line);
        callback.onChunk({
          type: 'content',
          content: chunk.message?.content ?? '',
          done: chunk.done,
        });
      }
    }
  }

  getConfiguration(): AIProviderConfiguration {
    return { baseUrl: this.baseUrl, model: this.model, maxTokens: 2048, temperature: 0.7, topP: 0.9, timeout: 30000, retryCount: 3 };
  }

  configure(config: Partial<AIProviderConfiguration>): void {
    if (config.baseUrl) this.baseUrl = config.baseUrl;
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

---

## 4. AI Contribution Points

### 4.1 AI-Specific Contribution Points

O Theia define contribution points especificos para IA que extensoes podem implementar.

```
+----------------------------+    +-------------------------------+
| Frontend (browser)         |    | Backend (node)                |
|                            |    |                               |
| AIContribution (frontend)  |    | AIContribution (backend)      |
|  - AIChatParticipant       |    |  - AIProvider                 |
|  - AIInlineCompletion      |    |  - AIAgentBackendService      |
|  - AICodeAction            |    |  - AIEmbeddingProvider        |
|  - AIContextProvider       |    |                               |
+----------------------------+    +-------------------------------+

Registrados via ContainerModule:

frontend:
  bind(AIContribution).to(MyChatAgent)
  bind(AIContribution).to(MyInlineCompletionProvider)

backend:
  bind(AIProvider).to(MyCustomProvider)
  bind(AIContribution).to(MyBackendAgent)
```

### 4.2 AIContribution Interface

```typescript
export const AIContribution = Symbol('AIContribution');

export interface AIContribution {
  readonly id: string;
  readonly name: string;
  readonly type: AIContributionType;
  readonly label: string;
  readonly description?: string;
  activate?(): Promise<void>;
  deactivate?(): Promise<void>;
}

export type AIContributionType =
  | 'chat-participant'
  | 'inline-completion'
  | 'code-action'
  | 'context-provider'
  | 'command'
  | 'agent'
  | 'tool';
```

### 4.3 AI Command Extensions

```typescript
export const AI_COMMAND_CATEGORY = 'AI';

export namespace AICommands {
  export const ANALYSE: Command = { id: 'ideia.agent.analyse', category: AI_COMMAND_CATEGORY, label: 'Analyse Code' };
  export const ARCHITECT: Command = { id: 'ideia.agent.architect', category: AI_COMMAND_CATEGORY, label: 'Architect Solution' };
  export const IMPLEMENT: Command = { id: 'ideia.agent.implement', category: AI_COMMAND_CATEGORY, label: 'Implement Feature' };
  export const REVIEW: Command = { id: 'ideia.agent.review', category: AI_COMMAND_CATEGORY, label: 'Review Code' };
  export const EXPLAIN: Command = { id: 'ideia.agent.explain', category: AI_COMMAND_CATEGORY, label: 'Explain Code' };
  export const GENERATE_TEST: Command = { id: 'ideia.agent.generateTest', category: AI_COMMAND_CATEGORY, label: 'Generate Test' };
  export const FIX: Command = { id: 'ideia.agent.fix', category: AI_COMMAND_CATEGORY, label: 'Fix with AI' };
  export const DEPLOY: Command = { id: 'ideia.agent.deploy', category: AI_COMMAND_CATEGORY, label: 'Deploy with AI' };
}
```

### 4.4 AI Inline Completion Provider Registration

```typescript
export const AIInlineCompletionContribution = Symbol('AIInlineCompletionContribution');

export interface AIInlineCompletionContribution extends AIContribution {
  readonly type: 'inline-completion';
  provideInlineCompletionItems(
    context: InlineCompletionContext,
    token: CancellationToken
  ): Promise<AIInlineCompletionItem[]>;
  handleDidAcceptCompletion?(item: AIInlineCompletionItem): void;
}

export interface InlineCompletionContext {
  readonly document: TextDocument;
  readonly position: Position;
  readonly triggerKind: InlineCompletionTriggerKind;
  readonly currentLinePrefix: string;
  readonly recentlyCommittedCharacters?: string;
  readonly imports?: string[];
  readonly languageId: string;
}

export interface AIInlineCompletionItem {
  readonly text: string;
  readonly insertText: string;
  readonly range?: Range;
  readonly filterText?: string;
  readonly isSnippet?: boolean;
  readonly source?: string;
  readonly providerId: string;
}
```

### 4.5 AI Chat Participant Registration

Chat participants sao registrados via `AIChatParticipantContribution` e expostos no `package.json`:

```json
{
  "contributes": {
    "ai.chatParticipant": [
      {
        "id": "ideia.analyst",
        "name": "@analyst",
        "description": "Analyse code structure and patterns",
        "commands": [
          { "command": "analyse", "description": "Analyse the current file" },
          { "command": "dependencies", "description": "Analyse dependencies" },
          { "command": "architecture", "description": "Analyse architecture" }
        ]
      },
      {
        "id": "ideia.architect",
        "name": "@architect",
        "description": "Design software architecture",
        "commands": [
          { "command": "design", "description": "Design component architecture" },
          { "command": "pattern", "description": "Suggest design patterns" },
          { "command": "diagram", "description": "Generate architecture diagram" }
        ]
      },
      {
        "id": "ideia.programmer",
        "name": "@programmer",
        "description": "Implement code and features",
        "commands": [
          { "command": "implement", "description": "Implement from spec" },
          { "command": "refactor", "description": "Refactor code" },
          { "command": "optimize", "description": "Optimise performance" }
        ]
      },
      {
        "id": "ideia.reviewer",
        "name": "@reviewer",
        "description": "Review code quality",
        "commands": [
          { "command": "review", "description": "Review selected code" },
          { "command": "security", "description": "Security audit" },
          { "command": "quality", "description": "Quality check" }
        ]
      },
      {
        "id": "ideia.tester",
        "name": "@tester",
        "description": "Generate and run tests",
        "commands": [
          { "command": "generate", "description": "Generate unit tests" },
          { "command": "coverage", "description": "Analyse test coverage" },
          { "command": "integration", "description": "Generate integration tests" }
        ]
      },
      {
        "id": "ideia.devops",
        "name": "@devops",
        "description": "Manage deployment and infrastructure",
        "commands": [
          { "command": "deploy", "description": "Deploy application" },
          { "command": "ci", "description": "Configure CI/CD" },
          { "command": "infra", "description": "Manage infrastructure" }
        ]
      }
    ]
  }
}
```
---

## 5. AI Chat System

### 5.1 Theia Chat Widget

O Theia fornece um widget de chat nativo que extensoes podem estender com participantes customizados:

```
+-------------------------------------------------------+
|  Chat (IDEIA)                                   [_][O] |
+-------------------------------------------------------+
| @analyst analyse the current file                     |
| @architect design a microservice architecture         |
| @programmer implement a REST controller              |
+-------------------------------------------------------+
|                                                       |
|  [@analyst] Analysing src/controller.ts...            |
|  The file contains 3 controllers with 12 endpoints.   |
|  Pattern: MVC with service layer.                     |
|  Recommendation: Extract validation logic to middleware.|
|                                                       |
+-------------------------------------------------------+
| >> @architect design auth module                     |
+-------------------------------------------------------+
| [+] [Stop]                                            |
+-------------------------------------------------------+
```

### 5.2 Chat Agent Integration

Cada agente de chat e implementado como uma contribuicao `AIChatParticipant`:

```typescript
export const AIChatParticipant = Symbol('AIChatParticipant');

export interface AIChatParticipant extends AIContribution {
  readonly type: 'chat-participant';
  readonly id: string;
  readonly name: string;
  readonly commands: ChatCommand[];
  request(
    request: ChatRequest,
    context: ChatContext,
    response: ChatResponseBuilder
  ): Promise<void>;
  resolveCompletion?(text: string, context: ChatContext): ChatCompletion[];
}

export interface ChatRequest {
  readonly command: string;
  readonly message: string;
  readonly arguments: string[];
  readonly participants: string[];
  readonly session: ChatSession;
}

export interface ChatContext {
  readonly editor: EditorContext;
  readonly workspace: WorkspaceContext;
  readonly diagnostics: DiagnosticContext;
  readonly selectedCode: string | undefined;
  readonly conversationHistory: AIMessage[];
}

export interface ChatResponseBuilder {
  markdown(value: string): void;
  codeBlock(value: string, language?: string): void;
  button(label: string, command: string): void;
  fileTree(files: FileNode[]): void;
  progress(percent: number, message: string): void;
  toolResult(toolCallId: string, content: string): void;
  error(message: string): void;
  done(): void;
}
```

### 5.3 Chat View Registration

```typescript
@injectable()
export class IDEIAChatContribution implements AIChatParticipant {
  readonly type = 'chat-participant';
  readonly id = 'ideia';
  readonly name = 'IDEIA';
  readonly description = 'IDEIA agent: analyse, architect, implement, review, test, deploy';

  readonly commands: ChatCommand[] = [
    { command: 'analyse', description: 'Analyse code', agentType: 'analyst' },
    { command: 'architect', description: 'Design architecture', agentType: 'architect' },
    { command: 'implement', description: 'Implement features', agentType: 'programmer' },
    { command: 'review', description: 'Review code', agentType: 'reviewer' },
    { command: 'test', description: 'Generate tests', agentType: 'tester' },
    { command: 'deploy', description: 'Deploy application', agentType: 'devops' },
    { command: 'help', description: 'Show help' },
  ];

  @inject(AIManager)
  protected aiManager: AIManager;

  @inject(AgentRouter)
  protected agentRouter: AgentRouter;

  async request(request: ChatRequest, context: ChatContext, response: ChatResponseBuilder): Promise<void> {
    const agent = this.agentRouter.route(request.command);
    if (!agent) {
      response.error('Unknown command: ' + request.command);
      response.done();
      return;
    }

    response.progress(10, 'Routing to ' + agent.name + '...');

    try {
      const result = await agent.execute({
        command: request.command,
        input: request.message,
        context: context,
        onProgress: (percent, msg) => response.progress(percent, msg),
      });

      if (result.type === 'error') {
        response.error(result.message);
      } else {
        response.markdown(result.summary);
        if (result.codeBlocks) {
          for (const block of result.codeBlocks) {
            response.codeBlock(block.code, block.language);
          }
        }
      }
    } catch (error) {
      response.error('Error: ' + error.message);
    }

    response.done();
  }
}
```

### 5.4 Chat Message Handling

```typescript
@injectable()
export class ChatServiceImpl implements ChatService {
  @inject(ContributionProvider) @named(AIChatParticipant)
  protected participants: ContributionProvider<AIChatParticipant>;

  @inject(AIManager)
  protected aiManager: AIManager;

  @inject(ChatSessionManager)
  protected sessionManager: ChatSessionManager;

  async handleChatMessage(sessionId: string, message: string): Promise<AsyncIterable<ChatEvent>> {
    const session = this.sessionManager.getOrCreateSession(sessionId);
    const parsed = this.parseMessage(message);

    if (parsed.participant) {
      const participant = this.findParticipant(parsed.participant);
      if (!participant) {
        return this.errorResponse('Unknown participant: ' + parsed.participant);
      }

      const context = await this.buildContext(session);
      const responseBuilder = new ChatResponseBuilderImpl();

      await participant.request(
        {
          command: parsed.command,
          message: parsed.message,
          arguments: parsed.args,
          participants: session.participants,
          session,
        },
        context,
        responseBuilder
      );

      return responseBuilder.events();
    }

    return this.aiChatResponse(session, message);
  }

  protected parseMessage(message: string): ParsedMessage {
    const participantMatch = message.match(/^@(\w+)/);
    if (!participantMatch) {
      return { participant: undefined, command: '', message, args: [] };
    }

    const rest = message.slice(participantMatch[0].length).trim();
    const commandMatch = rest.match(/^(\w+)/);
    const command = commandMatch ? commandMatch[1] : '';
    const body = commandMatch ? rest.slice(command.length).trim() : rest;

    return {
      participant: participantMatch[1],
      command,
      message: body,
      args: body.split(/\s+/),
    };
  }

  protected findParticipant(name: string): AIChatParticipant | undefined {
    return this.participants.getContributions().find(p => p.name === '@' + name || p.id === name);
  }
}
```

### 5.5 Chat Agent Discovery

```typescript
export interface ChatAgentDescriptor {
  id: string;
  name: string;
  description: string;
  commands: { command: string; description: string }[];
  icon?: string;
  isActivated: boolean;
}

@injectable()
export class ChatAgentDiscovery {
  @inject(ContributionProvider) @named(AIChatParticipant)
  protected participants: ContributionProvider<AIChatParticipant>;

  getAllAgents(): ChatAgentDescriptor[] {
    return this.participants.getContributions().map(p => ({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      commands: p.commands.map(c => ({ command: c.command, description: c.description })),
      isActivated: true,
    }));
  }

  findAgent(query: string): ChatAgentDescriptor[] {
    const lower = query.toLowerCase();
    return this.getAllAgents().filter(
      a => a.id.includes(lower) || a.name.includes(lower) || a.description.includes(lower) || a.commands.some(c => c.command.includes(lower))
    );
  }
}
```

---

## 6. AI Inline Completions

### 6.1 Theia Inline Completion Hook

O Theia hooka o sistema de inline completions do Monaco via `InlineCompletionProvider`:

```
INLINE COMPLETION FLOW

  1. TRIGGER
     Usuario digita (.) pausa > 200ms
       -> Monaco dispara InlineCompletionProvider.provideInlineCompletionItems()

  2. CONTEXT COLLECTION
     AIInlineCompletionProvider
       -> Pega documento, posicao, prefixo da linha
       -> Coleta imports do escopo atual
       -> Coleta simbolos proximos
       -> Monta contexto para o LLM

  3. PROVIDER SELECTION
     AIManager.selectProvider()
       -> Filtra providers com capability 'inline-completion'
       -> Usa provider configurado para ghost text

  4. LLM INFERENCE
     Provider.sendRequest() com prompt otimizado
       -> Prompt: "Complete the code at cursor in {language}:\\n{context}\\n{cursor}"
       -> Response: texto de completacao

  5. DEBOUNCE & VALIDATION
     OutputValidator.validate()
       -> Verifica se resposta e segura
       -> Mede confianca (log-probs)
       -> Aplica filtro de extensao

  6. RENDER
     Monaco exibe ghost text
       -> Texto cinza no cursor
       -> Tab para aceitar, ESC para rejeitar

  7. FEEDBACK
     handleDidAcceptCompletion()
       -> Registra aceitacao para aprendizado
       -> Atualiza modelo de preferencias
```

### 6.2 Inline Completion Provider Registration

```typescript
@injectable()
export class IDEIAInlineCompletionProvider implements AIInlineCompletionContribution {
  readonly type = 'inline-completion';
  readonly id = 'ideia-inline-completion';
  readonly name = 'IDEIA Inline Completion';
  readonly label = 'IDEIA Ghost Text';

  @inject(AIManager)
  protected aiManager: AIManager;

  @inject(EditorManager)
  protected editorManager: EditorManager;

  @inject(AIOutputValidator)
  protected outputValidator: AIOutputValidator;

  async provideInlineCompletionItems(context: InlineCompletionContext, token: CancellationToken): Promise<AIInlineCompletionItem[]> {
    if (token.isCancellationRequested) return [];
    const startTime = Date.now();

    const request: AIRequest = {
      id: crypto.randomUUID(),
      model: 'inline-completion',
      messages: [
        { role: 'system', content: this.buildSystemPrompt(context.languageId) },
        { role: 'user', content: this.buildUserPrompt(context) },
      ],
      maxTokens: 128,
      temperature: 0.2,
      context: { languageId: context.languageId, filePath: context.document.uri },
    };

    try {
      const response = await this.aiManager.sendRequest(request);
      const validation = await this.outputValidator.validateInlineCompletion(response.content);
      if (!validation.passed) return [];
      if (Date.now() - startTime > 5000) return [];

      return [{
        text: response.content,
        insertText: response.content,
        providerId: this.id,
        source: 'ideia-ai',
      }];
    } catch {
      return [];
    }
  }

  protected buildSystemPrompt(language: string): string {
    return 'You are an inline code completion assistant for ' + language + '.\n'
      + 'Complete the code at the cursor position. Return ONLY the completion text, no explanations.\n'
      + 'Follow these rules:\n'
      + '- Complete the current line or the next logical line\n'
      + '- Match the existing code style (indentation, naming conventions)\n'
      + '- Do not repeat existing code\n'
      + '- Return empty string if completion is trivial or uncertain\n'
      + '- Maximum 1-2 lines of completion';
  }

  protected buildUserPrompt(context: InlineCompletionContext): string {
    const beforeCursor = context.document.getText(
      new Range(0, 0, context.position.lineNumber, context.position.column)
    );
    const afterCursor = context.document.getText(
      new Range(context.position.lineNumber, context.position.column, context.document.lineCount, 0)
    );

    return 'Language: ' + context.languageId + '\n'
      + 'Current line prefix: "' + context.currentLinePrefix + '"\n'
      + (context.imports ? 'Available imports: ' + context.imports.join(', ') + '\n' : '')
      + '\nCode before cursor:\n```' + context.languageId + '\n' + beforeCursor + '\n```\n'
      + '\nCode after cursor:\n```' + context.languageId + '\n' + afterCursor + '\n```\n'
      + '\nComplete at cursor:';
  }
}
```

### 6.3 Context Gathering for Inline Completion

```typescript
@injectable()
export class CompletionContextGatherer {
  @inject(EditorManager)
  protected editorManager: EditorManager;

  async gatherContext(editor: Editor, position: Position): Promise<CompletionContext> {
    const document = editor.document;
    const languageId = document.languageId;
    const imports = await this.extractImports(document, languageId);

    return {
      languageId,
      imports,
      linePrefix: document.getText(new Range(position.lineNumber, 0, position.lineNumber, position.column)),
      indentation: this.getIndentation(document, position),
      fileUri: document.uri.toString(),
    };
  }

  protected async extractImports(document: TextDocument, language: string): Promise<string[]> {
    const text = document.getText();
    const importPatterns: Record<string, RegExp> = {
      typescript: /^import\s+.*?from\s+['"].*?['"]/gm,
      javascript: /^(import\s+|const\s+\w+\s*=\s*require\()/gm,
      python: /^(import\s+|from\s+)/gm,
      rust: /^use\s+/gm,
      go: /^import\s+/gm,
      java: /^import\s+/gm,
    };

    const pattern = importPatterns[language];
    if (!pattern) return [];

    const imports: string[] = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      imports.push(match[0].trim());
    }
    return imports.slice(0, 20);
  }

  protected getIndentation(document: TextDocument, position: Position): string {
    const line = document.getText(new Range(position.lineNumber, 0, position.lineNumber, position.column));
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }
}

interface CompletionContext {
  languageId: string;
  imports: string[];
  linePrefix: string;
  indentation: string;
  fileUri: string;
}
```

---

## 7. AI Agent as Theia Extension

### 7.1 IDEIA Agent Registration as Theia AI Provider

Agentes IDEIA sao registrados como `AIProvider` no backend e como `AIChatParticipant` no frontend:

```
+-----------------------------------------------------------------+
|                    IDEIA AGENT ARCHITECTURE                        |
|                                                                   |
|  FRONTEND (browser)                       BACKEND (node)          |
|                                                                   |
|  +-----------------------------+    +-------------------------+   |
|  | ChatWidget                  |    | AgentBackendService     |   |
|  |  - participante @analyst    |<-->|  - AgentRouter          |   |
|  |  - participante @architect  |    |  - AgentOrchestrator    |   |
|  |  - participante @programmer |    |  - LangGraphExecutor    |   |
|  |  - participante @reviewer   |    |                         |   |
|  |  - participante @tester     |    |  +-------------------+  |   |
|  |  - participante @devops     |    |  | AIProvider        |  |   |
|  +-----------------------------+    |  | (LLM abstraction) |  |   |
|         |                            |  +-------------------+  |   |
|         v                            +-------------------------+   |
|  +-----------------------------+                                  |
|  | AgentPanelWidget            |                                  |
|  |  - status, output, approval |                                  |
|  +-----------------------------+                                  |
+-----------------------------------------------------------------+
```

### 7.2 Agent Tool Registration

Agentes registram ferramentas que podem ser invocadas durante a execucao:

```typescript
export const AITool = Symbol('AITool');

export interface AITool {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly parameters: AIToolParameter[];
  execute(params: Record<string, unknown>, context: ToolContext): Promise<AIToolResult>;
}

export interface AIToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  enum?: string[];
}

export interface AIToolResult {
  success: boolean;
  content: string;
  data?: Record<string, unknown>;
  error?: string;
}

@injectable()
export class FileReadTool implements AITool {
  readonly id = 'ideia.file.read';
  readonly name = 'Read File';
  readonly description = 'Read the content of a file in the workspace';
  readonly parameters: AIToolParameter[] = [
    { name: 'path', type: 'string', description: 'Relative file path', required: true },
  ];

  @inject(FileService)
  protected fileService: FileService;

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<AIToolResult> {
    try {
      const path = params.path as string;
      const uri = context.workspaceRoot.resolve(path);
      const content = await this.fileService.read(uri);
      return { success: true, content };
    } catch (error) {
      return { success: false, content: '', error: error.message };
    }
  }
}

@injectable()
export class FileWriteTool implements AITool {
  readonly id = 'ideia.file.write';
  readonly name = 'Write File';
  readonly description = 'Create or overwrite a file in the workspace';
  readonly parameters: AIToolParameter[] = [
    { name: 'path', type: 'string', description: 'Relative file path', required: true },
    { name: 'content', type: 'string', description: 'File content', required: true },
  ];

  @inject(FileService)
  protected fileService: FileService;

  @inject(ApprovalService)
  protected approvalService: ApprovalService;

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<AIToolResult> {
    const path = params.path as string;
    const content = params.content as string;
    const approved = await this.approvalService.requestApproval({
      action: 'write-file', resource: path,
      description: 'Write ' + content.length + ' bytes to ' + path,
      user: context.userId, level: 'dev',
    });
    if (!approved) return { success: false, content: '', error: 'Write denied by user' };

    try {
      const uri = context.workspaceRoot.resolve(path);
      await this.fileService.write(uri, content);
      return { success: true, content: 'Written ' + content.length + ' bytes to ' + path };
    } catch (error) {
      return { success: false, content: '', error: error.message };
    }
  }
}

@injectable()
export class SearchTool implements AITool {
  readonly id = 'ideia.search';
  readonly name = 'Search Code';
  readonly description = 'Search for text or patterns in the workspace';
  readonly parameters: AIToolParameter[] = [
    { name: 'pattern', type: 'string', description: 'Search pattern (regex)', required: true },
    { name: 'include', type: 'string', description: 'File glob pattern', required: false },
    { name: 'maxResults', type: 'number', description: 'Maximum results', required: false },
  ];

  @inject(SearchService)
  protected searchService: SearchService;

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<AIToolResult> {
    try {
      const results = await this.searchService.search({
        pattern: params.pattern as string,
        include: params.include as string | undefined,
        maxResults: (params.maxResults as number) ?? 20,
      });
      const content = results.map(r => r.file + ':' + r.line + ': ' + r.text).join('\n');
      return { success: true, content: content || 'No results found', data: { count: results.length } };
    } catch (error) {
      return { success: false, content: '', error: error.message };
    }
  }
}
```

### 7.3 Agent Tool Execution Protocol

```typescript
export interface AgentToolExecutionProtocol {
  executeTool(toolId: string, params: Record<string, unknown>): Promise<AIToolResult>;
  executeToolStream(toolId: string, params: Record<string, unknown>): AsyncIterable<ToolEvent>;
  cancelToolExecution(toolId: string): Promise<void>;
  getToolStatus(toolId: string): ToolStatus;
}

@injectable()
export class AgentToolExecutor implements AgentToolExecutionProtocol {
  @inject(ContributionProvider) @named(AITool)
  protected tools: ContributionProvider<AITool>;

  protected activeExecutions: Map<string, AbortController> = new Map();

  async executeTool(toolId: string, params: Record<string, unknown>): Promise<AIToolResult> {
    const tool = this.tools.getContributions().find(t => t.id === toolId);
    if (!tool) throw new Error('Tool not found: ' + toolId);

    const context: ToolContext = {
      workspaceRoot: await this.getWorkspaceRoot(),
      userId: 'current-user', autonomyLevel: 'N2', sessionId: crypto.randomUUID(),
    };

    const abortController = new AbortController();
    this.activeExecutions.set(toolId, abortController);

    try {
      return await tool.execute(params, context);
    } finally {
      this.activeExecutions.delete(toolId);
    }
  }

  async *executeToolStream(toolId: string, params: Record<string, unknown>): AsyncIterable<ToolEvent> {
    const result = await this.executeTool(toolId, params);
    yield { type: 'result', data: result };
  }

  async cancelToolExecution(toolId: string): Promise<void> {
    const controller = this.activeExecutions.get(toolId);
    if (controller) { controller.abort(); this.activeExecutions.delete(toolId); }
  }

  getToolStatus(toolId: string): ToolStatus {
    const running = this.activeExecutions.has(toolId);
    return { toolId, running, startTime: running ? Date.now() : undefined };
  }

  protected async getWorkspaceRoot(): Promise<URI> {
    return new URI('/workspace');
  }
}
```
---

## 8. AI Context Providers

### 8.1 AIContextProvider Interface

Context providers coletam informacao relevante do ambiente de trabalho para enriquecer requisicoes de IA:

```typescript
export const AIContextProvider = Symbol('AIContextProvider');

export interface AIContextProvider {
  readonly id: string;
  readonly name: string;
  readonly priority: number;
  collect(request: AIRequest): Promise<Record<string, unknown>>;
  collectSync?(request: AIRequest): Record<string, unknown>;
  getTokenCount(context: Record<string, unknown>): number;
}

@injectable()
export abstract class BaseContextProvider implements AIContextProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly priority: number;
  abstract collect(request: AIRequest): Promise<Record<string, unknown>>;

  getTokenCount(context: Record<string, unknown>): number {
    const serialized = JSON.stringify(context);
    return Math.ceil(serialized.length / 4);
  }

  protected truncate(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars) + '\n... [truncated]';
  }
}
```

### 8.2 Context Collection Strategies

```typescript
@injectable()
export class EditorContextProvider extends BaseContextProvider {
  readonly id = 'editor';
  readonly name = 'Editor Context';
  readonly priority = 100;

  @inject(EditorManager)
  protected editorManager: EditorManager;

  async collect(request: AIRequest): Promise<Record<string, unknown>> {
    const editor = this.editorManager.currentEditor;
    if (!editor) return { editor: undefined };

    const doc = editor.document;
    const selection = editor.selection;
    const position = editor.cursorPosition;
    const selectedText = selection ? doc.getText(selection) : undefined;
    const visibleRange = editor.visibleRange;
    const visibleText = visibleRange ? doc.getText(visibleRange) : undefined;

    return {
      editor: {
        uri: doc.uri.toString(),
        languageId: doc.languageId,
        lineCount: doc.lineCount,
        fileName: doc.uri.path.toString().split('/').pop(),
        cursorLine: position.lineNumber,
        cursorColumn: position.column,
        selectedText: selectedText ? this.truncate(selectedText, 4000) : undefined,
        visibleText: visibleText ? this.truncate(visibleText, 8000) : undefined,
        isDirty: doc.isDirty,
      },
    };
  }
}

@injectable()
export class WorkspaceContextProvider extends BaseContextProvider {
  readonly id = 'workspace';
  readonly name = 'Workspace Context';
  readonly priority = 80;

  @inject(WorkspaceService)
  protected workspaceService: WorkspaceService;

  async collect(request: AIRequest): Promise<Record<string, unknown>> {
    const roots = await this.workspaceService.roots;
    const workspaceName = this.workspaceService.workspace?.name;

    return {
      workspace: {
        name: workspaceName ?? 'untitled',
        rootCount: roots.length,
        roots: roots.map(r => r.path.toString()),
      },
    };
  }
}

@injectable()
export class DiagnosticsContextProvider extends BaseContextProvider {
  readonly id = 'diagnostics';
  readonly name = 'Diagnostics Context';
  readonly priority = 60;

  @inject(DiagnosticManager)
  protected diagnosticManager: DiagnosticManager;

  async collect(request: AIRequest): Promise<Record<string, unknown>> {
    const currentUri = request.context?.editor
      ? (request.context.editor as { uri?: string }).uri
      : undefined;

    const allDiagnostics = currentUri ? this.diagnosticManager.getDiagnostics(currentUri) : [];
    const errors = allDiagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
    const warnings = allDiagnostics.filter(d => d.severity === DiagnosticSeverity.Warning);

    return {
      diagnostics: {
        totalCount: allDiagnostics.length,
        errorCount: errors.length,
        warningCount: warnings.length,
        errors: errors.slice(0, 10).map(d => ({ message: d.message, line: d.range.start.line })),
        warnings: warnings.slice(0, 10).map(d => ({ message: d.message, line: d.range.start.line })),
      },
    };
  }
}

@injectable()
export class GitContextProvider extends BaseContextProvider {
  readonly id = 'git';
  readonly name = 'Git Context';
  readonly priority = 40;

  @inject(GitRepositoryManager)
  protected gitRepositoryManager: GitRepositoryManager;

  async collect(request: AIRequest): Promise<Record<string, unknown>> {
    try {
      const repo = this.gitRepositoryManager.currentRepository;
      if (!repo) return { git: undefined };

      const status = await repo.status();
      const branch = await repo.branch();
      const log = await repo.log({ maxCount: 10 });

      return {
        git: {
          branch: branch.name,
          isDirty: status.changedFiles.length > 0,
          modifiedFiles: status.changedFiles.filter(f => f.status === 'modified').map(f => f.uri),
          recentCommits: log.map(c => ({ message: c.message.split('\n')[0], author: c.author })),
        },
      };
    } catch {
      return { git: undefined };
    }
  }
}

@injectable()
export class FileContextProvider extends BaseContextProvider {
  readonly id = 'files';
  readonly name = 'Related Files Context';
  readonly priority = 20;

  @inject(FileService)
  protected fileService: FileService;

  async collect(request: AIRequest): Promise<Record<string, unknown>> {
    const currentEditor = request.context?.editor as { uri?: string } | undefined;
    if (!currentEditor?.uri) return { files: undefined };

    const relatedFiles = await this.findRelatedFiles(currentEditor.uri);
    const fileContents: Record<string, string> = {};
    let totalChars = 0;

    for (const uri of relatedFiles) {
      if (totalChars >= 15000) break;
      try {
        const content = await this.fileService.read(new URI(uri));
        const truncated = this.truncate(content, 5000);
        fileContents[uri.split('/').pop() ?? uri] = truncated;
        totalChars += truncated.length;
      } catch {
        // Skip unreadable files
      }
    }

    return { files: fileContents };
  }

  protected async findRelatedFiles(currentUri: string): Promise<string[]> {
    const parts = currentUri.split('/');
    const dir = parts.slice(0, -1).join('/');
    const currentName = parts[parts.length - 1];

    try {
      const entries = await this.fileService.resolve(new URI(dir));
      return entries
        .filter(e => e.isFile)
        .map(e => dir + '/' + e.name)
        .filter(u => !u.endsWith(currentName))
        .slice(0, 5);
    } catch {
      return [];
    }
  }
}
```

### 8.3 Context Prioritization

```typescript
export class ContextAggregator {
  @inject(ContributionProvider) @named(AIContextProvider)
  protected providers: ContributionProvider<AIContextProvider>;

  async buildContext(request: AIRequest, maxTokens: number): Promise<Record<string, unknown>> {
    const sortedProviders = this.providers.getContributions().sort((a, b) => b.priority - a.priority);
    const context: Record<string, unknown> = {};
    let totalTokens = 0;

    for (const provider of sortedProviders) {
      if (totalTokens >= maxTokens) break;
      const providerContext = await provider.collect(request);
      const tokens = provider.getTokenCount(providerContext);

      if (totalTokens + tokens <= maxTokens) {
        Object.assign(context, providerContext);
        totalTokens += tokens;
      } else {
        const remaining = maxTokens - totalTokens;
        const ratio = remaining / tokens;
        Object.assign(context, this.truncateContext(providerContext, ratio));
        break;
      }
    }

    return context;
  }

  protected truncateContext(context: Record<string, unknown>, ratio: number): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string') {
        result[key] = value.slice(0, Math.floor(value.length * ratio));
      } else if (Array.isArray(value)) {
        result[key] = value.slice(0, Math.floor(value.length * ratio));
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
```

---

## 9. AI Code Actions

### 9.1 AI-Powered Code Actions

Code actions com suporte a IA sao registrados como `AICodeActionContribution`:

```typescript
export const AICodeActionContribution = Symbol('AICodeActionContribution');

export interface AICodeActionContribution extends AIContribution {
  readonly type: 'code-action';
  readonly kind: string;
  readonly label: string;
  readonly isAI: true;
  provideCodeActions(context: CodeActionContext, token: CancellationToken): Promise<CodeAction[]>;
  resolveCodeAction?(codeAction: CodeAction, token: CancellationToken): Promise<CodeAction>;
}

export const AI_CODE_ACTION_KINDS = {
  REFACTOR: 'refactor.ai',
  EXPLAIN: 'explain.ai',
  GENERATE_TEST: 'test.generate.ai',
  FIX: 'quickfix.ai',
  OPTIMIZE: 'optimize.ai',
  DOCUMENT: 'document.ai',
} as const;
```

### 9.2 Code Action Implementations

```typescript
@injectable()
export class AIRefactorCodeAction implements AICodeActionContribution {
  readonly type = 'code-action';
  readonly id = 'ideia.refactor';
  readonly name = 'AI Refactor';
  readonly label = 'Refactor with AI';
  readonly kind = 'refactor.ai';
  readonly isAI = true;

  @inject(AIManager)
  protected aiManager: AIManager;

  async provideCodeActions(context: CodeActionContext, token: CancellationToken): Promise<CodeAction[]> {
    if (!context.selectedText || context.selectedText.length < 10) return [];

    return [{
      title: 'Refactor with AI',
      kind: this.kind,
      isAI: true,
      command: { id: 'ideia.agent.refactor', title: 'Refactor with AI', arguments: [context.document.uri, context.selectionRange] },
      diagnostics: context.diagnostics?.length ? context.diagnostics : undefined,
    }];
  }
}

@injectable()
export class AIExplainCodeAction implements AICodeActionContribution {
  readonly type = 'code-action';
  readonly id = 'ideia.explain';
  readonly name = 'AI Explain';
  readonly label = 'Explain Code';
  readonly kind = 'explain.ai';
  readonly isAI = true;

  async provideCodeActions(context: CodeActionContext, token: CancellationToken): Promise<CodeAction[]> {
    if (!context.selectedText) return [];
    return [{
      title: 'Explain Code', kind: this.kind, isAI: true,
      command: { id: 'ideia.agent.explain', title: 'Explain Code', arguments: [context.document.uri, context.selectionRange] },
    }];
  }
}

@injectable()
export class AIGenerateTestCodeAction implements AICodeActionContribution {
  readonly type = 'code-action';
  readonly id = 'ideia.generateTest';
  readonly name = 'AI Generate Test';
  readonly label = 'Generate Test';
  readonly kind = 'test.generate.ai';
  readonly isAI = true;

  async provideCodeActions(context: CodeActionContext, token: CancellationToken): Promise<CodeAction[]> {
    if (!context.selectedText) return [];
    return [{
      title: 'Generate Test', kind: this.kind, isAI: true,
      command: { id: 'ideia.agent.generateTest', title: 'Generate Test', arguments: [context.document.uri, context.selectionRange] },
    }];
  }
}

@injectable()
export class AIFixCodeAction implements AICodeActionContribution {
  readonly type = 'code-action';
  readonly id = 'ideia.fix';
  readonly name = 'AI Fix';
  readonly label = 'Fix with AI';
  readonly kind = 'quickfix.ai';
  readonly isAI = true;

  async provideCodeActions(context: CodeActionContext, token: CancellationToken): Promise<CodeAction[]> {
    if (!context.diagnostics?.length) return [];

    return context.diagnostics.filter(d => d.severity === 'error').map(diagnostic => ({
      title: 'Fix: ' + diagnostic.message.slice(0, 60),
      kind: this.kind, isAI: true, diagnostics: [diagnostic],
      command: { id: 'ideia.agent.fix', title: 'Fix with AI', arguments: [context.document.uri, diagnostic] },
    }));
  }
}
```

### 9.3 Code Action Integration with Monaco

```typescript
@injectable()
export class AICodeActionProvider implements MonacoContribution {
  @inject(ContributionProvider) @named(AICodeActionContribution)
  protected aiCodeActions: ContributionProvider<AICodeActionContribution>;

  @inject(MonacoEditorService)
  protected monacoEditorService: MonacoEditorService;

  @postConstruct()
  protected init(): void {
    this.monacoEditorService.registerCodeActionProvider('*', {
      provideCodeActions: async (model, range, context, token) => {
        const editorContext = this.buildContext(model, range, context);
        const actions: CodeAction[] = [];

        for (const contribution of this.aiCodeActions.getContributions()) {
          if (token.isCancellationRequested) break;
          const result = await contribution.provideCodeActions(editorContext, token);
          actions.push(...result);
        }

        return { actions };
      },
      resolveCodeAction: async (codeAction, token) => {
        if (codeAction.isAI) {
          for (const contribution of this.aiCodeActions.getContributions()) {
            if (contribution.resolveCodeAction) {
              const resolved = await contribution.resolveCodeAction(codeAction, token);
              if (resolved) return resolved;
            }
          }
        }
        return codeAction;
      },
    });
  }

  protected buildContext(model: monaco.editor.ITextModel, range: monaco.Range, context: monaco.languages.CodeActionContext): CodeActionContext {
    return {
      document: { uri: model.uri.toString(), languageId: model.getLanguageId(), getText: (r?: monaco.Range) => model.getValueInRange(r ?? range) },
      selectionRange: range,
      selectedText: model.getValueInRange(range),
      diagnostics: context.markers.map(m => ({
        message: m.message, severity: m.severity === monaco.MarkerSeverity.Error ? 'error' : 'warning', range: m, code: m.code?.toString(),
      })),
    };
  }
}
```

---

## 10. AI Agent Interaction Widget

### 10.1 Custom Widget for Agent Interaction (IDEIA Agent Panel)

O AgentPanelWidget e um widget Theia que fornece uma interface dedicada para interacao com agentes IDEIA:

```
+----------------------------------------------------+
| IDEIA Agent Panel                          [_][O] |
+----------------------------------------------------+
| [@analyst ][@architect][@programmer]                |
| [@reviewer][@tester   ][@devops   ]                |
+----------------------------------------------------+
| Status: [=====--------------------] 30%             |
| Agent: @programmer implementing UserController      |
+----------------------------------------------------+
| [OUTPUT]                                            |
|                                                     |
| > Analysing src/controller/UserController.ts...     |
| > Identified 3 endpoints:                           |
|   - GET /api/users                                  |
|   - POST /api/users                                 |
|   - GET /api/users/:id                              |
| > Generating controller implementation...           |
| > File written: src/controller/UserController.ts    |
| > Creating test file...                             |
| > Test file: tests/UserController.test.ts           |
|                                                     |
+----------------------------------------------------+
| [WORKING DIRECTORY]                                 |
| src/controller/                                     |
+----------------------------------------------------+
| >> implement REST controller for User resource     |
| [Send] [Stop] [Approve] [Reject]                   |
+----------------------------------------------------+
```

### 10.2 Agent Widget Implementation

```typescript
import { BaseWidget, Panel, Widget, Message, codicon } from '@theia/core/lib/browser';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import * as React from '@theia/core/shared/react';

@injectable()
export class AgentPanelWidget extends ReactWidget {
  static ID = 'ideia.agent-panel';
  static LABEL = 'IDEIA Agent Panel';

  @inject(AIManager)
  protected aiManager: AIManager;

  @inject(AgentRouter)
  protected agentRouter: AgentRouter;

  @inject(OutputChannelManager)
  protected outputChannelManager: OutputChannelManager;

  protected activeAgent: string = 'programmer';
  protected status: AgentStatus = 'idle';
  protected progress: number = 0;
  protected output: AgentOutputEntry[] = [];
  protected inputValue: string = '';

  constructor() {
    super();
    this.id = AgentPanelWidget.ID;
    this.title.label = AgentPanelWidget.LABEL;
    this.title.closable = true;
    this.title.icon = codicon('robot');
    this.node.style.overflow = 'auto';
  }

  protected render(): React.ReactNode {
    return React.createElement('div', { className: 'ideia-agent-panel' },
      this.renderAgentSelector(),
      this.renderStatusBar(),
      this.renderOutput(),
      this.renderInputField(),
    );
  }

  protected renderAgentSelector(): React.ReactNode {
    const agents = ['analyst', 'architect', 'programmer', 'reviewer', 'tester', 'devops'];
    return React.createElement('div', { className: 'agent-selector' },
      agents.map(agent =>
        React.createElement('button', { key: agent, className: 'agent-btn ' + (agent === this.activeAgent ? 'active' : ''), onClick: () => this.selectAgent(agent) }, '@' + agent)
      ),
    );
  }

  protected renderStatusBar(): React.ReactNode {
    const statusLabels: Record<string, string> = { idle: 'Ready', running: 'Running', completed: 'Completed', error: 'Error', awaiting_approval: 'Awaiting Approval' };

    return React.createElement('div', { className: 'agent-status-bar' },
      React.createElement('div', { className: 'status-indicator ' + this.status }),
      React.createElement('span', { className: 'status-label' }, statusLabels[this.status] ?? this.status),
      this.status === 'running'
        ? React.createElement('div', { className: 'progress-bar' },
            React.createElement('div', { className: 'progress-fill', style: { width: this.progress + '%' } }),
          )
        : null,
    );
  }

  protected renderOutput(): React.ReactNode {
    return React.createElement('div', { className: 'agent-output' },
      this.output.map((entry, i) =>
        React.createElement('div', { key: i, className: 'output-entry output-' + entry.level }, entry.text),
      ),
    );
  }

  protected renderInputField(): React.ReactNode {
    return React.createElement('div', { className: 'agent-input' },
      React.createElement('input', {
        type: 'text', className: 'theia-input',
        placeholder: 'Message @' + this.activeAgent + '...',
        value: this.inputValue,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => { this.inputValue = e.target.value; },
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); this.sendMessage(); } },
      }),
      React.createElement('button', { className: 'theia-button primary', onClick: () => this.sendMessage(), disabled: this.status === 'running' }, 'Send'),
      this.status === 'running'
        ? React.createElement('button', { className: 'theia-button secondary', onClick: () => this.stopAgent() }, 'Stop')
        : null,
    );
  }

  protected selectAgent(agent: string): void { this.activeAgent = agent; this.update(); }

  protected async sendMessage(): Promise<void> {
    const message = this.inputValue;
    if (!message.trim()) return;

    this.inputValue = '';
    this.addOutput('> @' + this.activeAgent + ' ' + message, 'info');
    this.status = 'running';
    this.progress = 0;
    this.update();

    try {
      const agent = this.agentRouter.route(this.activeAgent);
      if (!agent) {
        this.addOutput('Error: Agent @' + this.activeAgent + ' not found', 'error');
        this.status = 'error';
        this.update();
        return;
      }

      const result = await agent.execute({
        command: '', input: message,
        onProgress: (percent: number, msg: string) => { this.progress = percent; this.addOutput(msg, 'progress'); this.update(); },
      });

      if (result.type === 'error') { this.addOutput('Error: ' + result.message, 'error'); this.status = 'error'; }
      else { this.addOutput(result.summary, 'success'); this.status = 'completed'; }
    } catch (error) { this.addOutput('Error: ' + error.message, 'error'); this.status = 'error'; }

    this.update();
  }

  protected addOutput(text: string, level: AgentOutputLevel): void {
    this.output.push({ text, level, timestamp: Date.now() });
    if (this.output.length > 200) { this.output = this.output.slice(-100); }
  }
}

type AgentStatus = 'idle' | 'running' | 'completed' | 'error' | 'awaiting_approval';
type AgentOutputLevel = 'info' | 'progress' | 'success' | 'warning' | 'error';
interface AgentOutputEntry { text: string; level: AgentOutputLevel; timestamp: number; }
```

### 10.3 Agent Communication Protocol

```typescript
export interface AgentCommunicationProtocol {
  execute(params: ExecuteParams): Promise<ExecuteResult>;
  cancel(executionId: string): Promise<void>;
  getStatus(executionId: string): Promise<ExecutionStatus>;
  requestApproval(approval: ApprovalRequest): Promise<ApprovalResponse>;
  onProgress(callback: (progress: ProgressEvent) => void): void;
  onOutput(callback: (output: OutputEvent) => void): void;
  onToolCall(callback: (toolCall: ToolCallEvent) => void): void;
  onApprovalRequired(callback: (approval: ApprovalRequest) => void): void;
  onError(callback: (error: ErrorEvent) => void): void;
  onComplete(callback: (result: ExecuteResult) => void): void;
}

export interface ExecuteParams { agentId: string; command: string; input: string; sessionId: string; context?: Record<string, unknown>; }
export interface ExecuteResult { success: boolean; summary: string; output: string[]; files?: string[]; executionTime: number; }
export interface ExecutionStatus { executionId: string; status: 'running' | 'completed' | 'failed' | 'cancelled'; progress: number; currentStep: string; startedAt: number; completedAt?: number; }
export interface ApprovalRequest { id: string; action: string; resource: string; description: string; level: 'dev' | 'tech-lead' | 'security'; }
export interface ApprovalResponse { approved: boolean; approvedBy?: string; comment?: string; timestamp: number; }
```

### 10.4 Agent Approval Workflow

```typescript
@injectable()
export class AgentApprovalService {
  @inject(AgentPanelWidget)
  protected agentPanel: AgentPanelWidget;

  @inject(AuditTrail)
  protected auditTrail: AuditTrail;

  protected pendingApprovals: Map<string, ApprovalRequest> = new Map();

  async requestApproval(request: ApprovalRequest): Promise<ApprovalResponse> {
    this.pendingApprovals.set(request.id, request);
    this.agentPanel.setStatus('awaiting_approval');

    const response = await this.waitForUserResponse(request.id);
    this.pendingApprovals.delete(request.id);

    await this.auditTrail.record({
      type: 'approval', action: request.action, resource: request.resource,
      approved: response.approved, approvedBy: response.approvedBy, timestamp: response.timestamp,
    });

    return response;
  }

  protected waitForUserResponse(requestId: string): Promise<ApprovalResponse> {
    return new Promise(resolve => {
      this.agentPanel.showApprovalDialog(requestId, resolve);
    });
  }

  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values());
  }
}
```
---

## 11. AI Agent as Theia Command

### 11.1 Agent Command Registration

Agentes sao expostos como comandos Theia que podem ser invocados pelo palette de comandos:

```typescript
@injectable()
export class AgentCommandContribution implements CommandContribution {
  @inject(AgentRouter)
  protected agentRouter: AgentRouter;

  @inject(AIManager)
  protected aiManager: AIManager;

  @inject(MessageService)
  protected messageService: MessageService;

  @inject(EditorManager)
  protected editorManager: EditorManager;

  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(AICommands.ANALYSE, { execute: async () => this.runAgentCommand('analyst', 'analyse') });
    registry.registerCommand(AICommands.ARCHITECT, { execute: async () => this.runAgentCommand('architect', 'design') });
    registry.registerCommand(AICommands.IMPLEMENT, { execute: async () => this.runAgentCommand('programmer', 'implement') });
    registry.registerCommand(AICommands.REVIEW, { execute: async () => this.runAgentCommand('reviewer', 'review') });
    registry.registerCommand(AICommands.EXPLAIN, { execute: async () => this.runAgentCommand('analyst', 'explain') });
    registry.registerCommand(AICommands.GENERATE_TEST, { execute: async () => this.runAgentCommand('tester', 'generate') });
    registry.registerCommand(AICommands.FIX, { execute: async () => this.runAgentCommand('programmer', 'fix') });
    registry.registerCommand(AICommands.DEPLOY, { execute: async () => this.runAgentCommand('devops', 'deploy') });
  }

  protected async runAgentCommand(agentId: string, command: string): Promise<void> {
    const editor = this.editorManager.currentEditor;
    const selection = editor?.selection;
    const selectedText = selection ? editor.document.getText(selection) : undefined;

    this.messageService.info('Running @' + agentId + ' ' + command + '...');

    try {
      const agent = this.agentRouter.route(agentId);
      if (!agent) { this.messageService.error('Agent @' + agentId + ' not found'); return; }

      const result = await agent.execute({
        command, input: selectedText ?? '',
        context: { editor: editor ? { uri: editor.document.uri.toString(), languageId: editor.document.languageId } : undefined },
        onProgress: (percent, msg) => {},
      });

      if (result.type === 'error') { this.messageService.error(result.message); }
      else { this.messageService.info(result.summary); }
    } catch (error) { this.messageService.error('Agent error: ' + error.message); }
  }
}
```

### 11.2 Command with AI Backend

```typescript
@injectable()
export class AIBackendCommandHandler {
  @inject(AIManager)
  protected aiManager: AIManager;

  @inject(AgentOrchestrator)
  protected orchestrator: AgentOrchestrator;

  async handleAgentCommand(agentId: string, command: string, input: string, context: Record<string, unknown>): Promise<AgentCommandResult> {
    const request: AIRequest = {
      id: crypto.randomUUID(),
      model: agentId,
      messages: [
        { role: 'system', content: this.agentSystemPrompt(agentId, command) },
        { role: 'user', content: this.buildAgentPrompt(agentId, command, input, context) },
      ],
      tools: this.getAgentTools(agentId),
      maxTokens: 4096,
      temperature: 0.3,
      context,
    };

    const response = await this.aiManager.sendRequest(request);

    if (response.toolCalls?.length) {
      return this.handleToolCalls(agentId, response.toolCalls, context);
    }

    return { success: true, summary: response.content, output: [response.content], executionTime: response.latency };
  }

  protected async handleToolCalls(agentId: string, toolCalls: AIToolCall[], context: Record<string, unknown>): Promise<AgentCommandResult> {
    const outputs: string[] = [];
    for (const call of toolCalls) {
      const result = await this.orchestrator.executeTool(agentId, call);
      outputs.push(result.content);
    }
    return { success: true, summary: outputs.join('\n'), output: outputs, executionTime: 0 };
  }

  protected agentSystemPrompt(agentId: string, command: string): string {
    const prompts: Record<string, Record<string, string>> = {
      analyst: { analyse: 'Analyse the provided code and identify patterns, issues, and improvement opportunities.', explain: 'Explain the provided code in simple terms.' },
      programmer: { implement: 'Implement the requested feature based on the specification.', fix: 'Fix the issue in the provided code.' },
    };
    return prompts[agentId]?.[command] ?? 'You are an AI assistant for ' + agentId + ' doing ' + command + '.';
  }

  protected buildAgentPrompt(agentId: string, command: string, input: string, context: Record<string, unknown>): string {
    let prompt = 'Task: ' + command + '\n\n';
    if (input) prompt += 'Input:\n```\n' + input + '\n```\n\n';
    if (context.editor) {
      const editor = context.editor as { uri?: string; languageId?: string };
      prompt += 'File: ' + (editor.uri ?? 'unknown') + '\nLanguage: ' + (editor.languageId ?? 'unknown') + '\n\n';
    }
    prompt += 'Provide your response. Use tools when necessary to read or write files.';
    return prompt;
  }

  protected getAgentTools(agentId: string): AIToolDefinition[] {
    const commonTools: AIToolDefinition[] = [{ name: 'read_file', description: 'Read a file' }, { name: 'search_code', description: 'Search codebase' }];
    const writeTools = (agentId === 'programmer' || agentId === 'tester') ? [{ name: 'write_file', description: 'Write a file' }] : [];
    const gitTools = agentId === 'devops' ? [{ name: 'git_commit', description: 'Commit changes' }] : [];
    return [...commonTools, ...writeTools, ...gitTools];
  }
}

export interface AgentCommandResult { success: boolean; summary: string; output: string[]; filesCreated?: string[]; filesModified?: string[]; executionTime: number; }
```

### 11.3 Command Progress Reporting

```typescript
@injectable()
export class CommandProgressService {
  @inject(MessageService)
  protected messageService: MessageService;

  protected activeProgress: Map<string, { report: { report: (data: { message?: string; work?: { done: number; total: number } }) => void }; currentStep: number; totalSteps: number; startTime: number }> = new Map();

  async startProgress(commandId: string, title: string, totalSteps: number): Promise<void> {
    const report = await this.messageService.showProgress({ text: title, options: { cancelable: true } });
    this.activeProgress.set(commandId, { report, currentStep: 0, totalSteps, startTime: Date.now() });
  }

  reportProgress(commandId: string, step: number, message: string): void {
    const progress = this.activeProgress.get(commandId);
    if (!progress) return;
    progress.currentStep = step;
    progress.report.report({ message, work: { done: step, total: progress.totalSteps } });
  }

  completeProgress(commandId: string, message: string): void {
    const progress = this.activeProgress.get(commandId);
    if (!progress) return;
    progress.report.report({ message, work: { done: progress.totalSteps, total: progress.totalSteps } });
    this.activeProgress.delete(commandId);
  }

  failProgress(commandId: string, error: string): void {
    const progress = this.activeProgress.get(commandId);
    if (!progress) return;
    progress.report.report({ message: 'Failed: ' + error });
    this.activeProgress.delete(commandId);
  }
}
```

---

## 12. Workspace-wide AI Features

### 12.1 AI Search Enhancement

```typescript
@injectable()
export class AISearchEnhancement {
  @inject(AIManager)
  protected aiManager: AIManager;

  @inject(SearchService)
  protected searchService: SearchService;

  async enhanceSearchResults(query: string, results: SearchResult[]): Promise<SearchResult[]> {
    if (results.length === 0) return results;

    const request: AIRequest = {
      id: crypto.randomUUID(), model: 'search-enhancer',
      messages: [
        { role: 'system', content: 'You rank search results by relevance. Return the indices of the top 5 results in order of relevance, one per line.' },
        { role: 'user', content: 'Query: "' + query + '"\n\nResults:\n' + results.map((r, i) => i + ': ' + r.file + ':' + r.line + ': ' + r.text).join('\n') },
      ],
      maxTokens: 50, temperature: 0.1,
    };

    try {
      const response = await this.aiManager.sendRequest(request);
      const indices = response.content.split('\n').map(l => l.trim()).filter(l => /^\d+$/.test(l)).map(Number);
      return indices.filter(i => i >= 0 && i < results.length).map(i => ({ ...results[i], relevanceScore: 1 - (i * 0.2) }));
    } catch { return results; }
  }

  async generateSearchSummary(query: string, results: SearchResult[]): Promise<string> {
    if (results.length === 0) return 'No results found.';
    const request: AIRequest = {
      id: crypto.randomUUID(), model: 'search-summarizer',
      messages: [
        { role: 'system', content: 'Summarise search results in 2-3 sentences. Be concise.' },
        { role: 'user', content: 'Query: "' + query + '"\n\nResults:\n' + results.slice(0, 10).map(r => '- ' + r.file + ':' + r.line + ': ' + r.text).join('\n') },
      ],
      maxTokens: 100, temperature: 0.3,
    };
    try { const response = await this.aiManager.sendRequest(request); return response.content; }
    catch { return 'Found ' + results.length + ' results for "' + query + '".'; }
  }
}
```

### 12.2 AI File Generation

```typescript
@injectable()
export class AIFileGenerator {
  @inject(AIManager)
  protected aiManager: AIManager;

  @inject(FileService)
  protected fileService: FileService;

  async generateFile(path: string, description: string, template?: string): Promise<GenerateFileResult> {
    const request: AIRequest = {
      id: crypto.randomUUID(), model: 'code-generation',
      messages: [
        { role: 'system', content: 'You generate source code files. Generate ONLY the file content, no explanations. Follow the existing code style.' },
        { role: 'user', content: 'Generate a file at "' + path + '" that: ' + description + (template ? '\n\nTemplate:\n```\n' + template + '\n```' : '') + '\nReturn only the file content.' },
      ],
      maxTokens: 4096, temperature: 0.3,
    };

    try {
      const response = await this.aiManager.sendRequest(request);
      const uri = new URI(path);
      await this.fileService.write(uri, response.content);
      return { success: true, path, size: response.content.length, lines: response.content.split('\n').length };
    } catch (error) { return { success: false, path, error: error.message }; }
  }
}

interface GenerateFileResult { success: boolean; path: string; size?: number; lines?: number; error?: string; }
```

### 12.3 AI Project Analysis

```typescript
@injectable()
export class AIProjectAnalysis {
  @inject(AIManager)
  protected aiManager: AIManager;

  @inject(FileService)
  protected fileService: FileService;

  async analyseProject(root: URI): Promise<ProjectAnalysis> {
    const entries = await this.fileService.resolve(root);
    const files = await this.collectSourceFiles(entries, root);
    const fileSummaries = await this.summariseFiles(files);

    const request: AIRequest = {
      id: crypto.randomUUID(), model: 'project-analysis',
      messages: [
        { role: 'system', content: 'Analyse the project structure and provide insights about architecture, patterns, and potential issues.' },
        { role: 'user', content: 'Project structure:\n' + fileSummaries.join('\n') + '\n\nAnalyse:\n1. Overall architecture pattern\n2. Technology stack\n3. Code organisation quality\n4. Potential issues\n5. Improvement suggestions' },
      ],
      maxTokens: 2048, temperature: 0.3,
    };

    const response = await this.aiManager.sendRequest(request);
    return { totalFiles: files.length, analysis: response.content, timestamp: Date.now() };
  }

  protected async collectSourceFiles(entries: FileEntry[], root: URI): Promise<URI[]> {
    const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java'];
    const files: URI[] = [];

    for (const entry of entries) {
      if (entry.isFile) {
        const ext = entry.name.split('.').pop();
        if (ext && sourceExtensions.includes('.' + ext)) files.push(root.resolve(entry.name));
      } else if (entry.isDirectory && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const subEntries = await this.fileService.resolve(root.resolve(entry.name));
        const subFiles = await this.collectSourceFiles(subEntries, root.resolve(entry.name));
        files.push(...subFiles);
      }
    }
    return files.slice(0, 50);
  }

  protected async summariseFiles(files: URI[]): Promise<string[]> {
    const summaries: string[] = [];
    for (const uri of files) {
      try {
        const content = await this.fileService.read(uri);
        const lines = content.split('\n');
        summaries.push(uri.path.toString() + ': ' + lines.length + ' lines');
      } catch {}
    }
    return summaries;
  }
}

interface ProjectAnalysis { totalFiles: number; analysis: string; timestamp: number; }
```

---

## 13. Security & Governance

### 13.1 Theia AI Permission Model

O modelo de permissoes define o que cada agente pode fazer e quais recursos pode acessar:

```
+------------------------------------------------------------------+
|                    THEIA AI PERMISSION MODEL                        |
|                                                                    |
|  NIVEL 0 (N0) - Assistido                                         |
|    Acoes: apenas leitura                                           |
|    Recursos: arquivo atual                                         |
|    Aprovacao: todas as acoes                                       |
|                                                                    |
|  NIVEL 1 (N1) - Supervisionado                                    |
|    Acoes: leitura + sugestoes                                      |
|    Recursos: workspace aberto                                      |
|    Aprovacao: write/delete files                                   |
|                                                                    |
|  NIVEL 2 (N2) - Semi-autonomo                                     |
|    Acoes: leitura + escrita em escopo                              |
|    Recursos: workspace + SDKs                                      |
|    Aprovacao: delete, git push, deploy                             |
|                                                                    |
|  NIVEL 3 (N3) - Autonomo                                           |
|    Acoes: leitura + escrita + execucao                             |
|    Recursos: completo workspace                                    |
|    Aprovacao: apenas acoes criticas (deploy prod)                  |
|                                                                    |
|  NIVEL 4 (N4) - Total                                              |
|    Acoes: todas                                                    |
|    Recursos: todos                                                 |
|    Aprovacao: nenhuma                                              |
|                                                                    |
|  Controle via: AIPermissionManager                                  |
|  Policy: @theia/ai/lib/common/permissions                          |
+------------------------------------------------------------------+
```

```typescript
export interface AIPermission { action: string; resource: string; level: AutonomyLevel; requiresApproval: boolean; }
export type AutonomyLevel = 'N0' | 'N1' | 'N2' | 'N3' | 'N4';

export const DEFAULT_PERMISSIONS: AIPermission[] = [
  { action: 'read:file', resource: 'workspace', level: 'N0', requiresApproval: false },
  { action: 'read:workspace', resource: 'workspace', level: 'N0', requiresApproval: false },
  { action: 'search:code', resource: 'workspace', level: 'N0', requiresApproval: false },
  { action: 'write:file', resource: 'workspace', level: 'N1', requiresApproval: true },
  { action: 'create:file', resource: 'workspace', level: 'N1', requiresApproval: true },
  { action: 'delete:file', resource: 'workspace', level: 'N2', requiresApproval: true },
  { action: 'rename:file', resource: 'workspace', level: 'N1', requiresApproval: true },
  { action: 'execute:command', resource: 'shell', level: 'N2', requiresApproval: true },
  { action: 'git:commit', resource: 'repository', level: 'N2', requiresApproval: true },
  { action: 'git:push', resource: 'repository', level: 'N3', requiresApproval: true },
  { action: 'deploy:development', resource: 'deployment', level: 'N2', requiresApproval: true },
  { action: 'deploy:production', resource: 'deployment', level: 'N3', requiresApproval: true },
  { action: 'modify:configuration', resource: 'ide', level: 'N2', requiresApproval: true },
  { action: 'access:network', resource: 'network', level: 'N3', requiresApproval: true },
  { action: 'install:package', resource: 'system', level: 'N3', requiresApproval: true },
];

@injectable()
export class AIPermissionManager {
  @inject(AIAutonomyConfig)
  protected autonomyConfig: AIAutonomyConfig;

  canExecute(action: string, resource: string, level: AutonomyLevel): boolean {
    const permission = DEFAULT_PERMISSIONS.find(p => p.action === action && p.resource === resource);
    if (!permission) return false;

    const levelOrder: AutonomyLevel[] = ['N0', 'N1', 'N2', 'N3', 'N4'];
    const userLevelIndex = levelOrder.indexOf(level);
    const requiredLevelIndex = levelOrder.indexOf(permission.level);
    return userLevelIndex >= requiredLevelIndex;
  }

  requiresApproval(action: string, resource: string): boolean {
    const permission = DEFAULT_PERMISSIONS.find(p => p.action === action && p.resource === resource);
    return permission?.requiresApproval ?? true;
  }
}
```

### 13.2 User Approval for AI Actions

```typescript
@injectable()
export class AIApprovalFlow {
  @inject(AIPermissionManager)
  protected permissionManager: AIPermissionManager;

  @inject(AIAuditService)
  protected auditService: AIAuditService;

  @inject(MessageService)
  protected messageService: MessageService;

  async requestApproval(action: string, resource: string, agentId: string, context: string): Promise<boolean> {
    const permission = DEFAULT_PERMISSIONS.find(p => p.action === action && p.resource === resource);
    if (!permission || !permission.requiresApproval) return true;

    const result = await this.messageService.showMessage({
      text: 'Agent ' + agentId + ' wants to ' + action + ' on ' + resource + '.\nContext: ' + context,
      type: 'warning',
      actions: [{ label: 'Approve', value: 'approve' }, { label: 'Reject', value: 'reject' }, { label: 'Review Details', value: 'review' }],
    });

    const approved = result === 'approve';
    await this.auditService.record({ type: 'approval', agentId, action, resource, approved, timestamp: Date.now() });
    return approved;
  }
}
```

### 13.3 Agent-Scoped Resource Access

```typescript
export interface AgentResourceScope { type: 'workspace' | 'file' | 'directory' | 'command' | 'network' | 'system'; allow: string[]; deny: string[]; }

@injectable()
export class AgentResourceAccessController {
  @inject(AIPermissionManager)
  protected permissionManager: AIPermissionManager;

  @inject(WorkspaceService)
  protected workspaceService: WorkspaceService;

  async checkAccess(agentId: string, action: string, resourceUri: string, autonomyLevel: AutonomyLevel): Promise<AccessResult> {
    if (!this.permissionManager.canExecute(action, 'file', autonomyLevel)) {
      return { allowed: false, reason: 'Level ' + autonomyLevel + ' cannot ' + action };
    }

    const workspaceRoots = await this.workspaceService.roots;
    const resourceInWorkspace = workspaceRoots.some(root => resourceUri.startsWith(root.toString()));

    if (!resourceInWorkspace) return { allowed: false, reason: 'Resource ' + resourceUri + ' is outside workspace' };

    const sensitivePatterns = [/\.env$/, /\.ssh\//, /credentials/i, /secrets/i, /\.git\//];
    for (const pattern of sensitivePatterns) {
      if (pattern.test(resourceUri) && (action.startsWith('write') || action.startsWith('delete'))) {
        return { allowed: false, reason: 'Cannot ' + action + ' on sensitive resource' };
      }
    }

    return { allowed: true };
  }
}

interface AccessResult { allowed: boolean; reason?: string; }
```

### 13.4 AI Audit Trail

```typescript
@injectable()
export class AIAuditService {
  @inject(ILogger)
  protected logger: ILogger;

  @inject(OutputChannelManager)
  protected outputChannelManager: OutputChannelManager;

  protected auditChannel: OutputChannel;
  protected auditChain: AuditEntry[] = [];

  @postConstruct()
  protected init(): void {
    this.auditChannel = this.outputChannelManager.getChannel('AI Audit');
  }

  async record(entry: AuditEntry): Promise<void> {
    const hash = await this.computeHash(entry);
    const previousHash = this.auditChain.length > 0 ? this.auditChain[this.auditChain.length - 1].hash : '0'.repeat(64);

    const fullEntry: AuditEntry = { ...entry, hash, previousHash, index: this.auditChain.length };
    this.auditChain.push(fullEntry);
    this.auditChannel.appendLine(JSON.stringify(fullEntry));
    this.logger.info('AI Audit: ' + entry.type + ' by ' + entry.agentId + ' - ' + entry.action);
  }

  async recordError(request: AIRequest, error: Error): Promise<void> {
    await this.record({ type: 'error', agentId: request.model, action: 'ai-request', resource: request.id, timestamp: Date.now(), metadata: { error: error.message } });
  }

  async verifyChain(): Promise<boolean> {
    for (let i = 0; i < this.auditChain.length; i++) {
      const entry = this.auditChain[i];
      const computedHash = await this.computeHash(entry);
      if (entry.hash !== computedHash) return false;
      if (i > 0 && entry.previousHash !== this.auditChain[i - 1].hash) return false;
    }
    return true;
  }

  protected async computeHash(entry: Omit<AuditEntry, 'hash' | 'previousHash' | 'index'>): Promise<string> {
    const data = new TextEncoder().encode(JSON.stringify(entry));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

interface AuditEntry { type: string; agentId: string; action: string; resource: string; timestamp: number; metadata?: Record<string, unknown>; hash?: string; previousHash?: string; index?: number; }
```

### 13.5 Output Validation

```typescript
@injectable()
export class AIOutputValidator {
  protected readonly dangerousPatterns: RegExp[] = [/process\.env/i, /fs\.rmSync/i, /child_process/i, /exec\(/i, /eval\(/i, /Function\(/i, /require\('child/i];
  protected readonly secretPatterns: RegExp[] = [/(?:api[_-]?key|apikey|secret|token|password).*?['\"][A-Za-z0-9_\-]{16,}['\"]/i, /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/, /sk-[A-Za-z0-9]{32,}/, /AKIA[0-9A-Z]{16}/];
  protected readonly blockedExtensions: string[] = ['.exe', '.dll', '.so', '.dylib', '.bat', '.cmd', '.ps1', '.sh'];

  async validate(request: AIRequest): Promise<{ passed: boolean; reason?: string }> {
    const lastMessage = request.messages[request.messages.length - 1];
    if (!lastMessage) return { passed: true };

    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(lastMessage.content)) return { passed: false, reason: 'User message contains dangerous pattern' };
    }
    return { passed: true };
  }

  async validateInlineCompletion(content: string): Promise<{ passed: boolean; reason?: string }> {
    if (content.length > 500) return { passed: false, reason: 'Completion too long' };
    if (this.blockedExtensions.some(ext => content.includes(ext))) return { passed: false, reason: 'Blocked extension in completion' };
    return { passed: true };
  }

  async validateResponse(response: AIResponse): Promise<{ passed: boolean; reason?: string }> {
    for (const pattern of this.secretPatterns) {
      if (pattern.test(response.content)) return { passed: false, reason: 'AI response contains potential secrets' };
    }
    if (response.content.length > 50000) return { passed: false, reason: 'Response exceeds maximum length' };
    return { passed: true };
  }
}
```
---

## 14. Code Examples

### 14.1 AI Provider Registration as Theia Contribution

```typescript
import { AIProvider, AIProviderConfiguration, AIRequest, AIResponse, AIStreamCallback, AICapability } from '@theia/ai-core/lib/common';
import { injectable, postConstruct } from '@theia/core/shared/inversify';

@injectable()
export class IDEIAProvider implements AIProvider {
  readonly id = 'ideia';
  readonly name = 'IDEIA AI';
  readonly provider = 'ollama';
  readonly model = 'ideia-model';
  readonly capabilities: AICapability[] = ['chat', 'inline-completion', 'code-generation', 'tool-use'];

  protected config: AIProviderConfiguration = { baseUrl: 'http://localhost:11434', model: 'llama3', maxTokens: 4096, temperature: 0.7, topP: 0.9, timeout: 30000, retryCount: 3 };

  canHandle(request: AIRequest): boolean {
    return request.model.startsWith('ideia') || request.model === 'chat' || request.model === 'inline-completion';
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    const response = await fetch(this.config.baseUrl + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model, messages: request.messages, stream: false,
        options: { num_predict: request.maxTokens ?? this.config.maxTokens, temperature: request.temperature ?? this.config.temperature },
      }),
    });

    if (!response.ok) throw new Error('Provider error: ' + response.status);
    const data = await response.json();

    return {
      id: crypto.randomUUID(), requestId: request.id,
      content: data.message?.content ?? '',
      finishReason: data.done ? 'stop' : 'length',
      usage: data.prompt_eval_count ? { promptTokens: data.prompt_eval_count, completionTokens: data.eval_count } : undefined,
      latency: 0,
    };
  }

  async sendStreamRequest(request: AIRequest, callback: AIStreamCallback): Promise<void> {
    const response = await fetch(this.config.baseUrl + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model, messages: request.messages, stream: true,
        options: { num_predict: request.maxTokens ?? this.config.maxTokens, temperature: request.temperature ?? this.config.temperature },
      }),
    });

    if (!response.ok) { callback.onError(new Error('Stream error: ' + response.status)); return; }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { callback.onChunk({ type: 'content', content: '', done: true }); break; }

        const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            callback.onChunk({ type: 'content', content: data.message?.content ?? '', done: data.done ?? false });
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (error) { callback.onError(error); }
  }

  getConfiguration(): AIProviderConfiguration { return { ...this.config }; }
  configure(config: Partial<AIProviderConfiguration>): void { Object.assign(this.config, config); }
  async ping(): Promise<boolean> { try { const response = await fetch(this.config.baseUrl + '/api/tags'); return response.ok; } catch { return false; } }
}
```

```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { AIProvider, AIContextProvider, AITool } from '@theia/ai-core/lib/common';
import { IDEIAProvider } from './ideia-provider';
import { EditorContextProvider, WorkspaceContextProvider, DiagnosticsContextProvider, GitContextProvider } from './context-providers';
import { FileReadTool, FileWriteTool, SearchTool } from './tools';

export default new ContainerModule(bind => {
  bind(AIProvider).to(IDEIAProvider).inSingletonScope();
  bind(AIContextProvider).to(EditorContextProvider).inSingletonScope();
  bind(AIContextProvider).to(WorkspaceContextProvider).inSingletonScope();
  bind(AIContextProvider).to(DiagnosticsContextProvider).inSingletonScope();
  bind(AIContextProvider).to(GitContextProvider).inSingletonScope();
  bind(AITool).to(FileReadTool).inSingletonScope();
  bind(AITool).to(FileWriteTool).inSingletonScope();
  bind(AITool).to(SearchTool).inSingletonScope();
});
```

### 14.2 Inline Completion Provider in Theia

```typescript
import { AIInlineCompletionProvider } from '@theia/ai-core/lib/browser/ai-inline-completion';
import { AIContribution } from '@theia/ai-core/lib/common';
import { injectable, inject } from '@theia/core/shared/inversify';
import { EditorManager } from '@theia/editor/lib/browser';
import { CancellationToken } from '@theia/core/lib/common';

@injectable()
export class IDEIAInlineCompletion implements AIContribution {
  readonly id = 'ideia.inline-completion';
  readonly name = 'IDEIA Inline Completion';
  readonly type = 'inline-completion';
  readonly label = 'IDEIA Ghost Text';

  @inject(EditorManager)
  protected editorManager: EditorManager;

  @inject(AIInlineCompletionProvider)
  protected inlineCompletionProvider: AIInlineCompletionProvider;

  @postConstruct()
  protected init(): void {
    this.inlineCompletionProvider.registerInlineCompletionProvider({
      id: 'ideia-ghost',
      displayName: 'IDEIA',
      provideInlineCompletionItems: async (model, position, context, token) => {
        if (token.isCancellationRequested) return { items: [] };
        const editor = this.editorManager.currentEditor;
        if (!editor) return { items: [] };

        const linePrefix = model.getValueInRange({
          startLineNumber: position.lineNumber, startColumn: 1,
          endLineNumber: position.lineNumber, endColumn: position.column,
        });

        const completion = await this.queryCompletion(model.getLanguageId(), linePrefix);
        if (!completion) return { items: [] };

        return { items: [{ insertText: completion, range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column + completion.length } }] };
      },
    });
  }

  protected async queryCompletion(language: string, linePrefix: string): Promise<string | undefined> {
    if (linePrefix.endsWith('.')) return 'map((item) => item.id)';
    return undefined;
  }
}
```

### 14.3 Chat Participant Registration

```typescript
import { AIChatParticipant, ChatRequest, ChatContext, ChatResponseBuilder } from '@theia/ai-chat/lib/common';
import { injectable, inject } from '@theia/core/shared/inversify';
import { AIManager } from '@theia/ai-core/lib/common';

@injectable()
export class IDEIAChatAgent implements AIChatParticipant {
  readonly id = 'ideia';
  readonly name = 'IDEIA';
  readonly description = 'Full-stack AI agent for code analysis, architecture, implementation, review, testing and deployment';
  readonly type = 'chat-participant';

  readonly commands = [
    { command: 'analyse', description: 'Analyse code structure and patterns' },
    { command: 'architect', description: 'Design software architecture' },
    { command: 'implement', description: 'Implement features from specification' },
    { command: 'review', description: 'Review code for quality and security' },
    { command: 'test', description: 'Generate unit and integration tests' },
    { command: 'deploy', description: 'Plan and execute deployment' },
    { command: 'help', description: 'Show available commands' },
  ];

  @inject(AIManager)
  protected aiManager: AIManager;

  async request(request: ChatRequest, context: ChatContext, response: ChatResponseBuilder): Promise<void> {
    if (request.command === 'help') {
      response.markdown('## IDEIA Agent Commands\n\n');
      for (const cmd of this.commands) { response.markdown('- **@ideia ' + cmd.command + '** - ' + cmd.description + '\n'); }
      response.done();
      return;
    }

    response.progress(10, 'Preparing ' + request.command + '...');

    const aiRequest = {
      id: crypto.randomUUID(), model: 'ideia-' + request.command,
      messages: [{ role: 'system', content: this.getSystemPrompt(request.command) }, { role: 'user', content: request.message }],
      maxTokens: 4096, temperature: 0.3,
    };

    try {
      response.progress(30, 'Sending to AI...');
      const result = await this.aiManager.sendRequest(aiRequest);
      response.progress(80, 'Processing result...');
      response.markdown(result.content);
      response.progress(100, 'Done');
    } catch (error) { response.error('Error: ' + error.message); }

    response.done();
  }

  protected getSystemPrompt(command: string): string {
    const prompts: Record<string, string> = {
      analyse: 'Analyse code and provide insights about patterns, structure, and potential improvements.',
      architect: 'Design software architecture with components, interfaces, and data flow.',
      implement: 'Generate production-ready code following best practices and existing patterns.',
      review: 'Review code for bugs, security issues, performance problems, and style violations.',
      test: 'Generate comprehensive tests including unit, integration, and edge cases.',
      deploy: 'Create deployment plans and configurations for CI/CD pipelines.',
    };
    return prompts[command] ?? 'You are a helpful AI assistant integrated into the IDE.';
  }
}
```

### 14.4 AI Code Action Provider

```typescript
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { MonacoEditorService } from '@theia/monaco/lib/browser/monaco-editor-service';
import { languages, MarkerSeverity } from '@theia/monaco-editor-core';
import { AIManager } from '@theia/ai-core/lib/common';

@injectable()
export class IDEIACodeActionRegistrar {
  @inject(MonacoEditorService)
  protected monacoEditorService: MonacoEditorService;

  @inject(AIManager)
  protected aiManager: AIManager;

  @postConstruct()
  protected init(): void {
    this.monacoEditorService.registerCodeActionProvider('*', {
      provideCodeActions: async (model, range, context, token) => {
        const actions: languages.CodeAction[] = [];
        const text = model.getValueInRange(range);

        if (text.length > 5) {
          actions.push({ title: 'Explain with IDEIA', kind: 'explain.ai', isPreferred: false, command: { id: 'ideia.explainSelection', title: 'Explain with IDEIA', arguments: [model.uri.toString(), range] } });
          actions.push({ title: 'Refactor with IDEIA', kind: 'refactor.ai', isPreferred: false, command: { id: 'ideia.refactorSelection', title: 'Refactor with IDEIA', arguments: [model.uri.toString(), range] } });
        }

        if (context.markers?.length) {
          for (const marker of context.markers.slice(0, 3)) {
            if (marker.severity === MarkerSeverity.Error) {
              actions.push({ title: 'Fix: ' + marker.message.slice(0, 50), kind: 'quickfix.ai', diagnostics: [marker], command: { id: 'ideia.fixDiagnostic', title: 'Fix with IDEIA', arguments: [model.uri.toString(), marker] } });
            }
          }
        }

        return { actions };
      },
    });
  }
}
```

### 14.5 AgentResultWidget Integration

```typescript
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { injectable } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';

export interface AgentResultData { agentId: string; command: string; summary: string; codeBlocks: { code: string; language: string; filePath?: string }[]; files: { path: string; action: string }[]; executionTime: number; }

@injectable()
export class AgentResultWidget extends ReactWidget {
  static ID = 'ideia.agent-result';
  static LABEL = 'Agent Result';

  protected result: AgentResultData | undefined;

  setResult(result: AgentResultData): void {
    this.result = result;
    this.title.label = result.agentId + ': ' + result.command;
    this.update();
  }

  protected render(): React.ReactNode {
    if (!this.result) {
      return React.createElement('div', { className: 'agent-result-empty' }, 'No result to display. Run an agent command first.');
    }

    return React.createElement('div', { className: 'agent-result' },
      React.createElement('div', { className: 'result-header' },
        React.createElement('span', { className: 'result-agent' }, '@' + this.result.agentId),
        React.createElement('span', { className: 'result-command' }, this.result.command),
        React.createElement('span', { className: 'result-time' }, (this.result.executionTime / 1000).toFixed(1) + 's'),
      ),
      React.createElement('div', { className: 'result-summary' }, this.result.summary),
      this.result.codeBlocks.map((block, i) =>
        React.createElement('div', { key: i, className: 'result-code-block' },
          block.filePath ? React.createElement('div', { className: 'code-block-path' }, block.filePath) : null,
          React.createElement('pre', { className: 'code-block-content' }, React.createElement('code', { className: 'language-' + block.language }, block.code)),
        )
      ),
      this.result.files.length > 0
        ? React.createElement('div', { className: 'result-files' },
            React.createElement('h4', null, 'Files:'),
            this.result.files.map((file, i) => React.createElement('div', { key: i, className: 'file-entry file-' + file.action }, (file.action === 'create' ? '+' : file.action === 'delete' ? '-' : '~') + ' ' + file.path)),
          )
        : null,
    );
  }
}
```

### 14.6 AI Command Handler

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { EditorManager } from '@theia/editor/lib/browser';
import { MessageService } from '@theia/core/lib/common/message-service';
import { AICommands } from './ideia-commands';
import { AgentRouter } from './agent-router';
import { CommandProgressService } from './command-progress';
import { IDEIA } from '@theia/core/lib/common';

@injectable()
export class IDEIACommandHandler implements CommandContribution, MenuContribution {
  @inject(EditorManager) protected editorManager: EditorManager;
  @inject(AgentRouter) protected agentRouter: AgentRouter;
  @inject(MessageService) protected messageService: MessageService;
  @inject(CommandProgressService) protected progressService: CommandProgressService;

  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(AICommands.ANALYSE, { execute: async () => { const e = this.editorManager.currentEditor; if (!e) { this.messageService.warn('No active editor'); return; } const t = e.selection ? e.document.getText(e.selection) : e.document.getText(); await this.runAgent('analyst', 'analyse', t); } });
    registry.registerCommand(AICommands.REVIEW, { execute: async () => { const e = this.editorManager.currentEditor; if (!e) { this.messageService.warn('No active editor'); return; } const t = e.selection ? e.document.getText(e.selection) : e.document.getText(); await this.runAgent('reviewer', 'review', t); } });
    registry.registerCommand(AICommands.EXPLAIN, { execute: async () => { const e = this.editorManager.currentEditor; if (!e || !e.selection) { this.messageService.warn('No selection'); return; } await this.runAgent('analyst', 'explain', e.document.getText(e.selection)); } });
    registry.registerCommand(AICommands.GENERATE_TEST, { execute: async () => { const e = this.editorManager.currentEditor; if (!e) { this.messageService.warn('No active editor'); return; } await this.runAgent('tester', 'generate', e.document.getText()); } });
    registry.registerCommand(AICommands.IMPLEMENT, { execute: async () => { const fp = this.editorManager.currentEditor?.document.uri.toString() ?? 'unknown'; await this.runAgent('programmer', 'implement', fp); } });
    registry.registerCommand(AICommands.FIX, { execute: async () => { const e = this.editorManager.currentEditor; if (!e) { this.messageService.warn('No active editor'); return; } await this.runAgent('programmer', 'fix', ''); } });
  }

  protected async runAgent(agentId: string, command: string, input: string): Promise<void> {
    const progressId = 'agent-' + Date.now();
    await this.progressService.startProgress(progressId, 'Running @' + agentId + ' ' + command + '...', 5);

    try {
      this.progressService.reportProgress(progressId, 1, 'Routing to agent...');
      const agent = this.agentRouter.route(agentId);
      if (!agent) { this.messageService.error('Agent @' + agentId + ' not found'); return; }

      this.progressService.reportProgress(progressId, 2, 'Executing...');
      const result = await agent.execute({ command, input, onProgress: (percent, msg) => { this.progressService.reportProgress(progressId, Math.floor((percent / 100) * 4) + 1, msg); } });

      this.progressService.reportProgress(progressId, 4, 'Processing result...');
      if (result.type === 'error') { this.messageService.error(result.message); this.progressService.failProgress(progressId, result.message); }
      else { this.messageService.info(result.summary); this.progressService.completeProgress(progressId, 'Done'); }
    } catch (error) { this.messageService.error('Agent error: ' + error.message); this.progressService.failProgress(progressId, error.message); }
  }

  registerMenus(menus: MenuModelRegistry): void {
    menus.registerMenuAction([IDEIA.MENU_PATH, 'ai'], { commandId: AICommands.ANALYSE.id, label: 'Analyse Code', order: '1' });
    menus.registerMenuAction([IDEIA.MENU_PATH, 'ai'], { commandId: AICommands.REVIEW.id, label: 'Review Code', order: '2' });
    menus.registerMenuAction([IDEIA.MENU_PATH, 'ai'], { commandId: AICommands.EXPLAIN.id, label: 'Explain Code', order: '3' });
    menus.registerMenuAction([IDEIA.MENU_PATH, 'ai'], { commandId: AICommands.GENERATE_TEST.id, label: 'Generate Test', order: '4' });
    menus.registerMenuAction([IDEIA.MENU_PATH, 'ai'], { commandId: AICommands.IMPLEMENT.id, label: 'Implement Feature', order: '5' });
  }
}
```

---

## 15. Conexoes

| Estudo | Conexao com S47 |
|--------|----------------|
| **S11** (Theia IDE Integration) | Base da integracao Theia para todos os widgets e contribuicoes de IA. O Theia plugin framework e o hospedeiro dos componentes de AI. |
| **S34** (Theia Editor Widget) | O editor widget e a fonte primaria de contexto para AI providers. Inline completions operam diretamente no Monaco. |
| **S38** (Editor Intelligence / LSP) | LSP providers e AI providers coexistem no sistema de completacao. AI code actions integram-se ao sistema de code actions do LSP. |
| **S43** (Views & Widgets) | ChatWidget, AgentPanel e AgentResultWidget sao custom widgets Theia seguindo os padroes de S43. |
| **S42** (DI & Contributions) | Todo sistema AI e construido sobre Inversify DI. AIProvider, AIChatParticipant, AITool, AIContextProvider sao contribution points. |
| **S31** (External LLM Integration) | AI providers encapsulam chamadas a LLMs externos (Ollama, OpenAI, DeepSeek) por tras da interface AIProvider. |
| **S46** (Markers/Output) | OutputValidation usa o sistema de markers. AI Audit Trail usa o OutputChannelManager para logging. |
| **S44** (Shell/Layout) | AgentPanelWidget e um widget that se integra ao ApplicationShell. |
| **S40** (Webview) | Webview-based agents podem ser integrados como AIChatParticipants com UI customizada em iframe. |
| **S36** (Extension Host) | AI providers rodam no backend (extension host). Frontend AI services comunicam via RPC. |
| **S35** (Filesystem/Workspace) | FileReadTool, FileWriteTool e FileContextProvider dependem do FileService e WorkspaceService. |
| **S37** (Search/SCM/Task) | SearchTool integra-se ao SearchService. GitContextProvider depende do GitRepositoryManager. |
| **S39** (Settings/Keybindings) | AI provider preferences sao expostas como preferences Theia. Comandos AI tem keybindings registraveis. |
| **S45** (Remote/Web) | Em contexto remoto, AIManager frontend comunica com AIManager backend via RPC ou WebSocket. |

---

## 16. Plano de Implementacao

| Fase | Tarefa | Descricao | Esforco | Dependencias |
|------|--------|-----------|---------|-------------|
| **F1** | S47-T1 | Implementar interfaces AIProvider, AIRequest, AIResponse, AIMessage no pacote @theia/ai-core | 8h | S42 (DI), S11 (Theia) |
| **F2** | S47-T2 | Implementar AIManagerImpl com gerenciamento de providers e fallback | 12h | S47-T1 |
| **F3** | S47-T3 | Integrar sistema de preferences do Theia com configuracao de providers | 6h | S47-T1, S39 |
| **F4** | S47-T4 | Implementar OllamaProvider concreto com chat e streaming | 8h | S47-T1, S31 |
| **F5** | S47-T5 | Implementar OpenAIProvider e DeepSeekProvider | 8h | S47-T1, S31 |
| **F6** | S47-T6 | Implementar AIContribution e ContributionProvider<AIProvider> | 6h | S47-T1, S42 |
| **F7** | S47-T7 | Registrar AI commands (analyse, architect, implement, review, test, deploy) | 6h | S47-T6, S42 |
| **F8** | S47-T8 | Implementar AIChatParticipant interface e chat widget integration | 12h | S47-T2, S43 |
| **F9** | S47-T9 | Implementar parse de mensagens (@agent command args) no chat service | 4h | S47-T8 |
| **F10** | S47-T10 | Implementar AICodeActionContribution e provedores (refactor, explain, generate test, fix) | 10h | S47-T2, S38 |
| **F11** | S47-T11 | Integrar AI code actions ao Monaco code action provider | 6h | S47-T10, S38 |
| **F12** | S47-T12 | Implementar AIContextProvider interface e providers (editor, workspace, diagnostics, git, files) | 12h | S47-T1, S34, S35 |
| **F13** | S47-T13 | Implementar ContextAggregator com priorizacao e truncamento | 6h | S47-T12 |
| **F14** | S47-T14 | Implementar AIInlineCompletionContribution com debounce e validacao | 10h | S47-T2, S34 |
| **F15** | S47-T15 | Integrar inline completion provider ao Monaco via Theia | 6h | S47-T14, S38 |
| **F16** | S47-T16 | Implementar AgentPanelWidget em React com selecao de agente, status, output | 12h | S43, S47-T7 |
| **F17** | S47-T17 | Implementar protocolo de comunicacao frontend-backend do agente (RPC) | 8h | S47-T16 |
| **F18** | S47-T18 | Implementar AgentToolExecutor com FileReadTool, FileWriteTool, SearchTool | 10h | S47-T1, S35, S37 |
| **F19** | S47-T19 | Implementar AIPermissionManager com modelo N0-N4 | 6h | S47-T1 |
| **F20** | S47-T20 | Implementar AIApprovalFlow com dialogo de confirmacao | 6h | S47-T19, S43 |
| **F21** | S47-T21 | Implementar AgentResourceAccessController com escopo de workspace | 4h | S47-T19, S35 |
| **F22** | S47-T22 | Implementar AIAuditService com hash chain SHA-256 | 6h | S47-T1 |
| **F23** | S47-T23 | Implementar AIOutputValidator com validacao de secrets, patterns perigosos e extensoes | 6h | S47-T1 |
| **F24** | S47-T24 | Implementar AIProjectAnalysis com analise de estrutura do workspace | 8h | S47-T2, S35 |
| **F25** | S47-T25 | Implementar AIFileGenerator com geracao sob demanda | 6h | S47-T2, S35 |
| **F26** | S47-T26 | Implementar AISearchEnhancement com ranking e sumarizacao | 6h | S47-T2, S37 |
| **F27** | S47-T27 | Implementar CommandProgressService com report de progresso | 4h | S42 |
| **F28** | S47-T28 | Implementar AgentResultWidget para exibicao de resultados | 6h | S43 |
| **F29** | S47-T29 | Implementar ChatAgentDiscovery com busca de agentes | 4h | S47-T8 |
| **F30** | S47-T30 | Implementar fallback chain entre providers com timeout e retry | 8h | S47-T2 |
| **F31** | S47-T31 | Testes unitarios: AIProvider, AIManager, AIContextProvider | 12h | S47-T1 a T5 |
| **F32** | S47-T32 | Testes de integracao: chat flow, inline completion, code actions | 12h | S47-T8 a T15 |
| **F33** | S47-T33 | Testes de seguranca: permission model, approval flow, output validation | 8h | S47-T19 a T23 |
| **F34** | S47-T34 | Documentacao: register study em document-registry.md | 2h | Fim da implementacao |

**Total estimado: ~250h**

### Priorizacao

| Prioridade | Tarefas | Marco |
|-----------|---------|-------|
| P0 (MVP) | S47-T1 a T6, T8, T10, T12, T14, T16, T31 | Sistema basico funcional: providers registrados, chat operacional, code actions aparecendo |
| P1 (v1.0) | S47-T7, T9, T11, T13, T15, T17, T18, T22, T23, T32 | Agentes executando com ferramentas, inline completion funcional, audit trail |
| P2 (v1.5) | S47-T19 a T21, T24 a T30, T33 | Seguranca completa, features workspace-wide, discovery, fallback |
| P3 (v2.0) | S47-T34, refinamentos, performance | Documentacao, benchmark, otimizacao |

### Riscos

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| Theia AI Core API instavel (pre-release) | Alto | Usar interfaces proprias IDEIA com adapter para API do Theia |
| Compatibilidade com versoes do Monaco | Medio | Testar contra versao especifica do Monaco empacotada pelo Theia |
| Latencia de LLM afeta UX de inline completion | Alto | Implementar timeout agressivo (500ms), cache de completions frequentes |
| Consumo de tokens em context providers | Medio | Implementar truncamento inteligente e cache de contexto |
| Modelo de permissoes subjetivo | Medio | Tornar configuravel via preferences do Theia |

### Criterios de Aceitacao

1. Chat reconhece @mentions e roteia para o agente correto
2. Inline completion aparece em menos de 500ms
3. Code actions de IA aparecem no lightbulb do editor
4. AgentPanelWidget mostra progresso e resultados
5. Comandos AI executam do palette de comandos
6. Audit trail com hash chain verificavel
7. Output validator bloqueia secrets em respostas
8. Permission model N0-N4 respeita escopos
9. Provider fallback funciona quando primario falha
10. Testes unitarios com cobertura > 80% nas interfaces core

---

> **Fim do Estudo S47 — Theia AI, Agents & Intelligence Framework**
> Data: 2026-07-22
