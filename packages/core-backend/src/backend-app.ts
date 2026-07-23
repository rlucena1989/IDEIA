import { Disposable, Emitter, DisposableCollection } from '@ideia/core-contributions';
import { DefaultLogger } from '@ideia/backend-logging';
import {
  BackendApplication, BackendApplicationConfig,
  BackendApplicationContribution, ServiceState,
} from './types';

export const DEFAULT_CONFIG: BackendApplicationConfig = {
  port: 3000,
  host: '127.0.0.1',
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
};

export class DefaultBackendApplication implements BackendApplication {
  readonly config: BackendApplicationConfig;
  readonly logger: DefaultLogger;
  private contributions: BackendApplicationContribution[] = [];
  private disposables = new DisposableCollection();
  private _running = false;
  private onStateChangedEmitter = new Emitter<ServiceState>();

  get onStateChanged() { return this.onStateChangedEmitter.event; }

  constructor(config?: Partial<BackendApplicationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new DefaultLogger();
  }

  registerContribution(contribution: BackendApplicationContribution): Disposable {
    this.contributions.push(contribution);
    const d = { dispose: () => this.unregisterContribution(contribution) };
    this.disposables.push(d);
    return d;
  }

  async start(): Promise<void> {
    this._running = true;
    this.onStateChangedEmitter.fire(ServiceState.STARTING);
    this.logger.info(`Starting backend on ${this.config.host}:${this.config.port}`);

    for (const contribution of this.contributions) {
      if (contribution.onStart) {
        try {
          await contribution.onStart(this);
        } catch (err) {
          this.logger.error(`Contribution onStart failed`, {
            error: (err as Error).message,
          });
        }
      }
    }

    this._running = true;
    this.onStateChangedEmitter.fire(ServiceState.RUNNING);
    this.logger.info('Backend started');
  }

  async stop(): Promise<void> {
    this.onStateChangedEmitter.fire(ServiceState.STOPPING);
    this.logger.info('Stopping backend');

    for (const contribution of this.contributions) {
      if (contribution.onStop) {
        try {
          await contribution.onStop(this);
        } catch (err) {
          this.logger.error(`Contribution onStop failed`, {
            error: (err as Error).message,
          });
        }
      }
    }

    this._running = false;
    this.disposables.dispose();
    this.onStateChangedEmitter.fire(ServiceState.STOPPED);
    this.logger.info('Backend stopped');
  }

  isRunning(): boolean {
    return this._running;
  }

  private unregisterContribution(contribution: BackendApplicationContribution): void {
    this.contributions = this.contributions.filter(c => c !== contribution);
  }
}
