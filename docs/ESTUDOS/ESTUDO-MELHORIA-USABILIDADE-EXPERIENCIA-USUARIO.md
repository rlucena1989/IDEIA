# Estudo UX — Melhoria de Usabilidade e Experiência do Usuário

> **Tipo:** `study`
> **Status:** `draft`
> **Data:** 2026-07-18
> **Propósito:** Análise completa de usabilidade de todas as interfaces da IDEIA (web UI, CLI, VS Code extension, Electron, Theia), identificação de gaps e plano de melhorias para tornar cada interação mais intuitiva, eficiente e agradável.

---

## 1. Inventário de Interfaces de Usuário

### 1.1 Canais de Interação

| Canal | Tecnologia | Usuários | Maturidade | Componentes |
|-------|-----------|----------|------------|-------------|
| **Web UI** | React 18 + Vite + Monaco | Devs (IDE completa) | ✅ Completo | 5 modes, 27 components |
| **CLI** | Commander.js + tsx | Devs (automação) | ✅ 130+ comandos | — |
| **VS Code Extension** | VS Code API | Devs (editor VS Code) | ✅ 51 comandos, 6 views | Tree views, webviews |
| **Electron** | Electron + BrowserWindow | Devs (desktop nativo) | 🟡 Funcional | Janela nativa, menus |
| **Theia Plugin** | Theia Platform | Devs (Theia IDE) | 🔴 Esboço | Apenas backend services |

### 1.2 Mapa de Jornada do Usuário

```
DESCOBRIR → INSTALAR → ONBOARDING → USAR → MANTER → EVOLUIR
    │          │          │           │       │        │
    ▼          ▼          ▼           ▼       ▼        ▼
 README.md  npm i -g  Wizard 5   Web UI  reality-sync S23/S25
 GitHub     ai-devkit  passos    CLI     auto-heal    auto-evolução
 docs       init       perfil    VS Code
```

---

## 2. Análise de Usabilidade por Canal

### 2.1 Web UI — 27 Componentes Avaliados

| Componente | UX Score | Problemas Identificados | Prioridade |
|-----------|----------|------------------------|------------|
| **EditorMode** | 7/10 | Sem breadcrumb, sem auto-save, sem undo/redo, minimap config ignorada | Alta |
| **AgentMode (Chat)** | 7/10 | Sem histórico persistente, sem exportação, sem cancelamento de streaming | Alta |
| **Terminal** | 6/10 | Sem scrollback search, sem comando histórico persistente, sem split panes | Alta |
| **FileExplorer** | 6/10 | Sem undo/rename/delete, sem multi-select, sem drag-drop entre pastas | Alta |
| **DebugPanel** | 7/10 | Breakpoints não persistem, sem watch expressions, sem conditional breakpoints | Média |
| **ProblemsPanel** | 6/10 | Sem diff para fixes inline, sem agrupamento por arquivo, sem auto-fix | Alta |
| **PreviewMode** | 7/10 | Sem visual diff lado-a-lado, sem ignorar arquivos | Média |
| **Dashboard** | 5/10 | Dados densos sem visualizações gráficas, sem exportação de relatórios | Alta |
| **SettingsModal** | 5/10 | Config workspace em JSON puro sem validação visual, sem busca em settings | Alta |
| **OnboardingMode** | 8/10 | Sem coachmarks pós-wizard, sem tutorial interativo | Média |
| **CommandPalette** | 8/10 | Sem histórico de comandos recentes, sem fuzzy search melhorada | Baixa |
| **StatusBar** | 8/10 | Informações densas sem agrupamento lógico | Baixa |
| **ChatPanel** | 7/10 | Contexto não persiste entre sessões, sem atalhos de formatação | Média |
| **ContextPanel** | 6/10 | Informação estática sem ações contextuais | Média |
| **DecisionCenter** | 7/10 | Decisões antigas não têm busca/filtro | Baixa |
| **KanbanBoard** | 6/10 | Sem drag-drop entre colunas, sem filtro por label/membro | Média |
| **OutlinePanel** | 7/10 | Sem busca dentro dos símbolos, sem pin de símbolos frequentes | Baixa |

### 2.2 Web UI — Problemas Transversais

| # | Problema | Ocorrências | Impacto | Solução |
|---|----------|-------------|---------|---------|
| UX-01 | **Loading states genéricos** ("Carregando...") | 6 componentes | Médio | Skeleton screens com layout correspondente |
| UX-02 | **Erros silenciosos** (`.catch {}` vazio) | 10+ locais | Alto | Toast de erro + log no console + botão de detalhes |
| UX-03 | **Sem feedback de sucesso/erro** em operações de arquivo | FileExplorer | Alto | Toast animado com undo |
| UX-04 | **Tooltips ausentes** em botões de ação | 15+ botões | Baixo | Adicionar `title` em todos os botões sem label |
| UX-05 | **Sem undo** em operações destrutivas | FileExplorer, auto-fix | Alto | Lixeira temporária + notificação com undo |
| UX-06 | **Config JSON sem validação visual** | SettingsModal | Alto | Editor JSON com validação inline e schema-aware |
| UX-07 | **Minimap config ignorada** | EditorMode | Baixo | Ler localStorage no mount do editor |
| UX-08 | **Sem auto-save** | EditorMode | Médio | Auto-save após N segundos de inatividade |
| UX-09 | **Sem busca em settings** | SettingsModal | Médio | Campo de busca com highlight nos resultados |
| UX-10 | **Sem atalhos de teclado customizáveis** | Global | Médio | Painel de atalhos com rebind |

### 2.3 CLI — Avaliação

| Aspecto | Nota | Problemas |
|---------|------|-----------|
| **Help/--help** | 8/10 | Comandos têm descrição, mas sem exemplos de uso |
| **Autocomplete** | 5/10 | Sem tab completion nativo (precisa configurar manualmente) |
| **Output format** | 7/10 | Suporta `--json` mas nem todos os comandos implementam |
| **Progresso** | 4/10 | Comandos longos sem barra de progresso ou spinner |
| **Error messages** | 6/10 | Mensagens de erro técnicas sem sugestão de ação |
| **Dry-run** | 5/10 | Poucos comandos suportam `--dry-run` |
| **Cor** | 8/10 | Output colorido com `printHeader`, `printResult`, `printLine` |

### 2.4 VS Code Extension — Avaliação

| Aspecto | Nota | Problemas |
|---------|------|-----------|
| **Tree views** | 7/10 | Dados densos sem busca/filtro nas views |
| **Commands** | 7/10 | 51 comandos sem organização em categorias |
| **Status bar** | 8/10 | Informação clara com cores e badges |
| **Webviews** | 6/10 | Chat webview sem persistência, graph SVG sem zoom/pan |
| **Progress** | 7/10 | `executeCommandWithProgress` com título descritivo |
| **Error handling** | 6/10 | Mensagens genéricas sem actionable next steps |

---

## 3. Plano de Melhorias Prioritárias

### 3.1 Fase 1 — Quick Wins (1-2 dias cada)

| ID | Melhoria | Esforço | Impacto | Componentes |
|----|----------|---------|---------|-------------|
| UX-Q1 | Adicionar `title` nos botões sem label | 2h | Médio | 15+ botões |
| UX-Q2 | Consertar minimap config (ler localStorage) | 30min | Baixo | EditorMode |
| UX-Q3 | Substituir `.catch {}` por toast + log | 4h | Alto | 10+ componentes |
| UX-Q4 | Adicionar `--dry-run` nos comandos principais | 4h | Alto | CLI |
| UX-Q5 | Adicionar skeleton loading nos componentes | 8h | Alto | 6 componentes |
| UX-Q6 | Adicionar tab completion (Bash/Zsh/PowerShell) | 4h | Médio | CLI |
| UX-Q7 | Adicionar busca em settings | 4h | Médio | SettingsModal |

### 3.2 Fase 2 — Experiência Core (3-5 dias cada)

| ID | Melhoria | Esforço | Impacto | Componentes |
|----|----------|---------|---------|-------------|
| UX-C1 | Auto-save com debounce (2s inatividade) | 1d | Alto | EditorMode |
| UX-C2 | Undo/redo para FileExplorer (lixeira temporária) | 3d | Alto | FileExplorer |
| UX-C3 | Editor JSON com validação schema-aware | 2d | Alto | SettingsModal |
| UX-C4 | Terminal scrollback search (Ctrl+F) | 1d | Alto | Terminal |
| UX-C5 | Streaming chat cancelável | 1d | Alto | AgentMode |
| UX-C6 | Toast com undo para operações de arquivo | 2d | Alto | FileExplorer |
| UX-C7 | Breadcrumb navigation no editor | 2d | Médio | EditorMode |
| UX-C8 | Spinner de progresso em comandos CLI longos | 2d | Médio | CLI |

### 3.3 Fase 3 — UX Avançada (1-2 semanas cada)

| ID | Melhoria | Esforço | Impacto | Descrição |
|----|----------|---------|---------|-----------|
| UX-A1 | **Coachmarks contextuais** | 1 sem | Alto | Tour guiado pós-onboarding, destacando features |
| UX-A2 | **Config visual completa (não JSON)** | 2 sem | Alto | UI de configuração com busca, categorias, validação |
| UX-A3 | **Dashboard com gráficos** | 2 sem | Alto | Gráficos de evolução, cobertura, desempenho |
| UX-A4 | **Atalhos de teclado customizáveis** | 1 sem | Médio | UI para rebind de todos os atalhos |
| UX-A5 | **Histórico de comandos CLI** | 1 sem | Médio | `ai-devkit history` + recent commands |
| UX-A6 | **Notificações desktop nativas** | 1 sem | Médio | Notification API para eventos críticos |
| UX-A7 | **Tema claro escuro automático** | 2d | Médio | Seguir preferência do sistema OS |
| UX-A8 | **Exportação de relatórios (PDF/HTML)** | 1 sem | Médio | Dashboard, auditoria, scorecard |

---

## 4. Recomendações Detalhadas

### 4.1 Melhoria: Sistema de Notificações Unificado

**Problema:** Notificações são inconsistentes — algumas via toast, outras via console, outras silenciosas.

**Solução:**
```
IDEIA Unified Notification System
├── Toast (web UI) — operações normais (salvar, criar, deletar)
│   ├── Sucesso: verde, auto-dismiss 3s
│   ├── Aviso: amarelo, auto-dismiss 5s
│   └── Erro: vermelho, permanece até dismiss manual
│
├── Banner (web UI) — mudanças de estado importantes
│   ├── Autonomia mudou: "Modo alterado para Autonomous"
│   ├── Auto-fix aplicado: "LICENSE criado automaticamente [Undo]"
│   └── Perigo detectado: "⚠️ 3 decisões bloqueadas por política"
│
├── Badge (web UI + VS Code) — contagens e alertas
│   ├── Decisões pendentes: badge numerado no painel
│   ├── Violações: badge no ícone de segurança
│   └── Auto-fixes: badge no ícone de iniciativa
│
├── Desktop (Electron + Web) — eventos críticos
│   ├── Notification API do browser
│   ├── Notification API do Electron
│   └── Configurável por severidade
│
├── Webhook (integração externa) — eventos de equipe
│   ├── Slack: evento crítico
│   ├── Email: relatório diário
│   └── Custom: qualquer webhook
│
└── CLI (terminal) — feedback de comandos
    ├── ✅ Sucesso: mensagem verde com sumário
    ├── ⚠️ Aviso: mensagem amarela com ação sugerida
    └── ❌ Erro: mensagem vermelha com diagnóstico + next step
```

### 4.2 Melhoria: Sistema de Ajuda Contextual

**Problema:** Usuário não sabe o que cada parte da IDEIA faz ou como usar.

**Solução:**
```
F1 / Ctrl+Shift+H → Ajuda Contextual
├── Abre painel de ajuda baseado no contexto ATUAL
│   ├── Se no editor: ajuda sobre LSP, Monaco, atalhos
│   ├── Se no terminal: ajuda sobre comandos, PTY
│   ├── Se no chat: ajuda sobre comandos de IA
│   └── Se no dashboard: ajuda sobre métricas
│
├── Conteúdo:
│   ├── Descrição do componente atual
│   ├── Atalhos de teclado relevantes
│   ├── "Como fazer X" (exemplos)
│   └── Link para documentação completa
│
└── Integração com GLOSSARIO-IDEIA.md
    ├── Hover em termos técnicos → tooltip com definição
    └── Click → abre entrada do glossário
```

### 4.3 Melhoria: Shortcut Discovery

**Problema:** Usuários não descobrem atalhos de teclado.

**Solução:**
```
Ao pressionar Ctrl (ou Cmd) por 2 segundos:
  → Overlay "Cheatsheet" mostra todos os atalhos disponíveis
  → Agrupados por contexto (editor, terminal, global)
  → Busca por nome/ação
  → "Customizar atalhos" → abre Settings

Ao realizar uma ação com mouse 3× seguidas:
  → Toast: "Dica: você pode usar Ctrl+S para salvar"
  → Não repetir para o mesmo atalho
```

### 4.4 Melhoria: Estado Vazio Inteligente

**Problema:** Estados vazios são apenas texto sem ação.

**Solução:**
```
"Selecione um arquivo no Explorer à esquerda para começar a editar."
  → [Abrir arquivo recente] [Criar novo arquivo] [Explorar workspace]

"Nenhuma decisão pendente."
  → [Ver histórico] [Ajustar nível de autonomia] [OK, obrigado]

"Nenhuma tarefa registrada."
  → [Criar primeira tarefa] [Importar do backlog] [Saber mais sobre tasks]

Nenhum problema detectado.
  → [Rodar verificação completa] [Ajustar thresholds] ✅
```

### 4.5 Melhoria: Performance Percebida

**Problema:** Operações parecem lentas sem feedback visual.

**Solução:**
```
Operação < 100ms: sem feedback (instantâneo)
Operação 100ms-1s: cursor loading + skeleton do resultado
Operação 1s-5s: spinner + mensagem descritiva
Operação > 5s: barra de progresso + ETA estimado + botão cancelar

Exemplos:
  ├── "Verificando código fonte..." ──▓▓▓▓▓░░░░░── 60%
  ├── "Aplicando auto-fix #3 de 7..." ──▓▓▓░░░░░░── 35%
  └── "Escaneando dependências..." ──▓▓▓▓▓▓▓▓░░── 80%
```

---

## 5. Métricas de Experiência do Usuário

| Métrica | Como medir | Alvo | Prioridade |
|---------|-----------|------|------------|
| **Task Success Rate** | % de tarefas concluídas sem erro | > 95% | Alta |
| **Time to First Value** | Tempo do primeiro `ai-devkit init` até primeira ação útil | < 2min | Alta |
| **Error Recovery Rate** | % de erros que o usuário consegue resolver sozinho | > 80% | Alta |
| **Shortcut Usage** | % de ações via teclado vs mouse | > 40% | Média |
| **Feature Discovery** | % de features usadas após 1 semana | > 60% | Média |
| **NPS (Net Promoter Score)** | Pesquisa "Recomendaria a IDEIA?" | > 50 | Alta |
| **SUS (System Usability Scale)** | Questionário SUS padronizado | > 80 | Alta |
| **CES (Customer Effort Score)** | "Foi fácil fazer o que queria?" | < 3 (fácil) | Alta |
| **Onboarding Completion** | % que completa o wizard | > 90% | Média |
| **Churn Rate** | % que não usa após 7 dias | < 20% | Alta |

---

## 6. Tasks Geradas

| Task | Descrição | Esforço | Fase |
|------|-----------|---------|------|
| UX-01 | Sistema de notificações unificado (toast + banner + badge + desktop) | 3 sem | 3 |
| UX-02 | Ajuda contextual (F1/Ctrl+Shift+H) integrada com glossário | 2 sem | 3 |
| UX-03 | Shortcut discovery (cheatsheet overlay + dicas inteligentes) | 2 sem | 3 |
| UX-04 | Estados vazios inteligentes com ações sugeridas | 1 sem | 2 |
| UX-05 | Skeleton loading em todos os componentes | 1 sem | 1 |
| UX-06 | Auto-save + undo/redo para FileExplorer | 1 sem | 2 |
| UX-07 | Config visual completa (não JSON) | 2 sem | 3 |
| UX-08 | Dashboard com gráficos interativos | 2 sem | 3 |
| UX-09 | Terminal scrollback search + split panes | 1 sem | 2 |
| UX-10 | Streaming chat cancelável + histórico persistente | 1 sem | 2 |
| UX-11 | Editor JSON schema-aware para config | 2 sem | 2 |
| UX-12 | CLI progresso + dry-run + tab completion | 1 sem | 1 |
| UX-13 | Performance percebida (spinner → barra → ETA) | 1 sem | 2 |
| UX-14 | Atalhos de teclado customizáveis | 1 sem | 3 |
| UX-15 | Coachmarks contextuais pós-onboarding | 2 sem | 3 |

---

---

## 7. Intensificação — Detalhamento Técnico

### 7.1 Risco Detalhado por Melhoria

| Melhoria | Risco Técnico | Risco de UX | Mitigação |
|----------|--------------|-------------|-----------|
| Notificações unificadas | Fragmentação de canais | Usuário ignorar notificações | Configurável por severidade; canal default = desktop |
| Ajuda contextual (F1) | Conteúdo desatualizado | Ajuda irrelevante | Conteúdo gerado dos próprios estudos; atualização automática |
| Shortcut discovery | Conflito com atalhos do SO | Overlay intrusivo | Detecta atalho do SO; mostra apenas 1× por sessão |
| Estados vazios | Link quebrado para ação | Frustração | Links geram comandos reais; fallback para "saber mais" |
| Skeleton loading | Layout shift | Pior que "Carregando..." | Skeleton com dimensões exatas do conteúdo final |

### 7.2 Métricas de Sucesso Detalhadas

| Métrica | Como Medir | Atual | Alvo | Prazo |
|---------|-----------|-------|------|-------|
| **Task Success Rate** | `sucessos / total` | ~75% (estimado) | > 95% | Fase 3 |
| **Time to First Value** | `init` até primeira ação útil | ~5min | < 2min | Fase 1 |
| **Error Recovery Rate** | erros resolvidos sem help | ~50% | > 80% | Fase 2 |
| **Shortcut Adoption** | ações via teclado / total | ~20% | > 40% | Fase 3 |
| **Feature Discovery** | features únicas / semana | ~30% | > 60% | Fase 3 |
| **Onboarding Completion** | completam wizard / iniciam | ~70% | > 90% | Fase 1 |
| **Churn (7d)** | não usam após 7 dias | ~40% | < 20% | Fase 2 |

### 7.3 Timeline Detalhada

| Mês | Fase | Entregas | Marcos |
|-----|------|----------|--------|
| Mês 1 | Fase 1 — Quick Wins | Skeleton loading, `.catch {}` fix, tooltips, `--dry-run`, tab completion | UX-05, UX-12, UX-Q1/Q3 |
| Mês 2 | Fase 2 — Core | Auto-save, undo/redo, terminal search, chat cancelável, estados vazios, editor JSON | UX-04, UX-06, UX-09, UX-10, UX-11, UX-13 |
| Mês 3 | Fase 3 — Avançada | Notificações, ajuda F1, shortcut discovery, config visual, dashboard, coachmarks | UX-01, UX-02, UX-03, UX-07, UX-08, UX-14, UX-15 |

### 7.4 Plano de Testes por Componente

| Componente | Testes Unitários | Testes de Integração | Testes E2E |
|-----------|-----------------|---------------------|------------|
| **Sistema de Notificações** | Cada canal (toast, banner, badge, desktop) emite evento correto | Múltiplos canais recebem mesmo evento simultaneamente | Notificação aparece no web UI, desktop e Slack |
| **Ajuda Contextual (F1)** | Conteúdo correto para cada contexto (editor, terminal, chat) | F1 abre painel + conteúdo carregado do glossário | F1 → painel com informação relevante |
| **Shortcut Discovery** | Timer de 2s → overlay; 3× clique → dica | Dica não repete para mesmo atalho | Ctrl+S → dica na 3ª vez |
| **Estados Vazios** | Renderiza com links de ação válidos | Link gera comando CLI real | Click → executa ação |
| **Skeleton Loading** | Esqueleto com dimensões do conteúdo final | Transição skeleton → conteúdo sem layout shift | Loading → skeleton → conteúdo |
| **Auto-save** | Timer 2s → save; save em background | Múltiplos saves concorrentes | Edita → espera 2s → arquivo salvo |
| **Undo/Redo** | Pilha de operações; undo desfaz corretamente | Undo após save → rollback no fs | Delete → undo → arquivo restaurado |

### 7.5 Conexões com Estudos (Intensificadas)

| Estudo | Como a UX se conecta |
|--------|---------------------|
| **S24 — Controle** | Notificações de segurança (`control.emergency.*`) usam o sistema de notificações unificado |
| **S25 — Perfis** | Perfil de usuário define: nível de notificação, tema, atalhos, coachmarks ativas |
| **S23 — Auto-Evolução** | Self-Panel usa os mesmos componentes de dashboard e notificações |
| **T1 — Topologia** | UI components como consumidores finais dos contratos C1-C18 |
| **E4 — UX (original)** | Este estudo INTENSIFICA o E4 original com foco em implementação prática |
| **S12 — Testes** | Plano de testes deste estudo segue as definições do S12 |

---

## Documentos Gerados

- [x] Estudo UX intensificado: `docs/ESTUDOS/ESTUDO-MELHORIA-USABILIDADE-EXPERIENCIA-USUARIO.md`
- [x] Seção 7: Intensificação (riscos, métricas, timeline, testes, cross-refs)
- [x] Tasks: UX-01 a UX-15 (3 fases) + TASK-IDEIA-801 a 815
- [x] Conexões: S24, S25, S23, T1, E4, S12

---