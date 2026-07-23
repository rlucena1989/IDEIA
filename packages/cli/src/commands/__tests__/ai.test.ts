import { aiCommand, aiConfigAction, aiSecurityCheckAction, aiRoutingAction, aiClassifyAction, aiSummarizeAction, aiModelsListAction, aiModelsPullAction, aiModelsRemoveAction } from '../ai';
import { printLine, printResult } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../io');
jest.mock('../../local-ai/config');
jest.mock('../../local-ai/routing');
jest.mock('../../local-ai/models');
jest.mock('../../local-ai/classifier');
jest.mock('../../local-ai/ollama');
jest.mock('../../local-ai/explainer');
jest.mock('../../local-ai/indexer');
jest.mock('../../local-ai/searcher');
jest.mock('../../local-ai/provider-router');
jest.mock('../../cognitive-coprocessor/integration');

import { getIO } from '../../io';
import { loadConfig, saveConfig } from '../../local-ai/config';
import { loadRouting } from '../../local-ai/routing';
import { isModelTrusted, getSecurityAdvisory } from '../../local-ai/models';

const mockFs = {
  exists: jest.fn(),
  read: jest.fn(),
  write: jest.fn(),
  readDir: jest.fn(),
  mkDir: jest.fn(),
  remove: jest.fn(),
  copy: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getIO as jest.Mock).mockReturnValue({ fs: mockFs, shell: { exec: jest.fn(), execString: jest.fn() }, http: { post: jest.fn(), get: jest.fn() } });
  (loadConfig as jest.Mock).mockReturnValue({
    provider: 'ollama',
    default_model: 'qwen2:0.5b',
    ollama: { base_url: 'http://localhost:11434' },
    offline: false,
    allow_write: false,
    timeout_secs: 30,
  });
  (saveConfig as jest.Mock).mockImplementation((_root: string, updates: Record<string, unknown>) => ({
    provider: 'ollama',
    default_model: 'qwen2:0.5b',
    ollama: { base_url: 'http://localhost:11434' },
    offline: false,
    allow_write: false,
    timeout_secs: 30,
    ...updates,
  }));
});

describe('aiConfigAction', () => {
  it('deve exibir configuracao atual quando nenhuma opcao for passada', () => {
    aiConfigAction({});
    expect(loadConfig).toHaveBeenCalled();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Provider'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('ollama'));
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it('deve atualizar provider quando --provider for passado', () => {
    aiConfigAction({ provider: 'openai' });
    expect(saveConfig).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ provider: 'openai' }));
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('atualizada'), true);
  });

  it('deve atualizar model quando --model for passado', () => {
    aiConfigAction({ model: 'llama3' });
    expect(saveConfig).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ default_model: 'llama3' }));
  });

  it('deve atualizar offline flag', () => {
    aiConfigAction({ offline: true });
    expect(saveConfig).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ offline: true }));
  });

  it('deve atualizar allowWrite flag', () => {
    aiConfigAction({ allowWrite: true });
    expect(saveConfig).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ allow_write: true }));
  });

  it('deve suportar multiplas atualizacoes em uma chamada', () => {
    aiConfigAction({ provider: 'anthropic', model: 'claude-3', offline: true });
    expect(saveConfig).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      provider: 'anthropic',
      default_model: 'claude-3',
      offline: true,
    }));
  });
});

describe('aiSecurityCheckAction', () => {
  it('deve exibir OK quando allow_write for false e offline for true', () => {
    (loadConfig as jest.Mock).mockReturnValue({
      provider: 'ollama', default_model: 'qwen2:0.5b',
      ollama: { base_url: 'http://localhost:11434' },
      offline: true, allow_write: false, timeout_secs: 30,
    });
    (isModelTrusted as jest.Mock).mockReturnValue(true);
    (getSecurityAdvisory as jest.Mock).mockReturnValue(null);

    aiSecurityCheckAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('[OK]'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('[CONFIAVEL]'));
  });

  it('deve exibir RISCO quando allow_write for true', () => {
    (loadConfig as jest.Mock).mockReturnValue({
      provider: 'ollama', default_model: 'qwen2:0.5b',
      ollama: { base_url: 'http://localhost:11434' },
      offline: false, allow_write: true, timeout_secs: 30,
    });
    (isModelTrusted as jest.Mock).mockReturnValue(false);
    (getSecurityAdvisory as jest.Mock).mockReturnValue('Modelo nao confiavel');

    aiSecurityCheckAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('[RISCO]'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('[ATENCAO]'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Modelo nao confiavel'));
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('ALERTA'), false);
  });
});

describe('aiRoutingAction', () => {
  it('deve exibir routing config com enabled flag', () => {
    (loadRouting as jest.Mock).mockReturnValue({
      classify_task: { enabled: true },
      summarize_file: { enabled: false },
    });
    aiRoutingAction();
    expect(loadRouting).toHaveBeenCalled();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('classify_task'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('ativado'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('desativado'));
  });

  it('deve exibir routing config com modelo e timeout', () => {
    (loadRouting as jest.Mock).mockReturnValue({
      classify_task: { model: 'qwen2:0.5b', allow_write: false, timeout_secs: 60 },
    });
    aiRoutingAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('classify_task'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('qwen2:0.5b'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('60s'));
  });
});

describe('aiClassifyAction', () => {
  it('deve reportar erro quando arquivo nao existe', async () => {
    mockFs.exists.mockReturnValue(false);
    await aiClassifyAction('/fake/file.md', {});
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('nao encontrado'), false);
  });
});

describe('aiSummarizeAction', () => {
  it('deve reportar erro quando arquivo nao existe', async () => {
    mockFs.exists.mockReturnValue(false);
    await aiSummarizeAction('/fake/file.md', {});
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('nao encontrado'), false);
  });
});

describe('aiModelsListAction', () => {
  it('deve exibir mensagem quando nao houver modelos', async () => {
    const { listModels } = require('../../local-ai/models');
    (listModels as jest.Mock).mockResolvedValue([]);
    await aiModelsListAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Nenhum modelo'));
  });

  it('deve listar modelos quando existirem', async () => {
    const { listModels } = require('../../local-ai/models');
    (listModels as jest.Mock).mockResolvedValue([
      { name: 'qwen2:0.5b', size: '500MB' },
      { name: 'llama3:8b', size: '4.2GB' },
    ]);
    (isModelTrusted as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(false);
    await aiModelsListAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('qwen2:0.5b'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('llama3:8b'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('[CONFIAVEL]'));
  });
});

describe('aiModelsPullAction', () => {
  it('deve reportar sucesso ao baixar modelo', async () => {
    const { pullModel } = require('../../local-ai/models');
    (pullModel as jest.Mock).mockResolvedValue(true);
    await aiModelsPullAction('qwen2:0.5b');
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('sucesso'), true);
  });

  it('deve reportar falha ao baixar modelo', async () => {
    const { pullModel } = require('../../local-ai/models');
    (pullModel as jest.Mock).mockResolvedValue(false);
    await aiModelsPullAction('qwen2:0.5b');
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('Falha'), false);
  });
});

describe('aiModelsRemoveAction', () => {
  it('deve reportar sucesso ao remover modelo', async () => {
    const { removeModel } = require('../../local-ai/models');
    (removeModel as jest.Mock).mockResolvedValue(true);
    await aiModelsRemoveAction('qwen2:0.5b');
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('removido'), true);
  });

  it('deve reportar falha ao remover modelo', async () => {
    const { removeModel } = require('../../local-ai/models');
    (removeModel as jest.Mock).mockResolvedValue(false);
    await aiModelsRemoveAction('qwen2:0.5b');
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('Falha'), false);
  });
});

describe('aiCommand', () => {
  it('should be defined', () => {
    expect(aiCommand).toBeDefined();
  });

  it('should return a Command object with subcommands', () => {
    const cmd = aiCommand();
    expect(cmd.name()).toBe('ai');
    const subcommands = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(subcommands).toContain('classify');
    expect(subcommands).toContain('summarize');
    expect(subcommands).toContain('config');
    expect(subcommands).toContain('routing');
    expect(subcommands).toContain('providers');
    expect(subcommands).toContain('models');
    expect(subcommands).toContain('security-check');
    expect(subcommands).toContain('explain');
    expect(subcommands).toContain('suggest');
    expect(subcommands).toContain('prioritize');
    expect(subcommands).toContain('index');
    expect(subcommands).toContain('search');
    expect(subcommands).toContain('similar');
  });
});
