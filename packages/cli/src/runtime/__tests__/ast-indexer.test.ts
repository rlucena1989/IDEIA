import { describe, it, expect, afterAll, beforeAll } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { indexWorkspace, querySymbols, getExports, indexToJSON, SymbolEntry } from '../ast-indexer';

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ast-indexer-test-'));
  fs.writeFileSync(path.join(tmpDir, 'index.ts'), 'export function hello() { return 1; }\nexport class Greeter { greet() {} }\nexport interface Person { name: string; }', 'utf8');
  fs.writeFileSync(path.join(tmpDir, 'constants.ts'), 'export const PI = 3.14;\nexport type Callback = () => void;', 'utf8');
  fs.writeFileSync(path.join(tmpDir, 'utils.test.ts'), 'test("dummy", () => { expect(1).toBe(1); })', 'utf8');
  fs.mkdirSync(path.join(tmpDir, 'subdir'));
  fs.writeFileSync(path.join(tmpDir, 'subdir', 'helper.ts'), 'export function helper() {}', 'utf8');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('indexWorkspace', () => {
  it('should index TypeScript files and find symbols', () => {
    const result = indexWorkspace(tmpDir);
    expect(result.filesScanned).toBeGreaterThanOrEqual(3);
    expect(result.symbols.length).toBeGreaterThanOrEqual(5);
    expect(result.errors).toEqual([]);
  });

  it('should find functions with export keyword', () => {
    const result = indexWorkspace(tmpDir);
    const fns = result.symbols.filter(s => s.type === 'function');
    expect(fns.length).toBeGreaterThanOrEqual(2);
    expect(fns.some(s => s.name === 'hello')).toBe(true);
  });

  it('should find classes', () => {
    const result = indexWorkspace(tmpDir);
    const classes = result.symbols.filter(s => s.type === 'class');
    expect(classes.some(s => s.name === 'Greeter')).toBe(true);
  });

  it('should track durationMs', () => {
    const result = indexWorkspace(tmpDir);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('querySymbols', () => {
  const symbols: SymbolEntry[] = [
    { name: 'hello', type: 'function', file: 'index.ts', line: 1, language: 'typescript', exported: true },
    { name: 'Greeter', type: 'class', file: 'index.ts', line: 2, language: 'typescript', exported: true },
    { name: 'PI', type: 'const', file: 'constants.ts', line: 1, language: 'typescript', exported: true },
  ];

  it('should find symbols by name', () => {
    expect(querySymbols(symbols, 'hello')).toHaveLength(1);
  });

  it('should find symbols by file', () => {
    expect(querySymbols(symbols, 'constants')).toHaveLength(1);
  });

  it('should find symbols by type', () => {
    expect(querySymbols(symbols, 'function')).toHaveLength(1);
  });

  it('should be case insensitive', () => {
    expect(querySymbols(symbols, 'HELLO')).toHaveLength(1);
  });

  it('should return empty for no match', () => {
    expect(querySymbols(symbols, 'nonexistent')).toHaveLength(0);
  });
});

describe('getExports', () => {
  it('should filter exported symbols', () => {
    const symbols: SymbolEntry[] = [
      { name: 'hello', type: 'function', file: 'a.ts', line: 1, language: 'typescript', exported: true },
      { name: 'internal', type: 'function', file: 'a.ts', line: 2, language: 'typescript', exported: false },
    ];
    const exports = getExports(symbols);
    expect(exports).toHaveLength(1);
    expect(exports[0].name).toBe('hello');
  });
});

describe('indexToJSON', () => {
  it('should produce valid JSON string', () => {
    const symbols: SymbolEntry[] = [
      { name: 'test', type: 'function', file: 'test.ts', line: 1, language: 'typescript', exported: true },
    ];
    const json = indexToJSON(symbols);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('test');
  });

  it('should handle empty array', () => {
    expect(indexToJSON([])).toBe('[]');
  });
});
