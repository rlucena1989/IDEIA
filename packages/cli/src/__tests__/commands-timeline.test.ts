import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('commands - timeline', () => {
  let tmpDir: string;
  let originalCwd: () => string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-test-'));
    originalCwd = process.cwd;
    process.cwd = () => tmpDir as never;
  });

  afterEach(() => {
    process.cwd = originalCwd;
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    jest.resetModules();
  });

  it('timelineCommand retorna Command com subcomandos', () => {
    const { timelineCommand } = require('../commands/timeline');
    const cmd = timelineCommand();
    expect(cmd.name()).toBe('timeline');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('log');
    expect(names).toContain('verify');
    expect(names).toContain('search');
    expect(names).toContain('export');
    expect(names).toContain('replay');
  });

  it('logEvent registra e retorna entry com hash', () => {
    const { logEvent } = require('../commands/timeline');
    const entry = logEvent('test_event', 'test_actor', { key: 'value' });

    expect(entry.id).toBeTruthy();
    expect(entry.event_type).toBe('test_event');
    expect(entry.actor).toBe('test_actor');
    expect(entry.payload).toEqual({ key: 'value' });
    expect(entry.prev_hash).toBe('0'.repeat(64));
    expect(entry.hash).toBeTruthy();
    expect(entry.hash).not.toBe(entry.prev_hash);
  });

  it('logEvent encadeia hashes corretamente', () => {
    const { logEvent } = require('../commands/timeline');
    const e1 = logEvent('e1', 'a1', {});
    const e2 = logEvent('e2', 'a2', {});

    expect(e1.hash).toBeTruthy();
    expect(e2.prev_hash).toBe(e1.hash);
    expect(e2.hash).not.toBe(e1.hash);
  });

  it('verifyTimeline retorna valido para timeline vazia', () => {
    const { verifyTimeline } = require('../commands/timeline');
    const result = verifyTimeline();
    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(0);
    expect(result.brokenAt).toBe(-1);
  });

  it('verifyTimeline valida timeline valida', () => {
    const { logEvent, verifyTimeline } = require('../commands/timeline');
    logEvent('e1', 'a1', { n: 1 });
    logEvent('e2', 'a2', { n: 2 });

    const result = verifyTimeline();
    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(2);
  });

  it('verifyTimeline detecta adulteracao', () => {
    const { logEvent, verifyTimeline } = require('../commands/timeline');
    logEvent('e1', 'a1', { n: 1 });

    const tlPath = path.join(tmpDir, '.ai/audit/timeline.jsonl');
    const content = fs.readFileSync(tlPath, 'utf8');
    const lines = content.trim().split('\n');
    const tampered = lines.map(l => l.replace('e1', 'x1')).join('\n');
    fs.writeFileSync(tlPath, tampered);

    const result = verifyTimeline();
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBeGreaterThanOrEqual(0);
  });

  it('searchTimeline filtra por tipo', () => {
    const { logEvent, searchTimeline } = require('../commands/timeline');
    logEvent('type_a', 'a1', {});
    logEvent('type_b', 'a2', {});
    logEvent('type_a', 'a3', {});

    const results = searchTimeline('type_a');
    expect(results).toHaveLength(2);
  });

  it('searchTimeline filtra por since', () => {
    const { logEvent, searchTimeline } = require('../commands/timeline');
    logEvent('t1', 'a1', {});

    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();

    expect(searchTimeline(undefined, past)).toHaveLength(1);
    expect(searchTimeline(undefined, future)).toHaveLength(0);
  });

  it('exportTimeline retorna todas as entradas', () => {
    const { logEvent, exportTimeline } = require('../commands/timeline');
    logEvent('e1', 'a1', {});
    logEvent('e2', 'a2', {});

    const entries = exportTimeline();
    expect(entries).toHaveLength(2);
  });

  it('exportTimeline retorna vazio se nao ha arquivo', () => {
    const { exportTimeline } = require('../commands/timeline');
    expect(exportTimeline()).toEqual([]);
  });

  it('logEvent cria diretorio automaticamente', () => {
    const { logEvent } = require('../commands/timeline');
    const entry = logEvent('test', 'actor', {});
    expect(entry).toBeDefined();

    const tlDir = path.join(tmpDir, '.ai/audit');
    expect(fs.existsSync(tlDir)).toBe(true);
    expect(fs.existsSync(path.join(tlDir, 'timeline.jsonl'))).toBe(true);
  });
});
