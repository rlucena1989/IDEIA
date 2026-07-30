import { describe, it, expect } from '@jest/globals';
import { buildConsistencyReport } from '../consistency-builder';

describe('consistency-builder', () => {
  it('buildConsistencyReport should be defined', () => {
    expect(buildConsistencyReport).toBeDefined();
  });

  it('should return a valid ConsistencyReport', () => {
    const report = buildConsistencyReport();
    expect(report).toBeDefined();
    expect(typeof report.generatedAt).toBe('string');
    expect(Array.isArray(report.items)).toBe(true);
    expect(Array.isArray(report.summary)).toBe(true);
  });

  it('should include governance area', () => {
    const report = buildConsistencyReport();
    const gov = report.items.find(i => i.area === 'Governança documental');
    expect(gov).toBeDefined();
    expect(gov!.status).toBe('ok');
  });

  it('should include hardening area', () => {
    const report = buildConsistencyReport();
    const hard = report.items.find(i => i.area === 'Hardening');
    expect(hard).toBeDefined();
    expect(hard!.status).toBe('attention');
  });

  it('should include active generation area', () => {
    const report = buildConsistencyReport();
    const gen = report.items.find(i => i.area === 'Geração ativa sob demanda');
    expect(gen).toBeDefined();
    expect(gen!.extension).toBe('missing');
  });

  it('each item should have valid status', () => {
    const report = buildConsistencyReport();
    for (const item of report.items) {
      expect(['ok', 'attention', 'blocked']).toContain(item.status);
    }
  });

  it('each item should have notes array', () => {
    const report = buildConsistencyReport();
    for (const item of report.items) {
      expect(Array.isArray(item.notes)).toBe(true);
    }
  });

  it('should have at least 5 items', () => {
    const report = buildConsistencyReport();
    expect(report.items.length).toBeGreaterThanOrEqual(5);
  });

  it('should have summary with strings', () => {
    const report = buildConsistencyReport();
    for (const line of report.summary) {
      expect(typeof line).toBe('string');
      expect(line.length).toBeGreaterThan(0);
    }
  });

  it('items should have all required fields', () => {
    const report = buildConsistencyReport();
    for (const item of report.items) {
      expect(item).toHaveProperty('area');
      expect(item).toHaveProperty('docs');
      expect(item).toHaveProperty('code');
      expect(item).toHaveProperty('tests');
      expect(item).toHaveProperty('cli');
      expect(item).toHaveProperty('extension');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('notes');
    }
  });

  it('generatedAt should be a valid ISO string', () => {
    const report = buildConsistencyReport();
    expect(() => new Date(report.generatedAt)).not.toThrow();
    expect(new Date(report.generatedAt).toISOString()).toBe(report.generatedAt);
  });
});
