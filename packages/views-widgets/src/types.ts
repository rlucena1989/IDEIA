import { Disposable, Event } from '@ideia/core-contributions';

export interface IWidget {
  readonly id: string;
  readonly title: WidgetTitle;
  visible: boolean;
  activate(): void;
  close(): void;
  dispose(): void;
  onActivated: Event<void>;
  onClose: Event<void>;
  onDispose: Event<void>;
  onResize: Event<WidgetResizeEvent>;
}

export interface WidgetTitle {
  label: string;
  caption?: string;
  iconClass?: string;
  closable: boolean;
}

export interface WidgetResizeEvent {
  width: number;
  height: number;
}

export interface IViewContainer {
  readonly id: string;
  readonly title: WidgetTitle;
  addWidget(widget: IWidget, options?: ViewWidgetOptions): Disposable;
  removeWidget(id: string): void;
  getWidgets(): IWidget[];
  getActiveWidget(): IWidget | undefined;
  setActiveWidget(id: string): void;
  onWidgetAdded: Event<IWidget>;
  onWidgetRemoved: Event<string>;
  onActiveWidgetChanged: Event<IWidget | undefined>;
}

export interface ViewWidgetOptions {
  order?: number;
  collapsed?: boolean;
}

export interface ITreeWidget extends IWidget {
  setModel(model: ITreeModel): void;
  getModel(): ITreeModel | undefined;
  refresh(): void;
  expandAll(): void;
  collapseAll(): void;
}

export interface ITreeModel {
  getRoots(): ITreeNode[];
  getChildren(node: ITreeNode): ITreeNode[];
  isExpandable(node: ITreeNode): boolean;
  onNodeChanged: Event<ITreeNode>;
}

export interface ITreeNode {
  id: string;
  label: string;
  iconClass?: string;
  description?: string;
  expanded: boolean;
  selected: boolean;
  children: ITreeNode[];
  metadata?: Record<string, unknown>;
}

export interface IReactWidget extends IWidget {
  render(): React.ReactNode;
  forceUpdate(): void;
}

export interface IWebviewWidget extends IWidget {
  setHtml(html: string): void;
  postMessage(message: unknown): void;
  onMessage: Event<unknown>;
  setContentSecurityPolicy(policy: string): void;
}

export interface IDialog {
  readonly id: string;
  readonly title: string;
  open(): Promise<DialogResult>;
  close(): void;
  setMessage(message: string): void;
}

export type DialogResult = {
  button: DialogButton;
  value?: unknown;
};

export enum DialogButton {
  OK = 'ok',
  Cancel = 'cancel',
  Yes = 'yes',
  No = 'no',
  Custom = 'custom',
}

export interface IProgressService {
  show(progress: ProgressOptions): IProgressIndicator;
  hide(id: string): void;
}

export interface ProgressOptions {
  location: 'statusBar' | 'view' | 'notification';
  title?: string;
  cancellable?: boolean;
}

export interface IProgressIndicator {
  id: string;
  report(progress: { message?: string; work?: { done: number; total: number } }): void;
  cancel(): void;
  done(): void;
}
