import { syncCommand } from '../sync';

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

jest.mock('../../utils/output', () => ({ printHeader: jest.fn(), printLine: jest.fn(), printResult: jest.fn() }));
jest.mock('../../utils/version', () => ({ getCliVersion: jest.fn(() => '1.0.0') }));
jest.mock('../../hardening/output-contract', () => ({ createEnvelope: jest.fn(d => d) }));

jest.mock('../../distribution/package-types', () => ({ createPackageMetadata: jest.fn((a: any) => ({ ...a, packageId: 'pkg-123' })) }));
jest.mock('../../distribution/package-builder', () => ({ buildOperationalPackage: jest.fn((m, p, c) => ({ meta: m, payload: p, checksum: c })) }));
jest.mock('../../distribution/package-hasher', () => ({ computePackageChecksum: jest.fn((d: string) => `sha256-${d.length}`) }));
jest.mock('../../distribution/sync-manager', () => ({ synchronizePackage: jest.fn((_pkg, _remote, target) => ({ ok: true, syncType: target === 'remote' ? 'push' : 'pull', status: 'synced', notes: ['OK'] })) }));
jest.mock('../../distribution/package-reconciler', () => ({ reconcilePackages: jest.fn(() => ({ ok: true, status: 'identical', notes: ['Identical'] })) }));

describe('sync', () => {
  const cmd = syncCommand();
  const { printHeader, printLine, printResult } = require('../../utils/output');

  afterAll(() => { mockExit.mockRestore(); mockConsoleError.mockRestore(); });

  it('should have status, run, reconcile, repair subcommands', () => {
    expect(cmd.commands.map(c => c.name())).toEqual(expect.arrayContaining(['status', 'run', 'reconcile', 'repair']));
  });

  it('status should compare local and remote packages', async () => {
    await cmd.parseAsync(['node', 'test', 'status', '{"key":"val"}', '{"key":"val2"}']);
    expect(printHeader).toHaveBeenCalledWith('Status de Sincronização');
  });

  it('status --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'status', '{}', '{}', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('status with divergent packages should show warning icon', async () => {
    await cmd.parseAsync(['node', 'test', 'status', '{"a":1}', '{"b":2}']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('✅'));
  });

  it('status with invalid JSON should handle error', async () => {
    await cmd.parseAsync(['node', 'test', 'status', 'not-json', '{}']);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Erro ao verificar status'));
    expect(mockExit).toHaveBeenCalled();
  });

  it('run should execute sync', async () => {
    await cmd.parseAsync(['node', 'test', 'run', '{"key":"val"}']);
    expect(printHeader).toHaveBeenCalledWith('Sincronização');
    expect(printResult).toHaveBeenCalledWith('Status', true, expect.any(String));
  });

  it('run --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'run', '{}', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('run with custom target should pass to sync', async () => {
    const { synchronizePackage } = require('../../distribution/sync-manager');
    await cmd.parseAsync(['node', 'test', 'run', '{}', '--target', 'custom-target']);
    expect(synchronizePackage).toHaveBeenCalledWith(expect.any(Object), undefined, 'custom-target');
  });

  it('run with invalid JSON should handle error', async () => {
    await cmd.parseAsync(['node', 'test', 'run', 'not-json']);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Erro na sincronização'));
    expect(mockExit).toHaveBeenCalled();
  });

  it('reconcile should reconcile divergences', async () => {
    await cmd.parseAsync(['node', 'test', 'reconcile', '{"a":1}', '{"a":2}']);
    expect(printHeader).toHaveBeenCalledWith('Reconciliação');
  });

  it('reconcile --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'reconcile', '{}', '{}', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('reconcile with diverged status should show warning', async () => {
    await cmd.parseAsync(['node', 'test', 'reconcile', '{"a":1}', '{"b":2}']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('✅'));
  });

  it('repair should force sync', async () => {
    await cmd.parseAsync(['node', 'test', 'repair', '{"key":"val"}']);
    expect(printHeader).toHaveBeenCalledWith('Reparo de Sincronização');
    expect(printResult).toHaveBeenCalledWith('Status', true, 'Forçado');
  });

  it('repair --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'repair', '{}', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('repair with error should handle gracefully', async () => {
    await cmd.parseAsync(['node', 'test', 'repair', 'not-json']);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Erro no reparo'));
    expect(mockExit).toHaveBeenCalled();
  });
});
