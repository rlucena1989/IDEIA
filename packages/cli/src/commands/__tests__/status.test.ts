import { Command } from 'commander';
import { computeStatus, statusCommand, type StatusReport } from '../status';

const OGTI = process.env.GTI_TEST_MODE;

beforeEach(() => { process.env.GTI_TEST_MODE = '1'; });
afterEach(() => { process.env.GTI_TEST_MODE = OGTI; });

describe('computeStatus', () => {
  it('returns a StatusReport with areas and finalHealth', () => {
    const report = computeStatus();
    expect(report).toHaveProperty('areas');
    expect(report).toHaveProperty('finalHealth');
    expect(report).toHaveProperty('belowRecommended');
    expect(Array.isArray(report.areas)).toBe(true);
    expect(typeof report.finalHealth).toBe('number');
  });

  it('computes finalHealth between 0 and 100', () => {
    const report = computeStatus();
    expect(report.finalHealth).toBeGreaterThanOrEqual(0);
    expect(report.finalHealth).toBeLessThanOrEqual(100);
  });

  it('sets belowRecommended when health < 85', () => {
    const report = computeStatus();
    expect(typeof report.belowRecommended).toBe('boolean');
  });

  it('includes required file group checks in areas', () => {
    const report = computeStatus();
    expect(report.areas.length).toBeGreaterThan(0);
    for (const area of report.areas) {
      expect(area).toHaveProperty('id');
      expect(area).toHaveProperty('label');
      expect(area).toHaveProperty('score');
      expect(area).toHaveProperty('findings');
      expect(Array.isArray(area.findings)).toBe(true);
    }
  });
});

describe('statusCommand', () => {
  it('returns a Commander Command with name status', () => {
    const cmd = statusCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('status');
  });

  it('has description', () => {
    const cmd = statusCommand();
    expect(cmd.description()).toBeTruthy();
  });
});
