export type ParityStatus = 'full' | 'partial' | 'missing' | 'not-applicable';

export interface FeatureEntry {
  feature: string;
  electronApi: string;
  theiaApi: string;
  status: ParityStatus;
  notes: string;
  effort: 'low' | 'medium' | 'high';
  priority: 'critical' | 'important' | 'nice-to-have';
}

export class FeatureParityMatrix {
  private features: FeatureEntry[] = [];

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.addFeature({ feature: 'Window Management', electronApi: 'BrowserWindow', theiaApi: 'Shell + ViewContribution', status: 'partial', notes: 'Widgets vs windows — different paradigm', effort: 'high', priority: 'critical' });
    this.addFeature({ feature: 'IPC Communication', electronApi: 'ipcMain/ipcRenderer', theiaApi: 'CommandContribution + JSON-RPC', status: 'partial', notes: 'Replace direct IPC with commands + DI service proxies', effort: 'medium', priority: 'critical' });
    this.addFeature({ feature: 'Menu System', electronApi: 'Menu.buildFromTemplate', theiaApi: 'MenuContribution + MenuModelRegistry', status: 'full', notes: 'Theia has a more sophisticated menu system', effort: 'medium', priority: 'critical' });
    this.addFeature({ feature: 'File Dialogs', electronApi: 'dialog.showOpenDialog', theiaApi: 'FileDialogService', status: 'full', notes: 'Theia provides equivalent file dialogs', effort: 'low', priority: 'critical' });
    this.addFeature({ feature: 'Editor', electronApi: 'Monaco (embedded)', theiaApi: 'Monaco (native)', status: 'full', notes: 'Theia has native Monaco integration', effort: 'low', priority: 'critical' });
    this.addFeature({ feature: 'Terminal', electronApi: 'xterm.js (embedded)', theiaApi: 'TerminalWidget + node-pty', status: 'full', notes: 'Theia has full terminal support', effort: 'low', priority: 'critical' });
    this.addFeature({ feature: 'System Tray', electronApi: 'Tray', theiaApi: 'Tray (not available)', status: 'missing', notes: 'Theia does not have a system tray API', effort: 'high', priority: 'nice-to-have' });
    this.addFeature({ feature: 'Notifications', electronApi: 'Notification API', theiaApi: 'MessageService', status: 'full', notes: 'Theia MessageService covers most needs', effort: 'low', priority: 'important' });
    this.addFeature({ feature: 'External Links', electronApi: 'shell.openExternal', theiaApi: 'OpenerService', status: 'full', notes: 'Equivalent functionality', effort: 'low', priority: 'important' });
    this.addFeature({ feature: 'Clipboard', electronApi: 'clipboard', theiaApi: 'ClipboardService', status: 'full', notes: 'Equivalent functionality', effort: 'low', priority: 'important' });
    this.addFeature({ feature: 'File System', electronApi: 'fs module', theiaApi: 'FileService + WorkspaceService', status: 'full', notes: 'Theia abstracts file system access', effort: 'medium', priority: 'critical' });
    this.addFeature({ feature: 'DI Container', electronApi: 'None (manual)', theiaApi: 'Inversify DI', status: 'full', notes: 'Theia has a superior DI system', effort: 'medium', priority: 'critical' });
  }

  addFeature(entry: FeatureEntry): void {
    this.features.push(entry);
  }

  getAll(): FeatureEntry[] {
    return [...this.features];
  }

  getByStatus(status: ParityStatus): FeatureEntry[] {
    return this.features.filter(f => f.status === status);
  }

  getByPriority(priority: FeatureEntry['priority']): FeatureEntry[] {
    return this.features.filter(f => f.priority === priority);
  }

  getSummary(): Record<string, number> {
    const counts: Record<string, number> = { full: 0, partial: 0, missing: 0, 'not-applicable': 0 };
    for (const f of this.features) {
      counts[f.status] = (counts[f.status] || 0) + 1;
    }
    counts.total = this.features.length;
    counts.completion = counts.total > 0 ? Math.round(((counts.full || 0) / counts.total) * 100) : 0;
    return counts;
  }

  updateStatus(feature: string, status: ParityStatus): void {
    const entry = this.features.find(f => f.feature === feature);
    if (entry) entry.status = status;
  }
}
