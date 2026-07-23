# ðŸš¨ AUDITORIA DE FLUXO, INTEGRAÃ‡ÃƒO & SEGURANÃ‡A â€” AI-Devkit v2

**Data**: 2026-07-15 | **Alvo**: `J:\PROJETOS\ai-devkit-workspace\ai-devkit-v2`
**Tipo**: Auditoria de fluxo ponta-a-ponta, integraÃ§Ã£o entre pacotes, cadeia de prompts, seguranÃ§a e proposta de feature nativa de auditoria contÃ­nua para IDE.

---

## SumÃ¡rio

- [Parte I â€” Fluxo de Dados End-to-End](#parte-i--fluxo-de-dados-end-to-end)
- [Parte II â€” IntegraÃ§Ã£o IDE e Cadeia de Prompts](#parte-ii--integraÃ§Ã£o-ide-e-cadeia-de-prompts)
- [Parte III â€” Meta-Auditoria e Feature Nativa para IDE](#parte-iii--meta-auditoria-e-feature-nativa-para-ide)
- [Parte IV â€” Quick Wins Imediatos](#parte-iv--quick-wins-imediatos)
- [Parte V â€” EspecificaÃ§Ã£o TÃ©cnica: Audit Engine](#parte-v--especificaÃ§Ã£o-tÃ©cnica-audit-engine)

---

## PARTE I â€” FLUXO DE DADOS END-TO-END

### 1.1 Fluxo: `ai-devkit status`

**Pipeline**: `index.ts:143` â†’ `statusCommand()` â†’ `status.ts:78` â†’ `computeStatus()` â†’ `detectStack()` â†’ `output.ts` â†’ `finish()`

| ID | Arquivo:Linha | Severidade | Problema |
|----|---------------|-----------|----------|
| F1 | `commands/detect.ts:31` | **HIGH** | `readDir()` em `hasGlob` lanÃ§a exceÃ§Ã£o sem try/catch no call site. `detectLangFiles` trava na primeira pasta sem permissÃ£o. |
| F2 | `commands/status.ts:28` | **MEDIUM** | `daysSinceModified` chama `io.fs.stat()` sem try/catch. PermissÃ£o negada â†’ exceÃ§Ã£o escapa. |
| F3 | `commands/detect.ts:23-26` | **MEDIUM** | `readFile` captura todas as exceÃ§Ãµes silenciosamente e retorna `''`. Falso negativo na detecÃ§Ã£o. |
| F4 | `commands/detect.ts:31-32` | **MEDIUM** | `hasGlob` lÃª diretÃ³rio INTEIRO com `readDir`. Sem cache entre chamadas â€” `detectStack` repete 5 varreduras. |
| F5 | `commands/detect.ts:272-296` | **LOW** | `detectStack` chama 5 funÃ§Ãµes de detecÃ§Ã£o que releem os mesmos arquivos. Sem memoizaÃ§Ã£o. |

### 1.2 Fluxo: `ai-devkit ai classify`

**Pipeline**: `index.ts:172` â†’ `aiCommand()` â†’ `ai.ts:223` â†’ `aiClassifyAction()` â†’ `ollama.ts:31` (fetch) â†’ fallback TF-IDF

| ID | Arquivo:Linha | Severidade | Problema |
|----|---------------|-----------|----------|
| F6 | `commands/ai.ts:53` | **MEDIUM** | Erro LLM original engolido â€” usuÃ¡rio vÃª sÃ³ "IA local indisponÃ­vel" sem diagnÃ³stico. |
| F7 | `local-ai/ollama.ts:31` | **HIGH** | `fetch` URL **hardcoded** `http://localhost:11434/api/generate`. Ignora `config.ollama.base_url`. |
| F8 | `local-ai/ollama.ts:28-36` | **MEDIUM** | `AbortController` + timeout pode abortar resposta parcial se timeout dispara durante leitura. |

### 1.3 Fluxo: `ai-devkit verify`

**Pipeline**: `index.ts:144` â†’ `verifyCommand()` â†’ `verify.ts:108` â†’ `runVerify()` â†’ spawn `node [argv1] status` â†’ `.ai/bin/run-prevention-suite.js` â†’ `finish()`

| ID | Arquivo:Linha | Severidade | Problema |
|----|---------------|-----------|----------|
| F9 | `commands/verify.ts:46` | **CRITICAL** | `process.argv[1]` usado para spawn. Quebra com link simbÃ³lico, ts-node, ou binÃ¡rio compilado. |
| F10 | `commands/verify.ts:111` | **MEDIUM** | `require('.ai/bin/ledger.js')` em try/catch vazio â€” erro de sintaxe no ledger Ã© ignorado. |
| F11 | `commands/verify.ts:55-64` | **MEDIUM** | Stderr da prevention suite/quality-agent nÃ£o capturado. Perda de logs de diagnÃ³stico. |
| F12 | `commands/observability.ts:134-167` | **CRITICAL** | `recordAutoTrace()` no hook `process.on('exit')` faz I/O de arquivo. O hook `exit` nÃ£o espera async â€” **100% dos auto-traces sÃ£o perdidos**. |
| F13 | `commands/observability.ts:150-163` | **HIGH** | Webhook alerts no hook `exit` disparam `fetch()` assÃ­ncrono â€” nunca completam antes da saÃ­da. |

### 1.4 Fluxo: Agent Runtime â†’ Policy â†’ Memory â†’ Audit

| ID | Arquivo:Linha | Severidade | Problema |
|----|---------------|-----------|----------|
| F14 | `memory-store.ts:60-91` | **CRITICAL** | `memory.json` corrompido â†’ `load()` retorna estado VAZIO â†’ `run()` salva estado vazio + 1 decisÃ£o â†’ **TODO histÃ³rico perdido permanentemente**. |
| F15 | `memory-store.ts:121-135` | **HIGH** | `pushDecision` usa `debouncedSave` (100ms). Se `run()` chamado 2Ã— em 100ms, 2Âº `load()` lÃª arquivo desatualizado â†’ 1Âª decisÃ£o perdida. |
| F16 | `memory-store.ts:93-105` | **HIGH** | `acquireLock()` retorna `false` se lock existe â†’ `save()` retorna sem salvar. ConcorrÃªncia = perda silenciosa. |
| F17 | `agent-runtime.ts:33` vs `agent-runtime.ts:57` | **MEDIUM** | Se `load()` retornou estado vazio (F14), `sessionId` Ã© novo UUID. Rastreamento de sessÃ£o quebrado. |
| F18 | `agent-runtime.ts:43-55` e `agent-runtime.ts:135-149` | **MEDIUM** | Dupla auditoria: `run()` + `confirmExecution()` registram mesmo `actionId` duas vezes. Log inchado. |
| F19 | `agent-runtime.ts:123-150` | **HIGH** | `confirmExecution()` nÃ£o valida `actionId`. Qualquer caller pode criar phantom approvals. |
| F20 | `policy.ts:59` | **MEDIUM** | PolÃ­tica padrÃ£o Ã© `'ask'` para TODAS aÃ§Ãµes de baixo risco. Agente nunca executa automaticamente. |
| F21 | `audit-trail.ts:22-31` | **LOW** | `AuditEvent.decision` mistura `Decision` ('auto'/'ask'/'block') com `ApprovalStatus` ('approved'/'rejected'). Queries imprevisÃ­veis. |

### Sample Action Trace (1 aÃ§Ã£o do usuÃ¡rio)

```
api-router:54  â†’ agentRuntime.run()
  â†’ agent-runtime:33  â†’ MemoryStore.load()        [lÃª disco ou retorna vazio âš ï¸ F14]
  â†’ agent-runtime:34  â†’ evaluatePolicy()          [regras locais, sem LLM]
  â†’ agent-runtime:43  â†’ AuditTrail.append()       [escreve agent.run + pending]
  â†’ agent-runtime:57  â†’ MemoryStore.pushDecision() [debounce 100ms âš ï¸ F15]
  â†’ agent-runtime:64  â†’ return plan
api-router:75  â†’ executa aÃ§Ã£o
api-router:76  â†’ agentRuntime.confirmExecution()
  â†’ agent-runtime:135 â†’ MemoryStore.load()        [2Âº load âš ï¸ pode ler antes do 1Âº save]
  â†’ agent-runtime:136 â†’ AuditTrail.append()       [2Âº append: agent.confirm + approved]
  â†’ agent-runtime:144 â†’ MemoryStore.pushDecision() [2Âº pushDecision]
```

**Problema**: Duas entradas de auditoria + duas chamadas pushDecision para UMA aÃ§Ã£o. Se `confirmExecution` for chamado <100ms apÃ³s `run`, a 1Âª decisÃ£o Ã© perdida (F15).

### 1.5 Fluxo de Eventos WebSocket â€” TrÃªs Sistemas Paralelos

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  1. EventBus (domain events)â”‚  event-bus/src/event-bus.ts
â”‚     EventType: 17 tipos     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â”‚ subscribe('*')
           â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  2. WSBroadcast (WS server) â”‚  event-bus/src/ws-broadcast.ts
â”‚     Porta configurÃ¡vel      â”‚
â”‚     Envia TODOS eventos     â”‚
â”‚     a TODOS os clientes     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  3. IDE Server WebSocket    â”‚  cli/src/ide/ide-server.ts:187
â”‚     /ws endpoint            â”‚
â”‚     Filtro por subscription â”‚
â”‚     (file:change, terminal) â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

| ID | Arquivo:Linha | Severidade | Problema |
|----|---------------|-----------|----------|
| F22 | `ws-broadcast.ts:59` | **HIGH** | WSBroadcast se inscreve em `'*'` (todos eventos) e envia TUDO para TODOS clients sem filtro. SaturaÃ§Ã£o de banda. |
| F23 | `ide-server.ts:189-234` | **CRITICAL** | IDE server NÃƒO USA WSBroadcast. Gerencia WebSockets manualmente. **EventBus â‰  IDE WebSocket â€” completamente desconectados.** |
| F24 | `chat-bridge.ts:72-83` | **HIGH** | `AgentRuntime.run()` Ã© chamado no chat mas policy NÃƒO bloqueia â€” Ã© apenas consultiva. |
| F25 | `chat-bridge.ts:94-103` | **HIGH** | `run()` chamado DE NOVO a cada 10 mensagens para `chat.memory.save`. Redundante com `ChatEngine.chat()`. |
| F26 | `chat.ts:114-164` | **MEDIUM** | Loop de tool call (guard < 8) sem limite de tokens total ou tempo. Resposta truncada sem aviso. |
| F27 | `ws-broadcast.ts:35-37` | **MEDIUM** | `start()` retorna `void`. Caller nÃ£o sabe se WebSocket iniciou. Falha silenciosa. |
| F28 | `web-ui/src/lib/useWebSocket.ts:20-22` | **MEDIUM** | web-ui conecta em `/ws` (IDE server), NUNCA no WSBroadcast. Chat usa SSE, nÃ£o WS. Eventos de domÃ­nio nunca chegam na UI. |

### 1.6 Rastreamento Completo: Mensagem de Chat

```
UsuÃ¡rio digita na web-ui
  â†’ api.ts:95  POST /api/chat/completions (SSE, nÃ£o WS)
    â†’ chat-bridge.ts:28  chatHandler
      â†’ agentRuntime.run()           [policy + audit + memory]
      â†’ ChatEngine.chat()            [LLM + audit + SSE streaming]
        â†’ streamCompletion()          [fetch para LLM]
        â†’ onDelta()                   [SSE event: delta]
        â†’ onToolCall()                [SSE event: tool_call]
        â†’ executeTool()               [child_process.execSync]
        â†’ onToolResult()              [SSE event: tool_result]
      â†’ sendEvent('done', ...)        [SSE event: done]
    â† Resposta HTTP streamada (SSE)
  â† web-ui recebe SSE events

âŒ EventBus NÃƒO Ã© envolvido em momento algum
âŒ WebSocket da IDE NÃƒO recebe eventos de chat
âŒ NÃ£o hÃ¡ broadcast de "chat:message" ou "chat:response"
```

### 1.7 ConsistÃªncia de Tipos entre Pacotes

| Pacote | Depende de `@ideia/contracts`? | Declarado em package.json? |
|--------|-------------------------------------|---------------------------|
| `policy-engine` | âœ… | âœ… `"*"` |
| `memory-store` | âœ… | âœ… `"*"` |
| `audit-trail` | âœ… | âœ… (sem versÃ£o) |
| `agent-runtime` | âœ… | âœ… todos |
| **`cli`** | â›” **importa de 4 pacotes `@ideia/*`** | **âŒ NÃƒO declarados!** |
| `event-bus` | âŒ Tipos prÃ³prios | âŒ ws apenas |
| `web-ui` | âŒ Tipos prÃ³prios | âŒ |

| ID | Arquivo:Linha | Severidade | Problema |
|----|---------------|-----------|----------|
| F29 | `cli/package.json:35-41` | **CRITICAL** | CLI importa de `@ideia/contracts`, `audit-trail`, `agent-runtime`, `memory-store` sem declarÃ¡-los. `MODULE_NOT_FOUND` em produÃ§Ã£o isolada. |
| F30 | `event-bus/types.ts:1-18` vs `contracts/types.ts:40-43` | **HIGH** | **Dois sistemas de tipo de evento incompatÃ­veis:** `EventType` (17 tipos domain) vs `WsEventType` (12 tipos wire). NENHUMA sobreposiÃ§Ã£o. |
| F31 | `event-bus/package.json:10-11` | **HIGH** | EventBus deveria importar `WsEventType` de contracts. Tipos redefinidos localmente sem validaÃ§Ã£o. |
| F32 | `contracts/types.ts:8-15` | **MEDIUM** | `TraceEntityType`, `ComplexityLevel`, `ResourceTier` â€” marcados `@deprecated`, nunca usados. |
| F33 | `web-ui/src/types.ts` vs `contracts/src/types.ts` | **MEDIUM** | `ChatMessage` duplicado, `AuditEntry` vs `AuditEvent`. Nenhum tipo compartilhado. |
| F34 | `memory-store/src/index.ts:1` | **LOW** | `export * from './memory-store'` sem `type` keyword. Problema com `isolatedModules`. |

---

## PARTE II â€” INTEGRAÃ‡ÃƒO IDE E CADEIA DE PROMPTS

### 2.1 IDE Server â€” Vulnerabilidades CrÃ­ticas

| ID | Arquivo:Linha | Severidade | Problema |
|----|---------------|-----------|----------|
| S1 | `terminal-bridge.ts:28-45` | **CRÃTICO** | Blacklist de comandos facilmente contornÃ¡vel. `rm -rf / --no-preserve-root` passa. `echo x; rm -rf /` passa. RCE irrestrito via `/api/shell`. |
| S2 | `sandbox.ts:39-46, 48-64` | **CRÃTICO** | Sandbox JS escapa via prototype chain (`[].constructor.constructor('return process')()`). Shell exec com `shell: true`. |
| S3 | `ide-server.ts:121` | **CRÃTICO** | `Access-Control-Allow-Origin: *`. Sem autenticaÃ§Ã£o em nenhum endpoint. |
| S4 | `file-bridge.ts:58-61` | **CRÃTICO** | `isPathSafe` nÃ£o resolve symlinks. Simlink `workspace/link â†’ /etc` â†’ path traversal. |
| S5 | `api-router.ts:601,649` | **CRÃTICO** | InjeÃ§Ã£o de comando via `execSync('git log --oneline ${branch}..HEAD')` com parÃ¢metro nÃ£o sanitizado. |
| S6 | `chat.ts:206` | **CRÃTICO** | API key enviada como Bearer token em HTTP puro + armazenada em texto plano. |
| S7 | `config.ts:100` | **CRÃTICO** | API keys em texto plano em `.ai/local-ai/config.yaml`. |

### 2.2 Mais Vulnerabilidades IDE

| ID | Arquivo:Linha | Severidade | Problema |
|----|---------------|-----------|----------|
| S8 | `lsp-bridge.ts:79-81` | **HIGH** | `killAll()` nunca chamado. Processos LSP Ã³rfÃ£os. |
| S9 | `Terminal.tsx:21` | **HIGH** | URL WebSocket hardcoded (`ws://`, porta 3001). Quebra em produÃ§Ã£o com HTTPS. |
| S10 | `api-router.ts:464-473` | **HIGH** | Rota `PATCH /api/tasks/:id` nunca corresponde (rota literal, nÃ£o Express-style). |
| S11 | `chat.ts:70-75` | **HIGH** | InjeÃ§Ã£o de contexto via nomes de arquivo/branch no prompt do LLM. `branch=rm -rf /` vira instruÃ§Ã£o. |
| S12 | `ide-server.ts:330` | **HIGH** | `stop()` nÃ£o limpa LSP, PTY, nem sessions. |
| S13 | `ide-server.ts:145` | **MEDIUM** | Error handler sÃ³ captura Promises rejeitadas, nÃ£o erros sÃ­ncronos. |
| S14 | `api-router.ts:686-692` | **MEDIUM** | `readBody` sem limite de tamanho. DoS por memory exhaustion. |
| S15 | `file-bridge.ts:168-189` | **MEDIUM** | Polling a cada 2s. ImpraticÃ¡vel para projetos grandes. |
| S16 | `api.ts:3-5` | **MEDIUM** | `getJson<T>` nÃ£o verifica `res.ok`. HTTP 500 vira dados corrompidos tipo T. |
| S17 | `useWebSocket.ts:10-11` | **LOW** | Singleton global â€” sessÃµes concorrentes podem conflitar. |
| S18 | `ide-server.ts:140-149` | **MEDIUM** | Handler captura apenas Promise rejection. Erro sÃ­ncrono derruba servidor. |
| S19 | `ide-server.ts:157-175` | **MEDIUM** | Handler de arquivo estÃ¡tico sem try/catch. `fs.createReadStream` error derruba processo. |
| S20 | `ide-server.ts:226-233` | **MEDIUM** | `broadcast()` itera `wss.clients` sem try/catch. 1 `send` quebrado interrompe todos. |
| S21 | `ide-server.ts:259-262` | **HIGH** | LSP WS `/lsp` sem autenticaÃ§Ã£o. Qualquer processo na mesma mÃ¡quina pode enviar requests LSP arbitrÃ¡rios. |
| S22 | `ide-server.ts:273` | **HIGH** | `cwd` do query string passado direto para `terminalBridge.openPty(id, cwd)` sem sanitizaÃ§Ã£o. |
| S23 | `terminal-bridge.ts:100-103` | **HIGH** | `spawn(command, [], { shell: true })` sem limites de CPU/memÃ³ria. Fork bomb nÃ£o bloqueado. |
| S24 | `chat-bridge.ts:57-68` | **MEDIUM** | SSE sem keep-alive. ConexÃ£o TCP morta mantÃ©m resposta aberta para sempre. |
| S25 | `lsp-bridge.ts:17` | **MEDIUM** | `require.resolve('typescript-language-server/lib/cli.mjs')` falha silenciosamente se nÃ£o instalado. |
| S26 | `session-manager.ts:63-68` | **HIGH** | `saveSession()` com `writeFileSync`. ConcorrÃªncia â†’ Ãºltima gravaÃ§Ã£o vence â†’ perde dados. |
| S27 | `session-manager.ts` | **MEDIUM** | Todas operaÃ§Ãµes de arquivo sÃ­ncronas. Bloqueiam event loop. |

### 2.3 Cadeia de Prompts â€” 4 Entry Points Fragmentados

| Entry Point | Arquivo | Uso |
|---|---|---|
| `ChatEngine.chat()` | `chat.ts:114` | Web-UI Chat via SSE |
| `queryProvider()` | `provider-router.ts:77` | CLI `ai` commands |
| `queryWithRouting()` | `provider-router.ts:124` | CLI com fallback priority |
| `queryOllama()` | `ollama.ts` | Direto, bypassa roteamento |

| ID | Arquivo:Linha | Severidade | Problema |
|----|---------------|-----------|----------|
| P1 | â€” | **CRITICAL** | 4 entry points de LLM com lÃ³gica diferente de fallback, timeout, erro. **Deveria haver UMA interface unificada.** |
| P2 | `chat.ts:33` | **MEDIUM** | `MAX_HISTORY_TOKENS = 8000` conta caracteres, nÃ£o tokens. Impreciso. |
| P3 | `chat.ts:132` | **MEDIUM** | Loop de tool calls limitado a 8 iteraÃ§Ãµes sem limite de tokens total. |
| P4 | `chat.ts:176-273` | **HIGH** | Respostas do LLM nÃ£o validadas. `streamCompletion` nÃ£o verifica tool_calls JSON antes de executar. |
| P5 | `chat.ts:97-98` | **MEDIUM** | `safeParseArgs` â€” se LLM retorna args invÃ¡lidos, tool recebe `{}`. Comportamento imprevisÃ­vel. |
| P6 | `config.ts:28-29` | **CRITICAL** | `ProviderEntry.api_key` armazenado em texto plano. |
| P7 | `ChatPanel.tsx:70-75` | **HIGH** | InjeÃ§Ã£o de contexto no prompt: nomes de arquivo, branch, projeto viram instruÃ§Ã£o LLM. |
| P8 | `chat.ts:35-45` | **MEDIUM** | System prompt fixo, mensagens do usuÃ¡rio concatenadas sem sanitizaÃ§Ã£o. |
| P9 | â€” | **MEDIUM** | Cognitive Coprocessor (`cognitive-coprocessor/`) nÃ£o integrado com IDE Chat. |
| P10 | `scripts/ai-*.ts` | **HIGH** | Scripts autÃ´nomos (`ai-co-pilot`, `ai-orchestrator`, `ai-cycle`) sÃ£o standalone. NÃƒO integrados com CLI, IDE ou Web-UI. |
| P11 | `scripts/ai-cycle.ts:7-9` | **HIGH** | `runEngineOnce()` â€” nome sugere loop. Sem watchdog ou limite de iteraÃ§Ãµes. |

---

## PARTE III â€” META-AUDITORIA E FEATURE NATIVA PARA IDE

### 3.1 DiagnÃ³stico do Sistema de Auditoria Atual

| Script | O que verifica | O que NÃƒO verifica | Profundidade |
|--------|---------------|-------------------|-------------|
| `enforce-document-flow.js` | Registry, classificaÃ§Ã£o, realidade | Qualidade semÃ¢ntica, links, consistÃªncia cruzada | **MÃ©dia** |
| `gap-check.js` | 14 gaps (existÃªncia de arquivos/deps) | ResoluÃ§Ã£o funcional de gaps | **Superficial** |
| `verify.js` | Placeholders em 4 arquivos | Todos os outros 100+ .md | **MÃ­nima** |
| `check-boundaries.js` | Imports vs mÃ³dulos permitidos | DependÃªncias circulares, isolamento runtime | **MÃ©dia** |
| `check-portability.js` | 8 padrÃµes proibidos | Path handling cross-platform em runtime | **MÃ­nima** |
| `scripts/audit/check-*.ts` | 12 checks (existÃªncia, imports vazios, TODOs) | ValidaÃ§Ã£o semÃ¢ntica | **MÃ­nima** |
| `ledger.js` | Integridade hash-chain do `ledger.jsonl` | ValidaÃ§Ã£o semÃ¢ntica de eventos | **Robusta** (tamper-evident) |
| `audit-trail/src/audit-trail.ts` | Append-only log com rotaÃ§Ã£o | Conectividade com EventBus | **Boa** (mas isolada) |

### 3.2 Fontes de Dados de Auditoria â€” EstÃ£o Realmente Povoadas?

| Fonte | Arquivo | Povoado? | ConfiÃ¡vel? | Queryable em tempo real? |
|-------|---------|----------|-----------|-------------------------|
| Ledger JSONL | `.ai/audit/ledger.jsonl` | **Sim** (149 entries) | **Sim** (hash-chain) | **NÃ£o** (file-based) |
| Timeline JSONL | `.ai/audit/timeline.jsonl` | **Sim** (26 entries, payload mÃ­nimo) | **Parcial** (sÃ³ 1Âª entry tem metadata) | **NÃ£o** (file-based) |
| AuditTrail | (instÃ¢ncia de classe) | **NÃ£o** â€” sem file path conectado ao EventBus | N/A | Poderia ser |
| EventBus history | In-memory | **TemporÃ¡rio** (max 1000, lost on restart) | Sim enquanto roda | **Sim** |
| TraceRegistry | In-memory | **NÃ£o** â€” sem chamadas a `link()` | N/A | Poderia ser |
| Error Catalog | `.ai/errors/error-catalog.md` | **Sim** (9 codes) mas **estÃ¡tico** | **NÃ£o** (markdown nÃ£o parseÃ¡vel) | **NÃ£o** |
| Coverage History | `.ai-devkit/coverage-history.json` | **NÃ£o** â€” array vazio | N/A | N/A |

### 3.3 Gaps CrÃ­ticos do Sistema Atual

1. **SEM monitoramento em tempo real** â€” todos checks sÃ£o CLI-driven, single-shot
2. **SEM integraÃ§Ã£o com IDE** â€” sem webview, sidebar, status bar
3. **SEM observaÃ§Ã£o contÃ­nua** â€” sem file watcher, sem reavaliaÃ§Ã£o por evento
4. **SEM persistÃªncia entre execuÃ§Ãµes** â€” resultados sÃ£o stdout, nÃ£o queryable
5. **SEM pendÃªncias acionÃ¡veis** â€” violaÃ§Ãµes vÃ£o para console, nÃ£o rastreadas
6. **SEM dashboard/visualizaÃ§Ã£o** â€” `coverage-tracker.ts` Ã© o mais prÃ³ximo, gera markdown
7. **SEM histÃ³rico de mÃ©tricas** â€” sem anÃ¡lise de tendÃªncia, regressÃ£o, alertas
8. **AuditTrail NÃƒO estÃ¡ conectado ao EventBus** â€” dois sistemas isolados
9. **Error catalog Ã© markdown estÃ¡tico** â€” sem enforcement, sem runtime lookup

---

## PARTE IV â€” QUICK WINS IMEDIATOS

### QW1: Conectar AuditTrail ao EventBus (~2h)

**Arquivo**: `packages/event-bus/src/event-bus.ts`

No mÃ©todo `emit()`, apÃ³s construir `fullEvent`:
```typescript
if (this.auditTrail) {
  this.auditTrail.append({
    actor: { type: 'system', id: event.source },
    eventType: event.type,
    target: event.source,
    decision: 'approved',
    result: 'success',
    metadata: { payload: event.payload }
  });
}
```
Isso torna todo o fluxo de eventos auditÃ¡vel.

### QW2: Converter Scripts `.ai/bin/` em Bibliotecas (~4h)

**Arquivos**: `enforce-document-flow.js`, `gap-check.js`, `check-boundaries.js`, etc.

Cada script jÃ¡ tem funÃ§Ãµes internas. Basta exportÃ¡-las:
```javascript
module.exports = {
  checkRegistryExists, checkClassification, checkReality,
  findConflicts, checkMasterPlan, checkBacklog, ...
};
```
Isso permite `audit-engine/src/checkers/` importÃ¡-las diretamente.

### QW3: Enriquecer Timeline Payloads (~30min)

**Arquivo**: `.ai/audit/timeline.jsonl`

Adicionar `event_type` e `actor` a TODAS as entries (hoje sÃ³ a 1Âª tem).

### QW4: Adicionar VerificaÃ§Ã£o do Ledger no Pipeline (~2h)

**Arquivo**: `scripts/audit/run-audit.ts`

```typescript
import { verifyLedger } from '../../.ai/bin/ledger.js';
const result = verifyLedger();
if (!result.valid) {
  console.error(`[check-ledger] LEDGER CORROMPIDO: ${result.message}`);
  process.exit(1);
}
```

### QW5: Agregador de RelatÃ³rio de Auditoria (~3h)

**Arquivo novo**: `scripts/audit/consolidate.ts`

1. Roda todos os 12 checks
2. LÃª `ledger.jsonl` e `timeline.jsonl`
3. LÃª `coverage-history.json`
4. Mescla em `.ai/audit/consolidated-report.json`
5. Emite pendÃªncias crÃ­ticas como markdown checklist

### QW6: PersistÃªncia de PendÃªncias (~4h)

**Arquivo novo**: `.ai/audit/pendencias.jsonl` + `PendenciaStore`

```typescript
class PendenciaStore {
  append(p: Pendencia): void
  query(filter): Pendencia[]
  resolve(id: string): void
  count(): { open: number, bySeverity: Record<string, number> }
}
```

### QW7: Alerta de Delta de Cobertura (~2h)

**Arquivo**: `coverage-tracker.ts`

1. Ler entry anterior de `coverage-history.json`
2. Se cobertura caiu >1pp â†’ pendÃªncia crÃ­tica
3. Se caiu >3pp â†’ exit code 1

**Summary**: ~17.5h para um sistema funcional de auditoria contÃ­nua.

---

## PARTE V â€” ESPECIFICAÃ‡ÃƒO TÃ‰CNICA: AUDIT ENGINE

### 5.1 Arquitetura Proposta

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  IDE (Web-UI)                                                     â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚ Audit Panel      â”‚  â”‚ Status Bar   â”‚  â”‚ Notifications      â”‚ â”‚
â”‚  â”‚ (WebView/HTML)   â”‚  â”‚ (badge)      â”‚  â”‚ (toast/alert)      â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
            â”‚ WebSocket         â”‚                     â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Audit Engine  (packages/audit-engine/ â€” NOVO)                   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚ Watcher  â”‚ â”‚ Checker  â”‚ â”‚ Reporter â”‚ â”‚ PendÃªncia Engine  â”‚   â”‚
â”‚  â”‚ (FS +    â”‚ â”‚ (run all â”‚ â”‚ (emit    â”‚ â”‚ (track + suggest) â”‚   â”‚
â”‚  â”‚  Event)  â”‚ â”‚  checks) â”‚ â”‚  Event)  â”‚ â”‚                   â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚            â”‚            â”‚                 â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Data Layer (EXISTENTE)                                          â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚ EventBus  â”‚ â”‚AuditTrailâ”‚ â”‚TraceReg.   â”‚ â”‚ JSONL Files   â”‚   â”‚
â”‚  â”‚ (in-mem)  â”‚ â”‚ (JSONL)  â”‚ â”‚(in-mem)    â”‚ â”‚(ledger+penden â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 5.2 Watcher (`audit-engine/src/watcher.ts`)

- `chokidar` watcher em source files, `.ai/` config, `packages/*/` structure
- Re-checks debounced (300ms) on file-save, file-create, file-delete
- Subscribes a `EventBus` para `code.changed`, `task.completed`, `cycle.completed`

### 5.3 Checker Registry (`audit-engine/src/checkers/`)

| Checker | Source | Trigger |
|---------|--------|---------|
| `boundary-checker` | `check-boundaries.js` (ported) | On file save |
| `portability-checker` | `check-portability.js` (ported) | On file save |
| `contract-checker` | `check-contracts.ts` (ported) | On file save |
| `gap-checker` | `gap-check.js` (ported) | On config change |
| `doc-flow-checker` | `enforce-document-flow.js` (ported) | On doc change |
| `import-checker` | `check-imports.ts` (ported) | On file save |
| `todo-checker` | NEW â€” TODO/FIXME em staged files | On file save |
| `complexity-checker` | NEW â€” complexidade ciclomÃ¡tica | On file save |
| `coverage-trend-checker` | NEW â€” delta coverage history | On test run |
| `dependency-rot-checker` | NEW â€” dependencies desatualizadas | Daily |
| `ledger-verifier` | `ledger.js` `verifyLedger()` | Every audit |
| `timeline-validator` | NEW â€” valida campos obrigatÃ³rios | On append |

### 5.4 PendÃªncia Engine (`audit-engine/src/pendencias/`)

```typescript
interface Pendencia {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;          // 'boundary' | 'portability' | 'contract' | 'ledger'
  checkName: string;
  message: string;
  filePath?: string;
  line?: number;
  suggestedFix?: string;
  autoFixCommand?: string;
  createdAt: string;
  resolvedAt?: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  source: 'continuous' | 'manual' | 'ci';
}
```

Persistido em `.ai/audit/pendencias.jsonl`. ResoluÃ§Ã£o automÃ¡tica: se re-check passar, marca como `resolved`.

### 5.5 MÃ©tricas Coletadas em Tempo Real

- Total de arquivos auditados, total de pendÃªncias por severidade
- Taxa de aprovaÃ§Ã£o por checker (Ãºltimas 24h / 7d / total)
- Tempo mÃ©dio de resoluÃ§Ã£o de pendÃªncias
- Delta de cobertura por commit
- Contagem de violaÃ§Ãµes de boundary (tendÃªncia)
- Progresso de gaps (G1-G21 resolvidos/total)
- Integridade do ledger (pass/fail)
- Completude da timeline (% entries com metadata)

### 5.6 Dashboard UI Mock

```
Audit Dashboard (sidebar da IDE)
â”œâ”€â”€ Status Bar: "ðŸ”´ 3 critical | ðŸŸ  7 high | ðŸŸ¡ 12 medium"
â”œâ”€â”€ Summary Cards
â”‚   â”œâ”€â”€ PendÃªncias by Severity (grÃ¡fico de barras)
â”‚   â”œâ”€â”€ Pass Rate by Checker (tabela com sparkline)
â”‚   â””â”€â”€ Coverage Trend (linha do tempo)
â”œâ”€â”€ PendÃªncia List (filtrÃ¡vel)
â”‚   â”œâ”€â”€ [ðŸ”´] Boundary: X/src/Y.ts importa Z
â”‚   â”‚   â””â”€â”€ Suggestion: Mover para X/src/infra/
â”‚   â”œâ”€â”€ [ðŸŸ ] Gap G5: LSP incomplete (missing WS provider)
â”‚   â”‚   â””â”€â”€ Suggestion: Criar packages/cli/src/ide/lsp-bridge.ts
â”‚   â””â”€â”€ ...
â”œâ”€â”€ Timeline (eventos recentes do AuditTrail)
â””â”€â”€ Action Buttons
    â”œâ”€â”€ "Run Full Audit Now"
    â”œâ”€â”€ "Fix All Auto-Fixable"
    â””â”€â”€ "Acknowledge Selected"
```

### 5.7 APIs a Construir

| Endpoint | PropÃ³sito |
|----------|-----------|
| `audit-engine/run` | Trigger full audit manual |
| `audit-engine/status` | Get current metrics (poll/WS) |
| `audit-engine/pendencias` | Get pendÃªncia list |
| `audit-engine/pendencias/:id/ack` | Acknowledge |
| `audit-engine/pendencias/:id/dismiss` | Dismiss |
| `audit-engine/autofix` | Apply auto-fix |
| `audit-engine/subscribe` | EventBus subscription for updates |

### 5.8 IntegraÃ§Ã£o com Pacotes Existentes

| Pacote | FunÃ§Ã£o no Audit Engine |
|--------|------------------------|
| `packages/event-bus/` | **Sistema nervoso central** â€” emitir e subscrever eventos de auditoria |
| `packages/audit-trail/` | **Armazenamento permanente** â€” conectar `AuditTrail.append()` a cada evento |
| `packages/trace-registry/` | **Linkar pendÃªncias ao cÃ³digo** â€” `this violation implements rule G5` |
| `packages/ide-integration/` | **Bridge UI** â€” WebViewPanel para dashboard |
| `packages/web-ui/` | **Dashboard UI** â€” reuso de Monaco, chart libs |
| `packages/contracts/` | **Tipos compartilhados** â€” `Pendencia`, `AuditEvent`, `CheckResult` |

---

## ðŸ“Š RESUMO DE ACHADOS

### Por Severidade

| Grupo | CRÃTICO | HIGH | MEDIUM | LOW | Total |
|-------|:-------:|:----:|:------:|:---:|:-----:|
| Fluxo de Dados (F) | 3 | 7 | 12 | 2 | 24 |
| SeguranÃ§a IDE (S) | 7 | 7 | 8 | 1 | 23 |
| Cadeia de Prompts (P) | 2 | 4 | 4 | 0 | 10 |
| Quick Wins (QW) | â€” | â€” | â€” | â€” | 7 propostas |
| **Total** | **12** | **18** | **24** | **3** | **57 + 7 propostas** |

### TOP 10 Mais Urgentes

| # | ID | Arquivo | Problema |
|:-:|:--:|---------|----------|
| 1 | S1 | `terminal-bridge.ts:28-45` | Blacklist de comandos â€” RCE irrestrito |
| 2 | S2 | `sandbox.ts:39-64` | Sandbox JS escapa via prototype chain |
| 3 | S5 | `api-router.ts:601,649` | InjeÃ§Ã£o de comando via `execSync` |
| 4 | F29 | `cli/package.json:35-41` | DependÃªncias `@ideia/*` nÃ£o declaradas |
| 5 | F23 | `ide-server.ts:189-234` | EventBus â‰  IDE WebSocket â€” completamente desconectados |
| 6 | F12 | `observability.ts:134-167` | `recordAutoTrace()` no `exit` hook â€” 100% perdido |
| 7 | F14 | `memory-store.ts:60-91` | Arquivo corrompido â†’ todo histÃ³rico perdido |
| 8 | S6 | `chat.ts:206` | API key em texto plano + HTTP puro |
| 9 | P1 | mÃºltiplos | 4 entry points de LLM fragmentados |
| 10 | F23+F30 | event-bus + contracts | TrÃªs sistemas de eventos paralelos e incompatÃ­veis |
