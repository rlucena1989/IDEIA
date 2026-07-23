import { injectable, inject } from '@theia/core/shared/inversify';
import { EventBus } from '@ideia/event-bus';
import { IDEIA_DASHBOARD_SERVICE, IDEIA_TASK_SERVICE, IDEIA_AGENT_SERVICE, IDEIA_TaskService, IDEIA_AgentService, IDEIA_DashboardService } from '../common/ideia-protocol';
import { DashboardMetrics } from '../common/ideia-types';
import { ServiceCatalog } from '@ideia/cli/src/ecosystem/service-catalog';
import { SelfAwareness } from '@ideia/cli/src/ecosystem/self-awareness';
import { TutorialSystem } from '@ideia/cli/src/tutorials/tutorial-system';
import * as fs from 'fs';
import * as path from 'path';

@injectable()
export class IDEIA_DashboardBackendService implements IDEIA_DashboardService {
  private catalog: ServiceCatalog;
  private awareness: SelfAwareness;
  private tutorials: TutorialSystem;

  constructor(
    @inject(EventBus) private eventBus: EventBus,
    @inject(IDEIA_TASK_SERVICE) private taskService: IDEIA_TaskService,
    @inject(IDEIA_AGENT_SERVICE) private agentService: IDEIA_AgentService,
  ) {
    this.catalog = new ServiceCatalog();
    this.awareness = new SelfAwareness(this.catalog);
    this.tutorials = new TutorialSystem();
  }

  async getMetrics(): Promise<DashboardMetrics> {
    const [tasks, agents] = await Promise.all([
      this.taskService.getTasks(),
      this.agentService.getAgents(),
    ]);

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const failedTasks = tasks.filter(t => t.status === 'failed').length;
    const agentsActive = agents.filter(a => a.status === 'running').length;
    const totalTokens = agents.reduce((sum: number, a: { metrics?: { tokensUsed?: number } }) => sum + (a.metrics?.tokensUsed || 0), 0);
    const scores: number[] = agents.map((a: { metrics?: { completedTasks?: number } }) => a.metrics?.completedTasks || 0);
    const averageScore = scores.length > 0
      ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 100) / 100
      : 0;

    const studiesDir = path.resolve(__dirname, '..', '..', '..', '..', 'docs', 'ESTUDOS');
    let studiesCount = 0;
    let studiesCompleted = 0;
    let studyScore = 0;
    if (fs.existsSync(studiesDir)) {
      const files = fs.readdirSync(studiesDir).filter(f => f.endsWith('.md') && !f.startsWith('TEMPLATE'));
      studiesCount = files.length;
      studiesCompleted = files.filter(f => {
        const content = fs.readFileSync(path.join(studiesDir, f), 'utf-8');
        return content.includes('Plano de Testes') && content.includes('Métricas de Sucesso');
      }).length;
      studyScore = studiesCount > 0 ? Math.round((studiesCompleted / studiesCount) * 100) : 0;
    }

    const tutorialStats = this.tutorials.getOverallStats();

    return {
      tasksCompleted: completedTasks,
      tasksFailed: failedTasks,
      agentsActive,
      tokensUsed: totalTokens,
      averageScore,
      violationsActive: 0,
      coveragePercent: 0,
      servicesCount: this.catalog.getServiceCount(),
      capabilitiesCount: this.catalog.getCapabilityCount(),
      studiesCount,
      studiesCompleted,
      studyScore,
      tutorialsCompleted: tutorialStats.completed,
      tutorialsTotal: tutorialStats.totalTutorials,
    };
  }

  async getTimeline(hours = 24): Promise<Array<{ timestamp: string; event: string; detail: string }>> {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const history = await this.eventBus.getHistory();
    const filtered = history.filter(e => new Date(e.timestamp).getTime() > cutoff);

    return filtered.map(e => ({
      timestamp: e.timestamp,
      event: e.type,
      detail: JSON.stringify(e.payload || {}),
    }));
  }
}
