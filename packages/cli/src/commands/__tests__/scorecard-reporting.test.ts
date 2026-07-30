import type { ScorecardResult } from '../scorecard-types';

const mockCwd = jest.fn().mockReturnValue('/test/project');
const mockRead = jest.fn();
const mockWrite = jest.fn();
const mockMkDir = jest.fn();
const mockAppend = jest.fn();
const mockReadDir = jest.fn();
const mockExists = jest.fn();

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    fs: {
      cwd: mockCwd,
      read: mockRead,
      write: mockWrite,
      mkDir: mockMkDir,
      append: mockAppend,
      readDir: mockReadDir,
      exists: mockExists,
    },
  })),
}));

jest.mock('../scorecard-helpers', () => ({
  root: () => '/test/project',
  read: (...args: unknown[]) => mockRead(...args),
  shieldColor: jest.fn((s: number) => s >= 90 ? 'brightgreen' : s >= 70 ? 'yellow' : s >= 50 ? 'orange' : 'red'),
}));

const mockHttpRequest = jest.fn(() => ({ write: jest.fn(), end: jest.fn() })) as any;
jest.mock('node:http', () => ({ request: mockHttpRequest }));

const mockHttpsRequest = jest.fn(() => ({ write: jest.fn(), end: jest.fn() })) as any;
jest.mock('node:https', () => ({ request: mockHttpsRequest }));

(globalThis as any).log = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };

import {
  generateBadge, generateHTML,
  sendNotifications, publishResult, createTasksFromFailures,
} from '../scorecard-reporting';
import type { Notification } from '../scorecard-utils';

const baseResult = (overrides: Partial<ScorecardResult> = {}): ScorecardResult => ({
  timestamp: '2026-07-26T12:00:00.000Z',
  overallScore: 75,
  maturityLevel: 'B',
  categories: [
    {
      name: 'Segurança', weight: 50, score: 80, maxScore: 100,
      items: [{ id: 'S1', description: 'SSL config', passed: true, weight: 10 }],
    },
  ],
  recommendations: [],
  evolution: { version: '18.0', categories: 1, items: 5 },
  trends: [],
  alerts: [],
  correlationAlerts: [],
  forecast: { forecast: 78, confidence: 'medium', trend: 'up', history: [] },
  git: { branch: 'main', commit: 'abc1234', message: 'test' },
  meta: { durationMs: 100, scorecardVersion: '18.0' },
  ...overrides,
});

describe('generateBadge', () => {
  it('returns SVG string', () => {
    const svg = generateBadge(85);
    expect(svg).toContain('<svg');
    expect(svg).toContain('maturidade');
    expect(svg).toContain('85/100');
  });

  it('uses brightgreen for score >= 90', () => {
    const svg = generateBadge(95);
    expect(svg).toContain('#4c1');
  });

  it('uses red for score < 50', () => {
    const svg = generateBadge(30);
    expect(svg).toContain('#e05d44');
  });

  it('uses yellow for score 70-89', () => {
    const svg = generateBadge(75);
    expect(svg).toContain('#dfb317');
  });

  it('uses orange for score 50-69', () => {
    const svg = generateBadge(55);
    expect(svg).toContain('#fe7d37');
  });

  it('includes width attributes', () => {
    const svg = generateBadge(100);
    expect(svg).toContain('width="170"');
    expect(svg).toContain('height="20"');
  });
});

describe('generateHTML (reporting)', () => {
  it('returns HTML string with overall score', () => {
    const html = generateHTML(baseResult({ overallScore: 85 }));
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('85/100');
    expect(html).toContain('Scorecard');
  });

  it('includes badge image', () => {
    const html = generateHTML(baseResult());
    expect(html).toContain('badge.svg');
  });

  it('includes Nível label', () => {
    const html = generateHTML(baseResult({ maturityLevel: 'A' }));
    expect(html).toContain('Nível');
  });

  it('shows alerts section when alerts exist', () => {
    const result = baseResult({
      alerts: [{ category: 'Security', item: 'S1', severity: 'error', message: 'Alert!' }],
    });
    const html = generateHTML(result);
    expect(html).toContain('Alertas');
    expect(html).toContain('Alert!');
  });
});

describe('sendNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes file notification', () => {
    const nots: Notification[] = [{ type: 'file', message: 'test message', level: 'info' }];
    sendNotifications(nots);
    expect(mockAppend).toHaveBeenCalledWith(
      expect.stringContaining('notifications.log'),
      expect.stringContaining('[INFO]'),
      'utf8',
    );
  });

  it('sends webhook notification', () => {
    const nots: Notification[] = [{ type: 'webhook', message: 'webhook test', level: 'error' }];
    sendNotifications(nots, 'http://example.com/hook');
    expect(mockHttpRequest).toHaveBeenCalled();
  });

  it('uses https for https webhooks', () => {
    const nots: Notification[] = [{ type: 'webhook', message: 'secure', level: 'warn' }];
    sendNotifications(nots, 'https://example.com/hook');
    expect(mockHttpsRequest).toHaveBeenCalled();
  });

  it('handles multiple notifications', () => {
    const nots: Notification[] = [
      { type: 'file', message: 'first', level: 'info' },
      { type: 'file', message: 'second', level: 'error' },
    ];
    sendNotifications(nots);
    expect(mockAppend).toHaveBeenCalledTimes(2);
  });

  it('handles empty notifications', () => {
    expect(() => sendNotifications([])).not.toThrow();
  });
});

describe('publishResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing without webhookUrl', () => {
    publishResult(baseResult());
    expect(mockHttpRequest).not.toHaveBeenCalled();
  });

  it('sends HTTP request with webhookUrl', () => {
    publishResult(baseResult(), 'http://example.com/publish');
    expect(mockHttpRequest).toHaveBeenCalled();
  });

  it('sends score data in request body', () => {
    publishResult(baseResult({ overallScore: 80, maturityLevel: 'B' }), 'http://example.com/publish');
    const callArgs = mockHttpRequest.mock.calls[0][0];
    expect(callArgs.method).toBe('POST');
    expect(callArgs.headers['Content-Type']).toBe('application/json');
  });
});

describe('createTasksFromFailures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 0 when all items pass', () => {
    const result = baseResult();
    mockRead.mockReturnValue('# Backlog\n\n');
    expect(createTasksFromFailures(result)).toBe(0);
  });

  it('creates tasks for failed items with weight >= 2', () => {
    const result = baseResult({
      categories: [
        {
          name: 'Segurança', weight: 50, score: 50, maxScore: 100,
          items: [
            { id: 'S1', description: 'SSL config', passed: false, weight: 3, hint: 'use certbot' },
            { id: 'S2', description: 'Minor issue', passed: false, weight: 1 },
          ],
        },
      ],
    });
    mockRead.mockReturnValue(null);
    mockWrite.mockImplementation(() => {});
    const count = createTasksFromFailures(result);
    expect(count).toBe(1);
    expect(mockWrite).toHaveBeenCalledWith(
      expect.stringContaining('backlog.md'),
      expect.stringContaining('SCORE-S1'),
      'utf8',
    );
  });

  it('skips already created tasks', () => {
    const result = baseResult({
      categories: [
        {
          name: 'Test', weight: 50, score: 50, maxScore: 100,
          items: [{ id: 'EXISTING', description: 'Already tracked', passed: false, weight: 3 }],
        },
      ],
    });
    mockRead.mockReturnValue('# Backlog\n\nEXISTING');
    const count = createTasksFromFailures(result);
    expect(count).toBe(0);
  });

  it('skips zero-weight categories', () => {
    const result = baseResult({
      categories: [
        {
          name: 'Ignored', weight: 0, score: 0, maxScore: 100,
          items: [{ id: 'I1', description: 'Ignored fail', passed: false, weight: 5 }],
        },
      ],
    });
    mockRead.mockReturnValue('# Backlog\n\n');
    expect(createTasksFromFailures(result)).toBe(0);
  });
});
