import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

type FeatureModule = {
  featureCommand: () => { name: () => string; description: () => string; commands: Array<{ name: () => string; options: Array<{ attributeName: () => string }> }> };
  slugify: (text: string) => string;
  ensureDir: (dirPath: string) => void;
  generateArtifact: (filePath: string, content: string) => void;
  featureAnalyzeAction: (request: string, options: { ui?: boolean }) => void;
};

describe('feature command', () => {
  let cwd: string;
  let tmpDir: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('returns a Command object with name feature', () => {
    const mod = require('../commands/feature') as FeatureModule;
    const cmd = mod.featureCommand();
    expect(cmd.name()).toBe('feature');
  });

  it('has description', () => {
    const mod = require('../commands/feature') as FeatureModule;
    const cmd = mod.featureCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has analyze subcommand', () => {
    const mod = require('../commands/feature') as FeatureModule;
    const cmd = mod.featureCommand();
    const names = cmd.commands.map(c => c.name());
    expect(names).toContain('analyze');
  });
});

describe('slugify', () => {
  it('converts text to slug', () => {
    const mod = jest.requireActual('../commands/feature') as FeatureModule;
    expect(mod.slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    const mod = jest.requireActual('../commands/feature') as FeatureModule;
    expect(mod.slugify('Feature: login page!')).toBe('feature-login-page');
  });

  it('handles empty string', () => {
    const mod = jest.requireActual('../commands/feature') as FeatureModule;
    expect(mod.slugify('')).toBe('');
  });
});

describe('ensureDir', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ensure-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('creates directory if it does not exist', () => {
    const mod = jest.requireActual('../commands/feature') as FeatureModule;
    const dirPath = path.join(tmpDir, 'nested', 'dir');
    mod.ensureDir(dirPath);
    expect(fs.existsSync(dirPath)).toBe(true);
  });

  it('does not throw if directory exists', () => {
    const mod = jest.requireActual('../commands/feature') as FeatureModule;
    mod.ensureDir(tmpDir);
    expect(fs.existsSync(tmpDir)).toBe(true);
  });
});

describe('generateArtifact', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('writes file with trimmed content', () => {
    const mod = jest.requireActual('../commands/feature') as FeatureModule;
    const filePath = path.join(tmpDir, 'test.md');
    mod.generateArtifact(filePath, '  content  ');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toBe('content\n');
  });
});

describe('featureAnalyzeAction', () => {
  let tmpDir: string;
  let cwd: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-analyze-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('generates feature brief and acceptance criteria', () => {
    const mod = require('../commands/feature') as FeatureModule;
    mod.featureAnalyzeAction('user login', {});
    const featureDir = path.join(tmpDir, '.ai', 'features', 'user-login');
    expect(fs.existsSync(path.join(featureDir, 'feature-brief.md'))).toBe(true);
    expect(fs.existsSync(path.join(featureDir, 'acceptance-criteria.md'))).toBe(true);
    expect(fs.existsSync(path.join(featureDir, 'test-matrix.md'))).toBe(true);
  });

  it('generates UI checklist when --ui flag set', () => {
    const mod = require('../commands/feature') as FeatureModule;
    mod.featureAnalyzeAction('create dashboard', { ui: true });
    const featureDir = path.join(tmpDir, '.ai', 'features', 'create-dashboard');
    expect(fs.existsSync(path.join(featureDir, 'ui-checklist.md'))).toBe(true);
  });

  it('detects UI intent from request text', () => {
    const mod = require('../commands/feature') as FeatureModule;
    mod.featureAnalyzeAction('new interface for users', {});
    const featureDir = path.join(tmpDir, '.ai', 'features', 'new-interface-for');
    expect(fs.existsSync(path.join(featureDir, 'ui-checklist.md'))).toBe(true);
  });
});
