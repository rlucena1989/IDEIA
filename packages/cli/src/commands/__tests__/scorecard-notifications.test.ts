const mockCwd = jest.fn().mockReturnValue('/test/project');
const mockAppend = jest.fn();
const mockMkDir = jest.fn();
const mockWrite = jest.fn();
const mockRead = jest.fn();
const mockExists = jest.fn();

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    fs: {
      cwd: mockCwd,
      append: mockAppend,
      mkDir: mockMkDir,
      write: mockWrite,
      read: mockRead,
      exists: mockExists,
    },
  })),
}));

const mockHttpRequest = jest.fn(() => ({ write: jest.fn(), end: jest.fn() }));
jest.mock('node:http', () => ({ request: mockHttpRequest }));

const mockHttpsRequest = jest.fn(() => ({ write: jest.fn(), end: jest.fn() }));
jest.mock('node:https', () => ({ request: mockHttpsRequest }));

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn() })),
}));

import {
  sendNotifications, publishResult,
  type Notification,
} from '../scorecard-notifications';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Notification type', () => {
  it('supports desktop type', () => {
    const n: Notification = { type: 'desktop', message: 'test', level: 'info' };
    expect(n.type).toBe('desktop');
  });

  it('supports file type', () => {
    const n: Notification = { type: 'file', message: 'test', level: 'warn' };
    expect(n.type).toBe('file');
  });

  it('supports webhook type', () => {
    const n: Notification = { type: 'webhook', message: 'test', level: 'error' };
    expect(n.type).toBe('webhook');
  });
});

describe('sendNotifications', () => {
  it('writes log file for each notification', () => {
    const nots: Notification[] = [
      { type: 'file', message: 'msg1', level: 'info' },
      { type: 'file', message: 'msg2', level: 'error' },
    ];
    sendNotifications(nots);
    expect(mockMkDir).toHaveBeenCalled();
    expect(mockAppend).toHaveBeenCalledTimes(2);
  });

  it('sends webhook when type is webhook', () => {
    const nots: Notification[] = [{ type: 'webhook', message: 'hook msg', level: 'error' }];
    sendNotifications(nots, 'http://example.com/hook');
    expect(mockHttpRequest).toHaveBeenCalled();
  });

  it('uses https for https webhooks', () => {
    const nots: Notification[] = [{ type: 'webhook', message: 'secure', level: 'warn' }];
    sendNotifications(nots, 'https://example.com/hook');
    expect(mockHttpsRequest).toHaveBeenCalled();
  });

  it('handles empty notifications array', () => {
    expect(() => sendNotifications([])).not.toThrow();
  });

  it('only sends webhook when url is provided', () => {
    const nots: Notification[] = [{ type: 'webhook', message: 'test', level: 'info' }];
    sendNotifications(nots);
    expect(mockHttpRequest).not.toHaveBeenCalled();
  });
});

describe('publishResult', () => {
  it('does nothing without webhookUrl', () => {
    publishResult({
      overallScore: 75, maturityLevel: 'B', evolution: { version: '1.0' },
      git: { branch: 'main', commit: 'abc', message: 'test' },
      timestamp: '2026-07-26T12:00:00.000Z', alerts: [],
    });
    expect(mockHttpRequest).not.toHaveBeenCalled();
  });

  it('sends HTTP request with score data', () => {
    publishResult({
      overallScore: 80, maturityLevel: 'A', evolution: { version: '2.0' },
      git: { branch: 'main', commit: 'abc', message: '' },
      timestamp: '2026-07-26T12:00:00.000Z', alerts: [{ type: 'file', message: 'alert', level: 'warn' }],
    }, 'http://example.com/api');
    expect(mockHttpRequest).toHaveBeenCalled();
    const opts = mockHttpRequest.mock.calls[0][0];
    expect(opts.path).toBe('/api');
    expect(opts.method).toBe('POST');
  });

  it('includes only first 5 alerts', () => {
    const alerts: Notification[] = Array.from({ length: 10 }, (_, i) => ({
      type: 'file' as const, message: `alert ${i}`, level: 'info' as const,
    }));
    publishResult({
      overallScore: 75, maturityLevel: 'B', evolution: { version: '1.0' },
      git: { branch: 'main', commit: 'abc', message: '' },
      timestamp: '2026-07-26T12:00:00.000Z', alerts,
    }, 'http://example.com/api');
    expect(mockHttpRequest).toHaveBeenCalled();
  });

  it('handles errors gracefully', () => {
    mockHttpRequest.mockImplementation(() => { throw new Error('network error'); });
    expect(() => publishResult({
      overallScore: 75, maturityLevel: 'B', evolution: { version: '1.0' },
      git: { branch: 'main', commit: 'abc', message: '' },
      timestamp: '2026-07-26T12:00:00.000Z', alerts: [],
    }, 'http://example.com/api')).not.toThrow();
  });
});
