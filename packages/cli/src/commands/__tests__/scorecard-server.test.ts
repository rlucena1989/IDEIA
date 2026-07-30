jest.mock('../scorecard-report', () => ({
  generateHTML: jest.fn(() => '<html></html>'),
}));

jest.mock('../scorecard-notifications', () => ({
  sendNotifications: jest.fn(),
}));

jest.mock('../scorecard-utils', () => ({
  detectRegression: jest.fn(() => ({ regressed: false, drops: [], sinceTimestamp: null })),
}));

jest.mock('../../utils/crypto-utils', () => ({
  loadTlsOptions: jest.fn(() => ({ key: 'fake-key', cert: 'fake-cert' })),
}));

const mockCwd = jest.fn().mockReturnValue('/test/project');
const mockRead = jest.fn();
jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    fs: { cwd: mockCwd, read: mockRead, exists: jest.fn() },
  })),
}));

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

import { cadenceMode, watchMode, serveMode } from '../scorecard-server';

jest.mock('../scorecard', () => ({
  computeScorecard: jest.fn(() => Promise.resolve({
    timestamp: '2026-07-26T12:00:00.000Z',
    overallScore: 80,
    maturityLevel: 'B',
    categories: [],
    recommendations: [],
    evolution: { version: '18.0', categories: 0, items: 0 },
    trends: [],
    alerts: [],
    correlationAlerts: [],
    forecast: { forecast: 80, confidence: 'medium', trend: 'stable', history: [] },
    git: { branch: 'main', commit: 'abc', message: '' },
    meta: { durationMs: 50, scorecardVersion: '18.0' },
  })),
  saveAll: jest.fn(),
}));

describe('server mode functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports cadenceMode as a function', () => {
    expect(typeof cadenceMode).toBe('function');
  });

  it('exports watchMode as a function', () => {
    expect(typeof watchMode).toBe('function');
  });

  it('exports serveMode as a function', () => {
    expect(typeof serveMode).toBe('function');
  });
});
