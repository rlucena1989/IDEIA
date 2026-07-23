# Estudo de Plugins e Ecossistema — IDEIA

> **Evolução do ai-devkit para IDEIA: arquitetura de extensibilidade, marketplace, protocolos abertos e integração com agentes de IA**

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 1.0 | 2026-07-18 | IDEIA Architecture Team | Versão inicial |

---

## Índice

1. [OpenVSX e VS Code Extension API](#1-openvsx-e-vs-code-extension-api)
2. [Theia Extensibility](#2-theia-extensibility)
3. [IDEIA Marketplace](#3-ideia-marketplace)
4. [Plugin API Design](#4-plugin-api-design)
5. [MCP — Model Context Protocol](#5-mcp--model-context-protocol)
6. [A2A — Agent-to-Agent Protocol](#6-a2a--agent-to-agent-protocol)

---

## 1. OpenVSX e VS Code Extension API

### 1.1 Visão Geral

O **OpenVSX** (open-vsx.org) é o marketplace aberto para extensões compatíveis com VS Code, mantido pela Eclipse Foundation e Gitpod. Ele serve como alternativa open-source ao VS Code Marketplace da Microsoft, sem requiring autenticação ou licenciamento proprietário.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ECOSSISTEMA DE EXTENSÕES                       │
│                                                                     │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐    │
│  │ VS Code      │────▶│ VS Code Market   │     │ Proprietário │    │
│  │ Marketplace  │     │ (Microsoft)      │     │              │    │
│  └──────────────┘     └──────────────────┘     └──────────────┘    │
│                                                                     │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐    │
│  │ OpenVSX      │────▶│ Registry Público │────▶│ Eclipse      │    │
│  │ (open-vsx)   │     │ + Self-Hosted    │     │ Foundation   │    │
│  └──────────────┘     └──────────────────┘     └──────────────┘    │
│                                                                     │
│  ┌──────────────┐     ┌──────────────────┐                          │
│  │ IDEIA        │────▶│ Registry Próprio │────▶│ IDEIA Market    │  │
│  │ Marketplace  │     │ (npm + OpenVSX)  │     │ (híbrido)        │  │
│  └──────────────┘     └──────────────────┘     └──────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

A IDEIA utilizará o **OpenVSX como registry upstream** e um **registry próprio para plugins específicos** (agentes, provedores LLM, integrações exclusivas). A compatibilidade com a **VS Code Extension API** é estimada em ~80% no ecossistema Theia, variando conforme a versão do Theia e o nível de abstração da API utilizada.

### 1.2 VS Code Extension API — Compatibilidade com Theia/IDEIA

| Categoria | API | Compatibilidade | Observações |
|-----------|-----|----------------|-------------|
| **Commands** | `commands.registerCommand` | ✅ Total | Mesmo contrato |
| **Commands** | `commands.executeCommand` | ✅ Total | |
| **Views** | `window.createTreeView` | ✅ Total | Theia TreeWidget |
| **Views** | `window.registerWebviewViewProvider` | ✅ Parcial | API divergente em eventos |
| **Editors** | `window.activeTextEditor` | ✅ Total | |
| **Editors** | `window.onDidChangeActiveTextEditor` | ✅ Total | |
| **Editors** | `workspace.onDidChangeTextDocument` | ✅ Total | |
| **Status Bar** | `window.createStatusBarItem` | ✅ Total | |
| **Notifications** | `window.showInformationMessage` | ✅ Total | |
| **Notifications** | `window.showQuickPick` | ✅ Total | |
| **Quick Pick** | `window.createQuickPick` | ✅ Total | |
| **Language** | `languages.registerCompletionItemProvider` | ✅ Total | |
| **Language** | `languages.registerHoverProvider` | ✅ Total | |
| **Language** | `languages.registerDefinitionProvider` | ✅ Total | |
| **Language** | `languages.registerDocumentSemanticTokensProvider` | ⚠️ Parcial | Suporte a tokens semânticos limitado |
| **Debug** | `debug.registerDebugAdapterDescriptorFactory` | ✅ Total | DAP completo |
| **Debug** | `debug.startDebugging` | ✅ Total | |
| **Terminal** | `window.createTerminal` | ✅ Total | xterm.js nativo |
| **Terminal** | `window.onDidWriteTerminalData` | ⚠️ Parcial | API de leitura limitada |
| **File System** | `workspace.fs` | ✅ Total | |
| **File System** | `FileSystemProvider` | ✅ Total | |
| **Workspace** | `workspace.getConfiguration` | ✅ Total | |
| **Workspace** | `workspace.onDidChangeConfiguration` | ✅ Total | |
| **Tasks** | `tasks.registerTaskProvider` | ✅ Total | |
| **Tasks** | `tasks.executeTask` | ⚠️ Parcial | Menos tasks built-in |
| **Authentication** | `authentication.getSession` | ⚠️ Parcial | Provider específico |
| **SCM** | `scm.createSourceControl` | ✅ Total | |
| **Timeline** | `window.createTimelineView` | ❌ Não | Não implementado |
| **Notebooks** | `notebooks.registerNotebookContentProvider` | ⚠️ Parcial | Em desenvolvimento |
| **Testing** | `testController` | ⚠️ Parcial | API recente |
| **Chat** | `chat.createChatProvider` | ❌ Não | Específico VS Code |
| **Inline** | `window.registerInlineEditProvider` | ❌ Não | Específico VS Code |
| **Copilot** | `lm.selectChatModels` | ❌ Não | Específico VS Code |
| **Extension** | `extension.exports` | ✅ Total | |
| **Extension** | `context.subscriptions` | ✅ Total | |

### 1.3 Extension Points — Anatomia

```
┌─────────────────────────────────────────────────────────────────────┐
│                     VS CODE EXTENSION MANIFEST                       │
│  package.json                                                        │
│                                                                      │
│  {                                                                    │
│    "contributes": {                                                  │
│      "commands": [],          ───  Comandos globais                  │
│      "views": {},             ───  Views no Activity Bar             │
│      "menus": {},             ───  Menus contextuais                 │
│      "keybindings": [],       ───  Atalhos de teclado                │
│      "configuration": {},    ───  Settings do usuário                │
│      "languages": [],         ───  Definições de linguagem           │
│      "grammars": [],          ───  TextMate grammars                 │
│      "snippets": [],          ───  Code snippets                     │
│      "themes": [],            ───  Color/icon themes                 │
│      "debuggers": [],         ───  Debug adapter providers           │
│      "taskDefinitions": [],   ───  Task types                        │
│      "semanticTokenScopes": []───  Escopos de tokens semânticos      │
│    }                                                                  │
│  }                                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.4 Language Contributions

```json
{
  "contributes": {
    "languages": [{
      "id": "ideascript",
      "aliases": ["IDEIA Script", "ideascript"],
      "extensions": [".ideia", ".ids"],
      "configuration": "./language-configuration.json"
    }],
    "grammars": [{
      "language": "ideascript",
      "scopeName": "source.ideia",
      "path": "./syntaxes/ideia.tmLanguage.json"
    }],
    "snippets": [{
      "language": "ideascript",
      "path": "./snippets/ideia.json"
    }]
  }
}
```

### 1.5 DAP — Debug Adapter Protocol

O **DAP** (Debug Adapter Protocol) é o protocolo padrão para debuggers, originalmente criado pela Microsoft para o VS Code e adotado pelo Theia. A IDEIA manterá compatibilidade total com DAP.

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   VS Code    │    │   IDEIA Editor   │    │   Theia Editor   │
│  (cliente)   │    │   (cliente DAP)  │    │   (cliente DAP)  │
└──────┬───────┘    └────────┬─────────┘    └────────┬─────────┘
       │                     │                       │
       │    DAP (JSON-RPC)   │                       │
       ├─────────────────────┤                       │
       │                     │                       │
       ▼                     ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     DEBUG ADAPTER (servidor)                  │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Node.js      │  │ Python       │  │ Custom (qualquer  │   │
│  │ Debug Adapter│  │ Debug Adapter│  │   linguagem)     │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                               │
│  initialize → launch/attach → setBreakpoints → continue       │
│  → stackTrace → scopes → variables → disconnect              │
└─────────────────────────────────────────────────────────────┘
```

Principais requests DAP:

| Request | Descrição |
|---------|-----------|
| `initialize` | Negocia capacidades cliente/servidor |
| `launch` | Inicia processo debugado |
| `attach` | Anexa a processo existente |
| `setBreakpoints` | Define breakpoints |
| `setExceptionBreakpoints` | Define breakpoints de exceção |
| `continue` | Continua execução |
| `next` / `stepIn` / `stepOut` | Navegação passo-a-passo |
| `stackTrace` | Obtém stack frames |
| `scopes` | Obtém escopos de variáveis |
| `variables` | Obtém variáveis de um escopo |
| `evaluate` | Avalia expressão no contexto |
| `disconnect` | Desconecta o debugger |

### 1.6 Terminal — xterm.js

Theia e IDEIA utilizam **xterm.js** como emulador de terminal, com suporte a:

- **XTerm backend** — integração com processos locais (Node PTY)
- **WebSocket backend** — terminal remoto via WebSocket
- **Serial backend** — para dispositivos seriais
- **Custom backends** — via extensão

```typescript
// Registro de backend customizado de terminal
@injectable()
export class IdeiaTerminalBackend implements ITerminalBackend {
  readonly id = 'ideia-agent-terminal';
  readonly name = 'IDEIA Agent Terminal';

  async open(
    options: ITerminalBackendOptions,
    context: ITerminalBackendContext
  ): Promise<ITerminalProcess> {
    return new IdeiaTerminalProcess(options, context);
  }
}
```

---

## 2. Theia Extensibility

### 2.1 Theia Extension API — Arquitetura

A plataforma Theia é construída sobre **Inversify DI** (Dependency Injection) com módulos chamados **Container Modules**. Toda contribuição ao Theia é feita através de bindings DI, o que difere fundamentalmente do modelo declarativo do VS Code.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      THEIA PLATFORM ARCHITECTURE                     │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Aplicação (IDEIA Shell)                     │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │  │
│  │  │ Frontend   │ │ Backend    │ │ Electron   │ │ Browser  │ │  │
│  │  │ Container  │ │ Container  │ │ Container  │ │ Container│ │  │
│  │  └────────────┘ └────────────┘ └────────────┘ └──────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                  │                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Inversify DI Container                      │  │
│  │                                                                 │
│  │  bind<interface>(TYPES.X).to(Implementation).inSingletonScope() │
│  │  bind<contribution>(TYPES.Y).toService(Z)                       │
│  │                                                                 │
│  └──────────────────────────────────────────────────────────────┘  │
│                                  │                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Container Modules                            │  │
│  │                                                                 │
│  │  export default new ContainerModule(bind => {                   │
│  │    bind(MyClass).toSelf();                                      │
│  │    bind(CommandContribution).to(MyCommand);                     │
│  │    bind(MenuContribution).to(MyMenu);                           │
│  │  });                                                            │
│  │                                                                 │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Container Modules — Inversify DI

Cada extensão Theia expõe **Container Modules** que são carregados no startup. Existem três categorias de módulos:

| Módulo | Alvo | Exemplo |
|--------|------|---------|
| `frontend` | Browser/Electron renderer | Widgets, views, commands |
| `backend` | Node.js process | Serviços, filesystem, LSP |
| `common` | Ambos | Interfaces, contratos, tipos |

```typescript
// Exemplo: Container Module completo para uma extensão IDEIA
import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { WidgetFactory } from '@theia/core/lib/browser';

export default new ContainerModule((bind, unbind, isBound, rebind) => {

  // --- COMANDOS ---
  bind(CommandContribution).to(IdeiaAgentCommandContribution);
  bind(MenuContribution).to(IdeiaAgentMenuContribution);

  // --- WIDGET FACTORY ---
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: 'ideia-agent-panel',
    createWidget: () => ctx.container.get(IdeiaAgentPanelWidget)
  }));
  bind(IdeiaAgentPanelWidget).toSelf().inSingletonScope();

  // --- SERVIÇO BACKEND ---
  bind(IdeiaAgentService).toSelf().inSingletonScope();
  bind(BackendApplicationContribution).toService(IdeiaAgentService);

  // --- PREFERÊNCIAS ---
  bind(IdeiaAgentPreferences).toSelf().inSingletonScope();
});
```

### 2.3 Custom Contribution Points

A IDEIA estenderá o sistema de contribution points do Theia com pontos específicos para agentes de IA:

```typescript
// Tipos de contribuição customizados para IDEIA
export const IdeiaContributionTypes = {
  AgentType: Symbol.for('IdeiaAgentTypeContribution'),
  ToolFunction: Symbol.for('IdeiaToolFunctionContribution'),
  LLMProvider: Symbol.for('IdeiaLLMProviderContribution'),
  MemoryProvider: Symbol.for('IdeiaMemoryProviderContribution'),
  EventProvider: Symbol.for('IdeiaEventProviderContribution'),
  MCPServer: Symbol.for('IdeiaMCPServerContribution'),
  WorkflowStep: Symbol.for('IdeiaWorkflowStepContribution'),
};
```

### 2.4 Sistema de Widgets

O Theia possui um sistema flexível de widgets baseado no PhosphorJS:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      THEIA WIDGET SYSTEM                            │
│                                                                      │
│  ┌────────────┬────────────┬────────────┬───────────────────────┐   │
│  │ Activity   │ Side Panel │ Main Area  │ Bottom Panel          │   │
│  │ Bar        │            │            │ (Output, Problems,    │   │
│  │            │            │            │  Terminal, Debug)     │   │
│  │  Explorer  │            │            │                       │   │
│  │  Search    │  ┌──────┐  │  ┌──────┐  │  ┌────────────────┐  │   │
│  │  Source    │  │ Tree │  │  │Editor│  │  │ Terminal       │  │   │
│  │  Control   │  │ View │  │  │      │  │  │ (xterm.js)     │  │   │
│  │  Extensions│  └──────┘  │  └──────┘  │  └────────────────┘  │   │
│  │            │            │            │                       │   │
│  │  [IDEIA]   │  ┌──────┐  │  ┌──────┐  │  ┌────────────────┐  │   │
│  │  Agents    │  │Agent │  │  │Chat  │  │  │ Agent Output   │  │   │
│  │  Panel     │  │ Tree │  │  │View  │  │  │ (logs, traces) │  │   │
│  │            │  └──────┘  │  └──────┘  │  └────────────────┘  │   │
│  └────────────┴────────────┴────────────┴───────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// Widget customizado IDEIA
import { Widget, Message } from '@theia/core/shared/@phosphor/widgets';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import * as React from '@theia/core/shared/react';

@injectable()
export class IdeiaChatWidget extends ReactWidget {
  static ID = 'ideia-chat-widget';
  static LABEL = 'IDEIA Chat';

  @inject(IdeiaChatService)
  private readonly chatService: IdeiaChatService;

  @postConstruct()
  protected init(): void {
    this.id = IdeiaChatWidget.ID;
    this.title.label = IdeiaChatWidget.LABEL;
    this.title.iconClass = 'ideia-chat-icon';
    this.title.closable = true;
    this.update();
  }

  protected render(): React.ReactNode {
    return (
      <div className='ideia-chat-container'>
        <IdeiaChatMessages messages={this.chatService.messages} />
        <IdeiaChatInput onSend={msg => this.chatService.send(msg)} />
      </div>
    );
  }
}
```

### 2.5 Comandos, Keybindings e Menus

```typescript
// Commands
import { Command } from '@theia/core/lib/common/command';

export const IdeiaAgentCommand: Command = {
  id: 'ideia.agent.run',
  label: 'Run Agent',
  category: 'IDEIA Agents',
  iconClass: 'ideia-run-icon'
};

// Command Contribution
@injectable()
export class IdeiaAgentCommandContribution implements CommandContribution {
  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(IdeiaAgentCommand, {
      isEnabled: () => true,
      execute: (agentId: string) => this.runAgent(agentId)
    });

    registry.registerCommand({
      id: 'ideia.agent.stop',
      label: 'Stop Agent'
    }, {
      execute: () => this.stopCurrentAgent()
    });
  }
}

// Keybinding Contribution
@injectable()
export class IdeiaAgentKeybindingContribution implements KeybindingContribution {
  registerKeybindings(registry: KeybindingRegistry): void {
    registry.registerKeybinding({
      command: IdeiaAgentCommand.id,
      keybinding: 'ctrlcmd+shift+a',
      when: 'editorFocus || ideiaAgentViewFocus'
    });
  }
}

// Menu Contribution
@injectable()
export class IdeiaAgentMenuContribution implements MenuContribution {
  registerMenus(menus: MenuModelRegistry): void {
    menus.registerMenuAction(
      MenuId.EDITOR_CONTEXT,
      { commandId: IdeiaAgentCommand.id, label: 'Run on Selection', order: 'z' }
    );

    menus.registerMenuAction(
      ['ideia_menu'],
      { commandId: 'ideia.agent.stop', label: 'Stop Current Agent' }
    );
  }
}
```

### 2.6 Sistema de Preferências

```typescript
// Definição de preferências (schema)
export const IdeiaAgentPreferencesSchema: PreferenceSchema = {
  type: 'object',
  properties: {
    'ideia.agent.defaultModel': {
      type: 'string',
      default: 'ollama/llama3',
      description: 'Modelo LLM padrão para agentes'
    },
    'ideia.agent.maxTokens': {
      type: 'number',
      default: 4096,
      minimum: 256,
      maximum: 128000,
      description: 'Tokens máximos por resposta do agente'
    },
    'ideia.agent.autonomyLevel': {
      type: 'string',
      enum: ['blocked', 'guided', 'autonomous', 'total'],
      default: 'guided',
      description: 'Nível de autonomia padrão dos agentes'
    },
    'ideia.marketplace.url': {
      type: 'string',
      default: 'https://marketplace.ideia.dev',
      description: 'URL do marketplace IDEIA'
    },
    'ideia.marketplace.allowThirdParty': {
      type: 'boolean',
      default: false,
      description: 'Permite plugins de terceiros não verificados'
    }
  }
};

// Acesso às preferências
@injectable()
export class IdeiaAgentPreferences {
  @inject(PreferenceService)
  private readonly pref: PreferenceService;

  get defaultModel(): string {
    return this.pref.get('ideia.agent.defaultModel', 'ollama/llama3');
  }

  get maxTokens(): number {
    return this.pref.get('ideia.agent.maxTokens', 4096);
  }

  get autonomyLevel(): string {
    return this.pref.get('ideia.agent.autonomyLevel', 'guided');
  }

  onPreferenceChanged(cb: (e: PreferenceChangeEvent) => void): void {
    this.pref.onPreferenceChanged(cb);
  }
}
```

---

## 3. IDEIA Marketplace

### 3.1 Plugin Registry — Arquitetura Baseada em npm

O IDEIA Marketplace utiliza **npm como infraestrutura base**, com um registry próprio compatível com o protocolo npm. Cada plugin é um **pacote npm** que estende o manifest com contribuições IDEIA.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      IDEIA MARKETPLACE                               │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Registry Layer                                                 │   │
│  │  ┌──────────────────────┐  ┌────────────────────────────┐    │   │
│  │  │ Verdaccio (npm reg)  │  │ OpenVSX Registry           │    │   │
│  │  │ - IDEIA private      │  │ - Extensões VS Code        │    │   │
│  │  │ - Agent plugins      │  │ - Themes, language support │    │   │
│  │  │ - MCP servers        │  │ - Debug adapters           │    │   │
│  │  └──────────────────────┘  └────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Discovery Layer                                                │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │   │
│  │  │ Search       │ │ Categories   │ │ Recommendations   │  │   │
│  │  │ (elastic)    │ │ & Tags       │ │ (collaborative)   │  │   │
│  │  └──────────────┘ └──────────────┘ └────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Security Layer                                                 │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │   │
│  │  │ Signing      │ │ Scanning     │ │ Permission        │  │   │
│  │  │ (Sigstore)   │ │ (Snyk/Trivy) │ │ Policy Check      │  │   │
│  │  └──────────────┘ └──────────────┘ └────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Plugin Manifest — package.json Estendido

```json
{
  "name": "@ideia/agent-code-reviewer",
  "version": "1.2.0",
  "description": "Agente especializado em code review com suporte a múltiplos LLMs",
  "displayName": "IDEIA Code Reviewer Agent",
  "publisher": "ideia-inc",
  "license": "MIT",
  "icon": "icons/agent-icon.png",
  "categories": ["Agents", "Code Review", "Quality"],
  "keywords": ["code-review", "lint", "quality-gate", "agent"],

  "engines": {
    "ideia": "^1.0.0",
    "node": ">=20.0.0",
    "theia": "^1.45.0"
  },

  "activationEvents": [
    "onCommand:ideia.agent.codeReview",
    "onLanguage:typescript",
    "onStartupFinished"
  ],

  "contributes": {
    "ideia": {
      "agents": [{
        "id": "code-reviewer",
        "name": "Code Reviewer",
        "description": "Realiza code review automático com múltiplos modelos",
        "version": "1.0.0",
        "type": "autonomous",
        "capabilities": ["code-review", "lint-analysis", "security-scan"],
        "defaultModel": "ollama/llama3",
        "maxTokens": 16000,
        "tools": ["read-file", "search-code", "git-diff"]
      }],

      "toolFunctions": [{
        "id": "ideia.customLint",
        "name": "Custom Lint",
        "description": "Executa linter customizado no código",
        "schema": {
          "type": "object",
          "properties": {
            "filePath": { "type": "string" },
            "rules": { "type": "array", "items": { "type": "string" } }
          },
          "required": ["filePath"]
        }
      }],

      "llmProviders": [{
        "id": "huggingface-inference",
        "name": "HuggingFace Inference",
        "version": "1.0.0",
        "endpoint": "https://api-inference.huggingface.co",
        "models": ["codellama/CodeLlama-34b", "bigcode/starcoder2-15b"]
      }],

      "permissions": {
        "filesystem": { "read": ["**/*.ts", "**/*.js", "**/*.json"], "write": [] },
        "network": { "allowedDomains": ["api.github.com", "gitlab.com"] },
        "agents": { "canRead": ["planner"], "canWrite": [] }
      },

      "views": [{
        "id": "ideia.codeReviewPanel",
        "name": "Code Review Results",
        "type": "webview",
        "location": "bottom"
      }]
    },

    "commands": [{
      "command": "ideia.agent.codeReview",
      "title": "Review Current File",
      "category": "IDEIA Agents"
    }],

    "keybindings": [{
      "command": "ideia.agent.codeReview",
      "key": "ctrl+shift+r ctrl+shift+c",
      "when": "editorFocus"
    }],

    "menus": {
      "editor/context": [{
        "command": "ideia.agent.codeReview",
        "group": "ideia@1",
        "when": "editorHasSelection"
      }]
    }
  },

  "scripts": {
    "prepare": "npm run build",
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src/"
  },

  "dependencies": {
    "@ideia/plugin-api": "^1.0.0",
    "fast-glob": "^3.3.0"
  },

  "devDependencies": {
    "@ideia/plugin-toolkit": "^1.0.0",
    "typescript": "^5.4.0"
  }
}
```

### 3.3 Plugin Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PLUGIN LIFECYCLE                                │
│                                                                      │
│  ┌──────────┐                                                        │
│  │ INSTALL  │──▶ npm install @ideia/agent-foo                        │
│  └────┬─────┘   ┌──────────────────────────────────────────────┐    │
│       │         │ Validação: engine, dependencies, permissions │    │
│       │         │ Scan: Snyk/Trivy, signature check            │    │
│       │         │ Sandbox: define capabilities limits           │    │
│       │         └──────────────────────────────────────────────┘    │
│       ▼                                                            │
│  ┌──────────┐                                                        │
│  │ LOAD     │──▶ Theia: load container modules                      │
│  └────┬─────┘   ┌──────────────────────────────────────────────┐    │
│       │         │ Frontend: register views, commands, menus     │    │
│       │         │ Backend: start services, connect to NATS      │    │
│       │         └──────────────────────────────────────────────┘    │
│       ▼                                                            │
│  ┌──────────┐                                                        │
│  │ ACTIVATE │──▶ Plugin activation event                            │
│  └────┬─────┘   ┌──────────────────────────────────────────────┐    │
│       │         │ activationEvents triggers:                    │    │
│       │         │   onCommand, onLanguage, onView, onStartup    │    │
│       │         │ Lazy activation até primeiro trigger          │    │
│       │         └──────────────────────────────────────────────┘    │
│       ▼                                                            │
│  ┌──────────┐                                                        │
│  │ RUNNING  │──▶ Plugin operacional                                 │
│  └────┬─────┘   ┌──────────────────────────────────────────────┐    │
│       │         │ Comunicação via NATS (pub/sub, req/rep)      │    │
│       │         │ Agentes: ferramentas, provedores LLM         │    │
│       │         │ UI: widgets, webviews, notificações          │    │
│       │         └──────────────────────────────────────────────┘    │
│       ▼                                                            │
│  ┌──────────┐                                                        │
│  │DEACTIVATE│──▶ Desativação temporária                             │
│  └────┬─────┘   ┌──────────────────────────────────────────────┐    │
│       │         │ Dispose: subscriptions, timers, connections   │    │
│       │         │ Preserva: preferences, cache, estado          │    │
│       │         └──────────────────────────────────────────────┘    │
│       ▼                                                            │
│  ┌──────────┐                                                        │
│  │UNINSTALL │──▶ npm uninstall + cleanup                            │
│  └──────────┘   ┌──────────────────────────────────────────────┐    │
│                  │ Remove: files, configs, cache                │    │
│                  │ Revoke: permissions, security audit          │    │
│                  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// Ciclo de vida do plugin — API pública
export interface IdeiaPluginLifecycle {
  /** Chamado após instalação e verificação de dependências */
  activate?(context: IdeiaPluginContext): void | Promise<void>;

  /** Chamado quando o plugin é desativado (desligamento, recarga) */
  deactivate?(): void | Promise<void>;

  /** Chamado antes da desinstalação para cleanup */
  onUninstall?(): void | Promise<void>;

  /** Chamado quando ocorre uma atualização */
  onUpgrade?(fromVersion: string, toVersion: string): void | Promise<void>;

  /** Chamado após crash do plugin para restaurar estado */
  onRecover?(lastState: PluginState): void | Promise<void>;
}

// Contexto do plugin — recursos disponíveis para o plugin
export interface IdeiaPluginContext {
  /** Identificador único do plugin */
  readonly pluginId: string;

  /** Versão atual */
  readonly version: string;

  /** Caminho absoluto do diretório de instalação */
  readonly pluginPath: string;

  /** Caminho do diretório de armazenamento privado */
  readonly storagePath: string;

  /** Logger escopado para o plugin */
  readonly logger: IdeiaLogger;

  /** NATS JetStream client para comunicação */
  readonly nats: NatsConnection;

  /** Gerenciador de ferramentas do agente */
  readonly tools: ToolFunctionManager;

  /** Registro de provedores LLM */
  readonly llmProviders: LLMProviderRegistry;

  /** Preferências escopadas */
  readonly preferences: IdeiaPreferenceAccessor;

  /** Gerenciador de estado persistente */
  readonly state: PluginStateManager;

  /** API de subscriptions para lifecycle disposal */
  readonly subscriptions: Disposable[];

  /** Emissor de eventos do plugin */
  readonly events: EventEmitter<PluginEvent>;

  /** Gerenciador de UI (webview, status bar, notifications) */
  readonly ui: UIManager;
}
```

### 3.4 Plugin Isolation (Sandbox)

A IDEIA implementa isolamento de plugins em múltiplos níveis:

| Nível | Mecanismo | Descrição |
|-------|-----------|-----------|
| **Processo** | Worker Threads | Plugins executam em worker threads separadas |
| **Container** | Docker (opt-in) | Plugins com permissões elevadas em contêineres |
| **Filesystem** | OverlayFS + chroot | Acesso apenas ao `storagePath` + paths explicitados |
| **Network** | NATS permissions | Apenas domínios explicitamente permitidos |
| **Memória** | V8 sandbox + heap limits | Limites de heap por plugin |
| **Agente** | Policy Engine | Cedar policy para ações de agentes |

```typescript
// Configuração de sandbox do plugin
export interface PluginSandboxConfig {
  /** Tipo de isolamento */
  isolation: 'thread' | 'container' | 'process' | 'none';

  /** Limites de recursos */
  limits: {
    maxHeapMB: number;
    maxCPUPct: number;
    maxProcessCount: number;
    maxOpenFiles: number;
    maxNetworkConnections: number;
  };

  /** Permissões de filesystem */
  filesystem: {
    read: string[];      // Glob patterns de leitura
    write: string[];     // Glob patterns de escrita
    exec: string[];      // Binários permitidos
  };

  /** Permissões de rede */
  network: {
    allowedDomains: string[];
    allowedPorts: number[];
    allowLocalhost: boolean;
    allowUnixSockets: boolean;
  };

  /** Permissões de agentes */
  agents: {
    canRead: string[];    // Estados de agentes que pode ler
    canWrite: string[];   // Estados de agentes que pode modificar
    canExecute: string[]; // Agentes que pode executar
  };
}
```

### 3.5 Plugin Permissions

Baseado no **Cedar Policy Engine** (AWS), a IDEIA utiliza um sistema de permissões refinado para plugins.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CEDAR POLICY — EXEMPLO                         │
│                                                                      │
│  permit (                                                            │
│    principal is Plugin::"@ideia/agent-code-reviewer",                │
│    action in [AgentAction::"read-file", AgentAction::"search-code"], │
│    resource is AgentResource::"filesystem"                          │
│  ) when {                                                            │
│    resource.path.matches("**/*.{ts,js,json}")                      │
│  };                                                                  │
│                                                                      │
│  forbid (                                                            │
│    principal is Plugin::"@ideia/agent-code-reviewer",                │
│    action is AgentAction::"network-request",                        │
│    resource is AgentResource::"network"                             │
│  ) when {                                                            │
│    !resource.domain.endsWith(".github.com") &&                       │
│    !resource.domain.endsWith(".gitlab.com")                         │
│  };                                                                  │
│                                                                      │
│  permit (                                                            │
│    principal is Plugin,                                              │
│    action in [PluginAction::"install", PluginAction::"activate"],    │
│    resource is PluginRegistry                                       │
│  ) when {                                                            │
│    plugin.signature.verified == true &&                              │
│    plugin.scan.vulnerabilities == 0                                 │
│  };                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.6 Plugin Updates (Auto-Update)

```typescript
export interface PluginUpdateConfig {
  /** Canal de atualização */
  channel: 'stable' | 'beta' | 'nightly';

  /** Intervalo de verificação (minutos). 0 = desligado */
  checkIntervalMinutes: number;

  /** Estratégia de atualização */
  strategy: 'manual' | 'automatic' | 'silent';

  /** Permite downgrade? */
  allowDowngrade: boolean;

  /** Rollback automático em caso de falha? */
  autoRollback: boolean;
}

export interface PluginUpdateManager {
  /** Verifica atualizações para todos os plugins */
  checkForUpdates(): Promise<PluginUpdate[]>;

  /** Aplica atualização para um plugin específico */
  update(pluginId: string, version?: string): Promise<void>;

  /** Reverte para versão anterior */
  rollback(pluginId: string): Promise<void>;

  /** Obtém histórico de versões instaladas */
  getVersionHistory(pluginId: string): Promise<PluginVersion[]>;

  /** Escuta eventos de atualização */
  onUpdate: Event<PluginUpdateEvent>;

  /** Escuta erros de atualização */
  onUpdateError: Event<PluginUpdateError>;
}
```

---

## 4. Plugin API Design

### 4.1 Arquitetura da API de Plugins

A API de plugins da IDEIA é organizada em **quatro categorias principais**: Agent Contributions, Provider Contributions, UI Contributions, Language Contributions e Theme Contributions.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      IDEIA PLUGIN API                                │
│                                                                      │
│  @ideia/plugin-api — pacote base para todos os plugins              │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Agent Contributions                                           │   │
│  │  - IdeiaAgentType         (novos tipos de agente)            │   │
│  │  - IdeiaToolFunction      (ferramentas do agente)            │   │
│  │  - IdeiaAgentSkill        (habilidades do agente)            │   │
│  │  - IdeiaAgentMiddleware   (middleware de pipeline)           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Provider Contributions                                        │   │
│  │  - IdeiaLLMProvider        (provedor de modelo LLM)          │   │
│  │  - IdeiaMemoryProvider     (provedor de memória)             │   │
│  │  - IdeiaEventProvider      (provedor de eventos externos)    │   │
│  │  - IdeiaVectorStore        (armazenamento vetorial)          │   │
│  │  - IdeiaEmbeddingProvider  (provedor de embeddings)          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ UI Contributions                                              │   │
│  │  - IdeiaWidget              (widget customizado)             │   │
│  │  - IdeiaWebviewProvider     (webview HTML/JS)                │   │
│  │  - IdeiaStatusBarItem       (item na barra de status)        │   │
│  │  - IdeiaQuickInputProvider  (quick pick customizado)         │   │
│  │  - IdeiaEditorDecoration    (decorações no editor)           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Language Contributions                                         │   │
│  │  - IdeiaLanguageDefinition   (definição de linguagem)         │   │
│  │  - IdeiaGrammar              (TextMate grammar)               │   │
│  │  - IdeiaSnippetProvider      (provedor de snippets)           │   │
│  │  - IdeiaLSPClient            (cliente LSP)                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Theme Contributions                                           │   │
│  │  - IdeiaColorTheme           (tema de cores)                 │   │
│  │  - IdeiaIconTheme            (tema de ícones)                │   │
│  │  - IdeiaProductIconTheme     (tema de ícones do produto)     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Agent Contributions

```typescript
// ============================================================
// Agent Type — Novo tipo de agente
// ============================================================
export interface IdeiaAgentType {
  /** Identificador único do tipo de agente */
  readonly id: string;

  /** Nome legível */
  readonly name: string;

  /** Descrição das capacidades */
  readonly description: string;

  /** Versão do tipo */
  readonly version: string;

  /** Tipo de autonomia padrão */
  readonly defaultAutonomy: AutonomyLevel;

  /** Capacidades declaradas */
  readonly capabilities: string[];

  /** Modelo LLM padrão */
  readonly defaultModel?: string;

  /** Fábrica de instâncias do agente */
  createAgent(context: IdeiaAgentContext): IdeiaAgentInstance;
}

// ============================================================
// Tool Function — Ferramenta executável por agentes
// ============================================================
export interface IdeiaToolFunction {
  /** Identificador único da tool */
  readonly id: string;

  /** Nome legível */
  readonly name: string;

  /** Descrição (usada pelo LLM para decidir usar) */
  readonly description: string;

  /** Schema JSON dos parâmetros (formato JSON Schema) */
  readonly schema: JSONSchema;

  /** Categoria para organização */
  readonly category?: ToolCategory;

  /** Requer permissão explícita do usuário? */
  readonly requiresUserConfirmation?: boolean;

  /** Timeout máximo em ms */
  readonly timeout?: number;

  /** Execução da tool */
  execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}

// ============================================================
// Agent Skill — Habilidade composta
// ============================================================
export interface IdeiaAgentSkill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;

  /** Tools necessárias para esta skill */
  readonly requiredTools: string[];

  /** Modelo de prompt para ativação */
  readonly promptTemplate: string;

  /** Metadados de aprendizado */
  readonly learningMetadata?: SkillLearningMetadata;

  /** Executa a skill */
  execute(params: SkillParams, context: SkillContext): AsyncIterable<SkillStep>;
}

// ============================================================
// Agent Middleware — Pipeline middleware
// ============================================================
export interface IdeiaAgentMiddleware {
  readonly id: string;
  readonly name: string;
  readonly priority: number; // Menor = executado primeiro

  /** Hook antes do agente processar */
  preProcess?(input: AgentInput, context: MiddlewareContext): Promise<AgentInput>;

  /** Hook após o agente processar */
  postProcess?(output: AgentOutput, context: MiddlewareContext): Promise<AgentOutput>;

  /** Hook de erro */
  onError?(error: AgentError, context: MiddlewareContext): Promise<void>;
}
```

### 4.3 Provider Contributions

```typescript
// ============================================================
// LLM Provider — Provedor de modelo de linguagem
// ============================================================
export interface IdeiaLLMProvider {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  /** Modelos disponíveis */
  readonly models: IdeiaModelDescriptor[];

  /** Capacidades do provedor */
  readonly capabilities: LLMProviderCapabilities;

  /** Gera resposta completa */
  generate(params: GenerateParams): Promise<GenerateResponse>;

  /** Gera resposta streaming */
  generateStream(params: GenerateParams): AsyncIterable<GenerateChunk>;

  /** Obtém embedding para um texto */
  embed?(text: string): Promise<number[]>;

  /** Tokeniza um texto */
  tokenize?(text: string): Promise<number[]>;

  /** Conta tokens */
  countTokens?(text: string): Promise<number>;
}

export interface IdeiaModelDescriptor {
  readonly id: string;
  readonly name: string;
  readonly contextLength: number;
  readonly pricing?: ModelPricing;
  readonly capabilities: string[];
}

export interface LLMProviderCapabilities {
  readonly streaming: boolean;
  readonly functionCalling: boolean;
  readonly parallelToolCalls: boolean;
  readonly vision: boolean;
  readonly embeddings: boolean;
  readonly jsonMode: boolean;
  readonly maxConcurrentRequests: number;
}

// ============================================================
// Memory Provider — Provedor de memória persistente
// ============================================================
export interface IdeiaMemoryProvider {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  /** Inicializa o provedor */
  initialize(config: MemoryConfig): Promise<void>;

  /** Armazena um item na memória */
  store(key: string, value: MemoryValue, ttl?: number): Promise<void>;

  /** Recupera um item da memória */
  retrieve(key: string): Promise<MemoryValue | null>;

  /** Busca por similaridade semântica */
  search(query: string, options: SearchOptions): Promise<MemorySearchResult[]>;

  /** Remove um item */
  delete(key: string): Promise<void>;

  /** Lista chaves por prefixo */
  listKeys(prefix: string): Promise<string[]>;

  /** Limpa memória expirada */
  cleanup?(): Promise<number>;
}

export interface MemoryValue {
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
  readonly embedding?: number[];
  readonly timestamp: number;
  readonly ttl?: number;
}

// ============================================================
// Event Provider — Provedor de eventos externos
// ============================================================
export interface IdeiaEventProvider {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  /** Conecta à fonte de eventos */
  connect(): Promise<void>;

  /** Desconecta */
  disconnect(): Promise<void>;

  /** Publica um evento na fonte externa */
  publish(event: ExternalEvent): Promise<void>;

  /** Escuta eventos da fonte externa */
  subscribe(filter: EventFilter, handler: EventHandler): Promise<Disposable>;

  /** Obtém status da conexão */
  readonly status: ConnectionStatus;
}

// ============================================================
// Vector Store — Armazenamento vetorial
// ============================================================
export interface IdeiaVectorStore {
  readonly id: string;
  readonly name: string;
  readonly dimension: number;
  readonly indexType: 'hnsw' | 'ivf' | 'flat';

  /** Insere vetores */
  insert(vectors: VectorRecord[]): Promise<void>;

  /** Busca por similaridade */
  search(query: number[], options: VectorSearchOptions): Promise<VectorSearchResult[]>;

  /** Remove vetores por filtro */
  delete(filter: VectorFilter): Promise<number>;

  /** Atualiza vetor existente */
  update(id: string, vector: number[], metadata?: Record<string, unknown>): Promise<void>;

  /** Obtém estatísticas do índice */
  stats(): Promise<VectorStoreStats>;
}

// ============================================================
// Embedding Provider — Provedor de embeddings
// ============================================================
export interface IdeiaEmbeddingProvider {
  readonly id: string;
  readonly name: string;
  readonly dimension: number;
  readonly model: string;

  /** Gera embedding para um texto */
  embed(text: string): Promise<EmbeddingResult>;

  /** Gera embeddings em lote */
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;
}
```

### 4.4 UI Contributions

```typescript
// ============================================================
// Custom Widget — Widget Theia customizado
// ============================================================
export interface IdeiaWidget {
  readonly id: string;
  readonly name: string;
  readonly iconClass?: string;

  /** Localização padrão */
  readonly defaultLocation?: 'left' | 'right' | 'bottom' | 'main';

  /** Área mínima */
  readonly minSize?: { width: number; height: number };

  /** Fábrica do widget */
  createWidget(): Promise<Widget>;
}

// ============================================================
// Webview Provider — Conteúdo HTML/JS isolado
// ============================================================
export interface IdeiaWebviewProvider {
  readonly id: string;
  readonly name: string;
  readonly location: 'panel' | 'editor' | 'side';

  /** Gera o HTML do webview */
  provideHTML(context: WebviewContext): string | Promise<string>;

  /** Manipula mensagens do webview (postMessage) */
  handleMessage?(message: unknown): void | Promise<void>;

  /** Recursos estáticos do webview (JS, CSS, imagens) */
  readonly resources?: WebviewResource[];

  /** Opções de segurança */
  readonly security?: {
    allowScripts: boolean;
    allowForms: boolean;
    contentSecurityPolicy?: string;
  };
}

// ============================================================
// Status Bar Item
// ============================================================
export interface IdeiaStatusBarItem {
  readonly id: string;
  readonly alignment: 'left' | 'right';
  readonly priority: number;

  /** Texto ou template HTML */
  text: string;
  tooltip?: string;
  color?: string;
  backgroundColor?: string;
  iconClass?: string;

  /** Comando executado ao clicar */
  command?: string;
  commandArgs?: unknown[];

  /** Visibilidade condicional */
  when?: string;

  /** Atualização periódica */
  interval?: number;

  /** Renderização customizada (React) */
  render?(): React.ReactNode;
}

// ============================================================
// Quick Input Provider
// ============================================================
export interface IdeiaQuickInputProvider {
  readonly id: string;
  readonly title: string;
  readonly placeholder: string;
  readonly steps: QuickInputStep[];

  /** Filtro de itens conforme digitação */
  filterItems?(query: string): QuickInputItem[] | Promise<QuickInputItem[]>;

  /** Validação de entrada */
  validate?(value: string): string | null;

  /** Callback quando o input é confirmado */
  onAccept?(result: QuickInputResult): void;

  /** Callback quando é cancelado */
  onCancel?(): void;
}

// ============================================================
// Editor Decoration
// ============================================================
export interface IdeiaEditorDecoration {
  readonly id: string;

  /** Faixa de linhas para decorar */
  readonly range: { startLine: number; endLine: number };

  /** Estilos */
  readonly options: DecorationRenderOptions;

  /** Hover message */
  readonly hoverMessage?: MarkdownString | MarkdownString[];
}
```

### 4.5 Language Contributions

```typescript
// ============================================================
// Language Definition
// ============================================================
export interface IdeiaLanguageDefinition {
  readonly id: string;
  readonly aliases: string[];
  readonly extensions: string[];
  readonly filenames?: string[];
  readonly mimetypes?: string[];
  readonly configuration?: LanguageConfiguration;
}

export interface LanguageConfiguration {
  readonly comments?: CommentRule;
  readonly brackets?: BracketsRule[];
  readonly autoClosingPairs?: AutoClosingPair[];
  readonly surroundingPairs?: SurroundingPair[];
  readonly wordPattern?: string;
  readonly indentationRules?: IndentationRules;
  readonly folding?: FoldingRules;
}

// ============================================================
// TextMate Grammar
// ============================================================
export interface IdeiaGrammar {
  readonly language: string;
  readonly scopeName: string;
  readonly path: string;
  readonly embeddedLanguages?: Record<string, string>;
  readonly tokenTypes?: Record<string, 'normal' | 'delimited' | 'other'>;
  readonly injectTo?: string[];
}

// ============================================================
// Snippet Provider
// ============================================================
export interface IdeiaSnippetProvider {
  readonly language: string;

  /** Retorna snippets disponíveis */
  provideSnippets(options: SnippetProviderOptions): Snippet[];

  /** Snippet trigger (prefixo que ativa) */
  readonly triggerCharacters?: string[];
}

export interface Snippet {
  readonly label: string;
  readonly description?: string;
  readonly prefix: string;
  readonly body: string | string[];
  readonly scope?: string;
}

// ============================================================
// LSP Client — Cliente Language Server Protocol
// ============================================================
export interface IdeiaLSPClient {
  readonly id: string;
  readonly name: string;
  readonly language: string;
  readonly fileExtensions: string[];

  /** Comando ou módulo para iniciar o language server */
  readonly serverCommand: string | string[];

  /** Argumentos adicionais */
  readonly args?: string[];

  /** Opções de inicialização */
  readonly initializationOptions?: Record<string, unknown>;

  /** Variáveis de ambiente */
  readonly env?: Record<string, string>;

  /** Workshop de configuração */
  readonly configWorkspace?: string;

  /** Mapeamento de configuração LSP */
  readonly configurationMapping?: Record<string, string>;

  /** Opções de comunicação */
  readonly transport?: 'stdio' | 'pipe' | 'socket' | 'webSocket';
}
```

### 4.6 Theme Contributions

```typescript
// ============================================================
// Color Theme
// ============================================================
export interface IdeiaColorTheme {
  readonly id: string;
  readonly name: string;
  readonly type: 'dark' | 'light' | 'highContrast';
  readonly path: string;

  /** Tema base para herança */
  readonly extends?: string;

  /** Metadados de acessibilidade */
  readonly accessibility?: {
    readonly wcagLevel: 'AA' | 'AAA';
    readonly contrastRatio: number;
  };

  /** Paleta de cores (útil para tooling) */
  readonly semanticPalette?: Record<string, string>;

  /** Cores do editor */
  readonly colors: Record<string, string>;

  /** Regras de tokenização TextMate */
  readonly tokenColors?: TokenColorRule[];

  /** Regras de tokens semânticos */
  readonly semanticTokenColors?: Record<string, TokenColorRule>;
}

// ============================================================
// Icon Theme
// ============================================================
export interface IdeiaIconTheme {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly showLanguageModeIcons?: boolean;

  /** Mapeamento de extensão para ícone */
  readonly fileExtensions?: Record<string, string>;

  /** Mapeamento de nome de arquivo para ícone */
  readonly fileNames?: Record<string, string>;

  /** Mapeamento de linguagem para ícone */
  readonly languageIds?: Record<string, string>;

  /** Ícones para pastas */
  readonly folderNames?: Record<string, string>;
  readonly folderNamesExpanded?: Record<string, string>;
  readonly rootFolder?: string;

  /** Ícones padrão */
  readonly file?: string;
  readonly folder?: string;
  readonly folderExpanded?: string;
}

// ============================================================
// Product Icon Theme
// ============================================================
export interface IdeiaProductIconTheme {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly fontId?: string;

  /** Fonte de ícones */
  readonly fontDefinition?: {
    readonly fontFamily: string;
    readonly fontWeight?: string;
    readonly fontStyle?: string;
    readonly src: { path: string; format: string }[];
  };

  /** Mapeamento de ícones do produto */
  readonly icons: Record<string, ProductIconDefinition>;
}

export interface ProductIconDefinition {
  readonly fontCharacter: string;
  readonly fontId?: string;
}
```

---

## 5. MCP — Model Context Protocol

### 5.1 Visão Geral

O **MCP (Model Context Protocol)** é um protocolo aberto padronizado pela Anthropic para fornecer **contexto e ferramentas** para modelos de linguagem. Ele define três primitivas principais:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MODEL CONTEXT PROTOCOL (MCP)                    │
│                                                                      │
│  ┌─────────────────────┐    ┌────────────────────────────────┐      │
│  │     MCP Client      │    │        MCP Server(s)           │      │
│  │   (IDEIA Agent)     │    │                                │      │
│  │                     │    │  ┌──────────────────────────┐  │      │
│  │  ┌───────────────┐  │    │  │ File System Server      │  │      │
│  │  │ Resources     │──┼────┼─▶│ - read/write files      │  │      │
│  │  │ (contexto)    │  │    │  │ - search directories     │  │      │
│  │  └───────────────┘  │    │  └──────────────────────────┘  │      │
│  │                     │    │                                │      │
│  │  ┌───────────────┐  │    │  ┌──────────────────────────┐  │      │
│  │  │ Tools         │──┼────┼─▶│ GitHub Server           │  │      │
│  │  │ (ações)       │  │    │  │ - create PR             │  │      │
│  │  └───────────────┘  │    │  │ - list issues            │  │      │
│  │                     │    │  │ - review code            │  │      │
│  │  ┌───────────────┐  │    │  └──────────────────────────┘  │      │
│  │  │ Prompts       │──┼────┼─▶                                │      │
│  │  │ (templates)   │  │    │  ┌──────────────────────────┐  │      │
│  │  └───────────────┘  │    │  │ Database Server          │  │      │
│  │                     │    │  │ - query SQL              │  │      │
│  │  ┌───────────────┐  │    │  │ - schema introspection   │  │      │
│  │  │ Sampling      │──┼────┼─▶│ - migrate               │  │      │
│  │  │ (LLM call)    │  │    │  └──────────────────────────┘  │      │
│  │  └───────────────┘  │    │                                │      │
│  └─────────────────────┘    └────────────────────────────────┘      │
│                                                                      │
│  Transporte: STDIO (local) ou SSE (remoto)                          │
│  Encoding: JSON-RPC 2.0                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 MCP Primitives

| Primitiva | Descrição | Direção | Exemplo |
|-----------|-----------|---------|---------|
| **Resources** | Dados contextuais expostos pelo servidor | Server → Client | Conteúdo de arquivo, schema de DB |
| **Tools** | Funções executáveis pelo modelo | Client → Server | `createFile`, `searchCode` |
| **Prompts** | Templates de prompt gerenciados | Server → Client | "Revise este diff" |
| **Sampling** | Solicitação do servidor ao LLM | Server → Client | Server pede geração |

### 5.3 Protocol MCP — JSON-RPC

```typescript
// ============================================================
// MCP — Resource
// ============================================================
export interface MCPResource {
  /** URI do recurso (ex: file:///project/src/main.ts) */
  uri: string;

  /** Tipo MIME */
  mimeType?: string;

  /** Nome legível */
  name: string;

  /** Descrição */
  description?: string;

  /** Metadados adicionais */
  metadata?: Record<string, unknown>;
}

export interface MCPResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string; // base64
}

// Requests de Resource
interface ReadResourceRequest {
  method: 'resources/read';
  params: { uri: string };
}

interface ListResourcesRequest {
  method: 'resources/list';
}

interface SubscribeResourceRequest {
  method: 'resources/subscribe';
  params: { uri: string };
}

// ============================================================
// MCP — Tool
// ============================================================
export interface MCPTool {
  /** Nome da tool (usado pelo LLM) */
  name: string;

  /** Descrição detalhada */
  description: string;

  /** Schema JSON dos parâmetros */
  inputSchema: JSONSchema;
}

export interface MCPToolResult {
  /** Conteúdo do resultado */
  content: MCPContent[];

  /** Indica erro */
  isError?: boolean;
}

export type MCPContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; resource: MCPResourceContent };

// Requests de Tool
interface CallToolRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

interface ListToolsRequest {
  method: 'tools/list';
}

// ============================================================
// MCP — Prompt
// ============================================================
export interface MCPPrompt {
  /** Nome do prompt */
  name: string;

  /** Descrição */
  description?: string;

  /** Argumentos do template */
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface MCPPromptMessage {
  role: 'user' | 'assistant';
  content: MCPContent;
}

// Requests de Prompt
interface GetPromptRequest {
  method: 'prompts/get';
  params: {
    name: string;
    arguments?: Record<string, string>;
  };
}

interface ListPromptsRequest {
  method: 'prompts/list';
}
```

### 5.4 MCP Servers — Internos e Externos

A IDEIA suporta dois tipos de servidores MCP:

```typescript
// ============================================================
// Internal MCP Server — Executado in-process na IDEIA
// ============================================================
export interface IdeiaMCPServerInternal {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;

  /** Inicializa o servidor (bind de resources, tools, prompts) */
  initialize(server: MCPServerInstance): void;

  /** Cleanup */
  dispose(): void;
}

// ============================================================
// External MCP Server — Processo separado (stdio ou SSE)
// ============================================================
export interface IdeiaMCPServerExternal {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly command?: string;    // Para stdio transport
  readonly args?: string[];
  readonly url?: string;        // Para SSE transport
  readonly transport: 'stdio' | 'sse';
  readonly env?: Record<string, string>;
  readonly autoStart?: boolean;
  readonly restartOnCrash?: boolean;

  /** Timeout de inicialização */
  readonly startupTimeout?: number;

  /** Permissões */
  readonly permissions?: MCSPermissions;
}

// ============================================================
// Registro de servidores MCP
// ============================================================
export interface IdeiaMCPRegistry {
  /** Registra um servidor MCP interno */
  registerInternal(server: IdeiaMCPServerInternal): Disposable;

  /** Registra um servidor MCP externo */
  registerExternal(config: IdeiaMCPServerExternal): Disposable;

  /** Obtém servidor por ID */
  getServer(id: string): MCPServerInstance | undefined;

  /** Lista servidores disponíveis */
  listServers(): MCPServerDescription[];

  /** Inicia servidor externo */
  startServer(id: string): Promise<void>;

  /** Para servidor externo */
  stopServer(id: string): Promise<void>;
}
```

### 5.5 MCP Tools como Extensão de Agentes

Na IDEIA, tools MCP são automaticamente expostas como **Tool Functions** para os agentes:

```
┌─────────────────────────────────────────────────────────────────────┐
│             MCP → IDEIA Agent Tools Mapping                          │
│                                                                      │
│  ┌─────────────────────┐       ┌────────────────────────────┐       │
│  │    MCP Server       │       │    IDEIA Agent Runtime      │       │
│  │                     │       │                              │       │
│  │  tools/list ────────┼───────┼─▶ ToolFunctionRegistry      │       │
│  │  - getWeather       │       │    - ideia-mcp.getWeather    │       │
│  │  - searchFiles      │       │    - ideia-mcp.searchFiles   │       │
│  │  - queryDB          │       │    - ideia-mcp.queryDB       │       │
│  │                     │       │                              │       │
│  │  resources/list ────┼───────┼─▶ ResourceProvider           │       │
│  │  - file:///logs     │       │    - contexto automático     │       │
│  │  - db://schema      │       │                              │       │
│  │                     │       │                              │       │
│  │  prompts/list ──────┼───────┼─▶ PromptStore                │       │
│  │  - review-prompt    │       │    - templates de prompt     │       │
│  │  - debug-prompt     │       │                              │       │
│  └─────────────────────┘       └────────────────────────────┘       │
│                                                                      │
│  NATS Bridge: MCP Servers externos se comunicam via NATS            │
│  ┌────────────┐    ┌──────────────────┐    ┌───────────────┐        │
│  │ MCP Server │───▶│ NATS JetStream   │◀───│ IDEIA Agent   │        │
│  │ (stdin)    │    │ (message broker) │    │ Runtime        │        │
│  └────────────┘    └──────────────────┘    └───────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.6 MCP Resources no Contexto do Agente

```typescript
// Como o agente IDEIA utiliza MCP resources como contexto
export interface IdeiaMCPContextProvider {
  /** Coleta resources de todos os servidores MCP registrados */
  collectContext(query: ContextQuery): Promise<MCPResourceContent[]>;

  /** Prioriza resources por relevância */
  prioritizeResources(
    resources: MCPResourceContent[],
    task: string
  ): MCPResourceContent[];

  /** Formata resources como contexto para o LLM */
  formatAsContext(resources: MCPResourceContent[]): string;
}

// Exemplo de uso interno
class IdeiaAgentExecutor {
  async execute(agent: IdeiaAgent, task: string): Promise<void> {
    // Coleta contexto de todos os servidores MCP
    const contextResources = await this.mcpContextProvider.collectContext({
      task,
      relevantUris: [
        `file://${agent.workspace}`,
        `ideiamemory://agent/${agent.id}/history`
      ]
    });

    // Formata como contexto para o LLM
    const context = this.mcpContextProvider.formatAsContext(contextResources);

    // Adiciona tools dos servidores MCP
    const mcpTools = this.mcpRegistry
      .listServers()
      .flatMap(s => s.tools)
      .map(t => this.toToolFunction(t));

    // Executa o agente com contexto + tools
    await agent.run(task, {
      extraContext: context,
      extraTools: mcpTools
    });
  }
}
```

### 5.7 MCP Servers Built-in da IDEIA

| Servidor | Recursos | Tools | Transport |
|----------|----------|-------|-----------|
| `@ideia/mcp-filesystem` | Conteúdo de arquivos | read, write, search, mkdir, delete | stdio |
| `@ideia/mcp-git` | Git log, diff, status | commit, branch, push, pull | stdio |
| `@ideia/mcp-github` | Issues, PRs, code search | createPR, reviewPR, listIssues | SSE |
| `@ideia/mcp-nats` | Streams, KV, ObjectStore | publish, subscribe, kvGet, kvSet | internal |
| `@ideia/mcp-database` | Schemas, tables, views | query, migrate, backup | stdio |
| `@ideia/mcp-memory` | Histórico de sessões | storeRecall, semanticSearch | internal |
| `@ideia/mcp-terminal` | Output de terminal | execCommand, readOutput | internal |

---

## 6. A2A — Agent-to-Agent Protocol

### 6.1 Visão Geral do Google A2A

O **A2A (Agent-to-Agent Protocol)** é um protocolo aberto proposto pelo Google para permitir que agentes de IA de diferentes provedores colaborem entre si. A IDEIA adota o A2A como padrão de comunicação entre agentes, com NATS como transporte subjacente.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      A2A PROTOCOL ARCHITECTURE                       │
│                                                                      │
│  ┌─────────────────────┐           ┌─────────────────────┐         │
│  │    Agent Client     │           │    Agent Server      │         │
│  │  (IDEIA orchestrator)│          │  (IDEIA agent)       │         │
│  │                     │           │                      │         │
│  │  ┌───────────────┐  │   A2A    │  ┌───────────────┐  │         │
│  │  │ Agent Card    │──┼──────────┼─▶│ Agent Card    │  │         │
│  │  │ (descoberta)  │  │          │  │ + skills      │  │         │
│  │  └───────────────┘  │          │  └───────────────┘  │         │
│  │                     │          │                      │         │
│  │  ┌───────────────┐  │ sendTask │  ┌───────────────┐  │         │
│  │  │ Task           │──┼──────────┼─▶│ Task          │  │         │
│  │  │ (instrução)   │  │          │  │ + artifacts   │  │         │
│  │  └───────────────┘  │          │  └───────────────┘  │         │
│  │                     │          │                      │         │
│  │  ┌───────────────┐  │ getTask  │  ┌───────────────┐  │         │
│  │  │ Artifact       │◀─┼──────────┼──│ Artifact      │  │         │
│  │  │ (resultado)   │  │          │  │ + partes      │  │         │
│  │  └───────────────┘  │          │  └───────────────┘  │         │
│  └─────────────────────┘           └─────────────────────┘         │
│                                                                      │
│  Transporte: HTTP (padrão A2A) ou NATS (IDEIA)                     │
│  Encoding: JSON-LD                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Agent Card — Descoberta de Agentes

O **Agent Card** é o manifesto de capacidades de um agente, usado para descoberta e roteamento.

```typescript
// ============================================================
// A2A Agent Card — Manifesto do agente
// ============================================================
export interface A2AAgentCard {
  /** Identificador único do agente */
  readonly id: string;

  /** Nome legível */
  readonly name: string;

  /** Descrição das capacidades */
  readonly description: string;

  /** URL do servidor A2A */
  readonly url: string;

  /** Versão do protocolo A2A */
  readonly protocolVersion: string;

  /** Capacidades do agente */
  readonly capabilities: A2ACapabilities;

  /** Skills disponíveis */
  readonly skills: A2ASkill[];

  /** Autenticação requerida */
  readonly authentication?: A2AAuthRequirement;

  /** Metadados adicionais */
  readonly metadata?: Record<string, unknown>;
}

export interface A2ACapabilities {
  /** Suporta streaming de artifacts? */
  readonly streaming: boolean;

  /** Suporta push de notificações? */
  readonly pushNotifications: boolean;

  /** Estados de tarefa suportados */
  readonly states: A2ATaskState[];

  /** Formato de conteúdo suportado */
  readonly contentTypes: string[];

  /** Máximo de tarefas simultâneas */
  readonly maxConcurrentTasks: number;
}

export interface A2ASkill {
  /** Identificador da skill */
  readonly id: string;

  /** Nome */
  readonly name: string;

  /** Descrição do que a skill faz */
  readonly description: string;

  /** Tags para categorização */
  readonly tags: string[];

  /** Exemplos de input/output */
  readonly examples?: A2ASkillExample[];

  /** Schema dos parâmetros da skill */
  readonly inputSchema?: JSONSchema;

  /** Schema do resultado */
  readonly outputSchema?: JSONSchema;
}

export interface A2ASkillExample {
  readonly name: string;
  readonly description: string;
  readonly input: Record<string, unknown>;
  readonly output: Record<string, unknown>;
}
```

### 6.3 Task e Artifact — Execução de Tarefas

```typescript
// ============================================================
// A2A Task — Unidade de trabalho entre agentes
// ============================================================
export interface A2ATask {
  /** ID único da tarefa */
  readonly id: string;

  /** ID do agente que enviou */
  readonly sessionId: string;

  /** ID do agente de destino */
  readonly targetAgentId: string;

  /** Estado atual */
  readonly status: A2ATaskState;

  /** Mensagem de entrada (instrução) */
  readonly message: A2AMessage;

  /** Histórico de mensagens */
  readonly history: A2AMessage[];

  /** Artifacts produzidos */
  readonly artifacts: A2AArtifact[];

  /** Metadados */
  readonly metadata?: Record<string, unknown>;
}

export type A2ATaskState =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'completed'
  | 'failed'
  | 'canceled';

export interface A2AMessage {
  readonly role: 'user' | 'agent';
  readonly parts: A2APart[];
  readonly timestamp: string;
}

export type A2APart =
  | { type: 'text'; text: string }
  | { type: 'file'; file: A2AFile }
  | { type: 'data'; data: Record<string, unknown> }
  | { type: 'function-call'; functionCall: A2AFunctionCall }
  | { type: 'function-response'; functionResponse: A2AFunctionResponse };

export interface A2AFile {
  readonly name: string;
  readonly mimeType: string;
  readonly bytes?: string; // base64
  readonly uri?: string;   // URL referenciável
}

export interface A2AFunctionCall {
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

export interface A2AFunctionResponse {
  readonly name: string;
  readonly response: Record<string, unknown>;
}

// ============================================================
// A2A Artifact — Resultado produzido
// ============================================================
export interface A2AArtifact {
  /** Nome do artifact */
  readonly name: string;

  /** Descrição */
  readonly description?: string;

  /** Partes do artifact (streaming incremental) */
  readonly parts: A2APart[];

  /** Index da parte (para append) */
  readonly index: number;

  /** Indica se é append ou substituição */
  readonly append: boolean;

  /** Metadados */
  readonly metadata?: Record<string, unknown>;
}

// ============================================================
// A2A API — Endpoints Principais
// ============================================================
export interface A2AServerAPI {
  /** Envia uma tarefa para o agente */
  sendTask(task: A2ATask): Promise<A2ATask>;

  /** Envia tarefa com streaming de artifacts */
  sendTaskStreaming(
    task: A2ATask,
    callbacks: A2AStreamingCallbacks
  ): Promise<void>;

  /** Obtém status e resultado de uma tarefa */
  getTask(taskId: string): Promise<A2ATask>;

  /** Cancela uma tarefa em andamento */
  cancelTask(taskId: string): Promise<void>;

  /** Obtém o Agent Card (descoberta) */
  getAgentCard(): Promise<A2AAgentCard>;

  /** Obtém skills disponíveis */
  getSkills(): Promise<A2ASkill[]>;

  /** Obtém estado de saúde do agente */
  healthCheck(): Promise<A2AHealthStatus>;
}

export interface A2AStreamingCallbacks {
  onArtifact?(artifact: A2AArtifact): void;
  onStatus?(status: A2ATaskState): void;
  onError?(error: A2AError): void;
  onComplete?(task: A2ATask): void;
}
```

### 6.4 Skill Discovery entre Agentes

A descoberta de skills no ecossistema IDEIA ocorre via **NATS + Agent Card Registry**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SKILL DISCOVERY FLOW                              │
│                                                                      │
│  ┌──────────────┐                                                    │
│  │ Agent Alpha  │                                                    │
│  │ (precisa de  │                                                    │
│  │  code review)│                                                    │
│  └──────┬───────┘                                                    │
│         │                                                            │
│         │ 1. Query: "agents with skill.code-review"                  │
│         ▼                                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                 NATS Agent Registry                           │   │
│  │  ┌────────────────────┐  ┌────────────────────┐             │   │
│  │  │ Agent Beta         │  │ Agent Gamma        │             │   │
│  │  │ skills: code-review│  │ skills: code-review│             │   │
│  │  │                    │  │ + security-scan    │             │   │
│  │  │ expertise: TS, JS  │  │ expertise: Python  │             │   │
│  │  └────────────────────┘  └────────────────────┘             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         │                                                            │
│         │ 2. Agent Cards retornados                                  │
│         ▼                                                            │
│  ┌──────────────┐                                                    │
│  │ Agent Alpha  │──▶ 3. Seleciona Beta (match TS/JS)               │
│  └──────┬───────┘                                                    │
│         │                                                            │
│         │ 4. sendTask({skill: 'code-review', file: 'src/app.ts'})   │
│         ▼                                                            │
│  ┌──────────────┐                                                    │
│  │ Agent Beta   │──▶ 5. Executa review, retorna artifact           │
│  └──────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// Registro de agentes para descoberta via NATS
export interface IdeiaAgentRegistry {
  /** Publica Agent Card no registry */
  publishAgentCard(card: A2AAgentCard): Promise<void>;

  /** Remove Agent Card */
  unpublishAgentCard(agentId: string): Promise<void>;

  /** Busca agentes por skill */
  findAgentsBySkill(skillId: string): Promise<A2AAgentCard[]>;

  /** Busca agentes por capacidade */
  findAgentsByCapability(capability: string): Promise<A2AAgentCard[]>;

  /** Busca agente específico */
  getAgentCard(agentId: string): Promise<A2AAgentCard | null>;

  /** Escuta mudanças no registry */
  onAgentRegistered: Event<A2AAgentCard>;
  onAgentUnregistered: Event<string>;
  onAgentUpdated: Event<A2AAgentCard>;
}
```

### 6.5 Integração com NATS como Transport

A IDEIA substitui o HTTP padrão do A2A por **NATS JetStream** como transporte, trazendo benefícios de resiliência, persistência e baixa latência.

```
┌─────────────────────────────────────────────────────────────────────┐
│                 A2A OVER NATS JETSTREAM                              │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     NATS JetStream                             │  │
│  │                                                                  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │ Agent Registry (KV Bucket)                               │   │  │
│  │  │  agents.alpha.card  → AgentCard                          │   │  │
│  │  │  agents.beta.card   → AgentCard                          │   │  │
│  │  │  agents.gamma.card  → AgentCard                          │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │ Task Streams (JetStream)                                 │   │  │
│  │  │  a2a.tasks.alpha     → Task events                      │   │  │
│  │  │  a2a.tasks.beta      → Task events                      │   │  │
│  │  │  a2a.artifacts.beta  → Artifact stream                  │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │ Request-Reply (síncrono)                                │   │  │
│  │  │  a2a.req.beta.sendTask  → Reply: Task                   │   │  │
│  │  │  a2a.req.beta.getCard   → Reply: AgentCard              │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────┐              ┌──────────────┐                     │
│  │ Agent Alpha  │              │ Agent Beta   │                     │
│  │              │───pub/sub───▶│              │                     │
│  │              │◀──req/rep────│              │                     │
│  └──────────────┘              └──────────────┘                     │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// Implementação A2A sobre NATS na IDEIA
export class A2ANATSTransport implements A2AServerAPI {
  constructor(
    private readonly nats: NatsConnection,
    private readonly agentId: string
  ) {}

  async sendTask(task: A2ATask): Promise<A2ATask> {
    const subject = `a2a.req.${task.targetAgentId}.sendTask`;
    const response = await this.nats.request(subject, 5000, JSON.encode(task));
    return JSON.parse(response.data) as A2ATask;
  }

  async sendTaskStreaming(
    task: A2ATask,
    callbacks: A2AStreamingCallbacks
  ): Promise<void> {
    const streamSubject = `a2a.tasks.${task.targetAgentId}`;
    const sub = this.nats.subscribe(streamSubject, {
      stream: `a2a_tasks_${task.targetAgentId}`,
      deliverPolicy: DeliverPolicy.LastPerSubject
    });

    // Publica tarefa
    await this.nats.publish(`${streamSubject}.${task.id}`, JSON.encode(task));

    // Escuta artifacts e atualizações de estado em streaming
    for await (const msg of sub) {
      const event = JSON.parse(msg.data) as A2ATaskStreamEvent;
      switch (event.type) {
        case 'artifact':
          callbacks.onArtifact?.(event.artifact);
          break;
        case 'status':
          callbacks.onStatus?.(event.status);
          if (event.status === 'completed' || event.status === 'failed') {
            const finalTask = await this.getTask(task.id);
            callbacks.onComplete?.(finalTask);
          }
          break;
        case 'error':
          callbacks.onError?.(event.error);
          break;
      }
    }
  }

  async getTask(taskId: string): Promise<A2ATask> {
    const subject = `a2a.req.${this.agentId}.getTask`;
    const response = await this.nats.request(subject, 5000, JSON.encode({ taskId }));
    return JSON.parse(response.data) as A2ATask;
  }

  async cancelTask(taskId: string): Promise<void> {
    await this.nats.publish(
      `a2a.tasks.${this.agentId}.${taskId}.cancel`,
      JSON.encode({ taskId })
    );
  }

  async getAgentCard(): Promise<A2AAgentCard> {
    const kv = await this.nats.jetstream().views.kv('agent_registry');
    const entry = await kv.get(`agents.${this.agentId}.card`);
    return JSON.parse(new TextDecoder().decode(entry!.value)) as A2AAgentCard;
  }

  async getSkills(): Promise<A2ASkill[]> {
    const card = await this.getAgentCard();
    return card.skills;
  }

  async healthCheck(): Promise<A2AHealthStatus> {
    return { status: 'healthy', agentId: this.agentId, timestamp: Date.now() };
  }

  // Configura listeners NATS para o servidor
  async startServer(handler: A2ARequestHandler): Promise<void> {
    // Escuta requisições de tarefa
    const reqSub = `a2a.req.${this.agentId}.sendTask`;
    const replyToRequests = await this.nats.subscribe(reqSub);
    (async () => {
      for await (const msg of replyToRequests) {
        const task = JSON.parse(msg.data) as A2ATask;
        const response = await handler.handleTask(task);
        msg.respond(JSON.encode(response));
      }
    })();

    // Escuta requisições de Agent Card
    const cardSub = `a2a.req.${this.agentId}.getCard`;
    const repliesToCard = await this.nats.subscribe(cardSub);
    (async () => {
      for await (const msg of repliesToCard) {
        const card = await this.getAgentCard();
        msg.respond(JSON.encode(card));
      }
    })();

    // Publica Agent Card no registro KV
    const kv = await this.nats.jetstream().views.kv('agent_registry');
    await kv.put(
      `agents.${this.agentId}.card`,
      JSON.encode(await this.getAgentCard())
    );
  }
}
```

### 6.6 A2A + MCP — Interoperabilidade

A IDEIA unifica A2A e MCP em um único runtime de agentes:

```
┌─────────────────────────────────────────────────────────────────────┐
│            UNIFICAÇÃO A2A + MCP NO RUNTIME IDEIA                     │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     IDEIA Agent Runtime                      │   │
│  │                                                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │ A2A Handler  │  │ MCP Client   │  │ LLM Model        │   │   │
│  │  │ (agente      │  │ (tools,      │  │ (inference)      │   │   │
│  │  │  colaboração)│  │  resources)  │  │                  │   │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────────┘   │   │
│  └─────────┼─────────────────┼──────────────────────────────────┘   │
│            │                 │                                       │
│            ▼                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   NATS JetStream Bus                         │   │
│  │                                                               │   │
│  │  a2a.req.*   │  a2a.tasks.* │  mcp.tools.*  │  mcp.res.*   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│            │                 │                                       │
│            ▼                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │   Agent A (Code Reviewer)  │  Agent B (Security Scanner)    │   │
│  │   Agent C (Planner)        │  MCP Server (Filesystem)       │   │
│  │   MCP Server (GitHub)      │  MCP Server (Database)         │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

| Aspecto | A2A | MCP | IDEIA Unificado |
|---------|-----|-----|-----------------|
| **Propósito** | Colaboração agente↔agente | Contexto + ferramentas para LLM | Ambos |
| **Primitivas** | Task, Artifact, Agent Card | Resource, Tool, Prompt | Todos |
| **Transporte** | HTTP / NATS | STDIO / SSE / NATS | NATS (unificado) |
| **Descoberta** | Agent Card Registry | MCP Server list | KV Bucket NATS |
| **Streaming** | Artifact parts streaming | Tool result streaming | NATS JetStream |
| **Segurança** | Auth per request | Aquívio de transporte | Cedar Policy |

### 6.7 Cenário Completo — Agentes Colaborativos

```
┌─────────────────────────────────────────────────────────────────────┐
│              CENÁRIO: DESENVOLVIMENTO COLABORATIVO                   │
│                                                                      │
│  Usuário: "Implemente autenticação JWT e revise"                    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. Orchestrator Agent (IDEIA Core)                            │  │
│  │    - Interpreta requisição do usuário                         │  │
│  │    - Cria plano: [implementar, testar, revisar, deploy]       │  │
│  │    - Delega sub-tarefas via A2A                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                               │                                      │
│            ┌──────────────────┼──────────────────┐                   │
│            ▼                  ▼                  ▼                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │
│  │ Dev Agent    │   │ Tester Agent │   │ Reviewer     │            │
│  │              │   │              │   │ Agent        │            │
│  │ Gera código  │   │ Cria testes  │   │ Code review  │            │
│  │ com MCP:     │   │ com MCP:     │   │ com MCP:     │            │
│  │ - fs.write   │   │ - test.run   │   │ - git.diff   │            │
│  │ - gh.createPR│   │ - coverage   │   │ - lint.run   │            │
│  └──────────────┘   └──────────────┘   └──────────────┘            │
│                          │                   │                       │
│                          ▼                   ▼                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 4. Orchestrator consolida resultados                         │  │
│  │    - Passa aprovação para Security Agent via A2A             │  │
│  │    - Security Agent usa MCP: snyk.scan, dep.check           │  │
│  │    - Resultado final apresentado ao usuário                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// Exemplo: Implementação de um agente A2A na IDEIA
@injectable()
export class CodeReviewerAgent implements IdeiaAgentType {
  readonly id = 'ideia.agent.code-reviewer';
  readonly name = 'Code Reviewer';
  readonly description = 'Agente especializado em code review';
  readonly version = '1.0.0';
  readonly defaultAutonomy = 'guided' as AutonomyLevel;
  readonly capabilities = ['code-review', 'lint-analysis'];

  createAgent(context: IdeiaAgentContext): IdeiaAgentInstance {
    return {
      id: context.agentId,
      type: this.id,
      async run(task: string, config?: AgentRunConfig): Promise<AgentResult> {
        const a2aTransport = context.getService<A2ANATSTransport>(TYPES.A2ATransport);
        const mcpRegistry = context.getService<IdeiaMCPRegistry>(TYPES.MCPRegistry);

        // Coleta contexto via MCP
        const files = await mcpRegistry.getServer('@ideia/mcp-filesystem');
        const git = await mcpRegistry.getServer('@ideia/mcp-git');

        const diff = await git.tools.call('diff', { staged: false });
        const changedFiles = await files.tools.call('search', {
          pattern: config?.extra?.filePattern ?? '**/*.ts'
        });

        // Executa análise via LLM
        const analysis = await context.callLLM({
          model: config?.model ?? 'ollama/llama3',
          systemPrompt: 'You are a code reviewer. Analyze the diff and provide feedback.',
          messages: [
            { role: 'user', content: `Review this diff:\n${diff.content[0].text}` }
          ]
        });

        // Envia resultado como artifact via A2A
        const artifact: A2AArtifact = {
          name: 'code-review-result',
          parts: [{ type: 'text', text: analysis.content }],
          index: 0,
          append: false
        };

        // Publica no stream de artifacts
        await a2aTransport.sendTask({
          id: crypto.randomUUID(),
          sessionId: context.sessionId,
          targetAgentId: 'orchestrator',
          status: 'completed',
          message: { role: 'agent', parts: [{ type: 'text', text: 'Review complete' }], timestamp: new Date().toISOString() },
          history: [],
          artifacts: [artifact]
        });

        return { success: true, artifacts: [artifact] };
      }
    };
  }
}
```

---

## Referências

1. **OpenVSX** — https://open-vsx.org
2. **VS Code Extension API** — https://code.visualstudio.com/api
3. **Theia Platform** — https://theia-ide.org
4. **Eclipse Theia — Extensibility** — https://theia-ide.org/docs/extensions
5. **InversifyJS** — https://inversify.io
6. **MCP Specification** — https://modelcontextprotocol.io
7. **A2A Protocol (Google)** — https://github.com/google/A2A
8. **NATS JetStream** — https://docs.nats.io/nats-concepts/jetstream
9. **Cedar Policy (AWS)** — https://www.cedarpolicy.com
10. **Debug Adapter Protocol** — https://microsoft.github.io/debug-adapter-protocol
11. **Language Server Protocol** — https://microsoft.github.io/language-server-protocol
12. **xterm.js** — https://xtermjs.org
13. **Verdaccio** (npm registry) — https://verdaccio.org
14. **Sigstore** (assinatura) — https://www.sigstore.dev

---

## Intensificação: Roteiro de Implementação

### Tasks Geradas

1. **Implementar Plugin SDK (`packages/plugin-sdk/`)**
   - Interface `IDEIAPlugin` com lifecycle (activate, deactivate, onDidChange)
   - API de contribuição: commands, views, languages, keybindings, menus
   - SDK de agentes: `AgentTool`, `AgentProvider`, `MemoryProvider`
   - Sistema de permissions baseado em manifest.json (permissions array)
   - Base: seção 4 (Plugin API Design), seção 1 (VS Code Extension API)

2. **Implementar MCP Tool Registry (`packages/mcp-server/`)**
   - Servidor MCP (Model Context Protocol) com tools/list, tools/call
   - Registro de ferramentas de agentes via decorator `@agentTool()`
   - Integração com Provider Router para LLMs chamarem ferramentas
   - Schema validation com Zod para tool parameters
   - Base: seção 5 (MCP — Model Context Protocol), seção 1.5 (DAP)

3. **Implementar OpenVSX Publisher (`packages/openvsx-publisher/`)**
   - CLI `npx ideia publish` para publicar extensões no OpenVSX
   - Validação de manifesto, asset bundling, versionamento
   - Assinatura Sigstore para integridade do pacote
   - CI pipeline automatizado com GitHub Actions
   - Base: seção 1 (OpenVSX), seção 3 (IDEIA Marketplace)

4. **Implementar IDEIA Marketplace (`packages/marketplace/`)**
   - Registry próprio com catálogo de plugins, agentes, temas, snippets
   - API REST: search, install, update, uninstall
   - Integração com OpenVSX como registry upstream
   - Interface Theia Widget para Marketplace Explorer
   - Base: seção 3 (IDEIA Marketplace), seção 1.1 (OpenVSX registry)

5. **Implementar A2A Agent-to-Agent Protocol Bridge**
   - Implementar A2A protocol (Google) para comunicação entre agentes
   - Task-oriented messaging: submit, cancel, getStatus, getResult
   - Integração com LangGraph (Fase 3 multiagente)
   - Fallback para NATS Req/Rep quando A2A não disponível
   - Base: seção 6 (A2A Protocol), seção 5.4 (composição de ferramentas)

6. **Implementar Theia Extensibility Hooks**
   - Contribution points específicos IDEIA: `ideiaAgent`, `ideiaProvider`, `ideiaTool`
   - Widget registry para views customizadas no Theia
   - Menu contributions: command palette, context menus, editor actions
   - Base: seção 2 (Theia Extensibility), seção 1.2 (VS Code API compat)

7. **Implementar Plugin Sandbox + Security Model**
   - Isolamento de plugins com `vm.Script` + resource limits
   - Permission manifest validation em install time
   - Plugin crash recovery (não derruba o host)
   - Base: seção 4.4 (segurança de plugins), Threat models do S10v2

### Tecnologias Recomendadas

| Prioridade | Tecnologia | Uso | Justificativa |
|------------|-----------|-----|---------------|
| P0 | OpenVSX + Eclipse | Registry upstream | Marketplace aberto, compatível VS Code API, Eclipse Foundation |
| P0 | MCP (Model Context Protocol) | Tool registry | Padrão Anthropic, adotado por OpenAI/Google, tools/list + tools/call |
| P0 | Zod + TypeScript | Schema validation | Typesafe tool parameters, auto-generated docs |
| P1 | Sigstore (Cosign) | Plugin signing | Assinatura criptográfica, transparency log, sem custo |
| P1 | Verdaccio | Private registry | Registry próprio para plugins proprietários |
| P2 | A2A (Google) | Agent protocol | Task-oriented, streaming, status tracking (emergente) |
| P2 | npm-packlist | Asset bundling | Inclusão seletiva de arquivos no pacote |

### Conexões com Estudos

- **S20** (Plugins/Ecossistema) — Este estudo é o S20, referência central
- **S11** (Theia IDE) — Extensibility hooks e contribution points no Theia
- **S10v2** (Contratos v2) — Contrato C12 (MCP tools/list + tools/call), segurança de plugins
- **S4** (Segurança) — Plugin sandbox isolado, permission manifest, threat models
- **S5** (Orquestração Multiagente) — A2A bridge + LangGraph composição
- **S9v2** (Matriz Tecnológica v2) — Avaliação OpenVSX, MCP, A2A contra matriz
- **ESTUDO-INTENSIFICACAO-IMPLEMENTACAO-REAL.md** — Status atual: MCP skeleton sem tools reais (C12 ❌ Designed)

### Riscos de Implementação

1. **Mudanças no MCP spec** — MCP ainda é draft (Anthropic), spec pode mudar antes de v1.0. Mitigação: abstrair atrás de interface `ToolRegistry`; usar adapter pattern para protocolo.
2. **OpenVSX compatibilidade parcial com VS Code API** — ~80% de compatibilidade; plugins complexos podem não funcionar. Mitigação: CI com test suite de compatibilidade; fallback para funcionalidades core.
3. **Segurança de plugins de terceiros** — Plugin malicioso pode acessar sistema de arquivos ou rede. Mitigação: `vm.Script` sandbox com resource limits; permission manifest obrigatório; scanning automático no marketplace.
4. **Fragmentação do ecossistema** — Dois marketplaces (OpenVSX + IDEIA) podem confundir desenvolvedores. Mitigação: UI unificada que consolida ambos; transparência sobre origem do plugin.
5. **Plugin API concorrendo com VS Code API** — Se a Plugin API for muito diferente, perde-se compatibilidade. Mitigação: Plugin API como superset da VS Code API; extensões VS Code existentes devem funcionar sem modificação.
