import { createLogger } from '@ideia/logger';
import type { Logger } from '@ideia/logger';
import type { TenantPlan } from './types';

interface Quota {
  maxWorkspaces: number;
  maxCpu: number;
  maxMemory: number;
  maxDisk: number;
}

interface Usage {
  cpu: number;
  memory: number;
  disk: number;
  workspaceCount: number;
}

const DEFAULT_QUOTAS: Record<TenantPlan, Quota> = {
  free: { maxWorkspaces: 1, maxCpu: 1, maxMemory: 2, maxDisk: 10 },
  pro: { maxWorkspaces: 10, maxCpu: 4, maxMemory: 8, maxDisk: 50 },
  enterprise: { maxWorkspaces: 100, maxCpu: 32, maxMemory: 128, maxDisk: 1024 },
};

export class ResourceGovernor {
  private quotas: Map<string, Quota> = new Map();
  private usages: Map<string, Usage> = new Map();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? createLogger('theia-cloud:resource-governor');
  }

  setQuota(orgId: string, plan: TenantPlan, customQuota?: Partial<Quota>): void {
    const base = { ...DEFAULT_QUOTAS[plan] };
    if (customQuota) {
      Object.assign(base, customQuota);
    }
    this.quotas.set(orgId, base);
    if (!this.usages.has(orgId)) {
      this.usages.set(orgId, { cpu: 0, memory: 0, disk: 0, workspaceCount: 0 });
    }
    this.logger.info('Quota set', { orgId, plan, quota: base });
  }

  async allocate(orgId: string, resources: { cpu: number; memory: number; disk: number }): Promise<boolean> {
    const quota = this.quotas.get(orgId);
    if (!quota) {
      throw new Error(`No quota configured for org ${orgId}`);
    }
    const usage = this.usages.get(orgId);
    if (!usage) throw new Error(`No usage record for org ${orgId}`);
    const newCpu = usage.cpu + resources.cpu;
    const newMemory = usage.memory + resources.memory;
    const newDisk = usage.disk + resources.disk;
    const newCount = usage.workspaceCount + 1;

    if (newCpu > quota.maxCpu) {
      this.logger.warn('CPU allocation denied', { orgId, requested: resources.cpu, used: usage.cpu, max: quota.maxCpu });
      return false;
    }
    if (newMemory > quota.maxMemory) {
      this.logger.warn('Memory allocation denied', { orgId, requested: resources.memory, used: usage.memory, max: quota.maxMemory });
      return false;
    }
    if (newDisk > quota.maxDisk) {
      this.logger.warn('Disk allocation denied', { orgId, requested: resources.disk, used: usage.disk, max: quota.maxDisk });
      return false;
    }
    if (newCount > quota.maxWorkspaces) {
      this.logger.warn('Workspace count limit reached', { orgId, max: quota.maxWorkspaces });
      return false;
    }

    usage.cpu = newCpu;
    usage.memory = newMemory;
    usage.disk = newDisk;
    usage.workspaceCount = newCount;
    return true;
  }

  async release(orgId: string, resources: { cpu: number; memory: number; disk: number }): Promise<void> {
    const usage = this.usages.get(orgId);
    if (!usage) {
      throw new Error(`No usage data for org ${orgId}`);
    }
    usage.cpu = Math.max(0, usage.cpu - resources.cpu);
    usage.memory = Math.max(0, usage.memory - resources.memory);
    usage.disk = Math.max(0, usage.disk - resources.disk);
    usage.workspaceCount = Math.max(0, usage.workspaceCount - 1);
    this.logger.info('Resources released', { orgId, resources });
  }

  getUsage(orgId: string): { cpu: number; memory: number; disk: number } {
    const usage = this.usages.get(orgId);
    if (!usage) {
      return { cpu: 0, memory: 0, disk: 0 };
    }
    return { cpu: usage.cpu, memory: usage.memory, disk: usage.disk };
  }

  getQuota(orgId: string): { maxCpu: number; maxMemory: number; maxDisk: number } {
    const quota = this.quotas.get(orgId);
    if (!quota) {
      throw new Error(`No quota configured for org ${orgId}`);
    }
    return { maxCpu: quota.maxCpu, maxMemory: quota.maxMemory, maxDisk: quota.maxDisk };
  }
}
