import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import * as os from 'os';
import { type IShell, type IShellInfo, type ShellFeature, type WindowOptions, type IWindow, type OpenDialogOptions, type SaveDialogOptions, type NotificationOptions, type TrayOptions, type UpdateInfo, type MemoryInfo, type CPUInfo } from './ishell';
const logger = createLogger('cli-shell');

export class CliShell implements IShell {
  readonly info: IShellInfo;
  private _shortcuts: Map<string, () => void> = new Map();
  private _deepLinkCallback: ((url: string) => void) | null = null;

  constructor() {
    let version = process.version;
    try {
      const pkgPath = path.resolve(__dirname, '..', 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string };
        if (pkg.version) {
          version = pkg.version;
        }
      }
    } catch {
    }
    this.info = {
      type: 'cli',
      version,
      platform: process.platform,
      arch: process.arch,
      features: ['file-system', 'clipboard']
    };
  }

  hasFeature(feature: ShellFeature): boolean {
    return (this.info.features as ShellFeature[]).includes(feature);
  }

  async initialize(): Promise<void> {
  }

  async shutdown(): Promise<void> {
    this._shortcuts.clear();
    this._deepLinkCallback = null;
  }

  async createWindow(_options: WindowOptions): Promise<IWindow> {
    throw new Error('CLI shell does not support window management');
  }

  getWindows(): IWindow[] {
    return [];
  }

  getCurrentWindow(): IWindow {
    throw new Error('CLI shell does not support window management');
  }

  async showOpenDialog(_options: OpenDialogOptions): Promise<string[]> {
    return process.argv.slice(2);
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
