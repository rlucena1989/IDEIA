export interface SloDefinitionEntry {
  contract: string;
  description: string;
  thresholds: {
    latencyP50Max: number;
    latencyP95Max: number;
    latencyP99Max: number;
    availabilityMin: number;
    throughputMin: number;
    errorRateMax: number;
  };
  severity: 'critical' | 'high' | 'medium' | 'low';
  tags?: string[];
  owner?: string;
  documentation?: string;
}

export interface SloDefinitions {
  version: string;
  generatedAt: string;
  contracts: SloDefinitionEntry[];
}

export class SloDefinitionLoader {
  private definitions: Map<string, SloDefinitionEntry> = new Map();

  constructor(definitions?: SloDefinitionEntry[]) {
    if (definitions) {
      for (const d of definitions) {
        this.definitions.set(d.contract, d);
      }
    }
  }

  loadFromJson(json: string): SloDefinitions {
    let parsed: SloDefinitions;
    try {
      parsed = JSON.parse(json);
    } catch {
      return { version: '', generatedAt: '', contracts: [] };
    }
    if (!parsed || !Array.isArray(parsed.contracts)) {
      return { version: '', generatedAt: '', contracts: [] };
    }
    for (const entry of parsed.contracts) {
      if (entry && entry.contract) {
        this.definitions.set(entry.contract, entry as SloDefinitionEntry);
      }
    }
    return parsed;
  }

  get(contract: string): SloDefinitionEntry | undefined {
    return this.definitions.get(contract);
  }

  getAll(): SloDefinitionEntry[] {
    return Array.from(this.definitions.values());
  }

  getBySeverity(severity: SloDefinitionEntry['severity']): SloDefinitionEntry[] {
    return this.getAll().filter(d => d.severity === severity);
  }

  getByTag(tag: string): SloDefinitionEntry[] {
    return this.getAll().filter(d => d.tags?.includes(tag));
  }

  toJson(): string {
    const definitions: SloDefinitions = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      contracts: this.getAll(),
    };
    return JSON.stringify(definitions, null, 2);
  }
}

export const DEFAULT_SLO_DEFINITIONS: SloDefinitionEntry[] = [
  {
    contract: 'C1', description: 'Command Dispatch Latency',
    thresholds: { latencyP50Max: 100, latencyP95Max: 250, latencyP99Max: 500, availabilityMin: 99.9, throughputMin: 1000, errorRateMax: 0.01 },
    severity: 'critical', tags: ['core', 'dispatch'],
  },
  {
    contract: 'C2', description: 'Event Bus Delivery',
    thresholds: { latencyP50Max: 50, latencyP95Max: 150, latencyP99Max: 300, availabilityMin: 99.99, throughputMin: 5000, errorRateMax: 0.001 },
    severity: 'critical', tags: ['messaging', 'core'],
  },
  {
    contract: 'C3', description: 'Agent Response Time',
    thresholds: { latencyP50Max: 500, latencyP95Max: 2000, latencyP99Max: 5000, availabilityMin: 99.5, throughputMin: 100, errorRateMax: 0.05 },
    severity: 'high', tags: ['agent', 'ai'],
  },
  {
    contract: 'C4', description: 'Memory Store Read',
    thresholds: { latencyP50Max: 10, latencyP95Max: 30, latencyP99Max: 100, availabilityMin: 99.99, throughputMin: 10000, errorRateMax: 0.001 },
    severity: 'critical', tags: ['storage', 'core'],
  },
  {
    contract: 'C5', description: 'Memory Store Write',
    thresholds: { latencyP50Max: 20, latencyP95Max: 60, latencyP99Max: 200, availabilityMin: 99.99, throughputMin: 5000, errorRateMax: 0.001 },
    severity: 'critical', tags: ['storage', 'core'],
  },
  {
    contract: 'C6', description: 'Tool Execution',
    thresholds: { latencyP50Max: 200, latencyP95Max: 500, latencyP99Max: 1000, availabilityMin: 99.9, throughputMin: 500, errorRateMax: 0.01 },
    severity: 'high', tags: ['execution'],
  },
  {
    contract: 'C7', description: 'AI Inference',
    thresholds: { latencyP50Max: 1000, latencyP95Max: 3000, latencyP99Max: 8000, availabilityMin: 99.5, throughputMin: 50, errorRateMax: 0.02 },
    severity: 'high', tags: ['ai', 'ml'],
  },
  {
    contract: 'C8', description: 'Authentication',
    thresholds: { latencyP50Max: 150, latencyP95Max: 400, latencyP99Max: 800, availabilityMin: 99.95, throughputMin: 2000, errorRateMax: 0.005 },
    severity: 'critical', tags: ['security', 'core'],
  },
  {
    contract: 'C9', description: 'Policy Evaluation',
    thresholds: { latencyP50Max: 30, latencyP95Max: 80, latencyP99Max: 200, availabilityMin: 99.99, throughputMin: 5000, errorRateMax: 0.001 },
    severity: 'critical', tags: ['security', 'core'],
  },
  {
    contract: 'C10', description: 'File System Operations',
    thresholds: { latencyP50Max: 50, latencyP95Max: 150, latencyP99Max: 500, availabilityMin: 99.9, throughputMin: 1000, errorRateMax: 0.01 },
    severity: 'high', tags: ['filesystem'],
  },
  {
    contract: 'C11', description: 'Search Index',
    thresholds: { latencyP50Max: 100, latencyP95Max: 300, latencyP99Max: 800, availabilityMin: 99.8, throughputMin: 500, errorRateMax: 0.02 },
    severity: 'medium', tags: ['search'],
  },
  {
    contract: 'C12', description: 'Notification Delivery',
    thresholds: { latencyP50Max: 200, latencyP95Max: 500, latencyP99Max: 1000, availabilityMin: 99.9, throughputMin: 1000, errorRateMax: 0.01 },
    severity: 'medium', tags: ['notification'],
  },
  {
    contract: 'C13', description: 'Plugin Lifecycle',
    thresholds: { latencyP50Max: 300, latencyP95Max: 800, latencyP99Max: 2000, availabilityMin: 99.8, throughputMin: 100, errorRateMax: 0.02 },
    severity: 'medium', tags: ['plugin'],
  },
  {
    contract: 'C14', description: 'WebSocket Connection',
    thresholds: { latencyP50Max: 100, latencyP95Max: 300, latencyP99Max: 600, availabilityMin: 99.95, throughputMin: 2000, errorRateMax: 0.005 },
    severity: 'high', tags: ['network', 'realtime'],
  },
  {
    contract: 'C15', description: 'API Gateway',
    thresholds: { latencyP50Max: 80, latencyP95Max: 200, latencyP99Max: 500, availabilityMin: 99.99, throughputMin: 10000, errorRateMax: 0.001 },
    severity: 'critical', tags: ['api', 'core'],
  },
  {
    contract: 'C16', description: 'Config Resolution',
    thresholds: { latencyP50Max: 20, latencyP95Max: 50, latencyP99Max: 150, availabilityMin: 99.95, throughputMin: 5000, errorRateMax: 0.005 },
    severity: 'high', tags: ['config'],
  },
  {
    contract: 'C17', description: 'Audit Trail Write',
    thresholds: { latencyP50Max: 30, latencyP95Max: 80, latencyP99Max: 200, availabilityMin: 99.99, throughputMin: 5000, errorRateMax: 0.001 },
    severity: 'critical', tags: ['audit', 'security', 'core'],
  },
  {
    contract: 'C18', description: 'Dashboard Rendering',
    thresholds: { latencyP50Max: 200, latencyP95Max: 500, latencyP99Max: 1000, availabilityMin: 99.8, throughputMin: 200, errorRateMax: 0.02 },
    severity: 'low', tags: ['ui'],
  },
];

export function createSloDefinitionLoader(definitions?: SloDefinitionEntry[]): SloDefinitionLoader {
  return new SloDefinitionLoader(definitions ?? DEFAULT_SLO_DEFINITIONS);
}
