import { Disposable } from '@ideia/core-contributions';
import { MenuPath, MenuAction, MenuNode, MenuModelRegistry } from './types';

export const MENU_PATHS = {
  FILE: ['file'],
  EDIT: ['edit'],
  SELECTION: ['selection'],
  VIEW: ['view'],
  GO: ['go'],
  RUN: ['run'],
  TERMINAL: ['terminal'],
  HELP: ['help'],
  PREFERENCES: ['preferences'],
  PANEL: ['panel'],
} as const;

export const MENU_GROUPS = {
  NAVIGATION: 'navigation',
  Z_OPEN: '1_open',
  Z_CLOSE: '9_close',
  Z_UNDO: '1_undo',
  Z_CUT: '3_cut',
  Z_MODIFICATION: '2_modification',
  Z_WORKSPACE: '1_workspace',
  Z_TOOLS: '3_tools',
} as const;

export class DefaultMenuModelRegistry implements MenuModelRegistry {
  private roots = new Map<string, MenuNode>();

  private getOrCreateRoot(path: MenuPath): MenuNode {
    const key = path[0];
    if (!this.roots.has(key)) {
      this.roots.set(key, {
        id: key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        order: 0,
        group: '',
        children: [],
      });
    }
    return this.roots.get(key)!;
  }

  registerMenuAction(path: MenuPath, action: MenuAction): Disposable {
    const root = this.getOrCreateRoot(path);
    const node: MenuNode = {
      id: action.commandId,
      label: action.label,
      icon: action.icon,
      order: action.order ?? 100,
      group: action.group ?? '',
      children: [],
      action,
    };
    root.children.push(node);
    return { dispose: () => this.removeMenuAction(path, action.commandId) };
  }

  registerSubmenu(path: MenuPath, label: string, icon?: string): Disposable {
    const root = this.getOrCreateRoot(path);
    const existing = root.children.find(c => c.id === path.join('.'));
    if (existing) return { dispose: () => {} };
    const node: MenuNode = {
      id: path.join('.'),
      label,
      icon,
      order: 0,
      group: '',
      children: [],
    };
    root.children.push(node);
    return { dispose: () => { root.children = root.children.filter(c => c.id !== node.id); } };
  }

  getMenuNode(path: MenuPath): MenuNode | undefined {
    return this.roots.get(path[0]);
  }

  getMenuNodes(): Map<string, MenuNode> {
    return this.roots;
  }

  removeMenuAction(path: MenuPath, commandId: string): void {
    const root = this.roots.get(path[0]);
    if (!root) return;
    root.children = root.children.filter(c => c.id !== commandId);
  }

  getActionsForPath(path: MenuPath): MenuAction[] {
    const root = this.roots.get(path[0]);
    if (!root) return [];
    return root.children
      .filter(c => c.action)
      .map(c => c.action!);
  }
}
