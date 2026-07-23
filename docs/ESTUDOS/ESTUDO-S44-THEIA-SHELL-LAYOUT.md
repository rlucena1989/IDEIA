# ESTUDO S44 — Theia Application Shell, Layout & UI Shell Architecture

> **Arquitetura do Application Shell do Theia: gerenciamento de layout, areas do workbench, paineis, sashes, persistencia de estado, barra de status, breadcrumbs, activity bar, title bar e integracao com temas**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — Theia Shell & Layout architecture, all shell areas, persistence, theme integration |

---

## Sumario

1. [Introducao](#1-introducao)
    - 1.1 [O que e o Application Shell](#11-o-que-e-o-application-shell)
    - 1.2 [Shell como Inversify Container](#12-shell-como-inversify-container)
    - 1.3 [Visao Geral do Workbench](#13-visao-geral-do-workbench)

2. [Shell Architecture](#2-shell-architecture)
    - 2.1 [ApplicationShell class hierarchy](#21-applicationshell-class-hierarchy)
    - 2.2 [ShellLayout e LayoutState](#22-shell-layout-e-layoutstate)
    - 2.3 [Area Hierarchy: main, left, right, bottom, top](#23-area-hierarchy)
    - 2.4 [Panel Management & Split Layout Engine](#24-panel-management--split-layout-engine)
    - 2.5 [Shell events: onDidChangeCurrentWidget, onDidAddWidget, onDidRemoveWidget](#25-shell-events)

3. [Shell Areas](#3-shell-areas)
    - 3.1 [Main Area — Editor Region](#31-main-area--editor-region)
    - 3.2 [Left Sidebar — Explorer, Search, SCM, Debug](#32-left-sidebar)
    - 3.3 [Right Sidebar — Outline, Variables, Watch](#33-right-sidebar)
    - 3.4 [Bottom Panel — Problems, Output, Terminal, Debug Console](#34-bottom-panel)
    - 3.5 [Top Area — Toolbar, Breadcrumb](#35-top-area)
    - 3.6 [Status Bar](#36-status-bar)

4. [Layout Management](#4-layout-management)
    - 4.1 [TabBar & TabBar Decoration](#41-tabbar--tabbar-decoration)
    - 4.2 [Panel Expansion & Collapse](#42-panel-expansion--collapse)
    - 4.3 [Panel Resize via Sashes](#43-panel-resize-via-sashes)
    - 4.4 [Panel Hide & Reveal](#44-panel-hide--reveal)
    - 4.5 [Panel Move Between Areas](#45-panel-move-between-areas)
    - 4.6 [Panel Cycling & Quick Open](#46-panel-cycling--quick-open)

5. [Sidebar & SidePanel](#5-sidebar--sidepanel)
    - 5.1 [SidePanelHandler Architecture](#51-sidepanelhandler-architecture)
    - 5.2 [Sidebar Visibility Toggle](#52-sidebar-visibility-toggle)
    - 5.3 [Sidebar Width Persistence](#53-sidebar-width-persistence)
    - 5.4 [Sidebar Orientation: Left vs Right](#54-sidebar-orientation-left-vs-right)
    - 5.5 [Sidebar Tab Cycling](#55-sidebar-tab-cycling)
    - 5.6 [Sidebar Active View Tracking](#56-sidebar-active-view-tracking)

6. [Bottom Panel](#6-bottom-panel)
    - 6.1 [BottomPanelHandler Architecture](#61-bottompanelhandler-architecture)
    - 6.2 [Panel Position: Bottom vs Right](#62-panel-position-bottom-vs-right)
    - 6.3 [Panel Height Persistence](#63-panel-height-persistence)
    - 6.4 [Panel Maximization & Restore](#64-panel-maximization--restore)
    - 6.5 [Panel Hide & Toggle Commands](#65-panel-hide--toggle-commands)

7. [Status Bar](#7-status-bar)
    - 7.1 [StatusBar & StatusBarImpl](#71-statusbar--statusbarimpl)
    - 7.2 [StatusBarEntry: Alignment, Priority, Text, Command](#72-statusbarentry-alignment-priority-text-command)
    - 7.3 [Entry Priority Ordering](#73-entry-priority-ordering)
    - 7.4 [Entry Command Handler & Tooltip](#74-entry-command-handler--tooltip)
    - 7.5 [Entry Color & Background Customization](#75-entry-color--background-customization)
    - 7.6 [Entry Visibility Management](#76-entry-visibility-management)
    - 7.7 [IDEIA-specific StatusBar Contributions](#77-ideia-specific-statusbar-contributions)

8. [Layout State Persistence](#8-layout-state-persistence)
    - 8.1 [ApplicationShell.saveLayout](#81-applicationshellsavelayout)
    - 8.2 [ApplicationShell.restoreLayout](#82-applicationshellrestorelayout)
    - 8.3 [Layout Serialization Format](#83-layout-serialization-format)
    - 8.4 [Workspace-Specific Layout](#84-workspace-specific-layout)
    - 8.5 [Window State Restoration](#85-window-state-restoration)
    - 8.6 [Layout Migration & Versioning](#86-layout-migration--versioning)
    - 8.7 [Layout Conflict Resolution](#87-layout-conflict-resolution)

9. [Breadcrumbs](#9-breadcrumbs)
    - 9.1 [BreadcrumbPartial Architecture](#91-breadcrumbpartial-architecture)
    - 9.2 [Breadcrumb Separator & Rendering](#92-breadcrumb-separator--rendering)
    - 9.3 [Breadcrumb Contribution Point](#93-breadcrumb-contribution-point)
    - 9.4 [Breadcrumb Navigation Events](#94-breadcrumb-navigation-events)
    - 9.5 [IDEIA-specific Breadcrumb Enhancements](#95-ideia-specific-breadcrumb-enhancements)

10. [Activity Bar](#10-activity-bar)
    - 10.1 [ActivityBar Architecture](#101-activitybar-architecture)
    - 10.2 [Activity Bar Position & Layout](#102-activity-bar-position--layout)
    - 10.3 [Activity Bar Items & Contributions](#103-activity-bar-items--contributions)
    - 10.4 [Activity Bar Badge & Counter](#104-activity-bar-badge--counter)
    - 10.5 [Activity Bar Toggle Sidebar](#105-activity-bar-toggle-sidebar)
    - 10.6 [Activity Bar Icon Styling](#106-activity-bar-icon-styling)

11. [Title Bar](#11-title-bar)
    - 11.1 [WindowTitleBar Architecture](#111-windowtitlebar-architecture)
    - 11.2 [Custom Title Bar vs Native Title Bar](#112-custom-title-bar-vs-native-title-bar)
    - 11.3 [CustomTitleWidget & CustomTitleWidgetFactory](#113-customtitlewidget--customtitlewidgetfactory)
    - 11.4 [Title Bar Context Menu](#114-title-bar-context-menu)
    - 11.5 [Title Bar Icons & Branding](#115-title-bar-icons--branding)
    - 11.6 [Title Bar Window Controls](#116-title-bar-window-controls)
    - 11.7 [IDEIA-specific Title Bar Contributions](#117-ideia-specific-title-bar-contributions)

12. [Theme Integration](#12-theme-integration)
    - 12.1 [Shell Area Color Registration](#121-shell-area-color-registration)
    - 12.2 [Theme Change Propagation to Shell Areas](#122-theme-change-propagation-to-shell-areas)
    - 12.3 [CSS Custom Properties for Shell](#123-css-custom-properties-for-shell)
    - 12.4 [Shell Color Tokens Reference](#124-shell-color-tokens-reference)
    - 12.5 [Dynamic Theme Switching in Shell Components](#125-dynamic-theme-switching-in-shell-components)

13. [Code Examples](#13-code-examples)
    - 13.1 [ApplicationShell Layout State Serialization](#131-applicationshell-layout-state-serialization)
    - 13.2 [SidePanelHandler Widget Registration](#132-sidepanelhandler-widget-registration)
    - 13.3 [StatusBar Entry with Command Handler](#133-statusbar-entry-with-command-handler)
    - 13.4 [BottomPanel Toggle & Maximize Commands](#134-bottompanel-toggle--maximize-commands)
    - 13.5 [Layout Persistence Service](#135-layout-persistence-service)
    - 13.6 [Breadcrumb Contribution Registration](#136-breadcrumb-contribution-registration)
    - 13.7 [Activity Bar Contribution with Badge](#137-activity-bar-contribution-with-badge)
    - 13.8 [Custom Title Widget with IDEIA Branding](#138-custom-title-widget-with-ideia-branding)
    - 13.9 [Shell Aware Widget with onActivate/onReveal](#139-shell-aware-widget-with-onactivateonreveal)
    - 13.10 [Registering Shell Color Tokens](#1310-registering-shell-color-tokens)

14. [Conexoes](#14-conexoes)

15. [Plano de Implementacao](#15-plano-de-implementacao)

---

## 1. Introducao

### 1.1 O que e o Application Shell

O `ApplicationShell` do Theia e o gerenciador de layout principal de toda a aplicacao. Ele estende `SplitPanel` da biblioteca `@phosphor/widgets` (agora `@lumino/widgets`) e gerencia todas as areas visuais do workbench. Diferente de um layout manager convencional, o ApplicationShell do Theia e:

- **Um container Inversify singleton** — registrado como `ApplicationShell` no container de DI
- **Um SplitPanel hierarquico** — composto por sub-paineis que representam as areas
- **Um state machine** — controla visibilidade, tamanho e posicao de cada area
- **Um persistence engine** — serializa e restaura o layout completo por workspace

### 1.2 Shell como Inversify Container

```typescript
// O ApplicationShell e registrado como singleton no container principal
export const ApplicationShell = Symbol('ApplicationShell');

export interface ApplicationShell extends SplitPanel {
    readonly mainPanel: MainPanel;
    readonly leftPanelHandler: SidePanelHandler;
    readonly rightPanelHandler: SidePanelHandler;
    readonly bottomPanelHandler: BottomPanelHandler;
    readonly statusBar: StatusBar;
    readonly activityBar: ActivityBar;

    addWidget(widget: Widget, options?: ApplicationShell.AddOptions): Promise<void>;
    activateWidget(id: string): Widget | undefined;
    saveLayout(): ShellLayoutState;
    restoreLayout(state: ShellLayoutState): Promise<void>;
    collapsePanel(side: 'left' | 'right' | 'bottom'): void;
    expandPanel(side: 'left' | 'right' | 'bottom'): void;
    togglePanel(side: 'left' | 'right' | 'bottom'): void;
    resizePanel(side: 'left' | 'right' | 'bottom', size: number): void;
    getPanelSize(side: 'left' | 'right' | 'bottom'): number;
    isPanelExpanded(side: 'left' | 'right' | 'bottom'): boolean;
}
```

### 1.3 Visao Geral do Workbench

O workbench do Theia e composto por 6 zonas principais, cada uma gerenciada por um handler especifico:

```
  +------------------------------------------------------------------+
  |  TOP AREA (Breadcrumb, Toolbar, Menu Bar contribution)            |
  +------------------------------------------------------------------+
  |  +--------+  +-------------------+  +-------------------+  +----+|
  |  |ACTIVITY|  |  LEFT SIDEBAR     |  |  MAIN AREA        |  |RIGHT||
  |  | BAR    |  |                   |  |  (Editor Tabs)    |  |SIDE ||  (top-right)
  |  |        |  |  +-------------+  |  |  +-------------+  |  |BAR  ||
  |  | icon   |  |  | Explorer    |  |  |  | file.ts     |  |  |     ||
  |  | search |  |  | Search      |  |  |  | - Editor    |  |  |Outl.||
  |  | debug  |  |  | SCM         |  |  |  | - Untitled  |  |  |Var. ||
  |  | ext    |  |  | Plugins     |  |  |  +-------------+  |  |Watch||
  |  |        |  |  +-------------+  |  |  | Monaco Edit  |  |  |     ||
  |  |        |  |                   |  |  |              |  |  |     ||
  |  +--------+  +-------------------+  +-------------------+  +----+|
  +------------------------------------------------------------------+
  |  BOTTOM PANEL (Problems, Output, Terminal, Debug Console, ...)    |
  +------------------------------------------------------------------+
  |  STATUS BAR (Left: context info | Right: language, encoding, ...) |
  +------------------------------------------------------------------+
```

---

## 2. Shell Architecture

### 2.1 ApplicationShell Class Hierarchy

```
@lumino/widgets.Widget
  └── @lumino/widgets.SplitPanel
        └── @lumino/widgets.Panel       (base class)
              └── ApplicationShell      (Theia)
                    ├── mainPanel: MainPanel
                    ├── leftPanelHandler: SidePanelHandler
                    ├── rightPanelHandler: SidePanelHandler
                    ├── bottomPanelHandler: BottomPanelHandler
                    ├── statusBar: StatusBar
                    ├── activityBar: ActivityBar
                    ├── shellLayoutState: ShellLayoutState
                    ├── trackShellLayoutVersion(): void
                    ├── registerListener(): void
                    └── fireOnShellChanged(): void
```

O ApplicationShell e estendido por implementacoes especificas de plataforma:

| Implementacao | Plataforma | Diferenca |
|---------------|-----------|-----------|
| `ApplicationShell` | Browser | Shell padrao para web |
| `ElectronApplicationShell` | Electron Desktop | Adiciona suporte a menu nativo, window controls, drag & drop de arquivos |
| `TheiaCloudShell` | Theia Cloud | Gerencia sessao remota, reconnect, lazy loading |

### 2.2 Shell Layout e LayoutState

O estado do shell e representado por `ShellLayoutState`, uma estrutura serializavel que captura:

```typescript
interface ShellLayoutState {
    version: number;
    mainPanel: MainPanelLayoutState;
    leftPanel: SidePanelLayoutState;
    rightPanel: SidePanelLayoutState;
    bottomPanel: BottomPanelLayoutState;
    statusBar: StatusBarLayoutState;
    activityBar: ActivityBarLayoutState;
}

interface SidePanelLayoutState {
    size: number;              // Largura do painel em pixels
    expanded: boolean;         // Se o painel esta expandido ou colapsado
    activeWidgetId: string;    // Widget ativo no momento
    widgetIds: string[];       // Ordem dos widgets registrados
    tracking: boolean;         // Se o tracking de view ativa esta habilitado
}

interface BottomPanelLayoutState {
    size: number;              // Altura do painel em pixels
    expanded: boolean;
    maximized: boolean;        // Se o painel esta maximizado
    activeWidgetId: string;
    widgetIds: string[];
}

interface MainPanelLayoutState {
    activeEditorId: string;
    editorIds: string[];
}
```

### 2.3 Area Hierarchy

A hierarquia de areas do ApplicationShell e construida como uma arvore de SplitPanels:

```
ApplicationShell (SplitPanel orientation: vertical)
  |
  +-- Top Panel (SplitPanel, fixed height)  [Breadcrumb, Toolbar]
  |
  +-- Content Area (SplitPanel orientation: horizontal)
  |     |
  |     +-- Activity Bar (fixed width ~50px)
  |     |
  |     +-- Left Side Panel (TabBar + stacked widget)
  |     |
  |     +-- Main Content Area (SplitPanel orientation: vertical)
  |     |     |
  |     |     +-- Main Panel (TabBar + stacked editors)
  |     |     |
  |     |     +-- Bottom Panel (TabBar + stacked widgets)
  |     |           [Problems, Output, Terminal, Debug Console]
  |     |
  |     +-- Right Side Panel (TabBar + stacked widget)
  |
  +-- Status Bar (fixed height ~22px)
```

Cada area segue esta estrutura:

| Area | Handler | Panel | Orientation | Tamanho Minimo |
|------|---------|-------|-------------|----------------|
| Top | N/A (nativo) | TopPanel | horizontal | 0 (auto) |
| Activity Bar | ActivityBar | -- | vertical | 48px |
| Left Sidebar | SidePanelHandler (left) | SidePanel | vertical | 170px |
| Main | MainPanel | MainPanel | vertical | 200px |
| Right Sidebar | SidePanelHandler (right) | SidePanel | vertical | 170px |
| Bottom | BottomPanelHandler | BottomPanel | horizontal | 50px |
| Status Bar | StatusBarImpl | StatusBar | horizontal | 22px |

### 2.4 Panel Management & Split Layout Engine

O gerenciamento de paineis e feito via `SidePanelHandler` e `BottomPanelHandler`. Cada handler gerencia:

- **Widget registration** — adicionar/remover widgets no painel
- **Active widget tracking** — qual widget esta visivel
- **Size management** — largura/altura, minimo/maximo
- **Expansion state** — colapsado vs expandido
- **Animation** — transicoes suaves de colapso/expansao

O Split Layout Engine e baseado em `@lumino/widgets.SplitPanel`:

```typescript
// Splitting interno (usado pelo Theia)
const splitPanel = new SplitPanel();
splitPanel.orientation = 'horizontal'; // ou 'vertical'
splitPanel.addWidget(leftWidget);
splitPanel.addWidget(mainWidget);

// Sashes (divisores) sao elementos DOM gerenciados pelo Lumino
// Cada sash tem:
//   - onMouseDown: inicia o drag
//   - onMouseMove: atualiza o tamanho relativo
//   - onMouseUp: finaliza o drag, persiste tamanho

// Diferente de CSS Grid ou Flexbox, o Lumino usa:
//   1. Absolute positioning com top/left/width/height
//   2. Sashes como elementos absolutos entre paineis
//   3. Relative sizes (proporcao) para flexibilidade
```

### 2.5 Shell Events

O ApplicationShell emite eventos cruciais para o ecossistema:

| Evento | Tipo | Disparado Quando |
|--------|------|------------------|
| `onDidChangeCurrentWidget` | `Signal` | Widget ativo muda em qualquer area |
| `onDidAddWidget` | `Signal` | Novo widget adicionado a qualquer area |
| `onDidRemoveWidget` | `Signal` | Widget removido de qualquer area |
| `onDidChangeActiveWidget` | `Signal` | Widget ativo muda na area principal |
| `onDidChangeLayout` | `Signal` | Layout muda (colapso, redimensionamento) |
| `onDidChangePanelState` | `Signal` | Estado de expansao/colapso muda |

```typescript
// Uso tipico de shell events em um widget
export class MyIDEIAWidget extends ReactWidget {
    constructor(@inject(ApplicationShell) protected readonly shell: ApplicationShell) {
        super();
        this.id = 'ideia-my-widget';
        this.title.label = 'My IDEIA Widget';
        this.title.closable = true;

        // Reagir a mudancas de layout
        this.shell.onDidChangePanelState(() => {
            this.update();
        });

        // Reagir a mudanca de widget ativo
        this.shell.onDidChangeCurrentWidget((event) => {
            if (event.owner === this) { return; }
            console.log(`Active widget changed to: ${event.newValue?.id}`);
        });
    }
}
```

---

## 3. Shell Areas

### 3.1 Main Area — Editor Region

A Main Area e a zona central do workbench, onde os editores de arquivo sao abertos. E gerenciada pelo `MainPanel`, que e um `TabBar` com `StackedPanel`:

```typescript
// MainPanel e a area principal de edicao
export class MainPanel extends Widget {
    protected readonly tabBar: TabBar<Widget>;
    protected readonly stackedPanel: StackedPanel;

    // Editor groups (Theia 1.38+ suporta split de editores)
    readonly editorGroups: EditorGroup[];

    openEditor(uri: URI, options?: EditorOpenerOptions): Promise<EditorWidget>;
    splitEditor(direction: 'left' | 'right' | 'up' | 'down'): EditorGroup;
    closeEditor(editor: EditorWidget): Promise<void>;
    closeAllEditors(): Promise<void>;
    getActiveEditor(): EditorWidget | undefined;
}
```

Caracteristicas da Main Area:

- **Multi-tab**: abas no topo da area com scrolling e drag-and-drop entre grupos
- **Editor groups**: divisao horizontal ou vertical da area de edicao
- **Preview mode**: tab em preview (italico) quando aberta temporariamente
- **Tab decoration**: indicadores de sujeira (dirty), git status, erro (squiggles)

### 3.2 Left Sidebar

A sidebar esquerda e o painel de navegacao primario, contendo views essenciais:

| View | Widget ID | Descricao |
|------|-----------|-----------|
| Explorer | `explorer-view` | Arvore de arquivos, paste, rename, delete |
| Search | `search-view` | Busca global com replace em arquivos |
| Source Control | `scm-view` | Git status, staging, diff, commit |
| Run and Debug | `debug-view` | Breakpoints, call stack, variables |
| Extensions | `extensions-view` | Gerenciamento de plugins OpenVSX |

```typescript
// Registro de uma view na sidebar esquerda
@injectable()
export class ExplorerViewContainer implements WidgetFactory {
    readonly id = 'explorer-view';
    readonly label = 'Explorer';

    async createWidget(): Promise<Widget> {
        const widget = new FileNavigatorWidget();
        widget.id = 'explorer-view';
        widget.title.label = 'Explorer';
        widget.title.iconClass = 'fa fa-folder-open';
        widget.title.caption = 'File Explorer';

        // Registrar no shell, area esquerda
        this.shell.addWidget(widget, {
            area: 'left',
            rank: 100  // Ordem na barra de abas
        });

        return widget;
    }
}
```

### 3.3 Right Sidebar

A sidebar direita e o painel de contexto secundario:

| View | Widget ID | Descricao |
|------|-----------|-----------|
| Outline | `outline-view` | Simbolos do arquivo ativo |
| Variables | `variables-view` | Variaveis em escopo (debug) |
| Watch | `watch-view` | Expressoes monitoradas (debug) |
| Call Stack | `call-stack-view` | Pilha de chamadas (debug) |
| Loaded Scripts | `loaded-scripts-view` | Scripts carregados (debug) |

A sidebar direita segue o mesmo padrao da esquerda, usando `SidePanelHandler` com parametro `side: 'right'`.

### 3.4 Bottom Panel

O painel inferior agrupa ferramentas de output e interacao:

| View | Widget ID | Descricao |
|------|-----------|-----------|
| Problems | `problems-view` | Erros e warnings do workspace |
| Output | `output-view` | Logs de canais de output |
| Terminal | `terminal-view` | Terminal integrado (xterm.js) |
| Debug Console | `debug-console` | REPL de debug |
| Ports | `ports-view` | Port forwarding |
| Comments | `comments-view` | Revisao de codigo |

```typescript
// Registro no painel inferior
const terminalWidget = new TerminalWidget();
terminalWidget.id = 'terminal-view';
terminalWidget.title.label = 'Terminal';
terminalWidget.title.iconClass = 'fa fa-terminal';

this.shell.addWidget(terminalWidget, {
    area: 'bottom',
    rank: 300
});
```

### 3.5 Top Area

A area superior contem componentes de navegacao:

| Componente | Descricao |
|------------|-----------|
| Menu Bar | Menu nativo (Electron) ou HTML (browser) |
| Breadcrumb | Caminho do arquivo atual com navegacao |
| Toolbar | Botoes de acao sensiveis ao contexto |
| Search Overlay | Busca inline (Ctrl+P / Ctrl+Shift+P) |

O Top Panel nao usa `SidePanelHandler` — e um `Panel` fixo gerenciado diretamente pelo ApplicationShell.

### 3.6 Status Bar

A barra de status e tratada em detalhe na Secao 7.

---

## 4. Layout Management

### 4.1 TabBar & TabBar Decoration

O `TabBar` do Theia e baseado no `@lumino/widgets.TabBar` com extensoes:

```typescript
// TabBar do Theia (estendido)
export interface TabBar<T extends Widget> extends Lumino.TabBar<T> {
    // Decorators
    readonly tabBarDecorators: TabBar.Decorator[];

    // Custom rendering
    readonly renderer: TabBar.Renderer;

    // Drop target overlay
    readonly dropOverlay: TabBar.DropOverlay;

    // Scroll buttons (quando muitas abas)
    readonly scrollButtons: boolean;
}
```

**TabBar Decorators** permitem adicionar indicadores visuais nas abas:

```typescript
// Exemplo: decorator que adiciona badge de dirty no arquivo
export class DirtyTabBarDecorator implements TabBar.Decorator {
    decorate(node: HTMLElement, widget: Widget): void {
        const title = widget.title;
        if (title.className.includes('dirty')) {
            node.classList.add('p-mod-dirty');
            // Adiciona bolinha indicadora de dirty
            const indicator = document.createElement('div');
            indicator.className = 'theia-tab-bar-dirty-indicator';
            node.appendChild(indicator);
        }
    }
}
```

### 4.2 Panel Expansion & Collapse

O Theia implementa expansao/colapso com animacao CSS e state tracking:

```typescript
// Fluxo de colapso da sidebar esquerda
shell.collapsePanel('left');
// 1. SidePanelHandler registra estado atual de largura
// 2. Aplica classe CSS 'theia-side-panel-collapsed' no container
// 3. Animacao: CSS transition de width (ou left) para 0
// 4. Sash da borda e ocultado
// 5. Atalho de teclado (Ctrl+B) fica vinculado para re-expandir
// 6. LayoutState.expanded = false

// Contrapartida:
shell.expandPanel('left');
// 1. Restaura largura do ultimo estado conhecido
// 2. Remove classe 'theia-side-panel-collapsed'
// 3. Restaura sash
// 4. LayoutState.expanded = true
```

### 4.3 Panel Resize via Sashes

Sashes sao elementos DOM arrastaveis que ficam entre paineis. Mecanismo:

```typescript
// Mecanismo de sash (Lumino internals)
// 1. Sash e um div absoluto posicionado entre dois paineis
// 2. onMouseDown: captura cursor, registra posicao inicial
// 3. onMouseMove: calcula delta, redimensiona paineis
// 4. onMouseUp: finaliza, dispara layoutChanged, persiste tamanho
// 5. Sash respeita tamanho minimo de cada painel (minimumSizes)

// O Theia adiciona:
// - Sash hover highlight (mudanca de cor no hover)
// - Sash width customizavel via CSS (--theia-sash-width)
// - Sash hover size (hoverWidth) para facil agarre
// - Double-click no sash: colapsa/expande painel adjacente
```

Cada area tem sashes especificos:

| Sash | Localizacao | Controla |
|------|-------------|----------|
| Left Sash | Entre activity bar e sidebar left | Largura da sidebar esquerda |
| Right Sash | Entre main area e sidebar right | Largura da sidebar direita |
| Bottom Sash | Entre main area e bottom panel | Altura do bottom panel |
| Editor Sash | Entre editor groups | Largura/altura relativa dos grupos |

### 4.4 Panel Hide & Reveal

Esconder e revelar paineis:

```typescript
// Esconder painel (remove do layout, mas mantem estado)
shell.collapsePanel('bottom');
// O painel nao aparece, mas widgets continuam registrados

// Revelar painel (restaura com tamanho anterior)
shell.expandPanel('bottom');

// Comandos associados (registered no @theia/core):
// - 'workbench.view.explorer'       → Ctrl+Shift+E  → Left sidebar, Explorer
// - 'workbench.view.scm'            → Ctrl+Shift+G  → Left sidebar, SCM
// - 'workbench.view.debug'          → Ctrl+Shift+D  → Left sidebar, Debug
// - 'workbench.view.extensions'     → Ctrl+Shift+X  → Left sidebar, Extensions
// - 'workbench.view.outline'        → Ctrl+Shift+O  → Right sidebar, Outline
// - 'workbench.action.togglePanel'  → Ctrl+J        → Bottom panel
// - 'workbench.action.toggleSidebarVisibility' → Ctrl+B → Left sidebar
```

### 4.5 Panel Move Between Areas

Widgets podem ser movidos entre areas via drag-and-drop das abas:

```typescript
// Logica de drop no TabBar (Lumino + Theia)

// 1. Usuario inicia drag em uma Tab
// 2. Lumino cria um Drag div fantasma
// 3. Theia avalia drop targets (TabBars de outras areas)
// 4. Se drop aceito, widget e removido do TabBar de origem
// 5. Widget e adicionado ao TabBar de destino via shell.addWidget()
// 6. Estado e persistido em layout state

// Regras de drag:
// - Main <-> Left/Right/Bottom: permitido
// - Left <-> Right: permitido
// - Bottom <-> Left: permitido
// - Activity bar: nao permite drop (fixed)
// - Status bar: nao permite drop (fixed)
```

### 4.6 Panel Cycling & Quick Open

Navegacao entre paineis via atalhos:

```typescript
// Ciclagem de paineis (Ctrl+Tab / Ctrl+Shift+Tab)
// Implementada via ViewCycling:

export class ViewCycling {
    private views: Widget[] = [];
    private currentIndex = -1;

    start(): void {
        // Coleta todos os widgets visiveis em ordem de area
        // main -> left -> right -> bottom
        this.views = this.collectVisibleWidgets();
        this.currentIndex = 0;
        this.highlight(this.views[0]);
    }

    next(): void {
        this.unhighlight(this.views[this.currentIndex]);
        this.currentIndex = (this.currentIndex + 1) % this.views.length;
        this.highlight(this.views[this.currentIndex]);
    }

    select(): void {
        this.shell.activateWidget(this.views[this.currentIndex].id);
    }
}

// Quick Open (Ctrl+P):
// Abre overlay de busca que navega entre todos os widgets
// O QuickOpenService do Theia indexa todos os widgets e comandos
```

---

## 5. Sidebar & SidePanel

### 5.1 SidePanelHandler Architecture

O `SidePanelHandler` e o gerenciador de painel lateral (esquerda ou direita):

```typescript
export class SidePanelHandler {
    protected readonly side: 'left' | 'right';
    protected readonly tabBar: TabBar<Widget>;
    protected readonly stackedPanel: StackedPanel;
    protected readonly container: SidePanel;

    protected state: {
        expanded: boolean;
        size: number;
        activeWidgetId: string | undefined;
        widgetIds: string[];
        tracking: boolean;
    };

    constructor(side: 'left' | 'right') {
        this.side = side;
        this.tabBar = this.createTabBar();
        this.stackedPanel = this.createStackedPanel();
        this.container = this.createContainer();
    }

    createTabBar(): TabBar<Widget> {
        const tabBar = new TabBar({ orientation: 'vertical' });
        tabBar.addClass('theia-sidebar-tabbar');
        tabBar.tabsMovable = true;
        tabBar.allowDeselect = false;
        tabBar.insertBehavior = 'none';
        tabBar.removeBehavior = 'defer-to-stacked';
        return tabBar;
    }

    addWidget(widget: Widget, options: SidePanel.AddOptions): void {
        // 1. Adiciona aba ao TabBar
        // 2. Adiciona widget ao StackedPanel
        // 3. Atualiza estado (widgetIds)
        // 4. Se primeiro widget, ativa automaticamente
    }

    removeWidget(widget: Widget): void {
        // 1. Remove aba do TabBar
        // 2. Remove widget do StackedPanel
        // 3. Se era o ativo, ativa proximo
        // 4. Se vazio, colapsa painel
    }

    activateWidget(id: string): void {
        // 1. Atualiza activeWidgetId
        // 2. Mostra widget no StackedPanel
        // 3. Destaca aba no TabBar
        // 4. Se colapsado, expande
    }

    collapse(): void { /* ... */ }
    expand(): void { /* ... */ }
    toggle(): void { /* ... */ }
}
```

### 5.2 Sidebar Visibility Toggle

```typescript
// Comando: View: Toggle Sidebar Visibility
// Keybinding: Ctrl+B
// Responsabilidade: Alterna visibilidade da sidebar esquerda

@injectable()
export class ToggleSidebarVisibilityCommand implements CommandContribution {
    @inject(ApplicationShell) protected readonly shell: ApplicationShell;

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand({
            id: 'workbench.action.toggleSidebarVisibility',
            label: 'Toggle Sidebar Visibility',
            category: 'View',
            iconClass: 'codicon codicon-sidebar-left'
        }, {
            execute: () => {
                const expanded = this.shell.isPanelExpanded('left');
                if (expanded) {
                    this.shell.collapsePanel('left');
                } else {
                    this.shell.expandPanel('left');
                }
            }
        });
    }
}
```

### 5.3 Sidebar Width Persistence

A largura da sidebar e persistida como parte do layout state:

```typescript
// Storage: ApplicationShell.saveLayout serializa width
// Restauracao: ApplicationShell.restoreLayout aplica width

// O SidePanelHandler mantem:
//   - minimumSize: 170px (default)
//   - maximumSize: 500px (default, mas pode ser maior)
//   - O tamanho e armazenado em pixels (nao em proporcao)

// Persistencia real:
//   - shell.layoutState.leftPanel.size = 280 (pixels)
//   - No restore, 'size' e usado como parametro no resize
//   - Se workspace tem layout proprio, prevalece sobre global
```

### 5.4 Sidebar Orientation: Left vs Right

A diferenca entre sidebar esquerda e direita e principalmente de posicao:

| Aspecto | Left | Right |
|---------|------|-------|
| Handler | `shell.leftPanelHandler` | `shell.rightPanelHandler` |
| Posicao | Esquerda do main area | Direita do main area |
| Sash adjacente | Entre activity bar e sidebar | Entre main area e sidebar |
| Icon padrao | `codicon codicon-sidebar-left` | `codicon codicon-sidebar-right` |
| Toggle command | `workbench.action.toggleSidebarVisibility` | N/A (usa mesmo comando) |
| Views tipicas | Explorer, Search, SCM, Debug | Outline, Variables, Watch |

Internamente, ambos usam a mesma classe `SidePanelHandler` com parametro `side` diferente.

### 5.5 Sidebar Tab Cycling

```typescript
// Ciclagem de abas na sidebar (Ctrl+Shift+[ e Ctrl+Shift+])
// Ou clique na aba diretamente

// Implementacao via TabBar signal:
this.tabBar.currentChanged.connect((sender, args) => {
    const { currentTitle, previousTitle } = args;
    if (currentTitle) {
        const widget = currentTitle.owner;
        this.stackedPanel.showWidget(widget);
        this.state.activeWidgetId = widget.id;
    }
});

// O TabBar previne deselecao (allowDeselect = false)
// garantindo que sempre haja um widget ativo na sidebar
```

### 5.6 Sidebar Active View Tracking

```typescript
// View tracking permite que o sidebar ative automaticamente
// a view correta quando o usuario muda de contexto

export interface ViewTracker {
    // Quando um widget e ativado, o tracking decide qual view mostrar
    trackActiveWidget(widget: Widget): void;
}

// Exemplo: debug tracking
// Quando o usuario entra no modo debug, a sidebar automaticamente
// muda para a view de debug (breakpoints, variaveis)

// Implementacao padrao:
// - Cada area tem um 'activeWidgetId' no estado
// - Quando um widget e ativado via comando (Ctrl+Shift+E -> Explorer)
//   o sidebar ativa a aba correspondente
// - Se nenhum comando explicito, mantem a ultima aba ativa
```

---

## 6. Bottom Panel

### 6.1 BottomPanelHandler Architecture

O `BottomPanelHandler` gerencia o painel inferior:

```typescript
export class BottomPanelHandler {
    protected readonly tabBar: TabBar<Widget>;
    protected readonly stackedPanel: StackedPanel;
    protected readonly container: BottomPanel;

    protected state: {
        expanded: boolean;
        maximized: boolean;
        size: number;
        activeWidgetId: string | undefined;
        widgetIds: string[];
    };

    // Diferenca do SidePanelHandler:
    // - TabBar e horizontal (vs vertical na sidebar)
    // - Suporta maximizacao (ocupa toda a altura)
    // - Altura (vs largura na sidebar)

    // Tamanhos:
    //   minimumSize: 50px (colapsado: 0 com altura minima para TabBar)
    //   defaultSize: 250px
    //   maximizedSize: 60% da altura da janela
    //   maximumSize: 80% da altura da janela
}
```

### 6.2 Panel Position: Bottom vs Right

O Theia permite que o painel seja posicionado na parte inferior ou na direita:

```typescript
// Configuracao via preferences:
// workbench.panel.defaultLocation: 'bottom' | 'right'

// 'bottom': painel abaixo do editor (default)
// 'right': painel a direita, abaixo da sidebar direita

// Implementacao:
//   - 'bottom': BottomPanelHandler dentro do SplitPanel vertical do main area
//   - 'right': BottomPanelHandler movido para o SplitPanel horizontal,
//              ao lado direito do main area

// Vantagens do 'right':
//   - Mais espaco vertical para o editor
//   - Ideal para monitores widescreen
// Desvantagens:
//   - Conflito com sidebar direita
//   - Views de terminal ficam estreitas
```

### 6.3 Panel Height Persistence

```typescript
// A altura do bottom panel e persistida em pixels

// Durante saveLayout:
bottomPanelState: {
    size: 200,                    // Altura em pixels
    expanded: true,
    maximized: false,
    activeWidgetId: 'terminal-view',
    widgetIds: ['problems-view', 'output-view', 'terminal-view', 'debug-console']
}

// Durante restoreLayout:
// 1. Aplica 'size' como altura inicial do painel
// 2. Se 'maximized', aplica maximizacao apos render
// 3. Ativa 'activeWidgetId'

// Nota: tamanho e relativo a viewport, nao a proporcao
// Pode causar problemas em monitores de tamanhos diferentes
// Solucao IDEIA: usar proporcao (% da viewport) como fallback
```

### 6.4 Panel Maximization & Restore

```typescript
// Maximizacao: ocupa ~60% da altura da janela
shell.bottomPanelHandler.maximize();
// 1. Salva tamanho atual em preMaximizeSize
// 2. Define tamanho como 60% da altura do content area
// 3. Atualiza state.maximized = true

// Restore: volta ao tamanho anterior
shell.bottomPanelHandler.restore();
// 1. Restaura preMaximizeSize (ou defaultSize se nao houver)
// 2. Atualiza state.maximized = false

// Comandos:
// - workbench.action.togglePanel → Ctrl+J
// - workbench.action.maximizePanel → Ctrl+Shift+J (se habilitado)
// Duplo clique no titulo do painel: toggle maximize
```

### 6.5 Panel Hide & Toggle Commands

```typescript
// Esconder completamente o painel inferior
// (colapsa para tamanho 0, escondendo TabBar e conteudo)

shell.collapsePanel('bottom');
// Painel some, mas widgets permanecem registrados

// Toggle via comando:
registry.registerCommand({
    id: 'workbench.action.togglePanel',
    label: 'Toggle Panel',
    category: 'View'
}, {
    isEnabled: () => true,
    execute: () => {
        if (shell.isPanelExpanded('bottom')) {
            shell.collapsePanel('bottom');
        } else {
            shell.expandPanel('bottom');
        }
    }
});

// Global keybinding: Ctrl+J (padrao VS Code, herdado pelo Theia)
```

---

## 7. Status Bar

### 7.1 StatusBar & StatusBarImpl

A barra de status e um componente fixo na parte inferior do workbench:

```typescript
export const StatusBar = Symbol('StatusBar');

export interface StatusBar {
    readonly container: HTMLElement;

    setElement(id: string, entry: StatusBarEntry): Promise<void>;
    removeElement(id: string): Promise<void>;
    setBackgroundColor(color: string | undefined): Promise<void>;
    setColor(color: string | undefined): Promise<void>;
}

export interface StatusBarEntry {
    text: string;                          // Texto exibido
    tooltip?: string;                      // Tooltip no hover
    command?: string;                      // Comando ao clicar
    arguments?: any[];                     // Argumentos do comando
    alignment: StatusBarAlignment;         // LEFT (0) ou RIGHT (1)
    priority: number;                      // Ordenacao (maior = mais extremo)
    color?: string;                        // Cor do texto (CSS color)
    backgroundColor?: string;              // Cor de fundo (CSS background)
    className?: string;                    // Classe CSS adicional
    accessibilityInformation?: {           // Acessibilidade
        label: string;
        role?: string;
    };
}

export enum StatusBarAlignment {
    LEFT = 0,
    RIGHT = 1
}

// Implementacao concreta: StatusBarImpl
export class StatusBarImpl implements StatusBar {
    protected readonly leftEntries: Map<string, StatusBarEntry>;
    protected readonly rightEntries: Map<string, StatusBarEntry>;
    protected readonly container: HTMLElement;

    async setElement(id: string, entry: StatusBarEntry): Promise<void> {
        // 1. Determina mapa (leftEntries ou rightEntries)
        // 2. Se ja existe, atualiza (remove e reinsere)
        // 3. Reordena entradas por prioridade
        // 4. Renderiza no container
    }

    async removeElement(id: string): Promise<void> {
        // 1. Remove do mapa correspondente
        // 2. Remove elemento DOM
        // 3. Reordena entradas restantes
    }

    protected render(): void {
        // 1. Limpa container
        // 2. Cria duas areas: left e right
        // 3. Ordena leftEntries por prioridade (decrescente)
        // 4. Ordena rightEntries por prioridade (crescente)
        // 5. Renderiza cada entry na area correspondente
    }
}
```

### 7.2 Entry Priority Ordering

O sistema de prioridade determina a posicao de cada entrada:

```typescript
// Alinhamento LEFT:
//   Prioridade mais alta  → mais a esquerda
//   Prioridade mais baixa → mais perto do centro
//
// Alinhamento RIGHT:
//   Prioridade mais alta  → mais a direita
//   Prioridade mais baixa → mais perto do centro

// Exemplo LEFT:
//   { text: 'Language: TypeScript', priority: 100 }  → extrema esquerda
//   { text: 'Ln 42, Col 10',        priority: 50 }   → mais ao centro
//
// Exemplo RIGHT:
//   { text: 'UTF-8',                priority: 50 }   → mais ao centro
//   { text: 'Spaces: 2',            priority: 100 }  → extrema direita

// Ordenacao (LEFT):
const sortedLeft = Array.from(this.leftEntries.entries())
    .sort(([, a], [, b]) => b.priority - a.priority)
    .map(([id, entry]) => ({ id, entry }));

// Ordenacao (RIGHT):
const sortedRight = Array.from(this.rightEntries.entries())
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([id, entry]) => ({ id, entry }));
```

### 7.3 Entry Command Handler & Tooltip

```typescript
// Cada entry pode ter um comando associado (click) e tooltip:

const entry: StatusBarEntry = {
    text: '$(git-branch) main',
    tooltip: 'Click to change branch\nCurrent: main',
    command: 'git.branch.switch',
    arguments: ['main'],
    alignment: StatusBarAlignment.LEFT,
    priority: 80
};

// Implementacao do click handler (dentro de StatusBarImpl):
protected onClick(entryId: string): void {
    const entry = this.leftEntries.get(entryId)
        ?? this.rightEntries.get(entryId);
    if (!entry || !entry.command) { return; }

    // Dispara comando via CommandService
    this.commandService.executeCommand(entry.command, ...(entry.arguments ?? []));
}

// Tooltip e renderizado como atributo HTML 'title'
// <span title="Click to change branch&#10;Current: main">$(git-branch) main</span>
```

### 7.4 Entry Color & Background Customization

```typescript
// Entradas podem ter cor de texto e fundo personalizados:

const errorEntry: StatusBarEntry = {
    text: '$(error) 3 Problems',
    tooltip: '3 problems in workspace',
    command: 'workbench.action.problems.focus',
    alignment: StatusBarAlignment.LEFT,
    priority: 200,
    color: 'var(--theia-statusBar-errorForeground)',
    backgroundColor: 'var(--theia-statusBar-errorBackground)',
    className: 'ideia-status-error'
};

// Uso interno no StatusBarImpl:
protected renderEntry(id: string, entry: StatusBarEntry): HTMLElement {
    const element = document.createElement('div');
    element.id = `status-bar-${id}`;
    element.className = `theia-status-bar-entry ${entry.className ?? ''}`;
    element.title = entry.tooltip ?? '';

    if (entry.color) { element.style.color = entry.color; }
    if (entry.backgroundColor) {
        element.style.backgroundColor = entry.backgroundColor;
    }

    // Suporta $(icon-name) syntax para icones codicon
    element.innerHTML = entry.text.replace(
        /\$\(([^)]+)\)/g,
        '<span class="codicon codicon-$1"></span> '
    );

    if (entry.command) {
        element.style.cursor = 'pointer';
        element.addEventListener('click', () => this.onClick(id));
    }

    return element;
}
```

### 7.5 Entry Visibility Management

```typescript
// Entradas podem ser removidas dinamicamente

// Metodos:
statusBar.setElement('git-branch', entry);    // Adiciona ou atualiza
statusBar.removeElement('git-branch');         // Remove

// Uso pratico: indicador de agente IDEIA ativo
class AgentStatusIndicator {
    constructor(@inject(StatusBar) protected readonly statusBar: StatusBar) {
        // Inicialmente oculto
    }

    showAgentStatus(agentName: string): void {
        this.statusBar.setElement('ideia-agent', {
            text: `$(hubot) ${agentName} running`,
            tooltip: `Agent: ${agentName}\nClick to open agent panel`,
            command: 'ideia.agent.panel.open',
            alignment: StatusBarAlignment.LEFT,
            priority: 90,
            color: 'var(--theia-statusBar-foreground)'
        });
    }

    hideAgentStatus(): void {
        this.statusBar.removeElement('ideia-agent');
    }
}
```

### 7.6 IDEIA-specific StatusBar Contributions

A IDEIA adicionara entradas customizadas na barra de status:

| Entry ID | Texto | Prioridade | Alinhamento | Descricao |
|----------|-------|------------|-------------|-----------|
| `ideia-agent` | `$(hubot) Agent Name` | 90 | LEFT | Agente IDEIA ativo |
| `ideia-autonomy` | `$(shield) N3` | 85 | RIGHT | Nivel de autonomia atual |
| `ideia-quality` | `$(check) 87%` | 70 | RIGHT | Score de qualidade do projeto |
| `ideia-memory` | `$(database) 2.4K` | 60 | RIGHT | Tamanho do contexto ativo |
| `ideia-task` | `$(issue-opened) 3 tasks` | 75 | LEFT | Tarefas pendentes |
| `ideia-events` | `$(radio-tower) 12` | 50 | RIGHT | Eventos no barramento |
| `ideia-cost` | `$(credit-card) $0.04` | 40 | RIGHT | Custo acumulado desta sessao |

---

## 8. Layout State Persistence

### 8.1 ApplicationShell.saveLayout

```typescript
export class ApplicationShell {
    saveLayout(): ShellLayoutState {
        return {
            version: CURRENT_LAYOUT_VERSION,
            mainPanel: {
                activeEditorId: this.mainPanel.currentWidget?.id,
                editorIds: this.mainPanel.widgets.map(w => w.id)
            },
            leftPanel: {
                size: this.leftPanelHandler.state.size,
                expanded: this.leftPanelHandler.state.expanded,
                activeWidgetId: this.leftPanelHandler.state.activeWidgetId,
                widgetIds: this.leftPanelHandler.state.widgetIds,
                tracking: this.leftPanelHandler.state.tracking
            },
            rightPanel: {
                size: this.rightPanelHandler.state.size,
                expanded: this.rightPanelHandler.state.expanded,
                activeWidgetId: this.rightPanelHandler.state.activeWidgetId,
                widgetIds: this.rightPanelHandler.state.widgetIds,
                tracking: this.rightPanelHandler.state.tracking
            },
            bottomPanel: {
                size: this.bottomPanelHandler.state.size,
                expanded: this.bottomPanelHandler.state.expanded,
                maximized: this.bottomPanelHandler.state.maximized,
                activeWidgetId: this.bottomPanelHandler.state.activeWidgetId,
                widgetIds: this.bottomPanelHandler.state.widgetIds
            },
            activityBar: {
                activeItemId: this.activityBar.activeItem?.id
            }
        };
    }
}
```

### 8.2 ApplicationShell.restoreLayout

```typescript
export class ApplicationShell {
    async restoreLayout(state: ShellLayoutState): Promise<void> {
        // 1. Validacao de versao
        if (state.version > CURRENT_LAYOUT_VERSION) {
            console.warn('Layout state from newer version, attempting migration');
        }

        // 2. Restauracao do painel esquerdo
        if (state.leftPanel) {
            this.leftPanelHandler.state.size = state.leftPanel.size;
            this.leftPanelHandler.state.expanded = state.leftPanel.expanded;
            this.leftPanelHandler.state.activeWidgetId = state.leftPanel.activeWidgetId;
            this.leftPanelHandler.state.widgetIds = state.leftPanel.widgetIds;
            this.leftPanelHandler.state.tracking = state.leftPanel.tracking;

            // Reconstroi widgets na ordem correta
            for (const id of state.leftPanel.widgetIds) {
                const widget = this.widgetManager.getWidget(id);
                if (widget) {
                    this.leftPanelHandler.addWidget(widget, { rank: 100 });
                }
            }

            // Ativa widget que estava ativo
            if (state.leftPanel.activeWidgetId) {
                this.leftPanelHandler.activateWidget(state.leftPanel.activeWidgetId);
            }

            // Aplica tamanho
            if (state.leftPanel.size > 0) {
                this.leftPanelHandler.resize(state.leftPanel.size);
            }

            // Aplica estado de expansao
            if (!state.leftPanel.expanded) {
                this.leftPanelHandler.collapse();
            }
        }

        // 3. Analogamente para right, bottom, main, activity bar...

        // 4. Notifica listeners
        this.fireOnShellChanged();
    }
}
```

### 8.3 Layout Serialization Format

O formato de serializacao do layout e JSON, armazenado no `StorageService`:

```typescript
// Formato completo serializado:
// {
//   "version": 2,
//   "mainPanel": {
//     "activeEditorId": "file:/home/user/project/src/main.ts",
//     "editorIds": [
//       "file:/home/user/project/src/main.ts",
//       "file:/home/user/project/src/utils.ts"
//     ]
//   },
//   "leftPanel": {
//     "size": 280,
//     "expanded": true,
//     "activeWidgetId": "explorer-view",
//     "widgetIds": ["explorer-view", "search-view", "scm-view", "debug-view"],
//     "tracking": true
//   },
//   "rightPanel": {
//     "size": 250,
//     "expanded": false,
//     "activeWidgetId": "outline-view",
//     "widgetIds": ["outline-view"],
//     "tracking": true
//   },
//   "bottomPanel": {
//     "size": 200,
//     "expanded": true,
//     "maximized": false,
//     "activeWidgetId": "terminal-view",
//     "widgetIds": ["problems-view", "output-view", "terminal-view", "debug-console"]
//   },
//   "activityBar": {
//     "activeItemId": "explorer-view"
//   }
// }

// O layout e armazenado via StorageService:
//   - Chave: 'layout:' + workspace.folderUri.toString()
//   - Provider: LocalStorage (browser) ou ElectronStorage (desktop)

// Gatilhos de save:
//   - onDidChangeLayout (qualquer redimensionamento/colapso)
//   - onDidChangeActiveWidget (troca de widget ativo)
//   - onWillStop (beforeunload)
//   - Periodico (debounced, a cada 30s)
```

### 8.4 Workspace-Specific Layout

```typescript
// Layout e armazenado por workspace, permitindo layouts diferentes
// para cada projeto:

export class LayoutStorage {
    constructor(
        @inject(StorageService) protected readonly storage: StorageService,
        @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService
    ) {}

    protected getStorageKey(): string {
        const workspace = this.workspaceService.workspace;
        if (!workspace) { return 'layout:default'; }

        // Usa URI do workspace como chave unica
        return `layout:${workspace.resource.toString()}`;
    }

    async saveLayout(state: ShellLayoutState): Promise<void> {
        const key = this.getStorageKey();
        await this.storage.setData(key, {
            timestamp: Date.now(),
            version: CURRENT_LAYOUT_VERSION,
            state
        });
    }

    async loadLayout(): Promise<ShellLayoutState | undefined> {
        const key = this.getStorageKey();
        const data = await this.storage.getData(key);
        return data?.state;
    }

    async clearLayout(): Promise<void> {
        const key = this.getStorageKey();
        await this.storage.setData(key, undefined);
    }
}

// Fallback: se nao ha workspace aberto, layout global e usado
// Se workspace tem layout, global serve como template inicial
```

### 8.5 Window State Restoration

Para Electron, o estado da janela tambem e persistido:

```typescript
export interface WindowState {
    x: number;
    y: number;
    width: number;
    height: number;
    maximized: boolean;
    fullScreen: boolean;
}

// ElectronApplicationShell estende saveLayout para incluir:
shellLayoutState.windowState = {
    x: window.screenX,
    y: window.screenY,
    width: window.outerWidth,
    height: window.outerHeight,
    maximized: window.isMaximized?.() ?? false,
    fullScreen: window.isFullScreen?.() ?? false
};

// No restore:
if (state.windowState) {
    const ws = state.windowState;
    if (ws.maximized) { window.maximize?.(); }
    else { window.setPosition?.(ws.x, ws.y);
           window.setSize?.(ws.width, ws.height); }
}
```

### 8.6 Layout Migration & Versioning

```typescript
// Layout versioning permite migrar layouts antigos:

const CURRENT_LAYOUT_VERSION = 3;

function migrateLayout(state: ShellLayoutState): ShellLayoutState {
    let version = state.version ?? 1;

    while (version < CURRENT_LAYOUT_VERSION) {
        switch (version) {
            case 1:
                // v1 -> v2: Adicionado 'maximized' no bottomPanel
                state.bottomPanel = {
                    ...state.bottomPanel,
                    maximized: state.bottomPanel?.maximized ?? false
                };
                version = 2;
                break;

            case 2:
                // v2 -> v3: Adicionado 'tracking' nos side panels
                state.leftPanel = {
                    ...state.leftPanel,
                    tracking: state.leftPanel?.tracking ?? true
                };
                state.rightPanel = {
                    ...state.rightPanel,
                    tracking: state.rightPanel?.tracking ?? true
                };
                version = 3;
                break;

            default:
                version = CURRENT_LAYOUT_VERSION;
        }
    }

    state.version = CURRENT_LAYOUT_VERSION;
    return state;
}
```

### 8.7 Layout Conflict Resolution

```typescript
// Quando um layout salvo referencia widgets que nao existem mais:
// (exemplo: extensao desinstalada)

function resolveConflicts(state: ShellLayoutState): ShellLayoutState {
    const registeredWidgets = widgetManager.getRegisteredWidgets();

    // Remove widgets que nao existem mais
    state.leftPanel.widgetIds = state.leftPanel.widgetIds
        .filter(id => registeredWidgets.has(id));
    state.rightPanel.widgetIds = state.rightPanel.widgetIds
        .filter(id => registeredWidgets.has(id));
    state.bottomPanel.widgetIds = state.bottomPanel.widgetIds
        .filter(id => registeredWidgets.has(id));

    // Se activeWidget foi removido, elege o primeiro disponivel
    if (!state.leftPanel.widgetIds.includes(state.leftPanel.activeWidgetId)) {
        state.leftPanel.activeWidgetId = state.leftPanel.widgetIds[0];
    }

    // Analogamente para right, bottom
    // Se todos os widgets foram removidos, colapsa painel
    if (state.leftPanel.widgetIds.length === 0) {
        state.leftPanel.expanded = false;
    }

    return state;
}
```

---

## 9. Breadcrumbs

### 9.1 BreadcrumbPartial Architecture

Breadcrumbs no Theia sao gerenciados pelo `BreadcrumbPartial`, que e um `Widget` anexado ao topo da area principal:

```typescript
export class BreadcrumbPartial extends Widget {
    protected readonly container: HTMLElement;
    protected readonly separator: string = '/';

    // Breadcrumb items sao contribuicoes externas
    protected readonly contributions: BreadcrumbContribution[] = [];

    constructor(
        @inject(BreadcrumbContributionProvider)
        protected readonly contributionProvider: BreadcrumbContributionProvider
    ) {
        super();
        this.addClass('theia-breadcrumb-partial');
    }

    // Atualiza breadcrumbs baseado no widget ativo
    updateBreadcrumbs(activeWidget: Widget | undefined): void {
        // 1. Limpa container
        // 2. Se nao ha widget ativo, esconde
        // 3. Coleta contributions que implementam IBreadcrumbContribution
        // 4. Para cada contribution, obtem BreadcrumbItem[] 
        // 5. Renderiza como caminho com separadores
    }

    protected renderBreadcrumbs(items: BreadcrumbItem[]): void {
        // Renderiza cada item como span clicavel
        // Entre items: span com separador (default '/')
        // Item ativo (ultimo): destaque visual
    }
}

export interface BreadcrumbItem {
    label: string;             // Texto exibido
    icon?: string;             // Classe de icone opcional
    uri?: URI;                 // URI para navegacao
    command?: string;          // Comando ao clicar
    arguments?: any[];         // Argumentos do comando
}
```

### 9.2 Breadcrumb Separator & Rendering

```typescript
// O breadcrumb renderiza como:
// [Project] / [src] / [components] / [App.tsx]

// HTML renderizado:
// <div class="theia-breadcrumb-partial">
//   <span class="breadcrumb-item" data-uri="file:///project">
//     <span class="codicon codicon-root-folder"></span> Project
//   </span>
//   <span class="breadcrumb-separator">/</span>
//   <span class="breadcrumb-item" data-uri="file:///project/src">
//     src
//   </span>
//   <span class="breadcrumb-separator">/</span>
//   <span class="breadcrumb-item" data-uri="file:///project/src/components">
//     components
//   </span>
//   <span class="breadcrumb-separator">/</span>
//   <span class="breadcrumb-item breadcrumb-active" data-uri="file:///project/src/components/App.tsx">
//     App.tsx
//   </span>
// </div>

// CSS:
.theia-breadcrumb-partial {
    display: flex;
    align-items: center;
    height: 22px;
    padding: 0 8px;
    background: var(--theia-breadcrumb-background);
    border-bottom: 1px solid var(--theia-breadcrumb-border);
    font-size: var(--theia-ui-font-size0);
    user-select: none;
}

.breadcrumb-item {
    cursor: pointer;
    padding: 0 4px;
    color: var(--theia-breadcrumb-foreground);
    white-space: nowrap;
}

.breadcrumb-item:hover {
    color: var(--theia-breadcrumb-focusForeground);
    background: var(--theia-list-hoverBackground);
    border-radius: 3px;
}

.breadcrumb-separator {
    color: var(--theia-breadcrumb-foreground);
    opacity: 0.5;
    padding: 0 2px;
}

.breadcrumb-active {
    color: var(--theia-breadcrumb-activeForeground);
    font-weight: 600;
}
```

### 9.3 Breadcrumb Contribution Point

```typescript
// Extensoes podem contribuir com breadcrumbs customizados:

export interface BreadcrumbContribution {
    readonly id: string;
    readonly label: string;

    // Retorna items de breadcrumb para o widget ativo
    getBreadcrumbItems(widget: Widget): BreadcrumbItem[];

    // Prioridade: maior prioridade e consultada primeiro
    readonly priority: number;
}

// Exemplo: Breadcrumb contribution para arquivos
@injectable()
export class FileBreadcrumbContribution implements BreadcrumbContribution {
    readonly id = 'filesystem-breadcrumb';
    readonly label = 'Filesystem Breadcrumbs';
    readonly priority = 100;

    getBreadcrumbItems(widget: Widget): BreadcrumbItem[] {
        // Apenas para editores de texto
        if (!(widget instanceof EditorWidget)) { return []; }

        const uri = widget.editor.uri;
        const pathParts = uri.path.toString().split('/');

        return pathParts.map((part, index) => ({
            label: part || uri.displayName,
            uri: index === pathParts.length - 1 ? uri : undefined,
            command: index < pathParts.length - 1
                ? 'file-navigator.openToPosition'
                : undefined,
            arguments: index < pathParts.length - 1
                ? [pathParts.slice(0, index + 1).join('/')]
                : undefined
        }));
    }
}
```

### 9.4 Breadcrumb Navigation Events

```typescript
// Click em item de breadcrumb pode disparar navegacao:

@injectable()
export class BreadcrumbClickHandler {
    constructor(
        @inject(CommandService) protected readonly commands: CommandService,
        @inject(OpenerService) protected readonly openerService: OpenerService
    ) {}

    async handleClick(item: BreadcrumbItem): Promise<void> {
        if (item.command) {
            // Dispara comando customizado
            await this.commands.executeCommand(item.command, ...(item.arguments ?? []));
        } else if (item.uri) {
            // Abre URI no editor
            await this.openerService.open(item.uri);
        }
    }
}

// Eventos de navegacao:
// - Click no item: navega para aquele nivel
// - Click no separador: menu de contexto com siblings
// - Hover no item: tooltip com caminho completo
```

### 9.5 IDEIA-specific Breadcrumb Enhancements

A IDEIA extendera o breadcrumb padrao com informacoes de agente:

```typescript
// Breadcrumb IDEIA: mostra estado do agente no caminho
// [Project] [src] [App.tsx] [Agent: Analyzing...]

// Implementacao:
@injectable()
export class IDEIABreadcrumbContribution implements BreadcrumbContribution {
    readonly id = 'ideia-breadcrumb';
    readonly label = 'IDEIA Agent Breadcrumb';
    readonly priority = 50; // Baixa prioridade = aparece a direita

    constructor(
        @inject(AgentTracker) protected readonly agentTracker: AgentTracker
    ) {
        // Re-renderiza quando estado do agente muda
        this.agentTracker.onDidChangeAgentState(() => {
            this.onDidChangeEmitter.fire();
        });
    }

    protected readonly onDidChangeEmitter = new Emitter<void>();
    get onDidChange(): Signal<void> { return this.onDidChangeEmitter.signal; }

    getBreadcrumbItems(widget: Widget): BreadcrumbItem[] {
        const agentState = this.agentTracker.getCurrentState();
        if (!agentState || agentState === 'idle') { return []; }

        const icons: Record<string, string> = {
            'analyzing': '$(search)',
            'writing': '$(edit)',
            'debugging': '$(bug)',
            'planning': '$(light-bulb)',
            'testing': '$(check-all)'
        };

        return [{
            label: `${icons[agentState] ?? '$(hubot)'} Agent: ${agentState}`,
            command: 'ideia.agent.panel.open',
            arguments: []
        }];
    }
}
```

---

## 10. Activity Bar

### 10.1 ActivityBar Architecture

A Activity Bar e a barra vertical esquerda com icones de navegacao:

```typescript
export interface ActivityBar {
    readonly container: HTMLElement;

    // Items registrados (views da sidebar)
    readonly items: ActivityBarItem[];

    // Item ativo
    readonly activeItem: ActivityBarItem | undefined;

    // Gerenciamento
    addItem(item: ActivityBarItem): void;
    removeItem(id: string): void;
    activateItem(id: string): void;
    getItem(id: string): ActivityBarItem | undefined;
}

export interface ActivityBarItem {
    id: string;                   // Identificador unico
    label: string;                // Tooltip/label
    iconClass: string;            // Classe CSS do icone
    iconPath?: URI;               // Caminho para SVG customizado
    badge?: number;               // Badge numerico (notificacoes)
    badgeTooltip?: string;        // Tooltip do badge
    command?: string;             // Comando ao clicar (default: mostrar sidebar view)
    arguments?: any[];            // Argumentos do comando
    when?: string;                // When clause (visibilidade condicional)
}

// A Activity Bar e renderizada como uma lista vertical de icones:
// +-----------+
// |   logo    |  ← IDEIA logo (custom)
// +-----------+
// |   files   |  ← Explorer
// |  search   |  ← Search
// |    git    |  ← SCM
// |   debug   |  ← Debug
// |  puzzle   |  ← Extensions
// +-----------+
// | settings  |  ← Gear (inferior)
// |  account  |  ← Avatar (inferior)
// +-----------+
```

### 10.2 Activity Bar Position & Layout

```typescript
// A Activity Bar e posicionada no canto esquerdo extremo:
// [Activity Bar] [Left Sidebar] [Main Area | Right Sidebar]

// Dimensoes:
//   - Largura: 48px (padrao, definido por CSS)
//   - Altura: 100% do content area
//   - Items: 48x48px cada

// CSS:
#theia-activity-bar {
    display: flex;
    flex-direction: column;
    width: 48px;
    min-width: 48px;
    background: var(--theia-activityBar-background);
    border-right: 1px solid var(--theia-activityBar-border);
    z-index: 10;
}

// Layout e gerenciado diretamente pelo ApplicationShell
// como um widget filho, nao pelo SidePanelHandler
```

### 10.3 Activity Bar Items & Contributions

```typescript
// Registro de items na activity bar:

@injectable()
export class ActivityBarContribution implements CommandContribution {
    constructor(
        @inject(ActivityBar) protected readonly activityBar: ActivityBar,
        @inject(WidgetManager) protected readonly widgetManager: WidgetManager
    ) {}

    onStart(): void {
        // Items sao registrados automaticamente quando views sao adicionadas
        // via shell.addWidget({ area: 'left' })

        // Registro manual (para items sem view correspondente):
        this.activityBar.addItem({
            id: 'ideia-ai-panel',
            label: 'IDEIA AI Assistant',
            iconClass: 'ideia-icon ideia-icon-agent',
            command: 'ideia.chat.open',
            badge: 0
        });
    }
}

// Mapeamento padrao (shell area → activity bar item):
//   area: 'left'   → item na activity bar com icone correspondente
//   area: 'right'  → item na activity bar (se configurado)
//   area: 'bottom' → item na activity bar (ou none)

// O mapeamento usa o 'iconClass' do widget.title
```

### 10.4 Activity Bar Badge & Counter

```typescript
// Badges sao numeros ou indicadores no canto superior direito do item:

export class ActivityBarBadge {
    constructor(
        protected readonly container: HTMLElement,
        protected readonly itemId: string
    ) {
        this.createBadge();
    }

    protected badgeElement: HTMLElement;

    createBadge(): void {
        this.badgeElement = document.createElement('div');
        this.badgeElement.className = 'theia-activity-bar-badge';
        this.container.appendChild(this.badgeElement);
    }

    setValue(value: number): void {
        if (value <= 0) {
            this.badgeElement.style.display = 'none';
            return;
        }

        this.badgeElement.style.display = 'block';
        this.badgeElement.textContent = value > 99 ? '99+' : String(value);
    }

    setVisible(visible: boolean): void {
        this.badgeElement.style.display = visible ? 'block' : 'none';
    }
}

// Exemplo: badge de SC M com mudancas pendentes
// git.view mostra badge com numero de mudancas
activityBar.getItem('scm-view')?.badge = 12;

// Badge e atualizado via signal:
this.scmService.onDidChange(() => {
    const changes = this.scmService.getChangesCount();
    this.activityBar.getItem('scm-view')!.badge = changes;
});
```

### 10.5 Activity Bar Toggle Sidebar

```typescript
// Click em item da activity bar:
//   1. Se sidebar ja esta aberta com essa view → fecha sidebar
//   2. Se sidebar esta fechada → abre com essa view
//   3. Se sidebar esta aberta com outra view → troca para essa view

// Comportamento (implementado no ApplicationShell):
onActivityBarItemClicked(itemId: string): void {
    const currentActive = this.leftPanelHandler.state.activeWidgetId;

    if (currentActive === itemId && this.isPanelExpanded('left')) {
        // Caso 1: mesma view, toggle fechar
        this.collapsePanel('left');
    } else {
        // Caso 2/3: expandir/ativar
        this.expandPanel('left');
        this.leftPanelHandler.activateWidget(itemId);
    }

    // Atualiza destaque visual na activity bar
    this.activityBar.activateItem(itemId);
}
```

### 10.6 Activity Bar Icon Styling

```typescript
// Icones na activity bar sao renderizados como spans com classes CSS:

// Uso de Codicons (VS Code icons):
// <span class="codicon codicon-files"></span>

// Uso de icon path customizado (SVG):
// <img src="data:image/svg+xml;base64,..." />

// CSS:
.theia-activity-bar-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    cursor: pointer;
    color: var(--theia-activityBar-inactiveForeground);
    transition: color 0.1s ease;
}

.theia-activity-bar-item:hover {
    color: var(--theia-activityBar-foreground);
    background: var(--theia-activityBar-hoverBackground);
}

.theia-activity-bar-item.active {
    color: var(--theia-activityBar-activeForeground);
    border-left: 2px solid var(--theia-activityBar-activeBorder);
}

.theia-activity-bar-item .codicon {
    font-size: 24px;
    line-height: 48px;
}

// IDEIA custom icons:
.ideia-icon-agent {
    background: url('../icons/ideia-agent.svg') center/24px no-repeat;
    filter: var(--ideia-icon-filter);
}
```

---

## 11. Title Bar

### 11.1 WindowTitleBar Architecture

O Title Bar no Theia Electron e um componente customizado que substitui a barra de titulo nativa do SO:

```typescript
// ElectronApplicationShell gerencia a title bar

export class ElectronApplicationShell extends ApplicationShell {
    protected titleBar: CustomTitleWidget;
    protected windowControls: WindowControls;

    protected async initializeShell(): Promise<void> {
        // 1. Cria CustomTitleWidget
        this.titleBar = this.customTitleWidgetFactory();
        this.titleBar.id = 'theia-title-bar';

        // 2. Cria WindowControls (minimize, maximize, close)
        this.windowControls = new WindowControls();

        // 3. Adiciona ao topo do shell
        this.insertWidget(0, this.titleBar);

        // 4. Escuta eventos de janela
        this.listenWindowEvents();
    }

    protected listenWindowEvents(): void {
        // Atualiza quando o titulo do workspace muda
        this.workspaceService.onWorkspaceNameChanged(name => {
            this.titleBar.updateTitle(
                name ? `${name} - IDEIA` : 'IDEIA'
            );
        });

        // Atualiza botoes de maximize/restore
        window.addEventListener('maximize-change', () => {
            this.windowControls.updateMaximizeState(
                window.isMaximized?.() ?? false
            );
        });
    }
}
```

### 11.2 Custom Title Bar vs Native Title Bar

| Aspecto | Custom Title Bar | Native Title Bar |
|---------|-----------------|------------------|
| **Cross-platform** | Consistente em Win/Mac/Linux | Comportamento nativo (diferente) |
| **Customizacao** | Total (HTML/CSS/TS) | Minima (apenas cor) |
| **Window drag** | `-webkit-app-region: drag` | Nativo |
| **Window controls** | CSS customizado | Botoe nativos do SO |
| **Context menu** | Customizado | Nativo do SO |
| **Performance** | Renderizacao extra | Nativa (sem custo) |
| **Acessibilidade** | Precisa de implementacao | Nativa do SO |
| **Tema** | Integrado com ThemeService | Limitado |

O Theia usa **Custom Title Bar por padrao** no Electron. A native title bar pode ser ativada via configuracao:

```json
// settings.json
{
    "window.titleBarStyle": "native"  // ou "custom" (default)
}
```

### 11.3 CustomTitleWidget & CustomTitleWidgetFactory

```typescript
// CustomTitleWidget e o widget que renderiza a title bar customizada
export class CustomTitleWidget extends Widget {
    protected titleElement: HTMLElement;
    protected centerElement: HTMLElement;

    constructor() {
        super();
        this.addClass('theia-custom-title-bar');
        this.layout = new PanelLayout();

        // Layout da title bar:
        // [Left: app icon + menu] [Center: title] [Right: window controls]

        this.titleElement = document.createElement('div');
        this.titleElement.className = 'theia-title-bar-title';
        this.titleElement.textContent = 'IDEIA';

        const centerPanel = new Panel();
        centerPanel.addClass('theia-title-bar-center');
        centerPanel.addWidget(new Widget({ titleElement: this.titleElement }));
    }

    updateTitle(title: string): void {
        this.titleElement.textContent = title;
    }

    adjustTitleToCenter(): void {
        // Calcula espaco disponivel e ajusta posicao do titulo
        const availableWidth = this.node.offsetWidth;
        const leftWidth = this.node.querySelector('.theia-title-bar-left')?.clientWidth ?? 0;
        const rightWidth = this.node.querySelector('.theia-title-bar-right')?.clientWidth ?? 0;
        const centerWidth = availableWidth - leftWidth - rightWidth;

        this.centerElement.style.maxWidth = `${Math.max(centerWidth, 100)}px`;
    }
}

// Factory:
export interface CustomTitleWidgetFactory {
    (): CustomTitleWidget;
}

export const CustomTitleWidgetFactory = Symbol('CustomTitleWidgetFactory');
```

### 11.4 Title Bar Context Menu

```typescript
// Context menu da title bar (click direito):
export class TitleBarContextMenu {
    constructor(
        @inject(MenuService) protected readonly menuService: MenuService
    ) {}

    show(event: MouseEvent): void {
        const menu = new Menu();

        menu.addItem({
            label: 'IDEIA - AI Development Kit',
            type: 'separator'
        });

        menu.addItem({
            label: 'About IDEIA',
            command: 'ideia.about'
        });

        menu.addItem({ type: 'separator' });

        menu.addItem({
            label: 'Settings',
            command: 'workbench.action.openSettings'
        });

        menu.addItem({
            label: 'Command Palette...',
            command: 'workbench.action.showCommands'
        });

        menu.addItem({ type: 'separator' });

        menu.addItem({
            label: 'Toggle Full Screen',
            command: 'workbench.action.toggleFullScreen'
        });

        menu.addItem({
            label: 'Toggle Menu Bar',
            command: 'workbench.action.toggleMenuBar'
        });

        menu.addItem({ type: 'separator' });

        menu.addItem({
            label: 'Hide Title Bar',
            command: 'window.titleBarStyle',
            arguments: ['native']
        });

        this.menuService.displayMenu(menu, {
            x: event.clientX,
            y: event.clientY
        });
    }
}

// Click direito na title bar:
this.titleBar.node.addEventListener('contextmenu', (event) => {
    this.titleBarContextMenu.show(event);
});
```

### 11.5 Title Bar Icons & Branding

```typescript
// Icone da aplicacao na title bar (esquerda):
// <div class="theia-title-bar-left">
//   <img class="theia-title-bar-app-icon" src="ideia-icon.svg" />
//   <span class="theia-title-bar-app-name">IDEIA</span>
// </div>

// CSS:
.theia-title-bar-app-icon {
    width: 20px;
    height: 20px;
    margin: 0 8px;
    -webkit-app-region: no-drag;
    pointer-events: none; // Permite drag-through
}

.theia-title-bar-app-name {
    font-size: var(--theia-ui-font-size1);
    font-weight: 500;
    color: var(--theia-titleBar-activeForeground);
    -webkit-app-region: no-drag;
}

// Theia permite contribuir com icon customizado:
// electron-main.js
app.setName('IDEIA');
app.setAppUserModelId('com.ideia.devkit');
```

### 11.6 Title Bar Window Controls

```typescript
// Window controls customizados (Electron):

// HTML:
// <div id="window-controls" class="theia-window-controls">
//   <div id="minimize-button" class="window-control">
//     <span class="codicon codicon-chrome-minimize"></span>
//   </div>
//   <div id="maximize-button" class="window-control">
//     <span class="codicon codicon-chrome-maximize"></span>
//   </div>
//   <div id="restore-button" class="window-control" style="display:none">
//     <span class="codicon codicon-chrome-restore"></span>
//   </div>
//   <div id="close-button" class="window-control">
//     <span class="codicon codicon-chrome-close"></span>
//   </div>
// </div>

// CSS:
#window-controls {
    display: grid;
    grid-template-columns: repeat(3, 48px);
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    -webkit-app-region: no-drag;
}

.window-control {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--theia-titleBar-activeForeground);
    transition: background 0.1s ease;
}

.window-control:hover {
    background: var(--theia-titleBar-hoverBackground);
}

#close-button:hover {
    background: #e81123;
    color: white;
}

body.maximized #maximize-button { display: none; }
body:not(.maximized) #restore-button { display: none; }

// Comportamento (preload script):
document.getElementById('minimize-button')?.addEventListener('click', () => {
    window.electronAPI?.minimizeWindow();
});
document.getElementById('maximize-button')?.addEventListener('click', () => {
    window.electronAPI?.maximizeWindow();
});
document.getElementById('restore-button')?.addEventListener('click', () => {
    window.electronAPI?.restoreWindow();
});
document.getElementById('close-button')?.addEventListener('click', () => {
    window.electronAPI?.closeWindow();
});
```

### 11.7 IDEIA-specific Title Bar Contributions

A title bar da IDEIA incluira elementos adicionais:

```typescript
// Title bar IDEIA:
// [Icon] [IDEIA] [Agent Status Indicator] [Project Name - IDEIA] [--] [□] [X]

// Elementos adicionados:
// 1. Agent Status Pulse: bolinha animada no canto do icone
//    - Verde: agente ativo
//    - Amarelo: processando
//    - Vermelho: erro
// 2. Quick Action Buttons: botoes de acao rapida
//    - Play (run task)
//    - Stop (cancel)
//    - AI (chat quick open)
// 3. Workspace Branch: nome do branch git atual

// Implementacao:
@injectable()
export class IDEIATitleBarContribution {
    constructor(
        @inject(CustomTitleWidgetFactory) protected readonly factory: CustomTitleWidgetFactory
    ) {}

    onStart(): void {
        const titleBar = this.factory();
        titleBar.addClass('ideia-title-bar');

        // Adiciona indicador de agente
        const agentIndicator = document.createElement('div');
        agentIndicator.className = 'ideia-title-bar-agent';
        agentIndicator.title = 'IDEIA Agent Status';
        titleBar.node.prepend(agentIndicator);

        // Adiciona botoes de acao rapida
        const actions = document.createElement('div');
        actions.className = 'ideia-title-bar-actions';
        actions.innerHTML = `
            <button class="ideia-action-btn" data-action="run">
                <span class="codicon codicon-play"></span>
            </button>
            <button class="ideia-action-btn" data-action="chat">
                <span class="codicon codicon-comment-discussion"></span>
            </button>
        `;
        titleBar.node.insertBefore(actions, titleBar.node.querySelector('#window-controls'));
    }
}
```

---

## 12. Theme Integration

### 12.1 Shell Area Color Registration

Cada area do shell registra cores que podem ser customizadas por temas:

```typescript
// Registro de cores no ColorRegistry:

@injectable()
export class ShellColorContribution implements ColorContribution {
    registerColors(colors: ColorRegistry): void {
        // Activity Bar
        colors.registerColor({
            id: 'activityBar.background',
            defaults: { dark: '#333333', light: '#F3F3F3', hc: '#000000' },
            description: 'Activity bar background color'
        });
        colors.registerColor({
            id: 'activityBar.foreground',
            defaults: { dark: '#FFFFFF', light: '#333333', hc: '#FFFFFF' },
            description: 'Activity bar foreground color'
        });
        colors.registerColor({
            id: 'activityBar.inactiveForeground',
            defaults: { dark: '#8B8B8B', light: '#8B8B8B', hc: '#FFFFFF' },
            description: 'Activity bar item inactive foreground color'
        });
        colors.registerColor({
            id: 'activityBar.activeBorder',
            defaults: { dark: '#FFFFFF', light: '#333333', hc: '#F38518' },
            description: 'Activity bar active item border color'
        });
        colors.registerColor({
            id: 'activityBar.border',
            defaults: { dark: '#252526', light: '#E5E5E5', hc: '#6FC3DF' },
            description: 'Activity bar border color'
        });

        // Side Bar
        colors.registerColor({
            id: 'sideBar.background',
            defaults: { dark: '#252526', light: '#F3F3F3', hc: '#000000' },
            description: 'Side bar background color'
        });
        colors.registerColor({
            id: 'sideBar.foreground',
            defaults: { dark: '#CCCCCC', light: '#333333', hc: '#FFFFFF' },
            description: 'Side bar foreground color'
        });
        colors.registerColor({
            id: 'sideBar.border',
            defaults: { dark: '#252526', light: '#E5E5E5', hc: '#6FC3DF' },
            description: 'Side bar border color'
        });
        colors.registerColor({
            id: 'sideBarTitle.foreground',
            defaults: { dark: '#BBBBBB', light: '#6F6F6F', hc: '#FFFFFF' },
            description: 'Side bar title foreground color'
        });

        // Status Bar
        colors.registerColor({
            id: 'statusBar.background',
            defaults: { dark: '#007ACC', light: '#007ACC', hc: '#000000' },
            description: 'Status bar background color'
        });
        colors.registerColor({
            id: 'statusBar.foreground',
            defaults: { dark: '#FFFFFF', light: '#FFFFFF', hc: '#FFFFFF' },
            description: 'Status bar foreground color'
        });
        colors.registerColor({
            id: 'statusBar.border',
            defaults: { dark: '#252526', light: '#E5E5E5', hc: '#6FC3DF' },
            description: 'Status bar border color'
        });
        colors.registerColor({
            id: 'statusBar.noFolderBackground',
            defaults: { dark: '#68217A', light: '#68217A', hc: '#000000' },
            description: 'Status bar background color when no folder is open'
        });

        // Title Bar
        colors.registerColor({
            id: 'titleBar.activeBackground',
            defaults: { dark: '#3C3C3C', light: '#DDDDDD', hc: '#000000' },
            description: 'Title bar background when window is active'
        });
        colors.registerColor({
            id: 'titleBar.activeForeground',
            defaults: { dark: '#CCCCCC', light: '#333333', hc: '#FFFFFF' },
            description: 'Title bar foreground when window is active'
        });
        colors.registerColor({
            id: 'titleBar.inactiveBackground',
            defaults: { dark: '#2D2D2D', light: '#F3F3F3', hc: '#000000' },
            description: 'Title bar background when window is inactive'
        });
        colors.registerColor({
            id: 'titleBar.inactiveForeground',
            defaults: { dark: '#6C6C6C', light: '#BBBBBB', hc: '#FFFFFF' },
            description: 'Title bar foreground when window is inactive'
        });

        // Panel (bottom)
        colors.registerColor({
            id: 'panel.background',
            defaults: { dark: '#1E1E1E', light: '#F3F3F3', hc: '#000000' },
            description: 'Panel background color'
        });
        colors.registerColor({
            id: 'panel.border',
            defaults: { dark: '#252526', light: '#E5E5E5', hc: '#6FC3DF' },
            description: 'Panel border color'
        });
        colors.registerColor({
            id: 'panelTitle.activeForeground',
            defaults: { dark: '#E7E7E7', light: '#424242', hc: '#FFFFFF' },
            description: 'Panel title foreground for the active panel'
        });
        colors.registerColor({
            id: 'panelTitle.inactiveForeground',
            defaults: { dark: '#8B8B8B', light: '#8B8B8B', hc: '#FFFFFF' },
            description: 'Panel title foreground for inactive panels'
        });

        // Breadcrumb
        colors.registerColor({
            id: 'breadcrumb.background',
            defaults: { dark: '#1E1E1E', light: '#F3F3F3', hc: '#000000' },
            description: 'Breadcrumb background color'
        });
        colors.registerColor({
            id: 'breadcrumb.foreground',
            defaults: { dark: '#8B8B8B', light: '#616161', hc: '#FFFFFF' },
            description: 'Breadcrumb foreground color'
        });
        colors.registerColor({
            id: 'breadcrumb.focusForeground',
            defaults: { dark: '#E7E7E7', light: '#424242', hc: '#FFFFFF' },
            description: 'Breadcrumb item foreground color on hover'
        });
    }
}
```

### 12.2 Theme Change Propagation to Shell Areas

```typescript
// Quando o tema muda, todas as areas do shell sao notificadas:

@injectable()
export class ShellThemeListener {
    constructor(
        @inject(ThemeService) protected readonly themeService: ThemeService,
        @inject(ApplicationShell) protected readonly shell: ApplicationShell
    ) {
        this.themeService.onDidColorThemeChange(() => {
            this.handleThemeChange();
        });
    }

    protected handleThemeChange(): void {
        const theme = this.themeService.getCurrentTheme();

        // 1. Propaga para areas do shell
        this.updateActivityBar(theme);
        this.updateSidebar(theme);
        this.updateBottomPanel(theme);
        this.updateStatusBar(theme);
        this.updateTitleBar(theme);

        // 2. Atualiza variaveis CSS customizadas
        this.updateCSSVariables(theme);

        // 3. Forca re-renderizacao de widgets abertos
        this.shell.widgets.forEach(widget => {
            if (typeof (widget as any).update === 'function') {
                (widget as any).update();
            }
        });
    }

    protected updateCSSVariables(theme: ColorTheme): void {
        const root = document.documentElement;
        const colorRegistry = this.themeService.getColorRegistry();

        // Aplica cores como CSS custom properties
        // activityBar.background → --theia-activityBar-background
        for (const [id, color] of colorRegistry.getColors()) {
            const cssVar = `--theia-${id.replace(/\./g, '-')}`;
            root.style.setProperty(cssVar, color.rgba?.toString() ?? '');
        }
    }

    protected updateActivityBar(theme: ColorTheme): void {
        const activityBar = this.shell.activityBar;
        activityBar.container.style.background =
            theme.getColor('activityBar.background')?.toString() ?? '';
    }

    protected updateStatusBar(theme: ColorTheme): void {
        const statusBar = this.shell.statusBar;
        statusBar.setBackgroundColor(
            theme.getColor('statusBar.background')?.toString()
        );
        statusBar.setColor(
            theme.getColor('statusBar.foreground')?.toString()
        );
    }

    protected updateTitleBar(theme: ColorTheme): void {
        const titleBar = document.getElementById('theia-title-bar');
        if (titleBar) {
            titleBar.style.background =
                theme.getColor('titleBar.activeBackground')?.toString() ?? '';
            titleBar.style.color =
                theme.getColor('titleBar.activeForeground')?.toString() ?? '';
        }
    }
}
```

### 12.3 CSS Custom Properties for Shell

O Theia expoe cores do tema como CSS custom properties (variaveis CSS):

```css
/* Mapeamento: token-id → CSS variable */
:root {
    /* Shell areas */
    --theia-activityBar-background: #333333;
    --theia-activityBar-foreground: #FFFFFF;
    --theia-activityBar-inactiveForeground: #8B8B8B;
    --theia-activityBar-activeBorder: #FFFFFF;
    --theia-activityBar-border: #252526;

    --theia-sideBar-background: #252526;
    --theia-sideBar-foreground: #CCCCCC;
    --theia-sideBar-border: #252526;
    --theia-sideBarTitle-foreground: #BBBBBB;

    --theia-statusBar-background: #007ACC;
    --theia-statusBar-foreground: #FFFFFF;
    --theia-statusBar-border: #252526;

    --theia-titleBar-activeBackground: #3C3C3C;
    --theia-titleBar-activeForeground: #CCCCCC;
    --theia-titleBar-inactiveBackground: #2D2D2D;
    --theia-titleBar-inactiveForeground: #6C6C6C;

    --theia-panel-background: #1E1E1E;
    --theia-panel-border: #252526;
    --theia-panelTitle-activeForeground: #E7E7E7;
    --theia-panelTitle-inactiveForeground: #8B8B8B;

    --theia-breadcrumb-background: #1E1E1E;
    --theia-breadcrumb-foreground: #8B8B8B;
    --theia-breadcrumb-focusForeground: #E7E7E7;
}

/* Uso em componentes CSS */
.theia-sidebar-tabbar {
    background: var(--theia-sideBar-background);
    color: var(--theia-sideBar-foreground);
    border-bottom: 1px solid var(--theia-sideBar-border);
}
```

### 12.4 Shell Color Tokens Reference

Tabela completa de tokens de cor para areas do shell:

| Token | Area | Propriedade |
|-------|------|-------------|
| `activityBar.background` | Activity Bar | Fundo |
| `activityBar.foreground` | Activity Bar | Texto/icone ativo |
| `activityBar.inactiveForeground` | Activity Bar | Texto/icone inativo |
| `activityBar.activeBorder` | Activity Bar | Borda item ativo |
| `activityBar.border` | Activity Bar | Borda externa |
| `activityBarBadge.background` | Activity Bar | Fundo do badge |
| `activityBarBadge.foreground` | Activity Bar | Texto do badge |
| `sideBar.background` | Side Bar | Fundo |
| `sideBar.foreground` | Side Bar | Texto |
| `sideBar.border` | Side Bar | Borda externa |
| `sideBarTitle.foreground` | Side Bar | Titulo do painel |
| `sideBarSectionHeader.background` | Side Bar | Cabecalho de secao |
| `sideBarSectionHeader.foreground` | Side Bar | Texto do cabecalho |
| `statusBar.background` | Status Bar | Fundo |
| `statusBar.foreground` | Status Bar | Texto |
| `statusBar.border` | Status Bar | Borda superior |
| `statusBar.debuggingBackground` | Status Bar | Fundo em modo debug |
| `statusBar.debuggingForeground` | Status Bar | Texto em modo debug |
| `statusBar.noFolderBackground` | Status Bar | Fundo sem pasta aberta |
| `statusBarItem.remoteBackground` | Status Bar | Fundo item remoto |
| `statusBarItem.remoteForeground` | Status Bar | Texto item remoto |
| `statusBarItem.errorBackground` | Status Bar | Fundo item de erro |
| `statusBarItem.errorForeground` | Status Bar | Texto item de erro |
| `statusBarItem.warningBackground` | Status Bar | Fundo item de aviso |
| `statusBarItem.warningForeground` | Status Bar | Texto item de aviso |
| `titleBar.activeBackground` | Title Bar | Fundo ativo |
| `titleBar.activeForeground` | Title Bar | Texto ativo |
| `titleBar.inactiveBackground` | Title Bar | Fundo inativo |
| `titleBar.inactiveForeground` | Title Bar | Texto inativo |
| `panel.background` | Bottom Panel | Fundo |
| `panel.border` | Bottom Panel | Borda superior |
| `panelTitle.activeForeground` | Bottom Panel | Texto aba ativa |
| `panelTitle.inactiveForeground` | Bottom Panel | Texto aba inativa |
| `panelTitle.activeBorder` | Bottom Panel | Borda inferior aba ativa |
| `breadcrumb.background` | Breadcrumb | Fundo |
| `breadcrumb.foreground` | Breadcrumb | Texto |
| `breadcrumb.focusForeground` | Breadcrumb | Texto hover |
| `breadcrumb.activeForeground` | Breadcrumb | Texto item ativo |
| `breadcrumbPicker.background` | Breadcrumb | Fundo picker dropdown |

### 12.5 Dynamic Theme Switching in Shell Components

```typescript
// Componentes sensiveis ao tema devem reagir a troca dinamica:

export class ThemeAwareSidePanel extends SidePanel {
    constructor(
        @inject(ThemeService) protected readonly themeService: ThemeService
    ) {
        super();
        this.themeService.onDidColorThemeChange(() => {
            this.applyThemeColors();
        });
        this.applyThemeColors();
    }

    protected applyThemeColors(): void {
        const theme = this.themeService.getCurrentTheme();
        this.node.style.setProperty(
            '--panel-bg',
            theme.getColor('sideBar.background')?.toString() ?? ''
        );
        this.node.style.setProperty(
            '--panel-fg',
            theme.getColor('sideBar.foreground')?.toString() ?? ''
        );
    }
}

// Para React widgets no Theia:
export class IDEIAReactWidget extends ReactWidget {
    protected render(): React.ReactNode {
        return React.createElement('div', {
            style: {
                background: 'var(--theia-sideBar-background)',
                color: 'var(--theia-sideBar-foreground)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }
        }, this.renderContent());
    }
}
```

---

## 13. Code Examples

### 13.1 ApplicationShell Layout State Serialization

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { ApplicationShell, Widget } from '@theia/core/lib/browser';

@injectable()
export class ShellLayoutSerializer {
    constructor(
        @inject(ApplicationShell) protected readonly shell: ApplicationShell
    ) {}

    serializeCurrentLayout(): string {
        const state = this.shell.saveLayout();
        return JSON.stringify(state, null, 2);
    }

    async deserializeAndRestore(layoutJson: string): Promise<void> {
        try {
            const state = JSON.parse(layoutJson);
            // Migrate if needed
            const migrated = this.migrateLayout(state);
            // Resolve conflicts
            const resolved = this.resolveConflicts(migrated);
            // Restore
            await this.shell.restoreLayout(resolved);
        } catch (error) {
            console.error('Failed to restore layout:', error);
        }
    }

    protected migrateLayout(state: any): any {
        if (!state.version || state.version < 2) {
            state.bottomPanel = state.bottomPanel || {};
            state.bottomPanel.maximized = state.bottomPanel.maximized ?? false;
            state.version = 2;
        }
        if (state.version < 3) {
            state.leftPanel = state.leftPanel || {};
            state.rightPanel = state.rightPanel || {};
            state.leftPanel.tracking = state.leftPanel.tracking ?? true;
            state.rightPanel.tracking = state.rightPanel.tracking ?? true;
            state.version = 3;
        }
        return state;
    }

    protected resolveConflicts(state: any): any {
        const validIds = new Set(this.shell.widgets.map(w => w.id));
        ['leftPanel', 'rightPanel', 'bottomPanel'].forEach(panel => {
            if (!state[panel]) { return; }
            state[panel].widgetIds = (state[panel].widgetIds ?? [])
                .filter((id: string) => validIds.has(id));
            if (!state[panel].widgetIds.includes(state[panel].activeWidgetId)) {
                state[panel].activeWidgetId = state[panel].widgetIds[0];
            }
            if (state[panel].widgetIds.length === 0) {
                state[panel].expanded = false;
            }
        });
        return state;
    }
}
```

### 13.2 SidePanelHandler Widget Registration

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { ApplicationShell, Widget } from '@theia/core/lib/browser';
import { ViewContainerIdentifier } from '@theia/core/lib/browser/view-container';

@injectable()
export class IDEIAViewRegistration {
    constructor(
        @inject(ApplicationShell) protected readonly shell: ApplicationShell
    ) {}

    registerIDEIAViews(): void {
        // AI Chat View
        const chatWidget = this.createChatWidget();
        this.shell.addWidget(chatWidget, {
            area: 'left',
            rank: 400
        });

        // Memory Explorer View
        const memoryWidget = this.createMemoryWidget();
        this.shell.addWidget(memoryWidget, {
            area: 'right',
            rank: 100
        });

        // Agent Output View (bottom panel)
        const agentOutput = this.createAgentOutputWidget();
        this.shell.addWidget(agentOutput, {
            area: 'bottom',
            rank: 500
        });
    }

    protected createChatWidget(): Widget {
        const widget = new Widget();
        widget.id = 'ideia-chat-view';
        widget.title.label = 'AI Chat';
        widget.title.iconClass = 'codicon codicon-comment-discussion';
        widget.title.caption = 'IDEIA AI Assistant Chat';
        widget.title.closable = true;
        return widget;
    }

    protected createMemoryWidget(): Widget {
        const widget = new Widget();
        widget.id = 'ideia-memory-view';
        widget.title.label = 'Memory';
        widget.title.iconClass = 'codicon codicon-database';
        widget.title.caption = 'IDEIA Context Memory';
        widget.title.closable = true;
        return widget;
    }

    protected createAgentOutputWidget(): Widget {
        const widget = new Widget();
        widget.id = 'ideia-agent-output';
        widget.title.label = 'Agent Output';
        widget.title.iconClass = 'codicon codicon-terminal';
        widget.title.caption = 'IDEIA Agent Execution Output';
        widget.title.closable = true;
        return widget;
    }
}
```

### 13.3 StatusBar Entry with Command Handler

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser/status-bar';
import { CommandService } from '@theia/core/lib/common/command';

@injectable()
export class IDEIAStatusBarContributions {
    constructor(
        @inject(StatusBar) protected readonly statusBar: StatusBar,
        @inject(CommandService) protected readonly commands: CommandService
    ) {}

    async registerEntries(): Promise<void> {
        // Agent status (left side, high priority)
        await this.statusBar.setElement('ideia-agent-status', {
            text: '$(hubot) Ready',
            tooltip: 'IDEIA Agent Status\nClick to open agent panel',
            command: 'ideia.agent.panel.open',
            alignment: StatusBarAlignment.LEFT,
            priority: 100,
            color: 'var(--theia-statusBar-foreground)'
        });

        // Autonomy level (right side, high priority)
        await this.statusBar.setElement('ideia-autonomy-level', {
            text: '$(shield) N3',
            tooltip: 'Current autonomy level: N3 (Semi-autonomous)\nClick to change',
            command: 'ideia.autonomy.configure',
            alignment: StatusBarAlignment.RIGHT,
            priority: 100,
            color: 'var(--theia-statusBar-foreground)'
        });

        // Quality score (right side, medium priority)
        await this.statusBar.setElement('ideia-quality-score', {
            text: '$(check) 87%',
            tooltip: 'Project quality score: 87/100\nClick to view details',
            command: 'ideia.quality.dashboard',
            alignment: StatusBarAlignment.RIGHT,
            priority: 80,
            color: 'var(--theia-statusBar-foreground)'
        });

        // Task count (left side, medium priority)
        await this.statusBar.setElement('ideia-task-count', {
            text: '$(issue-opened) 3 tasks',
            tooltip: '3 pending tasks\nClick to open task list',
            command: 'ideia.tasks.list',
            alignment: StatusBarAlignment.LEFT,
            priority: 70,
            color: 'var(--theia-statusBar-foreground)'
        });

        // Session cost (right side, low priority)
        await this.statusBar.setElement('ideia-session-cost', {
            text: '$(credit-card) $0.04',
            tooltip: 'Accumulated session cost',
            alignment: StatusBarAlignment.RIGHT,
            priority: 30,
            color: 'var(--theia-statusBar-foreground)'
        });
    }

    async updateAgentStatus(agentName: string, state: 'idle' | 'running' | 'error'): Promise<void> {
        const icons = {
            idle: '$(hubot)',
            running: '$(sync~spin)',
            error: '$(error)'
        };
        const colors = {
            idle: 'var(--theia-statusBar-foreground)',
            running: 'var(--theia-statusBarItem-warningForeground)',
            error: 'var(--theia-statusBarItem-errorForeground)'
        };

        await this.statusBar.setElement('ideia-agent-status', {
            text: `${icons[state]} ${agentName}`,
            tooltip: `IDEIA Agent: ${agentName} (${state})\nClick to open agent panel`,
            command: 'ideia.agent.panel.open',
            alignment: StatusBarAlignment.LEFT,
            priority: 100,
            color: colors[state]
        });
    }
}
```

### 13.4 BottomPanel Toggle & Maximize Commands

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import {
    ApplicationShell,
    CommonCommands
} from '@theia/core/lib/browser';
import {
    CommandContribution,
    CommandRegistry,
    Command
} from '@theia/core/lib/common/command';

export namespace IDEIAPanelCommands {
    export const TOGGLE_BOTTOM_PANEL: Command = {
        id: 'ideia.panel.toggle',
        label: 'Toggle Bottom Panel',
        category: 'IDEIA Panel'
    };
    export const MAXIMIZE_BOTTOM_PANEL: Command = {
        id: 'ideia.panel.maximize',
        label: 'Maximize Bottom Panel',
        category: 'IDEIA Panel'
    };
    export const RESTORE_BOTTOM_PANEL: Command = {
        id: 'ideia.panel.restore',
        label: 'Restore Bottom Panel Size',
        category: 'IDEIA Panel'
    };
    export const CYCLE_BOTTOM_VIEWS: Command = {
        id: 'ideia.panel.cycle',
        label: 'Cycle Through Bottom Panel Views',
        category: 'IDEIA Panel'
    };
}

@injectable()
export class IDEIAPanelCommandContribution implements CommandContribution {
    constructor(
        @inject(ApplicationShell) protected readonly shell: ApplicationShell
    ) {}

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(IDEIAPanelCommands.TOGGLE_BOTTOM_PANEL, {
            isEnabled: () => true,
            execute: () => {
                if (this.shell.isPanelExpanded('bottom')) {
                    this.shell.collapsePanel('bottom');
                } else {
                    this.shell.expandPanel('bottom');
                }
            }
        });

        commands.registerCommand(IDEIAPanelCommands.MAXIMIZE_BOTTOM_PANEL, {
            isEnabled: () => this.shell.isPanelExpanded('bottom'),
            execute: () => {
                const bottomPanel = this.shell.bottomPanelHandler;
                bottomPanel.maximize();
            }
        });

        commands.registerCommand(IDEIAPanelCommands.RESTORE_BOTTOM_PANEL, {
            isEnabled: () => this.shell.isPanelExpanded('bottom'),
            execute: () => {
                const bottomPanel = this.shell.bottomPanelHandler;
                bottomPanel.restore();
            }
        });

        commands.registerCommand(IDEIAPanelCommands.CYCLE_BOTTOM_VIEWS, {
            isEnabled: () => this.shell.isPanelExpanded('bottom'),
            execute: () => {
                const handler = this.shell.bottomPanelHandler;
                const widgets = handler.widgetIds;
                const currentIndex = widgets.indexOf(handler.activeWidgetId);
                const nextIndex = (currentIndex + 1) % widgets.length;
                handler.activateWidget(widgets[nextIndex]);
            }
        });
    }
}
```

### 13.5 Layout Persistence Service

```typescript
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ApplicationShell } from '@theia/core/lib/browser';
import { StorageService } from '@theia/core/lib/browser/storage-service';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { Deferred } from '@theia/core/lib/common/promise-util';

@injectable()
export class IDEIALayoutPersistenceService {
    protected readonly LAYOUT_VERSION = 1;
    protected readonly DEBOUNCE_DELAY = 1000;
    protected saveTimeout: number | undefined;
    protected ready = new Deferred<void>();

    constructor(
        @inject(ApplicationShell) protected readonly shell: ApplicationShell,
        @inject(StorageService) protected readonly storage: StorageService,
        @inject(WorkspaceService) protected readonly workspace: WorkspaceService
    ) {}

    @postConstruct()
    init(): void {
        this.registerAutoSave();
        this.ready.resolve();
    }

    protected getStorageKey(): string {
        const ws = this.workservice.workspace;
        const wsUri = ws?.resource?.toString() ?? 'default';
        return `ideia:layout:${wsUri}`;
    }

    async saveLayout(): Promise<void> {
        const state = this.shell.saveLayout();
        const data = {
            version: this.LAYOUT_VERSION,
            timestamp: Date.now(),
            state
        };
        await this.storage.setData(this.getStorageKey(), data);
    }

    async restoreLayout(): Promise<boolean> {
        const data = await this.storage.getData(this.getStorageKey());
        if (!data?.state) { return false; }
        try {
            await this.shell.restoreLayout(data.state);
            return true;
        } catch (error) {
            console.error('Failed to restore IDEIA layout:', error);
            return false;
        }
    }

    async clearLayout(): Promise<void> {
        await this.storage.setData(this.getStorageKey(), undefined);
    }

    protected registerAutoSave(): void {
        // Save on layout changes (debounced)
        this.shell.onDidChangeLayout(() => {
            this.debouncedSave();
        });

        // Save on active widget changes
        this.shell.onDidChangeCurrentWidget(() => {
            this.debouncedSave();
        });

        // Save on window close
        window.addEventListener('beforeunload', () => {
            this.saveLayout();
        });
    }

    protected debouncedSave(): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = window.setTimeout(() => {
            this.saveLayout().catch(console.error);
        }, this.DEBOUNCE_DELAY);
    }
}
```

### 13.6 Breadcrumb Contribution Registration

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import {
    BreadcrumbContribution,
    BreadcrumbItem
} from '@theia/core/lib/browser/breadcrumbs';
import { Widget } from '@theia/core/lib/browser/widgets/widget';
import { LabelProvider } from '@theia/core/lib/browser/label-provider';
import { EditorWidget } from '@theia/editor/lib/browser/editor-widget';
import { URI } from '@theia/core/lib/common/uri';

@injectable()
export class IDEIABreadcrumbContribution implements BreadcrumbContribution {
    readonly id = 'ideia-breadcrumb';
    readonly label = 'IDEIA Breadcrumb';
    readonly priority = 200;

    constructor(
        @inject(LabelProvider) protected readonly labels: LabelProvider
    ) {}

    getBreadcrumbItems(widget: Widget): BreadcrumbItem[] {
        if (!(widget instanceof EditorWidget)) { return []; }

        const uri = widget.editor.uri;
        const pathParts = this.getPathParts(uri);

        const items: BreadcrumbItem[] = [];
        let currentPath = '';

        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            items.push({
                label: part,
                icon: i === 0 ? 'codicon codicon-root-folder' : undefined,
                uri: i === pathParts.length - 1 ? uri : undefined,
                command: 'file-navigator.openToPosition',
                arguments: [currentPath]
            });
        }

        return items;
    }

    protected getPathParts(uri: URI): string[] {
        const pathStr = uri.path.toString();
        const parts = pathStr.split('/').filter(p => p.length > 0);
        if (parts.length > 6) {
            return [
                ...parts.slice(0, 3),
                '...',
                ...parts.slice(-2)
            ];
        }
        return parts;
    }
}
```

### 13.7 Activity Bar Contribution with Badge

```typescript
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ActivityBar } from '@theia/core/lib/browser/activity-bar';
import { MessageService } from '@theia/core/lib/common/message-service';
import { EventBus } from '@theia/core/lib/common/event-bus';

@injectable()
export class IDEIAActivityBarContribution {
    protected badgeInterval: number | undefined;

    constructor(
        @inject(ActivityBar) protected readonly activityBar: ActivityBar,
        @inject(MessageService) protected readonly messages: MessageService,
        @inject(EventBus) protected readonly eventBus: EventBus
    ) {}

    @postConstruct()
    init(): void {
        this.registerCustomItems();
        this.listenToEvents();
    }

    protected registerCustomItems(): void {
        // IDEIA Agent Panel
        this.activityBar.addItem({
            id: 'ideia-agent',
            label: 'IDEIA AI Agent',
            iconClass: 'ideia-icon-agent',
            command: 'ideia.chat.open',
            badge: 0
        });

        // IDEIA Memory
        this.activityBar.addItem({
            id: 'ideia-memory',
            label: 'IDEIA Memory Explorer',
            iconClass: 'codicon codicon-database',
            command: 'ideia.memory.open'
        });

        // IDEIA Quality Dashboard
        this.activityBar.addItem({
            id: 'ideia-quality',
            label: 'IDEIA Quality Dashboard',
            iconClass: 'codicon codicon-dashboard',
            command: 'ideia.quality.open'
        });
    }

    protected listenToEvents(): void {
        // Update badge on agent events
        this.eventBus.on('agent:state-change', (event: any) => {
            const item = this.activityBar.getItem('ideia-agent');
            if (item) {
                item.badge = event.pendingTasks ?? 0;
            }
        });

        // Update badge on quality events
        this.eventBus.on('quality:issue-detected', (event: any) => {
            const item = this.activityBar.getItem('ideia-quality');
            if (item) {
                item.badge = (item.badge ?? 0) + 1;
            }
        });
    }
}
```

### 13.8 Custom Title Widget with IDEIA Branding

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import {
    CustomTitleWidget,
    CustomTitleWidgetFactory
} from '@theia/core/lib/browser/custom-title-widget';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { ApplicationShell } from '@theia/core/lib/browser/shell/application-shell';

@injectable()
export class IDEIATitleBarCustomizer {
    constructor(
        @inject(CustomTitleWidgetFactory)
        protected readonly titleWidgetFactory: CustomTitleWidgetFactory,
        @inject(WorkspaceService)
        protected readonly workspaceService: WorkspaceService,
        @inject(ApplicationShell)
        protected readonly shell: ApplicationShell
    ) {}

    initialize(): void {
        const titleWidget = this.titleWidgetFactory();
        titleWidget.addClass('ideia-custom-title-bar');

        // Adiciona branding a esquerda
        const leftSection = titleWidget.node.querySelector('.theia-title-bar-left');
        if (leftSection) {
            const brand = document.createElement('div');
            brand.className = 'ideia-title-bar-brand';
            brand.innerHTML = `
                <span class="ideia-title-bar-logo"></span>
                <span class="ideia-title-bar-product">IDEIA</span>
            `;
            leftSection.prepend(brand);
        }

        // Atualiza titulo com workspace
        this.updateTitle();
        this.workspaceService.onWorkspaceNameChanged(() => this.updateTitle());
    }

    protected updateTitle(): void {
        const wsName = this.workspaceService.workspace?.name;
        const title = wsName ? `${wsName} - IDEIA` : 'IDEIA';
        document.title = title;

        const titleElements = document.querySelectorAll('.theia-title-bar-title');
        titleElements.forEach(el => {
            el.textContent = title;
        });
    }
}
```

### 13.9 Shell Aware Widget with onActivate/onReveal

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { Widget } from '@theia/core/lib/browser/widgets/widget';
import { ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { MessageService } from '@theia/core/lib/common/message-service';

@injectable()
export class IDEIAShellAwareWidget extends Widget {
    static readonly ID = 'ideia-shell-aware';
    static readonly LABEL = 'Shell Aware Widget';

    constructor(
        @inject(ApplicationShell) protected readonly shell: ApplicationShell,
        @inject(MessageService) protected readonly messages: MessageService
    ) {
        super();
        this.id = IDEIAShellAwareWidget.ID;
        this.title.label = IDEIAShellAwareWidget.LABEL;
        this.title.iconClass = 'codicon codicon-layers';
        this.title.closable = true;
        this.addClass('ideia-shell-aware');
    }

    protected onActivateRequest(): void {
        // Called when widget receives focus
        super.onActivateRequest();
        this.messages.info('Shell Aware Widget activated');
        this.update();
    }

    protected onReveal(): void {
        // Called when widget becomes visible (area expanded or tab switched)
        super.onReveal();
        this.messages.info('Shell Aware Widget revealed');

        // Register with shell for layout change events
        this.shell.onDidChangePanelState(() => {
            if (this.isVisible) {
                this.onLayoutChanged();
            }
        });
    }

    protected onLayoutChanged(): void {
        // React to layout state changes while visible
        const leftExpanded = this.shell.isPanelExpanded('left');
        const bottomExpanded = this.shell.isPanelExpanded('bottom');

        this.node.classList.toggle('ideia-compact-layout', !leftExpanded);
        this.node.classList.toggle('ideia-bottom-open', bottomExpanded);
    }

    protected onHide(): void {
        // Called when widget is hidden (area collapsed or different tab)
        super.onHide();
    }

    protected onCloseRequest(): void {
        // Called when widget is closed
        super.onCloseRequest();
    }
}
```

### 13.10 Registering Shell Color Tokens

```typescript
import { injectable } from '@theia/core/shared/inversify';
import { ColorRegistry, ColorContribution } from '@theia/core/lib/browser/color-registry';
import { Color } from '@theia/core/lib/common/color';

@injectable()
export class IDEIAShellColorContribution implements ColorContribution {
    registerColors(colors: ColorRegistry): void {
        // IDEIA-specific shell color tokens
        colors.registerColor({
            id: 'ideia.shell.activityBar.agentActive',
            defaults: {
                dark: '#4EC9B0',
                light: '#0D7E6B',
                hc: '#F38518'
            },
            description: 'IDEIA agent active indicator color in activity bar'
        });

        colors.registerColor({
            id: 'ideia.shell.statusBar.agentRunning',
            defaults: {
                dark: '#4EC9B0',
                light: '#0D7E6B',
                hc: '#FFFFFF'
            },
            description: 'IDEIA status bar background when agent is running'
        });

        colors.registerColor({
            id: 'ideia.shell.statusBar.agentError',
            defaults: {
                dark: '#F14C4C',
                light: '#D32F2F',
                hc: '#F14C4C'
            },
            description: 'IDEIA status bar background when agent encounters error'
        });

        colors.registerColor({
            id: 'ideia.shell.breadcrumb.agentState',
            defaults: {
                dark: '#569CD6',
                light: '#1565C0',
                hc: '#FFFFFF'
            },
            description: 'IDEIA breadcrumb agent state indicator color'
        });

        colors.registerColor({
            id: 'ideia.shell.titleBar.agentPulse',
            defaults: {
                dark: '#4EC9B0',
                light: '#0D7E6B',
                hc: '#FFFFFF'
            },
            description: 'IDEIA title bar agent pulse indicator color'
        });

        colors.registerColor({
            id: 'ideia.shell.panel.agentOutput',
            defaults: {
                dark: '#1E1E1E',
                light: '#FFFFFF',
                hc: '#000000'
            },
            description: 'IDEIA agent output panel background'
        });

        colors.registerColor({
            id: 'ideia.shell.separator',
            defaults: {
                dark: '#3C3C3C',
                light: '#D4D4D4',
                hc: '#6FC3DF'
            },
            description: 'IDEIA custom shell separator color'
        });
    }
}
```

---

## 14. Conexoes

| Estudo | Conexao com S44 |
|--------|-----------------|
| **S34 (Editor)** | A Main Area do shell gerencia editor groups. Editores sao widgets adicionados ao `MainPanel` via `shell.addWidget({ area: 'main' })`. O shell controla ativacao, fechamento e estado dos editores. |
| **S37 (Search/SCM/Task)** | Search, SCM e Task views sao widgets registrados nas sidebars (left area). Usam `SidePanelHandler` para gerenciamento de visibilidade e ativacao. |
| **S38 (Editor Intelligence)** | Recursos de inteligencia do editor (code actions, hover, completions) aparecem como decorators no `TabBar` e interagem com o shell para exibir hover providers. |
| **S39 (Themes/Keybindings)** | O Theme System registra cores para todas as areas do shell (Secao 12). Keybindings controlam navegacao entre areas (Ctrl+B, Ctrl+J, etc.). |
| **S40 (WebView/Layout)** | WebViews sao widgets que ocupam areas do shell. Custom editors e webview views sao gerenciados pelo `ApplicationShell` como widgets normais. |
| **S41 (Remote/Web IDE)** | No Theia Cloud, o shell gerencia sessao remota com lazy loading de widgets e reconnect state. O estado do layout e sincronizado com o servidor. |
| **S42 (DI/Inversify)** | `ApplicationShell`, `SidePanelHandler`, `StatusBarImpl` e `ActivityBar` sao injetados via Inversify DI. Factories (`CustomTitleWidgetFactory`) seguem padrao de DI. |
| **S43 (Views)** | O sistema de views (ViewContainer, ViewPart) e construido sobre o shell. Views sao criadas por `WidgetFactory` e adicionadas ao shell via `addWidget`. |
| **S46 (Problem/Output)** | Problems e Output views sao widgets no `BottomPanel`. O BottomPanelHandler gerencia sua exibicao, maximizacao e ciclo de vida. |
| **TitleBar Study** | A title bar customizada do Electron e parte do shell (Secao 11). `CustomTitleWidget` e `WindowControls` sao componentes do `ElectronApplicationShell`. |
| **Terminal/Debug Study** | Terminal e Debug Console sao widgets no bottom panel. DAP interage com o shell para mostrar debug views nas sidebars (Variables, Watch, Call Stack). |

---

## 15. Plano de Implementacao

### Fase 1 — Shell Core (2-3 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| S44-T1 | Subclassificar ApplicationShell para IDEIA, estendendo com eventos customizados e estado de agente | 4h |
| S44-T2 | Implementar SidePanelHandler customizado com suporte a tracking de views IDEIA | 6h |
| S44-T3 | Estender BottomPanelHandler com maximization animada e estado de painel persistente | 4h |
| S44-T4 | Implementar LayoutPersistenceService com debounced save e versioning | 6h |

### Fase 2 — Status Bar & Activity Bar (2 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| S44-T5 | Registrar entradas de status bar IDEIA (agent, autonomy, quality, task, cost) | 4h |
| S44-T6 | Implementar atualizacao dinamica de entradas via EventBus | 3h |
| S44-T7 | Adicionar items customizados na activity bar (IDEIA agent, memory, quality) | 4h |
| S44-T8 | Implementar badge system para activity bar items com eventos | 3h |

### Fase 3 — Breadcrumbs & Title Bar (2 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| S44-T9 | Criar BreadcrumbContribution IDEIA com indicador de estado do agente | 3h |
| S44-T10 | Implementar navegacao de breadcrumb com historia de contexto | 4h |
| S44-T11 | Customizar title bar com branding IDEIA, agent pulse e quick actions | 6h |
| S44-T12 | Implementar title bar context menu com acoes IDEIA | 2h |

### Fase 4 — Theme Integration & Shell Colors (1-2 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| S44-T13 | Registrar tokens de cor customizados para areas do shell IDEIA | 3h |
| S44-T14 | Implementar theme change propagation para todos os shell widgets IDEIA | 4h |
| S44-T15 | Criar CSS custom properties para areas do shell com fallbacks | 3h |
| S44-T16 | Implementar dynamic theme switching em componentes React/Theia | 3h |

### Fase 5 — Testes & Integracao (2 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| S44-T17 | Testes unitarios para ShellLayoutSerializer | 4h |
| S44-T18 | Testes para LayoutPersistenceService (save, restore, migrate) | 4h |
| S44-T19 | Testes de integracao: sidebar, bottom panel, status bar entries | 6h |
| S44-T20 | Testes de tema: troca dinamica de cores, propagacao para areas do shell | 3h |
| S44-T21 | Documentacao: layout state schema, eventos do shell, tutoriais de extensao | 4h |

**Total estimado:** 10-12 dias / ~72-84 horas

### Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| Quebra de compatibilidade com layout state de versoes anteriores do Theia | Alto | Implementar migracao de layout com fallback para valores default |
| Performance com muitos widgets registrados no shell | Medio | Lazy loading de widgets, virtual scrolling em listas grandes |
| Conflito de comandos com extensoes existentes | Medio | Prefixar comandos IDEIA com `ideia.*` e registrar com when clauses |
| Custom title bar quebra em atualizacao do Electron | Alto | Testar em CI matrix (Electron 28, 29, 30) |
| Layout corrompido apos crash | Alto | Auto-save periodico + backup do ultimo layout valido |

---

> **Fim do ESTUDO S44 — Theia Application Shell, Layout & UI Shell Architecture**
> Proximo: ESTUDO S45 — Theia Keybinding System & When Clauses
