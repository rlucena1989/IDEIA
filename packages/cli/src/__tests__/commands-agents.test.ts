import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

function requireAgents() {
  return require('../commands/agents') as {
    agentsCommand: () => { name: () => string; description: () => string; commands: Array<{ name: () => string; options: Array<{ attributeName: () => string }> }> };
    listAgents: () => Array<{ name: string; can_write: boolean }>;
    getAgent: (name: string) => { name: string; can_write: boolean; description: string; context_profile: string; read_paths: string[]; write_paths: string[]; forbidden_paths: string[] } | null;
    validateAgentPermissions: () => { valid: boolean; violations: string[] };
    initRegistry: () => void;
  };
}

describe('agentsCommand', () => {
  it('returns a Command object with name agents', () => {
    const mod = requireAgents();
    const cmd = mod.agentsCommand();
    expect(cmd.name()).toBe('agents');
  });

  it('has description', () => {
    const mod = requireAgents();
    const cmd = mod.agentsCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has list subcommand', () => {
    const mod = requireAgents();
    const cmd = mod.agentsCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('list');
  });

  it('has validate subcommand', () => {
    const mod = requireAgents();
    const cmd = mod.agentsCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('validate');
  });

  it('has init subcommand', () => {
    const mod = requireAgents();
    const cmd = mod.agentsCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('init');
  });

  it('has show subcommand', () => {
    const mod = requireAgents();
    const cmd = mod.agentsCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('show');
  });

  it('has run subcommand', () => {
    const mod = requireAgents();
    const cmd = mod.agentsCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('run');
  });

  it('has conversation subcommand', () => {
    const mod = requireAgents();
    const cmd = mod.agentsCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('conversation');
  });

  it('list subcommand has --json option', () => {
    const mod = requireAgents();
    const cmd = mod.agentsCommand();
    const list = cmd.commands.find((c: { name: () => string }) => c.name() === 'list');
    expect(list!.options.some((o: { attributeName: () => string }) => o.attributeName() === 'json')).toBe(true);
  });
});

describe('listAgents', () => {
  let cwd: string;
  let tmpDir: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-list-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('returns default agents when no registry exists', () => {
    const mod = requireAgents();
    const agents = mod.listAgents();
    expect(agents.length).toBeGreaterThanOrEqual(6);
    expect(agents.some((a: { name: string }) => a.name === 'planner')).toBe(true);
    expect(agents.some((a: { name: string }) => a.name === 'engineer')).toBe(true);
    expect(agents.some((a: { name: string }) => a.name === 'qa')).toBe(true);
  });
});

describe('getAgent', () => {
  let cwd: string;
  let tmpDir: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-get-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('returns agent by name', () => {
    const mod = requireAgents();
    const agent = mod.getAgent('engineer');
    expect(agent).not.toBeNull();
    expect(agent!.name).toBe('engineer');
    expect(agent!.can_write).toBe(true);
  });

  it('returns null for unknown agent', () => {
    const mod = requireAgents();
    const agent = mod.getAgent('nonexistent');
    expect(agent).toBeNull();
  });
});

describe('validateAgentPermissions', () => {
  it('validates default agents have valid permissions', () => {
    const mod = requireAgents();
    const result = mod.validateAgentPermissions();
    expect(result.valid).toBe(true);
  });
});

describe('initRegistry', () => {
  let cwd: string;
  let tmpDir: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-init-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('creates registry file with default agents', () => {
    const mod = requireAgents();
    mod.initRegistry();
    const regPath = path.join(tmpDir, '.ai', 'agents', 'registry.yaml');
    expect(fs.existsSync(regPath)).toBe(true);
    const content = fs.readFileSync(regPath, 'utf8');
    expect(content).toContain('planner');
    expect(content).toContain('engineer');
    expect(content).toContain('reviewer');
  });
});
