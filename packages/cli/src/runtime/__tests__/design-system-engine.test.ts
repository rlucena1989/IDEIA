import { describe, it, expect, afterAll, beforeAll } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exportDesignTokens, getLayoutTemplates, DEFAULT_DESIGN_CONFIG } from '../design-system-engine';

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-engine-test-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('exportDesignTokens', () => {
  it('should export design tokens to all formats', () => {
    const result = exportDesignTokens(tmpDir, {
      outputDir: '.ai/design',
      formats: ['css', 'json', 'scss'],
      mergeProjectTokens: false,
    });
    expect(result.css).toContain(':root');
    expect(result.json).toContain('color-primary');
    expect(result.scss).toContain('$');
  });

  it('should export only requested formats', () => {
    const result = exportDesignTokens(tmpDir, {
      outputDir: '.ai/design',
      formats: ['css'],
      mergeProjectTokens: false,
    });
    expect(result.css).toBeTruthy();
    expect(result.json).toBeTruthy();
    expect(result.scss).toBeTruthy();
  });

  it('should create output directory', () => {
    const outDir = path.join(tmpDir, '.ai/design');
    expect(fs.existsSync(outDir)).toBe(true);
  });

  it('should write files to disk', () => {
    const cssPath = path.join(tmpDir, '.ai/design', 'design-system.css');
    expect(fs.existsSync(cssPath)).toBe(true);
    const content = fs.readFileSync(cssPath, 'utf8');
    expect(content).toContain(':root');
  });

  it('should merge project tokens when enabled', () => {
    fs.mkdirSync(path.join(tmpDir, '.ai', 'design'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.ai', 'design', 'tokens.json'),
      JSON.stringify([{ name: 'color-primary', value: '#ff0000', category: 'color', description: 'custom', tags: [] }]),
      'utf8',
    );
    const result = exportDesignTokens(tmpDir, {
      outputDir: '.ai/design',
      formats: ['json'],
      mergeProjectTokens: true,
    });
    const parsed = JSON.parse(result.json) as Record<string, string>;
    expect(parsed['color-primary']).toBe('#ff0000');
  });
});

describe('getLayoutTemplates', () => {
  it('should return array of layout templates', () => {
    const layouts = getLayoutTemplates();
    expect(layouts.length).toBeGreaterThan(0);
  });

  it('each layout should have required fields', () => {
    const layouts = getLayoutTemplates();
    for (const layout of layouts) {
      expect(layout).toHaveProperty('id');
      expect(layout).toHaveProperty('name');
      expect(layout).toHaveProperty('description');
      expect(layout).toHaveProperty('areas');
      expect(layout).toHaveProperty('columns');
      expect(layout).toHaveProperty('rows');
    }
  });

  it('should include sidebar-content layout', () => {
    const layouts = getLayoutTemplates();
    expect(layouts.some(l => l.id === 'sidebar-content')).toBe(true);
  });
});
