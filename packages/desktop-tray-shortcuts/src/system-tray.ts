export interface TrayMenuAction {
  id: string;
  label: string;
  icon?: string;
  enabled: boolean;
  checked?: boolean;
  submenu?: TrayMenuAction[];
  click?: () => void;
  separator?: boolean;
}

export interface TrayConfig {
  iconPath: string;
  tooltip: string;
  menu: TrayMenuAction[];
  onDoubleClick?: () => void;
}

export class SystemTrayManager {
  private config: TrayConfig;
  private visible = false;

  constructor(config: TrayConfig) {
    this.config = config;
  }

  create(): void {
    this.visible = true;
  }

  destroy(): void {
    this.visible = false;
  }

  setTooltip(tooltip: string): void {
    this.config.tooltip = tooltip;
  }

  setIcon(iconPath: string): void {
    this.config.iconPath = iconPath;
  }

  updateMenu(menu: TrayMenuAction[]): void {
    this.config.menu = menu;
  }

  isVisible(): boolean {
    return this.visible;
  }

  getMenu(): TrayMenuAction[] {
    return [...this.config.menu];
  }

  getDefaultMenu(): TrayMenuAction[] {
    return [
      { id: 'open', label: 'Open IDEIA', enabled: true, click: () => {} },
      { id: 'sep1', label: '', enabled: true, separator: true },
      { id: 'settings', label: 'Settings', enabled: true, click: () => {} },
      { id: 'sep2', label: '', enabled: true, separator: true },
      { id: 'quit', label: 'Quit', enabled: true, click: () => {} },
    ];
  }
}
