import * as React from '@theia/core/shared/react';
import { injectable, inject } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { IDEIA_DASHBOARD_SERVICE, IDEIA_DashboardService } from '../common/ideia-protocol';
import {
  DataProvider, ProviderData,
  createDefaultProviders,
} from './ideia-cockpit-providers';
import { ErrorBoundary } from './ideia-error-boundary';

interface CockpitState {
  providers: ProviderData[];
  lastRefresh: string;
  connected: boolean;
}

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
  grid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    marginBottom: '12px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 10px',
    background: '#141414',
    borderRadius: '6px',
    gap: '10px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  label: {
    color: '#999',
    flex: 1,
    fontSize: '11px',
  },
  value: {
    color: '#e0e0e0',
    fontWeight: 600,
    fontSize: '12px',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '10px',
    color: '#666',
    borderTop: '1px solid #222',
    paddingTop: '8px',
  },
};

@injectable()
export class IDEIA_CockpitWidget extends ReactWidget {
  static ID = 'ideia-cockpit';
  static LABEL = 'IDEIA Cockpit';

  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private providers: DataProvider[];
  private stateData: CockpitState;

  constructor(
    @inject(IDEIA_DASHBOARD_SERVICE) private dashboardService: IDEIA_DashboardService,
  ) {
    super({});
    this.id = IDEIA_CockpitWidget.ID;
    this.title.label = IDEIA_CockpitWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'fa fa-dashboard';
    this.node.style.minWidth = '280px';

    this.providers = createDefaultProviders(this.dashboardService);
    this.stateData = {
      providers: this.providers.map(() => ({ label: '', value: '...', status: 'loading' })),
      lastRefresh: new Date().toLocaleTimeString(),
      connected: true,
    };
  }

  protected override onAfterAttach(msg: any): void {
    super.onAfterAttach(msg);
    this.refreshAll();
    this.refreshTimer = setInterval(() => this.refreshAll(), 30000);
  }

  protected override onBeforeDetach(msg: any): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    super.onBeforeDetach(msg);
  }

  private async refreshAll(): Promise<void> {
    const results = await Promise.all(
      this.providers.map(p => p.refresh().catch(() => ({
        label: p.label, value: 'error', status: 'error' as const,
      }))),
    );
    this.stateData = {
      providers: results,
      lastRefresh: new Date().toLocaleTimeString(),
      connected: true,
    };
    this.update();
  }

  protected render(): React.ReactNode {
    return React.createElement(ErrorBoundary, null,
      React.createElement('div', { style: s.wrapper },
        React.createElement('div', { style: s.header },
          React.createElement('span', { className: 'fa fa-dashboard', style: { fontSize: '14px' } }),
          'IDEIA Cockpit'
        ),
        React.createElement('div', { style: s.grid },
          ...this.stateData.providers.map(p => this.renderProvider(p)),
        ),
        React.createElement('div', { style: s.footer },
          React.createElement('span', {
            style: {
              ...s.dot,
              background: this.stateData.connected ? '#2dd4bf' : '#e81123',
            },
          }),
          React.createElement('span', null, `Updated: ${this.stateData.lastRefresh}`),
          React.createElement('button', {
            onClick: () => this.refreshAll(),
            style: {
              marginLeft: 'auto',
              background: 'transparent',
              border: '1px solid #333',
              color: '#888',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '2px 8px',
              fontFamily: 'inherit',
            },
          }, 'Refresh'),
        ),
      ),
    );
  }

  private renderProvider(p: ProviderData): React.ReactNode {
    const statusColors = { ok: '#2dd4bf', warning: '#f59e0b', error: '#e81123', loading: '#666' };
    const color = statusColors[p.status];
    return React.createElement('div', {
      key: p.label,
      style: s.card,
    },
      React.createElement('span', { style: { ...s.dot, background: color } }),
      React.createElement('span', { style: s.label }, p.label),
      React.createElement('span', { style: s.value }, p.value),
    );
  }
}
