import * as crypto from 'crypto';
import { createLogger } from '@ideia/logger';
import * as os from 'os';
import { type IShell, type IShellInfo, type ShellFeature, type WindowOptions, type IWindow, type OpenDialogOptions, type SaveDialogOptions, type NotificationOptions, type TrayOptions, type UpdateInfo, type MemoryInfo, type CPUInfo } from './ishell';
const logger = createLogger('electron-shell');

export class ElectronShell implements IShell {
  readonly info: IShellInfo;
  private _windows: Map<string, IWindow> = new Map();
  private _ready = false;
  private _shortcuts: Map<string, () => void> = new Map();
  private _deepLinkCallback: ((url: string) => void) | null = null;

  constructor() {
    this.info = {
      type: 'electron',
      version: 'electron',
      platform: process.platform,
      arch: process.arch,
      features: [
        'window-management', 'tray', 'global-shortcuts', 'deep-links',
        'native-dialogs', 'notifications', 'auto-update', 'gpu-acceleration',
        'file-system', 'clipboard'
      ]
    };
  }

  hasFeature(feature: ShellFeature): boolean {
    return (this.info.features as ShellFeature[]).includes(feature);
  }

  async initialize(): Promise<void> {
    this._ready = true;
  }

  async shutdown(): Promise<void> {
    this._windows.clear();
    this._shortcuts.clear();
    this._deepLinkCallback = null;
    this._ready = false;
  }

  async createWindow(options: WindowOptions): Promise<IWindow> {
    const id = crypto.randomUUID();
    const win: IWindow = {
      id,
      title: options.title,
      close: async () => { this._windows.delete(id); },
      minimize: async () => {},
      maximize: async () => {},
      restore: async () => {},
      isVisible: () => true,
      setTitle: async (title: string) => { win.title = title; }
    };
    this._windows.set(id, win);
    return win;
  }

  getWindows(): IWindow[] {
    return Array.from(this._windows.values());
  }

  getCurrentWindow(): IWindow {
    const windows = this.getWindows();
    if (windows.length === 0) {
      throw new Error('No windows available');
    }
    return windows[0] as IWindow;
  }

  async showOpenDialog(_options: OpenDialogOptions): Promise<string[]> {
    return [];
  }

  async showSaveDialog(_options: SaveDialogOptions): Promise<string | null> {
    return null;
  }

  showNotification(_options: NotificationOptions): void {
  }

  createTray(_options: TrayOptions): void {
  }

  registerGlobalShortcut(shortcut: string, callback: () => void): void {
    this._shortcuts.set(shortcut, callback);
  }

  unregisterGlobalShortcut(shortcut: string): void {
    this._shortcuts.delete(shortcut);
  }

  onDeepLink(callback: (url: string) => void): void {
    this._deepLinkCallback = callback;
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    return null;
  }

  async downloadUpdate(): Promise<void> {
  }

  async installUpdate(): Promise<void> {
  }

  async getMemoryUsage(): Promise<MemoryInfo> {
    const processMemory = process.memoryUsage();
    const total = os.totalmem();
    const free = os.freemem();
    return {
      total,
      free,
      usage: ((total - free) / total) * 100,
      process: processMemory.heapUsed
    };
  }

  async getCPUUsage(): Promise<CPUInfo> {
    const cpus = os.cpus();
    const cores = cpus.length;
    const model = cpus.length > 0 ? cpus[0].model : '';
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce((acc, cpu) => {
      return acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
    }, 0);
    const usage = totalTick > 0 ? ((totalTick - totalIdle) / totalTick) * 100 : 0;
    return { usage, cores, model };
  }
}
