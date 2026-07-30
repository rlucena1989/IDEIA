export interface IShellInfo {
  type: 'electron' | 'theia' | 'tauri' | 'cli';
  version: string;
  platform: string;
  arch: string;
  features: ShellFeature[];
}

export type ShellFeature =
  | 'window-management' | 'tray' | 'global-shortcuts' | 'deep-links'
  | 'native-dialogs' | 'notifications' | 'auto-update' | 'gpu-acceleration'
  | 'file-system' | 'clipboard';

export interface WindowOptions {
  title: string;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  fullscreen?: boolean;
  frame?: boolean;
}

export interface IWindow {
  id: string;
  title: string;
  close(): Promise<void>;
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  restore(): Promise<void>;
  isVisible(): boolean;
  setTitle(title: string): Promise<void>;
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  multiSelections?: boolean;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
}

export interface TrayOptions {
  icon: string;
  tooltip: string;
  menu?: { label: string; click: () => void }[];
}

export interface MemoryInfo {
  total: number;
  free: number;
  usage: number;
  process: number;
}

export interface CPUInfo {
  usage: number;
  cores: number;
  model: string;
}

export interface UpdateInfo {
  available: boolean;
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface IShell {
  readonly info: IShellInfo;
  hasFeature(feature: ShellFeature): boolean;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  createWindow(options: WindowOptions): Promise<IWindow>;
  getWindows(): IWindow[];
  getCurrentWindow(): IWindow;
  showOpenDialog(options: OpenDialogOptions): Promise<string[]>;
  showSaveDialog(options: SaveDialogOptions): Promise<string | null>;
  showNotification(options: NotificationOptions): void;
  createTray(options: TrayOptions): void;
  registerGlobalShortcut(shortcut: string, callback: () => void): void;
  unregisterGlobalShortcut(shortcut: string): void;
  onDeepLink(callback: (url: string) => void): void;
  checkForUpdates(): Promise<UpdateInfo | null>;
  downloadUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  getMemoryUsage(): Promise<MemoryInfo>;
  getCPUUsage(): Promise<CPUInfo>;
}
