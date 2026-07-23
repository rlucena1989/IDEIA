import { Disposable, Event } from '@ideia/core-contributions';

export interface RpcMessageTransport {
  send(message: RpcMessage): void;
  onMessage: Event<RpcMessage>;
  close(): void;
  isOpen(): boolean;
}

export interface RpcMessage {
  id: string;
  type: 'request' | 'response' | 'event';
  method?: string;
  params?: unknown[];
  result?: unknown;
  error?: RpcError;
}

export interface RpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface RpcProtocol {
  sendRequest(method: string, params?: unknown[]): Promise<unknown>;
  sendNotification(method: string, params?: unknown[]): void;
  onRequest(method: string, handler: (params: unknown[]) => Promise<unknown>): Disposable;
  dispose(): void;
}

export interface ExtensionHostProcess {
  readonly pid: number | undefined;
  readonly alive: boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export interface ActivationEvent {
  type: string;
  extensionId: string;
  timestamp: number;
}

export interface ActivationEventHandler {
  canHandle(event: ActivationEvent): boolean;
  handle(event: ActivationEvent): Promise<void>;
}

export interface ExtensionActivationService {
  fireActivationEvent(event: ActivationEvent): void;
  registerHandler(handler: ActivationEventHandler): Disposable;
  isActivated(extensionId: string): boolean;
  onExtensionActivated: Event<string>;
  onExtensionDeactivated: Event<string>;
}

export interface ApiProxy {
  getProxy<T>(namespace: string): T;
  registerApi<T>(namespace: string, api: T): void;
  hasApi(namespace: string): boolean;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  engineVersion: string;
  contributes?: ExtensionContribution[];
  activationEvents?: string[];
  dependencies?: string[];
  permissions?: string[];
}

export interface ExtensionContribution {
  type: string;
  value: unknown;
}

export interface ContributionRegistry {
  register(type: string, value: unknown): Disposable;
  getContributions<T>(type: string): T[];
  hasType(type: string): boolean;
  clear(): void;
}

export interface ResourceLimits {
  maxMemory: number;
  maxCpu: number;
  maxProcesses: number;
  timeout: number;
}

export interface ResourceMonitor {
  getMemoryUsage(): number;
  getCpuUsage(): number;
  isWithinLimits(): boolean;
  onResourceWarning: Event<ResourceLimits>;
}

export interface ExtensionPermissionManager {
  hasPermission(extensionId: string, permission: string): boolean;
  grantPermission(extensionId: string, permission: string): void;
  revokePermission(extensionId: string, permission: string): void;
  onPermissionChanged: Event<{ extensionId: string; permission: string; granted: boolean }>;
}
