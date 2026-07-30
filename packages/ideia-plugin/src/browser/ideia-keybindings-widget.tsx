import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { KeybindingCustomizer, KeybindingEntry } from '@ideia/keybinding-system';
import { ErrorBoundary as IDEIA_ErrorBoundary } from './ideia-error-boundary';

interface KeybindingsWidgetProps {
  container: HTMLElement;
  customizer: KeybindingCustomizer;
  onClose?: () => void;
}

export class IDEIA_KeybindingsWidget {
  private root: Root | undefined;
  private container: HTMLElement;
  private customizer: KeybindingCustomizer;
  private onClose?: () => void;
  private editingCommand: string | null = null;
  private editingValue = '';

  constructor(props: KeybindingsWidgetProps) {
    this.container = props.container;
    this.customizer = props.customizer;
    this.onClose = props.onClose;
  }

  mount(): void {
    const div = document.createElement('div');
    div.id = 'ideia-keybindings';
    div.style.cssText = 'height:100%;display:flex;flex-direction:column;';
    this.container.appendChild(div);
    this.root = createRoot(div);
    this.render();
  }

  unmount(): void {
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
  }

  private render(): void {
    if (!this.root) return;
    this.root.render(this.renderComponent());
  }

  private renderComponent(): React.ReactElement {
    const entries = this.customizer.getAll();
    const conflicts = this.customizer.getConflicts();
    const conflictKeys = new Set(conflicts.flatMap(c => [c.command, ...c.conflictingWith]));

    return (
      <IDEIA_ErrorBoundary>
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.title}>Keyboard Shortcuts</span>
          <div style={styles.headerActions}>
            <button style={styles.actionBtn} onClick={() => this.handleResetAll()} aria-label="Reset all keybindings to defaults">
              Reset All
            </button>
            <button style={styles.actionBtn} onClick={() => this.handleExport()} aria-label="Export keybindings">
              Export
            </button>
            <button style={styles.actionBtn} onClick={() => this.handleImport()} aria-label="Import keybindings">
              Import
            </button>
            {this.onClose && (
              <button style={styles.closeBtn} onClick={this.onClose} aria-label="Close keybindings">×</button>
            )}
          </div>
        </div>

        <div style={styles.list}>
          {entries.length === 0 && (
            <div style={styles.empty}>No keybindings registered</div>
          )}
          {entries.map(entry => (
            <div
              key={entry.command}
              style={{
                ...styles.item,
                background: conflictKeys.has(entry.command)
                  ? 'var(--theia-inputValidation-errorBackground)'
                  : 'transparent',
              }}
            >
              <div style={styles.itemInfo}>
                <div style={styles.itemCommand}>{entry.command}</div>
                {conflictKeys.has(entry.command) && (
                  <div style={styles.conflictBadge}>Conflict</div>
                )}
              </div>
              <div style={styles.itemBinding}>
                {this.editingCommand === entry.command ? (
                  <input
                    type="text"
                    value={this.editingValue}
                    onChange={e => { this.editingValue = e.target.value; this.render(); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        this.handleSaveBinding(entry.command);
                      }
                      if (e.key === 'Escape') {
                        this.editingCommand = null;
                        this.render();
                      }
                    }}
                    onBlur={() => this.handleSaveBinding(entry.command)}
                    style={styles.editInput}
                    autoFocus
                  />
                ) : (
                  <span
                    style={styles.bindingText}
                    onClick={() => this.startEditing(entry)}
                  >
                    {entry.keybinding}
                  </span>
                )}
                {entry.keybinding !== entry.default && (
                  <button
                    style={styles.resetBtn}
                    onClick={() => this.handleReset(entry.command)}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      </IDEIA_ErrorBoundary>
    );
  }

  private startEditing(entry: KeybindingEntry): void {
    this.editingCommand = entry.command;
    this.editingValue = entry.keybinding;
    this.render();
  }

  private handleSaveBinding(command: string): void {
    if (this.editingValue.trim()) {
      this.customizer.set(command, this.editingValue.trim());
    }
    this.editingCommand = null;
    this.render();
  }

  private handleReset(command: string): void {
    this.customizer.reset(command);
    this.render();
  }

  private handleResetAll(): void {
    for (const entry of this.customizer.getAll()) {
      this.customizer.reset(entry.command);
    }
    this.render();
  }

  private handleExport(): void {
    const json = this.customizer.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ideia-keybindings.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private handleImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      this.customizer.import(text);
      this.render();
    };
    input.click();
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', flexDirection: 'column', height: '100%',
    fontFamily: 'var(--theia-ui-font-family)', fontSize: '13px',
    color: 'var(--theia-foreground)',
    background: 'var(--theia-sideBar-background)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid var(--theia-border-color)',
  },
  title: { fontWeight: 600, fontSize: '13px' },
  headerActions: { display: 'flex', gap: '4px', alignItems: 'center' },
  actionBtn: {
    padding: '3px 8px', fontSize: '11px',
    background: 'var(--theia-button-background)',
    color: 'var(--theia-button-foreground)',
    border: 'none', borderRadius: '3px', cursor: 'pointer',
  },
  closeBtn: {
    background: 'none', border: 'none',
    color: 'var(--theia-foreground)', cursor: 'pointer',
    fontSize: '18px', padding: '0 4px',
  },
  list: { flex: 1, overflowY: 'auto' },
  empty: { padding: '24px', textAlign: 'center', opacity: 0.6 },
  item: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '6px 12px',
    borderBottom: '1px solid var(--theia-border-color)',
  },
  itemInfo: { display: 'flex', alignItems: 'center', gap: '6px', flex: 1 },
  itemCommand: { fontFamily: 'monospace', fontSize: '12px' },
  conflictBadge: {
    padding: '1px 6px', fontSize: '10px', fontWeight: 600,
    background: 'var(--theia-errorForeground)', color: '#fff',
    borderRadius: '3px',
  },
  itemBinding: { display: 'flex', alignItems: 'center', gap: '4px' },
  bindingText: {
    padding: '2px 8px', borderRadius: '3px', cursor: 'pointer',
    background: 'var(--theia-editorWidget-background)',
    border: '1px solid var(--theia-border-color)',
    fontFamily: 'monospace', fontSize: '12px',
    minWidth: '80px', textAlign: 'center',
  },
  editInput: {
    width: '120px', padding: '2px 8px',
    borderRadius: '3px',
    border: '1px solid var(--theia-focusBorder)',
    background: 'var(--theia-input-background)',
    color: 'var(--theia-input-foreground)',
    fontFamily: 'monospace', fontSize: '12px',
  },
  resetBtn: {
    background: 'none', border: 'none',
    color: 'var(--theia-foreground)', cursor: 'pointer',
    fontSize: '14px', opacity: 0.6,
  },
};
