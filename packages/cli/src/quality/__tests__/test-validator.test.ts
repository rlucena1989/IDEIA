import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { classifyTest, evaluateDirectory, summarizeResults } from '../test-validator';

function tmpFile(name: string, content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tv-'));
  const full = path.join(dir, name);
  fs.writeFileSync(full, content, 'utf8');
  return full;
}

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tv-'));
}

describe('classifyTest', () => {
  const strongTest = [
    `import { sum } from './math';`,
    `describe('sum', () => {`,
    `  it('should add two numbers', () => {`,
    `    const result = sum(2, 3);`,
    `    expect(result).toBe(5);`,
    `  });`,
    `  it('should handle negatives', () => {`,
    `    expect(sum(-1, 1)).toBe(0);`,
    `  });`,
    `});`,
  ].join('\n');

  const stubTest = [
    `import { sum } from './math';`,
    `describe('sum', () => {`,
    `  it('exists', () => {`,
    `    expect(sum).toBeDefined();`,
    `  });`,
    `});`,
  ].join('\n');

  const structuralTest = `it('should exist', () => {\n  expect(true).toBe(true);\n});`;

  const todoTest = `it('should do something', () => {\n  // TODO: implement\n  expect(true).toBe(true);\n});`;

  const callAssertTest = [
    `it('calls handler', () => {`,
    `  const spy = jest.fn();`,
    `  handler(spy);`,
    `  expect(spy).toHaveBeenCalled();`,
    `});`,
  ].join('\n');

  it('classifies strong test as valid', () => {
    const result = classifyTest('test.ts', strongTest);
    expect(result.classification).toBe('valid');
    expect(result.score).toBeGreaterThan(0);
    expect(result.blockingFlags).toHaveLength(0);
  });

  it('classifies stub as incomplete', () => {
    const result = classifyTest('test.ts', stubTest);
    expect(result.classification).toBe('incomplete');
  });

  it('classifies structural test as invalid', () => {
    const result = classifyTest('test.ts', structuralTest);
    expect(result.classification).toBe('invalid');
  });

  it('detects blocking flags for structural test', () => {
    const result = classifyTest('test.ts', structuralTest);
    expect(result.blockingFlags).toContain('stub_terminal');
  });

  it('detects TODO comment as blocking flag', () => {
    const result = classifyTest('test.ts', todoTest);
    expect(result.blockingFlags).toContain('comment_substitute');
  });

  it('detects no_useful_assertion flag for empty test', () => {
    const result = classifyTest('test.ts', `it('empty', () => {});`);
    expect(result.blockingFlags).toContain('no_useful_assertion');
  });

  it('detects only_call_assertion flag', () => {
    const result = classifyTest('test.ts', callAssertTest);
    expect(result.blockingFlags).toContain('only_call_assertion');
  });

  it('reads file from disk when content not provided', () => {
    const filePath = tmpFile('read-test.test.ts', strongTest);
    try {
      const result = classifyTest(filePath);
      expect(result.classification).toBe('valid');
    } finally {
      fs.rmSync(path.dirname(filePath), { recursive: true, force: true });
    }
  });
});

describe('evaluateDirectory', () => {
  it('returns empty array for non-existent directory', () => {
    const results = evaluateDirectory('/nonexistent/path');
    expect(results).toHaveLength(0);
  });

  it('scans directory for test files', () => {
    const dir = tmpDir();
    try {
      fs.writeFileSync(path.join(dir, 'a.test.ts'), 'describe("a",()=>{it("a",()=>{expect(1).toBe(1)})})', 'utf8');
      fs.writeFileSync(path.join(dir, 'b.spec.ts'), 'describe("b",()=>{it("b",()=>{expect(2).toBe(2)})})', 'utf8');
      fs.writeFileSync(path.join(dir, 'c.util.ts'), 'export const x = 1;', 'utf8');

      const results = evaluateDirectory(dir);
      expect(results).toHaveLength(2);
      expect(results.some(r => r.testId.endsWith('a.test.ts'))).toBe(true);
      expect(results.some(r => r.testId.endsWith('b.spec.ts'))).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('summarizeResults', () => {
  it('returns zeroes for empty array', () => {
    const summary = summarizeResults([]);
    expect(summary.total).toBe(0);
    expect(summary.averageScore).toBe(0);
  });

  it('counts classifications correctly', () => {
    const validTest = classifyTest('test.ts', `describe("x",()=>{it("y",()=>{const r=1+1;expect(r).toBe(2)})})`);
    const invalidTest = classifyTest('test.ts', `it("x",()=>{expect(true).toBe(true)})`);

    const summary = summarizeResults([validTest, invalidTest]);
    expect(summary.valid).toBe(1);
    expect(summary.invalid).toBe(1);
    expect(summary.total).toBe(2);
  });
});
