export interface CompatibilityReport {
  electronApi: string;
  status: 'compatible' | 'partial' | 'incompatible' | 'unknown';
  theiaAlternative: string;
  notes: string;
  migrationGuide: string;
}

const COMPATIBILITY_DB: Record<string, Omit<CompatibilityReport, 'electronApi'>> = {
  'app.getPath': { status: 'compatible', theiaAlternative: 'EnvVars + FileService', notes: 'Use environment variables for paths', migrationGuide: 'Replace app.getPath(name) with theia equivalent' },
  'app.quit': { status: 'compatible', theiaAlternative: 'FrontendApplication.stop()', notes: 'Graceful shutdown', migrationGuide: 'Call FrontendApplication.stop()' },
  'app.on': { status: 'partial', theiaAlternative: 'LifecycleContribution', notes: 'Some events have equivalents', migrationGuide: 'Map Electron events to Theia lifecycle' },
  'dialog.showMessageBox': { status: 'compatible', theiaAlternative: 'MessageService', notes: 'MessageService.info/warn/error', migrationGuide: 'Replace with MessageService' },
  'dialog.showSaveDialog': { status: 'compatible', theiaAlternative: 'FileDialogService.showSaveDialog', notes: 'Equivalent API', migrationGuide: 'Injectable FileDialogService' },
  'nativeImage': { status: 'partial', theiaAlternative: 'Theia Icon API', notes: 'Different icon system', migrationGuide: 'Use Theia icon contribution' },
  'powerMonitor': { status: 'incompatible', theiaAlternative: 'None', notes: 'No Theia equivalent', migrationGuide: 'Listen for custom events if needed' },
  'screen': { status: 'partial', theiaAlternative: 'ScreenService', notes: 'Basic screen info available', migrationGuide: 'Inject ScreenService' },
  'globalShortcut': { status: 'incompatible', theiaAlternative: 'KeybindingRegistry', notes: 'Theia uses keybinding context', migrationGuide: 'Register keybindings via KeybindingContribution' },
  'Menu': { status: 'compatible', theiaAlternative: 'MenuContribution', notes: 'Richer menu system', migrationGuide: 'Implement MenuContribution' },
  'Tray': { status: 'incompatible', theiaAlternative: 'Not available', notes: 'Theia has no tray API', migrationGuide: 'Use system-specific tray or web notifications' },
  'BrowserWindow': { status: 'partial', theiaAlternative: 'Shell + Widget', notes: 'Different window paradigm', migrationGuide: 'Create widgets instead of windows' },
  'ipcMain': { status: 'compatible', theiaAlternative: 'CommandContribution', notes: 'Commands replace IPC handlers', migrationGuide: 'Register commands vs ipcMain.handle' },
  'ipcRenderer': { status: 'compatible', theiaAlternative: 'CommandService', notes: 'executeCommand replaces invoke', migrationGuide: 'Use CommandService' },
  'net.fetch': { status: 'compatible', theiaAlternative: 'fetch API', notes: 'Standard fetch works', migrationGuide: 'No change needed' },
  'contextBridge': { status: 'incompatible', theiaAlternative: 'Inversify DI', notes: 'Theia uses DI instead of contextBridge', migrationGuide: 'Inject services directly' },
  'webContents': { status: 'incompatible', theiaAlternative: 'WidgetManager', notes: 'No direct equivalent', migrationGuide: 'Use widget management APIs' },
};

export class CompatibilityChecker {
  check(api: string): CompatibilityReport {
    const found = COMPATIBILITY_DB[api];
    if (found) return { electronApi: api, ...found };
    return { electronApi: api, status: 'unknown', theiaAlternative: 'Check Theia documentation', notes: 'API not in compatibility database', migrationGuide: 'Manual review required' };
  }

  checkBatch(apis: string[]): CompatibilityReport[] {
    return apis.map(api => this.check(api));
  }

  getSummary(reports: CompatibilityReport[]): { total: number; compatible: number; partial: number; incompatible: number; unknown: number; compatibility: number } {
    const counts = { total: reports.length, compatible: 0, partial: 0, incompatible: 0, unknown: 0 };
    for (const r of reports) counts[r.status]++;
    return { ...counts, compatibility: counts.total > 0 ? Math.round((counts.compatible / counts.total) * 100) : 0 };
  }
}
