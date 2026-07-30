import { formatTestReport, runTestLoop } from '../runtime/test-loop';
import type { TestLoopReport } from '../runtime/test-loop';
import fs from 'node:fs';
import path from 'node:path';

describe('test-loop - formatTestReport', () => {
  it('deve formatar relatorio com todas as fases passando', () => {
    const report: TestLoopReport = {
      sessionId: 'test_abc123',
      overallPassed: true,
      results: [
        { phase: 'lint', passed: true, durationMs: 1000, output: 'No errors', errors: [] },
        { phase: 'typecheck', passed: true, durationMs: 2000, output: 'OK', errors: [] },
        { phase: 'unit', passed: true, durationMs: 5000, output: 'All tests passed', errors: [] },
      ],
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:08.000Z',
      autoFixApplied: false,
    };
    const output = formatTestReport(report);
    expect(output).toContain('abc123');
    expect(output).toContain('lint');
    expect(output).toContain('typecheck');
    expect(output).toContain('unit');
    expect(output).toContain('APROVADO');
  });

  it('deve marcar fases com falha', () => {
    const report: TestLoopReport = {
      sessionId: 'test_fail',
      overallPassed: false,
      results: [
        { phase: 'lint', passed: true, durationMs: 500, output: '', errors: [] },
        { phase: 'unit', passed: false, durationMs: 3000, output: '', errors: ['Test failed: expected 2 to be 3'] },
      ],
      startedAt: '',
      completedAt: '',
      autoFixApplied: false,
    };
    const output = formatTestReport(report);
    expect(output).toContain('FALHOU');
    expect(output).toContain('Test failed');
  });

  it('deve mostrar duracao total', () => {
    const report: TestLoopReport = {
      sessionId: 'test_time',
      overallPassed: true,
      results: [{ phase: 'lint', passed: true, durationMs: 1500, output: '', errors: [] }],
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:05.000Z',
      autoFixApplied: false,
    };
    const output = formatTestReport(report);
    expect(output).toContain('1500ms');
  });

  it('deve lidar com resultados vazios', () => {
    const report: TestLoopReport = {
      sessionId: 'test_empty',
      overallPassed: true,
      results: [],
      startedAt: '',
      completedAt: '',
      autoFixApplied: false,
    };
    const output = formatTestReport(report);
    expect(output).toBeTruthy();
  });
});

describe('test-loop - runTestLoop', () => {
  const reportDir = path.join(process.cwd(), '.ai/reports/test-loop');
  let report: ReturnType<typeof runTestLoop>;

  beforeAll(() => {
    report = runTestLoop();
  });

  afterEach(() => {
    try {
      if (fs.existsSync(reportDir)) {
        const files = fs.readdirSync(reportDir).filter(f => f.startsWith('test_'));
        files.forEach(f => fs.rmSync(path.join(reportDir, f)));
      }
    } catch {}
  });

  it('deve executar todas as fases e retornar relatorio', () => {
    expect(report.sessionId).toMatch(/^test_/);
    expect(report.results).toHaveLength(5);
    expect(report.results.map(r => r.phase)).toEqual(['lint', 'typecheck', 'unit', 'build', 'security']);
    expect(report.startedAt).toBeDefined();
    expect(report.completedAt).toBeDefined();
    expect(typeof report.overallPassed).toBe('boolean');
  });

  it('deve criar arquivo de relatorio no diretorio correto', () => {
    const reportFile = path.join(reportDir, `${report.sessionId}.json`);
    expect(fs.existsSync(reportFile)).toBe(true);
    const saved = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    expect(saved.sessionId).toBe(report.sessionId);
  });

  it('deve capturar erros de comandos que falham', () => {
    const failedPhases = report.results.filter(r => !r.passed);
    failedPhases.forEach(phase => {
      expect(phase.errors.length).toBeGreaterThan(0);
      expect(phase.durationMs).toBeGreaterThan(0);
    });
  });

  it('deve limitar output a 2000 caracteres', () => {
    report.results.forEach(result => {
      expect(result.output.length).toBeLessThanOrEqual(2000);
    });
  });
});
