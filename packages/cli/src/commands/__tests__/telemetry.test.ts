import { Command } from 'commander';
import { telemetryCommand } from '../telemetry';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000000'),
}));

jest.mock('../../telemetry/telemetry-collector', () => ({
  TelemetryCollector: jest.fn().mockImplementation(() => ({
    record: jest.fn(),
    list: jest.fn().mockReturnValue([]),
    filterBySeverity: jest.fn().mockReturnValue([]),
    clear: jest.fn(),
  })),
}));

jest.mock('../../telemetry/telemetry-tracer', () => ({
  TelemetryTracer: jest.fn().mockImplementation(() => ({
    listSpans: jest.fn().mockReturnValue([]),
  })),
}));

jest.mock('../../telemetry/telemetry-types', () => ({
  createTelemetryEvent: jest.fn((opts) => ({
    ...opts,
    timestamp: new Date().toISOString(),
    id: 'evt-1',
  })),
}));

jest.mock('../../telemetry/telemetry-aggregator', () => ({
  aggregateTelemetry: jest.fn(() => []),
}));

jest.mock('../../telemetry/telemetry-alerts', () => ({
  detectTelemetryAlerts: jest.fn(() => []),
}));

jest.mock('../../telemetry/telemetry-report', () => ({
  buildTelemetryReport: jest.fn(() => ({ summary: [] })),
}));

jest.mock('../../hardening/output-contract', () => ({
  createEnvelope: jest.fn((data) => data),
}));

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
}));

jest.mock('../../utils/version', () => ({
  getCliVersion: jest.fn(() => '0.0.0'),
}));

const OGTI = process.env.GTI_TEST_MODE;

beforeEach(() => { process.env.GTI_TEST_MODE = '1'; });
afterEach(() => { process.env.GTI_TEST_MODE = OGTI; });

describe('telemetryCommand', () => {
  it('returns a Commander Command with name telemetry', () => {
    const cmd = telemetryCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('telemetry');
  });

  it('has description', () => {
    const cmd = telemetryCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has sub-command record', () => {
    const cmd = telemetryCommand();
    const sub = cmd.commands.find((c) => c.name() === 'record');
    expect(sub).toBeDefined();
    expect(sub!.description()).toBeTruthy();
  });

  it('has sub-command list', () => {
    const cmd = telemetryCommand();
    const sub = cmd.commands.find((c) => c.name() === 'list');
    expect(sub).toBeDefined();
    expect(sub!.description()).toBeTruthy();
  });

  it('has sub-command aggregate', () => {
    const cmd = telemetryCommand();
    const sub = cmd.commands.find((c) => c.name() === 'aggregate');
    expect(sub).toBeDefined();
    expect(sub!.description()).toBeTruthy();
  });

  it('has sub-command report', () => {
    const cmd = telemetryCommand();
    const sub = cmd.commands.find((c) => c.name() === 'report');
    expect(sub).toBeDefined();
    expect(sub!.description()).toBeTruthy();
  });
});
