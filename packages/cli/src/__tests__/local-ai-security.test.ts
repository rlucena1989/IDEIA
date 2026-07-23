import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

jest.mock('../local-ai/classifier', () => ({
  hashPrompt: jest.fn(() => 'mockhash'),
}));
jest.mock('../local-ai/mirror/recorder', () => ({
  recordCall: jest.fn(() => Promise.resolve()),
}));
jest.mock('../local-ai/embeddings', () => ({
  normalizeVector: (v: number[]) => {
    const n = Math.sqrt(v.reduce((a: number, b: number) => a + b * b, 0)) || 1;
    return v.map((x) => x / n);
  },
  cosineSimilarityDense: (a: number[], b: number[]) => {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    const na = Math.sqrt(a.reduce((s: number, x: number) => s + x * x, 0)) || 1;
    const nb = Math.sqrt(b.reduce((s: number, x: number) => s + x * x, 0)) || 1;
    return dot / (na * nb);
  },
  generateNeuralEmbedding: jest.fn(),
  generateBatchEmbeddings: jest.fn(),
}));
jest.mock('../local-ai/chunker', () => ({
  chunkDirectory: jest.fn(),
  setChunkerConfig: jest.fn((c: unknown) => c),
}));
jest.mock('../local-ai/indexer', () => ({
  getIndex: jest.fn(),
  getIndexStatus: jest.fn(),
}));
jest.mock('../local-ai/searcher', () => ({
  searchDocuments: jest.fn(),
}));
jest.mock('../commands/agents', () => ({
  listAgents: jest.fn(),
  getAgent: jest.fn(),
}));

import { queryOllama } from '../local-ai/ollama';
import { ingestDirectory, search, buildRagPrompt, getRagStats } from '../local-ai/rag';
import {
  loadVectors,
  saveVectors,
  addVectorDocs,
  searchVectors,
  clearVectors,
  getVectorStats,
  DenseVectorDoc,
} from '../local-ai/vector-store';
import { saveSession, loadSession, listSessions, startCollaboration } from '../local-ai/collaboration';
import { getCuratedEntries, searchEntries, getEntry, exportEntries } from '../local-ai/knowledge-base';
import { classifySeverity, createBaseline, loadBaseline, detectDowngrades } from '../security/baseline';
import { logDowngradeAttempt, evaluateFindings, loadDowngradeLogs } from '../security/detector';
import { loadRules, saveRules, checkBarriers, addRule } from '../utils/security/barrier';

const embeddingsMock = require('../local-ai/embeddings');
const chunkerMock = require('../local-ai/chunker');
const indexerMock = require('../local-ai/indexer');
const searcherMock = require('../local-ai/searcher');
const agentsMock = require('../commands/agents');

function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
function rmDir(d: string): void {
  try {
    fs.rmSync(d, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
function doc(id: string, vector: number[]): DenseVectorDoc {
  return {
    id,
    path: `${id}.ts`,
    content: `content of ${id}`,
    chunkIndex: 0,
    totalChunks: 1,
    startOffset: 0,
    endOffset: 10,
    vector,
    model: 'test',
    dimensions: vector.length,
    indexedAt: '2024-01-01',
    mtimeMs: 0,
    fileSize: 10,
    fileHash: 'abc123',
    category: 'source',
  };
}

// ============================================================
// ollama.ts
// ============================================================
describe('ollama queryOllama', () => {
  let dir: string;
  const originalFetch = (global as any).fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    dir = tmpDir('ollama-');
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });
  afterEach(() => {
    (global as any).fetch = originalFetch;
    rmDir(dir);
  });

  it('deve retornar resposta em caso de sucesso', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, statusText: 'OK', json: async () => ({ response: ' resposta ', eval_count: 3 }) });
    const out = await queryOllama('hi', 'm', dir, 'route', 1000);
    expect(out).toBe('resposta');
    expect(fs.existsSync(path.join(dir, '.ai', 'reports', 'local-ai', 'inferences.jsonl'))).toBe(true);
  });

  it('deve lancar erro quando HTTP nao ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, statusText: 'ERR' });
    await expect(queryOllama('hi', 'm', dir, 'route', 1000)).rejects.toThrow('ollama HTTP 500');
    const log = fs.readFileSync(path.join(dir, '.ai', 'reports', 'local-ai', 'inferences.jsonl'), 'utf8');
    expect(log).toContain('"success":false');
  });

  it('deve lancar erro quando offline (fetch rejeita)', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(queryOllama('hi', 'm', dir, 'route', 1000)).rejects.toThrow('ECONNREFUSED');
  });

  it('deve tratar abort/timeout como erro', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(queryOllama('hi', 'm', dir, 'route', 1000)).rejects.toThrow('aborted');
  });

  it('deve registrar tokens e duration no log de sucesso', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, statusText: 'OK', json: async () => ({ response: 'out', eval_count: 42 }) });
    await queryOllama('prompt text', 'm', dir, 'route', 1000);
    const log = fs.readFileSync(path.join(dir, '.ai', 'reports', 'local-ai', 'inferences.jsonl'), 'utf8').trim();
    const entry = JSON.parse(log);
    expect(entry.tokens).toBe(42);
    expect(entry.success).toBe(true);
    expect(entry.route).toBe('route');
  });
});

// ============================================================
// rag.ts
// ============================================================
describe('rag pipeline', () => {
  let dir: string;

  beforeEach(() => {
    dir = tmpDir('rag-');
    chunkerMock.chunkDirectory.mockReset();
    embeddingsMock.generateNeuralEmbedding.mockReset();
    embeddingsMock.generateBatchEmbeddings.mockReset();
    indexerMock.getIndex.mockReset();
    indexerMock.getIndexStatus.mockReset();
    searcherMock.searchDocuments.mockReset();
  });
  afterEach(() => rmDir(dir));

  it('ingestDirectory deve indexar chunks via embeddings', async () => {
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    chunkerMock.chunkDirectory.mockReturnValue([
      { id: 'c1', path: 'docs/a.ts', content: 'hello', index: 0, totalChunks: 1, startOffset: 0, endOffset: 5 },
    ]);
    embeddingsMock.generateBatchEmbeddings.mockResolvedValue([{ vector: [1, 0], dimensions: 2 }]);

    const r = await ingestDirectory(dir, ['docs']);
    expect(r.filesProcessed).toBe(1);
    expect(r.chunksIndexed).toBe(1);
    expect(r.errors).toBe(0);
    expect(fs.existsSync(path.join(dir, '.ai', 'local-ai', 'rag', 'vectors.json'))).toBe(true);
  });

  it('ingestDirectory deve pular diretorios inexistentes', async () => {
    const r = await ingestDirectory(dir, ['nope']);
    expect(r.filesProcessed).toBe(0);
    expect(r.chunksIndexed).toBe(0);
  });

  it('ingestDirectory deve continuar quando nao ha chunks', async () => {
    fs.mkdirSync(path.join(dir, 'empty'), { recursive: true });
    chunkerMock.chunkDirectory.mockReturnValue([]);
    const r = await ingestDirectory(dir, ['empty']);
    expect(r.chunksIndexed).toBe(0);
  });

  it('ingestDirectory deve contar erro quando embeddings falham', async () => {
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    chunkerMock.chunkDirectory.mockReturnValue([{ id: 'c1', path: 'a.ts', content: 'x', index: 0, totalChunks: 1, startOffset: 0, endOffset: 1 }]);
    embeddingsMock.generateBatchEmbeddings.mockRejectedValue(new Error('boom'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await ingestDirectory(dir, ['docs']);
    expect(r.errors).toBe(1);
    errSpy.mockRestore();
  });

  it('search deve retornar resultados com contexto', async () => {
    addVectorDocs(dir, [doc('a', [1, 0])]);
    embeddingsMock.generateNeuralEmbedding.mockResolvedValue({ vector: [1, 0], dimensions: 2 });
    const results = await search(dir, 'query');
    expect(results.length).toBe(1);
    expect(results[0].doc.id).toBe('a');
    expect(results[0].context).toContain('a.ts');
  });

  it('search deve usar fallback quando embedding falha', async () => {
    embeddingsMock.generateNeuralEmbedding.mockRejectedValue(new Error('no model'));
    indexerMock.getIndex.mockReturnValue([{ path: 'b.ts', chunk: 'chunk b', score: 0.5 }]);
    searcherMock.searchDocuments.mockReturnValue([{ path: 'b.ts', chunk: 'chunk b', score: 0.9 }]);
    const results = await search(dir, 'query');
    expect(results.length).toBe(1);
    expect(results[0].doc.model).toBe('tfidf-fallback');
  });

  it('buildRagPrompt deve montar prompt com contexto e pergunta', () => {
    const testDoc = doc('a', []);
    const prompt = buildRagPrompt('What is X?', [{ doc: testDoc, score: 1, context: 'ctx', citation: { filePath: 'a.ts', fileName: 'a.ts', chunkIndex: 0, totalChunks: 1, snippet: 'ctx', relevanceScore: 1, source: 'hybrid', indexedAt: '2024-01-01' } }]);
    expect(prompt).toContain('[a.ts:1]');
    expect(prompt).toContain('What is X?');
    expect(prompt).toContain('ctx');
  });

  it('getRagStats deve combinar dense e tfidf', () => {
    addVectorDocs(dir, [doc('a', [1, 0])]);
    indexerMock.getIndexStatus.mockReturnValue({ total: 0, fileCount: 5 });
    const stats = getRagStats(dir);
    expect(stats.dense.total).toBe(1);
    expect(stats.tfidf.fileCount).toBe(5);
  });
});

// ============================================================
// vector-store.ts
// ============================================================
describe('vector-store', () => {
  let dir: string;
  beforeEach(() => {
    dir = tmpDir('vs-');
  });
  afterEach(() => rmDir(dir));

  it('loadVectors deve retornar vazio quando arquivo ausente', () => {
    expect(loadVectors(dir)).toEqual([]);
  });

  it('saveVectors e loadVectors devem fazer roundtrip', () => {
    saveVectors(dir, [doc('a', [1, 0])]);
    const loaded = loadVectors(dir);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('a');
  });

  it('addVectorDocs deve evitar duplicatas por id', () => {
    addVectorDocs(dir, [doc('a', [1, 0])]);
    addVectorDocs(dir, [doc('a', [0, 1])]);
    expect(loadVectors(dir)).toHaveLength(1);
  });

  it('searchVectors deve ordenar por score decrescente', () => {
    addVectorDocs(dir, [doc('a', [1, 0]), doc('b', [0, 1])]);
    const results = searchVectors(dir, [1, 0], 10, 0);
    expect(results[0].doc.id).toBe('a');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('searchVectors deve respeitar minScore', () => {
    addVectorDocs(dir, [doc('a', [1, 0]), doc('b', [0, 1])]);
    const results = searchVectors(dir, [1, 0], 10, 0.99);
    expect(results.every((r) => r.score >= 0.99)).toBe(true);
  });

  it('clearVectors deve remover o arquivo', () => {
    saveVectors(dir, [doc('a', [1])]);
    clearVectors(dir);
    expect(fs.existsSync(path.join(dir, '.ai', 'local-ai', 'rag', 'vectors.json'))).toBe(false);
  });

  it('getVectorStats deve retornar zero quando vazio', () => {
    const s = getVectorStats(dir);
    expect(s).toEqual({ total: 0, dimensions: 0, model: 'none' });
  });

  it('getVectorStats deve retornar stats do primeiro doc', () => {
    addVectorDocs(dir, [doc('a', [1, 0, 0])]);
    const s = getVectorStats(dir);
    expect(s.total).toBe(1);
    expect(s.dimensions).toBe(3);
    expect(s.model).toBe('test');
  });
});

// ============================================================
// collaboration.ts
// ============================================================
describe('collaboration', () => {
  let dir: string;
  const originalFetch = (global as any).fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    dir = tmpDir('collab-');
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    jest.clearAllMocks();
  });
  afterEach(() => {
    (global as any).fetch = originalFetch;
    rmDir(dir);
  });

  it('saveSession e loadSession devem fazer roundtrip', () => {
    const session = { id: 's1', task: 't', status: 'planning' as const, agents: [], messages: [], createdAt: '2024' };
    saveSession(dir, session);
    const loaded = loadSession(dir, 's1');
    expect(loaded).not.toBeNull();
    expect(loaded!.task).toBe('t');
  });

  it('loadSession deve retornar null quando inexistente', () => {
    expect(loadSession(dir, 'nope')).toBeNull();
  });

  it('listSessions deve retornar vazio sem indice', () => {
    expect(listSessions(dir)).toEqual([]);
  });

  it('listSessions deve listar sessoes salvas', () => {
    saveSession(dir, { id: 's1', task: 'a', status: 'planning', agents: [], messages: [], createdAt: '2024' });
    saveSession(dir, { id: 's2', task: 'b', status: 'completed', agents: [], messages: [], createdAt: '2024' });
    const list = listSessions(dir);
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('s2');
  });

  it('startCollaboration deve executar plano e concluir', async () => {
    agentsMock.listAgents.mockReturnValue([
      { name: 'planner', description: 'p', can_write: false, read_paths: [], write_paths: [] },
      { name: 'reviewer', description: 'r', can_write: false, read_paths: [], write_paths: [] },
      { name: 'engineer', description: 'e', can_write: true, read_paths: [], write_paths: [] },
    ]);
    agentsMock.getAgent.mockImplementation((n: string) => (n === 'planner' || n === 'reviewer' || n === 'engineer' ? { name: n, description: n, can_write: true, read_paths: [], write_paths: [] } : undefined));
    fetchMock.mockImplementation((_url: string, opts: any) => {
      const body = JSON.parse(opts.body);
      if (body.prompt.includes('Planner')) {
        return Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: async () => ({ response: 'STEP: build feature | AGENT: engineer | DEPENDS-ON: none' }) });
      }
      return Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: async () => ({ response: 'done' }) });
    });

    const session = await startCollaboration(dir, 'build a feature', { timeoutPerAgent: 1000 });
    expect(session.status).toBe('completed');
    expect(session.agents).toContain('planner');
    expect(session.agents).toContain('engineer');
    expect(session.result).toContain('build feature');
  });

  it('startCollaboration deve usar simulacao quando ollama falha', async () => {
    agentsMock.listAgents.mockReturnValue([{ name: 'planner', description: 'p', can_write: false, read_paths: [], write_paths: [] }]);
    agentsMock.getAgent.mockImplementation((n: string) => ({ name: n, description: n, can_write: false, read_paths: [], write_paths: [] }));
    fetchMock.mockRejectedValue(new Error('offline'));

    const session = await startCollaboration(dir, 'tarefa', { timeoutPerAgent: 1000 });
    expect(session.status).toBe('completed');
    expect(session.messages.length).toBeGreaterThan(0);
  });

  it('startCollaboration deve pular passo quando dependencia nao atendida', async () => {
    agentsMock.listAgents.mockReturnValue([{ name: 'planner', description: 'p', can_write: false, read_paths: [], write_paths: [] }, { name: 'reviewer', description: 'r', can_write: false, read_paths: [], write_paths: [] }]);
    agentsMock.getAgent.mockImplementation((n: string) => ({ name: n, description: n, can_write: false, read_paths: [], write_paths: [] }));
    fetchMock.mockImplementation((_url: string, opts: any) => {
      const body = JSON.parse(opts.body);
      if (body.prompt.includes('Planner')) {
        return Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: async () => ({ response: 'STEP: first | AGENT: engineer | DEPENDS-ON: none\nSTEP: second | AGENT: engineer | DEPENDS-ON: 99' }) });
      }
      return Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: async () => ({ response: 'ok' }) });
    });

    const session = await startCollaboration(dir, 'task', { timeoutPerAgent: 1000 });
    expect(session.status).toBe('completed');
  });
});

// ============================================================
// knowledge-base.ts
// ============================================================
describe('knowledge-base', () => {
  it('getCuratedEntries deve retornar lista nao vazia', () => {
    expect(getCuratedEntries().length).toBeGreaterThan(10);
  });

  it('getEntry deve retornar entrada conhecida', () => {
    const e = getEntry('clean-architecture');
    expect(e).toBeDefined();
    expect(e!.category).toBe('architecture');
  });

  it('getEntry deve retornar undefined para id inexistente', () => {
    expect(getEntry('nao-existe')).toBeUndefined();
  });

  it('searchEntries deve filtrar por titulo', () => {
    const results = searchEntries('clean');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((e) => e.id === 'clean-architecture')).toBe(true);
  });

  it('searchEntries deve filtrar por tag', () => {
    const results = searchEntries('ddd');
    expect(results.some((e) => e.id === 'domain-driven-design')).toBe(true);
  });

  it('searchEntries deve limitar a 20 resultados', () => {
    const big = Array.from({ length: 30 }, (_, i) => ({ id: `e${i}`, title: 'match', category: 'c', tags: [], summary: '', content: '' }));
    expect(searchEntries('match', big)).toHaveLength(20);
  });

  it('exportEntries deve escrever arquivos yaml por entrada', () => {
    const dir = tmpDir('kb-');
    try {
      exportEntries(dir);
      expect(fs.existsSync(path.join(dir, '.ai', 'knowledge', 'entries', 'clean-architecture.yaml'))).toBe(true);
    } finally {
      rmDir(dir);
    }
  });
});

// ============================================================
// security/baseline.ts
// ============================================================
describe('security baseline', () => {
  it('classifySeverity deve classificar critical para senha/secret', () => {
    expect(classifySeverity('Nunca commitar senhas')).toBe('critical');
    expect(classifySeverity('proteger credentials')).toBe('critical');
  });

  it('classifySeverity deve classificar high para security/block', () => {
    expect(classifySeverity('regra de seguranca')).toBe('high');
    expect(classifySeverity('block list')).toBe('high');
  });

  it('classifySeverity deve classificar medium para test/coverage', () => {
    expect(classifySeverity('manter coverage alta')).toBe('medium');
    expect(classifySeverity('validar input')).toBe('medium');
  });

  it('classifySeverity deve classificar low para outros', () => {
    expect(classifySeverity('use nomes claros')).toBe('low');
  });

  it('createBaseline deve extrair regras de laws.yaml', () => {
    const dir = tmpDir('bl-');
    try {
      fs.mkdirSync(path.join(dir, '.ai'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.ai', 'laws.yaml'), 'rules:\n  - "Regra de senha"\n  - "Regra comum"');
      const entries = createBaseline(dir);
      expect(entries.length).toBe(1);
      expect(entries[0].file).toBe('.ai/laws.yaml');
      expect(fs.existsSync(path.join(dir, '.ai', 'security', 'baseline.json'))).toBe(true);
    } finally {
      rmDir(dir);
    }
  });

  it('createBaseline deve extrair regras de policy .md', () => {
    const dir = tmpDir('bl-');
    try {
      fs.mkdirSync(path.join(dir, '.ai', 'policies'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.ai', 'policies', 'command-policy.md'), '# Policy\n- Regra um\n- Regra dois\n');
      const entries = createBaseline(dir);
      expect(entries.some((e) => e.file.endsWith('command-policy.md'))).toBe(true);
    } finally {
      rmDir(dir);
    }
  });

  it('createBaseline deve retornar vazio sem arquivos', () => {
    const dir = tmpDir('bl-');
    try {
      expect(createBaseline(dir)).toEqual([]);
    } finally {
      rmDir(dir);
    }
  });

  it('loadBaseline deve retornar baseline salva', () => {
    const dir = tmpDir('bl-');
    try {
      fs.mkdirSync(path.join(dir, '.ai', 'security'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.ai', 'security', 'baseline.json'), JSON.stringify([{ file: 'f', rules: [] }]));
      expect(loadBaseline(dir)).toHaveLength(1);
    } finally {
      rmDir(dir);
    }
  });

  it('loadBaseline deve retornar vazio quando ausente', () => {
    const dir = tmpDir('bl-');
    try {
      expect(loadBaseline(dir)).toEqual([]);
    } finally {
      rmDir(dir);
    }
  });

  it('detectDowngrades deve reportar regras removidas', () => {
    const baseline = [{ file: 'f', rules: [{ text: 'r1', severity: 'critical' }, { text: 'r2', severity: 'low' }] }];
    const current = [{ file: 'f', rules: [{ text: 'r2', severity: 'low' }] }];
    const findings = detectDowngrades(baseline as any, current as any);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('r1');
    expect(findings[0].action).toBe('removed');
  });

  it('detectDowngrades deve reportar todas as regras quando arquivo removido', () => {
    const baseline = [{ file: 'f', rules: [{ text: 'r1', severity: 'low' }] }];
    const findings = detectDowngrades(baseline as any, []);
    expect(findings).toHaveLength(1);
    expect(findings[0].action).toBe('removed');
  });
});

// ============================================================
// security/detector.ts
// ============================================================
describe('security detector', () => {
  it('evaluateFindings deve reportar baseline intacta sem findings', () => {
    const r = evaluateFindings([], false);
    expect(r.blocked).toBe(false);
    expect(r.criticalCount).toBe(0);
    expect(r.message).toContain('Nenhum downgrade');
  });

  it('evaluateFindings deve bloquear regras criticas sem force', () => {
    const findings = [{ file: 'f', rule: 'r', severity: 'critical', action: 'removed' }];
    const r = evaluateFindings(findings as any, false);
    expect(r.blocked).toBe(true);
    expect(r.criticalCount).toBe(1);
    expect(r.message).toContain('BLOQUEADO');
  });

  it('evaluateFindings deve permitir com --force e reason', () => {
    const findings = [{ file: 'f', rule: 'r', severity: 'critical', action: 'removed' }];
    const r = evaluateFindings(findings as any, true, 'urgente');
    expect(r.blocked).toBe(false);
    expect(r.message).toContain('BYPASS');
    expect(r.message).toContain('urgente');
  });

  it('evaluateFindings deve warn regras nao-criticas', () => {
    const findings = [{ file: 'f', rule: 'r', severity: 'low', action: 'removed' }];
    const r = evaluateFindings(findings as any, false);
    expect(r.blocked).toBe(false);
    expect(r.message).toContain('ATENCAO');
  });

  it('logDowngradeAttempt deve registrar entrada jsonl', () => {
    const dir = tmpDir('det-');
    try {
      logDowngradeAttempt(dir, { file: 'f', rule: 'r', severity: 'critical', action: 'removed' }, 'motivo');
      const logs = loadDowngradeLogs(dir);
      expect(logs).toHaveLength(1);
      expect(logs[0].rule).toBe('r');
      expect(logs[0].reason).toBe('motivo');
    } finally {
      rmDir(dir);
    }
  });

  it('logDowngradeAttempt deve usar motivo padrao', () => {
    const dir = tmpDir('det-');
    try {
      logDowngradeAttempt(dir, { file: 'f', rule: 'r', severity: 'low', action: 'removed' });
      expect(loadDowngradeLogs(dir)[0].reason).toBe('sem motivo');
    } finally {
      rmDir(dir);
    }
  });

  it('loadDowngradeLogs deve retornar vazio quando ausente', () => {
    const dir = tmpDir('det-');
    try {
      expect(loadDowngradeLogs(dir)).toEqual([]);
    } finally {
      rmDir(dir);
    }
  });
});

// ============================================================
// security/barrier.ts
// ============================================================
describe('security barrier', () => {
  let dir: string;
  beforeEach(() => {
    dir = tmpDir('bar-');
  });
  afterEach(() => rmDir(dir));

  it('loadRules deve retornar DEFAULT_RULES quando arquivo ausente', () => {
    const rules = loadRules(dir);
    expect(rules.length).toBeGreaterThan(5);
    expect(rules.some((r) => r.severity === 'block')).toBe(true);
  });

  it('saveRules e loadRules devem fazer roundtrip', () => {
    saveRules(dir, [{ pattern: 'x*.ts', severity: 'warn', description: 'd' }]);
    expect(loadRules(dir)).toHaveLength(1);
  });

  it('checkBarriers deve bloquear arquivos de autenticacao', () => {
    const r = checkBarriers(dir, ['src/authService.ts']);
    expect(r.blocked).toContain('src/authService.ts');
  });

  it('checkBarriers deve bloquear .env', () => {
    const r = checkBarriers(dir, ['.env', '.env.local']);
    expect(r.blocked).toHaveLength(2);
  });

  it('checkBarriers deve avisar arquivos de schema', () => {
    const r = checkBarriers(dir, ['src/schema-config.ts']);
    expect(r.warnings).toContain('src/schema-config.ts');
    expect(r.blocked).toHaveLength(0);
  });

  it('checkBarriers deve nao bloquear arquivos neutros', () => {
    const r = checkBarriers(dir, ['src/utils.ts']);
    expect(r.blocked).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  it('checkBarriers deve aplicar bypass e limpar bloqueios', () => {
    const r = checkBarriers(dir, ['.env'], 'manutencao');
    expect(r.blocked).toHaveLength(0);
    expect(r.bypass).toBe('manutencao');
    expect(fs.existsSync(path.join(dir, '.ai', 'audit-trail', 'barrier-bypass.log'))).toBe(true);
  });

  it('addRule deve adicionar e persistir regra', () => {
    addRule(dir, 'config*.ts', 'warn', 'config files');
    const rules = loadRules(dir);
    expect(rules.some((r) => r.pattern === 'config*.ts')).toBe(true);
  });
});
