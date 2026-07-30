export type DesktopShellType = 'electron' | 'tauri' | 'nwjs' | 'neutralino';
export type DesktopPlatform = 'win32' | 'darwin' | 'linux';
export type InstallerTarget = 'msi' | 'nsis' | 'dmg' | 'appImage' | 'deb' | 'rpm' | 'snap' | 'flatpak';
export type CompressionType = 'zip' | 'tar.gz' | '7z' | 'none';
export type UpdateChannel = 'stable' | 'beta' | 'alpha' | 'nightly';
export type UpdateProvider = 'github' | 's3' | 'custom';

export interface WindowWebPreferences {
  contextIsolation: boolean;
  nodeIntegration: boolean;
  sandbox: boolean;
  preload?: string;
  devTools?: boolean;
  webSecurity?: boolean;
  allowRunningInsecureContent?: boolean;
  images?: boolean;
  webgl?: boolean;
  plugins?: boolean;
}

export interface WindowConfig {
  width: number;
  height: number;
  frame?: boolean;
  resizable?: boolean;
  fullscreen?: boolean;
  alwaysOnTop?: boolean;
  center?: boolean;
  title?: string;
  icon?: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  backgroundColor?: string;
  webPreferences?: WindowWebPreferences;
  show?: boolean;
  opacity?: number;
}

export interface TrayMenuItem {
  label: string;
  action: string;
  enabled?: boolean;
  checked?: boolean;
  separator?: boolean;
  submenu?: TrayMenuItem[];
}

export interface TrayMenuConfig {
  items: TrayMenuItem[];
  tooltip?: string;
  icon?: string;
}

export interface DeepLinkConfig {
  protocol: string;
  handler: string;
  description?: string;
}

export interface ProtocolHandlerConfig {
  scheme: string;
  command: string;
  args?: string[];
}

export interface AutoUpdateConfig {
  enabled: boolean;
  provider: UpdateProvider;
  url?: string;
  channel?: UpdateChannel;
  interval?: number;
  mandatory?: boolean;
  allowDowngrade?: boolean;
  autoDownload?: boolean;
  autoInstall?: boolean;
}

export interface SigningConfig {
  enabled: boolean;
  certificateFile?: string;
  certificatePassword?: string;
  timestampServer?: string;
  signTool?: string;
}

export interface InstallerConfig {
  targets: InstallerTarget[];
  signing?: SigningConfig;
  silent?: boolean;
  compression?: CompressionType;
  installDir?: string;
  createDesktopShortcut?: boolean;
  createStartMenuShortcut?: boolean;
  perMachine?: boolean;
}

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl: string;
  mandatory: boolean;
  checksum: string;
  checksumType?: string;
  signature?: string;
  rollbackVersion?: string;
  size?: number;
}

export interface PerformanceProfile {
  binarySize: number;
  ramIdle: number;
  ramWorkspace: number;
  startupCold: number;
  startupWarm: number;
  gpuMemory?: number;
}

export interface NativeFeatures {
  fileDialogs: boolean;
  notifications: boolean;
  globalShortcuts: boolean;
  powerMonitor: boolean;
  clipboard: boolean;
  shell: boolean;
  tray: boolean;
  webview: boolean;
  gpuAcceleration: boolean;
  autoUpdate: boolean;
  protocolHandler: boolean;
}

export interface AppConfig {
  name: string;
  version: string;
  shell: DesktopShellType;
  window: WindowConfig;
  autoUpdate?: AutoUpdateConfig;
  tray?: TrayMenuConfig;
  deepLinks?: DeepLinkConfig[];
  protocols?: ProtocolHandlerConfig[];
  installer?: InstallerConfig;
  appId?: string;
  copyright?: string;
  author?: string;
  description?: string;
  homepage?: string;
  repository?: string;
  environment?: Record<string, string>;
}

export const PERFORMANCE_PROFILES: Record<DesktopShellType, PerformanceProfile> = {
  electron: { binarySize: 200, ramIdle: 220, ramWorkspace: 450, startupCold: 3200, startupWarm: 1000, gpuMemory: 100 },
  tauri: { binarySize: 6, ramIdle: 60, ramWorkspace: 175, startupCold: 450, startupWarm: 125, gpuMemory: 40 },
  nwjs: { binarySize: 160, ramIdle: 175, ramWorkspace: 375, startupCold: 2800, startupWarm: 800, gpuMemory: 80 },
  neutralino: { binarySize: 3, ramIdle: 45, ramWorkspace: 140, startupCold: 280, startupWarm: 80, gpuMemory: 25 },
};

export const SHELL_FEATURES: Record<DesktopShellType, NativeFeatures> = {
  electron: {
    fileDialogs: true, notifications: true, globalShortcuts: true, powerMonitor: true,
    clipboard: true, shell: true, tray: true, webview: true, gpuAcceleration: true,
    autoUpdate: true, protocolHandler: true,
  },
  tauri: {
    fileDialogs: true, notifications: true, globalShortcuts: true, powerMonitor: true,
    clipboard: true, shell: true, tray: true, webview: true, gpuAcceleration: true,
    autoUpdate: true, protocolHandler: true,
  },
  nwjs: {
    fileDialogs: true, notifications: true, globalShortcuts: false, powerMonitor: false,
    clipboard: true, shell: true, tray: true, webview: true, gpuAcceleration: true,
    autoUpdate: false, protocolHandler: false,
  },
  neutralino: {
    fileDialogs: true, notifications: true, globalShortcuts: false, powerMonitor: false,
    clipboard: true, shell: false, tray: false, webview: true, gpuAcceleration: false,
    autoUpdate: false, protocolHandler: false,
  },
};
