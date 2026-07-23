import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { computeFreshnessScore, computeRecencyWeight, computeFileHash, loadIndexState, saveIndexState, isFileChanged, getCurrentFileMetadata } from '../freshness';

const TEST_DIR = path.join(os.tmpdir(), 'ai-devkit-freshness-test');

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('freshness', () => {
  describe('computeFreshnessScore', () => {
    it('deve retornar 1 para arquivo acabado de modificar', () => {
      const score = computeFreshnessScore(Date.now());
      expect(score).toBeCloseTo(1, 1);
    });

    it('deve retornar valor menor para arquivo antigo', () => {
      const old = Date.now() - 15 * 24 * 60 * 60 * 1000;
      const fresh = Date.now();
      expect(computeFreshnessScore(old)).toBeLessThan(computeFreshnessScore(fresh));
    });

    it('deve retornar 0 para arquivo mais velho que 30 dias', () => {
      const score = computeFreshnessScore(Date.now() - 31 * 24 * 60 * 60 * 1000);
      expect(score).toBeCloseTo(0, 1);
    });
  });

  describe('computeRecencyWeight', () => {
    it('deve retornar 1.0 para mtime igual a agora', () => {
      expect(computeRecencyWeight(Date.now())).toBeCloseTo(1, 1);
    });

    it('deve decair exponencialmente com o tempo', () => {
      const recent = computeRecencyWeight(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const older = computeRecencyWeight(Date.now() - 14 * 24 * 60 * 60 * 1000);
      expect(recent).toBeGreaterThan(older);
    });
  });

  describe('computeFileHash', () => {
    it('deve ser deterministico', () => {
      expect(computeFileHash('abc')).toBe(computeFileHash('abc'));
    });

    it('deve diferir para conteudos diferentes', () => {
      expect(computeFileHash('abc')).not.toBe(computeFileHash('def'));
    });
  });

  describe('loadIndexState / saveIndexState', () => {
    it('deve persistir e carregar estado', () => {
      const state = { files: {}, lastIndexedAt: '2026-01-01' };
      saveIndexState(TEST_DIR, state);
      const loaded = loadIndexState(TEST_DIR);
      expect(loaded.lastIndexedAt).toBe('2026-01-01');
    });

    it('deve retornar estado default se nao existir', () => {
      const state = loadIndexState('/nonexistent');
      expect(state.files).toEqual({});
      expect(state.lastIndexedAt).toBe('');
    });
  });

  describe('isFileChanged', () => {
    it('deve retornar true se arquivo nao estava no estado anterior', () => {
      const filePath = path.join(TEST_DIR, 'novo.ts');
      fs.writeFileSync(filePath, 'conteudo');
      expect(isFileChanged(TEST_DIR, filePath)).toBe(true);
    });

    it('deve retornar false se arquivo nao mudou', () => {
      const filePath = path.join(TEST_DIR, 'estavel.ts');
      fs.writeFileSync(filePath, 'fixo');
      saveIndexState(TEST_DIR, { files: { [filePath]: { path: filePath, mtimeMs: fs.statSync(filePath).mtimeMs, fileSize: fs.statSync(filePath).size, fileHash: computeFileHash('fixo') } }, lastIndexedAt: new Date().toISOString() });
      expect(isFileChanged(TEST_DIR, filePath)).toBe(false);
    });

    it('deve retornar true se conteudo mudou', () => {
      const filePath = path.join(TEST_DIR, 'mutavel.ts');
      fs.writeFileSync(filePath, 'versao1');
      saveIndexState(TEST_DIR, { files: { [filePath]: { path: filePath, mtimeMs: fs.statSync(filePath).mtimeMs, fileSize: fs.statSync(filePath).size, fileHash: computeFileHash('versao1') } }, lastIndexedAt: new Date().toISOString() });
      fs.writeFileSync(filePath, 'versao2');
      expect(isFileChanged(TEST_DIR, filePath)).toBe(true);
    });
  });

  describe('getCurrentFileMetadata', () => {
    it('deve retornar metadados para arquivo existente', () => {
      const filePath = path.join(TEST_DIR, 'meta.ts');
      fs.writeFileSync(filePath, 'dados');
      const meta = getCurrentFileMetadata(filePath);
      expect(meta).not.toBeNull();
      expect(meta!.path).toBe(filePath);
      expect(meta!.fileSize).toBe(5);
    });

    it('deve retornar null para arquivo inexistente', () => {
      expect(getCurrentFileMetadata('/nonexistent.ts')).toBeNull();
    });
  });
});
