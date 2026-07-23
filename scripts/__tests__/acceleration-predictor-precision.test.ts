import { predictProjectLoad } from '../acceleration/predictor';
import { analyzePrecision } from '../acceleration/precision';

describe('acceleration - predictor', () => {
  it('deve retornar forecast com estimatedJobs, estimatedDurationMs, risk', () => {
    const forecast = predictProjectLoad();
    expect(forecast.estimatedJobs).toBeGreaterThanOrEqual(1);
    expect(forecast.estimatedDurationMs).toBeGreaterThanOrEqual(0);
    expect(['low', 'medium', 'high']).toContain(forecast.risk);
  });

  it('estimatedDurationMs deve ser >= estimatedJobs * 500', () => {
    const forecast = predictProjectLoad();
    expect(forecast.estimatedDurationMs).toBeGreaterThanOrEqual(forecast.estimatedJobs * 500);
  });

  it('risk deve ser low, medium, ou high baseado no file count', () => {
    const forecast = predictProjectLoad();
    expect(['low', 'medium', 'high']).toContain(forecast.risk);
  });
});

describe('acceleration - precision', () => {
  it('deve retornar PrecisionReport com confidence, variance, stable', () => {
    const report = analyzePrecision();
    expect(report.confidence).toBeGreaterThanOrEqual(0);
    expect(report.confidence).toBeLessThanOrEqual(1);
    expect(report.variance).toBeGreaterThanOrEqual(0);
    expect(report.stable).toBeDefined();
  });

  it('stable deve ser true se confidence >= 0.8 e variance <= 0.2', () => {
    const report = analyzePrecision();
    const calcStable = report.confidence >= 0.8 && report.variance <= 0.2;
    expect(report.stable).toBe(calcStable);
  });
});