import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { StudyIntensifier, StudyGap } from '../src/study-intensifier';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));

describe('StudyIntensifier', () => {
  let tmpDir: string;
  let estudosDir: string;
  let origCwd: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `study-intensifier-test-${Date.now()}-${Math.random()}`);
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

  it('returns empty gaps when estudos dir not found', () => {
    const intensifier = new StudyIntensifier('/nonexistent');
    const gaps = intensifier.scanGaps();
    expect(gaps).toEqual([]);
  });

  it('scans studies and detects missing sections', () => {
    fs.writeFileSync(path.join(estudosDir, 'ESTUDO-SAMPLE.md'), '# Sample Study\n\nSome intro content.\n\n');

    const intensifier = new StudyIntensifier(tmpDir, true);
    const gaps = intensifier.scanGaps();

    expect(gaps.length).toBe(1);
    expect(gaps[0].study).toBe('ESTUDO-SAMPLE');
    expect(gaps[0].missing).toContain('riscos');
    expect(gaps[0].missing).toContain('métricas');
    expect(gaps[0].missing).toContain('testes');
    expect(gaps[0].currentScore).toBeLessThan(5);
  });

  it('skips TEMPLATE-ANALISE-PERMANENTE.md', () => {
    fs.writeFileSync(path.join(estudosDir, 'TEMPLATE-ANALISE-PERMANENTE.md'), '# Template');
    fs.writeFileSync(path.join(estudosDir, 'ESTUDO-REAL.md'), '# Real Study');

    const intensifier = new StudyIntensifier(tmpDir);
    const gaps = intensifier.scanGaps();
    expect(gaps.every(g => g.study !== 'TEMPLATE-ANALISE-PERMANENTE')).toBe(true);
  });

  it('detects complete study with no gaps', () => {
    const content = [
      '# Complete Study',
      '## Riscos',
      'Some risk',
      '## Métricas',
      'metric: coverage 80%',
      '## Timeline',
      'fase 1: done',
      '## TASK-IDEIA-001',
      'Some task',
      '## ADR-001: Decision',
      'Some decision',
      '## Testes',
      'jest tests pass',
    ].join('\n');
    fs.writeFileSync(path.join(estudosDir, 'ESTUDO-COMPLETE.md'), content);

    const intensifier = new StudyIntensifier(tmpDir);
    const gaps = intensifier.scanGaps();
    expect(gaps).toEqual([]);
  });

  it('generates plan sorting gaps by score ascending', () => {
    const gaps: StudyGap[] = [
      { study: 'A', filePath: 'a.md', missing: ['riscos', 'testes', 'tasks', 'métricas', 'timeline'], currentScore: 1, targetScore: 5 },
      { study: 'B', filePath: 'b.md', missing: ['riscos'], currentScore: 4, targetScore: 5 },
      { study: 'C', filePath: 'c.md', missing: ['riscos', 'testes'], currentScore: 3, targetScore: 5 },
    ];

    const intensifier = new StudyIntensifier(tmpDir);
    const plan = intensifier.generatePlan(gaps);

    expect(plan.totalGaps).toBe(3);
    expect(plan.autoFixable.length).toBeGreaterThan(0);
    expect(plan.requiresHuman.length).toBeGreaterThanOrEqual(0);
    expect(plan.gaps[0].currentScore).toBeLessThanOrEqual(plan.gaps[1].currentScore);
  });

  it('applyAutoFix appends sections to study file', () => {
    const filePath = path.join(estudosDir, 'ESTUDO-FIX.md');
    fs.writeFileSync(filePath, '# Study to fix\n\nSome content\n');

    const intensifier = new StudyIntensifier(tmpDir);
    const gap: StudyGap = { study: 'ESTUDO-FIX', filePath, missing: ['tasks', 'testes'], currentScore: 3, targetScore: 5 };

    const result = intensifier.applyAutoFix(gap);
    expect(result).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('## Intensificação Automática');
    expect(content).toContain('Tasks Geradas');
    expect(content).toContain('Plano de Testes');
  });

  it('runCycle returns report with scans and fixes', () => {
    fs.writeFileSync(path.join(estudosDir, 'ESTUDO-CYCLE.md'), '# Cycle Study\n');

    const intensifier = new StudyIntensifier(tmpDir);
    const report = intensifier.runCycle();

    expect(report.scanned).toBeGreaterThan(0);
    expect(report.plansGenerated).toBe(1);
    expect(report.timestamp).toBeGreaterThan(0);
  });

  it('starts and stops auto intensify', () => {
    const intensifier = new StudyIntensifier(tmpDir);
    expect(intensifier.isAutoIntensifying()).toBe(false);

    intensifier.startAutoIntensify(60000);
    expect(intensifier.isAutoIntensifying()).toBe(true);

    intensifier.stopAutoIntensify();
    expect(intensifier.isAutoIntensifying()).toBe(false);
  });

  it('rollbackLastIntensification returns error when no history', () => {
    const intensifier = new StudyIntensifier(tmpDir);
    const result = intensifier.rollbackLastIntensification();
    expect(result.rolledBack).toBe(false);
    expect(result.errors).toContain('No intensification history to rollback');
  });

  it('getIntensificationHistory returns empty array initially', () => {
    const intensifier = new StudyIntensifier(tmpDir);
    expect(intensifier.getIntensificationHistory()).toEqual([]);
  });

  it('runCycle returns early when no gaps found', () => {
    const content = [
      '# Complete Study',
      '## Riscos\nRisk',
      '## Métricas\nmetric',
      '## Timeline\nfase 1',
      '## TASK-IDEIA-001',
      '## ADR-001: Decision',
      '## Testes\ntest',
    ].join('\n');
    fs.writeFileSync(path.join(estudosDir, 'ESTUDO-FULL.md'), content);

    const intensifier = new StudyIntensifier(tmpDir);
    const report = intensifier.runCycle();
    expect(report.scanned).toBe(0);
    expect(report.fixesApplied).toBe(0);
  });

  it('generates AI script with plan data', () => {
    const gaps: StudyGap[] = [
      { study: 'ESTUDO-TEST', filePath: path.join(estudosDir, 'ESTUDO-TEST.md'), missing: ['riscos'], currentScore: 4, targetScore: 5 },
    ];
    const intensifier = new StudyIntensifier(tmpDir);
    const plan = intensifier.generatePlan(gaps);

    const scriptPath = path.join(tmpDir, '.ai', 'scripts', 'test-helper.js');
    const result = intensifier.generateAIScript(plan, scriptPath);

    expect(result).toBe(scriptPath);
    expect(fs.existsSync(scriptPath)).toBe(true);
  });
});
