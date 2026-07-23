import { BiasDetector, BiasCategory } from '../hardening/bias-detector';

describe('CLI BiasDetector', () => {
  it('should detect gender bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Women are bad at driving');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('gender_bias');
  });

  it('should detect racial bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Race determines intelligence');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('racial_bias');
  });

  it('should detect age bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Old people cannot learn new things');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('age_bias');
  });

  it('should detect confirmation bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('As I expected, the results prove my point');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('confirmation_bias');
  });

  it('should pass clean text', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('The quick brown fox jumps over the lazy dog');
    expect(result.detected).toBe(false);
    expect(result.matches).toHaveLength(0);
  });

  it('should detect multiple bias categories', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Men are better leaders and poor people are lazy');
    expect(result.detected).toBe(true);
    expect(result.categories.length).toBeGreaterThanOrEqual(2);
  });

  it('should report high sensitivity when any category is high', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Women are bad at math');
    expect(result.overallSensitivity).toBe('high');
  });

  it('should accept custom categories', () => {
    const custom: BiasCategory[] = [
      { name: 'test_bias', patterns: [/test\s+pattern/i], sensitivity: 'medium', description: 'Test only' },
    ];
    const detector = new BiasDetector(custom);
    const result = detector.analyze('This is a test pattern');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('test_bias');
  });

  it('should add categories dynamically', () => {
    const detector = new BiasDetector();
    detector.addCategory({
      name: 'dynamic', patterns: [/dynamic\s+test/i], sensitivity: 'low', description: 'Dynamic',
    });
    expect(detector.getCategories().some(c => c.name === 'dynamic')).toBe(true);
  });

  it('should provide suggestions for detected biases', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Old people cannot learn new things');
    expect(result.suggestion).toBeDefined();
    expect(result.suggestion).toContain('idade');
  });
});
