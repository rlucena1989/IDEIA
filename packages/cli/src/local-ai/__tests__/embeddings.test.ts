import { generateTFIDFVector, cosineSimilarity, cosineSimilarityDense, normalizeVector, hashContent, extractRelevantChunk, embedQuery, generateBatchEmbeddings } from '../embeddings';

describe('embeddings', () => {
  describe('generateTFIDFVector', () => {
    it('deve gerar vetor TF-IDF com termos do texto', () => {
      const vec = generateTFIDFVector('testando o sistema de busca');
      expect(Object.keys(vec).length).toBeGreaterThan(0);
      expect(vec.testando).toBeDefined();
    });

    it('deve retornar objeto vazio para texto vazio', () => {
      const vec = generateTFIDFVector('');
      expect(Object.keys(vec).length).toBe(0);
    });

    it('deve ignorar stopwords', () => {
      const vec = generateTFIDFVector('the and for are com que para');
      const keys = Object.keys(vec);
      for (const k of keys) {
        expect(['the', 'and', 'for', 'are', 'com', 'que', 'para']).not.toContain(k);
      }
    });

    it('deve normalizar frequencia pelo termo maximo', () => {
      const vec = generateTFIDFVector('cachorro gato cachorro');
      expect(vec.cachorro).toBe(1);
      expect(vec.gato).toBe(0.5);
    });
  });

  describe('cosineSimilarity', () => {
    it('deve retornar 1 para vetores identicos', () => {
      const a = { x: 1, y: 0 };
      const b = { x: 1, y: 0 };
      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
    });

    it('deve retornar 0 para vetores ortogonais', () => {
      const a = { x: 1, y: 0 };
      const b = { x: 0, y: 1 };
      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });

    it('deve retornar valor intermediario para vetores parcialmente similares', () => {
      const sim = cosineSimilarity({ a: 1, b: 0 }, { a: 0.5, b: 0.5 });
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(1);
    });

    it('deve retornar 0 quando um vetor for vazio', () => {
      expect(cosineSimilarity({}, { a: 1 })).toBe(0);
      expect(cosineSimilarity({ a: 1 }, {})).toBe(0);
    });
  });

  describe('cosineSimilarityDense', () => {
    it('deve retornar 1 para vetores identicos', () => {
      expect(cosineSimilarityDense([1, 0], [1, 0])).toBeCloseTo(1, 5);
    });

    it('deve retornar 0 para vetores ortogonais', () => {
      expect(cosineSimilarityDense([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 5);
    });

    it('deve retornar 0 quando um vetor tem magnitude zero', () => {
      expect(cosineSimilarityDense([0, 0], [1, 0])).toBe(0);
      expect(cosineSimilarityDense([1, 0], [0, 0])).toBe(0);
    });
  });

  describe('normalizeVector', () => {
    it('deve retornar vetor normalizado (magnitude 1)', () => {
      const nv = normalizeVector([3, 4]);
      expect(nv.length).toBe(2);
      expect(Math.sqrt(nv[0] ** 2 + nv[1] ** 2)).toBeCloseTo(1, 5);
    });

    it('deve retornar o mesmo vetor quando magnitude for zero', () => {
      expect(normalizeVector([0, 0])).toEqual([0, 0]);
    });

    it('deve retornar vetor unitario para vetor ja normalizado', () => {
      const nv = normalizeVector([1, 0]);
      expect(nv[0]).toBeCloseTo(1, 5);
      expect(nv[1]).toBeCloseTo(0, 5);
    });
  });

  describe('hashContent', () => {
    it('deve retornar hash deterministico', () => {
      expect(hashContent('hello')).toBe(hashContent('hello'));
    });

    it('deve retornar hashes diferentes para conteudos diferentes', () => {
      expect(hashContent('hello')).not.toBe(hashContent('world'));
    });

    it('deve retornar string hexadecimal de 16 caracteres', () => {
      expect(hashContent('test')).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe('extractRelevantChunk', () => {
    it('deve extrair chunk contendo o termo da consulta', () => {
      const text = 'Este é um texto longo sobre inteligencia artificial e machine learning no contexto de desenvolvimento de software.';
      const chunk = extractRelevantChunk(text, 'inteligencia');
      expect(chunk.length).toBeLessThanOrEqual(300);
      expect(chunk).toContain('inteligencia');
    });

    it('deve retornar inicio do texto quando consulta nao encontrada', () => {
      const text = 'Um texto qualquer sem a palavra alvo.';
      const chunk = extractRelevantChunk(text, 'inexistente');
      expect(chunk).toBe(text);
    });
  });

  describe('embedQuery', () => {
    it('deve retornar vetor TF-IDF da consulta', () => {
      const vec = embedQuery('consulta de teste');
      expect(Object.keys(vec).length).toBeGreaterThan(0);
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('deve retornar array vazio para lista vazia', async () => {
      const result = await generateBatchEmbeddings([], { batchSize: 5 });
      expect(result).toEqual([]);
    });
  });
});
