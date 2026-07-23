import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { IDEIA_DASHBOARD_SERVICE, IDEIA_TASK_SERVICE, IDEIA_AGENT_SERVICE } from '../common/ideia-protocol';
import { IDEIA_DashboardService, IDEIA_TaskService, IDEIA_AgentService } from '../common/ideia-protocol';
import { DashboardMetrics, AgentInfo, TaskSpec } from '../common/ideia-types';

@injectable()
export class IDEIA_DashboardWidget extends BaseWidget {
  static ID = 'ideia:dashboard';
  static LABEL = 'IDEIA Dashboard';

  private root: Root | undefined;
  private metrics: DashboardMetrics | null = null;
  private agents: AgentInfo[] = [];
  private tasks: TaskSpec[] = [];
  private refreshInterval: ReturnType<typeof setInterval> | undefined;

  constructor(
    @inject(IDEIA_DASHBOARD_SERVICE) private dashboardService: IDEIA_DashboardService,
    @inject(IDEIA_TASK_SERVICE) private taskService: IDEIA_TaskService,
    @inject(IDEIA_AGENT_SERVICE) private agentService: IDEIA_AgentService,
  ) {
    super();
    this.id = IDEIA_DashboardWidget.ID;
    this.title.label = IDEIA_DashboardWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-dashboard';
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
      const [metrics, agents, tasks] = await Promise.all([
        this.dashboardService.getMetrics(),
        this.agentService.getAgents(),
        this.taskService.getTasks(),
      ]);
      this.metrics = metrics;
      this.agents = agents;
      this.tasks = tasks;
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
      <div style={{ fontFamily: 'var(--theia-ui-font-family)', color: 'var(--theia-foreground)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0' }}>IDEIA Dashboard</h2>

        {this.metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '20px' }}>
            {this.renderMetricCard('Tasks Done', String(this.metrics.tasksCompleted), 'var(--theia-successForeground)')}
            {this.renderMetricCard('Failed', String(this.metrics.tasksFailed), 'var(--theia-errorForeground)')}
            {this.renderMetricCard('Active Agents', String(this.metrics.agentsActive), 'var(--theia-infoForeground)')}
            {this.renderMetricCard('Tokens Used', this.formatTokens(this.metrics.tokensUsed), 'var(--theia-foreground)')}
            {this.renderMetricCard('Avg Score', `${this.metrics.averageScore}%`, 'var(--theia-warningForeground)')}
            {this.renderMetricCard('Violations', String(this.metrics.violationsActive), this.metrics.violationsActive > 0 ? 'var(--theia-errorForeground)' : 'var(--theia-successForeground)')}
            {this.renderMetricCard('Coverage', `${this.metrics.coveragePercent}%`, this.metrics.coveragePercent >= 80 ? 'var(--theia-successForeground)' : 'var(--theia-warningForeground)')}
            {this.metrics.servicesCount > 0 && this.renderMetricCard('Services', String(this.metrics.servicesCount), '#3b82f6')}
            {this.metrics.capabilitiesCount > 0 && this.renderMetricCard('Capabilities', String(this.metrics.capabilitiesCount), '#8b5cf6')}
            {this.metrics.studyScore > 0 && this.renderMetricCard('Studies', `${this.metrics.studiesCompleted}/${this.metrics.studiesCount}`, '#16a34a')}
            {this.metrics.tutorialsTotal > 0 && this.renderMetricCard('Tutorials', `${this.metrics.tutorialsCompleted}/${this.metrics.tutorialsTotal}`, '#ea580c')}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0' }}>Agents</h3>
          {this.agents.length === 0 && <div style={{ fontSize: '12px', opacity: 0.6 }}>No agents registered</div>}
          {this.agents.map(agent => (
            <div key={agent.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid var(--theia-border-color)',
              marginBottom: '4px',
              fontSize: '12px',
            }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: agent.status === 'running' ? 'var(--theia-successForeground)' :
                           agent.status === 'error' ? 'var(--theia-errorForeground)' :
                           'var(--theia-descriptionForeground)',
              }} />
              <span style={{ fontWeight: 600 }}>{agent.name}</span>
              <span style={{ opacity: 0.6 }}>{agent.description}</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: '11px', opacity: 0.5 }}>
                {agent.metrics?.completedTasks ?? 0} tasks
              </span>
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0' }}>Recent Tasks</h3>
          {this.tasks.length === 0 && <div style={{ fontSize: '12px', opacity: 0.6 }}>No tasks yet</div>}
          {this.tasks.slice(0, 10).map(task => (
            <div key={task.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 8px',
              fontSize: '12px',
              borderBottom: '1px solid var(--theia-border-color)',
            }}>
              <span className={`codicon codicon-${task.status === 'completed' ? 'check' : task.status === 'running' ? 'sync~spin' : task.status === 'failed' ? 'close' : 'circle-outline'}`} />
              <span style={{ flex: 1 }}>{task.title}</span>
              <span style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '3px',
                background: task.status === 'completed' ? 'var(--theia-successBackground)' :
                           task.status === 'failed' ? 'var(--theia-errorBackground)' :
                           task.status === 'running' ? 'var(--theia-infoBackground)' :
                           'var(--theia-warningBackground)',
                color: '#fff',
                fontWeight: 600,
              }}>
                {task.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  private renderMetricCard(label: string, value: string, color: string): React.ReactElement {
    return (
      <div style={{
        padding: '12px',
        borderRadius: '6px',
        border: '1px solid var(--theia-border-color)',
        background: 'var(--theia-sideBar-background)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>{label}</div>
      </div>
    );
  }

  private formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }
}
