import { generateSetupReport } from '../utils/report';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('report - generateSetupReport', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('deve gerar relatório de setup em markdown', () => {
    const options = { dryRun: false, flavor: 'default', force: false };
    const copyResult = { copied: ['file1.txt', 'file2.txt'], skipped: [], overwritten: [], backedUp: [] };
    const scriptResult = { added: ['ai:verify', 'ai:status'], preserved: ['build'], overwritten: [] };

    generateSetupReport(tempDir, options, copyResult, scriptResult, '/templates/.ai');

    const reportPath = path.join(tempDir, '.ai', 'setup-report.md');
    expect(fs.existsSync(reportPath)).toBe(true);

    const content = fs.readFileSync(reportPath, 'utf8');
    expect(content).toContain('# AI-DevKit Setup Report');
    expect(content).toContain('Target directory:');
    expect(content).toContain('Source template:');
    expect(content).toContain('Flavor: default');
    expect(content).toContain('Mode: safe');
    expect(content).toContain('Created: 2');
    expect(content).toContain('Skipped: 0');
    expect(content).toContain('Added: ai:verify, ai:status');
    expect(content).toContain('Preserved: build');
  });

  it('deve criar diretório .ai se não existir', () => {
    const options = { dryRun: false, flavor: 'default', force: false };
    const copyResult = { copied: [], skipped: [], overwritten: [], backedUp: [] };
    const scriptResult = { added: [], preserved: [], overwritten: [] };

    generateSetupReport(tempDir, options, copyResult, scriptResult, '/templates/.ai');

    expect(fs.existsSync(path.join(tempDir, '.ai'))).toBe(true);
  });

  it('deve pular geração em modo dry-run', () => {
    const options = { dryRun: true, flavor: 'default', force: false };
    const copyResult = { copied: [], skipped: [], overwritten: [], backedUp: [] };
    const scriptResult = { added: [], preserved: [], overwritten: [] };

    generateSetupReport(tempDir, options, copyResult, scriptResult, '/templates/.ai');

    const reportPath = path.join(tempDir, '.ai', 'setup-report.md');
    expect(fs.existsSync(reportPath)).toBe(false);
  });

  it('deve incluir informações de backup quando houver', () => {
    const options = { dryRun: false, flavor: 'default', force: true };
    const copyResult = {
      copied: [],
      skipped: [],
      overwritten: ['file.txt'],
      backedUp: [path.join(tempDir, 'backups', 'file.txt')]
    };
    const scriptResult = { added: [], preserved: [], overwritten: [] };

    generateSetupReport(tempDir, options, copyResult, scriptResult, '/templates/.ai');

    const content = fs.readFileSync(path.join(tempDir, '.ai', 'setup-report.md'), 'utf8');
    expect(content).toContain('Backed up: 1');
    expect(content).toContain('Backup root:');
    expect(content).toContain('Mode: force');
  });

  it('deve incluir versão do CLI e Node', () => {
    const options = { dryRun: false, flavor: 'default', force: false };
    const copyResult = { copied: [], skipped: [], overwritten: [], backedUp: [] };
    const scriptResult = { added: [], preserved: [], overwritten: [] };

    generateSetupReport(tempDir, options, copyResult, scriptResult, '/templates/.ai');

    const content = fs.readFileSync(path.join(tempDir, '.ai', 'setup-report.md'), 'utf8');
    expect(content).toContain('CLI version:');
    expect(content).toContain('Node version:');
  });

  it('deve incluir próximos passos', () => {
    const options = { dryRun: false, flavor: 'default', force: false };
    const copyResult = { copied: [], skipped: [], overwritten: [], backedUp: [] };
    const scriptResult = { added: [], preserved: [], overwritten: [] };

    generateSetupReport(tempDir, options, copyResult, scriptResult, '/templates/.ai');

    const content = fs.readFileSync(path.join(tempDir, '.ai', 'setup-report.md'), 'utf8');
    expect(content).toContain('Next steps');
    expect(content).toContain('npm run ai:doctor');
    expect(content).toContain('npm run ai:verify');
  });
});
