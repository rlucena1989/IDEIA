export type SLIStatus = 'within_target' | 'at_risk' | 'breached' | 'no_data';

export interface SLIDefinition {
  name: string;
  description: string;
  targetP50: number;
  targetP95: number;
  targetP99: number;
  unit: string;
}

export interface SLIMeasurement {
  sliName: string;
  p50: number;
  p95: number;
  p99: number;
  sampleCount: number;
  measuredAt: string;
  status: SLIStatus;
}

export interface SLOBurnRate {
  sliName: string;
  windowMinutes: number;
  totalEvents: number;
  badEvents: number;
  burnRate: number;
  budgetRemaining: number;
}

const LAYER_SLIS: Record<string, SLIDefinition[]> = {
  shell: [
    { name: 'shell_startup', description: 'Tempo de inicialização do shell', targetP50: 1000, targetP95: 2000, targetP99: 5000, unit: 'ms' },
  ],
  ui: [
    { name: 'ui_page_load', description: 'Carregamento de página', targetP50: 1000, targetP95: 2000, targetP99: 3000, unit: 'ms' },
    { name: 'ui_interaction', description: 'Resposta a interação do usuário', targetP50: 50, targetP95: 100, targetP99: 200, unit: 'ms' },
  ],
  agents: [
    { name: 'agent_decision', description: 'Tempo de decisão do agente', targetP50: 2000, targetP95: 5000, targetP99: 10000, unit: 'ms' },
    { name: 'agent_task_completion', description: 'Tempo de conclusão de tarefa do agente', targetP50: 10000, targetP95: 30000, targetP99: 60000, unit: 'ms' },
  ],
  llm: [
    { name: 'llm_ttft', description: 'Time to First Token', targetP50: 200, targetP95: 500, targetP99: 1000, unit: 'ms' },
    { name: 'llm_tps', description: 'Tokens por segundo', targetP50: 50, targetP95: 30, targetP99: 15, unit: 't/s' },
  ],
  memory: [
    { name: 'memory_query', description: 'Tempo de consulta à memória', targetP50: 50, targetP95: 100, targetP99: 200, unit: 'ms' },
    { name: 'memory_write', description: 'Tempo de escrita na memória', targetP50: 20, targetP95: 50, targetP99: 100, unit: 'ms' },
  ],
  execution: [
    { name: 'exec_file_op', description: 'Operação de arquivo', targetP50: 10, targetP95: 50, targetP99: 100, unit: 'ms' },
    { name: 'exec_command', description: 'Execução de comando', targetP50: 100, targetP95: 500, targetP99: 2000, unit: 'ms' },
  ],
  events: [
    { name: 'event_delivery', description: 'Entrega de evento', targetP50: 2, targetP95: 5, targetP99: 10, unit: 'ms' },
    { name: 'event_throughput', description: 'Eventos por segundo', targetP50: 1000, targetP95: 500, targetP99: 100, unit: 'evt/s' },
  ],
  security: [
    { name: 'auth_check', description: 'Verificação de autenticação', targetP50: 50, targetP95: 100, targetP99: 200, unit: 'ms' },
    { name: 'policy_eval', description: 'Avaliação de política', targetP50: 5, targetP95: 10, targetP99: 20, unit: 'ms' },
  ],
};

export class SLOMonitor {
  private measurements: SLIMeasurement[] = [];
  private maxHistory = 10000;
  private slis: Map<string, SLIDefinition> = new Map();

  constructor(customSLIs?: Record<string, SLIDefinition[]>) {
    const all = { ...LAYER_SLIS, ...customSLIs };
    for (const [, slis] of Object.entries(all)) {
      for (const sli of slis) this.slis.set(sli.name, sli);
    }
  }

  getSLIDefinitions(): SLIDefinition[] { return Array.from(this.slis.values()); }
  getSLINames(): string[] { return Array.from(this.slis.keys()); }

  recordMeasurement(name: string, p50: number, p95: number, p99: number, sampleCount: number): SLIMeasurement {
    const sli = this.slis.get(name);
    const measurement: SLIMeasurement = {
      sliName: name, p50, p95, p99, sampleCount,
      measuredAt: new Date().toISOString(),
      status: sli ? this.evaluateStatus({ p50, p95, p99 }, sli) : 'no_data',
    };
    this.measurements.push(measurement);
    if (this.measurements.length > this.maxHistory) this.measurements.shift();
    return measurement;
  }

  getLatest(name: string): SLIMeasurement | undefined {
    return [...this.measurements].reverse().find(m => m.sliName === name);
  }

  getHistory(name: string, count = 10): SLIMeasurement[] {
    return this.measurements.filter(m => m.sliName === name).slice(-count);
  }

  getLayerStatus(layer: string): { sli: string; status: SLIStatus; latest: number }[] {
    const slis = LAYER_SLIS[layer];
    if (!slis) return [];
    return slis.map(sli => {
      const latest = this.getLatest(sli.name);
      return { sli: sli.name, status: latest?.status ?? 'no_data', latest: latest?.p95 ?? 0 };
    });
  }

  getAllLayerStatus(): Record<string, { sli: string; status: SLIStatus; latest: number }[]> {
    const result: Record<string, { sli: string; status: SLIStatus; latest: number }[]> = {};
    for (const layer of Object.keys(LAYER_SLIS)) {
      result[layer] = this.getLayerStatus(layer);
    }
    return result;
  }

  getBurnRate(name: string, windowMinutes = 60): SLOBurnRate {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const recent = this.measurements.filter(m =>
      m.sliName === name && new Date(m.measuredAt).getTime() > cutoff
    );
    const total = recent.length;
    const bad = recent.filter(m => m.status === 'breached').length;
    return {
      sliName: name, windowMinutes, totalEvents: total, badEvents: bad,
      burnRate: total > 0 ? bad / total : 0,
      budgetRemaining: Math.max(0, 1 - (total > 0 ? bad / Math.max(total, 1) : 0)),
    };
  }

  getAlertCandidates(): { sli: string; status: SLIStatus; burnRate: number }[] {
    const candidates: { sli: string; status: SLIStatus; burnRate: number }[] = [];
    for (const name of this.slis.keys()) {
      const latest = this.getLatest(name);
      if (!latest) continue;
      if (latest.status === 'breached' || latest.status === 'at_risk') {
        const burn = this.getBurnRate(name, 60);
        candidates.push({ sli: name, status: latest.status, burnRate: burn.burnRate });
      }
    }
    return candidates;
  }

  clear(): void { this.measurements = []; }

  private evaluateStatus(measured: { p50: number; p95: number; p99: number }, sli: SLIDefinition): SLIStatus {
    const breaches = [
      measured.p50 > sli.targetP50,
      measured.p95 > sli.targetP95,
      measured.p99 > sli.targetP99,
    ].filter(Boolean).length;

    if (breaches >= 3) return 'breached';
    if (breaches >= 1) return 'at_risk';
    return 'within_target';
  }
}

export function createSLOMonitor(): SLOMonitor {
  return new SLOMonitor();
}
