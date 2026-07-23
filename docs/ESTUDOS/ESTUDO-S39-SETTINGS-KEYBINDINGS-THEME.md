# Estudo S39 — Settings, Keybindings & Theme System

> **Arquitetura dos tres pilares de personalizacao de IDE: gerenciamento de configuracoes, sistema de atalhos de teclado e engine de temas**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — Settings, Keybindings, Theme systems |

---

## Sumario

1. [Introducao](#1-introducao)

2. [SETTINGS SYSTEM](#2-settings-system)
   - 2.1 [Arquitetura](#21-arquitetura)
   - 2.2 [Settings Contribution](#22-settings-contribution)
   - 2.3 [Settings Editor](#23-settings-editor)
   - 2.4 [Resource Settings](#24-resource-settings)
   - 2.5 [Settings Management API](#25-settings-management-api)

3. [KEYBINDING SYSTEM](#3-keybinding-system)
   - 3.1 [Arquitetura](#31-arquitetura)
   - 3.2 [When Clause Context](#32-when-clause-context)
   - 3.3 [Keybinding Definitions](#33-keybinding-definitions)
   - 3.4 [Keybinding Resolution](#34-keybinding-resolution)
   - 3.5 [Keybinding Recording](#35-keybinding-recording)
   - 3.6 [Commands & Keyboard Shortcuts](#36-commands--keyboard-shortcuts)

4. [THEME SYSTEM](#4-theme-system)
   - 4.1 [Arquitetura](#41-arquitetura)
   - 4.2 [Color Theme Format](#42-color-theme-format)
   - 4.3 [Icon Theme Format](#43-icon-theme-format)
   - 4.4 [Product Icon Theme](#44-product-icon-theme)
   - 4.5 [Token Color Customization](#45-token-color-customization)
   - 4.6 [Theme Contribution](#46-theme-contribution)
   - 4.7 [Dynamic Theme Switching](#47-dynamic-theme-switching)
   - 4.8 [Color Registry](#48-color-registry)

5. [Code Examples](#5-code-examples)
   - 5.1 [SettingsService with Hierarchy Resolution](#51-settingsservice-with-hierarchy-resolution)
   - 5.2 [ConfigurationTarget and Scoped Update](#52-configurationtarget-and-scoped-update)
   - 5.3 [KeybindingService with Resolution Algorithm](#53-keybindingservice-with-resolution-algorithm)
   - 5.4 [When Clause Parser and Evaluation Engine](#54-when-clause-parser-and-evaluation-engine)
   - 5.5 [ThemeService with Dynamic Switching](#55-themeservice-with-dynamic-switching)
   - 5.6 [ColorTheme to CSS Variable Binding](#56-colortheme-to-css-variable-binding)

6. [Conexoes](#6-conexoes)

7. [Plano de Implementacao](#7-plano-de-implementacao)

---

## 1. Introducao

Tres pilares sustentam a personalizacao de uma IDE profissional: configuracoes (settings), atalhos de teclado (keybindings) e temas (themes). Cada pilar lida com um aspecto distinto da experiencia do usuario:

| Pilar | Responsabilidade | Entrada | Saida |
|-------|-----------------|---------|-------|
| **Settings** | Valores de configuracao do editor, linguagens, extensoes | JSON, UI forms, API programatica | Valores resolvidos por escopo com precedencia |
| **Keybindings** | Mapeamento de comandos a combinacoes de teclas | JSON, UI recording, extensoes | Comandos executados com resolucao por contexto |
| **Themes** | Cores, icones e estilos visuais do editor e UI | JSON, CSS, TextMate themes | Tema aplicado com suporte a troca dinamica |

Estes tres sistemas compartilham uma arquitetura em camadas com principios comuns:

```
+----------------------------------------------------------------------+
|                     USER INTERFACE LAYER                               |
|  +---------------+  +------------------+  +------------------------+ |
|  | Settings UI   |  | Keybindings UI   |  | Theme Picker           | |
|  | (categorizado,|  | (recording,      |  | (preview, apply,       | |
|  |  searchable)  |  |  conflict check) |  |  customize)            | |
|  +-------+-------+  +--------+---------+  +-----------+------------+ |
|          |                    |                        |              |
+----------+--------------------+------------------------+--------------+
           |                    |                        |
+----------+--------------------+------------------------+--------------+
|         API LAYER (programmatic access)                               |
|  +---------------+  +------------------+  +------------------------+ |
|  | workspace     |  | keybindings      |  | theme API              | |
|  | .getConfig()  |  | .registerKey()   |  | .getColorTheme()       | |
|  | inspect(key)  |  | .resolveKey()    |  | .onDidChangeTheme()    | |
|  +-------+-------+  +--------+---------+  +-----------+------------+ |
|          |                    |                        |              |
+----------+--------------------+------------------------+--------------+
           |                    |                        |
+----------+--------------------+------------------------+--------------+
|         RESOLUTION / STORAGE LAYER                                    |
|  +---------------+  +------------------+  +------------------------+ |
|  | Hierarchy     |  | When clause      |  | Color registry        | |
|  | (defaults,    |  | evaluation       |  | Token colors          | |
|  |  user, ws,    |  | Context keys     |  | CSS variables         | |
|  |  folder)      |  | Priority sort    |  | Theme inheritance     | |
|  +-------+-------+  +--------+---------+  +-----------+------------+ |
|          |                    |                        |              |
+----------+--------------------+------------------------+--------------+
           |                    |                        |
+----------+--------------------+------------------------+--------------+
|         PERSISTENCE LAYER                                             |
|  +---------------+  +------------------+  +------------------------+ |
|  | settings.json |  | keybindings.json |  | themes/*.json         | |
|  | SQLite fts5   |  | Cloud sync       |  | icon-themes/*.json    | |
|  | Schema reg.   |  | Dist defaults    |  | product-themes/*.json | |
|  +---------------+  +------------------+  +------------------------+ |
+----------------------------------------------------------------------+
```

Na arquitetura IDEIA, estes tres sistemas operam como servicos do nucleo da plataforma, acessiveis tanto pela interface Theia quanto via CLI para automacao com agentes de IA.

---

## 2. SETTINGS SYSTEM

### 2.1 Arquitetura

O sistema de configuracoes da IDEIA segue o modelo de hierarquia de escopos com resolucao por precedencia, similar ao VS Code mas com suporte adicional a SQLite como storage primario e sincronizacao em nuvem.

#### 2.1.1 Settings Hierarchy

A hierarquia de configuracoes determina qual valor prevalece quando multiplas fontes definem a mesma chave:

```
+----------------------------------------------------------------------+
|                      SETTINGS HIERARCHY                                |
|                                                                       |
|  ORDEM DE PRECEDENCIA (maior vence)                                   |
|  +------------------------------------------------------------------+ |
|  | 10. Temporary Overrides  (CLI flags, runtime API calls)          | |
|  |  9.  Language-specific    ([typescript], [python])               | |
|  |  8.  Folder-level         (.vscode/settings.json)                | |
|  |  7.  Workspace-level      (workspace settings)                   | |
|  |  6.  Remote-specific      (SSH/container settings)               | |
|  |  5.  User-level           (User settings.json)                   | |
|  |  4.  Machine-level        (--no-sync, local overrides)            | |
|  |  3.  Application defaults (IDEIA built-in defaults)               | |
|  |  2.  Extension defaults   (contributes.configuration)             | |
|  |  1.  Platform defaults    (hardcoded minimum for functionality)   | |
|  +------------------------------------------------------------------+ |
|                                                                       |
|  A resolucao percorre a hierarquia de baixo para cima,                |
|  aplicando override a cada nivel que define a chave.                  |
|  Language-specific e Temporary sao camadas sobrepostas.               |
+----------------------------------------------------------------------+
```

#### 2.1.2 Settings Storage

A IDEIA implementa tres niveis de storage:

| Storage | Engine | Escopo | Performance | Sincronizavel |
|---------|--------|--------|-------------|---------------|
| Settings files | JSON `settings.json` | User, Workspace, Folder | Alto para leitura | Via config sync |
| SQLite + FTS5 | `ideia-settings.db` | Global + Cache | Alto com indices | Cloud sync |
| Cloud | NATS KV Store | Across machines | Medio (rede) | N/A |

O fluxo de leitura de uma configuracao:

```
getConfiguration(key)
  |
  +---> Busca em Temporary Overrides (mapa em memoria)
  |       se encontrou -> retorna
  +---> Busca em Language-specific overrides
  |       se encontrou -> aplica override
  +---> Busca em Folder-level (workspace/.vscode/settings.json)
  |       se encontrou -> aplica override
  +---> Busca em Workspace-level (.code-workspace)
  |       se encontrou -> aplica override
  +---> Busca em User-level (~/.ideia/user/settings.json OU sqlite)
  |       se encontrou -> aplica override
  +---> Busca em Machine-level (~/.ideia/machine/settings.json)
  |       se encontrou -> aplica override
  +---> Busca em Defaults (contributions + built-in)
  |       retorna valor padrao
  +---> retorna valor composto
```

#### 2.1.3 Configuration Schema

Cada configuracao possui um schema que define tipo, valor padrao, escopo, descricao e regras de validacao:

```typescript
export interface ConfigurationPropertySchema {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  default?: unknown;
  enum?: unknown[];
  enumDescriptions?: string[];
  enumItemLabels?: string[];
  scope?: ConfigurationScope;
  description?: string;
  markdownDescription?: string;
  deprecationMessage?: string;
  markdownDeprecationMessage?: string;
  tags?: string[];
  order?: number;
  pattern?: string;
  patternErrorMessage?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  items?: ConfigurationPropertySchema;
  properties?: Record<string, ConfigurationPropertySchema>;
  additionalProperties?: ConfigurationPropertySchema;
  required?: string[];
  defaultSnippets?: { label: string; description?: string; body: unknown }[];
}

export enum ConfigurationScope {
  Application = 1,
  Window = 2,
  Resource = 3,
  LanguageOverride = 4,
  Machine = 5,
}
```

#### 2.1.4 Settings Validation

A validacao ocorre em tres momentos: escrita (schema + extension + security), leitura (cache, hierarquia, defaults) e watch (FileSystemWatcher + SQLite + NATS).

#### 2.1.5 Settings Watcher

```typescript
export class SettingsWatcher {
  private watchers = new Map<string, Set<WatcherRegistration>>();
  private fileWatchers: Disposable[] = [];

  constructor(
    private fileSystem: FileSystemProviderRegistry,
    private eventBus: IEventBus
  ) {}

  async watch(key: string, callback: (event: ConfigurationChangeEvent) => void): Promise<Disposable> {
    if (!this.watchers.has(key)) this.watchers.set(key, new Set());
    const reg: WatcherRegistration = { callback, dispose: () => this.watchers.get(key)?.delete(reg) };
    this.watchers.get(key)!.add(reg);
    return reg;
  }

  async fireChangeEvent(event: ConfigurationChangeEvent): Promise<void> {
    for (const [key, callbacks] of this.watchers) {
      if (event.affectedKeys.includes(key)) {
        for (const cb of callbacks) {
          try { cb(event); } catch (e) { console.error('Settings watcher error', e); }
        }
      }
    }
    await this.eventBus.publish('settings.changed', { event });
  }

  startFileWatchers(settingsPaths: string[]): void {
    for (const p of settingsPaths) {
      const d = this.fileSystem.watch?.(p, (changes) => {
        if (changes.some((c) => c.type === FileChangeType.UPDATED || c.type === FileChangeType.CREATED)) {
          this.fireChangeEvent({ source: 'file', affectedKeys: ['*'], raw: changes });
        }
      });
      if (d) this.fileWatchers.push(d);
    }
  }

  dispose(): void {
    this.fileWatchers.forEach((d) => d.dispose());
    this.watchers.clear();
  }
}
```

### 2.2 Settings Contribution

Extensoes contribuem com configuracoes atraves de `contributes.configuration` no `package.json`:

```json
{
  "contributes": {
    "configuration": {
      "title": "IDEIA Editor",
      "order": 10,
      "properties": {
        "editor.fontSize": {
          "type": "number",
          "default": 14,
          "scope": "resource",
          "order": 1,
          "minimum": 8,
          "maximum": 100
        },
        "editor.formatOnSave": {
          "type": "boolean",
          "default": false,
          "scope": "resource"
        },
        "editor.wordWrap": {
          "type": "string",
          "enum": ["off", "on", "wordWrapColumn", "bounded"],
          "default": "off",
          "scope": "resource"
        }
      }
    }
  }
}
```

### 2.3 Settings Editor

A IDEIA prove tres formas de editar configuracoes: UI settings editor (categorizado, searchable), JSON editor (com completacao e validacao) e diff view (user vs workspace). Language-specific settings usam sintaxe `[<languageId>]`.

### 2.4 Resource Settings

#### 2.4.1 Settings Scopes

| Escopo | ID | Persistencia | Sincronizado | Exemplo |
|--------|----|-------------|--------------|---------|
| Application | 1 | SQLite global | Sim | `update.mode` |
| Window | 2 | Memoria (sessao) | Nao | `window.zoomLevel` |
| Resource | 3 | Workspace/Folder JSON | Sim | `editor.fontSize` |
| LanguageOverride | 4 | Aninhado em Resource | Sim | `[typescript].editor.tabSize` |
| Machine | 5 | JSON local | Nao | `http.proxy` |

#### 2.4.2 Precedence Calculation Algorithm

```typescript
export interface ConfigurationLayer {
  target: ConfigurationTarget;
  precedence: number;
  values: Record<string, unknown>;
  languageOverrides?: Record<string, Record<string, unknown>>;
  source: 'file' | 'memory' | 'sqlite' | 'cloud' | 'default';
}

export function resolveConfigurationValue<T>(
  key: string,
  layers: ConfigurationLayer[],
  languageId?: string
): { value: T; source: ConfigurationTarget } {
  const sorted = [...layers].sort((a, b) => a.precedence - b.precedence);
  let currentValue: T | undefined;
  let source: ConfigurationTarget = ConfigurationTarget.Default;
  for (const layer of sorted) {
    if (layer.values[key] !== undefined) {
      currentValue = layer.values[key] as T;
      source = layer.target;
    }
    if (languageId && layer.languageOverrides?.[languageId]?.[key] !== undefined) {
      currentValue = layer.languageOverrides[languageId][key] as T;
      source = layer.target;
    }
  }
  return { value: currentValue ?? (getDefaultValue(key) as T), source };
}
```

### 2.5 Settings Management API

```typescript
export enum ConfigurationTarget {
  Default = 1,
  User = 2,
  Workspace = 3,
  WorkspaceFolder = 4,
  Memory = 5,
  Machine = 6,
}

export interface ConfigurationChangeEvent {
  readonly affectedKeys: string[];
  readonly source: ConfigurationTarget | 'file' | 'cloud' | 'extension';
}

export interface WorkspaceConfiguration {
  get<T>(key: string, defaultValue?: T): T;
  has(key: string): boolean;
  inspect<T>(key: string): InspectResult<T> | undefined;
  update(key: string, value: unknown, target: ConfigurationTarget): Promise<void>;
}

export interface IConfigurationService {
  getConfiguration(section?: string, resource?: Uri, languageId?: string): WorkspaceConfiguration;
  getValue<T>(key: string, options?: { resource?: Uri; languageId?: string }): T;
  updateValue(key: string, value: unknown, target: ConfigurationTarget, resource?: Uri): Promise<void>;
  onDidChangeConfiguration: Event<ConfigurationChangeEvent>;
  inspect<T>(key: string, resource?: Uri, languageId?: string): InspectResult<T> | undefined;
  reloadConfiguration(target?: ConfigurationTarget): Promise<void>;
}
```


---

## 3. KEYBINDING SYSTEM

### 3.1 Arquitetura

O sistema de keybindings gerencia o mapeamento de eventos de teclado para comandos, com resolucao baseada em prioridade e contexto (when clauses).

```
+----------------------------------------------------------------------+
|                        KEYBINDING RESOLUTION                           |
|                                                                       |
|  KeyboardEvent (keydown)                                              |
|        |                                                              |
|        v                                                              |
|  +-------------------------+                                          |
|  | Key Event Capture       |  Captura keydown no document/window      |
|  | (KeyboardEventListener) |  Normaliza para KeyCode + modifiers     |
|  +------------+------------+                                          |
|               |                                                        |
|               v                                                        |
|  +-------------------------+                                          |
|  | Key Mapping             |  KeyboardEvent.code -> IDEIA KeyCode     |
|  | (OS-specific layout)    |  Map <physical key> to <logical key>    |
|  +------------+------------+                                          |
|               |                                                        |
|               v                                                        |
|  +-------------------------+                                          |
|  | Keybinding Lookup       |  Search registrations by chord           |
|  | (priority-sorted)       |  Filter by when clause evaluation        |
|  +------------+------------+                                          |
|               |                                                        |
|     +---------+---------+                                              |
|     |                   |                                              |
|     v                   v                                              |
|  +----------+     +-----------+                                        |
|  | Matched  |     | Unmatched |                                        |
|  +----+-----+     +-----+-----+                                        |
|       |                 |                                              |
|       v                 v                                              |
|  Execute            Fallthrough:                                      |
|  command             pass to browser /                                 |
|                     send to chord buffer                               |
|                                                                       |
+----------------------------------------------------------------------+
```

#### Keybinding Layers

| Layer | Prioridade | Fonte | Exemplo |
|-------|-----------|-------|---------|
| Override | 1000 | User keybindings.json (especifico) | Ctrl+S remapeado |
| User | 900 | User keybindings.json | Ctrl+Shift+P |
| Workspace | 800 | Workspace keybindings.json | Ctrl+Alt+R (projeto) |
| Extension | 700 | package.json contributes.keybindings | Ctrl+Shift+I extensao |
| Default | 600 | IDEIA built-in keybindings | Ctrl+C copiar |
| Editor | 500 | Monaco/Editor built-in | Ctrl+Space completar |
| System | 100 | OS-level (antes do editor) | Alt+Tab trocar janela |

### 3.2 When Clause Context

When clauses sao expressoes booleanas que determinam se um keybinding esta ativo no contexto atual. Context keys sao extensiveis e atualizadas em tempo real.

#### Context Key Types

| Categoria | Exemplos | Atualizado por |
|-----------|---------|----------------|
| Platform | isWindows, isMac, isLinux, isWeb | Inicializacao |
| Editor | editorFocus, editorLangId, editorHasSelection | Focus/lang change |
| Terminal | terminalFocus, terminalProcessSupported | Focus/init |
| Explorer | explorerViewletVisible, filesExplorerFocus | Focus/layout |
| Debug | inDebugMode, debugType, debugState | Debug session |
| SCM | gitOpenRepositoryCount, scmProvider | Repository |
| Resource | resourceExtname, resourceFilename, resourceScheme | File open |
| Custom | Qualquer chave registrada por extensao | Extensao |

#### Context Key Expression Grammar

```
expr          ::= or_expr
or_expr       ::= and_expr ('||' and_expr)*
and_expr      ::= not_expr ('&&' not_expr)*
not_expr      ::= '!'? primary
primary       ::= 'true'
                | 'false'
                | key           (truthy check)
                | key '=~' regex  (string match regex)
                | key '!=' value  (not equal)
                | key '==' value  (equal)
                | key '<' number
                | key '<=' number
                | key '>' number
                | key '>=' number
                | key 'in' value  (array contains key)
                | key 'notIn' value
                | 'has' '(' key ')' (checks key exists)
                | '(' expr ')'
key           ::= [a-zA-Z_][a-zA-Z0-9_.]*
```

#### Context Key Examples

```
editorFocus && resourceExtname == .ts
editorHasSelection && !editorReadonly
terminalFocus && terminalProcessSupported
inDebugMode && debugType == node
resourceFilename =~ /test_.*\.ts/
editorFocus && !editorReadonly && isLinux
```

### 3.3 Keybinding Definitions

#### Keybinding Format in package.json

```json
{
  "contributes": {
    "keybindings": [
      {
        "key": "ctrl+shift+p",
        "command": "workbench.action.showCommands",
        "when": "!terminalFocus"
      },
      {
        "key": "ctrl+shift+i",
        "command": "ideia.agent.inlineChat",
        "when": "editorFocus && !editorReadonly"
      },
      {
        "key": "alt+enter",
        "command": "ideia.agent.applySuggestion",
        "args": { "mode": "replace" }
      }
    ]
  }
}
```

#### Chord Keybindings

Chords sao sequencias de duas teclas com timeout de 800ms entre a primeira e segunda tecla:

```json
{ "key": "ctrl+k ctrl+c", "command": "editor.action.addCommentLine", "when": "editorFocus" }
```

#### OS-Specific Overrides

```json
{
  "key": "ctrl+shift+`",
  "command": "workbench.action.terminal.new",
  "mac": "cmd+shift+`",
  "linux": "ctrl+alt+`",
  "when": "!terminalFocus"
}
```

### 3.4 Keybinding Resolution

#### Key Event Capture and Mapping

```typescript
export interface IKeybindingEvent {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  keyCode: KeyCode;
  code: string;
  key: string;
  target: EventTarget;
  preventDefault: () => void;
  original: KeyboardEvent;
}

export enum KeyCode {
  Unknown = 0, Backspace = 1, Tab = 2, Enter = 3, Escape = 4,
  Space = 5, PageUp = 6, PageDown = 7, End = 8, Home = 9,
  LeftArrow = 10, UpArrow = 11, RightArrow = 12, DownArrow = 13,
  Insert = 14, Delete = 15,
  KeyA = 16, KeyB = 17, KeyC = 18, KeyD = 19, KeyE = 20,
  KeyF = 21, KeyG = 22, KeyH = 23, KeyI = 24, KeyJ = 25,
  KeyK = 26, KeyL = 27, KeyM = 28, KeyN = 29, KeyO = 30,
  KeyP = 31, KeyQ = 32, KeyR = 33, KeyS = 34, KeyT = 35,
  KeyU = 36, KeyV = 37, KeyW = 38, KeyX = 39, KeyY = 40, KeyZ = 41,
  Digit0 = 42, Digit1 = 43, Digit2 = 44, Digit3 = 45, Digit4 = 46,
  Digit5 = 47, Digit6 = 48, Digit7 = 49, Digit8 = 50, Digit9 = 51,
  F1 = 52, F2 = 53, F3 = 54, F4 = 55, F5 = 56, F6 = 57, F7 = 58,
  F8 = 59, F9 = 60, F10 = 61, F11 = 62, F12 = 63, F13 = 64, F14 = 65,
  F15 = 66, F16 = 67, F17 = 68, F18 = 69, F19 = 70, F20 = 71,
  F21 = 72, F22 = 73, F23 = 74, F24 = 75,
  Comma = 76, Period = 77, Slash = 78, Semicolon = 79, Quote = 80,
  BracketLeft = 81, BracketRight = 82, Backquote = 83, Backslash = 84,
  Minus = 85, Equal = 86, IntlBackslash = 87,
}
```

#### Keybinding Lookup Algorithm

```typescript
export class KeybindingResolver {
  private bindings: ResolvedKeybinding[] = [];
  private chordState: { waiting: boolean; firstChord: KeyChord | null; timeout: NodeJS.Timeout | null } =
    { waiting: false, firstChord: null, timeout: null };
  private readonly CHORD_TIMEOUT = 800;

  resolveKeybinding(event: IKeybindingEvent, contexts: ContextKeyService): ResolvedKeybinding | undefined {
    const chord = this.buildChord(event);
    if (this.chordState.waiting) {
      const match = this.chordState.firstChord ? this.resolveChord(this.chordState.firstChord, chord) : undefined;
      this.chordState.waiting = false;
      if (match) { this.chordState.firstChord = null; return match; }
      this.chordState.firstChord = null;
      return undefined;
    }
    const directMatch = this.findBinding(chord, contexts);
    if (directMatch && !directMatch.isChord) return directMatch;
    const chordStart = this.findBindingsStartingWith(chord);
    if (chordStart.length > 0) {
      this.chordState.waiting = true;
      this.chordState.firstChord = chord;
      this.chordState.timeout = setTimeout(() => { this.chordState.waiting = false; this.chordState.firstChord = null; }, this.CHORD_TIMEOUT);
      return undefined;
    }
    return undefined;
  }

  private findBinding(chord: KeyChord, contexts: ContextKeyService): ResolvedKeybinding | undefined {
    for (const binding of this.bindings) {
      if (binding.isChord) continue;
      if (this.chordsEqual(binding.chord, chord) && (!binding.when || binding.when.evaluate(contexts))) {
        return binding;
      }
    }
    return undefined;
  }

  private resolveChord(first: KeyChord, second: KeyChord): ResolvedKeybinding | undefined {
    for (const binding of this.bindings) {
      if (!binding.isChord) continue;
      if (this.chordsEqual(binding.firstChord!, first) && this.chordsEqual(binding.secondChord!, second)) {
        if (!binding.when || binding.when.evaluate(contexts)) return binding;
      }
    }
    return undefined;
  }

  private chordsEqual(a: KeyChord, b: KeyChord): boolean {
    return a.ctrlKey === b.ctrlKey && a.shiftKey === b.shiftKey && a.altKey === b.altKey && a.metaKey === b.metaKey && a.keyCode === b.keyCode;
  }

  private findBindingsStartingWith(chord: KeyChord): ResolvedKeybinding[] {
    return this.bindings.filter((b) => b.isChord && this.chordsEqual(b.firstChord!, chord));
  }

  private buildChord(event: IKeybindingEvent): KeyChord {
    return { ctrlKey: event.ctrlKey, shiftKey: event.shiftKey, altKey: event.altKey, metaKey: event.metaKey, keyCode: event.keyCode };
  }
}
```

#### Keybinding Conflicts Detection

```typescript
export class KeybindingConflictDetector {
  detectConflicts(bindings: ResolvedKeybinding[]): KeybindingConflict[] {
    const conflicts: KeybindingConflict[] = [];
    const byChord = new Map<string, ResolvedKeybinding[]>();
    for (const binding of bindings) {
      const key = this.chordToString(binding);
      if (!byChord.has(key)) byChord.set(key, []);
      byChord.get(key)!.push(binding);
    }
    for (const [chord, matches] of byChord) {
      if (matches.length > 1) {
        for (let i = 0; i < matches.length; i++) {
          for (let j = i + 1; j < matches.length; j++) {
            if (this.overlapWhen(matches[i].when, matches[j].when)) {
              conflicts.push({ chord, existing: matches[i], conflicting: matches[j] });
            }
          }
        }
      }
    }
    return conflicts;
  }
  private chordToString(b: ResolvedKeybinding): string { return ''; }
  private overlapWhen(a?: WhenClause, b?: WhenClause): boolean { return !a || !b; }
}
```

### 3.5 Keybinding Recording

O sistema de recording permite ao usuario capturar uma combinacao de teclas e atribui-la a um comando, seguindo uma maquina de estados: IDLE -> LISTENING -> CHORD_WAIT -> CONFIRM -> SAVE. O sistema detecta conflitos automaticamente antes de salvar no keybindings.json.

```
+----------------------------------------------------------------------+
|                    KEYBINDING RECORDER                                 |
|                                                                       |
|  State machine:                                                       |
|                                                                       |
|  IDLE -> LISTENING -> CHORD_WAIT -> CONFIRM -> SAVE                   |
|    |          |            |           |                              |
|    |          v            |           |                              |
|    +------ START      TIMEOUT        v                              |
|                           |        VALIDATE                          |
|                           v        (conflict check)                  |
|                        IDLE         |                                |
|                                     v                                |
|                                SAVE/REJECT                           |
+----------------------------------------------------------------------+
```

### 3.6 Commands & Keyboard Shortcuts

O sistema de keybindings integra-se ao sistema de comandos da IDEIA via Command Palette. A busca e fuzzy por nome do comando ou atalho de teclado, com recentes no topo.

```typescript
export class CommandPaletteModel {
  private recentCommands: string[] = [];
  private allCommands: CommandDefinition[] = [];

  search(query: string, keybindingService: IKeybindingService): CommandSearchResult[] {
    const results: CommandSearchResult[] = [];
    for (const cmd of this.allCommands) {
      const score = this.fuzzyScore(cmd, query.toLowerCase());
      if (score > 0) {
        const bindings = keybindingService.getKeybindingsForCommand(cmd.id);
        results.push({
          command: cmd, score,
          keybinding: bindings[0] ? this.formatKeybinding(bindings[0]) : undefined,
          recent: this.recentCommands.includes(cmd.id),
        });
      }
    }
    results.sort((a, b) => {
      if (a.recent !== b.recent) return a.recent ? -1 : 1;
      if (a.score !== b.score) return b.score - a.score;
      return a.command.title.localeCompare(b.command.title);
    });
    return results.slice(0, 100);
  }

  recordCommandUse(commandId: string): void {
    const idx = this.recentCommands.indexOf(commandId);
    if (idx >= 0) this.recentCommands.splice(idx, 1);
    this.recentCommands.unshift(commandId);
    if (this.recentCommands.length > 50) this.recentCommands.pop();
  }

  private fuzzyScore(cmd: CommandDefinition, query: string): number {
    const haystack = (cmd.category ? cmd.category + ": " : "") + cmd.title;
    if (haystack === query) return 1000;
    if (haystack.startsWith(query)) return 900;
    if (haystack.includes(query)) return 800;
    let qi = 0, score = 0;
    for (let hi = 0; hi < haystack.length && qi < query.length; hi++) {
      if (haystack[hi] === query[qi]) { score += 100 - (hi - qi) * 10; qi++; }
    }
    return qi === query.length ? Math.max(1, score) : 0;
  }
  private formatKeybinding(b: ResolvedKeybinding): string { return ''; }
}
```

---

## 4. THEME SYSTEM

### 4.1 Arquitetura

O sistema de temas da IDEIA e composto por tres tipos de tema independentes: tema de cores (color theme), tema de icones de arquivo (icon theme) e tema de icones de produto (product icon theme).

```
+----------------------------------------------------------------------+
|                       IDEIA THEME SYSTEM                               |
|                                                                       |
|  +----------------------------------------------------------------+  |
|  |                     ThemeService                                 |  |
|  |  ColorThemeManager | IconThemeManager | ProductIconThemeManager |  |
|  +--------------------------+--------------------------------------+  |
|                              |                                        |
|        +---------------------+------+----------+----------+          |
|        |                            |          |          |          |
|        v                            v          v          v          |
|  +----------+              +----------+  +----------+ +----------+   |
|  | Color    |              | Icon     |  | Product  | | Token    |   |
|  | Theme    |              | Theme    |  | Icon     | | Colors   |   |
|  | .json    |              | .json    |  | Theme    | | (editor) |   |
|  +----------+              +----------+  | .json    | +----------+   |
|        |                                 +----------+                 |
|        v                                                             |
|  +----------------------------------------------------------------+  |
|  |                        Color Registry                            |  |
|  |  editor.background, sideBar.background, activityBar.foreground   |  |
|  |  editor.foreground, statusBar.background, input.border, ...      |  |
|  +----------------------------------------------------------------+  |
|        |                                                             |
|        v                                                             |
|  +----------------------------------------------------------------+  |
|  |                    CSS Custom Properties                          |  |
|  |  --vscode-editor-background, --vscode-editor-foreground, ...     |  |
|  +----------------------------------------------------------------+  |
|        |                                                             |
|        v                                                             |
|  +----------------------------------------------------------------+  |
|  |                    Monaco defineTheme()                           |  |
|  |  Mapeia colors + tokenColors + semanticTokenColors               |  |
|  +----------------------------------------------------------------+  |
+----------------------------------------------------------------------+
```

### 4.2 Color Theme Format

O formato de tema de cores segue o padrao VS Code/TextMate com extensoes para semantic tokens:

```json
{
  "name": "IDEIA Dark",
  "type": "dark",
  "colors": {
    "editor.background": "#1e1e2e",
    "editor.foreground": "#cdd6f4",
    "editorCursor.foreground": "#f5e0dc",
    "editor.selectionBackground": "#45475a",
    "editorLineNumber.foreground": "#6c7086",
    "sideBar.background": "#181825",
    "sideBar.foreground": "#cdd6f4",
    "activityBar.background": "#11111b",
    "activityBar.foreground": "#cdd6f4",
    "statusBar.background": "#11111b",
    "statusBar.foreground": "#cdd6f4",
    "tab.activeBackground": "#1e1e2e",
    "tab.inactiveBackground": "#181825",
    "input.background": "#313244",
    "input.border": "#45475a",
    "button.background": "#89b4fa",
    "button.foreground": "#1e1e2e",
    "panel.background": "#181825",
    "terminal.background": "#1e1e2e",
    "terminal.foreground": "#cdd6f4",
    "terminal.ansiRed": "#f38ba8",
    "terminal.ansiGreen": "#a6e3a1",
    "terminal.ansiYellow": "#f9e2af",
    "terminal.ansiBlue": "#89b4fa",
    "terminal.ansiMagenta": "#f5c2e7",
    "terminal.ansiCyan": "#94e2d5"
  },
  "tokenColors": [
    { "scope": ["comment"], "settings": { "foreground": "#6c7086", "fontStyle": "italic" } },
    { "scope": "constant", "settings": { "foreground": "#fab387" } },
    { "scope": "entity.name.type", "settings": { "foreground": "#f9e2af" } },
    { "scope": "keyword", "settings": { "foreground": "#cba6f7" } },
    { "scope": "string", "settings": { "foreground": "#a6e3a1" } },
    { "scope": "entity.name.function", "settings": { "foreground": "#89b4fa" } },
    { "scope": "support.type.property-name.css", "settings": { "foreground": "#94e2d5" } }
  ],
  "semanticHighlighting": true,
  "semanticTokenColors": {
    "class": "#f9e2af",
    "interface": "#f9e2af",
    "parameter": "#fab387",
    "method": "#89b4fa",
    "namespace": "#cba6f7",
    "keyword": "#cba6f7",
    "string": "#a6e3a1",
    "number": "#fab387",
    "builtin": "#f5c2e7",
    "type": "#f9e2af"
  }
}
```

#### Color Format Specification

| Formato | Exemplo | Descricao |
|---------|---------|-----------|
| `#RGB` | `#F00` | RGB 4-bit cada canal, expandido para #FF0000 |
| `#RGBA` | `#F006` | RGB + Alpha 4-bit, expandido para #FF000066 |
| `#RRGGBB` | `#FF0000` | RGB 8-bit cada canal |
| `#RRGGBBAA` | `#FF000066` | RGB + Alpha 8-bit |
| `transparent` | `transparent` | Equivalente a #00000000 |

### 4.3 Icon Theme Format

Temas de icones mapeiam extensoes de arquivo, nomes de arquivo, pastas e linguagens para icones:

```json
{
  "name": "IDEIA Icons",
  "displayName": "IDEIA Icon Theme",
  "iconDefinitions": {
    "_file": { "iconPath": "./icons/file.svg" },
    "_folder": { "iconPath": "./icons/folder.svg" },
    "_folder_open": { "iconPath": "./icons/folder-open.svg" },
    "_file_ts": { "iconPath": "./icons/typescript.svg" },
    "_file_py": { "iconPath": "./icons/python.svg" },
    "_file_json": { "iconPath": "./icons/json.svg" },
    "_file_md": { "iconPath": "./icons/markdown.svg" }
  },
  "fileExtensions": {
    "ts": "_file_ts", "tsx": "_file_ts",
    "py": "_file_py", "json": "_file_json", "md": "_file_md"
  },
  "fileNames": {
    "package.json": "_file_json",
    "tsconfig.json": "_file_ts"
  },
  "languageIds": {
    "typescript": "_file_ts", "python": "_file_py"
  },
  "folderNames": {
    "src": "_folder_src", "node_modules": "_folder_node"
  },
  "hidesExplorerArrows": false
}
```

A resolucao do icone segue ordem: fileNames > fileExtensions > languageIds > folderNames > rootFolder > fallback.

### 4.4 Product Icon Theme

Temas de icones de produto definem icones para elementos de UI (comandos, botoes, views, status bar) usando font icons:

```json
{
  "name": "IDEIA Product Icons",
  "fontId": "ideia-product-icons",
  "fontPath": "./fonts/ideia-product-icons.woff2",
  "icons": {
    "add": { "fontCharacter": "\\EA01" },
    "close": { "fontCharacter": "\\EA07" },
    "code": { "fontCharacter": "\\EA08" },
    "debug": { "fontCharacter": "\\EA0A" },
    "file": { "fontCharacter": "\\EA0D" },
    "folder": { "fontCharacter": "\\EA0E" },
    "search": { "fontCharacter": "\\EA19" },
    "settings": { "fontCharacter": "\\EA1A" },
    "terminal": { "fontCharacter": "\\EA1B" },
    "chat": { "fontCharacter": "\\EA21" },
    "robot": { "fontCharacter": "\\EA22" }
  }
}
```

### 4.5 Token Color Customization

Usuarios podem customizar cores de tokens TextMate e semantic tokens diretamente no settings.json:

```json
{
  "editor.tokenColorCustomizations": {
    "textMateRules": [
      { "scope": "comment", "settings": { "foreground": "#6c7086", "fontStyle": "italic" } },
      { "scope": "keyword", "settings": { "foreground": "#cba6f7", "bold": true } }
    ]
  },
  "editor.semanticTokenColorCustomizations": {
    "enabled": true,
    "rules": {
      "*.declaration": { "foreground": "#f5c2e7", "bold": true },
      "*.readonly": { "foreground": "#6c7086" },
      "class.defaultLibrary": "#89b4fa",
      "parameter:typescript": { "foreground": "#fab387", "italic": true }
    }
  }
}
```

#### Semantic Token Types and Modifiers

```typescript
export interface SemanticTokenRule {
  foreground?: string;
  background?: string;
  fontStyle?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export const STStandardTypes = [
  'class', 'interface', 'enum', 'type', 'typeParameter',
  'function', 'method', 'macro', 'variable', 'parameter',
  'property', 'event', 'namespace', 'modifier', 'comment',
  'keyword', 'string', 'number', 'regexp', 'operator',
  'builtin', 'member', 'label',
] as const;

export const STStandardModifiers = [
  'declaration', 'definition', 'readonly', 'static',
  'deprecated', 'abstract', 'async', 'modification',
  'documentation', 'defaultLibrary',
] as const;
```

### 4.6 Theme Contribution

Extensoes contribuem com temas via `contributes.themes`, `contributes.iconThemes` e `contributes.productIconThemes`:

```json
{
  "contributes": {
    "themes": [
      { "id": "ideia-dark", "label": "IDEIA Dark", "uiTheme": "vs-dark", "path": "./themes/ideia-dark.json" },
      { "id": "ideia-light", "label": "IDEIA Light", "uiTheme": "vs", "path": "./themes/ideia-light.json" },
      { "id": "ideia-hc", "label": "IDEIA High Contrast", "uiTheme": "hc-black", "path": "./themes/ideia-hc.json" }
    ],
    "iconThemes": [
      { "id": "ideia-icons", "label": "IDEIA Icons", "path": "./icon-themes/ideia-icons.json" }
    ],
    "productIconThemes": [
      { "id": "ideia-product-icons", "label": "IDEIA Product Icons", "path": "./product-icon-themes/ideia-product-icons.json" }
    ]
  }
}
```

### 4.7 Dynamic Theme Switching

O ciclo de troca de tema envolve: carregar o JSON do tema, aplicar no Color Registry, atualizar CSS custom properties, atualizar Monaco via defineTheme(), re-tokenizar editores visiveis, persistir a selecao e emitir eventos.

```typescript
export class ThemeService {
  private currentTheme: ColorTheme | null = null;
  private themes = new Map<string, ColorTheme>();
  private _onDidChangeColorTheme = new EventEmitter<ColorTheme>();
  readonly onDidChangeColorTheme: Event<ColorTheme> = (cb) => this._onDidChangeColorTheme.on(cb);

  constructor(
    private colorRegistry: ColorRegistry,
    private cssVariableManager: CssVariableManager,
    private monacoAdapter: MonacoThemeAdapter,
    private settingsService: IConfigurationService
  ) {}

  async setTheme(themeId: string): Promise<void> {
    const theme = this.themes.get(themeId);
    if (!theme) throw new Error('Theme ' + themeId + ' not found');

    // 1. Apply to color registry
    this.colorRegistry.applyTheme(theme);
    // 2. Generate CSS variables
    const cssVars: Record<string, string> = {};
    for (const [key, value] of Object.entries(theme.colors)) {
      cssVars['--vscode-' + key.replace(/\./g, '-')] = value;
    }
    this.cssVariableManager.applyAll(cssVars);
    // 3. Update document attributes
    document.documentElement.setAttribute('data-theme', theme.type);
    document.documentElement.setAttribute('data-theme-id', theme.id);
    document.documentElement.style.colorScheme = theme.type === 'dark' ? 'dark' : 'light';
    // 4. Update Monaco theme
    await this.monacoAdapter.applyTheme(theme);
    // 5. Re-tokenize editors
    await this.monacoAdapter.retokenizeEditors();
    // 6. Persist
    await this.settingsService.updateValue("workbench.colorTheme", theme.id, ConfigurationTarget.User);
    // 7. Notify
    this.currentTheme = theme;
    this._onDidChangeColorTheme.fire(theme);
  }

  registerTheme(id: string, theme: ColorTheme): void { this.themes.set(id, theme); }
  getColorTheme(): ColorTheme | null { return this.currentTheme; }
  getAvailableThemes(): ColorTheme[] { return Array.from(this.themes.values()); }
}
```

### 4.8 Color Registry

O Color Registry e o catalogo central de cores de UI. Cada cor possui valores default para dark, light e highContrast:

```typescript
export interface ColorDefaults {
  dark: string;
  light: string;
  highContrast: string;
  highContrastLight?: string;
}

export class ColorRegistry {
  private colors = new Map<string, ColorDefaults>();
  private resolvedCache = new Map<string, string>();

  registerColor(id: string, defaults: ColorDefaults, description: string): void {
    this.colors.set(id, defaults);
    this.resolvedCache.delete(id);
  }

  registerColors(colors: Record<string, ColorDefaults>): void {
    for (const [id, defaults] of Object.entries(colors)) {
      this.colors.set(id, defaults);
      this.resolvedCache.delete(id);
    }
  }

  resolveColor(id: string, themeType: ThemeType): string {
    const cacheKey = id + ":" + themeType;
    const cached = this.resolvedCache.get(cacheKey);
    if (cached) return cached;
    const defaults = this.colors.get(id);
    if (!defaults) return '#000000';
    let color: string;
    switch (themeType) {
      case 'dark': color = defaults.dark; break;
      case 'light': color = defaults.light; break;
      case 'hc-black': color = defaults.highContrast; break;
      case 'hc-light': color = defaults.highContrastLight ?? defaults.light; break;
      default: color = defaults.dark;
    }
    this.resolvedCache.set(cacheKey, color);
    return color;
  }

  applyTheme(theme: ColorTheme): void {
    for (const key of Object.keys(theme.colors)) {
      this.resolvedCache.delete(key);
    }
    this.resolvedCache.clear();
  }

  getRegisteredColors(): string[] {
    return Array.from(this.colors.keys());
  }
}
```

#### Core UI Color Definitions

```typescript
export function registerCoreColors(registry: ColorRegistry): void {
  registry.registerColors({
    "editor.background": { dark: "#1e1e2e", light: "#ffffff", highContrast: "#000000" },
    "editor.foreground": { dark: "#cdd6f4", light: "#1e1e2e", highContrast: "#ffffff" },
    "editorCursor.foreground": { dark: "#f5e0dc", light: "#1e1e2e", highContrast: "#ffffff" },
    "editor.selectionBackground": { dark: "#45475a", light: "#d0d0d0", highContrast: "#ffffff80" },
    "sideBar.background": { dark: "#181825", light: "#f0f0f0", highContrast: "#000000" },
    "sideBar.foreground": { dark: "#cdd6f4", light: "#1e1e2e", highContrast: "#ffffff" },
    "activityBar.background": { dark: "#11111b", light: "#e0e0e0", highContrast: "#000000" },
    "activityBar.foreground": { dark: "#cdd6f4", light: "#1e1e2e", highContrast: "#ffffff" },
    "statusBar.background": { dark: "#11111b", light: "#e0e0e0", highContrast: "#000000" },
    "statusBar.foreground": { dark: "#cdd6f4", light: "#1e1e2e", highContrast: "#ffffff" },
    "tab.activeBackground": { dark: "#1e1e2e", light: "#ffffff", highContrast: "#000000" },
    "tab.inactiveBackground": { dark: "#181825", light: "#f0f0f0", highContrast: "#0a0a0a" },
    "input.background": { dark: "#313244", light: "#ffffff", highContrast: "#000000" },
    "input.border": { dark: "#45475a", light: "#c0c0c0", highContrast: "#ffffff" },
    "button.background": { dark: "#89b4fa", light: "#0078d4", highContrast: "#00ff00" },
    "button.foreground": { dark: "#1e1e2e", light: "#ffffff", highContrast: "#000000" },
    "list.activeSelectionBackground": { dark: "#313244", light: "#d0d0d0", highContrast: "#ffffff40" },
    "list.hoverBackground": { dark: "#31324480", light: "#e0e0e080", highContrast: "#ffffff20" },
    "scrollbarSlider.background": { dark: "#45475a40", light: "#00000020", highContrast: "#ffffff60" },
    "panel.background": { dark: "#181825", light: "#f5f5f5", highContrast: "#000000" },
    "terminal.background": { dark: "#1e1e2e", light: "#ffffff", highContrast: "#000000" },
    "terminal.foreground": { dark: "#cdd6f4", light: "#1e1e2e", highContrast: "#ffffff" },
    "gitDecoration.modifiedResourceForeground": { dark: "#f9e2af", light: "#9b6b00", highContrast: "#ffff00" },
    "badge.background": { dark: "#89b4fa", light: "#0078d4", highContrast: "#00ff00" },
    "titleBar.activeBackground": { dark: "#11111b", light: "#e0e0e0", highContrast: "#000000" },
  });
}
```


---

## 5. Code Examples

### 5.1 SettingsService with Hierarchy Resolution

```typescript
import { EventEmitter } from 'events';

export interface ConfigurationLayer {
  target: ConfigurationTarget;
  precedence: number;
  values: Record<string, unknown>;
  languageOverrides?: Record<string, Record<string, unknown>>;
  source: 'file' | 'memory' | 'sqlite' | 'cloud' | 'default';
}

export enum ConfigurationTarget {
  Default = 1,
  User = 2,
  Workspace = 3,
  WorkspaceFolder = 4,
  Memory = 5,
  Machine = 6,
}

export interface ConfigurationChangeEvent {
  affectedKeys: string[];
  source: ConfigurationTarget | 'file' | 'cloud' | 'extension';
}

export class SettingsService {
  private layers: ConfigurationLayer[] = [];
  private _onDidChangeConfiguration = new EventEmitter<ConfigurationChangeEvent>();
  readonly onDidChangeConfiguration = this._onDidChangeConfiguration.on.bind(this._onDidChangeConfiguration);

  constructor(
    private schemaRegistry: ConfigurationSchemaRegistry,
    private storage: ISettingsStorage,
    private watcher: SettingsWatcher
  ) {
    this.initializeLayers();
    this.watcher.onDidChangeFileSettings((paths) => this.reloadFromPaths(paths));
  }

  private async initializeLayers(): Promise<void> {
    this.layers = [
      { target: ConfigurationTarget.Default, precedence: 100, values: this.getDefaults(), source: 'default' },
      { target: ConfigurationTarget.Machine, precedence: 200, values: await this.storage.load(ConfigurationTarget.Machine), source: 'file' },
      { target: ConfigurationTarget.User, precedence: 300, values: await this.storage.load(ConfigurationTarget.User), source: 'sqlite' },
      { target: ConfigurationTarget.Workspace, precedence: 400, values: await this.storage.load(ConfigurationTarget.Workspace), source: 'file' },
      { target: ConfigurationTarget.WorkspaceFolder, precedence: 500, values: await this.storage.load(ConfigurationTarget.WorkspaceFolder), source: 'file' },
    ];
  }

  getConfiguration(section?: string, resource?: Uri, languageId?: string): WorkspaceConfiguration {
    return new WorkspaceConfigurationImpl(this, section, resource, languageId);
  }

  getValue<T>(key: string, options?: { resource?: Uri; languageId?: string }): T {
    const result = this.resolveWithHierarchy(key, options?.languageId);
    return result.value as T;
  }

  async updateValue(key: string, value: unknown, target: ConfigurationTarget, resource?: Uri): Promise<void> {
    const validation = this.schemaRegistry.validate(key, value);
    if (!validation.valid) {
      throw new Error('Invalid value for ' + key + ': ' + validation.error);
    }
    await this.storage.save(key, value, target, resource);
    const layer = this.layers.find((l) => l.target === target);
    if (layer) layer.values[key] = value;
    this._onDidChangeConfiguration.emit({ affectedKeys: [key], source: target });
  }

  inspect<T>(key: string, resource?: Uri, languageId?: string): InspectResult<T> | undefined {
    const schema = this.schemaRegistry.getSchema(key);
    if (!schema) return undefined;
    const result: InspectResult<T> = { key, defaultValue: schema.default as T | undefined };
    for (const layer of [...this.layers].sort((a, b) => a.precedence - b.precedence)) {
      const raw = layer.values[key];
      if (raw !== undefined) {
        if (layer.target === ConfigurationTarget.User) result.globalValue = raw as T;
        else if (layer.target === ConfigurationTarget.Workspace) result.workspaceValue = raw as T;
        else if (layer.target === ConfigurationTarget.WorkspaceFolder) result.workspaceFolderValue = raw as T;
        else if (layer.target === ConfigurationTarget.Machine) result.machineValue = raw as T;
      }
    }
    return result;
  }

  private resolveWithHierarchy<T>(key: string, languageId?: string): { value: T; source: ConfigurationTarget } {
    const sorted = [...this.layers].sort((a, b) => a.precedence - b.precedence);
    let currentValue: T | undefined;
    let source = ConfigurationTarget.Default;
    for (const layer of sorted) {
      if (layer.values[key] !== undefined) {
        currentValue = layer.values[key] as T;
        source = layer.target;
      }
      if (languageId && layer.languageOverrides?.[languageId]?.[key] !== undefined) {
        currentValue = layer.languageOverrides[languageId][key] as T;
        source = layer.target;
      }
    }
    const defaultValue = this.computeDefault<T>(key);
    return { value: currentValue ?? defaultValue, source };
  }

  private computeDefault<T>(key: string): T | undefined {
    const schema = this.schemaRegistry.getSchema(key);
    if (schema?.default !== undefined) return schema.default as T;
    return undefined;
  }

  private getDefaults(): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};
    for (const [key, schema] of this.schemaRegistry.getAllSchemas()) {
      if (schema.default !== undefined) defaults[key] = schema.default;
    }
    return defaults;
  }

  private async reloadFromPaths(paths: string[]): Promise<void> {
    for (const layer of this.layers) {
      if (layer.source === 'file') layer.values = await this.storage.load(layer.target);
    }
    this._onDidChangeConfiguration.emit({ affectedKeys: ['*'], source: 'file' });
  }
}

class WorkspaceConfigurationImpl implements WorkspaceConfiguration {
  constructor(
    private service: SettingsService,
    private section?: string,
    private resource?: Uri,
    private languageId?: string
  ) {}

  get<T>(key: string, defaultValue?: T): T {
    const fullKey = this.section ? this.section + "." + key : key;
    const value = this.service.getValue<T>(fullKey, { resource: this.resource, languageId: this.languageId });
    return value ?? defaultValue as T;
  }

  has(key: string): boolean {
    const fullKey = this.section ? this.section + "." + key : key;
    return (this.service as any).schemaRegistry.getSchema(fullKey) !== undefined;
  }

  inspect<T>(key: string): InspectResult<T> | undefined {
    const fullKey = this.section ? this.section + "." + key : key;
    return this.service.inspect<T>(fullKey, this.resource, this.languageId);
  }

  async update(key: string, value: unknown, target: ConfigurationTarget): Promise<void> {
    const fullKey = this.section ? this.section + "." + key : key;
    await this.service.updateValue(fullKey, value, target, this.resource);
  }
}
```

### 5.2 ConfigurationTarget and Scoped Update

```typescript
// Usage examples of the Settings API

// Get editor font size
const config = workspace.getConfiguration('editor');
const fontSize = config.get<number>('fontSize', 14);

// Inspect all layers
const inspected = config.inspect<number>('tabSize');
if (inspected) {
  console.log({
    default: inspected.defaultValue,
    user: inspected.globalValue,
    workspace: inspected.workspaceValue,
  });
}

// Update workspace-level setting
await config.update('formatOnSave', true, ConfigurationTarget.Workspace);

// Listen for changes
const disposable = workspace.onDidChangeConfiguration((event) => {
  if (event.affectedKeys.includes('editor.fontSize')) {
    console.log('Font size changed!');
  }
});

// Temporary override (in-memory, not persisted)
await config.update('fontSize', 18, ConfigurationTarget.Memory);

// Machine-level (never synced)
await config.update('http.proxyStrictSSL', false, ConfigurationTarget.Machine);
```

### 5.3 KeybindingService with Resolution Algorithm

```typescript
export interface KeyChord {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  keyCode: KeyCode;
}

export interface ResolvedKeybinding {
  id: string;
  key: string;
  command: string;
  when?: WhenClause;
  args?: unknown;
  priority: number;
  isChord: boolean;
  firstChord?: KeyChord;
  secondChord?: KeyChord;
  chord: KeyChord;
  source: 'user' | 'workspace' | 'extension' | 'default' | 'system';
}

export class KeybindingService {
  private bindings: ResolvedKeybinding[] = [];
  private chordState: { waiting: boolean; firstChord: KeyChord | null; timeout: NodeJS.Timeout | null } = {
    waiting: false, firstChord: null, timeout: null,
  };
  private readonly CHORD_TIMEOUT = 800;

  constructor(
    private contextKeys: ContextKeyService,
    private commandService: ICommandService
  ) {}

  registerKeybinding(binding: ResolvedKeybinding): void {
    this.bindings.push(binding);
    this.sortByPriority();
  }

  unregisterKeybinding(id: string): void {
    this.bindings = this.bindings.filter((b) => b.id !== id);
  }

  async handleKeyEvent(event: KeyboardEvent): Promise<boolean> {
    const chord = this.normalizeEvent(event);

    // Phase 1: Chord completion
    if (this.chordState.waiting) {
      this.clearChordTimeout();
      const match = this.chordState.firstChord
        ? this.resolveChord(this.chordState.firstChord, chord)
        : undefined;
      this.chordState.waiting = false;
      this.chordState.firstChord = null;
      if (match) {
        await this.executeCommand(match);
        event.preventDefault();
        return true;
      }
      return false;
    }

    // Phase 2: Direct match
    const directMatch = this.resolve(chord);
    if (directMatch) {
      await this.executeCommand(directMatch);
      event.preventDefault();
      return true;
    }

    // Phase 3: Chord start detection
    const chordStarters = this.findByFirstKey(chord);
    if (chordStarters.length > 0) {
      this.chordState.waiting = true;
      this.chordState.firstChord = chord;
      this.chordState.timeout = setTimeout(() => {
        this.chordState.waiting = false;
        this.chordState.firstChord = null;
      }, this.CHORD_TIMEOUT);
      event.preventDefault();
      return true;
    }

    // Phase 4: Fallthrough
    return false;
  }

  private resolve(chord: KeyChord): ResolvedKeybinding | undefined {
    for (const binding of this.bindings) {
      if (binding.isChord) continue;
      if (this.chordsEqual(binding.chord, chord) && this.evaluateWhenClause(binding.when)) {
        return binding;
      }
    }
    return undefined;
  }

  private resolveChord(first: KeyChord, second: KeyChord): ResolvedKeybinding | undefined {
    for (const binding of this.bindings) {
      if (!binding.isChord) continue;
      if (this.chordsEqual(binding.firstChord!, first) && this.chordsEqual(binding.secondChord!, second)) {
        if (this.evaluateWhenClause(binding.when)) return binding;
      }
    }
    return undefined;
  }

  private findByFirstKey(chord: KeyChord): ResolvedKeybinding[] {
    return this.bindings.filter((b) => b.isChord && this.chordsEqual(b.firstChord!, chord));
  }

  private chordsEqual(a: KeyChord, b: KeyChord): boolean {
    return a.ctrlKey === b.ctrlKey && a.shiftKey === b.shiftKey
      && a.altKey === b.altKey && a.metaKey === b.metaKey
      && a.keyCode === b.keyCode;
  }

  private evaluateWhenClause(when: WhenClause | undefined): boolean {
    if (!when) return true;
    return when.evaluate(this.contextKeys);
  }

  private async executeCommand(binding: ResolvedKeybinding): Promise<void> {
    await this.commandService.executeCommand(binding.command, binding.args);
  }

  private normalizeEvent(event: KeyboardEvent): KeyChord {
    return {
      ctrlKey: event.ctrlKey, shiftKey: event.shiftKey,
      altKey: event.altKey, metaKey: event.metaKey,
      keyCode: this.codeToKeyCode(event.code, event.key),
    };
  }

  private codeToKeyCode(code: string, key: string): KeyCode {
    const map: Record<string, KeyCode> = {
      'KeyA': KeyCode.KeyA, 'KeyB': KeyCode.KeyB,
      'KeyC': KeyCode.KeyC, 'KeyD': KeyCode.KeyD,
      'KeyE': KeyCode.KeyE, 'KeyF': KeyCode.KeyF,
      'KeyG': KeyCode.KeyG, 'KeyH': KeyCode.KeyH,
      'KeyI': KeyCode.KeyI, 'KeyJ': KeyCode.KeyJ,
      'KeyK': KeyCode.KeyK, 'KeyL': KeyCode.KeyL,
      'KeyM': KeyCode.KeyM, 'KeyN': KeyCode.KeyN,
      'KeyO': KeyCode.KeyO, 'KeyP': KeyCode.KeyP,
      'KeyQ': KeyCode.KeyQ, 'KeyR': KeyCode.KeyR,
      'KeyS': KeyCode.KeyS, 'KeyT': KeyCode.KeyT,
      'KeyU': KeyCode.KeyU, 'KeyV': KeyCode.KeyV,
      'KeyW': KeyCode.KeyW, 'KeyX': KeyCode.KeyX,
      'KeyY': KeyCode.KeyY, 'KeyZ': KeyCode.KeyZ,
      'Digit0': KeyCode.Digit0, 'Digit1': KeyCode.Digit1,
      'Digit2': KeyCode.Digit2, 'Digit3': KeyCode.Digit3,
      'Digit4': KeyCode.Digit4, 'Digit5': KeyCode.Digit5,
      'Digit6': KeyCode.Digit6, 'Digit7': KeyCode.Digit7,
      'Digit8': KeyCode.Digit8, 'Digit9': KeyCode.Digit9,
      'F1': KeyCode.F1, 'F2': KeyCode.F2, 'F3': KeyCode.F3,
      'F4': KeyCode.F4, 'F5': KeyCode.F5, 'F6': KeyCode.F6,
      'F7': KeyCode.F7, 'F8': KeyCode.F8, 'F9': KeyCode.F9,
      'F10': KeyCode.F10, 'F11': KeyCode.F11, 'F12': KeyCode.F12,
      'Space': KeyCode.Space, 'Enter': KeyCode.Enter,
      'Tab': KeyCode.Tab, 'Escape': KeyCode.Escape,
      'Backspace': KeyCode.Backspace, 'Delete': KeyCode.Delete,
      'ArrowUp': KeyCode.UpArrow, 'ArrowDown': KeyCode.DownArrow,
      'ArrowLeft': KeyCode.LeftArrow, 'ArrowRight': KeyCode.RightArrow,
      'Home': KeyCode.Home, 'End': KeyCode.End,
      'PageUp': KeyCode.PageUp, 'PageDown': KeyCode.PageDown,
      'BracketLeft': KeyCode.BracketLeft, 'BracketRight': KeyCode.BracketRight,
      'Semicolon': KeyCode.Semicolon, 'Quote': KeyCode.Quote,
      'Comma': KeyCode.Comma, 'Period': KeyCode.Period,
      'Slash': KeyCode.Slash, 'Backslash': KeyCode.Backslash,
      'Backquote': KeyCode.Backquote, 'Minus': KeyCode.Minus,
      'Equal': KeyCode.Equal,
    };
    return map[code] ?? KeyCode.Unknown;
  }

  private sortByPriority(): void {
    this.bindings.sort((a, b) => {
      const aSpec = a.when?.specificity() ?? 0;
      const bSpec = b.when?.specificity() ?? 0;
      if (aSpec !== bSpec) return bSpec - aSpec;
      return b.priority - a.priority;
    });
  }

  private clearChordTimeout(): void {
    if (this.chordState.timeout) {
      clearTimeout(this.chordState.timeout);
      this.chordState.timeout = null;
    }
  }

  dispose(): void {
    this.clearChordTimeout();
    this.bindings = [];
  }
}
```

### 5.4 When Clause Parser and Evaluation Engine

```typescript
// Tokenizer
type TokenType = 'KEY' | 'STRING' | 'NUMBER' | 'REGEX' | 'OPERATOR' | 'PAREN' | 'BOOLEAN';
interface Token { type: TokenType; value: string; pos: number; }

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const re = /\s*(=>|!=|==|<=|>=|=~|\|\||&&|[!()]|in\b|notIn\b|has\b|true\b|false\b|'[^']*'|\/[^/]*\/[gim]*|[a-zA-Z_][\w.]*|-?\d+(\.\d+)?|\S)\s*/g;
  let match;
  while ((match = re.exec(input)) !== null) {
    const raw = match[1];
    if (raw === '||' || raw === '&&' || raw === '!' || raw === '==' || raw === '!=' || raw === '=~' || raw === '<' || raw === '<=' || raw === '>' || raw === '>=' || raw === 'in' || raw === 'notIn' || raw === 'has')
      tokens.push({ type: 'OPERATOR', value: raw, pos: match.index });
    else if (raw === '(' || raw === ')')
      tokens.push({ type: 'PAREN', value: raw, pos: match.index });
    else if (raw === 'true' || raw === 'false')
      tokens.push({ type: 'BOOLEAN', value: raw, pos: match.index });
    else if (raw.startsWith("'") && raw.endsWith("'"))
      tokens.push({ type: 'STRING', value: raw.slice(1, -1), pos: match.index });
    else if (raw.startsWith('/'))
      tokens.push({ type: 'REGEX', value: raw, pos: match.index });
    else if (/^-?\d+(\.\d+)?$/.test(raw))
      tokens.push({ type: 'NUMBER', value: raw, pos: match.index });
    else
      tokens.push({ type: 'KEY', value: raw, pos: match.index });
  }
  return tokens;
}

// AST Nodes
type AstNode =
  | { type: 'literal'; value: boolean | string | number | RegExp }
  | { type: 'key'; name: string }
  | { type: 'unary'; operator: '!'; operand: AstNode }
  | { type: 'binary'; operator: string; left: AstNode; right: AstNode }
  | { type: 'group'; expression: AstNode };

// Parser (recursive descent)
class WhenParser {
  private tokens: Token[] = [];
  private pos = 0;

  parse(input: string): AstNode {
    this.tokens = tokenize(input);
    this.pos = 0;
    const result = this.parseOr();
    if (this.pos < this.tokens.length)
      throw new Error('Unexpected token ' + this.tokens[this.pos].value);
    return result;
  }

  private parseOr(): AstNode {
    let left = this.parseAnd();
    while (this.peek()?.value === '||') { this.advance(); left = { type: 'binary', operator: '||', left, right: this.parseAnd() }; }
    return left;
  }

  private parseAnd(): AstNode {
    let left = this.parseNot();
    while (this.peek()?.value === '&&') { this.advance(); left = { type: 'binary', operator: '&&', left, right: this.parseNot() }; }
    return left;
  }

  private parseNot(): AstNode {
    if (this.peek()?.value === '!') { this.advance(); return { type: 'unary', operator: '!', operand: this.parsePrimary() }; }
    return this.parsePrimary();
  }

  private parsePrimary(): AstNode {
    const token = this.advance();
    if (!token) throw new Error('Unexpected end');
    if (token.type === 'BOOLEAN') return { type: 'literal', value: token.value === 'true' };
    if (token.type === 'STRING') return { type: 'literal', value: token.value };
    if (token.type === 'NUMBER') return { type: 'literal', value: parseFloat(token.value) };
    if (token.type === 'REGEX') {
      const m = token.value.match(/^\/(.*)\/([gim]*)$/);
      return { type: 'literal', value: new RegExp(m![1], m![2]) };
    }
    if (token.type === 'KEY') {
      const op = this.peek();
      if (op && op.type === 'OPERATOR' && ['==','!=','=~','<','<=','>','>=','in','notIn'].includes(op.value)) {
        this.advance();
        return { type: 'binary', operator: op.value, left: { type: 'key', name: token.value }, right: this.parseLiteral() };
      }
      return { type: 'key', name: token.value };
    }
    if (token.type === 'OPERATOR' && token.value === 'has') {
      const open = this.advance();
      if (!open || open.value !== '(') throw new Error('Expected ( after has');
      const keyNode = this.parsePrimary();
      const close = this.advance();
      if (!close || close.value !== ')') throw new Error('Expected ) after has argument');
      return keyNode;
    }
    if (token.type === 'PAREN' && token.value === '(') {
      const expr = this.parseOr();
      const close = this.advance();
      if (!close || close.value !== ')') throw new Error('Expected )');
      return { type: 'group', expression: expr };
    }
    throw new Error('Unexpected token ' + token.value);
  }

  private parseLiteral(): AstNode {
    const token = this.advance();
    if (!token) throw new Error('Expected literal');
    if (token.type === 'STRING') return { type: 'literal', value: token.value };
    if (token.type === 'NUMBER') return { type: 'literal', value: parseFloat(token.value) };
    if (token.type === 'BOOLEAN') return { type: 'literal', value: token.value === 'true' };
    if (token.type === 'REGEX') {
      const m = token.value.match(/^\/(.*)\/([gim]*)$/);
      return { type: 'literal', value: new RegExp(m![1], m![2]) };
    }
    throw new Error('Expected literal, got ' + token.value);
  }

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private advance(): Token | undefined { return this.tokens[this.pos++]; }
}

// Context Key Service
export class ContextKeyService {
  private keys = new Map<string, unknown>();
  setKey(key: string, value: unknown): void { this.keys.set(key, value); }
  getKey(key: string): unknown { return this.keys.get(key); }
  hasKey(key: string): boolean { return this.keys.has(key); }
  allKeys(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.keys) result[key] = value;
    return result;
  }
}

// WhenClause evaluator
export class WhenClause {
  private ast: AstNode;
  private parser = new WhenParser();

  constructor(expression: string) { this.ast = this.parser.parse(expression); }

  evaluate(context: ContextKeyService): boolean { return this.evaluateNode(this.ast, context); }
  specificity(): number { return this.countKeys(this.ast); }
  collectKeys(): string[] { const k: string[] = []; this.collectKeysFromNode(this.ast, k); return [...new Set(k)]; }

  private evaluateNode(node: AstNode, context: ContextKeyService): boolean {
    switch (node.type) {
      case 'literal': return !!node.value;
      case 'key': return !!context.getKey(node.name);
      case 'unary': return !this.evaluateNode(node.operand, context);
      case 'group': return this.evaluateNode(node.expression, context);
      case 'binary': {
        switch (node.operator) {
          case '||': return this.evaluateNode(node.left, context) || this.evaluateNode(node.right, context);
          case '&&': return this.evaluateNode(node.left, context) && this.evaluateNode(node.right, context);
          case '==': return this.evaluateToValue(node.left, context) === this.evaluateToValue(node.right, context);
          case '!=': return this.evaluateToValue(node.left, context) !== this.evaluateToValue(node.right, context);
          case '=~': {
            const s = String(this.evaluateToValue(node.left, context));
            const r = this.evaluateToValue(node.right, context);
            return r instanceof RegExp && r.test(s);
          }
          case '<': return Number(this.evaluateToValue(node.left, context)) < Number(this.evaluateToValue(node.right, context));
          case '<=': return Number(this.evaluateToValue(node.left, context)) <= Number(this.evaluateToValue(node.right, context));
          case '>': return Number(this.evaluateToValue(node.left, context)) > Number(this.evaluateToValue(node.right, context));
          case '>=': return Number(this.evaluateToValue(node.left, context)) >= Number(this.evaluateToValue(node.right, context));
          case 'in': {
            const left = this.evaluateToValue(node.left, context);
            const right = this.evaluateToValue(node.right, context);
            return Array.isArray(right) && right.includes(left);
          }
          case 'notIn': {
            const left = this.evaluateToValue(node.left, context);
            const right = this.evaluateToValue(node.right, context);
            return Array.isArray(right) && !right.includes(left);
          }
          default: return false;
        }
      }
      default: return false;
    }
  }

  private evaluateToValue(node: AstNode, context: ContextKeyService): unknown {
    switch (node.type) {
      case 'literal': return node.value;
      case 'key': return context.getKey(node.name);
      case 'group': return this.evaluateNode(node, context);
      default: return this.evaluateNode(node, context);
    }
  }

  private countKeys(node: AstNode): number {
    if (node.type === 'key') return 1;
    if (node.type === 'unary') return this.countKeys(node.operand);
    if (node.type === 'binary') return this.countKeys(node.left) + this.countKeys(node.right);
    if (node.type === 'group') return this.countKeys(node.expression);
    return 0;
  }

  private collectKeysFromNode(node: AstNode, keys: string[]): void {
    if (node.type === 'key') keys.push(node.name);
    else if (node.type === 'unary') this.collectKeysFromNode(node.operand, keys);
    else if (node.type === 'binary') { this.collectKeysFromNode(node.left, keys); this.collectKeysFromNode(node.right, keys); }
    else if (node.type === 'group') this.collectKeysFromNode(node.expression, keys);
  }
}

// Usage:
const when = new WhenClause("editorFocus && resourceExtname == '.ts' && !editorReadonly");
const ctx = new ContextKeyService();
ctx.setKey('editorFocus', true);
ctx.setKey('resourceExtname', '.ts');
ctx.setKey('editorReadonly', false);
console.log(when.evaluate(ctx)); // true
```

### 5.5 ThemeService with Dynamic Switching

```typescript
export interface ColorTheme {
  id: string;
  name: string;
  type: 'dark' | 'light' | 'hc-black' | 'hc-light';
  colors: Record<string, string>;
  tokenColors?: TextMateRule[];
  semanticHighlighting?: boolean;
  semanticTokenColors?: Record<string, string | SemanticTokenRule>;
}

export interface ColorThemeChangeEvent {
  theme: ColorTheme;
  previousTheme: ColorTheme | null;
}

export class ThemeService {
  private themes = new Map<string, ColorTheme>();
  private currentTheme: ColorTheme | null = null;
  private _onDidChangeColorTheme = new EventEmitter<ColorThemeChangeEvent>();
  readonly onDidChangeColorTheme: Event<ColorThemeChangeEvent> = (cb) => this._onDidChangeColorTheme.on(cb);
  private _onWillChangeColorTheme = new EventEmitter<ColorThemeChangeEvent>();
  readonly onWillChangeColorTheme: Event<ColorThemeChangeEvent> = (cb) => this._onWillChangeColorTheme.on(cb);

  constructor(
    private colorRegistry: ColorRegistry,
    private cssVariableManager: CssVariableManager,
    private monacoAdapter: MonacoThemeAdapter,
    private settingsService: IConfigurationService,
    private eventBus: IEventBus
  ) {}

  registerTheme(id: string, path: string, label: string, uiTheme: string): void {
    this.themes.set(id, { id, name: label, type: this.mapUiTheme(uiTheme), colors: {}, path } as any);
  }

  async loadAndApplyTheme(themeId: string): Promise<void> {
    const themeMeta = this.themes.get(themeId);
    if (!themeMeta) throw new Error('Theme ' + themeId + ' not registered');
    const response = await fetch((themeMeta as any).path);
    const data = await response.json();
    const theme: ColorTheme = {
      id: themeId,
      name: data.name ?? themeId,
      type: data.type ?? 'dark',
      colors: data.colors ?? {},
      tokenColors: data.tokenColors,
      semanticHighlighting: data.semanticHighlighting,
      semanticTokenColors: data.semanticTokenColors,
    };
    await this.setTheme(theme);
  }

  async setTheme(theme: ColorTheme): Promise<void> {
    const event: ColorThemeChangeEvent = { theme, previousTheme: this.currentTheme };
    this._onWillChangeColorTheme.emit(event);

    // Step 1: Color registry
    this.colorRegistry.applyTheme(theme);

    // Step 2: CSS variables
    const cssVars: Record<string, string> = {};
    for (const [key, value] of Object.entries(theme.colors)) {
      cssVars['--vscode-' + key.replace(/\./g, '-')] = value;
    }
    this.cssVariableManager.applyAll(cssVars);

    // Step 3: Document attributes
    document.documentElement.setAttribute('data-theme', theme.type);
    document.documentElement.setAttribute('data-theme-id', theme.id);
    document.documentElement.style.colorScheme = theme.type === 'dark' ? 'dark' : 'light';

    // Step 4: Monaco theme
    await this.monacoAdapter.applyTheme(theme);

    // Step 5: Re-tokenize
    await this.monacoAdapter.retokenizeEditors();

    // Step 6: Persist
    await this.settingsService.updateValue('workbench.colorTheme', theme.id, ConfigurationTarget.User);

    // Step 7: Notify
    this.currentTheme = theme;
    this._onDidChangeColorTheme.emit(event);

    // Step 8: NATS event
    await this.eventBus.publish('theme.changed', { themeId: theme.id, themeType: theme.type });
  }

  getCurrentTheme(): ColorTheme | null { return this.currentTheme; }
  getAvailableThemes(): { id: string; label: string; type: string }[] {
    return Array.from(this.themes.entries()).map(([id, t]) => ({ id, label: t.name, type: t.type }));
  }

  private mapUiTheme(uiTheme: string): 'dark' | 'light' | 'hc-black' | 'hc-light' {
    switch (uiTheme) {
      case 'vs-dark': return 'dark';
      case 'vs': return 'light';
      case 'hc-black': return 'hc-black';
      case 'hc-light': return 'hc-light';
      default: return 'dark';
    }
  }
}

// Monaco Theme Adapter
export class MonacoThemeAdapter {
  async applyTheme(theme: ColorTheme): Promise<void> {
    const monacoTheme = {
      base: theme.type === 'dark' ? 'vs-dark' : 'vs',
      inherit: true,
      rules: this.convertTokenColors(theme),
      colors: theme.colors,
    };
    editor.defineTheme(theme.id, monacoTheme);
    editor.setTheme(theme.id);
  }

  async retokenizeEditors(): Promise<void> {
    const models = editor.getModels();
    for (const model of models) {
      model.forceTokenization?.(model.getVersionId());
    }
  }

  private convertTokenColors(theme: ColorTheme): editor.ITokenThemeRule[] {
    const rules: editor.ITokenThemeRule[] = [];
    for (const rule of theme.tokenColors ?? []) {
      const scopes = Array.isArray(rule.scope) ? rule.scope : [rule.scope ?? ''];
      for (const scope of scopes) {
        rules.push({
          token: scope,
          foreground: rule.settings?.foreground,
          background: rule.settings?.background,
          fontStyle: rule.settings?.fontStyle,
        });
      }
    }
    return rules;
  }
}

// CSS Variable Manager
export class CssVariableManager {
  private root = document.documentElement;
  apply(variable: string, value: string): void { this.root.style.setProperty(variable, value); }
  applyAll(variables: Record<string, string>): void { for (const [k, v] of Object.entries(variables)) this.root.style.setProperty(k, v); }
  remove(variable: string): void { this.root.style.removeProperty(variable); }
  get(variable: string): string { return getComputedStyle(this.root).getPropertyValue(variable).trim(); }
}
```

### 5.6 ColorTheme to CSS Variable Binding

```typescript
export class ColorThemeBinder {
  constructor(
    private themeService: ThemeService,
    private cssManager: CssVariableManager
  ) {}

  // React hook for consuming themes
  useTheme(): { theme: ColorTheme | null; colors: Record<string, string>; isDark: boolean } {
    const [theme, setTheme] = React.useState(this.themeService.getCurrentTheme());
    const [colors, setColors] = React.useState<Record<string, string>>({});
    React.useEffect(() => {
      const d = this.themeService.onDidChangeColorTheme((event) => {
        setTheme(event.theme);
        setColors(this.resolveAllColors(event.theme));
      });
      if (theme) setColors(this.resolveAllColors(theme));
      return () => d.dispose();
    }, []);
    return { theme, colors, isDark: theme?.type === 'dark' || theme?.type === 'hc-black' };
  }

  resolveAllColors(theme: ColorTheme): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(theme.colors)) {
      result[key] = this.cssManager.get('--vscode-' + key.replace(/\./g, '-')) || value;
    }
    return result;
  }

  getColor(colorKey: string): string {
    return this.cssManager.get('--vscode-' + colorKey.replace(/\./g, '-')) || this.getFallback(colorKey);
  }

  private getFallback(colorKey: string): string {
    const fallbacks: Record<string, string> = {
      'editor.background': '#1e1e2e',
      'editor.foreground': '#cdd6f4',
      'sideBar.background': '#181825',
      'activityBar.background': '#11111b',
      'statusBar.background': '#11111b',
    };
    return fallbacks[colorKey] ?? '#000000';
  }
}

// CSS variable to React component binding
export function useThemeColor(colorKey: string): string {
  const [color, setColor] = React.useState<string>('');
  React.useEffect(() => {
    const cssVar = '--vscode-' + colorKey.replace(/\./g, '-');
    const update = () => setColor(getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme'] });
    update();
    return () => observer.disconnect();
  }, [colorKey]);
  return color;
}
```


---

## 6. Conexoes

O sistema de Settings, Keybindings e Themes integra-se com os demais estudos da arquitetura IDEIA:

### 6.1 S34 — Monaco Editor

O Monaco Editor e o consumidor primario dos tres sistemas:

```
S39 (Settings, Keybindings, Themes)           S34 (Monaco Editor)
+---------------------------+                +------------------------+
| ConfigurationService     |--- fontSize -->| editor.updateOptions() |
| (editor.* settings)      |--- tabSize -->| modelo.updateOptions() |
+---------------------------+                +------------------------+
+---------------------------+                +------------------------+
| KeybindingService        |--- resolve -->| editor.addAction()     |
| (when clauses)           |--- context -->| editor context keys    |
+---------------------------+                +------------------------+
+---------------------------+                +------------------------+
| ThemeService             |--- colors -->| editor.defineTheme()   |
| (color registry)         |-- tokens -->| editor.setTheme()      |
+---------------------------+                +------------------------+
```

| Aspecto | S39 (Settings/Keybindings/Theme) | S34 (Monaco) | Integracao |
|---------|----------------------------------|-------------|------------|
| Config | editor.* settings resolvidos | editor.updateOptions | PreferencesService |
| Keybindings | when clause evaluation | editor.addKeybindingRules | KeybindingService wrapper |
| Themes | ColorTheme + TokenColors | editor.defineTheme | MonacoThemeAdapter |
| Commands | CommandPaletteModel | editor.trigger | CommandService |

### 6.2 S35 — File System & Workspace

O workspace e o storage dos arquivos de configuracao:

| Ponto de Integracao | S39 | S35 |
|--------------------|-----|-----|
| Settings files | SettingsWatcher | FileSystemProviderRegistry |
| Workspace settings | ConfigurationTarget.Workspace | WorkspaceService.getConfiguration |
| Folder settings | ConfigurationTarget.WorkspaceFolder | FileTreeModel (detecta .vscode) |
| Settings.json write | ISettingsStorage.save | FileSystemProvider.writeFile |
| Keybindings.json | KeybindingRecorder.writeToFile | FileSystemProvider.writeFile |
| Theme JSON loading | ThemeService.loadAndApplyTheme | FileSystemProvider.readFile |

### 6.3 S36 — Extension Host

As extensoes contribuem com settings, keybindings e themes via manifest:

| Contribution Point | S39 | S36 (Extension Host) |
|-------------------|-----|---------------------|
| contributes.configuration | ConfigurationSchemaRegistry | ExtensionScanner le package.json |
| contributes.keybindings | KeybindingService | ExtensionScanner registra bindings |
| contributes.themes | ThemeService | ExtensionScanner registra temas |
| contributes.iconThemes | ThemeService | ExtensionScanner registra icon themes |
| contributes.productIconThemes | ThemeService | ExtensionScanner registra product themes |
| workspace.getConfiguration | SettingsService.getConfiguration | Extension API proxy |
| onDidChangeConfiguration | SettingsService.onDidChangeConfiguration | Extension API proxy |

### 6.4 S40 — Layout

O layout usa settings para controlar visibilidade, temas para cores de painel e keybindings para navegacao:

```
S40 Layout                     S39 Theme                     S39 Settings
+---------------+              +---------------+              +----------------+
| SideBar      |<--color----->| sideBar.*     |              | workbench.*    |
| ActivityBar  |<--color----->| activityBar.* |              | layout control |
| Panel        |<--color----->| panel.*       |     +------->| workbench.panel|
| StatusBar    |<--color----->| statusBar.*   |     |        | .position      |
| Tabs         |<--color----->| tab.*         |     |        +----------------+
+------+-------+              +---------------+     |
       |                                            |
       +------ S39 Keybinding ----------------------+
              Ctrl+B -> toggleSidebar
              Ctrl+J -> togglePanel
```

### 6.5 S25 — Perfis de Usuario

Perfis de usuario sao colecoes nomeadas de settings + keybindings + theme que podem ser ativadas como um grupo:

```typescript
export interface UserProfile {
  id: string;
  name: string;
  settings: Record<string, unknown>;
  keybindings: { key: string; command: string; when?: string }[];
  colorTheme?: string;
  iconTheme?: string;
  productIconTheme?: string;
}

export class ProfileManager {
  applyProfile(profile: UserProfile): void {
    for (const [key, value] of Object.entries(profile.settings)) {
      this.settingsService.updateValue(key, value, ConfigurationTarget.User);
    }
    if (profile.colorTheme) this.themeService.loadAndApplyTheme(profile.colorTheme);
    if (profile.iconTheme) this.themeService.setIconTheme(profile.iconTheme);
  }
}
```

### 6.6 Cross-Reference Matrix

| Estudo | Conexao | Dependencia |
|--------|---------|-------------|
| S34 (Monaco Editor) | Editor settings, keybindings, themes | Editor depende de S39 para config |
| S35 (FileSystem) | Storage de settings/keybindings JSON | Watcher depende do VFS |
| S36 (Extension Host) | Contribution points | Extension manifest depende de S39 |
| S40 (Layout) | Cores de UI, shortcuts | Layout depende de ThemeService |
| S25 (Perfis) | Profile = settings + keybindings + theme | ProfileManager consome S39 |
| S21 (LSP/DAP) | Semantic token colors | ThemeService re-tokeniza apos troca |
| S38 (Intelligence) | Agent settings (model, maxTokens) | Agent config via SettingsService |
| F1 (NATS) | Cloud sync de settings | SettingsService publica via NATS |

---

## 7. Plano de Implementacao

### Fase 1 — Settings Core (1 semana)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 1.1 | Implementar ConfigurationPropertySchema + ConfigurationScope | 4h |
| 1.2 | Implementar ConfigurationSchemaRegistry (register, get, validate) | 6h |
| 1.3 | Implementar SettingsService (hierarchy resolution, layers) | 10h |
| 1.4 | Implementar ISettingsStorage com SQLite + JSON file fallback | 10h |
| 1.5 | Implementar SettingsWatcher (FileSystemWatcher + NATS) | 6h |
| 1.6 | Implementar WorkspaceConfiguration + ConfigurationTarget | 4h |
| 1.7 | Implementar inspect() com todos os escopos | 4h |
| 1.8 | Testes de unidade (resolucao, validacao, watcher) | 8h |

**Total Fase 1:** 52h

### Fase 2 — Keybindings Core (1 semana)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 2.1 | Implementar KeyCode enum + IKeybindingEvent | 4h |
| 2.2 | Implementar KeyChord + ResolvedKeybinding | 3h |
| 2.3 | Implementar WhenClause (tokenizer, parser, evaluator) | 10h |
| 2.4 | Implementar ContextKeyService | 3h |
| 2.5 | Implementar KeybindingResolver (resolution algorithm) | 10h |
| 2.6 | Implementar Chord detection + timeout | 4h |
| 2.7 | Implementar KeybindingConflictDetector | 6h |
| 2.8 | Implementar KeybindingRecorder (state machine, UI support) | 8h |
| 2.9 | Implementar CommandPaletteModel (fuzzy search, recent) | 6h |
| 2.10 | Testes de unidade | 10h |

**Total Fase 2:** 64h

### Fase 3 — Themes Core (1 semana)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 3.1 | Implementar ColorTheme interface + ColorDefaults | 3h |
| 3.2 | Implementar ColorRegistry (register, resolve, apply) | 6h |
| 3.3 | Implementar CssVariableManager (apply CSS custom properties) | 4h |
| 3.4 | Implementar MonacoThemeAdapter (defineTheme, setTheme) | 6h |
| 3.5 | Implementar ThemeService (set, load, register, events) | 10h |
| 3.6 | Implementar Icon Theme (format, resolution, registration) | 8h |
| 3.7 | Implementar Product Icon Theme (font icons, references) | 6h |
| 3.8 | Implementar Token color customization (textMateRules + semantic) | 8h |
| 3.9 | Implementar Dynamic theme switching lifecycle | 6h |
| 3.10 | Testes de unidade | 8h |

**Total Fase 3:** 65h

### Fase 4 — Settings Editor UI (4 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 4.1 | Implementar SettingsEditor widget (Theia) — categoria, busca | 10h |
| 4.2 | Implementar Settings JSON editor (completacao, hover, validacao) | 8h |
| 4.3 | Implementar Settings diff view (user vs workspace) | 6h |
| 4.4 | Implementar Language-specific settings editor | 4h |
| 4.5 | Testes | 6h |

**Total Fase 4:** 34h

### Fase 5 — Integracao e Polish (4 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 5.1 | Integrar ThemeService com Monaco via adapter | 6h |
| 5.2 | Integrar KeybindingService com CommandService | 4h |
| 5.3 | Integrar SettingsWatcher com FileSystemProviderRegistry | 4h |
| 5.4 | Implementar config sync via NATS | 6h |
| 5.5 | Implementar ProfileManager (S25 integracao) | 6h |
| 5.6 | Implementar UI theme picker (dropdown + preview) | 6h |
| 5.7 | Implementar UI keybinding editor (recording UI) | 8h |
| 5.8 | Testes de integracao | 8h |
| 5.9 | Documentacao | 4h |

**Total Fase 5:** 52h

### Cronograma

```
Semana 1: Fase 1 — Settings Core (52h)
Semana 2: Fase 2 — Keybindings Core (64h)
Semana 3: Fase 3 — Themes Core (65h)
Semana 4: Fase 4 — Settings Editor UI (34h) + inicio Fase 5
Semana 5: Fase 5 — Integracao e Polish (52h)
```

**Esforco total estimado:** ~267h (5 semanas)
**Dependencias:** S34 (Monaco Editor), S35 (FileSystem), S36 (Extension Host), S40 (Layout)
**Entregavel:** packages/ideia-settings/, packages/ideia-keybindings/, packages/ideia-themes/ com todos os modulos, 300+ testes

### Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Conflito keybindings entre extensoes | Alta | Medio | ConflictDetector + notificacao ao usuario |
| Complexidade when clause parser | Media | Alto | Test coverage parser + validacao de expressao |
| Performance resolucao com 1000+ bindings | Media | Medio | Indice Map<chord, binding[]> para lookup O(1) |
| Tema Monaco vs CSS variable divergencia | Media | Alto | Teste de snapshot comparando Monaco theme vs CSS |
| SQLite concorrencia multi-processo | Baixa | Alto | WAL mode + lock retry |
| Theia keybinding overlap | Media | Medio | Namespace IDEIA prefixo, testar overlap em CI |

### Metricas

| Metrica | Alvo | Medicao |
|---------|------|---------|
| Settings resolucao | <5ms | performance.now() |
| Keybinding lookup (1000 bindings) | <1ms | Microbenchmark |
| When clause evaluation | <0.1ms | Microbenchmark |
| Theme switch (full cycle) | <200ms | ThemeService events |
| CSS variable update | <5ms | MutationObserver |
| Monaco retokenize (10K lines) | <500ms | Editor event |
| Settings file watch latency | <50ms | FileSystemWatcher |
| Command palette search (1000 commands) | <50ms | fuzzyScore benchmark |

---

## Referencias

1. VS Code Settings API: https://code.visualstudio.com/api/references/contribution-points#contributes.configuration
2. VS Code Keybindings: https://code.visualstudio.com/docs/getstarted/keybindings
3. VS Code Theme Colors: https://code.visualstudio.com/api/references/theme-color
4. TextMate Grammar: https://macromates.com/manual/en/language_grammars
5. Semantic Token Colors: https://code.visualstudio.com/api/extension-guides/semantic-tokens
6. Monaco Editor Theme: https://microsoft.github.io/monaco-editor/api/interfaces/editor.IStandaloneThemeData.html
7. Eclipse Theia Preferences: https://theia-ide.org/docs/preferences/
8. VS Code Icon Themes: https://code.visualstudio.com/api/extension-guides/icon-theme

---

> **Fim do Estudo S39**
> *Proximo: S40 — Layout System*
> *Relacionado: S34 (Monaco), S35 (FileSystem), S36 (Extension Host), S40 (Layout), S25 (Perfis)*
