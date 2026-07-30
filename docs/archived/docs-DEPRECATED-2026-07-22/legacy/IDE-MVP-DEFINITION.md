# Definição do MVP — IDE com Chat do ai-devkit

> **Data:** 2026-07-13
> **Propósito:** Definir o Produto Mínimo Viável (MVP) da IDE híbrida com chat, classificando cada
> funcionalidade em obrigatório, desejável, opcional ou depois.
> **Base:** Análise de 98 recursos existentes + 110 lacunas identificadas em 13 blocos.

---

## Sumário

1. [Critérios de Decisão](#1-critérios-de-decisão)
2. [Classificação por Bloco](#2-classificação-por-bloco)
3. [Menor Produto Útil](#3-menor-produto-útil)
4. [Primeiro Fluxo de Uso Real](#4-primeiro-fluxo-de-uso-real)
5. [Dependências Críticas Antes do MVP](#5-dependências-críticas-antes-do-mvp)
6. [O Que Fica de Fora do MVP](#6-o-que-fica-de-fora-do-mvp-e-por-quê)
7. [Arquitetura do MVP](#7-arquitetura-do-mvp)
8. [Checklist de Prontidão](#8-checklist-de-prontidão)
9. [Estimativa de Esforço do MVP](#9-estimativa-de-esforço-do-mvp)
10. [Riscos do MVP](#10-riscos-do-mvp)

---

## 1. Critérios de Decisão

Cada funcionalidade foi classificada com base em 4 critérios:

| Critério | Peso | Pergunta |
|----------|------|----------|
| **Valor percebido** | Alto | O usuário sente falta se não tiver? |
| **Diferenciação** | Alto | Isso faz a IDE ser melhor que Cursor/Windsurf? |
| **Esforço** | Médio | Quantos dias para implementar? |
| **Dependência** | Médio | Outras features dependem disso? |

### Categorias

| Categoria | Significado | Timeline |
|-----------|-------------|----------|
| **🥇 Obrigatório (MVP)** | Sem isso o produto não entrega valor | Semana 1-4 |
| **🥈 Desejável (v1.1)** | Aumenta significativamente a produtividade | Semana 5-8 |
| **🥉 Opcional (v1.2)** | Diferenciais competitivos, não críticos | Semana 9-16 |
| **📅 Depois (v2+)** | Enterprise / escala | Semana 17+ |

---

## 2. Classificação por Bloco

### 2.1 Chat Central

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Streaming de respostas (SSE token-by-token) | 🥇 Obrigatório | Sem isso, não é chat — é formulário web. Tabela-stakes | Média |
| Markdown rendering no chat | 🥇 Obrigatório | 90% das respostas da IA contêm markdown (listas, código, tabelas) | Média |
| Code block rendering com syntax highlight + copiar | 🥇 Obrigatório | Essencial para código gerado/explicado | Baixa |
| Envio de mensagem (input + send) | 🥇 Obrigatório | Funcionalidade mais básica do chat | Baixa |
| Conexão com pelo menos 1 provider (Ollama) | 🥇 Obrigatório | Precisa funcionar offline, sem chave de API | Média |
| Conversação contínua (histórico de mensagens) | 🥇 Obrigatório | Sem isso, cada pergunta é isolada | Média |
| Parar geração (stop button) | 🥇 Obrigatório | Sem isso, usuário fica refém de respostas longas | Baixa |
| Indicador de "digitando" / streaming visual | 🥇 Obrigatório | Feedback de que a IA está processando | Baixa |
| Persistência de conversas (entre sessões) | 🥈 Desejável | Perde histórico ao fechar, mas MVP sobrevive | Média |
| Context pinning (quais arquivos estão no contexto) | 🥈 Desejável | Aumenta precisão, mas chat funciona sem | Média |
| Seleção de modelo (Ollama vs OpenAI) | 🥈 Desejável | Útil para power users, não para MVP | Baixa |
| @-mentions para arquivos | 🥉 Opcional | Conveniência, não essencial | Média |
| Slash commands | 🥉 Opcional | Power feature | Média |
| Temperature / parâmetros do modelo | 🥉 Opcional | Power feature | Baixa |
| Histórico de conversas com busca | 📅 Depois | Pode vir após MVP validado | Alta |
| Exportar conversa | 📅 Depois | Não crítico | Baixa |
| Multimodal (imagens) | 📅 Depois | Requer provider específico | Alta |
| Conexão com Anthropic / Google / AWS | 📅 Depois | Um provider no MVP é suficiente | Média |

**Decisão: Chat é o coração do MVP. Precisa de streaming + markdown + 1 provider.**

---

### 2.2 Editor de Código

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Syntax highlighting (Monaco) | 🥇 Obrigatório | Já existe — 20 linguagens configuradas | Zero |
| Abrir arquivo da árvore no editor | 🥇 Obrigatório | Já existe — EditorTabs + FileExplorer integrados | Zero |
| Editar e salvar arquivo (Ctrl+S) | 🥇 Obrigatório | Já existe — dirty state + API write | Zero |
| Minimap | 🥇 Obrigatório | Já existe — configurado em EditorMode.tsx | Zero |
| Code folding | 🥇 Obrigatório | Já existe — Monaco default | Zero |
| Quick Open (Ctrl+P) | 🥈 Desejável | Navegação muito mais rápida | Média |
| Status bar (linha:coluna, linguagem) | 🥈 Desejável | Feedback visual importante | Média |
| Search across workspace (Ctrl+Shift+F) | 🥈 Desejável | Produtividade, mas dá para viver sem no MVP | Alta |
| Autosave | 🥈 Desejável | Evita perda de trabalho | Baixa |
| Problem pane (erros do Monaco) | 🥈 Desejável | Feedback de qualidade de código | Média |
| Breadcrumbs | 🥉 Opcional | Navegação avançada | Média |
| Format on save (Prettier) | 🥉 Opcional | Qualidade de código, não bloqueante | Média |
| Git integration (decorations, stage, commit) | 🥉 Opcional | MVP não precisa de git integrado | Alta |
| Split panes | 📅 Depois | Multi-tarefa avançado | Alta |
| Inlay hints | 📅 Depois | TypeScript hints | Média |
| Code lens | 📅 Depois | Ações inline | Média |
| Large file handling | 📅 Depois | Edge case | Média |
| Language workers adicionais (Python, Go, Rust) | 📅 Depois | 20 linguagens no MVP é suficiente | Média |

**Decisão: Editor já está 80% pronto para o MVP. Foco em Quick Open + Status Bar como desejáveis.**

---

### 2.3 Árvore de Arquivos

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Navegação por tree view (já existe) | 🥇 Obrigatório | Já existe — lazy loading, indentação | Zero |
| Abrir arquivo na árvore (já existe) | 🥇 Obrigatório | Já existe — onOpenFile → EditorMode | Zero |
| Criar novo arquivo | 🥇 Obrigatório | Sem isso, editor é só leitura | Baixa |
| Renomear arquivo | 🥇 Obrigatório | Operação básica de FS | Baixa |
| Excluir arquivo | 🥇 Obrigatório | Operação básica de FS | Baixa |
| Criar nova pasta | 🥇 Obrigatório | Organização de projeto | Baixa |
| File watcher (auto-refresh ao criar/excluir externamente) | 🥇 Obrigatório | Sem isso, explorer fica dessincronizado | Média |
| Context menu (right-click) | 🥇 Obrigatório | Sem isso, CRUD não tem usabilidade | Média |
| File icons por extensão (.ts, .py, .js, .json, etc.) | 🥈 Desejável | Melhora reconhecimento visual | Baixa |
| Git decorations (M, A, D, ?) | 🥈 Desejável | Status visual do arquivo | Média |
| Reveal in explorer (do editor para árvore) | 🥈 Desejável | Navegação bidirecional | Baixa |
| Drag & drop | 🥉 Opcional | Power feature | Alta |
| Multi-select | 🥉 Opcional | Operaçẽes em lote | Média |
| Collapsible state persistence | 🥉 Opcional | Lembrar nós expandidos | Baixa |
| Virtual scroll (>1000 arquivos) | 📅 Depois | Edge case para MVP | Média |

**Decisão: CRUD + Context Menu + File Watcher são obrigatórios. Sem eles, a árvore é só vitrine.**

---

### 2.4 Terminal Embutido

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Executar comando e ver output | 🥇 Obrigatório | Já existe — POST /api/shell | Zero |
| Auto-scroll em novo output | 🥇 Obrigatório | Já existe | Zero |
| Input de comando com Enter | 🥇 Obrigatório | Já existe | Zero |
| ANSI escape sequence handling | 🥇 Obrigatório | Sem isso, `npm run build` mostra escapes raw | Alta |
| xterm.js (terminal real com VT100) | 🥇 Obrigatório | Substitui div por terminal emulado | Alta |
| Ctrl+C / kill processo | 🥇 Obrigatório | Sem isso, comando infinito trava a IDE | Média |
| Command history (ArrowUp/ArrowDown) | 🥈 Desejável | Produtividade no terminal | Baixa |
| Persistent shell (node-pty, mesma sessão) | 🥈 Desejável | Melhor experiência (cd, env vars) | Alta |
| Clear terminal | 🥈 Desejável | Higiene básica | Baixa |
| Exit code display | 🥈 Desejável | Feedback se comando falhou | Baixa |
| Output truncation (limite de linhas) | 🥈 Desejável | Evita memory leak | Baixa |
| Multi-tab terminals | 🥉 Opcional | Power feature | Média |
| Working directory display no prompt | 🥉 Opcional | Contexto visual | Baixa |
| Output search | 📅 Depois | Conforto | Média |

**Decisão: Terminal atual é funcional mas frágil. ANSI + xterm.js + Ctrl+C são obrigatórios para um MVP usável. Sem ANSI, o terminal é inútil para dev.**

---

### 2.5 Diffs/Patches

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Monaco DiffEditor (side-by-side) | 🥇 Obrigatório | Já existe | Zero |
| Color-coded chunks (+ verde / - vermelho) | 🥇 Obrigatório | Já existe | Zero |
| Approve/Reject por arquivo | 🥇 Obrigatório | Já existe — PatchPreview.tsx | Zero |
| Risk colors (low→critical) | 🥇 Obrigatório | Já existe | Zero |
| Approve All / Reject All | 🥇 Obrigatório | Já existe | Zero |
| Reason dialog ao rejeitar | 🥇 Obrigatório | Já existe | Zero |
| Word-level diff (mudanças intra-linha) | 🥈 Desejável | Precisão visual | Baixa |
| Diff navigation (next/prev change) | 🥈 Desejável | Navegação | Baixa |
| Inline ↔ side-by-side toggle | 🥈 Desejável | Preferência do usuário | Baixa |
| Ignore whitespace toggle | 🥉 Opcional | Foco em mudanças relevantes | Baixa |
| Collapse/expand chunks | 🥉 Opcional | Organização | Baixa |
| Inline editing in diff | 📅 Depois | Modo avançado | Média |
| Comment/annotation system | 📅 Depois | Code review | Alta |

**Decisão: Diff está 90% pronto para o MVP. Word-level + navigation são diferenciais de baixo esforço.**

---

### 2.6 Execução de Tarefas

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Task Planner + Runner (backend) | 🥇 Obrigatório | Já existe — task-run.ts, engineer.ts | Zero |
| Model Router (rota tarefa → melhor modelo) | 🥇 Obrigatório | Já existe | Zero |
| Comando "execute esta tarefa" via chat | 🥇 Obrigatório | Usuário fala "roda os testes" e a IA executa | Média |
| Progresso visível da tarefa (status, etapa atual) | 🥇 Obrigatório | Feedback de execução | Média |
| Logs da tarefa (output parcial) | 🥇 Obrigatório | Ver o que está acontecendo | Média |
| Cancelar tarefa em execução | 🥇 Obrigatório | Controle do usuário | Média |
| Visual pipeline builder (ReactFlow) | 🥈 Desejável | Já existe mas não conectado ao runner | Média |
| Task detail view (logs completos, erros) | 🥈 Desejável | Diagnóstico pós-execução | Média |
| Retry tarefa falha | 🥈 Desejável | Correção rápida | Baixa |
| Engineer pipeline (plan→implement→test→fix→review) | 🥈 Desejável | Já existe no CLI, precisa de UI | Alta |
| Task search/filter | 🥉 Opcional | Organização | Média |
| Drag-sort task reordering | 🥉 Opcional | Power feature | Média |
| ETA / estimated time remaining | 📅 Depois | Baseado em histórico | Média |

**Decisão: Execução de tarefas é um dos maiores diferenciais da IDE. MVP precisa do loop "chat pede → IA executa → usuário vê progresso → resultados".**

---

### 2.7 Aprovações

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Approve/Reject via UI | 🥇 Obrigatório | Já existe — PatchPreview.tsx | Zero |
| Reason dialog ao rejeitar | 🥇 Obrigatório | Já existe | Zero |
| Audit trail (quem aprovou/rejeitou quando) | 🥇 Obrigatório | Já existe — DecisionHistory.tsx | Zero |
| Agent Security (bloqueio de ações perigosas) | 🥇 Obrigatório | Já existe — agent-security.ts | Zero |
| Quality Gate (verificação antes de aprovar) | 🥈 Desejável | Garantia de qualidade | Média |
| Undo approve/reject | 🥈 Desejável | Correção de erro | Baixa |
| Filter decisions (por data, arquivo, resultado) | 🥈 Desejável | Navegação no histórico | Baixa |
| Pagination for large history | 🥈 Desejável | Performance | Baixa |
| Export history | 🥉 Opcional | Documentação | Baixa |

**Decisão: Aprovações estão 95% prontas. MVP pode entregar como está.**

---

### 2.8 Memória

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Memory Store (backend) | 🥇 Obrigatório | Já existe — memory-store.ts | Zero |
| Pattern Detector (backend) | 🥇 Obrigatório | Já existe — pattern-detector.ts | Zero |
| Learning Engine (backend) | 🥇 Obrigatório | Já existe — learning-engine.ts | Zero |
| Memória alimenta contexto do chat automaticamente | 🥇 Obrigatório | IA lembra de decisões anteriores | Média |
| Knowledge Base (backend) | 🥈 Desejável | Já existe — knowledge-types.ts | Zero |
| Memory viewer/editor UI | 🥈 Desejável | Ver o que a IA "lembra" | Média |
| Knowledge browser UI | 🥉 Opcional | Navegar por conhecimento acumulado | Média |
| Pattern visualization | 🥉 Opcional | Ver padrões identificados | Média |
| Memory cleanup/compaction UI | 📅 Depois | Manutenção | Baixa |

**Decisão: Memória no MVP = contexto automático para o chat. A IA deve "lembrar" do que foi feito antes sem o usuário precisar repetir. Sem UI de visualização.**

---

### 2.9 Explicação de Decisões

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Cognitive Coprocessor (backend) | 🥇 Obrigatório | Já existe | Zero |
| Chat explica "por que esta mudança?" | 🥇 Obrigatório | Usuário pergunta e IA explica | Baixa |
| Riscos calculados visíveis no diff | 🥇 Obrigatório | Já existe — PatchPreview risk colors | Zero |
| Impact analysis (quais arquivos/linhas afetados) | 🥇 Obrigatório | Já existe — FileChange com risk, quality, impact | Zero |
| "Explain this code" no editor | 🥈 Desejável | Botão contextual de explicação | Média |
| Sugestão de 3 opções (3+1) | 🥈 Desejável | IA oferece alternativas | Média |
| Violation explanation (por que isso viola regras?) | 🥉 Opcional | Deep governance | Média |

**Decisão: Explicação de decisões está 80% pronta (coprocessor + risks + impacts). MVP usa o chat para "explique isso" + os riscos no diff.**

---

### 2.10 Documentação Viva

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Snapshot de estado (backend) | 🥇 Obrigatório | Já existe — snapshot.ts | Zero |
| Gerar documentação via chat ("docs esta função") | 🥈 Desejável | Chat pode gerar JSDoc/docstrings | Média |
| Project skeleton generator | 🥈 Desejável | Já existe no CLI | Média |
| Gerar CHANGELOG automaticamente | 🥉 Opcional | Baseado em git log + atividades | Média |
| Gerar ADRs a partir de decisões | 🥉 Opcional | Architecture Decision Records | Média |
| Auto-documentação de endpoints (OpenAPI) | 📅 Depois | Requer análise de código | Alta |
| Wiki automática do projeto | 📅 Depois | Compilação de múltiplas fontes | Alta |

**Decisão: Documentação viva é desejável pós-MVP. Snapshot já existe e pode ser usado. Chat pode gerar docs sob demanda.**

---

### 2.11 Multiagente

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Agent Registry + Definitions (backend) | 🥇 Obrigatório | Já existe | Zero |
| Agent Security (backend) | 🥇 Obrigatório | Já existe | Zero |
| Agent Collaboration (backend) | 🥇 Obrigatório | Já existe — collaboration.ts | Zero |
| Chat single-agent (usuário ↔ 1 IA) | 🥇 Obrigatório | MVP é single-agent | Média |
| Chat multi-agent (usuário ↔ N IAs colaborando) | 📅 Depois | Complexo, confuso para MVP | Alta |
| Agent status panel (quem está fazendo o quê) | 📅 Depois | Monitoramento de agentes | Média |
| Multi-agent conversation viewer | 📅 Depois | Visualização de diálogo entre agentes | Alta |

**Decisão: MVP usa single-agent exclusivamente. Todo o backend multiagente existe, mas a UX single-agent precisa ser construída primeiro.**

---

### 2.12 Timeline e Dashboards

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Dashboard com stats básicos | 🥇 Obrigatório | Já existe — DashboardMode.tsx | Zero |
| TimelineDashboard | 🥈 Desejável | Já existe mas com SAMPLE_DATA | Média |
| Live updates (WebSocket) | 🥈 Desejável | Ver progresso em tempo real | Média |
| Task detail on click | 🥈 Desejável | Diagnóstico | Média |
| Search/filter tasks | 🥉 Opcional | Organização | Média |
| Charts / gráficos de desempenho | 📅 Depois | Analytics | Alta |
| Relatórios de maturidade do projeto | 📅 Depois | Scorecard 0-100 | Média |

**Decisão: Dashboard já existe e funciona. MVP precisa substituir SAMPLE_DATA por dados reais. Timeline é desejável mas não crítico.**

---

### 2.13 Previsão de Risco

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Risk colors no diff (já existe) | 🥇 Obrigatório | Já existe | Zero |
| Drift detection (backend) | 🥈 Desejável | Já existe | Média |
| Security barrier check (backend) | 🥈 Desejável | Já existe | Média |
| "Esta mudança pode quebrar X" — previsão no chat | 🥈 Desejável | IA analisa impacto | Média |
| Scorecard de maturidade (0-100) | 🥉 Opcional | Já existe no CLI | Média |
| Previsão de prazo/baseado em histórico | 📅 Depois | Requer machine learning | Alta |

**Decisão: Risk colors no diff + chat analisando impacto = MVP. O resto é incremental.**

---

### 2.14 Gestão de Projetos

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Single project (abrir 1 projeto por vez) | 🥇 Obrigatório | MVP é single-project | Zero |
| Project init wizard | 🥈 Desejável | Já existe no CLI | Média |
| Stack detection automática | 🥈 Desejável | Já existe no CLI | Média |
| Recent projects list | 🥈 Desejável | Conveniência | Baixa |
| Global user settings (tema, fontes, providers) | 🥈 Desejável | Personalização | Média |
| Project browser/selector | 🥉 Opcional | Navegação entre projetos | Média |
| Project switching (sem fechar) | 🥉 Opcional | Multi-projeto básico | Média |
| Multi-root workspace (N projetos simultâneos) | 📅 Depois | Enterprise | Alta |
| Unified .aiignore | 📅 Depois | Consistência | Média |

**Decisão: MVP é single-project. Recent projects + global settings são desejáveis para a experiência.**

---

### 2.15 Scaffolds/Geradores

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| CRUD generator via chat ("cria CRUD de Usuário") | 🥈 Desejável | Já existe no CLI | Média |
| Init project via chat ("inicia um projeto NestJS") | 🥈 Desejável | Já existe no CLI | Média |
| Domain model generator via chat | 🥉 Opcional | Já existe no CLI | Média |
| UseCase generator via chat | 🥉 Opcional | Já existe no CLI | Média |
| Test matrix / acceptance generator | 🥉 Opcional | Já existe no CLI | Média |
| Feature blueprint generator | 📅 Depois | Já existe no CLI | Média |

**Decisão: Scaffolds existem no CLI. MVP pode expor via chat ("cria um CRUD de Usuário"). Diferencial contra Cursor/Copilot.**

---

### 2.16 Execução Ponta a Ponta

| Funcionalidade | Classificação | Justificativa | Esforço |
|----------------|---------------|---------------|---------|
| Engineer pipeline (backend) | 🥇 Obrigatório | Já existe — engineer.ts | Zero |
| Chat → planejar → implementar → testar → revisar | 🥇 Obrigatório | O fluxo principal do MVP | Alta |
| Checkpoints com aprovação humana | 🥇 Obrigatório | Já existe — agent-runtime.ts | Média |
| Relatório de conclusão (o que foi feito) | 🥇 Obrigatório | Já existe — snapshot.ts | Média |
| Fallback: se algo falha, IA tenta corrigir | 🥇 Obrigatório | Já existe — self-heal.js | Média |
| Execução autônoma completa sem supervisão | 📅 Depois | Autonomous cycles | Alta |

**Decisão: O fluxo ponta a ponta é a RAZÃO DE SER da IDE. MVP precisa entregar "peço → IA faz → reviso → aprovo → testa → relata".**

---

## 3. Menor Produto Útil

### Definição

O MVP é o menor produto que um desenvolvedor pode usar para **pedir uma mudança em linguagem natural,
ver o que será feito, aprovar, e ver o resultado — tudo sem sair da IDE**.

### O Que Entra

```
┌─────────────────────────────────────────────────────────────────────┐
│                        IDE MVP — 13 Features                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🥇 OBRIGATÓRIO (13)                                                │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  CHAT          │  EDITOR        │  ARQUIVOS     │ TERMINAL  │    │
│  │                │                │               │           │    │
│  │ • Streaming    │ • Monaco       │ • Tree view   │ • xterm   │    │
│  │ • Markdown     │ • 20 langs     │ • CRUD files  │ • ANSI    │    │
│  │ • Code blocks  │ • Abas         │ • Context mnu │ • Ctrl+C  │    │
│  │ • Ollama       │ • Ctrl+S       │ • File watch  │ • Auto-sc │    │
│  │ • Stop btn     │ • Minimap      │               │           │    │
│  │ • Histórico    │ • Code folding │               │           │    │
│  └────────────────┴────────────────┴───────────────┴───────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  DIFF/TASK     │  APROVAÇÕES   │  MEMÓRIA      │ RISCO     │    │
│  │                │               │               │           │    │
│  │ • DiffEditor   │ • Approve/Rej │ • Context     │ • Risk    │    │
│  │ • Approve All  │ • Audit trail │   automático  │   colors  │    │
│  │ • Risk colors  │ • Security    │ • Pattern     │ • Chat    │    │
│  │ • Progress     │   bloqueios   │   detector    │   explica │    │
│  │ • Cancel       │               │               │           │    │
│  │ • Logs         │               │               │           │    │
│  └────────────────┴────────────────┴───────────────┴───────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  EXPLICAÇÃO    │  DASHBOARD    │  EXECUÇÃO PONTA A PONTA    │    │
│  │                │               │                             │    │
│  │ • "Explique"   │ • Stats       │ • Chat → plan → implement  │    │
│  │ • Impact       │   básicos     │ • → test → review          │    │
│  │ • 3 opções     │ • Conectado   │ • → approve → apply        │    │
│  │                │   a dados rea │ • → relatório              │    │
│  └────────────────┴───────────────┴─────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### O Que Fica Fora (v1.1 / v1.2 / v2+)

```
FORA DO MVP (voluntariamente excluído):

❌ Multi-agente colaborativo (v2)
❌ Multi-root workspace (v2)
❌ Plugin system (v2)
❌ Compliance mapping (v2)
❌ Rule marketplace (v2)
❌ Cryptographic attestations (v2)
❌ Split editor panes (v1.2)
❌ Git integration (v1.2)
❌ Search across workspace (v1.1)
❌ Multi-tab terminal (v1.2)
❌ Knowledge browser (v1.2)
❌ Export conversations (v1.1)
❌ Charts/graphs (v1.2)
❌ Multimodal (v2)
```

---

## 4. Primeiro Fluxo de Uso Real

### Cenário: "Adicione validação de e-mail ao cadastro de usuário"

Este é o fluxo que o MVP deve executar de ponta a ponta:

```
┌─────────────────────────────────────────────────────────────────────┐
│                  PRIMEIRO FLUXO MVP (10 passos)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PASSO 1 — ABRIR A IDE                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ "Bem-vindo ao ai-devkit IDE"                                 │    │
│  │ • Dashboard mostra: projeto atual, stack detectada,          │    │
│  │   últimos snapshots, tarefas pendentes                       │    │
│  │ • Chat já pronto no canto inferior direito                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▼                                       │
│  PASSO 2 — NAVEGAR ATÉ O ARQUIVO                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ FileExplorer → src/users/user.service.ts                     │    │
│  │ (tree com ícones, context menu, CRUD disponível)            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▼                                       │
│  PASSO 3 — ABRIR NO EDITOR                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ EditorMode mostra arquivo com syntax highlighting            │    │
│  │ (minimap, code folding, status bar com linha:coluna)        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▼                                       │
│  PASSO 4 — PEDIR NO CHAT                                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [Usuário] "Adicione validação de e-mail no cadastro          │    │
│  │            de usuário. Deve validar formato e unique."       │    │
│  │                                                              │    │
│  │ [Chat] "Analisando...                                        │    │
│  │  1. user.service.ts — validar campo email                    │    │
│  │  2. user.repository.ts — verificar unique                   │    │
│  │  3. user.dto.ts — adicionar validação decorator             │    │
│  │  Deseja que eu prossiga com este plano?"                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▼                                       │
│  PASSO 5 — CONFIRMAR PLANO                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [Usuário] "Sim, prossegue."                                  │    │
│  │                                                              │    │
│  │ [Chat] "Executando plano..."                                 │    │
│  │ • Mostra progresso: 3/3 arquivos modificados                 │    │
│  │ • "Gerando patch de alterações..."                          │    │
│  │ • "Executando testes..." (npm test no terminal)              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▼                                       │
│  PASSO 6 — REVISAR O DIFF                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ PatchPreview mostra:                                         │    │
│  │ ┌──────────────────────────────────── ┐                     │    │
│  │ │ user.service.ts  ████████░░ 80%     │ ← qualidade         │    │
│  │ │ user.dto.ts      ██████████ 95%     │                     │    │
│  │ │ user.repo.ts     ██████░░░░ 60%     │ ← risco médio       │    │
│  │ └──────────────────────────────────── ┘                     │    │
│  │ • Side-by-side diff com word-level highlights               │    │
│  │ • Risk colors visíveis                                      │    │
│  │ • Botões: Approve All / Reject All / Approve por arquivo   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▼                                       │
│  PASSO 7 — APROVAR OU PEDIR AJUSTES                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [Usuário] "O repositório precisa de validação de unique     │    │
│  │            antes de salvar. Ajusta?"                        │    │
│  │                                                              │    │
│  │ [Chat] "Ajustando..."                                       │    │
│  │ • Atualiza diff com a correção                              │    │
│  │ • "Pronto. Revisa novamente?"                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▼                                       │
│  PASSO 8 — APROVAR DEFINITIVAMENTE                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [Usuário] clica "Approve All"                                │    │
│  │ • Reason dialog: "Adicionando validação de e-mail"           │    │
│  │ • Quality Gate roda (lint → typecheck → test → build)       │    │
│  │ • Arquivos são salvos                                       │    │
│  │ • DecisionHistory registra a aprovação                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▼                                       │
│  PASSO 9 — VERIFICAR NO TERMINAL                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [Usuário] digita "npm run test" no terminal                  │    │
│  │ • xterm.js mostra output colorido                           │    │
│  │ • Testes passam (verde)                                     │    │
│  │ • Ctrl+C disponível se precisar parar                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▼                                       │
│  PASSO 10 — RELATÓRIO FINAL                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [Chat] "Alterações concluídas com sucesso:                   │    │
│  │  ✓ user.service.ts — validação de formato                   │    │
│  │  ✓ user.dto.ts — decorator @IsEmail                        │    │
│  │  ✓ user.repository.ts — validação de unique                 │    │
│  │  ✓ Testes: 12 passed, 0 failed                              │    │
│  │  ⚠ Risco: Baixo                                            │    │
│  │  Memorizado: padrão de validação aplicado."                │    │
│  │                                                              │    │
│  │ [Usuário] "Show. Agora faz o mesmo para telefone."          │    │
│  │ [Chat] (usa memória do padrão anterior) "Claro! Aplicando   │    │
│  │         o mesmo padrão de validação para telefone..."       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Dependências Críticas Antes do MVP

### 5.1 O Que Já Está Pronto (Pode Entregar Hoje)

| Item | Onde | Status |
|------|------|--------|
| Monaco Editor com 20 linguagens | `EditorMode.tsx` + `monaco.ts` | ✅ Pronto |
| File tree com lazy loading | `FileExplorer.tsx` | ✅ Pronto |
| Abas de edição com dirty state | `EditorTabs.tsx` | ✅ Pronto |
| DiffEditor side-by-side | `DiffViewer.tsx` | ✅ Pronto |
| Approve/Reject workflow | `PatchPreview.tsx` | ✅ Pronto |
| Dashboard stats cards | `DashboardMode.tsx` | ✅ Pronto |
| Provedores de IA (interface + Ollama) | `local-ai/providers/` | ✅ Pronto |
| Provider Router com fallback | `local-ai/provider-router.ts` | ✅ Pronto |
| ContextStore | `runtime/context-store.ts` | ✅ Pronto |
| MemoryStore + PatternDetector + LearningEngine | `memory/` | ✅ Pronto |
| Agent Security (bloqueios) | `runtime/agent-security.ts` | ✅ Pronto |
| Approval Flow (request/grant/deny) | `governance/approval-flow.ts` | ✅ Pronto |
| Task Planner + Runner | `planner/` + `commands/task-run.ts` | ✅ Pronto |
| Engineer Pipeline | `commands/engineer.ts` | ✅ Pronto |
| Snapshot de estado | `commands/snapshot.ts` | ✅ Pronto |
| Self-Heal | `.ai/bin/self-heal.js` | ✅ Pronto |

### 5.2 O Que Precisa Ser Construído (Pré-MVP)

| Item | Depende de | Esforço | Risco |
|------|-----------|---------|-------|
| **1. Streaming SSE Server** | Provider Router (pronto) | 3 dias | Médio |
| Servidor HTTP SSE em `packages/cli/src/local-ai/stream-server.ts`. Provider Router já tem fallchain — precisa de endpoint `text/event-stream` que chama LLM com `stream: true` e emite tokens. | | | |
| **2. Stream nos Providers** | Interface AiProvider (pronta) | 3 dias | Médio |
| Adicionar `streamQuery()` à interface. Implementar em Ollama primeiro (mais simples), depois OpenAI. | | | |
| **3. Tipos de ChatMessage** | Nada | 1 dia | Baixo |
| `ChatMessage`, `Conversation`, `ConversationStatus` — base para todo o chat. | | | |
| **4. Chat UI Component** | Tipos + SSE + Markdown | 10 dias | Alto |
| `ChatMessage.tsx`, `ChatInput.tsx`, `ConversationSidebar.tsx`. O maior esforço do MVP. | | | |
| **5. Marcdown + Code Blocks** | Chat UI | 3 dias | Baixo |
| `react-markdown` + `rehype-highlight`. Renderizar markdown com syntax highlighting. | | | |
| **6. Endpoints CRUD de Arquivos** | Server web-ui (pronto) | 2 dias | Baixo |
| `POST /api/fs/create`, `PATCH /api/fs/rename`, `DELETE /api/fs/delete`. | | | |
| **7. Context Menu na Árvore** | Endpoints CRUD | 3 dias | Médio |
| Menu right-click com New File, New Folder, Rename, Delete, Copy Path. | | | |
| **8. File Watcher** | Server web-ui | 2 dias | Médio |
| `chokidar.watch()` no server, SSE event para frontend. | | | |
| **9. xterm.js + node-pty** | Server web-ui + WebSocket | 5 dias | Alto |
| Substituir terminal div por xterm.js. Backend com node-pty + WebSocket. | | | |
| **10. ANSI + Ctrl+C** | xterm.js + node-pty | 2 dias | Médio |
| xterm.js já trata ANSI. Ctrl+C via `process.kill()` no PTY. | | | |
| **11. Endpoints de Chat** | Streaming + Tipos | 2 dias | Baixo |
| `POST /api/chat/completions` (streaming), `GET /api/conversations`, `POST /api/conversations`. | | | |
| **12. Integração Chat → Task Runner** | Chat + Task Runner | 3 dias | Alto |
| Quando usuário pede "roda os testes", chat chama task runner. Progresso via SSE. | | | |
| **13. Integração Chat → Engineer Pipeline** | Chat + Engineer | 4 dias | Alto |
| Quando usuário pede "adiciona validação", chat chama engineer pipeline. Checkpoints com aprovação. | | | |
| **14. Memory → Chat Context** | Memory + Chat | 2 dias | Médio |
| PatternDetector + MemoryStore alimentam ContextStore antes de cada pergunta. | | | |
| **15. Quick Open (Ctrl+P)** | File index | 3 dias | Médio |
| Monaco `addCommand` + endpoint de busca de arquivos. | | | |
| **16. Status Bar** | Nada | 2 dias | Baixo |
| Barra inferior: linha:coluna, linguagem, encoding. | | | |
| **17. Substituir SAMPLE_DATA** | Nada | 1 dia | Baixo |
| DashboardMode.tsx — chamar API real em vez de dados hardcoded. | | | |

### 5.3 Mapa de Dependências do MVP

```
Provedores (pronto) ──► Streaming ──► SSE Server ──► Chat UI
                                                          │
                                                          ▼
Memory (pronto) ──────► Context Store ─────────────► Chat Context
                                                          │
                                                          ▼
Task Runner (pronto) ──► Engineer Pipeline ─────────► Chat → Task
                                                          │
                                                          ▼
Monaco (pronto) ──────► DiffEditor ◄──── Patch Preview
                                                          │
                                                          ▼
Server (pronto) ──────► Endpoints CRUD ──► File Explorer (context menu)
                    ──► File Watcher ────► Auto-refresh explorer
                    ──► node-pty ────────► xterm.js terminal
```

---

## 6. O Que Fica de Fora do MVP (e Por Quê)

### Exclusões Conscientes

| Funcionalidade | Motivo | Quando |
|----------------|--------|--------|
| **Multi-agente** | Complexidade de UX: usuário comum não entende "agentes". Começar com single-agent. | v2 |
| **Multi-root workspace** | <5% dos usuários precisam. VS Code tem e 95% usa single-root. | v2 |
| **Git integration** | Pode ser feito via terminal (`git add`, `git commit`). Diferencial mas não bloqueante. | v1.2 |
| **Search across workspace** | Importante, mas MVP resolve com Ctrl+P + chat. | v1.1 |
| **Split editor panes** | Avançado. MVP com editor único é suficiente. | v1.2 |
| **Plugin system** | MVP precisa validar produto primeiro. Extensibilidade depois. | v2 |
| **Compliance mapping** | Enterprise feature. | v2 |
| **Multimodal** | Requer Anthropic/Gemini. MVP usa só texto. | v2 |
| **Conversation branching** | Edge case. MVP com histórico linear funciona. | v1.1 |
| **Multi-tab terminal** | Um terminal no MVP é suficiente. | v1.2 |
| **Charts/graphs** | Dashboard textual basta para MVP. | v1.2 |

---

## 7. Arquitetura do MVP

### Estrutura de Telas

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  HEADER: Logo | File | Edit | View | Help                │   │
│  │  + Breadcrumbs: src/users/user.service.ts               │   │
│  ├─────────────┬───────────────────────────┬────────────────┤   │
│  │             │                           │                │   │
│  │  SIDEBAR    │     EDITOR + CHAT         │  CHAT          │   │
│  │  ESQUERDA   │                           │  (painel       │   │
│  │             │  ┌─────────────────────┐  │   direito)     │   │
│  │ • File      │  │                     │  │                │   │
│  │   Explorer  │  │   Editor (Monaco)    │  │ ┌──────────┐  │   │
│  │ • Search    │  │                     │  │ │ Histórico │  │   │
│  │   (Ctrl+ShF)│  │                     │  │ │ de msg    │  │   │
│  │ • Source    │  └─────────────────────┘  │ │           │  │   │
│  │   Control   │                           │ │──────────│  │   │
│  │             │  ┌─────────────────────┐  │ │ Input     │  │   │
│  │             │  │  Terminal (xterm)    │  │ │ [______] │  │   │
│  │             │  └─────────────────────┘  │ │ [Send]   │  │   │
│  │             │                           │ └──────────┘  │   │
│  ├─────────────┴───────────────────────────┴────────────────┤   │
│  │  STATUSBAR: UTF-8 │ TypeScript │ Line 42, Col 15 │ main │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados do MVP

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Chat UI  │────►│ SSE      │────►│ Provider │
│  (React)  │     │ Server   │     │ Router   │
└──────────┘     └──────────┘     └────┬─────┘
       │                               │
       │                        ┌──────▼──────┐
       │                        │ Ollama (MVP)│
       │                        │ OpenAI     │
       │                        └─────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│              Context Builder                     │
│  (ContextStore + MemoryStore + PatternDetector)  │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│           Task / Engineer Runner                 │
│  (task-run.ts / engineer.ts)                     │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│           File System / Shell                    │
│  (IO Container + xterm.js PTY)                  │
└──────────────────────────────────────────────────┘
```

---

## 8. Checklist de Prontidão do MVP

### Funcionalidades Obrigatórias (13 itens — 100% = MVP pronto)

| # | Funcionalidade | Status | Responsável |
|---|---------------|--------|-------------|
| 1 | Chat com streaming (SSE) + Ollama | ❌ | Backend |
| 2 | Markdown rendering + code blocks no chat | ❌ | Frontend |
| 3 | Stop generation button | ❌ | Frontend |
| 4 | File CRUD (create, rename, delete) | ❌ | Fullstack |
| 5 | Context menu na árvore de arquivos | ❌ | Frontend |
| 6 | File watcher (auto-refresh explorer) | ❌ | Fullstack |
| 7 | Terminal com xterm.js + ANSI colors | ❌ | Fullstack |
| 8 | Ctrl+C no terminal (kill process) | ❌ | Fullstack |
| 9 | Chat → Task Runner (executar comandos via IA) | ❌ | Fullstack |
| 10 | Chat → Engineer Pipeline (planejar→implementar→testar) | ❌ | Fullstack |
| 11 | Diff + Approve/Reject workflow (já existe 90%) | 🟡 | Verificar integração |
| 12 | Memória alimenta contexto do chat | ❌ | Backend |
| 13 | Dashboard com dados reais (sem SAMPLE_DATA) | ❌ | Frontend |

### Funcionalidades que já existem (não precisam ser construídas)

| # | Funcionalidade | Já funciona |
|---|---------------|-------------|
| 1 | Monaco Editor com 20 linguagens | ✅ |
| 2 | Minimap + code folding | ✅ |
| 3 | Abas de edição com dirty state | ✅ |
| 4 | Ctrl+S para salvar | ✅ |
| 5 | File tree com lazy loading | ✅ |
| 6 | DiffEditor side-by-side | ✅ |
| 7 | Approve/Reject com reason dialog | ✅ |
| 8 | Risk colors no diff | ✅ |
| 9 | DecisionHistory (audit trail) | ✅ |
| 10 | Provider Router com fallback | ✅ |
| 11 | ContextStore | ✅ |
| 12 | MemoryStore + PatternDetector | ✅ |
| 13 | Agent Security (bloqueios) | ✅ |
| 14 | Task Planner + Runner | ✅ |
| 15 | Engineer Pipeline | ✅ |
| 16 | Snapshot de estado | ✅ |
| 17 | Dashboard stats cards | ✅ |
| 18 | Self-Heal | ✅ |
| 19 | Quality Gate | ✅ |
| 20 | Cognitive Coprocessor | ✅ |

### Critérios de Aceite do MVP

```
✅ Usuário consegue abrir a IDE e ver seus arquivos
✅ Usuário consegue editar e salvar arquivos
✅ Usuário consegue executar comandos no terminal
✅ Usuário consegue pedir uma mudança em linguagem natural
✅ IA analisa o código e propõe mudanças
✅ Mudanças são mostradas em diff com risco calculado
✅ Usuário aprova ou rejeita cada mudança
✅ Ao aprovar, arquivos são alterados
✅ Testes podem ser executados no terminal
✅ IA lembra do contexto da conversa anterior
✅ IA lembra de padrões aplicados (ex: como validou e-mail)
```

---

## 9. Estimativa de Esforço do MVP

### Por Funcionalidade

| Funcionalidade | Backend | Frontend | Integração | Total |
|----------------|---------|----------|------------|-------|
| Streaming SSE Server | 2d | — | 1d | **3d** |
| Stream no Ollama | 1d | — | — | **1d** |
| Stream no OpenAI | 1d | — | 1d | **2d** |
| Tipos de ChatMessage | 1d | — | — | **1d** |
| Chat UI (messages + input) | — | 5d | 2d | **7d** |
| Markdown + code blocks | — | 2d | 1d | **3d** |
| Endpoints CRUD arquivos | 1d | — | 1d | **2d** |
| Context menu na árvore | — | 2d | 1d | **3d** |
| File watcher | 1d | — | 1d | **2d** |
| xterm.js + node-pty | 2d | 3d | 1d | **6d** |
| Ctrl+C no terminal | 1d | — | — | **1d** |
| Endpoints de chat | 1d | — | 1d | **2d** |
| Chat ↔ Task Runner | 2d | 1d | 1d | **4d** |
| Chat ↔ Engineer Pipeline | 2d | 1d | 1d | **4d** |
| Memory → Chat Context | 1d | — | 1d | **2d** |
| Quick Open (Ctrl+P) | 1d | 2d | — | **3d** |
| Status Bar | — | 2d | — | **2d** |
| Substituir SAMPLE_DATA | — | 1d | — | **1d** |
| Zustand (estado global) | — | 3d | — | **3d** |
| **Totais** | **19d** | **22d** | **12d** | **~53d** |

### Por Tipo de Recurso

| Tipo | Dias | % |
|------|------|---|
| Backend (serviços, API, providers) | 19 | 36% |
| Frontend (componentes, UI, estado) | 22 | 42% |
| Integração (conectar front + back) | 12 | 22% |
| **Total** | **53** | **100%** |

### Cronograma Recomendado

```
Semana 1: Streaming (SSE + Ollama) + Tipos de Chat + Endpoints CRUD
Semana 2: Chat UI (messages + input + markdown) + Context menu
Semana 3: xterm.js + node-pty + Ctrl+C + File watcher
Semana 4: Chat ↔ Task Runner + Memory → Context + Quick Open
Semana 5: Chat ↔ Engineer Pipeline + Status Bar + Dashboard real
Semana 6: Integração final + Testes + Ajustes + Documentação
```

**Total: 6 semanas com 2 devs (1 frontend, 1 fullstack).**

---

## 10. Riscos do MVP

### Riscos Críticos (Mitigar Antes de Começar)

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| 1 | **Streaming complexo** — SSE + providers com `stream: true` nunca testado | Alta | 🔴 Crítico | Começar com Ollama (mais simples). Adicionar OpenAI depois. Testar com `curl` antes de integrar UI |
| 2 | **node-pty em Windows** — build nativo problemático | Alta | 🔴 Crítico | Dockerizar backend OU manter terminal fallback (POST /api/shell) como plano B |
| 3 | **Chat UX ruim** — sem referência de produto similar | Média | 🟡 Alto | Prototipar 3 versões do chat em 1 dia, testar com 1 usuário, escolher a melhor |
| 4 | **Engineer Pipeline sem feedback visual** — tarefa roda "no escuro" | Média | 🟡 Alto | SSE de progresso de tarefas + botão cancelar. Feedback a cada etapa |
| 5 | **Sem testes na web-ui** — todo código novo é não testado | Certeza | 🟡 Alto | Adicionar Vitest + React Testing Library desde o início para componentes novos |

### Riscos Técnicos

| # | Risco | Mitigação |
|---|-------|-----------|
| 6 | Monaco + Chat + Terminal na mesma tela — layout complexo | Usar `flexbox` com painéis redimensionáveis via CSS grid |
| 7 | Performance com muitas mensagens no chat | Virtualização de mensagens com `react-virtuoso` |
| 8 | SSR vs SPA — web-ui é SPA, o que é correto | Manter SPA para MVP |
| 9 | Estado global mal projetado | Usar Zustand com stores separadas (chat, editor, tasks, settings) |
| 10 | Bundle size grande (Monaco + ReactFlow + xterm) | Lazy loading de modos e componentes |
| 11 | Provedor de IA cai durante uso | Provider Router já tem fallback. Mostrar erro amigável e sugerir trocar |

---

> **Documento gerado em:** 2026-07-13
> **MVP definido:** 13 features obrigatórias em 6 áreas (chat, editor, arquivos, terminal, tarefas, aprovações)
> **Fora do MVP:** 22 features deliberadamente postergadas
> **Estimativa:** ~53 dias-homem / 6 semanas com 2 devs
