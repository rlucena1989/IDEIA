import {
  experimentCommand,
  experimentCreateAction,
  experimentListAction,
  experimentShowAction,
  experimentReportAction,
  experimentModelsAction,
  experimentModelAddAction,
} from '../experiment';
import { printLine, printResult, finish } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../io');
jest.mock('../../local-ai/experiment/runner');
jest.mock('../../local-ai/experiment/reporter');
jest.mock('../../local-ai/experiment/storage');
jest.mock('../../local-ai/experiment/registry');

import { getIO } from '../../io';
import { runExperiment } from '../../local-ai/experiment/runner';
import {
  buildReport,
  formatReportMarkdown,
  formatReportJson,
} from '../../local-ai/experiment/reporter';
import { saveExperiment, loadExperiment, listExperiments } from '../../local-ai/experiment/storage';
import { loadModelRegistry, addModelToRegistry } from '../../local-ai/experiment/registry';

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
  (getIO as jest.Mock).mockReturnValue({
    fs: mockFs,
    shell: { exec: jest.fn(), execString: jest.fn() },
    http: { post: jest.fn(), get: jest.fn() },
  });
  (finish as jest.Mock).mockImplementation(() => {});
  (loadModelRegistry as jest.Mock).mockReturnValue([
    {
      modelId: 'qwen2:0.5b',
      provider: 'ollama',
      contextWindow: 4096,
      maxOutput: 4096,
      costPer1KInput: 0,
      costPer1KOutput: 0,
      supportsStreaming: true,
      supportsFunctions: false,
      supportsVision: false,
    },
  ]);
  (runExperiment as jest.Mock).mockResolvedValue({
    id: 'exp-001',
    results: [
      {
        status: 'success',
        modelId: 'qwen2:0.5b',
        provider: 'ollama',
        latencyMs: 100,
        costUsd: 0.001,
      },
    ],
  });
  (buildReport as jest.Mock).mockReturnValue({
    fastest: { modelId: 'qwen2:0.5b', latencyMs: 100 },
    cheapest: { modelId: 'qwen2:0.5b', costUsd: 0.001 },
    results: [
      {
        status: 'success',
        modelId: 'qwen2:0.5b',
        provider: 'ollama',
        latencyMs: 100,
        costUsd: 0.001,
      },
    ],
  });
  (listExperiments as jest.Mock).mockReturnValue([
    { id: 'exp-001', createdAt: '2024-01-01T00:00:00Z', modelCount: 1, promptHash: 'abc123' },
  ]);
  (loadExperiment as jest.Mock).mockReturnValue({
    id: 'exp-001',
    promptHash: 'abc123',
    createdAt: '2024-01-01T00:00:00Z',
    results: [
      {
        status: 'success',
        modelId: 'qwen2:0.5b',
        provider: 'ollama',
        latencyMs: 100,
        costUsd: 0.001,
        qualityScore: 85,
      },
    ],
  });
  (formatReportMarkdown as jest.Mock).mockReturnValue('# Relatorio');
  (formatReportJson as jest.Mock).mockReturnValue('{}');
});

describe('experimentCreateAction', () => {
  it('deve criar experimento com sucesso', async () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('Qual a capital do Brasil?');
    await experimentCreateAction('prompt.txt', {});
    expect(runExperiment).toHaveBeenCalled();
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('deve reportar erro se arquivo nao existe', async () => {
    mockFs.exists.mockReturnValue(false);
    await experimentCreateAction('missing.txt', {});
    expect(printResult).toHaveBeenCalledWith(
      'Erro',
      false,
      expect.stringContaining('nao encontrado'),
    );
  });

  it('deve reportar erro se prompt vazio', async () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('   ');
    await experimentCreateAction('empty.txt', {});
    expect(printResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('vazio'));
  });

  it('deve usar modelos do registry quando nao especificado', async () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.read.mockReturnValue('test prompt');
    await experimentCreateAction('prompt.txt', {});
    expect(runExperiment).toHaveBeenCalled();
  });
});

describe('experimentListAction', () => {
  it('deve listar experimentos', () => {
    experimentListAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('exp-001'));
  });

  it('deve exibir mensagem se vazio', () => {
    (listExperiments as jest.Mock).mockReturnValue([]);
    experimentListAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Nenhum experimento'));
  });
});

describe('experimentShowAction', () => {
  it('deve mostrar experimento', () => {
    experimentShowAction('exp-001');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('qwen2:0.5b'));
  });

  it('deve reportar erro se nao encontrado', () => {
    (loadExperiment as jest.Mock).mockReturnValue(null);
    experimentShowAction('invalid');
    expect(printResult).toHaveBeenCalledWith(
      'Erro',
      false,
      expect.stringContaining('nao encontrado'),
    );
  });
});

describe('experimentReportAction', () => {
  it('deve gerar relatorio JSON', () => {
    experimentReportAction('exp-001', { json: true });
    expect(formatReportJson).toHaveBeenCalled();
  });

  it('deve gerar relatorio Markdown', () => {
    experimentReportAction('exp-001', { markdown: true });
    expect(formatReportMarkdown).toHaveBeenCalled();
  });

  it('deve salvar em arquivo se output especificado', () => {
    experimentReportAction('exp-001', { json: true, output: './report.json' });
    expect(mockFs.write).toHaveBeenCalled();
  });

  it('deve reportar erro se experimento nao encontrado', () => {
    (loadExperiment as jest.Mock).mockReturnValue(null);
    experimentReportAction('invalid', {});
    expect(printResult).toHaveBeenCalledWith(
      'Erro',
      false,
      expect.stringContaining('nao encontrado'),
    );
  });
});

describe('experimentModelsAction', () => {
  it('deve listar modelos', () => {
    experimentModelsAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('qwen2:0.5b'));
  });

  it('deve exibir mensagem se vazio', () => {
    (loadModelRegistry as jest.Mock).mockReturnValue([]);
    experimentModelsAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Nenhum modelo'));
  });
});

describe('experimentModelAddAction', () => {
  it('deve adicionar modelo', () => {
    experimentModelAddAction('gpt-4o', 'openai', {});
    expect(addModelToRegistry).toHaveBeenCalled();
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('gpt-4o'), true);
  });
});

describe('experimentCommand', () => {
  it('should be defined', () => {
    expect(experimentCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = experimentCommand();
    expect(cmd.name()).toBe('experiment');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('create');
    expect(names).toContain('list');
    expect(names).toContain('show');
    expect(names).toContain('report');
    expect(names).toContain('models');
    expect(names).toContain('model-add');
  });
});
