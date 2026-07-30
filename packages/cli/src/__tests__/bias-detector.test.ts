import { describe, it, expect } from '@jest/globals';

describe('hardening - bias-detector', () => {
  it('detecta gender bias', () => {
    const { BiasDetector } = require('../hardening/bias-detector');
    const detector = new BiasDetector();
    const result = detector.analyze('all men are strong');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('gender_bias');
  });

  it('detecta racial bias', () => {
    const detector = new (require('../hardening/bias-detector').BiasDetector)();
    const result = detector.analyze('race determines intelligence');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('racial_bias');
  });

  it('detecta age bias', () => {
    const detector = new (require('../hardening/bias-detector').BiasDetector)();
    const result = detector.analyze('old people cannot learn new technology');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('age_bias');
  });

  it('detecta socioeconomic bias', () => {
    const detector = new (require('../hardening/bias-detector').BiasDetector)();
    const result = detector.analyze('poor people are lazy');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('socioeconomic_bias');
  });

  it('detecta cultural bias', () => {
    const detector = new (require('../hardening/bias-detector').BiasDetector)();
    const result = detector.analyze('our culture is superior');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('cultural_bias');
  });

  it('detecta confirmation bias', () => {
    const detector = new (require('../hardening/bias-detector').BiasDetector)();
    const result = detector.analyze('as I thought, this proves my point');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('confirmation_bias');
  });

  it('retorna none para texto neutro', () => {
    const detector = new (require('../hardening/bias-detector').BiasDetector)();
    const result = detector.analyze('The system processes data efficiently');
    expect(result.detected).toBe(false);
    expect(result.overallSensitivity).toBe('none');
  });

  it('overallSensitivity reflete o maior nivel', () => {
    const detector = new (require('../hardening/bias-detector').BiasDetector)();
    const result = detector.analyze('all men are strong and poor people are lazy');
    expect(result.overallSensitivity).toBe('high');
  });

  it('addCategory adiciona nova categoria', () => {
    const detector = new (require('../hardening/bias-detector').BiasDetector)();
    detector.addCategory({
      name: 'custom_bias', patterns: [/custom pattern/i],
      sensitivity: 'low', description: 'Custom',
    });
    const result = detector.analyze('custom pattern found');
    expect(result.detected).toBe(true);
    expect(result.categories).toContain('custom_bias');
  });

  it('getCategories retorna copia das categorias', () => {
    const detector = new (require('../hardening/bias-detector').BiasDetector)();
    const categories = detector.getCategories();
    expect(categories.length).toBeGreaterThan(0);
    categories.push({ name: 'extra', patterns: [], sensitivity: 'low', description: 'extra' });
    expect(detector.getCategories().length).toBe(categories.length - 1);
  });

  it('createBiasDetector cria instancia', () => {
    const { createBiasDetector } = require('../hardening/bias-detector');
    const detector = createBiasDetector();
    expect(detector).toBeDefined();
    expect(typeof detector.analyze).toBe('function');
  });

  it('suggestion e gerada para categorias encontradas', () => {
    const detector = new (require('../hardening/bias-detector').BiasDetector)();
    const result = detector.analyze('all men are strong');
    expect(result.suggestion).toBeTruthy();
    expect(typeof result.suggestion).toBe('string');
  });

  it('retorna matches com posicao correta', () => {
    const detector = new (require('../hardening/bias-detector').BiasDetector)();
    const result = detector.analyze('sentence with all men are strong in the middle');
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].position).toBeGreaterThanOrEqual(0);
  });
});
