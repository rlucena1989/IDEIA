export interface ElectronUsage {
  api: string;
  category: 'ipc' | 'browser-window' | 'dialog' | 'shell' | 'menu' | 'tray' | 'notification' | 'file-system' | 'clipboard' | 'screen';
  filePath: string;
  lineNumber: number;
  theiaEquivalent: string;
  complexity: 'low' | 'medium' | 'high';
  migrationStatus: 'pending' | 'in-progress' | 'complete' | 'blocked';
}

export interface AnalysisReport {
  totalUsages: number;
  byCategory: Record<string, number>;
  byComplexity: Record<string, number>;
  byStatus: Record<string, number>;
  usages: ElectronUsage[];
  estimatedEffort: number;
  blockingIssues: string[];
}

export class MigrationAnalyzer {
  private usages: ElectronUsage[] = [];

  private readonly API_MAP: Record<string, { theiaEquivalent: string; category: ElectronUsage['category']; complexity: ElectronUsage['complexity'] }> = {
    'ipcMain.handle': { theiaEquivalent: 'CommandContribution.registerCommands', category: 'ipc', complexity: 'medium' },
    'ipcRenderer.invoke': { theiaEquivalent: 'CommandService.executeCommand', category: 'ipc', complexity: 'low' },
    'BrowserWindow': { theiaEquivalent: 'Shell + ViewContribution', category: 'browser-window', complexity: 'high' },
    'dialog.showOpenDialog': { theiaEquivalent: 'FileDialogService', category: 'dialog', complexity: 'medium' },
    'dialog.showSaveDialog': { theiaEquivalent: 'FileDialogService.save', category: 'dialog', complexity: 'medium' },
    'shell.openExternal': { theiaEquivalent: 'OpenerService.open', category: 'shell', complexity: 'low' },
    'Menu.buildFromTemplate': { theiaEquivalent: 'MenuContribution + MenuModelRegistry', category: 'menu', complexity: 'high' },
    'Tray': { theiaEquivalent: 'Theia Tray (not yet available)', category: 'tray', complexity: 'high' },
    'Notification': { theiaEquivalent: 'MessageService', category: 'notification', complexity: 'low' },
    'clipboard': { theiaEquivalent: 'ClipboardService', category: 'clipboard', complexity: 'low' },
    'screen': { theiaEquivalent: 'ScreenService', category: 'screen', complexity: 'medium' },
  };

  registerUsage(api: string, filePath: string, lineNumber: number): void {
    const mapping = this.API_MAP[api];
    if (!mapping) {
      this.usages.push({
        api, category: 'file-system', filePath, lineNumber,
        theiaEquivalent: 'FileService',
        complexity: 'medium', migrationStatus: 'pending',
      });
      return;
    }
    this.usages.push({
      api, ...mapping, filePath, lineNumber,
      migrationStatus: 'pending',
    });
  }

  generateReport(): AnalysisReport {
    const byCategory: Record<string, number> = {};
    const byComplexity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const u of this.usages) {
      byCategory[u.category] = (byCategory[u.category] || 0) + 1;
      byComplexity[u.complexity] = (byComplexity[u.complexity] || 0) + 1;
      byStatus[u.migrationStatus] = (byStatus[u.migrationStatus] || 0) + 1;
    }

    const effortMap = { low: 2, medium: 8, high: 24 };
    const estimatedEffort = this.usages.reduce((sum, u) => sum + (effortMap[u.complexity] || 4), 0);
    const blockingIssues = this.usages.filter(u => u.complexity === 'high' && u.migrationStatus !== 'complete').map(u => `${u.api} in ${u.filePath}:${u.lineNumber}`);

    return {
      totalUsages: this.usages.length,
      byCategory, byComplexity, byStatus,
      usages: [...this.usages],
      estimatedEffort,
      blockingIssues,
    };
  }

  markStatus(api: string, status: ElectronUsage['migrationStatus']): void {
    for (const u of this.usages) {
      if (u.api === api) u.migrationStatus = status;
    }
  }
}
