import {
  levenshteinDistance,
  filenameSimilarity,
  extractWords,
  jaccardSimilarity,
  contentSimilarity,
  extractSignatures,
  functionSimilarity,
  scanForDuplicateFiles,
  scanForDuplicateFunctions,
  generateRecommendations,
  formatDuplicationReport,
  FunctionSignature,
} from '../duplication';

describe('levenshteinDistance', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('should return length for empty vs string', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });

  it('should return 1 for single character difference', () => {
    expect(levenshteinDistance('cat', 'car')).toBe(1);
  });

  it('should return correct distance for different strings', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('should handle empty strings', () => {
    expect(levenshteinDistance('', '')).toBe(0);
  });
});

describe('filenameSimilarity', () => {
  it('should return 1 for identical filenames', () => {
    expect(filenameSimilarity('user.ts', 'user.ts')).toBe(1);
  });

  it('should return 1 for same name different extension', () => {
    expect(filenameSimilarity('user.ts', 'user.tsx')).toBe(1);
  });

  it('should return 1 for same name different path', () => {
    expect(filenameSimilarity('src/user.ts', 'lib/user.ts')).toBe(1);
  });

  it('should return less than 1 for different names', () => {
    const sim = filenameSimilarity('user.ts', 'users.ts');
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it('should return 1 for both empty-ish strings', () => {
    expect(filenameSimilarity('x.ts', 'x.ts')).toBe(1);
  });
});

describe('extractWords', () => {
  it('should extract words of length >= 3', () => {
    const words = extractWords('function hello world is');
    expect(words.has('function')).toBe(true);
    expect(words.has('hello')).toBe(true);
    expect(words.has('world')).toBe(true);
    expect(words.has('is')).toBe(false);
  });

  it('should handle empty content', () => {
    const words = extractWords('');
    expect(words.size).toBe(0);
  });

  it('should deduplicate words', () => {
    const words = extractWords('hello hello hello');
    expect(words.size).toBe(1);
  });
});

describe('jaccardSimilarity', () => {
  it('should return 1 for identical sets', () => {
    const a = new Set(['a', 'b', 'c']);
    expect(jaccardSimilarity(a, a)).toBe(1);
  });

  it('should return 0 for disjoint sets', () => {
    const a = new Set(['a', 'b']);
    const b = new Set(['c', 'd']);
    expect(jaccardSimilarity(a, b)).toBe(0);
  });

  it('should return correct intersection/union ratio', () => {
    const a = new Set(['a', 'b', 'c']);
    const b = new Set(['a', 'b', 'd']);
    expect(jaccardSimilarity(a, b)).toBe(2 / 4);
  });

  it('should return 0 for empty sets', () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(0);
  });
});

describe('contentSimilarity', () => {
  it('should return 1 for identical content', () => {
    expect(contentSimilarity('function foo bar', 'function foo bar')).toBe(1);
  });

  it('should return less than 1 for different content', () => {
    const sim = contentSimilarity('function doSomething important', 'const x = 42');
    expect(sim).toBeLessThan(1);
  });

  it('should return 0 for empty vs non-empty', () => {
    expect(contentSimilarity('', 'hello world test')).toBe(0);
  });
});

describe('extractSignatures', () => {
  it('should extract exported function', () => {
    const sigs = extractSignatures('export function hello(a: string, b: number) {\n  return a;\n}', 'test.ts');
    expect(sigs.length).toBe(1);
    expect(sigs[0].name).toBe('hello');
    expect(sigs[0].type).toBe('function');
    expect(sigs[0].params).toContain('a: string');
    expect(sigs[0].file).toBe('test.ts');
  });

  it('should extract class definition', () => {
    const sigs = extractSignatures('export class UserService {\n  getName() {}\n}', 'test.ts');
    expect(sigs.some(s => s.type === 'class')).toBe(true);
  });

  it('should extract arrow function', () => {
    const sigs = extractSignatures('export const handler = (req, res) => {\n  return res;\n};', 'test.ts');
    expect(sigs.some(s => s.type === 'arrow')).toBe(true);
  });

  it('should handle empty content', () => {
    expect(extractSignatures('', 'empty.ts')).toEqual([]);
  });

  it('should extract async function', () => {
    const sigs = extractSignatures('export async function fetchData(url: string) {\n  return data;\n}', 'test.ts');
    expect(sigs.some(s => s.name === 'fetchData')).toBe(true);
  });
});

describe('functionSimilarity', () => {
  it('should return 1 for identical name and type', () => {
    const a: FunctionSignature = { name: 'foo', type: 'function', file: 'a.ts', line: 1, params: ['x'] };
    const b: FunctionSignature = { name: 'foo', type: 'function', file: 'b.ts', line: 1, params: ['x'] };
    expect(functionSimilarity(a, b)).toBe(1);
  });

  it('should return less than 1 for different name', () => {
    const a: FunctionSignature = { name: 'foo', type: 'function', file: 'a.ts', line: 1, params: ['x'] };
    const b: FunctionSignature = { name: 'bar', type: 'function', file: 'b.ts', line: 1, params: ['x'] };
    expect(functionSimilarity(a, b)).toBeLessThan(1);
  });

  it('should consider type match in similarity', () => {
    const a: FunctionSignature = { name: 'foo', type: 'function', file: 'a.ts', line: 1, params: ['x'] };
    const b: FunctionSignature = { name: 'foo', type: 'arrow', file: 'b.ts', line: 1, params: ['x'] };
    const simDiffType = functionSimilarity(a, b);
    const c: FunctionSignature = { name: 'foo', type: 'function', file: 'b.ts', line: 1, params: ['x'] };
    const simSameType = functionSimilarity(a, c);
    expect(simSameType).toBeGreaterThan(simDiffType);
  });
});

describe('scanForDuplicateFiles', () => {
  it('should detect identical filenames', () => {
    const files = ['src/user.ts', 'lib/user.ts'];
    const contents = new Map<string, string>([
      ['src/user.ts', 'function a() {}'],
      ['lib/user.ts', 'function b() {}'],
    ]);
    const groups = scanForDuplicateFiles(files, contents);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].type).toBe('filename');
  });

  it('should detect content similarity', () => {
    const files = ['src/a.ts', 'src/b.ts'];
    const contents = new Map<string, string>([
      ['src/a.ts', 'function doSomething() { return 42; }'],
      ['src/b.ts', 'function doSomething() { return 42; }'],
    ]);
    const groups = scanForDuplicateFiles(files, contents, { minFilenameSimilarity: 1, minContentSimilarity: 0.5 });
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].type).toBe('content');
  });

  it('should return empty for unique files', () => {
    const files = ['src/a.ts', 'src/b.ts'];
    const contents = new Map<string, string>([
      ['src/a.ts', 'function alpha() { return 1; }'],
      ['src/b.ts', 'function beta() { return 2; }'],
    ]);
    const groups = scanForDuplicateFiles(files, contents, { minContentSimilarity: 0.99 });
    expect(groups).toEqual([]);
  });

  it('should handle empty file list', () => {
    const groups = scanForDuplicateFiles([], new Map());
    expect(groups).toEqual([]);
  });
});

describe('scanForDuplicateFunctions', () => {
  it('should detect duplicate functions across files', () => {
    const files = ['src/a.ts', 'src/b.ts'];
    const contents = new Map<string, string>([
      ['src/a.ts', 'export function calculate(x: number, y: number) { return x + y; }'],
      ['src/b.ts', 'export function calculate(x: number, y: number) { return x * y; }'],
    ]);
    const results = scanForDuplicateFunctions(files, contents, { minFunctionSimilarity: 0.5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].signatureA.name).toBe('calculate');
    expect(results[0].signatureB.name).toBe('calculate');
  });

  it('should skip same-file signatures', () => {
    const files = ['src/a.ts'];
    const contents = new Map<string, string>([
      ['src/a.ts', 'export function foo() {}\nexport function foo() {}'],
    ]);
    const results = scanForDuplicateFunctions(files, contents);
    expect(results.length).toBe(0);
  });

  it('should return empty for no matches', () => {
    const files = ['src/a.ts', 'src/b.ts'];
    const contents = new Map<string, string>([
      ['src/a.ts', 'export function foo() {}'],
      ['src/b.ts', 'export function bar() {}'],
    ]);
    const results = scanForDuplicateFunctions(files, contents, { minFunctionSimilarity: 0.99 });
    expect(results).toEqual([]);
  });

  it('should handle missing file contents', () => {
    const files = ['src/a.ts', 'src/b.ts'];
    const contents = new Map<string, string>();
    const results = scanForDuplicateFunctions(files, contents);
    expect(results).toEqual([]);
  });
});

describe('generateRecommendations', () => {
  it('should return recommendation for duplicate files', () => {
    const groups = [{
      files: ['src/user.ts', 'src/admin.ts'],
      similarity: 0.85,
      type: 'content' as const,
      pairs: [{ fileA: 'src/user.ts', fileB: 'src/admin.ts', similarity: 0.85, type: 'content' as const, linesA: 10, linesB: 10 }],
    }];
    const recs = generateRecommendations(groups, []);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]).toContain('duplicados');
  });

  it('should return recommendation for duplicate functions', () => {
    const funcs = [{
      signatureA: { name: 'calc', type: 'function' as const, file: 'a.ts', line: 1, params: ['x'] },
      signatureB: { name: 'compute', type: 'function' as const, file: 'b.ts', line: 1, params: ['x'] },
      similarity: 0.85,
    }];
    const recs = generateRecommendations([], funcs);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]).toContain('Funcao');
  });

  it('should return no-duplication message when empty', () => {
    const recs = generateRecommendations([], []);
    expect(recs).toContain('Nenhuma duplicacao significativa encontrada.');
  });
});

describe('formatDuplicationReport', () => {
  it('should format a report with no duplicates', () => {
    const report = {
      scannedFiles: 10,
      duplicateFiles: [],
      duplicateFunctions: [],
      totalRedundant: 0,
      scanTimeMs: 50,
      recommendations: ['Nenhuma duplicacao significativa encontrada.'],
    };
    const formatted = formatDuplicationReport(report);
    expect(formatted).toContain('Duplication Report');
    expect(formatted).toContain('Arquivos escaneados: 10');
    expect(formatted).toContain('Recomendacoes');
  });

  it('should format a report with duplicates', () => {
    const report = {
      scannedFiles: 5,
      duplicateFiles: [{
        files: ['src/a.ts', 'src/b.ts'],
        similarity: 0.9,
        type: 'filename' as const,
        pairs: [{ fileA: 'src/a.ts', fileB: 'src/b.ts', similarity: 0.9, type: 'filename' as const, linesA: 20, linesB: 20 }],
      }],
      duplicateFunctions: [{
        signatureA: { name: 'foo', type: 'function' as const, file: 'a.ts', line: 1, params: ['x'] },
        signatureB: { name: 'bar', type: 'function' as const, file: 'b.ts', line: 5, params: ['x'] },
        similarity: 0.85,
      }],
      totalRedundant: 2,
      scanTimeMs: 100,
      recommendations: ['Arquivos duplicados (90% similar): a.ts, b.ts'],
    };
    const formatted = formatDuplicationReport(report);
    expect(formatted).toContain('Arquivos Duplicados');
    expect(formatted).toContain('Funcoes Duplicadas');
    expect(formatted).toContain('90%');
    expect(formatted).toContain('85%');
  });
});
