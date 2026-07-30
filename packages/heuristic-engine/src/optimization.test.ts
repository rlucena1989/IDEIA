import { OptimizationEngine, createOptimizationEngine } from './optimization';
import { SearchSpace, DecisionOption } from './types';

interface Solution {
  x: number;
  y: number;
}

function createTestSpace(): SearchSpace<Solution> {
  return {
    generateRandom: () => ({ x: Math.random() * 10, y: Math.random() * 10 }),
    mutate: (ind, rate) =>
      Math.random() < rate
        ? { x: ind.x + (Math.random() - 0.5) * 2, y: ind.y + (Math.random() - 0.5) * 2 }
        : { ...ind },
    crossover: (a, b) => ({ x: a.x, y: b.y }),
    fitness: (ind) => -(ind.x * ind.x + ind.y * ind.y) + 100,
  };
}

describe('OptimizationEngine', () => {
  let engine: OptimizationEngine;

  beforeEach(() => {
    engine = createOptimizationEngine();
  });

  describe('geneticAlgorithm', () => {
    it('returns a solution with valid structure', () => {
      const space = createTestSpace();
      const result = engine.geneticAlgorithm(space, { populationSize: 20, generations: 10 });
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
    });

    it('improves fitness over random baseline', () => {
      const space = createTestSpace();
      const random = space.fitness(space.generateRandom());
      const optimized = engine.geneticAlgorithm(space, { populationSize: 30, generations: 20 });
      expect(space.fitness(optimized)).toBeGreaterThanOrEqual(random - 1);
    });

    it('converges toward the optimum (0,0) for the test function', () => {
      const space: SearchSpace<Solution> = {
        generateRandom: () => ({ x: Math.random() * 10, y: Math.random() * 10 }),
        mutate: (ind, rate) =>
          Math.random() < rate
            ? { x: ind.x + (Math.random() - 0.5) * 2, y: ind.y + (Math.random() - 0.5) * 2 }
            : { ...ind },
        crossover: (a, b) => ({ x: a.x, y: b.y }),
        fitness: (ind) => -(ind.x * ind.x + ind.y * ind.y),
      };
      const result = engine.geneticAlgorithm(space, { populationSize: 50, generations: 30 });
      expect(Math.abs(result.x) + Math.abs(result.y)).toBeLessThan(5);
    });

    it('uses default options when none provided', () => {
      const space = createTestSpace();
      const result = engine.geneticAlgorithm(space);
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
    });

    it('uses custom mutation rate', () => {
      const space = createTestSpace();
      const spy = jest.spyOn(space, 'mutate');
      engine.geneticAlgorithm(space, { populationSize: 10, generations: 5, mutationRate: 0.5 });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('simulatedAnnealing', () => {
    it('returns a solution with valid structure', () => {
      const space = createTestSpace();
      const result = engine.simulatedAnnealing(space, { iterations: 100 });
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
    });

    it('improves fitness over random baseline with enough iterations', () => {
      const space = createTestSpace();
      const random = space.fitness(space.generateRandom());
      const result = engine.simulatedAnnealing(space, { initialTemp: 100, coolingRate: 0.95, iterations: 200 });
      expect(space.fitness(result)).toBeGreaterThanOrEqual(random - 1);
    });

    it('uses default options when none provided', () => {
      const space = createTestSpace();
      const result = engine.simulatedAnnealing(space);
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
    });

    it('accepts custom temperature and cooling rate', () => {
      const space = createTestSpace();
      const result = engine.simulatedAnnealing(space, { initialTemp: 10, coolingRate: 0.5, iterations: 50 });
      expect(result).toHaveProperty('x');
    });
  });

  describe('decide', () => {
    it('selects the option with highest score', () => {
      const options: DecisionOption<string>[] = [
        { id: 'a', label: 'Low', value: 'a', score: 1, risks: [], benefits: [] },
        { id: 'b', label: 'High', value: 'b', score: 9, risks: [], benefits: [] },
      ];
      expect(engine.decide(options).selected.id).toBe('b');
    });

    it('throws on empty options', () => {
      expect(() => engine.decide([])).toThrow('No options to decide from');
    });

    it('calculates confidence', () => {
      const options: DecisionOption<string>[] = [
        { id: 'a', label: 'A', value: 'a', score: 5, risks: [], benefits: [] },
        { id: 'b', label: 'B', value: 'b', score: 5, risks: [], benefits: [] },
      ];
      const result = engine.decide(options);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  it('creates engine via factory function', () => {
    expect(createOptimizationEngine()).toBeInstanceOf(OptimizationEngine);
  });
});
