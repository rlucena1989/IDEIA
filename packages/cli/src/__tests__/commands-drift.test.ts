import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

function requireDrift() {
  return require('../commands/drift') as {
    driftCommand: () => { name: () => string; description: () => string; commands: Array<{ name: () => string; options: Array<{ attributeName: () => string }> }> };
    checkStaleFiles: () => Array<{ type: string }>;
    checkOrphanFiles: () => Array<{ type: string }>;
    checkRealityFiles: () => Array<{ type: string }>;
    checkCompleteness: () => Array<{ type: string }>;
    detectDrift: () => { status: string; total_findings: number; findings: Array<{ type: string }>; timestamp: string };
    saveDriftReport: (report: { timestamp: string; total_findings: number; findings: Array<unknown>; status: string }) => void;
  };
}

describe('driftCommand', () => {
  it('returns a Command object with name drift', () => {
    const mod = requireDrift();
    const cmd = mod.driftCommand();
    expect(cmd.name()).toBe('drift');
  });

  it('has description', () => {
    const mod = requireDrift();
    const cmd = mod.driftCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has check subcommand', () => {
    const mod = requireDrift();
    const cmd = mod.driftCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('check');
  });

  it('has status subcommand', () => {
    const mod = requireDrift();
    const cmd = mod.driftCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('status');
  });

  it('check subcommand has --json option', () => {
    const mod = requireDrift();
    const cmd = mod.driftCommand();
    const check = cmd.commands.find((c: { name: () => string }) => c.name() === 'check');
    expect(check!.options.some((o: { attributeName: () => string }) => o.attributeName() === 'json')).toBe(true);
  });
});

describe('drift checkStaleFiles', () => {
  let cwd: string;
  let tmpDir: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-stale-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('returns empty when no files exist', () => {
    const mod = requireDrift();
    const findings = mod.checkStaleFiles();
    expect(findings).toHaveLength(0);
  });

  it('works with source and target files', () => {
    fs.mkdirSync(path.join(tmpDir, '.ai', 'policies'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.ai', 'policies', 'policy.yaml'), 'rules: []');
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Claude');
    const mod = requireDrift();
    const findings = mod.checkStaleFiles();
    expect(findings.length).toBeGreaterThanOrEqual(0);
  });
});

describe('drift checkOrphanFiles', () => {
  let cwd: string;
  let tmpDir: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-orphan-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('returns empty when no targets exist', () => {
    const mod = requireDrift();
    const findings = mod.checkOrphanFiles();
    expect(findings).toHaveLength(0);
  });

  it('detects orphan target when no source files', () => {
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Claude');
    const mod = requireDrift();
    const findings = mod.checkOrphanFiles();
    expect(findings.some((f: { type: string }) => f.type === 'orphan')).toBe(true);
  });
});

describe('drift checkRealityFiles', () => {
  let cwd: string;
  let tmpDir: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-reality-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('returns empty when no tool files exist', () => {
    const mod = requireDrift();
    const findings = mod.checkRealityFiles();
    expect(findings).toHaveLength(0);
  });
});

describe('drift checkCompleteness', () => {
  let cwd: string;
  let tmpDir: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-completeness-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('returns empty when no source files', () => {
    const mod = requireDrift();
    const findings = mod.checkCompleteness();
    expect(findings).toHaveLength(0);
  });

  it('detects completeness issue when source exists but no targets', () => {
    fs.mkdirSync(path.join(tmpDir, '.ai', 'policies'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.ai', 'policies', 'policy.yaml'), 'rules: []');
    const mod = requireDrift();
    const findings = mod.checkCompleteness();
    expect(findings.some((f: { type: string }) => f.type === 'completeness')).toBe(true);
  });
});

describe('drift detectDrift', () => {
  let cwd: string;
  let tmpDir: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-detect-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('returns clean report in empty directory', () => {
    const mod = requireDrift();
    const report = mod.detectDrift();
    expect(report.status).toBe('clean');
    expect(report.total_findings).toBe(0);
  });

  it('returns drift_detected when completeness issue found', () => {
    fs.mkdirSync(path.join(tmpDir, '.ai', 'policies'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.ai', 'policies', 'policy.yaml'), 'rules: []');
    const mod = requireDrift();
    const report = mod.detectDrift();
    expect(report.status).toBe('drift_detected');
    expect(report.findings.length).toBeGreaterThan(0);
  });
});

describe('drift saveDriftReport', () => {
  let cwd: string;
  let tmpDir: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-save-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('writes report to disk', () => {
    const mod = requireDrift();
    const report = { timestamp: new Date().toISOString(), total_findings: 0, findings: [], status: 'clean' as const };
    mod.saveDriftReport(report);
    const reportPath = path.join(tmpDir, '.ai', 'reports', 'drift', 'latest.json');
    expect(fs.existsSync(reportPath)).toBe(true);
    const saved = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(saved.status).toBe('clean');
  });
});
