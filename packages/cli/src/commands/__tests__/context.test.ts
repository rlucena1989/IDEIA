import { contextCommand, contextListAction, contextActiveAction, contextPriorityAction, contextMergeAction, contextReportAction, contextShowAction, contextPromoteAction, contextDemoteAction } from '../context';
import { printHeader, printLine, printResult } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../utils/version');
jest.mock('../../context/context-resolver');
jest.mock('../../context/context-prioritizer');
jest.mock('../../context/context-merge');
jest.mock('../../context/context-publisher');
jest.mock('../../context/context-report');
jest.mock('../../hardening/output-contract');

var registryMock: { list: jest.Mock; get: jest.Mock; register: jest.Mock; createAndRegister: jest.Mock };
jest.mock('../../context/context-registry', () => {
  registryMock = { list: jest.fn(), get: jest.fn(), register: jest.fn(), createAndRegister: jest.fn() };
  return { ContextRegistry: jest.fn(() => registryMock) };
});

import { resolveActiveContext } from '../../context/context-resolver';
import { prioritizeContexts } from '../../context/context-prioritizer';
import { mergeContexts } from '../../context/context-merge';
import { buildContextReport } from '../../context/context-report';
import { createEnvelope } from '../../hardening/output-contract';
import { getCliVersion } from '../../utils/version';

const mockCtx = (overrides = {}) => ({
  contextId: 'ctx-001', name: 'Test Context', type: 'product', source: 'CLI',
  priority: 10, status: 'active', tags: ['core'], summary: 'Test',
  dependencies: [], createdAt: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  (getCliVersion as jest.Mock).mockReturnValue('1.0.0');
  (createEnvelope as jest.Mock).mockImplementation((data: unknown) => data);

  registryMock.list.mockReturnValue([mockCtx()]);
  registryMock.get.mockReturnValue(mockCtx());

  (resolveActiveContext as jest.Mock).mockReturnValue(mockCtx());
  (prioritizeContexts as jest.Mock).mockReturnValue([{ name: 'Test Context', score: 10, reason: 'Alta prioridade' }]);
  (mergeContexts as jest.Mock).mockReturnValue({
    sources: [{ id: 'ctx-001' }],
    fields: { name: { value: 'Merged', sourceContextId: 'ctx-001' } },
  });
  (buildContextReport as jest.Mock).mockReturnValue({
    summary: ['Relatorio gerado'], totalContexts: 1, activeCount: 1, blockedCount: 0,
  });
});

describe('contextListAction', () => {
  it('deve listar contextos sem seed', () => {
    contextListAction({});
    expect(registryMock.list).toHaveBeenCalled();
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Contextos'));
  });

  it('deve listar contextos com seed', () => {
    contextListAction({ seed: true });
    expect(registryMock.createAndRegister).toHaveBeenCalled();
  });

  it('deve retornar JSON quando solicitado', () => {
    contextListAction({ json: true });
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });
});

describe('contextActiveAction', () => {
  it('deve resolver contexto ativo', () => {
    contextActiveAction({});
    expect(resolveActiveContext).toHaveBeenCalled();
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Contexto Ativo'));
  });

  it('deve exibir mensagem quando nao houver ativo', () => {
    (resolveActiveContext as jest.Mock).mockReturnValue(null);
    contextActiveAction({});
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Nenhum contexto ativo'));
  });
});

describe('contextPriorityAction', () => {
  it('deve exibir ranking de prioridade', () => {
    contextPriorityAction({});
    expect(prioritizeContexts).toHaveBeenCalled();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Test Context'));
  });
});

describe('contextMergeAction', () => {
  it('deve fazer merge de contextos', () => {
    contextMergeAction({});
    expect(mergeContexts).toHaveBeenCalled();
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Merge'));
  });
});

describe('contextReportAction', () => {
  it('deve gerar relatorio', () => {
    contextReportAction({});
    expect(buildContextReport).toHaveBeenCalled();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('1'));
  });
});

describe('contextShowAction', () => {
  it('deve exibir detalhes do contexto', () => {
    contextShowAction('ctx-001', {});
    expect(registryMock.get).toHaveBeenCalledWith('ctx-001');
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Test Context'));
  });

  it('deve retornar JSON quando solicitado', () => {
    contextShowAction('ctx-001', { json: true });
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });
});

describe('contextPromoteAction', () => {
  it('deve promover contexto', () => {
    registryMock.get.mockReturnValue(mockCtx({ priority: 5 }));
    contextPromoteAction('ctx-001', { by: '3' });
    expect(registryMock.register).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 8 })
    );
    expect(printResult).toHaveBeenCalledWith('Promovido', true, expect.any(String));
  });
});

describe('contextDemoteAction', () => {
  it('deve rebaixar contexto', () => {
    registryMock.get.mockReturnValue(mockCtx({ priority: 10 }));
    contextDemoteAction('ctx-001', { by: '4' });
    expect(registryMock.register).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 6 })
    );
    expect(printResult).toHaveBeenCalledWith('Rebaixado', true, expect.any(String));
  });

  it('nao deve permitir prioridade negativa', () => {
    registryMock.get.mockReturnValue(mockCtx({ priority: 2 }));
    contextDemoteAction('ctx-001', { by: '10' });
    expect(registryMock.register).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 0 })
    );
  });
});

describe('contextCommand', () => {
  it('should be defined', () => {
    expect(contextCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = contextCommand();
    expect(cmd.name()).toBe('context');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(expect.arrayContaining(['list', 'active', 'priority', 'merge', 'report', 'show', 'promote', 'demote']));
  });
});
