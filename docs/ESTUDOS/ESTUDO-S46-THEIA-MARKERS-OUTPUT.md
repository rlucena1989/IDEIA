# ESTUDO S46 — Theia Marker, Problem & Output Systems

> **Arquitetura dos sistemas de diagnosticos, problemas, canais de saida e notificacoes na plataforma Theia**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — MarkerManager, ProblemManager, ProblemWidget, OutputChannel, OutputWidget, ConsoleService, MessageService, NotificationSystem, DialogSystem |

---

## Sumario

1. [Introducao](#1-introducao)
2. [Marker Manager](#2-marker-manager)
3. [Problem Manager](#3-problem-manager)
4. [Problem Widget](#4-problem-widget)
5. [Problem Severity System](#5-problem-severity-system)
6. [Marker Decorator](#6-marker-decorator)
7. [Output Channel](#7-output-channel)
8. [Output Widget](#8-output-widget)
9. [Console Service](#9-console-service)
10. [Notifications & Message Service](#10-notifications--message-service)
11. [Notification System](#11-notification-system)
12. [Dialog System](#12-dialog-system)
13. [Code Examples](#13-code-examples)
14. [Conexoes](#14-conexoes)
15. [Plano de Implementacao](#15-plano-de-implementacao)

---

## 1. Introducao

### 1.1 O Ecossistema de Diagnosticos e Saida

O Theia fornece um conjunto integrado de servicos para coleta, processamento, exibicao e gerenciamento de diagnosticos de codigo, mensagens de saida de extensoes, logs do console e notificacoes ao usuario. Estes sistemas formam a camada de feedback que informa o usuario sobre erros, avisos, informacoes e progresso de operacoes.

```
+----------------------------------------------------------------------+
|               FEEDBACK ECOSYSTEM OVERVIEW                              |
|                                                                       |
|  SOURCES OF DIAGNOSTICS                                               |
|  +------------+  +-----------+  +-----------+  +-------------------+  |
|  | LSP Server |  | Linter    |  | Compiler  |  | Extension/Host    |  |
|  | (via LSP   |  | (ESLint,  |  | (tsc,     |  | (runtime errors,  |  |
|  |  publishDi |  |  PyLint)  |  |  javac)   |  |  console.log)     |  |
|  | agnostics) |  |           |  |           |  |                   |  |
|  +-----+------+  +-----+-----+  +-----+-----+  +---------+---------+  |
|        |              |               |                    |           |
|        v              v               v                    v           |
|  +--------------------------------------------------------------+     |
|  |                    MARKER MANAGER LAYER                       |     |
|  |  MarkerManager — generic marker CRUD                         |     |
|  |    +-- ProblemManager — problem-specific markers              |     |
|  |    +-- MarkerDecorator — decorator for navigator & editor    |     |
|  +---------------------------+----------------------------------+     |
|                              |                                       |
|              +---------------+-----------+                           |
|              |                           |                           |
|              v                           v                           |
|  +---------------------+    +---------------------------+            |
|  | ProblemWidget       |    | ProblemDecorator          |            |
|  | (Problems panel)    |    | (navigator decorations)   |            |
|  | Tree: file > problem|    | (editor squiggly/gutter)  |            |
|  +---------------------+    +---------------------------+            |
|                                                                       |
|  OUTPUT SOURCES                                                       |
|  +------------------+  +------------------+  +------------------+    |
|  | Extension logs   |  | Task/terminal    |  | Debug console    |    |
|  | (OutputChannel)  |  | stdout/stderr    |  | (DAP output)     |    |
|  +--------+---------+  +--------+---------+  +--------+---------+    |
|           |                     |                     |               |
|           v                     v                     v               |
|  +--------------------------------------------------------------+     |
|  |              OUTPUT CHANNEL MANAGER                          |     |
|  |  OutputChannelManager — channel CRUD + persistence           |     |
|  |    +-- OutputChannel — per-source named channel              |     |
|  |    +-- OutputWidget — channel viewer in bottom panel         |     |
|  +---------------------------+----------------------------------+     |
|                              |                                       |
|                              v                                       |
|  +--------------------------------------------------------------+     |
|  |              NOTIFICATION & MESSAGE LAYER                     |     |
|  |  MessageService — info/warn/error dialogs + toasts           |     |
|  |  NotificationManager — notification center + grouping        |     |
|  |  DialogSystem — ConfirmDialog, InputDialog, etc.             |     |
|  |  ConsoleService — structured logging (info, warn, error)     |     |
|  +--------------------------------------------------------------+     |
+----------------------------------------------------------------------+
```

### 1.2 Responsabilidades de Cada Subsistema

| Subsistema | Responsabilidade | Pacote Principal |
|---|---|---|
| MarkerManager | CRUD generico de markers (qualquer tipo de dado associado a URI+owner) | `@theia/markers` |
| ProblemManager | Extensao do MarkerManager para diagnosticos de codigo (range, severity, message) | `@theia/markers` |
| ProblemWidget | Exibicao hierarquica de problemas no bottom panel (file > severity > problem) | `@theia/markers` |
| MarkerDecorator | Decoracao do navigator e editor com indicadores de problemas (contagem, squiggly) | `@theia/markers` |
| OutputChannel | Canal nomeado para saida textual de extensoes/processos | `@theia/output` |
| OutputWidget | Visualizacao de canais de saida no bottom panel | `@theia/output` |
| ConsoleService | Log estruturado para console do dev tools | `@theia/core` |
| MessageService | Notificacoes ao usuario (info, warn, error) com acoes e progresso | `@theia/core` |
| NotificationManager | Gerenciamento central de notificacoes, grouping, toasts, center widget | `@theia/core` |
| DialogSystem | Dialogos modais (confirm, input, select, progress) | `@theia/core` |

### 1.3 Fluxo de Dados de um Diagnostico

```
LSP Server
  |
  | textDocument/publishDiagnostics (JSON-RPC notification)
  v
LSP Client (lsp-bridge)
  |
  | Decodifica params: uri, diagnostics[]
  | Mapeia DiagnosticSeverity -> MarkerSeverity
  | Chama ProblemManager.setMarkers(uri, 'language-server-id', markers)
  v
ProblemManager (extends MarkerManager)
  |
  | Atualiza colecao interna de markers para a URI+owner
  | Dispara onMarkerChanged event
  v
MarkerCollection
  |
  | Recalcula sumario (errors, warnings, infos)
  | Notifica listeners
  v
  +----> ProblemWidget — atualiza tree model -> re-renderiza painel
  +----> MarkerDecorator:
  |       +-- NavigatorDecorator — atualiza badges no file explorer
  |       +-- EditorDecorator — atualiza squiggly lines, gutter, overview ruler
  +----> ProblemManager listeners (outros consumidores)
```

### 1.4 Principais Interfaces e Contratos

```
Marker<T>         — Dado generico: { kind: string, uri: URI, owner: string, data: T }
ProblemMarker     — Marker especializado: data contem Diagnostic (range, severity, message, etc.)
OutputChannel     — Canal nomeado: { name, append, appendLine, replace, clear, show, hide, dispose }
Notification      — Notificacao: { message, type, actions, progress, source }
Dialog            — Dialogo modal: { open, close, accept, reject, value }
```

---

## 2. Marker Manager

### 2.1 Visao Geral

MarkerManager e a classe central para gerenciar marcadores associados a URIs de recursos. Ela mantem colecoes de markers organizadas por URI e owner (quem criou os markers). ProblemManager e sua principal especializacao concreta, mas o MarkerManager e generico e pode ser usado para qualquer tipo de marcacao.

```
+------------------------------------------------------------------+
|                     MarkerManager                                  |
|                                                                    |
|  +------------------------------------------------------------+   |
|  |  MARKER COLLECTION MAP                                      |   |
|  |                                                             |   |
|  |  +----------+  +---------------------------------------+    |   |
|  |  | URI "/a" |  | Owners map                             |    |   |
|  |  |          |  |   "eslint"    -> MarkerCollection<A>   |    |   |
|  |  |          |  |   "typescript" -> MarkerCollection<B>  |    |   |
|  |  +----------+  +---------------------------------------+    |   |
|  |  +----------+  +---------------------------------------+    |   |
|  |  | URI "/b" |  | Owners map                             |    |   |
|  |  |          |  |   "builtin"    -> MarkerCollection<C>  |    |   |
|  |  +----------+  +---------------------------------------+    |   |
|  |  ...                                                        |   |
|  +------------------------------------------------------------+   |
|                                                                    |
|  OPERACOES                                                        |
|  +------------------------------------------------------------+   |
|  | setMarkers(uri, owner, markers)  — substitui colecao       |   |
|  | findMarkers(filter)             — busca markers             |   |
|  | getMarkersByOwner(uri, owner)   — obtem colecao por owner  |   |
|  | cleanAllMarkers(uri)            — limpa markers de uma URI  |   |
|  | onMarkerChanged(uri)            — event emitter             |   |
|  +------------------------------------------------------------+   |
+------------------------------------------------------------------+
```

### 2.2 Interface Marker

```typescript
export interface Marker<T> {
  kind: string;
  uri: URI;
  owner: string;
  data: T;
}
```

| Propriedade | Tipo | Descricao |
|---|---|---|
| kind | `string` | Identificador do tipo de marker, ex: `'problem'`, `'task'`, `'bookmark'` |
| uri | `URI` | URI do recurso (arquivo) ao qual o marker esta associado |
| owner | `string` | Identificador de quem criou o marker, ex: `'typescript'`, `'eslint'`, `'builtin'` |
| data | `T` | Dado especifico do tipo de marker. Para problemas, e um `Diagnostic` |

### 2.3 MarkerCollection

MarkerCollection e a estrutura de dados interna que armazena markers de um unico owner para uma unica URI.

```typescript
export class MarkerCollection<T> {
  protected markers: Marker<T>[] = [];

  addMarker(marker: Marker<T>): void;
  removeMarker(marker: Marker<T>): void;
  setMarkers(markers: Marker<T>[]): void;
  getMarkers(): Marker<T>[];
  findMarkers(filter: Filter<T>): Marker<T>[];
  getUri(): URI;
  getOwner(): string;
  getSize(): number;
  clear(): void;
}

export type Filter<T> = (marker: Marker<T>) => boolean;
```

### 2.4 Operacoes CRUD

#### setMarkers(uri, owner, markers)

Substitui TODOS os markers de um dado owner para uma URI. Esta e a operacao principal usada pelo LSP client: quando o servidor LSP envia `textDocument/publishDiagnostics`, o client chama `problemManager.setMarkers(uri, languageServerId, problemMarkers)`.

```typescript
// Assinatura
setMarkers(uri: URI, owner: string, markers: Marker<T>[]): void;

// Fluxo interno
// 1. Obtem ou cria MarkerCollection para (uri, owner)
// 2. Chama collection.setMarkers(markers) — substitui internamente
// 3. Dispara onMarkerChanged(uri) com todos os owners da URI
// 4. Se novo array esta vazio e collection existe, remove a collection
```

#### findMarkers(filter)

Retorna todos os markers de todas as URIs e todos os owners que satisfazem o filtro.

```typescript
findMarkers(filter: Filter<T>): Marker<T>[];

// Exemplo: buscar todos os erros de todas as URIs
const allErrors = problemManager.findMarkers(
  m => m.data.severity === MarkerSeverity.Error
);
```

#### getMarkersByOwner(uri, owner)

Retorna os markers de um owner especifico para uma URI.

```typescript
getMarkersByOwner(uri: URI, owner: string): Marker<T>[];
```

### 2.5 Eventos

```typescript
// EventEmitter padrao do Theia
readonly onMarkerChanged: Event<URI>;

// Disparado quando markers de uma URI sao alterados
// O argumento e a URI cujos markers mudaram
markerManager.onMarkerChanged(uri => {
  // Recalcular decoracoes, atualizar UI, etc.
});
```

### 2.6 Cleanup

```typescript
// Limpa todos os markers de todas as URIs para um owner especifico
// Usado quando um LSP server e desligado
cleanAllMarkers(owner: string): void;

// Limpa markers para URI especifica (todos os owners)
cleanAllMarkersForUri(uri: URI): void;
```

### 2.7 Registro no Container DI

```typescript
// Frontend module
export default new ContainerModule(bind => {
  bind(MarkerManager).toSelf().inSingletonScope();
  bind(ProblemManager).toSelf().inSingletonScope();
  bind(ProblemWidget).toDynamicValue(ctx =>
    ctx.container.get(WidgetManager).getOrCreateWidget(ProblemWidget.ID)
  );
  bind(WidgetFactory).toConstantValue({
    id: ProblemWidget.ID,
    createWidget: () => ctx.container.get(ProblemWidget)
  });
});
```

---

## 3. Problem Manager

### 3.1 Definicao

ProblemManager e a especializacao concreta de MarkerManager para diagnosticos de codigo. Ela herda toda a infraestrutura de CRUD e adiciona metodos especificos para problemas. E o ponto central de entrada para diagnosticos do LSP, linters e compiladores.

```typescript
export class ProblemManager extends MarkerManager<Diagnostic> {
  // Herda:
  //   setMarkers(uri, owner, markers)
  //   findMarkers(filter)
  //   getMarkersByOwner(uri, owner)
  //   cleanAllMarkers(owner)
  //   onMarkerChanged

  // Metodos adicionais especificos para Diagnostic
  getProblemStatistic(uri: URI): ProblemStatistic;
  getProblemsBySeverity(severity: MarkerSeverity): Marker<Diagnostic>[];
  getFilesWithProblems(): URI[];
  hasProblems(uri: URI): boolean;
}

export interface ProblemStatistic {
  errors: number;
  warnings: number;
  infos: number;
  total: number;
}
```

### 3.2 Diagnostic Data Structure

O dado associado a cada ProblemMarker e um `Diagnostic`, que segue a especificacao LSP com extensoes do Theia:

```typescript
export interface Diagnostic {
  // Posicao (LSP range)
  range: Range;

  // Severidade do problema
  severity: MarkerSeverity;

  // Mensagem principal
  message: string;

  // Dados adicionais
  source?: string;
  code?: string | number;
  relatedInformation?: DiagnosticRelatedInformation[];
  tags?: DiagnosticTag[];
}

export interface Range {
  start: Position;  // { line, character }
  end: Position;    // { line, character }
}

export interface Position {
  line: number;
  character: number;
}

export interface DiagnosticRelatedInformation {
  location: { uri: string; range: Range };
  message: string;
}

export enum DiagnosticTag {
  Unnecessary = 1,
  Deprecated = 2,
}
```

### 3.3 Mapeamento de Severidade LSP para Theia

```typescript
export enum MarkerSeverity {
  Error = 1,
  Warning = 2,
  Info = 3,
  Hint = 4,
}

// Mapeamento do DiagnosticSeverity do LSP

// LSP DiagnosticSeverity:
//   1 = Error
//   2 = Warning
//   3 = Information
//   4 = Hint

// Theia MarkerSeverity:
//   1 = Error
//   2 = Warning
//   3 = Info
//   4 = Hint
// Ambos usam o mesmo mapeamento numerico
```

### 3.4 Problem Event Propagation

```
LSP publishDiagnostics
       |
       v
ProblemManager.setMarkers(uri, owner, markers)
       |
       | 1. Atualiza MarkerCollection interna
       | 2. Dispara onMarkerChanged(uri)
       v
Event propagado para:
  +-- ProblemWidget.onMarkerChanged -> atualiza tree model
  +-- MarkerDecorator (navigator/editor) -> atualiza indicadores
  +-- ProblemManagerListeners (extensoes, plugins)
  +-- StatusBar -> atualiza contagem de erros/warnings
  +-- ActivityBar -> atualiza badge no Problems icon
```

### 3.5 Problem Filter

O ProblemManager nao implementa filtragem nativa, mas o `findMarkers` aceita filtros arbitrarios:

```typescript
// Filtrar apenas erros
const errors = problemManager.findMarkers(
  m => m.data.severity === MarkerSeverity.Error
);

// Filtrar por source especifico
const tsErrors = problemManager.findMarkers(
  m => m.data.source === 'typescript' && m.data.severity >= MarkerSeverity.Warning
);

// Filtrar por URI (prefixo)
const srcErrors = problemManager.findMarkers(
  m => m.uri.toString().startsWith('file:///project/src/')
);
```

### 3.6 ProblemManager como Servico Central

ProblemManager e singleton e singleton-scoped no container Inversify. Todas as fontes de diagnosticos (LSP clients, task runners, build systems) convergem para ele.

```
          +-- LSP Language Client (TS Server)
          |
          +-- LSP Language Client (ESLint Server)
          |
Source ---+-- Build Task Runner (tsc output parser) ---> ProblemManager
          |
          +-- Extension API (theia.diagnostic API)
          |
          +-- Custom linter integration

Sources independentes, cada uma com seu proprio `owner` string.
```

---

## 4. Problem Widget

### 4.1 Arquitetura do Widget

ProblemWidget e um TreeWidget localizado no bottom panel. Ele exibe os problemas coletados pelo ProblemManager em uma arvore hierarquica.

```
+------------------------------------------------------------------+
| PROBLEMS                                                          |
| +----+--------------------------------------+----+------+------+ |
| | [] | Filter problems                      | ^  |  x  |  oo  | |
| +----+--------------------------------------+----+------+------+ |
|                                                                    |
|  FILE NODES (agrupados por arquivo)                                |
|  +--------------------------------------------------------------+ |
|  | src/app.ts (5 problems)                                      | |
|  |   +-- [Error] Cannot find name 'foo'. (ts:2304)             | |
|  |   +-- [Warning] Variable 'x' is unused. (ts:6133)           | |
|  |   +-- [Info] Type is trivially inferred. (ts:7027)         | |
|  | src/utils.ts (2 problems)                                    | |
|  |   +-- [Error] Property 'bar' does not exist on type. (ts:2339) | |
|  |   +-- [Error] Argument of type 'X' is not assignable. (ts:2345)| |
|  | src/types.ts (1 problem)                                     | |
|  |   +-- [Hint] Variable 'unused' is never read. (ts:6133)     | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  STATUS BAR:                                                       |
|  | Errors: 3 | Warnings: 1 | Infos: 1 | Hints: 1 |              |
+------------------------------------------------------------------+
```

### 4.2 Hierarquia de Nos

```
ProblemWidget (TreeWidget)
  |
  +-- ProblemTree (Tree)
       |
       +-- ProblemFileNode (para cada URI com problemas)
       |    +-- label: nome do arquivo
       |    +-- uri: URI do arquivo
       |    +-- statistic: { errors, warnings, infos }
       |    +-- children: ProblemContainerNode[]
       |         |
       |         +-- ProblemContainerNode (por severity group)
       |         |    +-- severity: MarkerSeverity
       |         |    +-- label: "errors" | "warnings" | "infos" | "hints"
       |         |    +-- children: ProblemMarkerNode[]
       |         |
       |         +-- ProblemMarkerNode (cada problema individual)
       |              +-- marker: Marker<Diagnostic>
       |              +-- line: diagnostic.range.start.line
       |              +-- column: diagnostic.range.start.character
       |              +-- message: diagnostic.message
       |              +-- code: diagnostic.code
       |              +-- source: diagnostic.source
```

### 4.3 Problem Grouping e Sorting

#### Grouping

O ProblemWidget agrupa problemas em dois niveis:

1. **File level:** todos os problemas do mesmo arquivo sob um no file
2. **Severity level:** dentro do arquivo, agrupados por severidade (errors, warnings, infos, hints)

O grouping e controlado pelo `ProblemTreeModel`:

```typescript
export class ProblemTreeModel extends TreeModelImpl {
  protected groupProblems(problems: Marker<Diagnostic>[]): ProblemFileNode[] {
    // 1. Agrupa por URI
    const byUri = new Map<string, Marker<Diagnostic>[]>();
    for (const p of problems) {
      const key = p.uri.toString();
      if (!byUri.has(key)) byUri.set(key, []);
      byUri.get(key)!.push(p);
    }

    // 2. Para cada URI, cria ProblemFileNode
    const fileNodes: ProblemFileNode[] = [];
    for (const [uri, markers] of byUri) {
      fileNodes.push(this.createFileNode(new URI(uri), markers));
    }

    // 3. Ordena arquivos por contagem de erros (decrescente), depois nome
    fileNodes.sort((a, b) => {
      const errDiff = b.statistic.errors - a.statistic.errors;
      if (errDiff !== 0) return errDiff;
      return a.label.localeCompare(b.label);
    });

    return fileNodes;
  }
}
```

#### Sorting por Severidade

Dentro de cada arquivo, os problemas sao ordenados por severidade:

```typescript
const severityOrder: { [key: number]: number } = {
  [MarkerSeverity.Error]: 0,
  [MarkerSeverity.Warning]: 1,
  [MarkerSeverity.Info]: 2,
  [MarkerSeverity.Hint]: 3,
};

markers.sort((a, b) => {
  const sevA = severityOrder[a.data.severity] ?? 99;
  const sevB = severityOrder[b.data.severity] ?? 99;
  if (sevA !== sevB) return sevA - sevB;
  // Mesma severidade: ordena por linha
  const lineA = a.data.range.start.line;
  const lineB = b.data.range.start.line;
  if (lineA !== lineB) return lineA - lineB;
  // Mesma linha: ordena por character
  return a.data.range.start.character - b.data.range.start.character;
});
```

### 4.4 Problem Quickfix Actions

Problemas com `codeActions` associados ganham uma acao de "quick fix" no context menu ou ao clicar no icone de lampada.

```typescript
export class ProblemWidget extends TreeWidget {
  protected createNodeElement(node: TreeNode): HTMLElement {
    const element = super.createNodeElement(node);

    if (ProblemMarkerNode.is(node) && node.marker.data.codeActions?.length) {
      // Adiciona botao de quick fix
      const fixButton = document.createElement('span');
      fixButton.className = 'theia-quick-fix';
      fixButton.title = 'Quick fix available';
      fixButton.onclick = () => this.showQuickFixes(node.marker);
      element.appendChild(fixButton);
    }

    return element;
  }

  protected async showQuickFixes(marker: Marker<Diagnostic>): Promise<void> {
    // Obtem code actions do LSP para este diagnostico
    const codeActions = await this.lspClient.getCodeActions(
      marker.uri,
      marker.data.range,
      { diagnostics: [marker.data] }
    );

    // Mostra menu com as acoes disponiveis
    this.contextMenuRenderer.render({
      menuPath: ['problem_quickfix'],
      args: codeActions,
      anchor: this.getQuickFixPosition(marker),
    });
  }
}
```

### 4.5 Problem Auto-Reveal

Quando o usuario clica em um problema, o editor automaticamente navega para a linha correspondente:

```typescript
export class ProblemWidget extends TreeWidget {
  protected handleClickEvent(node: TreeNode, event: DOMEvent): void {
    if (ProblemMarkerNode.is(node)) {
      const { uri, data } = node.marker;
      this.editorManager.open(uri, {
        selection: {
          start: {
            line: data.range.start.line,
            character: data.range.start.character,
          },
          end: {
            line: data.range.end.line,
            character: data.range.end.character,
          },
        },
      });
    }
  }
}
```

### 4.6 Problem Decorations in Navigator

O ProblemWidget nao decora o navigator diretamente — isso e feito pelo MarkerDecorator (secao 6). Mas o ProblemWidget fornece dados que o decorator consome.

---

## 5. Problem Severity System

### 5.1 Severity Levels

O Theia usa 4 niveis de severidade, mapeados diretamente do LSP:

```typescript
export enum MarkerSeverity {
  Error = 1,
  Warning = 2,
  Info = 3,
  Hint = 4,
}
```

| Level | Valor | LSP Equivalente | Acao Esperada |
|---|---|---|---|
| Error | 1 | DiagnosticSeverity.Error | Impede compilacao/execucao, requer correcao |
| Warning | 2 | DiagnosticSeverity.Warning | Problema potencial, deve ser revisado |
| Info | 3 | DiagnosticSeverity.Information | Informacao suplementar, nao requer acao |
| Hint | 4 | DiagnosticSeverity.Hint | Sugestao de melhoria ou estilo |

### 5.2 Severity Mapping Functions

```typescript
export namespace MarkerSeverity {
  export function fromLSP(severity: number): MarkerSeverity {
    switch (severity) {
      case 1: return MarkerSeverity.Error;
      case 2: return MarkerSeverity.Warning;
      case 3: return MarkerSeverity.Info;
      case 4: return MarkerSeverity.Hint;
      default: return MarkerSeverity.Info;
    }
  }

  export function toLSP(severity: MarkerSeverity): number {
    return severity;
  }

  export function toString(severity: MarkerSeverity): string {
    switch (severity) {
      case MarkerSeverity.Error: return 'Error';
      case MarkerSeverity.Warning: return 'Warning';
      case MarkerSeverity.Info: return 'Info';
      case MarkerSeverity.Hint: return 'Hint';
      default: return 'Unknown';
    }
  }
}
```

### 5.3 Severity Icons

Cada severidade tem um icone CSS-class baseado em codicon:

```typescript
export namespace MarkerSeverityIcon {
  export function getIcon(severity: MarkerSeverity): string {
    switch (severity) {
      case MarkerSeverity.Error: return 'codicon-error';
      case MarkerSeverity.Warning: return 'codicon-warning';
      case MarkerSeverity.Info: return 'codicon-info';
      case MarkerSeverity.Hint: return 'codicon-light-bulb';
    }
  }

  export function getColor(severity: MarkerSeverity): string {
    switch (severity) {
      case MarkerSeverity.Error: return 'var(--theia-editorError-foreground)';
      case MarkerSeverity.Warning: return 'var(--theia-editorWarning-foreground)';
      case MarkerSeverity.Info: return 'var(--theia-editorInfo-foreground)';
      case MarkerSeverity.Hint: return 'var(--theia-editorHint-foreground)';
    }
  }
}
```

### 5.4 Severity Color Coding

| Severity | Variavel CSS | Cor Tipica | Uso |
|---|---|---|---|
| Error | `--theia-editorError-foreground` | Vermelho (#F14C4C) | Squiggly line, gutter indicator, badge |
| Warning | `--theia-editorWarning-foreground` | Amarelo (#CCA700) | Squiggly line, gutter indicator, badge |
| Info | `--theia-editorInfo-foreground` | Azul (#3794FF) | Squiggly line, gutter indicator |
| Hint | `--theia-editorHint-foreground` | Verde (#6A9955) | Dotted squiggly line, bulb icon |

### 5.5 Severity-based Filtering

O ProblemWidget implementa filtro por severidade no toolbar:

```typescript
export class ProblemWidget extends TreeWidget {
  protected severityFilter: MarkerSeverity[] = [
    MarkerSeverity.Error,
    MarkerSeverity.Warning,
    MarkerSeverity.Info,
    MarkerSeverity.Hint,
  ];

  protected createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'theia-problems-toolbar';

    // Botoes de toggle para cada severidade
    for (const sev of [MarkerSeverity.Error, MarkerSeverity.Warning, MarkerSeverity.Info, MarkerSeverity.Hint]) {
      const btn = document.createElement('button');
      btn.className = `theia-problems-filter severity-${MarkerSeverity.toString(sev).toLowerCase()}`;
      btn.title = `Toggle ${MarkerSeverity.toString(sev)} visibility`;
      btn.onclick = () => this.toggleSeverityFilter(sev);
      toolbar.appendChild(btn);
    }

    return toolbar;
  }

  protected toggleSeverityFilter(severity: MarkerSeverity): void {
    const idx = this.severityFilter.indexOf(severity);
    if (idx >= 0) {
      this.severityFilter.splice(idx, 1);
    } else {
      this.severityFilter.push(severity);
    }
    this.refreshModel();
  }
}
```

---

## 6. Marker Decorator

### 6.1 MarkerDecorator Interface

MarkerDecorator e uma interface que permite a extensoes contribuirem com decoracoes no navigator e no editor baseadas em markers.

```typescript
export interface MarkerDecorator {
  readonly id: string;
  decorate(uris: URI[]): Promise<MarkerDecoration[]>;
}

export interface MarkerDecoration {
  uri: URI;
  // Dados para o navigator
  icon?: string;
  color?: string;
  tooltip?: string;
  badge?: number;
  // Dados para o editor
  range?: Range;
  className?: string;
  hoverMessage?: string;
  overviewRulerColor?: string;
  overviewRulerLane?: OverviewRulerLane;
  gutterIcon?: string;
  isWholeLine?: boolean;
  glyphMarginClassName?: string;
  glyphMarginHoverMessage?: string;
}

export enum OverviewRulerLane {
  Left = 1,
  Center = 2,
  Right = 4,
  Full = 7,
}
```

### 6.2 Decorator Registration

```typescript
// Registro no container DI
export default new ContainerModule(bind => {
  bind(MarkerDecorator).to(ProblemMarkerDecorator).inSingletonScope();
  bind(MarkerDecorator).to(CustomTaskDecorator).inSingletonScope();
  bind(ContributionProvider).toDynamicValue(ctx =>
    ctx.container.getTagged(ContributionProvider, MarkerDecorator)
  );
});

// Registrar no frontend contribution
@injectable()
export class ProblemMarkerDecorator implements MarkerDecorator {
  readonly id = 'problem-decorator';

  constructor(
    @inject(ProblemManager) protected readonly problemManager: ProblemManager,
  ) {}

  async decorate(uris: URI[]): Promise<MarkerDecoration[]> {
    const decorations: MarkerDecoration[] = [];

    for (const uri of uris) {
      const markers = this.problemManager.findMarkers(m => m.uri.toString() === uri.toString());
      if (markers.length === 0) continue;

      // Contagem por severidade
      const errors = markers.filter(m => m.data.severity === MarkerSeverity.Error).length;
      const warnings = markers.filter(m => m.data.severity === MarkerSeverity.Warning).length;

      decorations.push({
        uri,
        // Navigator decoration
        color: errors > 0 ? 'var(--theia-editorError-foreground)' :
               warnings > 0 ? 'var(--theia-editorWarning-foreground)' : undefined,
        tooltip: `${errors} errors, ${warnings} warnings`,
        badge: errors + warnings,
        icon: errors > 0 ? 'codicon-error' :
              warnings > 0 ? 'codicon-warning' : undefined,
      });
    }

    return decorations;
  }
}
```

### 6.3 Navigator Decorations

O decorator de markers e consumido pelo `NavigatorDecoratorService` para adicionar indicadores visuais no file explorer:

```
EXPLORER
  +-- src/                        (no decoration)
  +-- app.ts                      [ICON: codicon-error, COLOR: red, BADGE: 5]
  +-- utils.ts                    [ICON: codicon-warning, COLOR: yellow, BADGE: 2]
  +-- types.ts                    (no decoration — 1 hint only)
```

Cada arquivo no navigator mostra:
- **ICON:** substitui o icone padrao pelo icone de erro/warning se houver problemas
- **COLOR:** cor do label baseada na severidade maxima
- **BADGE:** contagem de problemas (erros + warnings) ao lado do nome

### 6.4 Editor Decorations

No editor Monaco, os markers sao convertidos em decorations:

```typescript
export class EditorMarkerDecorator implements MarkerDecorator {
  readonly id = 'editor-marker-decorator';
  private decorationIds = new Map<string, string[]>();

  async decorate(uris: URI[]): Promise<MarkerDecoration[]> {
    const decorations: MarkerDecoration[] = [];
    const decorationsByUri = new Map<string, MarkerDecoration[]>();

    // Agrupa por URI
    for (const uri of uris) {
      const markers = this.problemManager.getMarkersByOwner(uri, this.owner);
      for (const marker of markers) {
        const diagnostic = marker.data;
        const sev = diagnostic.severity;

        decorationsByUri.set(uri.toString(), [
          ...(decorationsByUri.get(uri.toString()) || []),
          {
            uri,
            range: diagnostic.range,
            className: this.getSeverityClassName(sev),
            overviewRulerColor: MarkerSeverityIcon.getColor(sev),
            overviewRulerLane: OverviewRulerLane.Right,
            gutterIcon: this.getGutterIcon(sev),
            hoverMessage: {
              value: `**${MarkerSeverity.toString(sev)}** [${diagnostic.source || ''}]: ${diagnostic.message}`,
              isTrusted: true,
            },
          },
        ]);
      }
    }

    return Array.from(decorationsByUri.values()).flat();
  }

  private getSeverityClassName(severity: MarkerSeverity): string {
    switch (severity) {
      case MarkerSeverity.Error: return 'editor-error-squiggly';
      case MarkerSeverity.Warning: return 'editor-warning-squiggly';
      case MarkerSeverity.Info: return 'editor-info-squiggly';
      case MarkerSeverity.Hint: return 'editor-hint-squiggly';
    }
  }
}
```

#### Tipos de Decoracao no Editor

| Tipo | Descricao | Severidade |
|---|---|---|
| Squiggly line | Linha ondulada abaixo do texto | Error (vermelha), Warning (amarela), Info (azul), Hint (verde pontilhada) |
| Gutter indicator | Margem esquerda do editor | Error (quadrado vermelho), Warning (triangulo amarelo) |
| Overview ruler | Margem direita (minimap-like) | Barrinha colorida na posicao do problema |
| Glyph margin | Margem de icones (esquerda) | Quick action light bulb se code actions disponiveis |

### 6.5 Decorator Provider Priority

Multiplos decorators podem ser registrados. O sistema de contribuicao usa `ContributionProvider` para ordena-los por prioridade:

```typescript
export const MarkerDecorator = Symbol('MarkerDecorator');

// Os decorators sao coletados via contribution provider
@injectable()
export class MarkerDecoratorService {
  constructor(
    @inject(ContributionProvider) @named(MarkerDecorator)
    protected readonly decorators: ContributionProvider<MarkerDecorator>,
  ) {}

  async getDecorations(uris: URI[]): Promise<Map<string, MarkerDecoration[]>> {
    const result = new Map<string, MarkerDecoration[]>();

    for (const decorator of this.decorators.getContributions()) {
      const decorations = await decorator.decorate(uris);
      for (const dec of decorations) {
        const key = dec.uri.toString();
        if (!result.has(key)) result.set(key, []);
        result.get(key)!.push(dec);
      }
    }

    return result;
  }
}
```

---

## 7. Output Channel

### 7.1 OutputChannel Interface

OutputChannel e um canal nomeado para saida textual de extensoes, processos em background e logs.

```typescript
export interface OutputChannel {
  // Nome unico do canal
  readonly name: string;

  // Append operations
  append(value: string): void;
  appendLine(value: string): void;
  appendLineWithoutTimestamp(value: string): void;

  // Replace todo o conteudo
  replace(value: string): void;

  // Clear todo o conteudo
  clear(): void;

  // Show/Hide o canal no OutputWidget
  show(preserveFocus?: boolean): void;
  hide(): void;

  // Dispose — libera recursos
  dispose(): void;

  // Propriedades de estado
  readonly content: string;
  readonly visible: boolean;
}
```

### 7.2 OutputChannelManager

OutputChannelManager e o servico central que gerencia todos os OutputChannels.

```typescript
export class OutputChannelManager {
  // Cria ou obtem um canal pelo nome
  getChannel(name: string): OutputChannel;

  // Deleta um canal
  deleteChannel(name: string): void;

  // Lista todos os canais
  getChannels(): OutputChannel[];

  // Canal ativo no momento
  readonly selectedChannel: OutputChannel | undefined;

  // Eventos
  readonly onChannelAdded: Event<OutputChannel>;
  readonly onChannelDeleted: Event<OutputChannel>;
  readonly onSelectedChannelChanged: Event<OutputChannel | undefined>;
  readonly onContentChanged: Event<void>;

  // Persistencia
  saveChannels(): void;
  restoreChannels(): void;
}
```

### 7.3 Channel Creation and Lifecycle

```
OutputChannelManager.getChannel('My Extension')
       |
       v
  Existe canal com nome 'My Extension'?
       |
       +-- Sim -> retorna o existente
       |
       +-- Nao -> cria novo DefaultOutputChannel
            |    name = 'My Extension'
            |    content = ''
            |    visible = false
            |    disposed = false
            |
            v
       Dispara onChannelAdded
       |
       v
       Registra no OutputWidget
       |
       v
       Adiciona ao selector de canais
```

### 7.4 Channel Text Operations

```typescript
// DefaultOutputChannel implementation

append(value: string): void {
  this.content += value;
  this.fireContentChanged();
}

appendLine(value: string): void {
  this.append(value + '\n');
}

appendLineWithoutTimestamp(value: string): void {
  this.appendLine(value);
  // Sem timestamp — usado para output raw de processos
}

replace(value: string): void {
  this.content = value;
  this.fireContentChanged();
}

clear(): void {
  this.content = '';
  this.fireContentChanged();
}
```

### 7.5 Channel Show/Hide

```typescript
show(preserveFocus: boolean = false): void {
  this.visible = true;
  // 1. Seleciona este canal no OutputWidget
  this.outputChannelManager.selectedChannel = this;
  // 2. Abre o OutputWidget no bottom panel se nao estiver visivel
  this.shell.revealWidget(OutputWidget.ID);
  // 3. Foca ou nao no widget
  if (!preserveFocus) {
    this.shell.activateWidget(OutputWidget.ID);
  }
}

hide(): void {
  this.visible = false;
  // Esconde o OutputWidget se este for o canal ativo
  if (this.outputChannelManager.selectedChannel === this) {
    this.shell.hideWidget(OutputWidget.ID);
  }
}
```

### 7.6 Channel Content Persistence

O OutputChannelManager persiste o conteudo dos canais entre sessoes usando o `StorageService` do Theia:

```typescript
// Salvando canais ao fechar workspace
async saveChannels(): Promise<void> {
  const data: { [name: string]: string } = {};
  for (const channel of this.channels.values()) {
    // Apenas canais com marcacao de persistencia
    if (channel.persist) {
      data[channel.name] = channel.content;
    }
  }
  await this.storageService.setData('output-channels', data);
}

// Restaurando canais ao abrir workspace
async restoreChannels(): Promise<void> {
  const data = await this.storageService.getData<{ [name: string]: string }>('output-channels', {});
  for (const [name, content] of Object.entries(data)) {
    const channel = this.getChannel(name);
    channel.replace(content);
  }
}
```

### 7.7 Channel Naming Conventions

```
Convencao: '<source>: <name>'

Exemplos:
  - 'Log: Extension Host'
  - 'Tasks: Build'
  - 'Tasks: Watch'
  - 'LSP: TypeScript'
  - 'LSP: ESLint'
  - 'Debug: My App'
  - 'Git: Output'
  - 'IDEIA: Agent Runner'
```

---

## 8. Output Widget

### 8.1 OutputWidget Architecture

OutputWidget e um TreeWidget (assim como ProblemWidget) localizado no bottom panel. Ele exibe o conteudo do canal de saida selecionado.

```
+------------------------------------------------------------------+
| OUTPUT                                                            |
| +-------+------------+------------+-----+----+------+----------+ |
| | [Log: | Extension] |            | [X] | ^  |  v  | Clear   | |
| +-------+------------+------------+-----+----+------+----------+ |
|                                                                    |
|  [2026-07-22 10:30:15] [info] Extension host started              |
|  [2026-07-22 10:30:16] [info] Activating extension 'my-ext'      |
|  [2026-07-22 10:30:17] [info] Extension 'my-ext' activated       |
|  [2026-07-22 10:30:20] [warn] Deprecated API used: onDidChange   |
|  [2026-07-22 10:30:25] [info] Task 'Build' started               |
|  > Building project...                                              |
|  > tsc --noEmit                                                    |
|  > Found 3 errors in 2 files                                        |
|  [2026-07-22 10:30:30] [error] Build failed with 3 errors         |
|  > src/app.ts:12:5 - error TS2304: Cannot find name 'foo'         |
|  > src/utils.ts:45:10 - error TS2339: Property 'bar'...           |
+------------------------------------------------------------------+
```

### 8.2 Output Rendering

```typescript
export class OutputWidget extends TreeWidget {
  // Canal atualmente selecionado
  protected currentChannel: OutputChannel | undefined;

  // Noh raiz da arvore (contem linhas de texto como nos filhos)
  protected root: CompositeTreeNode;

  protected renderOutputLine(line: string): HTMLElement {
    const element = document.createElement('div');
    element.className = 'theia-output-line';

    // Suporte a ANSI escape codes
    if (this.enableAnsiSupport) {
      element.innerHTML = this.ansiProcessor.process(line);
    } else {
      element.textContent = line;
    }

    return element;
  }

  protected updateContent(): void {
    // Limpa nos atuais
    this.root.children = [];

    // Adiciona cada linha como um noh folha
    const lines = this.currentChannel?.content.split('\n') || [];
    for (const line of lines) {
      this.root.children.push({
        id: `line-${lineIndex++}`,
        lineText: line,
        parent: this.root,
        visible: true,
      } as OutputLineNode);
    }

    // Auto-scroll para o final se habilitado
    if (this.autoScroll) {
      this.scrollToEnd();
    }

    this.refresh();
  }
}
```

### 8.3 ANSI Escape Code Support

O OutputWidget pode processar ANSI escape codes para colorizacao:

```typescript
@injectable()
export class AnsiProcessor {
  // Mapeamento ANSI -> CSS class
  private static readonly ansiMap: { [code: number]: string } = {
    30: 'ansi-black', 31: 'ansi-red', 32: 'ansi-green',
    33: 'ansi-yellow', 34: 'ansi-blue', 35: 'ansi-magenta',
    36: 'ansi-cyan', 37: 'ansi-white',
    90: 'ansi-bright-black', 91: 'ansi-bright-red',
    92: 'ansi-bright-green', 93: 'ansi-bright-yellow',
    94: 'ansi-bright-blue', 95: 'ansi-bright-magenta',
    96: 'ansi-bright-cyan', 97: 'ansi-bright-white',
    1: 'ansi-bold', 3: 'ansi-italic', 4: 'ansi-underline',
  };

  process(text: string): string {
    // Substitui \e[<codes>m por spans com CSS classes
    // \e[31mHello\e[0m -> <span class="ansi-red">Hello</span>
    return text.replace(/\x1b\[([0-9;]*)m/g, (match, codes) => {
      const parts = codes.split(';').map(Number);
      if (parts.length === 1 && parts[0] === 0) return '</span>';
      const classes = parts
        .map(c => AnsiProcessor.ansiMap[c])
        .filter(Boolean)
        .join(' ');
      return `<span class="${classes}">`;
    });
  }
}
```

### 8.4 Output Search

O OutputWidget implementa busca no conteudo do canal:

```typescript
export class OutputWidget extends TreeWidget {
  protected searchTerm: string = '';
  protected searchMatches: number[] = [];
  protected currentMatchIndex: number = -1;

  protected performSearch(term: string): void {
    this.searchTerm = term;
    this.searchMatches = [];

    if (!term) {
      this.clearSearchHighlights();
      return;
    }

    const content = this.currentChannel?.content || '';
    let idx = 0;
    while (true) {
      idx = content.indexOf(term, idx);
      if (idx === -1) break;
      this.searchMatches.push(idx);
      idx += term.length;
    }

    this.highlightMatches();
  }

  protected highlightMatches(): void {
    // Aplica classe 'search-highlight' nas ocorrencias
    // Atualiza contador: "3 of 15 matches"
    // Navega entre resultados com F3 / Shift+F3
  }
}
```

### 8.5 Output Auto-Scroll

Auto-scroll controla se o widget deve rolar automaticamente para o final quando novo conteudo e adicionado:

```typescript
export class OutputWidget extends TreeWidget {
  protected _autoScroll: boolean = true;

  get autoScroll(): boolean {
    return this._autoScroll;
  }

  set autoScroll(value: boolean) {
    this._autoScroll = value;
    if (value) {
      this.scrollToEnd();
    }
  }

  protected scrollToEnd(): void {
    // Rola para o final do container
    requestAnimationFrame(() => {
      this.node.scrollTop = this.node.scrollHeight;
    });
  }

  // Desabilita auto-scroll se usuario scrollou para cima manualmente
  protected onScroll(): void {
    const isAtBottom = this.node.scrollHeight - this.node.scrollTop <= this.node.clientHeight + 10;
    if (!isAtBottom) {
      this._autoScroll = false;
    }
  }
}
```

### 8.6 Output Clear

```typescript
export class OutputWidget extends TreeWidget {
  protected createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'theia-output-toolbar';

    // Channel selector (dropdown)
    const selector = this.createChannelSelector();
    toolbar.appendChild(selector);

    // Search input
    const searchInput = this.createSearchInput();
    toolbar.appendChild(searchInput);

    // Auto-scroll toggle
    const autoScrollBtn = this.createAutoScrollButton();
    toolbar.appendChild(autoScrollBtn);

    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'theia-output-clear';
    clearBtn.title = 'Clear output';
    clearBtn.onclick = () => this.currentChannel?.clear();
    toolbar.appendChild(clearBtn);

    return toolbar;
  }
}
```

### 8.7 Channel Selector

Dropdown que lista todos os canais registrados e permite alternar entre eles:

```typescript
export class OutputWidget extends TreeWidget {
  protected createChannelSelector(): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'theia-output-channel-selector';

    // Popula com canais existentes
    for (const channel of this.channelManager.getChannels()) {
      const option = document.createElement('option');
      option.value = channel.name;
      option.textContent = channel.name;
      select.appendChild(option);
    }

    // Seleciona canal ativo
    if (this.channelManager.selectedChannel) {
      select.value = this.channelManager.selectedChannel.name;
    }

    // Troca de canal
    select.onchange = () => {
      const channel = this.channelManager.getChannel(select.value);
      this.channelManager.selectedChannel = channel;
      this.updateContent();
    };

    return select;
  }
}
```

---

## 9. Console Service

### 9.1 ConsoleService

O ConsoleService fornece um mecanismo de log estruturado inspirado no console do navegador. E usado primariamente para logging de desenvolvimento e diagnostico.

```typescript
export interface ConsoleService {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  log(level: ConsoleLevel, message: string, ...args: any[]): void;

  // Evento para capturar mensagens
  readonly onMessage: Event<ConsoleMessage>;

  // Nivel minimo para exibicao
  level: ConsoleLevel;

  // Historico de mensagens
  readonly messages: ConsoleMessage[];
  clear(): void;
}

export type ConsoleLevel = 'info' | 'warn' | 'error' | 'debug';

export interface ConsoleMessage {
  level: ConsoleLevel;
  message: string;
  args: any[];
  timestamp: number;
  source?: string;
}
```

### 9.2 Console Logger

O ConsoleLogger implementa a interface do ConsoleService e tambem faz output no console do navegador:

```typescript
@injectable()
export class ConsoleLogger implements ConsoleService {
  protected _messages: ConsoleMessage[] = [];
  protected _level: ConsoleLevel = 'info';
  protected readonly onMessageEmitter = new Emitter<ConsoleMessage>();

  readonly onMessage = this.onMessageEmitter.event;

  get messages(): ConsoleMessage[] {
    return [...this._messages];
  }

  get level(): ConsoleLevel {
    return this._level;
  }

  set level(level: ConsoleLevel) {
    this._level = level;
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, ...args);
    }
  }

  log(level: ConsoleLevel, message: string, ...args: any[]): void {
    const entry: ConsoleMessage = {
      level,
      message,
      args,
      timestamp: Date.now(),
    };

    this._messages.push(entry);
    this.onMessageEmitter.fire(entry);

    // Tambem faz output no browser console
    const consoleMethod = console[level] || console.log;
    consoleMethod(`[IDEIA] ${message}`, ...args);
  }

  clear(): void {
    this._messages = [];
  }

  protected shouldLog(level: ConsoleLevel): boolean {
    const order: ConsoleLevel[] = ['debug', 'info', 'warn', 'error'];
    return order.indexOf(level) >= order.indexOf(this._level);
  }
}
```

### 9.3 Console Output Level

O console tem niveis configurados via preferencias:

```typescript
// Preferencia: 'console.logLevel'
// Valores: 'debug' | 'info' | 'warn' | 'error'
// Default: 'info'

@injectable()
export class ConsoleService {
  @postConstruct()
  protected init(): void {
    this.preferences.onPreferenceChanged(e => {
      if (e.preferenceName === 'console.logLevel') {
        this.level = e.newValue as ConsoleLevel;
      }
    });
  }
}

// Ordem de severidade:
// debug (0) < info (1) < warn (2) < error (3)
// Se level = 'warn', apenas 'warn' e 'error' sao exibidos
```

### 9.4 Console Format

```typescript
// Formato padrao de saida:
// [TIMESTAMP] [LEVEL] [SOURCE] MESSAGE

export function formatConsoleMessage(msg: ConsoleMessage): string {
  const ts = new Date(msg.timestamp).toISOString();
  const source = msg.source ? ` [${msg.source}]` : '';
  return `[${ts}] [${msg.level.toUpperCase()}]${source} ${msg.message}`;
}

// Exemplo:
// [2026-07-22T10:30:15.123Z] [INFO] [ExtensionHost] Activating extension 'my-ext'
// [2026-07-22T10:30:15.456Z] [WARN] [LSP] Server returned unexpected response
// [2026-07-22T10:30:15.789Z] [ERROR] [Runtime] Uncaught exception: TypeError: ...
```

### 9.5 Console History

O console mantem um historico circular de mensagens:

```typescript
export class ConsoleLogger implements ConsoleService {
  private static readonly MAX_HISTORY = 1000;

  log(level: ConsoleLevel, message: string, ...args: any[]): void {
    const entry: ConsoleMessage = {
      level, message, args, timestamp: Date.now(),
    };

    this._messages.push(entry);

    // Trunca historico se exceder limite
    if (this._messages.length > ConsoleLogger.MAX_HISTORY) {
      this._messages = this._messages.slice(-ConsoleLogger.MAX_HISTORY);
    }

    this.onMessageEmitter.fire(entry);
  }
}
```

---

## 10. Notifications & Message Service

### 10.1 MessageService

MessageService e a principal API para mostrar notificacoes ao usuario. Ela oferece metodos para info, warn, error com suporte a acoes e progresso.

```typescript
export class MessageService {
  // Notificacoes simples
  info(message: string, options?: MessageOptions): Promise<string | undefined>;
  warn(message: string, options?: MessageOptions): Promise<string | undefined>;
  error(message: string, options?: MessageOptions): Promise<string | undefined>;

  // Notificacao com acoes (retorna a acao escolhida)
  info(message: string, actions: MessageAction[], options?: MessageOptions): Promise<string | undefined>;
  warn(message: string, actions: MessageAction[], options?: MessageOptions): Promise<string | undefined>;
  error(message: string, actions: MessageAction[], options?: MessageOptions): Promise<string | undefined>;

  // Progress notification
  showProgress(options: ProgressMessage): Promise<Progress>;

  // Eventos
  readonly onMessage: Event<Message>;
  readonly onProgress: Event<ProgressMessage>;
}

export interface MessageOptions {
  timeout?: number;      // Auto-dismiss em ms (0 = never)
  source?: string;       // Origem da notificacao
  group?: string;        // Agrupamento
  actions?: MessageAction[];
}

export interface MessageAction {
  label: string;
  run: () => void;
  className?: string;
}

export interface Message {
  text: string;
  type: MessageType;
  options?: MessageOptions;
  actions: MessageAction[];
  progress?: Progress;
  source?: string;
}

export enum MessageType {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Progress = 'progress',
}
```

### 10.2 Message Types

| Type | Metodo | Icone | Uso |
|---|---|---|---|
| Info | `MessageService.info()` | `codicon-info` | Informacoes gerais, confirmacoes |
| Warning | `MessageService.warn()` | `codicon-warning` | Avisos, situacoes de atencao |
| Error | `MessageService.error()` | `codicon-error` | Erros, falhas de operacao |
| Progress | `MessageService.showProgress()` | `codicon-loading` | Operacoes longas em andamento |

### 10.3 Message Actions

```typescript
// Notificacao com acoes
const result = await messageService.info(
  'File modified outside editor. Reload?',
  [
    { label: 'Reload', run: () => reloadFile() },
    { label: 'Keep mine', run: () => keepCurrent() },
    MessageAction.CANCEL,
  ],
  { timeout: 10000 }
);

// Resultado undefined = timeout ou dismiss
// Resultado 'Reload' | 'Keep mine' = acao escolhida
```

### 10.4 Message Modality

Notificacoes podem ser modais ou nao-modais:

```typescript
export interface MessageOptions {
  // Se true, bloqueia interacao com o workbench ate resposta
  modal?: boolean;

  // Se true, notificacao aparece como toast (nao-modal)
  toast?: boolean;

  // Tempo para auto-dismiss (ms)
  timeout?: number;
}

// Toast notification (nao-modal, desaparece apos timeout)
messageService.info('Build completed successfully', { timeout: 5000 });

// Modal dialog (bloqueia ate resposta)
messageService.warn('Are you sure you want to delete this file?', {
  modal: true,
});
```

### 10.5 Message Progress

```typescript
// Criando progress notification
const progress = await messageService.showProgress({
  text: 'Building project...',
  options: { cancelable: true },
});

// Atualizando progresso
let current = 0;
const interval = setInterval(() => {
  current += 10;
  progress.report({
    message: `Compiling... ${current}%`,
    work: { done: current, total: 100 },
  });

  if (current >= 100) {
    clearInterval(interval);
    progress.done();  // Finaliza
  }
}, 500);
```

### 10.6 Message Queue

Mensagens sao enfileiradas e exibidas em ordem para evitar sobrecarga:

```typescript
@injectable()
export class MessageService {
  private queue: QueuedMessage[] = [];
  private current: QueuedMessage | undefined;

  protected async processQueue(): Promise<void> {
    if (this.current) return; // Ja processando

    while (this.queue.length > 0) {
      this.current = this.queue.shift()!;

      // Exibe a notificacao
      const result = await this.showNotification(this.current);

      // Resolve a promise
      this.current.resolve(result);
      this.current = undefined;
    }
  }

  protected async showNotification(msg: QueuedMessage): Promise<string | undefined> {
    if (msg.options?.modal) {
      // Dialog modal
      return this.showModalDialog(msg);
    } else {
      // Toast notification
      return this.showToast(msg);
    }
  }
}
```

### 10.7 Notification Center

O notification center coleta todas as notificacoes em uma view centralizada, acessive pelo sino na status bar:

```
STATUS BAR:
  +---------------------------+-------+--------+-------------------+
  | cursor: 12:5             | main  | TS     | [BELL] (3 novas)  |
  +---------------------------+-------+--------+-------------------+

NOTIFICATION CENTER (ao clicar no sino):
  +-------------------------------------------------------------+
  | NOTIFICATIONS                         (3) Mark all as read  |
  |                                                              |
  | [Error]   Build failed — 2 min ago                           |
  |           src/app.ts:12: error TS2304: Cannot find name 'foo'|
  |                                                              |
  | [Warning] Deprecated API used — 5 min ago                    |
  |           Extension 'my-ext' uses deprecated onDidChange     |
  |                                                              |
  | [Info]    Build completed — 10 min ago                       |
  |           0 errors, 2 warnings                               |
  +-------------------------------------------------------------+
```

---

## 11. Notification System

### 11.1 NotificationManager

NotificationManager e o servico central de gerenciamento de notificacoes, responsavel por criar, agrupar, exibir e persistir notificacoes.

```typescript
export class NotificationManager {
  // Criar notificacao
  notify(notification: Notification): void;

  // Gerenciamento
  dismiss(notificationId: string): void;
  clearAll(): void;
  markAsRead(notificationId: string): void;
  markAllAsRead(): void;

  // Acesso
  getNotifications(): Notification[];
  getUnreadCount(): number;
  hasNotifications(): boolean;

  // Eventos
  readonly onNotificationAdded: Event<Notification>;
  readonly onNotificationDismissed: Event<Notification>;
  readonly onNotificationRead: Event<Notification>;
  readonly onUnreadCountChanged: Event<number>;

  // Preferencias
  readonly preferences: NotificationPreferences;
}

export interface Notification {
  id: string;
  message: string;
  type: MessageType;
  actions?: NotificationAction[];
  progress?: Progress;
  source?: string;
  timestamp: number;
  read: boolean;
  group?: string;
  data?: any;
}

export interface NotificationAction {
  label: string;
  run: () => void;
  className?: string;
}

export interface NotificationPreferences {
  showToast: boolean;
  showCenter: boolean;
  timeout: number;
  maxVisible: number;
  groupSimilar: boolean;
}
```

### 11.2 Notification Interface

```typescript
export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'progress';
  actions?: { label: string; run: () => void }[];
  progress?: {
    message?: string;
    work?: { done: number; total: number };
    cancelable?: boolean;
  };
  source?: string;
  timestamp: number;
  read: boolean;
  group?: string;
  data?: Record<string, unknown>;
}
```

### 11.3 Notification Toasts

Toasts sao notificacoes temporarias que aparecem no canto inferior direito:

```
+------------------------------------------------------------------+
|  +------------------------------------------------------------+  |
|  | [INFO] Build completed successfully                        |  |
|  | Build completed in 2.3s with 0 errors                      |  |
|  |                                           [Dismiss] [View] |  |
|  +------------------------------------------------------------+  |
|  | [WARN] Deprecated API used                                  |  |
|  | Extension 'my-ext' uses deprecated onDidChange              |  |
|  |                                            [Dismiss] [Fix]  |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

### 11.4 Notification Center Widget

O NotificationCenterWidget exibe todas as notificacoes em uma view dedicada:

```typescript
export class NotificationCenterWidget extends Widget {
  static readonly ID = 'notification-center';
  static readonly LABEL = 'Notifications';

  constructor(
    @inject(NotificationManager) protected manager: NotificationManager,
  ) {
    super();
    this.id = NotificationCenterWidget.ID;
    this.title.label = NotificationCenterWidget.LABEL;
    this.title.iconClass = 'codicon-bell';
  }

  protected render(): void {
    const notifications = this.manager.getNotifications();

    this.node.innerHTML = `
      <div class="notification-header">
        <span class="notification-title">NOTIFICATIONS</span>
        <span class="notification-count">(${notifications.length})</span>
        <button class="mark-all-read">Mark all as read</button>
      </div>
      <div class="notification-list">
        ${notifications.map(n => this.renderNotification(n)).join('')}
      </div>
    `;
  }

  protected renderNotification(n: Notification): string {
    const iconClass = this.getIconForType(n.type);
    const timeAgo = this.formatTimeAgo(n.timestamp);

    return `
      <div class="notification-item ${n.read ? 'read' : 'unread'}" data-id="${n.id}">
        <span class="notification-icon ${iconClass}"></span>
        <div class="notification-body">
          <div class="notification-message">${n.message}</div>
          <div class="notification-meta">
            <span class="notification-source">${n.source || ''}</span>
            <span class="notification-time">${timeAgo}</span>
          </div>
          ${n.actions ? this.renderActions(n.actions) : ''}
        </div>
        <button class="notification-dismiss" data-id="${n.id}">x</button>
      </div>
    `;
  }
}
```

### 11.5 Notification Grouping

Notificacoes similares sao agrupadas para evitar poluicao visual:

```typescript
export class NotificationManager {
  protected groupNotifications(): Notification[] {
    const groups = new Map<string, Notification[]>();

    for (const n of this.notifications) {
      const key = n.group || n.message;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(n);
    }

    const result: Notification[] = [];
    for (const [key, items] of groups) {
      if (items.length === 1) {
        result.push(items[0]);
      } else {
        // Notificacao agregada
        result.push({
          id: `group-${key}`,
          message: `${items[0].message} (${items.length} occurrences)`,
          type: items[0].type,
          timestamp: items[items.length - 1].timestamp,
          read: items.every(i => i.read),
          group: key,
          data: { count: items.length, notifications: items },
        });
      }
    }

    return result;
  }
}
```

### 11.6 Notification Dismiss

```typescript
export class NotificationManager {
  dismiss(notificationId: string): void {
    const idx = this.notifications.findIndex(n => n.id === notificationId);
    if (idx === -1) return;

    const notification = this.notifications[idx];
    this.notifications.splice(idx, 1);
    this.onNotificationDismissed.fire(notification);
    this.updateUnreadCount();
  }

  clearAll(): void {
    const dismissed = this.notifications.splice(0);
    for (const n of dismissed) {
      this.onNotificationDismissed.fire(n);
    }
    this.updateUnreadCount();
  }
}
```

### 11.7 Notification Preferences

```typescript
export interface NotificationPreferences {
  // Mostrar toast notifications
  showToasts: boolean;

  // Tempo de auto-dismiss (ms)
  toastTimeout: number;

  // Agrupar notificacoes similares
  groupSimilar: boolean;

  // Numero maximo de notificacoes no center
  maxNotifications: number;

  // Silenciar notificacoes durante foco no editor
  silenceWhileFocusing: boolean;
}

// Preferencias default:
const DEFAULT_PREFERENCES: NotificationPreferences = {
  showToasts: true,
  toastTimeout: 5000,
  groupSimilar: true,
  maxNotifications: 100,
  silenceWhileFocusing: true,
};
```

---

## 12. Dialog System

### 12.1 Dialog Class Hierarchy

```
Dialog (abstract base)
  +-- AbstractDialog<T> (generic, implements show/hide/accept/reject)
       +-- ConfirmDialog          — Yes/No/Cancel
       +-- MessageDialog          — OK/Cancel
       +-- InputDialog            — Text input
       +-- SingleSelectDialog     — Dropdown/List selection
       +-- ProgressDialog         — Progress bar
       +-- CustomDialog           — Custom content via widget
```

### 12.2 Dialog Base

```typescript
export abstract class Dialog<T> extends Widget {
  static readonly CANCEL = -1;  // Valor de retorno quando cancelado

  // Abre o dialogo e retorna resultado
  open(): Promise<T | undefined>;

  // Fecha o dialogo
  close(): void;

  // Aceita com valor
  accept(value: T): void;

  // Rejeita (cancela)
  reject(): void;

  // Eventos
  readonly onAccept: Event<{ value: T }>;
  readonly onReject: Event<void>;
  readonly onClose: Event<void>;
}
```

### 12.3 AbstractDialog

```typescript
export abstract class AbstractDialog<T> extends Dialog<T> {
  constructor(
    protected readonly title: string,
    protected readonly options?: DialogOptions,
  ) {
    super();
    this.addClass('theia-dialog');
  }

  // Metodos a serem implementados por subclasses
  protected abstract render(): void;
  protected abstract get acceptValue(): T;
  protected abstract get isValid(): boolean;
  protected validate(value: T): boolean;  // Opcional

  // Validacao em tempo real
  protected onValueChanged(): void {
    this.updateAcceptButton();
  }

  protected updateAcceptButton(): void {
    const acceptBtn = this.node.querySelector('.theia-dialog-accept') as HTMLButtonElement;
    if (acceptBtn) {
      acceptBtn.disabled = !this.isValid;
    }
  }
}

export interface DialogOptions {
  width?: number;
  height?: number;
  modal?: boolean;        // Bloqueia interacao com o workbench
  closable?: boolean;     // Permite fechar com X
  keyboardShortcuts?: boolean;  // Enter/Escape para accept/reject
}
```

### 12.4 Dialog Types

#### ConfirmDialog

```typescript
export class ConfirmDialog extends AbstractDialog<boolean> {
  constructor(
    @inject(MessageService) messageService: MessageService,
  ) {
    super('Confirm');
  }

  protected render(): void {
    this.node.innerHTML = `
      <div class="dialog-content">
        <p>${this.message}</p>
      </div>
      <div class="dialog-actions">
        <button class="theia-button secondary" data-action="cancel">Cancel</button>
        <button class="theia-button main" data-action="accept">Yes</button>
      </div>
    `;
  }

  get acceptValue(): boolean {
    return true;
  }

  get isValid(): boolean {
    return true;
  }
}
```

#### MessageDialog

```typescript
export class MessageDialog extends AbstractDialog<string | undefined> {
  constructor(
    protected readonly message: string,
    protected readonly type: MessageType,
    protected readonly actions: MessageAction[],
  ) {
    super(type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Information');
  }

  protected render(): void {
    const actionButtons = this.actions.map(a =>
      `<button class="theia-button" data-action="${a.label}">${a.label}</button>`
    ).join('');

    this.node.innerHTML = `
      <div class="dialog-content ${this.type}">
        <span class="codicon ${this.getIcon()}"></span>
        <p>${this.message}</p>
      </div>
      <div class="dialog-actions">
        ${actionButtons}
      </div>
    `;
  }

  private getIcon(): string {
    switch (this.type) {
      case 'error': return 'codicon-error';
      case 'warning': return 'codicon-warning';
      default: return 'codicon-info';
    }
  }
}
```

#### InputDialog

```typescript
export class InputDialog extends AbstractDialog<string | undefined> {
  private inputElement: HTMLInputElement;

  constructor(
    protected readonly prompt: string,
    protected readonly defaultValue?: string,
    protected readonly validateInput?: (value: string) => string | undefined,
  ) {
    super('Input');
  }

  protected render(): void {
    this.node.innerHTML = `
      <div class="dialog-content">
        <label for="dialog-input">${this.prompt}</label>
        <input id="dialog-input" type="text" value="${this.defaultValue || ''}" />
        <span class="dialog-validation-error"></span>
      </div>
      <div class="dialog-actions">
        <button class="theia-button secondary" data-action="cancel">Cancel</button>
        <button class="theia-button main" data-action="accept">OK</button>
      </div>
    `;

    this.inputElement = this.node.querySelector('#dialog-input')!;
    this.inputElement.oninput = () => this.onValueChanged();
    this.inputElement.focus();
  }

  get acceptValue(): string | undefined {
    return this.inputElement?.value;
  }

  get isValid(): boolean {
    const value = this.inputElement?.value;
    if (this.validateInput) {
      const error = this.validateInput(value || '');
      const errorEl = this.node.querySelector('.dialog-validation-error');
      if (errorEl) errorEl.textContent = error || '';
      return !error;
    }
    return !!value;
  }
}
```

#### SingleSelectDialog

```typescript
export class SingleSelectDialog<T> extends AbstractDialog<T | undefined> {
  private selectedIndex: number = -1;

  constructor(
    protected readonly items: { label: string; value: T }[],
    protected readonly placeholder?: string,
  ) {
    super('Select');
  }

  protected render(): void {
    const options = this.items.map((item, i) =>
      `<div class="dialog-select-item" data-index="${i}">
         <span class="select-item-label">${item.label}</span>
       </div>`
    ).join('');

    this.node.innerHTML = `
      <div class="dialog-content">
        <input class="dialog-select-filter" type="text" placeholder="${this.placeholder || 'Filter...'}" />
        <div class="dialog-select-list">${options}</div>
      </div>
    `;

    // Click handler para selecao
    this.node.querySelectorAll('.dialog-select-item').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedIndex = parseInt((el as HTMLElement).dataset.index!);
        this.accept(this.items[this.selectedIndex].value);
      });
    });
  }
}
```

#### ProgressDialog

```typescript
export class ProgressDialog extends AbstractDialog<void> {
  private progressBar: HTMLProgressElement;
  private messageElement: HTMLElement;

  constructor(
    protected readonly progressText: string,
    protected readonly cancelable: boolean,
  ) {
    super('Progress');
  }

  protected render(): void {
    this.node.innerHTML = `
      <div class="dialog-content">
        <p class="progress-message">${this.progressText}</p>
        <progress class="dialog-progress" max="100" value="0"></progress>
      </div>
      <div class="dialog-actions">
        ${this.cancelable ? '<button class="theia-button secondary" data-action="cancel">Cancel</button>' : ''}
      </div>
    `;

    this.progressBar = this.node.querySelector('.dialog-progress')!;
    this.messageElement = this.node.querySelector('.progress-message')!;
  }

  update(progress: { message?: string; work?: { done: number; total: number } }): void {
    if (progress.message) {
      this.messageElement.textContent = progress.message;
    }
    if (progress.work) {
      this.progressBar.value = (progress.work.done / progress.work.total) * 100;
    }
  }
}
```

### 12.5 Dialog Result Handling

```typescript
// Uso tipico
async function confirmDelete(filePath: string): Promise<boolean> {
  const dialog = new ConfirmDialog({
    title: 'Delete file',
    message: `Are you sure you want to delete "${filePath}"?`,
  });

  const result = await dialog.open();
  return result === true;  // true = Yes, undefined/false = Cancel
}

// Com acoes
async function showErrorWithActions(error: Error): Promise<void> {
  const dialog = new MessageDialog(
    error.message,
    'error',
    [
      { label: 'Show Details', run: () => showDetails(error) },
      { label: 'Dismiss', run: () => {} },
    ]
  );

  await dialog.open();
}
```

### 12.6 Dialog Validation

```typescript
// Validacao em tempo real no InputDialog
function validatePort(value: string): string | undefined {
  const port = parseInt(value, 10);
  if (isNaN(port)) return 'Please enter a number';
  if (port < 1 || port > 65535) return 'Port must be between 1 and 65535';
  if (port < 1024) return 'Ports below 1024 require admin privileges';
  return undefined; // Valid
}

const dialog = new InputDialog(
  'Enter port number:',
  '3000',
  validatePort,
);

const port = await dialog.open();
// Botao OK fica desabilitado enquanto validate retorna erro
```

### 12.7 Dialog Custom Content

```typescript
// Dialog com conteudo React customizado
export class CustomDialog extends AbstractDialog<any> {
  constructor(
    protected readonly widget: Widget,  // Qualquer BaseWidget
  ) {
    super('Custom Dialog');
  }

  protected render(): void {
    // Adiciona o widget customizado ao node do dialogo
    Widget.attach(this.widget, this.node);
  }
}

// Uso
const settingsWidget = new SettingsWidget();
const dialog = new CustomDialog(settingsWidget);
await dialog.open();
```

---

## 13. Code Examples

### 13.1 Custom MarkerManager Implementation

```typescript
import { MarkerManager, Marker, URI } from '@theia/markers';
import { injectable, inject } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core';

export interface BookmarkData {
  line: number;
  label: string;
  note?: string;
  createdAt: number;
  tags?: string[];
}

export const BOOKMARK_KIND = 'bookmark';

@injectable()
export class BookmarkManager extends MarkerManager<BookmarkData> {
  private readonly onBookmarkChangedEmitter = new Emitter<URI>();

  readonly onBookmarkChanged: Event<URI> = this.onBookmarkChangedEmitter.event;

  addBookmark(uri: URI, line: number, label: string, note?: string): void {
    const existing = this.findMarkers(
      m => m.uri.toString() === uri.toString()
        && m.data.line === line
        && m.kind === BOOKMARK_KIND
    );

    if (existing.length > 0) return; // Ja existe bookmark nesta linha

    const marker: Marker<BookmarkData> = {
      kind: BOOKMARK_KIND,
      uri,
      owner: 'ideia-bookmarks',
      data: {
        line,
        label,
        note,
        createdAt: Date.now(),
      },
    };

    const current = this.getMarkersByOwner(uri, 'ideia-bookmarks');
    this.setMarkers(uri, 'ideia-bookmarks', [...current, marker]);
  }

  removeBookmark(uri: URI, line: number): void {
    const current = this.getMarkersByOwner(uri, 'ideia-bookmarks');
    const filtered = current.filter(
      m => !(m.data.line === line && m.kind === BOOKMARK_KIND)
    );
    this.setMarkers(uri, 'ideia-bookmarks', filtered);
  }

  getBookmarksForFile(uri: URI): Marker<BookmarkData>[] {
    return this.findMarkers(
      m => m.uri.toString() === uri.toString()
        && m.kind === BOOKMARK_KIND
    );
  }

  getAllBookmarks(): Marker<BookmarkData>[] {
    return this.findMarkers(m => m.kind === BOOKMARK_KIND);
  }
}
```

### 13.2 ProblemWidget Custom Contribution

```typescript
import {
  ProblemWidget,
  ProblemFileNode,
  ProblemMarkerNode,
  ProblemTree,
  ProblemTreeModel,
} from '@theia/markers/lib/browser/problem';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { TreeWidget, TreeNode, CompositeTreeNode } from '@theia/core/lib/browser';
import { Marker } from '@theia/markers';
import { Diagnostic } from '@theia/core/shared/vscode-languageserver-types';

@injectable()
export class IdeiaProblemWidget extends ProblemWidget {
  static readonly ID = 'ideia-problems';

  @postConstruct()
  protected init(): void {
    this.id = IdeiaProblemWidget.ID;
    this.title.label = 'IDEIA Problems';
    this.title.iconClass = 'codicon-warning';
    this.title.caption = 'IDEIA Enhanced Problems';
  }

  protected renderFileNode(node: ProblemFileNode): HTMLElement {
    const container = document.createElement('div');
    container.className = 'ideia-problem-file';

    const icon = document.createElement('span');
    icon.className = `file-icon ${this.getFileIcon(node.uri)}`;
    container.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'file-label';
    label.textContent = node.label;
    container.appendChild(label);

    const stats = document.createElement('span');
    stats.className = 'file-stats';
    stats.textContent = `${node.statistic.errors}E ${node.statistic.warnings}W`;
    container.appendChild(stats);

    return container;
  }

  protected getFileIcon(uri: URI): string {
    const ext = uri.path.ext;
    switch (ext) {
      case '.ts': return 'typescript-icon';
      case '.tsx': return 'typescript-icon';
      case '.js': return 'javascript-icon';
      case '.json': return 'json-icon';
      default: return 'default-file-icon';
    }
  }
}
```

### 13.3 OutputChannel Creation and Logging

```typescript
import { OutputChannel, OutputChannelManager } from '@theia/output/lib/common/output-channel';
import { inject, injectable } from '@theia/core/shared/inversify';

@injectable()
export class IdeiaAgentLogger {
  private channel: OutputChannel;

  constructor(
    @inject(OutputChannelManager)
    private readonly channelManager: OutputChannelManager,
  ) {
    this.channel = this.channelManager.getChannel('IDEIA: Agent Runner');
  }

  logAgentStart(agentId: string, task: string): void {
    this.channel.appendLine(`[${this.timestamp()}] [AGENT] Starting agent: ${agentId}`);
    this.channel.appendLine(`[${this.timestamp()}] [AGENT] Task: ${task}`);
    this.channel.appendLine(`[${this.timestamp()}] [AGENT] ${'-'.repeat(50)}`);
  }

  logAgentStep(agentId: string, step: string, status: 'running' | 'done' | 'error'): void {
    const icon = status === 'done' ? '[OK]' : status === 'error' ? '[FAIL]' : '[RUN]';
    this.channel.appendLine(`[${this.timestamp()}] ${icon} ${agentId}: ${step}`);

    if (status === 'error') {
      this.channel.show(false); // Foca no output em caso de erro
    }
  }

  logAgentResult(agentId: string, result: string): void {
    this.channel.appendLine(`[${this.timestamp()}] [AGENT] ${agentId} completed`);
    this.channel.appendLine(`[${this.timestamp()}] [AGENT] Result: ${result}`);
    this.channel.appendLine('');
  }

  clear(): void {
    this.channel.clear();
  }

  show(): void {
    this.channel.show(false);
  }

  private timestamp(): string {
    return new Date().toLocaleTimeString('pt-BR', { hour12: false });
  }
}
```

### 13.4 MessageService Notification

```typescript
import { MessageService } from '@theia/core/lib/common/message-service';
import { inject, injectable } from '@theia/core/shared/inversify';

@injectable()
export class IdeiaNotificationService {
  constructor(
    @inject(MessageService)
    private readonly messageService: MessageService,
  ) {}

  async notifyBuildComplete(success: boolean, errors: number, warnings: number): Promise<void> {
    if (success) {
      await this.messageService.info(
        `Build completed: 0 errors, ${warnings} warnings`,
        { timeout: 5000 }
      );
    } else {
      const result = await this.messageService.error(
        `Build failed with ${errors} errors and ${warnings} warnings`,
        [
          { label: 'Show Problems', run: () => this.openProblems() },
          { label: 'Dismiss', run: () => {} },
        ],
        { timeout: 30000 }
      );
    }
  }

  async confirmAgentAction(agentId: string, action: string): Promise<boolean> {
    const result = await this.messageService.info(
      `Agent ${agentId} requests: ${action}`,
      [
        { label: 'Approve', run: () => {} },
        { label: 'Reject', run: () => {} },
        { label: 'Review Details', run: () => this.showAgentDetails(agentId) },
      ],
      { modal: true }
    );

    return result === 'Approve';
  }

  showProgress(title: string, cancelable: boolean = true): Progress {
    return this.messageService.showProgress({
      text: title,
      options: { cancelable },
    });
  }

  private openProblems(): void {
    // Reveal problems widget via shell
  }

  private showAgentDetails(agentId: string): void {
    // Open agent details view
  }
}
```

### 13.5 Custom Dialog

```typescript
import { AbstractDialog, Dialog } from '@theia/core/lib/browser/dialogs';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

export interface GrantPermissionOptions {
  agentName: string;
  permission: string;
  resource: string;
  duration: 'once' | 'session' | 'permanent';
}

@injectable()
export class PermissionDialog extends AbstractDialog<GrantPermissionOptions | undefined> {
  private selectedDuration: 'once' | 'session' | 'permanent' = 'once';
  private agentNameElement: HTMLElement;
  private permissionElement: HTMLElement;
  private resourceElement: HTMLElement;
  private durationSelector: HTMLSelectElement;

  constructor(
    protected readonly options: GrantPermissionOptions,
  ) {
    super('Permission Request');
    this.addClass('ideia-permission-dialog');
  }

  @postConstruct()
  protected init(): void {
    this.render();
  }

  protected render(): void {
    this.node.innerHTML = `
      <div class="permission-dialog-content">
        <div class="permission-header">
          <span class="codicon codicon-shield"></span>
          <h3>Permission Required</h3>
        </div>
        <div class="permission-details">
          <div class="permission-row">
            <span class="permission-label">Agent:</span>
            <span class="permission-value agent-name">${this.options.agentName}</span>
          </div>
          <div class="permission-row">
            <span class="permission-label">Permission:</span>
            <span class="permission-value permission-name">${this.options.permission}</span>
          </div>
          <div class="permission-row">
            <span class="permission-label">Resource:</span>
            <span class="permission-value resource-name">${this.options.resource}</span>
          </div>
          <div class="permission-row">
            <span class="permission-label">Duration:</span>
            <select class="permission-duration">
              <option value="once">Once</option>
              <option value="session">This session</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
        </div>
        <div class="permission-hint">
          <span class="codicon codicon-info"></span>
          You can review and revoke permissions anytime in Settings > Security.
        </div>
      </div>
      <div class="dialog-actions">
        <button class="theia-button secondary" data-action="deny">Deny</button>
        <button class="theia-button main" data-action="allow">Allow</button>
      </div>
    `;

    this.durationSelector = this.node.querySelector('.permission-duration')!;
    this.durationSelector.onchange = () => {
      this.selectedDuration = this.durationSelector.value as 'once' | 'session' | 'permanent';
    };
  }

  get acceptValue(): GrantPermissionOptions | undefined {
    return {
      ...this.options,
      duration: this.selectedDuration,
    };
  }

  get isValid(): boolean {
    return true;
  }
}

// Uso:
const dialog = new PermissionDialog({
  agentName: 'CodeGenerator',
  permission: 'file:write',
  resource: '/workspace/src/generated/',
  duration: 'once',
});

const result = await dialog.open();
if (result) {
  // result.duration === 'once' | 'session' | 'permanent'
  grantPermission(result);
}
```

### 13.6 Problem Decorator for Navigator

```typescript
import {
  MarkerDecorator,
  MarkerDecoration,
  MarkerDecoratorService,
} from '@theia/markers/lib/browser/marker-decorator';
import { ProblemManager } from '@theia/markers/lib/browser/problem/problem-manager';
import { injectable, inject } from '@theia/core/shared/inversify';
import { URI } from '@theia/core';
import { MarkerSeverity } from '@theia/markers/lib/common/marker-severity';

@injectable()
export class IdeiaProblemDecorator implements MarkerDecorator {
  readonly id = 'ideia-problem-decorator';

  constructor(
    @inject(ProblemManager)
    protected readonly problemManager: ProblemManager,
  ) {}

  async decorate(uris: URI[]): Promise<MarkerDecoration[]> {
    const decorations: MarkerDecoration[] = [];

    for (const uri of uris) {
      const markers = this.problemManager.findMarkers(
        m => m.uri.toString() === uri.toString()
      );

      if (markers.length === 0) continue;

      const errorCount = markers.filter(
        m => m.data.severity === MarkerSeverity.Error
      ).length;

      const warningCount = markers.filter(
        m => m.data.severity === MarkerSeverity.Warning
      ).length;

      const infoCount = markers.filter(
        m => m.data.severity === MarkerSeverity.Info
      ).length;

      let color: string | undefined;
      let icon: string | undefined;
      let tooltip: string;

      if (errorCount > 0) {
        color = 'var(--theia-editorError-foreground)';
        icon = 'codicon-error';
        tooltip = `${errorCount} error(s), ${warningCount} warning(s), ${infoCount} info(s)`;
      } else if (warningCount > 0) {
        color = 'var(--theia-editorWarning-foreground)';
        icon = 'codicon-warning';
        tooltip = `${warningCount} warning(s), ${infoCount} info(s)`;
      } else {
        color = 'var(--theia-editorInfo-foreground)';
        icon = 'codicon-info';
        tooltip = `${infoCount} info(s)`;
      }

      decorations.push({
        uri,
        color,
        icon,
        tooltip,
        badge: errorCount + warningCount,
      });
    }

    return decorations;
  }

  // Metodo helper para obter cor baseada na severidade maxima
  private getSeverityColor(markers: Marker<Diagnostic>[]): string {
    const severities = markers.map(m => m.data.severity);
    if (severities.includes(MarkerSeverity.Error)) {
      return 'var(--theia-editorError-foreground)';
    }
    if (severities.includes(MarkerSeverity.Warning)) {
      return 'var(--theia-editorWarning-foreground)';
    }
    if (severities.includes(MarkerSeverity.Info)) {
      return 'var(--theia-editorInfo-foreground)';
    }
    return 'var(--theia-editorHint-foreground)';
  }
}
```

---

## 14. Conexoes

### 14.1 Matriz de Conexoes com Outros Estudos

| Estudo | Relacao | Descricao |
|---|---|---|
| **S38** — Editor Intelligence & LSP | FONTE DE DIAGNOSTICOS | LSP `textDocument/publishDiagnostics` + `codeAction/resolve` alimentam ProblemManager e ProblemWidget. LSP diagnostic severity mapeada para MarkerSeverity. |
| **S34** — Editor Widget | CONSUMIDOR DE DECORACOES | Monaco editor recebe decoracoes do MarkerDecorator (squiggly lines, gutter, overview ruler). Clique em problema => editor.goTo. |
| **S43** — Views & Widgets | PADRAO DE IMPLEMENTACAO | ProblemWidget e OutputWidget sao TreeWidgets (estudo S43). View contribution patterns aplicados: WidgetFactory, ViewContribution, Command/Toolbar. |
| **S44** — Shell & Layout | LOCALIZACAO NO SHELL | ProblemWidget e OutputWidget residem no bottom panel (S44 secao 6). Toggle commands, panel position, height persistence. |
| **S36** — Extension Host | CONSUMIDOR DE OUTPUT | Extension host usa OutputChannel para logging de extensoes. Host errors podem gerar notificacoes via MessageService. |
| **S39** — Settings & Keybindings | CONFIGURACAO | Preferencias de severity filter, auto-scroll, notification timeout, console log level. Keybindings para toggle problems/output. |
| **S37** — Search, SCM, Task | FONTES DE PROBLEMAS | Task runners podem publicar diagnosticos no ProblemManager. SCM pode mostrar problemas de merge. |
| **S41** — Remote/Web IDE | PERSISTENCIA REMOTA | OutputChannel content, notification state e problem markers precisam ser sincronizados em setup remoto. |
| **S42** — DI & Contributions | PADRAO DE REGISTRO | MarkerDecorator registrado via ContributionProvider. OutputChannelManager como servico DI. View contributions para widgets. |

### 14.2 Diagrama de Fluxo entre Estudos

```
S38 (LSP)
  | publishDiagnostics
  v
ProblemManager  ---- markers ----> MarkerDecorator (S46)
  |                                    |
  |                                 NavigatorDecorator
  |                                 EditorDecorator (S34 Monaco)
  |
  +-- ProblemWidget (S46)
       |                                S44 Shell
       | Bottom panel                   |
       +-- TreeWidget (S43) ---- ViewContribution (S42)

OutputChannelManager (S46)
  | getChannel()
  +-- OutputWidget (S46)
       |                                S44 Shell
       | Bottom panel                   |
       +-- TreeWidget (S43) ---- ViewContribution (S42)
  |
  +-- Extensions (S36) ---- appendLine()

MessageService (S46)
  | info/warn/error
  +-- DialogSystem (S46)
  +-- NotificationManager (S46)
  |     +-- NotificationCenter (S46)
  +-- ProgressNotification

ConsoleService (S46)
  | log/info/warn/error/debug
  +-- Browser console
  +-- OutputChannel (alternativo)
```

### 14.3 Pontos de Integracao com IDEIA

| Componente IDEIA | Sistema Theia | Integracao |
|---|---|---|
| Agent Runtime | OutputChannel | Cada agente cria canal: `IDEIA: Agent <name>` |
| LSP Bridge | ProblemManager | `setMarkers(uri, 'ideia-lsp', markers)` |
| Extension Host | OutputChannel | `getChannel('IDEIA: Extensions')` |
| AI Chat | MessageService | Notificacoes de progresso de geracao |
| Approval Flow | Dialog System | `PermissionDialog` para acoes arriscadas |
| Policy Engine | NotificationManager | Notificacoes de violacao de policy |
| Audit Trail | ConsoleService | Log estruturado de operacoes |
| Quality Gates | ProblemManager | Gaps mapeados como problemas |
| Self-Awareness | MarkerDecorator | Decoracoes para arquivos com auto-awareness |

---

## 15. Plano de Implementacao

### 15.1 Resumo

| Fase | Descricao | Estimativa | Dependencias |
|---|---|---|---|
| Fase 1 | MarkerManager + ProblemManager | ~8h | S42 (DI), S38 (LSP types) |
| Fase 2 | ProblemWidget + ProblemTree | ~12h | S43 (TreeWidget), S44 (Bottom panel) |
| Fase 3 | Marker Decorators (navigator + editor) | ~10h | S34 (Editor), S43 (Navigator) |
| Fase 4 | OutputChannel + OutputChannelManager | ~6h | S42 (DI) |
| Fase 5 | OutputWidget + ANSI + Search | ~10h | S43 (TreeWidget), S44 (Bottom panel) |
| Fase 6 | ConsoleService | ~4h | Nenhuma |
| Fase 7 | MessageService + NotificationManager | ~8h | S44 (Status bar), S43 (Widget) |
| Fase 8 | Dialog System (todos os dialogos) | ~10h | S43 (Widget base) |
| Fase 9 | Integracao com LSP + Editor | ~6h | S38, S34 |
| Fase 10 | Testes + Resiliencia | ~8h | Todas as fases |

**Total estimado:** ~82h

### 15.2 Fase 1 — MarkerManager + ProblemManager (~8h)

| Task | Descricao | Estimativa |
|---|---|---|
| 1.1 | Implementar `Marker<T>` interface + `MarkerCollection<T>` com metodos CRUD | 2h |
| 1.2 | Implementar `MarkerManager` com eventos `onMarkerChanged` | 2h |
| 1.3 | Implementar `Diagnostic` data structure (range, severity, message, source, code) | 1h |
| 1.4 | Implementar `ProblemManager` estendendo MarkerManager | 1h |
| 1.5 | Implementar mapeamento LSP severity -> MarkerSeverity | 0.5h |
| 1.6 | Unit tests para MarkerCollection, MarkerManager, ProblemManager | 1.5h |

### 15.3 Fase 2 — ProblemWidget + ProblemTree (~12h)

| Task | Descricao | Estimativa |
|---|---|---|
| 2.1 | Implementar `ProblemFileNode`, `ProblemContainerNode`, `ProblemMarkerNode` | 2h |
| 2.2 | Implementar `ProblemTree` + `ProblemTreeModel` com grouping/sorting | 3h |
| 2.3 | Implementar `ProblemWidget` (TreeWidget) com rendering hierarquico | 3h |
| 2.4 | Implementar toolbar (severity filter, collapse all, clear) | 1.5h |
| 2.5 | Implementar quickfix actions via context menu | 1.5h |
| 2.6 | Implementar auto-reveal no editor ao clicar | 1h |

### 15.4 Fase 3 — Marker Decorators (~10h)

| Task | Descricao | Estimativa |
|---|---|---|
| 3.1 | Implementar `MarkerDecorator` interface + `ContributionProvider` | 1h |
| 3.2 | Implementar `NavigatorDecoratorService` com badge/color/icon | 3h |
| 3.3 | Implementar `EditorMarkerDecorator` (squiggly, gutter, overview ruler) | 3h |
| 3.4 | Implementar `MarkerDecoratorService` para coordenar decorators | 1h |
| 3.5 | Tests para decorators em navigator e editor mock | 2h |

### 15.5 Fase 4 — OutputChannel + OutputChannelManager (~6h)

| Task | Descricao | Estimativa |
|---|---|---|
| 4.1 | Implementar `OutputChannel` interface com append, appendLine, replace, clear | 1.5h |
| 4.2 | Implementar `DefaultOutputChannel` com conteudo em memoria | 1.5h |
| 4.3 | Implementar `OutputChannelManager` com CRUD, eventos, selectedChannel | 1.5h |
| 4.4 | Implementar persistence (StorageService) para conteudo dos canais | 1h |
| 4.5 | Unit tests para OutputChannel e OutputChannelManager | 0.5h |

### 15.6 Fase 5 — OutputWidget (~10h)

| Task | Descricao | Estimativa |
|---|---|---|
| 5.1 | Implementar `OutputWidget` (TreeWidget) com rendering de linhas | 2h |
| 5.2 | Implementar channel selector (dropdown) | 1h |
| 5.3 | Implementar ANSI escape code processing | 2h |
| 5.4 | Implementar search + highlight + navigation | 2h |
| 5.5 | Implementar auto-scroll + clear | 1h |
| 5.6 | Implementar toolbar (clear, auto-scroll toggle, channel selector) | 1h |
| 5.7 | Tests para OutputWidget rendering, ANSI, search | 1h |

### 15.7 Fase 6 — ConsoleService (~4h)

| Task | Descricao | Estimativa |
|---|---|---|
| 6.1 | Implementar `ConsoleService` com info/warn/error/debug | 1h |
| 6.2 | Implementar `ConsoleLogger` com historico circular e events | 1h |
| 6.3 | Implementar filtro por nivel (debug > info > warn > error) | 0.5h |
| 6.4 | Implementar formatacao de mensagens com timestamp | 0.5h |
| 6.5 | Unit tests | 1h |

### 15.8 Fase 7 — MessageService + NotificationManager (~8h)

| Task | Descricao | Estimativa |
|---|---|---|
| 7.1 | Implementar `MessageService` com info/warn/error + acoes | 2h |
| 7.2 | Implementar message queue + processamento sequencial | 1h |
| 7.3 | Implementar `NotificationManager` com CRUD + eventos | 1.5h |
| 7.4 | Implementar toast rendering e auto-dismiss | 1h |
| 7.5 | Implementar `NotificationCenterWidget` + bell icon na status bar | 1.5h |
| 7.6 | Implementar grouping de notificacoes similares | 0.5h |
| 7.7 | Tests | 0.5h |

### 15.9 Fase 8 — Dialog System (~10h)

| Task | Descricao | Estimativa |
|---|---|---|
| 8.1 | Implementar `Dialog<T>` base + `AbstractDialog<T>` | 2h |
| 8.2 | Implementar `ConfirmDialog` (Yes/No/Cancel) | 1h |
| 8.3 | Implementar `MessageDialog` (OK + acoes) | 1h |
| 8.4 | Implementar `InputDialog` com validacao em tempo real | 1.5h |
| 8.5 | Implementar `SingleSelectDialog` com filtro | 1.5h |
| 8.6 | Implementar `ProgressDialog` com barra de progresso | 1h |
| 8.7 | Implementar `CustomDialog` para conteudo widget arbitrario | 1h |
| 8.8 | Tests para todos os tipos de dialogo | 1h |

### 15.10 Fase 9 — Integracao LSP + Editor (~6h)

| Task | Descricao | Estimativa |
|---|---|---|
| 9.1 | Integrar LSP `publishDiagnostics` com `ProblemManager.setMarkers` | 2h |
| 9.2 | Mapear `DiagnosticSeverity` para `MarkerSeverity` no LSP client | 0.5h |
| 9.3 | Integrar click em problema com `editorManager.open` e selecao | 1h |
| 9.4 | Integrar `codeAction/resolve` com quickfix no ProblemWidget | 1.5h |
| 9.5 | Testar fluxo completo LSP -> ProblemManager -> ProblemWidget -> Editor | 1h |

### 15.11 Fase 10 — Testes + Resiliencia (~8h)

| Task | Descricao | Estimativa |
|---|---|---|
| 10.1 | Testes de integracao: OutputChannel -> OutputWidget | 2h |
| 10.2 | Testes de integracao: MessageService -> NotificationManager | 1.5h |
| 10.3 | Testes de integracao: Dialog -> MessageService | 1h |
| 10.4 | Testes de performance: large marker sets (10K+ markers) | 1h |
| 10.5 | Testes de performance: output channel com 100K+ linhas (virtual scrolling) | 1h |
| 10.6 | Tratamento de erros: LSP disconnect cleanup, channel dispose, memory leak | 1.5h |

### 15.12 Milestones e Deliverables

| Marco | Entrega | Criterio de Aceitacao |
|---|---|---|
| M1 | Marker CRUD funcional | `setMarkers`, `findMarkers`, `onMarkerChanged` propagam corretamente |
| M2 | Problems panel operacional | Problemas aparecem agrupados por file+severity, clique navega no editor |
| M3 | Navigator decorations | Badges e cores no file explorer refletem contagem de problemas |
| M4 | Editor decorations | Squiggly lines, gutter indicators e overview ruler funcionais |
| M5 | Output channels | Canais criaveis, texto append/replace/clear, persistencia entre sessoes |
| M6 | Output widget | Channel selector, ANSI suport, search, auto-scroll |
| M7 | Notificacoes | Toast, notification center, grouping, auto-dismiss |
| M8 | Dialogos completos | Confirm, Input, Select, Progress, Custom funcionais |
| M9 | Integracao LSP | Diagnosticos do LSP aparecem no Problems panel + editor |
| M10 | Todos os testes | >= 80% coverage, 0 falhas, performance benchmarks OK |

---

> **Fim do Estudo S46** — Theia Marker, Problem & Output Systems
> Proximo: Validar implementacao contra o restante da suíte Theia Integration Stack
