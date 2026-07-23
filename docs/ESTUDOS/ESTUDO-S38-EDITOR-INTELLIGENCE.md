# Estudo S38: Editor Intelligence & Language Features

> **Data:** 2026-07-22
> **Contexto:** IDEIA — construcao de IDE profissional com inteligencia de editor integrada
> **Objetivo:** Pesquisa aprofundada sobre Language Server Protocol (LSP), IntelliSense, semantic tokenization, diagnostics, code actions, AI-powered completions e arquitetura de providers para IDEIA
> **Base:** LSP 3.18, Monaco Editor provider API, VS Code extension API, Theia LSP integration, Copilot architecture patterns

---

## Sumario

1. [Introducao](#1-introducao)
2. [Language Server Protocol (LSP) Deep Dive](#2-language-server-protocol-lsp-deep-dive)
3. [LSP Features Matrix](#3-lsp-features-matrix)
4. [LSP Server Architecture](#4-lsp-server-architecture)
5. [Multiple Language Server Coordination](#5-multiple-language-server-coordination)
6. [IntelliSense / Code Completion](#6-intellisense--code-completion)
7. [Semantic Tokenization](#7-semantic-tokenization)
8. [Diagnostics System](#8-diagnostics-system)
9. [Code Actions (Refactoring/Quick Fix)](#9-code-actions-refactoringquick-fix)
10. [Hover & Signature Help](#10-hover--signature-help)
11. [Go To Definition & References](#11-go-to-definition--references)
12. [Document Symbols & Folding](#12-document-symbols--folding)
13. [Inlay Hints](#13-inlay-hints)
14. [Inline Completions](#14-inline-completions)
15. [AI-Powered Intelligence](#15-ai-powered-intelligence)
16. [Code Examples](#16-code-examples)
17. [Conexoes](#17-conexoes)
18. [Plano de Implementacao](#18-plano-de-implementacao)

---

## 1. Introducao

### 1.1 Editor Intelligence como Valor Central

Editor intelligence e o conjunto de capacidades que transforma um editor de texto generico em uma IDE profissional. A evolucao segue tres geracoes:

```
GERACAO 1 (1980-2000) — Syntax Highlighting
  +-- Editores: vi, Emacs, Brief
  +-- Capacidade: colorizacao baseada em regex
  +-- Arquitetura: single-thread, parsing local

GERACAO 2 (2001-2015) — Code Intelligence (LSP era)
  +-- Editores: VS Code, IntelliJ, Eclipse
  +-- Capacidade: completions, hover, definicao, refactoring
  +-- Arquitetura: Language Server Protocol (JSON-RPC)
  +-- Destaque: LSP separa cliente (editor) do servidor (linguagem)

GERACAO 3 (2016-presente) — AI-Powered Intelligence
  +-- Editores: VS Code + Copilot, Cursor, Windsurf
  +-- Capacidade: ghost text, chat contextual, code generation
  +-- Arquitetura: LLM + RAG + LSP hibrido
  +-- Destaque: IA nao substitui LSP, aumenta providers
```

### 1.2 Arquitetura em Camadas

```
┌──────────────────────────────────────────────────────────────────┐
│                    EDITOR INTELLIGENCE STACK                       │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  LAYER 5: AI AGENTS (Copilot-style, chat, generation)      │  │
│  │  +-- InlineCompletions, Chat, CodeGen, TestGen              │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  LAYER 4: IDEIA INTELLIGENCE (RAG, pattern detection)      │  │
│  │  +-- Context-aware suggestions, learning engine             │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  LAYER 3: LSP BRIDGE (Language Server Protocol)            │  │
│  │  +-- Completion, Hover, Definition, Diagnostics            │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  LAYER 2: SEMANTIC ANALYSIS (Tokenizer -> Parser -> AST)   │  │
│  │  +-- Syntax tokens, semantic tokens, scope resolution      │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  LAYER 1: TOKENIZER (Lexer -> Syntax Highlighting)        │  │
│  │  +-- Monarch, TextMate grammars, regex-based coloring      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Fluxo do usuario:                                                │
│  Teka -> Tokenizer -> Parser -> Semantic -> LSP -> AI            │
└──────────────────────────────────────────────────────────────────┘
```

### 1.3 Papeis na IDEIA

| Componente | Funcao | Responsabilidade |
|-----------|--------|-----------------|
| LSP Client | Bridge entre Monaco e Language Servers | Traduz providers Monaco em chamadas LSP |
| LSP Server | Logica da linguagem (parse, type check, completions) | Executa em processo separado |
| Completion Engine | Merge de resultados LSP + AI + snippets | Ordenacao, filtro, ranking |
| Diagnostic System | Coleta e exibe erros/warnings do LSP e linters | Problems panel, squiggly lines |
| AI Provider | Copilot-style completions e chat | LLM inference, contexto do editor |
| Resolve Pipeline | Enriquecimento lazy de items (documentacao, detalhes) | Chamada sob demanda |

---

## 2. Language Server Protocol (LSP) Deep Dive

### 2.1 Visao Geral LSP 3.18

LSP e um protocolo padrao entre um editor (cliente) e um servidor de linguagem. Define JSON-RPC 2.0 como transporte e mensagens request/response/notification.

```
EDITOR (CLIENT)                    LANGUAGE SERVER
+------------------+               +-------------------+
|                  | -- initialize -->                  |
|  Monaco Editor   | <-- initialized -- |  TypeScript   |
|  + LSP Client    |                   |  Server (ts)   |
|                  | -- didOpen ------> |  + Parser      |
|                  | -- didChange ----> |  + Type Check  |
|                  | <-- publishDiag-- |  + Completions |
|                  |                   |  + Hover       |
|                  | -- completion ---> |                |
|                  | <-- result ------ |                |
+------------------+                   +-------------------+
```

### 2.2 Transport Layer

| Transporte | Uso | Vantagens | Desvantagens |
|-----------|-----|-----------|-------------|
| stdin/stdout | Default para servidores locais | Zero config, pipe nativo | Apenas local, sem multiplex |
| TCP | Servidores remotos | Conexao persistente, multiplos clientes | Configuracao de porta |
| WebSocket | Web/Theia Cloud | Funciona em browser | Overhead de handshake |

### 2.3 Protocolo JSON-RPC

```typescript
interface RequestMessage {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

interface ResponseMessage {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: ResponseError;
}

interface NotificationMessage {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

interface ResponseError {
  code: number;
  message: string;
  data?: unknown;
}
```

Codigos de erro padrao:

| Codigo | Significado |
|--------|-------------|
| -32700 | Parse error |
| -32600 | Invalid Request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| -32099 | Server not initialized |
| -32002 | Server cancelled |
| -32001 | Content modified |
| -32000 | Request cancelled |

### 2.4 Inicializacao (Lifecycle)

```
CLIENT                              SERVER
  |                                    |
  |-------- initialize(params) ------> |
  |         {processId, capabilities,  |
  |          clientInfo, workspace-   |
  |          folders, rootUri, ...}  |
  |                                    |
  |<------ initialized(result) -------|
  |         {capabilities, serverInfo,|
  |          serverOptions}           |
  |                                    |
  |-------- initialized (notif) ------>|  <-- servidor pronto
  |                                    |
  |-------- didOpen (notif) --------->|
  |-------- didChange (notif) ------->|
  |<------- publishDiagnostics -------|
  |-------- completion(params) ------>|
  |<------- CompletionList -----------|
```

### 2.5 Server Capabilities

```typescript
interface ServerCapabilities {
  textDocumentSync?: TextDocumentSyncOptions;
  completionProvider?: CompletionOptions;
  hoverProvider?: boolean;
  definitionProvider?: boolean;
  referencesProvider?: boolean;
  documentHighlightProvider?: boolean;
  documentSymbolProvider?: boolean;
  workspaceSymbolProvider?: boolean;
  codeActionProvider?: CodeActionOptions;
  codeLensProvider?: CodeLensOptions;
  documentFormattingProvider?: boolean;
  documentRangeFormattingProvider?: boolean;
  documentOnTypeFormattingProvider?: DocumentOnTypeFormattingOptions;
  renameProvider?: RenameOptions;
  documentLinkProvider?: DocumentLinkOptions;
  executeCommandProvider?: ExecuteCommandOptions;
  typeDefinitionProvider?: boolean | TypeDefinitionOptions;
  implementationProvider?: boolean | ImplementationOptions;
  colorProvider?: boolean | ColorOptions;
  foldingRangeProvider?: boolean | FoldingRangeOptions;
  declarationProvider?: boolean | DeclarationOptions;
  selectionRangeProvider?: boolean | SelectionRangeOptions;
  semanticTokensProvider?: SemanticTokensOptions;
  monikerProvider?: boolean | MonikerOptions;
  linkedEditingRangeProvider?: boolean | LinkedEditingRangeOptions;
  inlayHintProvider?: boolean | InlayHintOptions;
  inlineCompletionProvider?: boolean | InlineCompletionOptions;
  inlineValueProvider?: boolean | InlineValueOptions;
  diagnosticProvider?: DiagnosticOptions;
  typeHierarchyProvider?: boolean | TypeHierarchyOptions;
  workspace?: {
    workspaceFolders?: WorkspaceFoldersServerCapabilities;
    fileOperations?: FileOperationOptions;
  };
  window?: {
    workDoneProgress?: boolean;
    showMessage?: boolean;
    showDocument?: Support;
  };
}
```

### 2.6 Text Synchronization

```typescript
type TextDocumentSyncKind = 0 | 1 | 2;
// 0 = None (servidor nao sincroniza)
// 1 = Full (envia documento inteiro a cada mudanca)
// 2 = Incremental (envia apenas alteracoes)

interface TextDocumentSyncOptions {
  openClose: boolean;   // didOpen/didClose notifications
  change: TextDocumentSyncKind;
  willSave: boolean;
  willSaveWaitUntil: boolean;
  save: SaveOptions;
}
```

Incremental sync e preferivel para performance:

```typescript
interface DidChangeTextDocumentParams {
  textDocument: VersionedTextDocumentIdentifier;
  contentChanges: TextDocumentContentChangeEvent[];
}

interface TextDocumentContentChangeEvent {
  range?: Range;        // null = documento completo
  rangeLength?: number; // comprimento do range substituido
  text: string;         // novo texto no range
}
```

### 2.7 Watch Files

```typescript
interface DidChangeWatchedFilesRegistrationOptions {
  watchers: FileSystemWatcher[];
}

interface FileSystemWatcher {
  globPattern: string;
  kind?: WatchKind;
}

type WatchKind = 1 | 2 | 3;
// 1 = Create, 2 = Change, 3 = Create + Change
```

### 2.8 Progress Reporting

```typescript
interface WorkDoneProgressBegin {
  kind: 'begin';
  title: string;
  cancellable?: boolean;
  message?: string;
  percentage?: number;
}

interface WorkDoneProgressReport {
  kind: 'report';
  cancellable?: boolean;
  message?: string;
  percentage?: number;
}

interface WorkDoneProgressEnd {
  kind: 'end';
  message?: string;
}
```

O cliente inicia com `window/workDoneProgress/create` e o servidor envia notificacoes `$/progress`.

---

## 3. LSP Features Matrix

### 3.1 Completamento (textDocument/completion)

```typescript
interface CompletionParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
  context?: CompletionContext;
}

interface CompletionContext {
  triggerKind: CompletionTriggerKind;
  triggerCharacter?: string;
}

type CompletionTriggerKind = 1 | 2 | 3;
// 1 = Invoked, 2 = TriggerCharacter, 3 = TriggerForIncompleteCompletions
```

```typescript
interface CompletionItem {
  label: string | CompletionItemLabel;
  kind?: CompletionItemKind;
  tags?: CompletionItemTag[];
  detail?: string;
  documentation?: string | MarkupContent;
  deprecated?: boolean;
  preselect?: boolean;
  sortText?: string;
  filterText?: string;
  insertText?: string;
  insertTextFormat?: InsertTextFormat;
  textEdit?: TextEdit | InsertReplaceEdit;
  additionalTextEdits?: TextEdit[];
  commitCharacters?: string[];
  command?: Command;
  data?: unknown;
}

interface CompletionItemLabel {
  label: string;
  detail?: string;
  description?: string;
}

type CompletionItemKind = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25;

// Text, Method, Function, Constructor, Field, Variable, Class,
// Interface, Module, Property, Unit, Value, Enum, Keyword,
// Snippet, Color, File, Reference, Folder, EnumMember,
// Constant, Struct, Event, Operator, TypeParameter

type InsertTextFormat = 1 | 2;
// 1 = PlainText, 2 = Snippet

type CompletionItemTag = 1;
// 1 = Deprecated

interface InsertReplaceEdit {
  newText: string;
  insert: Range;
  replace: Range;
}
```

### 3.2 Hover (textDocument/hover)

```typescript
interface HoverParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

interface Hover {
  contents: MarkupContent | MarkedString | MarkedString[];
  range?: Range;
}

interface MarkupContent {
  kind: MarkupKind;
  value: string;
}

type MarkupKind = 'plaintext' | 'markdown';

type MarkedString = string | { language: string; value: string };
// Deprecated in LSP 3.18, use MarkupContent
```

### 3.3 Definicao e Referencias

```typescript
interface DefinitionParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

// Retorno: Location | Location[] | LocationLink[]
interface Location {
  uri: DocumentUri;
  range: Range;
}

interface LocationLink {
  originSelectionRange?: Range;
  targetUri: DocumentUri;
  targetRange: Range;
  targetSelectionRange: Range;
}

// Referencias
interface ReferenceParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
  context: ReferenceContext;
}

interface ReferenceContext {
  includeDeclaration: boolean;
}
```

### 3.4 Document Symbols

```typescript
interface DocumentSymbolParams {
  textDocument: TextDocumentIdentifier;
}

// Hierarchical (preferido)
interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  tags?: SymbolTag[];
  deprecated?: boolean;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

// Flat (deprecated, manter compatibilidade)
interface SymbolInformation {
  name: string;
  kind: SymbolKind;
  tags?: SymbolTag[];
  deprecated?: boolean;
  location: Location;
  containerName?: string;
}

type SymbolKind = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25 | 26;

// File, Module, Namespace, Package, Class, Method, Property,
// Field, Constructor, Enum, Interface, Function, Variable,
// Constant, String, Number, Boolean, Array, Object, Key,
// Null, EnumMember, Struct, Event, Operator, TypeParameter
```

### 3.5 Code Actions

```typescript
interface CodeActionParams {
  textDocument: TextDocumentIdentifier;
  range: Range;
  context: CodeActionContext;
}

interface CodeActionContext {
  diagnostics: Diagnostic[];
  only?: string[];           // filtra kinds desejados
  triggerKind?: CodeActionTriggerKind;
}

type CodeActionTriggerKind = 1 | 2;
// 1 = Invoked, 2 = Automatic

interface CodeAction {
  title: string;
  kind?: string;
  diagnostics?: Diagnostic[];
  isPreferred?: boolean;
  disabled?: string;          // se nao disponivel, razao
  edit?: WorkspaceEdit;
  command?: Command;
  data?: unknown;
}

interface CodeActionOptions {
  codeActionKinds?: string[];
  resolveProvider?: boolean;
}
```

CodeActionKind hierarchy:

```
quickfix
refactor
refactor.extract
refactor.extract.function
refactor.extract.constant
refactor.extract.variable
refactor.inline
refactor.rewrite
refactor.move
source
source.organizeImports
source.fixAll
source.fixAll.tslint
notebook
```

### 3.6 Code Lens

```typescript
interface CodeLensParams {
  textDocument: TextDocumentIdentifier;
}

interface CodeLens {
  range: Range;
  command?: Command;
  data?: unknown;          // para resolve
}

interface CodeLensOptions {
  resolveProvider?: boolean;
}
```

### 3.7 Document Link

```typescript
interface DocumentLinkParams {
  textDocument: TextDocumentIdentifier;
}

interface DocumentLink {
  range: Range;
  target?: string;         // URI para onde o link aponta
  tooltip?: string;
  data?: unknown;
}
```

### 3.8 Formatacao

```typescript
// Documento completo
interface DocumentFormattingParams {
  textDocument: TextDocumentIdentifier;
  options: FormattingOptions;
}

// Range especifico
interface DocumentRangeFormattingParams {
  textDocument: TextDocumentIdentifier;
  range: Range;
  options: FormattingOptions;
}

// Ao digitar
interface DocumentOnTypeFormattingParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
  ch: string;            // caractere que disparou
  options: FormattingOptions;
}

interface FormattingOptions {
  tabSize: number;
  insertSpaces: boolean;
  trimTrailingWhitespace?: boolean;
  insertFinalNewline?: boolean;
  trimFinalNewlines?: boolean;
  [key: string]: unknown; // propriedades de formatador especificas
}
```

### 3.9 Rename

```typescript
interface RenameParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
  newName: string;
}

interface RenameOptions {
  prepareProvider?: boolean; // suporta prepareRename
}

// Prepare Rename
interface PrepareRenameParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

// Retorno: Range | { range: Range; placeholder: string } | null
// null = rename nao disponivel na posicao

interface WorkspaceEdit {
  changes?: Record<string, TextEdit[]>;     // uri -> edits
  documentChanges?: TextDocumentEdit[];
  changeAnnotations?: Record<string, ChangeAnnotation>;
}

interface TextDocumentEdit {
  textDocument: VersionedTextDocumentIdentifier;
  edits: TextEdit[] | AnnotatedTextEdit[];
}
```

### 3.10 Signature Help

```typescript
interface SignatureHelpParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
  context?: SignatureHelpContext;
}

interface SignatureHelpContext {
  triggerKind: SignatureHelpTriggerKind;
  triggerCharacter?: string;
  isRetrigger: boolean;
  activeSignatureHelp?: SignatureHelp;
}

type SignatureHelpTriggerKind = 1 | 2 | 3;
// 1 = Invoked, 2 = TriggerCharacter, 3 = ContentChange

interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature: number;
  activeParameter: number;
}

interface SignatureInformation {
  label: string;
  documentation?: string | MarkupContent;
  parameters?: ParameterInformation[];
  activeParameter?: number;
}

interface ParameterInformation {
  label: string | [number, number]; // offset no label da signature
  documentation?: string | MarkupContent;
}
```

### 3.11 Inlay Hints

```typescript
interface InlayHintParams {
  textDocument: TextDocumentIdentifier;
  range: Range;
}

interface InlayHint {
  position: Position;
  label: string | InlayHintLabelPart[];
  kind?: InlayHintKind;
  textEdits?: TextEdit[];
  tooltip?: string | MarkupContent;
  paddingLeft?: boolean;
  paddingRight?: boolean;
  data?: unknown;
}

interface InlayHintLabelPart {
  value: string;
  tooltip?: string | MarkupContent;
  location?: Location;
  command?: Command;
}

type InlayHintKind = 1 | 2;
// 1 = Type, 2 = Parameter
```

### 3.12 Inline Completions

```typescript
interface InlineCompletionParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
  context: InlineCompletionContext;
}

interface InlineCompletionContext {
  triggerKind: InlineCompletionTriggerKind;
  selectedCompletionInfo?: SelectedCompletionInfo;
}

type InlineCompletionTriggerKind = 0 | 1 | 2;
// 0 = Invoked, 1 = Automatic, 2 = DidShowCompletionItem

interface SelectedCompletionInfo {
  range: Range;
  text: string;
}

interface InlineCompletionList {
  items: InlineCompletionItem[];
}

interface InlineCompletionItem {
  insertText: string | StringValue;
  filterText?: string;
  range?: Range;
  command?: Command;
}

interface StringValue {
  kind: 'snippet';
  value: string;
}
```

### 3.13 Semantic Tokens

```typescript
interface SemanticTokensParams {
  textDocument: TextDocumentIdentifier;
}

interface SemanticTokens {
  resultId?: string;
  data: number[]; // Uint32Array relativo
}

interface SemanticTokensEdit {
  start: number;
  deleteCount: number;
  data?: number[];
}

// Delta: reusa resultado anterior + edits
interface SemanticTokensDelta {
  resultId?: string;
  edits: SemanticTokensEdit[];
}

interface SemanticTokensRangeParams {
  textDocument: TextDocumentIdentifier;
  range: Range;
}

interface SemanticTokensLegend {
  tokenTypes: string[];
  tokenModifiers: string[];
}

interface SemanticTokensOptions {
  legend: SemanticTokensLegend;
  range?: boolean | {};
  full?: boolean | { delta?: boolean };
}
```

### 3.14 Outros Features

```typescript
// Folding Range
interface FoldingRangeParams {
  textDocument: TextDocumentIdentifier;
}

interface FoldingRange {
  startLine: number;
  endLine: number;
  kind?: FoldingRangeKind;  // 'comment' | 'imports' | 'region'
  collapsedText?: string;
}

// Selection Range
interface SelectionRangeParams {
  textDocument: TextDocumentIdentifier;
  positions: Position[];
}

interface SelectionRange {
  range: Range;
  parent?: SelectionRange;
}

// Linked Editing Range
interface LinkedEditingRangeParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

interface LinkedEditingRanges {
  ranges: Range[];
  wordPattern?: string; // regex pattern
}

// Moniker
interface MonikerParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

interface Moniker {
  scheme: string;
  identifier: string;
  unique: UniquenessLevel;
  kind?: MonikerKind;
}

type UniquenessLevel = 'document' | 'project' | 'group' | 'scheme' | 'global';
type MonikerKind = 'import' | 'export' | 'local';

// Type Hierarchy
interface TypeHierarchyParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
  direction: TypeHierarchyDirection;
}

type TypeHierarchyDirection = 0 | 1; // 0 = subtypes, 1 = supertypes

interface TypeHierarchyItem {
  name: string;
  kind: SymbolKind;
  tags?: SymbolTag[];
  detail?: string;
  uri: DocumentUri;
  range: Range;
  selectionRange: Range;
  data?: unknown;
}

// Inline Value
interface InlineValueParams {
  textDocument: TextDocumentIdentifier;
  range: Range;
  context: InlineValueContext;
}

interface InlineValueContext {
  frameId: number;
  stoppedLocation: Range;
}

// Workspace Diagnostics
interface WorkspaceDiagnosticParams {
  identifier?: string;
  previousResultIds: PreviousResultId[];
}

interface PreviousResultId {
  uri: DocumentUri;
  value: string;
}
```

---

## 4. LSP Server Architecture

### 4.1 Server Lifecycle

```
INITIALIZING
  |-- Recebe initialize do cliente
  |-- Valida params (rootUri, capabilities)
  |-- Registra handlers
  |-- Retorna ServerCapabilities
  v
INITIALIZED
  |-- Recebe initialized notification
  |-- Inicia watchers (workspace, file system)
  |-- Indexa workspace (opcional, lazy)
  |-- Pronto para requisicoes
  v
RUNNING
  |-- Processa requisicoes normalmente
  |-- Gerencia documentos abertos (didOpen/didChange)
  |-- Publica diagnostics
  |-- Suporta progress reports
  v
SHUTTING_DOWN
  |-- Recebe shutdown (request)
  |-- Cleanup resources
  |-- Retorna void
  v
EXITING
  |-- Recebe exit (notification)
  |-- Process.exit(0)
```

### 4.2 Initialization Sequence

```typescript
interface InitializeParams {
  processId: number | null;
  clientInfo?: { name: string; version?: string };
  locale?: string;
  rootPath?: string;
  rootUri: DocumentUri | null;
  capabilities: ClientCapabilities;
  initializationOptions?: unknown;
  trace?: TraceValue;
  workspaceFolders?: WorkspaceFolder[] | null;
}

interface InitializeResult {
  capabilities: ServerCapabilities;
  serverInfo?: { name: string; version?: string };
}
```

### 4.3 Custom Protocol Extensions (IDEIA-specific)

A IDEIA introduz extensoes customizadas ao LSP para features de IA:

```typescript
// IDEIA extension methods (prefixo: IDEIA/)
const IDEIA_LSP_EXTENSIONS = {
  // Completacao aumentada com contexto de IA
  'IDEIA/completion': 'IDEIA/completion',

  // Diagnostico com AI suggestions
  'IDEIA/codeAction': 'IDEIA/codeAction',

  // Chat contextual no editor
  'IDEIA/chat': 'IDEIA/chat',

  // Geracao de codigo (testes, documentacao)
  'IDEIA/generate': 'IDEIA/generate',

  // Explicacao de codigo
  'IDEIA/explain': 'IDEIA/explain',

  // Refatoracao inteligente
  'IDEIA/refactor': 'IDEIA/refactor',

  // Contexto enriquecido do workspace
  'IDEIA/context': 'IDEIA/context',

  // Pattern detection
  'IDEIA/patterns': 'IDEIA/patterns',
};

// Server capability para IDEIA extensions
interface IDEIAServerCapabilities {
  'IDEIAProvider'?: {
    completion: boolean;
    codeAction: boolean;
    chat: boolean;
    generate: boolean;
    explain: boolean;
    refactor: boolean;
    context: boolean;
    patterns: boolean;
  };
}
```

### 4.4 Document Synchronization Strategies

| Strategy | Sincronizacao | Uso | Performance |
|----------|-------------|-----|-------------|
| Full | Documento completo a cada change | Simples, todo servidor suporta | Ruim para arquivos grandes |
| Incremental | Apenas ranges alterados | Performance, edicoes grandes | Bom, maioria dos servidores |
| Pull | Servidor solicita quando precisa | LSP 3.18, economiza rede | Otimo para servidores remotos |

Pull diagnostics (LSP 3.18):

```typescript
// Cliente solicita diagnostics sob demanda
interface DiagnosticParams {
  textDocument: TextDocumentIdentifier;
  identifier?: string;
  previousResultId?: string;
}

// vs push diagnostics (tradicional)
// Servidor publica diagnostics automaticamente via notification
interface PublishDiagnosticsParams {
  uri: DocumentUri;
  diagnostics: Diagnostic[];
  version?: number;
}
```

### 4.5 Workspace Folder Management

```typescript
interface DidChangeWorkspaceFoldersParams {
  event: {
    added: WorkspaceFolder[];
    removed: WorkspaceFolder[];
  };
}

interface WorkspaceFolder {
  uri: string;
  name: string;
}
```

Servidores devem:
1. Remover diagnostics de pastas removidas
2. Indexar novas pastas adicionadas
3. Atualizar workspace-wide queries (symbol search)

---

## 5. Multiple Language Server Coordination

### 5.1 Modelos de Coordenacao

```
MODELO A: Um servidor por workspace
  +-- Simples, um processo para tudo
  +-- Problema: linguagens diferentes precisam de servidores diferentes

MODELO B: Um servidor por linguagem
  +-- Cada linguagem tem seu proprio LSP server
  +-- Cliente roteia requisicoes por languageId
  +-- Padrao VS Code / Theia

MODELO C: Servidores em cascata
  +-- Servidor principal + servidores delegados
  +-- Ex: TypeScript server + Tailwind CSS server
  +-- Cliente decide prioridade

MODELO D: Feature-level delegation
  +-- Um server para completions, outro para diagnostics
  +-- Maxima flexibilidade, complexa coordenacao

┌──────────────────────────────────────────────────────────────────┐
│                  IDEIA MULTI-LSP ARCHITECTURE                      │
│                                                                   │
│  Editor (Monaco) -> LanguageRouter -> FeatureRouter               │
│       |                 |                   |                      │
│       |                 v                   v                      │
│       |          +--------------+   +---------------+             │
│       |          | Language     |   | Feature       |             │
│       |          | Router       |   | Router        |             │
│       |          +--------------+   +---------------+             │
│       |                 |                   |                      │
│       v                 v                   v                      │
│  +-----------+   +-----------+   +-----------+                    │
│  | LSP Server|   | LSP Server|   | AI Server |                    │
│  | (TS)      |   | (Python)  |   | (Copilot) |                    │
│  +-----------+   +-----------+   +-----------+                    │
│       |                 |                   |                      │
│       +-----------------+-------------------+                     │
│                         |                                           │
│                         v                                           │
│                  Result Merger                                     │
│                  (merge, dedup, rank)                              │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Feature-Level Ranked Delegation

```typescript
interface LanguageServerRegistration {
  id: string;
  languageIds: string[];
  serverKind: 'lsp' | 'ai' | 'linter' | 'formatter';
  features: ServerFeature[];
  priority: number;          // maior = mais preferido
  supportsResolve: boolean;
}

interface ServerFeature {
  name: string;              // 'completion', 'hover', 'diagnostics'
  capability: string;        // server capability name
  priority: number;          // feature-level priority
  timeoutMs: number;         // max wait before fallback
}

class FeatureDelegationRouter {
  private servers: LanguageServerRegistration[] = [];

  routeRequest<T>(
    feature: string,
    languageId: string,
    params: unknown,
    token: CancellationToken
  ): AsyncIterable<{ server: string; result: T }> {
    const candidates = this.servers
      .filter(s => s.languageIds.includes(languageId))
      .filter(s => s.features.some(f => f.name === feature))
      .sort((a, b) => b.priority - a.priority);

    // Chama em paralelo, coleta resultados
    // Aplica timeout por feature
    // Retorna primeiro ou merge (depende da feature)
    return this.executeWithTimeout(candidates, feature, params, token);
  }

  private async *executeWithTimeout<T>(
    candidates: LanguageServerRegistration[],
    feature: string,
    params: unknown,
    token: CancellationToken
  ): AsyncIterable<{ server: string; result: T }> {
    const promises = candidates.map(async server => {
      const timeout = server.features.find(f => f.name === feature)?.timeoutMs ?? 5000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const result = await this.callServerFeature(server, feature, params, controller.signal);
        return { server: server.id, result: result as T };
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    });

    const settled = await Promise.allSettled(promises);
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) {
        yield s.value;
      }
    }
  }
}
```

### 5.3 Fallback Chain

| Feature | Primary | Fallback 1 | Fallback 2 |
|---------|---------|-----------|------------|
| Completion | LSP Server (TS) | AI Server | Snippets |
| Hover | LSP Server | AI Server | - |
| Diagnostics | LSP Server | Linter (ESLint) | - |
| Code Action | LSP Server | AI Server | Built-in |
| Inline Completion | AI Server | LSP Server | - |
| Semantic Tokens | LSP Server | TextMate | Monarch |

---

## 6. IntelliSense / Code Completion

### 6.1 Completion Pipeline

```
Usuario digita "cons"
        |
        v
+-----------------+
| 1. TRIGGER      |  Caractere digitado (. ou letra apos palavra)
+-----------------+  triggerCharacters do CompletionProvider
        |
        v
+-----------------+
| 2. CONTEXT      |  Coleta: prefixo, posicao, languageId
|    COLLECTION   |  Contexto: palavra atual, escopo, imports
+-----------------+
        |
        v
+-----------------+
| 3. PROVIDERS    |  Chama providers em paralelo:
|    EXECUTION    |    + LSP Server -> CompletionList
|                 |    + AI Server  -> AI suggestions
|                 |    + Snippet Provider -> snippets
|                 |    + Keyword Provider -> linguagem keywords
+-----------------+
        |
        v
+-----------------+
| 4. FILTER       |  Filtra por prefixo (fuzzy, camelCase, substring)
+-----------------+  Aplica filterText de cada item
        |
        v
+-----------------+
| 5. SORT/RANK    |  Ordena por: recencia, frequencia, semantica
+-----------------+  sortText, preselect, isPreferred
        |
        v
+-----------------+
| 6. DISPLAY      |  Renderiza widget de completacao
+-----------------+  Mostra: label, kind, detail, documentation
        |
        v
+-----------------+
| 7. RESOLVE      |  Usuario seleciona -> resolveCompletionItem
|    (lazy)       |  Enriquece: documentation, additionalTextEdits
+-----------------+
        |
        v
+-----------------+
| 8. COMMIT       |  Aplica insertText (plain ou snippet)
+-----------------+  Aplica additionalTextEdits, commitCharacters
```

### 6.2 Completion Quality Factors

```typescript
interface CompletionRankingScore {
  recencyScore: number;      // 0-1: quao recente o item foi usado
  frequencyScore: number;    // 0-1: frequencia de uso historica
  semanticScore: number;     // 0-1: relevancia semantica (tipo, escopo)
  scopeScore: number;        // 0-1: se esta no escopo atual
  editDistance: number;      // 0-1: distancia de edicao para o prefixo
  localityScore: number;     // 0-1: proximidade no arquivo atual
  projectScore: number;      // 0-1: relevancia no projeto (vs libs)
}

function rankCompletionItems(
  items: CompletionItem[],
  context: CompletionContext,
  history: UsageHistory
): CompletionItem[] {
  return items
    .map(item => ({
      item,
      score: computeScore(item, context, history),
    }))
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.item);
}
```

### 6.3 Matching Algorithms

```typescript
type MatchKind = 'prefix' | 'substring' | 'camelCase' | 'fuzzy';

interface MatchResult {
  matched: boolean;
  kind: MatchKind;
  score: number;
  highlights: [number, number][]; // ranges para highlight
}

function matchCompletion(
  filterText: string,
  prefix: string
): MatchResult {
  // Prefix match (mais forte)
  if (filterText.startsWith(prefix)) {
    return { matched: true, kind: 'prefix', score: 100, highlights: [[0, prefix.length]] };
  }

  // Substring match
  const idx = filterText.toLowerCase().indexOf(prefix.toLowerCase());
  if (idx !== -1) {
    return { matched: true, kind: 'substring', score: 75, highlights: [[idx, idx + prefix.length]] };
  }

  // CamelCase match (e.g. "getUser" matches "gu")
  const camelParts = filterText.split(/(?=[A-Z])/);
  const camelMatch = matchCamelCase(camelParts, prefix);
  if (camelMatch) {
    return { matched: true, kind: 'camelCase', score: 85, highlights: camelMatch };
  }

  // Fuzzy match (e.g. "gub" matches "getUserByName")
  const fuzzyResult = fuzzyMatch(filterText, prefix);
  if (fuzzyResult.matched) {
    return { matched: true, kind: 'fuzzy', score: fuzzyResult.score, highlights: fuzzyResult.highlights };
  }

  return { matched: false, kind: 'prefix', score: 0, highlights: [] };
}
```

### 6.4 Completion Categories

| Category | Kind | Source | Example |
|----------|------|--------|---------|
| Keywords | Keyword | Built-in | `if`, `return`, `class` |
| Snippets | Snippet | SnippetProvider | `for(;;) {}`, `console.log` |
| Functions | Function | LSP | `fetchData()`, `map()` |
| Variables | Variable | LSP | `userName`, `config` |
| Types | Class/Interface | LSP | `UserService`, `Config` |
| Modules | Module | LSP | `fs`, `path`, `express` |
| Properties | Property | LSP | `.length`, `.toString()` |
| Constants | Constant | LSP | `MAX_RETRIES`, `PI` |

### 6.5 Snippet Syntax

```typescript
interface Snippet {
  body: string | string[];
  prefix?: string;
  description?: string;
  scope?: string; // language scope
}

// Variaveis de snippet:
// $1, $2, $3            -> tab stops
// ${1:default}          -> tab stop com valor default
// ${1|option1,option2|} -> tab stop com escolha
// $0                    -> cursor final
// $TM_FILENAME          -> filename of current document
// $TM_FILENAME_BASE     -> filename without extension
// $TM_DIRECTORY         -> directory of document
// $TM_FILEPATH          -> full file path
// $TM_LINE_INDEX        -> line number (0-based)
// $TM_LINE_NUMBER       -> line number (1-based)
// $TM_SELECTED_TEXT     -> texto selecionado
// $TM_CURRENT_LINE      -> linha atual
// $TM_CURRENT_WORD      -> palavra atual
// ${RELATIVE_FILEPATH}  -> file path relative to workspace

// Exemplo: for loop snippet
const forLoopSnippet = {
  body: 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t$0\n}',
  prefix: 'for',
  description: 'For loop',
};
```

---

## 7. Semantic Tokenization

### 7.1 Semantic vs Syntax Tokens

```
SYNTAX TOKENS (TextMate/Monarch)
  +-- Baseados em regex e escopos textmate
  +-- Rois: keywords, strings, comments, numbers
  +-- Sem contexto semantico (nao sabe se e variavel ou funcao)
  +-- Rapido, roda em worker

SEMANTIC TOKENS (LSP)
  +-- Baseados em AST e type checking do Language Server
  +-- Sabem o significado: funcao, parametro, tipo, enum membro
  +-- Incluem modificadores: readonly, static, deprecated
  +-- Mais lentos, mas precisos
  +-- Sobrescrevem syntax tokens (layering)

┌──────────────────────────────────────────────────────────────────┐
│                  TOKEN RENDERING LAYERS                            │
│                                                                   │
│  1. TextMate/Monarch tokens (baseline)                            │
│  2. Semantic tokens overlay (sobrescreve onde disponivel)         │
│  3. Editor decorations (diagnostics, highlights)                  │
│  4. Inlay hints (texto entre caracteres)                          │
│                                                                   │
│  Resultado final:                                                  │
│  const x: number = 42;                                            │
│  ^^^^^ ^  ^^^^^^   ^^                                             │
│  keyword  variable type   number                                   │
│  (semantic override)                                              │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Semantic Token Legend

```typescript
// Token Types (padrao LSP)
const STANDARD_TOKEN_TYPES = [
  'namespace', 'type', 'class', 'enum', 'interface',
  'struct', 'typeParameter', 'parameter', 'variable',
  'property', 'enumMember', 'event', 'function',
  'method', 'macro', 'keyword', 'modifier', 'comment',
  'string', 'number', 'regexp', 'operator', 'decorator',
];

// Token Modifiers
const STANDARD_TOKEN_MODIFIERS = [
  'declaration',   // item e uma declaracao
  'definition',    // item e uma definicao
  'readonly',      // item e readonly
  'static',        // item e static
  'deprecated',    // item esta deprecated
  'abstract',      // item e abstrato
  'async',         // item e async
  'modification',  // item foi modificado
  'documentation', // item e documentacao
  'defaultLibrary',// item vem de lib padrao
];

// Legend enviada pelo server
interface SemanticTokensLegend {
  tokenTypes: string[];     // indices: 0..n
  tokenModifiers: string[]; // indices: 0..n
}

// Exemplo: function declaration tem type=function, modifier=declaration
```

### 7.3 Encoding

```typescript
// Data: array de inteiros (5 valores por token)
// [deltaLine, deltaStartChar, length, tokenType, tokenModifiers]

// Token na linha 3, coluna 10, tamanho 5, type=function(14), modifier=declaration(1)
// [3, 10, 5, 14, 1]

// Segundo token na mesma linha:
// [0, 5, 3, 0, 0]
//  ^deltaLine=0 (mesma linha), deltaStartChar=5 (coluna 10+5=15... wait)
//  start = previousStart(10) + previousLength(5) = 15 ... delta = 15 - 10 = 5? No.
//  O encoding e relativo: novo startChar = previous.startChar + previous.length + delta
//  Entao se prev=10, prevLen=5: novo=10+5+5=20, mas com delta=5: 10+5=15 nao 20...
//  Actually: start = previous.start + previous.length + deltaStartChar

function decodeSemanticTokens(data: number[], legend: SemanticTokensLegend): DecodedToken[] {
  const tokens: DecodedToken[] = [];
  let line = 0;
  let startChar = 0;

  for (let i = 0; i < data.length; i += 5) {
    const deltaLine = data[i];
    const deltaStartChar = data[i + 1];
    const length = data[i + 2];
    const typeIndex = data[i + 3];
    const modifierBits = data[i + 4];

    if (deltaLine !== 0) {
      line += deltaLine;
      startChar = deltaStartChar;
    } else {
      startChar += deltaStartChar;
    }

    tokens.push({
      line,
      startChar,
      length,
      tokenType: legend.tokenTypes[typeIndex],
      tokenModifiers: decodeModifiers(modifierBits, legend.tokenModifiers),
    });
  }

  return tokens;
}
```

### 7.4 Delta Computation

```typescript
// Edicao incremental: se nada mudou entre requests, o server envia vazio
// Se mudou, envia apenas as diferencas (edits)

interface SemanticTokensDelta {
  resultId?: string;
  edits: SemanticTokensEdit[];
}

interface SemanticTokensEdit {
  start: number;       // offset no array data original
  deleteCount: number; // quantos valores (nao tokens) deletar
  data?: number[];     // novos valores para inserir
}

// Exemplo: usuario renomeou variavel na linha 5
// Edit: start no token correspondente, delete=5 (1 token), data=[0, 0, 8, 0, 0]
```

---

## 8. Diagnostics System

### 8.1 Diagnostic Model

```typescript
interface Diagnostic {
  range: Range;
  severity?: DiagnosticSeverity;
  code?: string | number;
  codeDescription?: { href: string };
  source?: string;
  message: string;
  tags?: DiagnosticTag[];
  relatedInformation?: DiagnosticRelatedInformation[];
  data?: unknown;
}

type DiagnosticSeverity = 1 | 2 | 3 | 4;
// 1 = Error, 2 = Warning, 3 = Information, 4 = Hint

type DiagnosticTag = 1 | 2;
// 1 = Unnecessary, 2 = Deprecated

interface DiagnosticRelatedInformation {
  location: Location;
  message: string;
}
```

### 8.2 Diagnostic Severity Levels

| Level | Value | Editor Rendering | Problems Icon |
|-------|-------|-----------------|---------------|
| Error | 1 | Red squiggly underline, red gutter | X in red circle |
| Warning | 2 | Yellow squiggly underline, yellow gutter | ! in yellow triangle |
| Information | 3 | Blue squiggly underline, blue gutter | i in blue circle |
| Hint | 4 | Gray dotted underline, no gutter | Light bulb |

### 8.3 Diagnostic Collection

```typescript
class DiagnosticCollection {
  private diagnostics: Map<string, Diagnostic[]> = new Map();

  set(uri: string, diagnostics: Diagnostic[]): void {
    this.diagnostics.set(uri, diagnostics);
    this.onDidChange.fire({ uri, diagnostics });
  }

  delete(uri: string): void {
    this.diagnostics.delete(uri);
    this.onDidChange.fire({ uri, diagnostics: [] });
  }

  clear(): void {
    this.diagnostics.clear();
    this.onDidChange.fire({ uri: '*', diagnostics: [] });
  }

  get(uri: string): Diagnostic[] {
    return this.diagnostics.get(uri) ?? [];
  }

  forEach(callback: (uri: string, diagnostics: Diagnostic[]) => void): void {
    for (const [uri, diags] of this.diagnostics) {
      callback(uri, diags);
    }
  }
}
```

### 8.4 Delayed Validation

```typescript
class DelayedValidator {
  private pending = new Map<string, { version: number; timer: NodeJS.Timeout }>();
  private debounceMs = 500;
  private maxDelayMs = 2000;

  schedule(uri: string, version: number, validate: (uri: string) => Promise<void>): void {
    const existing = this.pending.get(uri);

    if (existing) {
      clearTimeout(existing.timer);
      if (version <= existing.version) return;
    }

    const timer = setTimeout(() => {
      this.pending.delete(uri);
      validate(uri).catch(err => console.error('Validation error:', err));
    }, this.debounceMs);

    this.pending.set(uri, { version, timer });

    // Max delay guarantee
    if (existing) {
      const elapsed = Date.now() - (existing as any)._start;
      if (elapsed > this.maxDelayMs) {
        clearTimeout(timer);
        this.pending.delete(uri);
        validate(uri).catch(err => console.error('Validation error:', err));
      }
    }
  }

  flushAll(): void {
    for (const [uri, { timer }] of this.pending) {
      clearTimeout(timer);
    }
    this.pending.clear();
  }

  dispose(): void {
    this.flushAll();
  }
}
```

### 8.5 Rendering Pipeline

```
LSP Server -> publishDiagnostics(uri, diagnostics)
    |
    v
DiagnosticCollection -> merge com outros sources (ESLint, TS)
    |
    v
DiagnosticModel -> markers para o Monaco
    |
    +---> Monaco editor.setModelMarkers(model, owner, markers)
    |         |
    |         v
    |     Problems Panel (lista)
    |
    +---> Inline rendering
              |
              +---> Squiggly lines (error/warning/info/hint)
              +---> Gutter icons
              +---> Overview ruler colors
              +---> Light bulb (code actions disponiveis)
```

---

## 9. Code Actions (Refactoring/Quick Fix)

### 9.1 Code Action Kinds

```
QUICKFIX
  +-- Correcoes rapidas para diagnostics
  +-- Ex: "Add import", "Fix typo", "Suppress warning"

REFACTOR
  +-- Refactor.extract: extrair funcao, constante, variavel
  +-- Refactor.inline: inline variable, function
  +-- Refactor.rewrite: reescrever expressao
  +-- Refactor.move: mover para outro arquivo

SOURCE
  +-- Source.organizeImports: organizar imports
  +-- Source.fixAll: aplicar todas correcoes
  +-- Source.generate: gerar codigo (getters, setters, construtores)
```

### 9.2 Code Action Triggers

| Trigger | Mecanismo | Quando |
|---------|-----------|--------|
| Light bulb | Hover sobre diagnostic, icone no gutter | Usuario manual |
| Command | Atalho de teclado (Ctrl+.) | Usuario explicito |
| On Save | Auto-fix ao salvar | Automático (configuravel) |
| Auto Trigger | Automatico (triggerKind=Automatic) | Diagnostic aparece |

### 9.3 Code Action Organization

```typescript
interface CodeActionOrganizer {
  organize(actions: CodeAction[], context: CodeActionContext): CodeActionGroup[];

  defaultGroups(): CodeActionGroup[] {
    return [
      {
        title: 'Quick Fix',
        kind: 'quickfix',
        priority: 1,
        actions: [],
      },
      {
        title: 'Refactor',
        kind: 'refactor',
        priority: 2,
        subGroups: [
          { title: 'Extract', kind: 'refactor.extract', priority: 2.1, actions: [] },
          { title: 'Inline', kind: 'refactor.inline', priority: 2.2, actions: [] },
          { title: 'Rewrite', kind: 'refactor.rewrite', priority: 2.3, actions: [] },
          { title: 'Move', kind: 'refactor.move', priority: 2.4, actions: [] },
        ],
      },
      {
        title: 'Source Action',
        kind: 'source',
        priority: 3,
        actions: [],
      },
    ];
  }
}

interface CodeActionGroup {
  title: string;
  kind: string;
  priority: number;
  subGroups?: CodeActionGroup[];
  actions: CodeAction[];
}
```

### 9.4 Preferred Actions

```typescript
interface CodeAction {
  isPreferred?: boolean;
  // Quando true, a acao e executada automaticamente se
  // o usuario tem "auto fix" habilitado para aquele codigo
}

// Exemplo: preferred action for "missing import"
const missingImportFix: CodeAction = {
  title: 'Import "UserService" from "./services/user"',
  kind: 'quickfix',
  isPreferred: true,
  diagnostics: [missingImportDiagnostic],
  edit: {
    changes: {
      'file:///project/src/app.ts': [
        { range: Range.create(0, 0, 0, 0), newText: "import { UserService } from './services/user';\n" },
      ],
    },
  },
};
```

---

## 10. Hover & Signature Help

### 10.1 Hover Content

```typescript
interface HoverContent {
  types: string[];           // informacao de tipo
  documentation: string;     // documentacao (markdown)
  codeExamples?: string[];   // exemplos de uso
  errors?: string[];         // erros no simbolo (se hover em diagnostic)
  links?: { text: string; href: string }[];
}

// Renderizacao final no Monaco:
// ┌──────────────────────────────────────┐
// │  const user: User                     │
// │                                       │
// │  User object with profile data        │
// │  ---                                  │
// │  ```typescript                        │
// │  const user = new User('admin');     │
// │  ```                                  │
// │                                       │
// │  [Learn more](link)  [Go to Type]     │
// └──────────────────────────────────────┘
```

### 10.2 Hover Stabilization

```typescript
class HoverStabilizer {
  private hoverTimer: NodeJS.Timeout | null = null;
  private hideTimer: NodeJS.Timeout | null = null;

  private showDelay = 300;   // ms antes de mostrar hover
  private hideDelay = 200;   // ms antes de esconder hover
  private stickyTime = 500;  // ms extra se usuario move mouse dentro do hover widget

  scheduleHover(position: IPosition, showHover: (pos: IPosition) => void): void {
    this.cancelHover();
    this.hoverTimer = setTimeout(() => {
      showHover(position);
    }, this.showDelay);
  }

  scheduleHide(hideHover: () => void): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      hideHover();
    }, this.hideDelay);
  }

  cancelHover(): void {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
  }
}
```

### 10.3 Signature Help

```
Usuario digita: "fetchData("
                      ^
                      |
             trigger character: '('
                      |
                      v
+---------------------+
| SignatureHelp       |
+---------------------+
| fetchData<T>(       |
|   url: string,      |  <-- activeSignature (0)
|   options?: Request |      activeParameter (0) highlight
| ): Promise<T>       |
+---------------------+
| The url to fetch    |  <-- parameter documentation
+---------------------+

Usuario digita: ","
                      |
                      v
+---------------------+
| fetchData<T>(       |
|   url: string,      |
|   options?: Request |  <-- activeParameter (1) highlight
| ): Promise<T>       |
+---------------------+
| Request options     |  <-- parameter documentation
+---------------------+
```

```typescript
interface SignatureHelpProvider {
  triggerCharacters?: string[];
  retriggerCharacters?: string[];

  provideSignatureHelp(
    model: editor.ITextModel,
    position: Position,
    token: CancellationToken,
    context: SignatureHelpContext
  ): ProviderResult<SignatureHelp>;
}

interface SignatureHelpContext {
  triggerKind: SignatureHelpTriggerKind;
  triggerCharacter?: string;
  isRetrigger: boolean;
  activeSignatureHelp?: SignatureHelp;
}
```

---

## 11. Go To Definition & References

### 11.1 Multiple Definition Support

```typescript
interface DefinitionResult {
  main: Location;            // primary definition
  additional: Location[];    // additional (virtual, generated, overloads)
  kind: DefinitionKind;
}

type DefinitionKind = 'class' | 'interface' | 'function' | 'variable'
  | 'property' | 'type' | 'module' | 'generated' | 'virtual';

// Exemplo: definicoes multiplas
// - Interface definition: User (interface)
// - Implementation: class UserImpl
// - Generated type: Prisma.User (prisma generate)
const userDefinitions: DefinitionResult = {
  main: { uri: 'file:///src/types/user.ts', range: Range.create(1, 0, 10, 0) },
  additional: [
    { uri: 'file:///src/models/user-impl.ts', range: Range.create(1, 0, 30, 0) },
    { uri: 'file:///node_modules/.prisma/client/index.d.ts', range: Range.create(100, 0, 105, 0) },
  ],
  kind: 'interface',
};
```

### 11.2 Reference Search with Context

```typescript
interface ReferenceResult {
  references: Reference[];
  totalCount: number;
}

interface Reference {
  uri: DocumentUri;
  range: Range;
  context: ReferenceContextInfo;
  isWriteAccess: boolean;
}

interface ReferenceContextInfo {
  lineContent: string;       // conteudo da linha
  beforeContext: string[];   // linhas antes (contexto)
  afterContext: string[];    // linhas depois (contexto)
  scopeName: string;         // funcao/classe onde aparece
}
```

### 11.3 Navigation Hierarchy

```
Go to Definition (F12)
  +-- Leva para a declaracao/definicao do simbolo
  +-- LocationLink se houver selecao de range

Go to Declaration
  +-- Leva para a declaracao (diferente de definicao em TS)
  +-- Ex: classe declarada em .d.ts, definida em .ts

Go to Type Definition
  +-- Leva para a definicao do tipo do simbolo
  +-- Ex: const x: number -> leva para type number

Go to Implementation
  +-- Leva para implementacoes de uma interface/classe abstrata
  +-- Pode retornar multiplos locations

Peek Definition
  +-- Abre inline editor no local atual
  +-- Monaco: editor.action.peekDefinition

Peek Implementation
  +-- Inline implementation view
  +-- Monaco: editor.action.peekImplementation
```

### 11.4 Breadcrumbs Integration

```
Breadcrumbs Model:
  src / components / UserList / render()
    ^        ^            ^        ^
  workspace  folder     class    method

Cada nivel corresponde a um DocumentSymbol:
  - UserList (class, range [10, 200])
  - render() (method, range [20, 150])

```typescript
interface BreadcrumbItem {
  name: string;
  kind: SymbolKind;
  uri: DocumentUri;
  range: Range;
  selectionRange: Range;
}

function buildBreadcrumbs(
  symbols: DocumentSymbol[],
  position: Position
): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];

  function walk(symbols: DocumentSymbol[], depth = 0): boolean {
    for (const sym of symbols) {
      if (sym.range.contains(position)) {
        breadcrumbs.push({
          name: sym.name,
          kind: sym.kind,
          uri: currentUri,
          range: sym.range,
          selectionRange: sym.selectionRange,
        });
        if (sym.children) {
          if (walk(sym.children, depth + 1)) return true;
        }
        breadcrumbs.pop();
      }
    }
    return false;
  }

  walk(symbols);
  return breadcrumbs;
}
```

---

## 12. Document Symbols & Folding

### 12.1 Hierarchical Document Symbols

```
Document Symbol Tree:
  file.ts
  +-- module Main
      +-- class UserService implements IUserService
      |   +-- constructor(private db: Database)
      |   +-- method getUser(id: string): Promise<User>
      |   |   +-- call: this.db.findUser(id)
      |   +-- method createUser(data: CreateUserDto): Promise<User>
      |   +-- property users: Map<string, User>
      +-- function validateEmail(email: string): boolean
      +-- const DEFAULT_ROLE: string = 'user'
      +-- interface IUserService
          +-- method getUser(id: string): Promise<User>
          +-- method createUser(data: CreateUserDto): Promise<User>
```

### 12.2 Outline View

```typescript
interface OutlineViewModel {
  roots: OutlineNode[];
  filter: string;
  sortBy: 'position' | 'name' | 'kind';
  showInherited: boolean;

  select(node: OutlineNode): void;
  expandToDepth(depth: number): void;
  collapseAll(): void;
  revealSymbol(symbol: DocumentSymbol): void;
}

interface OutlineNode {
  symbol: DocumentSymbol;
  children: OutlineNode[];
  depth: number;
  expanded: boolean;
  visible: boolean;
  matches(count: number): number; // match count se filtrado
}
```

### 12.3 Folding Regions

```typescript
// Folding providers vs syntax-based folding
// Monaco suporta 3 estrategias:

type FoldingStrategy = 'auto' | 'indentation' | 'language';

// Indentation-based: folds baseado em indentacao
// Language-based: usa FoldingRangeProvider do LSP
// Auto: tenta indentacao, fallback para LSP

interface FoldingRange {
  start: number;           // 0-based line
  end: number;             // 0-based line (inclusive)
  kind?: FoldingRangeKind; // 'comment' | 'imports' | 'region'
}

interface FoldingRegionsConfig {
  maxFoldableLines: number;  // minimo linhas para ser foldable
  collapsedText: string;     // texto mostrado no lugar (ex: '...')
  defaultCollapsed: string[]; // kinds collapsed por default
}

// Default collapsed regions:
const DEFAULT_COLLAPSED = ['imports', 'comments', 'region'];

// Markers for region folding:
// // #region [nome]   -> start marker
// // #endregion       -> end marker
// Suportado em: JS, TS, C#, C++, Python, etc.
```

---

## 13. Inlay Hints

### 13.1 Inlay Hint Types

```typescript
type InlayHintType =
  | 'type'           // mostra tipo de variavel (ex: : number)
  | 'parameter'      // mostra nome de parametro (ex: name:)
  | 'variable'       // mostra nome de variavel inline
  | 'return'         // mostra tipo de retorno de funcao
  | 'implicit'       // mostra inferencia implicita
  | 'deprecated'     // marca como deprecated inline
  | 'chained';       // mostra hint em chamadas encadeadas

// Exemplos:
// const x: number = 42;           -> type hint no x
// fetchData(url: string, ...)     -> parameter hint
// const [a, b] = pair;            -> variable hint
// getUsers(): Promise<User[]>     -> return type hint
```

### 13.2 Inlay Hint Rendering

```typescript
interface InlayHintRenderOptions {
  fontFamily?: string;
  fontSize?: number;           // geralmente menor que editor font
  fontStyle?: 'italic' | 'normal';
  color?: string;
  background?: string;
  padding: {
    left: number;              // espaco antes do hint
    right: number;             // espaco depois do hint
  };
  interactive?: boolean;       // hint clicavel?
}

// Render modes:
// BEFORE: hint aparece antes do texto
//   user: { name: string }
//           ^^^^ type hint (antes)

// AFTER: hint aparece depois do texto
//   const x = 42;  // number
//                  ^^^^^^^^ type hint (depois)

// PADDING:
//   function greet(name: string): void
//                       ^^^^^^ padding left + right
```

### 13.3 Interactive Inlay Hints

```typescript
interface InteractiveInlayHint extends InlayHint {
  onClick?: () => void;            // click acao
  onHover?: () => HoverContent;    // hover mostra mais info
  commands?: Command[];            // comandos via hint
  menuItems?: {                    // menu de contexto
    label: string;
    command: string;
    args?: unknown[];
  }[];
}

// Exemplo: parameter hint clicavel mostra sugerencias de nome
// fetchData(api.fetchUsers, { retry: 3 })
//           ^^^^^^^^^^^^^^  ^^^^^^^^^^
//           click: rename   click: inline options
```

---

## 14. Inline Completions

### 14.1 Ghost Text Rendering

```
Cursor position: |
Usuario digita: "function fetch"
                                    
                                    v
  function |fetchUsers()| {        <- ghost text (cinza, italico)
            ^^^^^^^^^^^^
            Tab to accept           <- toolbar "on hover"

Tab aceita palavra: fetchUsers
Tab + Ctrl aceita linha: fetchUsers() {
Tab + Alt aceita palavra seguinte

Partial accept:
  function fetch|As a service      <- primeira palavra aceita
  function fetchAs a service       <- proxima palavra
```

### 14.2 Inline Completion Provider Interface

```typescript
interface InlineCompletionItem {
  insertText: string | StringValue;  // texto ou snippet
  filterText?: string;               // texto para filtro
  range?: Range;                     // range a ser substituido
  command?: Command;                 // comando a executar apos aceitar
}

interface InlineCompletionItemList {
  items: InlineCompletionItem[];
}

interface InlineCompletionContext {
  triggerKind: InlineCompletionTriggerKind;
  selectedCompletionInfo?: {
    range: Range;
    text: string;
  };
}

type InlineCompletionTriggerKind = 0 | 1 | 2;
// 0 = Invoked (explicito), 1 = Automatic (digitar), 2 = Other
```

### 14.3 Debounced Trigger

```typescript
class InlineCompletionDebouncer {
  private timer: NodeJS.Timeout | null = null;
  private lastRequest: { model: editor.ITextModel; position: Position } | null = null;

  private debounceMs = 75;   // ms apos ultima tecla
  private maxDelayMs = 300;  // maximo atraso garantido

  schedule(
    model: editor.ITextModel,
    position: Position,
    callback: (model: editor.ITextModel, position: Position) => void
  ): void {
    this.lastRequest = { model, position };

    if (this.timer) clearTimeout(this.timer);

    this.timer = setTimeout(() => {
      if (this.lastRequest) {
        callback(this.lastRequest.model, this.lastRequest.position);
      }
    }, this.debounceMs);
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.lastRequest = null;
  }
}
```

### 14.4 Context-Aware Filtering

```typescript
interface InlineCompletionFilter {
  shouldProvide(model: editor.ITextModel, position: Position): boolean;

  // Heuristicas para decidir se deve mostrar ghost text:
  isInsideComment(model: editor.ITextModel, position: Position): boolean;
  isInsideString(model: editor.ITextModel, position: Position): boolean;
  isInsideMultiline(model: editor.ITextModel, position: Position): boolean;
  hasRecentCompletionSession(position: Position): boolean; // nao sobrepor widget
  lineContext: {
    lineContent: string;
    indentation: number;
    isDefinitionStart: boolean;  // ex: "function foo("
    isAssignment: boolean;       // ex: "const x = "
    isReturnStatement: boolean;  // ex: "return "
    isImportStatement: boolean;  // ex: "import { "
    isEmptyLine: boolean;
  };
}

function defaultFilter(model: editor.ITextModel, position: Position): boolean {
  const line = model.getLineContent(position.lineNumber);
  const prefix = line.substring(0, position.column - 1).trim();

  // Nao mostrar se:
  if (prefix.length < 2) return false;           // muito curto
  if (prefix.startsWith('//') || prefix.startsWith('#')) return false; // comentario
  if (prefix.startsWith('import') && !prefix.includes('from')) return false; // import incompleto
  if (prefix.match(/^\s*\/\*/)) return false;     // block comment start

  // Mostrar se:
  if (prefix.endsWith('return ')) return true;
  if (prefix.endsWith(' = ')) return true;
  if (prefix.endsWith('=> ')) return true;
  if (prefix.match(/^\s*$/)) return true;        // linha vazia

  return prefix.length >= 3;
}
```

---

## 15. AI-Powered Intelligence

### 15.1 Copilot-Style Inline Completions

```
┌──────────────────────────────────────────────────────────────────┐
│                  AI INLINE COMPLETION PIPELINE                     │
│                                                                   │
│  1. CONTEXT COLLECTION                                            │
│     +-- Prefixo: texto antes do cursor (ate 2000 chars)           │
│     +-- Sufixo: texto depois do cursor (ate 500 chars)            │
│     +-- Arquivo aberto: contexto completo (resumido se grande)    │
│     +-- Arquivos abertos relevantes: tabs abertas                  │
│     +-- Escopo atual: funcao/classe onde cursor esta              │
│     +-- Simbolos proximos: variaveis, imports                     │
│     +-- Language: TypeScript, Python, etc.                        │
│     +-- Adjacent files: arquivos no mesmo diretorio               │
│                                                                   │
│  2. PROMPT CONSTRUCTION                                           │
│     +-- Template especifico para completacao inline                │
│     +-- Fim aberto (o modelo deve continuar o codigo)             │
│     +-- Marcadores: <FILL_HERE> / <COMPLETION>                    │
│                                                                   │
│  3. MODEL INFERENCE                                               │
│     +-- Modelo: CodeLLM (StarCoder, CodeLlama, GPT-4o)           │
│     +-- Tempo limite: 200ms para parecer instantaneo              │
│     +-- Max tokens: 128 caracteres (tipico)                       │
│     +-- Sampling: temperature 0.2, top_p 0.95                     │
│                                                                   │
│  4. POST-PROCESSING                                               │
│     +-- Validar sintaxe (parser rapido)                           │
│     +-- Ajustar indentacao                                        │
│     +-- Remover repeticoes                                        │
│     +-- Verificar bracket matching                                │
│     +-- Truncar em linha logica (; ou })                         │
│                                                                   │
│  5. DISPLAY                                                       │
│     +-- Ghost text no Monaco (InlineCompletionProvider)           │
│     +-- Atalho: Tab para aceitar, Esc para rejeitar               │
│     +-- Partial accept: Ctrl+Right para aceitar palavra           │
└──────────────────────────────────────────────────────────────────┘
```

### 15.2 AI-Powered Chat

```
┌──────────────────────────────────────────────────────────────────┐
│                  AI CHAT INTEGRATION                               │
│                                                                   │
│  Editor + Chat Sidebar:                                           │
│  ┌──────────────────────┐ ┌─────────────────────┐                │
│  │  Editor Principal     │ │  AI Chat Panel       │               │
│  │                       │ │                      │               │
│  │  function fetchData(  │ │  > Explain this      │               │
│  │    url: string       │ │  > code               │               │
│  │  ): Promise<Data> {  │ │                      │               │
│  │    █                  │ │  AI: This function   │               │
│  │  }                    │ │  fetches data from   │               │
│  │                       │ │  a URL endpoint...   │               │
│  │  [Ctrl+I: inline chat]│ │                      │               │
│  └──────────────────────┘ └─────────────────────┘               │
│                                                                   │
│  Inline Chat Widget:                                              │
│  ┌─────────────────────────────────────────────┐                 │
│  │  █                                          │                 │
│  ├─────────────────────────────────────────────┤                 │
│  │  > explain this function in simple terms    │                 │
│  └─────────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
```

### 15.3 AI Features Matrix

| Feature | Input | Output | Model Type | Latency Target |
|---------|-------|--------|-----------|---------------|
| Inline Completion | Prefix + suffix + context | Code snippet | Code LLM | <200ms |
| Code Generation | NL description | Full function | Code LLM | <2s |
| Code Explanation | Selected code | NL explanation | Chat LLM | <1s |
| Test Generation | Function signature + body | Test cases | Code LLM | <3s |
| Doc Generation | Function signature | JSDoc comment | Code LLM | <1s |
| Bug Detection | Code + error context | Fix suggestion | Code LLM | <2s |
| Refactoring | Selected code | Refactored code | Code LLM | <2s |
| Code Review | File diff | Review comments | Chat LLM | <3s |
| Commit Message | Git diff | Commit message | Chat LLM | <1s |

### 15.4 IDEIA Agents as Intelligence Providers

```typescript
interface AgentIntelligenceProvider {
  readonly id: string;
  readonly name: string;
  readonly features: AgentFeature[];

  provideInlineCompletion(
    context: InlineCompletionContext,
    token: CancellationToken
  ): Promise<InlineCompletionItem[]>;

  provideCodeAction(
    context: CodeActionContext,
    token: CancellationToken
  ): Promise<CodeAction[]>;

  provideHoverContent(
    context: HoverContext,
    token: CancellationToken
  ): Promise<HoverContent>;

  analyzeCode(
    code: string,
    analysisType: AnalysisType,
    token: CancellationToken
  ): Promise<AnalysisResult>;
}

type AnalysisType = 'explain' | 'generate-tests' | 'generate-docs'
  | 'find-bugs' | 'refactor' | 'optimize' | 'security';

interface AnalysisResult {
  type: AnalysisType;
  summary: string;
  details?: string;
  codeChanges?: TextEdit[];
  suggestions?: string[];
  confidence: number;      // 0-1
}
```

### 15.5 Context Collection for AI

```typescript
interface AICompletionContext {
  prefix: string;                    // texto antes do cursor (<=2000 chars)
  suffix: string;                    // texto depois (<=500 chars)
  languageId: string;                // linguagem atual
  relativePath: string;              // caminho relativo do arquivo
  workspaceRoot: string;             // raiz do workspace
  activeEditorContent?: string;      // conteudo do editor (resumido)
  openTabsContent?: TabContent[];    // outras abas abertas
  adjacentFiles?: FileContent[];     // arquivos no mesmo diretorio
  recentCompletions?: string[];      // ultimas completacoes aceitas
  scopeInfo?: {                      // escopo atual
    functionName?: string;
    className?: string;
    parameters?: string[];
    locals?: string[];
    returnType?: string;
  };
  imports: string[];                 // imports ativos
  diagnostics: Diagnostic[];         // erros atuais
  cursorPosition: {                  // posicao do cursor
    line: number;
    column: number;
  };
}

interface TabContent {
  uri: string;
  languageId: string;
  content: string;                   // primeiras N linhas
  size: number;                      // bytes
}

interface FileContent {
  relativePath: string;
  content: string;                   // primeiras N linhas
}
```

---

## 16. Code Examples

### 16.1 LSP Client Connection

```typescript
import { spawn, ChildProcess } from 'child_process';
import { createConnection, TextDocuments, ProposedFeatures } from 'vscode-languageserver/node';
import {
  IPCMessageReader, IPCMessageWriter,
  StreamMessageReader, StreamMessageWriter,
} from 'vscode-languageserver-protocol/node';

interface LSPServerOptions {
  command: string;
  args?: string[];
  languageId: string;
  documentSelector: string[];
}

class LSPServerManager {
  private server: ChildProcess | null = null;
  private clientConnection: ReturnType<typeof createConnection> | null = null;

  async startServer(options: LSPServerOptions): Promise<void> {
    this.server = spawn(options.command, options.args ?? [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const reader = new StreamMessageReader(this.server.stdout);
    const writer = new StreamMessageWriter(this.server.stdin);

    this.clientConnection = createConnection(reader, writer, ProposedFeatures.all);

    this.clientConnection.onNotification('textDocument/publishDiagnostics', params => {
      this.handleDiagnostics(params);
    });

    this.clientConnection.listen();
    await this.initialize(options);
  }

  private async initialize(options: LSPServerOptions): Promise<void> {
    await this.clientConnection!.sendRequest('initialize', {
      processId: process.pid,
      rootUri: null,
      capabilities: {
        textDocument: {
          synchronization: {
            dynamicRegistration: true,
            didSave: true,
            willSave: false,
            willSaveWaitUntil: false,
          },
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true,
              documentationFormat: ['markdown'],
              resolveSupport: { properties: ['documentation', 'detail'] },
            },
          },
          hover: { dynamicRegistration: true, contentFormat: ['markdown'] },
          definition: { dynamicRegistration: true, linkSupport: true },
          references: { dynamicRegistration: true },
          documentSymbol: { dynamicRegistration: true, hierarchicalDocumentSymbolSupport: true },
          codeAction: {
            dynamicRegistration: true,
            codeActionLiteralSupport: {
              codeActionKind: { valueSet: ['quickfix', 'refactor', 'source'] },
            },
            isPreferredSupport: true,
          },
          inlayHint: { dynamicRegistration: true, resolveSupport: { properties: ['tooltip'] } },
          inlineCompletion: { dynamicRegistration: true },
          semanticTokens: {
            dynamicRegistration: true,
            tokenModifiers: ['declaration', 'definition', 'readonly', 'static', 'deprecated'],
            tokenTypes: ['namespace', 'type', 'class', 'function', 'variable', 'property'],
            requests: { full: { delta: true }, range: true },
          },
        },
        workspace: {
          workspaceFolders: true,
          didChangeWatchedFiles: { dynamicRegistration: true },
          inlineValue: { dynamicRegistration: true },
        },
        window: {
          workDoneProgress: true,
        },
      },
      workspaceFolders: null,
    });

    await this.clientConnection!.sendNotification('initialized', {});
  }

  async sendDidOpen(uri: string, languageId: string, text: string): Promise<void> {
    this.clientConnection!.sendNotification('textDocument/didOpen', {
      textDocument: { uri, languageId, version: 1, text },
    });
  }

  async sendDidChange(uri: string, version: number, changes: TextDocumentContentChangeEvent[]): Promise<void> {
    this.clientConnection!.sendNotification('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: changes,
    });
  }

  async requestCompletion(uri: string, position: Position, context?: CompletionContext): Promise<CompletionList> {
    return this.clientConnection!.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position,
      context,
    }) as Promise<CompletionList>;
  }

  async requestHover(uri: string, position: Position): Promise<Hover | null> {
    return this.clientConnection!.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position,
    }) as Promise<Hover | null>;
  }

  async requestCodeActions(uri: string, range: Range, context: CodeActionContext): Promise<CodeAction[]> {
    return this.clientConnection!.sendRequest('textDocument/codeAction', {
      textDocument: { uri },
      range,
      context,
    }) as Promise<CodeAction[]>;
  }

  async requestSemanticTokens(uri: string): Promise<SemanticTokens> {
    return this.clientConnection!.sendRequest('textDocument/semanticTokens/full', {
      textDocument: { uri },
    }) as Promise<SemanticTokens>;
  }

  private handleDiagnostics(params: PublishDiagnosticsParams): void {
    // Forward para DiagnosticCollection
    diagnosticCollection.set(params.uri, params.diagnostics);
  }

  stop(): void {
    this.clientConnection?.sendNotification('shutdown');
    this.clientConnection?.sendNotification('exit');
    this.server?.kill();
  }
}
```

### 16.2 CompletionItemProvider Wrapping LSP

```typescript
class LSPCompletionProvider implements monaco.languages.CompletionItemProvider {
  private lspManager: LSPServerManager;
  private triggerCharacters = ['.', ':', '@', '#', ' '];

  constructor(lspManager: LSPServerManager) {
    this.lspManager = lspManager;
  }

  async provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.CompletionList> {
    const uri = model.uri.toString();
    const lspPosition = { line: position.lineNumber - 1, character: position.column - 1 };

    const lspContext: CompletionContext = {
      triggerKind: context.triggerKind === monaco.languages.CompletionTriggerKind.TriggerCharacter
        ? 2 : 1,
      triggerCharacter: context.triggerCharacter,
    };

    try {
      const result = await this.lspManager.requestCompletion(uri, lspPosition, lspContext);

      return {
        suggestions: (result.items ?? []).map(item => this.mapCompletionItem(item, model, position)),
        incomplete: result.isIncomplete ?? false,
      };
    } catch (err) {
      console.error('LSP completion error:', err);
      return { suggestions: [] };
    }
  }

  private mapCompletionItem(
    item: CompletionItem,
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): monaco.languages.CompletionItem {
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };

    return {
      label: typeof item.label === 'string' ? item.label : item.label.label,
      kind: this.mapKind(item.kind),
      detail: item.detail,
      documentation: typeof item.documentation === 'string'
        ? item.documentation
        : item.documentation?.value ?? '',
      sortText: item.sortText ?? item.label as string,
      filterText: item.filterText ?? item.label as string,
      insertText: item.insertText ?? item.label as string,
      range,
      insertTextRules: item.insertTextFormat === 2
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : monaco.languages.CompletionItemInsertTextRule.InsertAsIs,
      commitCharacters: item.commitCharacters,
      additionalTextEdits: item.additionalTextEdits?.map(edit => ({
        range: {
          startLineNumber: edit.range.start.line + 1,
          startColumn: edit.range.start.character + 1,
          endLineNumber: edit.range.end.line + 1,
          endColumn: edit.range.end.character + 1,
        },
        text: edit.newText,
      })),
    };
  }

  private mapKind(kind?: CompletionItemKind): monaco.languages.CompletionItemKind {
    const map: Record<number, monaco.languages.CompletionItemKind> = {
      1: monaco.languages.CompletionItemKind.Text,
      2: monaco.languages.CompletionItemKind.Method,
      3: monaco.languages.CompletionItemKind.Function,
      4: monaco.languages.CompletionItemKind.Constructor,
      5: monaco.languages.CompletionItemKind.Field,
      6: monaco.languages.CompletionItemKind.Variable,
      7: monaco.languages.CompletionItemKind.Class,
      8: monaco.languages.CompletionItemKind.Interface,
      9: monaco.languages.CompletionItemKind.Module,
      10: monaco.languages.CompletionItemKind.Property,
      12: monaco.languages.CompletionItemKind.Value,
      13: monaco.languages.CompletionItemKind.Enum,
      14: monaco.languages.CompletionItemKind.Keyword,
      15: monaco.languages.CompletionItemKind.Snippet,
    };
    return map[kind ?? 0] ?? monaco.languages.CompletionItemKind.Text;
  }
}
```

### 16.3 DiagnosticCollection with Markers

```typescript
class MonacoDiagnosticCollection {
  private markers: Map<string, monaco.editor.IMarkerData[]> = new Map();
  private owner: string;

  constructor(owner: string) {
    this.owner = owner;
  }

  set(uri: string, diagnostics: Diagnostic[]): void {
    const markers = diagnostics.map(d => this.diagnosticToMarker(d));
    this.markers.set(uri, markers);
    monaco.editor.setModelMarkers(
      monaco.editor.getModel(monaco.Uri.parse(uri))!,
      this.owner,
      markers
    );
  }

  delete(uri: string): void {
    this.markers.delete(uri);
    const model = monaco.editor.getModel(monaco.Uri.parse(uri));
    if (model) {
      monaco.editor.setModelMarkers(model, this.owner, []);
    }
  }

  clear(): void {
    for (const uri of this.markers.keys()) {
      this.delete(uri);
    }
  }

  private diagnosticToMarker(d: Diagnostic): monaco.editor.IMarkerData {
    return {
      severity: this.mapSeverity(d.severity),
      message: d.message,
      source: d.source ?? 'LSP',
      startLineNumber: d.range.start.line + 1,
      startColumn: d.range.start.character + 1,
      endLineNumber: d.range.end.line + 1,
      endColumn: d.range.end.character + 1,
      tags: d.tags?.map(t => t === 1
        ? monaco.MarkerTag.Unnecessary
        : monaco.MarkerTag.Deprecated
      ),
      relatedInformation: d.relatedInformation?.map(info => ({
        resource: monaco.Uri.parse(info.location.uri),
        message: info.message,
        startLineNumber: info.location.range.start.line + 1,
        startColumn: info.location.range.start.character + 1,
        endLineNumber: info.location.range.end.line + 1,
        endColumn: info.location.range.end.character + 1,
      })),
    };
  }

  private mapSeverity(severity?: DiagnosticSeverity): monaco.MarkerSeverity {
    switch (severity) {
      case 1: return monaco.MarkerSeverity.Error;
      case 2: return monaco.MarkerSeverity.Warning;
      case 3: return monaco.MarkerSeverity.Info;
      case 4: return monaco.MarkerSeverity.Hint;
      default: return monaco.MarkerSeverity.Error;
    }
  }
}
```

### 16.4 CodeActionProvider for Refactoring

```typescript
class LSPCodeActionProvider implements monaco.languages.CodeActionProvider {
  private lspManager: LSPServerManager;
  readonly providedCodeActionKinds = [
    monaco.languages.CodeActionKind.QuickFix,
    monaco.languages.CodeActionKind.Refactor,
    monaco.languages.CodeActionKind.RefactorExtract,
    monaco.languages.CodeActionKind.SourceOrganizeImports,
  ];

  constructor(lspManager: LSPServerManager) {
    this.lspManager = lspManager;
  }

  async provideCodeActions(
    model: monaco.editor.ITextModel,
    range: monaco.Range,
    context: monaco.languages.CodeActionContext,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.CodeActionList> {
    const uri = model.uri.toString();
    const lspRange = {
      start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
      end: { line: range.endLineNumber - 1, character: range.endColumn - 1 },
    };

    const diagnostics: Diagnostic[] = context.markers.map(m => ({
      range: {
        start: { line: m.startLineNumber - 1, character: m.startColumn - 1 },
        end: { line: m.endLineNumber - 1, character: m.endColumn - 1 },
      },
      severity: m.severity as unknown as DiagnosticSeverity,
      message: m.message,
      source: m.source,
    }));

    try {
      const actions = await this.lspManager.requestCodeActions(uri, lspRange, {
        diagnostics,
        only: this.mapKinds(context.only),
      });

      return {
        actions: actions.map(a => ({
          title: a.title,
          kind: a.kind as monaco.languages.CodeActionKind,
          diagnostics: a.diagnostics?.map(d => this.diagnosticToMarker(d)),
          edit: a.edit ? this.mapWorkspaceEdit(a.edit) : undefined,
          command: a.command ? { id: a.command.command, title: a.command.title ?? '', arguments: a.command.arguments } : undefined,
          isPreferred: a.isPreferred,
        })),
      };
    } catch (err) {
      console.error('LSP codeAction error:', err);
      return { actions: [] };
    }
  }

  private mapWorkspaceEdit(edit: WorkspaceEdit): monaco.languages.WorkspaceEdit {
    const edits: monaco.languages.IWorkspaceTextEdit[] = [];

    if (edit.changes) {
      for (const [uri, textEdits] of Object.entries(edit.changes)) {
        for (const te of textEdits) {
          edits.push({
            resource: monaco.Uri.parse(uri),
            textEdit: {
              range: {
                startLineNumber: te.range.start.line + 1,
                startColumn: te.range.start.character + 1,
                endLineNumber: te.range.end.line + 1,
                endColumn: te.range.end.character + 1,
              },
              text: te.newText,
            },
          });
        }
      }
    }

    return { edits };
  }

  private mapKinds(only?: monaco.languages.CodeActionKind[]): string[] | undefined {
    if (!only) return undefined;
    return only.map(k => k as unknown as string);
  }

  private diagnosticToMarker(d: Diagnostic): monaco.editor.IMarkerData {
    return {
      severity: (d.severity ?? 1) as unknown as monaco.MarkerSeverity,
      message: d.message,
      startLineNumber: d.range.start.line + 1,
      startColumn: d.range.start.character + 1,
      endLineNumber: d.range.end.line + 1,
      endColumn: d.range.end.character + 1,
    };
  }
}
```

### 16.5 InlayHintsProvider

```typescript
class LSPInlayHintsProvider implements monaco.languages.InlayHintsProvider {
  private lspManager: LSPServerManager;
  private _onDidChangeInlayHints = new monaco.Emitter<void>();
  readonly onDidChangeInlayHints = this._onDidChangeInlayHints.event;

  constructor(lspManager: LSPServerManager) {
    this.lspManager = lspManager;
  }

  async provideInlayHints(
    model: monaco.editor.ITextModel,
    range: monaco.Range,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.InlayHintList> {
    const uri = model.uri.toString();
    const lspRange = {
      start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
      end: { line: range.endLineNumber - 1, character: range.endColumn - 1 },
    };

    try {
      const hints = await this.lspManager.clientConnection!.sendRequest('textDocument/inlayHint', {
        textDocument: { uri },
        range: lspRange,
      }) as InlayHint[];

      return {
        hints: hints.map(h => ({
          text: typeof h.label === 'string' ? h.label : h.label.map(p => p.value).join(''),
          position: { lineNumber: h.position.line + 1, column: h.position.character + 1 },
          kind: h.kind === 1
            ? monaco.languages.InlayHintKind.Type
            : monaco.languages.InlayHintKind.Parameter,
          paddingLeft: h.paddingLeft,
          paddingRight: h.paddingRight,
          tooltip: typeof h.tooltip === 'string' ? h.tooltip : h.tooltip?.value,
        })),
      };
    } catch (err) {
      return { hints: [] };
    }
  }

  triggerUpdate(): void {
    this._onDidChangeInlayHints.fire();
  }
}
```

### 16.6 Semantic Tokens Provider

```typescript
class LSPSemanticTokensProvider {
  private lspManager: LSPServerManager;
  private legend: monaco.languages.SemanticTokensLegend = {
    tokenTypes: [
      'namespace', 'type', 'class', 'enum', 'interface',
      'struct', 'typeParameter', 'parameter', 'variable',
      'property', 'enumMember', 'event', 'function',
      'method', 'macro', 'keyword', 'modifier', 'comment',
      'string', 'number', 'regexp', 'operator', 'decorator',
    ],
    tokenModifiers: [
      'declaration', 'definition', 'readonly', 'static',
      'deprecated', 'abstract', 'async', 'modification',
      'documentation', 'defaultLibrary',
    ],
  };

  constructor(lspManager: LSPServerManager) {
    this.lspManager = lspManager;
  }

  async provideSemanticTokens(
    model: monaco.editor.ITextModel,
    lastResultId: string | null,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.SemanticTokens | monaco.languages.SemanticTokensEdits | null> {
    const uri = model.uri.toString();

    try {
      if (lastResultId) {
        const delta = await this.lspManager.clientConnection!.sendRequest(
          'textDocument/semanticTokens/full/delta',
          { textDocument: { uri }, previousResultId: lastResultId }
        ) as SemanticTokensDelta;

        return {
          resultId: delta.resultId,
          edits: delta.edits.map(e => ({
            start: e.start,
            deleteCount: e.deleteCount,
            data: e.data ?? [],
          })),
        };
      }

      const result = await this.lspManager.requestSemanticTokens(uri);
      return {
        resultId: result.resultId,
        data: new Uint32Array(result.data),
      };
    } catch (err) {
      return null;
    }
  }

  getLegend(): monaco.languages.SemanticTokensLegend {
    return this.legend;
  }
}
```

### 16.7 Inline Completion Provider with AI Integration

```typescript
class AIInlineCompletionProvider implements monaco.languages.InlineCompletionsProvider {
  private debouncer = new InlineCompletionDebouncer();
  private aiService: AICodeService;
  private filter = defaultFilter;

  constructor(aiService: AICodeService) {
    this.aiService = aiService;
  }

  async provideInlineCompletions(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.InlineCompletionContext,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.InlineCompletions> {
    if (!this.filter(model, position)) {
      return { items: [], dispose: () => {} };
    }

    const prefix = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });

    const suffix = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: model.getLineCount(),
      endColumn: model.getLineMaxColumn(model.getLineCount()),
    });

    const promptPrefix = prefix.length > 2000 ? prefix.slice(-2000) : prefix;
    const promptSuffix = suffix.length > 500 ? suffix.slice(0, 500) : suffix;

    try {
      const completion = await this.aiService.getInlineCompletion({
        prefix: promptPrefix,
        suffix: promptSuffix,
        languageId: model.getLanguageId(),
        filePath: model.uri.path,
      }, token);

      if (!completion || token.isCancellationRequested) {
        return { items: [], dispose: () => {} };
      }

      return {
        items: [{
          insertText: completion.text,
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          command: {
            id: 'IDEIA.inlineCompletionAccepted',
            title: '',
            arguments: [completion],
          },
        }],
        dispose: () => {},
      };
    } catch (err) {
      return { items: [], dispose: () => {} };
    }
  }

  freeInlineCompletions(completions: monaco.languages.InlineCompletions): void {
    completions.dispose();
  }

  handleItemDidShow(completions: monaco.languages.InlineCompletions, item: monaco.languages.InlineCompletionItem): void {
    // Track impression for analytics
    console.log('Inline completion shown:', item.insertText.substring(0, 50));
  }
}

interface AICodeService {
  getInlineCompletion(
    context: { prefix: string; suffix: string; languageId: string; filePath: string },
    token: CancellationToken
  ): Promise<{ text: string; confidence: number } | null>;
}
```

### 16.8 Full Provider Registration

```typescript
function registerAllProviders(
  lspManager: LSPServerManager,
  aiService: AICodeService
): monaco.IDisposable[] {
  const disposables: monaco.IDisposable[] = [];

  // LSP providers
  disposables.push(
    monaco.languages.registerCompletionItemProvider(
      '*',
      new LSPCompletionProvider(lspManager)
    )
  );

  disposables.push(
    monaco.languages.registerCodeActionProvider(
      '*',
      new LSPCodeActionProvider(lspManager)
    )
  );

  disposables.push(
    monaco.languages.registerInlayHintsProvider(
      '*',
      new LSPInlayHintsProvider(lspManager)
    )
  );

  // Semantic tokens
  const semanticProvider = new LSPSemanticTokensProvider(lspManager);
  disposables.push(
    monaco.languages.registerDocumentSemanticTokensProvider(
      { pattern: '**' },
      semanticProvider,
      semanticProvider.getLegend()
    )
  );

  // AI inline completions
  disposables.push(
    monaco.languages.registerInlineCompletionsProvider(
      { pattern: '**' },
      new AIInlineCompletionProvider(aiService)
    )
  );

  // Signature help
  disposables.push(
    monaco.languages.registerSignatureHelpProvider(
      '*',
      {
        signatureHelpTriggerCharacters: ['(', ','],
        signatureHelpRetriggerCharacters: [','],
        provideSignatureHelp: async (model, position, token, context) => {
          // Delegate to LSP
          return null;
        },
      }
    )
  );

  return disposables;
}
```

---

## 17. Conexoes

### 17.1 S34 (Monaco Editor)

A camada de inteligencia do editor e implementada exclusivamente via providers do Monaco Editor. Cada feature LSP mapeia para um provider Monaco:

```
S34 (Monaco)               S38 (Intelligence)
+------------------+       +-----------------------+
| CompletionItem   |<------| LSP / AI Completion   |
| Provider         |       | Bridge                |
+------------------+       +-----------------------+
| HoverProvider    |<------| LSP Hover + AI Explain|
+------------------+       +-----------------------+
| Definition       |<------| LSP Definition        |
| Provider         |       | Go to Implementation  |
+------------------+       +-----------------------+
| CodeAction       |<------| LSP Refactoring       |
| Provider         |       | AI Code Actions       |
+------------------+       +-----------------------+
| InlineCompletion |<------| AI Ghost Text         |
| Provider         |       | (Copilot-style)       |
+------------------+       +-----------------------+
| InlayHints       |<------| Type / Param Hints    |
| Provider         |       |                       |
+------------------+       +-----------------------+
| SemanticTokens   |<------| LSP Semantic Tokens   |
| Provider         |       | (AST-based)           |
+------------------+       +-----------------------+
| FoldingProvider  |<------| LSP Folding Ranges    |
+------------------+       +-----------------------+
```

### 17.2 S21 (Terminal/Debug/LSP)

O LSP Bridge (S21) e a implementacao concreta do cliente LSP que conecta o Monaco aos Language Servers. A S38 define os tipos, interfaces e providers que o S21 implementa.

```
S21 (LSP Bridge)            S38 (Editor Intelligence)
+------------------------+  +---------------------------+
| LSP Client Manager     |  | LSP Feature Types         |
| +-- Server lifecycle   |  | +-- CompletionItem        |
| +-- Transport (stdio)  |  | +-- Hover                 |
| +-- Message routing    |  | +-- Diagnostic            |
+------------------------+  | +-- CodeAction            |
          |                 | +-- SemanticTokens        |
          v                 | +-- InlayHint             |
+------------------------+  +---------------------------+
| Monaco Provider Bridge  |
| +-- CompletionProvider  |
| +-- HoverProvider       |
| +-- CodeActionProvider  |
| +-- etc.               |
+------------------------+
```

### 17.3 S11 (Theia Platform)

No Theia, os providers LSP sao registrados via `LanguageService` e `LanguageServerContribution`, nao diretamente no Monaco. A S38 define os tipos e interfaces que o Theia usa para criar suas contribuicoes.

```
Theia (S11)                     S38 (Intelligence)
+----------------------------+  +-------------------+
| LanguageService            |  | Provider Types    |
| +-- registerProvider      |  | +-- Completion    |
| +-- getProvider           |  | +-- Hover         |
| +-- LanguageServerManager |  | +-- Definition    |
+----------------------------+  +-------------------+
          |
          v
+----------------------------+
| Monaco Editor (via Theia)  |
| +-- LSP providers ativos  |
+----------------------------+
```

### 17.4 S31 (LLM)

O provider de AI intelligence (completions, chat, code generation) depende do modulo S31 (LLM integration) para inferencia de modelos.

```
S38 (IA Provider)              S31 (LLM)
+---------------------------+  +-------------------+
| AIInlineCompletion        |  | LLMProvider       |
| +-- Collect context       |  | +-- Ollama        |
| +-- Build prompt          |->| +-- OpenAI        |
| +-- Parse response        |  | +-- DeepSeek      |
+---------------------------+  | +-- Model router  |
| AICodeAction              |  +-------------------+
| +-- Bug detection         |
| +-- Refactoring           |
+---------------------------+
| AIChatProvider            |
| +-- Explain code          |
| +-- Generate tests        |
| +-- Generate docs         |
+---------------------------+
```

### 17.5 S36 (Extension Host)

O Extension Host pode adicionar Language Server providers via extensoes. A S38 define a API que extensoes usam para contribuir com intelligence:

```
S36 Extension                    S38 API
+-----------------------------+  +---------------------+
| Extension activate()        |  | IDEIA.languages      |
| +-- registra LSP server    |  | +-- registerProvider |
| +-- registra AI provider   |->| +-- createDiagnostic |
| +-- contribui snippets     |  | +-- executeCodeAction|
+-----------------------------+  +---------------------+
```

### 17.6 Cross-Reference Matrix

| Estudo | Relacao | Dependencia |
|--------|---------|-------------|
| S11 (Theia) | Theia LanguageService usa types da S38 | S38 define tipos |
| S21 (LSP/DAP) | Implementa LSP bridge que S38 consome | S38 define interface |
| S31 (LLM) | AI provider chama LLM para inferences | S31 executa modelo |
| S34 (Monaco) | Monaco providers sao superficie de S38 | S34 renderiza resultados |
| S36 (Extension Host) | Extensoes contribuem intelligence | S38 define contribution API |
| E4 (UX) | Latencia de intelligence impacta NPS | S38 define budgets |
| E3 (Qualidade) | Cobertura de providers = qualidade metric | S38 define test gates |

---

## 18. Plano de Implementacao

### 18.1 Tasks

| Task | Descricao | Prioridade | Estimativa | Pre-requisito |
|------|-----------|-----------|------------|--------------|
| EI-01 | Implementar LSP Client Manager (conexao, lifecycle, transport) | P0 | 12h | S21 (LSP Bridge) |
| EI-02 | Mapear todos 15+ providers LSP para Monaco providers | P0 | 16h | EI-01, S34 |
| EI-03 | Implementar Completion Pipeline com ranking/filtro | P0 | 8h | EI-02 |
| EI-04 | Diagnostic System com markers, collection e rendering | P0 | 8h | EI-02 |
| EI-05 | Semantic Tokens Provider (full + delta) | P0 | 6h | EI-02 |
| EI-06 | Code Actions system com organize e preferred | P1 | 6h | EI-04 |
| EI-07 | Inlay Hints Provider | P1 | 4h | EI-02 |
| EI-08 | Inline Completion Provider (ghost text) | P1 | 8h | EI-02 |
| EI-09 | AI Completion Provider (Copilot-style) | P1 | 16h | EI-08, S31 |
| EI-10 | Signature Help, Hover, Definition providers | P1 | 6h | EI-02 |
| EI-11 | Document Symbols + Folding providers | P1 | 4h | EI-02 |
| EI-12 | Multiple LSP Server coordination (router + fallback) | P2 | 10h | EI-01 |
| EI-13 | AI Code Actions (refactoring, bug fix) | P2 | 12h | EI-06, S31 |
| EI-14 | AI Chat integration (inline + sidebar) | P2 | 12h | S31 |
| EI-15 | Custom IDEIA LSP extensions protocol | P2 | 8h | EI-01 |
| EI-16 | Performance benchmark suite (TTFT, throughput) | P2 | 6h | EI-02 |

### 18.2 Milestones

| Milestone | Tasks | Prazo | Criterio de Aceite |
|-----------|-------|-------|-------------------|
| M1 - LSP Core | EI-01, EI-02, EI-04 | Semana 1 | 10 providers LSP conectados e funcionais |
| M2 - Productivity | EI-03, EI-05, EI-06, EI-07, EI-10, EI-11 | Semana 2 | Completions, hover, definitions, diagnostics, symbols |
| M3 - AI Layer | EI-08, EI-09, EI-13, EI-14 | Semana 3 | Ghost text + AI chat + AI actions |
| M4 - Production | EI-12, EI-15, EI-16 | Semana 4 | Multi-server, extensoes, benchmark |

### 18.3 Quality Gates

| Gate | Checks |
|------|--------|
| Provider Coverage | Todos providers registrados e respondendo |
| Latency Budget | Completion < 100ms local, < 500ms AI |
| Memory | Diagnostic collection < 10MB para 10K diagnostics |
| Fallback | Servidor cai, Monaco continua com TextMate tokens |
| AI Fallback | AI offline, LSP completions continuam |
| Cross-Language | 5 linguagens com LSP funcional |

---

> **Fim do Estudo S38 — Editor Intelligence & Language Features**
