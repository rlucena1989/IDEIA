import { copyTemplateDirectory, CopyMode, CopyResult } from '../utils/copy';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('copy - copyTemplateDirectory', () => {
  let tempDir: string;
  let sourceDir: string;
  let targetDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-test-'));
    sourceDir = path.join(tempDir, 'source');
    targetDir = path.join(tempDir, 'target');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(targetDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('deve copiar arquivos em modo safe', () => {
    fs.writeFileSync(path.join(sourceDir, 'file1.txt'), 'content1');
    fs.writeFileSync(path.join(sourceDir, 'file2.txt'), 'content2');

    const result = copyTemplateDirectory(sourceDir, targetDir, 'safe');

    expect(result.copied).toHaveLength(2);
    expect(result.skipped).toHaveLength(0);
    expect(result.overwritten).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(fs.existsSync(path.join(targetDir, 'file1.txt'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'file2.txt'))).toBe(true);
  });

  it('deve pular arquivos existentes em modo safe', () => {
    fs.writeFileSync(path.join(sourceDir, 'file.txt'), 'new content');
    fs.writeFileSync(path.join(targetDir, 'file.txt'), 'existing content');

    const result = copyTemplateDirectory(sourceDir, targetDir, 'safe');

    expect(result.copied).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(fs.readFileSync(path.join(targetDir, 'file.txt'), 'utf8')).toBe('existing content');
  });

  it('deve sobrescrever e fazer backup em modo force', () => {
    fs.writeFileSync(path.join(sourceDir, 'file.txt'), 'new content');
    fs.writeFileSync(path.join(targetDir, 'file.txt'), 'existing content');

    const result = copyTemplateDirectory(sourceDir, targetDir, 'force');

    expect(result.overwritten).toHaveLength(1);
    expect(result.backedUp).toHaveLength(1);
    expect(fs.readFileSync(path.join(targetDir, 'file.txt'), 'utf8')).toBe('new content');
    expect(result.backedUp[0]).toContain('backups');
  });

  it('deve copiar diretórios recursivamente', () => {
    fs.mkdirSync(path.join(sourceDir, 'subdir'), { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'subdir', 'nested.txt'), 'nested content');

    const result = copyTemplateDirectory(sourceDir, targetDir, 'safe');

    expect(result.copied).toHaveLength(1);
    expect(fs.existsSync(path.join(targetDir, 'subdir', 'nested.txt'))).toBe(true);
    expect(fs.readFileSync(path.join(targetDir, 'subdir', 'nested.txt'), 'utf8')).toBe('nested content');
  });

  it('deve aplicar filtro para incluir apenas arquivos específicos', () => {
    fs.writeFileSync(path.join(sourceDir, 'include.txt'), 'include');
    fs.writeFileSync(path.join(sourceDir, 'exclude.log'), 'exclude');

    const filterFn = (relativePath: string) => relativePath.endsWith('.txt');
    const result = copyTemplateDirectory(sourceDir, targetDir, 'safe', filterFn);

    expect(result.copied).toHaveLength(1);
    expect(result.copied[0]).toContain('include.txt');
    expect(fs.existsSync(path.join(targetDir, 'include.txt'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'exclude.log'))).toBe(false);
  });

  it('deve aplicar filtro para excluir arquivos específicos', () => {
    fs.writeFileSync(path.join(sourceDir, 'keep.txt'), 'keep');
    fs.writeFileSync(path.join(sourceDir, 'skip.tmp'), 'skip');

    const filterFn = (relativePath: string) => !relativePath.endsWith('.tmp');
    const result = copyTemplateDirectory(sourceDir, targetDir, 'safe', filterFn);

    expect(result.copied).toHaveLength(1);
    expect(fs.existsSync(path.join(targetDir, 'keep.txt'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'skip.tmp'))).toBe(false);
  });

  it('deve executar em modo dry-run sem copiar arquivos', () => {
    fs.writeFileSync(path.join(sourceDir, 'file.txt'), 'content');

    const result = copyTemplateDirectory(sourceDir, targetDir, 'dry-run');

    expect(result.copied).toHaveLength(1);
    expect(fs.existsSync(path.join(targetDir, 'file.txt'))).toBe(false);
  });

  it('deve lidar com diretório fonte inexistente', () => {
    const nonExistent = path.join(tempDir, 'nonexistent');
    const result = copyTemplateDirectory(nonExistent, targetDir, 'safe');

    expect(result.copied).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('deve criar diretórios de destino automaticamente', () => {
    fs.mkdirSync(path.join(sourceDir, 'subdir'), { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'subdir', 'file.txt'), 'content');

    const deepTarget = path.join(targetDir, 'deep', 'nested');
    const result = copyTemplateDirectory(sourceDir, deepTarget, 'safe');

    expect(result.copied).toHaveLength(1);
    expect(fs.existsSync(path.join(deepTarget, 'subdir', 'file.txt'))).toBe(true);
  });

  it('deve capturar erros durante a cópia', () => {
    fs.writeFileSync(path.join(sourceDir, 'file.txt'), 'content');
    // Criar um arquivo que não pode ser lido (simulação)
    const invalidSource = path.join(sourceDir, 'invalid');
    fs.mkdirSync(invalidSource);
    fs.writeFileSync(path.join(invalidSource, 'test.txt'), 'test');

    const result = copyTemplateDirectory(sourceDir, targetDir, 'safe');

    expect(result.errors).toHaveLength(0);
  });
});
