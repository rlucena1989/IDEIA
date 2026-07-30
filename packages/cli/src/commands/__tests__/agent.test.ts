import { agentCommand } from '../agent';

const agents: Array<Record<string, unknown>> = [];

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
}));
jest.mock('../../utils/version', () => ({ getCliVersion: jest.fn(() => '1.0.0') }));
jest.mock('../../hardening/output-contract', () => ({ createEnvelope: jest.fn((d: Record<string, unknown>) => d) }));
jest.mock('../../agents/agent-registry', () => ({
  AgentRegistry: jest.fn().mockImplementation(() => ({
    register: jest.fn((a: Record<string, unknown>) => { agents.push(a); }),
    list: jest.fn(() => [...agents]),
  })),
}));
jest.mock('../../agents/agent-types', () => ({
  createAgent: jest.fn((d: Record<string, unknown>) => ({ ...d, status: 'idle', id: (d as any).name || 'agent' })),
  createTask: jest.fn((d: Record<string, unknown>) => ({ ...d, taskId: 'task-1', status: 'pending' })),
}));
jest.mock('../../agents/agent-coordinator', () => ({
  coordinateTasks: jest.fn(() => ({ assigned: [{ taskId: 't1', agentId: 'a1', type: 'test' }], rejected: [], results: [{ taskId: 't1', status: 'completed' }] })),
}));
jest.mock('../../agents/agent-merge', () => ({ mergeAgentResults: jest.fn(() => ({ sources: ['src1'], payload: { key: 'val' } })) }));
jest.mock('../../agents/agent-result', () => ({ summarizeResults: jest.fn(() => ({ total: 5, ok: 4, failed: 1, okRate: 0.8 })) }));
jest.mock('../../agents/agent-report', () => ({ buildAgentReport: jest.fn(() => ({ summary: ['Report line 1', 'Report line 2'] })) }));
jest.mock('../../utils/exit-handler', () => ({ captureActionError: jest.fn(() => jest.fn()) }));

describe('agentCommand', () => {
  const cmd = agentCommand();

  beforeEach(() => {
    agents.length = 0;
  });

  it('should have list, register, assign, results, merge, report subcommands', () => {
    const subcommands = cmd.commands.map(c => c.name());
    expect(subcommands).toContain('list');
    expect(subcommands).toContain('register');
    expect(subcommands).toContain('assign');
    expect(subcommands).toContain('results');
    expect(subcommands).toContain('merge');
    expect(subcommands).toContain('report');
  });

  it('list should print header', async () => {
    const { printHeader } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'list']);
    expect(printHeader).toHaveBeenCalledWith('Agentes Operacionais');
  });

  it('list --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'list', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('list --seed should populate agents', async () => {
    await cmd.parseAsync(['node', 'test', 'list', '--seed']);
    expect(agents.length).toBe(5);
  });

  it('register should add a new agent', async () => {
    const { printResult } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'register', 'TestAgent', 'planner', '--capabilities', 'test,code']);
    expect(printResult).toHaveBeenCalledWith('Agente registrado', true, expect.any(String));
  });

  it('register --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'register', 'TestAgent', 'planner', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('register without capabilities should work', async () => {
    const { printResult } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'register', 'SimpleAgent', 'validator']);
    expect(printResult).toHaveBeenCalledWith('Agente registrado', true, expect.any(String));
  });

  it('assign should coordinate tasks', async () => {
    const { printHeader } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'assign', '[{"agentId":"a1","type":"test"}]']);
    expect(printHeader).toHaveBeenCalledWith('Atribuição de Tarefas');
  });

  it('assign --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'assign', '[{"agentId":"a1","type":"test"}]', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('assign with invalid JSON should handle error', async () => {
    const { captureActionError } = require('../../utils/exit-handler');
    await cmd.parseAsync(['node', 'test', 'assign', 'not-json']);
    expect(captureActionError).toHaveBeenCalled();
  });

  it('results should show summary', async () => {
    const { printHeader } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'results']);
    expect(printHeader).toHaveBeenCalledWith('Resultados');
  });

  it('results --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'results', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('merge should consolidate results', async () => {
    const { printHeader } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'merge']);
    expect(printHeader).toHaveBeenCalledWith('Merge de Resultados');
  });

  it('merge --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'merge', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('report should build agent report', async () => {
    const { printHeader } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'report']);
    expect(printHeader).toHaveBeenCalledWith('Relatório de Agentes');
  });

  it('report --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'report', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('report --seed should populate agents', async () => {
    const { printHeader } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'report', '--seed']);
    expect(printHeader).toHaveBeenCalledWith('Relatório de Agentes');
  });
});
