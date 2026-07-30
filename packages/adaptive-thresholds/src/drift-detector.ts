import { DriftSignal, MetricSnapshot } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('drift-detector');

export class DriftDetector {
  private _alerts: DriftSignal[] = [];
  private _lastCheck: Date | null = null;

  async check(history: MetricSnapshot[]): Promise<DriftSignal | null> {
    if (history.length < 10) return null;
    this._lastCheck = new Date();
    const recent = history.slice(-10);
    const older = history.slice(0, 10);
    const psi = this._computePSI(older, recent);
    if (psi > 0.2) {
      const signal: DriftSignal = {
        type: 'data_drift', metric: 'coverage',
        severity: psi > 0.5 ? 'high' : 'medium',
        detectedAt: new Date(), pValue: 1 - psi,
        recommendation: psi > 0.5 ? 'Retrain model urgently' : 'Schedule retrain',
      };
      this._alerts.push(signal);
      return signal;
    }
    return null;
  }

  async getAlerts(): Promise<DriftSignal[]> { return [...this._alerts]; }

  private _computePSI(a: MetricSnapshot[], b: MetricSnapshot[]): number {
    const getCoverage = (arr: MetricSnapshot[]) => arr.map(m => m.coverage);
    const aVals = getCoverage(a);
    const bVals = getCoverage(b);
    const bins = [0, 20, 40, 60, 80, 100];
    let psi = 0;
    for (let i = 0; i < bins.length - 1; i++) {
      const pA = aVals.filter(v => v >= bins[i] && v < bins[i + 1]).length / aVals.length;
      const pB = bVals.filter(v => v >= bins[i] && v < bins[i + 1]).length / bVals.length;
      const pAd = Math.max(pA, 0.001);
      const pBd = Math.max(pB, 0.001);
      psi += (pBd - pAd) * Math.log(pBd / pAd);
    }
    return Math.max(0, psi);
  }
}
