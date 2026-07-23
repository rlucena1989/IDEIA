# Estudo 55 — Requisitos de Implementação: Estudos 53 e 54

> **Tipo**: `implementation-requirements`  
> **Status**: `study-active`  
> **Data**: 2026-07-15  
> **Propósito**: Detalhar todos os requisitos, dependências, abordagens e riscos para cada tarefa dos Estudos 53 e 54

---

## Sumário

- [TASK-IDE-53-A: MVP Infraestrutura IDE](#task-ide-53-a-mvp-infraestrutura-ide)
- [TASK-IDE-53-B: Inteligência de Agente](#task-ide-53-b-inteligncia-de-agente)
- [TASK-IDE-53-C: Fluxo de Engenharia](#task-ide-53-c-fluxo-de-engenharia)
- [TASK-IDE-54-U9: Noção de Incerteza](#task-ide-54-u9-noo-de-incerteza)
- [TASK-IDE-54-U7: Autonomia + Rollback](#task-ide-54-u7-autonomia--rollback-garantido)
- [TASK-IDE-54-U10: Revisão Adversarial](#task-ide-54-u10-reviso-adversarial-multi-perspectiva)
- [TASK-IDE-54-U2: Memória Versionada](#task-ide-54-u2-memria-de-engenharia-versionada)
- [TASK-IDE-54-U5: Loop Engineering](#task-ide-54-u5-loop-engineering-framework)
- [TASK-IDE-54-U6: Agente Centrado no Humano](#task-ide-54-u6-agente-centrado-no-humano)
- [Gaps não priorizados (U3, U8, U11, U12, U4, U1)](#gaps-no-priorizados)

---

## TASK-IDE-53-A: MVP Infraestrutura IDE

### A2 — Terminal PTY Interativo

#### Requisitos Funcionais

1. Terminal persistente com shell real (bash/pwsh/cmd) via PTY
2. CTRL+C envia SIGINT ao processo
3. ANSI escape codes renderizados corretamente (cores, progress bars)
4. Múltiplas abas de terminal
5. Histórico de comandos com seta pra cima/baixo
6. Limite de output (buffer 1000 linhas c/ truncation)
7. WebSocket bidirecional para comunicação em tempo real

#### O que já existe

| Componente                | Arquivo                                           | Status                                                      | Aproveitamento                 |
| ------------------------- | ------------------------------------------------- | ----------------------------------------------------------- | ------------------------------ |
| Terminal UI (xterm.js)    | `web-ui/src/components/Terminal.tsx` (166 linhas) | Stub — conecta WS mas endpoint `/pty` não existe            | ❌ Requer refatoração completa |
| Terminal Bridge (backend) | `cli/src/ide/terminal-bridge.ts` (181 linhas)     | Parcial — `openPty()` tenta `require('node-pty')` mas falha | ⚠️ 50% aproveitável            |
| API Router                | `cli/src/ide/api-router.ts` (692 linhas)          | WS handler não implementado                                 | ❌ Requer novo handler         |
| api.ts (frontend)         | `web-ui/src/lib/api.ts` (152 linhas)              | `runShell()` envia POST sem approval                        | ⚠️ Precisa de endpoint WS      |

#### Dependências Novas

| Pacote             | Versão  | Função                                |               Risco                |
| ------------------ | ------- | ------------------------------------- | :--------------------------------: |
| `node-pty`         | ^1.0.0  | PTY backend (C++ addon, build nativo) | 🔴 Requer toolchain C++ no Windows |
| `@xterm/xterm`     | ^5.5.0  | Terminal emulator web (VT100)         |          🟡 Bundle ~200KB          |
| `@xterm/addon-fit` | ^0.10.0 | Auto-resize do terminal               |              🟢 Leve               |
| `ws`               | ^8.0.0  | Já existe no root                     |                 🟢                 |

#### Abordagens de Implementação

**Abordagem A (Recomendada) — PTY via WebSocket (2 sem)**

1. Adicionar `node-pty`, `@xterm/xterm`, `@xterm/addon-fit` nas deps
2. Criar `POST /api/pty/open` → retorna `{ sessionId }`
3. Upgrade WebSocket em `GET /api/pty/ws?sessionId=X`
4. Backend: `node-pty` spawna shell, pipe stdin/stdout pelo WS
5. Frontend: `Terminal.tsx` conecta WS, integra xterm.js
6. Fallback: quando WS falha, usar REST `/api/shell` (não-persistente)

**Abordagem B — REST polling (1 sem, sem PTY)**

1. Manter `spawn()` mas com `{ shell: true, stdio: 'pipe' }`
2. Polling de output a cada 500ms
3. Sem CTRL+C, sem ANSI, sem vim/htop
4. ❌ **Não recomendado** — não resolve o gap real

**Abordagem C — Docker container por sessão (4 sem)**

1. Cada sessão spawna container Docker com shell
2. Isolamento total, mas overhead enorme
3. ❌ **Não recomendado** — peso desnecessário para MVP

#### Verificação

- [ ] `node-pty` compila no Windows (testar com `npm rebuild node-pty`)
- [ ] WebSocket `/api/pty/ws` faz upgrade handshake
- [ ] CTRL+C envia SIGINT (testar: `ping localhost -t`)
- [ ] ANSI codes renderizados (testar: `npm run build` com cores)
- [ ] Múltiplas abas funcionam simultaneamente
- [ ] Fallback para REST `/api/shell` quando WS desconecta

---

### A3 — File Watcher Nativo (chokidar)

#### Requisitos Funcionais

1. Detectar criação, modificação, exclusão de arquivos em tempo real
2. Propagar eventos para a UI (WebSocket broadcast)
3. Ignorar `node_modules`, `.git`, `dist`
4. Debounce de 300ms para evitar cascata de eventos
5. Funcionar cross-platform (Windows, macOS, Linux)
6. Não bloquear o event loop

#### O que já existe

| Componente | Arquivo                                   | Status                                | Aproveitamento                          |
| ---------- | ----------------------------------------- | ------------------------------------- | --------------------------------------- |
| FileBridge | `cli/src/ide/file-bridge.ts` (219 linhas) | Watcher polling 2s com `setInterval`  | ⚠️ 40% — substituir watcher, manter API |
| API Router | `cli/src/ide/api-router.ts`               | Sem handler de broadcast de FS events | ❌ Requer novo WebSocket channel        |
| chokidar   | Root `node_modules`                       | Já presente (dep do CLI)              | 🟢 Disponível, só integrar              |

#### Abordagens

**Abordagem A (Recomendada) — chokidar + WebSocket (3-5 dias)**

1. Substituir `setInterval(scanFiles, 2000)` por `chokidar.watch(root, { ignored, persistent: true })`
2. Adicionar callback `on('add'|'change'|'unlink') → broadcast WebSocket`
3. Frontend: `FileExplorer.tsx` escuta `file/change` e atualiza árvore
4. Debounce com `lodash.debounce` ou `setTimeout` simples

#### Verificação

- [ ] chokidar detecta `touch novo-arquivo.ts` em < 1s
- [ ] `node_modules` e `.git` são ignorados
- [ ] WebSocket broadcast `file/change` é recebido pelo frontend
- [ ] Explorer atualiza sem piscar/re-render completo
- [ ] Performance: 10k+ arquivos não trava

---

### A1 — LSP Básico (TypeScript)

#### Requisitos Funcionais

1. Go-to-definition (Ctrl+Click)
2. Find references
3. Hover com tipo/documentação
4. Autocomplete de código (não só de comandos `ai:`)
5. Diagnostics inline (errors/warnings do TSC no editor)
6. No mínimo TypeScript; depois expandir para JSON, CSS, HTML

#### O que já existe

| Componente      | Arquivo                            | Status                                              |
| --------------- | ---------------------------------- | --------------------------------------------------- |
| Monaco Editor   | `EditorMode.tsx` (110 linhas)      | Syntax highlighting apenas                          |
| Monaco workers  | `web-ui/src/monaco.ts` (44 linhas) | Só TS/JS/CSS/HTML/JSON workers para syntax coloring |
| TSC diagnostics | `api-router.ts:525-573`            | `npx tsc --noEmit` via execSync (bloqueante)        |

#### Dependências Novas

| Pacote                              | Função                  |
| ----------------------------------- | ----------------------- |
| `monaco-languageclient` ^9.0.0      | Bridge Monaco ↔ LSP     |
| `typescript-language-server` ^4.0.0 | Servidor LSP TypeScript |

#### Abordagens

**Abordagem A (Recomendada) — typescript-language-server + monaco-languageclient (2-4 sem)**

1. Iniciar `typescript-language-server` como subprocesso no backend
2. Conectar via `monaco-languageclient` no frontend
3. Configurar Monaco `monaco.languages.registerCompletionItemProvider`
4. Substituir `execSync('npx tsc --noEmit')` por diagnostics via LSP push

**Abordagem B — LSP customizado (4-6 sem)**

1. Implementar servidor LSP próprio usando `vscode-languageserver` package
2. ❌ **Não recomendado** — reinventa roda, esforço muito maior

#### Verificação

- [ ] Cmd+Click em função vai para definição
- [ ] Hover mostra tipo e JSDoc
- [ ] Autocomplete sugere símbolos do projeto
- [ ] Errors do TSC aparecem como squiggly lines no editor
- [ ] Performance: projeto 100k+ linhas não trava

---

## TASK-IDE-53-B: Inteligência de Agente

### B10 — Plan Mode com Approval Flow

#### Requisitos

1. Antes de executar, agente mostra plano com steps + risco + impacto
2. Usuário vê diff preview de cada step
3. Usuário aprova/rejeita steps individualmente ou em lote
4. Histórico de decisões persistido
5. Modos: auto, ask, block (já existem no policy-engine)

#### O que já existe

| Componente       | Arquivo                                                 | Status                             |
| ---------------- | ------------------------------------------------------- | ---------------------------------- |
| Decision Center  | `runtime/decision-center.ts`                            | Formato 3+1 funcional              |
| Autonomy Policy  | `runtime/autonomy-policy.ts` (263 linhas)               | Risk score, auto-execute threshold |
| Approval Flow    | `governance/approval-flow.ts` (28 linhas)               | **Stub** — sem persistência        |
| Agent Runtime    | `agent-runtime/src/agent-runtime.ts` (103 linhas)       | **Stub** — planos hardcoded        |
| Patch Preview    | `web-ui/src/components/PatchPreview.tsx` (205 linhas)   | Approve/reject funcional           |
| Decision History | `web-ui/src/components/DecisionHistory.tsx` (58 linhas) | Lista decisões, sem filtro         |

#### Requisito Crítico

O `approval-flow.ts` **precisa ser reescrito** — é um stub de 28 linhas que cria objetos em memória sem persistência, sem fila, sem timeout, sem notificação.

#### Abordagem (2-3 sem)

1. Reescrever `approval-flow.ts` com persistência em `@ai-devkit/memory-store`
2. Integrar `AgentRuntime.run()` com `autonomy-policy.shouldRequestHumanDecision()`
3. Criar endpoint `POST /api/plan` que gera plano com steps + preview
4. UI: modal de aprovação com diff preview + botões Approve/Reject/Skip
5. Broadcasst WebSocket `approval/request` e `approval/respond`

---

### B2 — UI de Diff Review Multi-File

#### Requisitos

1. Quando AgentRuntime faz multi-file edit, mostrar diff consolidado por arquivo
2. Navegação entre arquivos (next/previous)
3. Aprovação granular por arquivo ou bulk
4. Word-level diff (não só line-level)
5. Inline editing no diff (ajustar antes de aprovar)

#### O que já existe

| Componente                      | Status                                                |
| ------------------------------- | ----------------------------------------------------- |
| `DiffViewer.tsx` (81 linhas)    | Monaco DiffEditor funcional, sem navegação multi-file |
| `PatchPreview.tsx` (205 linhas) | Approve/reject com quality score                      |
| `diff-engine`                   | Text/object/semantic/git diff — funcional             |

#### Abordagem (2-3 sem)

1. Estender `DiffViewer.tsx` com navegação entre arquivos (prev/next buttons)
2. Adicionar `ignoreWhitespace` toggle
3. Adicionar file tree sidebar com status (M/A/D)
4. Integrar com `api-router.ts` preview endpoints

---

### B5 — Auto-Fix de Testes

#### Requisitos

1. Rodar `npm test` automaticamente após mudança
2. Parsear output de falha (stack trace, linha, mensagem)
3. Enviar falha + contexto para LLM sugerir correção
4. Aplicar correção com aprovação humana
5. Re-executar testes até passar (máx 3 tentativas)

#### O que já existe

| Componente                 | Status                                                           |
| -------------------------- | ---------------------------------------------------------------- |
| `test-loop.ts` (99 linhas) | **Stub** — executa 5 comandos fixos, autoFixApplied sempre false |
| `engineer.ts` (353 linhas) | Loop planning→implement→test, mas sem auto-fix real              |
| Agent Runtime              | Stub — sem integração com test-loop                              |

#### Abordagem (3-4 sem)

1. Reescrever `test-loop.ts` com pipeline real: run → parse → LLM → apply → rerun
2. Integrar com `provider-router.ts` para enviar falha ao LLM
3. Criar `parseTestFailure()` que extrai arquivo:linha:mensagem de stack trace
4. Limite de 3 tentativas com escalação humana se persistir

---

### B7 — Pattern Learning Integrado ao Chat

#### Requisitos

1. `pattern-learner` (existe) alimenta sugestões contextuais no chat
2. Quando usuário começa a digitar, sugerir padrões relevantes
3. Exemplos: "Percebi que você sempre usa `useCallback` aqui → quer que eu crie um hook?"
4. Memória de padrões persiste entre sessões

#### O que já existe

| Componente           | Status                                              |
| -------------------- | --------------------------------------------------- |
| `pattern-learner.ts` | Existe, detecta frequência de tags                  |
| `learning-engine.ts` | Existe, gera recomendações por confiança            |
| `chat-bridge.ts`     | Cria ChatEngine, sem integração com pattern-learner |

#### Abordagem (3-4 sem)

1. Conectar `pattern-learner.detect()` → `learning-engine.recommend()` → `chat-bridge`
2. Adicionar comando `ai-devkit pattern suggest` no chat
3. UI: sugestão aparece como chip clicável no input do chat

---

### B14 — Memória de Sessão Persistente

#### Requisitos

1. Conversas do chat persistem entre sessões
2. Histórico de conversas com busca
3. Contexto do projeto (arquivos abertos, branch, task atual) preservado

#### O que já existe

| Componente                             | Status                               |
| -------------------------------------- | ------------------------------------ |
| `@ai-devkit/memory-store` (115 linhas) | **Funcional** — append, list, search |
| `chat-bridge.ts`                       | Passa `memoryPath` mas nunca salva   |
| `session-manager.ts`                   | Cria/salva sessões                   |
| P-002 (pendência futura)               | Implementar save/load de chat-memory |

#### Abordagem (4h)

1. `chat-bridge.ts`: após cada mensagem, chamar `memoryStore.append(record)`
2. Ao iniciar sessão, carregar `memoryStore.list()` como contexto inicial
3. Adicionar comando `ai-devkit chat history` e `ai-devkit chat search <term>`

---

## TASK-IDE-53-C: Fluxo de Engenharia

### C1 — Workflow Issue → Tarefa → PR

#### Requisitos

1. `ai-devkit issue resolve <id>` lê issue do GitHub/GitLab
2. Analisa descrição + comments + labels
3. Gera plano de tarefas (task graph)
4. Cria branch, implementa, commita, abre PR
5. PR inclui descrição + checklist + evidências

#### O que já existe

| Componente        | Status                                  |
| ----------------- | --------------------------------------- |
| `git-provider.ts` | **Funcional** — GitHub/GitLab client    |
| `task-run.ts`     | **Funcional** — executa backlog YAML    |
| `engineer.ts`     | Pipeline plan→implement→test→fix→review |
| `pr-review`       | CLI-only, sem criação de PR             |

#### Abordagem (3-4 sem)

1. Extender `git-provider.ts` com método `createPR(branch, title, body)`
2. Comando `ai-devkit issue resolve <id>`: issue → task graph → branch → implement → PR
3. PR body inclui: descrição, arquivos alterados, checklist de verificação, link para audit trail

---

### C2 — Publicar Relatórios em PR Automático

#### Requisitos

1. Após `ai-devkit verify`, publicar resultado como comentário no PR
2. Scorecard, violações, cobertura, mudanças
3. Atualizar status check (pending/success/failure)
4. Re-comentar quando houver novo push

#### Abordagem (2-3 sem)

1. Criar `git-provider.publishComment(prNumber, body)` e `publishCheck(prNumber, status)`
2. Hook pós-verify: se em PR, publica relatório
3. Template markdown com score, violações, diff stat

---

### C10 — Resolução Autônoma de Issues

#### Requisitos

1. `ai-devkit issue resolve <id>` com fluxo totalmente autônomo
2. Issue → análise → plano → branch → implementação → testes → PR
3. Mínima intervenção humana (configurável por risk threshold)

#### O que já existe

| Componente           | Status                                      |
| -------------------- | ------------------------------------------- |
| `engineer.ts`        | Pipeline de engenharia, itera até completar |
| `autonomy-policy.ts` | Risk scoring + auto-execute threshold       |
| `decision-center.ts` | Formato 3+1 para decisões                   |

#### Abordagem (3-4 sem)

1. Pipeline: `readIssue()` → `analyzeIssue()` → `generatePlan()` → `createBranch()` → `implement()` → `test()` → `createPR()`
2. Cada etapa verifica `autonomyPolicy.shouldAutoExecute()` antes de prosseguir
3. Se humano necessário, pause + notificação + modal de decisão

---

## TASK-IDE-54-U9: Noção de Incerteza

#### Requisitos

1. Extrair `confidenceScore` dos logprobs do LLM (cada provider)
2. Mapear 6 fatores do `autonomy-policy.ts` em níveis: alta, média, baixa, incerta
3. Exibir indicador visual no chat (ícone + cor + tooltip)
4. Exibir no diff (cada chunk de alteração com confiança)
5. Explicação textual: "Confiança baixa porque: risco alto + testes não passaram"

#### O que já existe

| Componente                        | Status                                     |
| --------------------------------- | ------------------------------------------ |
| `autonomy-policy.ts` (263 linhas) | `calculateRiskScore()` com 6 fatores       |
| `provider-router.ts` (251 linhas) | Router existente, sem extração de logprobs |
| `decision-center.ts`              | Formato 3+1                                |
| `ChatMessage.tsx` (web-ui)        | Mensagens de chat sem indicador            |

#### Dependências

- Cada provider expõe logprobs (OpenAI `logprobs`, Anthropic não expõe)
- Para providers sem logprobs: fallback para score baseado em fatores do autonomy-policy

#### Abordagem (2-3 sem)

1. **Provider layer**: extrair `logprobs` onde disponível, normalizar para 0-1
2. **Policy layer**: mapear 6 fatores do `calculateRiskScore()` em `ConfidenceScore`
3. **Fusion**: combinar logprobs + policy factors + test coverage em score único
4. **UI**: badge colorido no chat (🟢 Alta / 🟡 Média / 🟠 Baixa / 🔴 Incerta)
5. **Diff**: cada chunk com tooltip de confiança

#### Interface ConfidenceScore (contrato novo)

```typescript
interface ConfidenceScore {
  level: 'high' | 'medium' | 'low' | 'uncertain';
  score: number; // 0.0 a 1.0
  factors: Array<{ name: string; value: number; weight: number }>;
  explanation: string;
}
```

#### Verificação

- [ ] Logprobs extraídos do OpenAI provider
- [ ] Fatores mapeados: risk_score, logprob, history_match, test_coverage
- [ ] UI exibe indicador para cada mensagem do chat
- [ ] Tooltip mostra explicação

---

## TASK-IDE-54-U7: Autonomia + Rollback Garantido

#### Requisitos

1. Cada ação do agente gera checkpoint automático **antes** de executar
2. Comando `ai-devkit rollback --action <actionId>` reverte ação individual
3. UI de timeline com "deslizar para reverter" em cada ação
4. Rollback granular (arquivo, não sessão inteira)
5. Rollback depende do tipo de ação:
   - file.write → restaurar conteúdo original (salvo no checkpoint)
   - file.create → deletar arquivo
   - file.delete → restaurar de backup no checkpoint
   - shell.exec → não pode rollback (alertar usuário)

#### O que já existe

| Componente                           | Status                                    |
| ------------------------------------ | ----------------------------------------- |
| `checkpoint-manager.ts` (390 linhas) | **Funcional** — salva/carrega checkpoints |
| `worktree isolation`                 | `ai-devkit worktree create/merge`         |
| `snapshot`                           | `ai-devkit snapshot generate --save`      |
| `audit-trail` (54 linhas)            | **Stub** — sem log rotation               |
| `approval-flow` (28 linhas)          | **Stub** — sem persistência               |

#### Abordagem (3-4 sem)

1. **Checkpoint pré-ação**: `checkpoint-manager.createCheckpoint()` antes de cada ação
2. **Backup de arquivos**: salvar conteúdo original em `.ai/checkpoints/<id>/files/`
3. **Rollback**: restaurar de backup, deletar arquivos criados
4. **Comando CLI**: `ai-devkit rollback --action <id> [--hard]`
5. **UI**: timeline com ações + botão "Reverter" (confirmação: "Tem certeza?")

#### Verificação

- [ ] file.write: checkpoint antes + restore após rollback
- [ ] file.create: checkpoint antes + delete após rollback
- [ ] file.delete: backup salvo + restore após rollback
- [ ] shell.exec: rollback não disponível (exibe warning)
- [ ] Rollback parcial (apenas arquivos da ação, não sessão)

---

## TASK-IDE-54-U10: Revisão Adversarial Multi-Perspectiva

#### Requisitos

1. 6 agentes especializados revisam o mesmo código sob perspectivas diferentes
2. Agentes: segurança, arquitetura, performance, UX, dados, compliance
3. Cada agente produz relatório com score + issues + recomendações
4. Relatório consolidado com score geral e issues agrupadas
5. Comando `ai-devkit review adversarial --areas all`

#### O que já existe

| Componente                      | Status                                             |
| ------------------------------- | -------------------------------------------------- |
| Agent Registry (34 linhas)      | **Stub** — 7 roles definidas, sem especialização   |
| Agent Runtime (103 linhas)      | **Stub** — sem integração LLM                      |
| Compliance (5 frameworks)       | CLI `ai-devkit compliance` — funcional             |
| Security barrier                | CLI `ai-devkit security barrier check` — funcional |
| `review.ts` (29 linhas)         | **Stub** — importa módulo inexistente              |
| `collaboration.ts` (350 linhas) | Multi-agente com Ollama                            |

#### Abordagem (3-4 sem)

1. Especializar agent registry com 6 perfis, cada um com prompt específico
2. Cada agente recebe: diff + contexto do projeto + prompt especializado
3. Agentes executam em paralelo (Promise.all)
4. Consolidar resultados em relatório único com score por área
5. Comando `ai-devkit review adversarial --areas security,architecture,performance`

#### Prompts Especializados por Agente

| Agente      | Prompt Base                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| Segurança   | "Revise este código para: OWASP Top 10, SQL injection, XSS, CSRF, hardcoded secrets, auth bypass"       |
| Arquitetura | "Revise para: aderência à Clean Architecture, acoplamento, single responsibility, dependency inversion" |
| Performance | "Revise para: N+1 queries, memory leaks, bundle size, unnecessary rerenders, cache opportunities"       |
| UX          | "Revise para: acessibilidade (WCAG), i18n, loading states, error handling, responsive design"           |
| Dados       | "Revise para: validação de input, sanitização, tipos, boundary conditions, data integrity"              |
| Compliance  | "Revise para: LGPD, GDPR, SOC2 — logging de acesso, retention, consent, data minimization"              |

---

## TASK-IDE-54-U2: Memória de Engenharia Versionada

#### Requisitos

1. Unificar `@ai-devkit/memory-store` (package) e `cli/src/memory/` (local)
2. Cada alteração gera nova versão com diff semântico
3. Cada entrada tem: fonte (requisito, ADR, PR, incidente), validade (expiração), confiança
4. API de consulta semântica: retorna versão + fonte + confiança
5. Rollback de memória (voltar a versão anterior)

#### O que já existe

| Componente                             | Status                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| `@ai-devkit/memory-store` (115 linhas) | **Funcional** — load/save/append/search                                              |
| `cli/src/memory/` (6 arquivos)         | Index, report, pattern detector, learning engine, history summarizer, policy adapter |
| `trace-registry`                       | Link tracing funcional                                                               |
| `audit-trail` (54 linhas)              | **Stub** — sem versionamento                                                         |
| Knowledge Base                         | 172 entradas, 12 categorias                                                          |
| Hermes Loop                            | Aprendizado entre sessões                                                            |

#### Abordagem (4-6 sem)

1. Unificar interfaces: `MemoryRecord` + `MemoryState` usarem mesmos tipos
2. Adicionar `version: number` e `previousVersionHash: string` a cada record
3. `diff()` entre versões usando `diff-engine`
4. Adicionar `source: 'requirement' | 'adr' | 'pr' | 'incident' | 'chat' | 'pattern'`
5. Adicionar `expiresAt: string | null` (TTL opcional)
6. API semântica: `search(query)` → `{ records: MemoryRecord[], total, pagination }`

#### Estrutura da Memória Versionada

```typescript
interface VersionedMemoryRecord extends MemoryRecord {
  version: number;
  previousVersionHash: string | null; // SHA-256 da versão anterior
  diff?: DiffResult; // diff semântico entre versões
  source: 'requirement' | 'adr' | 'pr' | 'incident' | 'chat' | 'pattern';
  confidence: number; // 0.0 a 1.0
  expiresAt: string | null; // ISO 8601
  attestedBy?: string; // 'human' | 'ai:claude' | 'ai:gpt' | 'system'
}
```

---

## TASK-IDE-54-U5: Loop Engineering Framework

#### Requisitos

1. Ciclo formal: goal → plan → act → verify → correct → evaluate
2. Integrar quality-gate (6 estágios) + test-loop + phase-orchestrator
3. Detecção de não-convergência: looping infinito, drift, qualidade degradando
4. Comando `ai-devkit loop run --goal "..." --max-iterations 5`
5. Configuração declarativa: avaliação multi-camada, critérios de parada

#### O que já existe

| Componente                           | Status                                      |
| ------------------------------------ | ------------------------------------------- |
| `quality-gate` (6 estágios)          | **Funcional** — CLI `ai-devkit verify`      |
| `test-loop.ts` (99 linhas)           | **Stub** — comandos fixos                   |
| `checkpoint-manager.ts` (390 linhas) | **Funcional**                               |
| `phase-orchestrator.ts`              | **Funcional** — replaneja automaticamente   |
| `autonomy-policy.ts` (263 linhas)    | **Funcional** — risk score + auto-threshold |
| `engineer.ts` (353 linhas)           | Pipeline com iterações                      |

#### Abordagem (4-6 sem)

1. Criar `runtime/loop-engine.ts` — classe `LoopEngine` com ciclo genérico
2. Formalizar `LoopDefinition` (interface nova)
3. Detecção de convergência por métricas (target → actual delta)
4. Detecção de não-convergência: max iterations, quality regression, drift detection
5. Integrar `quality-gate` como evaluation layer padrão
6. CLI `ai-devkit loop run --goal "..."` + `ai-devkit loop status`

#### Interface LoopDefinition

```typescript
interface LoopDefinition {
  goal: string;
  metrics: Array<{ name: string; operator: 'gt' | 'gte' | 'eq'; target: number }>;
  maxIterations: number;
  checkpointInterval: number;
  evaluationLayers: Array<'unit_test' | 'integration' | 'e2e' | 'static_analysis' | 'security' | 'benchmark'>;
  convergenceCriteria: Array<{ metric: string; threshold: number; window: number }>;
  rollbackOnFailure: boolean;
}
```

---

## TASK-IDE-54-U6: Agente Centrado no Humano

#### Requisitos

1. 4 métricas formalizadas: task alignment, verifiability, steerability, adaptability
2. Dashboard exibindo score das 4 dimensões por sessão
3. Feedback loop: usuário avalia cada ação → recalibra agente
4. Cada dimensão tem cálculo objetivo (não subjetivo)

#### O que já existe

| Componente                     | Status                                     |
| ------------------------------ | ------------------------------------------ |
| `decision-center.ts`           | Formato 3+1 — alinhamento                  |
| `policy-engine` (58 linhas)    | **Stub** — regras fixas, sem contexto      |
| `approval-flow.ts` (28 linhas) | **Stub** — sem persistência                |
| `hermes-loop`                  | Aprendizado entre sessões — adaptabilidade |
| `module-scorecard.ts`          | 7 dimensões de avaliação                   |

#### Abordagem (3-4 sem)

1. Criar `runtime/human-centered.ts` com as 4 métricas
2. **Task Alignment**: ratio de ações aprovadas vs rejeitadas (quanto mais aprovadas, maior alinhamento)
3. **Verifiability**: tempo médio do usuário para verificar uma ação (quanto menor, mais verificável)
4. **Steerability**: número de redirecionamentos necessários (quanto menos, mais dirigível)
5. **Adaptability**: taxa de melhoria ao longo do tempo (quanto mais sobe, mais adaptável)
6. Dashboard exibe scores + histórico + tendência

#### Interface HumanCenteredMetrics

```typescript
interface HumanCenteredMetrics {
  taskAlignment: number; // 0-1: ações aprovadas / total ações
  verifiability: number; // 0-1: 1 - (tempo_verificacao / tempo_maximo)
  steerability: number; // 0-1: 1 - (redirecionamentos / max_redirecionamentos)
  adaptability: number; // 0-1: melhoria contínua (regressão linear do score ao longo do tempo)
  overall: number; // média ponderada
  history: Array<{ timestamp: string; scores: Omit<HumanCenteredMetrics, 'history'> }>;
}
```

---

## Gaps Não Priorizados

### U3 — Especificação Executável (4-6 sem, 🟡 8º)

**Bloqueado por**: Falta de formato de especificação formal.
**Pré-requisito**: Estudo 52 (Especificação Executável) precisa ser completado primeiro.
**Depende de**: Feature blueprint + test matrix + acceptance scenarios generators existentes.

### U8 — Goal Engineering (4-6 sem, 🟡 10º)

**Bloqueado por**: Falta de pipeline goal→metrics.
**Pré-requisito**: U5 (Loop Engineering) precisa existir primeiro.
**Depende de**: Module scorecard + feature blueprint existentes.

### U11 — Rastreabilidade Ponta a Ponta (4-6 sem, 🟡 7º)

**Bloqueado por**: Integração entre trace-registry + audit-trail + memory-store.
**Pré-requisito**: U2 (Memória Versionada) precisa existir primeiro.

### U12 — Execução Determinística (6-8 sem, 🟡 9º)

**Bloqueado por**: Ausência de runtime determinístico.
**Pré-requisito**: U7 (Autonomia + Rollback) + checkpoint-manager.
**Desafio técnico**: LLMs são inerentemente não-determinísticos. Solução: seed fixa + temperatura 0 + estado isolado + tool-use transactional.

### U4 — Oráculo de Correção (6-8 sem, 🟢 11º)

**Bloqueado por**: Falta de especificação formal de invariantes.
**Pré-requisito**: U3 (Especificação Executável) precisa existir primeiro.

### U1 — Code World Model (6-10 sem, 🟢 12º)

**Bloqueado por**: Complexidade infraestrutural (simular DB, APIs, permissões, carga).
**Pré-requisito**: U7 (Rollback) + sandbox + worktree + snapshot.
**Risco maior**: Mais complexo e caro de todos. Recomendado reavaliar em Out/2026.

---

## Mapa de Dependências Entre Tarefas

```
53-A (MVP IDE) ─────────────────┐
  ├─ A2 (PTY)                   │
  ├─ A3 (chokidar)              │
  └─ A1 (LSP)                   │
                                │
53-B (Agentes) ─────────────────┤
  ├─ B10 (Plan Mode) ──── U6 ──┤
  ├─ B2 (Diff Review)          │
  ├─ B5 (Auto-fix) ────── U5 ──┤
  ├─ B7 (Pattern Learn) ── U2 ─┤
  └─ B14 (Memory) ──────── U2 ─┤
                                │
53-C (Fluxo) ──────────────────┤
  ├─ C1 (Issue→PR)              │
  ├─ C2 (PR Reports)            │
  ├─ C10 (Auto Resolve) ── U7 ─┤
  └─ C6 (Onboarding)            │
                                │
54-U9 (Incerteza) ── P         │  ← Primeiro (2-3 sem)
54-U7 (Rollback) ─── M ────────┘  ← Segundo (3-4 sem)
54-U10 (Adversarial) M             ← Terceiro (3-4 sem)
54-U2 (Memória) ──── M            ← Quarto (4-6 sem)
54-U5 (Loop) ─────── M ──── U7    ← Quinto (4-6 sem)
54-U6 (Humano) ──── M ──── U9     ← Sexto (3-4 sem)
```

---

## Resumo de Esforço

| Tarefa                  | Esforço |        Dependências         | Início Recomendado |
| ----------------------- | :-----: | :-------------------------: | :----------------: |
| 53-A2 (PTY)             |  2 sem  |     node-pty + xterm.js     |      Semana 1      |
| 53-A3 (chokidar)        | 5 dias  |          chokidar           |      Semana 1      |
| 53-A1 (LSP)             |  3 sem  |    monaco-languageclient    |      Semana 2      |
| 53-B10 (Plan Mode)      |  3 sem  |   ApprovalFlow reescrito    |      Semana 3      |
| 53-B2 (Diff Review)     |  3 sem  |  DiffViewer + PatchPreview  |      Semana 3      |
| 53-B5 (Auto-fix)        |  4 sem  |  TestLoop + ProviderRouter  |      Semana 4      |
| 53-B7 (Pattern Learn)   |  4 sem  | PatternLearner + ChatBridge |      Semana 5      |
| 53-B14 (Memory Persist) |   4h    |         MemoryStore         |      Semana 1      |
| 53-C1 (Issue→PR)        |  4 sem  |   GitProvider + Engineer    |      Semana 6      |
| 53-C2 (PR Reports)      |  3 sem  |    Verify + GitProvider     |      Semana 7      |
| 53-C10 (Auto Resolve)   |  4 sem  |  AutonomyPolicy + Engineer  |      Semana 8      |
| 53-C6 (Onboarding)      |  2 sem  |        TASK-QUICK-05        |      Semana 2      |
| 54-U9 (Incerteza)       |  3 sem  |       AutonomyPolicy        |    **Semana 1**    |
| 54-U7 (Rollback)        |  4 sem  |      CheckpointManager      |      Semana 3      |
| 54-U10 (Adversarial)    |  4 sem  |   AgentRegistry + Review    |      Semana 4      |
| 54-U2 (Memória)         |  6 sem  | MemoryStore + TraceRegistry |      Semana 4      |
| 54-U5 (Loop)            |  6 sem  | QualityGate + TestLoop + U7 |      Semana 6      |
| 54-U6 (Humano)          |  4 sem  |     DecisionCenter + U9     |      Semana 5      |

**Total**: ~65 semanas-homem (16 semanas cronológicas com 4 devs paralelizados)

---

## Risco Técnico Geral

| Risco                                             |  Probabilidade   | Impacto | Mitigação                                              |
| ------------------------------------------------- | :--------------: | :-----: | ------------------------------------------------------ |
| `node-pty` não compila no Windows                 | Alta (C++ addon) |  Alto   | Fallback REST `/api/shell` + aviso "terminal limitado" |
| LSP lento em projetos 100k+ linhas                |      Média       |  Alto   | Lazy loading de workers, indexação progressiva         |
| LLM não-determinístico quebra testes              |       Alta       |  Alto   | Seeds fixas, temperatura 0, replay debugging           |
| Memory Store sem lock corrompe dados              |      Média       |  Alto   | File locking (`proper-lockfile`), atomic writes        |
| Rollback de shell.exec impossível                 |      Certa       |  Médio  | Prevenir ações destrutivas, exigir aprovação           |
| Agentes adversarial geram relatórios conflitantes |       Alta       |  Médio  | Score ponderado por área, relatório consolidado        |
| Loop Engineering não converge                     |      Média       |  Alto   | Max iterations + escalação humana + fallback           |
| Provider sem logprobs (Anthropic)                 |       Alta       |  Médio  | Fallback para factores do autonomy-policy              |

---

## Implementation Status Update (2026-07-15)

### Reassessment of All 18 Tasks

Below is a per-task reassessment based on the IDE diagnostic and codebase audit performed on 2026-07-15. Each task is evaluated against actual source code, not documentation.

| Task                      |       Previous Status       |          Current Status           | Evidence from Codebase                                                                                                                                                                                 |          Adjusted Effort           |
| ------------------------- | :-------------------------: | :-------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------: |
| **A1 — LSP**              | 🔴 Still pending (2-4 sem)  |   ⚠️ **PARTIALLY IMPLEMENTED**    | `lsp-bridge.ts` spawns `typescript-language-server` via child_process; `lsp-client.ts` connects via WebSocket to Monaco. Only TypeScript — no JSON, CSS, HTML LSP.                                     | **1-2 sem** (multi-lang expansion) |
| **A2 — PTY**              | 🔴 Still pending (1-2 sem)  |   ⚠️ **PARTIALLY IMPLEMENTED**    | `terminal-bridge.ts` has `node-pty` support (line 148) wrapped in try-catch; `Terminal.tsx` has WebSocket PTY connection (line 62) but stabilisation needed.                                           |      **3-5 dias** (stabilize)      |
| **A3 — chokidar**         | 🔴 Still pending (3-5 dias) |        🔴 **NOT STARTED**         | `file-bridge.ts` uses `setInterval(scanFiles, 2000)` polling. Zero chokidar imports despite package being in `node_modules`.                                                                           |      **3-5 dias** (unchanged)      |
| **B10 — Plan Mode**       | 🔴 Still pending (2-3 sem)  |   ⚠️ **PARTIALLY IMPLEMENTED**    | `DecisionCenter` component exists in UI renders but `handleApprove`/`handleReject` are empty stubs — disconnected from any API endpoint.                                                               |       **1-2 sem** (wire API)       |
| **B2 — Diff Review**      | 🔴 Still pending (2-3 sem)  |     ✅ **FULLY IMPLEMENTED**      | `PreviewMode` → `PatchPreview` (205 lines) → `DiffViewer` (81 lines) with real backend integration. Approve/reject functional.                                                                         |            **✅ Done**             |
| **B5 — Auto-fix Tests**   | 🔴 Still pending (3-4 sem)  |        🔴 **NOT STARTED**         | `test-loop.ts` (99 lines) still a stub executing 5 fixed commands; `autoFixApplied` always `false`.                                                                                                    |      **3-4 sem** (unchanged)       |
| **B7 — Pattern Learning** | 🔴 Still pending (3-4 sem)  |        🔴 **NOT STARTED**         | `pattern-learner.ts` exists, `learning-engine.ts` exists, but `chat-bridge.ts` never imports or calls them.                                                                                            |      **3-4 sem** (unchanged)       |
| **B14 — Memory Persist**  |    🔴 Still pending (4h)    |   ⚠️ **PARTIALLY IMPLEMENTED**    | `ChatPanel` sends context via SSE to backend; `@ai-devkit/memory-store` (115 lines) has append/list/search but `chat-bridge.ts` never calls `memoryStore.append()`.                                    |         **2h** (wire call)         |
| **C1 — Issue→PR**         | 🔴 Still pending (3-4 sem)  |        🔴 **NOT STARTED**         | `git-provider.ts` functional for GitHub/GitLab but lacks `createPR()` method. `engineer.ts` pipeline exists but not connected to issue flow.                                                           |      **3-4 sem** (unchanged)       |
| **C2 — PR Reports**       | 🔴 Still pending (2-3 sem)  |        🔴 **NOT STARTED**         | `pr-review` CLI exists but no `publishComment()` or `publishCheck()` in `git-provider.ts`.                                                                                                             |      **2-3 sem** (unchanged)       |
| **C10 — Auto Resolve**    | 🔴 Still pending (3-4 sem)  |        🔴 **NOT STARTED**         | `autonomy-policy.ts` + `engineer.ts` exist but no integrated issue→branch→PR pipeline.                                                                                                                 |      **3-4 sem** (unchanged)       |
| **C6 — Onboarding**       | 🔴 Still pending (1-2 sem)  |     ✅ **FULLY IMPLEMENTED**      | `OnboardingMode.tsx` has 5-step wizard (Welcome → Project Setup → Config → Integrations → Complete) fully functional with real API calls.                                                              |            **✅ Done**             |
| **U9 — Incerteza**        | 🔴 Still pending (2-3 sem)  | 🔴 **NOT STARTED** (infra exists) | `autonomy-policy.ts` (263 lines) has `calculateRiskScore()` with 6 factors. No logprob extraction in `provider-router.ts`. No UI indicator.                                                            |       **1-2 sem** (UI layer)       |
| **U7 — Rollback**         | 🔴 Still pending (3-4 sem)  |   ⚠️ **PARTIALLY IMPLEMENTED**    | `checkpoint-manager.ts` (390 lines) functional — save/load/restore checkpoints. `worktree isolation` + `snapshot` work. Missing: per-action checkpoint, `ai-devkit rollback` CLI command, timeline UI. |            **2-3 sem**             |
| **U10 — Adversarial**     | 🔴 Still pending (3-4 sem)  |        🔴 **NOT STARTED**         | `agent-registry.ts` (34 lines) stub with 7 roles but no specialization. `review.ts` (29 lines) imports nonexistent module. `collaboration.ts` (350 lines) exists for multi-agent but not specialized.  |      **3-4 sem** (unchanged)       |
| **U2 — Memory**           | 🔴 Still pending (4-6 sem)  |   ⚠️ **PARTIALLY IMPLEMENTED**    | `@ai-devkit/memory-store` (115 lines) + `cli/src/memory/` (6 files) + `trace-registry` + knowledge base (172 entries). Unification + versioning + source/confidence/expiry missing.                    |            **3-4 sem**             |
| **U5 — Loop Eng.**        | 🔴 Still pending (4-6 sem)  |   ⚠️ **PARTIALLY IMPLEMENTED**    | `quality-gate` (6 stages) + `test-loop` + `phase-orchestrator` + `engineer.ts` (353 lines) form an implicit loop. Formal `LoopDefinition` interface and convergence detection missing.                 |            **3-4 sem**             |
| **U6 — Human-Centered**   | 🔴 Still pending (3-4 sem)  |        🔴 **NOT STARTED**         | `decision-center.ts` (3+1 format) + `policy-engine` (58 lines stub) + `hermes-loop` exist. No formal 4-metric system, no dashboard.                                                                    |      **3-4 sem** (unchanged)       |

### Summary of Status Distribution

| Status                       | Count | Tasks                                           |
| ---------------------------- | :---: | ----------------------------------------------- |
| ✅ **Fully Implemented**     |   2   | B2 (Diff Review), C6 (Onboarding)               |
| ⚠️ **Partially Implemented** |   8   | A1, A2, B10, B14, U7, U2, U5, U9 (infra exists) |
| 🔴 **Not Started**           |   8   | A3, B5, B7, C1, C2, C10, U10, U6                |

### Total Adjusted Effort

- Originally: **~65 semanas-homem**
- Adjusted: **~40 semanas-homem** (saved 25 weeks from existing implementation)
- Delta: **-38%** due to existing codebase maturity

---

## Conexao com as 7 Oportunidades Estrategicas

Each of the 18 implementation tasks maps to one or more of the 7 Strategic Opportunities (OPs) defined in the project's opportunity framework. This mapping ensures alignment between tactical implementation and strategic vision.

### Task → OP Mapping

|  Task   | Description             |          Primary OP          |        Secondary OP         |
| :-----: | ----------------------- | :--------------------------: | :-------------------------: |
| **A2**  | Terminal PTY            | **OP-2** (Unified Tool API)  |              —              |
| **A3**  | File Watcher (chokidar) | **OP-2** (Unified Tool API)  |              —              |
| **A1**  | LSP Multi-Language      | **OP-2** (Unified Tool API)  |              —              |
| **B10** | Plan Mode UI            |  **OP-4** (Self-Debugging)   | **OP-1** (Context Protocol) |
| **B2**  | Diff Review             |  **OP-4** (Self-Debugging)   |              —              |
| **B5**  | Auto-Fix Tests          |  **OP-4** (Self-Debugging)   |   **OP-3** (Memory Graph)   |
| **B7**  | Pattern Learning        |   **OP-3** (Memory Graph)    |  **OP-7** (Feedback Loop)   |
| **B14** | Memory Persist          |   **OP-3** (Memory Graph)    |              —              |
| **C1**  | Issue→PR                |  **OP-6** (Autonomous Loop)  |  **OP-4** (Self-Debugging)  |
| **C2**  | PR Reports              |  **OP-6** (Autonomous Loop)  |              —              |
| **C10** | Auto Resolve            |  **OP-6** (Autonomous Loop)  |  **OP-7** (Feedback Loop)   |
| **C6**  | Onboarding              | **OP-1** (Context Protocol)  |              —              |
| **U9**  | Incerteza (Confidence)  | **OP-5** (Confidence Engine) |  **OP-7** (Feedback Loop)   |
| **U7**  | Autonomia + Rollback    |  **OP-6** (Autonomous Loop)  |  **OP-4** (Self-Debugging)  |
| **U10** | Revisão Adversarial     |   **OP-7** (Feedback Loop)   | **OP-1** (Context Protocol) |
| **U2**  | Memória Versionada      |   **OP-3** (Memory Graph)    | **OP-1** (Context Protocol) |
| **U5**  | Loop Engineering        |   **OP-7** (Feedback Loop)   | **OP-6** (Autonomous Loop)  |
| **U6**  | Agente Centrado Humano  | **OP-1** (Context Protocol)  |  **OP-7** (Feedback Loop)   |

### Grouping by OP

|    OP    | Description       |                                  Tasks                                   | Total Effort |
| :------: | ----------------- | :----------------------------------------------------------------------: | :----------: |
| **OP-1** | Context Protocol  |         C6, U6, B10 (secondary), U10 (secondary), U2 (secondary)         |   8-10 sem   |
| **OP-2** | Unified Tool API  |                                A1, A2, A3                                |   2-3 sem    |
| **OP-3** | Memory Graph      |                               B7, B14, U2                                |   7-10 sem   |
| **OP-4** | Self-Debugging    |                       B10, B2, B5, U7 (secondary)                        |   8-12 sem   |
| **OP-5** | Confidence Engine |                                    U9                                    |   1-2 sem    |
| **OP-6** | Autonomous Loop   |                     C1, C2, C10, U7, U5 (secondary)                      |  11-15 sem   |
| **OP-7** | Feedback Loop     | U10, U5, B7 (secondary), C10 (secondary), U9 (secondary), U6 (secondary) |  10-14 sem   |

---

## Novo Roadmap de Implementacao (Julho 2026)

Baseado no status assessment atualizado, o roadmap original é revisado para refletir o que já está pronto e o que precisa ser priorizado. A ordem reflete: (1) completar o que está começado, (2) construir diferenciais estratégicos, (3) fechar o loop de autonomia.

### Sprint 1-2 (Semanas 1-2): Completar o Iniciado — "Low-Hanging Fruit"

|           Task           | Description                                                               |  Effort  |            Dependencies            |
| :----------------------: | ------------------------------------------------------------------------- | :------: | :--------------------------------: |
|       **A2 — PTY**       | Stabilize node-pty wiring, fix WS reconnection, add fallback REST         | 3-5 dias |      `node-pty` addon compile      |
|    **A3 — chokidar**     | Replace `setInterval(2000)` with chokidar + WS broadcast                  | 3-5 dias | chokidar (already in node_modules) |
|   **B10 — Plan Mode**    | Wire DecisionCenter API: `POST /api/plan`, approval WS, persist decisions | 1-2 sem  |      DecisionCenter UI exists      |
| **B14 — Memory Persist** | Wire `chat-bridge.ts` → `memoryStore.append()` after each message         |    2h    |         MemoryStore exists         |
|   **B2 — Diff Review**   | Already ✅ done — validate and close task                                 |    —     |                 —                  |
|   **C6 — Onboarding**    | Already ✅ done — validate and close task                                 |    —     |                 —                  |

**Total**: ~2 sem (1 dev) ou ~1 sem (2 devs em paralelo)

**Expected Outcome**: PTY functional, files watched natively, Plan Mode interactive, memory persisting between sessions.

### Sprint 3-5 (Semanas 3-5): Fundação Estratégica — OP-1 + OP-2 + OP-5

|              Task              | Description                                                                                            |  OP  | Effort  |
| :----------------------------: | ------------------------------------------------------------------------------------------------------ | :--: | :-----: |
|          **A1 — LSP**          | Expand TypeScript LSP to multi-language (JSON, CSS, HTML), add hover/go-to-def/autocomplete            | OP-2 | 1-2 sem |
|   **U9 — Confidence Engine**   | Extract logprobs from providers (OpenAI), map 6 risk factors → ConfidenceScore, add UI badge + tooltip | OP-5 | 1-2 sem |
|   **C6 — Onboarding** (OP-1)   | Already ✅ done                                                                                        | OP-1 |    —    |
| **U6 — Human-Centered** (init) | Formalize 4-metric system, create `runtime/human-centered.ts` with calculation logic                   | OP-1 |  2 sem  |
|  **B2 — Diff Review** (OP-4)   | Already ✅ done                                                                                        | OP-4 |    —    |

**Total**: ~4-5 sem (1 dev) ou ~2-3 sem (2 devs)

**Expected Outcome**: Multi-language LSP, confidence indicators visible in UI, human-centered metrics framework operational.

### Sprint 6-9 (Semanas 6-9): Inteligência Central — OP-3 + OP-6 + OP-7

|             Task             | Description                                                                                                          |  OP  | Effort  |
| :--------------------------: | -------------------------------------------------------------------------------------------------------------------- | :--: | :-----: |
|    **U2 — Memory Graph**     | Unify `@ai-devkit/memory-store` + `cli/src/memory/`, add versioning, source, confidence, TTL, semantic search        | OP-3 | 3-4 sem |
|  **B7 — Pattern Learning**   | Connect `pattern-learner.detect()` → `learning-engine.recommend()` → chat suggestions                                | OP-3 |  2 sem  |
|  **U5 — Loop Engineering**   | Create `runtime/loop-engine.ts`, formalize `LoopDefinition`, integrate quality-gate + test-loop + phase-orchestrator | OP-7 | 3-4 sem |
| **U10 — Adversarial Review** | Specialize 6 agents (security, arch, perf, UX, data, compliance), parallel execution, consolidated reports           | OP-7 | 3-4 sem |
|      **C1 — Issue→PR**       | Add `createPR()` to `git-provider.ts`, build issue→plan→branch→implement→PR pipeline                                 | OP-6 | 3-4 sem |

**Total**: ~14-18 sem (2 devs → 7-9 sem cronológicas)

**Expected Outcome**: Memory graph with versioned records, pattern-aware chat, formal loop engine, 6-agent adversarial review pipeline, automated issue resolution.

### Sprint 10-12 (Semanas 10-12): Autonomia e Resiliência — OP-4 + OP-6 (Continuação)

|              Task              | Description                                                                            |  OP  | Effort  |
| :----------------------------: | -------------------------------------------------------------------------------------- | :--: | :-----: |
|  **U7 — Autonomy + Rollback**  | Per-action checkpoint, `ai-devkit rollback --action <id>`, timeline UI with revert     | OP-6 | 2-3 sem |
|    **B5 — Auto-Fix Tests**     | Rewrite `test-loop.ts` with real pipeline: run→parse→LLM→apply→rerun, max 3 attempts   | OP-4 | 3-4 sem |
| **B10 — Plan Mode** (finalize) | Add approval flow persistence, decision history, auto/ask/block modes full integration | OP-4 |  1 sem  |
|     **C10 — Auto Resolve**     | Wire full issue→PR flow with autonomy-policy gates, human escalation when needed       | OP-6 |  2 sem  |
|      **C2 — PR Reports**       | `publishComment()` + `publishCheck()` in git-provider, hook pós-verify                 | OP-6 | 2-3 sem |

**Total**: ~10-13 sem (2 devs → 5-7 sem cronológicas)

**Expected Outcome**: Agent autonomy with guaranteed rollback, self-healing test loop, complete issue→PR autonomous pipeline with PR reporting.

### Consolidated Timeline

```
Sprint │ Focus                       │ Tasks              │ Effort   │ Cumulative
───────┼─────────────────────────────┼────────────────────┼──────────┼───────────
  1-2  │ Complete started work       │ A2, A3, B10, B14  │ 2 sem    │ 2 sem
  3-5  │ Strategic foundation (OPs)  │ A1, U9, U6 init    │ 5 sem    │ 7 sem
  6-9  │ Core intelligence (OPs)     │ U2, B7, U5, U10, C1│ 9 sem*   │ 16 sem
 10-12 │ Autonomy + resilience (OPs) │ U7, B5, B10, C10, C2│ 7 sem*   │ 23 sem
```

*with 2 parallel devs → ~12 sem cronológicas total

### What Changed from the Original Roadmap

| Aspect             | Original (Jul 15) |           Revised (Jul 15 update)           | Reason                                            |
| ------------------ | :---------------: | :-----------------------------------------: | ------------------------------------------------- |
| **53-A start**     |    Semana 1-4     |            Sprint 1-2 (reduced)             | A2/A1 already partially done                      |
| **53-B start**     |    Semana 3-8     | Sprint 1-2 (B10, B14) + Sprint 6-9 (B7, B5) | B2 already done, B10/B14 just need wiring         |
| **53-C start**     |    Semana 6-8     |          Sprint 3-12 (distributed)          | C6 already done; C1/C10/C2 need full build        |
| **54-U9 priority** |  Semana 1 (1st)   |                 Sprint 3-5                  | Infra exists but needs provider integration       |
| **54-U7 priority** |  Semana 3 (2nd)   |                Sprint 10-12                 | Rollback depends on checkpoint + loop maturity    |
| **54-U5 priority** |  Semana 6 (5th)   |                 Sprint 6-9                  | Loop framework is prerequisite for autonomy       |
| **Total effort**   |   ~65 sem-homem   |                ~40 sem-homem                | 38% reduction due to existing implementation      |
| **Devs needed**    |      4 devs       |                   2 devs                    | Infrastructure already reduces required workforce |
