import { gateCommand, gateRunAction, gateStatusAction, gateCheckpointsAction } from '../gate';

jest.mock('../../utils/gate/runner');

import { runPipeline, printStatus, listAllCheckpoints } from '../../utils/gate/runner';

beforeEach(() => {
  jest.clearAllMocks();
  (runPipeline as jest.Mock).mockImplementation(() => {});
  (printStatus as jest.Mock).mockImplementation(() => {});
  (listAllCheckpoints as jest.Mock).mockReturnValue(['lint', 'test', 'build']);
});

describe('gateRunAction', () => {
  it('deve executar pipeline', () => {
    gateRunAction({});
    expect(runPipeline).toHaveBeenCalled();
  });

  it('deve passar opcoes para runPipeline', () => {
    gateRunAction({ stage: 'test', resume: true, json: true });
    expect(runPipeline).toHaveBeenCalledWith(expect.any(String), 'test', true, true);
  });
});

describe('gateStatusAction', () => {
  it('deve exibir status', () => {
    gateStatusAction({});
    expect(printStatus).toHaveBeenCalled();
  });
});

describe('gateCheckpointsAction', () => {
  it('deve listar checkpoints', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    gateCheckpointsAction();
    expect(listAllCheckpoints).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('lint'));
    logSpy.mockRestore();
  });

  it('deve exibir mensagem quando nao ha checkpoints', () => {
    (listAllCheckpoints as jest.Mock).mockReturnValue([]);
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    gateCheckpointsAction();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhum checkpoint'));
    logSpy.mockRestore();
  });
});

describe('gateCommand', () => {
  it('should be defined', () => {
    expect(gateCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = gateCommand();
    expect(cmd.name()).toBe('gate');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('run');
    expect(names).toContain('status');
    expect(names).toContain('checkpoints');
  });
});
