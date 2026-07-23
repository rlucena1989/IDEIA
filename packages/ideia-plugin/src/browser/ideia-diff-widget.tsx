import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { IDEIA_TASK_SERVICE } from '../common/ideia-protocol';
import { IDEIA_TaskService } from '../common/ideia-protocol';
import { FileChange } from '../common/ideia-types';

@injectable()
export class IDEIA_DiffWidget extends BaseWidget {
  static ID = 'ideia:diff';
  static LABEL = 'IDEIA Diff';

  private root: Root | undefined;
  private changes: FileChange[] = [];
  private selectedIndex = 0;

  constructor(
    @inject(IDEIA_TASK_SERVICE) private taskService: IDEIA_TaskService,
  ) {
    super();
    this.id = IDEIA_DiffWidget.ID;
    this.title.label = IDEIA_DiffWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-diff';
    this.node.style.height = '100%';
    this.node.style.overflow = 'hidden';
  }

  setChanges(changes: FileChange[]): void {
    this.changes = changes;
    this.selectedIndex = 0;
    this.renderReact();
  }

  protected override onAfterAttach(): void {
    this.renderReact();
  }

  protected onDetach(): void {
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
  }

  private renderReact(): void {
    if (!this.root) {
      const container = document.createElement('div');
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      this.node.appendChild(container);
      this.root = createRoot(container);
    }
    this.root.render(this.renderComponent());
  }

  private renderComponent(): React.ReactElement {
    if (this.changes.length === 0) {
      return (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--theia-descriptionForeground)' }}>
          No changes to display. Use IDEIA to generate or modify files.
        </div>
      );
    }

    const current = this.changes[this.selectedIndex];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--theia-border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--theia-sideBar-background)',
        }}>
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Changes</span>
          <span style={{ fontSize: '11px', opacity: 0.7 }}>
            {this.selectedIndex + 1} / {this.changes.length}
          </span>
          <div style={{ flex: 1 }} />
          <select
            value={this.selectedIndex}
            onChange={e => { this.selectedIndex = Number(e.target.value); this.renderReact(); }}
            style={{
              padding: '2px 6px',
              borderRadius: '3px',
              border: '1px solid var(--theia-border-color)',
              background: 'var(--theia-input-background)',
              color: 'var(--theia-input-foreground)',
              fontSize: '12px',
            }}
          >
            {this.changes.map((fc, i) => (
              <option key={fc.path} value={i}>
                {fc.status === 'added' ? '+' : fc.status === 'deleted' ? '-' : '~'} {fc.path}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {current.status !== 'added' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--theia-border-color)' }}>
              <div style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, background: 'var(--theia-editorWidget-background)', borderBottom: '1px solid var(--theia-border-color)' }}>
                Original
              </div>
              <pre style={{ flex: 1, overflow: 'auto', padding: '8px', margin: 0, fontSize: '12px', lineHeight: '1.5', fontFamily: 'var(--theia-code-font-family)' }}>
                {current.originalContent || '(empty file)'}
              </pre>
            </div>
          )}
          {current.status !== 'deleted' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, background: 'var(--theia-editorWidget-background)', borderBottom: '1px solid var(--theia-border-color)' }}>
                Modified
              </div>
              <pre style={{ flex: 1, overflow: 'auto', padding: '8px', margin: 0, fontSize: '12px', lineHeight: '1.5', fontFamily: 'var(--theia-code-font-family)' }}>
                {current.modifiedContent || '(empty file)'}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }
}
