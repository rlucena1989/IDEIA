import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';

interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  snippet?: string;
}

interface ChatHistoryProps {
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export class ChatHistory {
  private root: Root | undefined;
  private conversations: ConversationSummary[] = [];
  private filtered: ConversationSummary[] = [];
  private searchQuery = '';
  private onSelect: (id: string) => void;
  private onDelete: (id: string) => void;
  private onClose: () => void;
  private containerRef: HTMLDivElement | undefined;

  constructor(
    private container: HTMLElement,
    private storagePath: string,
    callbacks: ChatHistoryProps,
  ) {
    this.onSelect = callbacks.onSelect;
    this.onDelete = callbacks.onDelete;
    this.onClose = callbacks.onClose;
  }

  async load(): Promise<void> {
    try {
      const response = await fetch(this.storagePath);
      if (response.ok) {
        this.conversations = await response.json() as ConversationSummary[];
      }
    } catch {
      this.conversations = [];
    }
    this.filtered = [...this.conversations];
    this.render();
  }

  saveConversation(conversation: ConversationSummary): void {
    const existing = this.conversations.findIndex(c => c.id === conversation.id);
    if (existing >= 0) {
      this.conversations[existing] = conversation;
    } else {
      this.conversations.unshift(conversation);
    }
    this.applyFilter();
    this.render();
  }

  loadConversation(id: string): ConversationSummary | undefined {
    return this.conversations.find(c => c.id === id);
  }

  deleteConversation(id: string): void {
    this.conversations = this.conversations.filter(c => c.id !== id);
    this.applyFilter();
    this.render();
    this.onDelete(id);
  }

  searchConversations(query: string): ConversationSummary[] {
    this.searchQuery = query;
    this.applyFilter();
    this.render();
    return this.filtered;
  }

  mount(): void {
    this.render();
    this.load();
  }

  unmount(): void {
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
  }

  private applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filtered = [...this.conversations];
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filtered = this.conversations.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.snippet && c.snippet.toLowerCase().includes(q))
    );
  }

  private render(): void {
    if (!this.root) {
      const div = document.createElement('div');
      div.id = 'ideia-chat-history';
      div.style.cssText = 'height:100%;display:flex;flex-direction:column;';
      this.container.appendChild(div);
      this.root = createRoot(div);
    }

    this.root.render(this.renderComponent());
  }

  private renderComponent(): React.ReactElement {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.title}>Chat History</span>
          <button style={styles.closeBtn} onClick={this.onClose} aria-label="Close chat history">×</button>
        </div>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search conversations... (Ctrl+F)"
            value={this.searchQuery}
            onChange={e => this.searchConversations(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div ref={el => { this.containerRef = el || undefined; }} style={styles.list}>
          {this.filtered.length === 0 && (
            <div style={styles.empty}>
              {this.searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </div>
          )}
          {this.filtered.map(conv => (
            <div
              key={conv.id}
              style={styles.item}
              onClick={() => this.onSelect(conv.id)}
            >
              <div style={styles.itemTitle}>{conv.title}</div>
              <div style={styles.itemMeta}>
                {conv.messageCount} messages · {new Date(conv.updatedAt).toLocaleDateString()}
              </div>
              {conv.snippet && <div style={styles.itemSnippet}>{conv.snippet}</div>}
              <button
                style={styles.deleteBtn}
                onClick={e => { e.stopPropagation(); this.deleteConversation(conv.id); }}
                title="Delete conversation"
                aria-label="Delete conversation"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <div style={styles.footer}>
          <button style={styles.exportBtn} onClick={() => this.exportAll('json')} aria-label="Export conversations as JSON">Export JSON</button>
          <button style={styles.exportBtn} onClick={() => this.exportAll('txt')} aria-label="Export conversations as text">Export TXT</button>
        </div>
      </div>
    );
  }

  private exportAll(_format: 'json' | 'txt'): void {
    const data = _format === 'json'
      ? JSON.stringify(this.conversations, null, 2)
      : this.conversations.map(c =>
          `[${c.updatedAt}] ${c.title} (${c.messageCount} messages)`
        ).join('\n');

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ideia-chat-history.${_format}`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: 'var(--theia-ui-font-family)',
    fontSize: '13px',
    color: 'var(--theia-foreground)',
    background: 'var(--theia-sideBar-background)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid var(--theia-border-color)',
  },
  title: { fontWeight: 600, fontSize: '13px' },
  closeBtn: {
    background: 'none', border: 'none',
    color: 'var(--theia-foreground)', cursor: 'pointer',
    fontSize: '18px', padding: '0 4px',
  },
  searchBox: { padding: '8px 12px' },
  searchInput: {
    width: '100%', padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid var(--theia-border-color)',
    background: 'var(--theia-input-background)',
    color: 'var(--theia-input-foreground)',
    fontSize: '13px', boxSizing: 'border-box',
  },
  list: { flex: 1, overflowY: 'auto', padding: '4px 0' },
  empty: { padding: '24px', textAlign: 'center', opacity: 0.6 },
  item: {
    padding: '8px 12px', cursor: 'pointer',
    borderBottom: '1px solid var(--theia-border-color)',
    transition: 'background 0.15s',
  },
  itemTitle: { fontWeight: 500, marginBottom: '2px' },
  itemMeta: { fontSize: '11px', opacity: 0.6, marginBottom: '2px' },
  itemSnippet: { fontSize: '11px', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  deleteBtn: {
    marginTop: '4px', padding: '2px 8px', fontSize: '11px',
    background: 'transparent', border: '1px solid var(--theia-errorForeground)',
    color: 'var(--theia-errorForeground)', borderRadius: '3px', cursor: 'pointer',
  },
  footer: {
    display: 'flex', gap: '4px', padding: '8px 12px',
    borderTop: '1px solid var(--theia-border-color)',
  },
  exportBtn: {
    flex: 1, padding: '4px 8px', fontSize: '11px',
    background: 'var(--theia-button-background)',
    color: 'var(--theia-button-foreground)',
    border: 'none', borderRadius: '3px', cursor: 'pointer',
  },
};
