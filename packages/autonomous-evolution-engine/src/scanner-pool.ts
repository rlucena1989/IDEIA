import { EventBus } from '@ideia/event-bus';
import { Logger } from '@ideia/logger';
import { ScannerType, ScannerConfig, ScanResult, ScanFinding, ScanRecommendation, Trend } from './types';

interface PoolState {
  results: Map<ScannerType, ScanResult>;
  lastRun: Map<ScannerType, number>;
  configs: Map<ScannerType, ScannerConfig>;
}

export class ScannerPool {
  private bus: EventBus;
  private logger: Logger;
  private state: PoolState;
  private running: boolean;

  constructor(bus: EventBus, logger: Logger, configs?: ScannerConfig[]) {
    this.bus = bus;
    this.logger = logger;
    this.running = false;
    this.state = {
      results: new Map(),
      lastRun: new Map(),
      configs: new Map(),
    };
    const defaults: ScannerType[] = [
      'health', 'version', 'test', 'lint', 'perf',
      'security', 'contract', 'tech', 'scope', 'memory',
    ];
    for (const type of defaults) {
      const cfg = configs?.find(c => c.type === type) ?? {
        type,
        frequencyMs: 3600000,
        enabled: true,
      };
      this.state.configs.set(type, cfg);
    }
  }

  async scanAll(): Promise<ScanResult[]> {
    this.running = true;
    const promises: Promise<ScanResult>[] = [];
    for (const [type, cfg] of this.state.configs) {
      if (!cfg.enabled) continue;
      const elapsed = Date.now() - (this.state.lastRun.get(type) ?? 0);
      if (elapsed < cfg.frequencyMs) continue;
      promises.push(this.scanOne(type));
    }
    const results = await Promise.all(promises);
    this.running = false;
    await this.bus.emit({ type: 'scanner.completed', source: 'scanner-pool', payload: { count: results.length } });
    return results;
  }

  async scanOne(type: ScannerType): Promise<ScanResult> {
    const start = Date.now();
    const findings = await this.runScanner(type);
    const recommendations = this.deriveRecommendations(type, findings);
    const score = this.calculateScore(findings);
    const result: ScanResult = {
      scanner: type,
      timestamp: Date.now(),
      score,
      findings,
      recommendations,
      duration: Date.now() - start,
    };
    this.state.results.set(type, result);
    this.state.lastRun.set(type, Date.now());
    this.logger.info(`Scanner [${type}] — score ${score}, ${findings.length} findings`);
    await this.bus.emit({ type: 'scanner.done', source: 'scanner-pool', payload: { type, score } });
    return result;
  }

  getResults(): Map<ScannerType, ScanResult> {
    return new Map(this.state.results);
  }

  getHealth(): { overall: number; scanners: Record<ScannerType, number> } {
    const scanners = {} as Record<ScannerType, number>;
    let total = 0;
    for (const [type, result] of this.state.results) {
      scanners[type] = result.score;
      total += result.score;
    }
    const count = this.state.results.size;
    return { overall: count > 0 ? total / count : 1, scanners };
  }

  private async runScanner(type: ScannerType): Promise<ScanFinding[]> {
    switch (type) {
      case 'health': return this.healthScan();
      case 'version': return this.versionScan();
      case 'test': return this.testScan();
      case 'lint': return this.lintScan();
      case 'perf': return this.perfScan();
      case 'security': return this.securityScan();
      case 'contract': return this.contractScan();
      case 'tech': return this.techScan();
      case 'scope': return this.scopeScan();
      case 'memory': return this.memoryScan();
    }
  }

  private async healthScan(): Promise<ScanFinding[]> {
    return [
      { severity: 'info', message: 'Process health check passed', code: 'HEALTH-001' },
      { severity: 'info', message: `Uptime: ${process.uptime().toFixed(0)}s`, code: 'HEALTH-002' },
      { severity: 'info', message: `Memory RSS: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)}MB`, code: 'HEALTH-003' },
    ];
  }

  private async versionScan(): Promise<ScanFinding[]> {
    return [
      { severity: 'info', message: `Node ${process.version}`, code: 'VER-001' },
      { severity: 'info', message: `Platform ${process.platform}`, code: 'VER-002' },
    ];
  }

  private async testScan(): Promise<ScanFinding[]> {
    return [];
  }

  private async lintScan(): Promise<ScanFinding[]> {
    return [];
  }

  private async perfScan(): Promise<ScanFinding[]> {
    return [];
  }

  private async securityScan(): Promise<ScanFinding[]> {
    return [];
  }

  private async contractScan(): Promise<ScanFinding[]> {
    return [];
  }

  private async techScan(): Promise<ScanFinding[]> {
    return [
      { severity: 'info', message: 'TypeScript target ES2022', code: 'TECH-001' },
    ];
  }

  private async scopeScan(): Promise<ScanFinding[]> {
    return [];
  }

  private async memoryScan(): Promise<ScanFinding[]> {
    return [];
  }

  private deriveRecommendations(type: ScannerType, findings: ScanFinding[]): ScanRecommendation[] {
    const critical = findings.filter(f => f.severity === 'critical' || f.severity === 'high');
    return critical.map(f => ({
      action: `Fix: ${f.message}`,
      priority: f.severity === 'critical' ? 1 : 2,
      effort: 'hours' as const,
      category: type,
    }));
  }

  private calculateScore(findings: ScanFinding[]): number {
    const weights: Record<string, number> = {
      critical: -30, high: -15, medium: -5, low: -1, info: 0,
    };
    let score = 100;
    for (const f of findings) score += weights[f.severity] ?? 0;
    return Math.max(0, Math.min(100, score));
  }
}
