import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockBuildPublicationPlan = jest.fn<any>();
const mockValidatePublication = jest.fn<any>();
const mockRoutePublication = jest.fn<any>();
const mockBuildPublicationReport = jest.fn<any>();
const mockCreateEnvelope = jest.fn<any>();
const mockPrintHeader = jest.fn<any>();
const mockPrintLine = jest.fn<any>();
const mockPrintResult = jest.fn<any>();
const mockGetCliVersion = jest.fn<any>();

jest.mock('../../publication/publication-builder', () => ({ buildPublicationPlan: (...args: unknown[]) => mockBuildPublicationPlan(...args) }));
jest.mock('../../publication/publication-validator', () => ({ validatePublication: (...args: unknown[]) => mockValidatePublication(...args) }));
jest.mock('../../publication/publication-router', () => ({ routePublication: (...args: unknown[]) => mockRoutePublication(...args) }));
jest.mock('../../publication/publication-report', () => ({ buildPublicationReport: (...args: unknown[]) => mockBuildPublicationReport(...args) }));
jest.mock('../../hardening/output-contract', () => ({ createEnvelope: (...args: unknown[]) => mockCreateEnvelope(...args) }));
jest.mock('../../utils/output', () => ({ printHeader: (...args: unknown[]) => mockPrintHeader(...args), printLine: (...args: unknown[]) => mockPrintLine(...args), printResult: (...args: unknown[]) => mockPrintResult(...args) }));
jest.mock('../../utils/version', () => ({ getCliVersion: (...args: unknown[]) => mockGetCliVersion(...args) }));

function getCmd() {
  const { publishCommand } = require('../publish');
  return publishCommand();
}

describe('publishCommand', () => {
  let exitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockGetCliVersion.mockReturnValue('1.0.0');
    mockCreateEnvelope.mockImplementation((data: unknown) => data);
    mockBuildPublicationPlan.mockImplementation((title: string, summary: string, content: string, target: string) => ({ payload: { title, summary, content }, target: { kind: target }, validated: true }));
    mockValidatePublication.mockReturnValue({ ok: true, issues: [] });
    mockRoutePublication.mockImplementation((plan: any) => ({ ok: true, target: plan.target?.kind ?? 'cli', publishedAt: '2024-01-01T00:00:00.000Z' }));
    mockBuildPublicationReport.mockReturnValue({ summary: ['2 publications processed'], results: [{ ok: true, plan: { payload: { title: 'Release v2' } }, target: 'cli' }] });
  });

  afterEach(() => { exitSpy.mockRestore(); });

  it('returns command named publish', () => { expect(getCmd().name()).toBe('publish'); });

  it('has subcommands plan, validate, run, report', () => {
    const names = getCmd().commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(['plan', 'validate', 'run', 'report']);
  });

  it('plan subcommand creates publication plan', () => {
    const cmd = getCmd();
    const plan = cmd.commands.find((c: { name: () => string }) => c.name() === 'plan')!;
    plan.setOptionValue('content', 'Content here');
    plan.setOptionValue('target', 'cli');
    plan._actionHandler(['My Title', 'Summary text']);
    expect(mockBuildPublicationPlan).toHaveBeenCalledWith('My Title', 'Summary text', 'Content here', 'cli');
  });

  it('plan subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const plan = cmd.commands.find((c: { name: () => string }) => c.name() === 'plan')!;
    plan.setOptionValue('json', true);
    plan._actionHandler(['Title', 'Summary']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"payload"'));
  });

  it('plan subcommand uses default values', () => {
    const cmd = getCmd();
    const plan = cmd.commands.find((c: { name: () => string }) => c.name() === 'plan')!;
    plan._actionHandler(['Title', 'Summary']);
    expect(mockBuildPublicationPlan).toHaveBeenCalledWith('Title', 'Summary', 'Conteúdo gerado sob demanda', 'cli');
  });

  it('plan subcommand handles errors', () => {
    mockBuildPublicationPlan.mockImplementation(() => { throw new Error('build failed'); });
    const cmd = getCmd();
    const plan = cmd.commands.find((c: { name: () => string }) => c.name() === 'plan')!;
    plan._actionHandler(['T', 'S']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('validate subcommand validates publication plan', () => {
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate._actionHandler(['Title', 'Summary']);
    expect(mockBuildPublicationPlan).toHaveBeenCalled();
    expect(mockValidatePublication).toHaveBeenCalled();
  });

  it('validate subcommand shows issues when validation fails', () => {
    mockValidatePublication.mockReturnValue({ ok: false, issues: ['Missing required field'] });
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate._actionHandler(['Title', 'Summary']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('Missing required field'));
  });

  it('validate subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate.setOptionValue('json', true);
    validate._actionHandler(['T', 'S']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"ok"'));
  });

  it('validate subcommand handles errors', () => {
    mockBuildPublicationPlan.mockImplementation(() => { throw new Error('fail'); });
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate._actionHandler(['T', 'S']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('run subcommand routes publication', () => {
    const cmd = getCmd();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
    run.setOptionValue('target', 'json');
    run._actionHandler(['Title', 'Summary']);
    expect(mockBuildPublicationPlan).toHaveBeenCalledWith('Title', 'Summary', 'Conteúdo gerado sob demanda', 'json');
    expect(mockRoutePublication).toHaveBeenCalled();
  });

  it('run subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
    run.setOptionValue('json', true);
    run._actionHandler(['T', 'S']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"ok"'));
  });

  it('run subcommand handles errors', () => {
    mockBuildPublicationPlan.mockImplementation(() => { throw new Error('err'); });
    const cmd = getCmd();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
    run._actionHandler(['T', 'S']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('report subcommand builds publication report', () => {
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report._actionHandler([]);
    expect(mockBuildPublicationPlan).toHaveBeenCalledTimes(2);
    expect(mockRoutePublication).toHaveBeenCalledTimes(2);
    expect(mockBuildPublicationReport).toHaveBeenCalled();
  });

  it('report subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report.setOptionValue('json', true);
    report._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"ok"'));
  });

  it('report subcommand handles errors', () => {
    mockBuildPublicationPlan.mockImplementation(() => { throw new Error('fail'); });
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report._actionHandler([]);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
