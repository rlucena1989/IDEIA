# Estudo de Implementação do Mockup IDEIA — Frontend Completo

> **Propósito:** Mapear todas as necessidades para transformar o mockup HTML em frontend funcional, aproveitando Theia como shell e web-ui como base.
> **Base:** `plans/estudos/ideia-theia-mockup-v2.html` (1.047 linhas) + `web-ui` (58K linhas, 27 componentes) + `ideia-theia` (2.8K linhas, 18 widgets)

---

## 1. Menus Padrão de uma IDE

O mockup define 9 menus. Cada um precisa existir no Theia + ter ações reais implementadas.

### 1.1 Estrutura de Menus

```
┌─────────────────────────────────────────────────────────────────────────┐
│ File  Edit  Selection  View  Go  Run  Terminal  Help  IDEIA            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 File
| Ação | Atalho | Existe no Theia? | Existe no web-ui? | Backend necessário |
|------|--------|-----------------|-------------------|-------------------|
| New File | Ctrl+N | ✅ Nativo | ✅ | `POST /api/fs/create` |
| New Folder | Ctrl+Shift+N | ✅ Nativo | ❌ | `POST /api/fs/create` |
| Open File | Ctrl+O | ✅ Nativo | ✅ | `GET /api/fs/read` |
| Open Folder | Ctrl+K Ctrl+O | ✅ Nativo | ❌ | — |
| Save | Ctrl+S | ✅ Nativo | ✅ | `POST /api/fs/write` |
| Save All | Ctrl+Shift+S | ✅ Nativo | ❌ | `POST /api/fs/write` |
| Close | Ctrl+W | ✅ Nativo | ✅ | — |
| Close All | Ctrl+Shift+W | ✅ Nativo | ❌ | — |
| **Settings** | Ctrl+, | ✅ Nativo | ✅ SettingsModal | `GET /api/workspace/config` |
| **Preferences** | Ctrl+Shift+P | ✅ Nativo | ❌ | — |

### 1.3 Edit
| Ação | Atalho | Status |
|------|--------|--------|
| Undo | Ctrl+Z | ✅ Theia + web-ui |
| Redo | Ctrl+Shift+Z | ✅ Theia + web-ui |
| Cut | Ctrl+X | ✅ Theia + web-ui |
| Copy | Ctrl+C | ✅ Theia + web-ui |
| Paste | Ctrl+V | ✅ Theia + web-ui |
| Find | Ctrl+F | ✅ Monaco |
| Replace | Ctrl+H | ✅ Monaco |

### 1.4 Selection
| Ação | Atalho | Status |
|------|--------|--------|
| Select All | Ctrl+A | ✅ |
| Expand Selection | Ctrl+Shift+→ | ✅ Theia |
| Shrink Selection | Ctrl+Shift+← | ✅ Theia |

### 1.5 View
| Ação | Atalho | Existe? | Implementação |
|------|--------|---------|---------------|
| Explorer | Ctrl+Shift+E | ✅ Theia | File Explorer nativo |
| Search | Ctrl+Shift+F | ✅ Theia | Search nativo |
| Source Control | Ctrl+Shift+G | ✅ web-ui | GitPanel inline |
| Run | Ctrl+Shift+D | 🔴 **FALTA** | DebugPanel + DAP |
| Extensions | Ctrl+Shift+X | ❌ **FALTA** | Theia OpenVSX |
| Problems | Ctrl+Shift+M | ❌ **FALTA** | ProblemsPanel |
| Output | Ctrl+Shift+U | ✅ Theia | Terminal bottom panel |
| Terminal | Ctrl+` | ✅ web-ui | Terminal.tsx |
| Dashboard | Ctrl+Shift+I | ✅ IDEIA | Right panel widget |
| Approvals | Ctrl+Shift+A | ✅ IDEIA | Right panel widget |
| Suggestions | Ctrl+Shift+S | 🔴 **FALTA** | Novo componente |

### 1.6 Go
| Ação | Atalho | Status |
|------|--------|--------|
| Go to File | Ctrl+P | ✅ Theia Quick Open |
| Go to Symbol | Ctrl+Shift+O | ✅ Monaco |
| Go to Line | Ctrl+G | ✅ Monaco |
| Go to Definition | F12 | ✅ LSP |
| Go to References | Shift+F12 | ✅ LSP |
| Go to Type Definition | Ctrl+K Ctrl+T | ✅ LSP |

### 1.7 Run
| Ação | Atalho | Status | Backend |
|------|--------|--------|---------|
| Start Debugging | F5 | 🔴 **FALTA** | DAP bridge |
| Run Without Debugging | Ctrl+F5 | 🔴 **FALTA** | `POST /api/shell` |
| Stop Debugging | Shift+F5 | 🔴 **FALTA** | DAP disconnect |
| Step Over | F10 | 🟡 **DAP client existe** | DAP bridge |
| Step Into | F11 | 🟡 **DAP client existe** | DAP bridge |
| Step Out | Shift+F11 | 🟡 **DAP client existe** | DAP bridge |
| Toggle Breakpoint | F9 | 🟡 **DAP client existe** | DAP bridge |

### 1.8 Terminal
| Ação | Atalho | Status |
|------|--------|--------|
| New Terminal | Ctrl+` | ✅ web-ui (xterm+PTY) |
| Split Terminal | Ctrl+Shift+5 | ❌ **FALTA** |
| Run Task | Ctrl+Shift+B | 🔴 **FALTA** | `POST /api/tasks` |

### 1.9 Help
| Ação | Atalho | Status |
|------|--------|--------|
| About IDEIA | — | 🔴 **FALTA** |
| Documentation | — | 🔴 **FALTA** |
| Report Issue | — | 🔴 **FALTA** |
| Check for Updates | — | 🔴 **FALTA** |

### 1.10 IDEIA (Menu Customizado)
| Ação | Atalho | Status |
|------|--------|--------|
| IDEIA Chat | Ctrl+Shift+/ | ✅ Theia AI Chat |
| New Project from Idea | Ctrl+Shift+N | ✅ `ai-devkit init` |
| Run Agent | — | 🟡 AgentRuntime |
| Show Dashboard | Ctrl+Shift+D | ✅ Widget |
| Show Approvals | Ctrl+Shift+A | ✅ Widget |
| Show Suggestions | Ctrl+Shift+? | 🔴 **FALTA** |

### Totais de Ações

| Status | Quantidade |
|--------|-----------|
| ✅ Já existem | 37 ações |
| 🟡 Existem mas precisam de conexão | 5 ações (DAP) |
| 🔴 **FALTAM** | 14 ações |
| ❌ Não planejadas | 2 ações (Extensões) |

---

## 2. Painéis Redesenhados

O mockup define 4 painéis no right panel. Cada um tem requisitos específicos.

### 2.1 Dashboard

```
┌─────────────────────────────────────────┐
│ Dashboard  [↻ Refresh] [📊 Report]      │
│                                         │
│ Overview │ Trends │ Modules │ Deps      │
├─────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │ 1,247│ │ 87%  │ │  8   │ │ 14h  │   │
│ │ Tests│ │Cover │ │ Gaps │ │ Debt │   │
│ │ pros │ │ bar  │ │ crit │ │  est.│   │
│ └──────┘ └──────┘ └──────┘ └──────┘   │
│                                         │
│ Agent Pipeline: Coder · Security · ... │
│ Scope: agents/ orchestration/ llm/ ... │
└─────────────────────────────────────────┘
```

**Dados necessários:**

| Card | Dado | Fonte | Endpoint |
|------|------|-------|----------|
| Tests | 1.247 passing | Jest | `GET /api/diagnostics` |
| Coverage | 87% | Jest --coverage | `GET /api/diagnostics` |
| Gaps | 8 (3 critical) | GAPS-PRODUCAO-IDE.md | `GET /api/status` |
| Tech Debt | 14h | Scorecard | `GET /api/tasks` |
| Pipeline | Agent steps | AgentRuntime | `GET /api/status` |
| Scope | Workspace dirs | File system | `GET /api/fs/list` |

**Backend necessário (NOVO):**
```
GET /api/diagnostics → { tests, coverage, lintErrors }
GET /api/gaps → { total, critical, high, medium, resolved }
GET /api/pipeline → { agents, steps, status }
```

### 2.2 Studies

```
┌─────────────────────────────────────────┐
│ Studies  [🔍 Search] [⊞ Filter]        │
│                                         │
│ All │ Active │ Completed │ 4 total      │
├─────────────────────────────────────────┤
│ ▎M  MCP server orchestration patterns   │
│ ▎   Started 2d ago · 3 sources          │
│                                         │
│ ▎V  Vector search for agent memory      │
│ ▎   Started 4d ago · 5 references       │
│                                         │
│ ✓  Theia AI integration (completed)     │
└─────────────────────────────────────────┘
```

**Dados necessários:**
- Lista de estudos (do `docs/ESTUDOS/`)
- Status (active/completed)
- Metadados (sources, references, time)
- Busca textual
- Filtro por status

**Backend necessário (NOVO):**
```
GET /api/studies → [{ id, title, status, sources, startedAt }]
GET /api/studies/search?q=text → resultados
```

### 2.3 Approvals

```
┌─────────────────────────────────────────┐
│ Approvals  [🔍 Search] [⊞ Filter]  (11) │
│                                         │
│ Pending │ History │ All                 │
├─────────────────────────────────────────┤
│ 🔴 Review security-auditor integration  │
│    Blocking · pipeline@main   [✔] [✕]  │
│                                         │
│ 🟠 Approve pipeline config changes      │
│    3 files · 2h ago           [✔] [✕]  │
│                                         │
│ 🟢 Deploy v0.2.0 to staging             │
│    Auto-approve in 12h        [✔] [✕]  │
└─────────────────────────────────────────┘
```

**Dados necessários:**
- Lista de approvals (do PolicyEngine + Checkpoints)
- Prioridade (red/orange/green)
- Botões ✔ e ✕ inline
- Busca + filtro

**Backend necessário (NOVO):**
```
GET /api/approvals → [{ id, title, priority, context, status }]
POST /api/approvals/:id/approve → { ok }
POST /api/approvals/:id/reject → { ok }
```

### 2.4 Suggestions

```
┌─────────────────────────────────────────┐
│ AI Suggestions  [↻ Refresh] [Impact ▼] │
│                                         │
│ All │ Security │ Perf │ Features │ Qual │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 🔴 Security · High · ~3h            │ │
│ │ Add input validation to tool exec   │ │
│ │ Missing input sanitization...       │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 🟠 Performance · Medium · ~4h       │ │
│ │ Cache LLM responses by context hash │ │
│ │ Reduce latency by ~40%...           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Dados necessários:**
- Sugestões geradas por IA (do CorrectionOracle + FeedbackPipeline)
- Categorias (security, perf, features, quality)
- Impacto estimado + esforço
- Refresh periódico

**Backend necessário (NOVO):**
```
GET /api/suggestions → [{ title, description, category, impact, effort }]
```

---

## 3. Componentes Theia vs web-ui vs Mockup

### 3.1 Tabela de Mapeamento

| Componente Mockup | web-ui Correspondente | Theia Nativo | Ação |
|------------------|---------------------|--------------|------|
| Title bar + Menus | ❌ Não tem | ✅ `@theia/core` menus | Usar Theia |
| Activity Bar | ✅ Sidebar (ícones) | ✅ ActivityBar | Usar Theia |
| File Tree | ✅ FileExplorer.tsx | ✅ FileNavigator | Usar Theia |
| Editor + Tabs | ✅ EditorMode.tsx | ✅ Editor | Usar Theia |
| Code Highlight | ❌ Syntax tokens | ✅ Monaco | Usar Monaco |
| Bottom Terminal | ✅ Terminal.tsx | ✅ Terminal | Usar Theia |
| Dashboard Panel | ✅ DashboardMode | 🔴 **FALTA** | Migrar do web-ui |
| Studies Panel | ❌ **FALTA** | ❌ **FALTA** | **CRIAR** |
| Approvals Panel | ✅ PatchPreview | 🔴 Widget existe | **CRIAR** |
| Suggestions Panel | ❌ **FALTA** | ❌ **FALTA** | **CRIAR** |
| Search Overlay | ✅ CommandPalette | ✅ Quick Open | Usar Theia |
| Settings Modal | ✅ SettingsModal | ✅ Preferences | Usar Theia |

### 3.2 O Que Precisa Ser CRIADO

| Componente | Local | Esforço | Dados |
|-----------|-------|---------|-------|
| **StudiesPanel.tsx** | `web-ui/src/components/` | 2 dias | `GET /api/studies` |
| **ApprovalsPanel.tsx** | `web-ui/src/components/` | 1 dia | `GET /api/approvals` |
| **SuggestionsPanel.tsx** | `web-ui/src/components/` | 2 dias | `GET /api/suggestions` |
| **TitleBar** (menus) | Theia (já existe) | 0 | Nativo do Theia |
| **ActivityBar** | Theia (já existe) | 0 | Nativo do Theia |
| **SearchOverlay** | Theia (já existe) | 0 | Nativo do Theia |

### 3.3 O Que Precisa Ser CONECTADO

| Conexão | De | Para | Endpoint |
|---------|-----|------|----------|
| DAP Debug | DebugPanel | DAP Bridge | `ws://host/dap` |
| Dashboard data | DashboardMode | Backend | `GET /api/diagnostics` |
| Approvals real | ApprovalWidget | Backend | `GET /api/approvals` |
| Studies real | StudiesPanel | Backend | `GET /api/studies` |
| Suggestions real | SuggestionsPanel | Backend | `GET /api/suggestions` |

### 3.4 O Que Precisa Ser CRIADO no Backend

| Endpoint | Método | Dados | Prioridade |
|----------|--------|-------|------------|
| `GET /api/diagnostics` | JSON | tests, coverage, lint, gaps | 🔴 Alta |
| `GET /api/studies` | JSON | estudos + status + metadados | 🔴 Alta |
| `GET /api/studies/search` | JSON | busca textual | 🟡 Média |
| `GET /api/approvals` | JSON | approvals com prioridade | 🔴 Alta |
| `POST /api/approvals/:id/approve` | JSON | aprovar | 🔴 Alta |
| `POST /api/approvals/:id/reject` | JSON | rejeitar | 🔴 Alta |
| `GET /api/suggestions` | JSON | sugestões categorizadas | 🟡 Média |
| `POST /api/suggestions/:id/apply` | JSON | aplicar sugestão | 🟢 Baixa |
| `ws://host/dap` | WebSocket | DAP protocol | 🔴 Alta |

---

## 4. Plano de Implementação

### Fase 1 — Backend (3 dias)

```
Dia 1: Criar endpoints /api/diagnostics, /api/studies, /api/suggestions
       Reaproveitar: GAPS doc, Jest output, AuditTrail, PolicyEngine

Dia 2: Criar endpoints /api/approvals (CRUD + approve/reject)
       Conectar DAP bridge ao WebSocket /dap

Dia 3: Testar todos os endpoints (35 existentes + 5 novos = 40)
```

### Fase 2 — Componentes (3 dias)

```
Dia 4: StudiesPanel.tsx + ApprovalsPanel.tsx
       (copiar do mockup, adaptar para React + API real)

Dia 5: SuggestionsPanel.tsx + conectar Dashboard a dados reais
       (DashboardMode hoje usa dados mock)

Dia 6: Conectar DAP (DebugPanel + dap-client.ts + DAP bridge)
       Testar debug real (breakpoint → stack → variables)
```

### Fase 3 — Menus + Theia (2 dias)

```
Dia 7: Mapear todos os menus Theia
       Adicionar ações faltantes (Run, Help, IDEIA custom)
       Configurar shortcuts para ações IDEIA

Dia 8: Testar fluxo completo
       40 endpoints · 27 componentes · 9 menus · 4 painéis
```

---

## 5. Mockup → Código Real: Regras

Para manter o mockup como fonte de verdade para mudanças rápidas:

```
mockup/ideia-theia-mockup-v2.html  ← Fonte do design (NUNCA alterar código daqui)
         ↓ "copiar e adaptar"
web-ui/src/components/*.tsx        ← Código real dos componentes
         ↓ "replicar no Theia"
ideia-theia/src/browser/*.tsx      ← Widgets Theia (thin wrappers)
```

### Regras:
1. **Mockup é preservado** — nunca editar o HTML diretamente para correções
2. **Componentes vão para web-ui** — código real em React + TypeScript
3. **Widgets Theia são thin wrappers** — apenas embelezamento Inversify DI
4. **Backend endpoints NOVOS** — vão para `apps/api/src/index.ts` (e espelhados no `ide-server.ts`)
5. **Menus são do Theia** — nunca criar menus customizados no web-ui (duplicaria esforço)

---

## 6. Resumo de Esforço

| Área | Itens | Dias |
|------|-------|------|
| Backend (5 novos endpoints) | 5 | 3 |
| Componentes (3 novos + 4 conectados) | 7 | 3 |
| Menus + Theia (14 ações faltantes) | 14 | 2 |
| DAP bridge connection | 1 | 0.5 |
| **Total** | **27** | **~8 dias** |
