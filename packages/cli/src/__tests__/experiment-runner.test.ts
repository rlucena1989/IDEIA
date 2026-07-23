import { runExperiment } from '../local-ai/experiment/runner';

jest.mock('../local-ai/experiment/registry', () => ({
  findModelInRegistry: jest.fn(),
}));
jest.mock('../local-ai/provider-router', () => ({
  getProvider: jest.fn(),
}));

const mockFindModel = jest.requireMock('../local-ai/experiment/registry').findModelInRegistry;
const mockGetProvider = jest.requireMock('../local-ai/provider-router').getProvider;

const mockRegistryEntry = {
  modelId: 'gpt-4',
  provider: 'openai',
  costPer1KInput: 0.03,
  costPer1KOutput: 0.06,
};

const mockSuccessResult = {
  content: 'This is a test response with multiple words for quality scoring.',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFindModel.mockReturnValue(mockRegistryEntry);
});

describe('runExperiment', () => {
  it('deve executar modelo unico e retornar resultado de sucesso', async () => {
    mockGetProvider.mockReturnValue({
      query: jest.fn().mockResolvedValue(mockSuccessResult),
    });
    const result = await runExperiment('test prompt', [
      { modelId: 'gpt-4', provider: 'openai' },
    ], '/fake/root');
    expect(result.id).toBeDefined();
    expect(result.promptHash).toBeDefined();
    expect(result.results).toHaveLength(1);
    expect(result.results[0].status).toBe('success');
    expect(result.results[0].modelId).toBe('gpt-4');
    expect(mockFindModel).toHaveBeenCalled();
  });

  it('deve executar multiplos modelos em paralelo', async () => {
    mockGetProvider.mockReturnValue({
      query: jest.fn().mockResolvedValue(mockSuccessResult),
    });
    const result = await runExperiment('test', [
      { modelId: 'gpt-4', provider: 'openai' },
      { modelId: 'claude-3', provider: 'anthropic' },
    ], '/fake/root');
    expect(result.results).toHaveLength(2);
    expect(result.results.every(r => r.status === 'success')).toBe(true);
  });

  it('deve tratar erro de provider', async () => {
    mockGetProvider.mockReturnValue(undefined);
    const result = await runExperiment('test', [
      { modelId: 'unknown', provider: 'nonexistent' },
    ], '/fake/root');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].status).toBe('error');
    expect(result.results[0].error).toContain('nao encontrado');
  });

  it('deve tratar excecao durante consulta', async () => {
    mockGetProvider.mockReturnValue({
      query: jest.fn().mockRejectedValue(new Error('API timeout')),
    });
    const result = await runExperiment('test', [
      { modelId: 'gpt-4', provider: 'openai' },
    ], '/fake/root');
    expect(result.results[0].status).toBe('error');
    expect(result.results[0].error).toContain('API timeout');
  });

  it('deve executar em modo sequencial', async () => {
    mockGetProvider.mockReturnValue({
      query: jest.fn().mockResolvedValue(mockSuccessResult),
    });
    const result = await runExperiment('test', [
      { modelId: 'gpt-4', provider: 'openai' },
    ], '/fake/root', { parallel: false });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].status).toBe('success');
  });

  it('deve calcular custo com base no registro', async () => {
    mockGetProvider.mockReturnValue({
      query: jest.fn().mockResolvedValue(mockSuccessResult),
    });
    const result = await runExperiment('test prompt', [
      { modelId: 'gpt-4', provider: 'openai' },
    ], '/fake/root');
    expect(result.results[0].costUsd).toBeGreaterThan(0);
  });

  it('deve calcular qualityScore', async () => {
    mockGetProvider.mockReturnValue({
      query: jest.fn().mockResolvedValue(mockSuccessResult),
    });
    const result = await runExperiment('test prompt', [
      { modelId: 'gpt-4', provider: 'openai' },
    ], '/fake/root');
    expect(result.results[0].qualityScore).toBeGreaterThan(0);
    expect(result.results[0].qualityScore).toBeLessThanOrEqual(100);
  });

  it('deve rejeitar promise rejeitada corretamente', async () => {
    mockGetProvider.mockImplementation(() => {
      throw new Error('provider init failed');
    });
    const result = await runExperiment('test', [
      { modelId: 'gpt-4', provider: 'openai' },
    ], '/fake/root');
    expect(result.results[0].status).toBe('error');
  });
});
