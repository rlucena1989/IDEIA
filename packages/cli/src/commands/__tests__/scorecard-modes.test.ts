const mockRead = jest.fn();
const mockWrite = jest.fn();
const mockCwd = jest.fn().mockReturnValue('/test/project');
const mockExists = jest.fn();
const mockReadDir = jest.fn();
const mockAppend = jest.fn();
const mockMkDir = jest.fn();

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    fs: {
      cwd: mockCwd,
      read: mockRead,
      write: mockWrite,
      exists: mockExists,
      readDir: mockReadDir,
      append: mockAppend,
      mkDir: mockMkDir,
    },
  })),
}));

jest.mock('../scorecard-helpers', () => ({
  root: () => '/test/project',
  read: (...args: unknown[]) => mockRead(...args),
}));

jest.mock('../scorecard-reporting', () => ({
  generateHTML: jest.fn(() => '<html></html>'),
  generateBadge: jest.fn(() => '<svg></svg>'),
  sendNotifications: jest.fn(),
}));

jest.mock('../../utils/crypto-utils', () => ({
  loadTlsOptions: jest.fn(() => ({ key: 'fake', cert: 'fake' })),
}));

import type { ScorecardResult, ScorecardCategory } from '../scorecard-types';
import { loadPolicyGates, applyPolicyGates } from '../scorecard-modes';

describe('loadPolicyGates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array when policy file not found', () => {
    mockRead.mockReturnValue(null);
    expect(loadPolicyGates()).toEqual([]);
  });

  it('parses policy gates from YAML-like content', () => {
    mockRead.mockReturnValue(`gates:
      - category: "Security"
        minScore: 80
        action: "block"
      - category: "Quality"
        minScore: 70
        action: "warn"`);
    const gates = loadPolicyGates();
    expect(gates.length).toBeGreaterThanOrEqual(2);
  });

  it('handles malformed YAML gracefully', () => {
    mockRead.mockReturnValue('invalid: yaml: content');
    const gates = loadPolicyGates();
    expect(Array.isArray(gates)).toBe(true);
  });
});

describe('applyPolicyGates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeResult = (categories: Partial<ScorecardCategory>[]): ScorecardResult => ({
    timestamp: '2026-07-26T12:00:00.000Z',
    overallScore: 75,
    maturityLevel: 'B',
    categories: categories.map(c => ({
      name: c.name || 'Test', weight: c.weight || 50, score: c.score || 100,
      maxScore: 100, items: c.items || [],
      ...c,
    })),
    recommendations: [],
    evolution: { version: '18.0', categories: 0, items: 0 },
    trends: [],
    alerts: [],
    correlationAlerts: [],
    forecast: { forecast: 0, confidence: 'low', trend: 'stable', history: [] },
    git: { branch: 'main', commit: 'abc', message: '' },
    meta: { durationMs: 0, scorecardVersion: '18.0' },
  });

  it('returns blocked=false when no gates', () => {
    const result = makeResult([]);
    expect(applyPolicyGates(result, [])).toEqual({ blocked: false, tasksCreated: 0 });
  });

  it('blocks when category score is below minScore', () => {
    const result = makeResult([{ name: 'Segurança', score: 50 }]);
    const gates = [{ category: 'Segurança', minScore: 80, action: 'block' as const }];
    expect(applyPolicyGates(result, gates)).toEqual({ blocked: true, tasksCreated: 0 });
  });

  it('does not block when score meets threshold', () => {
    const result = makeResult([{ name: 'Segurança', score: 90 }]);
    const gates = [{ category: 'Segurança', minScore: 80, action: 'block' as const }];
    expect(applyPolicyGates(result, gates)).toEqual({ blocked: false, tasksCreated: 0 });
  });

  it('creates tasks for auto-create-task action', () => {
    const result = makeResult([{ name: 'Quality', score: 50 }]);
    const gates = [{ category: 'Quality', minScore: 80, action: 'auto-create-task' as const }];
    mockRead.mockReturnValue('# Backlog\n');
    const output = applyPolicyGates(result, gates);
    expect(output.tasksCreated).toBe(1);
    expect(mockWrite).toHaveBeenCalledWith(
      expect.stringContaining('backlog.md'),
      expect.stringContaining('POLICY-Quality'),
      'utf8',
    );
  });

  it('does not create duplicate tasks', () => {
    const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const result = makeResult([{ name: 'Quality', score: 50 }]);
    const gates = [{ category: 'Quality', minScore: 80, action: 'auto-create-task' as const }];
    const taskId = `POLICY-Quality-${Date.now().toString(36)}`;
    mockRead.mockReturnValue(`# Backlog\n${taskId}`);
    const output = applyPolicyGates(result, gates);
    expect(output.tasksCreated).toBe(0);
    mockDateNow.mockRestore();
  });

  it('handles case-insensitive category matching', () => {
    const result = makeResult([{ name: 'Segurança da Informação', score: 50 }]);
    const gates = [{ category: 'segurança', minScore: 80, action: 'block' as const }];
    expect(applyPolicyGates(result, gates)).toEqual({ blocked: true, tasksCreated: 0 });
  });
});
