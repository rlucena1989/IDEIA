# Plano de Implementação — Theia Mockup / Shell

> **Data:** 2026-07-18
> **Base:** ADR-001 (Theia como Plataforma Base), THEIA-IDEIA-RESEARCH.md
> **Status:** 📋 Planejado
> **Prioridade:** Alta — Fase 3 do roadmap V2

---

## 1. Situação Atual

### 1.1 O Que Existe

| Componente | Estado | Detalhes |
|-----------|--------|----------|
| `ideia-theia/src/browser/` | ✅ 1.260 linhas | 6 widgets React + contributions + service client |
| `ideia-theia/src/node/` | ✅ 1.075 linhas | 5 serviços backend + provider router + output validator |
| `ideia-theia/src/common/` | ✅ 172 linhas | Tipos + protocolo JSON-RPC |
| `ideia-theia/style/` | ✅ Tema CSS | Animações e tema IDEIA |
| `FLUXO-COMPLETO.md` | ✅ 326 linhas | Documentação completa do fluxo |
| **Total** | **2.876 linhas** | **18 arquivos TypeScript/TSX** |

### 1.2 O Que Está Bloqueado

| Bloqueador | Causa | Impacto |
|-----------|-------|---------|
| `npm install` falha | `@theia/ai-agent@^1.73.0` não existe no npm público | ❌ Não compila |
| Sem app host | `ideia-theia/` é extensão, não aplicação | ❌ Não executa |
| 0 testes | Nenhum teste unitário nos 18 arquivos | ⚠️ Risco |
| G5 (LSP) | Zero Language Server Protocol | ❌ IDE sem navegação |
| G8 (DAP) | Zero Debug Adapter Protocol | ❌ IDE sem debug |
| ADR-001 | Não adotado oficialmente | ⚠️ Sem decisão arquitetural |

---

## 2. Dependências Theia no npm

| Package | Versão | npm | Necessário para |
|---------|--------|-----|----------------|
| `@theia/core` | 1.73.1 | ✅ | Plataforma base |
| `@theia/editor` | 1.73.1 | ✅ | Editor Monaco |
| `@theia/filesystem` | 1.73.1 | ✅ | Operações de arquivo |
| `@theia/monaco` | 1.73.1 | ✅ | Monaco Editor integrado |
| `@theia/ai-core` | 1.73.1 | ✅ | Serviços de IA (AIService, ChatAgent) |
| `@theia/ai-chat` | 1.73.1 | ✅ | Widget de chat com IA |
| `@theia/ai-agent` | ❌ | **NÃO EXISTE** | Funcionalidade consolidada em ai-core |
| `@theia/messages` | 1.73.1 | ✅ | Notificações toast |
| `@theia/preferences` | 1.73.1 | ✅ | Preferências do usuário |
| `@theia/workspace` | 1.73.1 | ✅ | Gerenciamento de workspace |
| `@theia/navigator` | 1.73.1 | ✅ | Navegador de arquivos |
| `@theia/electron` | 1.73.1 | ✅ | Shell Electron |
| `@theia/terminal` | 1.73.1 | ✅ | Terminal integrado |

---

## 3. Plano de Ação (3 Fases)

### Fase 1 — 🟢 Desbloqueio (1-2 dias)

#### 1.1 Remover `@theia/ai-agent` das dependências

**Problema:** `@theia/ai-agent` não existe no npm. Foi consolidado no `@theia/ai-core`.

**Ação:** 
- Remover `@theia/ai-agent` do `package.json`
- Ajustar imports no backend para usar `@theia/ai-core` diretamente
- `AIService`, `ChatAgent`, `ToolProvider` estão todos em `@theia/ai-core`

**Arquivos:** `ideia-theia/package.json`, `ideia-theia/src/node/ideia-agent-service.ts`

#### 1.2 Criar Theia App Host

**Problema:** `ideia-theia` é um plugin, não roda sozinho.

**Ação:** Criar `theia-app/` na raiz com:
- `package.json` que referencie `@theia/core`, `@theia/editor`, `@theia/monaco`, etc
- Incluir `@ideia/theia-plugin` como extensão local
- Script `start` que inicie o backend + frontend Theia
- Script `build` que compile o app completo

**Arquivos:** `theia-app/package.json`, `theia-app/src/main.ts`, `theia-app/src/backend.ts`

#### 1.3 Testar `npm install` + compilação

**Ação:** Verificar se todo o stack compila após correções.

---

### Fase 2 — 🟡 Mockup Funcional (1-2 semanas)

#### 2.1 Integrar Widgets Existentes

| Widget | Integração | Esforço |
|--------|-----------|---------|
| `ideia-chat-widget.tsx` | Adaptar para `@theia/ai-chat` | 4h |
| `ideia-diff-widget.tsx` | Adaptar para Monaco diff editor | 2h |
| `ideia-approval-widget.tsx` | Manter como widget próprio | 1h |
| `ideia-dashboard-widget.tsx` | Conectar com backend metrics | 2h |
| `ideia-file-widget.tsx` | Substituir pelo `@theia/navigator` | 2h |
| `ideia-chat-contribution.ts` | Ajustar comandos/menus | 1h |

#### 2.2 Conectar Backend Theia aos @ai-devkit/*

**Ação:** No backend Theia, importar e instanciar os packages `@ai-devkit/*` já existentes:
- `@ai-devkit/event-bus` → EventBus Theia
- `@ai-devkit/policy-engine` → Policy check
- `@ai-devkit/llm-provider` → Chat com LLM
- `@ai-devkit/agent-runtime` → Execução de agentes
- `@ai-devkit/memory-store` → Persistência
- `@ai-devkit/audit-trail` → Auditoria

**Arquivos:** `ideia-theia/src/node/ideia-backend-module.ts`

#### 2.3 Configurar LSP (Language Server Protocol)

**Problema:** G5 — sem navegação de código.

**Ação:** Theia já tem suporte nativo a LSP via `@theia/lsp`:
```typescript
// Configurar LSP para TypeScript
container.bind(LanguageServerContribution).to(TypeScriptContribution);
```

**Pacotes necessários:**
- `@theia/lsp` — já incluso no `@theia/core`
- `typescript-language-server` — servidor LSP para TS
- Configurar no backend Theia

#### 2.4 Conectar ao @ai-devkit/data-layer

**Ação:** Usar o `@ai-devkit/data-layer` com SQLite para persistência local no backend Theia:
- Decisões (approve/reject)
- Sessões
- Memória vetorial (VectorStore)

---

### Fase 3 — 🔴 Mockup Completo (2-4 semanas)

#### 3.1 Shell Electron

**Ação:** Usar `@theia/electron` para criar janela nativa:
```json
{
  "dependencies": {
    "@theia/electron": "^1.73.0",
    "electron": "^28.0.0"
  }
}
```

#### 3.2 Temas e Identidade Visual

**Ação:** Aplicar tema IDEIA no Theia:
- Cores, ícones, fonts personalizadas
- Tela de boas-vindas (welcome page)
- Splash screen personalizada

#### 3.3 Comandos e Shortcuts

| Atalho | Comando | Widget |
|--------|---------|--------|
| `Ctrl+Shift+I` | IDEIA: Open Assistant Chat | Chat Widget |
| `Ctrl+Shift+D` | IDEIA: Show Dashboard | Dashboard |
| `Ctrl+Shift+A` | IDEIA: Approvals | Approval Widget |
| `Ctrl+Shift+N` | IDEIA: New Project from Idea | Chat Widget |

#### 3.4 Testes

**Ação:** Criar testes para todos os 18 arquivos:
- Unit tests para serviços (chat, task, agent, memory, dashboard)
- Integration tests para fluxo chat → LLM → task
- Widget tests (React Testing Library)

---

## 4. Dependências Externas

### 4.1 Packages npm Necessários

| Package | Versão | Para quê |
|---------|--------|----------|
| `@theia/core` | ^1.73.0 | Plataforma base |
| `@theia/editor` | ^1.73.0 | Monaco Editor |
| `@theia/filesystem` | ^1.73.0 | FS operations |
| `@theia/monaco` | ^1.73.0 | Monaco integration |
| `@theia/ai-core` | ^1.73.0 | AI services |
| `@theia/ai-chat` | ^1.73.0 | Chat widget |
| `@theia/messages` | ^1.73.0 | Toast messages |
| `@theia/preferences` | ^1.73.0 | Settings |
| `@theia/workspace` | ^1.73.0 | Workspace mgmt |
| `@theia/navigator` | ^1.73.0 | File explorer |
| `@theia/terminal` | ^1.73.0 | Terminal |
| `@theia/lsp` | ^1.73.0 | LSP support |
| `@theia/electron` | ^1.73.0 | Electron shell |
| `react` | ^18.3.0 | Widgets |
| `react-dom` | ^18.3.0 | Widget rendering |
| `inversify` | ^6.0.0 | DI container |
| `typescript-language-server` | ^5.3.0 | TS LSP server |

---

## 5. Arquitetura Final

```
┌─────────────────────────────────────────────────────────────────┐
│                      THEIA ELECTRON APP                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  FRONTEND (Browser window)                                 │  │
│  │                                                             │  │
│  │  Monaco Editor │ File Explorer │ Terminal │ Chat │ Diff │  │  │
│  │  Dashboard │ Approvals │ Preferences                        │  │
│  │                                                             │  │
│  │  @ideia/theia-plugin (widgets + contributions)              │  │
│  └──────────────────┬────────────────────────────────────────┘  │
│                     │ JSON-RPC over WebSocket                    │
│  ┌──────────────────▼────────────────────────────────────────┐  │
│  │  BACKEND (Node.js process)                                  │  │
│  │                                                             │  │
│  │  @ai-devkit/event-bus     │ @ai-devkit/policy-engine       │  │
│  │  @ai-devkit/llm-provider  │ @ai-devkit/agent-runtime       │  │
│  │  @ai-devkit/memory-store  │ @ai-devkit/audit-trail         │  │
│  │  @ai-devkit/data-layer    │ @ai-devkit/delivery-orch       │  │
│  │                                                             │  │
│  │  LSP Server (TS/JS/JSON/CSS) │ Terminal (node-pty)         │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Esforço Estimado

| Fase | Tasks | Esforço | Dependências |
|------|-------|---------|-------------|
| 🟢 Fase 1 — Desbloqueio | 3 | 1-2 dias | Nenhuma |
| 🟡 Fase 2 — Mockup Funcional | 8 | 1-2 semanas | Fase 1 |
| 🔴 Fase 3 — Mockup Completo | 6 | 2-4 semanas | Fase 2 |
| **Total** | **17** | **3-6 semanas** | |

### Marcos (Milestones)

| Marco | Entrega | Critério |
|-------|---------|----------|
| M1 | Fim da Fase 1 | `npm install` funciona + app sobe |
| M2 | Fim da Fase 2 | Chat + Editor + Terminal + LSP funcionais |
| M3 | Fim da Fase 3 | 6 widgets + Electron shell + testes |

---

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `@theia/ai-core` API mudou na 1.73 | Média | Alto | Verificar changelog do Theia AI |
| Theia 1.73 requer Node 20+ | Baixa | Médio | CI já testa Node 20/22 |
| Electron 28+ quebra algo | Baixa | Médio | Testar em CI matrix |
| LSP + DAP complexos de configurar | Alta | Alto | Reutilizar config do VS Code |
| Plugin não carrega extensão corretamente | Média | Alto | Testar com app Theia mínimo primeiro |
