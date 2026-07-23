# ESTUDO S40 — WebView, Notifications & Layout System para Construcao de IDE

> **Arquitetura de layout shell, webview como container de UI de extensao, sistema de notificacoes e sua interligacao na plataforma IDEIA**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — Layout, WebView, Notifications |

---

## Sumario

1. [Introducao](#1-introducao)
2. [Layout System](#2-layout-system)
   2.1 [Architecture — Workbench Layout Model](#21-architecture--workbench-layout-model)
   2.2 [Activity Bar](#22-activity-bar)
   2.3 [Side Bar & Panel](#23-side-bar--panel)
   2.4 [Editor Area / Editor Groups](#24-editor-area--editor-groups)
   2.5 [Status Bar](#25-status-bar)
   2.6 [Layout Persistence](#26-layout-persistence)
   2.7 [Centered Layout & Zen Mode](#27-centered-layout--zen-mode)
   2.8 [Breadcrumbs](#28-breadcrumbs)
   2.9 [Title Bar & Menu Bar](#29-title-bar--menu-bar)
3. [Webview System](#3-webview-system)
   3.1 [Architecture](#31-architecture)
   3.2 [Webview API](#32-webview-api)
   3.3 [Webview Security Model](#33-webview-security-model)
   3.4 [Webview Communication](#34-webview-communication)
   3.5 [Custom Editors](#35-custom-editors)
   3.6 [Webview Views](#36-webview-views)
   3.7 [Tree View Webviews](#37-tree-view-webviews)
4. [Notification System](#4-notification-system)
   4.1 [Architecture](#41-architecture)
   4.2 [Notification Types](#42-notification-types)
   4.3 [Notification Actions](#43-notification-actions)
   4.4 [Progress Notifications](#44-progress-notifications)
   4.5 [Error Handling & Recovery](#45-error-handling--recovery)
   4.6 [Toast vs Modal Decision](#46-toast-vs-modal-decision)
5. [Code Examples](#5-code-examples)
6. [Conexoes](#6-conexoes)
7. [Plano de Implementacao](#7-plano-de-implementacao)

---

## 1. Introducao

### 1.1 The IDE Chrome

Todo IDE profissional expoe sua superficie de edicao dentro de um "chrome" -- uma borda de componentes de UI que circundam a area de edicao e fornecem navegacao, contexto e feedback. Este estudo cobre tres sistemas interligados que compoem esse chrome:

- **Layout System:** A estrutura fisica da janela -- activity bar, side bar, editor area, panel, status bar e como elas se organizam, redimensionam e persistem.
- **Webview System:** O mecanismo que permite que extensoes renderizem HTML/JS/CSS arbitrario dentro da superficie segura do IDE -- usado para custom editors, views ricas, paineis interativos e visualizacoes complexas.
- **Notification System:** O canal de comunicacao assincrono entre o sistema, extensoes e o usuario -- toasts, modais, barras de progresso e mensagens de erro.

### 1.2 Interplay dos Sistemas

\`\`\`
  +------------------------------------------------------------------+
  |  TITLE BAR (Custom or Native) + MENU BAR                          |
  +------------------------------------------------------------------+
  |  +--------+  +-----------+  +-------------+  +-----------+       |
  |  |ACTIVITY|  |  SIDE     |  |  EDITOR     |  |  SIDE     |       |
  |  | BAR    |  |  BAR      |  |  AREA       |  |  BAR      |       |
  |  |        |  |           |  |  (TABS +    |  |  (right)  |       |
  |  | icon   |  | Explorer  |  |   Monaco)   |  |           |       |
  |  | search |  | Search    |  |             |  | WebView   |       |
  |  | git    |  | SCM       |  |  WebView    |  | Views     |       |
  |  | debug  |  | WebViews  |  |  Custom     |  |           |       |
  |  | ext    |  |           |  |  Editors    |  |           |       |
  |  +--------+  +-----------+  +-------------+  +-----------+       |
  +------------------------------------------------------------------+
  |  PANEL (Bottom / Right) -- Terminal . Debug . Output . Problems   |
  |  WebView Views . Notifications Center                             |
  +------------------------------------------------------------------+
  |  STATUS BAR (Left: context | Right: notifications, language,      |
  |             encoding, line/col, feedback)                         |
  +------------------------------------------------------------------+

  NOTIFICATIONS:
  Toast slide-in (top-right or bottom-right)
  Notification Center (bell icon in status bar)
  Modal Dialog (centered overlay, blocking)
  Progress Notification (with cancellable bar)
\`\`\`

### 1.3 Principios Arquiteturais

| Principio | Descricao | Impacto na IDEIA |
|-----------|-----------|------------------|
| **Part System** | Cada regiao da shell e uma "part" independente com seu proprio layout | Parts podem ser ocultadas, movidas, redimensionadas sem afetar outras |
| **Grid Layout** | Editor area usa layout grid para posicionar grupos de editores | Flexibilidade total de split, zen mode, centered layout |
| **Sash Resize** | Todas as parts sao separadas por sashes (divisores draggable) | Usuario ajusta proporcoes livremente |
| **Webview as Foreign Content** | Webviews sao DOM iframes com origem restrita | Isolamento total de seguranca entre extensao e IDE |
| **Message Passing** | Webview se comunica com extensao via JSON postMessage | Canal bidirecional seguro sem acesso direto ao DOM do IDE |
| **Notification as Service** | Notificacoes sao gerenciadas por um servico central com fila | Priorizacao, grouping, supressao e telemetria unificados |
| **Serializable Layout** | Estado de layout e serializavel e restauravel por workspace | Persistencia de layout por projeto, multi-monitor |

---

## 2. Layout System

### 2.1 Architecture -- Workbench Layout Model

O layout do workbench e modelado como um conjunto de "parts" organizadas hierarquicamente. Cada part ocupa uma regiao da janela e e separada das demais por sashes (barras de redimensionamento).

#### 2.1.1 Part Hierarchy

\`\`\`
WorkbenchLayout
  +-- ActivityBarPart (left or right, fixed width)
  |     +-- ActivityBarItem[] (icons with badges)
  |     +-- GlobalActions (settings, accounts, etc.)
  +-- SideBarPart (left or right, resizable)
  |     +-- ViewContainer (stack of views with switcher)
  |     +-- ViewSwitcher (tabs for active views)
  +-- EditorPart (center, takes remaining space)
  |     +-- EditorGridLayout (CSS grid of editor groups)
  |     +-- EditorGroup[]
  |     |     +-- EditorTab[] (pinned, preview, dirty)
  |     |     +-- EditorControl (actions toolbar, breadcrumbs)
  |     +-- CenteredLayout (optional, constrains editor width)
  +-- PanelPart (bottom or right, resizable)
  |     +-- PanelSwitcher (tabs for active panels)
  |     +-- ViewContainer (stack of panel views)
  +-- StatusBarPart (bottom, fixed height)
  |     +-- StatusBarLeft (aligned left, priority-order)
  |     +-- StatusBarRight (aligned right, priority-order)
\`\`\`

#### 2.1.2 Part Interface

\`\`\`typescript
interface ILayoutPart {
  readonly id: string;
  readonly element: HTMLElement;
  minimumSize: number;
  maximumSize: number;
  preferredSize: number;
  snap: boolean;

  onDidChange: Event<Partial<PartState>>;
  layout(width: number, height: number, top: number, left: number): void;
  toJSON(): PartState;
  revive(state: PartState): void;
}

interface PartState {
  visible: boolean;
  size: number;
  position: 'left' | 'right' | 'bottom';
  views: ViewState[];
  activeViewId: string | undefined;
}

interface ViewState {
  id: string;
  visible: boolean;
  order: number;
  size?: number;
}
\`\`\`

#### 2.1.3 Layout Service

O LayoutService e o orquestrador central. Ele gerencia o ciclo de vida das parts, coordena o redimensionamento via sashes, serializa/restaura o layout e emite eventos de mudanca.

\`\`\`typescript
class LayoutService implements IDisposable {
  private parts: Map<string, ILayoutPart> = new Map();
  private sashes: Map<string, Sash> = new Map();
  private state: LayoutState;
  private readonly disposables: IDisposable[] = [];

  constructor(
    private readonly container: HTMLElement,
    private readonly storageService: IStorageService
  ) {
    this.state = this.loadLayoutState();
    this.createParts();
    this.createSashes();
    this.restorePartStates();
  }

  registerPart(part: ILayoutPart): void {
    this.parts.set(part.id, part);
    this.container.appendChild(part.element);
    this.layout();
  }

  getPart<T extends ILayoutPart>(id: string): T | undefined {
    return this.parts.get(id) as T | undefined;
  }

  layout(width?: number, height?: number): void {
    const w = width ?? this.container.clientWidth;
    const h = height ?? this.container.clientHeight;
    const parts = this.computeLayout(w, h);
    for (const [id, rect] of parts) {
      const part = this.parts.get(id);
      if (part) part.layout(rect.width, rect.height, rect.top, rect.left);
    }
  }

  private computeLayout(totalWidth: number, totalHeight: number): Map<string, DOMRect> {
    const rects = new Map<string, DOMRect>();
    const activityBarWidth = this.state.activityBarVisible ? this.state.activityBarWidth : 0;
    const sideBarWidth = this.state.sideBarVisible ? this.state.sideBarWidth : 0;
    const panelHeight = this.state.panelVisible ? this.state.panelHeight : 0;
    const editorX = activityBarWidth + sideBarWidth;
    const editorWidth = Math.max(300, totalWidth - activityBarWidth - sideBarWidth);
    rects.set('activitybar', new DOMRect(0, 0, activityBarWidth, totalHeight - panelHeight));
    rects.set('sidebar', new DOMRect(activityBarWidth, 0, sideBarWidth, totalHeight - panelHeight));
    rects.set('editor', new DOMRect(editorX, 0, editorWidth, totalHeight - panelHeight));
    rects.set('panel', new DOMRect(0, totalHeight - panelHeight, totalWidth, panelHeight));
    rects.set('statusbar', new DOMRect(0, totalHeight - 22, totalWidth, 22));
    return rects;
  }

  toggleMaximizedPanel(): void {
    const isMaximized = !this.state.panelMaximized;
    this.state.panelMaximized = isMaximized;
    if (isMaximized) {
      this.state.panelSavedHeight = this.state.panelHeight;
      this.state.panelHeight = this.container.clientHeight * 0.8;
    } else {
      this.state.panelHeight = this.state.panelSavedHeight ?? 200;
    }
    this.layout();
  }

  private loadLayoutState(): LayoutState {
    const raw = this.storageService.get('workbench.layout', '{}');
    return JSON.parse(raw) as LayoutState;
  }

  private persistLayout(): void {
    this.storageService.set('workbench.layout', JSON.stringify(this.state));
  }
}
\`\`\`

#### 2.1.4 Sash Resize System

\`\`\`typescript
interface ISash {
  readonly element: HTMLElement;
  readonly orientation: 'horizontal' | 'vertical';
  onDidStart: Event<PointerEvent>;
  onDidChange: Event<{ dx: number; dy: number }>;
  onDidEnd: Event<void>;
  layout(rect: DOMRect): void;
  dispose(): void;
}

class Sash implements ISash {
  private startPos = { x: 0, y: 0 };
  private currentDelta = 0;
  private readonly _onDidStart = new Emitter<PointerEvent>();
  private readonly _onDidChange = new Emitter<{ dx: number; dy: number }>();
  private readonly _onDidEnd = new Emitter<void>();
  readonly onDidStart = this._onDidStart.event;
  readonly onDidChange = this._onDidChange.event;
  readonly onDidEnd = this._onDidEnd.event;

  constructor(
    readonly element: HTMLElement,
    readonly orientation: 'horizontal' | 'vertical',
    private readonly onSashDrag: (delta: number) => void
  ) {
    this.element.classList.add('sash', 'sash-' + orientation);
    this.element.addEventListener('pointerdown', (e) => this.onPointerDown(e));
  }

  private onPointerDown(e: PointerEvent): void {
    this.startPos = { x: e.clientX, y: e.clientY };
    this._onDidStart.fire(e);
    this.element.setPointerCapture(e.pointerId);
    this.element.addEventListener('pointermove', this.onPointerMove);
    this.element.addEventListener('pointerup', this.onPointerUp);
  }

  private onPointerMove = (e: PointerEvent): void => {
    const dy = e.clientY - this.startPos.y;
    const dx = e.clientX - this.startPos.x;
    this.currentDelta = this.orientation === 'horizontal' ? dy : dx;
    this._onDidChange.fire({ dx, dy });
  };

  private onPointerUp = (): void => {
    this._onDidEnd.fire();
    this.onSashDrag(this.currentDelta);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
  };

  layout(rect: DOMRect): void {
    this.element.style.left = rect.left + 'px';
    this.element.style.top = rect.top + 'px';
    this.element.style.width = rect.width + 'px';
    this.element.style.height = rect.height + 'px';
  }

  dispose(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
  }
}
\`\`\`

#### 2.1.5 Editor Grid Layout

\`\`\`typescript
interface IEditorGridLayout {
  readonly container: HTMLElement;
  readonly groups: EditorGroup[];
  readonly activeGroup: EditorGroup | null;
  splitGroup(group: EditorGroup, direction: 'left' | 'right' | 'up' | 'down'): EditorGroup;
  mergeGroup(group: EditorGroup, target?: EditorGroup): void;
  focusGroup(group: EditorGroup): void;
  moveGroup(direction: 'left' | 'right' | 'up' | 'down'): void;
  toJSON(): EditorGridLayoutState;
  setGridLayout(layout: EditorGridLayoutState): void;
}

interface EditorGridLayoutState {
  orientation: 'horizontal' | 'vertical';
  cells: CellState[];
}

interface CellState {
  id: string;
  groupId: string;
  editors: string[];
  activeEditor: string | null;
  size: number;
  children?: CellState[];
}
\`\`\`

### 2.2 Activity Bar

#### 2.2.1 Activity Bar Items

A activity bar contem itens que representam as views primarias do workbench.

\`\`\`typescript
interface IActivityBarItem {
  readonly id: string;
  readonly icon: string;
  readonly title: string;
  readonly badge?: IActivityBadge;
  readonly command: string;
  readonly when?: string;
}

interface IActivityBadge {
  readonly count: number;
  readonly tooltip: string;
}
\`\`\`

#### 2.2.2 Activity Bar Positioning

A activity bar pode ser posicionada a esquerda ou a direita.

\`\`\`typescript
enum ActivityBarPosition {
  Left = 'left',
  Right = 'right',
}

interface IActivityBarService {
  readonly position: ActivityBarPosition;
  readonly items: IActivityBarItem[];
  readonly visible: boolean;
  setPosition(position: ActivityBarPosition): void;
  registerItem(item: IActivityBarItem): IDisposable;
  setBadge(itemId: string, badge: IActivityBadge | null): void;
  toggleVisibility(): void;
}
\`\`\`

#### 2.2.3 Activity Bar Contributions

\`\`\`typescript
interface ActivityBarContribution {
  id: string;
  title: string;
  icon: string;
  command: string;
  when?: string;
  badge?: { count: number; tooltip: string };
  position?: number;
}
\`\`\`

### 2.3 Side Bar & Panel

#### 2.3.1 Side Bar View Container

\`\`\`typescript
interface ISideBarPart extends ILayoutPart {
  readonly viewContainer: IViewContainer;
  readonly visible: boolean;
  readonly width: number;
  openView(viewId: string): void;
  toggleVisibility(): void;
  setWidth(width: number): void;
}

interface IViewContainer {
  readonly views: IViewDescriptor[];
  readonly activeViewId: string | undefined;
  openView(viewId: string): void;
  registerView(descriptor: IViewDescriptor): IDisposable;
  switchView(viewId: string): void;
  closeView(viewId: string): void;
}

interface IViewDescriptor {
  readonly id: string;
  readonly name: string;
  readonly icon?: string;
  readonly when?: string;
  readonly order: number;
  readonly canToggleVisibility: boolean;
}
\`\`\`

#### 2.3.2 Panel

\`\`\`typescript
interface IPanelPart extends ILayoutPart {
  readonly position: 'bottom' | 'right';
  readonly maximized: boolean;
  readonly height: number;
  readonly width: number;
  toggleMaximized(): void;
  setPosition(position: 'bottom' | 'right'): void;
  setSize(size: number): void;
  openPanel(viewId: string): void;
}
\`\`\`

#### 2.3.3 Panel Contributions

\`\`\`typescript
interface PanelContribution {
  id: string;
  name: string;
  icon?: string;
  when?: string;
  badge?: { count: number; tooltip: string };
  viewType: 'treeview' | 'webview' | 'custom';
}
\`\`\`

### 2.4 Editor Area / Editor Groups

#### 2.4.1 Editor Group Model

\`\`\`typescript
interface IEditorGroup {
  readonly id: string;
  readonly editors: IEditorInput[];
  readonly activeEditor: IEditorInput | null;
  readonly count: number;
  readonly isPinned: (editor: IEditorInput) => boolean;
  readonly isDirty: (editor: IEditorInput) => boolean;
  readonly isPreview: (editor: IEditorInput) => boolean;
  openEditor(input: IEditorInput, options?: EditorOpenOptions): Promise<void>;
  closeEditor(input: IEditorInput): Promise<void>;
  pinEditor(input: IEditorInput): void;
  setActive(input: IEditorInput): void;
  moveEditor(input: IEditorInput, targetGroup: IEditorGroup): void;
  closeAllEditors(): Promise<void>;
  closeOthersEditors(input: IEditorInput): Promise<void>;
  onDidEditorChange: Event<EditorChangeEvent>;
}

interface IEditorInput {
  readonly resource: URI;
  readonly typeId: string;
  readonly name: string;
  readonly description?: string;
  readonly dirty: boolean;
  readonly capabilities: EditorCapabilities;
}

interface EditorOpenOptions {
  readonly pinned?: boolean;
  readonly preserveFocus?: boolean;
  readonly sideBySide?: boolean;
  readonly index?: number;
}

interface EditorCapabilities {
  readonly canSplit: boolean;
  readonly canPreview: boolean;
  readonly supportsMultipleEditors: boolean;
}
\`\`\`

#### 2.4.2 Editor Tabs

\`\`\`typescript
interface IEditorTab {
  readonly input: IEditorInput;
  readonly pinned: boolean;
  readonly preview: boolean;
  readonly dirty: boolean;
  readonly active: boolean;
  readonly label: string;
  readonly icon?: string;
  readonly decoration?: 'dirty' | 'git-modified' | 'git-added' | 'git-deleted';
}

enum TabSizing {
  Fit = 'fit',
  Shrink = 'shrink',
  Fixed = 'fixed',
}

interface IEditorTabsOptions {
  sizing: TabSizing;
  pinnedTabWidth: number;
  unpinnedTabWidth: number;
  maxTabCount: number;
  showIcons: boolean;
  showActions: 'always' | 'onHover' | 'active';
  enablePreview: boolean;
  previewDelay: number;
}
\`\`\`

#### 2.4.3 Editor Actions Toolbar

\`\`\`typescript
interface IEditorActionsToolbar {
  readonly actions: IEditorAction[];
  addAction(action: IEditorAction): IDisposable;
  removeAction(actionId: string): void;
}

interface IEditorAction {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly command: string;
  readonly when?: string;
}
\`\`\`

### 2.5 Status Bar

#### 2.5.1 Status Bar Items

\`\`\`typescript
interface IStatusBarItem {
  readonly id: string;
  readonly label: string;
  readonly name: string;
  readonly alignment: StatusBarAlignment;
  readonly priority: number;
  readonly command?: string;
  readonly tooltip?: string;
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly accessibilityInformation?: AccessibilityInfo;
  show(): void;
  hide(): void;
  dispose(): void;
}

enum StatusBarAlignment {
  Left = 0,
  Right = 1,
}

interface AccessibilityInfo {
  readonly label: string;
  readonly role?: string;
  readonly ariaLive?: 'polite' | 'assertive' | 'off';
}
\`\`\`

#### 2.5.2 Status Bar Contributions

\`\`\`typescript
interface StatusBarContribution {
  id: string;
  label: string;
  command?: string;
  alignment: 'left' | 'right';
  priority: number;
  tooltip?: string;
  color?: string;
  backgroundColor?: string;
  when?: string;
}
\`\`\`

### 2.6 Layout Persistence

#### 2.6.1 Layout State Serialization

\`\`\`typescript
interface LayoutState {
  version: number;
  activityBar: {
    position: 'left' | 'right';
    visible: boolean;
    width: number;
  };
  sideBar: {
    position: 'left' | 'right';
    visible: boolean;
    width: number;
    views: { id: string; visible: boolean; order: number }[];
    activeView: string;
  };
  editorGrid: {
    orientation: 'horizontal' | 'vertical';
    groups: {
      id: string;
      editors: string[];
      activeEditor: string | null;
      pinnedEditors: string[];
    }[];
  };
  panel: {
    position: 'bottom' | 'right';
    visible: boolean;
    height: number;
    maximized: boolean;
    views: { id: string; visible: boolean }[];
    activeView: string;
  };
  statusBar: { visible: boolean };
  centeredLayout: { enabled: boolean; width: number };
  zenMode: {
    active: boolean;
    hideActivityBar: boolean;
    hideStatusBar: boolean;
    hidePanel: boolean;
    centerLayout: boolean;
    fullScreen: boolean;
  };
  breadcrumbs: { enabled: boolean; filePath: boolean; symbols: boolean };
}
\`\`\`

#### 2.6.2 Multi-Monitor and Window State

\`\`\`typescript
interface WindowState {
  readonly bounds: Rectangle;
  readonly monitor: number;
  readonly maximized: boolean;
  readonly fullScreen: boolean;
  readonly focused: boolean;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}
\`\`\`

### 2.7 Centered Layout & Zen Mode

#### 2.7.1 Centered Editor Layout

\`\`\`typescript
interface ICenteredLayout {
  enabled: boolean;
  width: number;
  leftMargin: number;
  rightMargin: number;
}

class CenteredLayoutController {
  private _enabled = false;
  private _width = 900;
  private readonly editorContainer: HTMLElement;

  constructor(editorContainer: HTMLElement) {
    this.editorContainer = editorContainer;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  enable(width?: number): void {
    this._enabled = true;
    this._width = width ?? 900;
    this.applyLayout();
  }

  disable(): void {
    this._enabled = false;
    this.applyLayout();
  }

  private applyLayout(): void {
    if (this._enabled) {
      this.editorContainer.style.maxWidth = this._width + 'px';
      this.editorContainer.style.marginLeft = 'auto';
      this.editorContainer.style.marginRight = 'auto';
    } else {
      this.editorContainer.style.maxWidth = '';
      this.editorContainer.style.marginLeft = '';
      this.editorContainer.style.marginRight = '';
    }
  }
}
\`\`\`

#### 2.7.2 Zen Mode

\`\`\`typescript
interface IZenMode {
  readonly active: boolean;
  enter(): void;
  exit(): void;
  toggle(): void;
}

class ZenMode implements IZenMode {
  private _active = false;
  private previousState!: LayoutState;

  constructor(
    private readonly layoutService: LayoutService,
    private readonly centeredLayout: CenteredLayoutController,
    private readonly windowService: IWindowService
  ) {}

  get active(): boolean {
    return this._active;
  }

  enter(): void {
    this.previousState = this.layoutService.getState();
    this.centeredLayout.enable(900);
    this.layoutService.hideAllChrome();
    this.windowService.setFullScreen(true);
    this._active = true;
  }

  exit(): void {
    if (!this._active) return;
    this.layoutService.restoreState(this.previousState);
    this.centeredLayout.disable();
    this.windowService.setFullScreen(false);
    this._active = false;
  }

  toggle(): void {
    this._active ? this.exit() : this.enter();
  }
}
\`\`\`

### 2.8 Breadcrumbs

#### 2.8.1 Breadcrumbs Model

\`\`\`typescript
interface IBreadcrumbsModel {
  readonly filePath: BreadcrumbItem[];
  readonly symbols: BreadcrumbItem[];
  readonly active: boolean;
}

interface BreadcrumbItem {
  readonly label: string;
  readonly uri?: URI;
  readonly icon?: string;
  readonly range?: IRange;
  readonly kind: 'file' | 'folder' | 'symbol' | 'separator';
  readonly symbolKind?: SymbolKind;
}

enum SymbolKind {
  Module = 0, Class = 1, Interface = 2, Method = 3,
  Function = 4, Variable = 5, Enum = 6, Namespace = 7,
}

interface IBreadcrumbsService {
  readonly visible: boolean;
  readonly model: IBreadcrumbsModel | null;
  show(): void;
  hide(): void;
  toggle(): void;
  update(): Promise<void>;
}
\`\`\`

#### 2.8.2 Interactive Breadcrumbs

\`\`\`typescript
class BreadcrumbsController {
  constructor(
    private readonly breadcrumbsService: IBreadcrumbsService,
    private readonly quickInputService: IQuickInputService
  ) {}

  async onBreadcrumbClick(index: number, item: BreadcrumbItem): Promise<void> {
    if (item.kind === 'file' || item.kind === 'folder') {
      await this.showFileNavigation(item);
    } else if (item.kind === 'symbol') {
      await this.navigateToSymbol(item);
    }
  }

  private async showFileNavigation(item: BreadcrumbItem): Promise<void> {
    const items = await this.getSiblingFiles(item.uri!);
    const picked = await this.quickInputService.showQuickPick(items);
    if (picked) await this.openEditor(picked.uri);
  }

  private async navigateToSymbol(item: BreadcrumbItem): Promise<void> {
    if (item.range) await this.editorService.revealRange(item.range);
  }
}
\`\`\`

### 2.9 Title Bar & Menu Bar

#### 2.9.1 Custom Title Bar

\`\`\`typescript
interface ITitleBar {
  readonly element: HTMLElement;
  readonly visible: boolean;
  readonly height: number;
  show(): void;
  hide(): void;
  setTitle(title: string): void;
  setWindowControls(controls: WindowControl[]): void;
  onDoubleClick: Event<void>;
}

interface WindowControl {
  type: 'minimize' | 'maximize' | 'restore' | 'close';
  icon: string;
  label: string;
}

class CustomTitleBar implements ITitleBar {
  readonly element: HTMLElement;
  private titleElement: HTMLElement;
  private controlsContainer: HTMLElement;
  private _height = 30;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'ideia-titlebar';
    this.titleElement = document.createElement('span');
    this.titleElement.className = 'ideia-titlebar-title';
    this.element.appendChild(this.titleElement);
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.className = 'ideia-titlebar-controls';
    this.element.appendChild(this.controlsContainer);
  }

  get visible(): boolean {
    return this.element.style.display !== 'none';
  }

  get height(): number {
    return this._height;
  }

  show(): void { this.element.style.display = ''; }
  hide(): void { this.element.style.display = 'none'; }
  setTitle(title: string): void { this.titleElement.textContent = title; }

  setWindowControls(controls: WindowControl[]): void {
    this.controlsContainer.innerHTML = '';
    for (const control of controls) {
      const btn = document.createElement('button');
      btn.className = 'window-control ' + control.type;
      btn.setAttribute('aria-label', control.label);
      btn.innerHTML = control.icon;
      this.controlsContainer.appendChild(btn);
    }
  }
}
\`\`\`

#### 2.9.2 Menu Bar

\`\`\`typescript
interface IMenuBar {
  readonly menus: IMenu[];
  readonly visible: boolean;
  readonly mode: 'native' | 'custom';
  show(): void;
  hide(): void;
  toggleVisibility(): void;
  setMode(mode: 'native' | 'custom'): void;
  registerMenu(menu: IMenu): IDisposable;
}

interface IMenu {
  readonly id: string;
  readonly label: string;
  readonly items: IMenuItem[];
}

interface IMenuItem {
  readonly id: string;
  readonly label: string;
  readonly command?: string;
  readonly icon?: string;
  readonly keybinding?: string;
  readonly when?: string;
  readonly group?: string;
  readonly type: 'item' | 'submenu' | 'separator' | 'checkbox';
  readonly checked?: boolean;
  readonly submenu?: IMenuItem[];
}
\`\`\`


---

## 3. Webview System

### 3.1 Architecture

Webviews sao iframes isolados que exibem conteudo HTML/JS/CSS fornecido por extensoes. Eles rodam em uma origem restrita (vscode-webview://) e se comunicam com a extensao via postMessage.

#### 3.1.1 Webview Manager

```typescript
interface IWebviewManager {
  createWebview(options: WebviewOptions): IWebview;
  createWebviewPanel(viewType: string, title: string, options: WebviewPanelOptions): IWebviewPanel;
  reviveWebviewPanel(state: WebviewPanelState): IWebviewPanel | null;
  getAllWebviews(): IWebview[];
  onDidCreateWebview: Event<IWebview>;
}

interface WebviewOptions {
  readonly id: string;
  readonly enableScripts: boolean;
  readonly localResourceRoots: URI[];
  readonly portMapping?: PortMapping[];
  readonly enableCommandUris?: boolean;
  readonly enableFindWidget?: boolean;
}

interface WebviewPanelOptions extends WebviewOptions {
  readonly showOptions?: ViewColumn | { viewColumn: ViewColumn; preserveFocus: boolean };
  readonly retainContextWhenHidden?: boolean;
}

interface PortMapping {
  readonly webviewPort: number;
  readonly extensionHostPort: number;
}

interface WebviewPanelState {
  readonly viewType: string;
  readonly title: string;
  readonly viewColumn: ViewColumn;
  readonly webviewState: unknown;
  readonly options: WebviewPanelOptions;
}
```

#### 3.1.2 Webview Lifecycle

```
CREATED:   webview element created, iframe appended to DOM, initial state set
LOADING:   content set via html property, iframe navigating to srcdoc/blob URL
LOADED:    iframe onload fired, acquireVsCodeApi available, message channel active
VISIBLE:   webview visible in viewport (intersection observer), receives layout
HIDDEN:    webview scrolled out or tab unfocused, may release resources
RELEASED:  resources freed (unless retainContextWhenHidden=true), DOM element detached
DESTROYED: webview disposed, all event listeners removed, memory reclaimed
```

### 3.2 Webview API

#### 3.2.1 WebviewPanel Creation

```typescript
interface IWebviewPanel {
  readonly viewType: string;
  readonly title: string;
  readonly iconPath?: URI | { light: URI; dark: URI };
  readonly visible: boolean;
  readonly active: boolean;
  readonly viewColumn: ViewColumn;
  readonly webview: IWebview;
  readonly options: WebviewPanelOptions;

  reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void;
  setTitle(title: string): void;
  setIconPath(iconPath: URI | { light: URI; dark: URI }): void;
  dispose(): void;
  onDidChangeViewState: Event<WebviewPanelViewState>;
  onDidDispose: Event<void>;
}

interface IWebview {
  readonly id: string;
  readonly html: string;
  readonly options: WebviewOptions;
  readonly cspSource: string;
  readonly viewState: WebviewViewState | null;

  postMessage(message: unknown): Promise<boolean>;
  onDidReceiveMessage: Event<unknown>;
  setHtml(html: string): void;
  setOptions(options: Partial<WebviewOptions>): void;
  dispose(): void;
}
```

#### 3.2.2 Webview HTML Content

```typescript
const panel = window.createWebviewPanel('myView', 'My View', ViewColumn.One, {
  enableScripts: true,
  localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
  retainContextWhenHidden: true,
});

panel.webview.html = [
  '<!DOCTYPE html><html><head>',
  '<meta charset="UTF-8">',
  '<meta http-equiv="Content-Security-Policy"',
  '  content="default-src '"'"'none'"'"';',
  '           style-src '"'"'' + panel.webview.cspSource + "'"'' '"'"'unsafe-inline'"'"';',
  '           script-src '"'"'' + panel.webview.cspSource + "'"'';">',
  '<link rel="stylesheet" href="' + panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'style.css')
  ) + '">',
  '</head><body>',
  '<div id="app"></div>',
  '<script src="' + panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'main.js')
  ) + '"></script>',
  '</body></html>',
].join('\n');
```

### 3.3 Webview Security Model

#### 3.3.1 Origin Restrictions

Cada webview e servido de uma origem especial vscode-webview:// que e unica por webview.

```
Webview Origin: vscode-webview://<UUID>.webview.vscode-resource.vscode-cdn.net
IDE Origin:     file:// ou http://localhost:3001
Extension:      vscode-resource:// ou theia-resource://
```

#### 3.3.2 Content Security Policy

```typescript
function generateCSP(webview: IWebview, options: WebviewCSPOptions): string {
  const resourceScheme = 'vscode-webview-resource:';
  const directives: string[] = [
    'default-src '"'"'none'"'"'',
    'style-src ' + resourceScheme + ' '"'"'unsafe-inline'"'"'',
    'script-src ' + resourceScheme,
    'font-src ' + resourceScheme,
    'img-src ' + resourceScheme + ' data: https:',
    'connect-src ' + resourceScheme,
  ];
  if (options.enableCommandUris) {
    directives.push('frame-src '"'"'self'"'"'');
  }
  return directives.join('; ');
}
```

#### 3.3.3 Local Resource Access

```typescript
interface IWebviewResourceService {
  asWebviewUri(localUri: URI): URI;
  getResourceRoots(): URI[];
  addResourceRoot(root: URI): void;
  removeResourceRoot(root: URI): void;
}

class WebviewResourceService implements IWebviewResourceService {
  private resourceRoots: Set<string> = new Set();

  constructor(private readonly webviewId: string) {}

  asWebviewUri(localUri: URI): URI {
    const webviewScheme = 'vscode-webview-resource';
    return URI.from({ scheme: webviewScheme, authority: this.webviewId, path: localUri.path });
  }

  addResourceRoot(root: URI): void { this.resourceRoots.add(root.toString()); }
  removeResourceRoot(root: URI): void { this.resourceRoots.delete(root.toString()); }
  getResourceRoots(): URI[] {
    return Array.from(this.resourceRoots).map((s) => URI.parse(s));
  }
}
```

#### 3.3.4 Security Restrictions Summary

| Restricao | Detalhe | Bypass permitido |
|-----------|---------|------------------|
| Origin restrita | vscode-webview:// unico | Nao |
| CSP forcado | script-src restrito a resource scheme | Nao (extensao pode customizar) |
| Recursos locais | So dentro de localResourceRoots | Sim (extensao adiciona root) |
| Command URIs | Bloqueado por padrao | Sim (enableCommandUris) |
| Iframe sandbox | Sandbox attribute no iframe | Sim (configuravel) |
| postMessage | Apenas mensagens JSON serializaveis | Sim (structured clone) |
| Eval() | Bloqueado por CSP | Nao |
| Rede externa | Bloqueado por padrao (connect-src) | Sim (CSP customizada) |

### 3.4 Webview Communication

#### 3.4.1 postMessage Protocol

```typescript
interface WebviewMessage {
  readonly type: string;
  readonly payload: unknown;
  readonly requestId?: string;
  readonly timestamp: number;
}

// Extension to webview
panel.webview.postMessage({
  type: 'updateData',
  payload: { items: [1, 2, 3] },
  timestamp: Date.now(),
});

// Webview to extension
panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
  switch (message.type) {
    case 'buttonClick':
      handleButtonClick(message.payload);
      break;
    case 'requestData':
      sendResponse(message.requestId!, getData());
      break;
    default:
      console.warn('Unhandled message:', message.type);
  }
});
```

#### 3.4.2 Request/Response Pattern

```typescript
// Webview-side JavaScript (runs inside iframe)
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

class WebviewRPCClient {
  private requestId = 0;
  private pending = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  constructor() {
    window.addEventListener('message', (event: MessageEvent) => {
      const msg = event.data as WebviewMessage;
      if (msg.requestId && this.pending.has(msg.requestId)) {
        const p = this.pending.get(msg.requestId)!;
        clearTimeout(p.timer);
        this.pending.delete(msg.requestId);
        if (msg.type === 'error') {
          p.reject(new Error(String(msg.payload)));
        } else {
          p.resolve(msg.payload);
        }
      }
    });
  }

  request(method: string, params?: unknown, timeoutMs = 10000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const rid = 'rpc_' + (++this.requestId) + '_' + Date.now();
      const timer = setTimeout(() => {
        this.pending.delete(rid);
        reject(new Error('RPC timeout: ' + method));
      }, timeoutMs);
      this.pending.set(rid, { resolve, reject, timer });
      vscode.postMessage({ type: 'request', method, params, requestId: rid, timestamp: Date.now() });
    });
  }
}
```

#### 3.4.3 Streaming Updates

```typescript
interface ChunkedMessage {
  type: 'chunk';
  streamId: string;
  index: number;
  total: number;
  data: string;
  final: boolean;
}

class ChunkedReceiver {
  private buffers = new Map<string, string[]>();

  receive(msg: ChunkedMessage): string | null {
    let buf = this.buffers.get(msg.streamId);
    if (!buf) {
      buf = new Array(msg.total);
      this.buffers.set(msg.streamId, buf);
    }
    buf[msg.index] = msg.data;
    if (msg.final) {
      this.buffers.delete(msg.streamId);
      return buf.join('');
    }
    return null;
  }
}

// Binary transport via ArrayBuffer (transferable)
interface BinaryWebviewMessage {
  type: 'binary';
  mimeType: string;
  buffer: ArrayBuffer;
  metadata?: Record<string, string>;
}
```

### 3.5 Custom Editors

#### 3.5.1 CustomTextEditorProvider

```typescript
interface ICustomTextEditorProvider {
  readonly typeId: string;
  readonly displayName: string;
  readonly selector: DocumentSelector;

  openCustomDocument(
    uri: URI,
    openContext: CustomDocumentOpenContext,
    token: CancellationToken
  ): Promise<ICustomDocument>;

  resolveCustomEditor(
    document: ICustomDocument,
    webviewPanel: IWebviewPanel,
    token: CancellationToken
  ): Promise<void>;
}

interface ICustomDocument {
  readonly uri: URI;
  dispose(): void;
  onDidDispose: Event<void>;
  onDidChange: Event<CustomDocumentChangeEvent>;
}

interface CustomDocumentChangeEvent {
  readonly label?: string;
  readonly undoStack: unknown[];
  readonly redoStack: unknown[];
}

interface CustomDocumentOpenContext {
  readonly backupId?: string;
  readonly untitledDocumentData?: Uint8Array;
}

type DocumentSelector = Array<{ pattern: string } | { scheme: string }>;
```

#### 3.5.2 CustomReadonlyEditorProvider

Para editores que nao suportam edicao (previews, visualizadores).

```typescript
interface ICustomReadonlyEditorProvider {
  readonly typeId: string;
  readonly displayName: string;
  readonly selector: DocumentSelector;

  openCustomDocument(
    uri: URI,
    openContext: CustomDocumentOpenContext,
    token: CancellationToken
  ): Promise<ICustomDocument>;

  resolveCustomEditor(
    document: ICustomDocument,
    webviewPanel: IWebviewPanel,
    token: CancellationToken
  ): Promise<void>;
}
```

#### 3.5.3 Edit Operations and Undo/Redo

```typescript
interface ICustomEditOperation {
  readonly label: string;
  readonly undo: () => void;
  readonly redo: () => void;
}

class CustomDocumentEditManager {
  private undoStack: ICustomEditOperation[] = [];
  private redoStack: ICustomEditOperation[] = [];
  private readonly maxStackSize = 200;

  pushEdit(operation: ICustomEditOperation): void {
    this.undoStack.push(operation);
    this.redoStack = [];
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
  }

  undo(): void {
    const op = this.undoStack.pop();
    if (op) { op.undo(); this.redoStack.push(op); }
  }

  redo(): void {
    const op = this.redoStack.pop();
    if (op) { op.redo(); this.undoStack.push(op); }
  }

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
}
```

### 3.6 Webview Views

#### 3.6.1 WebviewViewProvider

```typescript
interface IWebviewViewProvider {
  readonly viewType: string;
  readonly viewId: string;
  resolveWebviewView(
    webviewView: IWebviewView,
    context: WebviewViewResolveContext,
    token: CancellationToken
  ): Promise<void>;
}

interface IWebviewView {
  readonly webview: IWebview;
  readonly viewId: string;
  readonly title: string;
  readonly description?: string;
  readonly badge?: IActivityBadge;
  readonly visible: boolean;
  readonly onDidChangeVisibility: Event<boolean>;
  readonly onDidDispose: Event<void>;
  show(preserveFocus?: boolean): void;
  setTitle(title: string): void;
  setDescription(description: string): void;
  setBadge(badge: IActivityBadge | null): void;
  dispose(): void;
}

interface WebviewViewResolveContext {
  readonly viewColumn: ViewColumn;
}
```

#### 3.6.2 Theme and Visibility Events

```typescript
class ThemeAwareWebviewViewProvider implements IWebviewViewProvider {
  private webviewView: IWebviewView | null = null;

  constructor(
    private readonly viewType: string,
    private readonly viewId: string,
    private readonly themeService: IThemeService
  ) {}

  async resolveWebviewView(
    webviewView: IWebviewView,
    context: WebviewViewResolveContext,
    token: CancellationToken
  ): Promise<void> {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    webviewView.webview.html = this.renderHtml();
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) this.refreshView();
    });

    this.themeService.onDidColorThemeChange(() => {
      if (this.webviewView?.visible) {
        this.webviewView.webview.postMessage({
          type: 'themeChanged',
          payload: this.themeService.getCurrentTheme(),
        });
      }
    });
  }

  private refreshView(): void {
    const data = this.loadData();
    this.webviewView?.webview.postMessage({ type: 'refresh', payload: data });
  }

  private renderHtml(): string {
    return '<html>...</html>';
  }

  private loadData(): unknown {
    return [];
  }
}
```

### 3.7 Tree View Webviews

#### 3.7.1 Hybrid Approach

Tree views renderizadas via webview permitem visualizacoes customizadas que a tree view nativa nao suporta.

```typescript
interface TreeNode {
  id: string;
  label: string;
  icon?: string;
  children?: TreeNode[];
  data?: unknown;
  collapsibleState: 'collapsed' | 'expanded' | 'none';
}

class WebviewTreeViewProvider implements IWebviewViewProvider {
  private treeData: TreeNode[] = [];
  private webviewView: IWebviewView | null = null;

  async resolveWebviewView(
    webviewView: IWebviewView,
    context: WebviewViewResolveContext,
    token: CancellationToken
  ): Promise<void> {
    this.webviewView = webviewView;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [] };
    webviewView.webview.html = this.generateTreeHtml();
    webviewView.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));
  }

  private generateTreeHtml(): string {
    return '<!DOCTYPE html><html><head>' +
      '<style>' +
        'body { font-family: var(--vscode-font-family); font-size: 13px; padding: 4px; }' +
        '.tree-node { cursor: pointer; padding: 2px 4px; }' +
        '.tree-node:hover { background: var(--vscode-list-hoverBackground); }' +
        '.tree-node.selected { background: var(--vscode-list-activeSelectionBackground); }' +
        '.toggle { width: 16px; display: inline-block; text-align: center; }' +
      '</style></head><body>' +
      '<div id="tree"></div>' +
      '<script>' +
        'const vscode = acquireVsCodeApi();' +
        'function render(nodes, depth) {' +
          'return nodes.map(n => {' +
            'const pad = depth * 16;' +
            'const hasChildren = n.children && n.children.length > 0;' +
            'const expanded = n.collapsibleState === "expanded";' +
            'return "<div class=\\"tree-node\\" style=\\"padding-left:" + pad + "px\\" data-id=\\"" + n.id + ' +
              '\\" onclick=\\"vscode.postMessage({type: \\'toggle\\', id: this.dataset.id})\\">' +
              '<span class=\\"toggle\\">' + (hasChildren ? (expanded ? "v" : ">") : "&nbsp;") + '</span>' +
              (n.icon ? "<span class=\\"icon\\">" + n.icon + "</span> " : "") +
              '<span>' + n.label + '</span>' +
            '</div>' +
            (hasChildren && expanded ? render(n.children, depth + 1) : "");' +
          '}).join("");' +
        '}' +
        'window.addEventListener("message", e => {' +
          'if (e.data.type === "setData") {' +
            'document.getElementById("tree").innerHTML = render(e.data.payload, 0);' +
          '}' +
        '});' +
      '</script></body></html>';
  }

  private handleMessage(msg: unknown): void {
    const message = msg as { type: string; id?: string };
    switch (message.type) {
      case 'toggle':
        this.handleToggle(message.id!);
        break;
      case 'select':
        this.handleSelect(message.id!);
        break;
    }
  }

  private handleToggle(id: string): void {
    this.treeData = this.toggleNode(this.treeData, id);
    this.updateView();
  }

  private toggleNode(nodes: TreeNode[], id: string): TreeNode[] {
    return nodes.map((n) => {
      if (n.id === id) {
        const state = n.collapsibleState === 'expanded' ? 'collapsed' : 'expanded';
        return { ...n, collapsibleState: state as 'collapsed' | 'expanded' };
      }
      if (n.children) return { ...n, children: this.toggleNode(n.children, id) };
      return n;
    });
  }

  private updateView(): void {
    this.webviewView?.webview.postMessage({ type: 'setData', payload: this.treeData });
  }

  private handleSelect(id: string): void {
    // select logic
  }
}
```

---

## 4. Notification System

### 4.1 Architecture

O sistema de notificacoes gerencia a fila, exibicao, grouping e acoes de mensagens do sistema e de extensoes.

#### 4.1.1 Notification Service

```typescript
interface INotificationService {
  readonly notifications: INotification[];
  readonly toasts: IToast[];
  readonly centerVisible: boolean;

  info(message: string, options?: NotificationOptions): IDisposable;
  warn(message: string, options?: NotificationOptions): IDisposable;
  error(message: string, options?: NotificationOptions): IDisposable;
  showProgress(notification: IProgressNotification): IDisposable;
  showModal(options: ModalOptions): Promise<ModalResult>;
  showInputBox(options: InputBoxOptions): Promise<string | undefined>;
  showQuickPick<T extends QuickPickItem>(items: T[], options: QuickPickOptions): Promise<T | undefined>;
  showNotificationCenter(): void;
  hideNotificationCenter(): void;
  dismiss(notificationId: string): void;
  clearAll(): void;
  onDidAddNotification: Event<INotification>;
  onDidRemoveNotification: Event<INotification>;
}

interface NotificationOptions {
  readonly id?: string;
  readonly source?: string;
  readonly actions?: NotificationAction[];
  readonly suppressIfOpen?: boolean;
  readonly urgency?: NotificationUrgency;
  readonly duration?: number;
  readonly telemetry?: Record<string, unknown>;
  readonly helpUri?: URI;
  readonly tags?: string[];
}

enum NotificationUrgency {
  Low = 0,
  Medium = 1,
  High = 2,
  Critical = 3,
}

interface NotificationAction {
  readonly id: string;
  readonly label: string;
  readonly tooltip?: string;
  readonly command?: string;
  readonly type: 'primary' | 'secondary' | 'help' | 'settings';
}
```

#### 4.1.2 Notification Model

```typescript
interface INotification {
  readonly id: string;
  readonly severity: NotificationSeverity;
  readonly message: string;
  readonly source?: string;
  readonly actions: NotificationAction[];
  readonly progress?: IProgressState;
  readonly timestamp: number;
  readonly dismissed: boolean;
  readonly urgency: NotificationUrgency;
  readonly duplicates: number;
  dismiss(): void;
  setProgress(progress: IProgressState): void;
}

enum NotificationSeverity {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Progress = 'progress',
}

interface IProgressState {
  readonly message?: string;
  readonly increment?: number;
  readonly total?: number;
  readonly worked?: number;
  readonly cancellable: boolean;
  cancelled: boolean;
}
```

#### 4.1.3 Notification Queue

```typescript
class NotificationQueue {
  private queue: INotification[] = [];
  private activeToasts: INotification[] = [];
  private readonly maxVisibleToasts = 3;
  private readonly defaultDuration = 5000;

  constructor(
    private readonly toastRenderer: IToastRenderer,
    private readonly notificationCenter: INotificationCenter
  ) {}

  enqueue(notification: INotification): void {
    const existing = this.findGroupable(notification);
    if (existing) {
      existing.duplicates++;
      this.toastRenderer.updateToast(existing);
      this.notificationCenter.updateNotification(existing);
      return;
    }
    this.queue.push(notification);
    this.processQueue();
  }

  private processQueue(): void {
    while (this.activeToasts.length < this.maxVisibleToasts && this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.activeToasts.push(next);
      this.toastRenderer.showToast(next);
      if (next.urgency === NotificationUrgency.Low && next.duration !== 0) {
        setTimeout(() => this.dismiss(next.id), next.duration ?? this.defaultDuration);
      }
    }
  }

  private findGroupable(notification: INotification): INotification | undefined {
    return [...this.queue, ...this.activeToasts].find(
      (n) => n.message === notification.message
        && n.severity === notification.severity
        && n.source === notification.source
    );
  }

  dismiss(id: string): void {
    this.toastRenderer.hideToast(id);
    this.activeToasts = this.activeToasts.filter((n) => n.id !== id);
    this.processQueue();
  }

  clearAll(): void {
    this.toastRenderer.clearAll();
    this.queue = [];
    this.activeToasts = [];
  }
}
```

#### 4.1.4 Toast Renderer

```typescript
interface IToastRenderer {
  readonly count: number;
  showToast(notification: INotification): void;
  updateToast(notification: INotification): void;
  hideToast(id: string): void;
  clearAll(): void;
}

class ToastRenderer implements IToastRenderer {
  private container: HTMLElement;
  protected toasts = new Map<string, HTMLElement>();

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.className = 'ideia-toast-container';
  }

  get count(): number { return this.toasts.size; }

  showToast(notification: INotification): void {
    const el = document.createElement('div');
    el.className = 'ideia-toast severity-' + notification.severity;
    el.setAttribute('role', 'alert');
    el.innerHTML = [
      '<div class="toast-icon">' + this.iconFor(notification.severity) + '</div>',
      '<div class="toast-content">',
      '  <div class="toast-message">' + notification.message + '</div>',
      notification.source ? '<div class="toast-source">' + notification.source + '</div>' : '',
      '  <div class="toast-actions">',
      notification.actions.filter(a => a.type === 'primary').map(a =>
        '<button class="toast-action" data-id="' + a.id + '">' + a.label + '</button>'
      ).join(''),
      '    <button class="toast-dismiss">&times;</button>',
      '  </div>',
      '</div>',
    ].join('');

    el.querySelector('.toast-dismiss')?.addEventListener('click', () => this.hideToast(notification.id));
    el.querySelectorAll('.toast-action').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = notification.actions.find(a => a.id === btn.getAttribute('data-id'));
        if (action?.command) this.executeAction(action.command);
        this.hideToast(notification.id);
      });
    });

    this.toasts.set(notification.id, el);
    this.container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('visible'));
  }

  updateToast(notification: INotification): void {
    const el = this.toasts.get(notification.id);
    if (!el) return;
    const badge = el.querySelector('.toast-duplicates');
    if (badge) badge.textContent = String(notification.duplicates);
  }

  hideToast(id: string): void {
    const el = this.toasts.get(id);
    if (!el) return;
    el.classList.remove('visible');
    setTimeout(() => { el.remove(); this.toasts.delete(id); }, 300);
  }

  clearAll(): void {
    for (const id of this.toasts.keys()) this.hideToast(id);
  }

  private iconFor(severity: NotificationSeverity): string {
    switch (severity) {
      case NotificationSeverity.Info: return 'i';
      case NotificationSeverity.Warning: return '!';
      case NotificationSeverity.Error: return 'x';
      case NotificationSeverity.Progress: return 'o';
    }
  }

  private executeAction(command: string): void {
    // execute command via command service
  }
}
```

### 4.2 Notification Types

#### 4.2.1 Info, Warning, Error

```typescript
function createNotification(
  severity: NotificationSeverity,
  message: string,
  options?: NotificationOptions
): INotification {
  return {
    id: options?.id ?? crypto.randomUUID(),
    severity,
    message,
    source: options?.source,
    actions: options?.actions ?? [],
    timestamp: Date.now(),
    dismissed: false,
    urgency: options?.urgency ?? NotificationUrgency.Medium,
    duplicates: 0,
    dismiss() { this.dismissed = true; },
    setProgress() {},
  };
}
```

#### 4.2.2 Modal Dialogs

```typescript
interface ModalOptions {
  readonly type: 'info' | 'warning' | 'error';
  readonly title: string;
  readonly message: string;
  readonly detail?: string;
  readonly modal: boolean;
  readonly buttons: ModalButton[];
  readonly cancelButton?: string;
  readonly checkbox?: { label: string; checked: boolean };
}

interface ModalButton {
  readonly label: string;
  readonly id: string;
  readonly primary?: boolean;
}

interface ModalResult {
  readonly buttonId: string;
  readonly checkboxChecked?: boolean;
}

class ModalService {
  private overlay: HTMLElement;
  private activeModal: HTMLElement | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'ideia-modal-overlay';
    document.body.appendChild(this.overlay);
  }

  async show(options: ModalOptions): Promise<ModalResult> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'ideia-modal ' + options.type + (options.modal ? ' blocking' : '');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', String(options.modal));
      modal.innerHTML = [
        '<div class="modal-header">',
        '  <h2>' + options.title + '</h2>',
        !options.modal ? '<button class="modal-close">&times;</button>' : '',
        '</div>',
        '<div class="modal-body">',
        '  <p>' + options.message + '</p>',
        options.detail ? '<pre class="modal-detail">' + options.detail + '</pre>' : '',
        '</div>',
        '<div class="modal-footer">',
        options.buttons.map(b =>
          '<button class="modal-btn' + (b.primary ? ' primary' : '') + '" data-id="' + b.id + '">' + b.label + '</button>'
        ).join(''),
        options.cancelButton
          ? '<button class="modal-btn cancel" data-id="__cancel">' + options.cancelButton + '</button>'
          : '',
        '</div>',
      ].join('');

      modal.querySelectorAll('.modal-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.close();
          resolve({ buttonId: btn.getAttribute('data-id')!, checkboxChecked: false });
        });
      });

      if (!options.modal) {
        modal.querySelector('.modal-close')?.addEventListener('click', () => {
          this.close();
          resolve({ buttonId: '__close', checkboxChecked: false });
        });
      }

      if (options.modal) this.overlay.style.pointerEvents = 'auto';
      this.overlay.appendChild(modal);
      this.activeModal = modal;
    });
  }

  private close(): void {
    if (this.activeModal) { this.activeModal.remove(); this.activeModal = null; }
    this.overlay.style.pointerEvents = 'none';
  }
}
```

#### 4.2.3 Input Box and Quick Pick

```typescript
interface InputBoxOptions {
  readonly title?: string;
  readonly prompt?: string;
  readonly value?: string;
  readonly placeholder?: string;
  readonly password?: boolean;
  readonly validateInput?: (value: string) => string | null | undefined;
  readonly ignoreFocusLost?: boolean;
  readonly buttons?: InputButton[];
}

interface InputButton {
  readonly icon: string;
  readonly tooltip: string;
}

interface QuickPickOptions {
  readonly title?: string;
  readonly placeholder?: string;
  readonly canPickMany?: boolean;
  readonly matchOnDescription?: boolean;
  readonly matchOnDetail?: boolean;
  readonly ignoreFocusLost?: boolean;
  readonly buttons?: InputButton[];
}

interface QuickPickItem {
  readonly label: string;
  readonly description?: string;
  readonly detail?: string;
  readonly icon?: string;
  readonly alwaysShow?: boolean;
  readonly buttons?: QuickPickItemButton[];
}

interface QuickPickItemButton {
  readonly icon: string;
  readonly tooltip: string;
}
```

### 4.3 Notification Actions

#### 4.3.1 Action Resolution

```typescript
interface INotificationActionResolver {
  resolve(action: NotificationAction, notification: INotification): Promise<void>;
}

class NotificationActionResolver implements INotificationActionResolver {
  constructor(private readonly commandService: ICommandService) {}

  async resolve(action: NotificationAction, notification: INotification): Promise<void> {
    switch (action.type) {
      case 'primary':
      case 'secondary':
        if (action.command) await this.commandService.executeCommand(action.command, notification);
        notification.dismiss();
        break;
      case 'help':
        if (action.command) await this.commandService.executeCommand(action.command);
        break;
      case 'settings':
        await this.commandService.executeCommand('workbench.action.openSettings', { query: action.id });
        break;
    }
  }
}
```

#### 4.3.2 Suppress and Do Not Show Again

```typescript
interface ISuppressibleNotification {
  readonly id: string;
  readonly suppressKey: string;
  readonly suppressLabel: string;
  readonly isSuppressed: boolean;
  suppress(): void;
  resetSuppression(): void;
}

class SuppressibleNotification implements ISuppressibleNotification {
  private static readonly PREFIX = 'notification.suppressed.';

  constructor(
    readonly id: string,
    readonly suppressKey: string,
    readonly suppressLabel: string = 'Do not show again',
    private readonly storage: IStorageService
  ) {}

  get isSuppressed(): boolean {
    return this.storage.get(SuppressibleNotification.PREFIX + this.suppressKey, false);
  }

  suppress(): void {
    this.storage.set(SuppressibleNotification.PREFIX + this.suppressKey, true);
  }

  resetSuppression(): void {
    this.storage.delete(SuppressibleNotification.PREFIX + this.suppressKey);
  }
}
```

### 4.4 Progress Notifications

#### 4.4.1 Progress Location and Options

```typescript
enum ProgressLocation {
  Notification = 1,
  Window = 10,
  SourceControl = 2,
  Extensions = 3,
}

interface ProgressOptions {
  readonly location: ProgressLocation;
  readonly title?: string;
  readonly cancellable?: boolean;
  readonly source?: string;
}

interface IProgress<T> {
  report(value: T): void;
}

interface ProgressReport {
  readonly message?: string;
  readonly increment?: number;
  readonly item?: unknown;
}
```

#### 4.4.2 Long-Running Operation Progress

```typescript
interface IProgressManager {
  run<T>(
    options: ProgressOptions,
    task: (progress: IProgress<ProgressReport>, token: CancellationToken) => Promise<T>
  ): Promise<T>;
}

class ProgressManager implements IProgressManager {
  private activeProgress = new Map<string, IProgressNotification>();

  constructor(
    private readonly notificationService: INotificationService
  ) {}

  async run<T>(
    options: ProgressOptions,
    task: (progress: IProgress<ProgressReport>, token: CancellationToken) => Promise<T>
  ): Promise<T> {
    const source = new CancellationTokenSource();
    const progress: IProgress<ProgressReport> = {
      report: (value) => this.handleReport(options, value),
    };
    const notification = this.createNotification(options);

    try {
      return await task(progress, source.token);
    } finally {
      this.complete(notification);
    }
  }

  private handleReport(options: ProgressOptions, report: ProgressReport): void {
    // update UI based on location
  }

  private createNotification(options: ProgressOptions): IProgressNotification {
    const id = crypto.randomUUID();
    const notification: IProgressNotification = {
      id, severity: NotificationSeverity.Progress,
      message: options.title ?? 'Running...',
      source: options.source,
      actions: options.cancellable
        ? [{ id: 'cancel', label: 'Cancel', type: 'secondary', command: '' }]
        : [],
      progress: { message: '', increment: undefined, cancellable: options.cancellable ?? false, cancelled: false },
      timestamp: Date.now(), dismissed: false, urgency: NotificationUrgency.Medium, duplicates: 0,
      dismiss() { this.dismissed = true; },
      setProgress(state: IProgressState) { this.progress = state; },
    };
    this.notificationService.info(notification.message, options);
    return notification;
  }

  private complete(notification: IProgressNotification): void {
    notification.progress = { message: 'Complete', increment: 100, cancellable: false, cancelled: false };
    setTimeout(() => notification.dismiss(), 2000);
  }
}
```

### 4.5 Error Handling & Recovery

#### 4.5.1 Error Notification with Recovery Actions

```typescript
interface IErrorNotification extends INotification {
  readonly error: Error;
  readonly stackTrace?: string;
  readonly recoveryActions: ErrorRecoveryAction[];
  readonly telemetryId?: string;
}

interface ErrorRecoveryAction {
  readonly id: string;
  readonly label: string;
  readonly command: string;
  readonly requiresRestart?: boolean;
}

class ErrorHandler {
  constructor(
    private readonly notificationService: INotificationService,
    private readonly telemetryService: ITelemetryService,
    private readonly restartService: IRestartService
  ) {}

  handle(error: Error, source?: string, recovery?: ErrorRecoveryAction[]): void {
    this.telemetryService.sendError(error, source);

    const actions: NotificationAction[] = (recovery ?? []).map((a) => ({
      id: a.id, label: a.label, type: 'primary' as const, command: a.command,
    }));

    if (recovery?.some((a) => a.requiresRestart)) {
      actions.push({ id: 'restart', label: 'Restart IDE', type: 'primary' as const, command: 'workbench.action.restart' });
    }

    actions.push({ id: 'report', label: 'Report Issue', type: 'secondary' as const, command: 'workbench.action.reportIssue' });

    this.notificationService.error(error.message, { source, actions, urgency: NotificationUrgency.High });
  }
}
```

#### 4.5.2 Extension Failure Handling

```typescript
class ExtensionFailureHandler {
  private crashCount = new Map<string, number>();
  private readonly maxCrashes = 3;

  constructor(
    private readonly notificationService: INotificationService,
    private readonly extensionService: IExtensionService
  ) {}

  handleCrash(extensionId: string, error: Error): void {
    const count = (this.crashCount.get(extensionId) ?? 0) + 1;
    this.crashCount.set(extensionId, count);

    if (count >= this.maxCrashes) {
      this.notificationService.error(
        'Extension "' + extensionId + '" has crashed ' + count + ' times and has been disabled.',
        {
          source: extensionId, urgency: NotificationUrgency.High,
          actions: [
            { id: 'reload', label: 'Reload Extension', type: 'primary', command: 'workbench.extensions.reload' },
            { id: 'disable', label: 'Keep Disabled', type: 'secondary', command: 'workbench.extensions.disable' },
          ],
        }
      );
      this.extensionService.disable(extensionId);
    } else {
      this.notificationService.warn('Extension "' + extensionId + '" crashed: ' + error.message, {
        source: extensionId,
        actions: [{ id: 'restart', label: 'Restart Extension', type: 'primary', command: 'workbench.extensions.restart' }],
      });
    }
  }

  handleTimeout(extensionId: string, operation: string): void {
    this.notificationService.warn('Extension "' + extensionId + '" timed out during "' + operation + '".', {
      source: extensionId, urgency: NotificationUrgency.Low,
    });
  }

  handleMemoryQuota(extensionId: string, usedMB: number): void {
    this.notificationService.warn('Extension "' + extensionId + '" is using ' + usedMB + 'MB of memory.', {
      source: extensionId, urgency: NotificationUrgency.Medium,
      actions: [{ id: 'disable', label: 'Disable Extension', type: 'secondary', command: 'workbench.extensions.disable' }],
    });
  }
}
```

### 4.6 Toast vs Modal Decision

#### 4.6.1 Decision Matrix

| Criterio | Toast | Modal |
|----------|-------|-------|
| Urgencia | Baixa/Media | Alta/Critical |
| Acao necessaria | Opcional | Obrigatoria |
| Bloqueia UI | Nao | Sim |
| Auto-dismiss | Sim (configuravel) | Nao |
| Duplicates | Agrupa | Nao agrupa |
| Stacking | Empilha (max 3) | Substitui anterior |
| Uso tipico | Build completo, notificacao | Erro fatal, confirmacao destrutiva |
| Exige atencao | Nao | Sim |

#### 4.6.2 Toast Priority and Delay

```typescript
interface ToastConfig {
  readonly timeToLive: number;
  readonly showDuration: number;
  readonly stackOffset: number;
  readonly maxStack: number;
}

const ToastDefaults: ToastConfig = { timeToLive: 5000, showDuration: 300, stackOffset: 72, maxStack: 3 };

const ToastConfigByUrgency: Record<NotificationUrgency, ToastConfig> = {
  [NotificationUrgency.Low]: { ...ToastDefaults, timeToLive: 3000 },
  [NotificationUrgency.Medium]: { ...ToastDefaults, timeToLive: 8000 },
  [NotificationUrgency.High]: { ...ToastDefaults, timeToLive: 0 },
  [NotificationUrgency.Critical]: { ...ToastDefaults, timeToLive: 0, maxStack: 1 },
};
```

#### 4.6.3 Modal Hierarchy

Modals sao hierarquicos -- um modal critical substitui um modal warning, mas nao vice-versa.

```typescript
enum ModalPriority {
  Info = 0,
  Warning = 1,
  Error = 2,
  Critical = 3,
}

class ModalManager {
  private stack: Array<{ options: ModalOptions; resolve: (result: ModalResult) => void; priority: ModalPriority }> = [];

  async show(options: ModalOptions): Promise<ModalResult> {
    const priority = this.priorityFor(options.type);
    const top = this.stack[this.stack.length - 1];
    if (top && priority <= top.priority) {
      return { buttonId: '__blocked', checkboxChecked: false };
    }
    return new Promise((resolve) => {
      this.stack.push({ options, resolve, priority });
      this.render();
    });
  }

  private priorityFor(type: string): ModalPriority {
    switch (type) {
      case 'info': return ModalPriority.Info;
      case 'warning': return ModalPriority.Warning;
      case 'error': return ModalPriority.Error;
      default: return ModalPriority.Info;
    }
  }

  private render(): void {
    const entry = this.stack[this.stack.length - 1];
    if (entry) {
      // render modal
    }
  }

  dismiss(result: ModalResult): void {
    const entry = this.stack.pop();
    if (entry) entry.resolve(result);
    this.render();
  }
}
```

---

## 5. Code Examples

### 5.1 LayoutService with Part Management and Sash Resizing

```typescript
import { Emitter, Event, IDisposable } from "@ideia/common";

interface PartRect {
  id: string; x: number; y: number; width: number; height: number;
}

interface IWorkbenchLayoutService {
  readonly onDidLayoutChange: Event<void>;
  getPartRect(id: string): PartRect | undefined;
  setPartSize(id: string, size: number): void;
  togglePartVisibility(id: string): void;
  maximizePart(id: string): void;
  layout(): void;
  getState(): WorkbenchLayoutState;
  restoreState(state: WorkbenchLayoutState): void;
}

interface WorkbenchLayoutState {
  parts: Record<string, { visible: boolean; size: number; position: string }>;
  editorGrid: EditorGridState;
  zenMode: boolean;
  centeredLayout: boolean;
  centeredLayoutWidth: number;
}

interface EditorGridState {
  groups: Array<{ id: string; editors: string[]; activeEditor: string | null }>;
}

interface ILayoutPart extends IDisposable {
  id: string;
  element: HTMLElement;
  minimumSize: number;
  maximumSize: number;
  layout(width: number, height: number, top: number, left: number): void;
  dispose(): void;
}

class WorkbenchLayoutService implements IWorkbenchLayoutService, IDisposable {
  private parts = new Map<string, ILayoutPart>();
  private state: WorkbenchLayoutState;
  private readonly _onDidLayoutChange = new Emitter<void>();
  readonly onDidLayoutChange = this._onDidLayoutChange.event;
  private rafId: number | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly storageService: IStorageService
  ) {
    this.state = this.loadState();
    window.addEventListener("resize", () => this.scheduleLayout());
  }

  registerPart(id: string, part: ILayoutPart): IDisposable {
    this.parts.set(id, part);
    this.container.appendChild(part.element);
    this.scheduleLayout();
    return { dispose: () => { part.dispose(); this.parts.delete(id); this.scheduleLayout(); } };
  }

  getPartRect(id: string): PartRect | undefined {
    const part = this.parts.get(id);
    if (!part) return undefined;
    const r = part.element.getBoundingClientRect();
    return { id, x: r.x, y: r.y, width: r.width, height: r.height };
  }

  setPartSize(id: string, size: number): void {
    const part = this.parts.get(id);
    if (!part) return;
    size = Math.max(part.minimumSize, Math.min(size, part.maximumSize));
    this.state.parts[id] = { ...this.state.parts[id], size };
    this.scheduleLayout();
  }

  togglePartVisibility(id: string): void {
    const cur = this.state.parts[id]?.visible ?? true;
    this.state.parts[id] = { ...this.state.parts[id], visible: !cur };
    this.scheduleLayout();
  }

  maximizePart(id: string): void {
    if (id === "panel") {
      const saved = this.state.parts.panel?.size ?? 200;
      const maxH = this.container.clientHeight * 0.8;
      const cur = this.state.parts.panel?.size ?? 200;
      this.state.parts.panel = { ...this.state.parts.panel, size: cur === maxH ? saved : maxH };
      this.scheduleLayout();
    }
  }

  private scheduleLayout(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.doLayout();
    });
  }

  private doLayout(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const rects = this.computeRects(w, h);
    for (const r of rects) {
      this.parts.get(r.id)?.layout(r.width, r.height, r.y, r.x);
    }
    this._onDidLayoutChange.fire();
  }

  private computeRects(cw: number, ch: number): PartRect[] {
    const abw = this.state.parts.activitybar?.visible ? 48 : 0;
    const sbw = this.state.parts.sidebar?.visible ? (this.state.parts.sidebar?.size ?? 260) : 0;
    const ph = this.state.parts.panel?.visible ? (this.state.parts.panel?.size ?? 200) : 0;
    const sb = 22;
    return [
      { id: "activitybar", x: 0, y: 0, width: abw, height: ch - ph - sb },
      { id: "sidebar", x: abw, y: 0, width: sbw, height: ch - ph - sb },
      { id: "editor", x: abw + sbw, y: 0, width: Math.max(200, cw - abw - sbw), height: ch - ph - sb },
      { id: "panel", x: 0, y: ch - ph - sb, width: cw, height: ph },
      { id: "statusbar", x: 0, y: ch - sb, width: cw, height: sb },
    ];
  }

  layout(): void { this.scheduleLayout(); }
  getState(): WorkbenchLayoutState { return { ...this.state }; }
  restoreState(state: WorkbenchLayoutState): void { this.state = state; this.scheduleLayout(); }
  private loadState(): WorkbenchLayoutState { return JSON.parse(this.storageService.get("wb.layout", "{}")); }

  dispose(): void {
    window.removeEventListener("resize", () => this.scheduleLayout());
    this._onDidLayoutChange.dispose();
  }
}
```

### 5.2 WebviewPanel Creation with CSP and Message Passing

```typescript
interface WebviewPanelDescriptor {
  viewType: string;
  title: string;
  extensionUri: URI;
  mediaPath: string;
  enableScripts: boolean;
  retainContextWhenHidden: boolean;
  localResourceRoots?: URI[];
}

class WebviewPanelFactory {
  constructor(
    private readonly webviewManager: IWebviewManager,
    private readonly resourceService: IWebviewResourceService
  ) {}

  create(desc: WebviewPanelDescriptor): IWebviewPanel {
    const panel = this.webviewManager.createWebviewPanel(desc.viewType, desc.title, {
      enableScripts: desc.enableScripts,
      localResourceRoots: desc.localResourceRoots ?? [
        URI.joinPath(desc.extensionUri, desc.mediaPath),
      ],
      retainContextWhenHidden: desc.retainContextWhenHidden,
    });

    const csp = panel.webview.cspSource;
    const styleUri = this.resourceService.asWebviewUri(URI.joinPath(desc.extensionUri, desc.mediaPath, "style.css"));
    const scriptUri = this.resourceService.asWebviewUri(URI.joinPath(desc.extensionUri, desc.mediaPath, "main.js"));

    panel.webview.html = [
      "<!DOCTYPE html><html lang=\"en\"><head>",
      "<meta charset=\"UTF-8\">",
      "<meta http-equiv=\"Content-Security-Policy\" content=\"",
      "  default-src 'none';",
      "  style-src " + csp + " 'unsafe-inline';",
      "  script-src " + csp + ";",
      "  img-src " + csp + " data: https:;",
      "  font-src " + csp + ";",
      "\">",
      "<link rel=\"stylesheet\" href=\"" + styleUri + "\">",
      "</head><body><div id=\"root\"></div>",
      "<script src=\"" + scriptUri + "\"></script></body></html>",
    ].join("\n");

    panel.webview.onDidReceiveMessage((msg: unknown) => {
      const m = msg as { type: string; payload?: unknown };
      switch (m.type) {
        case "ready":
          panel.webview.postMessage({ type: "init", payload: { viewType: desc.viewType } });
          break;
        case "log":
          console.log("[Webview:" + desc.viewType + "]", m.payload);
          break;
        case "error":
          console.error("[Webview:" + desc.viewType + "]", m.payload);
          break;
      }
    });

    return panel;
  }
}
```

### 5.3 CustomTextEditorProvider Example

```typescript
class MyCustomEditorProvider implements ICustomTextEditorProvider {
  readonly typeId = "myCustomEditor";
  readonly displayName = "My Custom Editor";
  readonly selector = [{ pattern: "*.myformat" }];
  private documents = new Map<string, MyCustomDocument>();

  async openCustomDocument(uri: URI, ctx: CustomDocumentOpenContext, token: CancellationToken): Promise<ICustomDocument> {
    const existing = this.documents.get(uri.toString());
    if (existing) return existing;

    let content: string;
    if (ctx.backupId) {
      content = await this.readBackup(ctx.backupId);
    } else if (ctx.untitledDocumentData) {
      content = new TextDecoder().decode(ctx.untitledDocumentData);
    } else {
      content = await this.readFile(uri);
    }

    const doc = new MyCustomDocument(uri, content);
    this.documents.set(uri.toString(), doc);
    doc.onDidDispose(() => this.documents.delete(uri.toString()));
    return doc;
  }

  async resolveCustomEditor(doc: ICustomDocument, panel: IWebviewPanel, token: CancellationToken): Promise<void> {
    const myDoc = doc as MyCustomDocument;
    panel.webview.html = this.generateHtml(panel);

    panel.webview.postMessage({ type: "loadDocument", payload: myDoc.serialize() });

    panel.webview.onDidReceiveMessage(async (msg: unknown) => {
      const m = msg as { type: string; payload?: { content?: string; command?: string } };
      switch (m.type) {
        case "edit":
          if (m.payload?.content !== undefined) myDoc.edit(m.payload.content);
          break;
        case "save":
          await this.saveFile(myDoc.uri, myDoc.serialize());
          myDoc.markClean();
          break;
      }
    });

    doc.onDidChange((event) => {
      panel.webview.postMessage({
        type: "dirtyChanged",
        payload: { dirty: myDoc.isDirty },
      });
    });
  }

  private generateHtml(panel: IWebviewPanel): string {
    return [
      "<!DOCTYPE html><html><head>",
      "<meta http-equiv=\"Content-Security-Policy\" content=\"",
      "default-src 'none'; style-src " + panel.webview.cspSource + " 'unsafe-inline';",
      "script-src " + panel.webview.cspSource + ";",
      "\"><style>",
      "body { font-family: monospace; padding: 16px; }",
      "#editor { width: 100%; min-height: 400px; border: 1px solid #ccc; outline: none; padding: 8px; }",
      ".toolbar { display: flex; gap: 8px; margin-bottom: 8px; }",
      "</style></head><body>",
      "<div class=\"toolbar\"><button id=\"btnSave\">Save</button></div>",
      "<div id=\"editor\" contenteditable=\"true\"></div>",
      "<script>(function(){",
      "const vscode = acquireVsCodeApi();",
      "const editor = document.getElementById('editor');",
      "window.addEventListener('message', e => {",
      "  if (e.data.type === 'loadDocument') editor.innerHTML = e.data.payload.content;",
      "});",
      "editor.addEventListener('input', () => vscode.postMessage({type:'edit',payload:{content:editor.innerHTML}}));",
      "document.getElementById('btnSave').onclick = () => vscode.postMessage({type:'save'});",
      "vscode.postMessage({type:'ready'});",
      "})();</script></body></html>",
    ].join("\n");
  }

  private async readFile(uri: URI): Promise<string> {
    const r = await fetch(uri.toString());
    return r.text();
  }

  private async readBackup(id: string): Promise<string> {
    return this.readFile(URI.from({ scheme: "backup", path: id }));
  }

  private async saveFile(uri: URI, content: string): Promise<void> {
    await fetch(uri.toString(), { method: "PUT", body: content });
  }
}

class MyCustomDocument implements ICustomDocument {
  private _content: string;
  isDirty = false;
  private _onDidDispose = new Emitter<void>();
  private _onDidChange = new Emitter<CustomDocumentChangeEvent>();
  readonly onDidDispose = this._onDidDispose.event;
  readonly onDidChange = this._onDidChange.event;

  constructor(readonly uri: URI, content: string) {
    this._content = content;
  }

  serialize(): string { return this._content; }
  edit(content: string): void { this._content = content; this.isDirty = true; this._onDidChange.fire({ undoStack: [], redoStack: [] }); }
  markClean(): void { this.isDirty = false; }
  dispose(): void { this._onDidDispose.fire(); }
}
```

### 5.4 NotificationService with Queue and Toast

```typescript
interface INotificationServiceInstance {
  show(severity: NotificationSeverity, message: string, options?: NotificationOptions): string;
  showProgress(options: ProgressOptions): IProgressHandle;
  showModal(options: ModalOptions): Promise<ModalResult>;
  dismiss(id: string): void;
  clearAll(): void;
}

interface IProgressHandle {
  report(report: ProgressReport): void;
  complete(): void;
}

class NotificationService implements INotificationServiceInstance {
  private queue = new NotificationQueue(new ToastRenderer(this.createContainer()), this.center);
  private center: INotificationCenter;

  constructor() {
    this.center = {
      notifications: [],
      updateNotification: (n) => {},
      show: () => {},
      hide: () => {},
    };
  }

  show(severity: NotificationSeverity, message: string, options?: NotificationOptions): string {
    const notification = createNotification(severity, message, options);
    this.queue.enqueue(notification);
    return notification.id;
  }

  showProgress(options: ProgressOptions): IProgressHandle {
    const id = crypto.randomUUID();
    let completed = false;
    const notification = createNotification(NotificationSeverity.Progress, options.title ?? "In progress...", { source: options.source });
    this.queue.enqueue(notification);

    return {
      report: (report: ProgressReport) => {
        if (!completed) notification.setProgress({ message: report.message, increment: report.increment, cancellable: options.cancellable ?? false, cancelled: false });
      },
      complete: () => {
        completed = true;
        notification.setProgress({ message: "Complete", increment: 100, cancellable: false, cancelled: false });
        setTimeout(() => this.dismiss(notification.id), 2000);
      },
    };
  }

  async showModal(options: ModalOptions): Promise<ModalResult> {
    const service = new ModalService();
    return service.show(options);
  }

  dismiss(id: string): void { this.queue.dismiss(id); }
  clearAll(): void { this.queue.clearAll(); }

  private createContainer(): HTMLElement {
    const el = document.createElement("div");
    el.className = "ideia-toast-area";
    el.style.cssText = "position:fixed;top:32px;right:8px;z-index:10000;display:flex;flex-direction:column;gap:4px;pointer-events:none";
    document.body.appendChild(el);
    return el;
  }
}
```

### 5.5 Progress Manager for Long-Running Operations

```typescript
class BackgroundTaskRunner {
  constructor(
    private readonly progressManager: IProgressManager,
    private readonly notificationService: INotificationService
  ) {}

  async runBuildTask(projectUri: URI): Promise<void> {
    await this.progressManager.run(
      { location: ProgressLocation.Notification, title: "Building project...", cancellable: true },
      async (progress, token) => {
        progress.report({ message: "Compiling sources..." });
        await this.compile(projectUri, token);
        if (token.isCancellationRequested) return;

        progress.report({ message: "Linking dependencies...", increment: 40 });
        await this.link(projectUri, token);
        if (token.isCancellationRequested) return;

        progress.report({ message: "Generating output...", increment: 30 });
        await this.generate(projectUri, token);
        progress.report({ message: "Done", increment: 100 });
      }
    );
  }

  private async compile(uri: URI, token: CancellationToken): Promise<void> {
    for (let i = 0; i < 10; i++) {
      if (token.isCancellationRequested) return;
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  private async link(uri: URI, token: CancellationToken): Promise<void> {
    await new Promise((r) => setTimeout(r, 200));
  }

  private async generate(uri: URI, token: CancellationToken): Promise<void> {
    await new Promise((r) => setTimeout(r, 150));
  }
}
```

---

## 6. Conexoes

### 6.1 S34 — Monaco Editor

O Monaco Editor (S34) e a superficie de edicao central que vive dentro do EditorPart do layout. A integracao entre Layout e Monaco se da em varios pontos:

- **Editor Groups:** Cada grupo de editor contem uma instancia do Monaco. O layout controla qual grupo esta visivel e como os grupos sao posicionados no grid.
- **Breadcrumbs:** Monaco fornece o modelo de breadcrumbs (arquivo + simbolos) que o layout exibe na barra de titulo do editor.
- **Tab Management:** Monaco gerencia o estado de dirty, pinned e preview de cada documento, enquanto o layout renderiza as abas visualmente.
- **Zen Mode:** Quando zen mode e ativado, o Monaco se expande para ocupar toda a janela.
- **Centered Layout:** O Monaco respeita a largura maxima definida pelo centered layout.

### 6.2 S35 — FileSystem & Workspace

O sistema de arquivos (S35) fornece o backbone para abrir e salvar documentos no editor:

- **File Icons:** O FileSystem mapeia extensoes para icones que aparecem nos editor tabs e activity bar.
- **Editor Input:** Cada IEditorInput referencia um URI do VFS. A abertura de arquivos passa pelo workspace service antes de criar o editor.
- **Workspace Layout:** O layout e persistido por workspace -- cada projeto pode ter sua propria configuracao de side bar, painel e grupos de editores.
- **File Explorer:** O explorador de arquivos e uma view na side bar que se beneficia do view container e view switcher.

### 6.3 S36 — Extension Host

O Extension Host (S36) e o processo que executa as extensoes que fornecem:

- **Webview Providers:** Extensoes registram WebviewViewProvider e CustomTextEditorProvider via API do extension host.
- **Status Bar Contributions:** Extensoes adicionam itens a status bar via contribution points, que sao renderizados pelo StatusBarPart.
- **Activity Bar Items:** Extensoes contribuem icones para a activity bar.
- **Notification Actions:** Extensoes registram comandos que sao executados como acoes em notificacoes.
- **Menu Items:** Extensoes contribuem com items de menu, que sao exibidos pelo TitleBar/MenuBar.

### 6.4 S39 — Themes

O sistema de temas (S39) afeta diretamente a aparencia de todos os componentes de layout e webview:

- **Layout Colors:** Activity bar, side bar, panel, status bar e title bar usam variaveis de tema para cores de fundo, foreground e borda.
- **Webview Theming:** Webviews recebem o tema atual via postMessage e aplicam as mesmas variaveis CSS.
- **Notification Colors:** Notificacoes usam cores de severidade definidas pelo tema (info blue, warning yellow, error red).
- **Icon Themes:** A activity bar e side bar respeitam o tema de icones selecionado.
- **Status Bar Colors:** Itens da status bar podem usar `backgroundColor` e `color` do tema.

### 6.5 S11 — Theia Integration

A plataforma Theia (S11) oferece seu proprio sistema de layout, webview e notificacoes. A IDEIA deve se integrar ou substituir:

- **Layout:** Theia usa `@theia/core/lib/browser/shell` com `ApplicationShell` que gerencia parts, sashes e layout. A IDEIA pode estender ou substituir este shell.
- **Webviews:** Theia fornece `@theia/plugin-ext` com implementacao propria de webviews (`WebviewWidget`, `WebviewPanel`) que segue o mesmo protocolo do VS Code.
- **Notifications:** Theia tem `@theia/messages` para notificacoes com MessageClient e MessageService. A IDEIA pode usar o NotificationService proposto neste estudo como camada de abstracao.
- **Inversify DI:** Todos os servicos de layout e webview devem ser registrados no container Inversify do Theia.

```
Conexao Theia:
  Layout  -> ApplicationShell (extender ou substituir)
  Webview -> WebviewWidget / WebviewPanel (theia-plugin-ext)
  Notif.  -> MessageService (abstrair via NotificationService)
  Part    -> SidePanelWidget, BottomPanelWidget (theia-core)
  Sash    -> SplitPanel (theia-core)
```

---

## 7. Plano de Implementacao

### Fase 1: Layout Core (2 semanas)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|--------------|
| 1.1 | LayoutService com parts, sashes e resize | 3d | -- |
| 1.2 | ActivityBarPart com itens, badges e toggle | 2d | 1.1 |
| 1.3 | SideBarPart com view container e switcher | 3d | 1.1 |
| 1.4 | EditorPart com grid layout e grupos | 3d | 1.1 |
| 1.5 | PanelPart com posicao e maximizacao | 2d | 1.1 |
| 1.6 | StatusBarPart com itens e alinhamento | 1d | 1.1 |
| 1.7 | Layout persistence via storage service | 1d | 1.1 |
| 1.8 | Editor tabs (pinned, preview, dirty) | 2d | 1.4 |

### Fase 2: Chrome Features (1.5 semanas)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|--------------|
| 2.1 | Centered layout com largura configuravel | 1d | 1.4 |
| 2.2 | Zen mode com hide chrome + fullscreen | 2d | 2.1 |
| 2.3 | Breadcrumbs (file path + symbols) | 2d | 1.4 |
| 2.4 | Custom title bar com window controls | 2d | 1.1 |
| 2.5 | Custom menu bar (native and custom mode) | 2d | 2.4 |
| 2.6 | Editor actions toolbar | 1d | 1.4 |
| 2.7 | Multi-monitor layout state | 1d | 1.7 |

### Fase 3: Webview Core (2 semanas)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|--------------|
| 3.1 | WebviewManager com criacao e ciclo de vida | 3d | -- |
| 3.2 | CSP enforcement e origin isolation | 2d | 3.1 |
| 3.3 | WebviewResourceService (asWebviewUri) | 1d | 3.1 |
| 3.4 | postMessage/onDidReceiveMessage protocol | 2d | 3.1 |
| 3.5 | Request/response RPC pattern | 1d | 3.4 |
| 3.6 | Streaming updates (chunked + binary) | 1d | 3.4 |
| 3.7 | WebviewPanel with reveal and view state | 2d | 3.1 |
| 3.8 | WebviewView in side bar/panel | 2d | 3.7, 1.3 |

### Fase 4: Custom Editors (1.5 semanas)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|--------------|
| 4.1 | ICustomTextEditorProvider interface | 2d | 3.7 |
| 4.2 | ICustomReadonlyEditorProvider interface | 1d | 3.7 |
| 4.3 | Custom document lifecycle (backup, save) | 2d | 4.1 |
| 4.4 | Undo/redo integration com editor stack | 2d | 4.1 |
| 4.5 | Document type registration (selector) | 1d | 4.1 |
| 4.6 | Webview tree view provider | 2d | 3.8 |

### Fase 5: Notification System (1.5 semanas)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|--------------|
| 5.1 | NotificationService com INotification model | 2d | -- |
| 5.2 | NotificationQueue com grouping e prioridade | 2d | 5.1 |
| 5.3 | ToastRenderer com slide-in, auto-dismiss | 2d | 5.2 |
| 5.4 | Notification center panel | 2d | 5.3 |
| 5.5 | Modal dialogs com bloqueio hierarquico | 2d | 5.1 |
| 5.6 | Progress notifications com barra e cancel | 2d | 5.3 |
| 5.7 | Error handling com recovery actions | 1d | 5.5 |
| 5.8 | Suppressible notifications | 1d | 5.1 |
| 5.9 | Input box e quick pick | 2d | 5.5 |

### Fase 6: Integracao Theia (1 semana)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|--------------|
| 6.1 | ApplicationShell extension para layout parts | 2d | 1.x |
| 6.2 | WebviewWidget integracao com Theia plugin-ext | 2d | 3.x |
| 6.3 | MessageService to NotificationService adapter | 1d | 5.x |
| 6.4 | Inversify DI registration de todos os servicos | 1d | 6.1-6.3 |
| 6.5 | End-to-end test: extensao cria webview panel | 1d | 6.2 |

### Resumo de Esforco

| Fase | Descricao | Dias | Semanas |
|------|-----------|------|---------|
| F1 | Layout Core | 17 | 2.0 |
| F2 | Chrome Features | 11 | 1.5 |
| F3 | Webview Core | 14 | 2.0 |
| F4 | Custom Editors | 10 | 1.5 |
| F5 | Notification System | 16 | 2.0 |
| F6 | Integracao Theia | 7 | 1.0 |
| **Total** | | **75** | **10.0** |

### Testes

| Tipo | Cobertura | Framework |
|------|-----------|-----------|
| Unitario | LayoutService, Sash, Part rendering | Jest + jsdom |
| Unitario | WebviewManager, CSP, ResourceService | Jest + jsdom |
| Unitario | NotificationQueue, ToastRenderer, ModalService | Jest + jsdom |
| Integracao | Layout + Monaco rendering | Playwright |
| Integracao | Webview postMessage roundtrip | Playwright |
| Integracao | Custom editor save/undo flow | Playwright |
| E2E | Extensao abre webview panel | Playwright |
| E2E | Zen mode toggle e restauracao | Playwright |
| E2E | Notificacao com grouping e dismiss | Playwright |

### Quality Gates

| Gate | Requisitos |
|------|------------|
| PR | Testes unitarios passando + lint + typecheck |
| Pre-merge | Testes de integracao + contract tests (webview messaging protocol) |
| Release | E2E tests + coverage minima 60% + accessibility audit |

---

> **Data:** 2026-07-22
> **Proximo estudo:** S41 — Keybinding & Command System
