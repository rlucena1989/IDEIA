import { BiasDetector, createBiasDetector, BiasCategory } from '../src/bias-detector';

describe('BiasDetector', () => {
  it('should detect gender bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('All men are aggressive by nature');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('gender_bias');
  });

  it('should detect racial bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('These people are always causing problems');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('racial_bias');
  });

  it('should detect age bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Old people cannot learn new technologies');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('age_bias');
  });

  it('should detect socioeconomic bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Poor people should not have access to credit');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('socioeconomic_bias');
  });

  it('should detect cultural bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Our culture is better than theirs');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('cultural_bias');
  });

  it('should detect confirmation bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('As I said, this is the correct approach');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('confirmation_bias');
  });

  it('should detect ability bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Disabled people cannot work in tech');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('ability_bias');
  });

  it('should detect religious bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Muslims are always extremists');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('religious_bias');
  });

  it('should detect political bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('All conservatives are selfish');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('political_bias');
  });

  it('should detect body type bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Overweight people should not eat junk food');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('body_bias');
  });

  it('should pass clean text without bias', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('The weather today is sunny and warm');
    expect(result.detected).toBe(false);
    expect(result.matches).toHaveLength(0);
    expect(result.overallSensitivity).toBe('none');
  });

  it('should report overall sensitivity correctly', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Women are bad drivers and old people are slow');
    expect(result.detected).toBe(true);
    expect(result.overallSensitivity).toBe('high');
  });

  it('should provide suggestions when bias detected', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('Men are better engineers than women');
    expect(result.suggestion).toBeDefined();
    expect(typeof result.suggestion).toBe('string');
  });

  it('should not provide suggestion for clean text', () => {
    const detector = new BiasDetector();
    const result = detector.analyze('TypeScript is a typed superset of JavaScript');
    expect(result.suggestion).toBeUndefined();
  });

  it('should support validateOutput method (alias for analyze)', () => {
    const detector = new BiasDetector();
    const result = detector.validateOutput('All democrats are corrupt');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('political_bias');
  });
});

describe('BiasDetector — custom categories', () => {
  it('should accept custom categories', () => {
    const custom: BiasCategory[] = [
      {
        name: 'custom_bias',
        patterns: [/forbidden\s+word/i],
        sensitivity: 'high',
        description: 'Custom bias test',
      },
    ];
    const detector = new BiasDetector(custom);
    const result = detector.analyze('This is a forbidden word');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('custom_bias');
  });

  it('should add category dynamically', () => {
    const detector = new BiasDetector();
    detector.addCategory({
      name: 'dynamic_bias',
      patterns: [/test\s+pattern/i],
      sensitivity: 'low',
      description: 'Added at runtime',
    });
    const result = detector.analyze('this is a test pattern');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('dynamic_bias');
  });

  it('should return categories list', () => {
    const detector = new BiasDetector();
    const categories = detector.getCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0].name).toBeDefined();
  });
});

describe('createBiasDetector', () => {
  it('should create a detector with default categories', () => {
    const detector = createBiasDetector();
    expect(detector).toBeInstanceOf(BiasDetector);
    const result = detector.analyze('All women are bad at math');
    expect(result.detected).toBe(true);
  });
});
