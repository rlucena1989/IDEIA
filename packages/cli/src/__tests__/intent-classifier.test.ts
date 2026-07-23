import { keywordClassifier, llmClassifier, createClassifier, IntentResult } from '../intent-classifier';

describe('keywordClassifier', () => {
  it('detects create_project', () => {
    const r = keywordClassifier('criar um projeto de saas de assinaturas');
    expect(r.intent).toBe('create_project');
    expect(r.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('detects create_project in English', () => {
    expect(keywordClassifier('create a new api').intent).toBe('create_project');
  });

  it('detects fix_bug', () => {
    const r = keywordClassifier('corrigir bug no login');
    expect(r.intent).toBe('fix_bug');
  });

  it('detects deploy', () => {
    expect(keywordClassifier('fazer deploy para produção').intent).toBe('deploy');
  });

  it('detects run_tests', () => {
    expect(keywordClassifier('rodar testes unitários').intent).toBe('run_tests');
  });

  it('detects refactor', () => {
    expect(keywordClassifier('refatorar o módulo de autenticação').intent).toBe('refactor');
  });

  it('detects generate_docs', () => {
    expect(keywordClassifier('gerar documentação da api').intent).toBe('generate_docs');
  });

  it('detects configure', () => {
    expect(keywordClassifier('configurar ambiente de desenvolvimento').intent).toBe('configure');
  });

  it('detects analyze', () => {
    expect(keywordClassifier('analisar qualidade do código').intent).toBe('analyze');
  });

  it('detects check_status', () => {
    expect(keywordClassifier('verificar status do servidor').intent).toBe('check_status');
  });

  it('returns unknown for unrecognized input', () => {
    const r = keywordClassifier('qual é a capital do brasil?');
    expect(r.intent).toBe('unknown');
    expect(r.confidence).toBeLessThan(0.5);
  });

  it('extracts type from create_project', () => {
    const r = keywordClassifier('criar uma api rest');
    expect(r.entities.type).toBe('api');
  });
});

describe('llmClassifier', () => {
  it('falls back to keyword when no LLM', async () => {
    const r = await llmClassifier('criar um crud');
    expect(r.intent).toBe('create_project');
  });

  it('uses LLM when provided', async () => {
    const mockLLM = async () => '{"intent":"refactor","confidence":0.9,"entities":{"module":"auth"},"reasoning":"Clear refactoring request"}';
    const r = await llmClassifier('preciso refatorar o módulo de auth', mockLLM);
    expect(r.intent).toBe('refactor');
    expect(r.confidence).toBe(0.9);
  });

  it('falls back on LLM error', async () => {
    const failingLLM = async () => { throw new Error('API error'); };
    const r = await llmClassifier('criar um projeto', failingLLM);
    expect(r.intent).toBe('create_project');
  });
});

describe('createClassifier', () => {
  it('creates classifier without LLM', () => {
    const cls = createClassifier();
    const r = cls('deploy para staging');
    if (r instanceof Promise) {
      r.then(result => expect(result.intent).toBe('deploy'));
    } else {
      expect(r.intent).toBe('deploy');
    }
  });
});
