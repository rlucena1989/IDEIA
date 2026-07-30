import { recordAutoTrace, observabilityCommand } from '../observability';

jest.mock('node:fs', () => ({
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

jest.mock('node:https', () => ({
  request: jest.fn(),
}));

const mockIO = {
  fs: {
    cwd: jest.fn(() => process.cwd()),
    exists: jest.fn(() => false),
    read: jest.fn(() => ''),
    readDir: jest.fn(() => []),
    readDirEntries: jest.fn(() => []),
    readBuffer: jest.fn(() => Buffer.from('')),
    stat: jest.fn(() => ({ mtimeMs: Date.now(), size: 0, isDirectory: () => false })),
    write: jest.fn(),
    append: jest.fn(),
    mkDir: jest.fn(),
    ensureDir: jest.fn(),
    remove: jest.fn(),
    copy: jest.fn(),
  },
  shell: {
    exec: jest.fn(() => ({ status: 0, stdout: '', stderr: '' })),
    execString: jest.fn(() => ({ status: 0, stdout: '', stderr: '' })),
    spawn: jest.fn(() => ({ on: () => {}, pid: 0 })),
  },
  http: {
    get: jest.fn(() => Promise.resolve({ status: 200, data: null })),
    post: jest.fn(() => Promise.resolve({ status: 200, data: null })),
  },
};

jest.mock('../../io', () => ({
  getIO: jest.fn(() => mockIO),
  createIO: jest.fn(),
  resetIO: jest.fn(),
}));

import fs from 'node:fs';
import https from 'node:https';

const mockFsMkdirSync = fs.mkdirSync as jest.Mock;
const mockFsAppendFileSync = fs.appendFileSync as jest.Mock;
const mockHttpsRequest = https.request as jest.Mock;

let exitSpy: jest.SpyInstance;
let logSpy: jest.SpyInstance;
const OLD_ENV = process.env;

beforeEach(() => {
  exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  mockFsMkdirSync.mockReset();
  mockFsAppendFileSync.mockReset();
  mockHttpsRequest.mockReset();

  mockIO.fs.exists.mockReset().mockReturnValue(false);
  mockIO.fs.read.mockReset().mockReturnValue('');
  mockIO.fs.write.mockReset();
  mockIO.fs.append.mockReset();
  mockIO.fs.mkDir.mockReset();

  process.env = { ...OLD_ENV };
  delete process.env.SLACK_WEBHOOK_URL;
  delete process.env.DISCORD_WEBHOOK_URL;
});

afterEach(() => {
  exitSpy.mockRestore();
  logSpy.mockRestore();
  process.env = OLD_ENV;
});

describe('recordAutoTrace', () => {
  it('writes a trace entry to file with command and latency', () => {
    recordAutoTrace('test-cmd', 'success', 150);
    expect(mockFsMkdirSync).toHaveBeenCalledWith(
      expect.stringMatching(/[\\\/]\.ai[\\\/]reports[\\\/]observability/),
      { recursive: true },
    );
    expect(mockFsAppendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('traces.jsonl'),
      expect.stringContaining('"command":"test-cmd"'),
    );
  });

  it('includes error field when error is provided', () => {
    recordAutoTrace('failing-cmd', 'error', 500, 'Something broke');
    expect(mockFsAppendFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('"error":"Something broke"'),
    );
  });

  it('does not call https request on success status', () => {
    recordAutoTrace('ok-cmd', 'success', 100);
    expect(mockHttpsRequest).not.toHaveBeenCalled();
  });

  it('calls https request on error status when webhook is configured', () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    const mockReq = { write: jest.fn(), end: jest.fn() };
    mockHttpsRequest.mockReturnValue(mockReq);
    recordAutoTrace('err-cmd', 'error', 300, 'failure');
    expect(mockHttpsRequest).toHaveBeenCalled();
    expect(mockReq.end).toHaveBeenCalled();
  });

  it('handles errors silently (no crash on mkdir failure)', () => {
    mockFsMkdirSync.mockImplementation(() => { throw new Error('permission denied'); });
    expect(() => recordAutoTrace('crash-cmd', 'error', 200)).not.toThrow();
  });

  it('includes memory metrics in trace entry', () => {
    recordAutoTrace('mem-cmd', 'success', 50);
    const callArg = mockFsAppendFileSync.mock.calls[0][1] as string;
    const parsed = JSON.parse(callArg);
    expect(parsed).toHaveProperty('memory_rss_mb');
    expect(parsed).toHaveProperty('memory_heap_used_mb');
    expect(parsed.source).toBe('auto');
  });

  it('calls https request on timeout status when webhook is configured', () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
    const mockReq = { write: jest.fn(), end: jest.fn() };
    mockHttpsRequest.mockReturnValue(mockReq);
    recordAutoTrace('slow-cmd', 'timeout', 30000, 'timed out');
    expect(mockHttpsRequest).toHaveBeenCalled();
    expect(mockReq.end).toHaveBeenCalled();
  });
});

describe('observabilityCommand', () => {
  it('creates a Command with correct description', () => {
    const cmd = observabilityCommand();
    expect(cmd.name()).toBe('observability');
    expect(cmd.description()).toContain('Observability');
  });

  it('has trace, metrics, dashboard, list, alert subcommands', () => {
    const cmd = observabilityCommand();
    const names = cmd.commands.map(c => c.name());
    expect(names).toEqual(expect.arrayContaining(['trace', 'metrics', 'dashboard', 'list', 'alert']));
  });

  describe('trace', () => {
    it('registers a trace entry using getIO().fs.append', () => {
      mockIO.fs.append.mockClear();
      const cmd = observabilityCommand();
      cmd.exitOverride();
      cmd.parse([
        'node', 'test', 'trace',
        '--model', 'gpt-4', '--provider', 'openai',
        '--latency', '200', '--tokens-in', '100', '--tokens-out', '50',
      ]);
      expect(mockIO.fs.append).toHaveBeenCalledWith(
        expect.stringContaining('traces.jsonl'),
        expect.stringContaining('gpt-4'),
      );
    });
  });

  describe('metrics', () => {
    it('displays empty metrics when no traces exist', () => {
      const cmd = observabilityCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'metrics']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Total calls: 0'));
    });

    it('computes and displays metrics from traces', () => {
      mockIO.fs.exists.mockReturnValue(true);
      mockIO.fs.read.mockReturnValue([
        JSON.stringify({ model: 'gpt-4', provider: 'openai', latency_ms: 100, tokens_in: 50, tokens_out: 10, cost_usd: 0.01, command: 'test', status: 'success', timestamp: '2026-01-01T00:00:00.000Z' }),
        JSON.stringify({ model: 'gpt-4', provider: 'openai', latency_ms: 200, tokens_in: 100, tokens_out: 20, cost_usd: 0.02, command: 'test2', status: 'error', error: 'fail', timestamp: '2026-01-01T00:00:01.000Z' }),
      ].join('\n'));
      const cmd = observabilityCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'metrics']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Total calls: 2'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('By Model'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('gpt-4'));
    });

    it('handles traces with auto source and computes memory stats', () => {
      mockIO.fs.exists.mockReturnValue(true);
      mockIO.fs.read.mockReturnValue(JSON.stringify({
        model: 'gpt-4', provider: 'openai', latency_ms: 100, tokens_in: 50, tokens_out: 10,
        cost_usd: 0.01, command: 'test', status: 'success', timestamp: '2026-01-01T00:00:00.000Z',
        source: 'auto', memory_rss_mb: 100, memory_heap_used_mb: 50,
      }));
      const cmd = observabilityCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'metrics']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Avg RSS'));
    });

    it('saves metrics to file when --save is enabled', () => {
      mockIO.fs.write.mockClear();
      const cmd = observabilityCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'metrics', '--save']);
      expect(mockIO.fs.write).toHaveBeenCalledWith(
        expect.stringContaining('metrics.json'),
        expect.any(String),
      );
    });
  });

  describe('dashboard', () => {
    it('generates and saves dashboard JSON', () => {
      mockIO.fs.write.mockClear();
      const cmd = observabilityCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'dashboard']);
      expect(mockIO.fs.write).toHaveBeenCalledWith(
        expect.stringContaining('dashboard.json'),
        expect.any(String),
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Dashboard'));
    });
  });

  describe('list', () => {
    it('displays recent traces', () => {
      mockIO.fs.exists.mockReturnValue(true);
      mockIO.fs.read.mockReturnValue(JSON.stringify({
        model: 'claude-3', provider: 'anthropic', latency_ms: 300,
        tokens_in: 200, tokens_out: 50, cost_usd: 0.03, command: 'test',
        status: 'error', error: 'timeout', timestamp: '2026-01-01T00:00:00.000Z',
      }));
      const cmd = observabilityCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'list']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Recent'));
    });

    it('respects --limit option', () => {
      const traces = Array.from({ length: 10 }, (_, i) =>
        JSON.stringify({
          model: `model-${i}`, provider: 'test', latency_ms: 100,
          tokens_in: 10, tokens_out: 5, cost_usd: 0.001, command: 'test',
          status: 'success', timestamp: `2026-01-01T00:00:0${i}.000Z`,
        }),
      ).join('\n');
      mockIO.fs.exists.mockReturnValue(true);
      mockIO.fs.read.mockReturnValue(traces);
      const cmd = observabilityCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'list', '--limit', '3']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('last 3'));
    });

    it('shows empty message when no traces exist', () => {
      const cmd = observabilityCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'list']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Total traces: 0'));
    });
  });

  describe('alert', () => {
    it('shows not-configured message when no webhooks set', async () => {
      const cmd = observabilityCommand();
      cmd.exitOverride();
      await cmd.parseAsync(['node', 'test', 'alert']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No webhooks'));
    });
  });
});
