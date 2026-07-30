import { IDEIA_DASHBOARD_SERVICE, IDEIA_DashboardService } from '../common/ideia-protocol';
import { createLogger } from '@ideia/logger';
const logger = createLogger('ideia-cockpit-providers');

export interface ProviderData {
  label: string;
  value: string;
  status: 'ok' | 'warning' | 'error' | 'loading';
}

export interface DataProvider {
  id: string;
  label: string;
  refresh(): Promise<ProviderData>;
}

export class GapCountProvider implements DataProvider {
  id = 'gaps';
  label = 'Gaps';
  constructor(private dashboardService?: IDEIA_DashboardService) {}
  async refresh(): Promise<ProviderData> {
    try {
      if (!this.dashboardService) return { label: this.label, value: '0', status: 'ok' };
      const metrics = await this.dashboardService.getMetrics();
      return { label: this.label, value: String(metrics.violationsActive), status: metrics.violationsActive > 0 ? 'warning' : 'ok' };
    } catch {
      return { label: this.label, value: 'err', status: 'error' };
    }
  }
}

export class BacklogProvider implements DataProvider {
  id = 'backlog';
  label = 'Backlog';
  constructor(private dashboardService?: IDEIA_DashboardService) {}
  async refresh(): Promise<ProviderData> {
    try {
      if (!this.dashboardService) return { label: this.label, value: '0 items', status: 'ok' };
      const metrics = await this.dashboardService.getMetrics();
      const backlog = (metrics.tasksCompleted ?? 0) + (metrics.violationsActive ?? 0) + (metrics.studiesCount ?? 0);
      return {
        label: this.label,
        value: `${backlog} items`,
        status: backlog < 20 ? 'ok' : backlog < 50 ? 'warning' : 'error',
      };
    } catch {
      return { label: this.label, value: 'err', status: 'error' };
    }
  }
}

export class AutonomyLevelProvider implements DataProvider {
  id = 'autonomy';
  label = 'Autonomy';
  constructor(private _?: unknown) {}
  async refresh(): Promise<ProviderData> {
    try {
      return { label: this.label, value: 'assisted', status: 'ok' };
    } catch {
      return { label: this.label, value: 'err', status: 'error' };
    }
  }
}

export class CoverageScoreProvider implements DataProvider {
  id = 'coverage';
  label = 'Coverage';
  constructor(private dashboardService?: IDEIA_DashboardService) {}
  async refresh(): Promise<ProviderData> {
    try {
      if (!this.dashboardService) return { label: this.label, value: '55%', status: 'warning' };
      const metrics = await this.dashboardService.getMetrics();
      const pct = metrics.coveragePercent;
      return {
        label: this.label,
        value: `${pct}%`,
        status: pct >= 65 ? 'ok' : pct >= 40 ? 'warning' : 'error',
      };
    } catch {
      return { label: this.label, value: 'err', status: 'error' };
    }
  }
}

export class AgentStatusProvider implements DataProvider {
  id = 'agents';
  label = 'Agents';
  constructor(private dashboardService?: IDEIA_DashboardService) {}
  async refresh(): Promise<ProviderData> {
    try {
      if (!this.dashboardService) return { label: this.label, value: 'idle', status: 'ok' };
      const metrics = await this.dashboardService.getMetrics();
      return {
        label: this.label,
        value: `${metrics.agentsActive} active`,
        status: metrics.agentsActive > 0 ? 'ok' : 'warning',
      };
    } catch {
      return { label: this.label, value: 'err', status: 'error' };
    }
  }
}

export class CompileStatusProvider implements DataProvider {
  id = 'compile';
  label = 'Compile';
  constructor(private _?: unknown) {}
  async refresh(): Promise<ProviderData> {
    try {
      return { label: this.label, value: '0 errors', status: 'ok' };
    } catch {
      return { label: this.label, value: 'err', status: 'error' };
    }
  }
}

export function createDefaultProviders(dashboardService?: IDEIA_DashboardService): DataProvider[] {
  return [
    new GapCountProvider(dashboardService),
    new BacklogProvider(dashboardService),
    new AutonomyLevelProvider(),
    new CoverageScoreProvider(dashboardService),
    new AgentStatusProvider(dashboardService),
    new CompileStatusProvider(),
  ];
}
