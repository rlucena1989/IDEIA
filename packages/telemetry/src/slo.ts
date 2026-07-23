export interface SLO {
  name: string;
  description: string;
  targetPct: number;
  windowHours: number;
  currentPct: number;
  status: 'met' | 'breached' | 'at_risk';
  totalRequests: number;
  goodRequests: number;
  breaches: number;
  lastUpdated: string;
}

export interface SLOResult {
  passed: boolean;
  actual: number;
  target: number;
  gap: number;
}

export class SLOMonitor {
  private slos = new Map<string, SLO>();
  private events: Array<{ name: string; good: boolean; timestamp: number }> = [];

  define(name: string, description: string, targetPct: number, windowHours?: number): void {
    this.slos.set(name, {
      name,
      description,
      targetPct,
      windowHours: windowHours ?? 24,
      currentPct: 100,
      status: 'met',
      totalRequests: 0,
      goodRequests: 0,
      breaches: 0,
      lastUpdated: new Date().toISOString(),
    });
  }

  record(name: string, good: boolean): void {
    const slo = this.slos.get(name);
    if (!slo) return;

    slo.totalRequests++;
    if (good) slo.goodRequests++;
    this.events.push({ name, good, timestamp: Date.now() });

    this.recalculate(name);
  }

  private recalculate(name: string): void {
    const slo = this.slos.get(name);
    if (!slo) return;

    const cutoff = Date.now() - slo.windowHours * 60 * 60 * 1000;
    const recent = this.events.filter(e => e.name === name && e.timestamp >= cutoff);

    const total = recent.length;
    const good = recent.filter(e => e.good).length;

    slo.currentPct = total > 0 ? (good / total) * 100 : 100;
    slo.totalRequests = total;
    slo.goodRequests = good;

    if (slo.currentPct < slo.targetPct) {
      slo.status = 'breached';
      slo.breaches++;
    } else if (slo.currentPct < slo.targetPct + 2) {
      slo.status = 'at_risk';
    } else {
      slo.status = 'met';
    }

    slo.lastUpdated = new Date().toISOString();
  }

  check(name: string): SLOResult | undefined {
    const slo = this.slos.get(name);
    if (!slo) return undefined;

    return {
      passed: slo.status === 'met',
      actual: slo.currentPct,
      target: slo.targetPct,
      gap: Math.max(0, slo.targetPct - slo.currentPct),
    };
  }

  getAll(): SLO[] {
    return Array.from(this.slos.values());
  }

  getBreached(): SLO[] {
    return this.getAll().filter(s => s.status === 'breached');
  }

  getAtRisk(): SLO[] {
    return this.getAll().filter(s => s.status === 'at_risk');
  }

  getSummary(): { total: number; met: number; breached: number; atRisk: number } {
    const all = this.getAll();
    return {
      total: all.length,
      met: all.filter(s => s.status === 'met').length,
      breached: all.filter(s => s.status === 'breached').length,
      atRisk: all.filter(s => s.status === 'at_risk').length,
    };
  }

  clear(): void {
    this.slos.clear();
    this.events = [];
  }
}

let defaultMonitor: SLOMonitor | null = null;

export function getSLOMonitor(): SLOMonitor {
  if (!defaultMonitor) {
    defaultMonitor = new SLOMonitor();
    defaultMonitor.define('api_availability', 'API endpoint availability', 99.9);
    defaultMonitor.define('llm_response_time', 'LLM response within 10s', 95, 24);
    defaultMonitor.define('event_delivery', 'Event delivery success rate', 99.99, 24);
    defaultMonitor.define('cache_hit_rate', 'Cache hit rate >= 80%', 80, 1);
  }
  return defaultMonitor;
}
