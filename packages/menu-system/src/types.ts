import { Disposable } from '@ideia/core-contributions';

export type MenuPath = string[];

export interface MenuAction {
  commandId: string;
  label?: string;
  icon?: string;
  order?: number;
  group?: string;
  when?: string;
}

export interface MenuNode {
  id: string;
  label?: string;
  icon?: string;
  order: number;
  group: string;
  children: MenuNode[];
  action?: MenuAction;
}

export interface MenuModelRegistry {
  registerMenuAction(path: MenuPath, action: MenuAction): Disposable;
  registerSubmenu(path: MenuPath, label: string, icon?: string): Disposable;
  getMenuNode(path: MenuPath): MenuNode | undefined;
  getMenuNodes(): Map<string, MenuNode>;
  removeMenuAction(path: MenuPath, commandId: string): void;
  getActionsForPath(path: MenuPath): MenuAction[];
}
