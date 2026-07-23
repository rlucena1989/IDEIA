import { PatternObserver, inferPattern } from '../runtime/pattern-observer';
import { PatternRegistry } from '../runtime/pattern-registry';

describe('PatternObserver', () => {
  let registry: PatternRegistry;
  let observer: PatternObserver;

  beforeEach(() => {
    registry = new PatternRegistry();
    observer = new PatternObserver(registry);
  });

  it('should observe patterns in source code', () => {
    const code = `
      export class UserRepository {
        findById(id: string) { }
      }
      class CreateUserDto {
        name: string;
      }
    `;
    const result = observer.observe(code, 'test.ts');
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
    expect(result.dominantPatterns.length).toBeGreaterThan(0);
  });

  it('should return empty result for code with no patterns', () => {
    const code = 'console.log("hello"); const x = 1 + 2;';
    const result = observer.observe(code, 'test.ts');
    expect(result.signals.length).toBe(0);
    expect(result.score).toBe(0);
    expect(result.summary).toContain('Nenhum padrao observado');
  });

  it('should store signals and retrieve them', () => {
    observer.observe('class UserRepository {}', 'repo.ts');
    expect(observer.getRecentSignals().length).toBeGreaterThan(0);
  });

  it('should clear signals', () => {
    observer.observe('class UserRepository {}', 'repo.ts');
    observer.clearSignals();
    expect(observer.getRecentSignals().length).toBe(0);
  });

  it('should limit recent signals', () => {
    for (let i = 0; i < 10; i++) {
      observer.observe('class UserRepository {}', `repo${i}.ts`);
    }
    expect(observer.getRecentSignals(3).length).toBeLessThanOrEqual(3);
  });
});

describe('inferPattern', () => {
  it('should infer patterns from signals', () => {
    const registry = new PatternRegistry();
    const observer = new PatternObserver(registry);
    const code = 'export class UserRepository { }';
    const result = observer.observe(code, 'test.ts');
    const inferences = inferPattern(registry.getAll(), result.signals);
    expect(inferences.length).toBeGreaterThan(0);
    expect(inferences[0].patternId).toBeDefined();
    expect(inferences[0].confidence).toBeGreaterThan(0);
    expect(inferences[0].recommendation).toBeDefined();
  });

  it('should return empty if no signals match threshold', () => {
    const registry = new PatternRegistry();
    const code = 'const x = 1;';
    const observer = new PatternObserver(registry);
    const result = observer.observe(code, 'test.ts');
    const inferences = inferPattern(registry.getAll(), result.signals, 0.99);
    expect(inferences.length).toBe(0);
  });
});
