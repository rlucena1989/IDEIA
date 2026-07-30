import { platformCommand } from '../platform';

const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
}));

jest.mock('../../utils/version', () => ({
  getCliVersion: jest.fn(() => '24.0.0'),
}));

jest.mock('../../hardening/output-contract', () => ({
  createEnvelope: jest.fn((d: Record<string, unknown>) => d),
}));

jest.mock('../../platform/platform-builder', () => ({
  buildPlatformState: jest.fn((args: Record<string, unknown>) => ({
    ...args,
    status: 'built',
    modules: args.modules || [],
    policies: args.policies || [],
  })),
}));

jest.mock('../../platform/platform-verifier', () => ({
  verifyPlatform: jest.fn(() => ({
    ok: true,
    issues: [],
    notes: ['All checks passed'],
  })),
}));

jest.mock('../../platform/platform-packager', () => ({
  packagePlatform: jest.fn(() => ({
    version: '24.0.0',
    contents: ['file1', 'file2'],
    packageId: 'pkg-12345',
  })),
}));

jest.mock('../../platform/platform-deployer', () => ({
  deployPlatform: jest.fn(),
}));

jest.mock('../../platform/platform-maintenance', () => ({
  planPlatformMaintenance: jest.fn(() => ['task1', 'task2']),
}));

jest.mock('../../platform/platform-finish', () => ({
  finishPlatform: jest.fn(() => ({ finished: true })),
}));

jest.mock('../../platform/platform-report', () => ({
  buildPlatformReport: jest.fn((args: Record<string, unknown>) => ({
    summary: ['Report summary line 1'],
    state: { modules: ['m1'], policies: ['p1'] },
    maintenance: ['task1'],
    ...args,
  })),
}));

describe('platformCommand', () => {
  const cmd = platformCommand();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have a name', () => {
    expect(typeof cmd.name()).toBe('string');
    expect(cmd.name().length).toBeGreaterThan(0);
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have build, verify, package, report subcommands', () => {
    const subcommands = cmd.commands.map(c => c.name());
    expect(subcommands).toContain('build');
    expect(subcommands).toContain('verify');
    expect(subcommands).toContain('package');
    expect(subcommands).toContain('report');
  });

  it('build should print platform state', async () => {
    const { printHeader, printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'build']);
    expect(printHeader).toHaveBeenCalledWith('Plataforma');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('v24.0.0'));
  });

  it('build --json should print JSON envelope', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'build', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('build with custom name and version', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'build', '--name', 'MyPlatform', '--version', '1.0.0']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('MyPlatform'));
  });

  it('build with custom health score', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'build', '--health', '75']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('75'));
  });

  it('verify should check integrity', async () => {
    const { printHeader, printResult } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'verify']);
    expect(printHeader).toHaveBeenCalledWith('Verificação Final');
    expect(printResult).toHaveBeenCalledWith('Integridade', true);
  });

  it('verify --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'verify', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('package should package platform', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'package']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('24.0.0'));
  });

  it('package --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'package', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('report should generate full report', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'report']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('carregados'));
  });

  it('report --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'report', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  afterAll(() => {
    mockExit.mockRestore();
  });
});
