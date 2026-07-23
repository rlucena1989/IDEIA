import path from 'node:path';
import fs from 'node:fs';

const root = process.cwd();

describe('Local AI — classifier.ts', () => {
  const classifier = require('../local-ai/classifier');

  it('tfidfClassify classifica feature', () => {
    const r = classifier.tfidfClassify('Implementar nova tela de cadastro');
    expect(r.category).toBe('feature');
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('tfidfClassify classifica bug', () => {
    const r = classifier.tfidfClassify('Corrigir erro na tela de login');
    expect(r.category).toBe('bug');
  });

  it('tfidfClassify classifica docs', () => {
    const r = classifier.tfidfClassify('Escrever documentação da API');
    expect(['docs', 'documentation']).toContain(r.category);
  });

  it('tfidfClassify classifica refactor', () => {
    const r = classifier.tfidfClassify('Refatorar módulo de pagamento');
    expect(r.category).toBe('refactor');
  });

  it('buildClassifyPrompt constrói prompt', () => {
    expect(typeof classifier.buildClassifyPrompt('texto')).toBe('string');
  });

  it('buildSummarizePrompt constrói prompt', () => {
    expect(typeof classifier.buildSummarizePrompt('file.ts', 'conteudo')).toBe('string');
  });
});

describe('Local AI — routing.ts', () => {
  const routing = require('../local-ai/routing');
  it('loadRouting carrega config', () => { expect(routing.loadRouting(root)).toBeDefined(); });
  it('getRouteFor retorna com root', () => { expect(routing.getRouteFor('classify_task', root)).toBeDefined(); });
});

describe('Local AI — config.ts', () => {
  const config = require('../local-ai/config');
  it('loadConfig carrega', () => { expect(config.loadConfig(root)).toBeDefined(); });
});

describe('Local AI — embeddings.ts', () => {
  const emb = require('../local-ai/embeddings');
  it('cosineSimilarity calcula', () => {
    expect(emb.cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1, 5);
    expect(emb.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });
});

describe('Local AI — searcher.ts', () => {
  const s = require('../local-ai/searcher');
  it('searchDocuments existe', () => { expect(typeof s.searchDocuments).toBe('function'); });
  it('findSimilarDocuments existe', () => { expect(typeof s.findSimilarDocuments).toBe('function'); });
});

describe('Local AI — indexer.ts', () => {
  const idx = require('../local-ai/indexer');
  it('buildIndex existe', () => { expect(typeof idx.buildIndex).toBe('function'); });
  it('getIndex precisa root', () => { expect(Array.isArray(idx.getIndex(root))).toBe(true); });
  it('getIndexStatus precisa root', () => { expect(idx.getIndexStatus(root)).toBeDefined(); });
});

describe('Local AI — ollama.ts', () => {
  const ollama = require('../local-ai/ollama');
  it('queryOllama existe', () => { expect(typeof ollama.queryOllama).toBe('function'); });
});

describe('Local AI — explainer.ts', () => {
  const exp = require('../local-ai/explainer');
  it('explainViolation existe', () => { expect(typeof exp.explainViolation).toBe('function'); });
  it('suggestContext existe', () => { expect(typeof exp.suggestContext).toBe('function'); });
  it('prioritizeViolations é async', async () => {
    const r = await exp.prioritizeViolations(root);
    expect(typeof r).toBe('string');
  });
});

describe('Knowledge Base', () => {
  const kb = require('../local-ai/knowledge-base');
  it('getCuratedEntries 172+', () => { expect(kb.getCuratedEntries().length).toBeGreaterThanOrEqual(172); });
  it('searchEntries busca', () => { expect(kb.searchEntries('ddd').length).toBeGreaterThan(0); });
  it('getEntry retorna', () => {
    const e = kb.getEntry('clean-architecture');
    expect(e).toBeDefined();
    expect(e!.principles!.length).toBeGreaterThan(0);
  });
  it('exportEntries cria disco', () => {
    const d = path.join(__dirname, '../../.ai-test-kb');
    kb.exportEntries(d);
    const ed = path.join(d, '.ai/knowledge/entries');
    expect(fs.existsSync(ed)).toBe(true);
    expect(fs.readdirSync(ed).length).toBeGreaterThan(0);
    try { fs.rmSync(d, { recursive: true, force: true }); } catch {}
  });
});

describe('Local AI — provider-router.ts', () => {
  const router = require('../local-ai/provider-router');
  it('getAllProviders lista', () => { expect(router.getAllProviders().length).toBeGreaterThan(0); });
  it('testLatency existe', () => { expect(typeof router.testLatency).toBe('function'); });
});

describe('Local AI — models.ts', () => {
  const models = require('../local-ai/models');
  it('listModels existe', () => { expect(typeof models.listModels).toBe('function'); });
  it('isModelTrusted avalia', () => { expect(typeof models.isModelTrusted('qwen2:0.5b')).toBe('boolean'); });
  it('getSecurityAdvisory existe', () => { expect(typeof models.getSecurityAdvisory).toBe('function'); });
});
