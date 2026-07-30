import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import type { IEventBus } from '@ideia/event-bus';
import {
  IDEIA_LifecycleService, LifecycleStatus, LifecyclePhase,
} from '../common/ideia-protocol';
const logger = createLogger('lifecycle-service');

@injectable()
export class IDEIA_LifecycleBackendService implements IDEIA_LifecycleService {
  private phase: LifecyclePhase = 'stopped';
  private startedAt: string | null = null;
  private components: Record<string, 'ok' | 'error' | 'starting'> = {};
  private lastError: string | null = null;
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) { this.eventBus = eventBus; }

  async start(): Promise<void> {
    if (this.phase === 'running') return;
    this.phase = 'starting';
    this.components = { core: 'starting', eventBus: 'starting' };
    this.startedAt = null;
    this.lastError = null;

    try {
      await this.eventBus.emit({
        type: 'lifecycle.starting',
        source: 'ideia-lifecycle',
        payload: { timestamp: new Date().toISOString() },
      });

      this.components = { core: 'ok', eventBus: 'ok' };
      this.phase = 'running';
      this.startedAt = new Date().toISOString();

      await this.eventBus.emit({
        type: 'lifecycle.started',
        source: 'ideia-lifecycle',
        payload: { timestamp: this.startedAt, components: this.components },
      });
    } catch (err) {
      this.phase = 'error';
      this.lastError = err instanceof Error ? err.message : String(err);
      this.components = { core: 'error', eventBus: 'error' };

      await this.eventBus.emit({
        type: 'lifecycle.error',
        source: 'ideia-lifecycle',
        payload: { error: this.lastError },
      });
    }
  }

  async stop(): Promise<void> {
    if (this.phase === 'stopped') return;
    this.phase = 'stopping';

    await this.eventBus.emit({
      type: 'lifecycle.stopping',
      source: 'ideia-lifecycle',
      payload: { timestamp: new Date().toISOString() },
    });

    this.phase = 'stopped';
    this.startedAt = null;
    this.components = {};

    await this.eventBus.emit({
      type: 'lifecycle.stopped',
      source: 'ideia-lifecycle',
      payload: { timestamp: new Date().toISOString() },
    });
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async getStatus(): Promise<LifecycleStatus> {
    const now = Date.now();
    const startTime = this.startedAt ? new Date(this.startedAt).getTime() : 0;
    return {
      phase: this.phase,
      startedAt: this.startedAt,
      uptimeMs: startTime > 0 ? now - startTime : 0,
      components: { ...this.components },
      lastError: this.lastError,
    };
  }
}
