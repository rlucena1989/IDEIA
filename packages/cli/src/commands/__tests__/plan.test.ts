import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockCreateTaskSpec = jest.fn();
const mockInferTaskType = jest.fn();
const mockValidateTaskSpec = jest.fn();
const mockCreateExecutionPlan = jest.fn();
const mockRouteCommands = jest.fn();
const mockIsCommandAllowed = jest.fn();
const mockValidateTaskContext = jest.fn();
const mockValidateTaskScope = jest.fn();
const mockValidateDependencies = jest.fn();
const mockValidateExecutionMode = jest.fn();

jest.mock('../../planner/task-spec', () => ({ createTaskSpec: (...args: unknown[]) => mockCreateTaskSpec(...args), inferTaskType: (...args: unknown[]) => mockInferTaskType(...args), validateTaskSpec: (...args: unknown[]) => mockValidateTaskSpec(...args) }));
jest.mock('../../planner/execution-plan', () => ({ createExecutionPlan: (...args: unknown[]) => mockCreateExecutionPlan(...args) }));
jest.mock('../../planner/command-router', () => ({ routeCommands: (...args: unknown[]) => mockRouteCommands(...args), isCommandAllowed: (...args: unknown[]) => mockIsCommandAllowed(...args) }));
jest.mock('../../planner/task-validator', () => ({ validateTaskContext: (...args: unknown[]) => mockValidateTaskContext(...args), validateTaskScope: (...args: unknown[]) => mockValidateTaskScope(...args), validateDependencies: (...args: unknown[]) => mockValidateDependencies(...args), validateExecutionMode: (...args: unknown[]) => mockValidateExecutionMode(...args) }));

function getCmd() {
  let cmd: ReturnType<ReturnType<typeof Object>>;
  jest.isolateModules(() => {
    const mod = require('../plan');
    cmd = mod.planCommand();
  });
  return cmd!;
}

describe('planCommand', () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreateTaskSpec.mockReturnValue({ id: 'plan-123', title: 'Test Plan', description: 'test', taskType: 'implementation', sourceDocument: '.ai/tasks/current-task.md', riskLevel: 'medium', requiresApproval: false, context: ['test'], expectedOutputs: [] });
    mockInferTaskType.mockReturnValue('implementation');
    mockValidateTaskSpec.mockReturnValue({ valid: true, reasons: [] });
    mockCreateExecutionPlan.mockReturnValue({ steps: [{ id: 'step1', title: 'Step 1', description: 'Do something' }], blocked: false, reason: '', successCriteria: ['c1'], checkpoints: ['cp1'] });
    mockRouteCommands.mockReturnValue(['cmd1', 'cmd2']);
    mockIsCommandAllowed.mockReturnValue(true);
    mockValidateTaskContext.mockReturnValue({ valid: true, reasons: [] });
    mockValidateTaskScope.mockReturnValue({ valid: true, reasons: [] });
    mockValidateDependencies.mockReturnValue({ valid: true, reasons: [] });
    mockValidateExecutionMode.mockReturnValue({ valid: true, reasons: [] });
  });

  afterEach(() => { logSpy.mockRestore(); });

  it('returns command named plan', () => { expect(getCmd().name()).toBe('plan'); });

  it('has subcommands create, validate, status', () => {
    const names = getCmd().commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(['create', 'validate', 'status']);
  });

  it('create subcommand validates spec and prints plan', () => {
    const cmd = getCmd();
    const create = cmd.commands.find((c: { name: () => string }) => c.name() === 'create')!;
    create._actionHandler(['implement feature X']);
    expect(mockCreateTaskSpec).toHaveBeenCalled();
    expect(mockValidateTaskSpec).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Plano criado'));
  });

  it('create subcommand prints failure when validation fails', () => {
    mockValidateTaskSpec.mockReturnValue({ valid: false, reasons: ['Missing field'] });
    const cmd = getCmd();
    const create = cmd.commands.find((c: { name: () => string }) => c.name() === 'create')!;
    create._actionHandler(['bad plan']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('validation failed'));
  });

  it('create subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const create = cmd.commands.find((c: { name: () => string }) => c.name() === 'create')!;
    create.setOptionValue('json', true);
    create._actionHandler(['feature X']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"spec"'));
  });

  it('create subcommand shows blocked plan message', () => {
    mockCreateExecutionPlan.mockReturnValue({ steps: [], blocked: true, reason: 'Dependency missing', successCriteria: [], checkpoints: [] });
    const cmd = getCmd();
    const create = cmd.commands.find((c: { name: () => string }) => c.name() === 'create')!;
    create._actionHandler(['blocked task']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Plano bloqueado'));
  });

  it('create subcommand uses provided options', () => {
    const cmd = getCmd();
    const create = cmd.commands.find((c: { name: () => string }) => c.name() === 'create')!;
    create.setOptionValue('id', 'my-id');
    create.setOptionValue('title', 'My Title');
    create.setOptionValue('source', 'custom.md');
    create.setOptionValue('risk', 'high');
    create._actionHandler(['critical task']);
    expect(mockCreateTaskSpec).toHaveBeenCalledWith(expect.objectContaining({ id: 'my-id', title: 'My Title', sourceDocument: 'custom.md', riskLevel: 'high' }));
  });

  it('create subcommand marks blocked commands with icon', () => {
    mockIsCommandAllowed.mockReturnValue(false);
    const cmd = getCmd();
    const create = cmd.commands.find((c: { name: () => string }) => c.name() === 'create')!;
    create._actionHandler(['task']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('⛔'));
  });

  it('validate subcommand prints no active task when _activeTaskSpec is null', () => {
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhuma tarefa ativa'));
  });

  it('validate subcommand validates after create sets active task', () => {
    const cmd = getCmd();
    const create = cmd.commands.find((c: { name: () => string }) => c.name() === 'create')!;
    create._actionHandler(['test']);
    jest.clearAllMocks();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate._actionHandler([]);
    expect(mockValidateTaskContext).toHaveBeenCalled();
    expect(mockValidateTaskScope).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Válido'));
  });

  it('validate subcommand shows invalid status with reasons', () => {
    mockValidateTaskContext.mockReturnValue({ valid: false, reasons: ['Missing context'] });
    const cmd = getCmd();
    const create = cmd.commands.find((c: { name: () => string }) => c.name() === 'create')!;
    create._actionHandler(['test']);
    jest.clearAllMocks();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Inválido'));
  });

  it('validate subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const create = cmd.commands.find((c: { name: () => string }) => c.name() === 'create')!;
    create._actionHandler(['test']);
    jest.clearAllMocks();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate.setOptionValue('json', true);
    validate._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"context"'));
  });

  it('status subcommand prints no active plan when null', () => {
    const cmd = getCmd();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    status._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhum plano ativo'));
  });

  it('status subcommand shows plan details after create', () => {
    const cmd = getCmd();
    const create = cmd.commands.find((c: { name: () => string }) => c.name() === 'create')!;
    create._actionHandler(['test']);
    jest.clearAllMocks();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    status._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Status do plano ativo'));
  });

  it('status subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const create = cmd.commands.find((c: { name: () => string }) => c.name() === 'create')!;
    create._actionHandler(['test']);
    jest.clearAllMocks();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    status.setOptionValue('json', true);
    status._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"spec"'));
  });
});
