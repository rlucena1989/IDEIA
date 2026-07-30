import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('hardening - state-sync', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-test-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('syncStateToFile escreve estado no arquivo', () => {
    const { syncStateToFile } = require('../hardening/state-sync');
    const state = {
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      summary: 'Test state',
      blocks: [],
      metrics: [],
      artifacts: [],
      commands: [],
      blockers: [],
      nextSteps: [],
    };

    const outputPath = path.join(tmpDir, 'state.json');
    const result = syncStateToFile(state, outputPath);

    expect(result.written).toBe(true);
    expect(result.path).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    expect(content.version).toBe('1.0.0');
    expect(content.summary).toBe('Test state');
  });

  it('syncStateToFile cria diretorios intermediarios', () => {
    const { syncStateToFile } = require('../hardening/state-sync');
    const state = { version: '1', lastUpdated: '', summary: '', blocks: [], metrics: [], artifacts: [], commands: [], blockers: [], nextSteps: [] };
    const nestedPath = path.join(tmpDir, 'deep', 'nested', 'dir', 'state.json');

    const result = syncStateToFile(state, nestedPath);
    expect(result.written).toBe(true);
    expect(fs.existsSync(nestedPath)).toBe(true);
  });

  it('syncStateToFile retorna erro quando path e invalido', () => {
    const { syncStateToFile } = require('../hardening/state-sync');
    const state = { version: '1', lastUpdated: '', summary: '', blocks: [], metrics: [], artifacts: [], commands: [], blockers: [], nextSteps: [] };

    const result = syncStateToFile(state, '');
    expect(result.written).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('getDefaultStatePath retorna caminho padrao', () => {
    const { getDefaultStatePath } = require('../hardening/state-sync');
    const cwd = '/test/project';
    const result = getDefaultStatePath(cwd);
    expect(result).toBe(path.join(cwd, '.ai', 'state.json'));
  });

  it('syncStateToFile serializa JSON corretamente', () => {
    const { syncStateToFile } = require('../hardening/state-sync');
    const state = {
      version: '2.0.0',
      lastUpdated: '2024-06-15T10:00:00Z',
      summary: 'Complex state',
      blocks: [{ id: 'b1', title: 'Block 1', status: 'done' as const, summary: 'Done', evidence: ['file.test.ts'] }],
      metrics: [{ name: 'coverage', value: 85, unit: '%', description: 'Test coverage' }],
      artifacts: [{ path: 'dist/', purpose: 'Build output', status: 'present' as const }],
      commands: [{ command: 'build', purpose: 'Build project', status: 'active' as const }],
      blockers: [],
      nextSteps: ['Improve coverage'],
    };

    const outputPath = path.join(tmpDir, 'state.json');
    syncStateToFile(state, outputPath);

    const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0].id).toBe('b1');
    expect(parsed.metrics[0].value).toBe(85);
    expect(parsed.artifacts[0].path).toBe('dist/');
    expect(parsed.commands[0].command).toBe('build');
  });
});
