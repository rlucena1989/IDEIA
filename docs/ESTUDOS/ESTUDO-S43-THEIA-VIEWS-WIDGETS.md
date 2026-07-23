# ESTUDO S43 — Theia View System & Custom Widgets

> **Arquitetura de views, widgets, view containers, tree views, webview views e custom widgets na plataforma Theia**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — View container system, widget lifecycle, tree widget, webview widget, contributions, factories, patterns |

---

## Sumario

1. [Introducao](#1-introducao)
2. [View Container System](#2-view-container-system)
3. [Widget as View](#3-widget-as-view)
4. [React-based Widgets](#4-react-based-widgets)
5. [Tree View Widget](#5-tree-view-widget)
6. [Webview Views](#6-webview-views)
7. [View Contribution](#7-view-contribution)
8. [Widget Manager & Factory](#8-widget-manager--factory)
9. [Progress & Activity Indicators](#9-progress--activity-indicators)
10. [Custom Widget Patterns](#10-custom-widget-patterns)
11. [Code Examples](#11-code-examples)
12. [Conexoes](#12-conexoes)
13. [Plano de Implementacao](#13-plano-de-implementacao)

---

## 1. Introducao

### 1.1 The View System como Mecanismo Primario de Extensao de UI

No Theia, todo elemento visivel na interface do usuario e um **widget**. Views sao widgets especializados que habitam regioes especificas do shell (sidebar, panel, editor area). O sistema de views do Theia e o mecanismo principal pelo qual extensoes contribuem com superficies de interacao para o usuario.

```
  +------------------------------------------------------------------+
  |  SHELL (ApplicationShell)                                         |
  |  +----------+  +-------------+  +-------------+  +----------+     |
  |  | LEFT     |  | LEFT        |  | MAIN AREA   |  | RIGHT    |     |
  |  | TOOLBAR  |  | SIDEBAR     |  | (Editor     |  | SIDEBAR  |     |
  |  |          |  |             |  |  Tabs)      |  |          |     |
  |  | icons    |  | +---------+ |  |             |  | +------+ |     |
  |  |          |  | | Explorer| |  | +---------+ |  | |Outline| |     |
  |  |          |  | | Search  | |  | |file.ts  | |  | |       | |     |
  |  |          |  | | SCM     | |  | +---------+ |  | +------+ |     |
  |  |          |  | +---------+ |  |             |  |          |     |
  |  +----------+  +-------------+  +-------------+  +----------+     |
  +------------------------------------------------------------------+
  |  BOTTOM PANEL                                                     |
  |  +---------+  +----------+  +---------+  +---------+              |
  |  |Terminal |  | Problems |  | Output  |  | Debug   |              |
  |  +---------+  +----------+  +---------+  +---------+              |
  +------------------------------------------------------------------+
  |  STATUS BAR                                                        |
  |  +------------+  +--------+  +-------+  +---------------------+   |
  |  | cursor ln  |  | branch |  | lang  |  | notifications bell  |   |
  |  +------------+  +--------+  +-------+  +---------------------+   |
  +------------------------------------------------------------------+
```

### 1.2 Tipos de View

| Tipo | Container | Exemplos | Comportamento |
|------|-----------|----------|---------------|
| Sidebar view | Sidebar panel | Explorer, Search, SCM | Tab-based, uma view ativa por vez, pode ser fechada ou movida |
| Bottom panel view | Bottom panel | Terminal, Problems, Output | Tab-based, altura redimensionavel, multiplas views simultaneas |
| Editor area widget | Main area | Editor tabs, custom editors | Tab-based, dragging entre grupos, preview mode |
| Webview view | Sidebar ou panel | Webview-based views | HTML/JS isolado em iframe, comunicacao via postMessage |

### 1.3 View Lifecycle

Cada view segue este ciclo de vida:

```
  REGISTRATION                     CREATION                       ACTIVATION
  +------------+                  +----------+                   +----------+
  | Contribui  | -- factory -->   | Widget   | -- onActivate --> | View     |
  | via        |    resolve       | Instance |    (lazy)         | rendered |
  | ViewContr. |                  |          |                   | visible  |
  +------------+                  +----------+                   +----------+
                                         |                            |
                                         v                            v
                                   +----------+                   +----------+
                                   | storeSt  |                   | onClose  |
                                   | ate()    |                   | (cleanup)|
                                   | (serial) |                   | dispose  |
                                   +----------+                   +----------+
```

### 1.4 Principios Arquiteturais

| Principio | Descricao |
|-----------|-----------|
| Widget-based | Toda peca de UI e um `BaseWidget` do pacote `@theia/core/lib/browser` |
| Lazy instantiation | Views sao criadas sob demanda pela primeira vez que sao abertas |
| Serialization | Estado do widget e serializado via `storeState()`/`restoreState()` para persistencia |
| DI-driven | Widgets sao injetados via Inversify, nunca instanciados diretamente |
| Message-passing | Webview views comunicam-se exclusivamente via `postMessage` |
| Part system | Cada regiao da shell e uma `ViewContainerPart` com layout proprio |

---

## 2. View Container System

### 2.1 ViewContainer

`ViewContainer` e a classe base para areas que contem multiplas views em abas. No Theia, tanto a sidebar esquerda quanto o painel inferior sao `ViewContainer` instances.

```
  ViewContainer
  +------------------------------------------------------------------+
  |  TabBar: [ Explorer | Search | SCM | ... ] <trackline>           |
  |  +------------------------------------------------------------+  |
  |  | ViewContainerPart                                           |  |
  |  |  +------------------------------------------------------+  |  |
  |  |  | Widget content (explorer tree, search input, etc)     |  |  |
  |  |  +------------------------------------------------------+  |  |
  |  +------------------------------------------------------------+  |
  +------------------------------------------------------------------+
```

**Interfaces chave:**

```typescript
import { ViewContainer } from '@theia/core/lib/browser/view-container';

// ViewContainer herda de SplitPanel e gerencia uma colecao de ViewContainerParts
// Cada part contem um widget e gerencia seu titulo, icone, indicadores

interface ViewContainerOptions {
  disableDraggingToOtherContainers?: boolean;
  disableDroppingFromOtherContainers?: boolean;
}
```

### 2.2 ViewContainerPart

`ViewContainerPart` e o wrapper que envolve cada widget dentro de um `ViewContainer`. Ele gerencia:

- **Toolbar** — acoes especificas da view (refresh, collapse, filter)
- **Badge** — contagem numerica (ex: "3 problemas")
- **Progress** — barra de progresso indeterminada/determinada
- **Title** — label, iconClass, caption
- **Collapse/Expand** — toggle via clique no cabecalho
- **Context menu** — opcoes de posicao e visibilidade

```typescript
import { ViewContainerPart } from '@theia/core/lib/browser/view-container';

// PartTitle — titulo com icone e badge
interface PartTitle {
  label: string;
  iconClass?: string;
  caption?: string;
  badge?: number;
}

// ViewContainerPart expoe:
// - part.title: PartTitle
// - part.setBadge(count: number): void
// - part.setProgress(show: boolean): void
// - part.collapsed: boolean
// - part.setCollapsed(collapsed: boolean): void
```

### 2.3 View Registration

Views sao registradas no `ViewContainer` atraves de contribuicoes. O mecanismo primario e a interface `ViewContribution` que define como uma view e criada e registrada.

```typescript
import { ViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { ViewContainerIdentifier } from '@theia/core/lib/browser/view-container';

// Registro programatico
interface ViewContainerIdentifier {
  id: string;
  name: string;
  iconClass?: string;
  order?: number;
  // Se omitido, usa 'left' default
  area?: 'left' | 'right' | 'bottom';
}
```

### 2.4 View Visibility

Visibilidade de views e controlada por:

| Mecanismo | API | Descricao |
|-----------|-----|-----------|
| Tab toggle | `viewContainer.activateView(viewId)` | Ativa view na aba, torna visivel |
| Close | `viewContainerPart.close()` | Remove a part do container |
| Collapse | `viewContainerPart.collapsed = true` | Recolhe sem fechar |
| Reveal | `shell.revealWidget(widgetId)` | Garante que widget esteja visivel no container |
| Open view command | `commands.executeCommand('workbench.view.explorer')` | Abre view com toggle |

```typescript
import { ApplicationShell } from '@theia/core/lib/browser/shell/application-shell';

// Abrir/revelar uma view
@inject(ApplicationShell)
protected shell: ApplicationShell;

async openMyView(): Promise<void> {
  const widget = await this.widgetManager.getOrCreateWidget('my-view-id');
  await this.shell.addWidget(widget, { area: 'left', rank: 500 });
  this.shell.activateWidget(widget.id);
}
```

### 2.5 View Ordering

Views sao ordenadas dentro do container por `rank` (numerico). Quanto menor o rank, mais a esquerda (ou mais ao topo) a view aparece.

```typescript
// Shell.addWidget options
interface AddWidgetOptions {
  area: 'left' | 'right' | 'bottom' | 'main';
  rank?: number;         // Ordenacao: quanto menor, mais a esquerda
  closureZone?: string;  // Zona de fechamento (sidebar vs panel)
}

// Exemplo: colocar view com rank entre Explorer (100) e Search (200)
await this.shell.addWidget(widget, {
  area: 'left',
  rank: 150
});
```

### 2.6 Collapse/Expand

Views dentro de containers podem ser colapsadas (recolhidas) para economizar espaco.

```typescript
// Colapsar/expandir via API
const part = this.viewContainer.getPartFor(widget);
if (part) {
  part.collapsed = true;    // Recolhe
  part.collapsed = false;   // Expande
}

// O Shell gerencia o toggle automaticamente quando usuario clica no cabecalho da part
// Se a view ja esta ativa, clicar recolhe; se esta recolhida, clicar expande
```

### 2.7 View Badge

Badges sao indicadores numericos ou visuais sobrepostos ao titulo da view. Comuns para mostrar contagens de problemas, resultados de busca, etc.

```typescript
import { ViewContainerPart } from '@theia/core/lib/browser/view-container';

// Definir badge em uma part existente
function updateBadge(widget: Widget, count: number): void {
  const part = ViewContainerPart.get(widget);
  if (part) {
    if (count > 0) {
      part.badge = count;
      part.badgeTooltip = `${count} items`;
    } else {
      part.badge = undefined;
    }
  }
}

// Observar mudancas de badge
widget.onDidChangeBadge?.((badge: number | undefined) => {
  // Atualiza icon do activity bar / tab
});
```

### 2.8 Progress Indicators

View containers suportam indicadores de progresso no cabecalho da part.

```typescript
import { ViewContainerPart } from '@theia/core/lib/browser/view-container';

// Ativar/desativar progresso
const part = ViewContainerPart.get(widget);
if (part) {
  part.setProgress(true);   // Mostra spinner indeterminado
  // ... apos operacao
  part.setProgress(false);  // Oculta spinner
}
```

---

## 3. Widget as View

### 3.1 BaseWidget

Toda view no Theia e um `Widget` (do `@phosphor/widgets`) ou sua subclasse `BaseWidget` (do `@theia/core`). `BaseWidget` adiciona gerenciamento de dispose, mensagens e integracao com o DI container.

```typescript
import { BaseWidget } from '@theia/core/lib/browser/widgets/widget';
import { Message } from '@phosphor/messaging';

// Estrutura minima de um widget
export class MyWidget extends BaseWidget {
  static ID = 'my-widget-id';
  static LABEL = 'My Widget';

  // Toda view precisa de um ID unico e um titulo
  constructor() {
    super();
    this.id = MyWidget.ID;
    this.title.label = MyWidget.LABEL;
    this.title.caption = 'Description of my widget';
    this.title.iconClass = 'fa fa-cog';  // ou classe CSS customizada
    this.title.closable = true;
  }
}
```

### 3.2 Widget Title

O titulo do widget controla como ele aparece em tabs, headers e no activity bar.

```typescript
import { Title } from '@phosphor/widgets';

// Propriedades do Title
interface TitleConfig {
  label: string;       // Texto exibido na tab
  caption: string;     // Tooltip
  iconClass?: string;  // Classe CSS para icone (ex: 'fa fa-file', 'theia-file-icon')
  closable: boolean;   // Se pode ser fechado pelo usuario
  className?: string;  // Classe CSS adicional na tab
  icon?: HTMLElement;  // Elemento HTML customizado como icone
}

// Exemplo
this.title.label = 'Problems';
this.title.caption = 'Problems Panel';
this.title.iconClass = 'theia-problems-icon';
this.title.closable = false;  // Views principais nao sao fechaveis
```

### 3.3 Widget State Management

Widgets podem serializar e restaurar seu estado entre sessoes do IDE. Isso e feito via metodos `storeState()` e `restoreState()`.

```typescript
import { BaseWidget } from '@theia/core/lib/browser/widgets/widget';

interface MyWidgetState {
  filterText: string;
  expandedNodes: string[];
  scrollPosition: number;
}

export class MyWidget extends BaseWidget {
  protected filterText = '';
  protected expandedNodes: string[] = [];
  protected scrollPosition = 0;

  // Serializacao: retorna objeto serializavel para JSON
  storeState(): MyWidgetState {
    return {
      filterText: this.filterText,
      expandedNodes: this.expandedNodes,
      scrollPosition: this.scrollPosition,
    };
  }

  // Restauracao: recebe estado previamente armazenado
  restoreState(oldState: MyWidgetState): void {
    this.filterText = oldState.filterText;
    this.expandedNodes = oldState.expandedNodes;
    this.scrollPosition = oldState.scrollPosition;
    this.applyState();
  }

  protected applyState(): void {
    // Atualiza UI a partir do estado restaurado
  }
}
```

### 3.4 Widget Serialization Flow

```
  APPLICATION SHUTDOWN                   APPLICATION STARTUP
  +---------------+                      +------------------+
  | Widget        |                      | WidgetManager    |
  | storeState()  |  --- JSON --->       | getOrCreate()    |
  |               |                      |                  |
  | Salva no      |                      | Cria widget      |
  | storage       |                      | vazio            |
  | (localStorage)|                      |                  |
  +---------------+                      | restoreState()  |
                                         | (se existir)     |
                                         +------------------+
```

### 3.5 Widget Lifecycle Hooks

```typescript
import { BaseWidget } from '@theia/core/lib/browser/widgets/widget';
import { Message, MessageLoop } from '@phosphor/messaging';

export class MyWidget extends BaseWidget {
  // Chamado quando widget e anexado ao DOM
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    // Configurar listeners de DOM, renderizar conteudo inicial
    this.node.innerHTML = '<div>My content</div>';
  }

  // Chamado quando widget e ativado (torna-se visivel e focado)
  protected onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);
    this.node.focus();
    // Atualizar dados, iniciar polling, etc
  }

  // Chamado quando widget e redimensionado
  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);
    // Ajustar layout interno ao novo tamanho
    const { width, height } = msg;
    this.updateLayout(width, height);
  }

  // Chamado antes do widget ser fechado
  protected onCloseRequest(msg: Message): void {
    // Cleanup: timers, subscriptions, listeners
    this.dispose();
    super.onCloseRequest(msg);
  }

  // Chamado quando widget e destacado do DOM
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    // Remover listeners de DOM
  }
}
```

### 3.6 Panel, SplitPanel, DockPanel

Widgets podem compor layouts aninhados usando os panels do Phosphor.

```typescript
import { Panel, SplitPanel, DockPanel } from '@phosphor/widgets';

// Panel — layout vertical simples
const panel = new Panel();
panel.addWidget(widgetA);
panel.addWidget(widgetB);

// SplitPanel — divisao redimensionavel
const splitPanel = new SplitPanel();
splitPanel.addWidget(leftWidget);
splitPanel.addWidget(rightWidget);
SplitPanel.setStretch(leftWidget, 1);  // Proporcao de estiramento
SplitPanel.setStretch(rightWidget, 2);

// DockPanel — area com abas e dragging
const dockPanel = new DockPanel();
dockPanel.addWidget(widgetA, { mode: 'split-right', ref: widgetB });
```

No Theia, `SplitPanel` e usado extensivamente no layout da shell (sidebar split, editor groups, bottom panel).

---

## 4. React-based Widgets

### 4.1 ReactWidget

`ReactWidget` e a classe base fornecida pelo Theia para criar widgets que renderizam conteudo React. Ela estende `BaseWidget` e integra o ciclo de vida do React com o do Theia.

```typescript
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';

export class MyReactWidget extends ReactWidget {
  static ID = 'my-react-widget';
  static LABEL = 'My React Widget';

  constructor() {
    super();
    this.id = MyReactWidget.ID;
    this.title.label = MyReactWidget.LABEL;
    this.title.closable = true;
  }

  // Unico metodo obrigatorio: retorna ReactNode
  protected render(): React.ReactNode {
    return React.createElement('div', { className: 'my-widget' },
      React.createElement('h3', null, 'Hello from React'),
      React.createElement('p', null, 'This is rendered via ReactWidget'),
    );
  }
}
```

### 4.2 State Synchronization Pattern

Como `ReactWidget.render()` e chamado internamente, o padrao para atualizar o React e via `forceUpdate()` ou `update()` (herdado de Widget).

```typescript
export class CounterWidget extends ReactWidget {
  static ID = 'counter-widget';
  protected count = 0;

  constructor() {
    super();
    this.id = CounterWidget.ID;
    this.title.label = 'Counter';
    this.addClass('counter-widget');
  }

  // Dispara re-renderizacao
  increment(): void {
    this.count++;
    this.update();    // Sinaliza que precisa re-renderizar
    // Alternativa: super.node.innerHTML = ''; this.update();
  }

  protected render(): React.ReactNode {
    return React.createElement('div', { className: 'counter-container' },
      React.createElement('span', { className: 'counter-value' }, `Count: ${this.count}`),
      React.createElement('button', {
        className: 'theia-button',
        onClick: () => this.increment()
      }, 'Increment'),
    );
  }
}
```

### 4.3 React Component Integration

Para widgets mais complexos, componentes React separados sao preferiveis.

```typescript
// widget/my-dashboard-widget.tsx
import * as React from 'react';
import { injectable, postConstruct } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';

// Componente React separado
interface DashboardProps {
  tasks: Task[];
  onTaskSelect: (taskId: string) => void;
}

const DashboardComponent: React.FC<DashboardProps> = ({ tasks, onTaskSelect }) => {
  return React.createElement('div', { className: 'dashboard' },
    React.createElement('h2', null, 'Tasks'),
    React.createElement('ul', { className: 'task-list' },
      tasks.map(task =>
        React.createElement('li', {
          key: task.id,
          className: 'task-item',
          onClick: () => onTaskSelect(task.id)
        }, task.name)
      )
    )
  );
};

@injectable()
export class DashboardWidget extends ReactWidget {
  static ID = 'dashboard-widget';
  static LABEL = 'Dashboard';

  private tasks: Task[] = [];

  @postConstruct()
  protected init(): void {
    this.id = DashboardWidget.ID;
    this.title.label = DashboardWidget.LABEL;
    this.title.iconClass = 'dashboard-icon';
    this.title.closable = true;
    this.loadTasks();
  }

  async loadTasks(): Promise<void> {
    this.tasks = await this.fetchTasks();
    this.update();
  }

  private handleTaskSelect(taskId: string): void {
    // Handle task selection
  }

  protected render(): React.ReactNode {
    return React.createElement(DashboardComponent, {
      tasks: this.tasks,
      onTaskSelect: (id: string) => this.handleTaskSelect(id)
    });
  }

  private async fetchTasks(): Promise<Task[]> {
    // Simulated fetch
    return [{ id: '1', name: 'Task 1' }];
  }
}
```

### 4.4 ReactWidget com JSX (TSX)

Embora o codigo acima use `React.createElement`, o Theia suporta TSX desde que configurado no `tsconfig.json`.

```typescript
// Alternativa com TSX (arquivo .tsx)
// Necessario: "jsx": "react" ou "jsx": "react-jsx" no tsconfig

export class MyTSXWidget extends ReactWidget {
  static ID = 'tsx-widget';
  protected data: string[] = [];

  protected render(): React.ReactNode {
    return (
      <div className='tsx-widget'>
        <h3>TSX Widget</h3>
        <ul>
          {this.data.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }
}
```

### 4.5 React vs Theia Event System Bridging

Eventos do Theia (shell, widgets, commands) precisam ser traduzidos para o mundo React. O padrao e usar subscriptions no `onAfterAttach` e limpar no `onBeforeDetach`.

```typescript
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { ApplicationShell } from '@theia/core/lib/browser/shell/application-shell';

export class BridgedWidget extends ReactWidget {
  @inject(ApplicationShell)
  protected shell: ApplicationShell;

  protected toDispose = new DisposableCollection();
  protected activeEditor: string | undefined;

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);

    // Bridge: Theia event -> React state
    this.toDispose.push(
      this.shell.onDidChangeCurrentWidget(({ newValue }) => {
        this.activeEditor = newValue?.id;
        this.update(); // Re-renderiza React
      })
    );
  }

  protected onBeforeDetach(msg: Message): void {
    this.toDispose.dispose();
    super.onBeforeDetach(msg);
  }

  protected render(): React.ReactNode {
    return React.createElement('div', null,
      React.createElement('p', null, `Active editor: ${this.activeEditor ?? 'none'}`)
    );
  }
}
```

### 4.6 Messaging Service para React<->Theia

Para comunicacao bidirecional entre componentes React e servicos Theia, use `MessageService` ou um servico injetado.

```typescript
import { MessageService } from '@theia/core/lib/common/message-service';

@injectable()
export class MessageAwareWidget extends ReactWidget {
  @inject(MessageService)
  protected msgService: MessageService;

  protected async handleAction(): Promise<void> {
    // Theia mostra notificacao
    await this.msgService.info('Action completed', { timeout: 3000 });

    // Pergunta ao usuario
    const result = await this.msgService.question('Confirm?', [
      { title: 'Yes', value: 'yes' },
      { title: 'No', value: 'no' }
    ]);
  }

  protected render(): React.ReactNode {
    return React.createElement('button', {
      className: 'theia-button primary',
      onClick: () => this.handleAction()
    }, 'Show Message');
  }
}
```

---

## 5. Tree View Widget

### 5.1 TreeWidget

`TreeWidget` e a classe base para criar views de arvore no Theia. Usada internamente pelo Explorer, Outline, SCM, Debug e Problems. Ela fornece rendering virtualizado, navegacao por teclado, expansao/colapso, selecao e context menu.

```typescript
import { TreeWidget } from '@theia/core/lib/browser/tree/tree-widget';
import { TreeModel } from '@theia/core/lib/browser/tree/tree-model';
import { TreeNode, CompositeTreeNode, SelectableTreeNode } from '@theia/core/lib/browser/tree/tree';

@injectable()
export class MyTreeViewWidget extends TreeWidget {
  static ID = 'my-tree-view';
  static LABEL = 'My Tree';

  constructor(
    @inject(TreeModel) readonly model: TreeModel,
    @inject(ContextMenuRenderer) protected contextMenuRenderer: ContextMenuRenderer,
  ) {
    super(model, contextMenuRenderer);
    this.id = MyTreeViewWidget.ID;
    this.title.label = MyTreeViewWidget.LABEL;
    this.title.iconClass = 'my-tree-icon';
  }
}
```

### 5.2 Tree Model and Nodes

A arvore e baseada em tres tipos principais de no:

```typescript
import {
  TreeNode,
  CompositeTreeNode,
  SelectableTreeNode,
  TreeDecoration,
} from '@theia/core/lib/browser/tree/tree';

// No raiz da arvore
interface RootNode extends CompositeTreeNode {
  id: 'root';
  parent: undefined;
  children: (FolderNode | FileNode)[];
  visible: true;
}

// No com filhos (pasta)
interface FolderNode extends CompositeTreeNode, SelectableTreeNode {
  id: string;
  parent: RootNode | FolderNode;
  name: string;
  expanded: boolean;
  children: (FolderNode | FileNode)[];
  selected: false;
  // Permite decoracoes visuais
  decorationData?: TreeDecoration.Data;
}

// No folha (arquivo)
interface FileNode extends TreeNode, SelectableTreeNode {
  id: string;
  parent: FolderNode;
  name: string;
  selected: false;
}
```

### 5.3 Tree Node Rendering

Cada tipo de no pode ter um template de rendering customizado.

```typescript
import { TreeWidget, TreeNodeProps } from '@theia/core/lib/browser/tree/tree-widget';

export class CustomTreeWidget extends TreeWidget {
  // Customizar rendering de nos
  protected renderTreeNode(node: TreeNode, props: TreeNodeProps): React.ReactNode {
    if (CompositeTreeNode.is(node)) {
      return React.createElement('div', {
        className: 'custom-folder-node',
        onContextMenu: (e) => this.handleContextMenu(e, node)
      },
        React.createElement('span', { className: 'folder-icon' }),
        React.createElement('span', { className: 'node-name' }, node.name),
      );
    }
    return React.createElement('div', {
      className: 'custom-file-node',
    },
      React.createElement('span', { className: 'file-icon', 'data-icon': this.getFileIcon(node) }),
      React.createElement('span', { className: 'node-name' }, node.name),
      React.createElement('span', { className: 'node-description' }, node.description ?? ''),
    );
  }

  private getFileIcon(node: TreeNode): string {
    // Logic for file type icon
    return 'file';
  }
}
```

### 5.4 Tree Expansion State

```typescript
// Expandir/recolher nos programaticamente
import { CompositeTreeNode } from '@theia/core/lib/browser/tree/tree';

async function expandAll(model: TreeModel, node: CompositeTreeNode): Promise<void> {
  // Expande o no atual
  if (!model.expansionService.isExpanded(node)) {
    await model.expansionService.expandNode(node);
  }

  // Expande recursivamente os filhos
  for (const child of node.children) {
    if (CompositeTreeNode.is(child)) {
      await expandAll(model, child);
    }
  }
}

// Salvar estado de expansao
function saveExpansionState(model: TreeModel): string[] {
  const expanded: string[] = [];
  model.expansionService.traverseExpanded((node) => {
    expanded.push(node.id);
  });
  return expanded;
}

function restoreExpansionState(model: TreeModel, expanded: string[]): void {
  for (const id of expanded) {
    const node = model.getNode(id);
    if (node && CompositeTreeNode.is(node)) {
      model.expansionService.expandNode(node);
    }
  }
}
```

### 5.5 Tree Selection

```typescript
import { TreeModel } from '@theia/core/lib/browser/tree/tree-model';
import { SelectableTreeNode } from '@theia/core/lib/browser/tree/tree';

// Listen to selection changes
model.onSelectionChanged((selectedNodes: ReadonlyArray<SelectableTreeNode>) => {
  for (const node of selectedNodes) {
    console.log(`Selected: ${node.id}`);
  }
});

// Get current selection
const selection = model.selectedNodes;
if (selection.length > 0) {
  const first = selection[0];
  // Act on selection
}

// Set selection programmatically
model.selectNode(node);
```

### 5.6 Tree Context Menu

```typescript
import { MenuPath } from '@theia/core/lib/common/menu';
import { ContextMenuRenderer } from '@theia/core/lib/browser/context-menu-renderer';

export class ContextMenuTreeWidget extends TreeWidget {
  protected readonly contextMenuPath: MenuPath = ['my-context-menu'];

  // Handler de context menu
  protected handleContextMenuEvent(event: MouseEvent): void {
    const nodeId = this.getNodeFromEvent(event);
    if (nodeId) {
      const node = this.model.getNode(nodeId);
      if (node) {
        this.contextMenuRenderer.render({
          menuPath: this.contextMenuPath,
          anchor: event,
          args: [node],
        });
      }
    }
    event.preventDefault();
  }

  // Registrar o handler
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('contextmenu', (e) => this.handleContextMenuEvent(e));
  }
}
```

### 5.7 Tree Drag and Drop

```typescript
import { TreeDragService } from '@theia/core/lib/browser/tree/tree-drag-service';
import { TreeNode } from '@theia/core/lib/browser/tree/tree';

export class DraggableTreeWidget extends TreeWidget {
  @inject(TreeDragService)
  protected dragService: TreeDragService;

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.setAttribute('draggable', 'true');
    this.node.addEventListener('dragstart', (e) => this.onDragStart(e));
    this.node.addEventListener('dragover', (e) => this.onDragOver(e));
    this.node.addEventListener('drop', (e) => this.onDrop(e));
  }

  protected onDragStart(event: DragEvent): void {
    const nodeId = this.getNodeFromEvent(event);
    if (nodeId) {
      event.dataTransfer?.setData('text/plain', nodeId);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  protected onDrop(event: DragEvent): void {
    const sourceId = event.dataTransfer?.getData('text/plain');
    const targetId = this.getNodeFromEvent(event);
    if (sourceId && targetId && sourceId !== targetId) {
      // Handle drop: move node
      this.model.moveNode(sourceId, targetId);
    }
  }
}
```

### 5.8 Tree Search/Filter

```typescript
export class FilterableTreeWidget extends TreeWidget {
  protected filterText = '';

  // Aplicar filtro na arvore
  setFilter(text: string): void {
    this.filterText = text.toLowerCase();
    this.model.root = this.filterTree(this.model.root as CompositeTreeNode);
    this.update();
  }

  private filterTree(node: CompositeTreeNode): CompositeTreeNode {
    const filteredChildren = node.children.filter(child => {
      if (CompositeTreeNode.is(child)) {
        const filtered = this.filterTree(child);
        return filtered.children.length > 0 || child.name.toLowerCase().includes(this.filterText);
      }
      return child.name.toLowerCase().includes(this.filterText);
    });

    return {
      ...node,
      children: filteredChildren,
    };
  }

  protected renderTreeRow(node: TreeNode): React.ReactNode {
    // Highlight matching text
    const name = node.name;
    if (this.filterText && name.toLowerCase().includes(this.filterText)) {
      const parts = name.split(new RegExp(`(${this.filterText})`, 'gi'));
      return React.createElement('span', null,
        parts.map((part, i) =>
          part.toLowerCase() === this.filterText
            ? React.createElement('mark', { key: i }, part)
            : part
        )
      );
    }
    return React.createElement('span', null, name);
  }
}
```

### 5.9 Virtualized Tree Rendering

O `TreeWidget` do Theia ja implementa virtualized rendering por padrao (renderiza apenas nos visiveis). Isso e baseado no `react-virtuoso` ou implementacao propria de scrolling virtual.

```typescript
// O TreeWidget gerencia a virtualizacao automaticamente:
// - Apenas nos visiveis no viewport sao renderizados
// - Nos fora do viewport sao substituidos por espacadores (spacers)
// - Scroll e mantido via `scrollToNode()` e `revealNode()`

// Revelar um no especifico na arvore
async revealNodeById(treeWidget: TreeWidget, nodeId: string): Promise<void> {
  const node = treeWidget.model.getNode(nodeId);
  if (node) {
    await treeWidget.model.expansionService.expandAll(node);
    treeWidget.revealNode(node);
  }
}

// Calcular altura estimada de nos para virtualizacao
protected getNodeHeight(node: TreeNode, hasChildren: boolean): number {
  return hasChildren ? 24 : 22; // Altura em px
}
```

### 5.10 Tree Decorations

Decoracoes sao marcacoes visuais adicionais nos nos da arvore.

```typescript
import { TreeDecoration } from '@theia/core/lib/browser/tree/tree-decorator';

// Dados de decoracao
interface DecorationData {
  tailDecorations?: TreeDecoration.Decoration[];
  captionDecorations?: TreeDecoration.CaptionAffixedDecoration;
  iconDark?: string;
  iconLight?: string;
  fontData?: TreeDecoration.FontData;
  color?: string; // Cor do label
  backgroundColor?: string;
  priority?: number;
}

// Implementar decorator
@injectable()
export class MyTreeDecorator implements TreeDecorator {
  readonly id = 'my-decorator';

  async decorations(tree: Tree): Promise<Map<string, TreeDecoration.Data>> {
    const result = new Map<string, TreeDecoration.Data>();
    const root = tree.root;
    if (root) {
      this.collectDecorations(root, result);
    }
    return result;
  }

  private collectDecorations(node: TreeNode, result: Map<string, TreeDecoration.Data>): void {
    if (SelectableTreeNode.is(node)) {
      result.set(node.id, {
        tailDecorations: [{
          data: 'WIP',
          fontData: {
            color: 'orange',
            style: 'italic',
          },
          tooltip: 'Work in progress',
        }],
      });
    }
    if (CompositeTreeNode.is(node)) {
      for (const child of node.children) {
        this.collectDecorations(child, result);
      }
    }
  }
}
```

---

## 6. Webview Views

### 6.1 WebviewWidget

`WebviewWidget` permite renderizar conteudo HTML/JS/CSS arbitrario dentro de um iframe isolado. E o equivalente Theia ao `webviewView`/`webviewPanel` do VS Code.

```typescript
import { WebviewWidget } from '@theia/core/lib/browser/webview/webview-widget';
import { WebviewEnvironment } from '@theia/core/lib/browser/webview/webview-environment';

@injectable()
export class MyWebviewWidget extends WebviewWidget {
  static ID = 'my-webview';
  static LABEL = 'My Webview';

  @inject(WebviewEnvironment)
  protected webviewEnv: WebviewEnvironment;

  @postConstruct()
  protected init(): void {
    this.id = MyWebviewWidget.ID;
    this.title.label = MyWebviewWidget.LABEL;

    // Configurar ambiente do webview
    this.setContent({
      html: this.getHtmlContent(),
      options: {
        localResourceRoots: [this.webviewEnv.getResourceRoots()],
        enableScripts: true,
        enableForms: false,
      },
    });
  }

  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    body { font-family: var(--theia-ui-font-family); color: var(--theia-editor-foreground); }
    button { background: var(--theia-button-background); color: var(--theia-button-foreground); border: none; padding: 8px 16px; cursor: pointer; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    // Comunicacao com o host Theia
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'updateData') {
        document.getElementById('app').innerText = JSON.stringify(message.data);
        // Resposta para o host
        vscode.postMessage({ command: 'dataReceived', id: message.id });
      }
    });

    // VS Code API wrapper (Theia fornece este objeto)
    const vscode = acquireVsCodeApi();
    vscode.postMessage({ command: 'ready' });
  </script>
</body>
</html>`;
  }
}
```

### 6.2 Webview Environment Configuration

```typescript
import { WebviewEnvironment } from '@theia/core/lib/browser/webview/webview-environment';

// Configuracao do ambiente webview
interface WebviewOptions {
  localResourceRoots: string[];  // Diretorios permitidos para carregar recursos
  enableScripts: boolean;        // Permite JavaScript no webview
  enableForms: boolean;          // Permite submissao de formularios
  enableCommandUris: boolean;    // Permite command:// URIs
  enableWarnings: boolean;       // Mostra warnings de seguranca
  extendToEditorGroup?: boolean; // Expande para grupo de editor
  retainContextWhenHidden?: boolean; // Preserva estado quando oculto
}

// Criar ambiente
@inject(WebviewEnvironment)
protected webviewEnv: WebviewEnvironment;

const env = this.webviewEnv.create({
  localResourceRoots: [this.workspaceService.getWorkspaceRootUri()?.toString() ?? ''],
  enableScripts: true,
});
```

### 6.3 Content Security Policy

A CSP e imposta automaticamente pelo Theia para prevenir XSS e outros ataques.

```typescript
// CSP padrao aplicada ao webview:
// default-src 'self';
// script-src 'self' 'unsafe-eval';  // (se enableScripts=true)
// style-src 'self' 'unsafe-inline';
// img-src 'self' data:;
// font-src 'self' data:;
// connect-src 'self';
// frame-src 'self';

// Customizar CSP via meta tag no HTML do webview
const html = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 script-src 'unsafe-inline';
                 style-src 'unsafe-inline';
                 img-src 'self' https://trusted-cdn.example.com;">
</head>
<body>
  <!-- conteudo -->
</body>
</html>`;
```

### 6.4 postMessage Protocol

```typescript
// === LADO THEIA (Host) ===
import { WebviewWidget } from '@theia/core/lib/browser/webview/webview-widget';

// Escutar mensagens do webview
this.toDispose.push(
  this.onDidReceiveMessage((message: any) => {
    switch (message.command) {
      case 'ready':
        this.webviewReady = true;
        break;
      case 'dataReceived':
        this.handleDataReceived(message.data);
        break;
      case 'error':
        this.logger.error(`Webview error: ${message.error}`);
        break;
    }
  })
);

// Enviar mensagem para o webview
this.postMessage({
  command: 'updateData',
  data: { items: [1, 2, 3] },
  id: 'req-001',
});

// === LADO WEBVIEW (iframe) ===
// O Theia injeta um objeto `vscode` global (como o VS Code)
// Ou pode-se usar window.parent.postMessage

// Enviar mensagem
vscode.postMessage({ command: 'userAction', payload: 'click' });

// Ou via window.parent (se vscode nao estiver disponivel)
window.parent.postMessage({ command: 'userAction' }, '*');

// Receber mensagem do host
window.addEventListener('message', event => {
  // Validar origem em producao
  const message = event.data;
  // Processar
});
```

### 6.5 Webview Resource Loading

```typescript
import { WebviewResourceService } from '@theia/core/lib/browser/webview/webview-resource-service';
import URI from '@theia/core/lib/common/uri';

@inject(WebviewResourceService)
protected resourceService: WebviewResourceService;

// Converter URI de workspace para URL acessivel no webview
const fileUri = new URI('file:///workspace/assets/data.json');
const webviewUri = this.resourceService.asWebviewUri(fileUri);
// Resultado: 'https://file%2B.vscode-resource.vscode-cdn.net/...'

// Usar no HTML do webview
const html = `<img src="${webviewUri}" alt="Data file">`;
```

### 6.6 Webview View State Persistence

```typescript
export class PersistentWebviewWidget extends WebviewWidget {
  private viewState: any = {};

  storeState(): any {
    return {
      viewState: this.viewState,
      scrollPosition: this.getScrollPosition(),
    };
  }

  restoreState(state: any): void {
    this.viewState = state.viewState ?? {};
    this.scrollTo(state.scrollPosition ?? 0);

    // Enviar estado restaurado para o webview
    this.postMessage({
      command: 'restoreState',
      state: this.viewState,
    });
  }

  private getScrollPosition(): number {
    return 0; // Obter do webview via postMessage roundtrip
  }
}
```

### 6.7 Webview Widget Factory

```typescript
import { WebviewWidgetFactory } from '@theia/core/lib/browser/webview/webview-widget-factory';

@injectable()
export class MyWebviewFactory implements WidgetFactory {
  readonly id = 'my-webview-factory';

  @inject(WebviewWidgetFactory)
  protected webviewFactory: WebviewWidgetFactory;

  async createWidget(options: any): Promise<WebviewWidget> {
    const widget = await this.webviewFactory.createWebview(options);
    widget.title.label = options.label ?? 'Webview';
    widget.setContent({
      html: this.generateHtml(options),
      options: {
        enableScripts: true,
      },
    });
    return widget;
  }

  private generateHtml(options: any): string {
    return `<!DOCTYPE html><html>...</html>`;
  }
}
```

---

## 7. View Contribution

### 7.1 ViewContribution Interface

`ViewContribution` e o mecanismo padrao do Theia para registrar, abrir, fechar e gerenciar views.

```typescript
import { ViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import {
  FrontendApplicationContribution,
  FrontendApplication,
} from '@theia/core/lib/browser/frontend-application';

@injectable()
export class MyViewContribution
  extends ViewContribution
  implements FrontendApplicationContribution
{
  // Configuracao da view
  readonly id = 'my-view';
  readonly label = 'My View';

  @inject(WidgetManager)
  protected widgetManager: WidgetManager;

  @inject(CommandRegistry)
  protected commands: CommandRegistry;

  @inject(MenuModelRegistry)
  protected menus: MenuModelRegistry;

  @inject(KeybindingRegistry)
  protected keybindings: KeybindingRegistry;

  // Registrar comandos, menus e keybindings
  registerCommands(commands: CommandRegistry): void {
    super.registerCommands(commands);
    commands.registerCommand(this.toggleCommand, {
      execute: () => this.toggle(),
    });
  }

  registerMenus(menus: MenuModelRegistry): void {
    super.registerMenus(menus);
    menus.registerMenuAction(ViewMenu.SIDEBAR, {
      commandId: this.toggleCommand.id,
      label: this.label,
      order: '10',
    });
  }

  registerKeybindings(keybindings: KeybindingRegistry): void {
    super.registerKeybindings(keybindings);
    keybindings.registerKeybinding({
      command: this.toggleCommand.id,
      keybinding: 'ctrl+shift+m',
    });
  }
}
```

### 7.2 registerViews Command

Views sao registradas via override do metodo `registerViews`.

```typescript
import { ViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { ViewContainerIdentifier } from '@theia/core/lib/browser/view-container';

@injectable()
export class MyViewContribution extends ViewContribution {
  // Registra a view no container especificado
  registerViews(): ViewContribution.MyView | ViewContribution.MyView[] {
    return {
      id: 'my-view',
      label: 'My View',
      iconClass: 'my-view-icon',
      // Container onde a view aparece
      viewContainerId: 'my-view-container-id',
      // Funcao factory que instancia o widget
      widgetFactory: 'my-widget-factory',
      // Ordem dentro do container
      order: 5,
      // Area: left, right, bottom
      area: 'left',
      // Se toggle fecha a view quando ja esta aberta
      toggleCommandId: 'my-view:toggle',
    };
  }
}
```

### 7.3 View Toggle Command

O comando de toggle permite abrir/fechar a view com o mesmo atalho.

```typescript
@injectable()
export class MyViewContribution extends ViewContribution {
  // O ViewContribution ja fornece toggleCommand e closeCommand automaticamente
  // toggleCommand.id = 'my-view:toggle'
  // closeCommand.id = 'my-view:close'

  // Custom toggle com logica adicional
  async toggleView(): Promise<void> {
    try {
      const widget = await this.widget;
      if (widget && widget.isVisible) {
        // Se ja visivel, recolhe o container
        await this.closeView();
      } else {
        await this.openView({
          activate: true,
          reveal: true,
        });
      }
    } catch (error) {
      console.error('Failed to toggle view', error);
    }
  }

  // Obter instancia do widget (cria se necessario)
  private get widget(): Promise<Widget | undefined> {
    return this.tryGetWidget();
  }

  // Toggle com state check
  registerCommands(commands: CommandRegistry): void {
    commands.registerCommand(this.toggleCommand, {
      execute: () => this.toggleView(),
      isVisible: () => true,
      isEnabled: () => true,
      isToggled: () => {
        const widget = this.tryGetWidgetSync();
        return widget?.isVisible ?? false;
      },
    });
  }
}
```

### 7.4 View Reveal Command

```typescript
// Revelar view e focar
async revealView(): Promise<void> {
  const widget = await this.openView({
    activate: true,   // Foca a view
    reveal: true,     // Garante visivel no container
    side: 'left',     // Abre no lado esquerdo
  });

  // Acoes pos-revelacao
  if (widget instanceof MyWidget) {
    await widget.refresh();
  }
}

// Registrar comando de revelacao
commands.registerCommand({
  id: 'my-view:reveal',
  label: 'Reveal My View',
}, {
  execute: () => this.revealView(),
});
```

### 7.5 Keyboard Shortcut for View

```typescript
registerKeybindings(keybindings: KeybindingRegistry): void {
  keybindings.registerKeybinding({
    command: this.toggleCommand.id,
    keybinding: 'ctrlcmd+shift+1',   // macOS: cmd+shift+1, Windows: ctrl+shift+1
    when: 'editorFocus',             // Contexto: apenas quando editor tem foco
  });

  keybindings.registerKeybinding({
    command: 'my-view:reveal',
    keybinding: 'ctrlcmd+shift+alt+1',
  });
}
```

### 7.6 View Menu Contribution

```typescript
import { ViewMenu } from '@theia/core/lib/browser/view-menu';

registerMenus(menus: MenuModelRegistry): void {
  // Registrar no menu View > Open View
  menus.registerMenuAction(MenuId.VIEW_OPEN_VIEW, {
    commandId: this.toggleCommand.id,
    label: this.label,
    order: '5',
  });

  // Registrar no context menu da view
  menus.registerMenuAction(['my-view-context-menu'], {
    commandId: 'my-view:action1',
    label: 'Action 1',
    order: '0',
  });

  menus.registerMenuAction(['my-view-context-menu'], {
    commandId: 'my-view:action2',
    label: 'Action 2',
    order: '1',
  });
}

// Registrar menu path no module
export default class MyFrontendModule extends ContainerModule {
  constructor() {
    super((bind, unbind, isBound, rebind) => {
      // Registrar path do context menu
      bind(MenuContribution).to(MyViewContribution);
    });
  }
}
```

---

## 8. Widget Manager & Factory

### 8.1 WidgetManager

`WidgetManager` e o servico central que gerencia o ciclo de vida de todos os widgets: criacao, cache, descarte e restauracao.

```typescript
import { WidgetManager } from '@theia/core/lib/browser/widget-manager';

@injectable()
export class MyService {
  @inject(WidgetManager)
  protected widgetManager: WidgetManager;

  async getOrCreateWidget(factoryId: string, options?: any): Promise<Widget> {
    return this.widgetManager.getOrCreateWidget(factoryId, options);
  }

  async getWidget(factoryId: string, options?: any): Promise<Widget | undefined> {
    return this.widgetManager.getWidget(factoryId, options);
  }

  // Listar todos os widgets abertos de uma factory
  getWidgets(factoryId: string): Widget[] {
    return this.widgetManager.getWidgets(factoryId);
  }
}
```

### 8.2 Widget Factory Registration

```typescript
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { injectable, ContainerModule } from 'inversify';

// Implementacao de WidgetFactory
@injectable()
export class MyWidgetFactory implements WidgetFactory {
  readonly id = 'my-widget-factory';

  @inject(MyWidget)
  protected widget: MyWidget;

  async createWidget(options?: any): Promise<MyWidget> {
    const widget = this.widget;
    if (options?.title) {
      widget.title.label = options.title;
    }
    if (options?.state) {
      widget.restoreState(options.state);
    }
    return widget;
  }
}

// Registro no module
export default new ContainerModule((bind) => {
  bind(WidgetFactory).to(MyWidgetFactory).inSingletonScope();
  // Ou inRequestScope() para criar nova instancia a cada requisicao
});
```

### 8.3 Widget Creation Strategy

| Estrategia | Escopo | Uso |
|------------|--------|-----|
| Singleton | Uma instancia para toda aplicacao | Views principais (Explorer, Search) |
| Per-request | Nova instancia a cada `createWidget` | Dialogs, editors de arquivo |
| Cached | Reusa instancia se existir com mesmos options | Webview panels |

```typescript
// Singleton: bind factory inSingletonScope()
bind(WidgetFactory).to(ExplorerWidgetFactory).inSingletonScope();

// Per-request: bind factory inRequestScope()
bind(WidgetFactory).to(EditorWidgetFactory).inRequestScope();

// Com cache: usar WidgetManager.getOrCreateWidget que retorna widget existente
// WidgetManager usa `canCreateOnRestore` e options serialization para decidir
```

### 8.4 Widget Reuse

```typescript
// WidgetManager decide se reusa ou cria baseado em canCreateOnRestore
@injectable()
export class CachedWidgetFactory implements WidgetFactory {
  readonly id = 'cached-widget-factory';

  // Se true, permite recriacao na restauracao
  readonly canCreateOnRestore = true;

  async createWidget(options?: any): Promise<Widget> {
    // WidgetManager verifica se ja existe um widget com mesmos options:
    // 1. Procura em this.widgetManager.getWidgets(this.id)
    // 2. Se encontrar com options equivalentes, retorna existente
    // 3. Senao, cria novo
    const widget = new MyWidget();
    this.configureWidget(widget, options);
    return widget;
  }

  protected configureWidget(widget: MyWidget, options?: any): void {
    if (options?.label) {
      widget.title.label = options.label;
    }
  }
}

// Registro com logica de reuso
bind(WidgetFactory).to(CachedWidgetFactory).inSingletonScope();
```

### 8.5 Widget Options Serialization

```typescript
@injectable()
export class FactoryWithSerialization implements WidgetFactory {
  readonly id = 'serialized-factory';

  async createWidget(options?: any): Promise<Widget> {
    const widget = new MyWidget();
    if (options?.serializedState) {
      widget.restoreState(options.serializedState);
    }
    return widget;
  }

  // Serializar options para persistencia (chamado pelo WidgetManager)
  serializeOptions(options?: any): string {
    if (options?.serializedState) {
      return JSON.stringify(options.serializedState);
    }
    return '';
  }

  // Desserializar options (chamado na restauracao)
  deserializeOptions(value: string): any {
    try {
      return { serializedState: JSON.parse(value) };
    } catch {
      return undefined;
    }
  }
}
```

### 8.6 Widget Restoration on Application Restart

```
  RESTART FLOW:
  +-----------------+     +-------------------+     +-------------------+
  | Application     | --> | WidgetManager     | --> | Factory           |
  | Shell.initialize|     | restore()         |     | createWidget()    |
  +-----------------+     +-------------------+     +-------------------+
                                  |
                                  v
                          +-------------------+
                          | Serialized state  |
                          | from Storage      |
                          | (localStorage/FS) |
                          +-------------------+
                                  |
                                  v
                          +-------------------+
                          | Widget            |
                          | restoreState()    |
                          +-------------------+

  Stored format (no localStorage):
  {
    "widgets": {
      "my-view": {
        "constructorOptions": { "label": "My View" },
        "state": { "filterText": "", "expandedNodes": [] },
        "factoryId": "my-widget-factory"
      }
    },
    "layout": {
      "leftPanel": { "activeView": "my-view", "views": ["explorer", "my-view"] }
    }
  }
```

---

## 9. Progress & Activity Indicators

### 9.1 ProgressBar

```typescript
import { ProgressBar } from '@theia/core/lib/browser/progress-bar';
import { Widget } from '@phosphor/widgets';

// Criar barra de progresso associada a um widget
const progressBar = new ProgressBar(widget);
progressBar.node.style.width = '100%';

// Modos
progressBar.style.display = 'block';  // Visivel
progressBar.progress = 0.5;           // 50% (determinado)
progressBar.progress = undefined;     // Indeterminado (spinner)

// Adicionar ao DOM do widget
widget.node.appendChild(progressBar.node);
```

### 9.2 Progress Location Service

O `ProgressLocationService` gerencia indicadores de progresso em diferentes regioes do shell.

```typescript
import { ProgressLocationService } from '@theia/core/lib/browser/progress-location-service';

@inject(ProgressLocationService)
protected progressService: ProgressLocationService;

// Mostrar progresso global
this.progressService.showProgress({
  message: 'Loading data...',
  type: 'loading',
  location: 'statusbar',   // Aparece na status bar
});

// Mostrar progresso no view container
this.progressService.showProgress({
  message: 'Fetching repository...',
  type: 'repository',
  location: 'view-container',
  viewContainerId: 'my-view-container',
});

// Progresso com time estimado
this.progressService.showProgress({
  message: 'Processing...',
  type: 'operation',
  location: 'global',
  timeout: 30000,          // Timeout em ms
  cancelable: true,        // Permite cancelamento
});
```

### 9.3 Indeterminate vs Determinate Progress

```typescript
// Progresso indeterminado (spinner animado)
// Usado quando nao se sabe a duracao total
progressBar.progress = undefined;
// Ou
this.progressService.showProgress({
  message: 'Thinking...',
  type: 'indeterminate',
  location: 'statusbar',
});

// Progresso determinado (barra preenchivel)
// Usado quando se conhece o progresso (0.0 a 1.0)
async function withProgress<T>(
  total: number,
  task: (update: (progress: number) => void) => Promise<T>
): Promise<T> {
  return this.progressService.withProgress({
    message: 'Processing items',
    location: 'statusbar',
  }, (progress) => {
    return task((current: number) => {
      progress.report({ work: { done: current, total } });
    });
  });
}

// Exemplo de uso
const results = await withProgress(100, async (update) => {
  const items = [];
  for (let i = 0; i < 100; i++) {
    items.push(await processItem(i));
    update(i + 1);
  }
  return items;
});
```

### 9.4 Progress Status Bar Item

```typescript
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser/status-bar/status-bar';

@inject(StatusBar)
protected statusBar: StatusBar;

// Adicionar item de progresso na status bar
this.statusBar.setElement('my-progress', {
  text: '$(sync~spin) Loading...',
  alignment: StatusBarAlignment.LEFT,
  priority: 10,
  tooltip: 'Operation in progress',
});

// Atualizar progresso
this.statusBar.setElement('my-progress', {
  text: `$(check) ${done}/${total} completed`,
  alignment: StatusBarAlignment.LEFT,
  priority: 10,
});

// Remover quando completo
this.statusBar.removeElement('my-progress');
```

### 9.5 View/Progress Binding

```typescript
// Vincular progresso a uma view especifica via ViewContainerPart
import { ViewContainerPart } from '@theia/core/lib/browser/view-container';
import { Widget } from '@phosphor/widgets';

function setViewProgress(widget: Widget, active: boolean): void {
  const part = ViewContainerPart.get(widget);
  if (part) {
    part.setProgress(active);
  }
}

// Uso em um widget
export class DataLoadingWidget extends ReactWidget {
  async loadData(): Promise<void> {
    setViewProgress(this, true);
    try {
      await this.fetchData();
    } finally {
      setViewProgress(this, false);
    }
  }
}
```

---

## 10. Custom Widget Patterns

### 10.1 Dialog

```typescript
import {
  AbstractDialog,
  DialogProps,
  MessageDialog,
  ConfirmDialog,
} from '@theia/core/lib/browser/dialogs';

// Dialog customizado
interface MyDialogProps extends DialogProps {
  title: string;
  items: string[];
}

class MyDialog extends AbstractDialog<string | undefined> {
  protected selectedItem: string | undefined;
  protected list: HTMLUListElement;

  constructor(props: MyDialogProps) {
    super({ title: props.title });
    this.contentNode.appendChild(this.createList(props.items));
    this.appendCloseButton('Cancel');
    this.appendAcceptButton('Select');
  }

  protected createList(items: string[]): HTMLUListElement {
    this.list = document.createElement('ul');
    this.list.className = 'my-dialog-list';
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      li.onclick = () => {
        this.selectedItem = item;
        this.accept();
      };
      this.list.appendChild(li);
    });
    return this.list;
  }

  get value(): string | undefined {
    return this.selectedItem;
  }
}

// Uso
async function showPicker(): Promise<void> {
  const dialog = new MyDialog({
    title: 'Select Item',
    items: ['A', 'B', 'C'],
  });
  const result = await dialog.open();
  if (result) {
    console.log('Selected:', result);
  }
}

// Dialogs prontos do Theia
const confirmed = await new ConfirmDialog({
  title: 'Confirm',
  msg: 'Are you sure?',
}).open(); // Returns true/false

await new MessageDialog({
  title: 'Info',
  msg: 'Operation completed',
  type: 'info', // info, warning, error
}).open();
```

### 10.2 Wizard Pattern

```typescript
interface WizardStep {
  id: string;
  label: string;
  render: (container: HTMLElement) => void;
  validate: () => boolean;
  collect: () => any;
}

class WizardDialog extends AbstractDialog<any> {
  protected steps: WizardStep[] = [];
  protected currentStep = 0;
  protected state: any = {};
  protected stepContainer: HTMLElement;

  constructor(title: string, steps: WizardStep[]) {
    super({ title });
    this.steps = steps;
    this.stepContainer = document.createElement('div');
    this.stepContainer.className = 'wizard-steps';
    this.contentNode.appendChild(this.stepContainer);

    this.appendCloseButton('Cancel');
    this.appendAcceptButton('Finish');
    this.renderStep();
  }

  protected renderStep(): void {
    this.stepContainer.innerHTML = '';
    this.steps[this.currentStep].render(this.stepContainer);
    this.title.label = `${this.title} - Step ${this.currentStep + 1}/${this.steps.length}`;
  }

  protected async accept(): Promise<void> {
    const step = this.steps[this.currentStep];
    if (!step.validate()) return;

    Object.assign(this.state, step.collect());

    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      super.accept();
    }
  }

  get value(): any {
    return this.state;
  }
}
```

### 10.3 StatusBar Widget

Embora widgets completos nao residam na status bar, e possivel adicionar elementos interativos.

```typescript
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser/status-bar/status-bar';

@injectable()
export class MyStatusBarContribution implements FrontendApplicationContribution {
  @inject(StatusBar)
  protected statusBar: StatusBar;

  onStart(): void {
    this.statusBar.setElement('my-status-item', {
      text: '$(cog) Ready',
      alignment: StatusBarAlignment.RIGHT,
      priority: 5,
      tooltip: 'Click for options',
      onclick: () => this.onStatusBarClick(),
      command: 'my-command',  // Ou command ID diretamente
    });
  }

  protected onStatusBarClick(): void {
    console.log('Status bar clicked');
  }
}
```

### 10.4 Output Widget

`OutputWidget` e a implementacao padrao do Theia para paineis de saida textual.

```typescript
import { OutputWidget } from '@theia/output/lib/browser/output-widget';

// Criar canal de output customizado
import { OutputChannelManager } from '@theia/output/lib/browser/output-channel';

@inject(OutputChannelManager)
protected outputChannelManager: OutputChannelManager;

// Criar canal
const channel = this.outputChannelManager.getChannel('My Channel');
channel.appendLine('Starting operation...');
channel.append('Progress: ');
channel.appendLine('50%');
channel.show(); // Revela o output widget

// Ou criar widget de output diretamente
// (OutputWidget e registrado como widget factory internamente)
const outputWidget = await this.widgetManager.getOrCreateWidget('output');
if (outputWidget instanceof OutputWidget) {
  outputWidget.show();
}
```

### 10.5 List Widget

```typescript
import { ListWidget } from '@theia/core/lib/browser/list-widget';
import { ListModel } from '@theia/core/lib/browser/list/list-model';

interface MyItem {
  id: string;
  label: string;
  description: string;
}

@injectable()
export class MyListWidget extends ListWidget<MyItem> {
  static ID = 'my-list-widget';

  @postConstruct()
  protected init(): void {
    this.id = MyListWidget.ID;
    this.title.label = 'My List';
    this.model = new ListModel<MyItem>({
      items: [
        { id: '1', label: 'Item 1', description: 'First item' },
        { id: '2', label: 'Item 2', description: 'Second item' },
      ],
    });
  }

  protected renderItem(item: MyItem): HTMLElement {
    const div = document.createElement('div');
    div.className = 'my-list-item';
    div.innerHTML = `
      <span class="item-label">${item.label}</span>
      <span class="item-description">${item.description}</span>
    `;
    return div;
  }
}
```

### 10.6 Toolbar Widget

```typescript
import { Toolbar } from '@theia/core/lib/browser/toolbar/toolbar';

// Toolbar e usado dentro de ViewContainerParts
// Para criar acoes customizadas no toolbar da view:

class MyToolbarWidget extends Panel {
  constructor() {
    super({ direction: 'left-to-right' });

    const refreshBtn = this.createToolbarButton('Refresh', 'fa fa-refresh', () => this.refresh());
    const filterInput = this.createFilterInput();
    const settingsBtn = this.createToolbarButton('Settings', 'fa fa-cog', () => this.openSettings());

    this.addWidget(refreshBtn);
    this.addWidget(filterInput);
    this.addWidget(settingsBtn);

    this.addClass('my-view-toolbar');
  }

  protected createToolbarButton(label: string, icon: string, onClick: () => void): Widget {
    const btn = new Widget();
    btn.node.className = 'toolbar-button';
    btn.node.innerHTML = `<span class="${icon}"></span>`;
    btn.node.title = label;
    btn.node.onclick = onClick;
    return btn;
  }

  protected createFilterInput(): Widget {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Filter...';
    input.className = 'theia-input toolbar-filter';

    const container = new Widget();
    container.node.appendChild(input);
    return container;
  }
}
```

### 10.7 TabBar Decorator

```typescript
import { TabBarDecorator, TabBarDecoration } from '@theia/core/lib/browser/tab-bar-decorator';

@injectable()
export class MyTabBarDecorator implements TabBarDecorator {
  readonly id = 'my-tab-decorator';

  decorate(tabBar: TabBar<Widget>): TabBarDecoration[] {
    const decorations: TabBarDecoration[] = [];

    for (let i = 0; i < tabBar.titles.length; i++) {
      const title = tabBar.titles[i];

      if (title.label.startsWith('Dirty')) {
        decorations.push({
          title: title,
          classNames: ['dirty-tab'],
          icon: 'fa fa-circle',
        });
      }

      if (this.isLongRunning(title)) {
        decorations.push({
          title: title,
          badge: {
            text: 'RUN',
            color: 'orange',
          },
        });
      }
    }

    return decorations;
  }

  private isLongRunning(title: Title<Widget>): boolean {
    return title.owner.id.startsWith('long-run-');
  }
}

// Registro
bind(TabBarDecorator).to(MyTabBarDecorator).inSingletonScope();
```

---

## 11. Code Examples

### 11.1 Example 1: Custom ReactWidget with Messaging Service Integration

```typescript
// packages/my-plugin/src/browser/notification-view/notification-view-widget.tsx
import * as React from 'react';
import { injectable, postConstruct, inject } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { MessageService } from '@theia/core/lib/common/message-service';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { Message } from '@phosphor/messaging';

interface NotificationItem {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: number;
  read: boolean;
}

interface NotificationViewState {
  notifications: NotificationItem[];
  filter: 'all' | 'unread';
}

@injectable()
export class NotificationViewWidget extends ReactWidget {
  static ID = 'notification-view';
  static LABEL = 'Notifications';

  @inject(MessageService)
  protected msgService: MessageService;

  protected state: NotificationViewState = {
    notifications: [],
    filter: 'all',
  };

  protected toDispose = new DisposableCollection();

  @postConstruct()
  protected init(): void {
    this.id = NotificationViewWidget.ID;
    this.title.label = NotificationViewWidget.LABEL;
    this.title.iconClass = 'notification-icon';
    this.title.closable = true;
    this.addClass('notification-view');
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.toDispose.push(
      this.msgService.onMessage((message) => {
        this.addNotification({
          title: message.text,
          severity: message.type === 'error' ? 'error' : 'info',
        });
      })
    );
  }

  protected onBeforeDetach(msg: Message): void {
    this.toDispose.dispose();
    super.onBeforeDetach(msg);
  }

  private addNotification(item: Partial<NotificationItem>): void {
    this.state.notifications.unshift({
      id: `notif-${Date.now()}`,
      title: item.title ?? '',
      severity: item.severity ?? 'info',
      timestamp: Date.now(),
      read: false,
    });
    if (this.state.notifications.length > 100) {
      this.state.notifications.pop();
    }
    this.badgeCount = this.state.notifications.filter(n => !n.read).length;
    this.update();
  }

  set badgeCount(count: number) {
    // Delegate to ViewContainerPart
  }

  private markAllRead(): void {
    this.state.notifications.forEach(n => (n.read = true));
    this.badgeCount = 0;
    this.update();
  }

  protected render(): React.ReactNode {
    const filtered = this.state.filter === 'unread'
      ? this.state.notifications.filter(n => !n.read)
      : this.state.notifications;

    return React.createElement('div', { className: 'notification-container' },
      React.createElement('div', { className: 'notification-toolbar' },
        React.createElement('button', {
          className: 'theia-button',
          onClick: () => this.markAllRead()
        }, 'Mark All Read'),
        React.createElement('select', {
          className: 'theia-select',
          value: this.state.filter,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
            this.state.filter = e.target.value as 'all' | 'unread';
            this.update();
          }
        },
          React.createElement('option', { value: 'all' }, 'All'),
          React.createElement('option', { value: 'unread' }, 'Unread'),
        )
      ),
      React.createElement('div', { className: 'notification-list' },
        filtered.length === 0
          ? React.createElement('div', { className: 'empty-state' }, 'No notifications')
          : filtered.map(n =>
              React.createElement('div', {
                key: n.id,
                className: `notification-item severity-${n.severity} ${n.read ? 'read' : 'unread'}`
              },
                React.createElement('span', {
                  className: `severity-icon ${n.severity}`
                }),
                React.createElement('span', { className: 'notification-title' }, n.title),
                React.createElement('span', { className: 'notification-time' },
                  new Date(n.timestamp).toLocaleTimeString()
                ),
              )
            )
      )
    );
  }

  storeState(): NotificationViewState {
    return { ...this.state };
  }

  restoreState(oldState: NotificationViewState): void {
    this.state = oldState;
    this.update();
  }
}
```

### 11.2 Example 2: TreeWidget Implementation with Custom Model

```typescript
// packages/my-plugin/src/browser/task-tree/task-tree-widget.ts
import { injectable, postConstruct, inject } from 'inversify';
import {
  TreeWidget,
  TreeProps,
  ContextMenuRenderer,
  TreeNode,
  CompositeTreeNode,
  SelectableTreeNode,
  TreeModel,
  TreeExpansionService,
  TreeSelectionService,
  TreeDecoratorService,
} from '@theia/core/lib/browser/tree';
import { CommandRegistry } from '@theia/core/lib/common/command';
import { Message } from '@phosphor/messaging';

interface TaskNode extends SelectableTreeNode {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: 'high' | 'medium' | 'low';
  parent: CompositeTreeNode | undefined;
  selected: false;
}

interface TaskGroupNode extends CompositeTreeNode, SelectableTreeNode {
  id: string;
  name: string;
  parent: CompositeTreeNode | undefined;
  children: TaskNode[];
  expanded: true;
  selected: false;
}

@injectable()
export class TaskTreeModel extends TreeModel {
  // Custom model logic
}

@injectable()
export class TaskTreeWidget extends TreeWidget {
  static ID = 'task-tree';
  static LABEL = 'Tasks';

  @inject(CommandRegistry)
  protected commands: CommandRegistry;

  private tasks: (TaskNode | TaskGroupNode)[] = [];

  constructor(
    @inject(TreeProps) readonly treeProps: TreeProps,
    @inject(TaskTreeModel) readonly taskModel: TaskTreeModel,
    @inject(ContextMenuRenderer) readonly contextMenu: ContextMenuRenderer,
  ) {
    super(taskModel, contextMenu);
    this.id = TaskTreeWidget.ID;
    this.title.label = TaskTreeWidget.LABEL;
    this.title.iconClass = 'task-icon';
    this.addClass('task-tree');
  }

  @postConstruct()
  protected init(): void {
    super.init();
    this.model.root = this.buildTaskTree();
  }

  private buildTaskTree(): CompositeTreeNode {
    const root: CompositeTreeNode = {
      id: 'task-root',
      name: 'Tasks',
      parent: undefined,
      children: [],
      visible: true,
    };

    const runningGroup: TaskGroupNode = {
      id: 'group-running',
      name: 'Running',
      parent: root,
      children: [
        { id: 'task-1', name: 'Build project', status: 'running', priority: 'high', parent: root, selected: false },
        { id: 'task-2', name: 'Run tests', status: 'running', priority: 'medium', parent: root, selected: false },
      ],
      expanded: true,
      selected: false,
    };

    const pendingGroup: TaskGroupNode = {
      id: 'group-pending',
      name: 'Pending',
      parent: root,
      children: [
        { id: 'task-3', name: 'Deploy', status: 'pending', priority: 'high', parent: root, selected: false },
      ],
      expanded: true,
      selected: false,
    };

    root.children = [runningGroup, pendingGroup];
    return root;
  }

  // Renderizar no customizado
  protected renderTreeNode(node: TreeNode, props: object): React.ReactNode {
    if (TaskGroupNode.is(node)) {
      return this.renderGroupNode(node);
    }
    if (TaskNode.is(node)) {
      return this.renderTaskNode(node);
    }
    return super.renderTreeNode(node, props);
  }

  private renderGroupNode(node: TaskGroupNode): React.ReactNode {
    return React.createElement('div', { className: 'task-group' },
      React.createElement('span', { className: 'group-icon' }),
      React.createElement('span', { className: 'group-name' }, node.name),
      React.createElement('span', { className: 'group-count' }, `(${node.children.length})`),
    );
  }

  private renderTaskNode(node: TaskNode): React.ReactNode {
    return React.createElement('div', { className: `task-node status-${node.status}` },
      React.createElement('span', { className: `status-indicator ${node.status}` }),
      React.createElement('span', { className: 'task-name' }, node.name),
      React.createElement('span', { className: `priority-badge ${node.priority}` }, node.priority),
    );
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('dblclick', (e) => {
      const nodeId = this.getNodeFromEvent(e);
      if (nodeId) {
        const node = this.model.getNode(nodeId);
        if (node && TaskNode.is(node)) {
          this.commands.executeCommand('task-view:open', node);
        }
      }
    });
  }

  private getNodeFromEvent(event: Event): string | undefined {
    // Implementation to extract node id from DOM event
    return undefined;
  }
}

// Type guards
namespace TaskNode {
  export function is(node: unknown): node is TaskNode {
    return TreeNode.is(node) && 'status' in node;
  }
}

namespace TaskGroupNode {
  export function is(node: unknown): node is TaskGroupNode {
    return CompositeTreeNode.is(node) && 'expanded' in node && 'children' in node;
  }
}
```

### 11.3 Example 3: WebviewWidget Creation

```typescript
// packages/my-plugin/src/browser/preview-view/preview-view-widget.ts
import { injectable, postConstruct, inject } from 'inversify';
import { WebviewWidget } from '@theia/core/lib/browser/webview/webview-widget';
import { WebviewEnvironment } from '@theia/core/lib/browser/webview/webview-environment';
import { DisposableCollection } from '@theia/core/lib/common/disposable';

@injectable()
export class PreviewWebviewWidget extends WebviewWidget {
  static ID = 'preview-webview';
  static LABEL = 'Preview';

  @inject(WebviewEnvironment)
  protected webviewEnv: WebviewEnvironment;

  protected toDispose = new DisposableCollection();
  protected currentContent: string = '';

  @postConstruct()
  protected init(): void {
    this.id = PreviewWebviewWidget.ID;
    this.title.label = PreviewWebviewWidget.LABEL;
    this.title.iconClass = 'preview-icon';
    this.title.closable = true;

    this.toDispose.push(
      this.onDidReceiveMessage((message) => {
        switch (message.command) {
          case 'ready':
            this.postMessage({
              command: 'setContent',
              content: this.currentContent,
            });
            break;
          case 'heightChanged':
            this.node.style.height = `${message.height}px`;
            break;
          case 'linkClicked':
            this.handleLinkClick(message.url);
            break;
        }
      })
    );

    this.initializeContent();
  }

  private initializeContent(): void {
    const html = this.generateHtml();
    this.setContent({
      html,
      options: {
        enableScripts: true,
        enableCommandUris: true,
        localResourceRoots: [],
      },
    });
  }

  private generateHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --fg: var(--vscode-editor-foreground, #d4d4d4);
      --link: var(--vscode-textLink-foreground, #3794ff);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: var(--bg); color: var(--fg); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 16px; }
    a { color: var(--link); cursor: pointer; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .content { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 1.5em; margin-bottom: 8px; }
    p { margin-bottom: 12px; line-height: 1.5; }
    pre { background: rgba(255,255,255,0.05); padding: 12px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="content">
    <div id="app"></div>
  </div>
  <script>
    (function() {
      const vscode = acquireVsCodeApi();
      let state = vscode.getState() || { scrollY: 0 };

      vscode.postMessage({ command: 'ready' });

      window.addEventListener('message', function(event) {
        const message = event.data;
        if (message.command === 'setContent') {
          document.getElementById('app').innerHTML = message.content;
          window.scrollTo(0, state.scrollY);
        }
      });

      document.addEventListener('click', function(e) {
        const target = e.target;
        if (target.tagName === 'A' && target.href) {
          if (target.href.startsWith('command:')) {
            e.preventDefault();
            vscode.postMessage({ command: 'linkClicked', url: target.href });
          }
        }
      });

      window.addEventListener('scroll', function() {
        state.scrollY = window.scrollY;
        vscode.setState(state);
      });

      window.addEventListener('resize', function() {
        vscode.postMessage({
          command: 'heightChanged',
          height: document.body.scrollHeight
        });
      });

      vscode.postMessage({
        command: 'heightChanged',
        height: document.body.scrollHeight
      });
    })();
  </script>
</body>
</html>`;
  }

  updateContent(content: string): void {
    this.currentContent = content;
    this.postMessage({
      command: 'setContent',
      content,
    });
  }

  private handleLinkClick(url: string): void {
    if (url.startsWith('command:')) {
      const commandId = url.slice('command:'.length);
      // Execute command via Theia
    }
  }

  storeState(): any {
    return { currentContent: this.currentContent };
  }

  restoreState(state: any): void {
    if (state?.currentContent) {
      this.currentContent = state.currentContent;
      this.updateContent(this.currentContent);
    }
  }

  dispose(): void {
    this.toDispose.dispose();
    super.dispose();
  }
}
```

### 11.4 Example 4: ViewContribution Registration

```typescript
// packages/my-plugin/src/browser/notification-view/notification-view-contribution.ts
import { injectable, inject } from 'inversify';
import {
  ViewContribution,
  FrontendApplicationContribution,
  FrontendApplication,
  WidgetManager,
  KeybindingRegistry,
  MenuModelRegistry,
  CommandRegistry,
} from '@theia/core/lib/browser';
import { ViewContainerIdentifier } from '@theia/core/lib/browser/view-container';
import { Widget } from '@phosphor/widgets';
import { NotificationViewWidget } from './notification-view-widget';

export const TOGGLE_NOTIFICATION_VIEW = 'notification-view:toggle';
export const REVEAL_NOTIFICATION_VIEW = 'notification-view:reveal';

@injectable()
export class NotificationViewContribution
  extends ViewContribution
  implements FrontendApplicationContribution
{
  readonly id = NotificationViewWidget.ID;
  readonly label = NotificationViewWidget.LABEL;

  @inject(WidgetManager)
  protected widgetManager: WidgetManager;

  @inject(CommandRegistry)
  protected commands: CommandRegistry;

  @inject(MenuModelRegistry)
  protected menus: MenuModelRegistry;

  @inject(KeybindingRegistry)
  protected keybindings: KeybindingRegistry;

  registerViews(): ViewContribution.MyView {
    return {
      id: NotificationViewWidget.ID,
      label: NotificationViewWidget.LABEL,
      iconClass: 'notification-icon',
      viewContainerId: 'bottom',
      widgetFactory: NotificationViewWidget.ID,
      order: 10,
      area: 'bottom',
      toggleCommandId: TOGGLE_NOTIFICATION_VIEW,
    };
  }

  registerCommands(commands: CommandRegistry): void {
    commands.registerCommand(
      { id: TOGGLE_NOTIFICATION_VIEW, label: 'Toggle Notifications' },
      { execute: () => this.toggleView() }
    );

    commands.registerCommand(
      { id: REVEAL_NOTIFICATION_VIEW, label: 'Reveal Notifications' },
      { execute: () => this.revealView() }
    );
  }

  registerMenus(menus: MenuModelRegistry): void {
    menus.registerMenuAction(ViewMenu.SIDEBAR, {
      commandId: TOGGLE_NOTIFICATION_VIEW,
      label: 'Notifications',
      order: '15',
    });
  }

  registerKeybindings(keybindings: KeybindingRegistry): void {
    keybindings.registerKeybinding({
      command: TOGGLE_NOTIFICATION_VIEW,
      keybinding: 'ctrlcmd+shift+n',
    });
  }

  private async toggleView(): Promise<void> {
    const widget = await this.widgetManager.getOrCreateWidget(NotificationViewWidget.ID);
    if (widget && widget.isVisible) {
      await this.closeView();
    } else {
      await this.openView({ activate: true, reveal: true });
    }
  }

  private async revealView(): Promise<void> {
    await this.openView({ activate: true, reveal: true, side: 'bottom' });
  }

  onStart(app: FrontendApplication): void {
    // Auto-open on start if needed
  }
}
```

### 11.5 Example 5: WidgetFactory Pattern

```typescript
// packages/my-plugin/src/browser/notification-view/notification-view-factory.ts
import { injectable, inject } from 'inversify';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { NotificationViewWidget } from './notification-view-widget';
import { Widget } from '@phosphor/widgets';

@injectable()
export class NotificationViewFactory implements WidgetFactory {
  readonly id = NotificationViewWidget.ID;

  @inject(NotificationViewWidget)
  protected widget: NotificationViewWidget;

  async createWidget(options?: any): Promise<Widget> {
    if (options?.clearExisting) {
      // Create fresh instance with reset state
      return new NotificationViewWidget();
    }
    // Return singleton instance
    return this.widget;
  }
}

// Module registration
// packages/my-plugin/src/browser/notification-view/notification-view-module.ts
import { ContainerModule } from 'inversify';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { bindViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import {
  FrontendApplicationContribution,
  bindContributionProvider,
} from '@theia/core/lib/browser/frontend-application';

import { NotificationViewWidget } from './notification-view-widget';
import { NotificationViewFactory } from './notification-view-factory';
import { NotificationViewContribution } from './notification-view-contribution';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  // Widget
  bind(NotificationViewWidget).toSelf().inSingletonScope();

  // Factory
  bind(WidgetFactory).to(NotificationViewFactory).inSingletonScope();

  // Contribution (view registration + commands + menus + keybindings)
  bindViewContribution(bind, NotificationViewContribution);
  bind(FrontendApplicationContribution).to(NotificationViewContribution).inSingletonScope();
});
```

### 11.6 Example 6: Dialog Implementation

```typescript
// packages/my-plugin/src/browser/dialogs/export-dialog.ts
import { injectable } from 'inversify';
import { AbstractDialog, DialogProps } from '@theia/core/lib/browser/dialogs';

interface ExportOptions {
  format: 'json' | 'csv' | 'yaml';
  includeMetadata: boolean;
  filePath: string;
}

@injectable()
export class ExportDialog extends AbstractDialog<ExportOptions | undefined> {
  protected formatSelect: HTMLSelectElement;
  protected metadataCheckbox: HTMLInputElement;
  protected pathInput: HTMLInputElement;

  constructor() {
    super({ title: 'Export Data' });
    this.contentNode.classList.add('export-dialog');
    this.createForm();
    this.appendCloseButton('Cancel');
    this.appendAcceptButton('Export');
  }

  protected createForm(): void {
    const form = document.createElement('div');
    form.className = 'dialog-form';
    form.innerHTML = `
      <div class="form-group">
        <label for="format">Format:</label>
        <select id="format" class="theia-select">
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="yaml">YAML</option>
        </select>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="include-metadata" checked />
          Include metadata
        </label>
      </div>
      <div class="form-group">
        <label for="file-path">File path:</label>
        <input type="text" id="file-path" class="theia-input" placeholder="/path/to/output" />
      </div>
    `;

    this.formatSelect = form.querySelector('#format') as HTMLSelectElement;
    this.metadataCheckbox = form.querySelector('#include-metadata') as HTMLInputElement;
    this.pathInput = form.querySelector('#file-path') as HTMLInputElement;

    this.contentNode.appendChild(form);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.pathInput.focus();
    this.addUpdateListener(this.formatSelect, 'change');
    this.addUpdateListener(this.metadataCheckbox, 'change');
    this.addUpdateListener(this.pathInput, 'input');
  }

  get value(): ExportOptions | undefined {
    if (!this.pathInput.value.trim()) {
      return undefined;
    }
    return {
      format: this.formatSelect.value as ExportOptions['format'],
      includeMetadata: this.metadataCheckbox.checked,
      filePath: this.pathInput.value.trim(),
    };
  }
}

// Uso
async function showExportDialog(): Promise<void> {
  const dialog = new ExportDialog();
  const result = await dialog.open();
  if (result) {
    // Execute export with result.format, result.includeMetadata, result.filePath
  }
}
```

---

## 12. Conexoes

### 12.1 Conexoes com Outros Estudos

| Conexao | Descricao |
|---------|-----------|
| **S34 (Editor/Widget)** | Editor widgets (Monaco) compartilham o mesmo `BaseWidget` lifecycle, estado serializado via `storeState()`, anexados ao `DockPanel` da main area. Custom editors extendem `Widget` com capacidades de edicao. |
| **S35 (Filesystem/Workspace)** | `FileTreeWidget` (explorer) e a implementacao mais complexa de `TreeWidget`. Workspace roots alimentam o model da arvore de arquivos. `FileStatNode` extends `SelectableTreeNode`. |
| **S36 (Extension Host)** | Extensoes no backend podem contribuir com `WidgetFactory` via inversify. O host de extensao comunica ao frontend factories disponiveis. Webview views sao tipicamente instanciadas via extension host. |
| **S37 (Search/SCM/Task)** | Search view usa `TreeWidget` com resultados de busca como nos customizados. SCM view usa `TreeWidget` com decorators para status de arquivos. Tasks view mostra task nodes com progresso. |
| **S38 (Editor Intelligence)** | LSP completions, hover, diagnostics sao exibidos em widgets: CompletionWidget, HoverWidget, ProblemsWidget. Todos sao `BaseWidget` subclasses. |
| **S39 (Settings/Keybindings)** | `SettingsWidget` usa `TreeWidget` para navegacao de categorias. Keybindings view usa `TreeWidget` com search/filter. Views sao registradas via `ViewContribution` com keybindings. |
| **S40 (WebView/Layout)** | `WebviewWidget` e a implementacao concreta de webviews. O `ApplicationShell` gerencia `ViewContainer` instances para sidebar, bottom panel. Layout persistence depende de `storeState()`/`restoreState()`. |
| **S41 (Remote/Web IDE)** | Em ambientes remotos, widgets sao serializados no frontend e o estado viaja via `WidgetManager`. Webview widgets tem restricoes de recursos remotos (localResourceRoots). |
| **S42 (DI/Contributions)** | `ViewContribution`, `WidgetFactory`, `TabBarDecorator`, `TreeDecorator` sao registrados via Inversify `ContainerModule`. DI resolve todas as dependencias de widgets. |

### 12.2 Diagrama de Dependencias

```
  S42 (DI) ────────────────────────────────────────────────────┐
    │                                                            │
    ├── bindViewContribution() -> ViewContribution               │
    ├── bind(WidgetFactory) -> Factory                           │
    ├── bind(TreeDecorator) -> Decorator                         │
    └── bind(TabBarDecorator) -> Decorator                       │
                                                                 │
  S43 (Views & Widgets) ─── THIS STUDY                           │
    │                                                            │
    ├── ViewContainer (sidebar, bottom) ──────── S40 (Layout)   │
    ├── ReactWidget ──────────────────────────── S34 (Editor)    │
    ├── TreeWidget ────────────────── S35 (FS), S37 (Search/SCM)│
    ├── WebviewWidget ───────────────────── S40 (WebView)       │
    ├── WidgetManager ─────────────────────── S41 (Remote)      │
    └── storeState/restoreState ──────── S39 (Settings/Keymaps)  │
                                                                 │
  S40 (WebView/Layout) ────────────────────────────────────────┐
    │                                                            │
    ├── ApplicationShell ─── container para todas as views       │
    ├── ViewContainerPart ─── wrapper de widget com toolbar      │
    ├── Layout persistence ── deserializa widgets na inicializacao│
    └── WebviewWidget ────── iframe isolado com postMessage      │
```

---

## 13. Plano de Implementacao

### Fase 1: Widget Core (2 semanas)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|--------------|
| 1.1 | BaseWidget lifecycle (onAfterAttach, onActivate, onResize, onClose) | 2d | -- |
| 1.2 | Widget Title configuracao (label, caption, iconClass, closable) | 1d | 1.1 |
| 1.3 | Serializacao com storeState/restoreState | 2d | 1.2 |
| 1.4 | Panel, SplitPanel, DockPanel composicao | 2d | 1.1 |
| 1.5 | WidgetManager + WidgetFactory registration | 3d | 1.1 |
| 1.6 | Widget restoration on application restart | 2d | 1.5 |
| 1.7 | Widget disposal pattern (DisposableCollection) | 1d | 1.1 |

### Fase 2: View Container System (2 semanas)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|--------------|
| 2.1 | ViewContainer implementation (sidebar + bottom) | 3d | 1.5 |
| 2.2 | ViewContainerPart com toolbar, badge, progress | 3d | 2.1 |
| 2.3 | View registration via ViewContribution | 2d | 2.1 |
| 2.4 | View ordering (rank) e collapse/expand | 2d | 2.2 |
| 2.5 | View toggle, reveal, close commands | 2d | 2.3 |
| 2.6 | Keyboard shortcuts para views | 1d | 2.5 |
| 2.7 | Menu contributions (View menu, context menu) | 1d | 2.5 |

### Fase 3: ReactWidget (1.5 semanas)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|--------------|
| 3.1 | ReactWidget base (render(), update(), forceUpdate) | 2d | 1.1 |
| 3.2 | React component integration pattern | 2d | 3.1 |
| 3.3 | State synchronization (React <-> Theia) | 2d | 3.2 |
| 3.4 | Event bridging (Theia subscriptions -> React state) | 2d | 3.3 |
| 3.5 | MessagingService integration for React<->Theia | 1d | 3.2 |
| 3.6 | TSX (.tsx) compilation setup | 1d | 3.1 |

### Fase 4: Tree Widget (2 semanas)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|--------------|
| 4.1 | TreeWidget base e TreeModel integration | 2d | 1.1 |
| 4.2 | TreeNode types (Composite, Selectable, etc) | 2d | 4.1 |
| 4.3 | Tree expansion and collapse | 1d | 4.2 |
| 4.4 | Tree selection (single, multi) | 1d | 4.2 |
| 4.5 | Tree context menu | 1d | 4.4 |
| 4.6 | Tree drag and drop | 2d | 4.4 |
| 4.7 | Tree search/filter | 2d | 4.3 |
| 4.8 | Virtualized rendering | 2d | 4.1 |
| 4.9 | Tree decorations (badge, icon, color) | 2d | 4.2 |

### Fase 5: Webview Widget (2 semanas)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|--------------|
| 5.1 | WebviewWidget base com iframe isolation | 3d | 1.1 |
| 5.2 | Content Security Policy enforcement | 1d | 5.1 |
| 5.3 | postMessage/onDidReceiveMessage protocol | 2d | 5.1 |
| 5.4 | Webview resource loading (localResourceRoots) | 1d | 5.1 |
| 5.5 | Webview view state persistence | 2d | 5.3 |
| 5.6 | Webview widget factory registration | 2d | 5.1 |
| 5.7 | acquireVsCodeApi compatibility | 1d | 5.3 |

### Fase 6: Custom Widgets e Decorators (1.5 semanas)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|--------------|
| 6.1 | AbstractDialog, MessageDialog, ConfirmDialog | 2d | 1.1 |
| 6.2 | Wizard dialog pattern | 2d | 6.1 |
| 6.3 | StatusBar elements | 1d | 1.1 |
| 6.4 | OutputWidget integration | 1d | 1.5 |
| 6.5 | ListWidget implementation | 2d | 1.1 |
| 6.6 | Toolbar widget (ViewContainerPart toolbar) | 1d | 2.2 |
| 6.7 | TabBarDecorator (badge, icon, color on tabs) | 2d | 1.1 |

### Fase 7: Progress e Activity (1 semana)

| Task | Descricao | Esforco | Dependencias |
|------|-----------|---------|--------------|
| 7.1 | ProgressBar component | 1d | 1.1 |
| 7.2 | ProgressLocationService | 2d | 7.1 |
| 7.3 | Determinate vs indeterminate progress | 1d | 7.2 |
| 7.4 | View/Progress binding via ViewContainerPart | 1d | 7.2, 2.2 |
| 7.5 | StatusBar progress indicator | 1d | 7.2 |

### Resumo de Esforco

| Fase | Descricao | Dias | Semanas |
|------|-----------|------|---------|
| F1 | Widget Core | 13 | 2.0 |
| F2 | View Container System | 14 | 2.0 |
| F3 | ReactWidget | 10 | 1.5 |
| F4 | Tree Widget | 15 | 2.0 |
| F5 | Webview Widget | 12 | 2.0 |
| F6 | Custom Widgets e Decorators | 11 | 1.5 |
| F7 | Progress e Activity | 6 | 1.0 |
| **Total** | | **81** | **12.0** |

### Testes

| Tipo | Cobertura | Framework |
|------|-----------|-----------|
| Unitario | BaseWidget lifecycle, title, serialization | Jest + jsdom |
| Unitario | ViewContainer, ViewContainerPart, ordering | Jest + jsdom |
| Unitario | ReactWidget render cycle, update, state sync | Jest + jsdom + React test utils |
| Unitario | TreeWidget model, expansion, selection, filter | Jest + jsdom |
| Unitario | WebviewWidget postMessage roundtrip, CSP | Jest + jsdom |
| Unitario | Dialog open/close lifecycle | Jest + jsdom |
| Integracao | View registration + toggle + reveal | Playwright |
| Integracao | Tree drag and drop | Playwright |
| Integracao | Webview <-> Theia communication | Playwright |
| E2E | Custom widget aparece e funciona na shell | Playwright |

### Quality Gates

| Gate | Requisitos |
|------|------------|
| PR | Testes unitarios + lint + typecheck (tsc --noEmit) |
| Pre-merge | Testes de integracao + contract tests (postMessage protocol) |
| Release | E2E tests + coverage minima 60% + accessibility audit (axe-core) |

---

> **Data:** 2026-07-22
> **Proximo estudo:** S44 — Application Shell & Layout Manager
