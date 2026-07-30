import { Command } from 'commander';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'node:path';
import { reportCommand } from '../report';
import { getIO, resetIO } from '../../io';
import type { MockIOContainer } from '../../io/mock';
import { printLine, printHeader, printResult } from '../../utils/output';

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
}));

jest.mock('../../io', () => {
  const { MockIOContainer } = jest.requireActual('../../io/mock');
  let mockIO: MockIOContainer | null = null;
  return {
    __esModule: true,
    getIO: () => {
      if (!mockIO) mockIO = new MockIOContainer();
      return mockIO;
    },
    resetIO: () => { mockIO = null; },
    createIO: () => {
      if (!mockIO) mockIO = new MockIOContainer();
      return mockIO;
    },
  };
});

let io: MockIOContainer;

beforeEach(() => {
  resetIO();
  io = getIO() as unknown as MockIOContainer;
  io._reset();
  io.setupProject();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
});

afterEach(() => {
  resetIO();
});

describe('reportCommand', () => {
  it('returns a Commander Command with name report', () => {
    const cmd = reportCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('report');
  });

  it('has description', () => {
    const cmd = reportCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has sub-command aggregate', () => {
    const cmd = reportCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(expect.arrayContaining(['aggregate']));
  });
});

describe('report aggregate action', () => {
  beforeEach(() => {
    (printLine as jest.Mock).mockClear();
    (printHeader as jest.Mock).mockClear();
    (printResult as jest.Mock).mockClear();
  });

  function writeScorecard(score: number): void {
    const root = process.cwd();
    io.fs.mkDir(path.join(root, '.ai/reports'), true);
    io.fs.write(path.join(root, '.ai/reports/scorecard.json'), JSON.stringify({ overallScore: score }));
  }

  it('reports Scorecard as pass when score >= 80', () => {
    writeScorecard(85);
    const cmd = reportCommand();
    cmd.parse(['node', 'test', 'aggregate']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('PASS'));
  });

  it('reports Scorecard as warn when score >= 50', () => {
    writeScorecard(65);
    const cmd = reportCommand();
    cmd.parse(['node', 'test', 'aggregate']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('WARN'));
  });

  it('reports Scorecard as fail when score < 50', () => {
    writeScorecard(30);
    const cmd = reportCommand();
    cmd.parse(['node', 'test', 'aggregate']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('FAIL'));
  });

  it('reports Scorecard as missing when no file', () => {
    const cmd = reportCommand();
    cmd.parse(['node', 'test', 'aggregate']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('MISSING'));
  });

  it('aggregate with --json outputs JSON', () => {
    writeScorecard(85);
    const cmd = reportCommand();
    cmd.parse(['node', 'test', 'aggregate', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('totalSections'));
  });

  it('aggregate with --output saves to file', () => {
    writeScorecard(85);
    const cmd = reportCommand();
    const outPath = path.join(process.cwd(), 'aggregate-output.json');
    cmd.parse(['node', 'test', 'aggregate', '--output', outPath]);
    expect(io.fs.exists(outPath)).toBe(true);
  });

  it('aggregate handles Coverage with fail threshold', () => {
    const root = process.cwd();
    writeScorecard(85);
    io.fs.mkDir(path.join(root, 'coverage'), true);
    io.fs.write(path.join(root, 'coverage/coverage-summary.json'), JSON.stringify({
      total: { statements: { pct: 40 }, branches: { pct: 30 }, functions: { pct: 50 }, lines: { pct: 40 } },
    }));
    const cmd = reportCommand();
    cmd.parse(['node', 'test', 'aggregate']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('FAIL'));
  });

  it('aggregate handles Telemetry with metrics.json', () => {
    const root = process.cwd();
    writeScorecard(85);
    io.fs.mkDir(path.join(root, '.ai/reports/observability'), true);
    io.fs.write(path.join(root, '.ai/reports/observability/metrics.json'), JSON.stringify({
      success_rate: 95, total_calls: 100, avg_latency_ms: 200, p95_latency_ms: 500, total_cost_usd: 10,
    }));
    const cmd = reportCommand();
    cmd.parse(['node', 'test', 'aggregate']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('PASS'));
  });

  it('aggregate handles Security with issues (warn)', () => {
    const root = process.cwd();
    writeScorecard(85);
    io.fs.write(path.join(root, '.ai/reports/security-report.json'), JSON.stringify({ issues: [{ id: 'xss' }] }));
    const cmd = reportCommand();
    cmd.parse(['node', 'test', 'aggregate']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('WARN'));
  });

  it('aggregate handles Audit with files', () => {
    const root = process.cwd();
    writeScorecard(85);
    io.fs.mkDir(path.join(root, '.ai/audit'), true);
    io.fs.write(path.join(root, '.ai/audit/audit-1.json'), JSON.stringify({ event: 'test' }));
    const cmd = reportCommand();
    cmd.parse(['node', 'test', 'aggregate']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('PASS'));
  });

  it('aggregate handles Performance metrics.jsonl', () => {
    const root = process.cwd();
    writeScorecard(85);
    io.fs.mkDir(path.join(root, '.ai/reports/performance'), true);
    io.fs.write(path.join(root, '.ai/reports/performance/metrics.jsonl'), '{"metrics": {"cpu": 50}}\n{"metrics": {"cpu": 60}}');
    const cmd = reportCommand();
    cmd.parse(['node', 'test', 'aggregate']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('PASS'));
  });

  it('aggregate handles parse errors gracefully', () => {
    const root = process.cwd();
    io.fs.mkDir(path.join(root, '.ai/reports'), true);
    io.fs.write(path.join(root, '.ai/reports/scorecard.json'), 'not valid json');
    const cmd = reportCommand();
    expect(() => cmd.parse(['node', 'test', 'aggregate'])).not.toThrow();
  });
});
