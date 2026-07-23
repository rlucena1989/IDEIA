# Estudo S37 — Search, SCM & Task Systems

> **Tipo:** `study`
> **Status:** `draft`
> **Data:** 2026-07-22
> **Propósito:** Definir a arquitetura e implementacao dos tres pilares de produtividade de uma IDE: busca global (Search), controle de versao (SCM) e execucao de tarefas (Task Runner).
> **Contexto:** IDEIA — evolucao do ai-devkit para IDE completa com agentes de IA integrados
> **Base:** VS Code Search API, Theia Search, ripgrep 14.x, isomorphic-git 1.x, VS Code Task API 1.90.x, Monaco Editor Find Widget

---

## Sumario

1. [Introducao](#1-introducao)
2. [GLOBAL SEARCH SYSTEM](#2-global-search-system)
   - 2.1 [Arquitetura](#21-arquitetura)
   - 2.2 [Search Engine](#22-search-engine)
   - 2.3 [Search Providers API](#23-search-providers-api)
   - 2.4 [Search Results](#24-search-results)
   - 2.5 [Search in File](#25-search-in-file)
   - 2.6 [Search Performance](#26-search-performance)
3. [SOURCE CONTROL (SCM) SYSTEM](#3-source-control-scm-system)
   - 3.1 [Arquitetura](#31-arquitetura)
   - 3.2 [Git Integration](#32-git-integration)
   - 3.3 [SCM Provider API](#33-scm-provider-api)
   - 3.4 [Diff Editor](#34-diff-editor)
   - 3.5 [Timeline View](#35-timeline-view)
4. [TASK RUNNER SYSTEM](#4-task-runner-system)
   - 4.1 [Arquitetura](#41-arquitetura)
   - 4.2 [Task Definition](#42-task-definition)
   - 4.3 [Task Providers API](#43-task-providers-api)
   - 4.4 [Problem Matchers](#44-problem-matchers)
   - 4.5 [Build & Test Tasks](#45-build--test-tasks)
   - 4.6 [Task Execution & Output](#46-task-execution--output)
5. [Code Examples](#5-code-examples)
6. [Conexoes](#6-conexoes)
7. [Plano de Implementacao](#7-plano-de-implementacao)

---

## 1. Introducao

Toda IDE profissional precisa de tres capacidades fundamentais para que um desenvolvedor seja produtivo:

| Pilar | Funcao | Impacto |
|-------|--------|---------|
| **Search** | Encontrar arquivos, simbolos, texto e referencias no workspace | Navegacao instantanea em codebases de qualquer tamanho |
| **SCM** | Rastrear mudancas, visualizar diffs, gerenciar branches e commits | Controle de versao integrado sem sair do editor |
| **Task Runner** | Executar builds, testes, linters e scripts arbitrários | Automacao de fluxos de trabalho sem terminal separado |

A IDEIA precisa destes tres sistemas como servicos de plataforma — expostos via Theia para a interface grafica e via CLI para automacao com agentes de IA.

```
┌──────────────────────────────────────────────────────────────┐
│                    IDEIA Productivity Layer                    │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    SEARCH    │  │     SCM      │  │    TASKS     │       │
│  │  (find tudo) │  │  (git diff)  │  │ (build/test) │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         ▼                 ▼                 ▼                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              IDEIA Service Bus (NATS)                 │    │
│  └──────────────────────────────────────────────────────┘    │
│         │                 │                 │                │
│         ▼                 ▼                 ▼                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Agent Runtime Integration                │    │
│  │  (agentes usam search, scm, tasks como tools)        │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. GLOBAL SEARCH SYSTEM

### 2.1 Arquitetura

O sistema de busca global da IDEIA segue uma arquitetura de servico com provedores registraveis. O servico central coordena multiplos mecanismos de busca (ripgrep, busca textual, busca de simbolos) e apresenta resultados unificados.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SearchService (Core)                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Query Pipeline                         │    │
│  │                                                          │    │
│  │  Raw Query → Parser → Query Plan → Provider Dispatch    │    │
│  │       │          │           │            │              │    │
│  │       ▼          ▼           ▼            ▼              │    │
│  │  "foo bar"   tokens    strategy     which provider      │    │
│  │               +filters   (parallel)   to call            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  ripgrep │ │  Files   │ │ Symbols  │ │Reference │          │
│  │ Provider │ │ Provider │ │ Provider │ │Provider  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │             Search Session Manager                       │    │
│  │  - CancellationTokenSource por sessao                   │    │
│  │  - Debounce (300ms) em entradas do usuario              │    │
│  │  - Cache de resultados parciais (LRU 50 entradas)      │    │
│  │  - Progress reporting via callback/event                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Modelos de dados:**

```typescript
interface SearchQuery {
  pattern: string;
  includePattern?: string[];
  excludePattern?: string[];
  maxResults?: number;
  contextLines?: number;
  isRegex?: boolean;
  isCaseSensitive?: boolean;
  isWordMatch?: boolean;
  isMultiline?: boolean;
  isOnlyOpenEditors?: boolean;
}

interface SearchResult {
  query: SearchQuery;
  matches: FileMatch[];
  totalMatchCount: number;
  truncated: boolean;
  duration: number;
}

interface FileMatch {
  resource: Uri;
  matches: LineMatch[];
  preview: string;
}

interface LineMatch {
  lineNumber: number;
  lineContent: string;
  offset: number;
  length: number;
  beforeContext: string[];
  afterContext: string[];
}

interface SearchProgress {
  filesScanned: number;
  filesMatched: number;
  currentFile?: Uri;
  percentComplete: number;
}
```

### 2.2 Search Engine

#### ripgrep Integration

ripgrep (rg) e o motor de busca recomendado para a IDEIA devido a sua velocidade e respeito automatico a `.gitignore`. Tres estrategias de integracao:

| Estrategia | Descricao | Latencia | Bundle Size | Uso |
|------------|-----------|----------|-------------|-----|
| **Binary exec** | Executa binario `rg` nativo via `child_process.execFile` | ~5ms startup | 5MB (binario) | Desktop / Node.js |
| **WASM ripgrep** | ripgrep compilado para WebAssembly via `wasm-pack` | ~50ms startup | 8MB (wasm) | Web / Theia Cloud |
| **Node.js native** | Binding nativo `@ripgrep/node` | ~2ms startup | 12MB (napi) | Desktop otimizado |

Para a IDEIA, a abordagem sera **hibrida**: binary em desktop, WASM em web, com fallback para busca textual simples se nenhum estiver disponivel.

```typescript
interface IRipgrepEngine {
  execute(query: SearchQuery, token: CancellationToken): AsyncIterable<RipgrepMatch>;
}

class BinaryRipgrepEngine implements IRipgrepEngine {
  private rgPath: string;

  constructor() {
    this.rgPath = this.detectRipgrepBinary();
  }

  private detectRipgrepBinary(): string {
    const candidates = [
      path.join(__dirname, '..', 'binaries', `rg-${process.platform}-${process.arch}`),
      path.join(process.resourcesPath ?? '', 'rg'),
      'rg' // system PATH fallback
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    throw new Error('ripgrep binary not found');
  }

  async *execute(query: SearchQuery, token: CancellationToken): AsyncIterable<RipgrepMatch> {
    const args = this.buildArgs(query);
    const child = spawn(this.rgPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const lineReader = readline.createInterface({ input: child.stdout });

    for await (const line of lineReader) {
      if (token.isCancellationRequested) {
        child.kill();
        return;
      }
      const match = this.parseLine(line);
      if (match) yield match;
    }
  }

  private buildArgs(query: SearchQuery): string[] {
    const args: string[] = [
      '--json',
      '--max-count', '1000',
      '--no-heading',
    ];
    if (query.isRegex) args.push('--regexp');
    if (query.isCaseSensitive) args.push('--case-sensitive');
    else args.push('--ignore-case');
    if (query.isWordMatch) args.push('--word-regexp');
    if (query.isMultiline) args.push('--multiline');
    if (query.contextLines) {
      args.push('--context', String(query.contextLines));
    }
    if (query.includePattern?.length) {
      for (const p of query.includePattern) args.push('--glob', p);
    }
    if (query.excludePattern?.length) {
      for (const p of query.excludePattern) args.push('--glob', `!${p}`);
    }
    args.push(query.pattern, '.');
    return args;
  }
}
```

**Query Syntax:**

| Aspecto | Formato | Exemplo |
|---------|---------|---------|
| Pattern literal | string pura | `function fetchData` |
| Regex | flag `isRegex` | `function\s+\w+\s*\(` |
| File filter | `includePattern` | `['*.ts', '*.tsx']` |
| Exclude | `excludePattern` | `['node_modules/**']` |
| Context lines | `contextLines: N` | `3` |
| Word match | `isWordMatch: true` | encontra `foo` mas nao `foobar` |
| Case sensitivity | `isCaseSensitive: true` | `Foo` != `foo` |
| Multiline | `isMultiline: true` | `foo\s+bar` cruza linhas |

**Exclude patterns padrao:**

```typescript
const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '*.min.*',
  '*.map',
  '*.bundle.*',
  '.vscode/**',
  '.idea/**',
  '*.lock',
  'yarn.lock',
  'package-lock.json',
  'pnpm-lock.yaml',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
];
```

**Search timeout e workspaces grandes:**

```typescript
interface SearchTimeoutConfig {
  globalTimeout: number;        // 30s timeout total
  perFileTimeout: number;       // 5s timeout por arquivo
  maxSearchSize: number;        // 100MB max total
  progressiveThreshold: number; // 500MB: busca progressiva
}

class ProgressiveSearchStrategy {
  async search(query: SearchQuery, token: CancellationToken): Promise<SearchResult> {
    const workspaceSize = await this.measureWorkspace();
    if (workspaceSize < this.config.progressiveThreshold) {
      return this.fullSearch(query, token);
    }
    // Busca progressiva: primeiro arquivos mais relevantes
    const rankedFiles = await this.rankByRelevance(query);
    const partial = new AggregateSearchResult();
    for (const batch of chunks(rankedFiles, 50)) {
      if (token.isCancellationRequested) break;
      const result = await this.searchFiles(batch, query, token);
      partial.merge(result);
      if (partial.totalMatchCount >= query.maxResults ?? 1000) break;
      this.reportProgress(partial, rankedFiles.length);
    }
    partial.truncated = true;
    return partial.finalize();
  }

  private async rankByRelevance(query: SearchQuery): Promise<Uri[]> {
    // Heuristica: arquivos abertos > arquivos modificados > extensao match > recentes
    const openFiles = await this.getOpenEditors();
    const modifiedFiles = await this.getModifiedFiles();
    const extensionMatch = await this.globFiles(`**/*.{${this.inferExtensions(query)}}`);
    const recentFiles = await this.getRecentlyOpened();
    return this.dedupeAndSort([...openFiles, ...modifiedFiles, ...extensionMatch, ...recentFiles]);
  }
}
```

### 2.3 Search Providers API

A IDEIA expoe uma interface de provedor de busca que permite que extensoes registrem mecanismos de busca customizados.

```typescript
interface SearchProvider {
  readonly id: string;
  readonly label: string;
  readonly icon?: Uri;

  provideSearchResults(
    query: SearchQuery,
    options: SearchProviderOptions,
    token: CancellationToken
  ): ProviderResult<SearchResult>;

  provideSearchPreview?(match: LineMatch, token: CancellationToken): ProviderResult<string>;
}

interface SearchProviderOptions {
  maxResults: number;
  onProgress: (progress: SearchProgress) => void;
  signal: AbortSignal;
}

// Registro de provedores
class SearchService {
  private providers: Map<string, SearchProvider> = new Map();
  private sessions: Map<string, SearchSession> = new Map();

  registerSearchProvider(provider: SearchProvider): Disposable {
    this.providers.set(provider.id, provider);
    return {
      dispose: () => this.providers.delete(provider.id)
    };
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const session = this.createSession();
    const candidates = this.selectProviders(query);
    const results = await Promise.all(
      candidates.map(p =>
        this.executeWithTimeout(
          p.provideSearchResults(query, session.options, session.token),
          30000
        )
      )
    );
    return this.mergeAndRank(results);
  }

  private selectProviders(query: SearchQuery): SearchProvider[] {
    const selected: SearchProvider[] = [];
    for (const [id, provider] of this.providers) {
      if (this.canHandleQuery(provider, query)) {
        selected.push(provider);
      }
    }
    // Ordem: text search > file search > symbol > reference
    return selected.sort((a, b) => this.providerPriority(a) - this.providerPriority(b));
  }
}

// Provedores built-in
class TextSearchProvider implements SearchProvider {
  async provideSearchResults(query: SearchQuery, options: SearchProviderOptions): Promise<SearchResult> {
    const engine = new BinaryRipgrepEngine();
    const matches: FileMatch[] = [];
    for await (const rgMatch of engine.execute(query, toCancellationToken(options.signal))) {
      this.accumulate(matches, rgMatch);
      options.onProgress({
        filesScanned: rgMatch.fileCount,
        filesMatched: matches.length,
        percentComplete: 0 // unknown with ripgrep
      });
    }
    return { query, matches, totalMatchCount: matches.length, truncated: false, duration: 0 };
  }
}

class FileSearchProvider implements SearchProvider {
  async provideSearchResults(query: SearchQuery, options: SearchProviderOptions): Promise<SearchResult> {
    const pattern = query.isRegex
      ? query.pattern
      : `*${query.pattern.replace(/\s/g, '*')}*`;
    const files = await globby(pattern, {
      cwd: workspace.root,
      ignore: DEFAULT_EXCLUDE_PATTERNS,
      gitignore: true,
      caseSensitiveMatch: query.isCaseSensitive ?? false,
      deep: 10,
    });
    const fileMatches: FileMatch[] = files.slice(0, options.maxResults).map(f => ({
      resource: Uri.file(f),
      matches: [],
      preview: path.basename(f),
    }));
    return { query, matches: fileMatches, totalMatchCount: fileMatches.length, truncated: files.length > options.maxResults, duration: 0 };
  }
}

class SymbolSearchProvider implements SearchProvider {
  async provideSearchResults(query: SearchQuery, options: SearchProviderOptions): Promise<SearchResult> {
    // Delega para o Language Server / DocumentSymbolProvider
    providers = languages.getDocumentSymbolProviders();
    // ...
  }
}
```

**Search Session Management:**

```typescript
class SearchSession {
  readonly id: string;
  readonly createdAt: Date;
  readonly abortController: AbortController;
  private results: SearchResult[] = [];
  private history: SearchQuery[] = [];

  constructor(private query: SearchQuery) {
    this.id = crypto.randomUUID();
    this.createdAt = new Date();
    this.abortController = new AbortController();
  }

  cancel(): void {
    this.abortController.abort();
  }

  addToHistory(query: SearchQuery): void {
    this.history.push(query);
    if (this.history.length > 50) this.history.shift();
  }

  getHistory(): SearchQuery[] {
    return [...this.history];
  }
}
```

### 2.4 Search Results

**Result Tree Model:**

```typescript
interface SearchResultTreeModel {
  // Arvore de resultados: arquivo > linha
  rootNodes: FileResultNode[];
  collapsedFiles: Set<string>;   // arquivos colapsados
  matchCount: number;
  fileCount: number;

  // Navegacao
  selectNext(): LineMatch | null;
  selectPrevious(): LineMatch | null;
  expandAll(): void;
  collapseAll(): void;
  toggleFile(file: string): void;
}

interface FileResultNode {
  file: Uri;
  relativePath: string;
  matchCount: number;
  lines: LineResultNode[];
  expanded: boolean;
  preview: string; // preview do arquivo com highlights

  // Acoes
  open(): void;
  openToSide(): void;
  collapse(): void;
  revealInExplorer(): void;
}

interface LineResultNode {
  lineNumber: number;
  content: string;
  highlights: HighlightRange[];
  beforeContext: string[];
  afterContext: string[];
  isActive: boolean;

  // Acoes
  open(): void;
  copy(): void;
  replace(preview: string): void;
}

interface HighlightRange {
  offset: number;
  length: number;
}
```

**Preview Rendering:**

```typescript
class SearchResultRenderer {
  renderPreview(match: FileMatch): string {
    const maxLines = 8;
    const lines = match.matches.flatMap(lineMatch => {
      const contextLines = [
        ...lineMatch.beforeContext.slice(-3),
        lineMatch.lineContent,
        ...lineMatch.afterContext.slice(0, 3),
      ];
      return this.highlightMatches(contextLines, match.query.pattern);
    });
    return lines.slice(0, maxLines).join('\n');
  }

  private highlightMatches(lines: string[], pattern: string): string[] {
    const regex = new RegExp(`(${escapeRegex(pattern)})`, 'gi');
    return lines.map(line =>
      line.replace(regex, '<mark class="search-highlight">$1</mark>')
    );
  }
}
```

**Replace Preview:**

```typescript
interface ReplaceOperation {
  query: SearchQuery;
  replaceText: string;
  preserveCase?: boolean;
  filesToSkip?: string[];

  // Preview de replace
  preview(): Promise<FileReplacePreview[]>;
  execute(): Promise<ReplaceSummary>;
}

interface FileReplacePreview {
  file: Uri;
  changes: TextEdit[];
  conflicts: TextEdit[]; // overlaping matches
}

interface ReplaceSummary {
  filesAffected: number;
  totalReplacements: number;
  filesSkipped: string[];
  errors: string[];
}

class ReplaceEngine {
  async executeReplace(operation: ReplaceOperation): Promise<ReplaceSummary> {
    const files = await this.findFilesToReplace(operation);
    let totalReplacements = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        const replaced = this.applyReplace(content, operation);
        const edit = new TextEdit(file, content, replaced);
        await this.applyEdit(edit);
        totalReplacements += this.countChanges(content, replaced);
      } catch (err) {
        errors.push(`${file}: ${err.message}`);
      }
    }

    return { filesAffected: files.length, totalReplacements, filesSkipped: [], errors };
  }

  private applyReplace(content: string, op: ReplaceOperation): string {
    const flags = op.query.isCaseSensitive ? 'g' : 'gi';
    const regex = op.query.isRegex
      ? new RegExp(op.query.pattern, flags)
      : new RegExp(escapeRegex(op.query.pattern), flags);

    if (op.preserveCase) {
      return content.replace(regex, match => this.preserveCaseReplace(match, op.replaceText));
    }
    return content.replace(regex, op.replaceText);
  }

  private preserveCaseReplace(match: string, replacement: string): string {
    if (match === match.toUpperCase()) return replacement.toUpperCase();
    if (match[0] === match[0].toUpperCase() && match.slice(1) === match.slice(1).toLowerCase()) {
      return replacement[0].toUpperCase() + replacement.slice(1);
    }
    return replacement;
  }
}
```

### 2.5 Search in File

O widget de busca no editor (Find Widget) do Monaco Editor sera integrado diretamente na IDEIA.

```
┌──────────────────────────────────────────────────────────────┐
│                    Find Widget (Monaco)                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ [🔍] [___________find text__________] [▼] [×]      │     │
│  │      [___________replace with_______] [▼][▸]      │     │
│  │      (Match Case) (Regex) (Word) (Highlight All)   │     │
│  │      1 of 42 matches                                │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  Funcionalidades:                                             │
│  - Incremental search (match a cada tecla)                   │
│  - Multi-cursor search (add selection at next match)         │
│  - Selection-based search (preenche com texto selecionado)   │
│  - Find/replace com regex e preserve case                    │
│  - History de buscas (ultimas 50)                            │
│  - Highlight all matches no editor                           │
│  - Widget persists entre abas                                │
└──────────────────────────────────────────────────────────────┘
```

```typescript
interface FindInFileOptions {
  text: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  isWordMatch: boolean;
  replaceText?: string;
  preserveCase?: boolean;
}

class FindInFileService {
  private monacoEditor: editor.IStandaloneCodeEditor;
  private sessionHistory: Map<string, FindInFileOptions[]> = new Map();

  openFindWidget(): void {
    const selection = this.monacoEditor.getSelection();
    const selectedText = this.monacoEditor.getModel()?.getValueInRange(selection);
    this.monacoEditor.trigger('keyboard', 'actions.find', {
      searchString: selectedText ?? '',
      isRegex: false,
      matchCase: false,
      wholeWord: false,
    });
  }

  openReplaceWidget(): void { /* similar */ }

  addToHistory(editorId: string, options: FindInFileOptions): void {
    const history = this.sessionHistory.get(editorId) ?? [];
    history.unshift(options);
    if (history.length > 50) history.pop();
    this.sessionHistory.set(editorId, history);
  }

  multiCursorSelectNext(): void {
    this.monacoEditor.trigger('keyboard', 'editor.action.addSelectionToNextFindMatch', {});
  }

  multiCursorSelectAll(): void {
    this.monacoEditor.trigger('keyboard', 'editor.action.selectHighlights', {});
  }
}
```

### 2.6 Search Performance

| Tecnica | Descricao | Ganho Estimado |
|---------|-----------|---------------|
| **Indexed search** | Indice invertido em SQLite FTS5 para buscas frequentes | 10x-50x em workspaces > 1GB |
| **Search cache** | LRU cache de resultados de queries repetidas (500 entradas, 60s TTL) | 5x-20x para buscas repetidas |
| **Debounced updates** | 300ms debounce em inputs do usuario | Reduz buscas desnecessarias em 80% |
| **Exclusion patterns** | .gitignore integrado + exclusion default | Reduz scan em 60-90% em projetos npm |
| **Incremental scan** | Scanner que prioriza arquivos abertos/modificados | Percecao de velocidade 2x |
| **Parallel file scanning** | scan paralelo com worker pool (4-8 workers) | 4x em multicore |
| **Binary skipping** | Detecta binarios por magic bytes e pula | Evita falsos positivos + acelera |

```typescript
class SearchCache {
  private cache = new LRUCache<string, SearchResult>({ max: 500, ttl: 60_000 });
  private index: SearchIndex | null = null;

  async getOrSearch(query: SearchQuery): Promise<SearchResult> {
    const key = this.cacheKey(query);
    const cached = this.cache.get(key);
    if (cached) return cached;

    // Tenta indexed search primeiro
    if (this.index && query.pattern.length >= 3) {
      const indexResult = await this.index.search(query);
      if (indexResult && indexResult.matches.length > 0) {
        this.cache.set(key, indexResult);
        return indexResult;
      }
    }

    // Fallback para ripgrep
    const result = await this.ripgrepSearch(query);
    this.cache.set(key, result);

    // Atualiza indice async
    if (this.index && query.pattern.length >= 3) {
      this.index.update(result).catch(() => {});
    }

    return result;
  }

  private cacheKey(query: SearchQuery): string {
    return `${query.pattern}|${query.isRegex}|${query.isCaseSensitive}|${query.includePattern?.join(',')}`;
  }
}

class SearchIndex {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
        path, content, tokenize='porter unicode61'
      );
    `);
  }

  async search(query: SearchQuery): Promise<SearchResult | null> {
    if (query.isRegex || query.isMultiline) return null; // FTS5 nao suporta regex
    const safePattern = query.pattern.replace(/'/g, "''");
    const ftsQuery = query.isWordMatch ? `"${safePattern}"` : safePattern;
    const rows = this.db.prepare(`
      SELECT path, content, rank FROM search_index
      WHERE search_index MATCH ?
      ORDER BY rank LIMIT ?
    `).all(ftsQuery, query.maxResults ?? 100);
    return this.rowsToResult(rows, query);
  }

  async update(result: SearchResult): Promise<void> {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO search_index (path, content) VALUES (?, ?)
    `);
    const tx = this.db.transaction(() => {
      for (const file of result.matches) {
        insert.run(file.resource.fsPath, file.preview);
      }
    });
    tx();
  }
}
```

---

## 3. SOURCE CONTROL (SCM) SYSTEM

### 3.1 Arquitetura

O SCM da IDEIA segue o modelo de provedores: um servico central que gerencia multiplos sistemas de controle de versao (Git, Mercurial, SVN), com foco primario em Git.

```
┌─────────────────────────────────────────────────────────────────┐
│                      SCM Service (Core)                          │
│                                                                  │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │    SCM Provider Registry │  │    Repository Manager        │  │
│  │                         │  │                               │  │
│  │  - GitProvider          │  │  - Repository[]              │  │
│  │  - MercurialProvider    │  │  - rootWatcher                │  │
│  │  - Custom providers     │  │  - status cache               │  │
│  └──────────┬──────────────┘  └──────────────┬────────────────┘  │
│             │                                  │                   │
│             ▼                                  ▼                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    Resource State Model                    │    │
│  │                                                           │    │
│  │  Working Tree:   [M] modified  [A] added  [D] deleted    │    │
│  │                  [U] untracked [C] conflicted  [I] ignored│    │
│  │  Index:          [M] staged modified  [A] staged added    │    │
│  │  HEAD:           [>] ahead  [<] behind  [<>] diverged     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    Diff Service                            │    │
│  │  - Working Tree vs Index                                 │    │
│  │  - Index vs HEAD                                         │    │
│  │  - HEAD vs Remote                                        │    │
│  │  - Arbitrary refs                                        │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Resource State Model:**

```typescript
enum ResourceState {
  Modified = 'M',
  Added = 'A',
  Deleted = 'D',
  Untracked = 'U',
  Conflicted = 'C',
  Ignored = 'I',
  StagedModified = 'SM',
  StagedAdded = 'SA',
  StagedDeleted = 'SD',
  Renamed = 'R',
  Copied = 'CP',
  Unchanged = ' ',
}

interface Repository {
  readonly root: Uri;
  readonly head: HeadInfo;
  readonly state: RepositoryState;

  // File status
  getWorkingTreeStatus(): Promise<Map<string, ResourceState>>;
  getIndexStatus(): Promise<Map<string, ResourceState>>;

  // Operations
  stage(file: Uri): Promise<void>;
  unstage(file: Uri): Promise<void>;
  commit(message: string, options?: CommitOptions): Promise<string>;
  discard(file: Uri): Promise<void>;

  // Branch
  getBranch(): Promise<BranchInfo>;
  checkout(branch: string): Promise<void>;
  createBranch(name: string, base?: string): Promise<void>;

  // Remote
  fetch(remote?: string): Promise<void>;
  push(remote?: string, branch?: string): Promise<void>;
  pull(remote?: string, branch?: string): Promise<void>;

  // Events
  onDidChange: Event<void>;
  onDidChangeStatus: Event<StatusChangeEvent>;
}

interface HeadInfo {
  ref: string;
  commit: string;
  ahead: number;
  behind: number;
}

interface BranchInfo {
  current: string;
  branches: string[];
  remote?: string;
  upstream?: string;
}

interface RepositoryState {
  workingTreeChanges: number;
  indexChanges: number;
  mergeChanges: number;
  untrackedChanges: number;
  conflicted: boolean;
  merging: boolean;
  rebasing: boolean;
  cherryPicking: boolean;
  reverting: boolean;
}
```

### 3.2 Git Integration

A IDEIA suporta tres abordagens de integracao Git:

| Abordagem | Descricao | Performance | Bundle | Confiabilidade |
|-----------|-----------|-------------|--------|---------------|
| **isomorphic-git** | Git puro em JS/WASM, sem binario externo | 3/5 | ~500KB (wasm) | 5/5 (opera em qualquer ambiente) |
| **exec git CLI** | Executa `git` do sistema via child_process | 5/5 | 0KB | 4/5 (dependente de binario) |
| **nodegit** | Binding nativo libgit2 | 5/5 | ~15MB (napi) | 3/5 (build complexo, Windows issues) |

A IDEIA usara **isomorphic-git como padrao** (portavel para web/desktop) com fallback opcional para **git CLI** em cenarios que exigem performance maxima (blame em arquivos grandes, rebase interativo, submodules).

```typescript
import git from 'isomorphic-git';
import fs from 'fs';
import http from 'isomorphic-git/http/node';

interface GitConfig {
  dir: string;
  gitdir?: string;
  fs: typeof fs;
  http: typeof http;
  onAuth?: (url: string) => Promise<{ username: string; password: string }>;
}

class GitService {
  private config: GitConfig;

  constructor(repoPath: string) {
    this.config = {
      dir: repoPath,
      fs,
      http,
      onAuth: this.onAuth.bind(this),
    };
  }

  async status(): Promise<Map<string, ResourceState>> {
    const statusMatrix = await git.statusMatrix(this.config);
    const result = new Map<string, ResourceState>();

    for (const [filepath, head, index, workingTree] of statusMatrix) {
      if (head === 0 && index === 0 && workingTree === 2) {
        result.set(filepath, ResourceState.Untracked);
      } else if (head === 1 && index === 1 && workingTree === 2) {
        result.set(filepath, ResourceState.Modified);
      } else if (head === 1 && index === 2 && workingTree === 2) {
        result.set(filepath, ResourceState.StagedModified);
      } else if (head === 0 && index === 2 && workingTree === 2) {
        result.set(filepath, ResourceState.StagedAdded);
      } else if (head === 1 && index === 0 && workingTree === 0) {
        result.set(filepath, ResourceState.Deleted);
      } else if (head === 1 && index === 0 && workingTree === 2) {
        result.set(filepath, ResourceState.StagedDeleted);
      } else if (head === 0 && index === 0 && workingTree === 0) {
        continue; // unchanged
      } else {
        result.set(filepath, ResourceState.Unchanged);
      }
    }
    return result;
  }

  async log(options?: { depth?: number; ref?: string; filepath?: string }): Promise<Commit[]> {
    const commits = await git.log({
      ...this.config,
      depth: options?.depth ?? 30,
      ref: options?.ref ?? 'HEAD',
      filepath: options?.filepath,
    });
    return commits.map(c => ({
      oid: c.oid,
      message: c.commit.message,
      author: { name: c.commit.author.name, email: c.commit.author.email, timestamp: c.commit.author.timestamp },
      committer: { name: c.commit.committer.name, email: c.commit.committer.email, timestamp: c.commit.committer.timestamp },
      parent: c.commit.parent,
    }));
  }

  async diff(options: { from?: string; to?: string; filepath?: string; type?: 'working' | 'staged' | 'commit' }): Promise<string> {
    if (options.type === 'working') {
      return git.diff(this.config, {
        ref: 'HEAD',
        filepath: options.filepath,
      });
    }
    return git.diff(this.config, {
      ref: options.from ?? 'HEAD',
      compareRef: options.to,
      filepath: options.filepath,
    });
  }

  async branch(): Promise<BranchInfo> {
    const current = await git.currentBranch(this.config);
    const branches = await git.listBranches(this.config);
    const remotes = await git.listRemotes(this.config);
    const upstream = remotes.length > 0 ? remotes[0].remote : undefined;
    return { current: current ?? 'unknown', branches, remote: remotes[0]?.url, upstream };
  }

  async stash(): Promise<void> {
    await git.stash(this.config);
  }

  async stashPop(): Promise<void> {
    await git.stash(this.config, { action: 'apply' });
  }

  async fetch(remote?: string): Promise<void> {
    await git.fetch({ ...this.config, remote: remote ?? 'origin' });
  }

  async push(remote?: string, branch?: string): Promise<void> {
    await git.push({
      ...this.config,
      remote: remote ?? 'origin',
      ref: branch ?? await git.currentBranch(this.config) ?? 'main',
    });
  }

  async pull(remote?: string, branch?: string): Promise<void> {
    await git.pull({
      ...this.config,
      remote: remote ?? 'origin',
      ref: branch ?? await git.currentBranch(this.config) ?? 'main',
      fastForwardOnly: true,
    });
  }

  async blame(filepath: string): Promise<BlameLine[]> {
    // isomorphic-git nao tem blame nativo -> fallback para git CLI
    return this.blameViaCLI(filepath);
  }

  private async blameViaCLI(filepath: string): Promise<BlameLine[]> {
    const result = await exec('git', ['blame', '--porcelain', filepath], { cwd: this.config.dir });
    return this.parseBlamePorcelain(result.stdout);
  }

  private parseBlamePorcelain(output: string): BlameLine[] {
    const lines: BlameLine[] = [];
    let currentCommit: string | null = null;
    for (const line of output.split('\n')) {
      if (line.startsWith('^') || /^[0-9a-f]{40}/.test(line)) {
        const parts = line.split(' ');
        currentCommit = parts[0];
      } else if (line.startsWith('author ')) {
        // author line
      } else if (line.startsWith('\t')) {
        lines.push({ commit: currentCommit ?? '', content: line.slice(1) });
      }
    }
    return lines;
  }

  // LFS support
  async isLFSEnabled(): Promise<boolean> {
    try {
      const result = await exec('git', ['lfs', 'env'], { cwd: this.config.dir });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async lfsTrack(pattern: string): Promise<void> {
    await exec('git', ['lfs', 'track', pattern], { cwd: this.config.dir });
  }
}

interface BlameLine {
  commit: string;
  author?: string;
  timestamp?: number;
  lineNumber?: number;
  content: string;
}

interface Commit {
  oid: string;
  message: string;
  author: { name: string; email: string; timestamp: number };
  committer: { name: string; email: string; timestamp: number };
  parent: string[];
}
```

### 3.3 SCM Provider API

Interface de provedor SCM que permite que extensoes registrem sistemas de controle de versao customizados.

```typescript
interface SourceControl {
  readonly id: string;
  readonly label: string;
  readonly rootUri: Uri;
  readonly inputBox: SourceControlInputBox;
  readonly resourceGroups: SourceControlResourceGroup[];
  readonly count?: number;

  // Commands
  commit(message: string): Promise<void>;
  discard(resource: SourceControlResourceState): Promise<void>;

  // Stage operations
  stage(resource: Uri | Uri[]): Promise<void>;
  unstage(resource: Uri | Uri[]): Promise<void>;

  // Merge
  acceptMerge?(resource: SourceControlResourceState): Promise<void>;
  rejectMerge?(resource: SourceControlResourceState): Promise<void>;

  // Events
  onDidChangeResourceGroups: Event<void>;
  onDidChangeCommitTemplate: Event<string>;
  onDidChangeCount: Event<number>;

  // Dispose
  dispose(): void;
}

interface SourceControlInputBox {
  value: string;
  placeholder: string;
  enabled: boolean;
  onDidChange: Event<string>;
  validateInput?(value: string): string | undefined | null | Thenable<string | undefined | null>;
}

interface SourceControlResourceGroup {
  readonly id: string;
  readonly label: string;
  readonly hideWhenEmpty?: boolean;
  resources: SourceControlResourceState[];
  onDidChange: Event<void>;
  dispose(): void;
}

interface SourceControlResourceState {
  readonly resourceUri: Uri;
  readonly state: ResourceState;
  readonly command?: Command;
  readonly contextValue?: string;
  readonly decorations?: SourceControlResourceDecorations;

  // Tooltip / preview
  getTooltip?(): string;
  getStrikethroughUri?(): boolean;
  getHighlight?(): 'modified' | 'added' | 'deleted' | 'conflicted';
}

interface SourceControlResourceDecorations {
  strikeThrough?: boolean;
  faded?: boolean;
  tooltip?: string;
  icon?: Uri | { light: Uri; dark: Uri } | ThemeIcon;
  source?: 'resource' | 'folder';
}

// Registro
interface SourceControlManager {
  createSourceControl(
    id: string,
    label: string,
    rootUri: Uri
  ): SourceControl;

  getSourceControls(): SourceControl[];
  getSourceControl(id: string): SourceControl | undefined;
}

// Implementacao concreta para Git
class GitSourceControl implements SourceControl {
  readonly id = 'git';
  readonly label = 'Git';
  readonly resourceGroups: SourceControlResourceGroup[] = [];
  readonly inputBox: SourceControlInputBox;
  private gitService: GitService;
  private _onDidChangeResourceGroups = new EventEmitter<void>();

  constructor(private rootUri: Uri) {
    this.gitService = new GitService(rootUri.fsPath);
    this.inputBox = new GitInputBox();
    this.resourceGroups.push(new GitResourceGroup('working', 'Changes', this.gitService));
    this.resourceGroups.push(new GitResourceGroup('staged', 'Staged Changes', this.gitService));
    if (this.hasMergeConflict()) {
      this.resourceGroups.push(new GitResourceGroup('merge', 'Merge Changes', this.gitService));
    }
  }

  get count(): number {
    return this.resourceGroups.reduce((sum, g) => sum + g.resources.length, 0);
  }

  async commit(message: string): Promise<void> {
    // Stage all changes first se nao estiverem staged
    for (const group of this.resourceGroups) {
      if (group.id === 'working') {
        for (const r of group.resources) {
          await this.stage(r.resourceUri);
        }
      }
    }
    await this.gitService.commit({ message, author: this.getAuthor() });
    this.refresh();
  }

  async stage(resource: Uri | Uri[]): Promise<void> {
    const uris = Array.isArray(resource) ? resource : [resource];
    for (const uri of uris) {
      await this.gitService.add(uri.fsPath);
    }
    this.refresh();
  }

  async unstage(resource: Uri | Uri[]): Promise<void> {
    const uris = Array.isArray(resource) ? resource : [resource];
    const head = await exec('git', ['rev-parse', '--verify', 'HEAD']);
    if (!head) return; // no commits yet, unstage removes from index
    for (const uri of uris) {
      await exec('git', ['reset', 'HEAD', '--', uri.fsPath], { cwd: this.rootUri.fsPath });
    }
    this.refresh();
  }

  async discard(resource: SourceControlResourceState): Promise<void> {
    if (resource.state === ResourceState.Modified || resource.state === ResourceState.Deleted) {
      await exec('git', ['checkout', '--', resource.resourceUri.fsPath], { cwd: this.rootUri.fsPath });
    } else if (resource.state === ResourceState.Untracked) {
      await fs.promises.unlink(resource.resourceUri.fsPath);
    }
    this.refresh();
  }

  private async refresh(): Promise<void> {
    for (const group of this.resourceGroups) {
      await group.refresh();
    }
    this._onDidChangeResourceGroups.fire();
  }

  private async hasMergeConflict(): Promise<boolean> {
    const result = await exec('git', ['ls-files', '-u'], { cwd: this.rootUri.fsPath });
    return result.stdout.trim().length > 0;
  }

  dispose(): void {
    // cleanup
  }
}
```

**Status Bar Decorations:**

```typescript
interface SCMStatusBar {
  render(repository: Repository): void {
    const branch = repository.head.ref;
    const changes = repository.state.workingTreeChanges;
    const ahead = repository.head.ahead;
    const behind = repository.head.behind;

    let label = `$(git-branch) ${branch}`;
    if (ahead > 0) label += ` $(arrow-up) ${ahead}`;
    if (behind > 0) label += ` $(arrow-down) ${behind}`;
    if (changes > 0) label += ` $(circle-filled) ${changes}`;

    statusBar.text = label;
    statusBar.tooltip = `${changes} change(s) in working tree`;
    statusBar.color = changes > 0 ? 'statusBar.warningForeground' : undefined;
    statusBar.command = 'workbench.view.scm';
  }
}
```

### 3.4 Diff Editor

```
┌──────────────────────────────────────────────────────────────┐
│                    Diff Editor (Monaco)                        │
│                                                               │
│  ┌───────────── SIDE-BY-SIDE VIEW ─────────────┐              │
│  │  Original (HEAD)     │  Modified (Working)   │              │
│  │                       │                       │              │
│  │  import { foo }      │  import { foo, bar }  │              │
│  │  ─────────────────── │  ─────────────────── │              │
│  │  function main() {  │  function main() {   │              │
│  │  █ const x = 1;     │  █ const x = 1;      │              │
│  │  - const y = 2;     │  + const y = 2;      │              │
│  │  - const z = 3;     │  + const z = 42;     │  ← diff     │
│  │  █ return x + y + z;│  █ return x + y + z; │              │
│  │  }                   │  }                   │              │
│  │                       │                       │              │
│  │  [<] [▸] [>] [>>]    │  [1 / 5 changes]      │              │
│  └───────────────────────────────────────────────┘              │
│                                                               │
│  Funcionalidades:                                              │
│  - Side-by-side e inline diff                                 │
│  - Diff algorithm: Myers (padrao), Patience (codigo limpo)     │
│  - Move detection (detecta blocos movidos)                    │
│  - Diff navigator (navega entre mudancas)                     │
│  - Staged vs unstaged diff view                               │
│  - Merge editor (3-way merge)                                  │
│  - Decorations no gutter (modified, added, deleted)           │
└──────────────────────────────────────────────────────────────┐
```

```typescript
interface DiffEditorOptions {
  original: Uri;
  modified: Uri;
  label?: string;
  readOnly?: boolean;
  diffAlgorithm?: 'myers' | 'patience' | 'histogram';
  renderSideBySide?: boolean;
  showEmptyDecorations?: boolean;
  enableMoveDetection?: boolean;
}

class DiffEditorService {
  async openDiff(options: DiffEditorOptions): Promise<void> {
    const originalContent = await fs.promises.readFile(options.original.fsPath, 'utf-8');
    const modifiedContent = await fs.promises.readFile(options.modified.fsPath, 'utf-8');

    const originalModel = monaco.editor.createModel(originalContent, undefined, options.original);
    const modifiedModel = monaco.editor.createModel(modifiedContent, undefined, options.modified);

    const diffEditor = monaco.editor.createDiffEditor(document.getElementById('diff-container'), {
      originalEditable: !options.readOnly,
      renderSideBySide: options.renderSideBySide ?? true,
      diffAlgorithm: options.diffAlgorithm ?? 'myers',
      enableMoveDetection: options.enableMoveDetection ?? true,
      enableSplitViewResizing: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
    });

    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel,
    });

    // Decorations
    this.addDiffDecorations(diffEditor);

    return diffEditor;
  }

  private addDiffDecorations(diffEditor: IDiffEditor): void {
    const changes = diffEditor.getLineChanges();
    if (!changes) return;

    for (const change of changes) {
      const decoration: IModelDeltaDecoration = {
        range: new monaco.Range(change.modifiedStartLineNumber, 1, change.modifiedEndLineNumber, 1),
        options: {
          isWholeLine: true,
          linesDecorationsClassName: change.modifiedEndLineNumber === 0
            ? 'deletion-line'
            : change.originalEndLineNumber === 0
              ? 'addition-line'
              : 'modified-line',
        },
      };
    }
  }
}

// 3-way merge editor
interface MergeEditorInput {
  ancestor: Uri;
  input1: Uri;
  input2: Uri;
  output: Uri;
}

class MergeEditor {
  async openMerge(input: MergeEditorInput): Promise<void> {
    const ancestor = await fs.promises.readFile(input.ancestor.fsPath, 'utf-8');
    const left = await fs.promises.readFile(input.input1.fsPath, 'utf-8');
    const right = await fs.promises.readFile(input.input2.fsPath, 'utf-8');

    // Usar merge algorith (recursive ou octopus)
    const mergeResult = this.threeWayMerge(ancestor, left, right);
    await fs.promises.writeFile(input.output.fsPath, mergeResult.result, 'utf-8');

    // Abrir editor mostrando conflitos
    if (mergeResult.conflicts.length > 0) {
      this.showConflictEditor(input, mergeResult.conflicts);
    } else {
      this.showSuccessNotification(input);
    }
  }

  private threeWayMerge(ancestor: string, left: string, right: string): MergeResult {
    // Implementacao basica de 3-way merge
    // Em producao, usar merge-base do git e diff3
    const leftLines = left.split('\n');
    const rightLines = right.split('\n');
    const ancestorLines = ancestor.split('\n');

    const conflicts: MergeConflict[] = [];
    const result: string[] = [];

    // diff entre ancestor e left, depois ancestor e right
    // encontrar overlaping changes -> conflitos
    // simplificado para ilustracao

    return { result: result.join('\n'), conflicts };
  }
}
```

### 3.5 Timeline View

```
┌──────────────────────────────────────────────────────────────┐
│                    Timeline / File History                     │
│                                                               │
│  ┌──────────────────────────────────────────────┐             │
│  │  File: src/services/search-service.ts         │             │
│  │                                               │             │
│  │  ── 3 days ago ──                              │             │
│  │  a1b2c3d [main] feat: add search cache       │             │
│  │  │  ┌────────────────────────────────────┐   │             │
│  │  │  │ + class SearchCache               │   │             │
│  │  │  │ + LRUCache initialization          │   │             │
│  │  │  │ + getOrSearch with index fallback   │   │             │
│  │  └────────────────────────────────────┘   │             │
│  │                                               │             │
│  │  ── 5 days ago ──                              │             │
│  │  f9e8d7c [main] refactor: extract SearchEngine│             │
│  │  │  ┌────────────────────────────────────┐   │             │
│  │  │  │ ~ BinaryRipgrepEngine extracted    │   │             │
│  │  │  │ ~ SearchQuery interface            │   │             │
│  │  └────────────────────────────────────┘   │             │
│  │                                               │             │
│  │  [Show All Commits]  [Compare with Branch]   │             │
│  └──────────────────────────────────────────────┘             │
│                                                               │
│  Funcionalidades:                                              │
│  - File history (git log for file)                            │
│  - Git log completo                                           │
│  - Blame visualization (gutter annotations)                    │
│  - Commit details (diff)                                      │
│  - Diff with previous version                                 │
│  - Open revision (abrir versao antiga)                        │
│  - Compare with branch                                        │
└──────────────────────────────────────────────────────────────┘
```

```typescript
class TimelineService {
  async getFileTimeline(file: Uri, options?: { limit?: number }): Promise<TimelineEntry[]> {
    const gitService = new GitService(path.dirname(file.fsPath));
    const commits = await gitService.log({ filepath: file.fsPath, depth: options?.limit ?? 30 });
    return commits.map(c => ({
      id: c.oid,
      timestamp: c.author.timestamp * 1000,
      label: c.message.split('\n')[0],
      description: c.message,
      author: c.author.name,
      commit: c.oid,
      relativeDate: this.relativeTime(c.author.timestamp),
      detail: async () => this.getCommitDetail(c.oid, file),
    }));
  }

  async getCommitDetail(oid: string, file: Uri): Promise<CommitDetail> {
    const gitService = new GitService(path.dirname(file.fsPath));
    const diff = await gitService.diff({ from: `${oid}^`, to: oid, filepath: file.fsPath });
    const commit = await gitService.log({ depth: 1, ref: oid });
    return {
      oid,
      message: commit[0].message,
      author: commit[0].author,
      diff,
      parent: commit[0].parent,
    };
  }

  async openRevision(file: Uri, oid: string): Promise<void> {
    const gitService = new GitService(path.dirname(file.fsPath));
    const content = await gitService.show(oid, file.fsPath);
    const uri = Uri.parse(`git-revision://${oid}/${file.path}`);
    // Abre em editor read-only
    workspace.openTextDocument({ content, language: this.detectLanguage(file) }).then(doc => {
      window.showTextDocument(doc, { preview: true });
    });
  }

  private relativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp * 1000;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return `${months} months ago`;
  }
}

interface TimelineEntry {
  id: string;
  timestamp: number;
  label: string;
  description?: string;
  author: string;
  commit: string;
  relativeDate: string;
  detail(): Promise<CommitDetail>;
}

interface CommitDetail {
  oid: string;
  message: string;
  author: { name: string; email: string; timestamp: number };
  diff: string;
  parent: string[];
}

class BlameAnnotations {
  private decorations: editor.IEditorDecorationsCollection[] = [];

  async showBlame(editor: editor.IStandaloneCodeEditor, file: Uri): Promise<void> {
    const gitService = new GitService(path.dirname(file.fsPath));
    const blame = await gitService.blame(file.fsPath);

    const decorations = blame.map((line, index) => ({
      range: new monaco.Range(index + 1, 1, index + 1, 1),
      options: {
        glyphMarginClassName: 'blame-info',
        glyphMarginHoverMessage: new monaco.MarkdownString({
          value: `${line.commit?.slice(0, 8)} | ${line.author ?? 'Unknown'} | ${line.timestamp ? new Date(line.timestamp * 1000).toLocaleDateString() : ''}`,
        }),
      },
    }));

    this.decorations.push(editor.createDecorationsCollection(decorations));
  }

  hideBlame(): void {
    this.decorations.forEach(d => d.clear());
    this.decorations = [];
  }
}
```

---

## 4. TASK RUNNER SYSTEM

### 4.1 Arquitetura

O Task Runner da IDEIA gerencia a execucao de scripts, builds, testes e ferramentas externas com saida integrada no terminal e parsing de problemas.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Task Service (Core)                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Task Execution Engine                   │   │
│  │                                                           │   │
│  │  Task → Terminal Integration → Process → Output →        │   │
│  │                                           → Problem       │   │
│  │                                             Matcher       │   │
│  │                                                           │   │
│  │  Ciclo de vida: Queued → Running → Succeeded/Failed/     │   │
│  │                 Cancelled/Background                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Providers   │  │ Definitions  │  │ Problem      │          │
│  │  Registry    │  │ Store        │  │ Matchers     │          │
│  │              │  │              │  │ Registry     │          │
│  │ - npm        │  │ - tasks.json │  │              │          │
│  │ - gulp       │  │ - auto-detect│  │ - typescript │          │
│  │ - TypeScript │  │              │  │ - eslint     │          │
│  │ - Custom     │  │              │  │ - custom     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                Terminal Integration                       │   │
│  │                                                           │   │
│  │  xterm.js Terminal ← IPC → Task Process                   │   │
│  │  - stdout/stderr streaming                               │   │
│  │  - exit code handling                                     │   │
│  │  - background watch mode detection                        │   │
│  │  - terminal reuse / dedicated terminals                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Task Definition

O schema de task.json segue o formato VS Code com extensoes para IA:

```typescript
interface TaskDefinition {
  // Identificacao
  type: string;                    // "npm", "shell", "typescript", "custom"
  label: string;                   // "Build Project"
  detail?: string;                 // Descricao curta

  // Comando
  command: string;                 // "npm run build"
  args?: string[];                 // ["--watch"]
  options?: TaskOptions;

  // Apresentacao
  group?: 'build' | 'test' | 'rebuild' | 'clean' | 'none';
  presentation?: TaskPresentationOptions;

  // Problemas
  problemMatcher?: string | string[] | ProblemMatcherConfig[];
  isBackground?: boolean;

  // Dependencias
  dependsOn?: string[];
  dependsOrder?: 'parallel' | 'sequence';

  // Comportamento
  runOptions?: RunOptions;
  icon?: { id: string; color?: string };
  promptOnClose?: boolean;

  // IDEIA-specific
  ai?: {
    description?: string;          // Descricao para agentes de IA
    category?: string;             // "build", "test", "deploy", "lint"
    required?: boolean;            // Task obrigatoria (ex: build antes de test)
    timeout?: number;              // Timeout em ms para execucao por IA
    environment?: Record<string, string>; // Variaveis de ambiente
  };
}

interface TaskOptions {
  cwd?: string;                    // Working directory
  env?: Record<string, string>;    // Environment variables
  shell?: ShellConfig;             // Shell to use

  // Comportamento
  reveal?: 'always' | 'silent' | 'never';  // Quando revelar terminal
  echo?: boolean;                  // Mostrar comando no terminal
  focus?: boolean;                 // Focar no terminal
  panel?: 'shared' | 'dedicated'; // Tipo de painel
  showReuseMessage?: boolean;      // Mostrar mensagem de reuso
  clear?: boolean;                 // Limpar terminal antes
}

interface TaskPresentationOptions {
  reveal?: 'always' | 'silent' | 'never';
  echo?: boolean;
  focus?: boolean;
  panel?: 'shared' | 'dedicated';
  showReuseMessage?: boolean;
  clear?: boolean;
  group?: string;
  close?: boolean;
}

interface RunOptions {
  reevaluateOnRerun?: boolean;
  runOn?: string;                  // "folderOpen", "default"
  instanceLimit?: number;          // Maximo de instancias simultaneas
}

interface ShellConfig {
  executable: string;              // "bash", "pwsh", "cmd"
  args?: string[];                 // ["--login"]
}

// Exemplo de tasks.json
const exampleTasksJson = {
  version: '2.0.0',
  tasks: [
    {
      type: 'npm',
      script: 'build',
      group: 'build',
      problemMatcher: ['$tsc'],
      label: 'npm: build',
      detail: 'tsc -b',
    },
    {
      type: 'shell',
      label: 'Lint All',
      command: 'npx eslint packages/ --ext .ts --max-warnings 0',
      group: 'build',
      presentation: { reveal: 'silent', echo: true },
      problemMatcher: ['$eslint-stylish'],
    },
    {
      type: 'shell',
      label: 'Watch Mode',
      command: 'npm run watch',
      isBackground: true,
      problemMatcher: [
        {
          pattern: [
            {
              regexp: '^(.+\\.ts)\\((\\d+),(\\d+)\\): (error|warning) (.+)$',
              file: 1,
              line: 2,
              column: 3,
              severity: 4,
              message: 5,
            },
          ],
          background: {
            activeOnStart: true,
            beginsPattern: '^Starting compilation',
            endsPattern: '^Compilation complete',
          },
        },
      ],
      presentation: { reveal: 'always', panel: 'dedicated', clear: true },
    },
    {
      type: 'shell',
      label: 'Test Unit',
      command: 'npm run test:unit',
      group: 'test',
      dependsOn: ['npm: build'],
      dependsOrder: 'sequence',
      problemMatcher: [],
    },
  ],
};
```

### 4.3 Task Providers API

```typescript
interface TaskProvider {
  provideTasks(token: CancellationToken): ProviderResult<Task[]>;
  resolveTask(task: Task, token: CancellationToken): ProviderResult<Task | undefined>;
}

interface Task {
  readonly definition: TaskDefinition;
  readonly scope: WorkspaceFolder | Uri | TaskScope;
  readonly name: string;
  readonly source: string;
  readonly execution?: ProcessExecution | ShellExecution | CustomExecution;
  readonly isBackground?: boolean;
  readonly problemMatchers?: string[];
  readonly hasDefinedMatchers?: boolean;
  readonly runOptions?: RunOptions;
  readonly group?: TaskGroup;
}

class TaskGroup {
  static readonly Build = new TaskGroup('build');
  static readonly Test = new TaskGroup('test');
  static readonly Rebuild = new TaskGroup('rebuild');
  static readonly Clean = new TaskGroup('clean');
  static readonly None = new TaskGroup('none');

  private constructor(public readonly id: string) {}
  isDefault?: boolean;
}

class ProcessExecution {
  constructor(
    public readonly process: string,
    public readonly args: string[] = [],
    public readonly options?: TaskOptions,
  ) {}
}

class ShellExecution {
  constructor(
    public readonly commandLine: string,
    public readonly options?: TaskOptions,
  ) {}
}

class CustomExecution {
  constructor(
    public readonly callback: (terminal: TaskTerminal) => Promise<void>,
    public readonly options?: TaskOptions,
  ) {}
}

interface TaskTerminal {
  write(data: string): void;
  read(amount: number): Promise<string>;
  onDidWrite: Event<string>;
  onDidClose: Event<void>;
  exit(code: number): void;
}

// Task events
interface TaskEvents {
  onDidStartTask: Event<TaskStartEvent>;
  onDidEndTask: Event<TaskEndEvent>;
  onDidChangeTaskState: Event<TaskStateChangeEvent>;
  onDidExecuteTask: Event<TaskExecution>;
}

interface TaskStartEvent {
  execution: TaskExecution;
  terminal?: Terminal;
}

interface TaskEndEvent {
  execution: TaskExecution;
  exitCode: number | undefined;
}

interface TaskExecution {
  readonly task: Task;
  readonly terminal?: Terminal;
  readonly state: TaskState;

  terminate(): void;
  wait(): Promise<number>;
}

enum TaskState {
  Queued = 1,
  Running = 2,
  Succeeded = 3,
  Failed = 4,
  Cancelled = 5,
  Background = 6,
  BackgroundFailed = 7,
}

// Registro
interface TaskService {
  registerTaskProvider(type: string, provider: TaskProvider): Disposable;
  executeTask(task: Task): Promise<TaskExecution>;
  taskExecutions: TaskExecution[];
  onDidStartTask: Event<TaskStartEvent>;
  onDidEndTask: Event<TaskEndEvent>;
}
```

### 4.4 Problem Matchers

Problem matchers convertem saida de terminal para problemas no Problems panel.

```
┌──────────────────────────────────────────────────────────────┐
│                    Problem Matcher Pipeline                    │
│                                                               │
│  Terminal Output → Line Splitter → Matcher Engine →          │
│                                                               │
│  Matcher Engine:                                               │
│  ┌────────────────────────────────────────────────┐           │
│  │  Para cada linha do terminal:                   │           │
│  │                                                  │           │
│  │  Line ─→ Match regexp(es) ─→ Extract groups ─→ │           │
│  │          │                    │                  │           │
│  │          ▼                    ▼                  │           │
│  │    Pula linha          Problem (file, line,     │           │
│  │    se nao match         column, severity, msg)  │           │
│  │                                                  │           │
│  │  Para matchers multi-line:                       │           │
│  │  - Acumula linhas ate pattern de fechamento     │           │
│  │  - Ex: ESLint pode emitir warning em 2+ linhas  │           │
│  └────────────────────────────────────────────────┘           │
│                                                               │
│  Result → Problems Panel                                      │
│  ┌────────────────────────────────────────────────┐           │
│  │  Problems (42)                                  │           │
│  │                                                  │           │
│  │  Errors (12)                                     │           │
│  │  ├─ src/search.ts:5:3 - error TS2322 ...        │           │
│  │  ├─ src/scm.ts:12:1 - error TS2345 ...          │           │
│  │  └─ src/task.ts:8:2 - error TS2554 ...          │           │
│  │                                                  │           │
│  │  Warnings (30)                                   │           │
│  │  ├─ src/search.ts:3:1 - warning unused var     │           │
│  │  └─ ...                                         │           │
│  └────────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────┘
```

```typescript
interface ProblemMatcher {
  owner: string;                    // "typescript", "eslint"
  source?: string;                  // "ts", "eslint"
  severity?: ProblemSeverity;
  applyTo?: 'allDocuments' | 'openDocuments' | 'closedDocuments';
  pattern: ProblemPattern | ProblemPattern[];
  background?: BackgroundMatcher;
  fileLocation?: 'absolute' | 'relative' | ['autoDetect', string];
}

interface ProblemPattern {
  regexp: string;
  kind?: 'file' | 'location';
  file?: number;                    // Group index
  message?: number;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  severity?: number;
  code?: number;
  loop?: boolean;
}

interface BackgroundMatcher {
  activeOnStart: boolean;
  beginsPattern: string;
  endsPattern: string;
}

enum ProblemSeverity {
  Error = 0,
  Warning = 1,
  Info = 2,
  Hint = 3,
}

interface Problem {
  readonly file: Uri;
  readonly line: number;
  readonly column: number;
  readonly endLine?: number;
  readonly endColumn?: number;
  readonly severity: ProblemSeverity;
  readonly message: string;
  readonly code?: string;
  readonly source?: string;
  readonly owner: string;
}

// Problem matchers built-in
const BUILTIN_MATCHERS: Record<string, ProblemMatcher> = {
  '$tsc': {
    owner: 'typescript',
    source: 'ts',
    pattern: {
      regexp: '^(.+)\\((\\d+),(\\d+)\\):\\s+(error|warning)\\s+(TS\\d+):\\s+(.+)$',
      file: 1,
      line: 2,
      column: 3,
      severity: 4,
      code: 5,
      message: 6,
    },
  },
  '$tsc-watch': {
    owner: 'typescript',
    source: 'ts',
    pattern: [
      {
        regexp: '^(.+)\\((\\d+),(\\d+)\\):\\s+(error|warning)\\s+(TS\\d+):\\s+(.+)$',
        file: 1,
        line: 2,
        column: 3,
        severity: 4,
        code: 5,
        message: 6,
      },
    ],
    background: {
      activeOnStart: true,
      beginsPattern: '^\\s*$',
      endsPattern: '^\\s*$',
    },
  },
  '$eslint-compact': {
    owner: 'eslint',
    source: 'eslint',
    pattern: {
      regexp: '^(.+):\\s+line\\s+(\\d+),\\s+col\\s+(\\d+),\\s+(Error|Warning)\\s+-\\s+(.+)\\s+\\((.+)\\)$',
      file: 1,
      line: 2,
      column: 3,
      severity: 4,
      message: 5,
      code: 6,
    },
  },
  '$eslint-stylish': {
    owner: 'eslint',
    source: 'eslint',
    pattern: [
      {
        regexp: '^\\s+(\\d+):(\\d+)\\s+(error|warning)\\s+(.+?)\\s{2,}(.+)$',
        line: 1,
        column: 2,
        severity: 3,
        message: 4,
        code: 5,
        loop: true,
      },
    ],
    fileLocation: ['autoDetect', '${workspaceFolder}'],
  },
};

class ProblemMatcherRegistry {
  private matchers = new Map<string, ProblemMatcher>(Object.entries(BUILTIN_MATCHERS));

  register(name: string, matcher: ProblemMatcher): Disposable {
    this.matchers.set(name, matcher);
    return { dispose: () => this.matchers.delete(name) };
  }

  get(name: string): ProblemMatcher | undefined {
    return this.matchers.get(name);
  }

  getMatchersForTask(task: Task): ProblemMatcher[] {
    const names = task.problemMatchers ?? [];
    const matchers: ProblemMatcher[] = [];
    for (const name of names) {
      const existing = this.matchers.get(name);
      if (existing) {
        matchers.push(existing);
      } else {
        console.warn(`ProblemMatcher "${name}" not found for task ${task.name}`);
      }
    }
    return matchers;
  }
}

class ProblemCollector {
  private problems: Problem[] = [];
  private accumulatedLines: string[] = [];
  private multiLineMode = false;

  processLines(lines: string[], matchers: ProblemMatcher[]): Problem[] {
    const newProblems: Problem[] = [];

    for (const line of lines) {
      for (const matcher of matchers) {
        const patterns = Array.isArray(matcher.pattern) ? matcher.pattern : [matcher.pattern];

        for (let i = 0; i < patterns.length; i++) {
          const pattern = patterns[i];
          const regex = new RegExp(pattern.regexp);
          const match = line.match(regex);

          if (match) {
            if (pattern.loop) {
              // Multi-line matcher: acumula ate loop terminar
              this.accumulatedLines.push(line);
            } else {
              const problem = this.extractProblem(match, pattern, matcher);
              if (problem) newProblems.push(problem);
            }
          }
        }
      }
    }

    // Process accumulated multi-line matches
    // ...

    this.problems.push(...newProblems);
    return newProblems;
  }

  private extractProblem(match: RegExpMatchArray, pattern: ProblemPattern, matcher: ProblemMatcher): Problem | null {
    const getGroup = (idx: number | undefined): string | undefined => {
      if (idx === undefined) return undefined;
      return match[idx];
    };

    const file = getGroup(pattern.file);
    if (!file) return null;

    return {
      file: Uri.file(file),
      line: parseInt(getGroup(pattern.line) ?? '0', 10),
      column: parseInt(getGroup(pattern.column) ?? '0', 10),
      endLine: pattern.endLine ? parseInt(getGroup(pattern.endLine) ?? '0', 10) : undefined,
      endColumn: pattern.endColumn ? parseInt(getGroup(pattern.endColumn) ?? '0', 10) : undefined,
      severity: this.parseSeverity(getGroup(pattern.severity)),
      message: getGroup(pattern.message) ?? 'Unknown error',
      code: getGroup(pattern.code),
      source: matcher.source,
      owner: matcher.owner,
    };
  }

  private parseSeverity(severity?: string): ProblemSeverity {
    switch (severity?.toLowerCase()) {
      case 'error': return ProblemSeverity.Error;
      case 'warning': case 'warn': return ProblemSeverity.Warning;
      case 'info': return ProblemSeverity.Info;
      default: return ProblemSeverity.Error;
    }
  }

  getProblems(): Problem[] {
    return [...this.problems];
  }

  clear(): void {
    this.problems = [];
    this.accumulatedLines = [];
  }
}
```

### 4.5 Build & Test Tasks

**Auto-detection de tasks:**

```typescript
class TaskAutoDetector {
  async detectTasks(workspace: WorkspaceFolder): Promise<Task[]> {
    const tasks: Task[] = [];

    // npm
    if (await this.hasFile(workspace, 'package.json')) {
      tasks.push(...await this.detectNpmScripts(workspace));
    }

    // TypeScript
    if (await this.hasFile(workspace, 'tsconfig.json')) {
      tasks.push(this.createTscTask(workspace));
    }

    // Gulp
    if (await this.hasFile(workspace, 'gulpfile.js') || await this.hasFile(workspace, 'gulpfile.ts')) {
      tasks.push(...await this.detectGulpTasks(workspace));
    }

    // Grunt
    if (await this.hasFile(workspace, 'Gruntfile.js')) {
      tasks.push(...await this.detectGruntTasks(workspace));
    }

    // Maven
    if (await this.hasFile(workspace, 'pom.xml')) {
      tasks.push(...await this.detectMavenGoals(workspace));
    }

    // .NET
    if (await this.hasFile(workspace, '*.csproj', true)) {
      tasks.push(...await this.detectDotnetCommands(workspace));
    }

    return tasks;
  }

  private async detectNpmScripts(workspace: WorkspaceFolder): Promise<Task[]> {
    const packageJson = JSON.parse(await fs.promises.readFile(path.join(workspace.uri.fsPath, 'package.json'), 'utf-8'));
    const scripts = packageJson.scripts ?? {};
    const tasks: Task[] = [];

    for (const [name, script] of Object.entries(scripts)) {
      const task: Task = {
        definition: { type: 'npm', script: name, label: `npm: ${name}` },
        name: `npm: ${name}`,
        source: 'npm',
        scope: workspace,
        execution: new ShellExecution(`npm run ${name}`, { cwd: workspace.uri.fsPath }),
        group: this.inferGroup(name),
        problemMatchers: this.inferMatchers(name),
      };
      tasks.push(task);
    }
    return tasks;
  }

  private inferGroup(scriptName: string): TaskGroup | undefined {
    if (/^(build|compile|bundle)/i.test(scriptName)) return TaskGroup.Build;
    if (/^(test|spec|e2e)/i.test(scriptName)) return TaskGroup.Test;
    if (/^clean/i.test(scriptName)) return TaskGroup.Clean;
    if (/^rebuild/i.test(scriptName)) return TaskGroup.Rebuild;
    return undefined;
  }

  private inferMatchers(scriptName: string): string[] {
    if (/tsc|typescript|compile/.test(scriptName)) return ['$tsc'];
    if (/lint|eslint/.test(scriptName)) return ['$eslint-stylish'];
    return [];
  }

  private createTscTask(workspace: WorkspaceFolder): Task {
    return {
      definition: { type: 'typescript', label: 'tsc: build - tsconfig.json' },
      name: 'tsc: build',
      source: 'TypeScript',
      scope: workspace,
      execution: new ShellExecution('npx tsc -b', { cwd: workspace.uri.fsPath }),
      group: TaskGroup.Build,
      problemMatchers: ['$tsc'],
    };
  }

  private async hasFile(workspace: WorkspaceFolder, pattern: string, isGlob = false): Promise<boolean> {
    if (isGlob) {
      const files = await globby(pattern, { cwd: workspace.uri.fsPath });
      return files.length > 0;
    }
    return fs.existsSync(path.join(workspace.uri.fsPath, pattern));
  }
}
```

**Task shortcuts:**

```typescript
class TaskShortcuts {
  static readonly BUILD_KEYBINDING = 'Ctrl+Shift+B';
  static readonly TEST_KEYBINDING = 'Ctrl+Shift+T';
  static readonly RUN_TASK_KEYBINDING = 'Ctrl+Shift+R';

  registerShortcuts(disposables: Disposable[]): void {
    // Ctrl+Shift+B: Run build task
    commands.registerCommand('workbench.action.tasks.build', async () => {
      const tasks = await this.getBuildTasks();
      if (tasks.length === 0) {
        window.showInformationMessage('No build tasks configured');
        return;
      }
      if (tasks.length === 1) {
        return tasks.executeTask(tasks[0]);
      }
      // Pick which build task
      const picked = await window.showQuickPick(
        tasks.map(t => ({ label: t.name, task: t })),
        { placeHolder: 'Select build task' }
      );
      if (picked) await tasks.executeTask(picked.task);
    });

    // Ctrl+Shift+T: Run test task
    commands.registerCommand('workbench.action.tasks.test', async () => {
      const tasks = await this.getTestTasks();
      if (tasks.length === 0) {
        window.showInformationMessage('No test tasks configured');
        return;
      }
      if (tasks.length === 1) {
        return tasks.executeTask(tasks[0]);
      }
      const picked = await window.showQuickPick(
        tasks.map(t => ({ label: t.name, task: t })),
        { placeHolder: 'Select test task' }
      );
      if (picked) await tasks.executeTask(picked.task);
    });

    // Ctrl+Shift+R: Run any task
    commands.registerCommand('workbench.action.tasks.runTask', async () => {
      const allTasks = await this.getAllTasks();
      const picked = await window.showQuickPick(
        allTasks.map(t => ({ label: t.name, detail: t.source, task: t })),
        { placeHolder: 'Select task to run' }
      );
      if (picked) await tasks.executeTask(picked.task);
    });
  }
}
```

### 4.6 Task Execution & Output

```typescript
class TaskExecutionEngine {
  private activeExecutions: Map<string, TaskExecutionImpl> = new Map();
  private terminals: Map<string, Terminal> = new Map();
  private problemCollector: ProblemCollector;

  async executeTask(task: Task): Promise<TaskExecution> {
    if (this.activeExecutions.has(task.definition.label)) {
      const existing = this.activeExecutions.get(task.definition.label)!;
      if (existing.task.runOptions?.instanceLimit === 1) {
        throw new Error(`Task "${task.definition.label}" is already running`);
      }
    }

    // Create terminal
    const terminalOptions: TerminalOptions = {
      name: task.name,
      cwd: task.execution?.options?.cwd,
      env: task.execution?.options?.env,
      shellPath: task.execution?.options?.shell?.executable,
      shellArgs: task.execution?.options?.shell?.args,
      isTransient: true,
    };

    const terminal = window.createTerminal(terminalOptions);
    const execution = new TaskExecutionImpl(task, terminal);
    this.activeExecutions.set(task.definition.label, execution);

    // Setup problem matchers
    const matchers = this.matcherRegistry.getMatchersForTask(task);

    // Start execution
    this.fireStartEvent(execution);
    terminal.show(task.presentation?.focus);

    try {
      const command = this.buildCommand(task);

      if (task.isBackground) {
        this.handleBackgroundTask(execution, terminal, command, matchers);
      } else {
        await this.handleForegroundTask(execution, terminal, command, matchers);
      }
    } catch (err) {
      execution.exitCode = 1;
      execution.state = TaskState.Failed;
    }

    this.activeExecutions.delete(task.definition.label);
    this.fireEndEvent(execution);
    return execution;
  }

  private async handleForegroundTask(
    execution: TaskExecutionImpl,
    terminal: Terminal,
    command: string,
    matchers: ProblemMatcher[]
  ): Promise<void> {
    // Write command to terminal
    if (execution.task.presentation?.echo !== false) {
      terminal.sendText(`$ ${command}\r`, false);
    }

    terminal.sendText(command, true);

    return new Promise((resolve) => {
      const disposable = window.onDidCloseTerminal(async (closedTerm) => {
        if (closedTerm.name !== terminal.name) return;
        disposable.dispose();

        const exitCode = this.getExitCode(terminal);
        execution.exitCode = exitCode;
        execution.state = exitCode === 0 ? TaskState.Succeeded : TaskState.Failed;
        resolve();
      });
    });
  }

  private handleBackgroundTask(
    execution: TaskExecutionImpl,
    terminal: Terminal,
    command: string,
    matchers: ProblemMatcher[]
  ): void {
    execution.state = TaskState.Background;
    terminal.sendText(command, true);

    // Monitor for background patterns
    if (matchers.length > 0) {
      for (const matcher of matchers) {
        if (matcher.background) {
          this.monitorBackground(execution, terminal, matcher);
        }
      }
    }

    // Watch mode detection
    this.detectWatchMode(execution, terminal);
  }

  private async monitorBackground(
    execution: TaskExecutionImpl,
    terminal: Terminal,
    matcher: ProblemMatcher
  ): Promise<void> {
    const bg = matcher.background!;
    let started = bg.activeOnStart;
    let buffer = '';

    terminal.onDidWriteData((data) => {
      buffer += data;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!started && new RegExp(bg.beginsPattern).test(line)) {
          started = true;
        }
        if (started && new RegExp(bg.endsPattern).test(line)) {
          started = false;
          execution.state = TaskState.Succeeded;
        }
        if (started) {
          const problems = this.problemCollector.processLines([line], [matcher]);
          if (problems.length > 0) {
            this.problemsPanel.addProblems(problems);
          }
        }
      }
    });
  }

  private detectWatchMode(execution: TaskExecutionImpl, terminal: Terminal): void {
    let watchDetected = false;
    const watchPatterns = [
      /watching/i,
      /waiting for changes/i,
      /compilation complete.*watching/i,
      /webpack.*\d+\/\d+.*modules/i,
    ];

    terminal.onDidWriteData((data) => {
      if (watchDetected) return;
      for (const pattern of watchPatterns) {
        if (pattern.test(data)) {
          watchDetected = true;
          execution.state = TaskState.Background;
          execution.isWatchMode = true;
          break;
        }
      }
    });
  }

  private buildCommand(task: Task): string {
    if (task.execution instanceof ShellExecution) {
      return task.execution.commandLine;
    }
    if (task.execution instanceof ProcessExecution) {
      const args = (task.execution.args ?? []).map(a => a.includes(' ') ? `"${a}"` : a).join(' ');
      return `${task.execution.process} ${args}`.trim();
    }
    if (task.execution instanceof CustomExecution) {
      return '[custom execution]';
    }
    return '';
  }

  private getExitCode(terminal: Terminal): number | undefined {
    // Em ambiente real, o exit code e capturado via node-pty onExit
    return undefined;
  }
}

class TaskExecutionImpl implements TaskExecution {
  readonly task: Task;
  readonly terminal: Terminal;
  exitCode?: number;
  state: TaskState = TaskState.Queued;
  isWatchMode = false;

  terminate(): void {
    this.terminal.dispose();
    this.state = TaskState.Cancelled;
  }

  async wait(): Promise<number> {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (this.state === TaskState.Succeeded || this.state === TaskState.Failed) {
          clearInterval(check);
          resolve(this.exitCode ?? 0);
        }
      }, 100);
    });
  }
}
```

---

## 5. Code Examples

### 5.1 SearchService with ripgrep (full implementation)

```typescript
import { ChildProcess, spawn } from 'child_process';
import readline from 'readline';
import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';

interface SearchConfig {
  ripgrepPath?: string;
  maxResults?: number;
  timeout?: number;
  excludePatterns?: string[];
  maxFileSize?: number;
  parallelWorkers?: number;
}

class SearchService {
  private rgPath: string;
  private config: Required<SearchConfig>;
  private cache: LRUCache<string, SearchResult>;
  private sessions: Map<string, AbortController> = new Map();
  private providers: Map<string, SearchProvider> = new Map();
  private onProgress = new EventEmitter();

  constructor(config: SearchConfig = {}) {
    this.config = {
      ripgrepPath: this.resolveRipgrep(),
      maxResults: config.maxResults ?? 10000,
      timeout: config.timeout ?? 30000,
      excludePatterns: config.excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS,
      maxFileSize: config.maxFileSize ?? 10_000_000,
      parallelWorkers: config.parallelWorkers ?? 4,
    };
    this.cache = new LRUCache({ max: 200, ttl: 60_000 });
  }

  registerProvider(id: string, provider: SearchProvider): void {
    this.providers.set(id, provider);
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const cacheKey = this.hashQuery(query);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const sessionId = crypto.randomUUID();
    const abortController = new AbortController();
    this.sessions.set(sessionId, abortController);

    const timeout = setTimeout(() => abortController.abort(), this.config.timeout);

    try {
      const result = await this.executeSearch(query, sessionId);
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      clearTimeout(timeout);
      this.sessions.delete(sessionId);
    }
  }

  cancelSession(sessionId: string): void {
    this.sessions.get(sessionId)?.abort();
  }

  private async executeSearch(query: SearchQuery, sessionId: string): Promise<SearchResult> {
    const token = this.sessions.get(sessionId)?.signal;
    const startTime = Date.now();

    // 1. File search (fuzzy filename)
    const fileSearch = this.searchFiles(query);

    // 2. Text search via ripgrep
    const textSearch = this.searchText(query, token);

    // 3. Symbol search via LSP
    const symbolSearch = this.searchSymbols(query);

    const [fileResults, textResults, symbolResults] = await Promise.allSettled([
      fileSearch, textSearch, symbolSearch,
    ]);

    const allMatches = [
      ...(fileResults.status === 'fulfilled' ? fileResults.value.matches : []),
      ...(textResults.status === 'fulfilled' ? textResults.value.matches : []),
      ...(symbolResults.status === 'fulfilled' ? symbolResults.value.matches : []),
    ];

    const ranked = this.rankResults(allMatches, query);
    const duration = Date.now() - startTime;

    return {
      query,
      matches: ranked.slice(0, this.config.maxResults),
      totalMatchCount: ranked.length,
      truncated: ranked.length > this.config.maxResults,
      duration,
    };
  }

  private async searchFiles(query: SearchQuery): Promise<SearchResult> {
    const provider = this.providers.get('file');
    if (!provider) return { query, matches: [], totalMatchCount: 0, truncated: false, duration: 0 };
    return provider.provideSearchResults(query, {
      maxResults: this.config.maxResults,
      onProgress: () => {},
      signal: new AbortController().signal,
    });
  }

  private async searchText(query: SearchQuery, signal?: AbortSignal): Promise<SearchResult> {
    const args = this.buildRipgrepArgs(query);
    const child = spawn(this.config.ripgrepPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: this.config.timeout,
    });

    if (signal) {
      signal.addEventListener('abort', () => child.kill());
    }

    const { stdout, stderr } = child;
    const rl = readline.createInterface({ input: stdout });
    const fileMap = new Map<string, FileMatch>();

    for await (const line of rl) {
      const parsed = this.parseRipgrepLine(line, query);
      if (!parsed) continue;

      const { file, lineMatch } = parsed;
      const existing = fileMap.get(file);
      if (existing) {
        existing.matches.push(lineMatch);
      } else {
        fileMap.set(file, {
          resource: Uri.file(file),
          matches: [lineMatch],
          preview: file,
        });
      }

      if (fileMap.size >= this.config.maxResults) {
        child.kill();
        break;
      }
    }

    const stderrOutput = (await this.streamToString(stderr)).trim();
    const truncated = fileMap.size >= this.config.maxResults;

    return {
      query,
      matches: Array.from(fileMap.values()),
      totalMatchCount: fileMap.size,
      truncated,
      duration: 0,
    };
  }

  private buildRipgrepArgs(query: SearchQuery): string[] {
    return [
      '--json',
      '--max-count', '500',
      '--no-heading',
      '--line-number',
      '--color', 'never',
      ...(query.isCaseSensitive ? [] : ['--ignore-case']),
      ...(query.isWordMatch ? ['--word-regexp'] : []),
      ...(query.isRegex ? [] : ['--fixed-strings']),
      ...(query.isMultiline ? ['--multiline'] : []),
      ...(query.contextLines ? ['--context', String(query.contextLines)] : []),
      ...this.config.excludePatterns.flatMap(p => ['--glob', `!${p}`]),
      ...(query.includePattern ?? []).flatMap(p => ['--glob', p]),
      '--max-filesize', String(this.config.maxFileSize),
      query.pattern,
      '.',
    ];
  }

  private parseRipgrepLine(line: string, query: SearchQuery): { file: string; lineMatch: LineMatch } | null {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type !== 'match') return null;

      const data = parsed.data;
      const path = data.path?.text;
      if (!path) return null;

      return {
        file: path,
        lineMatch: {
          lineNumber: data.line_number,
          lineContent: data.lines?.text?.replace(/\n$/, '') ?? '',
          offset: data.submatches?.[0]?.start ?? 0,
          length: data.submatches?.[0]?.end ?? 0,
          beforeContext: [],
          afterContext: [],
        },
      };
    } catch {
      return null;
    }
  }

  private async searchSymbols(query: QueryPattern): Promise<SearchResult> {
    // TODO: integrate with LSP document symbol provider
    return { query, matches: [], totalMatchCount: 0, truncated: false, duration: 0 };
  }

  private rankResults(matches: FileMatch[], query: SearchQuery): FileMatch[] {
    // Heuristic ranking: exact filename match > path match > content match
    return matches.sort((a, b) => {
      const aScore = this.fileScore(a, query);
      const bScore = this.fileScore(b, query);
      return bScore - aScore;
    });
  }

  private fileScore(match: FileMatch, query: SearchQuery): number {
    const basename = path.basename(match.resource.fsPath);
    let score = 0;
    if (basename === query.pattern) score += 100;
    else if (basename.includes(query.pattern)) score += 50;
    if (match.matches.length > 0) score += 10;
    return score;
  }

  private resolveRipgrep(): string {
    const candidates = [
      path.join(__dirname, '..', 'bin', `rg-${process.platform}`),
      'rg',
    ];
    for (const c of candidates) {
      try {
        const result = require('child_process').execFileSync(c, ['--version'], { stdio: 'pipe' });
        return c;
      } catch { continue; }
    }
    throw new Error('ripgrep not found');
  }

  private hashQuery(query: SearchQuery): string {
    return `${query.pattern}|${query.isRegex}|${query.isCaseSensitive}|${query.isWordMatch}|${query.includePattern?.join(',')}`;
  }

  private streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
  }

  onDidProgress(callback: (progress: SearchProgress) => void): Disposable {
    this.onProgress.on('progress', callback);
    return { dispose: () => this.onProgress.off('progress', callback) };
  }
}
```

### 5.2 SCM Provider Registration

```typescript
import { EventEmitter } from 'events';
import git from 'isomorphic-git';
import fs from 'fs';
import path from 'path';

class SCMService {
  private providers: Map<string, SourceControl> = new Map();
  private repositories: Map<string, Repository> = new Map();
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private onDidChange = new EventEmitter();

  async initialize(workspaceRoot: Uri): Promise<void> {
    // Auto-detect git repositories
    const gitDirs = await this.findGitRepositories(workspaceRoot.fsPath);

    for (const gitDir of gitDirs) {
      const repo = new GitRepository(gitDir);
      await repo.initialize();
      this.repositories.set(gitDir, repo);

      const scm = new GitSourceControl(Uri.file(gitDir));
      this.providers.set(`git:${gitDir}`, scm);

      // Watch for file changes
      const watcher = fs.watch(gitDir, { recursive: true }, async (event, filename) => {
        if (filename && !filename.startsWith('.git/')) {
          await repo.refreshStatus();
          this.onDidChange.emit('statusChanged', { repository: gitDir, file: filename });
        }
      });
      this.watchers.set(gitDir, watcher);
    }
  }

  getProvider(id: string): SourceControl | undefined {
    return this.providers.get(id);
  }

  getProviders(): SourceControl[] {
    return Array.from(this.providers.values());
  }

  getRepository(uri: Uri): Repository | undefined {
    const dir = uri.fsPath;
    for (const [root, repo] of this.repositories) {
      if (dir.startsWith(root)) return repo;
    }
    return undefined;
  }

  private async findGitRepositories(root: string): Promise<string[]> {
    const repos: string[] = [];
    if (fs.existsSync(path.join(root, '.git'))) {
      repos.push(root);
    }
    // Optionally search subdirectories (monorepo support)
    // ...
    return repos;
  }

  dispose(): void {
    for (const watcher of this.watchers.values()) watcher.close();
  }
}

// Usage in Theia plugin
class ScmContribution {
  constructor(
    @inject(SCMService) private scmService: SCMService,
  ) {}

  onStart(): void {
    this.scmService.onDidChange.on('statusChanged', (event) => {
      console.log(`[SCM] ${event.file} changed in ${event.repository}`);
    });
  }
}
```

### 5.3 TaskProvider for npm scripts

```typescript
class NpmTaskProvider implements TaskProvider {
  async provideTasks(token: CancellationToken): Promise<Task[]> {
    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders) return [];

    const tasks: Task[] = [];
    for (const folder of workspaceFolders) {
      const packageJsonPath = path.join(folder.uri.fsPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) continue;

      try {
        const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf-8'));
        const scripts = packageJson.scripts ?? {};

        for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
          const task: Task = {
            definition: {
              type: 'npm',
              script: scriptName,
              label: `npm: ${scriptName}`,
              detail: String(scriptCommand),
            },
            scope: folder,
            name: `npm: ${scriptName}`,
            source: 'npm',
            execution: new ShellExecution(`npm run ${scriptName}`, {
              cwd: folder.uri.fsPath,
              shell: { executable: process.platform === 'win32' ? 'cmd' : 'bash' },
            }),
            group: this.inferGroup(scriptName),
            problemMatchers: this.inferMatchers(scriptName),
          };
          tasks.push(task);
        }
      } catch (err) {
        console.error(`Failed to parse package.json at ${packageJsonPath}`, err);
      }
    }
    return tasks;
  }

  async resolveTask(task: Task, token: CancellationToken): Promise<Task | undefined> {
    if (task.definition.type !== 'npm') return undefined;
    const script = task.definition.script;
    if (!script) return undefined;

    return {
      ...task,
      execution: new ShellExecution(`npm run ${script}`, {
        cwd: (task.scope as WorkspaceFolder).uri.fsPath,
      }),
    };
  }

  private inferGroup(name: string): TaskGroup | undefined {
    const lower = name.toLowerCase();
    if (lower === 'build' || lower.startsWith('build:')) return TaskGroup.Build;
    if (lower === 'test' || lower.startsWith('test:') || lower === 'spec') return TaskGroup.Test;
    if (lower === 'clean') return TaskGroup.Clean;
    return undefined;
  }

  private inferMatchers(name: string): string[] {
    const lower = name.toLowerCase();
    if (lower.includes('tsc') || lower.includes('typescript') || lower === 'compile') return ['$tsc'];
    if (lower.includes('eslint') || lower.includes('lint')) return ['$eslint-stylish'];
    if (lower.includes('jest') || lower.includes('mocha') || lower === 'test') return ['$jest'];
    return [];
  }
}

// Register in extension
class TaskExtension {
  activate(context: ExtensionContext): void {
    const provider = new NpmTaskProvider();
    context.subscriptions.push(
      tasks.registerTaskProvider('npm', provider)
    );
  }
}
```

### 5.4 Custom Task Execution Engine

```typescript
interface TaskExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

class CustomTaskRunner {
  async executeShell(command: string, options: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
  } = {}): Promise<TaskExecutionResult> {
    const start = Date.now();
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
    const shellFlag = process.platform === 'win32' ? '/c' : '-c';

    return new Promise((resolve, reject) => {
      const child = spawn(shell, [shellFlag, command], {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: options.timeout ?? 120000,
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({
          exitCode: exitCode ?? -1,
          stdout,
          stderr,
          duration: Date.now() - start,
        });
      });

      child.on('error', reject);
    });
  }

  async executeWithProblemMatching(
    command: string,
    matchers: ProblemMatcher[],
    options: { cwd?: string; env?: Record<string, string> } = {}
  ): Promise<{
    result: TaskExecutionResult;
    problems: Problem[];
  }> {
    const collector = new ProblemCollector();
    const start = Date.now();
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
    const shellFlag = process.platform === 'win32' ? '/c' : '-c';

    return new Promise((resolve, reject) => {
      const child = spawn(shell, [shellFlag, command], {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      const rl = readline.createInterface({ input: child.stdout! });
      rl.on('line', (line) => {
        stdout += line + '\n';
        const problems = collector.processLines([line], matchers);
        if (problems.length > 0) {
          // Emit problems in real-time
          this.emitProblems(problems);
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
        const lines = data.toString().split('\n').filter(Boolean);
        const problems = collector.processLines(lines, matchers);
        if (problems.length > 0) {
          this.emitProblems(problems);
        }
      });

      child.on('close', (exitCode) => {
        resolve({
          result: {
            exitCode: exitCode ?? -1,
            stdout,
            stderr,
            duration: Date.now() - start,
          },
          problems: collector.getProblems(),
        });
      });

      child.on('error', reject);
    });
  }

  private emitProblems(problems: Problem[]): void {
    commands.executeCommand('problems.setProblems', 'custom', problems);
  }
}
```

---

## 6. Conexoes

| Estudo | Conexao com Search/SCM/Task |
|--------|----------------------------|
| **S11 (Theia IDE Integration)** | Search, SCM e Task Runner como servicos Theia (widgets, comandos, preferences) |
| **S34 (Monaco Editor)** | Find widget, diff editor, decorations integrados via Monaco API |
| **S35 (FileSystem)** | FileSystem watchers para SCM auto-refresh; FileService para search index |
| **S21 (Terminal/Debug)** | Task terminal integration via xterm.js + node-pty; DAP para debug tasks |
| **S20 (Plugins/Ecosystem)** | SearchProvider, SourceControl e TaskProvider APIs como pontos de extensao |
| **S1 (Event Bus)** | Eventos de search completada, SCM status change, task start/end via NATS |
| **S3 (Intent to Plan)** | Agentes usam search (encontrar codigo), SCM (commits), tasks (build/test) |
| **S2 (Memory Systems)** | Search index em SQLite FTS5 (S2 memory layer); SCM history como contexto |
| **S4 (Security)** | Policy checks em replace-all operations; SCM commit signature verification |
| **S5 (Multi-agent)** | Agentes delegam search, checkout branch, run task como ferramentas |
| **S6 (Delivery)** | Tasks de build/test integradas ao pipeline de entrega (canary, quality gates) |
| **S22 (Collaboration)** | SCM status compartilhado em tempo real; search results broadcasting |

**Matriz de Integracao:**

```
SearchService ───── S11 (Theia Widget) ───── S34 (Monaco decorations)
     │
     ├──── S35 (FileSystem: watchers, index)
     ├──── S2  (Memory: FTS5 index)
     └──── S3  (Agent: search tool)
     
SCMService ──────── S11 (Theia SCM view) ─── S34 (Monaco diff editor)
     │
     ├──── S35 (FileSystem: status watchers)
     ├──── S21 (Terminal: git commands)
     ├──── S22 (Collaboration: shared status)
     └──── S4  (Security: commit signing)
     
TaskService ─────── S11 (Theia task panel) ── S21 (Terminal: execution)
     │
     ├──── S6  (Delivery: CI pipeline)
     ├──── S3  (Agent: build/test tools)
     ├──── S5  (Multi-agent: task orchestration)
     └──── S20 (Plugins: task providers)
```

---

## 7. Plano de Implementacao

### Fase 1 — Search Engine Core (5 dias)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|-------------|
| S37-T1 | SearchService + ripgrep integration | 1d | - |
| S37-T2 | Search query parser + pipeline | 0.5d | T1 |
| S37-T3 | Search result model + tree | 0.5d | T2 |
| S37-T4 | File search provider (globby) | 0.5d | T1 |
| S37-T5 | Text search provider (ripgrep) | 1d | T1 |
| S37-T6 | Symbol search provider (LSP) | 1d | T5 |
| S37-T7 | Search session management + cancel | 0.5d | T2 |

### Fase 2 — Search Experience (4 dias)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|-------------|
| S37-T8 | Search results UI (Theia widget) | 1d | F1 |
| S37-T9 | Result preview + highlighting | 0.5d | T8 |
| S37-T10 | Replace preview + execute | 1d | T9 |
| S37-T11 | Find in file (Monaco widget) | 1d | - |
| S37-T12 | Search caching + FTS5 index | 0.5d | T5 |

### Fase 3 — SCM Core (5 dias)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|-------------|
| S37-T13 | GitService with isomorphic-git | 1.5d | - |
| S37-T14 | SCMService + provider registry | 1d | T13 |
| S37-T15 | GitSourceControl implementation | 1d | T14 |
| S37-T16 | SCM input box (commit message) | 0.5d | T15 |
| S37-T17 | Status bar decorations | 0.5d | T15 |
| S37-T18 | File watcher integration | 0.5d | T14 |

### Fase 4 — SCM Experience (5 dias)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|-------------|
| S37-T19 | SCM view (Theia widget) | 1d | F3 |
| S37-T20 | Diff editor (side-by-side + inline) | 1d | - |
| S37-T21 | Staged/unstaged diff | 0.5d | T20 |
| S37-T22 | Merge editor (3-way) | 1.5d | T20 |
| S37-T23 | Timeline view (file history) | 1d | T13 |

### Fase 5 — Task Runner Core (5 dias)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|-------------|
| S37-T24 | TaskService + execution engine | 1d | - |
| S37-T25 | Task definition schema + validation | 0.5d | T24 |
| S37-T26 | Task provider registry | 0.5d | T24 |
| S37-T27 | ShellExecution + ProcessExecution | 1d | T24 |
| S37-T28 | NpmTaskProvider (auto-detect) | 1d | T26 |
| S37-T29 | Task shortcuts (Ctrl+Shift+B/T/R) | 0.5d | T27 |

### Fase 6 — Task Runner Experience (4 dias)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|-------------|
| S37-T30 | Task terminal integration | 1d | F5 |
| S37-T31 | Problem matcher registry | 0.5d | T30 |
| S37-T32 | TypeScript/ESLint matchers | 0.5d | T31 |
| S37-T33 | Problems panel (Theia widget) | 1d | T32 |
| S37-T34 | Background watch mode detection | 0.5d | T30 |
| S37-T35 | Custom task runner for agents | 0.5d | T30 |

### Resumo

| Fase | Descricao | Esforco | Assets |
|------|-----------|---------|--------|
| F1 | Search Engine Core | 5d | 7 tasks |
| F2 | Search Experience | 4d | 5 tasks |
| F3 | SCM Core | 5d | 6 tasks |
| F4 | SCM Experience | 5d | 5 tasks |
| F5 | Task Runner Core | 5d | 6 tasks |
| F6 | Task Runner Experience | 4d | 6 tasks |
| **Total** | | **28 dias** | **35 tasks** |

### Marcos

| Marco | Prazo | Criterio |
|-------|-------|----------|
| M1 | Dia 5 | Search funciona com ripgrep, resultados aparecem no widget |
| M2 | Dia 9 | Find in file + replace funcionais |
| M3 | Dia 14 | SCM mostra status, diff, commit, branch |
| M4 | Dia 19 | Merge editor + timeline funcionais |
| M5 | Dia 23 | Task runner executa npm scripts no terminal |
| M6 | Dia 28 | Problem matchers detectam erros de TS/ESLint no Problems panel |

---

> **Total estimado:** 28 dias, 35 tasks
> **Pacotes:** `@ideia/search`, `@ideia/scm`, `@ideia/task-runner`
> **Dependencias externas:** `isomorphic-git`, `ripgrep` (binary/wasm), `globby`, `lru-cache`
> **Riscos:** ripgrep WASM ainda experimental; isomorphic-git sem suporte a blame nativo (fallback CLI); merge editor requer implementacao diff3 propria
