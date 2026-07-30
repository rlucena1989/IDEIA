import { createLogger } from '@ideia/logger';
import type { Logger } from '@ideia/logger';
import type {
  Workspace,
  WorkspaceConfig,
} from './types-remote';

export class WorkspaceManager {
  private workspaces: Map<string, Workspace> = new Map();
  private hibernateTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private logger: Logger;
  private defaultTimeout: number;

  constructor(logger?: Logger, defaultTimeout?: number) {
    this.logger = logger ?? createLogger('theia-cloud:workspace-manager');
    this.defaultTimeout = defaultTimeout ?? 30 * 60 * 1000;
  }

  createWorkspace(config: WorkspaceConfig): Workspace {
    const id = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();
    const workspace: Workspace = {
      id,
      config,
      status: 'creating',
      createdAt: now,
      lastActivity: now,
    };
    this.workspaces.set(id, workspace);
    workspace.status = 'ready';
    this.logger.info('Workspace created', { workspaceId: id, name: config.name });
    if (config.autoHibernate) {
      this.resetHibernateTimer(id);
    }
    return workspace;
  }

  destroyWorkspace(workspaceId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return false;
    }
    this.clearHibernateTimer(workspaceId);
    workspace.status = 'destroyed';
    this.workspaces.delete(workspaceId);
    this.logger.info('Workspace destroyed', { workspaceId });
    return true;
  }

  listWorkspaces(filter?: { status?: Workspace['status'] }): Workspace[] {
    let result = Array.from(this.workspaces.values());
    if (filter && filter.status) {
      result = result.filter((w) => w.status === filter.status);
    }
    return result;
  }

  getWorkspace(workspaceId: string): Workspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  hibernateWorkspace(workspaceId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return false;
    }
    this.clearHibernateTimer(workspaceId);
    workspace.status = 'hibernating';
    workspace.lastActivity = Date.now();
    this.logger.info('Workspace hibernated', { workspaceId });
    return true;
  }

  wakeWorkspace(workspaceId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return false;
    }
    workspace.status = 'active';
    workspace.lastActivity = Date.now();
    this.logger.info('Workspace woken', { workspaceId });
    if (workspace.config.autoHibernate) {
      this.resetHibernateTimer(workspaceId);
    }
    return true;
  }

  private resetHibernateTimer(workspaceId: string): void {
    this.clearHibernateTimer(workspaceId);
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return;
    }
    const timeout = workspace.config.timeout > 0 ? workspace.config.timeout : this.defaultTimeout;
    const timer = setTimeout(() => {
      this.hibernateWorkspace(workspaceId);
      this.logger.info('Workspace auto-hibernated due to inactivity', { workspaceId });
    }, timeout);
    this.hibernateTimers.set(workspaceId, timer);
  }

  private clearHibernateTimer(workspaceId: string): void {
    const timer = this.hibernateTimers.get(workspaceId);
    if (timer) {
      clearTimeout(timer);
      this.hibernateTimers.delete(workspaceId);
    }
  }
}
