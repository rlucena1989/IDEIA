import { AuditExporter } from '../src/exporter';
import fs from 'fs';
import path from 'path';
import os from 'os';

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: 'evt-001',
    timestamp: '2026-07-26T00:00:00.000Z',
    actor: 'test-user',
    eventType: 'test',
    target: '/test/path',
    decision: 'allow',
    result: 'success',
    approvalStatus: 'approved',
    previousHash: 'abc123',
    metadata: { key: 'value' },
    ...overrides,
  } as any;
}

const testConfig = () => ({ outputDir: '', maxEntries: 100, defaultFormat: 'json' as const });

describe('AuditExporter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-exporter-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('exportToJson returns result with filtered entries', () => {
    const exporter = new AuditExporter({ ...testConfig(), outputDir: tmpDir });
    const entries = [makeEvent({ eventId: '1' }), makeEvent({ eventId: '2' })];
    const result = exporter.exportToJson(entries);
    expect(result.format).toBe('json');
    expect(result.entries).toBe(2);
  });

  test('exportToJson applies filter', () => {
    const exporter = new AuditExporter({ ...testConfig(), outputDir: tmpDir });
    const entries = [
      makeEvent({ eventId: '1', eventType: 'create' }),
      makeEvent({ eventId: '2', eventType: 'delete' }),
    ];
    const result = exporter.exportToJson(entries, { eventType: 'create' });
    expect(result.entries).toBe(1);
  });

  test('exportToJson respects maxEntries', () => {
    const exporter = new AuditExporter({ ...testConfig(), outputDir: tmpDir, maxEntries: 1 });
    const entries = [makeEvent({ eventId: '1' }), makeEvent({ eventId: '2' })];
    const result = exporter.exportToJson(entries);
    expect(result.entries).toBe(1);
  });

  test('exportToJson writes file when writeToFile is true', () => {
    const exporter = new AuditExporter({ ...testConfig(), outputDir: tmpDir });
    const entries = [makeEvent()];
    const result = exporter.exportToJson(entries, undefined, true);
    expect(result.filePath).toBeDefined();
    expect(fs.existsSync(result.filePath!)).toBe(true);
    const content = JSON.parse(fs.readFileSync(result.filePath!, 'utf-8'));
    expect(content).toHaveLength(1);
    expect(content[0].eventId).toBe('evt-001');
  });

  test('exportToCsv returns CSV formatted data', () => {
    const exporter = new AuditExporter({ ...testConfig(), outputDir: tmpDir });
    const entries = [makeEvent()];
    const result = exporter.exportToCsv(entries);
    expect(result.format).toBe('csv');
    expect(result.entries).toBe(1);
  });

  test('exportToCsv escapes special characters', () => {
    const exporter = new AuditExporter({ ...testConfig(), outputDir: tmpDir });
    const entries = [makeEvent({ actor: 'user,name' })];
    const result = exporter.exportToCsv(entries, undefined, true);
    expect(result.filePath).toBeDefined();
    const content = fs.readFileSync(result.filePath!, 'utf-8');
    expect(content).toContain('"user,name"');
  });

  test('exportToHtml generates valid HTML', () => {
    const exporter = new AuditExporter({ ...testConfig(), outputDir: tmpDir });
    const entries = [makeEvent()];
    const result = exporter.exportToHtml(entries, undefined, true);
    expect(result.filePath).toBeDefined();
    const content = fs.readFileSync(result.filePath!, 'utf-8');
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('evt-001');
    expect(content).toContain('Audit Trail Export');
  });

  test('exportToHtml escapes HTML entities', () => {
    const exporter = new AuditExporter({ ...testConfig(), outputDir: tmpDir });
    const entries = [makeEvent({ target: '<script>alert(1)</script>' })];
    const result = exporter.exportToHtml(entries, undefined, true);
    const content = fs.readFileSync(result.filePath!, 'utf-8');
    expect(content).not.toContain('<script>');
    expect(content).toContain('&lt;script&gt;');
  });

  test('returns zero entries for empty input', () => {
    const exporter = new AuditExporter({ ...testConfig(), outputDir: tmpDir });
    const result = exporter.exportToJson([]);
    expect(result.entries).toBe(0);
  });

  test('filter by startDate works', () => {
    const exporter = new AuditExporter({ ...testConfig(), outputDir: tmpDir });
    const entries = [
      makeEvent({ eventId: '1', timestamp: '2026-01-01T00:00:00.000Z' }),
      makeEvent({ eventId: '2', timestamp: '2026-06-01T00:00:00.000Z' }),
    ];
    const result = exporter.exportToJson(entries, { startDate: '2026-03-01T00:00:00.000Z' });
    expect(result.entries).toBe(1);
  });

  test('filter by endDate works', () => {
    const exporter = new AuditExporter({ ...testConfig(), outputDir: tmpDir });
    const entries = [
      makeEvent({ eventId: '1', timestamp: '2026-01-01T00:00:00.000Z' }),
      makeEvent({ eventId: '2', timestamp: '2026-06-01T00:00:00.000Z' }),
    ];
    const result = exporter.exportToJson(entries, { endDate: '2026-03-01T00:00:00.000Z' });
    expect(result.entries).toBe(1);
  });

  test('filter by actor works', () => {
    const exporter = new AuditExporter({ ...testConfig(), outputDir: tmpDir });
    const entries = [makeEvent({ actor: 'alice' }), makeEvent({ actor: 'bob' })];
    const result = exporter.exportToJson(entries, { actor: 'alice' });
    expect(result.entries).toBe(1);
  });

  test('filter by target works', () => {
    const exporter = new AuditExporter({ ...testConfig(), outputDir: tmpDir });
    const entries = [makeEvent({ target: '/a' }), makeEvent({ target: '/b' })];
    const result = exporter.exportToJson(entries, { target: '/a' });
    expect(result.entries).toBe(1);
  });
});
