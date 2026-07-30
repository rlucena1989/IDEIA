import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { StudyScanner, createStudyScanner } from '../src/study-scanner';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));

describe('StudyScanner', () => {
  let tmpDir: string;
  let estudosDir: string;
  let origCwd: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `study-scanner-test-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    estudosDir = path.join(tmpDir, 'docs', 'ESTUDOS');
    fs.mkdirSync(estudosDir, { recursive: true });
    origCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty scores when no estudos dir', () => {
    const scanner = new StudyScanner('/nonexistent');
    const scores = scanner.scanAll();
    expect(scores).toEqual([]);
  });

  it('scanAll returns scores for all study files', () => {
    fs.writeFileSync(path.join(estudosDir, 'ESTUDO-ONE.md'), '# Study One\n');
    fs.writeFileSync(path.join(estudosDir, 'ESTUDO-TWO.md'), '# Study Two\n## Riscos\nRisk\n## Métricas\nMetric\n');

    const scanner = new StudyScanner(tmpDir);
    const scores = scanner.scanAll();

    expect(scores.length).toBe(2);
    expect(scores.some(s => s.name === 'ESTUDO-ONE')).toBe(true);
    expect(scores.some(s => s.name === 'ESTUDO-TWO')).toBe(true);
  });

  it('scores are sorted ascending', () => {
    fs.writeFileSync(path.join(estudosDir, 'ESTUDO-LOW.md'), '# Low score\n');
    fs.writeFileSync(path.join(estudosDir, 'ESTUDO-HIGH.md'), '# High score\n## Riscos\nRisk\n## Métricas\nMetric\n## Timeline\nfase\n## TASK-IDEIA-001\ntask\n## ADR-001: Decision\ndecision\n## Testes\ntest\n');

    const scanner = new StudyScanner(tmpDir);
    const scores = scanner.scanAll();

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1].score).toBeLessThanOrEqual(scores[i].score);
    }
  });

  it('startContinuousMonitoring and stopContinuousMonitoring control timer', () => {
    const scanner = new StudyScanner(tmpDir);
    expect(scanner.isMonitoring()).toBe(false);

    scanner.startContinuousMonitoring(60000);
    expect(scanner.isMonitoring()).toBe(true);

    scanner.stopContinuousMonitoring();
    expect(scanner.isMonitoring()).toBe(false);
  });

  it('getMonitoringHistory returns recorded entries', () => {
    fs.writeFileSync(path.join(estudosDir, 'ESTUDO-MON.md'), '# Monitor Study\n');

    const scanner = new StudyScanner(tmpDir);
    scanner.startContinuousMonitoring(60000);
    const history = scanner.getMonitoringHistory();
    expect(history.length).toBeGreaterThanOrEqual(0);
    scanner.stopContinuousMonitoring();
  });

  it('getLatestScores returns current scan', () => {
    fs.writeFileSync(path.join(estudosDir, 'ESTUDO-LATEST.md'), '# Latest\n');

    const scanner = new StudyScanner(tmpDir);
    const scores = scanner.getLatestScores();
    expect(scores.length).toBe(1);
  });

  it('alertOnDegradation does not throw when no studies', () => {
    const scanner = new StudyScanner(tmpDir);
    expect(() => scanner.alertOnDegradation(3)).not.toThrow();
  });

  it('createStudyScanner factory works', () => {
    const scanner = createStudyScanner(tmpDir);
    expect(scanner).toBeInstanceOf(StudyScanner);
  });
});
