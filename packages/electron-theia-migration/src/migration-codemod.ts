export interface CodemodRule {
  id: string;
  name: string;
  electronPattern: RegExp;
  theiaTemplate: string;
  description: string;
  category: string;
}

export interface CodemodResult {
  ruleId: string;
  filePath: string;
  matched: boolean;
  transformed: boolean;
  before?: string;
  after?: string;
  error?: string;
}

export class MigrationCodemod {
  private rules: CodemodRule[] = [];

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.registerRule({
      id: 'ipc-handle-to-command',
      name: 'IPC Handler → Command Contribution',
      electronPattern: /ipcMain\.handle\(\s*['"]([^'"]+)['"]\s*,/g,
      theiaTemplate: 'registry.registerCommand({ id: \'$1\', execute: async () => {',
      description: 'Converts ipcMain.handle to Theia CommandContribution',
      category: 'ipc',
    });
    this.registerRule({
      id: 'ipc-invoke-to-execute',
      name: 'IPC Invoke → Command Execute',
      electronPattern: /ipcRenderer\.invoke\(\s*['"]([^'"]+)['"]\s*,/g,
      theiaTemplate: 'commands.executeCommand(\'$1\', ',
      description: 'Converts ipcRenderer.invoke to command execution',
      category: 'ipc',
    });
    this.registerRule({
      id: 'browser-window-to-view',
      name: 'BrowserWindow → ViewContribution',
      electronPattern: /new\s+BrowserWindow\s*\(/g,
      theiaTemplate: '// TODO: migrate to ViewContribution + Widget\n@injectable()\nclass MigratedWidget extends ReactWidget {',
      description: 'Converts Electron BrowserWindow to Theia widget',
      category: 'browser-window',
    });
    this.registerRule({
      id: 'dialog-to-file-dialog',
      name: 'dialog.showOpenDialog → FileDialogService',
      electronPattern: /dialog\.showOpenDialog/g,
      theiaTemplate: 'this.fileDialogService.showOpenDialog(',
      description: 'Converts Electron dialogs to Theia FileDialogService',
      category: 'dialog',
    });
    this.registerRule({
      id: 'shell-open-to-opener',
      name: 'shell.openExternal → OpenerService',
      electronPattern: /shell\.openExternal\s*\(/g,
      theiaTemplate: 'this.openerService.open(',
      description: 'Converts shell.openExternal to Theia OpenerService',
      category: 'shell',
    });
    this.registerRule({
      id: 'class-to-injectable',
      name: 'Class → @injectable',
      electronPattern: /^export\s+class\s+(\w+Service)\s*\{/gm,
      theiaTemplate: '@injectable()\nexport class $1 {',
      description: 'Adds @injectable() decorator to service classes',
      category: 'di',
    });
  }

  registerRule(rule: CodemodRule): void {
    this.rules.push(rule);
  }

  getRules(): CodemodRule[] {
    return [...this.rules];
  }

  getRulesByCategory(category: string): CodemodRule[] {
    return this.rules.filter(r => r.category === category);
  }

  analyzeFile(content: string): CodemodResult[] {
    const results: CodemodResult[] = [];
    for (const rule of this.rules) {
      const pattern = new RegExp(rule.electronPattern.source, 'g');
      const matches = content.match(pattern);
      if (matches) {
        results.push({
          ruleId: rule.id,
          filePath: '',
          matched: true,
          transformed: false,
          before: matches[0],
        });
      }
    }
    return results;
  }

  transformContent(content: string): { result: string; applied: CodemodResult[] } {
    const applied: CodemodResult[] = [];
    let result = content;
    for (const rule of this.rules) {
      const before = result;
      const pattern = new RegExp(rule.electronPattern.source, 'g');
      result = result.replace(pattern, rule.theiaTemplate);
      if (result !== before) {
        applied.push({
          ruleId: rule.id,
          filePath: '',
          matched: true,
          transformed: true,
          before: before.substring(0, 100),
          after: rule.theiaTemplate,
        });
      }
    }
    return { result, applied };
  }
}
