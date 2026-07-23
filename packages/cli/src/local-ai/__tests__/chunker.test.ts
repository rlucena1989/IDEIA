import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { setChunkerConfig, chunkText, chunkFile, chunkDirectory } from '../chunker';

const TEST_DIR = path.join(os.tmpdir(), 'ai-devkit-chunker-test');

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('chunker', () => {
  describe('setChunkerConfig', () => {
    it('deve mesclar config padrao com overrides', () => {
      const cfg = setChunkerConfig({ chunkSize: 500 });
      expect(cfg.chunkSize).toBe(500);
      expect(cfg.chunkOverlap).toBe(200);
    });
  });

  describe('chunkText', () => {
    it('deve produzir ao menos 1 chunk para texto menor que chunkSize', () => {
      const chunks = chunkText('texto curto', 'test.ts', { chunkSize: 1000, chunkOverlap: 200, separators: ['\n\n', '\n', '.', ' ', ''] });
      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe('texto curto');
    });

    it('deve produzir multiplos chunks para texto longo', () => {
      const content = 'palavra. '.repeat(500);
      const chunks = chunkText(content, 'longo.txt', { chunkSize: 200, chunkOverlap: 50, separators: ['\n\n', '\n', '.', ' ', ''] });
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('deve retornar array vazio para texto vazio', () => {
      expect(chunkText('', 'vazio.ts', { chunkSize: 1000, chunkOverlap: 200, separators: ['\n\n', '\n', '.', ' ', ''] })).toEqual([]);
    });

    it('deve definir chunkIndex e totalChunks corretamente', () => {
      const content = 'linha\n'.repeat(100);
      const chunks = chunkText(content, 'indexado.ts', { chunkSize: 100, chunkOverlap: 20, separators: ['\n\n', '\n', '.', ' ', ''] });
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      for (const c of chunks) {
        expect(c.totalChunks).toBe(chunks.length);
        expect(c.index).toBeGreaterThanOrEqual(0);
      }
    });

    it('deve ter startOffset e endOffset validos', () => {
      const content = 'Um texto razoavelmente longo para testar offsets. '.repeat(20);
      const chunks = chunkText(content, 'offsets.txt', { chunkSize: 100, chunkOverlap: 20, separators: ['\n\n', '\n', '.', ' ', ''] });
      for (const c of chunks) {
        expect(c.endOffset).toBeGreaterThan(c.startOffset);
        expect(c.startOffset).toBeGreaterThanOrEqual(0);
      }
    });

    it('nao deve conter chunks vazios', () => {
      const chunks = chunkText('conteudo util', 'test.ts', { chunkSize: 10, chunkOverlap: 2, separators: ['\n\n', '\n', '.', ' ', ''] });
      for (const c of chunks) {
        expect(c.content.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('chunkFile', () => {
    it('deve chunkar arquivo existente', () => {
      const filePath = path.join(TEST_DIR, 'arquivo.ts');
      fs.writeFileSync(filePath, 'linha1\nlinha2\nlinha3');
      const chunks = chunkFile(filePath, { chunkSize: 100, chunkOverlap: 10, separators: ['\n\n', '\n', '.', ' ', ''] });
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].path).toBe(filePath);
    });

    it('deve retornar array vazio para arquivo inexistente', () => {
      const chunks = chunkFile('/nonexistent/file.ts');
      expect(chunks).toEqual([]);
    });
  });

  describe('chunkDirectory', () => {
    it('deve chunkar arquivos .ts em diretorio', () => {
      fs.writeFileSync(path.join(TEST_DIR, 'a.ts'), 'export const a = 1;');
      fs.writeFileSync(path.join(TEST_DIR, 'b.ts'), 'export const b = 2;');
      fs.writeFileSync(path.join(TEST_DIR, 'c.txt'), 'apenas texto');
      const chunks = chunkDirectory(TEST_DIR, new Set(['.ts']), new Set([]), { chunkSize: 500, chunkOverlap: 100, separators: ['\n\n', '\n', '.', ' ', ''] });
      expect(chunks.length).toBe(2);
    });

    it('deve ignorar diretorios ignorados', () => {
      fs.mkdirSync(path.join(TEST_DIR, 'node_modules'));
      fs.writeFileSync(path.join(TEST_DIR, 'node_modules', 'ignore.ts'), 'ignorado');
      fs.writeFileSync(path.join(TEST_DIR, 'valido.ts'), 'valido');
      const chunks = chunkDirectory(TEST_DIR, new Set(['.ts']), new Set(['node_modules']), { chunkSize: 500, chunkOverlap: 100, separators: ['\n\n', '\n', '.', ' ', ''] });
      expect(chunks.length).toBe(1);
      expect(chunks[0].path).toContain('valido.ts');
    });

    it('deve pular arquivos que comecam com ponto', () => {
      fs.writeFileSync(path.join(TEST_DIR, '.hidden.ts'), 'escondido');
      fs.writeFileSync(path.join(TEST_DIR, 'visivel.ts'), 'visivel');
      const chunks = chunkDirectory(TEST_DIR, new Set(['.ts']), new Set([]), { chunkSize: 500, chunkOverlap: 100, separators: ['\n\n', '\n', '.', ' ', ''] });
      expect(chunks.length).toBe(1);
      expect(chunks[0].path).toContain('visivel.ts');
    });

    it('deve retornar array vazio para diretorio inexistente', () => {
      const chunks = chunkDirectory('/nonexistent', new Set(['.ts']), new Set([]));
      expect(chunks).toEqual([]);
    });
  });
});
