import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { IDEIA_CHAT_SERVICE, IDEIA_ChatService } from '../common/ideia-protocol';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  module: string;
  status: 'success' | 'failure' | 'blocked';
  detail: string;
  durationMs: number;
}

@injectable()
export class IDEIA_AuditWidget extends BaseWidget {
  static ID = 'ideia:audit';
  static LABEL = 'Audit Log';

  private root: Root | undefined;
  private entries: AuditEntry[] = [];
  private filterText = '';

  constructor(
    @inject(IDEIA_CHAT_SERVICE) private chatService: IDEIA_ChatService,
  ) {
    super();
    this.id = IDEIA_AuditWidget.ID;
    this.title.label = IDEIA_AuditWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-history';
    this.node.style.height = '100%';
    this.node.style.overflow = 'auto';
  }

  @postConstruct()
  async init(): Promise<void> {
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
      container.style.padding = '12px';
      container.style.height = '100%';
      this.node.appendChild(container);
      this.root = createRoot(container);
    }

    const filtered = this.filterText
      ? this.entries.filter(e =>
          e.action.toLowerCase().includes(this.filterText.toLowerCase()) ||
          e.module.toLowerCase().includes(this.filterText.toLowerCase()) ||
          e.detail.toLowerCase().includes(this.filterText.toLowerCase())
        )
      : this.entries;

    this.root.render(<AuditComponent entries={filtered} totalCount={this.entries.length} onFilterChange={(t) => { this.filterText = t; this.renderReact(); }} />);
  }
}

const STATUS_COLORS: Record<string, string> = {
  success: '#16a34a',
  failure: '#dc2626',
  blocked: '#ea580c',
};

const AuditComponent: React.FC<{ entries: AuditEntry[]; totalCount: number; onFilterChange: (text: string) => void }> = ({ entries, totalCount, onFilterChange }) => (
  <div style={{ fontFamily: 'var(--theia-ui-font-family)', color: 'var(--theia-foreground)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Audit Log</h2>
      <span style={{ fontSize: '11px', color: '#888' }}>{totalCount} entries</span>
      <input
        type="text"
        placeholder="Filter entries..."
        onChange={(e) => onFilterChange(e.target.value)}
        style={{
          marginLeft: 'auto', padding: '4px 8px', fontSize: '12px',
          background: 'var(--theia-input-background)', color: 'var(--theia-input-foreground)',
          border: '1px solid var(--theia-border-color)', borderRadius: '4px',
          width: '200px',
        }}
      />
    </div>
    {entries.length === 0 ? (
      <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
        {totalCount === 0 ? 'No audit entries yet.' : 'No entries match the filter.'}
      </div>
    ) : (
      entries.slice(0, 200).map(entry => (
        <div key={entry.id} style={{
          display: 'flex', gap: '8px', padding: '6px 8px', fontSize: '11px',
          borderBottom: '1px solid var(--theia-border-color)',
          alignItems: 'center',
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
            background: STATUS_COLORS[entry.status] || '#888',
          }} />
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#999', flexShrink: 0, width: '100px' }}>
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>
          <span style={{
            fontWeight: 600, fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
            background: entry.status === 'failure' ? 'var(--theia-errorBackground)' : 'transparent',
            color: entry.status === 'failure' ? '#fff' : 'inherit',
            flexShrink: 0, textTransform: 'uppercase',
          }}>
            {entry.module}
          </span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.action}
          </span>
          {entry.durationMs > 0 && (
            <span style={{ fontSize: '10px', color: '#888', flexShrink: 0 }}>
              {entry.durationMs}ms
            </span>
          )}
        </div>
      ))
    )}
  </div>
);
