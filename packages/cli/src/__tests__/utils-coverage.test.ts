import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { printHeader, printLine, printResult, printSummary, finish } from '../utils/output';
import { copyTemplateDirectory, CopyMode } from '../utils/copy';
import { upsertPackageScripts } from '../utils/package-json';
import { getCliVersion } from '../utils/version';
import { findTemplateAiDir } from '../utils/template';
import { generateSetupReport } from '../utils/report';
import { getIO, createIO, resetIO } from '../io';

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

// ============================================================
// output.ts
// ============================================================
describe('output', () => {
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;
  const prevLlm = process.env.AI_LLM_MODE;

  beforeEach(() => {
    delete process.env.AI_LLM_MODE;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
  });
  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
    if (prevLlm === undefined) delete process.env.AI_LLM_MODE;
    else process.env.AI_LLM_MODE = prevLlm;
  });

  it('printHeader deve imprimir titulo com quebra de linha', () => {
    printHeader('Titulo');
    expect(logSpy).toHaveBeenCalledWith('\nTitulo\n');
  });

  it('printHeader nao deve imprimir em LLM mode', () => {
    process.env.AI_LLM_MODE = '1';
    printHeader('Titulo');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('printLine deve imprimir linha', () => {
    printLine('texto');
    expect(logSpy).toHaveBeenCalledWith('texto');
  });

  it('printLine nao deve imprimir em LLM mode', () => {
    process.env.AI_LLM_MODE = '1';
    printLine('texto');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('printResult deve imprimir ok com detalhe', () => {
    printResult('check', true, 'detalhe');
    expect(logSpy).toHaveBeenCalledWith('✅ check: detalhe');
  });

  it('printResult deve imprimir falha sem detalhe', () => {
    printResult('check', false);
    expect(logSpy).toHaveBeenCalledWith('❌ check');
  });

  it('printSummary deve usar icone verde para score >= 85', () => {
    printSummary(90, 100, 'Saude');
    expect(logSpy).toHaveBeenCalledWith('✅ Saude: 90/100');
  });

  it('printSummary deve usar alerta para score entre 65 e 84', () => {
    printSummary(70, 100, 'Saude');
    expect(logSpy).toHaveBeenCalledWith('⚠️ Saude: 70/100');
  });

  it('printSummary deve usar falha para score < 65', () => {
    printSummary(50, 100, 'Saude');
    expect(logSpy).toHaveBeenCalledWith('❌ Saude: 50/100');
  });

  it('finish deve chamar process.exit(0) quando ok', () => {
    finish({ checkpoint: 'c', ok: true, status: 'passed', context_summary: 's' });
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('finish deve chamar process.exit(1) quando nao ok', () => {
    finish({ checkpoint: 'c', ok: false, status: 'failed', context_summary: 's' });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('finish em LLM mode deve imprimir JSON e sair com exit code correto', () => {
    process.env.AI_LLM_MODE = '1';
    finish({ checkpoint: 'c', ok: true, status: 'passed', context_summary: 's', data: { x: 1 } });
    const json = logSpy.mock.calls[0][0];
    const parsed = JSON.parse(json);
    expect(parsed.ok).toBe(true);
    expect(parsed.checkpoint).toBe('c');
    expect(parsed.cost_usd).toBe(0.0);
    expect(parsed.data.x).toBe(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('finish em LLM mode sem data nao deve incluir campo data', () => {
    process.env.AI_LLM_MODE = '1';
    finish({ checkpoint: 'c', ok: false, status: 'failed', context_summary: 's' });
    const parsed = JSON.parse(logSpy.mock.calls[0][0]);
    expect(parsed.data).toBeUndefined();
    expect(parsed.next_actions).toEqual([]);
  });
});

// ============================================================
// copy.ts
// ============================================================
describe('copyTemplateDirectory', () => {
  let src: string;
  let dest: string;

  beforeEach(() => {
    src = tmpDir('copy-src-');
    dest = tmpDir('copy-dest-');
    fs.mkdirSync(path.join(src, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(src, 'a.txt'), 'A');
    fs.writeFileSync(path.join(src, 'sub', 'b.txt'), 'B');
    fs.writeFileSync(path.join(src, 'skip.md'), 'MD');
  });
  afterEach(() => {
    rmDir(src);
    rmDir(dest);
  });

  it('safe deve copiar arquivos novos', () => {
    const r = copyTemplateDirectory(src, dest, 'safe');
    expect(r.copied.length).toBeGreaterThanOrEqual(3);
    expect(fs.existsSync(path.join(dest, 'a.txt'))).toBe(true);
    expect(fs.existsSync(path.join(dest, 'sub', 'b.txt'))).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('safe deve pular arquivos existentes', () => {
    fs.writeFileSync(path.join(dest, 'a.txt'), 'OLD');
    const r = copyTemplateDirectory(src, dest, 'safe');
    expect(r.skipped.length).toBe(1);
    expect(fs.readFileSync(path.join(dest, 'a.txt'), 'utf8')).toBe('OLD');
  });

  it('force deve sobrescrever e fazer backup', () => {
    fs.writeFileSync(path.join(dest, 'a.txt'), 'OLD');
    const r = copyTemplateDirectory(src, dest, 'force');
    expect(r.overwritten).toContain(path.join(dest, 'a.txt'));
    expect(r.backedUp.length).toBe(1);
    expect(fs.readFileSync(path.join(dest, 'a.txt'), 'utf8')).toBe('A');
  });

  it('dry-run deve reportar sem escrever arquivos', () => {
    const r = copyTemplateDirectory(src, dest, 'dry-run');
    expect(r.copied.length).toBeGreaterThanOrEqual(3);
    expect(fs.existsSync(path.join(dest, 'a.txt'))).toBe(false);
  });

  it('filter deve excluir arquivos .md', () => {
    const _r = copyTemplateDirectory(src, dest, 'safe', (rel) => !rel.endsWith('.md'));
    expect(fs.existsSync(path.join(dest, 'a.txt'))).toBe(true);
    expect(fs.existsSync(path.join(dest, 'skip.md'))).toBe(false);
  });

  it('source inexistente deve retornar resultado vazio sem erros', () => {
    const r = copyTemplateDirectory(path.join(src, 'nope'), dest, 'safe');
    expect(r.copied).toEqual([]);
    expect(r.errors).toEqual([]);
  });
});

// ============================================================
// package-json.ts
// ============================================================
describe('upsertPackageScripts', () => {
  let dir: string;
  let pkgPath: string;

  beforeEach(() => {
    dir = tmpDir('pkg-');
    pkgPath = path.join(dir, 'package.json');
  });
  afterEach(() => rmDir(dir));

  it('dryRun deve preencher added sem escrever arquivo', () => {
    const r = upsertPackageScripts(pkgPath, false, true);
    expect(r.added.length).toBeGreaterThan(10);
    expect(fs.existsSync(pkgPath)).toBe(false);
  });

  it('deve adicionar scripts em package.json novo', () => {
    const r = upsertPackageScripts(pkgPath, false, false);
    expect(r.added.length).toBeGreaterThan(10);
    expect(r.skipped).toEqual([]);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.scripts['ai:verify']).toBe('ai-devkit verify');
  });

  it('deve pular scripts existentes sem force', () => {
    fs.writeFileSync(pkgPath, JSON.stringify({ scripts: { 'ai:verify': 'custom' } }));
    const r = upsertPackageScripts(pkgPath, false, false);
    expect(r.skipped).toContain('ai:verify');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.scripts['ai:verify']).toBe('custom');
  });

  it('deve sobrescrever scripts existentes com force', () => {
    fs.writeFileSync(pkgPath, JSON.stringify({ scripts: { 'ai:verify': 'custom' } }));
    const r = upsertPackageScripts(pkgPath, true, false);
    expect(r.overwritten).toContain('ai:verify');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.scripts['ai:verify']).toBe('ai-devkit verify');
  });

  it('deve preservar scripts nao-AI', () => {
    fs.writeFileSync(pkgPath, JSON.stringify({ scripts: { build: 'tsc', 'ai:verify': 'x' } }));
    const r = upsertPackageScripts(pkgPath, false, false);
    expect(r.preserved).toContain('build');
  });

  it('deve incluir ai:check:installer quando packages/cli existe', () => {
    fs.mkdirSync(path.join(dir, 'packages', 'cli'), { recursive: true });
    const r = upsertPackageScripts(pkgPath, false, true);
    expect(r.added).toContain('ai:check:installer');
  });

  it('deve manter package.json invalido sem quebrar', () => {
    fs.writeFileSync(pkgPath, '{ invalid json');
    const r = upsertPackageScripts(pkgPath, false, false);
    expect(r.added.length).toBeGreaterThan(10);
    expect(fs.existsSync(pkgPath)).toBe(true);
  });
});

// ============================================================
// version.ts
// ============================================================
describe('getCliVersion', () => {
  it('deve retornar uma string de versao nao vazia', () => {
    const v = getCliVersion();
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThan(0);
  });

  it('deve retornar a versao real do packages/cli/package.json', () => {
    const pkgPath = path.resolve(__dirname, '..', '..', 'package.json');
    const expected = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
    expect(getCliVersion()).toBe(expected);
  });
});

// ============================================================
// template.ts
// ============================================================
describe('findTemplateAiDir', () => {
  it('deve retornar um diretorio .ai existente', () => {
    const dir = findTemplateAiDir();
    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.statSync(dir).isDirectory()).toBe(true);
    expect(dir.endsWith('.ai') || dir.endsWith('.ai-template')).toBe(true);
  });

  it('deve lancar erro quando nenhum candidato existe', () => {
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    expect(() => findTemplateAiDir()).toThrow('not found');
    existsSpy.mockRestore();
  });
});

// ============================================================
// report.ts
// ============================================================
describe('generateSetupReport', () => {
  let dir: string;

  beforeEach(() => {
    dir = tmpDir('report-');
  });
  afterEach(() => rmDir(dir));

  it('dryRun nao deve escrever relatorio', () => {
    generateSetupReport(dir, { dryRun: true }, {}, {}, 'tmpl');
    expect(fs.existsSync(path.join(dir, '.ai', 'setup-report.md'))).toBe(false);
  });

  it('deve escrever setup-report.md com resumo', () => {
    const copyResult = { copied: ['a'], skipped: [], overwritten: [], backedUp: [] };
    const scriptResult = { added: ['ai:verify'], preserved: ['build'], overwritten: [] };
    generateSetupReport(dir, { dryRun: false, flavor: 'node', force: false }, copyResult, scriptResult, 'tmpl');
    const reportPath = path.join(dir, '.ai', 'setup-report.md');
    expect(fs.existsSync(reportPath)).toBe(true);
    const content = fs.readFileSync(reportPath, 'utf8');
    expect(content).toContain('AI-DevKit Setup Report');
    expect(content).toContain('Flavor: node');
    expect(content).toContain('Mode: safe');
    expect(content).toContain('Added: ai:verify');
    expect(content).toContain('Preserved: build');
  });

  it('deve reportar backup root quando houve backup', () => {
    const copyResult = { copied: [], skipped: [], overwritten: [], backedUp: ['/x/backups/setup/d/file'] };
    generateSetupReport(dir, { dryRun: false, flavor: 'node', force: true }, copyResult, { added: [], preserved: [], overwritten: [] }, 'tmpl');
    const content = fs.readFileSync(path.join(dir, '.ai', 'setup-report.md'), 'utf8');
    expect(content).toContain('Mode: force');
    expect(content).toContain('Backup root: /x/backups/setup');
  });
});

// ============================================================
// io.ts
// ============================================================
describe('io module', () => {
  afterEach(() => resetIO());

  it('getIO deve retornar a mesma instancia em chamadas consecutivas', () => {
    resetIO();
    const a = getIO();
    const b = getIO();
    expect(a).toBe(b);
  });

  it('resetIO deve invalidar o cache do singleton', () => {
    resetIO();
    const a = getIO();
    resetIO();
    const b = getIO();
    expect(a).not.toBe(b);
  });

  it('createIO deve retornar container com shell, fs e http', () => {
    const io = createIO();
    expect(io).toHaveProperty('shell');
    expect(io).toHaveProperty('fs');
    expect(io).toHaveProperty('http');
  });

  it('createIO deve retornar MockIOContainer quando GTI_TEST_MODE=1', () => {
    process.env.GTI_TEST_MODE = '1';
    try {
      resetIO();
      const io = getIO();
      expect(typeof (io as any)._reset).toBe('function');
    } finally {
      delete process.env.GTI_TEST_MODE;
      resetIO();
    }
  });

  it('MockIOContainer setupProject deve criar arquivos base', () => {
    process.env.GTI_TEST_MODE = '1';
    try {
      resetIO();
      const io = getIO() as any;
      io._reset();
      io.setupProject('x');
      expect(io.fs.exists(path.join(process.cwd(), 'package.json'))).toBe(true);
    } finally {
      delete process.env.GTI_TEST_MODE;
      resetIO();
    }
  });
});
