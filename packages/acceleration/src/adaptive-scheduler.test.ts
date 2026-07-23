import { adaptSchedule } from './adaptive-scheduler';

describe('adaptive-scheduler', () => {
  const defaultHistory = { runs: 10, successRate: 0.9, averageQualityScore: 90, averageDurationMs: 100 };
  const healthy = { healthy: true, reasons: [] };

  it('should suggest deep mode when health is unhealthy', () => {
    const result = adaptSchedule('balanced', defaultHistory, { healthy: false, reasons: ['disk full'] });
    expect(result.suggestedMode).toBe('deep');
    expect(result.reason).toContain('saude');
  });

  it('should suggest deep mode for low success rate', () => {
    const history = { runs: 5, successRate: 0.5, averageQualityScore: 80, averageDurationMs: 100 };
    const result = adaptSchedule('balanced', history, healthy);
    expect(result.suggestedMode).toBe('deep');
    expect(result.reason).toContain('taxa de sucesso baixa');
  });

  it('should suggest fast mode for high quality history', () => {
    const history = { runs: 10, successRate: 0.96, averageQualityScore: 90, averageDurationMs: 100 };
    const result = adaptSchedule('balanced', history, healthy);
    expect(result.suggestedMode).toBe('fast');
    expect(result.reason).toContain('historico de alta qualidade');
  });

  it('should keep current mode otherwise', () => {
    const result = adaptSchedule('deep', defaultHistory, healthy);
    expect(result.suggestedMode).toBe('deep');
    expect(result.reason).toContain('mantendo');
  });
});