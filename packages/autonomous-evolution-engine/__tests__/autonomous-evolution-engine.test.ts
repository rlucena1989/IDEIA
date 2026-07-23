import { describe, it, expect } from '@jest/globals';
import { AnalyzerEngine } from '../src/analyzer-engine';
import { PlannerEngine } from '../src/planner-engine';
import * as types from '../src/types';

describe('autonomous-evolution-engine', () => {
  it('exports scan result type structure', () => {
    const result: types.ScanResult = { scanner: 'health', timestamp: 1, score: 80, findings: [], recommendations: [], duration: 100 };
    expect(result.scanner).toBe('health');
  });

  it('AnalyzerEngine can be constructed with a mock logger', () => {
    const logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;
    const analyzer = new AnalyzerEngine(logger);
    expect(analyzer).toBeDefined();
  });

  it('PlannerEngine can be constructed with a mock logger', () => {
    const logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;
    const planner = new PlannerEngine(logger);
    expect(planner).toBeDefined();
  });
});
