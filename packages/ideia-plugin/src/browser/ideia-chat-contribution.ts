import { injectable, inject } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common/command';
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser/keybinding';
import { MenuContribution, MenuModelRegistry, MenuPath } from '@theia/core/lib/common/menu';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { IDEIA_ChatWidget } from './ideia-chat-widget';
import { IDEIA_SearchOverlay } from './ideia-search-overlay';
const logger = createLogger('ideia-chat-contribution');

export const IDEIA_CHAT_COMMAND: Command = {
  id: 'ideia:chat',
  label: 'IDEIA: Open Assistant Chat',
  category: 'IDEIA',
};

export const IDEIA_DASHBOARD_COMMAND: Command = {
  id: 'ideia:dashboard',
  label: 'IDEIA: Show Dashboard',
  category: 'IDEIA',
};

export const IDEIA_APPROVALS_COMMAND: Command = {
  id: 'ideia:approvals',
  label: 'IDEIA: Show Approvals',
  category: 'IDEIA',
};

export const IDEIA_DIFF_COMMAND: Command = {
  id: 'ideia:diff',
  label: 'IDEIA: Show Diff',
  category: 'IDEIA',
};

export const IDEIA_NEW_PROJECT_COMMAND: Command = {
  id: 'ideia:newProject',
  label: 'IDEIA: New Project from Idea...',
  category: 'IDEIA',
};

export const IDEIA_EXPLAIN_COMMAND: Command = {
  id: 'ideia:explain',
  label: 'IDEIA: Explain Selected Code',
  category: 'IDEIA',
};

export const IDEIA_REFACTOR_COMMAND: Command = {
  id: 'ideia:refactor',
  label: 'IDEIA: Refactor Selected Code',
  category: 'IDEIA',
};

export const IDEIA_STUDIES_COMMAND: Command = {
  id: 'ideia:studies',
  label: 'IDEIA: Show Studies',
  category: 'IDEIA',
};

export const IDEIA_SUGGESTIONS_COMMAND: Command = {
  id: 'ideia:suggestions',
  label: 'IDEIA: Show Suggestions',
  category: 'IDEIA',
};

export const IDEIA_SEARCH_COMMAND: Command = {
  id: 'ideia:search',
  label: 'IDEIA: Search Files',
  category: 'IDEIA',
};

const IDEIA_MENU: MenuPath = ['ideia'];

@injectable()
export class IDEIA_ChatContribution extends AbstractViewContribution<IDEIA_ChatWidget>
  implements CommandContribution, KeybindingContribution, MenuContribution {

  constructor(
    @inject(IDEIA_SearchOverlay) private readonly searchOverlay: IDEIA_SearchOverlay,
  ) {
    super({
      widgetId: IDEIA_ChatWidget.ID,
      widgetName: IDEIA_ChatWidget.LABEL,
      defaultWidgetOptions: {
        area: 'right',
        rank: 100,
      },
      toggleCommandId: IDEIA_CHAT_COMMAND.id,
    });
  }

  override registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(IDEIA_CHAT_COMMAND, {
      execute: () => this.openView({ activate: true }),
    });

    registry.registerCommand(IDEIA_DASHBOARD_COMMAND, {
      execute: () => registry.executeCommand('ideia:dashboard'),
    });

    registry.registerCommand(IDEIA_APPROVALS_COMMAND, {
      execute: () => registry.executeCommand('ideia:approvals'),
    });

    registry.registerCommand(IDEIA_DIFF_COMMAND, {
      execute: () => registry.executeCommand('ideia:diff'),
    });

    registry.registerCommand(IDEIA_STUDIES_COMMAND, {
      execute: () => registry.executeCommand('ideia:studies'),
    });

    registry.registerCommand(IDEIA_SUGGESTIONS_COMMAND, {
      execute: () => registry.executeCommand('ideia:suggestions'),
    });

    registry.registerCommand(IDEIA_SEARCH_COMMAND, {
      execute: () => this.searchOverlay.open(),
    });

    registry.registerCommand(IDEIA_NEW_PROJECT_COMMAND, {
      execute: () => registry.executeCommand(IDEIA_CHAT_COMMAND.id),
    });

    registry.registerCommand(IDEIA_EXPLAIN_COMMAND, {
      execute: () => registry.executeCommand(IDEIA_CHAT_COMMAND.id),
    });

    registry.registerCommand(IDEIA_REFACTOR_COMMAND, {
      execute: () => registry.executeCommand(IDEIA_CHAT_COMMAND.id),
    });
  }

  override registerKeybindings(registry: KeybindingRegistry): void {
    registry.registerKeybinding({
      command: IDEIA_CHAT_COMMAND.id,
      keybinding: 'ctrl+shift+i',
    });

    registry.registerKeybinding({
      command: IDEIA_DASHBOARD_COMMAND.id,
      keybinding: 'ctrl+shift+d',
    });

    registry.registerKeybinding({
      command: IDEIA_APPROVALS_COMMAND.id,
      keybinding: 'ctrl+shift+a',
    });

    registry.registerKeybinding({
      command: IDEIA_NEW_PROJECT_COMMAND.id,
      keybinding: 'ctrl+shift+n',
    });

    registry.registerKeybinding({
      command: IDEIA_SEARCH_COMMAND.id,
      keybinding: 'ctrl+shift+f',
    });
  }

  override registerMenus(registry: MenuModelRegistry): void {
    registry.registerSubmenu(IDEIA_MENU, 'IDEIA', { sortString: '10' });
    registry.registerMenuAction(IDEIA_MENU, {
      commandId: IDEIA_CHAT_COMMAND.id,
      label: 'Assistant Chat',
      order: '0',
    });

    registry.registerMenuAction(IDEIA_MENU, {
      commandId: IDEIA_DASHBOARD_COMMAND.id,
      label: 'Dashboard',
      order: '1',
    });

    registry.registerMenuAction(IDEIA_MENU, {
      commandId: IDEIA_APPROVALS_COMMAND.id,
      label: 'Approvals',
      order: '2',
    });

    registry.registerMenuAction(IDEIA_MENU, {
      commandId: IDEIA_STUDIES_COMMAND.id,
      label: 'Studies',
      order: '3',
    });

    registry.registerMenuAction(IDEIA_MENU, {
      commandId: IDEIA_SUGGESTIONS_COMMAND.id,
      label: 'Suggestions',
      order: '4',
    });

    registry.registerMenuAction(IDEIA_MENU, {
      commandId: IDEIA_SEARCH_COMMAND.id,
      label: 'Search Files...',
      order: '5',
    });

    registry.registerMenuAction(IDEIA_MENU, {
      commandId: IDEIA_NEW_PROJECT_COMMAND.id,
      label: 'New Project from Idea',
      order: '6',
    });

    registry.registerMenuAction(['editor_context_menu', 'ideia'], {
      commandId: IDEIA_EXPLAIN_COMMAND.id,
      label: 'IDEIA: Explain',
      order: '0',
    });

    registry.registerMenuAction(['editor_context_menu', 'ideia'], {
      commandId: IDEIA_REFACTOR_COMMAND.id,
      label: 'IDEIA: Refactor',
      order: '1',
    });
  }
}
