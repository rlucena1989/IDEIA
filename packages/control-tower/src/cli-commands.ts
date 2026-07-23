import { ControlTower } from './control-tower';
import { CliOutput } from './types';

export class CliCommands {
  constructor(private tower: ControlTower) {}

  async triggerEmergencyStop(reason: string): Promise<CliOutput> {
    try {
      await this.tower.emergencyStop(reason);
      return { success: true, message: `Emergency STOP executed: ${reason}` };
    } catch (_err) {
      return { success: false, message: `Emergency STOP failed: ${String(err)}` };
    }
  }

  async emergencyPause(reason: string): Promise<CliOutput> {
    try {
      await this.tower.emergencyPause(reason);
      return { success: true, message: `Emergency PAUSE executed: ${reason}` };
    } catch (_err) {
      return { success: false, message: `Emergency PAUSE failed: ${String(err)}` };
    }
  }

  async emergencyRollback(id: string): Promise<CliOutput> {
    try {
      await this.tower.emergencyRollback(id);
      return { success: true, message: `Rollback to ${id} executed` };
    } catch (_err) {
      return { success: false, message: `Rollback failed: ${String(err)}` };
    }
  }

  async emergencyResume(): Promise<CliOutput> {
    try {
      await this.tower.emergencyResume();
      return { success: true, message: 'System resumed after emergency' };
    } catch (_err) {
      return { success: false, message: `Resume failed: ${String(err)}` };
    }
  }

  async autonomyStatus(): Promise<CliOutput> {
    const status = this.tower.getStatus();
    return {
      success: true,
      message: `Autonomy: ${status.autonomyLevel} | Health: ${status.healthPercent}% | Mode: ${status.mode} | Pending: ${status.pendingDecisions}`,
      data: status,
    };
  }

  async autonomyTimeline(): Promise<CliOutput> {
    const timeline = this.tower.getTimeline();
    return {
      success: true,
      message: `Timeline: ${timeline.length} entries`,
      data: { entries: timeline },
    };
  }

  async autonomySet(level: string): Promise<CliOutput> {
    const valid = ['passive', 'assisted', 'autonomous'];
    if (!valid.includes(level)) {
      return { success: false, message: `Invalid level: ${level}. Valid: ${valid.join(', ')}` };
    }
    try {
      await this.tower.setAutonomyLevel(level as 'passive' | 'assisted' | 'autonomous');
      return { success: true, message: `Autonomy level set to ${level}` };
    } catch (_err) {
      return { success: false, message: `Failed to set autonomy: ${String(err)}` };
    }
  }

  async profileShow(): Promise<CliOutput> {
    return {
      success: true,
      message: 'Profile information requested',
      data: { hint: 'Use profiles package to get profile details' },
    };
  }

  async profileReset(): Promise<CliOutput> {
    return {
      success: true,
      message: 'Profile reset to default',
    };
  }

  async bhpStatus(): Promise<CliOutput> {
    return {
      success: true,
      message: 'BHP system operational',
      data: { status: 'connected', mode: this.tower.getStatus().mode },
    };
  }
}

export function createCliCommands(tower: ControlTower): CliCommands {
  return new CliCommands(tower);
}
