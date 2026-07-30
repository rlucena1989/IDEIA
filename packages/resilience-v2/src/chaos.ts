export type ChaosFaultType = 'latency' | 'crash' | 'partition' | 'error';

export interface ChaosFault {
  type: ChaosFaultType;
  service: string;
  config: Record<string, unknown>;
}

export interface ChaosScenario {
  name: string;
  description: string;
  faults: ChaosFault[];
  duration: number;
  expectedOutcome: string;
}

export class ChaosEngine {
  private activeFaults = new Map<string, ChaosFault>();
  private originalImpls = new Map<string, unknown>();
  private scenarioRunning = false;

  injectLatency(service: string, ms: number): void {
    this.activeFaults.set(`${service}:latency`, { type: 'latency', service, config: { ms } });
  }

  injectCrash(service: string): void {
    this.activeFaults.set(`${service}:crash`, { type: 'crash', service, config: {} });
  }

  injectPartition(service: string): void {
    this.activeFaults.set(`${service}:partition`, { type: 'partition', service, config: {} });
  }

  injectError(service: string, error: string): void {
    this.activeFaults.set(`${service}:error`, { type: 'error', service, config: { error } });
  }

  async runScenario(scenario: ChaosScenario): Promise<void> {
    this.scenarioRunning = true;
    this.clearFaults();

    for (const fault of scenario.faults) {
      const key = `${fault.service}:${fault.type}`;
      this.activeFaults.set(key, fault);
      switch (fault.type) {
        case 'latency':
          this.injectLatency(fault.service, (fault.config.ms as number) || 1000);
          break;
        case 'crash':
          this.injectCrash(fault.service);
          break;
        case 'partition':
          this.injectPartition(fault.service);
          break;
        case 'error':
          this.injectError(fault.service, (fault.config.error as string) || 'injected error');
          break;
      }
    }

    await new Promise(resolve => setTimeout(resolve, scenario.duration));
    this.clearFaults();
    this.scenarioRunning = false;
  }

  stop(): void {
    this.clearFaults();
    this.scenarioRunning = false;
  }

  isActive(): boolean {
    return this.activeFaults.size > 0 || this.scenarioRunning;
  }

  getActiveFaults(): ChaosFault[] {
    return Array.from(this.activeFaults.values());
  }

  private clearFaults(): void {
    this.activeFaults.clear();
    this.originalImpls.clear();
  }
}

export const BUILTIN_SCENARIOS: ChaosScenario[] = [
  {
    name: 'nats-failover-test',
    description: 'Simulates NATS disconnect and verifies failover to fallback',
    faults: [
      { type: 'partition', service: 'nats', config: {} },
      { type: 'error', service: 'nats', config: { error: 'NATS connection refused' } },
    ],
    duration: 5000,
    expectedOutcome: 'System should fallback to in-memory event bus and recover when NATS returns',
  },
  {
    name: 'llm-timeout-test',
    description: 'Simulates LLM provider timeout and verifies retry/failover',
    faults: [
      { type: 'latency', service: 'llm', config: { ms: 30000 } },
    ],
    duration: 8000,
    expectedOutcome: 'System should timeout LLM calls and retry with fallback provider',
  },
  {
    name: 'fs-unavailable-test',
    description: 'Simulates filesystem unavailability and verifies graceful degradation',
    faults: [
      { type: 'crash', service: 'filesystem', config: {} },
    ],
    duration: 5000,
    expectedOutcome: 'System should handle FS errors gracefully and queue operations',
  },
  {
    name: 'full-system-test',
    description: 'Combines multiple faults to test overall system resilience',
    faults: [
      { type: 'latency', service: 'nats', config: { ms: 2000 } },
      { type: 'error', service: 'llm', config: { error: 'LLM unavailable' } },
      { type: 'partition', service: 'search', config: {} },
    ],
    duration: 10000,
    expectedOutcome: 'All services should degrade gracefully with no cascading failures',
  },
];
