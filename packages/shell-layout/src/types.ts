import { Disposable, Event } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { IWidget, WidgetTitle } from '@ideia/views-widgets';

export type ShellArea = 'main' | 'left' | 'right' | 'bottom' | 'top';

export interface IShellLayout {
  readonly areas: Record<ShellArea, IShellArea>;
  addWidget(widget: IWidget, area: ShellArea, options?: ShellWidgetOptions): Disposable;
  removeWidget(id: string): void;
  getWidget(area: ShellArea, id: string): IWidget | undefined;
  getWidgets(area: ShellArea): IWidget[];
  setActiveWidget(area: ShellArea, id: string): void;
  getActiveWidget(area: ShellArea): IWidget | undefined;
  onWidgetAdded: Event<{ area: ShellArea; widget: IWidget }>;
  onWidgetRemoved: Event<{ area: ShellArea; widgetId: string }>;
  onLayoutChanged: Event<void>;
}

export interface IShellArea {
  readonly id: ShellArea;
  readonly widgets: IWidget[];
  readonly visible: boolean;
  show(): void;
  hide(): void;
  toggle(): void;
  setSize(size: number): void;
  addWidget(widget: IWidget): void;
  removeWidget(id: string): void;
  getWidget(id: string): IWidget | undefined;
  setActiveWidget(id: string): void;
  getActiveWidget(): IWidget | undefined;
  serialize(): ShellAreaState;
  deserialize(state: ShellAreaState): void;
}

export interface ShellWidgetOptions {
  order?: number;
  pinned?: boolean;
  maximized?: boolean;
}

export interface ShellAreaState {
  id: ShellArea;
  visible: boolean;
  size: number;
  activeWidgetId?: string;
  widgetOrder: string[];
}

export interface LayoutState {
  version: number;
  areas: Record<ShellArea, ShellAreaState>;
  timestamp: number;
}

export interface ILayoutPersistence {
  save(layout: LayoutState): Promise<void>;
  load(): Promise<LayoutState | undefined>;
  clear(): Promise<void>;
}

export interface IStatusBar {
  addEntry(entry: StatusBarEntry): Disposable;
  removeEntry(id: string): void;
  getEntries(): StatusBarEntry[];
  setBackground(color: string): void;
}

export interface StatusBarEntry {
  id: string;
  text: string;
  tooltip?: string;
  command?: string;
  alignment: 'left' | 'right';
  priority: number;
  backgroundColor?: string;
  color?: string;
}

export interface IActivityBar {
  addItem(item: ActivityBarItem): Disposable;
  removeItem(id: string): void;
  setActiveItem(id: string): void;
  getActiveItem(): ActivityBarItem | undefined;
  getItems(): ActivityBarItem[];
}

export interface ActivityBarItem {
  id: string;
  iconClass: string;
  tooltip: string;
  command?: string;
  badge?: number;
  active?: boolean;
}

export interface IBreadcrumbs {
  setPath(path: BreadcrumbSegment[]): void;
  getPath(): BreadcrumbSegment[];
  onBreadcrumbSelected: Event<BreadcrumbSegment>;
}

export interface BreadcrumbSegment {
  id: string;
  label: string;
  iconClass?: string;
  uri?: string;
}

export interface ITitleBar {
  setTitle(title: string): void;
  setIcon(iconClass: string): void;
  show(): void;
  hide(): void;
}

export interface IThemeIntegration {
  setTheme(themeId: string): Promise<void>;
  getCurrentTheme(): string;
  registerTheme(theme: ThemeDefinition): Disposable;
  onThemeChanged: Event<string>;
}

export interface ThemeDefinition {
  id: string;
  label: string;
  type: 'dark' | 'light' | 'highContrast';
  colors: Record<string, string>;
  tokenColors?: TokenColor[];
}

export interface TokenColor {
  scope: string[];
  settings: { foreground?: string; fontStyle?: string };
}
