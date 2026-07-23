import { randomUUID as _randomUUID } from 'crypto';
import { EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { SafetyStatus, SafetyMode, RecoveryAction, EstopConfig, EstopEvent } from './types';

export type EstopListener = (event: EstopEvent) => void | Promise<void>;

export class EmergencyStop {
  private engaged = false;
  private readonly config: Required<EstopConfig>;
  private listeners: EstopListener[] = [];

  constructor(
    private eventBus?: EventBus,
    private auditTrail?: AuditTrail,
    config?: Partial<EstopConfig>,
  ) {
    this.config = {
      channels: {
        cli: true,
        api: true,
        keyboard: true,
        autoDetect: true,
      },
      checkpointDir: '.ideia/checkpoints',
      ...config,
    };
  }

  async engage(
    channel: EstopEvent['channel'],
    reason: string,
    triggeredBy?: string,
  ): Promise<void> {
    const channelKey = channel === 'auto-detect' ? 'autoDetect' : channel as 'cli' | 'api' | 'keyboard';
    if (!this.config.channels[channelKey]) return;

    this.engaged = true;

    const event: EstopEvent = {
      channel,
      reason,
      timestamp: new Date().toISOString(),
      triggeredBy,
    };

    await this.emitEvent(event);
    await this.notifyListeners(event);
    await this.recordAudit(event);

    if (this.eventBus) {
      try {
        await this.eventBus.emit({
          type: 'safety.emergency-stop',
          source: 'emergency-stop',
          payload: { event },
        });
      } catch {
        /* background */
      }
    }
  }

  private async emitEvent(_event: EstopEvent): Promise<void> {
    const details: string[] = ['Stop cycles', 'Block new cycles', 'Save checkpoint', 'Notify listeners', 'Enter safety mode'];
    for (const detail of details) {
      if (this.eventBus) {
        try {
          await this.eventBus.emit({
            type: 'safety.effect',
            source: 'emergency-stop',
            payload: { effect: detail },
          });
        } catch {
          /* background */
        }
      }
    }
  }

  private async notifyListeners(event: EstopEvent): Promise<void> {
    for (const listener of this.listeners) {
      try {
        await listener(event);
      } catch {
        /* listener failure */
      }
    }
  }

  private async recordAudit(event: EstopEvent): Promise<void> {
    if (this.auditTrail) {
      try {
        this.auditTrail.append({
          actor: 'system',
          eventType: 'safety.emergency-stop',
          target: event.channel,
          decision: 'rejected',
          result: 'success',
          metadata: { event },
        });
      } catch {
        /* background */
      }
    }
  }

  async recover(action: RecoveryAction, status?: SafetyStatus): Promise<SafetyMode> {
    this.engaged = false;

    switch (action) {
      case 'rollback':
        if (this.auditTrail) {
          this.auditTrail.append({
            actor: 'system',
            eventType: 'safety.recovery',
            target: 'safety-mode',
            decision: 'approved',
            result: 'success',
            metadata: { action, previousStatus: status },
          });
        }
        return 'rollback';

      case 'resume':
        if (this.auditTrail) {
          this.auditTrail.append({
            actor: 'system',
            eventType: 'safety.recovery',
            target: 'safety-mode',
            decision: 'approved',
            result: 'success',
            metadata: { action, previousStatus: status },
          });
        }
        return 'normal';

      case 'continue':
      default:
        return 'degraded';
    }
  }

  isEngaged(): boolean {
    return this.engaged;
  }

  onEstop(listener: EstopListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getConfig(): Readonly<Required<EstopConfig>> {
    return { ...this.config };
  }

  updateConfig(config: Partial<EstopConfig>): void {
    if (config.channels) {
      Object.assign(this.config.channels, config.channels);
    }
    if (config.checkpointDir !== undefined) {
      this.config.checkpointDir = config.checkpointDir;
    }
  }
}

export function createEmergencyStop(
  eventBus?: EventBus,
  auditTrail?: AuditTrail,
  config?: Partial<EstopConfig>,
): EmergencyStop {
  return new EmergencyStop(eventBus, auditTrail, config);
}
