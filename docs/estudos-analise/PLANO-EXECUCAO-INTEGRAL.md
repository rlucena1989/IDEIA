# PLANO DE EXECUÇÃO INTEGRAL — IDEIA UNIFICADA

> **Baseado na análise consolidada de 74 descobertas em 4 dimensões**
> **Documentos de referência:** `ESTUDO-ANALISE-CONSOLIDADA-MESTRE.md`, `PLANO-REESTRUTURACAO-COMPLETO.md`

---

## Estrutura do Plano

O plano é dividido em **10 fases**, cada fase contém **múltiplas etapas**, cada etapa contém **tarefas individuais** com:

- Arquivos afetados (caminho completo)
- Dependências (entre tarefas)
- Critérios de verificação
- Risco (🔴 alto / 🟠 médio / 🟡 baixo)

---

## FASE 0 — SETUP DO NOVO DIRETÓRIO IDEIA/

**Duração:** 1 dia
**Pré-requisitos:** Nenhum
**Risco:** 🔴 (base de tudo)

### Tarefa 0.1: Criar estrutura de diretórios

```
IDEIA/
├── packages/              (66+ subdirs)
├── apps/ideia-app/
├── electron/
├── mockup/
├── docs/
│   ├── governance/
│   ├── estudos-analise/
│   ├── adr/
│   └── user/
├── scripts/
└── .ai/
```

### Tarefa 0.2: Criar package.root.json

**Arquivo:** `IDEIA/package.json`

```json
{
  "name": "ideia",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "build": "tsc -b",
    "build:plugin": "cd packages/ideia-plugin && npx tsc",
    "build:app": "cd apps/ideia-app && npx theia build",
    "build:electron": "cd electron && npm run build",
    "build:installer": "cd electron && npx electron-builder --win",
    "clean": "rimraf packages/*/dist apps/*/lib",
    "dev": "node apps/ideia-app/lib/backend/main.js",
    "lint": "eslint 'packages/*/src/**/*.{ts,tsx}'",
    "test": "jest --passWithNoTests"
  }
}
```

### Tarefa 0.3: Criar tsconfig.base.json + tsconfig.json (solution)

**Arquivos:** `IDEIA/tsconfig.base.json`, `IDEIA/tsconfig.json`

- Copiar de `ai-devkit-v2/tsconfig.base.json`
- Ajustar `paths` para `@ideia/*` → `./packages/*/src`
- Adicionar 56+ project references em `tsconfig.json`

### Tarefa 0.4: Criar .gitignore + .editorconfig

**Verificação:** `git init && git status` mostra apenas arquivos desejados

---

## FASE 1 — MIGRAÇÃO DE PACOTES @ideia

**Duração:** 2 dias
**Pré-requisitos:** Fase 0
**Risco:** 🟠 (66 pacotes, paths relativos)

### Tarefa 1.1: Copiar todos os 66 packages de ai-devkit-v2

**Origem:** `ai-devkit-v2/packages/*` → **Destino:** `IDEIA/packages/*`
**NÃO COPIAR:** `web-ui/`, `node_modules/`, `dist/`

**Verificação:** `ls packages/ | wc -l` = 66

### Tarefa 1.2: Renomear @ai-devkit/* → @ideia/* em TODO package.json

**Script:** Substituição em massa

```bash
cd packages
# Para cada package.json:
#   "name": "@ai-devkit/xxx" → "@ideia/xxx"
#   "dependencies": { "@ai-devkit/yyy": "..." } → "@ideia/yyy": "*"
#   "peerDependencies": { "@ai-devkit/zzz": "..." } → "@ideia/zzz": "*"
```

**Arquivos afetados:** 66 package.json
**Verificação:** `grep -r "@ai-devkit" packages/` retorna 0 resultados

### Tarefa 1.3: Migrar ideia-theia → packages/ideia-plugin

**Origem:** `ideia-theia/` → **Destino:** `IDEIA/packages/ideia-plugin/`

**Alterações em `packages/ideia-plugin/package.json`:**

- `"name": "@ideia/plugin"`
- `"dependencies": { "@ideia/*": "*" }` (workspace protocol, não file:)
- Remover dependências Theia (serão herdadas do app)

**Verificação:** `tsc` compila sem erros

### Tarefa 1.4: Migrar theia-app → apps/ideia-app

**Origem:** `theia-app/` → **Destino:** `IDEIA/apps/ideia-app/`

**Alterações em `apps/ideia-app/package.json`:**

- `"@ideia/plugin": "*"` (workspace protocol)

**Verificação:** `npx theia build` gera `lib/` sem erros

### Tarefa 1.5: Migrar electron-app → electron/

**Origem:** `electron-app/` → **Destino:** `IDEIA/electron/`
**Nota:** O conteúdo será reescrito na Fase 4, mas a estrutura de diretórios deve existir.

### Tarefa 1.6: Copiar mockup (apenas 1 cópia)

**Origem:** `mockup/ideia-theia-mockup-v2.html`
**Destino:** `IDEIA/mockup/ideia-theia-mockup-v2.html`
**Ação:** Copiar apenas o mockup principal, NÃO copiar duplicatas de `ai-devkit-v2/plans/estudos/`

### Tarefa 1.7: npm install inicial

```bash
cd IDEIA
npm install
```

**Verificação:** Sem erros de resolução de workspace ou dependências

---

## FASE 2 — CORREÇÃO DE CONTRATOS E INTERFACES

**Duração:** 2 dias
**Pré-requisitos:** Fase 1
**Risco:** 🔴 (bloqueia comunicação frontend/backend)
**Base:** Descobertas B1-B8, C5-C8 da análise consolidada

### Tarefa 2.1: Unificar ProviderRouter (eliminar duplicata)

**Problema:** Plugin define seu próprio `ProviderRouter` (B6)
**Arquivos:** `packages/ideia-plugin/src/node/llm-provider.ts`
**Ação:**

- Remover definição própria de `ProviderRouter`
- Importar `ProviderRouter` de `@ideia/llm-provider`
- Ajustar `adaptProvider()` para usar a interface do pacote

**Código:**

```typescript
// ANTES: definição própria
class ProviderRouter {
  private providers = new Map<string, LLMProvider>();
  ...
}

// DEPOIS: usa do pacote
import { ProviderRouter, LLMProvider, LLMProviderConfig } from '@ideia/llm-provider';
```

### Tarefa 2.2: Alinhar LLMProvider.chat() — Plugin vs Pacote

**Problema:** Assinaturas diferentes (B7)
**Arquivo:** `packages/ideia-plugin/src/node/llm-provider.ts`
**Ação:**

- Plugin chama `inner.chat({ model: '', messages, stream: true })` — model vazio
- Mudar para usar model do config: `model: this.defaultModel`
- Usar `AbortSignal` para suporte a cancelamento

### Tarefa 2.3: Alinhar tipos ChatMessage (Plugin ↔ Pacote)

**Problema:** Plugin tem `id, timestamp, toolCalls` que pacote não tem (B7)
**Arquivos:**

- `packages/ideia-plugin/src/common/ideia-types.ts`
- `packages/ideia-plugin/src/node/llm-provider.ts`

**Ação:**

- Criar adapter function: `toPluginChatMessage(pkg: PkgChatMessage): PluginChatMessage`
- Parar de usar `as devkit.ChatMessage[]` — converter explicitamente

### Tarefa 2.4: Alinhar SSEEvent ↔ BusEvent

**Problema:** Modelos de evento incompatíveis (B8)
**Arquivos:** `packages/ideia-plugin/src/common/ideia-types.ts`, `ideia-chat-service.ts`

**Ação:**

- Adicionar `id`, `timestamp`, `source` ao `SSEEvent`
- Ou: usar `BusEvent` diretamente como formato de evento para o frontend
- Criar bridge: SSEEvent → BusEvent (para enviar ao EventBus)

### Tarefa 2.5: Alinhar AgentInfo com AgentIdentity

**Arquivo:** `packages/ideia-plugin/src/common/ideia-types.ts`
**Ação:**

- Adicionar campos: `role`, `permissions`, `model`, `mode`, `createdAt`, `metadata`
- Adicionar status: `'blocked'`, `'completed'`
- Criar adapter: `toAgentInfo(identity: AgentIdentity, metrics?: AgentMetrics): AgentInfo`

### Tarefa 2.6: Alinhar TaskSpec com WorkflowTask

**Arquivo:** `packages/ideia-plugin/src/common/ideia-types.ts`
**Ação:**

- Adicionar: `type`, `priority`, `dependencies`, `updatedAt`, `metadata`
- Mapear status: `'queued' → 'pending'`, manter `'in_progress'`, `'completed'`, `'failed'`, `'blocked'`

### Tarefa 2.7: Padronizar imports: @theia/core/shared/inversify

**Problema:** 3 arquivos usam `inversify` diretamente (C5)
**Arquivos:**

- `packages/ideia-plugin/src/browser/ideia-frontend-module.ts`
- `packages/ideia-plugin/src/node/ideia-backend-module.ts`
- `packages/ideia-plugin/src/browser/ideia-preferences-contribution.ts`

**Ação:** Substituir `import { ... } from 'inversify'` por `import { ... } from '@theia/core/shared/inversify'`

### Tarefa 2.8: Tornar FileSystemStepExecutor acessível

**Problema:** Classe concreta não exportada do package (C8)
**Arquivo:** `packages/agent-runtime/src/index.ts`
**Ação:** Adicionar `export { FileSystemStepExecutor } from './step-executor';`

---

## FASE 3 — CORREÇÃO DE INTEGRAÇÃO THEIA

**Duração:** 2 dias
**Pré-requisitos:** Fase 2
**Risco:** 🔴 (bloqueia UI)
**Base:** Descobertas C1-C4, M1-M5 da análise consolidada

### Tarefa 3.1: Unificar protocolo de comunicação

**Problema:** Frontend HTTP vs Backend JSON-RPC (B1) + AsyncIterable não suportado (B3)
**Arquivos:**

- `packages/ideia-plugin/src/browser/ideia-service-client.ts`
- `packages/ideia-plugin/src/node/ideia-backend-module.ts`
- `packages/ideia-plugin/src/browser/ideia-chat-widget.tsx`

**Decisão arquitetural:** Manter SSE para streaming de chat (HTTP), migrar tudo para Theia JSON-RPC para RPC calls.

**Implementação do Chat SSE (manter, mas corrigir):**

```typescript
// backend: registrar handler HTTP para /services/ideia-chat/stream
// frontend: IDEIA_ChatClient.streamMessage() continua usando fetch + SSE
// backend: IDEIA_ChatBackendService.streamMessage() continua AsyncIterable
```

**Implementação dos RPCs (usar Theia nativo):**

```typescript
// frontend: IDEIA_TaskClient usa WebSocketConnectionProvider
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging';
const client = provider.createProxy<IDEIA_TaskService>(IDEIA_TASK_PATH);
```

**Arquivos afetados:**

- `packages/ideia-plugin/src/browser/ideia-service-client.ts`: REMOVER `PersistentJsonRpcClient`, usar `WebSocketConnectionProvider`
- `packages/ideia-plugin/src/browser/ideia-frontend-module.ts`: Atualizar DI

### Tarefa 3.2: Substituir Custom WebSocket RPC por Theia nativo

**Problema:** 4 de 5 service clients usam implementação manual (B2)
**Arquivo:** `packages/ideia-plugin/src/browser/ideia-service-client.ts`

**Implementação:**

```typescript
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging';

@injectable()
export class IDEIA_TaskClient implements IDEIA_TaskService {
  private proxy: IDEIA_TaskService;

  constructor(@inject(WebSocketConnectionProvider) provider: WebSocketConnectionProvider) {
    this.proxy = provider.createProxy<IDEIA_TaskService>(IDEIA_TASK_PATH);
  }

  async getTasks(): Promise<TaskSpec[]> {
    return this.proxy.getTasks();
  }
  // ... etc
}
```

### Tarefa 3.3: Registrar tema IDEIA na inicialização

**Problema:** `registerIdeiaTheme()` nunca chamado (C1)
**Arquivo:** `packages/ideia-plugin/style/ideia-theme.ts`
**Ação:** Chamar `registerIdeiaTheme()` dentro de `FrontendApplicationContribution.onStart()`

### Tarefa 3.4: Registrar comandos faltantes

**Problema:** `ideia:dashboard`, `ideia:approvals`, `ideia:diff` não registrados (C2)
**Arquivo:** `packages/ideia-plugin/src/browser/ideia-chat-contribution.ts`
**Ação:** Adicionar `registry.registerCommand()` para os 3 comandos

### Tarefa 3.5: Eliminar duplicate de styles

**Problema:** `style/ideia-styles.ts` e `src/browser/ideia-styles.ts` idênticos (C3)
**Ação:** Remover `style/ideia-styles.ts`. Manter apenas `src/browser/ideia-styles.ts`.

### Tarefa 3.6: Unificar Lifecycle WebSocket

**Problema:** Lifecycle abre WebSocket raw separado (C4)
**Arquivo:** `packages/ideia-plugin/src/browser/ideia-lifecycle-contribution.ts`
**Ação:** Remover raw WebSocket. Usar `WebSocketConnectionProvider` para receber notificações push do backend.

### Tarefa 3.7: Remover bindings redundantes do frontend module

**Problema:** `bindViewContribution` + manual Command/Keybinding/Menu bind (M1)
**Arquivo:** `packages/ideia-plugin/src/browser/ideia-frontend-module.ts`
**Ação:** Remover linhas 40-42 (bindings manuais redundantes)

### Tarefa 3.8: Corrigir CustomTitleWidget para Electron

**Problema:** Electron-only API em contexto browser (B4)
**Arquivo:** `packages/ideia-plugin/src/browser/ideia-title-bar-widget.ts`
**Ação:**

- Se for executar em Electron (que é o plano), manter como está
- Adicionar guard: `if (typeof process !== 'undefined' && process.versions?.electron) { ... }`

### Tarefa 3.9: Eliminar dead code

- Remover `DockLayout` import não usado de `ideia-chat-widget.tsx` (M3)
- Remover ou usar `WindowService` em `ideia-title-bar-widget.ts` (M2)
- Substituir `crypto.randomUUID()` por `uuid.v4()` (M4)
- Corrigir menu labels e orders (M5)

---

## FASE 4 — CORREÇÃO DE TRATAMENTO DE ERROS

**Duração:** 2 dias
**Pré-requisitos:** Fase 2
**Risco:** 🟠 (pode causar perda de dados ou deadlocks)
**Base:** Descobertas G1-G20 da análise de erros

### Tarefa 4.1: Detecção de disconexão do cliente SSE

**Problema:** Orphaned generators (G1, M6)
**Arquivo:** `packages/ideia-plugin/src/node/ideia-chat-service.ts`

**Implementação:**

```typescript
async *streamMessage(request: ChatRequest, signal?: AbortSignal): AsyncIterable<SSEEvent> {
  const abortListener = () => { /* cleanup, stop LLM call */ };
  signal?.addEventListener('abort', abortListener);
  try {
    // ... existing streaming logic ...
  } finally {
    signal?.removeEventListener('abort', abortListener);
    clearInterval(heartbeatInterval);
  }
}
```

**Arquivos afetados:** `ideia-chat-service.ts`, `ideia-service-client.ts`

### Tarefa 4.2: Propagar erros parciais de applyChanges

**Problema:** Silent partial file application (G2, M7)
**Arquivo:** `packages/ideia-plugin/src/node/ideia-task-service.ts`

**Implementação:**

```typescript
async applyChanges(changes: FileChange[]): Promise<{ applied: number; failed: Array<{ path: string; error: string }> }> {
  const failed: Array<{ path: string; error: string }> = [];
  for (const change of changes) {
    try {
      // ... apply change ...
    } catch (err) {
      failed.push({ path: change.path, error: String(err) });
    }
  }
  return { applied: changes.length - failed.length, failed };
}
```

### Tarefa 4.3: Atomic writes + backup para memory store

**Problema:** Corruption → silent reset (G3, M8); No atomic writes (G4, M9)
**Arquivo:** `packages/ideia-plugin/src/node/ideia-memory-service.ts`

**Implementação:**

```typescript
private async persist(): Promise<void> {
  const tmpPath = this.storePath + '.tmp';
  const backupPath = this.storePath + '.backup';
  try {
    const data = JSON.stringify(Array.from(this.memoryStore.values()), null, 2);
    fs.writeFileSync(tmpPath, data, 'utf-8'); // escreve em temp
    if (fs.existsSync(this.storePath)) fs.copyFileSync(this.storePath, backupPath); // backup
    fs.renameSync(tmpPath, this.storePath); // atomic replace
  } catch (err) {
    console.error('Memory persist failed:', err);
    // tentar restaurar do backup
  }
}
```

### Tarefa 4.4: Controle de concorrência em approvals

**Problema:** Race condition (G5, M10)
**Arquivo:** `packages/ideia-plugin/src/node/ideia-chat-service.ts`

**Implementação:**

```typescript
private approvalLocks = new Set<string>();

async approveCheckpoint(checkpointId: string): Promise<void> {
  if (this.approvalLocks.has(checkpointId)) {
    throw new Error('Checkpoint is already being processed');
  }
  this.approvalLocks.add(checkpointId);
  try {
    // ... existing logic ...
  } finally {
    this.approvalLocks.delete(checkpointId);
  }
}
```

### Tarefa 4.5: Timeout em pending RPC calls

**Problema:** Orphaned promises (G6, M11); No timeout (G7, M12)
**Arquivo:** `packages/ideia-plugin/src/browser/ideia-service-client.ts`
**Nota:** Se usar Theia nativo (Tarefa 3.2), isso já é gerenciado. Caso contrário, adicionar timeout.

### Tarefa 4.6: Agent health check / auto-recovery

**Problema:** Agents stuck in 'running' (G8)
**Arquivo:** `packages/ideia-plugin/src/node/ideia-agent-service.ts`

**Implementação:**

```typescript
private startHealthCheck(): void {
  setInterval(() => {
    for (const [id, agent] of this.agents) {
      if (agent.status === 'running' && agent.currentTask) {
        // Verificar se task ainda existe
        const task = this.taskService.getTask(agent.currentTask);
        if (!task || task.status === 'completed' || task.status === 'failed') {
          agent.status = 'error';
          this.eventBus.emit({ type: 'agent.stuck', source: 'ideia-agent', payload: { agentId: id } });
        }
      }
    }
  }, 30000); // a cada 30s
}
```

### Tarefa 4.7: Logging em parseToolCalls

**Problema:** Malformed tool calls silenciosos (G9)
**Arquivo:** `packages/ideia-plugin/src/node/ideia-chat-service.ts`
**Ação:** Adicionar `console.warn('Malformed tool call:', malformedContent)` quando JSON.parse falha

### Tarefa 4.8: Cleanup widget onDetach

**Problema:** Stream continua após fechar widget (G19)
**Arquivo:** `packages/ideia-plugin/src/browser/ideia-chat-widget.tsx`
**Ação:** Adicionar AbortController na instância, abortar no onDetach

---

## FASE 5 — ELECTRON NATIVO (Theia Embutido)

**Duração:** 3 dias
**Pré-requisitos:** Fase 3
**Risco:** 🔴 (arquitetura central)
**Base:** B4 (Electron API), plano original

### Tarefa 5.1: Escrever bootstrap.ts — Theia Server inline

**Arquivo:** `electron/src/bootstrap.ts`
**Ação:** Inversify container carrega módulos Theia + IDEIA inline (sem fork, sem servidor externo)

**Verificação:** Servidor Theia inicia na porta 3030 sem processo filho

### Tarefa 5.2: Escrever main.ts — Electron Main Process

**Arquivo:** `electron/src/main.ts`
**Ação:** Cria BrowserWindow, carrega `http://127.0.0.1:3030`, menu profissional, trata lifecycle
**Verificação:** Janela nativa abre com tema IDEIA

### Tarefa 5.3: Escrever preload.ts — Secure Bridge

**Arquivo:** `electron/src/preload.ts`
**Ação:** `contextBridge.exposeInMainWorld('ideia', { platform, versions, ... })`
**Verificação:** Sem `nodeIntegration`, `contextIsolation: true`

### Tarefa 5.4: Title Bar Nativa (frame: false)

**Arquivo:** `electron/src/main.ts` + `ideia-title-bar-widget.ts`
**Ação:** `frame: false, titleBarStyle: 'hidden'` no BrowserWindow + CustomTitleWidget funcional
**Verificação:** Botões minimize/maximize/close funcionam

### Tarefa 5.5: electron-builder.yml — Configuração profissional

**Arquivo:** `electron/electron-builder.yml`
**Ação:** NSIS, DMG, AppImage, ícone, publisher, auto-update

### Tarefa 5.6: Build electron + app bundle

```bash
cd electron
npm run build          # compila src/ → dist/
npx electron-builder --win  # gera installer
```

---

## FASE 6 — AUTO-INSTALADOR

**Duração:** 2 dias
**Pré-requisitos:** Fase 5
**Risco:** 🟠 (UX crítica)

### Tarefa 6.1: Auto-install de dependências do sistema

**Arquivo:** `electron/src/installer.ts`
**Ação:** Detectar Node.js, npm, Git. Baixar e instalar se faltante.

### Tarefa 6.2: Bundle de packages @ideia no installer

**Config:** `electron-builder.yml` → `extraResources`
**Verificação:** Instalador > 100MB (com Node.js bundled)

### Tarefa 6.3: Wizard de primeiro run

**Arquivo:** `electron/src/installer.ts`
**Fluxo:**

1. Boas-vindas
2. Escolher diretório de workspace
3. Instalar Ollama? (opcional)
4. Configurar chave OpenAI? (opcional)
5. Criar atalhos (desktop + start menu)

### Tarefa 6.4: Build do instalador testado

```bash
cd electron
npx electron-builder --win --x64
# Output: dist-installer/IDEIA Setup 1.0.0-beta.1.exe
```

---

## FASE 7 — IMPLEMENTAÇÃO MOCKUP-V2 (Interface Final)

**Duração:** 3 dias
**Pré-requisitos:** Fase 3, Fase 4
**Risco:** 🟡 (estético/funcional)

### Tarefa 7.1: Implementar ActivityBar Esquerda (9 ícones)

**Arquivo:** `packages/ideia-plugin/src/browser/ideia-activitybar-left.ts`
**Implementação:** SVG icons + active indicator (cyan bar) + tooltips
**Verificação:** 9 ícones aparecem, indicador segue ativo

### Tarefa 7.2: Implementar ActivityBar Direita (5 ícones)

**Arquivo:** `packages/ideia-plugin/src/browser/ideia-activitybar-right.ts`
**Ícones:** Agent Chat, Dashboard, Studies, Approvals (badge count), Suggestions
**Verificação:** Troca de abas do right panel funciona

### Tarefa 7.3: Implementar Studies Widget

**Arquivo:** `packages/ideia-plugin/src/browser/ideia-studies-widget.tsx`
**Dados:** Ativos (verdes) + Completados (cinza) + Filtro
**Verificação:** Mockup idêntico

### Tarefa 7.4: Implementar Suggestions Widget

**Arquivo:** `packages/ideia-plugin/src/browser/ideia-suggestions-widget.tsx`
**Seções:** Security, Performance, Features, Quality — cada com prioridade e impacto
**Verificação:** Mockup idêntico

### Tarefa 7.5: Implementar Search Overlay (Ctrl+P)

**Arquivo:** `packages/ideia-plugin/src/browser/ideia-search-overlay.tsx`
**Funcionalidade:** Modal com backdrop, input, resultados mockados/iniciais
**Verificação:** Ctrl+P abre/fecha, Escape fecha

### Tarefa 7.6: Agent/Editor Mode Toggle

**Arquivo:** Adicionar ao StatusBar ou title bar
**Funcionalidade:** Botão toggle "✦ Agent Mode" / "Editor Mode"
**Verificação:** Muda visual do right panel

### Tarefa 7.7: Cores e tema finais

**Arquivo:** `packages/ideia-plugin/style/ideia.css`
**Cores mockup:** `#0d0d0d`, `#2dd4bf`, `#8b5cf6`, `backdrop-filter: blur(20px)`
**Verificação:** Captura de tela vs mockup-v2.html — diferença < 5%

---

## FASE 8 — LIMPEZA E REMOÇÃO DE CÓDIGO MORTO

**Duração:** 1 dia
**Pré-requisitos:** Fase 1-7
**Risco:** 🟡 (não quebra funcionalidade)

### Tarefa 8.1: Remover ai-devkit-v2/ original

**Ação:** Mover para backup ou deletar após confirmação de que tudo funciona

### Tarefa 8.2: Remover ideia-theia/ original

**Ação:** Deletar (migrado para packages/ideia-plugin)

### Tarefa 8.3: Remover theia-app/ original

**Ação:** Deletar (migrado para apps/ideia-app)

### Tarefa 8.4: Remover electron-app/ original

**Ação:** Deletar (reescrito em electron/)

### Tarefa 8.5: Remover web-ui de packages/ (se existir)

**Ação:** Deletar `packages/web-ui/` — Theia substitui

### Tarefa 8.6: Remover apps/api/ de packages/ (se existir)

**Ação:** Deletar `apps/api/` — Theia backend substitui

### Tarefa 8.7: Remover arquivos de inicialização da raiz original

**Não copiar para IDEIA/:** `start-ideia-simple.js`, `iniciar-ideia.bat`, `iniciar-ideia.ps1`, `IDEIA.bat`, `IDEIA.exe.js`, `GUIA-EXECUCAO-IDEIA.md`, `start-ideia.ps1`

### Tarefa 8.8: Limpar mockup duplicado em ai-devkit-v2

**Ação:** Se ainda existir `ai-devkit-v2/plans/estudos/ideia-theia-mockup-v2.html`, remover (manter apenas o de `IDEIA/mockup/`)

---

## FASE 9 — DOCUMENTAÇÃO E GOVERNANÇA

**Duração:** 2 dias
**Pré-requisitos:** Fase 1-8
**Risco:** 🟡 (não quebra código)

### Tarefa 9.1: Reescrever REALITY-MANIFEST.md

**Arquivo:** `IDEIA/docs/governance/REALITY-MANIFEST.md`
**Ação:** Refletir nova estrutura: packages @ideia, apps, electron
**Eliminar:** Seção 5 (O Que Não Existe) — atualizar com o que foi implementado
**Adicionar:** Nova seção sobre estrutura unificada

### Tarefa 9.2: Atualizar GAPS-PRODUCAO-IDE.md

**Arquivo:** `IDEIA/docs/governance/GAPS-PRODUCAO-IDE.md`
**Ação:** Adicionar gaps resolvidos (das 74 descobertas), atualizar contagem

### Tarefa 9.3: Reescrever AGENTS.md

**Arquivo:** `IDEIA/AGENTS.md`
**Ação:** Simplificar. Foco em estrutura única IDEIA. Remover referências fragmentadas.

### Tarefa 9.4: Criar README.md profissional

**Arquivo:** `IDEIA/README.md`
**Conteúdo:**

- Logo IDEIA
- "IDE que transforma ideias em sistemas completos"
- Captura de tela (mockup-v2)
- Download: link para installer
- Requisitos: Windows 10+, macOS 12+, Linux (glibc 2.28+)
- Licença MIT

### Tarefa 9.5: Atualizar document-registry.md

**Arquivo:** `IDEIA/docs/governance/document-registry.md`
**Ação:** Adicionar novos estudos de análise, remover documentos obsoletos

### Tarefa 9.6: Scripts de verificação pós-migração

**Arquivo:** `IDEIA/scripts/verify-migration.js`
**Verificações:**

- [ ] Nenhum `@ai-devkit/` em packages/
- [ ] Nenhum `file:../` em package.json (tudo workspace)
- [ ] Nenhum web-ui/ ou apps/api/ em packages/
- [ ] tsc -b compila sem erros
- [ ] theia build compila sem erros
- [ ] Electron inicia sem terminal

---

## FASE 10 — TESTES E VALIDAÇÃO FINAL

**Duração:** 2 dias
**Pré-requisitos:** Fase 1-9
**Risco:** 🟠 (garantia de qualidade)

### Tarefa 10.1: Teste de compilação cruzada

```bash
cd IDEIA
npm run build              # tsc -b (todos os packages)
cd apps/ideia-app
npx theia build            # bundle Theia
cd ../../electron
npm run build              # compilar TypeScript do Electron
```

### Tarefa 10.2: Teste de runtime (dev server)

```bash
cd apps/ideia-app
node lib/backend/main.js   # iniciar Theia
# Abrir http://localhost:3030
```

**Checklist:**

- [ ] Página carrega sem erros no console
- [ ] Tema IDEIA Dark aplicado
- [ ] Todos os 5 widgets do right panel abrem
- [ ] Chat envia mensagem (mock)
- [ ] Dashboard mostra métricas
- [ ] Approvals mostra lista
- [ ] Diff mostra diferenças
- [ ] File tree mostra arquivos
- [ ] Terminal abre
- [ ] Status bar mostra "IDEIA Agent Ready"

### Tarefa 10.3: Teste de Electron

```bash
cd electron
npm start
```

**Checklist:**

- [ ] Janela nativa abre
- [ ] Title bar customizada com menus
- [ ] Botões minimize/maximize/close funcionam
- [ ] Tema IDEIA Dark aplicado
- [ ] Todos os widgets funcionam (mesmo checklist do dev server)

### Tarefa 10.4: Teste do instalador

- [ ] Instalador .exe gera sem erros
- [ ] Instalação silenciosa (Node.js detectado/instalado)
- [ ] Atalhos criados
- [ ] IDEIA abre após instalação
- [ ] Desinstalação limpa (remove tudo)

### Tarefa 10.5: Teste de conectividade LLM

- [ ] ProviderRouter detecta Ollama local
- [ ] Fallback para OpenAI se configurado
- [ ] Erro amigável se nenhum provider disponível

### Tarefa 10.6: Teste de erro e recuperação

- [ ] Desconectar rede → mensagem de erro → reconectar → retoma
- [ ] Fechar widget durante streaming → sem crash
- [ ] Arquivo inexistente → erro tratado
- [ ] Disco cheio → erro tratado
- [ ] Porta 3030 ocupada → fallback para 3031

---

## Matriz de Dependências Entre Fases

```
Fase 0 (Setup)
  └── Fase 1 (Migração)
       ├── Fase 2 (Contratos) ← também depende de Fase 1
       │    └── Fase 3 (Theia) ← também depende de Fase 2
       │         ├── Fase 4 (Erros) ← também depende de Fase 2
       │         ├── Fase 5 (Electron) ← também depende de Fase 3
       │         │    └── Fase 6 (Instalador)
       │         └── Fase 7 (Mockup) ← também depende de Fase 3, Fase 4
       └── Fase 8 (Limpeza) ← depende de Fase 1-7 completas

Fase 9 (Docs) ← depende de Fase 1-8
Fase 10 (Testes) ← depende de Fase 1-9
```

## Timeline Estimada

| Fase            | Dias | Complexidade | Riscos                                         |
| --------------- | ---- | ------------ | ---------------------------------------------- |
| F0 — Setup      | 1    | Baixa        | Nenhum                                         |
| F1 — Migração   | 2    | Alta         | Paths quebrados, packages faltando             |
| F2 — Contratos  | 2    | Alta         | Múltiplos arquivos, incompatibilidade de tipos |
| F3 — Theia      | 2    | Muito Alta   | Mudança de arquitetura de comunicação          |
| F4 — Erros      | 2    | Alta         | Pode introduzir regressões                     |
| F5 — Electron   | 3    | Muito Alta   | Arquitetura central, Theia embutido            |
| F6 — Instalador | 2    | Média        | Dependências nativas                           |
| F7 — Mockup     | 3    | Média        | 4 novos widgets                                |
| F8 — Limpeza    | 1    | Baixa        | Cuidado para não remover o que é necessário    |
| F9 — Docs       | 2    | Baixa        | Documentos grandes                             |
| F10 — Testes    | 2    | Média        | Cobertura manual                               |

**Total:** 22 dias úteis (~4.5 semanas)

---

## Resumo de Arquivos a Criar/Modificar

### Arquivos NOVOS (criar)

| Arquivo                                                          | Fase |
| ---------------------------------------------------------------- | ---- |
| `IDEIA/package.json`                                             | F0   |
| `IDEIA/tsconfig.base.json`                                       | F0   |
| `IDEIA/tsconfig.json`                                            | F0   |
| `IDEIA/.gitignore`                                               | F0   |
| `IDEIA/.editorconfig`                                            | F0   |
| `electron/src/bootstrap.ts`                                      | F5   |
| `electron/src/main.ts`                                           | F5   |
| `electron/src/preload.ts`                                        | F5   |
| `electron/src/installer.ts`                                      | F6   |
| `electron/electron-builder.yml`                                  | F5   |
| `packages/ideia-plugin/src/browser/ideia-activitybar-left.ts`    | F7   |
| `packages/ideia-plugin/src/browser/ideia-activitybar-right.ts`   | F7   |
| `packages/ideia-plugin/src/browser/ideia-studies-widget.tsx`     | F7   |
| `packages/ideia-plugin/src/browser/ideia-suggestions-widget.tsx` | F7   |
| `packages/ideia-plugin/src/browser/ideia-search-overlay.tsx`     | F7   |
| `IDEIA/scripts/verify-migration.js`                              | F9   |

### Arquivos MODIFICADOS (editar)

| Arquivo                                                               | Fase   |
| --------------------------------------------------------------------- | ------ |
| 66 × `packages/*/package.json` (renomear @ai-devkit → @ideia)         | F1     |
| `packages/ideia-plugin/package.json`                                  | F1     |
| `packages/ideia-plugin/src/node/llm-provider.ts`                      | F2     |
| `packages/ideia-plugin/src/common/ideia-types.ts`                     | F2     |
| `packages/ideia-plugin/src/common/ideia-protocol.ts`                  | F2     |
| `packages/ideia-plugin/src/node/ideia-chat-service.ts`                | F2, F4 |
| `packages/ideia-plugin/src/node/ideia-task-service.ts`                | F4     |
| `packages/ideia-plugin/src/node/ideia-memory-service.ts`              | F4     |
| `packages/ideia-plugin/src/node/ideia-agent-service.ts`               | F4     |
| `packages/ideia-plugin/src/browser/ideia-service-client.ts`           | F3     |
| `packages/ideia-plugin/src/browser/ideia-frontend-module.ts`          | F3     |
| `packages/ideia-plugin/src/browser/ideia-chat-contribution.ts`        | F3     |
| `packages/ideia-plugin/src/browser/ideia-chat-widget.tsx`             | F3, F4 |
| `packages/ideia-plugin/src/browser/ideia-lifecycle-contribution.ts`   | F3     |
| `packages/ideia-plugin/src/browser/ideia-title-bar-widget.ts`         | F5     |
| `packages/ideia-plugin/src/browser/ideia-preferences-contribution.ts` | F2     |
| `packages/ideia-plugin/style/ideia-theme.ts`                          | F3     |
| Remover `packages/ideia-plugin/style/ideia-styles.ts`                 | F3     |
| `packages/agent-runtime/src/index.ts`                                 | F2     |
| `apps/ideia-app/package.json`                                         | F1     |
| `IDEIA/AGENTS.md`                                                     | F9     |
| `IDEIA/README.md`                                                     | F9     |
| `IDEIA/docs/governance/REALITY-MANIFEST.md`                           | F9     |
| `IDEIA/docs/governance/GAPS-PRODUCAO-IDE.md`                          | F9     |

### Arquivos ELIMINADOS (não migrar ou deletar)

| Arquivo/Diretório          | Motivo                  |
| -------------------------- | ----------------------- |
| `packages/web-ui/`         | Theia substitui         |
| `apps/api/`                | Theia backend substitui |
| `ai-devkit-v2/` (original) | Migrado                 |
| `ideia-theia/` (original)  | Migrado                 |
| `theia-app/` (original)    | Migrado                 |
| `electron-app/` (original) | Reescrevendo            |
| `start-ideia-simple.js`    | Instalador substitui    |
| `iniciar-ideia.bat`        | Instalador substitui    |
| `IDEIA.bat`                | Instalador substitui    |
| `legacy/`                  | Arquivado               |

---

## Métricas de Sucesso

| Métrica                | Atual         | Alvo         | Como Medir                         |
| ---------------------- | ------------- | ------------ | ---------------------------------- |
| Compilação packages    | ✅ Compila    | ✅ Compila   | `tsc -b` exit 0                    |
| Compilação plugin      | ✅ Compila    | ✅ Compila   | `npx tsc` em packages/ideia-plugin |
| Build Theia app        | ✅ Compila    | ✅ Compila   | `npx theia build`                  |
| Build Electron         | ✅ Compila    | ✅ Compila   | `npm run build` em electron/       |
| Instalador Windows     | ❌ Não gera   | ✅ Gera .exe | `npx electron-builder --win`       |
| Interface mockup-v2    | 70%           | 100%         | Comparação visual                  |
| Erros de tipo          | 27 `as never` | 0            | `tsc --noEmit` strict              |
| Eventos órfãos         | 2 (SSE, WS)   | 0            | Teste de desconexão                |
| Memory store atômico   | ❌            | ✅           | Teste de crash write               |
| Concorrência approvals | ❌            | ✅           | Teste de 2 chamadas simultâneas    |

---

> **Este plano compila 74 descobertas em 10 fases, 22 dias, 48 tarefas.**
> **Cada tarefa tem arquivos, dependências e verificação claros.**
> **Após aprovação, podemos começar a execução pela Fase 0 (Setup).**
