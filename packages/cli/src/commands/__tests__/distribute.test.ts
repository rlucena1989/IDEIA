import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockCreatePackageMetadata = jest.fn<any>();
const mockBuildOperationalPackage = jest.fn<any>();
const mockComputePackageChecksum = jest.fn<any>();
const mockValidateOperationalPackage = jest.fn<any>();
const mockEmitPackage = jest.fn<any>();
const mockBuildDistributionReport = jest.fn<any>();
const mockCreateEnvelope = jest.fn<any>();
const mockPrintHeader = jest.fn<any>();
const mockPrintLine = jest.fn<any>();
const mockPrintResult = jest.fn<any>();
const mockGetCliVersion = jest.fn<any>();

jest.mock('../../distribution/package-types', () => ({ createPackageMetadata: (...args: unknown[]) => mockCreatePackageMetadata(...args), OperationalPackage: {} }));
jest.mock('../../distribution/package-builder', () => ({ buildOperationalPackage: (...args: unknown[]) => mockBuildOperationalPackage(...args) }));
jest.mock('../../distribution/package-hasher', () => ({ computePackageChecksum: (...args: unknown[]) => mockComputePackageChecksum(...args) }));
jest.mock('../../distribution/package-validator', () => ({ validateOperationalPackage: (...args: unknown[]) => mockValidateOperationalPackage(...args) }));
jest.mock('../../distribution/package-emitter', () => ({ emitPackage: (...args: unknown[]) => mockEmitPackage(...args) }));
jest.mock('../../distribution/distribution-report', () => ({ buildDistributionReport: (...args: unknown[]) => mockBuildDistributionReport(...args) }));
jest.mock('../../hardening/output-contract', () => ({ createEnvelope: (...args: unknown[]) => mockCreateEnvelope(...args) }));
jest.mock('../../utils/output', () => ({ printHeader: (...args: unknown[]) => mockPrintHeader(...args), printLine: (...args: unknown[]) => mockPrintLine(...args), printResult: (...args: unknown[]) => mockPrintResult(...args) }));
jest.mock('../../utils/version', () => ({ getCliVersion: (...args: unknown[]) => mockGetCliVersion(...args) }));

function getCmd() {
  const { distributeCommand } = require('../distribute');
  return distributeCommand();
}

describe('distributeCommand', () => {
  let exitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockGetCliVersion.mockReturnValue('1.0.0');
    mockCreateEnvelope.mockImplementation((data: unknown) => data);
    mockCreatePackageMetadata.mockReturnValue({ packageId: 'pkg-123', version: '1.0.0', kind: 'state', source: 'local', target: 'remote' });
    mockComputePackageChecksum.mockReturnValue('abc123');
    mockBuildOperationalPackage.mockImplementation((_meta: unknown, _payload: unknown, checksum: string) => ({ metadata: { packageId: 'pkg-123', version: '1.0.0', kind: 'state', source: 'local', target: 'remote' }, payload: _payload, checksum }));
    mockValidateOperationalPackage.mockReturnValue({ ok: true, issues: [] });
    mockEmitPackage.mockReturnValue({ ok: true, target: 'remote', checksum: 'abc123' });
    mockBuildDistributionReport.mockReturnValue({ validation: { ok: true }, summary: ['All good'] });
  });

  afterEach(() => { exitSpy.mockRestore(); });

  it('returns command named distribute', () => { expect(getCmd().name()).toBe('distribute'); });

  it('has subcommands package, validate, emit, report', () => {
    const names = getCmd().commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(['package', 'validate', 'emit', 'report']);
  });

  it('package subcommand builds and shows package', () => {
    const cmd = getCmd();
    const pkg = cmd.commands.find((c: { name: () => string }) => c.name() === 'package')!;
    pkg._actionHandler(['{"data":"test"}']);
    expect(mockCreatePackageMetadata).toHaveBeenCalled();
    expect(mockComputePackageChecksum).toHaveBeenCalled();
    expect(mockBuildOperationalPackage).toHaveBeenCalled();
    expect(mockPrintHeader).toHaveBeenCalledWith('Pacote Operacional');
  });

  it('package subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const pkg = cmd.commands.find((c: { name: () => string }) => c.name() === 'package')!;
    pkg.setOptionValue('json', true);
    pkg._actionHandler(['{"data":"test"}']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"ok"'));
  });

  it('package subcommand uses provided options', () => {
    const cmd = getCmd();
    const pkg = cmd.commands.find((c: { name: () => string }) => c.name() === 'package')!;
    pkg.setOptionValue('source', 'ci');
    pkg.setOptionValue('target', 'prod');
    pkg.setOptionValue('kind', 'config');
    pkg.setOptionValue('version', '2.0.0');
    pkg._actionHandler(['{"data":"test"}']);
    expect(mockCreatePackageMetadata).toHaveBeenCalledWith({ version: '2.0.0', source: 'ci', target: 'prod', kind: 'config', tags: ['cli-generated'] });
  });

  it('package subcommand handles JSON parse error', () => {
    const cmd = getCmd();
    const pkg = cmd.commands.find((c: { name: () => string }) => c.name() === 'package')!;
    pkg._actionHandler(['not json']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('validate subcommand validates package integrity', () => {
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate._actionHandler(['{"data":"test"}']);
    expect(mockValidateOperationalPackage).toHaveBeenCalled();
  });

  it('validate subcommand shows issues when present', () => {
    mockValidateOperationalPackage.mockReturnValue({ ok: false, issues: ['Checksum mismatch'] });
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate._actionHandler(['{"data":"test"}']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('Checksum mismatch'));
  });

  it('validate subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate.setOptionValue('json', true);
    validate._actionHandler(['{"data":"test"}']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"ok"'));
  });

  it('validate subcommand accepts custom checksum', () => {
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate.setOptionValue('checksum', 'custom-hash');
    validate._actionHandler(['{"data":"test"}']);
    expect(mockBuildOperationalPackage).toHaveBeenCalledWith(expect.any(Object), { data: 'test' }, 'custom-hash');
  });

  it('emit subcommand emits package to target', () => {
    const cmd = getCmd();
    const emit = cmd.commands.find((c: { name: () => string }) => c.name() === 'emit')!;
    emit.setOptionValue('target', 'production');
    emit._actionHandler(['{"data":"test"}']);
    expect(mockEmitPackage).toHaveBeenCalledWith(expect.any(Object), 'production');
  });

  it('emit subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const emit = cmd.commands.find((c: { name: () => string }) => c.name() === 'emit')!;
    emit.setOptionValue('json', true);
    emit._actionHandler(['{"data":"test"}']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"ok"'));
  });

  it('emit subcommand handles errors', () => {
    const cmd = getCmd();
    const emit = cmd.commands.find((c: { name: () => string }) => c.name() === 'emit')!;
    emit._actionHandler(['bad json']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('report subcommand builds and shows distribution report', () => {
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report.setOptionValue('target', 'staging');
    report._actionHandler(['{"data":"test"}']);
    expect(mockBuildDistributionReport).toHaveBeenCalled();
  });

  it('report subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report.setOptionValue('json', true);
    report._actionHandler(['{"data":"test"}']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"ok"'));
  });

  it('report subcommand handles errors', () => {
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report._actionHandler(['not json']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
