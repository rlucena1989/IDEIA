import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPrintLine = jest.fn();
const mockPrintResult = jest.fn();
const mockExistsSync = jest.fn();
const mockReadFile = jest.fn();

jest.mock('../../utils/output', () => ({ printLine: (...args: unknown[]) => mockPrintLine(...args), printResult: (...args: unknown[]) => mockPrintResult(...args) }));

const ioMock = { getIO: () => ({ fs: { exists: (p: string) => mockExistsSync(p), read: (...args: unknown[]) => mockReadFile(...args) } }) };
jest.mock('../../io', () => ioMock);

function detectAnomalies(values: number[], threshold = 2.5): { value: number; zScore: number; isAnomaly: boolean; severity: string }[] {
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const s = Math.sqrt(values.reduce((sq, v) => sq + (v - m) ** 2, 0) / values.length);
  if (s === 0) return values.map(v => ({ value: v, zScore: 0, isAnomaly: false, severity: 'none' }));
  return values.map(v => {
    const z = Math.abs(v - m) / s;
    let severity = 'none';
    if (z > threshold * 2) severity = 'high';
    else if (z > threshold * 1.5) severity = 'medium';
    else if (z > threshold) severity = 'low';
    return { value: v, zScore: Math.round(z * 100) / 100, isAnomaly: z > threshold, severity };
  });
}

function detectTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 3) return 'stable';
  const half = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondHalf = values.slice(half).reduce((a, b) => a + b, 0) / (values.length - half);
  const diff = secondHalf - firstHalf;
  const threshold = (values.reduce((a, b) => a + b, 0) / values.length) * 0.05;
  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
}

describe('detectAnomalies', () => {
  it('returns zero z-scores when all values are identical', () => {
    const result = detectAnomalies([5, 5, 5]);
    expect(result).toHaveLength(3);
    for (const r of result) { expect(r.zScore).toBe(0); expect(r.isAnomaly).toBe(false); }
  });

  it('detects high anomaly with large deviation', () => {
    const vals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100];
    const result = detectAnomalies(vals, 1.5);
    const anomaly = result.find(r => r.isAnomaly);
    expect(anomaly).toBeDefined();
    expect(anomaly!.value).toBe(100);
    expect(anomaly!.severity).toBe('high');
  });

  it('classifies medium severity', () => {
    const vals = [0, 0, 0, 0, 0, 0, 100];
    const result = detectAnomalies(vals, 1.5);
    const anomaly = result.find(r => r.isAnomaly);
    expect(anomaly).toBeDefined();
    expect(anomaly!.severity).toBe('medium');
  });

  it('classifies low severity', () => {
    const vals = [0, 0, 0, 100];
    const anomaly = detectAnomalies(vals, 1.5).find(r => r.isAnomaly);
    expect(anomaly).toBeDefined();
    expect(anomaly!.severity).toBe('low');
  });

  it('handles custom threshold', () => {
    const vals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 100];
    expect(detectAnomalies(vals, 1.0).filter(r => r.isAnomaly).length).toBeGreaterThanOrEqual(detectAnomalies(vals, 1.8).filter(r => r.isAnomaly).length);
  });
});

describe('detectTrend', () => {
  it('returns stable for fewer than 3 values', () => { expect(detectTrend([1])).toBe('stable'); expect(detectTrend([1, 2])).toBe('stable'); });
  it('detects upward trend', () => { expect(detectTrend([1, 1, 2, 3, 5, 8])).toBe('up'); });
  it('detects downward trend', () => { expect(detectTrend([9, 8, 7, 6, 5])).toBe('down'); });
  it('returns stable for flat line', () => { expect(detectTrend([5, 5, 5, 5, 5])).toBe('stable'); });
  it('returns stable for minor fluctuations', () => { expect(detectTrend([10, 10, 11, 10, 10])).toBe('stable'); });
});

function getCmd() {
  const { anomalyCommand } = require('../anomaly');
  return anomalyCommand();
}

describe('anomalyCommand', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns command named anomaly', () => { expect(getCmd().name()).toBe('anomaly'); });

  it('has subcommands detect, trend, scan', () => {
    const names = getCmd().commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(['detect', 'trend', 'scan']);
  });

  it('detect subcommand validates minimum 3 values', () => {
    const cmd = getCmd();
    const detect = cmd.commands.find((c: { name: () => string }) => c.name() === 'detect')!;
    detect._actionHandler([['10', '20']]);
    expect(mockPrintResult).toHaveBeenCalledWith('Erro', false, 'Forneça ao menos 3 valores numéricos');
  });

  it('detect subcommand detects anomalies with default threshold', () => {
    const cmd = getCmd();
    const detect = cmd.commands.find((c: { name: () => string }) => c.name() === 'detect')!;
    detect._actionHandler([['10', '10', '10', '100', '10']]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('Anomalias encontradas'));
  });

  it('detect subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const detect = cmd.commands.find((c: { name: () => string }) => c.name() === 'detect')!;
    detect.setOptionValue('json', true);
    detect._actionHandler([['10', '20', '30']]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"results"'));
  });

  it('trend subcommand validates minimum 2 values', () => {
    const cmd = getCmd();
    const trend = cmd.commands.find((c: { name: () => string }) => c.name() === 'trend')!;
    trend._actionHandler([['10']]);
    expect(mockPrintResult).toHaveBeenCalledWith('Erro', false, 'Forneça ao menos 2 valores');
  });

  it('trend subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const trend = cmd.commands.find((c: { name: () => string }) => c.name() === 'trend')!;
    trend.setOptionValue('json', true);
    trend._actionHandler([['1', '2', '3']]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"trend"'));
  });

  it('scan subcommand reports file not found', () => {
    mockExistsSync.mockReturnValue(false);
    const cmd = getCmd();
    const scan = cmd.commands.find((c: { name: () => string }) => c.name() === 'scan')!;
    scan._actionHandler(['nonexistent.jsonl']);
    expect(mockPrintResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('Arquivo não encontrado'));
  });

  it('scan subcommand processes JSONL file and detects anomalies', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockReturnValue('{"value":10}\n{"value":20}\n{"value":15}\n{"value":100}\n{"value":12}\n');
    const cmd = getCmd();
    const scan = cmd.commands.find((c: { name: () => string }) => c.name() === 'scan')!;
    scan._actionHandler(['metrics.jsonl']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('Anomalias'));
  });

  it('scan subcommand reports insufficient values', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockReturnValue('{"value":1}\n{"value":2}\n');
    const cmd = getCmd();
    const scan = cmd.commands.find((c: { name: () => string }) => c.name() === 'scan')!;
    scan._actionHandler(['metrics.jsonl']);
    expect(mockPrintResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('mínimo 3'));
  });

  it('scan subcommand outputs JSON with --json flag', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockReturnValue('{"value":1}\n{"value":2}\n{"value":3}\n');
    const cmd = getCmd();
    const scan = cmd.commands.find((c: { name: () => string }) => c.name() === 'scan')!;
    scan.setOptionValue('json', true);
    scan._actionHandler(['metrics.jsonl']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"file"'));
  });
});
