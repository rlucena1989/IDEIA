import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockFederationRegistry = { register: jest.fn(), list: jest.fn() };
const mockCreateContextNode = jest.fn();
const mockResolveConflict = jest.fn();
const mockBuildFederationReport = jest.fn();
const mockCreateEnvelope = jest.fn();
const mockPrintHeader = jest.fn();
const mockPrintLine = jest.fn();
const mockPrintResult = jest.fn();
const mockGetCliVersion = jest.fn();

jest.mock('../../federation/federation-registry', () => ({ FederationRegistry: jest.fn().mockImplementation(() => mockFederationRegistry) }));
jest.mock('../../federation/federation-types', () => ({ createContextNode: (...args: unknown[]) => mockCreateContextNode(...args), ContextNode: {}, SyncDecision: {} }));
jest.mock('../../federation/conflict-resolver', () => ({ resolveConflict: (...args: unknown[]) => mockResolveConflict(...args), ConflictResolution: {} }));
jest.mock('../../federation/federation-report', () => ({ buildFederationReport: (...args: unknown[]) => mockBuildFederationReport(...args) }));
jest.mock('../../hardening/output-contract', () => ({ createEnvelope: (...args: unknown[]) => mockCreateEnvelope(...args) }));
jest.mock('../../utils/output', () => ({ printHeader: (...args: unknown[]) => mockPrintHeader(...args), printLine: (...args: unknown[]) => mockPrintLine(...args), printResult: (...args: unknown[]) => mockPrintResult(...args) }));
jest.mock('../../utils/version', () => ({ getCliVersion: (...args: unknown[]) => mockGetCliVersion(...args) }));

function getCmd() {
  const { federationCommand } = require('../federation');
  return federationCommand();
}

describe('federationCommand', () => {
  let exitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockGetCliVersion.mockReturnValue('1.0.0');
    mockCreateEnvelope.mockImplementation((data: unknown) => data);
    mockFederationRegistry.list.mockReturnValue([
      { name: 'local-dev', type: 'local', status: 'healthy', authorityLevel: 'high', scope: ['state'] },
      { name: 'prod', type: 'authority', status: 'degraded', authorityLevel: 'critical', scope: ['state', 'generation'] },
    ]);
    mockCreateContextNode.mockImplementation((data: unknown) => data);
    mockBuildFederationReport.mockReturnValue({ summary: ['Federation running'], nodes: [] });
  });

  afterEach(() => { exitSpy.mockRestore(); });

  it('returns command named federation', () => { expect(getCmd().name()).toBe('federation'); });

  it('has subcommands list, register, status, report', () => {
    const names = getCmd().commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(['list', 'register', 'status', 'report']);
  });

  it('list subcommand shows all nodes', () => {
    const cmd = getCmd();
    const list = cmd.commands.find((c: { name: () => string }) => c.name() === 'list')!;
    list._actionHandler([]);
    expect(mockPrintHeader).toHaveBeenCalledWith('Federação de Contextos');
  });

  it('list subcommand seeds nodes when --seed flag provided', () => {
    mockFederationRegistry.list.mockReturnValue([]);
    const cmd = getCmd();
    const list = cmd.commands.find((c: { name: () => string }) => c.name() === 'list')!;
    list.setOptionValue('seed', true);
    list._actionHandler([]);
    expect(mockFederationRegistry.register).toHaveBeenCalledTimes(3);
  });

  it('list subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const list = cmd.commands.find((c: { name: () => string }) => c.name() === 'list')!;
    list.setOptionValue('json', true);
    list._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"count"'));
  });

  it('list subcommand shows different status icons', () => {
    mockFederationRegistry.list.mockReturnValue([
      { name: 'n1', type: 'local', status: 'healthy', authorityLevel: 'high', scope: ['state'] },
      { name: 'n2', type: 'edge', status: 'degraded', authorityLevel: 'medium', scope: [] },
      { name: 'n3', type: 'remote', status: 'blocked', authorityLevel: 'low', scope: [] },
      { name: 'n4', type: 'authority', status: 'unknown', authorityLevel: 'critical', scope: [] },
    ]);
    const cmd = getCmd();
    const list = cmd.commands.find((c: { name: () => string }) => c.name() === 'list')!;
    list._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('🟢'));
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('🟡'));
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('🔴'));
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('⚫'));
  });

  it('list subcommand handles errors', () => {
    mockFederationRegistry.list.mockImplementation(() => { throw new Error('list fail'); });
    const cmd = getCmd();
    const list = cmd.commands.find((c: { name: () => string }) => c.name() === 'list')!;
    list._actionHandler([]);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('register subcommand registers a new node', () => {
    const cmd = getCmd();
    const register = cmd.commands.find((c: { name: () => string }) => c.name() === 'register')!;
    register.setOptionValue('scope', 'state,generation');
    register.setOptionValue('authority', 'medium');
    register._actionHandler(['my-node', 'edge']);
    expect(mockCreateContextNode).toHaveBeenCalledWith({ name: 'my-node', type: 'edge', scope: ['state', 'generation'], authorityLevel: 'medium' });
    expect(mockFederationRegistry.register).toHaveBeenCalled();
    expect(mockPrintResult).toHaveBeenCalledWith('Nó registrado', true, expect.any(String));
  });

  it('register subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const register = cmd.commands.find((c: { name: () => string }) => c.name() === 'register')!;
    register.setOptionValue('json', true);
    register._actionHandler(['n1', 'local']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"name"'));
  });

  it('register subcommand handles errors', () => {
    mockCreateContextNode.mockImplementation(() => { throw new Error('fail'); });
    const cmd = getCmd();
    const register = cmd.commands.find((c: { name: () => string }) => c.name() === 'register')!;
    register._actionHandler(['n1', 'bad']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('status subcommand shows node counts', () => {
    const cmd = getCmd();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    status._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('Saudáveis'));
  });

  it('status subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    status.setOptionValue('json', true);
    status._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"total"'));
  });

  it('status subcommand handles errors', () => {
    mockFederationRegistry.list.mockImplementation(() => { throw new Error('fail'); });
    const cmd = getCmd();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    status._actionHandler([]);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('report subcommand builds federation report', () => {
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report._actionHandler([]);
    expect(mockBuildFederationReport).toHaveBeenCalled();
  });

  it('report subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report.setOptionValue('json', true);
    report._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"summary"'));
  });

  it('report subcommand handles errors', () => {
    mockFederationRegistry.list.mockImplementation(() => { throw new Error('fail'); });
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report._actionHandler([]);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
