# PLANO MESTRE DE REESTRUTURAÇÃO — IDEIA UNIFICADA

> **Data:** 2026-07-19
> **Status:** Proposta de reestruturação
> **Objetivo:** Transformar estrutura fragmentada em aplicação monolítica profissional

---

## Sumário

1. [Diagnóstico da Situação Atual](#1-diagnóstico)
2. [Estrutura Final da IDEIA](#2-estrutura-final)
3. [Fases de Migração](#3-fases-de-migração)
4. [Transformações Técnicas Críticas](#4-transformações-técnicas)
5. [Dependências e Versões](#5-dependências)
6. [Auto-Instalador e Distribuição Desktop](#6-auto-instalador)
7. [Mockup-v2 → Theia Widgets](#7-mockup-v2-theia)
8. [Documentação e Validação](#8-documentação)
9. [Riscos e Mitigações](#9-riscos)
10. [Timeline](#10-timeline)

---

## 1. Diagnóstico da Situação Atual

### 1.1 Estrutura Fragmentada Atual

```
F:\PROJETOS\ai-devkit-workspace\
├── ai-devkit-v2\          ← 66 packages backend (MONOREPO)
│   ├── packages\          ← 66 pacotes @ai-devkit/*
│   ├── apps\api\          ← Express API server
│   ├── docker-compose.yml ← NATS, PostgreSQL, Redis, Ollama
│   └── scripts\           ← 27 scripts de auditoria
├── ideia-theia\           ← Plugin Theia (26 fontes)
│   ├── src\browser\       ← 12 widgets frontend React
│   ├── src\node\          ← 10 serviços backend Theia
│   ├── src\common\        ← 2 arquivos de tipos/contratos
│   └── style\             ← 3 arquivos de tema CSS/TS
├── theia-app\             ← Shell Theia (aplicação)
│   ├── src\               ← main.ts, backend.ts, welcome.html
│   ├── src-gen\           ← generated (auto-gerado pelo Theia CLI)
│   └── lib\               ← compiled output
├── electron-app\          ← Wrapper Electron (separado)
│   └── src\               ← main.js, preload.js
├── mockup\                ← Fonte de design (mockup-v2.html)
├── docs\                  ← 105+ documentos (estudos, ADRs, governance)
├── scripts\               ← 8 scripts .ps1
└── legacy\                ← 2 diretórios de código antigo
```

### 1.2 Problemas Identificados

| #   | Problema                                            | Impacto                                                            |
| --- | --------------------------------------------------- | ------------------------------------------------------------------ |
| P1  | **6 diretórios raiz desconectados**                 | Build complexo, scripts com paths relativos frágeis                |
| P2  | **electron-app** forkando servidor CLI              | Inicia servidor HTTP externo em vez de carregar Theia nativamente  |
| P3  | **ideia-theia** como dependência file: de theia-app | Requer build manual em 2 etapas                                    |
| P4  | **ai-devkit-v2** com npm workspaces separado        | npm install duplicado, node_modules separados                      |
| P5  | **Scripts de inicialização via terminal**           | start-all.js, .bat, .ps1 — nada profissional                       |
| P6  | **arquivos de inicialização na raiz**               | IDEIA.bat, iniciar-ideia.ps1, start-ideia-simple.js — fragmentação |
| P7  | **web-ui** (no ai-devkit-v2) com Monaco standalone  | Concorrente direto do Theia — proibido manter                      |
| P8  | **apps/api** Express redundante                     | Theia já tem backend embutido na porta 3030                        |
| P9  | **Documentação espalhada**                          | AGENTS.md, AI-DEVKIT-CATALOGO-_.md, IDE-_.md na raiz               |
| P10 | **mockup-v2 duplicado**                             | Em mockup/ e em ai-devkit-v2/plans/estudos/                        |

### 1.3 Inventário Completo do que MERGEAR

| Componente            | Origem                                   | Destino em IDEIA/           | O que fazer                           |
| --------------------- | ---------------------------------------- | --------------------------- | ------------------------------------- |
| Core packages (66)    | `ai-devkit-v2/packages/`                 | `packages/`                 | Copiar TODOS                          |
| CLI                   | `ai-devkit-v2/packages/cli/`             | `packages/cli/`             | Refatorar para não expor terminal     |
| API                   | `ai-devkit-v2/apps/api/`                 | ❌ **ELIMINAR**             | Theia backend substitui               |
| web-ui                | `ai-devkit-v2/packages/web-ui/`          | ❌ **ELIMINAR**             | Theia substitui                       |
| ide-integration       | `ai-devkit-v2/packages/ide-integration/` | `packages/ide-integration/` | Refatorar para bridge direta          |
| Plugin Theia (26 src) | `ideia-theia/`                           | `packages/ideia-plugin/`    | Copiar + renomear paths               |
| Theia App Shell       | `theia-app/`                             | `apps/ideia-app/`           | Copiar + simplificar                  |
| Electron Wrapper      | `electron-app/`                          | `electron/`                 | Reescrever para nativo                |
| Mockup v2             | `mockup/`                                | `mockup/`                   | Copiar (apenas 1, eliminar duplicata) |
| Docs                  | `docs/` + raiz                           | `docs/`                     | Consolidar, eliminar redundâncias     |
| Scripts               | `scripts/`                               | `scripts/`                  | Atualizar paths                       |
| Legacy                | `legacy/`                                | ❌ **NÃO COPIAR**           | História arquivada                    |

---

## 2. Estrutura Final da IDEIA

```
F:\PROJETOS\ai-devkit-workspace\IDEIA\
│
├── package.json                    ← Workspace único (npm workspaces)
├── tsconfig.base.json              ← TS base config para todos os packages
├── tsconfig.json                   ← TS solution com project references
├── .gitignore
├── .editorconfig
├── AGENTS.md                       ← Simplificado (visão única IDEIA)
├── README.md                       ← Profissional
│
├── packages/                       ← TODOS os pacotes em monorepo único
│   ├── contracts/                  ← @ideia/contracts (tipos e schemas)
│   ├── agent-runtime/              ← @ideia/agent-runtime
│   ├── event-bus/                  ← @ideia/event-bus
│   ├── policy-engine/              ← @ideia/policy-engine
│   ├── memory-store/               ← @ideia/memory-store
│   ├── llm-provider/               ← @ideia/llm-provider
│   ├── logger/                     ← @ideia/logger
│   ├── audit-trail/                ← @ideia/audit-trail
│   ├── delivery-orchestrator/      ← @ideia/delivery-orchestrator
│   ├── verification-layer/         ← @ideia/verification-layer
│   ├── diff-engine/                ← @ideia/diff-engine
│   ├── workflow-engine/            ← @ideia/workflow-engine
│   ├── terminal-sandbox/           ← @ideia/terminal-sandbox
│   ├── autonomous-editor/          ← @ideia/autonomous-editor
│   ├── schema-registry/            ← @ideia/schema-registry
│   ├── ... (demais 66 pacotes)     ← @ideia/*
│   │
│   └── ideia-plugin/               ← @ideia/plugin (Plugin Theia)
│       ├── src/
│       │   ├── browser/            ← 12 widgets frontend (CHAT, DASHBOARD, etc.)
│       │   ├── node/               ← 10 serviços backend
│       │   └── common/             ← 2 arquivos de protocolo/tipos
│       ├── style/                  ← Tema IDEIA (dark, glass, cyan accent)
│       └── package.json
│
├── apps/
│   └── ideia-app/                  ← Aplicação Theia (Electron-ready)
│       ├── src/
│       │   ├── main.ts             ← Frontend bootstrap
│       │   ├── backend.ts          ← Backend bootstrap (Inversify)
│       │   └── welcome.html        ← Welcome page IDEIA
│       ├── src-gen/                ← Auto-gerado pelo Theia CLI
│       ├── esbuild.mjs             ← Build config Theia
│       ├── gen-esbuild.browser.mjs
│       ├── gen-esbuild.node.mjs
│       └── package.json
│
├── electron/                       ← Wrapper Electron NATIVO
│   ├── src/
│   │   ├── main.ts                 ← Processo principal (TypeScript)
│   │   ├── preload.ts              ← Bridge segura
│   │   └── installer.ts            ← Lógica de auto-instalação de dependências
│   ├── assets/
│   │   └── icon.png                ← Ícone da aplicação
│   ├── package.json                ← Electron + electron-builder config
│   └── electron-builder.yml        ← Build config profissional
│
├── scripts/
│   ├── build-all.js                ← Build completo (plugin + app + electron)
│   ├── build-installer.js          ← Gera instalador Windows (.exe)
│   ├── check-deps.js               ← Verifica dependências do sistema
│   ├── auto-install-deps.js        ← Instala dependências faltantes
│   ├── first-run.js                ← Configuração inicial (workspace, LLM)
│   └── dev.js                      ← Modo desenvolvimento
│
├── mockup/
│   └── ideia-theia-mockup-v2.html  ← Única fonte de design
│
├── docs/
│   ├── governance/                 ← REALITY-MANIFEST, GAPS, políticas
│   ├── ESTUDOS/                    ← 44+ estudos consolidados
│   ├── adr/                        ← Decisões arquiteturais
│   └── user/                       ← GUIA-DE-INICIO-RAPIDO, FAQ, COMANDOS
│
└── .ai/                            ← Config de agentes IA (opencode)
```

### 2.1 Renomeação de Packages

| Nome antigo           | Nome novo       |
| --------------------- | --------------- |
| `@ai-devkit/*`        | `@ideia/*`      |
| `@ideia/theia-plugin` | `@ideia/plugin` |

---

## 3. Fases de Migração

### Fase 1 — FUNDAÇÃO (Dia 1-2)

**Objetivo:** Criar estrutura do zero, copiar todo código backend, verificar integridade.

#### Tarefas:

1. **Criar estrutura de diretórios** da IDEIA/

   ```
   IDEIA/packages/ (66 subdirs)
   IDEIA/apps/ideia-app/
   IDEIA/electron/
   IDEIA/scripts/
   IDEIA/mockup/
   IDEIA/docs/
   ```

2. **Copiar todos os 66 packages** de `ai-devkit-v2/packages/` para `IDEIA/packages/`
   - ✅ Preservar tsconfig, package.json, src/
   - ❌ NÃO copiar node_modules/
   - ❌ NÃO copiar dist/ (recompilar depois)
   - ❌ NÃO copiar `web-ui/` (proibido)
   - ❌ NÃO copiar `apps/api/` (redundante)

3. **Renomear `@ai-devkit/` → `@ideia/`** em todos os package.json

   ```bash
   # Script de substituição em massa
   # package.json 'name', 'dependencies', 'peerDependencies'
   ```

4. **Copiar `ideia-theia/` → `IDEIA/packages/ideia-plugin/`**
   - Atualizar package.json: `@ideia/plugin`
   - Atualizar todas as dependências `@ai-devkit/*` → `@ideia/*`
   - Atualizar paths relativos `../ai-devkit-v2/packages/*` → `../*`

5. **Copiar `theia-app/` → `IDEIA/apps/ideia-app/`**
   - Atualizar dependência de `@ideia/theia-plugin` → `@ideia/plugin`
   - Atualizar path no package.json

6. **Criar root `package.json`** workspace único
   ```json
   {
     "name": "ideia",
     "private": true,
     "workspaces": ["packages/*", "apps/*"],
     "scripts": {
       "build": "tsc -b",
       "build:app": "cd apps/ideia-app && npx theia build",
       "clean": "rimraf packages/*/dist apps/*/lib",
       "lint": "eslint packages/*/src --ext .ts,.tsx",
       "test": "jest"
     }
   }
   ```

### Fase 2 — BUILD E INTEGRAÇÃO (Dia 3-4)

**Objetivo:** Garantir que todo o ecossistema compila e funciona junto.

#### Tarefas:

1. **Criar `tsconfig.base.json`** — copiado de `ai-devkit-v2/tsconfig.base.json`
   - Ajustar `paths` para `@ideia/*`

2. **Criar `tsconfig.json` (solution)** — 56+ project references

3. **Compilar todos os packages**

   ```bash
   cd IDEIA
   npm install
   npx tsc -b --verbose
   ```
   - Verificar erros de compilação
   - Corrigir paths quebrados

4. **Compilar plugin Theia**

   ```bash
   cd IDEIA/packages/ideia-plugin
   npx tsc
   ```

5. **Compilar Theia app**

   ```bash
   cd IDEIA/apps/ideia-app
   npm install
   npx theia build
   ```

6. **Testar execução** (servidor dev)
   ```bash
   node apps/ideia-app/lib/backend/main.js
   ```
   → Abrir http://localhost:3030

### Fase 3 — ELETRON WRAPPER NATIVO (Dia 5-6)

**Objetivo:** Substituir o electron-app atual (que forkava servidor) por um Electron que carrega o Theia nativamente.

#### Arquitetura Proibida (NÃO FAZER):

```
❌ Electron → fork CLI server → BrowserWindow carrega http://localhost:3001
```

#### Arquitetura Correta:

```
✅ Electron → BrowserWindow carrega http://localhost:3030
   └── Theia backend (Inversify) roda no processo main do Electron
       └── Inclui todos os serviços @ideia/* como módulos Inversify
```

#### Implementação do `electron/src/main.ts`:

```typescript
import { app, BrowserWindow, Menu, shell } from 'electron';
import * as path from 'path';
import { IDEIABootstrap } from './bootstrap'; // Inicialização IDEIA

let mainWindow: BrowserWindow | null = null;

app.whenReady().then(async () => {
  // 1. Verificar dependências do sistema
  await checkSystemDependencies();

  // 2. Inicializar servidor Theia EMBUTIDO (não fork)
  const server = await IDEIABootstrap.start({
    port: 3030,
    host: '127.0.0.1',
    workspace: process.cwd(),
  });

  // 3. Criar janela (mockup-v2 fiel)
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Title bar customizada (mockup-v2)
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 4. Carregar Theia
  mainWindow.loadURL('http://127.0.0.1:3030');

  // 5. Menu profissional
  Menu.setApplicationMenu(createMenu());

  // 6. Auto-detectar quando servidor está pronto
  await waitForServer('http://127.0.0.1:3030');
});
```

### Fase 3.1 — Bootstrap Embutido (CRÍTICO)

**O coração da IDEIA — como o Theia roda DENTRO do Electron.**

```typescript
// electron/src/bootstrap.ts
import { Container } from 'inversify';
import { BackendApplication } from '@theia/core/lib/node/backend-application';
import { backendApplicationModule } from '@theia/core/lib/node/backend-application-module';
import { messagingBackendModule } from '@theia/core/lib/common/messaging/messaging-module';
import { loggerBackendModule } from '@theia/core/lib/node/logger-backend-module';

// Importar módulos @ideia diretamente (não via servidor HTTP externo)
import { ideiaBackendModule } from '@ideia/plugin/lib/node/ideia-backend-module';

export class IDEIABootstrap {
  static async start(options: { port: number; host: string; workspace: string }) {
    const container = new Container();

    // Carregar módulos Theia core
    container.load(backendApplicationModule);
    container.load(messagingBackendModule);
    container.load(loggerBackendModule);

    // Carregar módulos IDEIA (tudo inline)
    container.load(ideiaBackendModule);

    // Carregar serviços @ideia/* como Inversify providers
    container.bind('LLMProvider').to(LLMProviderAdapter);
    container.bind('EventBus').toConstantValue(new InMemoryEventBus());
    container.bind('PolicyEngine').to(PolicyEngineService);
    container.bind('MemoryStore').to(MemoryStoreService);
    container.bind('AgentRuntime').to(AgentRuntimeService);
    container.bind('TaskRunner').to(TaskRunnerService);

    // Iniciar servidor
    const app = container.get(BackendApplication);
    await app.start(options.port, options.host);

    return app;
  }
}
```

**Isso é o que substitui:**

- ❌ `ai-devkit-v2/packages/cli/dist/index.js` (não precisa mais)
- ❌ `ai-devkit-v2/apps/api/src/index.ts` (eliminado)
- ❌ `start-all.js` (eliminado)
- ❌ `node lib/backend/main.js` externo (agora é embutido)

### Fase 4 — AUTO-INSTALADOR (Dia 7)

**Objetivo:** IDEIA se auto-instala sem terminal. Usuário baixa .exe, clica, pronto.

#### Lógica do Instalador:

```
IDEIA Setup.exe (electron-builder NSIS)
├── Node.js check → se não tem, baixa e instala SILENCIOSAMENTE
├── npm install → packages/@ideia/* (compilados já no bundle)
├── Ollama check → pergunta: "Deseja instalar Ollama para LLM local?"
├── Configura workspace → pergunta: "Onde criar seus projetos?"
├── Cria atalho no desktop
├── Cria atalho no menu iniciar
├── Registra extensão .ideia
└── Inicia IDEIA pela primeira vez
```

#### `electron/package.json` builder config:

```json
{
  "name": "ideia",
  "version": "1.0.0-beta.1",
  "description": "IDEIA — IDE que transforma ideias em sistemas completos",
  "main": "dist/main.js",
  "build": {
    "appId": "com.ideia.app",
    "productName": "IDEIA",
    "directories": {
      "output": "dist-installer"
    },
    "files": ["dist/**/*", "assets/**/*", "node_modules/**/*", "!node_modules/**/test*/**", "!node_modules/**/*.md"],
    "extraResources": [
      {
        "from": "../apps/ideia-app/lib",
        "to": "theia-backend"
      }
    ],
    "win": {
      "target": ["nsis"],
      "icon": "assets/icon.png",
      "signAndEditExecutable": false
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "installerIcon": "assets/icon.png",
      "uninstallerIcon": "assets/icon.png",
      "installerHeaderIcon": "assets/icon.png",
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "IDEIA",
      "unicode": true
    },
    "mac": {
      "target": ["dmg"],
      "icon": "assets/icon.png",
      "category": "public.app-category.developer-tools"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "assets/icon.png",
      "category": "Development"
    },
    "publish": {
      "provider": "github",
      "releaseType": "release"
    }
  }
}
```

#### Auto-Checks no Primeiro Run (`electron/src/installer.ts`):

```typescript
export async function autoInstallDependencies(): Promise<void> {
  const checks = [
    { name: 'Node.js >= 20', check: () => checkNodeVersion() },
    { name: 'npm >= 10', check: () => checkNpmVersion() },
    { name: 'Git', check: () => checkGitInstalled() },
    { name: 'Porta 3030 livre', check: () => checkPortFree(3030) },
  ];

  for (const { name, check } of checks) {
    const result = await check();
    if (!result.ok) {
      await showInstallProgress(name, result);
      await result.install(); // Auto-instala silenciosamente
    }
  }
}
```

### Fase 5 — IMPLEMENTAÇÃO MOCKUP-V2 (Dia 8-10)

**Objetivo:** Interface do Theia IDÊNTICA ao mockup-v2.

#### O que já EXISTE no `packages/ideia-plugin`:

| Widget                            | Status    | Mockup-v2 Equivalente    |
| --------------------------------- | --------- | ------------------------ |
| `ideia-chat-widget.tsx`           | ✅ Pronto | Agent Chat (right panel) |
| `ideia-dashboard-widget.tsx`      | ✅ Pronto | Dashboard tab            |
| `ideia-approval-widget.tsx`       | ✅ Pronto | Approvals tab            |
| `ideia-file-widget.tsx`           | ✅ Pronto | File tree (sidebar)      |
| `ideia-diff-widget.tsx`           | ✅ Pronto | Diff viewer              |
| `ideia-title-bar-widget.ts`       | ✅ Pronto | Title bar mockup         |
| `ideia-statusbar-contribution.ts` | ✅ Pronto | Status bar               |
| `ideia-styles.ts`                 | ✅ Pronto | Theme (dark/glass)       |
| `ideia-theme.ts`                  | ✅ Pronto | IDEIA Dark theme         |

#### O que PRECISA ser ajustado para fidelidade 100%:

| Item mockup-v2                     | Status      | Ação                            |
| ---------------------------------- | ----------- | ------------------------------- |
| Title bar com 9 menus              | ⚠️ Parcial  | Ajustar menus (IDEIA destacado) |
| Activity bar esquerda (9 ícones)   | ❌ Faltando | Implementar como widget         |
| Activity bar direita (5 ícones)    | ❌ Faltando | Implementar como widget         |
| Right panel com 5 abas             | ⚠️ Parcial  | Adicionar Studies + Suggestions |
| Studies tab                        | ❌ Faltando | Novo widget (pesquisas)         |
| Suggestions tab                    | ❌ Faltando | Novo widget (sugestões IA)      |
| Search overlay (Ctrl+P)            | ❌ Faltando | Modal de busca                  |
| Editor tabs customizados           | ⚠️ Parcial  | Ajustar indicador cyan          |
| Agent Mode toggle                  | ❌ Faltando | Botão modo agente/editor        |
| Bottom panel (terminal)            | ✅ Pronto   | Theia terminal nativo           |
| Resize handles em todos os painéis | ⚠️ Parcial  | Verificar Theia resize          |
| Glassmorphism (blur)               | ✅ Pronto   | CSS backdrop-filter             |
| Cores exatas (#0d0d0d, #2dd4bf)    | ✅ Pronto   | Já no tema                      |

### Fase 6 — LIMPEZA E DOCUMENTAÇÃO (Dia 11-12)

**Objetivo:** Eliminar toda referência a `ai-devkit`, `web-ui`, `@ai-devkit/*` e consolidar docs.

#### O que ELIMINAR:

| Caminho                              | Motivo                              |
| ------------------------------------ | ----------------------------------- |
| `ai-devkit-v2/` (diretório original) | Tudo copiado para IDEIA/            |
| `ideia-theia/` (diretório original)  | Migrado para packages/ideia-plugin/ |
| `theia-app/` (diretório original)    | Migrado para apps/ideia-app/        |
| `electron-app/` (diretório original) | Reescrevendo em electron/           |
| `mockup/` (diretório original)       | Copiado 1 mockup para IDEIA/mockup/ |
| `legacy/`                            | Arquivado, não copiar               |
| `start-ideia-simple.js`              | Substituído pelo instalador         |
| `iniciar-ideia.bat`                  | Substituído pelo instalador         |
| `iniciar-ideia.ps1`                  | Substituído pelo instalador         |
| `start-ideia.ps1`                    | Substituído pelo instalador         |
| `IDEIA.bat`                          | Substituído pelo instalador         |
| `IDEIA.exe.js`                       | Substituído pelo instalador         |
| `GUIA-EXECUCAO-IDEIA.md`             | Atualizar para nova estrutura       |
| `PLANO-IMPLEMENTACAO-CONSOLIDADO.md` | Consolidar em docs/                 |

#### Documentos a ATUALIZAR:

| Documento              | Ação                                 |
| ---------------------- | ------------------------------------ |
| `REALITY-MANIFEST.md`  | Reescrever para nova estrutura       |
| `GAPS-PRODUCAO-IDE.md` | Atualizar gaps de estruturação       |
| `AGENTS.md` (raiz)     | Simplificar (visão única IDEIA)      |
| `README.md`            | Profissional, sem comandos terminais |
| `document-registry.md` | Atualizar lista de documentos        |

---

## 4. Transformações Técnicas Críticas

### 4.1 Mapa de Paths (Antigo → Novo)

| Path antigo                               | Path novo                            |
| ----------------------------------------- | ------------------------------------ |
| `ai-devkit-v2/packages/contracts/src`     | `packages/contracts/src`             |
| `ai-devkit-v2/packages/agent-runtime/src` | `packages/agent-runtime/src`         |
| `ai-devkit-v2/packages/event-bus/src`     | `packages/event-bus/src`             |
| `ideia-theia/src/browser/`                | `packages/ideia-plugin/src/browser/` |
| `ideia-theia/src/node/`                   | `packages/ideia-plugin/src/node/`    |
| `theia-app/src/`                          | `apps/ideia-app/src/`                |
| `theia-app/src-gen/`                      | `apps/ideia-app/src-gen/`            |
| `electron-app/src/`                       | `electron/src/`                      |

### 4.2 Mudanças em package.json

**Em `packages/ideia-plugin/package.json`:**

```json
// ANTES (fragmentado)
"dependencies": {
    "@ai-devkit/agent-runtime": "file:../ai-devkit-v2/packages/agent-runtime",
    "@ai-devkit/core": "file:../ai-devkit-v2/packages/core",
    ...
}

// DEPOIS (unificado)
"dependencies": {
    "@ideia/agent-runtime": "*",    // workspace protocol
    "@ideia/contracts": "*",
    "@ideia/event-bus": "*",
    "@ideia/llm-provider": "*",
    "@ideia/memory-store": "*",
    "@ideia/policy-engine": "*",
    "@ideia/delivery-orchestrator": "*",
    "@ideia/verification-layer": "*",
    ...
}
```

**Em `apps/ideia-app/package.json`:**

```json
// ANTES
"dependencies": {
    "@ideia/theia-plugin": "../ideia-theia",
    ...
}

// DEPOIS
"dependencies": {
    "@ideia/plugin": "*",  // workspace protocol
    ...
}
```

### 4.3 Inversify — Integração Direta (sem HTTP)

**ANTES (fragmentado):**

```
Electron → fork → CLI server (porta 3001) → REST API
                                        ↓
Theia app (porta 3030) ← HTTP/SSE ← services
```

**DEPOIS (unificado):**

```
Electron → Theia backend (porta 3030) ← Inversify DI → @ideia/* services
                ↓
         Frontend Theia (Monaco + Widgets)
```

### 4.4 O Que Acontece com o `apps/api` (Express)?

**Eliminado completamente.**

Tudo que `apps/api` fazia:

- REST endpoints → Theia ConnectionHandler (JSON-RPC) substitui
- WebSocket SSE → Theia backend modules substituem
- Static files → Theia serve direto
- LSP → Theia já tem LSP nativo

### 4.5 O Que Acontece com o `web-ui` (React + Monaco)?

**Eliminado completamente.**

Justificativa:

- Theia JÁ TEM Monaco embutido (editor nativo)
- Theia JÁ TEM Terminal (xterm.js)
- Theia JÁ TEM File Explorer, Search, Debug
- Manter web-ui seria duplicar funcionalidade
- Violaria o princípio de "única interface"

### 4.6 Atualização de Versões-Chave

Verificar compatibilidade de todas as dependências:

| Dependência      | Versão Atual | Versão Alvo     | Nota                      |
| ---------------- | ------------ | --------------- | ------------------------- |
| Node.js          | >=20.0.0     | >=20.18.0 (LTS) | Manter LTS                |
| TypeScript       | ^5.4.5       | ^5.7.0          | Alinhar com Theia 1.73    |
| Theia            | 1.73.x       | 1.73.x          | Fixar 1.73.1              |
| React            | ^18.3.0      | ^18.3.1         | Patch                     |
| Inversify        | ^6.0.0       | ^6.2.0          | Compatível                |
| Electron         | ^33.0.0      | ^33.2.0         | Última stable             |
| electron-builder | ^25.0.0      | ^25.1.0         | Última                    |
| ESLint           | ^8.57.0      | ^9.x ou ^8.57   | Verificar compatibilidade |

---

## 5. Dependências e Versões

### 5.1 Dependências do Sistema (detectadas/instaladas pelo auto-instalador)

| Dependência               | Obrigatória? | Instalação                            |
| ------------------------- | ------------ | ------------------------------------- |
| Node.js >= 20 LTS         | ✅ Sim       | Auto-download do nodejs.org           |
| npm >= 10                 | ✅ Sim       | Vem com Node.js                       |
| Git >= 2.x                | ✅ Sim       | Auto-download silencioso              |
| Ollama                    | ❌ Opcional  | Pergunta ao usuário no primeiro run   |
| Open VSX                  | ❌ Opcional  | Bundle interno de extensões           |
| Visual Studio Build Tools | ⚠️ Windows   | Apenas se for compilar addons nativos |

### 5.2 Dependências npm (bundle do instalador)

Todas as dependências são **empacotadas no instalador** — o usuário não precisa rodar `npm install`.

Para atualizações futuras, a IDEIA pode baixar novas versões via GitHub Releases.

---

## 6. Auto-Instalador e Distribuição Desktop

### 6.1 Experiência do Usuário

```
[USUÁRIO] Baixa IDEIA-Setup.exe do site oficial
    ↓
[SETUP] "Bem-vindo ao IDEIA Setup" (NSIS installer profissional)
    ↓
[SETUP] Verifica Node.js → Se não tiver: "Baixando Node.js 20 LTS..."
    ↓
[SETUP] Verifica Git → Se não tiver: "Baixando Git..."
    ↓
[SETUP] Escolher diretório de instalação (padrão: C:\Program Files\IDEIA\)
    ↓
[SETUP] "Deseja instalar Ollama para LLM local?" (Sim/Não)
    ↓
[SETUP] Instalando... (barra de progresso)
    ↓
[SETUP] ✓ IDEIA instalada com sucesso!
    ↓
[USUÁRIO] Abre IDEIA pelo atalho do desktop
    ↓
[IDEIA] "Bem-vindo! Configure seu workspace..."
```

### 6.2 Pipeline de Build do Instalador

```bash
# 1. Build todos os packages
cd IDEIA
npm run build

# 2. Build Theia app
cd apps/ideia-app
npx theia build

# 3. Build Electron wrapper
cd ../../electron
npm run build

# 4. Gerar instalador Windows
npx electron-builder --win --config electron-builder.yml
# Output: dist-installer/IDEIA Setup 1.0.0.exe

# 5. Gerar DMG para macOS
npx electron-builder --mac --config electron-builder.yml
# Output: dist-installer/IDEIA-1.0.0.dmg

# 6. Gerar AppImage para Linux
npx electron-builder --linux --config electron-builder.yml
# Output: dist-installer/IDEIA-1.0.0.AppImage
```

---

## 7. Mockup-v2 → Theia Widgets

### 7.1 Mapeamento mockup-v2 → Theia

| Elemento mockup-v2               | Componente Theia               | Arquivo                                                             |
| -------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Title bar (9 menus + logo)       | CustomTitleWidget              | `packages/ideia-plugin/src/browser/ideia-title-bar-widget.ts`       |
| Activity bar esquerda (9 ícones) | ActivityBar + custom CSS       | `packages/ideia-plugin/src/browser/ideia-styles.ts`                 |
| Activity bar direita (5 ícones)  | ActivityBar (right side)       | `packages/ideia-plugin/src/browser/ideia-styles.ts`                 |
| Sidebar Explorer                 | FileWidget                     | `packages/ideia-plugin/src/browser/ideia-file-widget.tsx`           |
| Editor tabs                      | Theia Editor + TabBarDecorator | Tema customizado                                                    |
| Editor Monaco                    | Theia Monaco (nativo)          | Theia core                                                          |
| Bottom Panel Terminal            | Theia Terminal                 | Theia terminal                                                      |
| Right Panel Agent Chat           | ChatWidget                     | `packages/ideia-plugin/src/browser/ideia-chat-widget.tsx`           |
| Right Panel Dashboard            | DashboardWidget                | `packages/ideia-plugin/src/browser/ideia-dashboard-widget.tsx`      |
| Right Panel Approvals            | ApprovalWidget                 | `packages/ideia-plugin/src/browser/ideia-approval-widget.tsx`       |
| Right Panel Studies              | NOVO                           | Criar `ideia-studies-widget.tsx`                                    |
| Right Panel Suggestions          | NOVO                           | Criar `ideia-suggestions-widget.tsx`                                |
| Diff Viewer                      | DiffWidget                     | `packages/ideia-plugin/src/browser/ideia-diff-widget.tsx`           |
| Status bar                       | StatusBarContribution          | `packages/ideia-plugin/src/browser/ideia-statusbar-contribution.ts` |
| Search overlay (Ctrl+P)          | NOVO                           | Criar `ideia-search-widget.tsx`                                     |
| Agent/Editor mode toggle         | NOVO                           | Adicionar ao StatusBar                                              |

### 7.2 Novos Widgets a Implementar

| Widget            | Arquivo                                | Estimativa  |
| ----------------- | -------------------------------------- | ----------- |
| StudiesWidget     | `browser/ideia-studies-widget.tsx`     | ~80 linhas  |
| SuggestionsWidget | `browser/ideia-suggestions-widget.tsx` | ~80 linhas  |
| SearchOverlay     | `browser/ideia-search-widget.tsx`      | ~100 linhas |
| ActivityBarRight  | `browser/ideia-activitybar-right.tsx`  | ~60 linhas  |

**Total de linhas novas:** ~320 linhas

---

## 8. Riscos e Mitigações

| Risco                                                     | Probabilidade | Impacto | Mitigação                                                      |
| --------------------------------------------------------- | ------------- | ------- | -------------------------------------------------------------- |
| **R1** — Theia não compila com workspace único            | Média         | Alto    | Isolar theia-app como sub-projeto com seu próprio node_modules |
| **R2** — Inversify conflito entre módulos @ideia e @theia | Média         | Alto    | Testar container Inversify isolado                             |
| **R3** — node-pty (terminal) não compila no Electron      | Baixa         | Alto    | Usar xterm.js com backend WebSocket                            |
| **R4** — Electron 33 não suporta Theia 1.73               | Baixa         | Médio   | Testar compatibilidade; fallback Electron 32                   |
| **R5** — Perda de dados na migração                       | Baixa         | Crítico | Backup completo antes de migrar                                |
| **R6** — npm workspaces conflita com Theia CLI            | Média         | Alto    | Theia CLI pode exigir pasta própria; testar em isolamento      |
| **R7** — Auto-instalador baixa Node.js (permissão)        | Média         | Médio   | Fallback: instruir usuário a instalar manualmente              |
| **R8** — Build do Electron em Windows sem VS Build Tools  | Alta          | Médio   | Pré-compilar native addons (node-pty, drivelist)               |

---

## 9. Timeline

| Fase                        | Duração | Depende de | Entregas                         |
| --------------------------- | ------- | ---------- | -------------------------------- |
| **F1 — Fundação**           | 2 dias  | —          | Estrutura criada, código copiado |
| **F2 — Build & Integração** | 2 dias  | F1         | Tudo compila, Theia roda         |
| **F3 — Electron Nativo**    | 2 dias  | F2         | Electron carrega Theia inline    |
| **F4 — Auto-Instalador**    | 1 dia   | F3         | .exe instalador funcional        |
| **F5 — Mockup-v2**          | 3 dias  | F2-F3      | Interface idêntica ao mockup     |
| **F6 — Limpeza & Docs**     | 2 dias  | F1-F5      | Documentos atualizados           |

**Total estimado:** 12 dias úteis (sprints de 2 semanas)

---

## 10. Checklist de Verificação Final

Antes de declarar a migração completa:

- [ ] `IDEIA/packages/` contém todos os 66+ packages (sem web-ui, sem apps/api)
- [ ] `TODOS` os `@ai-devkit/*` renomeados para `@ideia/*`
- [ ] `npm install` funciona em `IDEIA/` sem erros
- [ ] `tsc -b` compila sem erros
- [ ] `theia build` em `apps/ideia-app` funciona
- [ ] Electron abre sem terminal (só duplo clique no .exe)
- [ ] Theia carrega com tema IDEIA Dark
- [ ] Todos os 5 widgets do right panel funcionam
- [ ] Status bar mostra "IDEIA Agent Ready"
- [ ] Terminal funciona (node-pty)
- [ ] Editor Monaco funciona
- [ ] LLM Provider conecta (Ollama/OpenAI)
- [ ] Instalador .exe gera sem erros
- [ ] `ai-devkit-v2/` original pode ser arquivado
- [ ] `ideia-theia/` original pode ser arquivado
- [ ] `theia-app/` original pode ser arquivado
- [ ] `electron-app/` original pode ser arquivado
- [ ] Nenhum script .bat/.ps1 de inicialização na raiz
- [ ] REALITY-MANIFEST.md reflete nova estrutura
- [ ] GAPS-PRODUCAO-IDE.md atualizado
- [ ] AGENTS.md simplificado (visão única IDEIA)
- [ ] README.md profissional (sem comandos terminais)

---

## Apêndice A — Comandos de Execução

### Desenvolvimento

```bash
cd F:\PROJETOS\ai-devkit-workspace\IDEIA

# Build completo
npm run build

# Theia dev server
cd apps/ideia-app && node lib/backend/main.js
# → http://localhost:3030

# Electron dev
cd electron && npm start
# → Janela nativa IDEIA
```

### Produção (Instalador)

```bash
cd F:\PROJETOS\ai-devkit-workspace\IDEIA

# Gerar instalador
npm run build:installer
# → electron/dist-installer/IDEIA Setup 1.0.0.exe
```

---

> **IDEIA — Uma única ferramenta. Uma única estrutura. Um único DNA.**
> Chega de fragmentação. Vamos construir algo profissional.
