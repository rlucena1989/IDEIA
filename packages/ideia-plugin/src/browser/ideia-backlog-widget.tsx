import * as React from '@theia/core/shared/react';
import { injectable } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { ErrorBoundary } from './ideia-error-boundary';

interface BacklogItem {
  id: string
  title: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed'
  assignee?: string
  dueDate?: string
  effort: string
  area: string
}

const MOCK_BACKLOG: BacklogItem[] = [
  { id: 'P1', title: 'OWASP ASVS 71% -> 90%', priority: 'high', status: 'in_progress', effort: '~16h', area: 'Security' },
  { id: 'P2', title: 'CI/CD quality gates automation', priority: 'critical', status: 'pending', effort: '~10h', area: 'Infra' },
  { id: 'P3', title: 'Cockpit backlog view', priority: 'medium', status: 'completed', effort: '~6h', area: 'UI' },
  { id: 'P4', title: 'Secrets rotation policy', priority: 'high', status: 'pending', effort: '~4h', area: 'Security' },
  { id: 'P5', title: 'Governance checklists', priority: 'medium', status: 'pending', effort: '~4h', area: 'Governance' },
  { id: 'P6', title: 'OWASP LLM Top 10 10/10', priority: 'medium', status: 'completed', effort: '~8h', area: 'Security' },
  { id: 'P7', title: 'Gate 3 Release pipeline', priority: 'high', status: 'pending', effort: '~10h', area: 'Infra' },
  { id: 'P8', title: 'Gate 2 PR automation', priority: 'high', status: 'in_progress', effort: '~8h', area: 'Infra' },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  completed: '#16a34a',
};

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    padding: '12px',
    fontFamily: "'SF Mono', 'Cascadia Code', 'Consolas', monospace",
    fontSize: '12px',
    color: '#ccc',
    height: '100%',
    overflow: 'auto',
    background: '#0d0d0d',
  },
  header: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#2dd4bf',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  stats: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    fontSize: '11px',
  },
  statBox: {
    padding: '8px 12px',
    background: '#141414',
    borderRadius: '6px',
    flex: 1,
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#e0e0e0',
  },
  statLabel: {
    fontSize: '10px',
    color: '#666',
    marginTop: '2px',
  },
  filters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '10px',
  },
  select: {
    background: '#141414',
    color: '#ccc',
    border: '1px solid #333',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '11px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '6px 8px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: '#666',
    borderBottom: '1px solid #222',
    textAlign: 'left' as const,
  },
  td: {
    padding: '6px 8px',
    fontSize: '11px',
    borderBottom: '1px solid #1a1a1a',
    color: '#b0b0b0',
  },
  badge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 600,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '10px',
    color: '#666',
    borderTop: '1px solid #222',
    paddingTop: '8px',
    marginTop: '8px',
  },
};

@injectable()
export class IDEIA_BacklogWidget extends ReactWidget {
  static ID = 'ideia:backlog';
  static LABEL = 'Backlog';

  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private items: BacklogItem[] = MOCK_BACKLOG;
  private filterArea = '';
  private filterStatus = '';
  private lastRefresh = new Date().toLocaleTimeString();

  constructor() {
    super({});
    this.id = IDEIA_BacklogWidget.ID;
    this.title.label = IDEIA_BacklogWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-list-tree';
    this.node.style.minWidth = '320px';
  }

  protected override onAfterAttach(msg: any): void {
    super.onAfterAttach(msg);
    this.refreshTimer = setInterval(() => {
      this.lastRefresh = new Date().toLocaleTimeString();
      this.update();
    }, 60000);
  }

  protected override onBeforeDetach(msg: any): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    super.onBeforeDetach(msg);
  }

  protected render(): React.ReactNode {
    const areas = [...new Set(this.items.map(i => i.area))].sort();
    const statuses = [...new Set(this.items.map(i => i.status))];

    const filtered = this.items.filter(i =>
      (!this.filterArea || i.area === this.filterArea) &&
      (!this.filterStatus || i.status === this.filterStatus)
    );

    const total = this.items.length;
    const completedCount = filtered.filter(i => i.status === 'completed').length;
    const totalCount = filtered.length;
    const pct = totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : '0';

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...filtered].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return React.createElement(ErrorBoundary, null,
      React.createElement('div', { style: s.wrapper },

        React.createElement('div', { style: s.header },
          React.createElement('span', { className: 'codicon codicon-list-tree', style: { fontSize: '14px' } }),
          'Backlog'
        ),

        React.createElement('div', { style: s.stats },
          React.createElement('div', { style: s.statBox },
            React.createElement('div', { style: s.statValue }, `${completedCount}/${totalCount}`),
            React.createElement('div', { style: s.statLabel }, `Completed (${pct}%)`),
          ),
          React.createElement('div', { style: s.statBox },
            React.createElement('div', { style: { ...s.statValue, color: '#f59e0b' } },
              String(totalCount - completedCount)
            ),
            React.createElement('div', { style: s.statLabel }, 'Remaining'),
          ),
          React.createElement('div', { style: s.statBox },
            React.createElement('div', { style: { ...s.statValue, color: '#2dd4bf' } },
              String(total)
            ),
            React.createElement('div', { style: s.statLabel }, 'Total Items'),
          ),
        ),

        React.createElement('div', { style: s.filters },
          React.createElement('select', {
            style: s.select,
            value: this.filterArea,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
              this.filterArea = e.target.value;
              this.update();
            },
          },
            React.createElement('option', { value: '' }, 'All Areas'),
            ...areas.map(a =>
              React.createElement('option', { key: a, value: a }, a)
            ),
          ),
          React.createElement('select', {
            style: s.select,
            value: this.filterStatus,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
              this.filterStatus = e.target.value;
              this.update();
            },
          },
            React.createElement('option', { value: '' }, 'All Status'),
            ...statuses.map(s =>
              React.createElement('option', { key: s, value: s }, STATUS_LABELS[s])
            ),
          ),
        ),

        React.createElement('table', { style: s.table },
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', { style: s.th }, 'ID'),
              React.createElement('th', { style: s.th }, 'Title'),
              React.createElement('th', { style: s.th }, 'Priority'),
              React.createElement('th', { style: s.th }, 'Status'),
              React.createElement('th', { style: s.th }, 'Effort'),
              React.createElement('th', { style: s.th }, 'Area'),
            ),
          ),
          React.createElement('tbody', null,
            ...sorted.map(item =>
              React.createElement('tr', {
                key: item.id,
                style: { opacity: item.status === 'completed' ? 0.5 : 1 },
              },
                React.createElement('td', { style: s.td },
                  React.createElement('span', {
                    style: { color: '#666', fontWeight: 600, fontSize: '10px' },
                  }, item.id),
                ),
                React.createElement('td', {
                  style: {
                    ...s.td,
                    color: item.status === 'completed' ? '#666' : '#e0e0e0',
                    textDecoration: item.status === 'completed' ? 'line-through' : 'none',
                  },
                }, item.title),
                React.createElement('td', { style: s.td },
                  React.createElement('span', {
                    style: {
                      ...s.badge,
                      background: `${PRIORITY_COLORS[item.priority]}22`,
                      color: PRIORITY_COLORS[item.priority],
                      border: `1px solid ${PRIORITY_COLORS[item.priority]}44`,
                    },
                  }, item.priority),
                ),
                React.createElement('td', { style: s.td },
                  React.createElement('span', {
                    style: {
                      ...s.badge,
                      background: `${STATUS_COLORS[item.status]}22`,
                      color: STATUS_COLORS[item.status],
                    },
                  }, STATUS_LABELS[item.status]),
                ),
                React.createElement('td', { style: { ...s.td, color: '#888' } }, item.effort),
                React.createElement('td', { style: { ...s.td, fontSize: '10px', color: '#666' } }, item.area),
              ),
            ),
          ),
        ),

        React.createElement('div', { style: s.footer },
          React.createElement('span', {
            style: {
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#2dd4bf',
            },
          }),
          React.createElement('span', null, `Updated: ${this.lastRefresh}`),
        ),
      ),
    );
  }
}
