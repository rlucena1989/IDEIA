import { findTemplateAiDir } from '../utils/template';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('template - findTemplateAiDir', () => {
  let originalCwd: string;
  let tempDir: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'template-test-'));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('deve retornar string não vazia quando encontrado', () => {
    const result = findTemplateAiDir();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(fs.existsSync(result)).toBe(true);
    expect(fs.statSync(result).isDirectory()).toBe(true);
  });

  it('deve retornar caminho válido de diretório', () => {
    const result = findTemplateAiDir();
    expect(path.isAbsolute(result)).toBe(true);
    expect(result).toContain('.ai');
  });

  it('deve ser consistente em múltiplas chamadas', () => {
    const result1 = findTemplateAiDir();
    const result2 = findTemplateAiDir();
    expect(result1).toBe(result2);
  });

  it('deve lançar erro se nenhum diretório template for encontrado', () => {
    const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    try {
      expect(() => findTemplateAiDir()).toThrow('AI-DevKit template .ai directory not found');
    } finally {
      existsSyncSpy.mockRestore();
    }
  });

  it('deve verificar múltiplos caminhos candidatos', () => {
    const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    try {
      findTemplateAiDir();
    } catch (err) {
      expect((err as Error).message).toContain('Checked:');
    } finally {
      existsSyncSpy.mockRestore();
    }
  });
});
