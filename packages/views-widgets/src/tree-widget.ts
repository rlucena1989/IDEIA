import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { ITreeWidget, ITreeModel, ITreeNode, WidgetTitle } from './types';
import { BaseWidget } from './widget-core';

export class DefaultTreeWidget extends BaseWidget implements ITreeWidget {
  private model?: ITreeModel;
  private searchQuery = '';

  setModel(model: ITreeModel): void {
    this.model = model;
  }

  getModel(): ITreeModel | undefined {
    return this.model;
  }

  refresh(): void {
    this.onActivatedEmitter.fire(void 0);
  }

  expandAll(): void {
    if (!this.model) return;
    this.toggleExpandRecursive(this.model.getRoots(), true);
  }

  collapseAll(): void {
    if (!this.model) return;
    this.toggleExpandRecursive(this.model.getRoots(), false);
  }

  filter(query: string): void {
    this.searchQuery = query;
    this.refresh();
  }

  getFilter(): string {
    return this.searchQuery;
  }

  getVisibleNodes(): ITreeNode[] {
    if (!this.model) return [];
    const roots = this.model.getRoots();
    if (!this.searchQuery) return roots;
    return this.filterNodes(roots, this.searchQuery.toLowerCase());
  }

  private filterNodes(nodes: ITreeNode[], query: string): ITreeNode[] {
    const result: ITreeNode[] = [];
    for (const node of nodes) {
      const match = node.label.toLowerCase().includes(query)
        || (node.description?.toLowerCase().includes(query) ?? false);
      const matchingChildren = this.filterNodes(node.children, query);
      if (match || matchingChildren.length > 0) {
        result.push({
          ...node,
          children: matchingChildren,
        });
      }
    }
    return result;
  }

  private toggleExpandRecursive(nodes: ITreeNode[], expand: boolean): void {
    for (const node of nodes) {
      node.expanded = expand;
      this.toggleExpandRecursive(node.children, expand);
    }
  }
}

export class DefaultTreeModel implements ITreeModel {
  private roots: ITreeNode[] = [];
  private onChangedEmitter = new Emitter<ITreeNode>();

  get onNodeChanged() { return this.onChangedEmitter.event; }

  setRoots(roots: ITreeNode[]): void {
    this.roots = roots;
  }

  getRoots(): ITreeNode[] {
    return this.roots;
  }

  getChildren(node: ITreeNode): ITreeNode[] {
    return node.children || [];
  }

  isExpandable(node: ITreeNode): boolean {
    return node.children && node.children.length > 0;
  }

  notifyChanged(node: ITreeNode): void {
    this.onChangedEmitter.fire(node);
  }
}
