import { detectEquivalence, DEFAULT_EQUIVALENCE_CONFIG } from '../src/semantic-diff';

describe('SemanticDiff', () => {
  it('should detect identical code as equivalent', () => {
    const code = 'function add(a: number, b: number): number { return a + b; }';
    const result = detectEquivalence(code, code);
    expect(result.equivalent).toBe(true);
    expect(result.structuralSimilarity).toBeGreaterThan(0.9);
    expect(result.overallSimilarity).toBeGreaterThan(0.9);
  });

  it('should detect semantically equivalent code with different identifiers', () => {
    const codeA = 'function add(x: number, y: number): number { return x + y; }';
    const codeB = 'function sum(a: number, b: number): number { return a + b; }';
    const result = detectEquivalence(codeA, codeB);
    expect(result.equivalent).toBe(true);
  });

  it('should distinguish different logic', () => {
    const codeA = 'function add(a: number, b: number): number { return a + b; }';
    const codeB = 'function multiply(a: number, b: number): number { return a * b; }';
    const result = detectEquivalence(codeA, codeB);
    expect(result.structuralSimilarity).toBeGreaterThan(0.5);
  });

  it('should detect completely different code as not equivalent', () => {
    const codeA = 'const x = 42;';
    const codeB = 'export class UserService { async findUser(id: string): Promise<User> { return db.users.findUnique({ where: { id } }); } }';
    const result = detectEquivalence(codeA, codeB);
    expect(result.equivalent).toBe(false);
    expect(result.structuralSimilarity).toBeLessThan(0.5);
  });

  it('should respect custom thresholds', () => {
    const codeA = 'function foo() { return 1; }';
    const codeB = 'function bar() { return 2; }';
    const result = detectEquivalence(codeA, codeB, { overallThreshold: 0.1 });
    expect(result.equivalent).toBe(true);
  });

  it('should handle empty strings', () => {
    const result = detectEquivalence('', '');
    expect(result.equivalent).toBe(true);
    expect(result.structuralSimilarity).toBe(1);
    expect(result.semanticSimilarity).toBe(1);
  });

  it('should handle one empty string', () => {
    const result = detectEquivalence('', 'const x = 1;');
    expect(result.equivalent).toBe(false);
  });

  it('should produce differences array when not equivalent', () => {
    const codeA = 'const x = 1;';
    const codeB = 'class ComplexClass { method() { return fetch("/api/data").then(r => r.json()); } }';
    const result = detectEquivalence(codeA, codeB);
    expect(result.equivalent).toBe(false);
    expect(result.differences.length).toBeGreaterThanOrEqual(1);
  });

  it('should have confidence >= overallSimilarity when equivalent', () => {
    const code = 'console.log("hello");';
    const result = detectEquivalence(code, code);
    expect(result.confidence).toBeGreaterThanOrEqual(result.overallSimilarity);
  });

  it('should use DEFAULT_EQUIVALENCE_CONFIG thresholds', () => {
    expect(DEFAULT_EQUIVALENCE_CONFIG.structuralThreshold).toBe(0.7);
    expect(DEFAULT_EQUIVALENCE_CONFIG.semanticThreshold).toBe(0.5);
    expect(DEFAULT_EQUIVALENCE_CONFIG.overallThreshold).toBe(0.65);
  });
});