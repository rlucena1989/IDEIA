import { createLogger } from '@ideia/logger';
import type { IEventBus } from './types';

const logger = createLogger('event-bus:integration-connectors');

export interface ConnectorConfig {
  sourceEvent: string;
  targetSystem: string;
  transform: (payload: unknown) => unknown;
  enabled: boolean;
}

export class IntegrationConnectors {
  private connectors: ConnectorConfig[] = [];
  private handlers: Map<string, Array<(payload: unknown) => Promise<void>>> = new Map();
  private bus: IEventBus | null = null;

  constructor() {}

  setEventBus(bus: IEventBus): void {
    this.bus = bus;
  }

  registerConnector(config: ConnectorConfig): void {
    this.connectors.push(config);
    if (config.enabled) {
      this.startConnector(config);
    }
  }

  private startConnector(config: ConnectorConfig): void {
    if (!this.bus) {
      logger.warn('EventBus not set, connector deferred', { source: config.sourceEvent });
      return;
    }

    const handler = async (payload: unknown) => {
      try {
        const transformed = config.transform(payload);
        if (this.bus) {
          await this.bus.emit({ type: config.targetSystem, source: 'integration-connector', payload: transformed as Record<string, unknown> });
          logger.debug('Event forwarded', { from: config.sourceEvent, to: config.targetSystem });
        }
      } catch (err) {
        logger.error('Connector failed', { source: config.sourceEvent, error: String(err) });
      }
    };

    const existing = this.handlers.get(config.sourceEvent) ?? [];
    existing.push(handler);
    this.handlers.set(config.sourceEvent, existing);

    try {
      this.bus.subscribe(config.sourceEvent, handler);
    } catch (err) {
      logger.error('Failed to subscribe to event', { event: config.sourceEvent, error: String(err) });
    }
  }

  startAll(): void {
    for (const config of this.connectors) {
      if (config.enabled) {
        this.startConnector(config);
      }
    }
  }

  getConnectors(): ConnectorConfig[] {
    return [...this.connectors];
  }
}

export function createMemoryWsConnector(): ConnectorConfig {
  return {
    sourceEvent: 'memory:update',
    targetSystem: 'websocket:broadcast',
    transform: (payload: unknown) => {
      const p = payload as { id?: string; action?: string; data?: unknown };
      return { type: 'memory_update', memoryId: p?.id, action: p?.action, data: p?.data, timestamp: new Date().toISOString() };
    },
    enabled: true,
  };
}

export function createSessionObservabilityConnector(): ConnectorConfig {
  return {
    sourceEvent: 'session:created',
    targetSystem: 'observability:track',
    transform: (payload: unknown) => {
      const p = payload as { id?: string; type?: string; metadata?: Record<string, unknown> };
      return { type: 'session_start', sessionId: p?.id, sessionType: p?.type, metadata: p?.metadata, timestamp: new Date().toISOString() };
    },
    enabled: true,
  };
}

export function createLspMemoryConnector(): ConnectorConfig {
  return {
    sourceEvent: 'lsp:diagnostic',
    targetSystem: 'memory:store',
    transform: (payload: unknown) => {
      const p = payload as { uri?: string; diagnostics?: Array<{ message: string; severity: number; range: { start: { line: number }; end: { line: number } } }> };
      return {
        type: 'lsp_diagnostics',
        content: JSON.stringify(p?.diagnostics ?? []),
        metadata: { uri: p?.uri, count: (p?.diagnostics ?? []).length, source: 'lsp' },
      };
    },
    enabled: true,
  };
}

export function createDapPersistenceConnector(): ConnectorConfig {
  return {
    sourceEvent: 'dap:breakpoint',
    targetSystem: 'memory:persist',
    transform: (payload: unknown) => {
      const p = payload as { sessionId?: string; breakpoints?: Array<{ line: number; file: string; enabled: boolean }>; action?: string };
      return {
        type: 'dap_breakpoint',
        content: JSON.stringify(p?.breakpoints ?? []),
        metadata: { sessionId: p?.sessionId, action: p?.action, source: 'dap' },
      };
    },
    enabled: true,
  };
}

export function createChatPatternConnector(): ConnectorConfig {
  return {
    sourceEvent: 'chat:decision',
    targetSystem: 'pattern:detect',
    transform: (payload: unknown) => {
      const p = payload as { decision?: string; context?: string; outcome?: string };
      return { type: 'chat_decision', content: p?.decision ?? '', metadata: { context: p?.context, outcome: p?.outcome } };
    },
    enabled: true,
  };
}

export function createAutoFixAdrConnector(): ConnectorConfig {
  return {
    sourceEvent: 'self.fix.applied',
    targetSystem: 'auto-adr:generate',
    transform: (payload: unknown) => {
      const p = payload as { fixId?: string; filePath?: string; description?: string; changeType?: string };
      return { type: 'auto_fix', fixId: p?.fixId, filePath: p?.filePath, description: p?.description, changeType: p?.changeType };
    },
    enabled: true,
  };
}

export function createScannerPanelConnector(): ConnectorConfig {
  return {
    sourceEvent: 'project:scan:completed',
    targetSystem: 'panel:update',
    transform: (payload: unknown) => {
      const p = payload as { findings?: number; critical?: number; recommendations?: Array<unknown> };
      return { type: 'scan_result', findings: p?.findings ?? 0, critical: p?.critical ?? 0, recommendations: p?.recommendations ?? [] };
    },
    enabled: true,
  };
}

export function registerDefaultConnectors(bus: IEventBus): IntegrationConnectors {
  const manager = new IntegrationConnectors();
  manager.setEventBus(bus);
  manager.registerConnector(createMemoryWsConnector());
  manager.registerConnector(createSessionObservabilityConnector());
  manager.registerConnector(createLspMemoryConnector());
  manager.registerConnector(createDapPersistenceConnector());
  manager.registerConnector(createChatPatternConnector());
  manager.registerConnector(createAutoFixAdrConnector());
  manager.registerConnector(createScannerPanelConnector());
  return manager;
}
