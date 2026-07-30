import { describe, it, expect } from '@jest/globals';
import { generateContextReport, focusModule } from '../context-lens';
import path from 'node:path';

describe('generateContextReport', () => {
  it('should return a report with expected shape', () => {
    const report = generateContextReport(process.cwd());
    expect(report).toHaveProperty('totalFiles');
    expect(report).toHaveProperty('totalSymbols');
    expect(report).toHaveProperty('languages');
    expect(report).toHaveProperty('topModules');
    expect(report).toHaveProperty('recentChanges');
    expect(report).toHaveProperty('exports');
    expect(typeof report.totalFiles).toBe('number');
    expect(typeof report.totalSymbols).toBe('number');
  });

  it('should include languages detected', () => {
    const report = generateContextReport(process.cwd());
    expect(Array.isArray(report.languages)).toBe(true);
  });

  it('should find top modules', () => {
    const report = generateContextReport(process.cwd());
    expect(Array.isArray(report.topModules)).toBe(true);
    if (report.topModules.length > 0) {
      expect(report.topModules[0]).toHaveProperty('path');
      expect(report.topModules[0]).toHaveProperty('symbolCount');
    }
  });

  it('totalExports should be <= totalSymbols', () => {
    const report = generateContextReport(process.cwd());
    expect(report.exports).toBeLessThanOrEqual(report.totalSymbols);
  });
});

describe('focusModule', () => {
  it('should return module focus with symbols and dependencies', () => {
    const focus = focusModule(process.cwd(), 'src');
    expect(focus).toHaveProperty('path');
    expect(focus).toHaveProperty('symbols');
    expect(focus).toHaveProperty('dependencies');
    expect(Array.isArray(focus.symbols)).toBe(true);
    expect(Array.isArray(focus.dependencies)).toBe(true);
  });

  it('should normalize path separators', () => {
    const focus = focusModule(process.cwd(), 'src\\runtime');
    expect(focus.path).not.toContain('\\');
  });

  it('should handle non-existent module path', () => {
    const focus = focusModule(process.cwd(), 'nonexistent-dir-xyz');
    expect(focus.symbols).toEqual([]);
    expect(focus.dependencies).toEqual([]);
  });
});
