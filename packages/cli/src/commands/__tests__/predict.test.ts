import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockBuildScenario = jest.fn();
const mockRunSimulation = jest.fn();
const mockValidatePrediction = jest.fn();
const mockCompareSimulations = jest.fn();
const mockPredictRisk = jest.fn();
const mockAssessRisk = jest.fn();
const mockEstimateImpact = jest.fn();
const mockBuildPredictionReport = jest.fn();
const mockCreateEnvelope = jest.fn();
const mockPrintHeader = jest.fn();
const mockPrintLine = jest.fn();
const mockPrintResult = jest.fn();
const mockGetCliVersion = jest.fn();

jest.mock('../../simulation/scenario-builder', () => ({ buildScenario: (...args: unknown[]) => mockBuildScenario(...args) }));
jest.mock('../../simulation/simulation-engine', () => ({ runSimulation: (...args: unknown[]) => mockRunSimulation(...args) }));
jest.mock('../../simulation/simulation-validator', () => ({ validatePrediction: (...args: unknown[]) => mockValidatePrediction(...args) }));
jest.mock('../../simulation/simulation-comparator', () => ({ compareSimulations: (...args: unknown[]) => mockCompareSimulations(...args) }));
jest.mock('../../prediction/predictor-engine', () => ({ predictRisk: (...args: unknown[]) => mockPredictRisk(...args) }));
jest.mock('../../prediction/risk-model', () => ({ assessRisk: (...args: unknown[]) => mockAssessRisk(...args) }));
jest.mock('../../prediction/impact-estimator', () => ({ estimateImpact: (...args: unknown[]) => mockEstimateImpact(...args) }));
jest.mock('../../prediction/prediction-report', () => ({ buildPredictionReport: (...args: unknown[]) => mockBuildPredictionReport(...args) }));
jest.mock('../../hardening/output-contract', () => ({ createEnvelope: (...args: unknown[]) => mockCreateEnvelope(...args) }));
jest.mock('../../utils/output', () => ({ printHeader: (...args: unknown[]) => mockPrintHeader(...args), printLine: (...args: unknown[]) => mockPrintLine(...args), printResult: (...args: unknown[]) => mockPrintResult(...args) }));
jest.mock('../../utils/version', () => ({ getCliVersion: (...args: unknown[]) => mockGetCliVersion(...args) }));

function getCmd() {
  const { predictCommand } = require('../predict');
  return predictCommand();
}

describe('predictCommand', () => {
  let exitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockGetCliVersion.mockReturnValue('1.0.0');
    mockCreateEnvelope.mockImplementation((data: unknown) => data);
    mockBuildScenario.mockReturnValue({ id: 'sc-1', name: 'test', type: 'Predição', status: 'Predito' });
    mockRunSimulation.mockReturnValue({ ok: true, riskLevel: 'medium', confidence: 0.85 });
    mockValidatePrediction.mockReturnValue({ valid: true, reasons: [] });
    mockCompareSimulations.mockReturnValue({ winners: ['Scenario A'], differences: ['Diff 1'] });
    mockPredictRisk.mockReturnValue({ riskLevel: 'low', confidence: 0.9 });
    mockAssessRisk.mockReturnValue({ target: 'system', score: 4 });
    mockEstimateImpact.mockReturnValue({ severity: 'medium', impactArea: 'availability' });
    mockBuildPredictionReport.mockReturnValue({ notes: ['All good'], results: [] });
  });

  afterEach(() => { exitSpy.mockRestore(); });

  it('returns command named predict', () => { expect(getCmd().name()).toBe('predict'); });

  it('has subcommands run, validate, report, compare', () => {
    const names = getCmd().commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(['run', 'validate', 'report', 'compare']);
  });

  it('run subcommand executes prediction scenario', () => {
    const cmd = getCmd();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
    run.setOptionValue('inputs', '{"key":"val"}');
    run.setOptionValue('constraints', '["critical"]');
    run._actionHandler(['Scenario A']);
    expect(mockBuildScenario).toHaveBeenCalled();
    expect(mockRunSimulation).toHaveBeenCalled();
    expect(mockPrintHeader).toHaveBeenCalledWith('Predição');
  });

  it('run subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
    run.setOptionValue('json', true);
    run._actionHandler(['Scene 1']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"name"'));
  });

  it('run subcommand handles errors gracefully', () => {
    mockRunSimulation.mockImplementation(() => { throw new Error('sim failed'); });
    const cmd = getCmd();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
    run._actionHandler(['Scene']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('validate subcommand validates prediction', () => {
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate.setOptionValue('inputs', '{}');
    validate.setOptionValue('constraints', '["critical"]');
    validate._actionHandler(['Scene']);
    expect(mockBuildScenario).toHaveBeenCalled();
    expect(mockValidatePrediction).toHaveBeenCalled();
  });

  it('validate subcommand shows validation reasons', () => {
    mockValidatePrediction.mockReturnValue({ valid: false, reasons: ['Risk too high'] });
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate._actionHandler(['Scene']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('Risk too high'));
  });

  it('validate subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate.setOptionValue('json', true);
    validate._actionHandler(['Scene']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"valid"'));
  });

  it('validate subcommand handles errors', () => {
    mockRunSimulation.mockImplementation(() => { throw new Error('sim fail'); });
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate._actionHandler(['Scene']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('report subcommand generates consolidated report', () => {
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report.setOptionValue('target', 'api');
    report.setOptionValue('history', '10');
    report._actionHandler([]);
    expect(mockPredictRisk).toHaveBeenCalledWith(expect.objectContaining({ target: 'api' }));
    expect(mockAssessRisk).toHaveBeenCalled();
    expect(mockEstimateImpact).toHaveBeenCalled();
    expect(mockBuildPredictionReport).toHaveBeenCalled();
  });

  it('report subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report.setOptionValue('json', true);
    report._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"ok"'));
  });

  it('report subcommand handles errors', () => {
    mockPredictRisk.mockImplementation(() => { throw new Error('pred fail'); });
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report._actionHandler([]);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('compare subcommand compares multiple scenarios', () => {
    const cmd = getCmd();
    const compare = cmd.commands.find((c: { name: () => string }) => c.name() === 'compare')!;
    compare._actionHandler(['[{"name":"A","constraints":[]},{"name":"B"}]']);
    expect(mockBuildScenario).toHaveBeenCalledTimes(2);
    expect(mockCompareSimulations).toHaveBeenCalled();
  });

  it('compare subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const compare = cmd.commands.find((c: { name: () => string }) => c.name() === 'compare')!;
    compare.setOptionValue('json', true);
    compare._actionHandler(['[{"name":"A"}]']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"winners"'));
  });

  it('compare subcommand handles errors', () => {
    const cmd = getCmd();
    const compare = cmd.commands.find((c: { name: () => string }) => c.name() === 'compare')!;
    compare._actionHandler(['not json']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
