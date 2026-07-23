import { DEFAULT_MIRROR_CONFIG, MirrorEntry, ReplayResult } from '../local-ai/mirror/types';
import { formatReplayResult } from '../local-ai/mirror/replayer';

describe('mirror - types', () => {
  it('DEFAULT_MIRROR_CONFIG deve ter enabled=false', () => {
    expect(DEFAULT_MIRROR_CONFIG.enabled).toBe(false);
    expect(DEFAULT_MIRROR_CONFIG.privacy_mode).toBe(false);
  });

  it('deve definir MirrorEntry corretamente', () => {
    const entry: MirrorEntry = {
      seq: 1, timestamp: '2026-01-01T00:00:00.000Z', promptHash: 'abc', prompt: 'hello',
      responseHash: 'def', response: 'world', modelId: 'gpt-4', provider: 'openai',
      latencyMs: 500, tokensIn: 10, tokensOut: 20, costUsd: 0.001, command: 'chat',
      status: 'success', prevHash: '', thisHash: 'xyz',
    };
    expect(entry.seq).toBe(1);
    expect(entry.status).toBe('success');
  });
});

describe('mirror - formatReplayResult', () => {
  const makeReplayResult = (overrides: Partial<ReplayResult> = {}): ReplayResult => ({
    original: {
      seq: 1, timestamp: '', promptHash: 'a', prompt: 'hello',
      responseHash: 'b', response: 'world', modelId: 'gpt-4', provider: 'openai',
      latencyMs: 500, tokensIn: 10, tokensOut: 20, costUsd: 0.001, command: 'chat',
      status: 'success', prevHash: '', thisHash: 'c',
    },
    replay: {
      response: 'world', latencyMs: 300, tokensIn: 10, tokensOut: 20, costUsd: 0.001,
      modelId: 'gpt-4', provider: 'openai', status: 'success',
    },
    diff: { identical: true, similarityScore: 1.0, lengthDelta: 0 },
    ...overrides,
  });

  it('deve formatar resultado com sucesso', () => {
    const result = makeReplayResult();
    const output = formatReplayResult(result);
    expect(output).toContain('Replay Result');
    expect(output).toContain('gpt-4');
    expect(output).toContain('Identico');
    expect(output).toContain('100.0%');
  });

  it('deve indicar quando nao identico', () => {
    const result = makeReplayResult({ diff: { identical: false, similarityScore: 0.75, lengthDelta: 0.1 } });
    const output = formatReplayResult(result);
    expect(output).toContain('Nao');
    expect(output).toContain('75.0%');
  });

  it('deve incluir erro quando presente', () => {
    const result = makeReplayResult({ replay: { ...makeReplayResult().replay, status: 'error', error: 'timeout' } });
    const output = formatReplayResult(result);
    expect(output).toContain('Erro');
    expect(output).toContain('timeout');
  });
});

import { getApiKey, AiProvider, ProviderConfig, ProviderResponse } from '../local-ai/providers';

describe('providers - getApiKey', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('deve retornar undefined se env var nao definida', () => {
    delete process.env.OPENAI_API_KEY;
    const key = getApiKey('openai');
    expect(key).toBeUndefined();
  });

  it('deve ler env var corretamente', () => {
    process.env.OPENAI_API_KEY = 'sk-test123';
    const key = getApiKey('openai');
    expect(key).toBe('sk-test123');
  });

  it('deve converter nome com hifen para underscore', () => {
    process.env.ANTHROPIC_API_KEY = 'ant-test456';
    const key = getApiKey('anthropic');
    expect(key).toBe('ant-test456');
  });
});

import { COMPANY_ROLES, PHASE_ORDER, PHASE_ROLES, SimulationRole } from '../local-ai/simulation/types';

describe('simulation - types', () => {
  it('COMPANY_ROLES deve ter 5 cargos', () => {
    expect(COMPANY_ROLES.length).toBe(5);
    const names = COMPANY_ROLES.map(r => r.name);
    expect(names).toContain('ceo');
    expect(names).toContain('cto');
    expect(names).toContain('pm');
    expect(names).toContain('engineer');
    expect(names).toContain('qa');
  });

  it('cada role deve ter name, title, responsibilities, artifactsProduced', () => {
    for (const role of COMPANY_ROLES) {
      expect(role.name).toBeTruthy();
      expect(role.title).toBeTruthy();
      expect(role.responsibilities.length).toBeGreaterThan(0);
      expect(role.artifactsProduced.length).toBeGreaterThan(0);
    }
  });

  it('PHASE_ORDER deve ter 6 fases', () => {
    expect(PHASE_ORDER).toEqual(['requirements', 'architecture', 'implementation', 'testing', 'deployment', 'review']);
  });

  it('PHASE_ROLES deve mapear todas as fases', () => {
    for (const phase of PHASE_ORDER) {
      expect(PHASE_ROLES[phase]).toBeDefined();
      expect(PHASE_ROLES[phase].length).toBeGreaterThan(0);
    }
  });
});