import { DevExMetricCollector } from '../src/collector';
import { DevExScorecardEngine } from '../src/scorecard';
import { DevExAlerter } from '../src/alerter';

describe('DevExMetricCollector', () => {
  it('records and queries metrics', () => { const c = new DevExMetricCollector(); c.record('test-coverage', 75, '%'); expect(c.query('test-coverage')).toHaveLength(1); });
  it('aggregates within window', () => { const c = new DevExMetricCollector(); c.record('latency', 100, 'ms'); c.record('latency', 200, 'ms'); const a = c.aggregate('latency', 60000); expect(a.count).toBe(2); expect(a.avg).toBe(150); });
  it('computes DORA metrics', () => { const c = new DevExMetricCollector(); const d = c.computeDORA(10, 48, 2, 10, 30); expect(d.deployFrequency).toBeCloseTo(1.43, 1); expect(d.changeFailureRate).toBe(0.2); });
});

describe('DevExScorecardEngine', () => {
  it('evaluates categories', () => { const e = new DevExScorecardEngine(); const cards = e.evaluate({ 'deploy-frequency': 12, 'lead-time': 2, 'change-failure-rate': 0.03, 'recovery-time': 30, 'test-coverage': 85, 'code-quality': 92 }); expect(cards).toHaveLength(6); });
  it('computes overall score', () => { const e = new DevExScorecardEngine(); const cards = e.evaluate({ 'deploy-frequency': 12, 'lead-time': 2, 'change-failure-rate': 0.03, 'recovery-time': 30, 'test-coverage': 85, 'code-quality': 92 }); const o = e.getOverall(cards); expect(o.score).toBeGreaterThan(50); });
  it('tracks history', () => { const e = new DevExScorecardEngine(); e.evaluate({ 'deploy-frequency': 5, 'lead-time': 10, 'change-failure-rate': 0.1, 'recovery-time': 60, 'test-coverage': 70, 'code-quality': 80 }); e.evaluate({ 'deploy-frequency': 8, 'lead-time': 8, 'change-failure-rate': 0.08, 'recovery-time': 45, 'test-coverage': 75, 'code-quality': 85 }); expect(e.getHistory()).toHaveLength(2); });
  it('detects improving trend', () => { const e = new DevExScorecardEngine(); e.evaluate({ 'deploy-frequency': 3, 'lead-time': 24, 'change-failure-rate': 0.15, 'recovery-time': 120, 'test-coverage': 60, 'code-quality': 70 }); e.evaluate({ 'deploy-frequency': 5, 'lead-time': 20, 'change-failure-rate': 0.12, 'recovery-time': 100, 'test-coverage': 65, 'code-quality': 75 }); e.evaluate({ 'deploy-frequency': 8, 'lead-time': 16, 'change-failure-rate': 0.1, 'recovery-time': 80, 'test-coverage': 70, 'code-quality': 80 }); expect(e.getTrend('deploy-frequency')).toBe('improving'); });
});

describe('DevExAlerter', () => {
  it('evaluates rules against metrics', () => { const c = new DevExMetricCollector(); c.record('deploy-frequency', 0.5, '/week'); const a = new DevExAlerter(c); const alerts = a.evaluate(); expect(alerts.length).toBeGreaterThan(0); });
  it('respects cooldown', () => { const c = new DevExMetricCollector(); c.record('deploy-frequency', 0.5, '/week'); const a = new DevExAlerter(c); a.evaluate(); const second = a.evaluate(); expect(second).toHaveLength(0); });
});
