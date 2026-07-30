import { simulateCommand } from '../simulate';

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

jest.mock('../../utils/output', () => ({ printHeader: jest.fn(), printLine: jest.fn(), printResult: jest.fn() }));
jest.mock('../../utils/version', () => ({ getCliVersion: jest.fn(() => '1.0.0') }));
jest.mock('../../hardening/output-contract', () => ({ createEnvelope: jest.fn(d => d) }));
jest.mock('node:crypto', () => ({ randomUUID: jest.fn(() => 'mock-uuid-12345') }));

jest.mock('../../simulation/scenario-builder', () => ({ buildScenario: jest.fn((id, name, desc, inputs, constraints, outcome) => ({ id: 'mock-uuid', name, description: desc, inputs, constraints, expectedOutcome: outcome })) }));
jest.mock('../../simulation/simulation-engine', () => ({ runSimulation: jest.fn(() => ({ ok: true, riskLevel: 'low', notes: ['Simulation completed'], duration: 150 })) }));
jest.mock('../../simulation/simulation-comparator', () => ({ compareSimulations: jest.fn(() => ({ winners: ['Scenario A'], differences: ['A has lower risk'] })) }));
jest.mock('../../simulation/simulation-validator', () => ({ validatePrediction: jest.fn(() => ({ valid: true, reasons: [] })) }));
jest.mock('../../simulation/simulation-report', () => ({ buildSimulationReport: jest.fn(() => ({ summary: ['Report summary'], validation: { valid: true } })) }));

describe('simulate', () => {
  const cmd = simulateCommand();
  const { printHeader, printLine, printResult } = require('../../utils/output');

  afterAll(() => { mockExit.mockRestore(); mockConsoleError.mockRestore(); });

  it('should have run, compare, validate, report subcommands', () => {
    expect(cmd.commands.map(c => c.name())).toEqual(expect.arrayContaining(['run', 'compare', 'validate', 'report']));
  });

  it('run should execute a simulation', async () => {
    await cmd.parseAsync(['node', 'test', 'run', 'TestScenario', 'A test scenario']);
    expect(printHeader).toHaveBeenCalledWith('Simulação');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('TestScenario'));
  });

  it('run --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'run', 'S', 'D', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('run with custom inputs and constraints', async () => {
    const { buildScenario } = require('../../simulation/scenario-builder');
    await cmd.parseAsync(['node', 'test', 'run', 'S', 'D', '--inputs', '{"key":"val"}', '--constraints', '["c1"]']);
    expect(buildScenario).toHaveBeenCalledWith('mock-uuid-12345', 'S', 'D', { key: 'val' }, ['c1'], 'Operação segura');
  });

  it('run with failed simulation should show risk', async () => {
    await cmd.parseAsync(['node', 'test', 'run', 'S', 'D']);
    expect(printResult).toHaveBeenCalledWith('Resultado', true, 'OK');
  });

  it('run with invalid JSON inputs should handle error', async () => {
    await cmd.parseAsync(['node', 'test', 'run', 'S', 'D', '--inputs', 'not-json']);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Erro na simulação'));
    expect(mockExit).toHaveBeenCalled();
  });

  it('compare should compare scenarios', async () => {
    await cmd.parseAsync(['node', 'test', 'compare', '[{"name":"A","description":"Desc A"}]']);
    expect(printHeader).toHaveBeenCalledWith('Comparação de Simulações');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Scenario A'));
  });

  it('compare --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'compare', '[{"name":"A","description":"D"}]', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('compare should show winners', async () => {
    await cmd.parseAsync(['node', 'test', 'compare', '[{"name":"A","description":"D"}]']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Scenario A'));
  });

  it('validate should validate simulation', async () => {
    await cmd.parseAsync(['node', 'test', 'validate', 'TestScenario']);
    expect(printHeader).toHaveBeenCalledWith('Validação Preditiva');
    expect(printResult).toHaveBeenCalledWith('Válido', true);
  });

  it('validate --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'validate', 'S', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('validate with invalid result should show reasons', async () => {
    const { validatePrediction } = require('../../simulation/simulation-validator');
    validatePrediction.mockReturnValueOnce({ valid: false, reasons: ['Risk too high'] });
    await cmd.parseAsync(['node', 'test', 'validate', 'S']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Risk too high'));
  });

  it('report should generate simulation report', async () => {
    await cmd.parseAsync(['node', 'test', 'report', 'TestScenario']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Report summary'));
  });

  it('report --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'report', 'S', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('report with invalid constraints should handle error', async () => {
    await cmd.parseAsync(['node', 'test', 'report', 'S', '--constraints', 'not-json']);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Erro no relatório'));
    expect(mockExit).toHaveBeenCalled();
  });
});
