import { getStages, StageDef } from '../utils/gate/stages';

describe('gate - stages', () => {
  describe('STAGES', () => {
    it('getStages sem argumento deve retornar todos os stages', () => {
      const stages = getStages();
      expect(stages.length).toBeGreaterThanOrEqual(6);
      expect(stages.some(s => s.name === 'lint')).toBe(true);
      expect(stages.some(s => s.name === 'test')).toBe(true);
      expect(stages.some(s => s.name === 'security')).toBe(true);
      expect(stages.some(s => s.name === 'build')).toBe(true);
      expect(stages.some(s => s.name === 'architecture')).toBe(true);
      expect(stages.some(s => s.name === 'deploy-readiness')).toBe(true);
    });

    it('deve ter command e args definidos para cada stage', () => {
      const stages = getStages();
      for (const s of stages) {
        expect(s.name).toBeTruthy();
        expect(s.command).toBeTruthy();
        expect(Array.isArray(s.args)).toBe(true);
      }
    });
  });

  describe('getStages com filtro', () => {
    it('deve retornar stages a partir de um nome', () => {
      const stages = getStages('build');
      expect(stages.length).toBeGreaterThanOrEqual(2);
      expect(stages[0].name).toBe('build');
    });

    it('deve lancar erro para stage inexistente', () => {
      expect(() => getStages('nonexistent')).toThrow('not found');
    });
  });
});

import { copyTemplateDirectory, CopyMode, CopyResult, CopyFilter } from '../utils/copy';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('utils - copy', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('copyTemplateDirectory deve copiar arquivos para diretorio vazio', () => {
    const srcDir = path.join(tmpDir, 'src');
    const destDir = path.join(tmpDir, 'dest');
    fs.mkdirSync(srcDir);
    fs.writeFileSync(path.join(srcDir, 'hello.txt'), 'world');

    const result = copyTemplateDirectory(srcDir, destDir, 'force');
    expect(result.copied).toHaveLength(1);
    expect(fs.existsSync(path.join(destDir, 'hello.txt'))).toBe(true);
  });

  it('copyTemplateDirectory em dry-run nao deve criar arquivos', () => {
    const srcDir = path.join(tmpDir, 'src');
    const destDir = path.join(tmpDir, 'dest');
    fs.mkdirSync(srcDir);
    fs.writeFileSync(path.join(srcDir, 'file.txt'), 'test');

    const result = copyTemplateDirectory(srcDir, destDir, 'dry-run');
    expect(result.copied).toHaveLength(1);
    expect(fs.existsSync(destDir)).toBe(false);
  });

  it('copyTemplateDirectory deve respeitar filterFn', () => {
    const srcDir = path.join(tmpDir, 'src');
    const destDir = path.join(tmpDir, 'dest');
    fs.mkdirSync(srcDir);
    fs.writeFileSync(path.join(srcDir, 'keep.txt'), 'keep');
    fs.writeFileSync(path.join(srcDir, 'skip.txt'), 'skip');

    const result = copyTemplateDirectory(srcDir, destDir, 'force', (p) => p !== 'skip.txt');
    expect(result.copied).toHaveLength(1);
    expect(result.copied[0]).toContain('keep');
  });

  it('copyTemplateDirectory deve ignorar diretorio src inexistente', () => {
    const result = copyTemplateDirectory('/nonexistent_copy_test', tmpDir, 'force');
    expect(result.errors).toHaveLength(0);
  });

  it('copyTemplateDirectory em modo safe deve pular arquivos existentes', () => {
    const srcDir = path.join(tmpDir, 'src');
    const destDir = path.join(tmpDir, 'dest');
    fs.mkdirSync(srcDir);
    fs.mkdirSync(destDir);
    fs.writeFileSync(path.join(srcDir, 'file.txt'), 'new');
    fs.writeFileSync(path.join(destDir, 'file.txt'), 'existing');

    const result = copyTemplateDirectory(srcDir, destDir, 'safe');
    expect(result.skipped).toHaveLength(1);
    expect(fs.readFileSync(path.join(destDir, 'file.txt'), 'utf8')).toBe('existing');
  });
});