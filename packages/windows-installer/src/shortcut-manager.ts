export interface ShortcutEntry {
  name: string;
  target: string;
  args: string;
  icon: string;
  folder: 'start-menu' | 'desktop' | 'taskbar' | 'startup';
  workingDir: string;
  description: string;
}

export class ShortcutManager {
  private shortcuts: ShortcutEntry[] = [];

  add(entry: ShortcutEntry): void {
    this.shortcuts.push(entry);
  }

  remove(name: string): void {
    this.shortcuts = this.shortcuts.filter(s => s.name !== name);
  }

  list(folder?: ShortcutEntry['folder']): ShortcutEntry[] {
    if (folder) return this.shortcuts.filter(s => s.folder === folder);
    return [...this.shortcuts];
  }

  generatePowerShell(folder: ShortcutEntry['folder']): string {
    const relevant = this.shortcuts.filter(s => s.folder === folder);
    const lines: string[] = [];
    for (const s of relevant) {
      const shellFolder = s.folder === 'desktop' ? 'Desktop' :
        s.folder === 'start-menu' ? 'StartMenu' :
        s.folder === 'startup' ? 'Startup' : 'Taskbar';
      lines.push(`$wshell = New-Object -ComObject WScript.Shell`);
      lines.push(`$shortcut = $wshell.CreateShortcut("$env:${shellFolder}\\${s.name}.lnk")`);
      lines.push(`$shortcut.TargetPath = "${s.target}"`);
      if (s.args) lines.push(`$shortcut.Arguments = "${s.args}"`);
      if (s.icon) lines.push(`$shortcut.IconLocation = "${s.icon}"`);
      if (s.workingDir) lines.push(`$shortcut.WorkingDirectory = "${s.workingDir}"`);
      if (s.description) lines.push(`$shortcut.Description = "${s.description}"`);
      lines.push(`$shortcut.Save()`);
      lines.push('');
    }
    return lines.join('\n');
  }
}
