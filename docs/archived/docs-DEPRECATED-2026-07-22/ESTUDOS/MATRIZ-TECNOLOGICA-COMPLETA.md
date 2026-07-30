# Matriz Tecnológica Completa — Projeto IDEIA (ai-devkit → Plataforma IDEIA)

> **Data:** 2026-07-17 | **Versão:** 1.0
> **Propósito:** Mapeamento exaustivo de todas as tecnologias relevantes, conexões, contratos, empilhamentos e cruzamentos de dados para a plataforma IDEIA — IDE que transforma ideias em soluções.
> **Base:** Código-fonte ai-devkit v2 (60+ packages, 130+ CLI commands, 20 IDE components, 30 API endpoints) + pesquisa estado-da-arte 2025-2026

---

## Sumário

1. [Categoria A: Editor e IDE](#categoria-a-editor-e-ide)
2. [Categoria B: IA e LLMs](#categoria-b-ia-e-llms)
3. [Categoria C: Modelos (SLMs, código, raciocínio)](#categoria-c-modelos-slms-código-raciocínio)
4. [Categoria D: Memória e Conhecimento](#categoria-d-memória-e-conhecimento)
5. [Categoria E: Mensageria e Eventos](#categoria-e-mensageria-e-eventos)
6. [Categoria F: Segurança e Governança](#categoria-f-segurança-e-governança)
7. [Categoria G: CI/CD e Deploy](#categoria-g-cicd-e-deploy)
8. [Categoria H: Observabilidade](#categoria-h-observabilidade)
9. [Categoria I: Armazenamento e Dados](#categoria-i-armazenamento-e-dados)
10. [Categoria J: Desktop e Interface](#categoria-j-desktop-e-interface)
11. [Categoria K: Comunicação entre Agentes](#categoria-k-comunicação-entre-agentes)
12. [Matriz de Conexões e Stacking Final](#matriz-de-conexões-global)

---

## Convenções e Legenda

### Status
| Ícone | Significado |
|-------|-------------|
| ✅ | Implementado e funcional |
| 🟡 | Esqueleto / parcial / não integrado |
| ❌ | Não existe |
| 📖 | Estudado, documentado |
| 🔬 | Não estudado |

### Maturidade
| Nível | Significado |
|-------|-------------|
| Madura | Produção comprovada, ecossistema grande |
| Emergente | Adoção crescente, padrões em formação |
| Experimental | Pré-produção, pesquisa ativa |

### Prioridade para IDEIA
| Prioridade | Significado |
|------------|-------------|
| P0 | Crítico — sem isso o produto não funciona |
| P1 | Essencial — diferenciação central |
| P2 | Importante — pós-MVP imediato |
| P3 | Desejável — roadmap v2+ |

---

## Categoria A: Editor e IDE

### A1. Eclipse Theia

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Framework de IDE open-source (Eclipse Foundation). Mesma arquitetura do VS Code (Monaco, LSP, extensions) mas projetado para customização profunda e white-label. Cloud-ready (Theia Blueprint). |
| **Status** | 📖 Estudado em `theia-research-report.md`. Não adotado — optou-se por Monaco puro + Vite por simplicidade. |
| **APIs** | Extension API (compatível VS Code ~80%), Plugin API própria, LSP/DAP nativo, Theia Cloud API. |
| **Contratos** | `extension.ts` manifest, `contributes` points (commands, views, menus), `vscode.d.ts` subset. |
| **Conexões** | Monaco Editor (core), LSP (nativo), DAP (nativo), VS Code extensions (parcial), xterm.js, Tree-sitter |
| **Stacking** | Electron ou Browser → Theia Shell → Monaco → Extensions → LSP/DAP |
| **Cross-ref** | Theia + Electron = desktop IDE; Theia + VS Code API = ecossistema de extensões |
| **Colaboração** | Theia Blueprint suporta multi-instância; Theia Cloud para workspaces compartilhados |
| **Maturidade** | Madura (Eclipse Foundation, 50+ adopters) |
| **Licença** | EPL-2.0 (open source) |
| **Prioridade** | P3 — substituto futuro se escala exigir |

---

### A2. VS Code (API, extensions)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Plataforma de extensões do VS Code. API completa para criar extensões: comandos, views, providers, language features. Padrão de facto para extensibilidade de IDEs. |
| **Status** | ✅ `vscode-extension/` com 24 comandos, 3 views, keybindings. Uso limitado (não é o foco primário). |
| **APIs** | `vscode.ExtensionContext`, `vscode.languages.*`, `vscode.window.*`, `vscode.workspace.*`, `vscode.commands.*` |
| **Contratos** | `package.json` (contributes), `vscode.d.ts` (types), ActivationEvents |
| **Conexões** | Monaco Editor (mesma API subjacente), LSP, DAP, Debugger |
| **Stacking** | VS Code → Extension → Language Server → LSP → Monaco |
| **Cross-ref** | Marketplace `publisher.name` como identificador único de extensões |
| **Colaboração** | Live Share (Microsoft), multi-cursor remoto; extensions operam por workspace isolado |
| **Maturidade** | Madura (mercado de 60K+ extensões) |
| **Licença** | MIT (VS Code é MIT; Marketplace é proprietário) |
| **Prioridade** | P2 — compatibilidade com ecossistema VS Code |

---

### A3. Monaco Editor

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Editor de código web-based que alimenta VS Code. Suporte a 80+ linguagens, syntax highlighting, IntelliSense, minimap, code folding, multi-cursor, diff editor. |
| **Status** | ✅ Core do `EditorMode.tsx`. 20 linguagens configuradas. `@monaco-editor/react` v4.6.0 + `monaco-editor` v0.52.0. Minimap, folding, tabs, dirty state, Ctrl+S operacionais. |
| **APIs** | `editor.create()`, `IDisposable`, `editor.IStandaloneCodeEditor`, `languages.registerCompletionProvider`, `languages.registerHoverProvider`, `languages.registerDocumentFormattingEditProvider`, `DiffEditor` |
| **Contratos** | `IMarkerData` (code, severity, message, source, startLineNumber, startColumn, endLineNumber, endColumn), `CompletionItemProvider`, `HoverProvider`, `DocumentFormattingEditProvider` |
| **Conexões** | LSP (via providers custom), Tree-sitter (parsing), xterm.js (terminal), React (wrapper), DiffEngine (diff preview) |
| **Stacking** | React → Monaco Editor → Language Providers → LSP Client → Language Server |
| **Cross-ref** | Monaco markers ↔ ProblemsPanel; cursor ↔ StatusBar; model ↔ FileExplorer |
| **Colaboração** | `editor.getModel()` compartilhado; `monaco-editor#IEditor` por instância |
| **Maturidade** | Madura (VS Code, 50M+ devs) |
| **Licença** | MIT |
| **Prioridade** | P0 — core do editor |

---

### A4. CodeMirror

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Editor de código extensível para web. Mais leve que Monaco (40KB vs 2MB). Lezer parser system. |
| **Status** | ❌ Não implementado. |
| **APIs** | `EditorView`, `StateEffect`, `StateField`, `Compartment`, `Extension`, `Transaction`, `ViewPlugin` |
| **Contratos** | `EditorState`, `TransactionSpec`, `SelectionRange`, `SyntaxNode` (Lezer) |
| **Conexões** | Lezer (parser), LSP (via `codemirror-languageserver`), Tree-sitter (via extensão), React |
| **Stacking** | CodeMirror → Lezer → Language Extensions → LSP (opcional) |
| **Cross-ref** | Lezer parse tree ↔ Tree-sitter; mais leve para embarcar em chat |
| **Colaboração** | `codemirror-collab` para edição colaborativa real-time |
| **Maturidade** | Madura (v6, 17K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P2 — substituto leve para chat code blocks |

---

### A5. xterm.js

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Emulador de terminal VT100/xterm para browser. ANSI escape codes, 256 cores, clipboard, seleção. |
| **Status** | ✅ `@xterm/xterm` v6.0.0 + `@xterm/addon-fit` no `package.json`. Terminal.tsx implementa. Migração para xterm.js identificada como obrigatória no MVP. |
| **APIs** | `Terminal`, `ITerminalOptions`, `Terminal.onData()`, `Terminal.write()`, `Terminal.fit()`, `Addon` |
| **Contratos** | `IDataEvent` (onData: string), `IInputEvent`, `IWindowOptions`, `ITerminalAddon` |
| **Conexões** | `node-pty` (backend PTY), WebSocket (transporte), Shell |
| **Stacking** | Browser → xterm.js → WebSocket → node-pty → Shell |
| **Cross-ref** | xterm.js output ↔ TerminalPanel; input ↔ POST /api/shell |
| **Colaboração** | Single-instância; multi-tab via múltiplas instâncias |
| **Maturidade** | Madura (VS Code, 18K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P0 — MVP obrigatório |

---

### A6. node-pty

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Fork PTY (pseudoterminal) para Node.js. Cria processos com terminal real, Ctrl+C, resize. |
| **Status** | 📖 Estudado. ❌ Não implementado. MVP obrigatório. |
| **APIs** | `spawn(file, args, options)`, `pty.write(data)`, `pty.resize(cols, rows)`, `pty.kill(signal)`, `pty.onData(cb)` |
| **Contratos** | `IPty`, `IPtyForkOptions` (name, cols, rows, cwd, env), `IEvent<string>` |
| **Conexões** | xterm.js (frontend), WebSocket (transporte), Shell |
| **Stacking** | WebSocket Server → node-pty → OS Shell; Client → xterm.js |
| **Cross-ref** | Processos ↔ Agent Security (policy); stdin ↔ input; stdout ↔ terminal |
| **Colaboração** | Um PTY por terminal instance; agrupamento por workspace |
| **Maturidade** | Madura (VS Code, 5K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P0 — MVP obrigatório |

---

### A7. LSP (Language Server Protocol)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Protocolo padrão (JSON-RPC 2.0) entre editor e servidor de linguagem. Autocomplete, hover, go-to-definition, diagnostics, refactoring. |
| **Status** | 🟡 `typescript-language-server` v5.3.0 + `vscode-languageclient` v10.1.0 no package.json. **Não integrado** — gap crítico. |
| **APIs** | `initialize`, `textDocument/completion`, `textDocument/definition`, `textDocument/hover`, `textDocument/documentSymbol`, `textDocument/codeAction`, `textDocument/formatting`, `textDocument/references`, `textDocument/rename` |
| **Contratos** | JSON-RPC 2.0. `InitializeParams`, `CompletionParams`, `PublishDiagnosticsParams` (uri, diagnostics[]), `ServerCapabilities`, `ClientCapabilities` |
| **Conexões** | Monaco Editor (via providers), Tree-sitter (parsing auxiliar), DAP (complementar), ProblemsPanel (diagnostics) |
| **Stacking** | Monaco → LSP Client → LSP Server (typescript-language-server, pyright, rust-analyzer) |
| **Cross-ref** | Diagnostics ↔ Monaco markers ↔ ProblemsPanel; Completions ↔ IntelliSense; Symbols ↔ OutlinePanel |
| **Colaboração** | Single-client por servidor; workspace isolado |
| **Maturidade** | Madura (80+ servidores LSP) |
| **Licença** | MIT (protocolo aberto) |
| **Prioridade** | P0 — diferenciação central |

---

### A8. DAP (Debug Adapter Protocol)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Protocolo JSON-RPC 2.0 para debug. Breakpoints, stepping, stack traces, variáveis, watches. |
| **Status** | 🟡 Esqueleto em diff-engine. ❌ Não integrado à IDE. Gap. |
| **APIs** | `launch`, `attach`, `setBreakpoints`, `stackTrace`, `variables`, `continue`, `next`, `stepIn`, `evaluate` |
| **Contratos** | `InitializeRequest`, `LaunchRequest`, `SetBreakpointsRequest`, `StoppedEvent`, `ContinuedEvent`, `OutputEvent` |
| **Conexões** | Monaco Editor (debug UI), LSP (complementar), Terminal (debug console) |
| **Stacking** | Monaco → DAP Client → DAP Server (node --inspect, debugpy, lldb) |
| **Cross-ref** | Breakpoints ↔ Monaco markers; Stack frames ↔ cursor; Variables ↔ Debug Hover |
| **Colaboração** | Single session por processo debugado; multi-thread via capabilities |
| **Maturidade** | Madura (Microsoft, 30+ adapters) |
| **Licença** | MIT (protocolo aberto) |
| **Prioridade** | P2 — pós-MVP |

---

### A9. Tree-sitter

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Parser incremental para ferramentas de código. AST concreta para 100+ linguagens. Parsing incremental O(n) com edições. |
| **Status** | 📖 Estudado. ❌ Não implementado. |
| **APIs** | `Parser`, `Parser.setLanguage()`, `Parser.parse()`, `Tree.edit()` (incremental), `Cursor`, `Query` (pattern matching) |
| **Contratos** | `SyntaxNode` (type, startPosition, endPosition, children, parent, text), `Point` (row, column), `Range`, `QueryMatch` |
| **Conexões** | Monaco (parsing incremental), LSP (cache de AST), CodeMirror (via Lezer), LLMs (contexto estrutural) |
| **Stacking** | Text Buffer → Tree-sitter → AST Cache → Monaco Highlight / AI Context |
| **Cross-ref** | AST ↔ Complexity analysis; AST ↔ AI context; AST ↔ Refactoring |
| **Colaboração** | Parsing apenas — editor gerencia árvores por documento |
| **Maturidade** | Madura (GitHub, 18K+ estrelas, 100+ linguagens) |
| **Licença** | MIT |
| **Prioridade** | P1 — análise de código contextual |

---

## Categoria B: IA e LLMs

### B1. OpenAI API (GPT-4o, o1, o3)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | APIs de LLMs da OpenAI. GPT-4o (multimodal líder), o1 (raciocínio), o3 (raciocínio avançado). Chat Completions, Assistants API, Embeddings. |
| **Status** | ✅ Provider em `local-ai/providers/openai-provider.ts`. Integrado ao Provider Router com fallback. `streamQuery()` implementado. |
| **APIs** | `POST /v1/chat/completions` (stream + nao-stream), `POST /v1/embeddings`, `POST /v1/moderations` |
| **Contratos** | `ChatCompletionRequestMessage` (role, content), `ChatCompletionResponse` (choices, usage), `StreamChunk` (delta, finish_reason) |
| **Conexões** | Provider Router, LangChain, Vercel AI SDK, Memory Store (embeddings) |
| **Stacking** | Chat UI → Provider Router → OpenAI Provider → GPT-4o/o1/o3 |
| **Cross-ref** | Embeddings ↔ Vector Store; Completions ↔ Memory; Moderations ↔ Security |
| **Colaboração** | Stateless API; Assistants API tem stateful threads |
| **Maturidade** | Madura (líder de mercado) |
| **Licença** | API comercial (pay-per-token) |
| **Prioridade** | P0 — provider primario cloud |

---

### B2. Anthropic API (Claude 3.5, 4)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | APIs Claude. 3.5 Sonnet/Haiku (equilibrio), Claude 4 (raciocinio avancado). Tool use, visao, 200K tokens. |
| **Status** | 🟡 Provider esqueleto. Interface `AiProvider` existe, implementacao incompleta. |
| **APIs** | `POST /v1/messages`, tool use integrado, `stream=true` (SSE) |
| **Contratos** | `Message` (role, content: TextBlock | ToolUseBlock | ToolResultBlock), `MessageDeltaEvent` |
| **Conexões** | Provider Router, MCP (Claude e nativo MCP), Vercel AI SDK |
| **Stacking** | Chat UI → Provider Router → Anthropic Provider → Claude |
| **Cross-ref** | Tool Use ↔ MCP tools; Long context ↔ Memory (summarization) |
| **Colaboração** | Stateless API |
| **Maturidade** | Madura (lider code generation) |
| **Licença** | API comercial |
| **Prioridade** | P1 — provider core pos-MVP |

---

### B3. Google Gemini API

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Modelos Gemini. 2.0 Flash (rapido), 2.5 Pro (raciocinio). Multimodal nativo, 1M+ tokens de contexto. |
| **Status** | 🔬 Nao estudado. ❌ Nao implementado. |
| **APIs** | `POST /v1/models/{model}:generateContent`, `:streamGenerateContent`, `:embedContent` |
| **Contratos** | `Content` (parts: Part[]), `Part` (text | inlineData | functionCall), `GenerateContentResponse` |
| **Conexões** | Provider Router (potencial), Google AI Studio |
| **Stacking** | Chat UI → Provider Router → Gemini Provider → Gemini |
| **Cross-ref** | Multimodal ↔ Image analysis; 1M contexto ↔ Full project analysis |
| **Colaboração** | Stateless API |
| **Maturidade** | Madura (Google, adocao crescente) |
| **Licença** | API comercial (free tier disponivel) |
| **Prioridade** | P2 — multimodal e contexto longo |

---

### B4. Ollama (local LLMs)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Plataforma local para LLMs. Suporta centenas de modelos. API REST compativel com OpenAI. GPU acceleration. |
| **Status** | ✅ Provider implementado e funcional. MVP obrigatorio. `ai model list/pull/remove` comandos CLI. |
| **APIs** | `POST /api/chat`, `POST /api/generate`, `POST /api/embeddings`, `GET /api/tags`, `POST /api/pull` |
| **Contratos** | `ChatRequest` (model, messages, stream, options), `EmbeddingRequest` (model, prompt) |
| **Conexões** | Provider Router (fallchain), local-ai providers, LangChain, Vercel AI SDK |
| **Stacking** | Chat UI → Provider Router → Ollama Provider → Ollama Server → Model (.gguf) |
| **Cross-ref** | Ollama models ↔ CLI ai model list; Embeddings ↔ Vector store; Chat ↔ ChatPanel SSE |
| **Colaboração** | Single server multi-model; cada modelo usa RAM dedicada |
| **Maturidade** | Madura (100K+ estrelas, 45M+ downloads) |
| **Licença** | MIT |
| **Prioridade** | P0 — MVP obrigatorio (offline) |

---

### B5. OpenRouter (multi-provider gateway)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Gateway unificado para 200+ LLMs. Cache, rate limiting, fallback automatico. |
| **Status** | 🔬 Nao estudado. ❌ Nao implementado. |
| **APIs** | `POST /api/v1/chat/completions` (compativel OpenAI) |
| **Contratos** | Compatível com OpenAI Chat Completions + cabecalhos `HTTP-Referer`, `X-Title` |
| **Conexões** | Provider Router (substituto ou complemento), Vercel AI SDK |
| **Stacking** | Chat UI → OpenRouter → Multiplos providers |
| **Cross-ref** | Costs tracking ↔ Budget control; Model availability ↔ Fallback chain |
| **Colaboração** | API stateless; multi-tenant natural |
| **Maturidade** | Emergente (200+ modelos) |
| **Licença** | API comercial (marcacao sobre providers) |
| **Prioridade** | P2 — roteamento multi-provider avancado |

---

### B6. LangChain / LangGraph

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Framework para aplicacoes LLM. LangChain: chains, RAG, agentes. LangGraph: grafos de estado multi-etapa. |
| **Status** | 📖 Estudado. 🟡 Provider Router tem logica similar a chains custom. LangChain nao e dependencia. |
| **APIs** | LangChain: `LLMChain`, `AgentExecutor`, `Tool`, `VectorStore`. LangGraph: `StateGraph`, `Node`, `Edge`, `Checkpoint` |
| **Contratos** | `ChainValues`, `AgentAction`, `BaseMessage` (content, role), `Document` (pageContent, metadata) |
| **Conexões** | OpenAI, Anthropic, Ollama, ChromaDB, Pinecone, Weaviate, Qdrant, Neo4j, SQLite, Redis, MCP |
| **Stacking** | LangChain/LangGraph → Provider → Memory → Tools (MCP, APIs) |
| **Cross-ref** | Chains ↔ Task Runner; LangGraph State ↔ Agent Runtime; Tools ↔ MCP |
| **Colaboração** | LangGraph: checkpoints e state persistence; multi-agent via Team |
| **Maturidade** | Madura (100K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P2 — adotar se necessidade de graphs complexos crescer |

---

### B7. CrewAI

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Framework multi-agente. Agentes com papeis, objetivos, tarefas e equipes. Processos sequenciais e hierarquicos. |
| **Status** | 📖 Estudado. ❌ Nao implementado. |
| **APIs** | `Agent` (role, goal, backstory, tools), `Task` (description, expected_output), `Crew` (agents, tasks, process) |
| **Contratos** | `Agent`, `Task`, `CrewOutput` (raw, json, tasks_output) |
| **Conexões** | LangChain (tools), OpenAI/Anthropic/Ollama (LLMs) |
| **Stacking** | Crew → Agents → Tasks → LLM + Tools |
| **Cross-ref** | Agent setup ↔ Agent Registry; Task outputs ↔ pipeline stages |
| **Colaboração** | Multi-agente nativo; agentes delegam entre si |
| **Maturidade** | Emergente (25K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P3 — multi-agente pos-v2 |

---

### B8. AutoGen / AG2

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Framework multi-agente conversacional (Microsoft). Agentes conversam para resolver tarefas. |
| **Status** | 📖 Estudado. ❌ Nao implementado. |
| **APIs** | `ConversableAgent`, `AssistantAgent`, `UserProxyAgent`, `GroupChat`, `GroupChatManager` |
| **Contratos** | `AgentMessage`, `ChatResult` (chat_history, cost, summary) |
| **Conexões** | LangChain, MCP, OpenAI/Anthropic/Ollama |
| **Stacking** | AutoGen → Agent Team → GroupChat → LLM + Functions |
| **Cross-ref** | Multi-agent conversation ↔ IDE chat panel; Agent roles ↔ CLI agents |
| **Colaboração** | Multi-agente conversacional; GroupChat para equipes |
| **Maturidade** | Emergente (35K+ estrelas) |
| **Licença** | MIT (CC Apache 2.0 AG2) |
| **Prioridade** | P3 — referencia multi-agente |

---

### B9. Semantic Kernel

| Campo | Detalhes |
|-------|----------|
| **Descrição** | SDK Microsoft para integracao de IA. Planejamento automatico, memoria semantica, kernel com plugins. |
| **Status** | 🔬 Nao estudado. ❌ Nao implementado. |
| **APIs** | `Kernel`, `KernelFunction`, `Plugin`, `Memory`, `Planner`, `ChatHistory` |
| **Contratos** | `FunctionResult`, `MemoryRecord`, `Plan`, `ChatMessageContent` |
| **Conexões** | OpenAI/Azure, Qdrant/ChromaDB (memory) |
| **Stacking** | Semantic Kernel → Plugins → Memory → Planner → LLM |
| **Cross-ref** | Planner ↔ Task Runner; Memory ↔ Memory Store; Plugins ↔ MCP |
| **Colaboração** | Single-kernel; multi-agent via AgentFactory (experimental) |
| **Maturidade** | Emergente (Microsoft, 22K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P3 — alternativa LangChain |

---

### B10. Vercel AI SDK

| Campo | Detalhes |
|-------|----------|
| **Descrição** | SDK Vercel para integracao de IA em React/Next.js. Streaming, tool calls, geracao estruturada, multi-provider. |
| **Status** | 🔬 Nao estudado. ❌ Nao implementado. Alinhamento natural: IDE e React 18 + Vite. |
| **APIs** | `streamText()`, `generateText()`, `streamUI()`, `tool()`, `generateObject()` |
| **Contratos** | `CoreMessage` (role, content: TextPart | ToolCallPart | ToolResultPart), `StreamResult` |
| **Conexões** | OpenAI, Anthropic, Google, Ollama, OpenRouter; React/Next.js |
| **Stacking** | React App → Vercel AI SDK → Provider |
| **Cross-ref** | `streamText()` ↔ SSE Chat; `streamUI()` ↔ ChatPanel; `tool()` ↔ MCP |
| **Colaboração** | SDK frontend — colaboracao via state management |
| **Maturidade** | Madura (Vercel, 20K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P1 — streaming chat (MVP) |

---

### B11. Genkit

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Framework Google para apps com IA. Multi-provider, plugins, tracing nativo, Firebase. |
| **Status** | 🔬 Nao estudado. ❌ Nao implementado. |
| **APIs** | `generate()`, `defineFlow()`, `defineTool()`, `definePrompt()`, `retriever`, `indexer`, `trace()` |
| **Contratos** | `GenerateRequest`, `GenerateResponse`, `Flow` (input/output schemas), `Tool` |
| **Conexões** | Gemini, OpenAI, Anthropic; Firebase, Google Cloud |
| **Stacking** | Genkit → Flow/Tool/Retriever → Provider → LLM |
| **Cross-ref** | Flows ↔ Workflow Engine; Tracing ↔ Observability; Tools ↔ MCP |
| **Colaboração** | Firestore-based state para flows assincronos |
| **Maturidade** | Emergente (Google, ~5K estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P3 — alternativa Vercel AI SDK c/ foco Google Cloud |

---

## Categoria C: Modelos (SLMs, codigo, raciocinio)

### C1. Phi-4-mini / Phi-4 (Microsoft)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | SLMs Microsoft. Phi-4-mini (3.8B): qualidade superior a modelos 10x maiores. Phi-4 (14B): raciocinio e codigo. Treinados com dados sinteticos. |
| **Status** | 🔬 Nao estudado formalmente. ✅ Suportado via Ollama (phi4, phi4-mini). |
| **APIs** | ChatML format (Ollama), OpenAI-compatible API. Contexto 128K tokens. |
| **Contratos** | Modelo GGUF → Ollama → Provider Router |
| **Conexões** | Ollama, Provider Router, LangChain |
| **Stacking** | Ollama → Phi-4-mini → Chat/Code tasks |
| **Cross-ref** | Phi-4-mini para edge/offline ↔ Terminal tasks; Phi-4 para code gen ↔ Engineer |
| **Colaboração** | Single-model; execucao local por maquina |
| **Maturidade** | Emergente (Microsoft Research, 2025) |
| **Licença** | MIT (pesquisa); comercial via Azure |
| **Prioridade** | P1 — SLM lider para execucao local |

---

### C2. Qwen2.5-Coder / Qwen3 (Alibaba)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Qwen2.5-Coder (1.5B-32B): especializado em codigo. Qwen3 (0.5B-235B): proposito geral com raciocinio. 128K+ tokens. |
| **Status** | 🔬 Nao estudado. ✅ Suportado via Ollama. |
| **APIs** | OpenAI-compatible (Ollama). Qwen3 suporta thinking mode nativo. |
| **Contratos** | Modelo GGUF → Ollama → Provider Router |
| **Conexões** | Ollama, Provider Router |
| **Stacking** | Ollama → Qwen2.5-Coder → Code generation |
| **Cross-ref** | Qwen2.5-Coder para code ↔ Engineer pipeline; Qwen3 reasoning ↔ Planner |
| **Colaboração** | Single-model; execucao local |
| **Maturidade** | Emergente (Alibaba, estado-da-arte codigo) |
| **Licença** | Apache 2.0 (Qwen2.5); Tongyi Qianwen (Qwen3) |
| **Prioridade** | P1 — melhor custo/performance para codigo |

---

### C3. DeepSeek-Coder-V2 / DeepSeek-R1

| Campo | Detalhes |
|-------|----------|
| **Descrição** | DeepSeek-Coder-V2 (16B/236B MoE): topo rankings codigo (HumanEval 92.1%). DeepSeek-R1: raciocinio com CoT explicito. |
| **Status** | 🔬 Nao estudado. ✅ Suportado via Ollama. |
| **APIs** | OpenAI-compatible (Ollama). R1: thinking blocos no output. |
| **Contratos** | Modelo GGUF → Ollama → Provider Router |
| **Conexões** | Ollama, Provider Router, LangChain |
| **Stacking** | Ollama → DeepSeek-Coder-V2 → Code tasks; R1 → Complex reasoning |
| **Cross-ref** | R1 reasoning ↔ Explanation engine; Coder-V2 ↔ Task Runner (code gen) |
| **Colaboração** | Single-model; execucao local |
| **Maturidade** | Emergente (DeepSeek, lider rankings codigo) |
| **Licença** | MIT |
| **Prioridade** | P1 — melhor modelo code local |

---

### C4. Llama 3.2, 3.3, 4 (Meta)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Familia Llama. 3.2 (1B-90B): multimodal, lightweight. 3.3 (70B): fine-tune. Llama 4 (2025): MoE, 17B-2T. |
| **Status** | 🔬 Nao estudado. ✅ Suportado via Ollama. |
| **APIs** | OpenAI-compatible (Ollama). Tool use nativo. |
| **Contratos** | Modelo GGUF → Ollama → Provider Router |
| **Conexões** | Ollama, Provider Router, LangChain, Vercel AI SDK |
| **Stacking** | Ollama → Llama → Chat/Code tasks |
| **Cross-ref** | Llama 3.2 vision ↔ Multimodal; Llama 4 MoE ↔ Model Router |
| **Colaboração** | Single-model; variacoes chat e instruct |
| **Maturidade** | Madura (Meta, 500M+ downloads) |
| **Licença** | Llama Community License (3.2/3.3); Llama 4 Custom |
| **Prioridade** | P1 — maior ecossistema, fine-tuning disponivel |

---

### C5. Gemma 3 (Google)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | SLM Google baseado em Gemini. 2B-27B. Performance superior a Llama-3.1-8B. Eficiencia local. |
| **Status** | 🔬 Nao estudado. ✅ Suportado via Ollama (gemma3). |
| **APIs** | OpenAI-compatible (Ollama) |
| **Contratos** | Modelo GGUF → Ollama → Provider Router |
| **Conexões** | Ollama, Provider Router |
| **Stacking** | Ollama → Gemma 3 → Edge/offline tasks |
| **Cross-ref** | Comparacao com Phi-4-mini ↔ SLM benchmark |
| **Colaboração** | Single-model |
| **Maturidade** | Emergente (Google, 2025) |
| **Licença** | Gemma License (Apache 2.0) |
| **Prioridade** | P2 — SLM alternativa ao Phi-4 |

---

### C6. Mistral / Codestral / Mixtral

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Familia Mistral AI. Codestral: especializado em codigo. Mixtral 8x7B/8x22B: MoE. |
| **Status** | 🔬 Nao estudado. ✅ Suportado via Ollama. |
| **APIs** | OpenAI-compatible (Ollama, API Mistral). FIM (Fill-in-the-Middle) nativo. |
| **Contratos** | `ChatCompletionRequest`, `FIMRequest`, `EmbeddingRequest` |
| **Conexões** | Ollama, Provider Router, API Mistral |
| **Stacking** | Ollama → Codestral → Code completion (FIM); Mixtral → General tasks |
| **Cross-ref** | FIM ↔ Monaco inline completion; MoE ↔ Provider Router (expert routing) |
| **Colaboração** | Single-model |
| **Maturidade** | Madura (Mistral AI, 15K+ estrelas) |
| **Licença** | Apache 2.0 (Mistral, Mixtral); Codestral: pesquisa |
| **Prioridade** | P2 — FIM e diferencial para editor |

---

### C7. StarCoder2 (Hugging Face)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Modelo code open-source (HF + ServiceNow + NVIDIA). 3B-15B. 619 linguagens, licencas permissivas. |
| **Status** | 🔬 Nao estudado. ✅ Suportado via Ollama. |
| **APIs** | OpenAI-compatible (Ollama). FIM nativo. |
| **Contratos** | Modelo GGUF → Ollama → Provider Router |
| **Conexões** | Ollama, Provider Router |
| **Stacking** | Ollama → StarCoder2 → Code completion / generation |
| **Cross-ref** | The Stack dataset (treinamento) ↔ SBOM |
| **Colaboração** | Single-model |
| **Maturidade** | Emergente (HF, 5K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P2 — modelo code aberto sem restricoes |

---

### C8. Mamba-2 / Mamba-2-Hybrid (SSM)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Modelos baseados em State Space Models. Mamba-2: eficiencia quadratica→linear. Hybrid: SSM + Attention. Contexto 256K+, inference 5x mais rapida. |
| **Status** | 🔬 Nao estudado. ❌ Nao implementado (requer engine especializada). |
| **APIs** | API especifica `state-spaces/mamba`. CKPT PyTorch, nao GGUF. |
| **Contratos** | `.pt` ou `.safetensors`; inference via Python `mamba_ssm` |
| **Conexões** | Python sidecar, LangChain (via custom LLM) |
| **Stacking** | Python Sidecar → Mamba-2 → Hybrid SSM → Long context tasks |
| **Cross-ref** | SSM arquitetura ≠ Transformer ↔ Provider Router |
| **Colaboração** | Single-model; inference batch |
| **Maturidade** | Experimental (pesquisa SSM) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P3 — pesquisa, contexto muito longo |

---

## Categoria D: Memoria e Conhecimento

### D1. Neo4j (knowledge graph)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Banco de grafos lider. Query Cypher, ACID, indices GDS. Ideal para requisitos->codigo->decisoes->riscos. |
| **Status** | ❌ Nao implementado. Recomendado como evolucao em estudo MEMORIA-E-CONTEXTO. |
| **APIs** | Bolt Protocol, HTTP API, `neo4j-driver` (JS), Cypher, GraphQL (`@neo4j/graphql`), LangChain Neo4jGraph |
| **Contratos** | `Node` (id, labels, properties), `Relationship` (type, properties), `Path`, `Record` |
| **Conexões** | LangChain (GraphRAG), Memory Store, Microsoft GraphRAG, Vector Store |
| **Stacking** | Neo4j → GraphRAG Pipeline → LLM Context |
| **Cross-ref** | Nodes (code, decisions, risks) ↔ Trace registry; Relationships ↔ Architecture ADR |
| **Colaboração** | Causal clustering (single-writer, multi-reader) |
| **Maturidade** | Madura (lider graph DB, 20+ anos) |
| **Licença** | Community (GPL-3.0); Enterprise (comercial) |
| **Prioridade** | P2 — memoria avancada (GraphRAG) |

---

### D2. SQLite + extensions (FTS5, sqlean, sqlite-vec)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Banco SQL embarcado, zero-config. FTS5 (full-text search), sqlean (extensoes), sqlite-vec (busca vetorial). |
| **Status** | 🟡 Memory Store atual e in-memory + JSON. SQLite recomendado como proximo passo. ❌ Nao implementado. |
| **APIs** | SQL via `better-sqlite3` ou `sql.js` (Wasm). `CREATE VIRTUAL TABLE USING fts5()`, `vec0` table |
| **Contratos** | Tabelas SQL + `fts5` schema, `vec0` table (embedding, rowid) |
| **Conexões** | Memory Store, Vector Store (via sqlite-vec), FTS5, DuckDB (via sqlite_scanner) |
| **Stacking** | SQLite → FTS5 + sqlite-vec → Memory/Knowledge layer |
| **Cross-ref** | SQLite persistence ↔ Session/Memory storage; FTS5 ↔ Full-text search; sqlite-vec ↔ Embeddings |
| **Colaboração** | Single-writer; multi-reader com WAL; replica via Litestream/Turso |
| **Maturidade** | Madura (bilhoes de deployments) |
| **Licença** | Public Domain |
| **Prioridade** | P0 — persistencia obrigatoria |

---

### D3. DuckDB (OLAP embarcado)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Banco OLAP embarcado, columnar, ANSI SQL. 100x mais rapido que SQLite em queries analiticas. Parquet, CSV, JSON. |
| **Status** | 🔬 Nao estudado. ❌ Nao implementado. |
| **APIs** | SQL, `@duckdb/node-api`, `duckdb` (Python), `postgres_scanner`, `sqlite_scanner` |
| **Contratos** | Tabelas columnar, CTEs, Window functions |
| **Conexões** | SQLite (scanner), PostgreSQL (scanner), Parquet, Observability Engine |
| **Stacking** | DuckDB → SQL queries → Data analysis |
| **Cross-ref** | DuckDB analytics ↔ Observability metrics; Queries ↔ Dashboard |
| **Colaboração** | Single-instancia; multi-threaded queries |
| **Maturidade** | Emergente (DuckDB Labs, 20K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P2 — analytics local e telemetria |

---

### D4. ChromaDB (vector store)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Vector database open-source, Python-first, zero-config. Embeddings + metadados + busca similaridade. |
| **Status** | 🟡 Vector store atual (`vector-store.ts`) implementa funcionalidade similar (IVF index, persistencia JSON). |
| **APIs** | `chromadb.Client()`, `collection.add()`, `collection.query()`, `collection.get()`, `collection.delete()` |
| **Contratos** | `CollectionMetadata`, `QueryResult` (ids, distances, metadatas, documents) |
| **Conexões** | LangChain, Memory Store, RAG pipeline, OpenAI/Anthropic (embeddings) |
| **Stacking** | ChromaDB ↔ Embedding Provider ↔ RAG Pipeline |
| **Cross-ref** | Collections ↔ Knowledge Base categories; Similarity ↔ Pattern detection |
| **Colaboração** | HTTP Client/Server; single-node; multi-tenant via colecoes |
| **Maturidade** | Emergente (Chroma, 15K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P2 — vector store dedicado se escala exigir |

---

### D5. Pinecone / Weaviate / Qdrant / Milvus

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Vector databases gerenciados/self-hosted. Pinecone (SaaS), Weaviate (graph+vector), Qdrant (Rust), Milvus (GPU, 1B+ vectors). |
| **Status** | ❌ Nao implementados. Recomendados quando escala exigir. |
| **APIs** | REST/gRPC. `upsert()`, `query()/search()`, `delete()`, `fetch()` |
| **Contratos** | `Vector` (id, values, metadata), `ScoredVector`, `SearchRequest`, `Filter` |
| **Conexões** | LangChain (todos), Memory Store, RAG pipeline |
| **Stacking** | Embedding Provider → Vector DB → RAG → LLM Context |
| **Cross-ref** | Vector search ↔ Knowledge base; Hybrid search ↔ Code search |
| **Colaboração** | Multi-node clustering; replication; sharding |
| **Maturidade** | Madura (todos producao enterprise) |
| **Licença** | Pinecone (proprietario); Weaviate (BSD-3); Qdrant/Milvus (Apache 2.0) |
| **Prioridade** | P3 — producao em escala |

---

### D6. Mem0 / Zep / Letta (memory layers)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Camadas de memoria para agentes. Mem0: memoria cross-session com entities/relations. Zep: memoria persistente. Letta: memoria hierarquica. |
| **Status** | ❌ Nao implementados. Analisados em estudo MEMORIA-E-CONTEXTO. |
| **APIs** | Mem0: `Memory.add()`, `Memory.search()`. Zep: `POST /api/v1/memory`. Letta: `POST /v1/agents/{id}/messages` |
| **Contratos** | `MemoryData` (text, metadata), `Facts`, `Summaries`, `Agent`, `CoreMemory` |
| **Conexões** | Memory Store, Agent Runtime, LLM providers, Vector stores |
| **Stacking** | LLM ↔ Memory Layer (Mem0/Zep/Letta) ↔ Vector Store + Graph DB |
| **Cross-ref** | Entities ↔ Knowledge graph; Facts ↔ Pattern detection; Context ↔ Provider window |
| **Colaboração** | Mem0: multi-user; Letta: multiple agents compartilham |
| **Maturidade** | Emergente (Mem0: 25K+ estrelas; Letta: 15K+) |
| **Licença** | Apache 2.0 (Mem0, Letta); Zep (comercial + open core) |
| **Prioridade** | P2 — evolucao natural da Memory Store |

---

### D7. Microsoft GraphRAG

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Pipeline RAG baseado em knowledge graphs. Extrai entidades, constroi grafo, detecta comunidades (Leiden), sumarios comunitarios. |
| **Status** | 📖 Estudo profundo em MEMORIA-E-CONTEXTO (secao 1.4). ❌ Nao implementado. |
| **APIs** | `graphrag.index()`, `graphrag.query()`, `local_search()`, `global_search()` |
| **Contratos** | `Entity` (name, type, description), `Relationship` (source, target), `Community` (entities, summary) |
| **Conexões** | Neo4j (output), Vector Store (embeddings), LLM (extracao), Memory Store |
| **Stacking** | Documents → GraphRAG Index → Knowledge Graph + Summaries → Query → LLM |
| **Cross-ref** | Entities ↔ Trace registry; Communities ↔ Project modules; Search ↔ Chat context |
| **Colaboração** | Pipeline de indexacao single-node distributivel |
| **Maturidade** | Emergente (Microsoft Research, 10K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P2 — knowledge graph avancado |

---

### D8. Redis + RedisStack

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Redis: banco in-memory key-value, pub/sub, streams. RedisStack: + Search, JSON, TimeSeries, Bloom, Graph. |
| **Status** | ❌ Nao implementado. Analisado em estudo BARRAMENTO-EVENTOS. |
| **APIs** | `SET/GET`, `PUBLISH/SUBSCRIBE`, `XADD/XREAD` (streams), `FT.SEARCH` (RediSearch), `JSON.SET` |
| **Contratos** | Key-value (string, hash, list, set, zset), Stream (id, fields), Pub/Sub (channel, message) |
| **Conexões** | Event Bus (pub/sub), Memory Store (cache), Session (cache TTL), WebSocket (bridge) |
| **Stacking** | Cache Layer (Redis) ↔ Database (SQLite/PostgreSQL) ↔ Application |
| **Cross-ref** | Pub/Sub ↔ Event Bus (real-time); Streams ↔ Message Queue; Cache ↔ Performance |
| **Colaboração** | Sentinel (HA), Cluster (sharding) |
| **Maturidade** | Madura (20+ anos, 65K+ estrelas) |
| **Licença** | Redis Source Available (BSL 1.1) |
| **Prioridade** | P1 — cache, sessao, pub/sub |

---

## Categoria E: Mensageria e Eventos

### E1. NATS + JetStream

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Mensageria de alta performance. NATS Core: pub/sub, request/reply. JetStream: persistencia, exatamente-uma, consumer groups, KV store. Leve (~20MB), 10M+ msg/s. |
| **Status** | 📖 Estudo profundo em BARRAMENTO-EVENTOS. ❌ Nao implementado. Recomendado como evolucao do event-bus. |
| **APIs** | `nats.connect()`, `subscription()`, `publish()`, `request()`, `jetStreamManager()`, `js.publish()`, `js.subscribe()` |
| **Contratos** | `Msg` (subject, data, reply, headers), `JetStreamMessage` (seq, timestamp), `ConsumerConfig`, `StreamConfig` |
| **Conexões** | Event Bus (substituto), Agent Runtime, Microservices, Prometheus |
| **Stacking** | NATS Cluster → JetStream Streams → Consumers (Runtime / Event Bus / Audit) |
| **Cross-ref** | Streams ↔ Event categories; Consumers ↔ Agent subscription; KV store ↔ Config |
| **Colaboração** | Super-cluster; Leaf nodes (edge); JetStream mirroring/sourcing |
| **Maturidade** | Madura (CNCF, Synadia, 8K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P2 — upgrade do event bus para multi-instancia |

---

### E2. Apache Kafka / Redpanda

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Streaming distribuido. Kafka: log commit, pub/sub, Streams, ksqlDB. Redpanda: Kafka-compativel em C++, 10x throughput. |
| **Status** | 📖 Estudado. ❌ Nao implementado. |
| **APIs** | `Producer.send()`, `Consumer.subscribe()/poll()`, Kafka Streams, ksqlDB |
| **Contratos** | `ProducerRecord` (topic, key, value, headers), `ConsumerRecord` (topic, partition, offset, value) |
| **Conexões** | Event Bus, Audit Trail (log imutavel), Observability Engine |
| **Stacking** | Kafka/Redpanda → Stream Processors → Sinks (DB, S3, Monitoring) |
| **Cross-ref** | Topics ↔ Event categories; Consumer groups ↔ Agents; Offsets ↔ Checkpoints |
| **Colaboração** | Multi-broker cluster; rack awareness; mirroring |
| **Maturidade** | Madura (30K+ estrelas) |
| **Licença** | Apache 2.0 (Kafka); Redpanda (BSL + MIT) |
| **Prioridade** | P3 — cenario enterprise massivo |

---

### E3. RabbitMQ

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Message broker (AMQP 0-9-1, 1.0, MQTT, STOMP). Roteamento flexivel (direct, topic, fanout, headers). |
| **Status** | 📖 Estudado. ❌ Nao implementado. |
| **APIs** | AMQP 0-9-1 (`channel.publish`, `channel.consume`), HTTP Management API |
| **Contratos** | `Queue` (name, durable), `Exchange` (type), `Message` (content, properties, routingKey) |
| **Conexões** | Event Bus, workers |
| **Stacking** | RabbitMQ → Queues + Exchanges → Workers |
| **Cross-ref** | DLQ ↔ Failed tasks; Exchanges ↔ Event routing |
| **Colaboração** | Clustering multi-node; mirrored queues; quorum queues |
| **Maturidade** | Madura (20+ anos) |
| **Licença** | MPL 2.0 |
| **Prioridade** | P3 — substituido por NATS (mais leve) |

---

### E4. Apache Pulsar

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Mensageria next-gen. Separacao storage/compute (BookKeeper), multi-tenancy, geo-replication, Functions. |
| **Status** | 🔬 Nao estudado. ❌ Nao implementado. |
| **APIs** | `Producer.send()`, `Consumer.receive()`, `PulsarAdmin` |
| **Contratos** | `Message` (data, key, properties), `Schema` (JSON, Avro, Protobuf) |
| **Conexões** | Event Bus (alternativa Kafka), Pulsar Functions |
| **Stacking** | Pulsar → BookKeeper → Functions → Sinks |
| **Cross-ref** | Functions ↔ Agent transformations; Multi-tenancy ↔ Workspace |
| **Colaboração** | Geo-replication nativa; multi-tenant |
| **Maturidade** | Madura (Apache, 14K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P3 — alternativa Kafka com multi-tenancy |

---

### E5. Redis Pub/Sub + Streams

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Redis Pub/Sub: at-most-once. Redis Streams: log append-only com consumer groups, at-least-once. |
| **Status** | 📖 Estudado. ❌ Nao implementado. |
| **APIs** | `PUBLISH`, `SUBSCRIBE`, `XADD`, `XREAD`, `XGROUP`, `XACK` |
| **Contratos** | Pub/Sub: `message` (channel, pattern). Stream: `StreamEntry` (id, fields) |
| **Conexões** | Event Bus, WebSocket (Pub/Sub -> WS), Session Cache |
| **Stacking** | Redis → Pub/Sub (real-time) + Streams (persisted) → Application |
| **Cross-ref** | Pub/Sub ↔ WebSocket bridge; Streams ↔ Audit log |
| **Colaboração** | Sentinel (HA), Cluster (sharding) |
| **Maturidade** | Madura |
| **Licença** | Redis Source Available |
| **Prioridade** | P1 — mensageria leve + cache |

---

### E6. ZeroMQ

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Mensageria embarcada sem broker. REQ/REP, PUB/SUB, PUSH/PULL. Zero-copy, latencia <1 microssegundo. |
| **Status** | ❌ Nao implementado. Uso potencial: IPC entre processos locais. |
| **APIs** | `zmq.socket('pub')`, `socket.bind()/connect()`, `socket.send()/on('message')` |
| **Contratos** | ZMQ frames (multipart), socket types |
| **Conexões** | IPC entre processos, Agent Runtime ↔ Sandbox, CLI ↔ IDE server |
| **Stacking** | Process A → ZeroMQ Socket → Process B |
| **Cross-ref** | IPC ↔ Sandbox; ZeroMQ ↔ REPL agent communication |
| **Colaboração** | Peer-to-peer, sem broker |
| **Maturidade** | Madura (12K+ estrelas, 15+ anos) |
| **Licença** | MPL 2.0 |
| **Prioridade** | P3 — IPC local |

---

### E7. WebSocket / WebTransport

| Campo | Detalhes |
|-------|----------|
| **Descrição** | WebSocket: full-duplex sobre TCP. WebTransport: sobre QUIC/HTTP3, multiplexacao, menor latencia. |
| **Status** | ✅ WebSocket em `packages/web-ui/src/lib/useWebSocket.ts`. SSE para chat streaming. WebTransport: ❌ nao. |
| **APIs** | WS: `new WebSocket()`, `onmessage`, `send()`. WT: `new WebTransport()`, `createBidirectionalStream()` |
| **Contratos** | WS: `MessageEvent`, `CloseEvent`. WT: `BidirectionalStream`, `DatagramDuplex` |
| **Conexões** | Chat SSE, Terminal (xterm.js ↔ node-pty), File Watcher (chokidar → SSE), Dashboard |
| **Stacking** | Browser → WebSocket/SSE → IDE Server → Bridge (chat, terminal, file) |
| **Cross-ref** | SSE ↔ Chat; WebSocket ↔ Terminal + FileWatcher + Dashboard |
| **Colaboração** | Conexao por cliente; broadcasting via server room |
| **Maturidade** | Madura (WS: 15+ anos); Emergente (WT: experimental) |
| **Licença** | Padroes W3C |
| **Prioridade** | P0 — fundamental para real-time |

---

## Categoria F: Seguranca e Governanca

### F1. OPA / Cedar (policy engines)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Motores de politica: OPA (Rego, CNCF) — policy-as-code. Cedar (AWS) — mais simples, AWS Verified Permissions. |
| **Status** | ❌ Nao implementados. `policy-engine.ts` atual e implementacao propria (27 patterns auto/ask/block). |
| **APIs** | OPA: `POST /v1/data/{path}`, Wasm. Cedar: `{principal, action, resource, context}` |
| **Contratos** | OPA: `input` + `data` → `result`. Cedar: `Entities`, `Policy` (effect, principal, action, conditions) |
| **Conexões** | Policy Engine (substituto), Agent Security, Approval Flow, Audit Trail |
| **Stacking** | OPA/Cedar → Policy Evaluation → Action Execution |
| **Cross-ref** | Rego policies ↔ agent-security.ts; Cedar entities ↔ User/Agent identity |
| **Colaboração** | OPA: bundles (policy distribution), multi-instancia stateless |
| **Maturidade** | Madura (OPA: CNCF, 10K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P2 — evolucao policy engine |

---

### F2. LLM Guard / Guardrails AI / NeMo Guardrails

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Frameworks seguranca LLMs: LLM Guard (sanitizacao PII, jailbreak), Guardrails AI (val. output), NeMo (dialog rules). |
| **Status** | ❌ Nao implementados. `prompt-security.ts` e esqueleto. Gap critico. |
| **APIs** | LLM Guard: `scan(input)`, `scan_output(output)`. Guardrails: `RailsSpec`, `rails.generate()`. NeMo: `LLMRails`, `Colang` |
| **Contratos** | `ScanResult` (scanner, valid, risk_score), `GuardResponse` (output, validation_passed) |
| **Conexões** | Prompt Security, Agent Security, Provider Router (middleware), Chat |
| **Stacking** | Input → Guardrails (scan) → LLM → Output → Guardrails (validate) |
| **Cross-ref** | Rules ↔ agent-security.ts; Toxicity/PII ↔ Compliance |
| **Colaboração** | Single-instancia; regras compartilhaveis via config |
| **Maturidade** | Emergente (LLM Guard: 6K+ estrelas) |
| **Licença** | Apache 2.0 (LLM Guard, NeMo); Guardrails (comercial) |
| **Prioridade** | P1 — seguranca de prompt obrigatoria |

---

### F3. rebuff / Lakera Guard (prompt injection)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Protecao especializada contra prompt injection. rebuff: open-source (heuristics, embeddings, LLM). Lakera: API (<50ms). |
| **Status** | ❌ Nao implementados. |
| **APIs** | rebuff: `detect_injection()`. Lakera: `POST /v1/prompt-injection` |
| **Contratos** | `DetectionResult` (injection: boolean, confidence: float, attack_type) |
| **Conexões** | Prompt Security, Chat Input (middleware), Provider Router |
| **Stacking** | User Input → Injection Detection → (Block/PASS) → LLM |
| **Cross-ref** | Injection patterns ↔ MITRE ATLAS; Confidence ↔ Guardrails severity |
| **Colaboração** | API stateless (Lakera); rebuff com state via DB |
| **Maturidade** | Emergente |
| **Licença** | MIT (rebuff); API comercial (Lakera) |
| **Prioridade** | P1 — protecao contra prompt injection |

---

### F4. OWASP LLM Top 10

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Top 10 vulnerabilidades LLMs. LLM01 Prompt Injection, LLM02 Data Leakage, LLM03 Supply Chain, etc. |
| **Status** | 📖 Estudado como referencia (framework conceitual). |
| **APIs** | N/A — framework de classificacao. |
| **Contratos** | Checklist de vulnerabilidades com descricao, impacto, mitigacao. |
| **Conexões** | Security barreiras, Guardrails, Compliance, MITRE ATLAS |
| **Stacking** | OWASP LLM Top 10 → Security baseline → Guardrails config |
| **Cross-ref** | LLM01 ↔ Prompt injection detection; LLM02 ↔ Data leakage |
| **Colaboração** | Framework universal |
| **Maturidade** | Emergente (OWASP, atualizacao continua) |
| **Licença** | Creative Commons |
| **Prioridade** | P1 — baseline de seguranca |

---

### F5. MITRE ATLAS

| Campo | Detalhes |
|-------|----------|
| **Descrição** | MITRE ATLAS (Adversarial Threat Landscape for AI). Matriz de taticas e tecnicas adversarias para IA. |
| **Status** | 📖 Estudado como referencia. |
| **APIs** | API REST `https://atlas.mitre.org/api/` para consulta |
| **Contratos** | Taxonomia: Taticas, Tecnicas, Mitigacoes |
| **Conexões** | Security baseline, Red teaming, Compliance |
| **Stacking** | MITRE ATLAS → Threat model → Security controls |
| **Cross-ref** | Techniques ↔ OWASP Top 10; Mitigations ↔ Guardrails |
| **Colaboração** | Taxonomia universal |
| **Maturidade** | Emergente (MITRE) |
| **Licença** | Aberto (MITRE) |
| **Prioridade** | P2 — threat modeling |

---

### F6. Garak / PyRIT (red teaming)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Red teaming automatizado para LLMs. Garak: probing (jailbreak, leakage, toxicity). PyRIT (Microsoft): scoring. |
| **Status** | ❌ Nao implementados. |
| **APIs** | Garak: CLI `garak --model <model> --probes <probes>`. PyRIT: `RedTeamingBot`, `PromptSendingAgent` |
| **Contratos** | `Probe`, `Attempt` (prompt, output, results), `PromptRequestPiece` |
| **Conexões** | Security audit, CI/CD |
| **Stacking** | Garak/PyRIT → LLM → Report → Fix |
| **Cross-ref** | Results ↔ OWASP Top 10; Attacks ↔ MITRE ATLAS |
| **Colaboração** | Ferramentas de teste — single-instancia |
| **Maturidade** | Emergente |
| **Licença** | Apache 2.0 |
| **Prioridade** | P2 — security testing |

---

### F7. JWT / RBAC / OAuth2

| Campo | Detalhes |
|-------|----------|
| **Descrição** | JWT: tokens auto-contidos. RBAC: permissoes por papeis. OAuth2: delegacao de autorizacao (PKCE, Client Credentials). |
| **Status** | 🟡 Esqueleto em `agent-identity.ts`. OAuth2 e RBAC nao implementados. |
| **APIs** | JWT: `jwt.sign()/verify()`. OAuth2: `authorization_endpoint`, `token_endpoint`. RBAC: `checkPermission()` |
| **Contratos** | JWT: header (alg, typ), payload (sub, iss, exp, roles). OAuth2: `AccessToken`. RBAC: `Role` (name, permissions[]) |
| **Conexões** | Agent Identity, Session Manager, Policy Engine, API Router |
| **Stacking** | OAuth2 → JWT → RBAC → Policy Evaluation → API Access |
| **Cross-ref** | JWT roles ↔ RBAC; OAuth2 scopes ↔ API endpoints; Agent ↔ OAuth2 |
| **Colaboração** | Authorization server centralized; RBAC single source |
| **Maturidade** | Madura (padroes IETF, 15+ anos) |
| **Licença** | Padroes abertos |
| **Prioridade** | P2 — identidade e multi-usuario |

---

## Categoria G: CI/CD e Deploy

### G1. GitHub Actions / GitLab CI

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Plataformas CI/CD. GitHub Actions: workflows YAML, 20K+ actions. GitLab CI: pipelines, stages, Kubernetes. |
| **Status** | ✅ Gerador CI em `packages/cli/src/commands/ci.ts`. 6 workflows em `.github/workflows/`. |
| **APIs** | GH: `workflow_dispatch`, `@actions/core`, `@actions/github`. GitLab: API GraphQL, triggers. |
| **Contratos** | GH: `.github/workflows/*.yml` (name, on, jobs). GitLab: `.gitlab-ci.yml` (stages, jobs) |
| **Conexões** | Dagger, ArgoCD/Flux, Docker, `ci generate` CLI |
| **Stacking** | Code → GitHub Actions → Build → Test → Package → Deploy |
| **Cross-ref** | Templates ↔ CI templates (.ai/templates/ci/); Status ↔ Dashboard |
| **Colaboração** | Runners compartilhados; matrix builds; environment protection |
| **Maturidade** | Madura (padrao de mercado) |
| **Licença** | Plataforma comercial (free tier); SDK MIT |
| **Prioridade** | P0 — CI/CD base |

---

### G2. Dagger (pipeline as code)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Engine CI/CD portatil. Pipelines em TS/Python/Go. Executa local (Docker) ou em qualquer runner. |
| **Status** | ❌ Nao implementado. |
| **APIs** | `dag = connect()`, `dag.container().from()`, `dag.pipeline()`, `@func` |
| **Contratos** | `Container`, `Secret`, `Service`, `Directory`, `File`, `CacheVolume` |
| **Conexões** | GitHub Actions, Docker/Podman, CI generators |
| **Stacking** | Dagger Pipeline → Dagger Engine → Container Runtime → CI Runner |
| **Cross-ref** | Functions ↔ `ci generate` CLI; Local exec ↔ CI exec |
| **Colaboração** | Dagger Cloud (cache compartilhado) |
| **Maturidade** | Emergente (12K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P3 — pipeline portatil avancado |

---

### G3. ArgoCD / Flux (GitOps)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | GitOps para Kubernetes. ArgoCD: sincroniza cluster com Git, UI SSO. Flux: reconciliacao continua, Kustomize/Helm. |
| **Status** | ❌ Nao implementado. Gap identificado no estudo ENTREGA (Fase 6). |
| **APIs** | ArgoCD: REST API, gRPC, CLI. Flux: CRDs (Kustomization, HelmRelease, GitRepository) |
| **Contratos** | ArgoCD: `Application` (source, destination). Flux: `Kustomization`, `HelmRelease` |
| **Conexões** | Kubernetes, Flagger (canary), Terraform, CI/CD |
| **Stacking** | Git → ArgoCD/Flux → Kubernetes → Application |
| **Cross-ref** | Application ↔ Release pipeline; Reconciliation ↔ Drift detection |
| **Colaboração** | Multi-cluster; sync waves; automated sync |
| **Maturidade** | Madura (ArgoCD: CNCF, 18K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P3 — deploy GitOps enterprise |

---

### G4. Docker / Podman

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Container engines. Docker: padrao de facto. Podman: daemonless, rootless, Docker-compativel. |
| **Status** | ✅ Docker: gerador Dockerfile multi-stage em `release docker`. Podman: ❌ nao. |
| **APIs** | `docker build/run/compose`, Docker API (TCP), `dockerode`. Podman: CLI compativel Docker |
| **Contratos** | `Dockerfile` (FROM, COPY, RUN, CMD), `docker-compose.yml` (services, networks), OCI Image |
| **Conexões** | CI/CD (build images), Dagger, Kubernetes, MinIO |
| **Stacking** | Docker/Podman → Container Images → K8s / Docker Compose |
| **Cross-ref** | Dockerfile ↔ `release docker` CLI; Images ↔ SBOM |
| **Colaboração** | Registries (Docker Hub, GHCR); Swarm/K8s orchestration |
| **Maturidade** | Madura (Docker: 120M+ downloads) |
| **Licença** | Apache 2.0 (Docker Engine); Podman (Apache 2.0) |
| **Prioridade** | P0 — essencial para desenvolvimento |

---

### G5. Kubernetes / K3s / MicroK8s

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Orquestracao de containers. K8s: padrao mercado, auto-healing, scaling. K3s: leve (<100MB). MicroK8s: single-node. |
| **Status** | ✅ Gerador manifestos K8s em `release k8s`. K3s/MicroK8s: ❌ nao implementados. |
| **APIs** | Kubernetes API, `kubectl`, `@kubernetes/client-node`. Manifestos: Deployment, Service, Ingress, HPA |
| **Contratos** | `Deployment` (apiVersion, kind, metadata, spec: { replicas, template: { spec: { containers } } }) |
| **Conexões** | Docker, ArgoCD/Flux, Flagger, Prometheus |
| **Stacking** | K8s/K3s → Pods → Services → Ingress → Monitoring |
| **Cross-ref** | Manifestos ↔ `release k8s` CLI; Deployments ↔ Release |
| **Colaboração** | Multi-node cluster, etcd; namespaces para isolamento |
| **Maturidade** | Madura (CNCF, padrao de facto) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P2 — orquestracao de deploy |

---

### G6. Terraform / OpenTofu / Pulumi

| Campo | Detalhes |
|-------|----------|
| **Descrição** | IaC. Terraform: HCL, 1000+ providers. OpenTofu: fork open-source. Pulumi: IaC em TS/Python/Go. |
| **Status** | ❌ Nao implementado. Gap — infraestrutura nao esta codificada. |
| **APIs** | Terraform/OpenTofu: `plan`, `apply`, `state`, HCL. Pulumi: `new Resource()`, `StackReference` |
| **Contratos** | State (serial, lineage, resources[]), Plan (changes), Resource (urn, id, props) |
| **Conexões** | Kubernetes, Cloud providers, CI/CD |
| **Stacking** | Terraform/Pulumi → Providers → Cloud Resources → State |
| **Cross-ref** | State ↔ Release; IaC ↔ Deploy pipeline |
| **Colaboração** | State locking; remote state; team runs |
| **Maturidade** | Madura (padrao de mercado) |
| **Licença** | BSL (Terraform); Apache 2.0 (OpenTofu, Pulumi) |
| **Prioridade** | P2 — infraestrutura reproduzivel |

---

### G7. Flagger (canary deploy)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Progressive delivery K8s. Canary, A/B testing, blue-green. Metricas Prometheus para rollout/rollback. |
| **Status** | ❌ Nao implementado. Gap — entrega progressiva nao existe. |
| **APIs** | CRDs: `Canary` (targetRef, service, analysis, metrics), `MetricTemplate` |
| **Contratos** | `CanarySpec` (targetRef, analysis: { schedule, maxWeight, stepWeight, metrics }) |
| **Conexões** | Kubernetes, Prometheus, Istio/Linkerd, ArgoCD/Flux |
| **Stacking** | Flagger → Service Mesh → Prometheus → Canary → Rollout/Rollback |
| **Cross-ref** | Metrics ↔ Observability; Rollback ↔ Delivery orchestrator |
| **Colaboração** | Multi-namespace; multi-cluster via Kustomize |
| **Maturidade** | Madura (5K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P3 — progressive delivery enterprise |

---

### G8. Unleash / Flagsmith / LaunchDarkly (feature flags)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Feature flags. Unleash (open-source), Flagsmith (multi-env), LaunchDarkly (SaaS lider). |
| **Status** | ❌ Nao implementado. Gap — feature flags nao existem. |
| **APIs** | Unleash: `isEnabled()`, `getVariant()`. Flagsmith: `hasFeatureFlag()`. LaunchDarkly: `variation()` |
| **Contratos** | `Toggle` (name, enabled, strategies), `FeatureState`, `User` (key, custom) |
| **Conexões** | CI/CD, Dashboard, Agent Runtime |
| **Stacking** | Feature Flag Service → SDK → Application Features |
| **Cross-ref** | Flags ↔ Release pipeline; Flags ↔ A/B experimentation |
| **Colaboração** | Multi-environment; team permissions; audit log |
| **Maturidade** | Madura (LaunchDarkly: $200M+ ARR) |
| **Licença** | Unleash (Apache 2.0); Flagsmith (BSL); LaunchDarkly (comercial) |
| **Prioridade** | P3 — entrega progressiva |

---

## Categoria H: Observabilidade

### H1. OpenTelemetry

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Framework de observabilidade (CNCF). Traces, metricas, logs padronizados. Collector para processamento/export. |
| **Status** | 🟡 `observability-engine.ts` existe mas usa telemetria custom. SDK OTel nao configurado. |
| **APIs** | `TracerProvider`, `tracer.startSpan()`, `span.setAttributes()`, `Meter`, `Logger` |
| **Contratos** | `Span` (traceId, spanId, name, attributes), `Metric` (name, dataPoints), `LogRecord` (timestamp, body) |
| **Conexões** | LangFuse, Prometheus, Grafana, Loki, Sentry |
| **Stacking** | App → OTel SDK → Otel Collector → Backends (Prometheus, Jaeger, Loki) |
| **Cross-ref** | Traces ↔ Agent runtime; Metrics ↔ Dashboard; Logs ↔ Audit |
| **Colaboração** | Multi-service trace propagation (W3C TraceContext) |
| **Maturidade** | Madura (CNCF, 20K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P1 — padronizacao de observabilidade |

---

### H2. LangFuse / Helicone / Galileo (AI observability)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Observabilidade especifica para LLMs. LangFuse (open-source): tracing, cost, datasets. Helicone: proxy, caching. Galileo: qualidade. |
| **Status** | ❌ Nao implementado. LangFuse tem maior potencial (open-source + LangChain). |
| **APIs** | LangFuse: `trace()`, `span()`, `generation()`, `score()`. Helicone: proxy API. Galileo: proxy. |
| **Contratos** | `Trace` (id, name, metadata), `Span` (input, output, usage), `Score` (value, comment) |
| **Conexões** | OpenTelemetry, LangChain, OpenAI/Anthropic |
| **Stacking** | LLM Call → LangFuse/Helicone → Trace Storage → Dashboard |
| **Cross-ref** | Costs ↔ Budget; Quality ↔ Scorecards; Latency ↔ Provider selection |
| **Colaboração** | LangFuse: multi-project; Helicone: multi-workspace |
| **Maturidade** | Emergente (LangFuse: 8K+ estrelas) |
| **Licença** | LangFuse (MIT + EE); Helicone (Apache 2.0) |
| **Prioridade** | P1 — tracing de LLM fundamental |

---

### H3. Prometheus + Grafana

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Stack monitoramento: Prometheus — metricas time-series, PromQL. Grafana — dashboards, alerting. |
| **Status** | ❌ Nao integrado. `performance-monitor.ts` existe mas metricas sao internas. |
| **APIs** | Prometheus: `POST /api/v1/query`, `/metrics`. Grafana: `POST /api/dashboards/db`, Data Sources. |
| **Contratos** | Prometheus: `Metric` (name, labels), `Sample` (timestamp, value). Grafana: `Dashboard` (panels, targets) |
| **Conexões** | OpenTelemetry, Node exporter, Flagger |
| **Stacking** | App → Metrics → Prometheus → Grafana + Alerting |
| **Cross-ref** | Performance ↔ Dashboard; Usage ↔ Budget; Alerts ↔ Runtime |
| **Colaboração** | Prometheus pull-based, federation; Grafana multi-org |
| **Maturidade** | Madura (CNCF, padrao mercado) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P2 — monitoramento de producao |

---

### H4. ELK / Loki (logging)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Logging: ELK (Elasticsearch+Logstash+Kibana). Loki (Grafana) — log aggregation, Prometheus-compativel. |
| **Status** | ❌ Nao integrado. Logs atuais vao para console e `audit-trail` (JSON). |
| **APIs** | Loki: `POST /loki/api/v1/push`, `GET /query_range`. Elasticsearch: `POST /{index}/_doc`, `_search` |
| **Contratos** | Loki: `Stream` (labels, values). Elasticsearch: `Document` (_index, _source) |
| **Conexões** | OpenTelemetry, Prometheus, Sentry |
| **Stacking** | App → Log shipping (Promtail) → Loki → Grafana |
| **Cross-ref** | Logs ↔ Audit trail; Errors ↔ Sentry; System ↔ Runtime |
| **Colaboração** | Loki: multi-tenant; Elasticsearch: multi-cluster |
| **Maturidade** | Madura (Loki: 24K+ estrelas) |
| **Licença** | AGPL 3.0 (Loki); Elastic License 2.0 (ES) |
| **Prioridade** | P2 — logging centralizado |

---

### H5. Sentry (error tracking)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Error tracking e performance. Stack traces, breadcrumbs, contexto, source maps, releases. |
| **Status** | ❌ Nao implementado. Erros atuais sem tracking. |
| **APIs** | `Sentry.init()`, `captureException()`, `captureMessage()`, `setUser()`, `startTransaction()` |
| **Contratos** | `Event` (event_id, level, exception, user, tags, breadcrumbs, contexts) |
| **Conexões** | OpenTelemetry, Release pipeline, GitHub |
| **Stacking** | App → Sentry SDK → Sentry Server → Dashboard + Alerts |
| **Cross-ref** | Error frequency ↔ Quality scorecard; Stack ↔ Code location |
| **Colaboração** | Multi-project; team alerts; release tracking |
| **Maturidade** | Madura (Sentry, $100M+ ARR) |
| **Licença** | MIT (SDK); SaaS/self-hosted BSL |
| **Prioridade** | P1 — rastreamento de erros |

---

## Categoria I: Armazenamento e Dados

### I1. PostgreSQL + pgvector

| Campo | Detalhes |
|-------|----------|
| **Descrição** | PostgreSQL: banco relacional avancado, ACID, extensoes. pgvector: busca vetorial (IVFFlat, HNSW). |
| **Status** | ❌ Nao implementado. Dados atuais SQLite ou in-memory. |
| **APIs** | SQL (pg, postgres.js). pgvector: `CREATE INDEX USING hnsw`, `ORDER BY embedding <=> query` |
| **Contratos** | `Table` (columns, constraints), `vector`, `HNSWIndex`, `Row` |
| **Conexões** | pgvector (vector store), DuckDB (postgres_scanner), LangChain (PGVector), Turso/libSQL |
| **Stacking** | PostgreSQL → pgvector → Vector Store → RAG / Memory |
| **Cross-ref** | Embeddings ↔ Memory; Relational ↔ Audit trail; ACID ↔ Transactions |
| **Colaboração** | Streaming replication, logical replication, partitioning |
| **Maturidade** | Madura (30+ anos, lider open-source relacional) |
| **Licença** | PostgreSQL License (MIT-like) |
| **Prioridade** | P2 — storage relacional avancado |

---

### I2. MinIO / R2 / Tigris (object storage)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Object storage S3-compatible. MinIO (self-hosted, K8s-native). R2 (Cloudflare, zero egress). Tigris (global). |
| **Status** | ❌ Nao implementado. |
| **APIs** | S3 API: `PutObject`, `GetObject`, `DeleteObject`, `ListObjects`. SDK: `@aws-sdk/client-s3` |
| **Contratos** | S3: `Bucket` (name, region), `Object` (key, ETag, size, lastModified) |
| **Conexões** | CI/CD (artifacts), Backup (snapshots), Large files (models) |
| **Stacking** | Object Storage → S3 API → Application |
| **Cross-ref** | Storage ↔ SBOM; Storage ↔ Snapshots; Storage ↔ Models |
| **Colaboração** | MinIO: multi-node, erasure coding, bucket replication |
| **Maturidade** | Madura (MinIO: 50K+ estrelas) |
| **Licença** | MinIO (AGPL 3.0 + commercial); R2/Tigris (comercial) |
| **Prioridade** | P3 — storage de objetos (modelos, snapshots grandes) |

---

### I3. Turso / libSQL (SQLite distribuido)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | SQLite distribuido. Turso: edge-replicated SQLite. libSQL: fork SQLite com extensoes, replicacao, Wasm. |
| **Status** | ❌ Nao implementado. |
| **APIs** | libSQL: SQL + extensoes. Turso: `turso db create`, `@libsql/client`, Hrana protocol. |
| **Contratos** | libSQL: similar SQLite + `CREATE TABLE USING libsql_server`, Hrana protocol |
| **Conexões** | SQLite, DuckDB (sqlite_scanner), Edge functions |
| **Stacking** | Turso/libSQL → Edge Replicas → App (global reads) |
| **Cross-ref** | libSQL ↔ SQLite; Replicas ↔ Multi-region |
| **Colaboração** | Turso: multi-region embedded replicas |
| **Maturidade** | Emergente (Turso: 10K+ estrelas; libSQL: 10K+) |
| **Licença** | libSQL (Apache 2.0); Turso (comercial) |
| **Prioridade** | P3 — edge storage global |

---

### I4. Apache Iceberg / Delta Lake

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Table formats data lakes. Iceberg: schema evolution, time travel, ACID. Delta Lake: ACID sobre Parquet. |
| **Status** | ❌ Nao implementado. Uso potencial: telemetria e auditoria larga escala. |
| **APIs** | Iceberg: REST Catalog, Spark/Flink. Delta: `DeltaTable`, `delta-rs`, `MERGE INTO` |
| **Contratos** | Iceberg: `TableMetadata` (location, schema, snapshots). Delta: `DeltaLog`, `AddFile`, `RemoveFile` |
| **Conexões** | DuckDB (duckdb_iceberg), Spark, Flink, Trino |
| **Stacking** | Data Lake → Iceberg/Delta → Query Engine → Analytics |
| **Cross-ref** | Time travel ↔ Audit trail; Delta ↔ Observability |
| **Colaboração** | Iceberg: REST catalog; Delta: multi-writer via log |
| **Maturidade** | Madura (Iceberg: CNCF; Delta: Databricks) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P3 — analytics larga escala |

---

## Categoria J: Desktop e Interface

### J1. Electron

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Framework desktop com web technologies (Chromium + Node.js). IPC, auto-update, native menus. |
| **Status** | ❌ Nao implementado. MVP e web-only. Uso potencial: empacotamento desktop. |
| **APIs** | `BrowserWindow`, `ipcMain/ipcRenderer`, `dialog`, `Menu`, `Tray`, `autoUpdater`, `app` |
| **Contratos** | IPC: `invoke()`, `on()`, `handle()`. `BrowserWindowConstructorOptions` (width, height, webPreferences) |
| **Conexões** | Monaco (webview), Node.js (main), FS (nativo), Terminal (node-pty) |
| **Stacking** | Electron Shell → Web App (React + Monaco) → Node.js (main) |
| **Cross-ref** | IPC ↔ WebSocket; Native FS ↔ File Explorer; Menus ↔ IDE menus |
| **Colaboração** | Single-instancia; multi-window |
| **Maturidade** | Madura (VS Code, 115K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P2 — empacotamento desktop pos-MVP |

---

### J2. Tauri

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Framework desktop alternativo (Rust + webview). Binarios 10x menores (3-5MB vs 150MB), menos RAM. |
| **Status** | ❌ Nao implementado. Alternativa ao Electron com desempenho superior. |
| **APIs** | Rust: `tauri::Builder`, `tauri::command`. JS: `invoke()`, `listen()`. Plugin system (fs, shell, sql) |
| **Contratos** | `tauri.conf.json` (windows, security, bundle). IPC: JSON via serde |
| **Conexões** | Web App (React) via webview, Rust backend, FS, Shell |
| **Stacking** | Tauri Shell → Webview (React) → Rust Backend (commands) |
| **Cross-ref** | Commands ↔ API router; Rust performance ↔ node-pty |
| **Colaboração** | Single-instancia; multi-window |
| **Maturidade** | Emergente (Tauri 2.x, 50K+ estrelas) |
| **Licença** | Apache 2.0 + MIT |
| **Prioridade** | P2 — alternativa Electron para desktop |

---

### J3. WebAssembly (Wasm + WASI)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Wasm: bytecode portavel browser/qualquer runtime. WASI: interface sistema (fs, clock). Tree-sitter compila para Wasm. |
| **Status** | ❌ Nao implementado. Uso: Tree-sitter Wasm, plugins seguros. |
| **APIs** | Wasm: `WebAssembly.instantiate()`, exports, imports. WASI: preview 1, Component Model. WIT interfaces. |
| **Contratos** | `.wasm` binary, WAT, WIT, Component Model |
| **Conexões** | Tree-sitter (Wasm grammars), Monaco (Wasm workers), Plugin System (sandbox) |
| **Stacking** | Wasm Module → WASI → Runtime (Browser/Node/Wasmtime) |
| **Cross-ref** | Wasm sandbox ↔ Plugin security; Wasm parse ↔ Tree-sitter |
| **Colaboração** | Modulos isolados por design; comunicacao via shared memory |
| **Maturidade** | Madura (Wasm: W3C, todos browsers); Emergente (WASI: preview 2) |
| **Licença** | Padrao W3C |
| **Prioridade** | P2 — plugins seguros e parsing eficiente |

---

### J4. React / Vite / Next.js

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Stack frontend: React 18 (UI), Vite 5 (build/HMR), Next.js (SSR, app router). |
| **Status** | ✅ React 18 + Vite 5 em `packages/web-ui/`. Next.js: ❌ nao usado (SPA). |
| **APIs** | React: hooks, Context, Suspense, lazy. Vite: HMR, plugins. Next.js: app/, SSR, API routes |
| **Contratos** | Component (props, state), Context (Provider, Consumer), Vite config |
| **Conexões** | Monaco (`@monaco-editor/react`), WebSocket/SSE, ReactFlow |
| **Stacking** | Vite → React 18 → Components (Monaco, Chat, Terminal, Dashboard) |
| **Cross-ref** | Components ↔ IDE modes; Hooks ↔ State; Vite HMR ↔ Dev exp |
| **Colaboração** | Componentes independentes; estado via Context/Redux/Zustand |
| **Maturidade** | Madura (Meta, $100B+ apps) |
| **Licença** | MIT |
| **Prioridade** | P0 — base do frontend |

---

### J5. WebSocket / SSE (ver E7)

(Referencia cruzada — ver E7 para detalhes completos)

---

## Categoria K: Comunicacao entre Agentes

### K1. MCP (Model Context Protocol — Anthropic)

| Campo | Detalhes |
|-------|----------|
| **Descricao** | Protocolo aberto (Anthropic, Linux Foundation) para conectar LLMs a ferramentas. Servidor MCP expoe tools/resources/prompts. Transporte: stdio (local), SSE (remoto). |
| **Status** | ✅ Implementado. `packages/cli/src/commands/mcp.ts` — 14 ferramentas MCP. 100% cobertura testes. Score 4.7/5.0. |
| **APIs** | `ListToolsRequest/Result`, `CallToolRequest/Result`, `ListResourcesRequest`, `ListPromptsRequest`. JSON-RPC 2.0. |
| **Contratos** | `Tool` (name, description, inputSchema), `CallToolResult` (content: [{type, text}], isError). `MCPServer` (name, version, capabilities) |
| **Conexoes** | Agent Runtime (tools), FS (resources), Shell, Chat, Provider Router, Claude (nativo MCP) |
| **Stacking** | MCP Client (LLM) ↔ MCP Server (IDE) → Tools (FS, Shell, Chat, Sandbox) |
| **Cross-ref** | Tools ↔ CLI commands; Resources ↔ File system; Prompts ↔ Prompt templates |
| **Colaboracao** | Cliente ↔ Servidor (1:N); multiplos servidores MCP |
| **Maturidade** | Madura (Linux Foundation, 97M+/mes downloads, 5K+ servidores) |
| **Licenca** | MIT (protocolo e SDK) |
| **Prioridade** | P0 — ecossistema de ferramentas |

---

### K2. A2A (Agent-to-Agent — Google)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Protocolo Google para comunicacao direta entre agentes. Agent Card (capacidades, endpoints), mensagens JSON, streaming, task-oriented. |
| **Status** | 🔬 Nao estudado. ❌ Nao implementado. Gap em multiagente. |
| **APIs** | `POST /a2a/agentCard` (descoberta), `POST /a2a/taskSend`, `POST /a2a/taskStream`, `GET /a2a/task` |
| **Contratos** | `AgentCard` (name, url, capabilities, auth), `Task` (id, goal, state), `Message` (role, parts) |
| **Conexões** | Agent Runtime, MCP (complementar — A2A comunicacao, MCP ferramentas), Event Bus |
| **Stacking** | Agent A → A2A Protocol → Agent B → A2A Protocol → Agent C |
| **Cross-ref** | Tasks ↔ Agent tasks (task-model); Messages ↔ Collaboration; Card ↔ Registry |
| **Colaboração** | Peer-to-peer; descoberta via Agent Card; tasks com estado |
| **Maturidade** | Experimental (Google, 2025 draft) |
| **Licença** | Apache 2.0 (draft) |
| **Prioridade** | P2 — comunicacao inter-agentes |

---

### K3. FIPA-ACL

| Campo | Detalhes |
|-------|----------|
| **Descrição** | FIPA ACL — padrao IEEE/FIPA para comunicacao entre agentes. Performatives (inform, request, propose), ontologia. |
| **Status** | ❌ Nao implementado. Referencia academica — MAS classico. |
| **APIs** | `ACLMessage` (performative, sender, receiver, content, language, ontology, protocol) |
| **Contratos** | `ACLMessage` (performative: INFORM | REQUEST | PROPOSE | AGREE | REFUSE, :sender, :receiver, :content, :ontology) |
| **Conexões** | Agent Runtime (potencial adaptacao), ontologias |
| **Stacking** | FIPA-ACL → Ontology → Agent Communication → Agent Runtime |
| **Cross-ref** | Performatives ↔ MCP tool calls; Protocol ↔ A2A task state |
| **Colaboração** | Peer-to-peer; directory facilitator (DF) |
| **Maturidade** | Madura (padrao IEEE, 20+ anos) |
| **Licença** | Padrao aberto IEEE |
| **Prioridade** | P3 — referencia historica |

---

### K4. Message passing patterns

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Padroes arquiteturais: Request-Reply, Pub/Sub, Event-driven, Saga, Outbox, DLQ, Competing Consumers. |
| **Status** | 📖 Estudado em BARRAMENTO-EVENTOS (secao 1). 🟡 Event Bus atual e pub/sub in-memory basico. |
| **APIs** | N/A — padroes arquiteturais. Implementaveis via NATS, Kafka, RabbitMQ, Redis Streams. |
| **Contratos** | Cada padrao tem assinaturas (ex: Saga: Step -> Compensation; Outbox: Entity -> OutboxEvent -> Publisher -> Broker) |
| **Conexões** | NATS, Kafka, RabbitMQ, Redis, Agent Runtime, Event Bus, Workflow Engine |
| **Stacking** | Padrao arquitetural → Tecnologia especifica → Implementacao |
| **Cross-ref** | Saga ↔ Agent task pipeline; Outbox ↔ Audit trail; DLQ ↔ Failed tasks |
| **Colaboração** | Depende do padrao — coreografia (distribuido), orquestracao (centralizado) |
| **Maturidade** | Madura (padroes estabelecidos, 20+ anos) |
| **Licença** | N/A |
| **Prioridade** | P0 — arquitetura de mensageria |

---

### K5. Artefatos Estruturados

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Padrao Anthropic/Claude para saida estruturada. Artefatos renderizados separadamente (codigo, markdown, diagramas, SVG). Tags `<antartifact>` no stream. |
| **Status** | ❌ Nao implementado. Potencial: renderizacao estruturada na IDE. |
| **APIs** | Tags: `<antartifact type="application/vnd.ant.code" language="typescript" title="main.ts">`. Conteudo markdown. |
| **Contratos** | `ArtifactType` (code, markdown, html, svg, mermaid), `ArtifactMetadata` (type, language, title, identifier) |
| **Conexões** | Chat UI (rendering), Monaco Editor (code artifacts), Markdown render |
| **Stacking** | LLM Response → Parse Artifacts → Render Components |
| **Cross-ref** | Artifacts ↔ ChatMessage; Code ↔ Diff preview; Diagram ↔ Diagram panel |
| **Colaboração** | Renderizados por cliente; colaboracao via share |
| **Maturidade** | Emergente (Anthropic, Claude 2025) |
| **Licença** | Padrao proprietario (Anthropic) |
| **Prioridade** | P1 — saida estruturada da IA |

---

---

## Diagrama de Stacking Geral

```
CAMADA 8 — DESKTOP SHELL
  Electron / Tauri
  ├── Webview (React 18 + Vite 5)
  │   ├── Monaco Editor      │  xterm.js
  │   ├── ChatPanel (SSE)    │  FileExplorer
  │   ├── DiffViewer          │  Dashboard
  │   └── Visual Pipeline    │  CommandPalette
  ├── IPC (Tauri) / WebSocket (Electron)
  │
CAMADA 7 — COMUNICACAO
  ├── WebSocket / SSE — real-time bidirecional
  ├── MCP Protocol — tools/ferramentas da IDE
  ├── A2A Protocol — comunicacao entre agentes
  ├── LSP — recursos de linguagem (autocomplete, etc)
  ├── DAP — debug, breakpoints, stack traces
  │
CAMADA 6 — IA E LLMs
  ├── Provider Router (fallchain)
  │   ├── Ollama (local: Phi-4, Qwen, DeepSeek, Llama)
  │   ├── OpenAI Provider (GPT-4o, o1, o3)
  │   ├── Anthropic Provider (Claude 3.5, 4)
  │   ├── Google Provider (Gemini 2.0, 2.5)
  │   └── OpenRouter (gateway 200+ modelos)
  ├── Vercel AI SDK (streaming, tool calls)
  ├── LangChain/LangGraph (chains, graphs, RAG)
  │
CAMADA 5 — AGENTES E ORQUESTRACAO
  ├── Agent Runtime (registry, security, collaboration)
  ├── Task Planner + Runner
  ├── Engineer Pipeline (plan→implement→test→review)
  ├── CrewAI / AutoGen (multi-agente, futuro)
  └── Workflow Engine
      │
CAMADA 4 — MEMORIA E CONHECIMENTO
  ├── Memory Store (in-memory → SQLite + sqlite-vec)
  ├── Pattern Detector / Learning Engine
  ├── Vector Store (ChromaDB / pgvector)
  ├── Knowledge Graph (Neo4j / GraphRAG)
  ├── Redis Cache + Session + Pub/Sub
  └── DuckDB (analytics local)
      │
CAMADA 3 — MENSAGERIA E EVENTOS
  ├── Event Bus (in-memory → NATS + JetStream)
  ├── Audit Trail (event sourcing)
  ├── Queue (Redis Streams / NATS Queue Groups)
  └── Saga Pattern (orcestracao de transacoes)
      │
CAMADA 2 — SEGURANCA E GOVERNANCA
  ├── Policy Engine (27 patterns: auto/ask/block)
  ├── Agent Security (barreiras, bloqueios)
  ├── Approval Flow (request/grant/deny)
  ├── Guardrails (LLM Guard / NeMo / rebuff)
  ├── JWT / RBAC / OAuth2 (identidade)
  └── OPA / Cedar (policies-as-code, futuro)
      │
CAMADA 1 — EXECUCAO E INFRA
  ├── node-pty (terminal)
  ├── Sandbox (codigo isolado)
  ├── Docker/Podman (containers)
  ├── Kubernetes/K3s (orquestracao)
  ├── Terraform/OpenTofu (IaC)
  └── PostgreSQL + MinIO (storage)
      │
CAMADA 0 — OBSERVABILIDADE E CI/CD
  ├── OpenTelemetry (traces + metrics + logs)
  ├── LangFuse (AI observability, cost tracking)
  ├── Prometheus + Grafana (metricas)
  ├── Loki / Sentry (logs e erros)
  ├── GitHub Actions (CI/CD)
  ├── ArgoCD/Flux (GitOps)
  ├── Feature Flags (Unleash)
  └── Flagger (canary deploy)
```

---

## Cross-Data Matrix

Cruzamento de dados entre sistemas — que informacoes podem ser combinadas para gerar valor.

### D1. Codigo + IA + Memoria
```
Tree-sitter AST → Provider Router → LLM (context-aware edit)
Monaco markers (LSP diagnostics) → Pattern Detector → Memory (aprendizado)
Diff history → Learning Engine → Pattern Detection (codigo repete erros?)
```

### D2. Mensageria + Auditoria + Observabilidade
```
Event Bus events → Audit Trail (ledger imutavel) → OpenTelemetry traces
NATS streams → Audit analitico → DuckDB queries
Agent messages → Trace registry → LangFuse cost tracking
```

### D3. Seguranca + IA + Politicas
```
Agent actions → Policy Engine → Approval/Block → Audit Trail
LLM input → Guardrails (LLM Guard) → rebuff detection → Security barrier
User permissions (JWT/RBAC) → Policy engine → OPA/Cedar decisions
```

### D4. Deploy + Feature Flags + Observabilidade
```
GitHub Actions build → Docker image → K8s deploy → ArgoCD sync
Feature flag (Unleash) → Gradual rollout → Flagger canary → Prometheus metrics
SBOM scan → Image vulnerability → Supply chain audit
```

### D5. Memoria + Conhecimento + Agentes
```
SQLite (pattern store) → Memory Store → Agent Runtime (context injection)
Neo4j (knowledge graph) → GraphRAG summaries → LLM context window
Vector DB (embeddings) → RAG pipeline → Chat responses (citation-aware)
```

### D6. Frontend + Real-time + Backend
```
Monaco (edicao) → WebSocket/SSE → File Bridge → File System
Chat input → SSE stream → Provider Router → LLM streaming response
xterm.js input → WebSocket → node-pty → Shell output
```

### D7. CI/CD + Versionamento + Qualidade
```
Git commit → GitHub Actions → Lint/Test/Build → Quality Gate → Deploy
Release pipeline → Snapshot → Contract validation → Compliance check
Test results + Code coverage → Scorecard (maturidade 0-100)
```

### D8. Usuario + Sessao + Personalizacao
```
User identity (JWT) → Session → Memory Store → Provider Router (model preference)
Workspace config → Chokidar watcher → File events → Agent context
Sessao + Decisoes → Learning Engine → Adaptive behavior
```

### Matriz Resumo de Cross-Data

| Dado Origem | Dado Destino | Pipeline | Valor Gerado |
|-------------|-------------|----------|--------------|
| AST (Tree-sitter) | Contexto LLM | Provider Router | Edicoes precisas |
| LSP Diagnostics | Memory Store | Pattern Detector | Aprendizado de erros |
| Event Bus Events | Audit Trail | Event Sourcing | Auditoria imutavel |
| Agent Messages | OpenTelemetry | LangFuse Trace | Custo por acao |
| LLM Input | Guardrails | LLM Guard | Prompt seguro |
| User JWT | Policy Engine | OPA/Cedar | Autorizacao granular |
| Git Commit | CI/CD | GitHub Actions | Build + Test |
| Feature Flags | Canary | Flagger | Rollout gradual |
| Vector Embeddings | RAG | Memory Store | Chat contextual |
| File Changes | WebSocket | File Bridge | Explorer sincrono |
| Chat Stream | Provider Router | SSE | Respostas em tempo real |
| Session Data | Learning Engine | Memory | Comportamento adaptativo |

---

## Roadmap de Adocao

### Fase 1: MVP (Semanas 1-4) — Tecnologias P0
| Tecnologia | Acao | Depende de |
|------------|------|------------|
| Monaco Editor | Ja implementado | — |
| React 18 + Vite | Ja implementado | — |
| WebSocket / SSE | Ja implementado | — |
| xterm.js | Integrar | node-pty |
| node-pty | Implementar | WebSocket |
| Ollama | Ja implementado | — |
| Provider Router | Ja implementado | — |
| LSP | Integrar Monaco providers | LSP Server |
| SQLite | Implementar persistencia | — |
| MCP | Ja implementado (expandir) | — |
| GitHub Actions | Ja implementado | — |
| Docker | Ja implementado | — |
| Message Patterns | Ja implementado (event-bus) | — |

### Fase 2: v1.1 (Semanas 5-8) — Tecnologias P1
| Tecnologia | Acao |
|------------|------|
| Tree-sitter | Implementar parsing incremental |
| Vercel AI SDK | Adotar para streaming |
| DeepSeek-Coder-V2 / Phi-4 | Configurar via Ollama |
| Redis | Implementar cache + pub/sub |
| LLM Guard / rebuff | Implementar guardrails |
| OWASP LLM Top 10 | Baseline seguranca |
| Sentry | Error tracking |
| OpenTelemetry | Instrumentar |
| LangFuse | Tracing LLM |
| Arquivos/Artifacts Estruturados | Padrao saida IA |

### Fase 3: v1.2 (Semanas 9-16) — Tecnologias P2
| Tecnologia | Acao |
|------------|------|
| Electron / Tauri | Empacotamento desktop |
| WebAssembly | Tree-sitter Wasm, plugins |
| VS Code Extensions | Bridge compatibilidade |
| Qwen2.5-Coder / StarCoder2 | Modelos adicionais |
| CodeMirror | Chat code blocks |
| Neo4j | Knowledge graph |
| DuckDB | Analytics local |
| Mem0 / Zep | Memory layer avancada |
| GraphRAG | RAG com knowledge graph |
| NATS + JetStream | Upgrade event bus |
| OpenRouter | Gateway multi-provider |
| OPA / Cedar | Policy engine padrao |
| PostgreSQL + pgvector | Storage relacional |
| Kubernetes | Orquestracao deploy |
| Terraform / OpenTofu | IaC |
| Prometheus + Grafana | Monitoramento |
| Loki | Logging centralizado |
| DAP | Debug integration |
| JWT / RBAC / OAuth2 | Identidade |
| A2A Protocol | Comunicacao agentes |

### Fase 4: v2+ (Semana 17+) — Tecnologias P3
| Tecnologia | Acao |
|------------|------|
| Theia | Possivel substituicao IDE |
| LangChain / LangGraph | Se graphs complexos |
| Semantic Kernel | Alternativa LangChain |
| CrewAI / AutoGen | Multi-agente |
| Mamba-2 / SSMs | Pesquisa modelos |
| Apache Kafka / Redpanda | Streaming massivo |
| RabbitMQ / Pulsar | Mensageria adicional |
| ZeroMQ | IPC local |
| Pinecone / Weaviate / Qdrant / Milvus | Vector DB escala |
| MinIO / R2 / Tigris | Object storage |
| Turso / libSQL | SQLite distribuido |
| Apache Iceberg / Delta Lake | Data lake |
| Next.js | SSR se necessario |
| WebTransport | Transporte futuro |
| FIPA-ACL | Referencia academica |
| Flagger | Canary deploy |
| Unleash / Flagsmith | Feature flags |
| ArgoCD / Flux | GitOps |
| Dagger | Pipeline portatil |
| Garak / PyRIT | Red teaming |

---

## Estatisticas da Matriz

| Metrica | Valor |
|---------|-------|
| Total de tecnologias catalogadas | **65** |
| Implementadas (✅) | **14** (22%) |
| Esqueleto/parcial (🟡) | **12** (18%) |
| Nao implementadas (❌) | **31** (48%) |
| Estudadas (📖) | **15** (23%) |
| Nao estudadas (🔬) | **13** (20%) |
| P0 (MVP obrigatorio) | **15** (23%) |
| P1 (Essencial pos-MVP) | **15** (23%) |
| P2 (Importante v1.x) | **20** (31%) |
| P3 (Desejavel v2+) | **15** (23%) |
| Maduras | **40** (62%) |
| Emergentes | **19** (29%) |
| Experimentais | **6** (9%) |

---

> **Documento gerado em:** 2026-07-17
> **Proposito:** Mapeamento tecnologico completo para a plataforma IDEIA
> **Proximo passo:** Revisao periodica a cada 3 meses para tecnologias arquivadas
