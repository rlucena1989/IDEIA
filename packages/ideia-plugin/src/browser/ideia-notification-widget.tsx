import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { IDEIA_EmptyState } from './ideia-empty-state';
import { ErrorBoundary } from './ideia-error-boundary';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

@injectable()
export class IDEIA_NotificationWidget extends BaseWidget {
  static ID = 'ideia:notifications';
  static LABEL = 'IDEIA Notifications';

  private root: Root | undefined;
  private notifications: Notification[] = [];
  private filter: 'all' | 'unread' = 'all';

  constructor() {
    super();
    this.id = IDEIA_NotificationWidget.ID;
    this.title.label = IDEIA_NotificationWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-bell';
    this.node.style.height = '100%';
    this.node.style.overflow = 'auto';
  }

  protected override onAfterAttach(): void {
    this.render();
  }

  addNotification(type: Notification['type'], title: string, message: string): void {
    this.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type, title, message,
      timestamp: Date.now(),
      read: false,
    });
    if (this.notifications.length > 100) this.notifications.pop();
    this.render();
  }

  markAsRead(id: string): void {
    const n = this.notifications.find(n => n.id === id);
    if (n) { n.read = true; this.render(); }
  }

  clearAll(): void {
    this.notifications = [];
    this.render();
  }

  private render(): void {
    if (!this.root) this.root = createRoot(this.node);
    const filtered = this.filter === 'unread' ? this.notifications.filter(n => !n.read) : this.notifications;
    this.root.render(<NotificationPanel
      notifications={filtered}
      filter={this.filter}
      onFilterChange={f => { this.filter = f; this.render(); }}
      onMarkRead={id => this.markAsRead(id)}
      onClearAll={() => this.clearAll()}
    />);
  }

  override dispose(): void {
    this.root?.unmount();
    super.dispose();
  }
}

const TYPE_ICONS: Record<string, string> = { info: '\u2139\uFE0F', warning: '\u26A0\uFE0F', error: '\u274C', success: '\u2705' };
const TYPE_COLORS: Record<string, string> = { info: '#3b82f6', warning: '#f59e0b', error: '#ef4444', success: '#10b981' };

function NotificationPanel({ notifications, filter, onFilterChange, onMarkRead, onClearAll }: {
  notifications: Notification[];
  filter: string;
  onFilterChange: (f: 'all' | 'unread') => void;
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}): React.ReactElement {
  return (
    <ErrorBoundary>
    <div style={{ padding: '12px', fontFamily: 'var(--theia-ui-font-family)' }} role="log" aria-label="Notification list" aria-live="polite">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Notifications</h2>
        <button onClick={onClearAll} aria-label="Clear all notifications" style={{ fontSize: '11px', cursor: 'pointer', border: 'none', background: 'none', color: 'var(--theia-foreground)', opacity: 0.6 }}>Clear</button>
      </div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }} role="tablist" aria-label="Filter">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => onFilterChange(f)}
            aria-label={`Show ${f} notifications`}
            aria-pressed={filter === f}
            style={{
              flex: 1, padding: '4px 8px', cursor: 'pointer', border: 'none', borderRadius: '4px', fontSize: '11px',
              background: filter === f ? 'var(--theia-activityBar-activeBorder)' : 'transparent',
              color: filter === f ? 'var(--theia-activityBar-activeForeground)' : 'var(--theia-foreground)',
            }}>{f === 'all' ? 'All' : 'Unread'}</button>
        ))}
      </div>
      {notifications.length === 0 ? (
        <IDEIA_EmptyState title="No notifications" description="You're all caught up!" icon="empty" compact />
      ) : (
        notifications.map(n => (
          <div key={n.id}
            onClick={() => onMarkRead(n.id)}
            role="listitem"
            aria-label={`${n.type} notification: ${n.title}`}
            title={n.read ? 'Click to mark as unread' : 'Click to mark as read'}
            style={{
              padding: '8px', marginBottom: '6px', borderRadius: '4px', cursor: 'pointer',
              background: n.read ? 'transparent' : 'var(--theia-list-hoverBackground)',
              borderLeft: `3px solid ${TYPE_COLORS[n.type] ?? '#666'}`,
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontWeight: n.read ? 400 : 600, fontSize: '13px' }}>
                {TYPE_ICONS[n.type] ?? ''} {n.title}
              </span>
              <span style={{ fontSize: '10px', opacity: 0.5 }}>{formatTime(n.timestamp)}</span>
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>{n.message}</div>
          </div>
        ))
      )}
    </div>
    </ErrorBoundary>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}
