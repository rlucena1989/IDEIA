import { injectable, inject } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser/status-bar/status-bar';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';
import { IDEIA_AGENT_SERVICE, IDEIA_TASK_SERVICE } from '../common/ideia-protocol';
import { IDEIA_AgentService, IDEIA_TaskService } from '../common/ideia-protocol';
const logger = createLogger('ideia-statusbar-contribution');

@injectable()
export class IDEIA_StatusBarContribution implements FrontendApplicationContribution {
  private version = '0.1.0';
  private interval: ReturnType<typeof setInterval> | undefined;
  private isVisible = false;

  constructor(
    @inject(StatusBar) private statusBar: StatusBar,
    @inject(IDEIA_AGENT_SERVICE) private agentService: IDEIA_AgentService,
    @inject(IDEIA_TASK_SERVICE) private taskService: IDEIA_TaskService,
  ) {}

  onStart(_app: FrontendApplication): void {
    this.updateStatus();
    const pollIntervalMs = this.isVisible ? 5000 : 30000;
    this.interval = setInterval(() => this.updateStatus(), pollIntervalMs);
  }

  onStop(_app: FrontendApplication): void {
    if (this.interval) clearInterval(this.interval);
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = setInterval(() => this.updateStatus(), visible ? 5000 : 30000);
    }
  }

  private async updateStatus(): Promise<void> {
    let agents: Array<{ status: string }> = [];
    let tasks: Array<unknown> = [];

    try {
      [agents, tasks] = await Promise.all([
        this.agentService.getAgents(),
        this.taskService.getTasks(),
      ]);
    } catch {
      // backend not available
    }

    const running = agents.some(a => a.status === 'running');
    const hasError = agents.some(a => a.status === 'error');
    const agentStatus = running ? 'running' : hasError ? 'error' : 'idle';

    const statusDot = running ? '$(sync~spin)' : hasError ? '$(issue-opened)' : '$(check)';
    const statusColor = running ? '#2dd4bf' : hasError ? '#dc2626' : '';

    const statusEntry = {
      text: `${statusDot} IDEIA: ${agentStatus} | Tasks: ${tasks.length} | v${this.version}`,
      tooltip: 'Click to open IDEIA Assistant',
      command: 'ideia:chat',
      alignment: StatusBarAlignment.RIGHT,
      priority: 100,
      color: statusColor || undefined,
    };

    this.statusBar.setElement('ideia-status', statusEntry);
  }
}
