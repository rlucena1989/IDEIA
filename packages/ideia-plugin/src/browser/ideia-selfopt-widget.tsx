import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { IDEIA_AGENT_SERVICE } from '../common/ideia-protocol';
import { ErrorBoundary } from './ideia-error-boundary';

const AUTONOMY_LEVELS = [
  { level: 'N0', label: 'Blocked', desc: 'All actions require human approval' },
  { level: 'N1', label: 'Guided', desc: 'AI suggests, human decides' },
  { level: 'N2', label: 'Semi-Autonomous', desc: 'AI acts, human reviews' },
  { level: 'N3', label: 'Autonomous', desc: 'AI acts independently within scope' },
  { level: 'N4', label: 'Total', desc: 'Full AI autonomy with oversight' },
];

interface BarChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  maxValue?: number;
  height?: number;
}

function BarChart({ data, maxValue, height = 120 }: BarChartProps): React.ReactElement {
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height, padding: '4px 0' }}>
      {data.map(d => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', background: d.color, height: `${(d.value / max) * 100}%`, minHeight: '4px', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
          <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '4px', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

@injectable()
export class IDEIA_SelfOptWidget extends BaseWidget {
  static ID = 'ideia:selfopt';
  static LABEL = 'Self-Optimization';

  private root: Root | undefined;
  private metrics: any | null = null;
  private timeline: any[] = [];
  private autonomyLevel = 'N2';
  private runningOptimization = false;
  private refreshInterval: ReturnType<typeof setInterval> | undefined;

  constructor(
    @inject(IDEIA_AGENT_SERVICE) private agentService: any
  ) {
    super({});
    this.id = IDEIA_SelfOptWidget.ID;
    this.title.label = IDEIA_SelfOptWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-zap';
    this.node.style.height = '100%';
    this.node.style.overflow = 'auto';
  }

  @postConstruct()
  async init(): Promise<void> {
    await this.refreshData();
    this.refreshInterval = setInterval(() => this.refreshData(), 30000);
    this.toDisposeOnDetach.push({ dispose: () => { if (this.refreshInterval) clearInterval(this.refreshInterval); } });
  }

  private async refreshData(): Promise<void> {
    try {
      const [metrics, timeline, level] = await Promise.all([
        this.agentService.getMetrics(),
        this.agentService.getTimeline(),
        this.agentService.getAutonomyLevel(),
      ]);
      this.metrics = metrics;
      this.timeline = timeline;
      this.autonomyLevel = level;
      this.renderReact();
    } catch {
      /* silent fail for auto-refresh */
    }
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
      container.style.padding = '16px';
      container.style.height = '100%';
      this.node.appendChild(container);
      this.root = createRoot(container);
    }
    this.root.render(this.renderComponent());
  }

  private renderComponent(): React.ReactElement {
    return (
      <ErrorBoundary>
      <div style={{ fontFamily: 'var(--theia-ui-font-family)', color: 'var(--theia-foreground)', fontSize: '13px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="codicon codicon-zap" />
          Self-Optimization Panel
        </h2>

        {this.renderAutonomySelector()}

        {this.metrics && this.renderMetricsGrid()}

        {this.renderActionCards()}

        {this.timeline.length > 0 && this.renderTimelineChart()}
      </div>
      </ErrorBoundary>
    );
  }

  private renderAutonomySelector(): React.ReactElement {
    const currentIdx = AUTONOMY_LEVELS.findIndex(a => a.level === this.autonomyLevel);
    const activeIdx = currentIdx >= 0 ? currentIdx : 1;
    return (
      <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '6px', border: '1px solid var(--theia-border-color)', background: 'var(--theia-sideBar-background)' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--theia-infoForeground)' }}>Autonomy Level</div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {AUTONOMY_LEVELS.map((a, i) => (
            <button
              key={a.level}
              onClick={() => this.handleSetLevel(a.level)}
              style={{
                flex: 1, padding: '6px 4px', border: `1px solid ${i === activeIdx ? 'var(--theia-focusBorder)' : 'var(--theia-border-color)'}`,
                borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 600,
                background: i === activeIdx ? 'var(--theia-button-background)' : 'transparent',
                color: i === activeIdx ? 'var(--theia-button-foreground)' : 'var(--theia-foreground)',
                transition: 'all 0.2s',
              }}
            >
              {a.level}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '11px', opacity: 0.7 }}>
          {activeIdx >= 0 ? AUTONOMY_LEVELS[activeIdx].desc : 'Select a level'}
        </div>
      </div>
    );
  }

  private async handleSetLevel(level: string): Promise<void> {
    try {
      await this.agentService.setAutonomyLevel(level);
      this.autonomyLevel = level;
      this.renderReact();
    } catch {
      /* silent */
    }
  }

  private renderMetricsGrid(): React.ReactElement {
    const m = this.metrics;
    if (!m) return <></>;
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--theia-infoForeground)' }}>Real-Time Metrics</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
          {this.renderMetricCard('Throughput', m.throughputEvtS.toFixed(1) + ' evt/s', '#3b82f6')}
          {this.renderMetricCard('P50 Latency', m.latencyP50.toFixed(0) + 'ms', '#10b981')}
          {this.renderMetricCard('P95 Latency', m.latencyP95.toFixed(0) + 'ms', '#f59e0b')}
          {this.renderMetricCard('P99 Latency', m.latencyP99.toFixed(0) + 'ms', '#ef4444')}
          {this.renderMetricCard('Memory RSS', this.formatBytes(m.memoryRSS), '#8b5cf6')}
          {this.renderMetricCard('LLM Response', m.llmResponseTimeMs.toFixed(0) + 'ms', '#ec4899')}
          {this.renderMetricCard('Gaps', String(m.gapCount), m.gapCount === 0 ? '#10b981' : '#ef4444')}
          {this.renderMetricCard('Coverage', m.testCoverage + '%', '#3b82f6')}
          {this.renderMetricCard('Auto-Corrections', String(m.autoCorrectionCount), '#8b5cf6')}
        </div>
      </div>
    );
  }

  private renderMetricCard(label: string, value: string, color: string): React.ReactElement {
    return (
      <div style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--theia-border-color)', background: 'var(--theia-sideBar-background)', textAlign: 'center' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>{label}</div>
      </div>
    );
  }

  private renderActionCards(): React.ReactElement {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => this.handleRunOptimization()}
          disabled={this.runningOptimization}
          aria-label="Run auto-optimization"
          style={{
            padding: '12px', borderRadius: '6px', border: '1px solid var(--theia-border-color)',
            background: 'var(--theia-button-background)', color: 'var(--theia-button-foreground)',
            cursor: 'pointer', fontSize: '11px', fontWeight: 600, textAlign: 'center',
            opacity: this.runningOptimization ? 0.6 : 1,
          }}
        >
          {this.runningOptimization ? 'Running...' : 'Run Auto-Optimization'}
        </button>
        <button
          onClick={() => this.handleViewBottlenecks()}
          aria-label="View system bottlenecks"
          style={{
            padding: '12px', borderRadius: '6px', border: '1px solid var(--theia-border-color)',
            background: 'transparent', color: 'var(--theia-foreground)',
            cursor: 'pointer', fontSize: '11px', fontWeight: 600, textAlign: 'center',
          }}
        >
          View Bottlenecks
        </button>
        <button
          onClick={() => this.handleResetMetrics()}
          aria-label="Reset all metrics"
          style={{
            padding: '12px', borderRadius: '6px', border: '1px solid var(--theia-border-color)',
            background: 'transparent', color: 'var(--theia-foreground)',
            cursor: 'pointer', fontSize: '11px', fontWeight: 600, textAlign: 'center',
          }}
        >
          Reset Metrics
        </button>
      </div>
    );
  }

  private async handleRunOptimization(): Promise<void> {
    this.runningOptimization = true;
    this.renderReact();
    try {
      await this.agentService.runAutoOptimization();
    } catch {
      /* silent */
    }
    this.runningOptimization = false;
    await this.refreshData();
  }

  private async handleViewBottlenecks(): Promise<void> {
    /* placeholder - could open bottlenecks view */
  }

  private async handleResetMetrics(): Promise<void> {
    try {
      await this.agentService.resetMetrics();
      await this.refreshData();
    } catch {
      /* silent */
    }
  }

  private renderTimelineChart(): React.ReactElement {
    const recentPoints = this.timeline.slice(-20);
    const labels = recentPoints.map(p => new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const values = recentPoints.map(p => p.throughputEvtS);
    const maxVal = Math.max(...values, 1);

    const barData = recentPoints.map((p, i) => ({
      label: labels[i],
      value: p.throughputEvtS,
      color: p.throughputEvtS > maxVal * 0.8 ? '#ef4444' : p.throughputEvtS > maxVal * 0.5 ? '#f59e0b' : '#10b981',
    }));

    return (
      <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--theia-border-color)', background: 'var(--theia-sideBar-background)' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--theia-infoForeground)' }}>Throughput History (last {recentPoints.length} samples)</div>
        <BarChart data={barData} maxValue={maxVal * 1.1} height={100} />
      </div>
    );
  }

  private formatBytes(n: number): string {
    if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(1)}GB`;
    if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)}MB`;
    if (n >= 1_024) return `${(n / 1_024).toFixed(1)}KB`;
    return `${n}B`;
  }
}
