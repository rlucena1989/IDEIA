import { RobotRegistration, RobotType, RobotStatus, RobotMetrics } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('robot-registry');

export interface RobotRegistryConfig {
  defaultMaxConcurrency: number;
}

const DEFAULT_CONFIG: RobotRegistryConfig = { defaultMaxConcurrency: 3 };

export class RobotRegistry {
  private robots: Map<string, RobotRegistration> = new Map();
  private config: RobotRegistryConfig;

  constructor(config?: Partial<RobotRegistryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  register(registration: RobotRegistration): void {
    if (this.robots.has(registration.id)) {
      throw new Error(`Robot ${registration.id} already registered`);
    }
    this.robots.set(registration.id, { ...registration, status: registration.status ?? 'idle', currentLoad: registration.currentLoad ?? 0 });
  }

  unregister(robotId: string): boolean {
    return this.robots.delete(robotId);
  }

  getRobot(robotId: string): RobotRegistration | undefined {
    return this.robots.get(robotId);
  }

  findAvailable(taskType: string, requiredCapability?: string): RobotRegistration[] {
    return Array.from(this.robots.values()).filter(r =>
      r.status === 'idle' &&
      r.currentLoad < r.maxConcurrency &&
      r.capabilities.some(c => c.taskTypes.includes(taskType as never) || (requiredCapability !== undefined && c.id === requiredCapability))
    );
  }

  select(taskType: string, _options?: { environment?: string; risk?: string }): RobotRegistration | null {
    const available = this.findAvailable(taskType);
    if (available.length === 0) return null;

    const scored = available.map(r => {
      let score = 1 - (r.currentLoad / r.maxConcurrency) * 0.3;
      score += r.metrics.successRate * 0.4;
      score += Math.min(r.metrics.avgDuration / 10000, 1) * 0.3;
      return { robot: r, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].robot;
  }

  updateStatus(robotId: string, status: RobotStatus): void {
    const robot = this.robots.get(robotId);
    if (!robot) throw new Error(`Robot ${robotId} not found`);
    robot.status = status;
  }

  updateLoad(robotId: string, delta: number): void {
    const robot = this.robots.get(robotId);
    if (!robot) throw new Error(`Robot ${robotId} not found`);
    robot.currentLoad = Math.max(0, robot.currentLoad + delta);
  }

  updateMetrics(robotId: string, metrics: Partial<RobotMetrics>): void {
    const robot = this.robots.get(robotId);
    if (!robot) throw new Error(`Robot ${robotId} not found`);
    Object.assign(robot.metrics, metrics);
  }

  listByType(type: RobotType): RobotRegistration[] {
    return Array.from(this.robots.values()).filter(r => r.type === type);
  }

  listAll(): RobotRegistration[] {
    return Array.from(this.robots.values());
  }

  getStats(): { total: number; idle: number; busy: number; fault: number; maintenance: number } {
    const stats = { total: 0, idle: 0, busy: 0, fault: 0, maintenance: 0 };
    for (const r of this.robots.values()) {
      stats.total++;
      stats[r.status]++;
    }
    return stats;
  }
}

export function createRobotRegistry(config?: Partial<RobotRegistryConfig>): RobotRegistry {
  return new RobotRegistry(config);
}
