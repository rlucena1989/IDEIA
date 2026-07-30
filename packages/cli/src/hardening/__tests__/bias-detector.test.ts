import { BiasDetector, createBiasDetector } from '../bias-detector';

describe('BiasDetector', () => {
  let detector: BiasDetector;

  beforeEach(() => {
    detector = createBiasDetector();
  });

  test('detects gender bias', () => {
    const result = detector.analyze('All men are always interested in sports');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('gender_bias');
  });

  test('detects racial bias', () => {
    const result = detector.analyze('Race is determines intelligence');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('racial_bias');
  });

  test('detects age bias', () => {
    const result = detector.analyze('Old people cannot learn new technology');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('age_bias');
  });

  test('detects socioeconomic bias', () => {
    const result = detector.analyze('Poor people are always lazy');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('socioeconomic_bias');
  });

  test('detects cultural bias', () => {
    const result = detector.analyze('Our culture is better than theirs');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('cultural_bias');
  });

  test('detects confirmation bias', () => {
    const result = detector.analyze('As I said, this proves my point');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('confirmation_bias');
  });

  test('returns no bias for neutral text', () => {
    const result = detector.analyze('The system processes data efficiently.');
    expect(result.detected).toBe(false);
    expect(result.overallSensitivity).toBe('none');
  });

  test('includes suggestion in report', () => {
    const result = detector.analyze('All men are always better at driving');
    expect(result.suggestion).toBeDefined();
    expect(result.suggestion!.length).toBeGreaterThan(0);
  });

  test('reports correct sensitivity level', () => {
    const highResult = detector.analyze('All men are always better at coding');
    expect(highResult.overallSensitivity).toBe('high');

    const lowResult = detector.analyze('As I knew, this confirms');
    expect(lowResult.overallSensitivity).toBe('low');
  });

  test('addCategory adds new bias category', () => {
    detector.addCategory({
      name: 'test_bias',
      patterns: [/test-bias/i],
      sensitivity: 'medium',
      description: 'Test bias',
    });
    const result = detector.analyze('This is test-bias content');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('test_bias');
  });

  test('getCategories returns all categories', () => {
    const categories = detector.getCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0].name).toBeDefined();
  });

  test('position tracking works', () => {
    const result = detector.analyze('Hello there all men are always tall');
    const match = result.matches.find(m => m.category === 'gender_bias');
    expect(match).toBeDefined();
    expect(match!.position).toBeGreaterThan(0);
  });
});
