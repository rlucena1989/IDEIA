import { Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { ILogger } from '@ideia/backend-logging';
const logger = createLogger('types');

export interface BackendApplicationConfig {
  port: number;
  host: string;
  ssl?: { cert: string; key: string };
  cors?: { origin: string; methods: string[] };
  staticDir?: string;
}

export interface BackendApplicationContribution {
  onStart?(app: BackendApplication): Promise<void>;
  onStop?(app: BackendApplication): Promise<void>;
}

export interface BackendApplication {
  readonly config: BackendApplicationConfig;
  readonly logger: ILogger;
  registerContribution(contribution: BackendApplicationContribution): Disposable;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

export enum ServiceState {
  CREATED = 'created',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  FAILED = 'failed',
}

export interface ServiceLifecycle {
  readonly state: ServiceState;
  init(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  onStateChanged: import('@ideia/core-contributions').Event<ServiceState>;
}
