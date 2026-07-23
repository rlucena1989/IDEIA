# ESTUDO S34 — Theia Editor & Widget Architecture

> **Arquitetura completa do sistema de editores e widgets do Eclipse Theia para a plataforma IDEIA**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — Editor widget hierarchy, editor manager, contributions, navigation, diff editor, widget system, factory, open handlers |

---

## Sumario

1. [Introducao](#1-introducao)
2. [Editor Widget Architecture](#2-editor-widget-architecture)
3. [Editor Manager & Editor Registry](#3-editor-manager--editor-registry)
4. [Editor Contributions](#4-editor-contributions)
5. [Navigation & History](#5-navigation--history)
6. [Diff Editor](#6-diff-editor)
7. [Editor Widget Types](#7-editor-widget-types)
8. [Text Model & Document](#8-text-model--document)
9. [Editor Preferences](#9-editor-preferences)
10. [Widget System Foundation](#10-widget-system-foundation)
11. [Widget Factory](#11-widget-factory)
12. [Editor Widget Factory](#12-editor-widget-factory)
13. [OpenHandlers](#13-openhandlers)
14. [Code Examples](#14-code-examples)
15. [Conexoes](#15-conexoes)
16. [Plano de Implementacao](#16-plano-de-implementacao)

---

## 1. Introducao

O sistema de editores do Eclipse Theia e uma das camadas mais importantes da plataforma. Diferente de uma aplicacao que consome o Monaco Editor diretamente, o Theia abstrai o editor em uma arquitetura em camadas que permite extensibilidade total, substituicao de implementacao, e controle de ciclo de vida completo.

### 1.1 Visao Arquitetural

O Theia nao expoe o Monaco Editor diretamente para extensoes. Em vez disso, ele constroi uma piramide de abstracao:

```
+------------------------------------------------------------------+
|                      THEIA EDITOR ARCHITECTURE                     |
|                                                                    |
|  +-------------------------------------------------------------+  |
|  |              THEIA EDITOR LAYER (@theia/editor)             |  |
|  |  EditorWidget     EditorManager     EditorPreferences       |  |
|  |  IEditorContribution  NavigationLocationService             |  |
|  +---------------------------+---------------------------------+  |
|                              |                                    |
|  +---------------------------v---------------------------------+  |
|  |              MONACO LAYER (@theia/monaco)                  |  |
|  |  MonacoEditorService   MonacoTextModelService             |  |
|  |  MonacoToProtocolConverter  ProtocolToMonacoConverter       |  |
|  |  (Implementacao interna — nao exposta como API publica)    |  |
|  +---------------------------+---------------------------------+  |
|                              |                                    |
|  +---------------------------v---------------------------------+  |
|  |              MONACO EDITOR (core library)                   |  |
|  |  editor.ICodeEditor   editor.ITextModel                    |  |
|  |  StandaloneEditor     StandaloneDiffEditor                 |  |
|  +-------------------------------------------------------------+  |
|                                                                    |
+------------------------------------------------------------------+
```

Theia usa o Monaco Editor como implementacao interna do editor de codigo. Extensoes nunca interagem com o Monaco diretamente — elas usam as interfaces do `@theia/editor`. Isso permite que, teoricamente, o Theia substitua o Monaco por outro editor sem quebrar extensoes.

### 1.2 Packages Envolvidos

| Package | Funcao | Depende de |
|---------|--------|------------|
| `@theia/editor` | Interfaces principais (EditorWidget, EditorManager) | `@theia/core` |
| `@theia/monaco` | Implementacao Monaco do editor | `@theia/editor`, monaco-editor |
| `@theia/editor-preview` | Editor Preview mode (tab provisorio) | `@theia/editor` |
| `@theia/bulk-edit` | Edicao em lote multi-arquivo | `@theia/editor` |
| `@theia/getting-started` | Welcome page widget | `@theia/core` |

### 1.3 Fluxo de Abertura de Editor

```
Usuario da duplo clique no arquivo "src/main.ts"
             |
             v
  FileTreeWidget (Explorer)
             |
             v
  OpenHandler Chain (aplica handlers por prioridade)
             |
             v
  EditorManager.open(uri)
             |
             v
  EditorWidgetFactory (cria widget via factory pattern)
             |
             v
  WidgetManager (gerencia instancia na dock)
             |
             v
  EditorWidget (widget Theia criado)
             |
             v
  MonacoEditor (inner `editor` property)
             |
             v
  Monaco ITextModel (documento interno)
             |
             v
  EditorWidget renderizado no DockPanel
```

### 1.4 Theia vs Exposicao Direta do Monaco

| Abordagem | Vantagens | Desvantagens |
|-----------|-----------|--------------|
| Theia Editor Layer | API estavel, extensivel, DI-friendly, substituivel | Overhead de abstracao, limitacoes na API |
| Monaco Direto | Acesso total a API do Monaco, sem intermediarios | Acoplamento forte, sem extensibilidade, quebra ao atualizar |

A IDEIA usa a camada Theia por padrao e acessa o Monaco internamente apenas quando funcionalidades avancadas (como inline completions customizadas) sao necessarias.

---

## 2. Editor Widget Architecture

### 2.1 Hierarquia de Widgets

O Theia organiza editores em uma hierarquia de classes que comeca no Widget base do Lumino e termina nos tipos concretos de editor:

```
Widget (Lumino)
  +-- BaseWidget (Theia)
       +-- Panel (Theia)
       |    +-- SplitPanel
       |    +-- DockPanel
       +-- TitleWidget (Theia)
       +-- EditorWidget (Theia, @theia/editor)
       |    +-- CodeEditorWidget (Theia, @theia/monaco)
       |    +-- DiffEditorWidget (Theia, @theia/monaco)
       |    +-- Custom Editor Widgets (extensoes)
       +-- Other Widgets (Explorer, Output, Terminal, etc.)
```

### 2.2 EditorWidget

`EditorWidget` e a classe base abstrata que todo editor Theia implementa. Ela estende `BaseWidget` e implementa `Saveable`, `SaveableSource`, `Navigatable` e `StatefulWidget`.

```typescript
// @theia/editor/src/browser/editor-widget.ts (conceitual)
@injectable()
export class EditorWidget extends BaseWidget implements
    Saveable,
    SaveableSource,
    Navigatable,
    StatefulWidget {

  protected editor: Editor;

  readonly onDirtyChanged: Event<void>;
  readonly onDocumentContentChanged: Event<TextDocumentContentChangeEvent>;

  get saveable(): Saveable {
    return this;
  }

  get dirty(): boolean {
    return this.editor.dirty;
  }

  async save(): Promise<void> {
    await this.editor.save();
  }

  async close(): Promise<void> {
    this.dispose();
  }

  // Navegacao — interface Navigatable
  get resourceUri(): URI | undefined {
    return this.editor.uri;
  }

  // Serializacao — interface StatefulWidget
  storeState(): object {
    return {
      uri: this.editor.uri.toString(),
      cursorState: this.editor.cursor,
      viewState: this.editor.viewState,
    };
  }

  restoreState(state: object): void {
    const { uri, cursorState, viewState } = state as any;
    if (uri) {
      this.editor.uri = new URI(uri);
    }
    if (cursorState) {
      this.editor.cursor = cursorState;
    }
    if (viewState) {
      this.editor.viewState = viewState;
    }
  }
}
```

### 2.3 Ciclo de Vida do EditorWidget

O ciclo de vida de um EditorWidget segue estados bem definidos:

```
NEW (instanciado pelo factory)
  |
  v
INIT (init(): liga modelo, configura listeners, cria decorations)
  |
  v
ACTIVATE (ativa no shell, foco no editor, start contribution session)
  |
  v
ACTIVE (recebe input do usuario, contributions ativas)
  |
  v
DEACTIVATE (perde foco, contribution session pause)
  |
  v
CLOSE (usuario fecha o widget)
  |
  v
DISPOSE (libera recursos: modelo, listeners, contributions, decorations)
  |
  v
DESTROYED (removido do WidgetManager, garbage collected)
```

Every stage is managed via Theia DI:

```typescript
// Ciclo de vida completo de um EditorWidget
export class EditorWidget extends BaseWidget {
  async init(): Promise<void> {
    this.toDispose.pushAll([
      this.editor.onDirtyChanged(() => this.updateDirty()),
      this.editor.onCursorPositionChanged(pos => this.onCursorChanged.fire(pos)),
      this.editor.onSelectionChanged(sel => this.onSelectionChanged.fire(sel)),
      this.title.changed.connect(() => this.updateTitle()),
    ]);
    this.addClass('theia-editor');
    this.updateTitle();
  }

  protected updateDirty(): void {
    this.title.modified = this.editor.dirty;
    if (this.editor.dirty) {
      this.title.className += ' theia-editor-dirty';
    }
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.toDispose.dispose();
    this.editor.dispose();
    super.dispose();
  }
}
```

### 2.4 Dirty State Management

Theia gerencia dirty state atraves da interface `Saveable`:

```typescript
interface Saveable {
  dirty: boolean;
  save(): Promise<void>;
  onDirtyChanged: Event<void>;
  onSaved?: Event<void>;
  onRejected?: Event<void>;
}
```

O TitleWidget reflete dirty state automaticamente:

| Estado | Indicacao Visual | Descricao |
|--------|-----------------|-----------|
| Clean | Nome do arquivo | Conteudo salvo, sem alteracoes |
| Dirty | Nome com bolinha/circle | Alteracoes nao salvas |
| Conflict | Icone de alerta | Arquivo modificado externamente |
| In-sync | Normal | Apos save, retorna a clean |

### 2.5 Editor Contributions

Editor contributions sao objetos que se anexam a um EditorWidget ativo e executam logicas quando o estado do editor muda:

```typescript
// @theia/editor/src/browser/editor-contribution.ts
export interface EditorContribution {
  readonly id: string;

  onInit?(editor: Editor): void;
  onActivate?(editor: Editor): void;
  onFocus?(editor: Editor): void;
  onBlur?(editor: Editor): void;
  onSelection?(editor: Editor, selection: Range): void;
  onCursorPosition?(editor: Editor, pos: Position): void;
  onLanguageChanged?(editor: Editor, language: string): void;
  onContentChanged?(editor: Editor, change: TextDocumentContentChangeEvent): void;
  onDispose?(editor: Editor): void;
}
```

Theia gerencia o ciclo de vida das contributions:

```typescript
export class EditorContributionManager {
  protected sessions = new Map<string, EditorContributionSession>();

  startSession(editor: Editor, contributions: EditorContribution[]): void {
    const session = new EditorContributionSession(editor, contributions);
    this.sessions.set(editor.uri.toString(), session);
    session.start();
  }

  stopSession(editor: Editor): void {
    const session = this.sessions.get(editor.uri.toString());
    if (session) {
      session.stop();
      this.sessions.delete(editor.uri.toString());
    }
  }
}

export class EditorContributionSession {
  constructor(
    protected editor: Editor,
    protected contributions: EditorContribution[],
  ) {}

  start(): void {
    for (const c of this.contributions) {
      c.onInit?.(this.editor);
    }
  }

  stop(): void {
    for (const c of this.contributions) {
      c.onDispose?.(this.editor);
    }
  }
}
```

---

## 3. Editor Manager & Editor Registry

### 3.1 EditorManager

`EditorManager` e o servico central que gerencia a criacao, abertura e fechamento de editores. E injetavel via DI e singleton no frontend.

```typescript
// @theia/editor/src/browser/editor-manager.ts
@injectable()
export class EditorManager {
  @inject(WidgetManager)
  protected readonly widgetManager: WidgetManager;

  @inject(EditorWidgetFactory)
  protected readonly editorWidgetFactory: EditorWidgetFactory;

  @inject(EditorRegistry)
  protected readonly editorRegistry: EditorRegistry;

  @inject(EditorPreferences)
  protected readonly editorPreferences: EditorPreferences;

  readonly onCreated: Event<EditorWidget>;
  readonly onActiveChanged: Event<EditorWidget | undefined>;
  readonly onCurrentChanged: Event<EditorWidget | undefined>;

  async open(uri: URI, options?: EditorOpenerOptions): Promise<EditorWidget> {
    const editor = await this.doOpen(uri, options);
    return editor;
  }

  async close(uri: URI): Promise<void> {
    const widget = this.all.find(w => w.resourceUri?.toString() === uri.toString());
    if (widget) {
      widget.close();
    }
  }

  get all(): EditorWidget[] {
    return this.widgetManager.getWidgets(EditorWidgetFactory.ID) as EditorWidget[];
  }

  get current(): EditorWidget | undefined {
    return this.all.find(w => w.isActive) ?? this.all[this.all.length - 1];
  }

  get active(): EditorWidget | undefined {
    return this.all.find(w => w.isVisible && w.isActive);
  }

  get recent(): EditorWidget[] {
    return this.all.slice().reverse();
  }

  async navigate(uri: URI, range?: Range): Promise<EditorWidget> {
    const widget = await this.open(uri);
    if (range && widget.editor) {
      widget.editor.selection = range;
      widget.editor.revealRange(range);
    }
    return widget;
  }

  protected async doOpen(uri: URI, options?: EditorOpenerOptions): Promise<EditorWidget> {
    const factoryId = this.resolveFactory(uri);
    const widgetOptions: WidgetFactoryOptions = {
      factoryId,
      uri: uri.toString(),
      options,
    };
    const widget = await this.widgetManager.getOrCreateWidget(factoryId, widgetOptions);
    this.shell.activateWidget(widget.id);
    return widget as EditorWidget;
  }

  protected resolveFactory(uri: URI): string {
    return this.editorRegistry.getEditorFactory(uri) ?? EditorWidgetFactory.ID;
  }
}
```

### 3.2 EditorManager Open Flow Detalhado

```
EditorManager.open(uri, options)
  |
  +-> editorRegistry.getEditorFactory(uri)
  |     Retorna factory ID baseado no scheme/content-type
  |
  +-> widgetManager.getOrCreateWidget(factoryId, options)
  |     Verifica se ja existe widget para a URI
  |     Se sim: reusa (se reuso ativado) ou cria novo
  |     Se nao: chama WidgetFactory.createWidget()
  |
  +-> resolve editor options
  |     EditorOpenerOptions:
  |       - selection?: Range (selecao inicial)
  |       - preview?: boolean (modo preview — tab provisorio)
  |       - sideBySide?: boolean (abre ao lado)
  |       - revealIfVisible?: boolean (foco se ja existir)
  |
  +-> shell.activateWidget(widget.id)
  |     Ativa o widget no DockPanel
  |
  +-> retorna EditorWidget
```

### 3.3 Editor Registry

O `EditorRegistry` mapeia URIs para factories de editor. Ele usa um sistema de prioridade para resolver qual factory atende qual URI.

```typescript
// @theia/editor/src/browser/editor-registry.ts
export interface EditorWidgetFactoryOption {
  factory: WidgetFactory;
  priority: number;
  match(uri: URI): boolean;
}

@injectable()
export class EditorRegistry {
  protected factories: EditorWidgetFactoryOption[] = [];

  registerEditorFactory(option: EditorWidgetFactoryOption): Disposable {
    this.factories.push(option);
    this.factories.sort((a, b) => b.priority - a.priority);
    return Disposable.create(() => {
      const idx = this.factories.indexOf(option);
      if (idx >= 0) this.factories.splice(idx, 1);
    });
  }

  getEditorFactory(uri: URI): string | undefined {
    for (const opt of this.factories) {
      if (opt.match(uri)) {
        return opt.factory.id;
      }
    }
    return undefined;
  }

  getFactories(): EditorWidgetFactoryOption[] {
    return [...this.factories];
  }
}
```

### 3.4 Priority System

| Prioridade | Tipo | Exemplo |
|------------|------|---------|
| 100 | Custom editor (extensao) | Editor grafico para `.drawio` |
| 75 | Content-type match | Editor JSON para `.json` |
| 50 | Language match | Editor especial para TypeScript |
| 25 | Extension match | Editor customizado para `.csv` |
| 10 | Default text editor | CodeEditorWidget (fallback) |

### 3.5 IEditorHandler

O `IEditorHandler` permite que extensoes interajam com todos os editores de forma global:

```typescript
export const IEditorHandler = Symbol('IEditorHandler');

export interface EditorHandler {
  onCreated?(editor: EditorWidget): void;
  onActiveChanged?(editor: EditorWidget | undefined): void;
  onClosed?(editor: EditorWidget): void;
}

export function bindEditorHandler(bind: interfaces.Bind, handler: {
  onCreated?: (editor: EditorWidget) => void;
  onActiveChanged?: (editor: EditorWidget | undefined) => void;
  onClosed?: (editor: EditorWidget) => void;
}): void {
  bind(IEditorHandler).toDynamicValue(() => handler);
}
```

### 3.6 Editor Watcher

O `EditorWatcher` e um servico que monitora mudancas no estado dos editores e emite eventos:

```typescript
@injectable()
export class EditorWatcher {
  protected readonly onActiveEditorChanged = new Emitter<EditorWidget | undefined>();
  protected readonly onEditorCreated = new Emitter<EditorWidget>();
  protected readonly onEditorClosed = new Emitter<EditorWidget>();

  readonly activeEditorChanged: Event<EditorWidget | undefined>;
  readonly editorCreated: Event<EditorWidget>;
  readonly editorClosed: Event<EditorWidget>;

  watch(manager: EditorManager): void {
    manager.onCreated(e => this.onEditorCreated.fire(e));
    manager.onActiveChanged(e => this.onActiveEditorChanged.fire(e));
  }
}
```

---

## 4. Editor Contributions

### 4.1 Visao Geral

Editor contributions seguem o mesmo padrao de todas as contribuicoes do Theia: comandos, menus, keybindings e preferencias sao registrados em classes injetaveis que implementam interfaces especificas.

```
+------------------------------------------------------------------+
|                    EDITOR CONTRIBUTIONS LAYER                       |
|                                                                    |
|  CommandContribution     MenuContribution      KeybindingContribution
|  (registra comandos      (registra menus       (registra atalhos
|   do editor)              do editor)            do editor)
|                                                                    |
|         v                       v                       v          |
|  CommandRegistry          MenuModelRegistry      KeybindingRegistry
|                                                                    |
+------------------------------------------------------------------+
```

### 4.2 EditorCommandContribution

Registra comandos que operam sobre o editor ativo:

```typescript
@injectable()
export class EditorCommandContribution implements CommandContribution {
  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(EditorCommands.GO_TO_LINE, {
      execute: () => this.goToLine(),
    });
    registry.registerCommand(EditorCommands.TOGGLE_COMMENT, {
      execute: () => this.toggleComment(),
    });
    registry.registerCommand(EditorCommands.INDENT, {
      execute: () => this.indent(),
    });
    registry.registerCommand(EditorCommands.OUTDENT, {
      execute: () => this.outdent(),
    });
    registry.registerCommand(EditorCommands.FORMAT, {
      execute: () => this.formatDocument(),
    });
    registry.registerCommand(EditorCommands.TOGGLE_MINIMAP, {
      isEnabled: () => true,
      execute: () => this.toggleMinimap(),
    });
    registry.registerCommand(EditorCommands.TOGGLE_RULER, {
      execute: () => this.toggleRuler(),
    });
  }

  protected get editor(): Editor | undefined {
    return this.editorManager.current?.editor;
  }

  protected get selection(): Selection | undefined {
    return this.editorManager.current?.editor?.selection;
  }
}
```

### 4.3 EditorMenuContribution

Adiciona itens aos menus do editor (menu bar, context menu):

```typescript
@injectable()
export class EditorMenuContribution implements MenuContribution {
  registerMenus(menus: MenuModelRegistry): void {
    menus.registerMenuAction(EditorContextMenu.NAVIGATION, {
      commandId: EditorCommands.GO_TO_LINE.id,
      label: 'Go to Line...',
    });

    menus.registerMenuAction(EditorContextMenu.NAVIGATION, {
      commandId: EditorCommands.GO_TO_SYMBOL.id,
      label: 'Go to Symbol...',
    });

    menus.registerMenuAction(EditorContextMenu.COMMANDS, {
      commandId: EditorCommands.TOGGLE_COMMENT.id,
      label: 'Toggle Line Comment',
    });

    menus.registerSubmenu(EditorContextMenu.COMMANDS, 'Format', [
      { commandId: EditorCommands.FORMAT.id },
      { commandId: EditorCommands.INDENT.id },
      { commandId: EditorCommands.OUTDENT.id },
    ]);

    menus.registerMenuAction(MainMenu.EDIT_GROUP, {
      commandId: EditorCommands.TOGGLE_MINIMAP.id,
      label: 'Toggle Minimap',
    });
  }
}
```

### 4.4 EditorKeybindingContribution

Registra atalhos de teclado para comandos do editor:

```typescript
@injectable()
export class EditorKeybindingContribution implements KeybindingContribution {
  registerKeybindings(keybindings: KeybindingRegistry): void {
    keybindings.registerKeybinding({
      command: EditorCommands.GO_TO_LINE.id,
      keybinding: 'ctrlcmd+g',
      when: 'editorFocus',
    });

    keybindings.registerKeybinding({
      command: EditorCommands.TOGGLE_COMMENT.id,
      keybinding: 'ctrlcmd+/',
      when: 'editorFocus',
    });

    keybindings.registerKeybinding({
      command: EditorCommands.INDENT.id,
      keybinding: 'Tab',
      when: 'editorTextFocus && !editorReadonly',
    });

    keybindings.registerKeybinding({
      command: EditorCommands.OUTDENT.id,
      keybinding: 'Shift+Tab',
      when: 'editorTextFocus && !editorReadonly',
    });

    keybindings.registerKeybinding({
      command: EditorCommands.FORMAT.id,
      keybinding: 'shift+alt+f',
      when: 'editorTextFocus',
    });

    keybindings.registerKeybinding({
      command: 'editor.action.insertLineAfter',
      keybinding: 'ctrlcmd+enter',
      when: 'editorTextFocus',
    });

    keybindings.registerKeybinding({
      command: 'editor.action.insertLineBefore',
      keybinding: 'ctrlcmd+shift+enter',
      when: 'editorTextFocus',
    });
  }
}
```

### 4.5 Editor Context Menu

Theia permite contribuir com menus de contexto especificos do editor:

```typescript
export namespace EditorContextMenu {
  export const NAVIGATION = [...MainMenu.MENU_BAR, '3_editor_navigation'];
  export const COMMANDS = [...MainMenu.MENU_BAR, '4_editor_commands'];
  export const EDITOR_ACTIONS = [...MainMenu.MENU_BAR, '5_editor_actions'];
}

// Paths padrao do editor context menu
export const EDITOR_CONTEXT_MENU = 'editor_context_menu';
export const EDITOR_LINE_NUMBER_CONTEXT_MENU = 'editor_line_number_context_menu';
export const EDITOR_TITLE_CONTEXT_MENU = 'editor_title_context_menu';
```

### 4.6 Editor Actions

Editor actions sao comandos que operam especificamente no contexto de um editor:

```typescript
// Actions built-in do Theia
registry.registerCommand(EditorCommands.SPLIT_EDITOR_RIGHT, {
  execute: () => this.splitEditor('right'),
});

registry.registerCommand(EditorCommands.SPLIT_EDITOR_DOWN, {
  execute: () => this.splitEditor('down'),
});

registry.registerCommand(EditorCommands.CLOSE_EDITOR, {
  execute: () => this.closeEditor(),
});

registry.registerCommand(EditorCommands.CLOSE_OTHER_EDITORS, {
  execute: () => this.closeOtherEditors(),
});

registry.registerCommand(EditorCommands.NAVIGATE_FORWARD, {
  execute: () => this.navigateForward(),
});

registry.registerCommand(EditorCommands.NAVIGATE_BACKWARD, {
  execute: () => this.navigateBackward(),
});
```

---

## 5. Navigation & History

### 5.1 NavigationLocationService

Theia fornece um sistema de historico de navegacao que permite voltar e avancar entre posicoes no codigo, similar ao de navegadores web:

```typescript
// @theia/editor/src/browser/navigation/navigation-location-service.ts
@injectable()
export class NavigationLocationService {
  protected stack: NavigationLocation[] = [];
  protected index = -1;
  protected readonly maxStackSize = 50;

  readonly onNavigated: Event<NavigationLocation>;

  get canGoBack(): boolean {
    return this.index > 0;
  }

  get canGoForward(): boolean {
    return this.index < this.stack.length - 1;
  }

  register(location: NavigationLocation): void {
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(location);
    if (this.stack.length > this.maxStackSize) {
      this.stack.shift();
    }
    this.index = this.stack.length - 1;
  }

  back(): NavigationLocation | undefined {
    if (!this.canGoBack) return undefined;
    this.index--;
    const loc = this.stack[this.index];
    this.onNavigated.fire(loc);
    return loc;
  }

  forward(): NavigationLocation | undefined {
    if (!this.canGoForward) return undefined;
    this.index++;
    const loc = this.stack[this.index];
    this.onNavigated.fire(loc);
    return loc;
  }

  clear(): void {
    this.stack = [];
    this.index = -1;
  }

  getLocations(): NavigationLocation[] {
    return [...this.stack];
  }

  getCurrentLocation(): NavigationLocation | undefined {
    return this.stack[this.index];
  }
}
```

### 5.2 NavigationLocation Types

Theia define tres tipos de localizacao de navegacao:

| Tipo | Representacao | Uso |
|------|--------------|-----|
| CursorPosition | URI + Position (linha, coluna) | Navegacao por cursor |
| EditorPosition | URI + Range | Navegacao por selecao/bloco |
| EditorLine | URI + line number | Navegacao por linha |

```typescript
export interface NavigationLocation {
  uri: URI;
  type: 'cursor' | 'editor' | 'line';
  timestamp: number;
}

export interface CursorPosition extends NavigationLocation {
  type: 'cursor';
  position: Position;
}

export interface EditorPosition extends NavigationLocation {
  type: 'editor';
  range: Range;
}

export interface EditorLine extends NavigationLocation {
  type: 'line';
  lineNumber: number;
}
```

### 5.3 Registro Automatico de Navegacao

O registro de navegacao e automatico, acionado pelo `EditorContributionManager`:

```typescript
@injectable()
export class NavigationContribution implements EditorContribution {
  readonly id = 'editor-navigation';

  @inject(NavigationLocationService)
  protected readonly navigationService: NavigationLocationService;

  private lastLocation?: CursorPosition;

  onCursorPosition(editor: Editor, pos: Position): void {
    const current: CursorPosition = {
      uri: editor.uri,
      type: 'cursor',
      position: pos,
      timestamp: Date.now(),
    };

    if (this.shouldRegister(current)) {
      this.navigationService.register(current);
    }

    this.lastLocation = current;
  }

  protected shouldRegister(current: CursorPosition): boolean {
    if (!this.lastLocation) return true;
    const lineDist = Math.abs(current.position.line - this.lastLocation.position.line);
    return lineDist > 10;
  }
}
```

### 5.4 Editor Position Navigation

Theia tambem suporta navegacao direta para posicoes especificas:

```typescript
// Navegacao para uma posicao especifica no editor
@injectable()
export class EditorNavigationService {
  @inject(EditorManager)
  protected readonly editorManager: EditorManager;

  async revealPosition(uri: URI, position: Position): Promise<void> {
    const widget = await this.editorManager.open(uri);
    if (widget.editor) {
      widget.editor.cursor = position;
      widget.editor.revealPosition(position);
    }
  }

  async revealRange(uri: URI, range: Range): Promise<void> {
    const widget = await this.editorManager.open(uri);
    if (widget.editor) {
      widget.editor.selection = range;
      widget.editor.revealRange(range);
    }
  }

  async revealLine(uri: URI, line: number): Promise<void> {
    await this.revealPosition(uri, { line, character: 0 });
  }
}
```

### 5.5 Line-based vs Offset-based Navigation

| Tipo | Metodo | Precisao | Custo |
|------|--------|----------|-------|
| Line-based | `editor.cursor = { line, character }` | Relativa (depende do viewport) | Baixo |
| Offset-based | `editor.revealPositionInCenter(pos)` | Exata (posicao absoluta) | Medio |
| Range-based | `editor.selection = range` | Exata (intervalo) | Medio |
| Offset raw | `model.getOffsetAt(position)` | Exata | Baixo (cache no modelo) |

```typescript
// Conversao entre offset e posicao line/character
function positionToOffset(model: TextModel, position: Position): number {
  let offset = 0;
  for (let l = 0; l < position.line; l++) {
    offset += model.getLineLength(l) + 1; // +1 para o \n
  }
  return offset + position.character;
}

function offsetToPosition(model: TextModel, offset: number): Position {
  let line = 0;
  let charOffset = offset;
  while (line < model.getLineCount()) {
    const lineLen = model.getLineLength(line) + 1;
    if (charOffset < lineLen) {
      return { line, character: charOffset };
    }
    charOffset -= lineLen;
    line++;
  }
  return { line: model.getLineCount() - 1, character: 0 };
}
```

### 5.6 Cursor State Preservation

O Theia preserva o estado do cursor entre sessoes atraves da serializacao do widget:

```typescript
export interface EditorCursorState {
  position: Position;
  selection: Range | undefined;
  viewState: {
    scrollTop: number;
    scrollLeft: number;
    firstVisibleLine: number;
    lastVisibleLine: number;
  };
}

// Preservacao entre sessoes
export function serializeCursorState(editor: Editor): EditorCursorState {
  return {
    position: editor.cursor,
    selection: editor.selection,
    viewState: {
      scrollTop: editor.scrollTop,
      scrollLeft: editor.scrollLeft,
      firstVisibleLine: editor.firstVisibleLine,
      lastVisibleLine: editor.lastVisibleLine,
    },
  };
}

export function restoreCursorState(editor: Editor, state: EditorCursorState): void {
  if (state.viewState) {
    editor.scrollTop = state.viewState.scrollTop;
    editor.scrollLeft = state.viewState.scrollLeft;
  }
  if (state.selection) {
    editor.selection = state.selection;
  } else {
    editor.cursor = state.position;
  }
  if (state.viewState) {
    editor.revealRange({
      start: { line: state.viewState.firstVisibleLine, character: 0 },
      end: { line: state.viewState.lastVisibleLine, character: 0 },
    });
  }
}
```

---

## 6. Diff Editor

### 6.1 DiffEditorWidget

Theia implementa diff editing atraves do `DiffEditorWidget`, que extende `EditorWidget` e encapsula o `StandaloneDiffEditor` do Monaco:

```typescript
// @theia/monaco/src/browser/diff-editor-widget.ts
@injectable()
export class DiffEditorWidget extends EditorWidget {
  @inject(MonacoEditorService)
  protected readonly monacoEditorService: MonacoEditorService;

  protected diffEditor: MonacoDiffEditor;

  get original(): Editor {
    return this.diffEditor.original;
  }

  get modified(): Editor {
    return this.diffEditor.modified;
  }

  async setModel(original: URI, modified: URI): Promise<void> {
    const originalModel = await this.monacoEditorService.createModel(original);
    const modifiedModel = await this.monacoEditorService.createModel(modified);
    this.diffEditor.setModel(originalModel, modifiedModel);
  }

  revealLine(line: number, side: 'original' | 'modified' = 'modified'): void {
    const editor = side === 'original' ? this.original : this.modified;
    editor.revealPosition({ line, character: 0 });
  }

  get changes(): DiffChange[] {
    return this.diffEditor.getChanges();
  }

  get hasChanges(): boolean {
    return this.changes.length > 0;
  }
}
```

### 6.2 DiffNavigator

O `DiffNavigator` permite navegar entre as diferencas de um diff editor:

```typescript
@injectable()
export class DiffNavigator {
  @inject(EditorManager)
  protected readonly editorManager: EditorManager;

  async nextChange(): Promise<void> {
    const editor = this.editorManager.current;
    if (!editor || !(editor instanceof DiffEditorWidget)) return;
    const changes = editor.changes;
    const currentPos = editor.modified.cursor;
    const next = this.findNextChange(changes, currentPos);
    if (next) {
      editor.revealLine(next.modifiedStartLine, 'modified');
    }
  }

  async previousChange(): Promise<void> {
    const editor = this.editorManager.current;
    if (!editor || !(editor instanceof DiffEditorWidget)) return;
    const changes = editor.changes;
    const currentPos = editor.modified.cursor;
    const prev = this.findPreviousChange(changes, currentPos);
    if (prev) {
      editor.revealLine(prev.modifiedStartLine, 'modified');
    }
  }

  protected findNextChange(changes: DiffChange[], pos: Position): DiffChange | undefined {
    return changes.find(c => c.modifiedStartLine > pos.line);
  }

  protected findPreviousChange(changes: DiffChange[], pos: Position): DiffChange | undefined {
    return changes.slice().reverse().find(c => c.modifiedStartLine < pos.line);
  }

  getChangeCount(): number {
    const editor = this.editorManager.current;
    return editor instanceof DiffEditorWidget ? editor.changes.length : 0;
  }

  getCurrentChangeIndex(): number {
    const editor = this.editorManager.current;
    if (!(editor instanceof DiffEditorWidget)) return -1;
    const pos = editor.modified.cursor;
    return editor.changes.findIndex(c =>
      pos.line >= c.modifiedStartLine && pos.line <= c.modifiedEndLine
    );
  }
}
```

### 6.3 Diff Commands

```typescript
export namespace DiffCommands {
  export const NEXT_CHANGE: Command = {
    id: 'editor.diff.nextChange',
    label: 'Next Change (Diff)',
  };

  export const PREVIOUS_CHANGE: Command = {
    id: 'editor.diff.previousChange',
    label: 'Previous Change (Diff)',
  };

  export const TOGGLE_DIFF_SIDE_BY_SIDE: Command = {
    id: 'editor.diff.toggleSideBySide',
    label: 'Toggle Side-by-Side / Unified Diff',
  };

  export const REVERT_CHANGE: Command = {
    id: 'editor.diff.revertChange',
    label: 'Revert This Change',
  };
}

@injectable()
export class DiffKeybindingContribution implements KeybindingContribution {
  registerKeybindings(keybindings: KeybindingRegistry): void {
    keybindings.registerKeybinding({
      command: DiffCommands.NEXT_CHANGE.id,
      keybinding: 'alt+f5',
      when: 'diffEditorFocus',
    });
    keybindings.registerKeybinding({
      command: DiffCommands.PREVIOUS_CHANGE.id,
      keybinding: 'shift+alt+f5',
      when: 'diffEditorFocus',
    });
  }
}
```

### 6.4 Unified vs Side-by-Side

| Modo | Visualizacao | Uso Ideal | Performance |
|------|-------------|-----------|-------------|
| Side-by-Side | Original a esquerda, modificado a direita | Revisao detalhada de cada mudanca | Mais pesado (2 renderizacoes) |
| Unified | Mudancas em linha unica com marcadores +/- | Visao geral rapida, contexto linear | Mais leve (1 renderizacao) |

```typescript
export interface DiffEditorOptions {
  renderSideBySide: boolean;
  enableSplitViewResizing: boolean;
  ignoreTrimWhitespace: boolean;
  maxComputationTime: number;
  showChangesInOverviewRuler: boolean;
}
```

### 6.5 Diff Contributions

```typescript
@injectable()
export class DiffCommandContribution implements CommandContribution {
  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(DiffCommands.NEXT_CHANGE, {
      execute: () => this.diffNavigator.nextChange(),
      isEnabled: () => this.editorManager.current instanceof DiffEditorWidget,
    });

    registry.registerCommand(DiffCommands.PREVIOUS_CHANGE, {
      execute: () => this.diffNavigator.previousChange(),
      isEnabled: () => this.editorManager.current instanceof DiffEditorWidget,
    });

    registry.registerCommand(DiffCommands.TOGGLE_DIFF_SIDE_BY_SIDE, {
      execute: () => this.toggleRenderMode(),
      isEnabled: () => this.editorManager.current instanceof DiffEditorWidget,
    });

    registry.registerCommand(DiffCommands.REVERT_CHANGE, {
      execute: () => this.revertCurrentChange(),
      isEnabled: () => this.editorManager.current instanceof DiffEditorWidget,
    });
  }

  protected toggleRenderMode(): void {
    const editor = this.editorManager.current as DiffEditorWidget;
    const current = editor.diffEditor.getOptions()?.renderSideBySide ?? true;
    editor.diffEditor.updateOptions({ renderSideBySide: !current });
  }

  protected revertCurrentChange(): void {
    const editor = this.editorManager.current as DiffEditorWidget;
    const changes = editor.changes;
    const pos = editor.modified.cursor;
    const change = changes.find(c =>
      pos.line >= c.modifiedStartLine && pos.line <= c.modifiedEndLine
    );
    if (change) {
      editor.diffEditor.revertChange(change);
    }
  }

  @inject(DiffNavigator)
  protected readonly diffNavigator: DiffNavigator;

  @inject(EditorManager)
  protected readonly editorManager: EditorManager;
}
```

---

## 7. Editor Widget Types

### 7.1 Type Hierarchy

```
EditorWidget (@theia/editor)
  |
  +-- CodeEditorWidget (@theia/monaco)
  |     Encapsula um Monaco ICodeEditor
  |     Editor de codigo padrao (texto)
  |
  +-- DiffEditorWidget (@theia/monaco)
  |     Encapsula um Monaco IDiffEditor
  |     Comparacao entre dois textos
  |
  +-- Custom Editor Widgets (extensoes)
  |     Qualquer widget que implementa Editor interface
  |     Ex: HexEditor, ImagePreview, MarkdownPreview
  |
  +-- NotebookEditorWidget (@theia/notebook, se disponivel)
        Editor para notebooks (celulas de codigo/markdown)
```

### 7.2 CodeEditorWidget

O editor de codigo padrao do Theia. Todos os arquivos de texto sao abertos nele por padrao:

```typescript
// @theia/monaco/src/browser/code-editor-widget.ts
@injectable()
export class CodeEditorWidget extends EditorWidget {
  @inject(MonacoEditorService)
  protected readonly monacoEditorService: MonacoEditorService;

  @inject(MonacoTextModelService)
  protected readonly textModelService: MonacoTextModelService;

  protected monacoEditor: MonacoEditor;

  protected async init(): Promise<void> {
    const modelRef = await this.textModelService.createModelReference(this.uri);
    this.toDispose.push(modelRef);
    this.monacoEditor = this.monacoEditorService.createEditor({
      model: modelRef.object,
      options: this.buildEditorOptions(),
    });
    this.node.append(this.monacoEditor.node);
    this.monacoEditor.start();
  }

  protected buildEditorOptions(): EditorOptions {
    return {
      fontSize: 14,
      lineNumbers: 'on',
      wordWrap: 'off',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    };
  }

  get editor(): MonacoEditor {
    return this.monacoEditor;
  }
}
```

### 7.3 MonacoEditor (Internal Wrapper)

Dentro do Theia, o Monaco e encapsulado em uma classe chamada `MonacoEditor` (ou `MonacoEditorWrapper`), que implementa a interface `Editor` do Theia:

```typescript
// @theia/monaco/src/browser/monaco-editor.ts
export class MonacoEditor implements Editor, Disposable {
  protected readonly editor: editor.ICodeEditor;
  protected readonly model: editor.ITextModel;

  get uri(): URI {
    return new URI(this.model.uri.toString());
  }

  get dirty(): boolean {
    return this.model.isDirty();
  }

  get cursor(): Position {
    const pos = this.editor.getPosition();
    return pos ? { line: pos.lineNumber - 1, character: pos.column - 1 } : { line: 0, character: 0 };
  }

  set cursor(pos: Position): void {
    this.editor.setPosition({ lineNumber: pos.line + 1, column: pos.character + 1 });
  }

  get selection(): Range {
    const sel = this.editor.getSelection();
    return this.protocolToRange(sel);
  }

  set selection(range: Range): void {
    this.editor.setSelection(this.rangeToProtocol(range));
  }

  async save(): Promise<void> {
    await this.model.save();
  }

  revealPosition(position: Position): void {
    this.editor.revealPositionInCenter({
      lineNumber: position.line + 1,
      column: position.character + 1,
    });
  }

  revealRange(range: Range): void {
    this.editor.revealRangeInCenter(this.rangeToProtocol(range));
  }

  dispose(): void {
    this.editor.dispose();
    this.model.dispose();
  }

  // Conversao entre protocolo Theia e Monaco
  protected protocolToRange(range: Range): EditorSelection {
    return {
      selectionStartLineNumber: range.start.line + 1,
      selectionStartColumn: range.start.character + 1,
      positionLineNumber: range.end.line + 1,
      positionColumn: range.end.character + 1,
    };
  }

  protected rangeToProtocol(sel: EditorSelection): Range {
    return {
      start: { line: sel.selectionStartLineNumber - 1, character: sel.selectionStartColumn - 1 },
      end: { line: sel.positionLineNumber - 1, character: sel.positionColumn - 1 },
    };
  }
}
```

### 7.4 Custom Editor Implementations

Extensoes podem implementar editores customizados registrando um `WidgetFactory` e um `IEditorOpenHandler`. Exemplos de editores customizados:

| Tipo | Uso | Implementacao |
|------|-----|---------------|
| HexEditor | Arquivos binarios (.bin, .hex) | EditorWidget com canvas hex viewer |
| ImagePreview | Arquivos de imagem (.png, .jpg) | EditorWidget com tag img |
| MarkdownPreview | Visualizacao renderizada (.md) | EditorWidget com iframe/marked |
| SVGEditor | Editor grafico de SVG | EditorWidget com manipulacao DOM |
| FormEditor | JSON/XML forms (config files) | EditorWidget com controles UI |
| NotebookEditor | Jupyter-like (.ipynb) | EditorWidget com celulas |

### 7.5 Multi-Monaco Editor

Para edicao side-by-side do mesmo arquivo, o Theia suporta abrir o mesmo documento em multiplos editores:

```typescript
@injectable()
export class MultiEditorService {
  @inject(EditorManager)
  protected readonly editorManager: EditorManager;

  async openToSide(uri: URI): Promise<EditorWidget> {
    return this.editorManager.open(uri, {
      sideBySide: true,
      preview: false,
    });
  }

  async splitCurrentEditor(direction: 'right' | 'down'): Promise<void> {
    const current = this.editorManager.current;
    if (!current || !current.resourceUri) return;
    await this.editorManager.open(current.resourceUri, {
      sideBySide: true,
      revealIfVisible: false,
    });
  }

  closeAllDuplicates(uri: URI): void {
    const all = this.editorManager.all;
    const duplicates = all.filter(w =>
      w.resourceUri?.toString() === uri.toString()
    );
    if (duplicates.length > 1) {
      duplicates.slice(1).forEach(w => w.close());
    }
  }
}
```

---

## 8. Text Model & Document

### 8.1 TextModelService

O `TextModelService` e o servico central que gerencia modelos de texto. Cada modelo representa um documento aberto no editor:

```typescript
// @theia/editor/src/browser/text-model-service.ts
@injectable()
export class TextModelService {
  @inject(TextModelResolver)
  protected readonly resolver: TextModelResolver;

  @inject(EditorPreferences)
  protected readonly preferences: EditorPreferences;

  protected references = new Map<string, number>();

  async createModelReference(uri: URI): Promise<Reference<TextModel>> {
    const model = await this.resolver.resolve(uri);
    const key = uri.toString();
    this.references.set(key, (this.references.get(key) ?? 0) + 1);
    return {
      object: model,
      dispose: () => {
        const count = this.references.get(key) ?? 0;
        if (count <= 1) {
          this.references.delete(key);
          model.dispose();
        } else {
          this.references.set(key, count - 1);
        }
      },
    };
  }

  getModel(uri: URI): TextModel | undefined {
    return this.resolver.get(uri);
  }

  getOpenModels(): TextModel[] {
    return this.resolver.getAll();
  }
}
```

### 8.2 Document Interface

A interface `TextModel` (ou `Document`) abstrai o conteudo editavel:

```typescript
export interface TextModel extends Disposable {
  readonly uri: URI;
  readonly languageId: string;
  readonly version: number;
  readonly dirty: boolean;

  readonly onDidChangeContent: Event<TextModelContentChangeEvent>;
  readonly onDidChangeLanguage: Event<string>;
  readonly onDidSave: Event<void>;

  getText(): string;
  getText(range: Range): string;
  getLineContent(line: number): string;
  getLineCount(): number;
  getLineMaxColumn(line: number): number;

  getPositionAt(offset: number): Position;
  getOffsetAt(position: Position): number;

  findMatches(search: string, options?: FindOptions): SearchMatch[];

  pushEditOperations(operations: EditOperation[]): void;
  pushUndoStop(): void;
  pushRedoStop(): void;
}
```

### 8.3 Document Extension Points

Extensoes podem estender documentos atraves de metadados e decorators:

```typescript
export interface DocumentExtension {
  readonly id: string;
  onOpen?(model: TextModel): void;
  onSave?(model: TextModel): Promise<void>;
  onClose?(model: TextModel): void;
  provideMetadata?(model: TextModel): DocumentMetadata;
}

export interface DocumentMetadata {
  languageConfidence?: number;
  encoding?: string;
  lineEnding?: 'LF' | 'CRLF' | 'CR';
  readonly?: boolean;
  largeFile?: boolean;
  tabSize?: number;
}

@injectable()
export class DocumentExtensionService {
  protected extensions: DocumentExtension[] = [];

  registerExtension(ext: DocumentExtension): Disposable {
    this.extensions.push(ext);
    return Disposable.create(() => {
      const idx = this.extensions.indexOf(ext);
      if (idx >= 0) this.extensions.splice(idx, 1);
    });
  }

  async notifyOpen(model: TextModel): Promise<void> {
    for (const ext of this.extensions) {
      ext.onOpen?.(model);
    }
  }

  async notifySave(model: TextModel): Promise<void> {
    for (const ext of this.extensions) {
      await ext.onSave?.(model);
    }
  }
}
```

### 8.4 Model Resolver

O resolver e responsavel por carregar o conteudo de uma URI em um modelo:

```typescript
@injectable()
export class TextModelResolver {
  @inject(FileService)
  protected readonly fileService: FileService;

  @inject(EncodingService)
  protected readonly encodingService: EncodingService;

  @inject(LanguageService)
  protected readonly languageService: LanguageService;

  protected cache = new Map<string, TextModel>();

  async resolve(uri: URI): Promise<TextModel> {
    const key = uri.toString();
    const cached = this.cache.get(key);
    if (cached) return cached;

    const content = await this.fileService.read(uri);
    const encoding = this.encodingService.detectEncoding(content);
    const text = this.encodingService.decode(content, encoding);
    const language = this.languageService.detectLanguage(uri, text);

    const model = new TheiaTextModel(uri, text, language, encoding);
    this.cache.set(key, model);
    return model;
  }

  get(uri: URI): TextModel | undefined {
    return this.cache.get(uri.toString());
  }

  getAll(): TextModel[] {
    return Array.from(this.cache.values());
  }
}
```

### 8.5 Encoding Support

```typescript
export interface EncodingService {
  detectEncoding(buffer: Uint8Array): string;
  decode(buffer: Uint8Array, encoding: string): string;
  encode(text: string, encoding: string): Uint8Array;
  listEncodings(): string[];
}

export class EncodingDetector {
  static detectFromBOM(buffer: Uint8Array): string | null {
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'utf-8';
    }
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return 'utf-16le';
    }
    if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      return 'utf-16be';
    }
    return null;
  }

  static detectByContent(buffer: Uint8Array): string {
    // Tenta UTF-8 primeiro, depois latin1, windows-1252
    const bom = EncodingDetector.detectFromBOM(buffer);
    if (bom) return bom;
    if (EncodingDetector.isValidUTF8(buffer)) return 'utf-8';
    return 'windows-1252';
  }

  protected static isValidUTF8(buffer: Uint8Array): boolean {
    let i = 0;
    while (i < buffer.length) {
      if (buffer[i] <= 0x7F) { i++; continue; }
      if (buffer[i] >= 0xC2 && buffer[i] <= 0xDF && i + 1 < buffer.length) { i += 2; continue; }
      if (i + 2 < buffer.length) { i += 3; continue; }
      return false;
    }
    return true;
  }
}
```

### 8.6 Large File Handling

Para arquivos grandes (>50MB), o Theia aplica estrategias especiais:

```typescript
export interface LargeFileHandler {
  isLargeFile(uri: URI): Promise<boolean>;
  openLargeFile(uri: URI): Promise<EditorWidget>;
  getReadonlyReason(uri: URI): string | undefined;
}

export class DefaultLargeFileHandler implements LargeFileHandler {
  protected readonly LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB
  protected readonly MAX_EDIT_SIZE = 10 * 1024 * 1024; // 10MB

  async isLargeFile(uri: URI): Promise<boolean> {
    const stat = await this.fileService.stat(uri);
    return stat.size > this.LARGE_FILE_THRESHOLD;
  }

  async openLargeFile(uri: URI): Promise<EditorWidget> {
    // Abre em modo readonly com syntax highlighting limitado
    const widget = await this.editorManager.open(uri);
    widget.editor.updateOptions({
      readOnly: true,
      wordWrap: 'off',
      renderWhitespace: 'none',
      minimap: { enabled: false },
    });
    return widget;
  }

  getReadonlyReason(uri: URI): string | undefined {
    // Retorna mensagem se arquivo for muito grande para edicao
    return undefined;
  }
}
```

### 8.7 Undo Stack

Theia gerencia o undo/redo atraves do Monaco internamente, mas expoe controle via interface:

```typescript
export interface UndoManager {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  undo(): void;
  redo(): void;
  pushElement(element: UndoElement): void;
  clear(): void;
}

export interface UndoElement {
  readonly label?: string;
  readonly operations: EditOperation[];
  readonly timestamp: number;
}

@injectable()
export class EditorUndoManager implements UndoManager {
  protected stack: UndoElement[] = [];
  protected index = -1;
  protected readonly maxStackSize = 200;

  get canUndo(): boolean {
    return this.index >= 0;
  }

  get canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  undo(): void {
    if (!this.canUndo) return;
    this.stack[this.index].operations.forEach(op => op.reverse());
    this.index--;
  }

  redo(): void {
    if (!this.canRedo) return;
    this.index++;
    this.stack[this.index].operations.forEach(op => op.apply());
  }

  pushElement(element: UndoElement): void {
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(element);
    if (this.stack.length > this.maxStackSize) {
      this.stack.shift();
    }
    this.index = this.stack.length - 1;
  }

  clear(): void {
    this.stack = [];
    this.index = -1;
  }
}
```

---

## 9. Editor Preferences

### 9.1 Preference Schema

Theia define preferencias do editor como um schema JSON registrado via contribuicao:

```typescript
// @theia/editor/src/browser/editor-preferences.ts
export const editorPreferenceSchema: PreferenceSchema = {
  type: 'object',
  properties: {
    'editor.tabSize': {
      type: 'number',
      default: 4,
      description: 'Number of spaces for a tab',
      minimum: 1,
      maximum: 8,
    },
    'editor.insertSpaces': {
      type: 'boolean',
      default: true,
      description: 'Insert spaces when pressing Tab',
    },
    'editor.wordWrap': {
      type: 'string',
      enum: ['off', 'on', 'wordWrapColumn', 'bounded'],
      default: 'off',
      description: 'Controls how lines should wrap',
    },
    'editor.wordWrapColumn': {
      type: 'number',
      default: 80,
      description: 'Column for word wrap when wordWrap is wordWrapColumn or bounded',
    },
    'editor.rulers': {
      type: 'array',
      items: { type: 'number' },
      default: [],
      description: 'Columns at which to show vertical rulers',
    },
    'editor.minimap.enabled': {
      type: 'boolean',
      default: true,
      description: 'Controls whether the minimap is shown',
    },
    'editor.renderWhitespace': {
      type: 'string',
      enum: ['none', 'boundary', 'selection', 'all'],
      default: 'selection',
      description: 'Controls how whitespace is rendered',
    },
    'editor.fontSize': {
      type: 'number',
      default: 14,
      description: 'Controls the font size in pixels',
    },
    'editor.lineHeight': {
      type: 'number',
      default: 0,
      description: 'Controls the line height (0 = use font size)',
    },
    'editor.formatOnSave': {
      type: 'boolean',
      default: false,
      description: 'Format a file on save',
    },
    'editor.formatOnPaste': {
      type: 'boolean',
      default: false,
      description: 'Format code on paste',
    },
    'editor.autoClosingBrackets': {
      type: 'string',
      enum: ['always', 'never', 'beforeWhitespace', 'languageDefined'],
      default: 'languageDefined',
    },
    'editor.cursorBlinking': {
      type: 'string',
      enum: ['blink', 'smooth', 'phase', 'expand', 'solid'],
      default: 'blink',
    },
    'editor.cursorStyle': {
      type: 'string',
      enum: ['line', 'block', 'underline', 'line-thin', 'block-outline', 'underline-thin'],
      default: 'line',
    },
  },
};
```

### 9.2 Preference Proxy

O proxy de preferencias fornece acesso tipado com escopo:

```typescript
@injectable()
export class EditorPreferences {
  @inject(PreferenceService)
  protected readonly preferenceService: PreferenceService;

  get tabSize(): number {
    return this.get('editor.tabSize');
  }

  get insertSpaces(): boolean {
    return this.get('editor.insertSpaces');
  }

  get wordWrap(): string {
    return this.get('editor.wordWrap');
  }

  get fontSize(): number {
    return this.get('editor.fontSize');
  }

  get formatOnSave(): boolean {
    return this.get('editor.formatOnSave');
  }

  get minimapEnabled(): boolean {
    return this.get('editor.minimap.enabled');
  }

  get renderWhitespace(): string {
    return this.get('editor.renderWhitespace');
  }

  getForLanguage(language: string, key: string): any {
    return this.preferenceService.get(`[${language}].${key}`)
      ?? this.get(key as any);
  }

  onPreferenceChanged: Event<PreferenceChange>;

  protected get<T>(key: string): T {
    return this.preferenceService.get<T>(key) as T;
  }

  protected getResource(resourceUri: URI, key: string): any {
    return this.preferenceService.get(key, undefined, resourceUri.toString());
  }
}
```

### 9.3 Preference Bindings

As preferencias sao vinculadas ao editor atraves de contributions:

```typescript
@injectable()
export class EditorPreferenceBindingContribution implements EditorContribution {
  readonly id = 'editor-preference-bindings';

  @inject(EditorPreferences)
  protected readonly editorPreferences: EditorPreferences;

  onInit(editor: Editor): void {
    this.applyPreferences(editor);
    this.editorPreferences.onPreferenceChanged(e => {
      if (e.preferenceName.startsWith('editor.')) {
        this.applyPreferences(editor);
      }
    });
  }

  protected applyPreferences(editor: Editor): void {
    const lang = editor.languageId;
    editor.updateOptions({
      tabSize: this.editorPreferences.getForLanguage(lang, 'editor.tabSize'),
      insertSpaces: this.editorPreferences.getForLanguage(lang, 'editor.insertSpaces'),
      wordWrap: this.editorPreferences.getForLanguage(lang, 'editor.wordWrap'),
      minimap: { enabled: this.editorPreferences.minimapEnabled },
      renderWhitespace: this.editorPreferences.renderWhitespace,
      fontSize: this.editorPreferences.fontSize,
    });
  }
}
```

### 9.4 Per-Language Settings

Theia suporta configuracoes especificas por linguagem:

```typescript
// Exemplo de settings.json com config per-language
{
  "editor.tabSize": 4,
  "editor.insertSpaces": true,
  "[typescript]": {
    "editor.tabSize": 2,
    "editor.insertSpaces": true
  },
  "[python]": {
    "editor.tabSize": 4,
    "editor.insertSpaces": true
  },
  "[go]": {
    "editor.tabSize": 8,
    "editor.insertSpaces": false
  }
}
```

A resolucao segue a hierarquia:

```
Per-language > Resource (folder) > Workspace > User > Defaults
```

---

## 10. Widget System Foundation

### 10.1 Widget Class Hierarchy

O sistema de widgets do Theia e baseado no Lumino (antigo PhosphorJS), com camadas de abstracao do proprio Theia:

```
@lumino/widgets.Widget
  |
  +-- @theia/core BaseWidget
  |     Adiciona: DI injection, ciclo de vida gerenciado,
  |               onResize, onActivate, onFocus, onBlur,
  |               toDispose (disposable collection)
  |
  +-- @theia/core Panel
  |     Widget que contem outros widgets filhos
  |     Layout gerencia posicionamento
  |
  +-- @theia/core SplitPanel
  |     Panel com divisao redimensionavel
  |     Orientacao horizontal ou vertical
  |
  +-- @theia/core DockPanel
  |     Panel com abas e arrasto de widgets
  |     TabBar + area de conteudo
  |
  +-- @theia/core Title
        Widget de titulo (icone, label, dirty indicator)
```

### 10.2 BaseWidget

```typescript
// @theia/core/src/browser/widgets/base-widget.ts
@injectable()
export class BaseWidget extends Widget {
  protected toDispose = new DisposableCollection();
  protected toDisposeOnDetach = new DisposableCollection();

  constructor(options?: Widget.IOptions) {
    super(options);
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.toDisposeOnDetach.dispose();
    this.toDispose.dispose();
    super.dispose();
  }

  protected onResize(msg: Widget.ResizeMessage): void {
    // Subclasses podem override para lidar com resize
  }

  protected onActivate(msg: Widget.ActivateMessage): void {
    // Subclasses podem override para lidar com ativacao
  }

  protected onFocus(): void {
    // Subclasses podem override para focar
  }

  protected onBlur(): void {
    // Subclasses podem override para perder foco
  }

  protected addClass(className: string): void {
    this.node.classList.add(className);
  }

  protected removeClass(className: string): void {
    this.node.classList.remove(className);
  }
}
```

### 10.3 Widget Lifecycle

```
CONSTRUCTOR
  |-> Widget criado com opcoes (id, title, etc.)
  |
INIT (Theia-specific, via init() method)
  |-> Configuracao inicial, bindings, listeners
  |-> toDispose registra recursos para cleanup
  |
ATTACH
  |-> Widget adicionado ao DOM (appendChild)
  |
ACTIVATE
  |-> Widget se torna ativo (recebe foco)
  |-> TabBar marca aba como ativa
  |
HIDE / SHOW
  |-> Visibilidade alternada
  |-> onResize chamado ao mostrar
  |
CLOSE
  |-> Usuario clica no X da tab
  |-> Se dirty: confirmation dialog
  |-> Se confirmado: dispose
  |
DISPOSE
  |-> toDispose.dispose() libera recursos
  |-> Widget removido do DOM
  |-> Removido de registro do WidgetManager
```

### 10.4 Widget State Serialization

Theia permite serializar e restaurar o estado dos widgets atraves de `StatefulWidget`:

```typescript
// @theia/core/src/browser/shell/stateful-widget.ts
export interface StatefulWidget {
  storeState(): object;
  restoreState(state: object): void;
}

// Serializacao do layout completo
export interface SerializedLayout {
  version: 2;
  widgets: SerializedWidget[];
  mainPanel: SerializedDockPanel;
  leftPanel: SerializedPanel;
  rightPanel: SerializedPanel;
  bottomPanel: SerializedPanel;
}

export interface SerializedWidget {
  factoryId: string;
  widgetId: string;
  options: object;
  state: object;
}

@injectable()
export class LayoutSerializer {
  @inject(WidgetManager)
  protected readonly widgetManager: WidgetManager;

  async serialize(): Promise<string> {
    const layout: SerializedLayout = {
      version: 2,
      widgets: this.serializeWidgets(),
      mainPanel: this.serializeDockPanel(),
      leftPanel: this.serializePanel(this.shell.leftPanel),
      rightPanel: this.serializePanel(this.shell.rightPanel),
      bottomPanel: this.serializePanel(this.shell.bottomPanel),
    };
    return JSON.stringify(layout);
  }

  protected serializeWidgets(): SerializedWidget[] {
    return this.widgetManager.getWidgets().map(w => ({
      factoryId: w.factoryId,
      widgetId: w.id,
      options: w.storeOptions?.() ?? {},
      state: (w as any as StatefulWidget).storeState?.() ?? {},
    }));
  }

  async restore(json: string): Promise<void> {
    const layout: SerializedLayout = JSON.parse(json);
    for (const sw of layout.widgets) {
      const widget = await this.widgetManager.getOrCreateWidget(
        sw.factoryId,
        sw.options,
      );
      (widget as any as StatefulWidget).restoreState?.(sw.state);
    }
  }
}
```

### 10.5 Title Widget

Cada widget Theia possui um `Title` que controla como a aba aparece:

```typescript
export interface TitleOptions {
  label: string;
  caption?: string;
  iconClass?: string;
  closeable: boolean;
  modified: boolean; // dirty indicator
}

// O Title do Lumino
export class Title<T> {
  label: string;
  caption: string;
  iconClass: string;
  icon?: string;
  closeable: boolean;
  modified: boolean; // bolinha de dirty
  className: string;

  readonly changed: Signal<T, void>;
}

// Configuracao no EditorWidget
export class EditorWidget extends BaseWidget {
  protected configureTitle(): void {
    this.title.label = this.uri.displayName;
    this.title.caption = this.uri.toString();
    this.title.iconClass = 'theia-editor-icon';
    this.title.closeable = true;
    this.title.modified = false;

    this.editor.onDirtyChanged(() => {
      this.title.modified = this.editor.dirty;
    });
  }
}
```

### 10.6 Focus Management

```typescript
@injectable()
export class WidgetFocusManager {
  protected focusedWidget: Widget | undefined;

  @postConstruct()
  init(): void {
    document.addEventListener('focusin', (e) => {
      this.handleFocusIn(e);
    });
  }

  protected handleFocusIn(event: FocusEvent): void {
    const widget = this.findWidget(event.target as HTMLElement);
    if (widget && widget !== this.focusedWidget) {
      this.focusedWidget?.onBlur?.();
      this.focusedWidget = widget;
      this.focusedWidget.onFocus?.();
    }
  }

  protected findWidget(element: HTMLElement | null): Widget | undefined {
    while (element) {
      const widget = (element as any).widget;
      if (widget) return widget;
      element = element.parentElement;
    }
    return undefined;
  }

  get focused(): Widget | undefined {
    return this.focusedWidget;
  }

  focus(widget: Widget): void {
    widget.activate();
  }
}
```

---

## 11. Widget Factory

### 11.1 WidgetFactory Pattern

Theia usa o padrao Factory Method para criar widgets. Toda criacao passa pelo `WidgetManager`:

```typescript
// @theia/core/src/browser/widget-manager.ts
export interface WidgetFactory {
  readonly id: string;

  createWidget(options?: any): Promise<Widget>;
  createWidgetOptions?(uri: URI, options?: any): any;
}

export interface WidgetFactoryOptions {
  factoryId: string;
}

@injectable()
export class WidgetManager {
  protected factories = new Map<string, WidgetFactory>();
  protected widgets = new Map<string, Widget[]>();

  registerWidgetFactory(factory: WidgetFactory): Disposable {
    this.factories.set(factory.id, factory);
    return Disposable.create(() => {
      this.factories.delete(factory.id);
    });
  }

  async getOrCreateWidget(factoryId: string, options?: any): Promise<Widget> {
    const factory = this.factories.get(factoryId);
    if (!factory) throw new Error(`Unknown widget factory: ${factoryId}`);

    const widget = await factory.createWidget(options);
    this.trackWidget(factoryId, widget);
    return widget;
  }

  getWidgets(factoryId?: string): Widget[] {
    if (factoryId) {
      return this.widgets.get(factoryId) ?? [];
    }
    return Array.from(this.widgets.values()).flat();
  }

  protected trackWidget(factoryId: string, widget: Widget): void {
    const list = this.widgets.get(factoryId) ?? [];
    list.push(widget);
    this.widgets.set(factoryId, list);

    widget.disposed.connect(() => {
      const idx = list.indexOf(widget);
      if (idx >= 0) list.splice(idx, 1);
    });
  }
}
```

### 11.2 Widget Creation Strategy

| Estrategia | Comportamento | Uso |
|------------|--------------|-----|
| Create new | Sempre cria novo widget | Cada chamada gera nova aba |
| Reuse if open | Retorna widget existente se URI ja aberta | Evita duplicatas |
| Reveal if visible | Ativa a aba se ja estiver visivel | Foco em widget ja aberto |
| Preview mode | Cria com closeable = false (substituivel) | Preview rapido |

```typescript
export interface WidgetOpenOptions {
  mode: 'open' | 'reveal' | 'activate' | 'preview';
  side: 'main' | 'left' | 'right' | 'bottom';
  widgetOptions?: any;
}

export const DefaultWidgetOpenOptions: WidgetOpenOptions = {
  mode: 'activate',
  side: 'main',
};
```

### 11.3 Widget ID Generation

```typescript
export class WidgetIdGenerator {
  protected counter = 0;

  generateId(factoryId: string, uri?: URI): string {
    const prefix = uri ? this.sanitize(uri.toString()) : factoryId;
    const suffix = this.counter++;
    return `${prefix}-${suffix}`;
  }

  generateStableId(factoryId: string, uri: URI): string {
    const hash = this.hashCode(uri.toString());
    return `${factoryId}:${hash}`;
  }

  protected sanitize(str: string): string {
    return str.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  protected hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
```

### 11.4 Widget Options Serialization

```typescript
export interface WidgetFactoryOptions {
  factoryId: string;
  widgetId?: string;
}

export class WidgetOptionsSerializer {
  serialize(options: any): string {
    return JSON.stringify(options, (key, value) => {
      if (value instanceof URI) return { __uri: value.toString() };
      return value;
    });
  }

  deserialize(json: string): any {
    return JSON.parse(json, (key, value) => {
      if (value && value.__uri) return new URI(value.__uri);
      return value;
    });
  }
}
```

---

## 12. Editor Widget Factory

### 12.1 EditorWidgetFactory

O `EditorWidgetFactory` e um `WidgetFactory` concreto que cria `EditorWidget`:

```typescript
// @theia/editor/src/browser/editor-widget-factory.ts
@injectable()
export class EditorWidgetFactory implements WidgetFactory {
  static readonly ID = 'editor';

  readonly id = EditorWidgetFactory.ID;

  @inject(EditorManager)
  protected readonly editorManager: EditorManager;

  @inject(TextModelService)
  protected readonly textModelService: TextModelService;

  async createWidget(options: any): Promise<EditorWidget> {
    const uri = this.parseUri(options);
    const widget = this.instantiateWidget(uri, options);
    await widget.init();
    this.configureWidget(widget, uri);
    return widget;
  }

  createWidgetOptions(uri: URI, options?: EditorOpenerOptions): any {
    return {
      uri: uri.toString(),
      selection: options?.selection,
      preview: options?.preview ?? false,
    };
  }

  protected parseUri(options: any): URI {
    return new URI(options.uri);
  }

  protected instantiateWidget(uri: URI, options: any): EditorWidget {
    return new CodeEditorWidget();
  }

  protected configureWidget(widget: EditorWidget, uri: URI): void {
    widget.title.label = uri.displayName;
    widget.title.caption = uri.toString();
    widget.title.iconClass = this.getIconClass(uri);
    widget.title.closeable = true;
  }

  protected getIconClass(uri: URI): string {
    const ext = uri.path.ext;
    const iconMap: Record<string, string> = {
      '.ts': 'theia-ts-icon',
      '.tsx': 'theia-tsx-icon',
      '.js': 'theia-js-icon',
      '.json': 'theia-json-icon',
      '.md': 'theia-md-icon',
    };
    return iconMap[ext] ?? 'theia-file-icon';
  }
}
```

### 12.2 URI Derivation

```typescript
export class EditorUriResolver {
  resolve(uri: URI): URI {
    // Esquemas especiais sao roteados para providers
    const scheme = uri.scheme;
    switch (scheme) {
      case 'file':
        return uri;
      case 'git':
        return this.resolveGitUri(uri);
      case 'inmemory':
        return uri;
      case 'vscode':
        return this.resolveVscodeUri(uri);
      default:
        return uri;
    }
  }

  protected resolveGitUri(uri: URI): URI {
    // git:///repo.git/abc1234/src/main.ts
    const parts = uri.path.toString().split('/');
    const commit = parts[0];
    const filePath = parts.slice(1).join('/');
    // Baixa o arquivo do git e cria modelo inmemory
    return new URI().withScheme('inmemory').withPath(`/git/${commit}/${filePath}`);
  }

  protected resolveVscodeUri(uri: URI): URI {
    // Redireciona recursos built-in para o bundler
    return uri;
  }
}
```

### 12.3 Editor Widget Creation Flow

```
WidgetManager.getOrCreateWidget('editor', { uri })
  |
  +-> EditorWidgetFactory.createWidget({ uri })
       |
       +-> parseUri(options)
       |     Extrai URI do options object
       |
       +-> instantiateWidget(uri, options)
       |     Cria CodeEditorWidget ou outro conforme registro
       |
       +-> TextModelService.createModelReference(uri)
       |     Carrega o documento, obtem TextModel
       |
       +-> MonacoEditorService.createEditor({ model, options })
       |     Cria o editor Monaco interno
       |
       +-> configureTitle()
       |     Configura label, caption, dirty indicator
       |
       +-> Contributions start session
       |     Ativa EditorContributionManager
       |
       +-> retorna EditorWidget
```

### 12.4 Widget Disposal Flow

```
EditorWidget.close()
  |
  +-> Se dirty: mostra dialogo "Deseja salvar?"
  |     Salvar -> editor.save() -> dispose()
  |     Descartar -> dispose()
  |     Cancelar -> aborta
  |
  +-> Se nao dirty: dispose()
       |
       +-> EditorContributionManager.stopSession()
       |     Contributions sao notificadas do fechamento
       |
       +-> toDispose.dispose()
       |     Todos os listeners e subscriptions liberados
       |
       +-> MonacoEditor.dispose()
       |     Editor Monaco liberado
       |
       +-> TextModelReference.dispose()
       |     Referencia ao modelo decrementada
       |
       +-> super.dispose()
       |     Widget removido do DOM e do registro
```

### 12.5 Dirty Editor Tracking

```typescript
@injectable()
export class DirtyEditorTracker {
  @inject(EditorManager)
  protected readonly editorManager: EditorManager;

  protected dirtyEditors = new Set<string>();

  @postConstruct()
  init(): void {
    this.editorManager.onCreated(widget => {
      widget.onDirtyChanged(() => this.trackDirty(widget));
    });
  }

  protected trackDirty(widget: EditorWidget): void {
    const uri = widget.resourceUri?.toString();
    if (!uri) return;

    if (widget.dirty) {
      this.dirtyEditors.add(uri);
    } else {
      this.dirtyEditors.delete(uri);
    }
  }

  get hasDirtyEditors(): boolean {
    return this.dirtyEditors.size > 0;
  }

  get dirtyCount(): number {
    return this.dirtyEditors.size;
  }

  getDirtyEditors(): EditorWidget[] {
    return this.editorManager.all.filter(w => w.dirty);
  }

  async saveAllDirty(): Promise<void> {
    const promises = this.getDirtyEditors().map(w => w.save());
    await Promise.all(promises);
  }

  async discardAllDirty(): Promise<void> {
    for (const widget of this.getDirtyEditors()) {
      await widget.close();
    }
  }
}
```

---

## 13. OpenHandlers

### 13.1 IEditorOpenHandler

Handlers sao responsaveis por determinar como uma URI deve ser aberta. Eles formam uma chain de responsabilidade:

```typescript
// @theia/editor/src/browser/editor-open-handler.ts
export interface IEditorOpenHandler {
  readonly id: string;
  readonly priority: number;

  canHandle(uri: URI): number;
  open(uri: URI, options?: EditorOpenerOptions): Promise<EditorWidget | undefined>;
}
```

### 13.2 Handler Chain

```
EditorManager.open(uri)
  |
  +-> EditorManager.doOpen(uri, options)
       |
       +-> Para cada handler registrado (sorted by priority desc):
       |     handler.canHandle(uri) > 0 ?
       |       SIM -> handler.open(uri, options)
       |       NAO -> proximo handler
       |
       +-> Se nenhum handler retornou > 0:
             DefaultTextEditorHandler abre como texto puro
```

### 13.3 Priority System

O retorno de `canHandle` e um numero que representa a aptidao:

| Score | Significado | Exemplo |
|-------|-------------|---------|
| 0 | Nao pode abrir | Handler de imagem nao abre .ts |
| 1-10 | Pode abrir, mas nao e ideal | Text handler para .png (mostra binario) |
| 10-50 | Pode abrir como fallback | Code editor para .json |
| 50-90 | Adequado | Custom editor para .svg |
| 90-100 | Preferencial | Handler especifico para .drawio |

```typescript
@injectable()
export class DefaultEditorOpenHandler implements IEditorOpenHandler {
  readonly id = 'default-editor';
  readonly priority = 10;

  @inject(EditorManager)
  protected readonly editorManager: EditorManager;

  canHandle(uri: URI): number {
    // Qualquer URI pode ser aberta como texto
    return 10;
  }

  async open(uri: URI, options?: EditorOpenerOptions): Promise<EditorWidget | undefined> {
    return this.editorManager.open(uri, options);
  }
}

@injectable()
export class ImageEditorOpenHandler implements IEditorOpenHandler {
  readonly id = 'image-editor';
  readonly priority = 80;

  protected readonly IMAGE_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp',
  ]);

  canHandle(uri: URI): number {
    const ext = uri.path.ext.toLowerCase();
    return this.IMAGE_EXTENSIONS.has(ext) ? 80 : 0;
  }

  async open(uri: URI, options?: EditorOpenerOptions): Promise<EditorWidget | undefined> {
    // Abre um ImagePreviewWidget em vez do editor de texto
    const widget = await this.editorManager.open(uri, options);
    return widget;
  }
}
```

### 13.4 Custom Editor Registration

Extensoes registram handlers customizados via DI:

```typescript
// Registro no modulo frontend
export default new ContainerModule(bind => {
  bind(IEditorOpenHandler).to(ImageEditorOpenHandler).inSingletonScope();
  bind(IEditorOpenHandler).to(CsvEditorOpenHandler).inSingletonScope();
  bind(IEditorOpenHandler).to(HexEditorOpenHandler).inSingletonScope();
});

// Ou com prioridade dinamica
bind(IEditorOpenHandler).toDynamicValue(ctx => ({
  id: 'my-json-editor',
  priority: 75,
  canHandle: (uri: URI) => uri.path.ext === '.myjson' ? 75 : 0,
  open: async (uri: URI, options?: EditorOpenerOptions) => {
    // Implementacao customizada
  },
}));
```

### 13.5 ICustomEditorWidget

Para casos que exigem um widget completamente diferente (nao estendendo EditorWidget):

```typescript
export interface ICustomEditorWidget {
  readonly id: string;
  readonly uri: URI;
  readonly type: string;

  setUri(uri: URI): void;
  onOpen(): void;
  onClose(): void;
}

// Factory para custom editors
export interface CustomEditorFactory {
  readonly id: string;
  readonly createWidget: (uri: URI) => Promise<ICustomEditorWidget>;
}
```

### 13.6 Editor Resolver

O `EditorResolver` integra o `EditorRegistry` com o `OpenHandler`:

```typescript
@injectable()
export class EditorResolver {
  @inject(EditorRegistry)
  protected readonly editorRegistry: EditorRegistry;

  @inject(WidgetManager)
  protected readonly widgetManager: WidgetManager;

  resolveEditor(uri: URI): string | undefined {
    return this.editorRegistry.getEditorFactory(uri);
  }

  async openWith(uri: URI, factoryId: string): Promise<EditorWidget> {
    const options = { uri: uri.toString() };
    const widget = await this.widgetManager.getOrCreateWidget(factoryId, options);
    return widget as EditorWidget;
  }

  getAvailableEditors(uri: URI): EditorWidgetFactoryOption[] {
    return this.editorRegistry.getFactories().filter(f => f.match(uri));
  }
}
```

---

## 14. Code Examples

### 14.1 Complete EditorWidget Extension

Extensao completa que cria um editor customizado para arquivos `.xyz`:

```typescript
// my-extension/src/browser/my-editor-widget.ts
import { injectable, inject } from 'inversify';
import { EditorWidget, EditorManager, EditorOpenerOptions } from '@theia/editor/lib/browser';
import { BaseWidget } from '@theia/core/lib/browser/widgets/base-widget';
import { URI } from '@theia/core/lib/common/uri';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';

export const MY_EDITOR_FACTORY_ID = 'my-custom-editor';

@injectable()
export class MyEditorWidget extends BaseWidget {
  static readonly ID = 'my-editor';
  static readonly LABEL = 'My Custom Editor';

  protected contentNode: HTMLDivElement;

  constructor() {
    super();
    this.id = MyEditorWidget.ID;
    this.title.label = MyEditorWidget.LABEL;
    this.title.caption = 'My Custom Editor View';
    this.title.closable = true;
    this.title.iconClass = 'fa fa-star';
    this.node.innerHTML = '<div id="my-editor-content"></div>';
    this.contentNode = this.node.children[0] as HTMLDivElement;
  }

  setContent(data: string): void {
    this.contentNode.innerText = data;
  }
}

@injectable()
export class MyEditorWidgetFactory implements WidgetFactory {
  readonly id = MY_EDITOR_FACTORY_ID;

  async createWidget(options: any): Promise<MyEditorWidget> {
    const widget = new MyEditorWidget();
    widget.setContent(options?.data ?? 'No content');
    return widget;
  }
}
```

### 14.2 Custom Editor Contribution

Registro de contributions para o editor customizado:

```typescript
// my-extension/src/browser/my-editor-contribution.ts
import { injectable, inject } from 'inversify';
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common/command';
import { MenuContribution, MenuModelRegistry } from '@theia/core/lib/common/menu';
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser/keybinding';
import { EditorManager } from '@theia/editor/lib/browser';
import { WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { URI } from '@theia/core/lib/common/uri';
import { EditorContextMenu } from '@theia/editor/lib/browser/editor-menu';
import { MY_EDITOR_FACTORY_ID } from './my-editor-widget';

export namespace MyEditorCommands {
  export const OPEN_IN_MY_EDITOR: Command = {
    id: 'my-editor.openInEditor',
    label: 'Open in My Custom Editor',
    category: 'My Extension',
  };

  export const MY_EDITOR_COMMAND: Command = {
    id: 'my-editor.doSomething',
    label: 'Do Something in My Editor',
    category: 'My Extension',
  };
}

@injectable()
export class MyEditorCommandContribution implements CommandContribution {
  @inject(EditorManager)
  protected readonly editorManager: EditorManager;

  @inject(WidgetManager)
  protected readonly widgetManager: WidgetManager;

  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(MyEditorCommands.OPEN_IN_MY_EDITOR, {
      isEnabled: () => this.editorManager.current?.resourceUri !== undefined,
      execute: () => this.openInMyEditor(),
    });

    registry.registerCommand(MyEditorCommands.MY_EDITOR_COMMAND, {
      isEnabled: () => {
        const current = this.editorManager.current;
        return current?.resourceUri?.path.ext === '.xyz';
      },
      execute: () => this.doSomething(),
    });
  }

  protected async openInMyEditor(): Promise<void> {
    const current = this.editorManager.current;
    if (!current?.resourceUri) return;
    await this.widgetManager.getOrCreateWidget(MY_EDITOR_FACTORY_ID, {
      uri: current.resourceUri.toString(),
      data: 'Custom editor content',
    });
  }

  protected doSomething(): void {
    console.log('My custom editor action executed');
  }
}

@injectable()
export class MyEditorMenuContribution implements MenuContribution {
  registerMenus(menus: MenuModelRegistry): void {
    menus.registerMenuAction(EditorContextMenu.EDITOR_ACTIONS, {
      commandId: MyEditorCommands.OPEN_IN_MY_EDITOR.id,
      label: 'Open in My Editor',
    });
  }
}

@injectable()
export class MyEditorKeybindingContribution implements KeybindingContribution {
  registerKeybindings(keybindings: KeybindingRegistry): void {
    keybindings.registerKeybinding({
      command: MyEditorCommands.OPEN_IN_MY_EDITOR.id,
      keybinding: 'ctrlcmd+shift+m',
      when: 'editorFocus',
    });

    keybindings.registerKeybinding({
      command: MyEditorCommands.MY_EDITOR_COMMAND.id,
      keybinding: 'ctrlcmd+shift+d',
      when: 'editorFocus && resourceExt == .xyz',
    });
  }
}
```

### 14.3 Editor Context Menu Contribution

Adicionando itens ao menu de contexto do editor:

```typescript
@injectable()
export class MyContextMenuContribution implements MenuContribution {
  registerMenus(menus: MenuModelRegistry): void {
    // Menu de contexto do editor (linha numerada)
    menus.registerMenuAction(['editor_line_number_context_menu'], {
      commandId: 'my-editor.toggleBreakpoint',
      label: 'Toggle Breakpoint',
    });

    // Menu de contexto do editor (area de texto)
    menus.registerMenuAction(['editor_context_menu', '1_navigation'], {
      commandId: 'my-editor.peekDefinition',
      label: 'Peek Definition',
    });

    // Submenu no context menu
    menus.registerSubmenu(['editor_context_menu'], 'My Extension', [
      { commandId: 'my-editor.action1', label: 'Action 1' },
      { commandId: 'my-editor.action2', label: 'Action 2' },
    ]);

    // Menu de contexto da tab do editor
    menus.registerMenuAction(['editor_title_context_menu'], {
      commandId: 'my-editor.copyPath',
      label: 'Copy Path',
    });
  }
}
```

### 14.4 Widget Factory Registration

Registrando tudo no modulo:

```typescript
// my-extension/src/browser/my-extension-module.ts
import { ContainerModule } from 'inversify';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { CommandContribution } from '@theia/core/lib/common/command';
import { MenuContribution } from '@theia/core/lib/common/menu';
import { KeybindingContribution } from '@theia/core/lib/browser/keybinding';
import { MyEditorWidgetFactory, MY_EDITOR_FACTORY_ID } from './my-editor-widget';
import {
  MyEditorCommandContribution,
  MyEditorMenuContribution,
  MyEditorKeybindingContribution,
} from './my-editor-contribution';

export default new ContainerModule(bind => {
  bind(WidgetFactory).to(MyEditorWidgetFactory).inSingletonScope();
  bind(CommandContribution).to(MyEditorCommandContribution);
  bind(MenuContribution).to(MyEditorMenuContribution);
  bind(KeybindingContribution).to(MyEditorKeybindingContribution);
});

// my-extension/package.json
{
  "theiaExtensions": [
    {
      "frontend": "lib/browser/my-extension-module"
    }
  ]
}
```

### 14.5 Editor Preference Access

Acessando e modificando preferencias do editor programaticamente:

```typescript
@injectable()
export class EditorPreferenceExample {
  @inject(PreferenceService)
  protected readonly preferenceService: PreferenceService;

  getEffectiveTabSize(resourceUri: URI): number {
    const perLanguage = this.preferenceService.get(
      '[typescript].editor.tabSize',
      undefined,
      resourceUri.toString(),
    );
    if (perLanguage !== undefined) return perLanguage;

    const workspace = this.preferenceService.get(
      'editor.tabSize',
      undefined,
      resourceUri.toString(),
    );
    return workspace ?? 4;
  }

  async updateUserPreference(key: string, value: any): Promise<void> {
    await this.preferenceService.set(key, value, PreferenceScope.User);
  }

  watchFormatOnSave(): void {
    this.preferenceService.onPreferenceChanged(e => {
      if (e.preferenceName === 'editor.formatOnSave') {
        console.log(`Format on save changed to: ${e.newValue}`);
      }
    });
  }

  createScopedEditorOptions(uri: URI): EditorOptions {
    const lang = this.detectLanguage(uri);
    return {
      tabSize: this.preferenceService.get(`[${lang}].editor.tabSize`) ?? 4,
      insertSpaces: this.preferenceService.get(`[${lang}].editor.insertSpaces`) ?? true,
      wordWrap: this.preferenceService.get(`[${lang}].editor.wordWrap`) ?? 'off',
    };
  }

  protected detectLanguage(uri: URI): string {
    const ext = uri.path.ext;
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
    };
    return langMap[ext] ?? 'plaintext';
  }
}
```

### 14.6 Full Editor Open Handler

Implementacao completa de um open handler customizado:

```typescript
@injectable()
export class MarkdownEditorOpenHandler implements IEditorOpenHandler {
  readonly id = 'markdown-preview';
  readonly priority = 85;

  @inject(EditorManager)
  protected readonly editorManager: EditorManager;

  @inject(WidgetManager)
  protected readonly widgetManager: WidgetManager;

  canHandle(uri: URI): number {
    const ext = uri.path.ext.toLowerCase();
    if (ext === '.md' || ext === '.markdown') return 85;
    return 0;
  }

  async open(uri: URI, options?: EditorOpenerOptions): Promise<EditorWidget | undefined> {
    // Primeiro abre no editor de texto
    const editor = await this.editorManager.open(uri, options);

    // Depois ativa preview ao lado se preferencia permitir
    const enablePreview = this.preferenceService.get('markdown.preview.enabled') ?? true;
    if (enablePreview) {
      await this.openPreviewSideBySide(uri);
    }

    return editor;
  }

  @inject(PreferenceService)
  protected readonly preferenceService: PreferenceService;

  protected async openPreviewSideBySide(uri: URI): Promise<void> {
    await this.widgetManager.getOrCreateWidget('markdown-preview', {
      uri: uri.toString(),
    });
  }
}
```

---

## 15. Conexoes

### 15.1 Matriz de Conexoes

| Estudo | Conexao | Descricao |
|--------|---------|-----------|
| S11 (Theia Integration) | Plataforma base | EditorWidget estende BaseWidget, usa Inversify DI, segue ciclo de vida do Theia |
| S35 (FileSystem) | FileService, URI | TextModelService consome FileService para ler/escrever documentos; URI schema routing |
| S38 (Editor Intelligence) | LSP providers | EditorContribution integra LSP: completions, hover, diagnostics no editor ativo |
| S39 (Settings/Keybindings) | Preferences, Keybindings | EditorPreferences usa PreferenceService; keybindings do editor usam when clauses |
| S42 (DI/Contributions) | ContainerModule, bind | Toda contribuicao de editor (command, menu, keybinding) usa DI do Theia |
| S43 (Views) | ViewContainer, Widget | EditorWidget e um tipo de view; views laterais sao widgets como o editor |
| S44 (Shell) | DockPanel, Shell | EditorWidget vive no DockPanel; shell.activateWidget gerencia foco |
| S49 (Preferences) | PreferenceSchema | Preferencias do editor seguem o schema padrao do Theia com escopo por linguagem |

### 15.2 S11 — Theia Integration

A base de todo o sistema de editores. O Theia fornece:
- `BaseWidget` e `Widget` — classes base para todos os widgets
- `WidgetManager` — gerenciamento de ciclo de vida
- `Inversify DI` — injecao de dependencia para todas as contributions
- `DockPanel` / `Shell` — gerenciamento de layout e abas
- `CommandRegistry`, `MenuModelRegistry`, `KeybindingRegistry` — registros de contributions

### 15.3 S35 — FileSystem & Workspace

O VFS e consumido pelo editor em varios pontos:
- `TextModelResolver` le o arquivo via `FileService.read()`
- `EditorManager.open()` usa URI para identificar recursos
- `Dirty state` persiste no workspace storage
- `EncodingService` decodifica o binario para texto
- `LargeFileHandler` consulta `FileService.stat()` para threshold

### 15.4 S38 — Editor Intelligence (LSP)

O LSP se conecta ao editor atraves de:
- `EditorContribution` que escuta mudancas e aciona LSP
- `TextModel` provê o texto para o servidor LSP
- `EditorManager.current` identifica o editor ativo para comandos LSP
- `CodeEditorWidget` expoe o Monaco internamente usado pelo monaco-languageclient

### 15.5 S39 — Settings, Keybindings, Themes

- `EditorPreferences` estende o sistema de preferencias do Theia
- `KeybindingContribution` registra atalhos com `when: 'editorFocus'`
- Tema do editor e controlado pelo `ThemeService` e `ColorRegistry`
- `when` clauses como `editorTextFocus`, `editorReadonly`, `resourceExt == .ts`

### 15.6 S42 — DI/Contributions

Toda contribuicao descrita neste estudo segue o padrao:
```
bind(CommandContribution).to(X).inSingletonScope()
bind(MenuContribution).to(Y).inSingletonScope()
bind(KeybindingContribution).to(Z).inSingletonScope()
bind(WidgetFactory).to(W).inSingletonScope()
bind(IEditorOpenHandler).to(V).inSingletonScope()
```

### 15.7 S44 — Shell

O editor interage com o shell em varios aspectos:
- `shell.activateWidget()` — ativa o editor no dock
- `shell.closeWidget()` — fecha o editor
- `shell.splitPanel` — quando editor abre side-by-side
- `shell.layout` — serializacao/restauracao de layout incluindo editores abertos

### 15.8 S49 — Editor Preferences

Preferencias especificas do editor seguem o schema:
```typescript
// Contribuicao de preferencias
bind(PreferenceContribution).toConstantValue({
  id: 'editor-preferences',
  schema: editorPreferenceSchema,
});
```

---

## 16. Plano de Implementacao

### Fase 1 — Editor Core (1 semana)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 1.1 | Implementar EditorWidget base com dirty state, save, close | 8h |
| 1.2 | Implementar EditorManager (open, close, all, current, active) | 8h |
| 1.3 | Implementar EditorRegistry com sistema de prioridade | 4h |
| 1.4 | Implementar EditorWidgetFactory com criacao padrao | 6h |
| 1.5 | Implementar CodeEditorWidget (wrapper Monaco) | 10h |
| 1.6 | Implementar TextModelService e Document interface | 8h |
| 1.7 | Implementar EditorPreferences proxy com schema | 6h |
| 1.8 | Testes de unidade (EditorWidget, Manager, Factory) | 8h |

**Total Fase 1:** 58h

### Fase 2 — Contributions & Commands (4 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 2.1 | Implementar EditorCommandContribution (GoToLine, Comment, Format, Indent) | 6h |
| 2.2 | Implementar EditorMenuContribution (menus + context menus) | 4h |
| 2.3 | Implementar EditorKeybindingContribution (atalhos padrao) | 4h |
| 2.4 | Implementar EditorContribution interface e session manager | 6h |
| 2.5 | Implementar IEditorHandler e EditorWatcher | 4h |
| 2.6 | Testes de contributions | 6h |

**Total Fase 2:** 30h

### Fase 3 — Navigation & Diff (4 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 3.1 | Implementar NavigationLocationService (stack, back, forward) | 6h |
| 3.2 | Implementar NavigationContribution (auto-registro) | 4h |
| 3.3 | Implementar EditorNavigationService (reveal, navigate) | 4h |
| 3.4 | Implementar DiffEditorWidget com DiffNavigator | 10h |
| 3.5 | Implementar Diff commands e contributions | 4h |
| 3.6 | Testes de navegacao e diff | 6h |

**Total Fase 3:** 34h

### Fase 4 — OpenHandlers & Widget System (3 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 4.1 | Implementar IEditorOpenHandler (chain, prioridade) | 6h |
| 4.2 | Implementar DefaultEditorOpenHandler e ImageEditorOpenHandler | 4h |
| 4.3 | Implementar EditorResolver (resolve editor por URI) | 4h |
| 4.4 | Implementar WidgetFactory e WidgetManager (criacao, reuso) | 6h |
| 4.5 | Implementar state serialization/restoration | 6h |
| 4.6 | Implementar DirtyEditorTracker | 4h |
| 4.7 | Testes de open handlers e widget lifecycle | 6h |

**Total Fase 4:** 36h

### Fase 5 — Integracao IDEIA (3 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 5.1 | Integrar EditorManager com o Shell da IDEIA | 6h |
| 5.2 | Configurar preferencias de editor via PreferenceSchema | 4h |
| 5.3 | Integrar com LSP (S38) para inteligencia de editor | 8h |
| 5.4 | Integrar com VFS (S35) para abertura de arquivos | 4h |
| 5.5 | Testes de integracao fim-a-fim (abrir, editar, salvar, fechar) | 8h |

**Total Fase 5:** 30h

### Cronograma

```
Semana 1: Fase 1 (Editor Core)
Semana 2: Fase 2 (Contributions) + inicio Fase 3
Semana 3: Fase 3 (Navigation & Diff) + Fase 4 (OpenHandlers)
Semana 4: Fase 4 (Widget System) + Fase 5 (Integracao)
```

**Esforco total estimado:** ~188h (4 semanas)
**Dependencias:** S11 (Theia Platform), S35 (FileSystem), S39 (Settings/Keybindings), S42 (DI)
**Entregaveis:** EditorWidget funcional com contributions, navegacao, diff editor, open handlers, preferencias
