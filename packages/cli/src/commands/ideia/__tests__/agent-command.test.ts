const mockRegistryList = jest.fn();
const mockRegistryRegister = jest.fn();
jest.mock('../../../agents/agent-registry', () => ({
  AgentRegistry: jest.fn(() => ({
    list: mockRegistryList,
    register: mockRegistryRegister,
  })),
}));

const mockCreateTask = jest.fn();
jest.mock('../../../agents/agent-types', () => ({
  createAgent: jest.fn(),
  createTask: mockCreateTask,
  AgentTaskResult: {},
}));

const mockCoordinateTasks = jest.fn();
jest.mock('../../../agents/agent-coordinator', () => ({
  coordinateTasks: mockCoordinateTasks,
}));

const mockBuildAgentReport = jest.fn();
jest.mock('../../../agents/agent-report', () => ({
  buildAgentReport: mockBuildAgentReport,
}));

jest.mock('../../../utils/version', () => ({
  getCliVersion: jest.fn(() => '1.0.0'),
}));

jest.mock('../../../hardening/output-contract', () => ({
  createEnvelope: jest.fn((d: unknown) => d),
}));

import { ideiaAgentCommand } from '../agent-command';

function makeAction(cmdName: string, opts: Record<string, unknown> = {}) {
  const cmd = ideiaAgentCommand();
  const sub = cmd.commands.find(c => c.name() === cmdName)!;
  (sub as any)._optionValues = opts;
  return (sub as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('agent list action', () => {
  it('lists agents', () => {
    mockRegistryList.mockReturnValue([
      { name: 'Arquiteto', role: 'planner', status: 'idle', capabilities: ['architecture'], agentId: 'a1' },
    ]);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('list')([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Arquiteto'));
    spyLog.mockRestore();
  });

  it('seeds agents when empty', () => {
    mockRegistryList.mockReturnValueOnce([]).mockReturnValueOnce([
      { name: 'Arquiteto', role: 'planner', status: 'idle', capabilities: [], agentId: 'a1' },
    ]);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('list')([]);
    expect(mockRegistryRegister).toHaveBeenCalled();
    spyLog.mockRestore();
  });
});

describe('agent status action', () => {
  it('shows agent details', () => {
    mockRegistryList.mockReturnValue([
      { name: 'Arquiteto', role: 'planner', status: 'idle', capabilities: ['architecture'], agentId: 'a1' },
    ]);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('status')(['Arquiteto']);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Arquiteto'));
    spyLog.mockRestore();
  });
});

describe('agent assign action', () => {
  it('assigns task to agent', () => {
    mockRegistryList.mockReturnValue([
      { name: 'API Builder', agentId: 'a2', role: 'generator', status: 'idle', capabilities: ['api'] },
    ]);
    mockCreateTask.mockReturnValue({ id: 'task-1' });
    mockCoordinateTasks.mockReturnValue({ assigned: ['a2'], rejected: [], results: [] });
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('assign')(['API Builder', 'Criar endpoint']);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Tarefa atribuída'));
    spyLog.mockRestore();
  });
});

describe('agent report action', () => {
  it('shows consolidated report', () => {
    mockRegistryList.mockReturnValue([{ name: 'Arquiteto', status: 'idle' }]);
    mockBuildAgentReport.mockReturnValue({ summary: ['6 agentes registrados'] });
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('report')([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Relatório de Agentes'));
    spyLog.mockRestore();
  });
});
