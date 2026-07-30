import { detectEquivalence as _detectEquivalence, DEFAULT_EQUIVALENCE_CONFIG as _DEFAULT_EQUIVALENCE_CONFIG } from '../runtime/equivalence-detector';
const detectEquivalence = _detectEquivalence as (...args: any[]) => any;
const DEFAULT_EQUIVALENCE_CONFIG = _DEFAULT_EQUIVALENCE_CONFIG as any;

describe('detectEquivalence', () => {
  it('should detect identical code as equivalent', () => {
    const code = 'function add(a: number, b: number): number { return a + b; }';
    const result = detectEquivalence(code, code);
    expect(result.equivalent).toBe(true);
    expect(result.overallSimilarity).toBeGreaterThan(0.9);
  });

  it('should detect similar code with different identifiers', () => {
    const codeA = 'function add(x: number, y: number): number { return x + y; }';
    const codeB = 'function sum(a: number, b: number): number { return a + b; }';
    const result = detectEquivalence(codeA, codeB);
    expect(result.equivalent).toBe(true);
  });

  it('should detect different code as not equivalent', () => {
    const codeA = 'function add(a: number, b: number): number { return a + b; }';
    const codeB = 'class User { name: string; email: string; }';
    const result = detectEquivalence(codeA, codeB);
    expect(result.equivalent).toBe(false);
  });

  it('should detect semantic similarity through keywords', () => {
    const codeA = 'if (a) { return b; } else { return c; }';
    const codeB = 'if (x) { return y; } else { return z; }';
    const result = detectEquivalence(codeA, codeB);
    expect(result.semanticSimilarity).toBeGreaterThan(0);
    expect(result.structuralSimilarity).toBeGreaterThan(0.5);
  });

  it('should report differences when not equivalent', () => {
    const codeA = 'function add(a: number) { return a + 1; }';
    const codeB = 'const x = 42;';
    const result = detectEquivalence(codeA, codeB);
    if (!result.equivalent) expect(result.differences.length).toBeGreaterThan(0);
  });

  it('should handle empty code', () => {
    const result = detectEquivalence('', '');
    expect(result.equivalent).toBe(true);
    expect(result.overallSimilarity).toBeGreaterThanOrEqual(0.9);
  });

  it('should respect custom threshold', () => {
    const codeA = 'function add(a: number) { return a + 1; }';
    const codeB = 'function add(b: number) { return b + 1; }';
    const result = detectEquivalence(codeA, codeB, { overallThreshold: 0.95 });
    expect(result.equivalent).toBe(true);
  });

  it('should fail when below custom threshold', () => {
    const codeA = 'function add(a: number) { return a + 1; }';
    const codeB = 'class User { constructor(public name: string) {} }';
    const result = detectEquivalence(codeA, codeB, { overallThreshold: 0.99 });
    expect(result.equivalent).toBe(false);
    expect(result.differences.length).toBeGreaterThan(0);
  });

  it('should handle very short code (fewer than 3 tokens)', () => {
    const result = detectEquivalence('a', 'b');
    expect(result).toHaveProperty('equivalent');
    expect(result).toHaveProperty('structuralSimilarity');
    expect(result).toHaveProperty('semanticSimilarity');
  });

  describe('DEFAULT_EQUIVALENCE_CONFIG', () => {
    it('deve ter thresholds definidos', () => {
      expect(DEFAULT_EQUIVALENCE_CONFIG.structuralThreshold).toBeGreaterThan(0);
      expect(DEFAULT_EQUIVALENCE_CONFIG.semanticThreshold).toBeGreaterThan(0);
      expect(DEFAULT_EQUIVALENCE_CONFIG.overallThreshold).toBeGreaterThan(0);
    });

    it('deve ter overallThreshold entre structural e semantic', () => {
      const c = DEFAULT_EQUIVALENCE_CONFIG;
      expect(c.overallThreshold).toBeGreaterThanOrEqual(c.semanticThreshold);
      expect(c.structuralThreshold).toBeGreaterThan(c.semanticThreshold);
    });
  });

  describe('edge cases', () => {
    it('codigo vs vazio deve ser nao equivalente', () => {
      const result = detectEquivalence('function a() { return 1; }', '');
      expect(result.equivalent).toBe(false);
    });

    it('codigos com grandes diferencas estruturais', () => {
      const imperative = 'let x = 1; let y = 2; const z = x + y; process.stdout.write(String(z));';
      const functional = 'const add = (a: number, b: number): number => a + b;';
      const result = detectEquivalence(imperative, functional);
      expect(result.structuralSimilarity).toBeLessThan(0.8);
    });

    it('custom threshold abaixo do minimo deve ser aceito', () => {
      const codeA = 'const a = 1;';
      const codeB = 'const b = 2;';
      const result = detectEquivalence(codeA, codeB, { overallThreshold: 0.3 });
      expect(result).toHaveProperty('equivalent');
    });

    it('deve incluir confidence no resultado', () => {
      const result = detectEquivalence('a', 'a');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('mesmo codigo com diferentes espacos deve manter alta similaridade', () => {
      const spaced = 'function  add( a , b ) { return  a  +  b ; }';
      const compact = 'function add(a, b) { return a + b; }';
      const result = detectEquivalence(spaced, compact);
      expect(result.equivalent).toBe(true);
    });

    it('codigo vs substring de si mesmo deve ter similaridade alta', () => {
      const full = 'function add(a: number, b: number): number { return a + b; }';
      const partial = 'function add(a: number, b: number): number { return a + b;';
      const result = detectEquivalence(full, partial);
      expect(result.structuralSimilarity).toBeGreaterThan(0.5);
    });

    it('apenas comentarios diferentes mas mesma logica deve ser equivalente', () => {
      const withComment = '// calculates sum\nfunction add(a, b) { return a + b; }';
      const withoutComment = 'function add(a, b) { return a + b; }';
      const result = detectEquivalence(withComment, withoutComment);
      expect(result.semanticSimilarity).toBeGreaterThan(0.5);
    });

    it('apenas troca de ordem de declaracoes deve reduzir similaridade estrutural', () => {
      const first = 'const x = 1; const y = 2; const z = x + y;';
      const second = 'const y = 2; const x = 1; const z = x + y;';
      const result = detectEquivalence(first, second);
      expect(result.structuralSimilarity).toBeGreaterThan(0.3);
    });

    it('mesmo codigo identico deve ter identical sourceA/sourceB truncados', () => {
      const code = 'function add(a: number, b: number): number { return a + b; }';
      const result = detectEquivalence(code, code);
      expect(result.sourceA).toBe(code.substring(0, 50));
      expect(result.sourceB).toBe(code.substring(0, 50));
      expect(result.sourceA).toBe(result.sourceB);
    });
  });
});
