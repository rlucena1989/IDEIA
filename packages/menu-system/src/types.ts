import { Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
const logger = createLogger('types');

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

export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  content: string;
  category: string;
  relatedTopics: string[];
}

export interface HelpProvider {
  getHelp(topicId: string): HelpTopic | undefined;
  searchHelp(query: string): HelpTopic[];
  getTopicsByCategory(category: string): HelpTopic[];
}
