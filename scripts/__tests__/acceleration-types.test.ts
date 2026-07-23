import { EngineMode, JobStatus, RiskLevel, TrendDirection, HealthStatus, AlertLevel, MaturityLevel } from '../acceleration/types';

describe('acceleration - types', () => {
  it('EngineMode aceita fast, balanced, deep', () => {
    const modes: EngineMode[] = ['fast', 'balanced', 'deep'];
    expect(modes).toHaveLength(3);
  });

  it('JobStatus aceita todos os estados', () => {
    const statuses: JobStatus[] = ['pending', 'running', 'success', 'failed', 'skipped'];
    expect(statuses).toHaveLength(5);
  });

  it('RiskLevel aceita low, medium, high', () => {
    const levels: RiskLevel[] = ['low', 'medium', 'high'];
    expect(levels).toHaveLength(3);
  });

  it('TrendDirection aceita up, down, flat', () => {
    const dirs: TrendDirection[] = ['up', 'down', 'flat'];
    expect(dirs).toHaveLength(3);
  });

  it('HealthStatus aceita good, warning, critical', () => {
    const statuses: HealthStatus[] = ['good', 'warning', 'critical'];
    expect(statuses).toHaveLength(3);
  });

  it('AlertLevel aceita info, warning, critical', () => {
    const levels: AlertLevel[] = ['info', 'warning', 'critical'];
    expect(levels).toHaveLength(3);
  });

  it('MaturityLevel aceita low, medium, high', () => {
    const levels: MaturityLevel[] = ['low', 'medium', 'high'];
    expect(levels).toHaveLength(3);
  });
});