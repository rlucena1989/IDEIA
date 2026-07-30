import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { retrospectiveCommand } from '../retrospective';
import { getIO, resetIO } from '../../io';
import type { MockIOContainer } from '../../io/mock';
import path from 'node:path';

jest.mock('../../io', () => {
  const { MockIOContainer } = jest.requireActual('../../io/mock');
  let mockIO: MockIOContainer | null = null;
  return {
    __esModule: true,
    getIO: () => {
      if (!mockIO) mockIO = new MockIOContainer();
      return mockIO;
    },
    resetIO: () => { mockIO = null; },
    createIO: () => {
      if (!mockIO) mockIO = new MockIOContainer();
      return mockIO;
    },
  };
});

describe('retrospective command', () => {
  let io: MockIOContainer;

  beforeEach(() => {
    resetIO();
    io = getIO() as unknown as MockIOContainer;
    io._reset();
    io.setupProject();
  });

  it('retrospectiveCommand returns a commander command', () => {
    const cmd = retrospectiveCommand();
    expect(cmd.name()).toBe('retrospective');
  });

  it('generate creates retro report file', () => {
    const root = process.cwd();
    (io.shell as any)._setDefault({ status: 0, stdout: 'abc123 first commit\n' });

    const cmd = retrospectiveCommand();
    cmd.parse(['node', 'test', 'generate']);

    const retrosDir = path.join(root, '.ai/reports/retrospective');
    const files = io.fs.readDir(retrosDir);
    expect(files.length).toBeGreaterThan(0);
    const reportContent = io.fs.read(path.join(retrosDir, files[0]), 'utf8');
    expect(reportContent).toContain('# Relatorio de Retrospectiva');
    expect(reportContent).toContain('1 commits');
  });

  it('generate creates report with multiple commits', () => {
    const root = process.cwd();
    (io.shell as any)._setDefault({ status: 0, stdout: 'a1 feat\nb2 fix\n' });

    const cmd = retrospectiveCommand();
    cmd.parse(['node', 'test', 'generate']);

    const retrosDir = path.join(root, '.ai/reports/retrospective');
    const files = io.fs.readDir(retrosDir);
    expect(files.length).toBeGreaterThan(0);
    const reportContent = io.fs.read(path.join(retrosDir, files[0]), 'utf8');
    expect(reportContent).toContain('2 commits');
  });

  it('list shows message when no retros exist', () => {
    const cmd = retrospectiveCommand();
    expect(() => cmd.parse(['node', 'test', 'list'])).not.toThrow();
  });

  it('list shows retro files when present', () => {
    const root = process.cwd();
    const retrosDir = path.join(root, '.ai/reports/retrospective');
    io.fs.mkDir(retrosDir, true);
    io.fs.write(path.join(retrosDir, 'retro-2026-01-01.md'), '# old retro');

    const cmd = retrospectiveCommand();
    cmd.parse(['node', 'test', 'list']);

    const files = io.fs.readDir(retrosDir);
    expect(files.length).toBe(1);
  });

  it('generate report includes findings section', () => {
    const root = process.cwd();
    (io.shell as any)._setDefault({ status: 0, stdout: 'commit1\ncommit2\ncommit3\n' });

    const cmd = retrospectiveCommand();
    cmd.parse(['node', 'test', 'generate']);

    const retrosDir = path.join(root, '.ai/reports/retrospective');
    const files = io.fs.readDir(retrosDir);
    const reportContent = io.fs.read(path.join(retrosDir, files[0]), 'utf8');
    expect(reportContent).toContain('## O que funcionou');
    expect(reportContent).toContain('## O que falhou');
    expect(reportContent).toContain('## Melhorias sugeridas');
    expect(reportContent).toContain('## Tendencias');
  });

  it('generate with --since option', () => {
    const root = process.cwd();
    (io.shell as any)._setDefault({ status: 0, stdout: 'c1\nc2\nc3\nc4\n' });

    const cmd = retrospectiveCommand();
    cmd.parse(['node', 'test', 'generate', '--since', 'v1.0']);

    const retrosDir = path.join(root, '.ai/reports/retrospective');
    const files = io.fs.readDir(retrosDir);
    expect(files.length).toBeGreaterThan(0);
    const reportContent = io.fs.read(path.join(retrosDir, files[0]), 'utf8');
    expect(reportContent).toContain('4 commits');
  });

  it('generate with quality gates data from ledger', () => {
    const root = process.cwd();
    (io.shell as any)._setDefault({ status: 0, stdout: 'abc123 commit\n' });
    const ledgerPath = path.join(root, '.ai/reports/latest-sync-report.json');
    io.fs.write(ledgerPath, JSON.stringify([
      { command: 'verify', status: 'passed' },
      { command: 'verify', status: 'passed' },
    ]));

    const cmd = retrospectiveCommand();
    cmd.parse(['node', 'test', 'generate']);

    const retrosDir = path.join(root, '.ai/reports/retrospective');
    const files = io.fs.readDir(retrosDir);
    const reportContent = io.fs.read(path.join(retrosDir, files[0]), 'utf8');
    expect(reportContent).toContain('2');
  });

  it('generate with placeholder violations', () => {
    const root = process.cwd();
    (io.shell as any)._setDefault({ status: 0, stdout: 'abc123 commit\n' });
    const violationPath = path.join(root, '.ai/reports/placeholder-policy-report.json');
    io.fs.write(violationPath, JSON.stringify({ findings: ['missing placeholder', 'duplicate placeholder'] }));

    const cmd = retrospectiveCommand();
    cmd.parse(['node', 'test', 'generate']);

    const retrosDir = path.join(root, '.ai/reports/retrospective');
    const files = io.fs.readDir(retrosDir);
    const reportContent = io.fs.read(path.join(retrosDir, files[0]), 'utf8');
    expect(reportContent).toContain('2 violacoes');
    expect(reportContent).toContain('hook install');
  });

  it('generate with no commits', () => {
    (io.shell as any)._setDefault({ status: 0, stdout: '' });

    const cmd = retrospectiveCommand();
    cmd.parse(['node', 'test', 'generate']);

    const retrosDir = path.join(path.resolve('.'), '.ai/reports/retrospective');
    const files = io.fs.readDir(retrosDir);
    const reportContent = io.fs.read(path.join(retrosDir, files[0]), 'utf8');
    expect(reportContent).toContain('Nenhum commit');
  });

  it('generate with previous retro builds trends', () => {
    const root = process.cwd();
    (io.shell as any)._setDefault({ status: 0, stdout: 'abc123 commit\n' });

    const retrosDir = path.join(root, '.ai/reports/retrospective');
    io.fs.mkDir(retrosDir, true);
    const oldRetro = `# Relatorio de Retrospectiva
## Dados Brutos
${JSON.stringify({ trends: { qualityGatesPassed: [5], violationsDetected: [2] }, qualityGatesRun: 5, qualityGatesPassed: 5, totalCommits: 10 })}`;
    io.fs.write(path.join(retrosDir, 'retro-2024-01-01.md'), oldRetro);

    const cmd = retrospectiveCommand();
    cmd.parse(['node', 'test', 'generate']);

    const files = io.fs.readDir(retrosDir);
    expect(files.length).toBeGreaterThan(1);
  });

  it('generate --since with tag specified', () => {
    const root = process.cwd();
    (io.shell as any)._setDefault({ status: 0, stdout: 'a1\nb2\nc3\n' });

    const cmd = retrospectiveCommand();
    cmd.parse(['node', 'test', 'generate', '--since', 'v2.0']);

    const retrosDir = path.join(root, '.ai/reports/retrospective');
    const files = io.fs.readDir(retrosDir);
    const reportContent = io.fs.read(path.join(retrosDir, files[0]), 'utf8');
    expect(reportContent).toContain('3 commits');
    expect(reportContent).toContain('since v2.0');
  });

  it('generate with git describe failure falls back to recent log', () => {
    const root = process.cwd();
    (io.shell as any)._setDefault({ status: 1, stdout: '' });

    const cmd = retrospectiveCommand();
    cmd.parse(['node', 'test', 'generate']);

    const retrosDir = path.join(root, '.ai/reports/retrospective');
    const files = io.fs.readDir(retrosDir);
    expect(files.length).toBeGreaterThan(0);
  });

  it('list with multiple retro files', () => {
    const root = process.cwd();
    const retrosDir = path.join(root, '.ai/reports/retrospective');
    io.fs.mkDir(retrosDir, true);
    io.fs.write(path.join(retrosDir, 'retro-2024-01-01.md'), '# retro 1');
    io.fs.write(path.join(retrosDir, 'retro-2024-06-01.md'), '# retro 2');

    const cmd = retrospectiveCommand();
    expect(() => cmd.parse(['node', 'test', 'list'])).not.toThrow();
  });
});
