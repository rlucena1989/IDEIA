import { SearchSpace, DecisionOption, DecisionResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('optimization');

export class OptimizationEngine {
  geneticAlgorithm<T>(space: SearchSpace<T>, options?: { populationSize?: number; generations?: number; mutationRate?: number; crossoverRate?: number }): T {
    const popSize = options?.populationSize ?? 100;
    const gens = options?.generations ?? 50;
    const mutRate = options?.mutationRate ?? 0.05;
    const crossRate = options?.crossoverRate ?? 0.7;

    let population: T[] = [];
    for (let i = 0; i < popSize; i++) {
      population.push(space.generateRandom());
    }

    for (let gen = 0; gen < gens; gen++) {
      const fitness = population.map(ind => ({ ind, fitness: space.fitness(ind) }));
      fitness.sort((a, b) => b.fitness - a.fitness);

      const nextGen: T[] = [];
      while (nextGen.length < popSize) {
        const parent1 = this.tournamentSelect(fitness, 3);
        const parent2 = this.tournamentSelect(fitness, 3);

        let child: T;
        if (Math.random() < crossRate) {
          child = space.crossover(parent1, parent2);
        } else {
          child = parent1;
        }

        child = space.mutate(child, mutRate);
        nextGen.push(child);
      }

      population = nextGen;
    }

    const final = population.map(ind => ({ ind, fitness: space.fitness(ind) }));
    final.sort((a, b) => b.fitness - a.fitness);
    return final[0].ind;
  }

  simulatedAnnealing<T>(space: SearchSpace<T>, options?: { initialTemp?: number; coolingRate?: number; iterations?: number }): T {
    const temp = options?.initialTemp ?? 100;
    const cooling = options?.coolingRate ?? 0.95;
    const iters = options?.iterations ?? 1000;

    let current = space.generateRandom();
    let currentFitness = space.fitness(current);
    let best = current;
    let bestFitness = currentFitness;
    let t = temp;

    for (let i = 0; i < iters; i++) {
      const neighbor = space.mutate(current, 0.1);
      const neighborFitness = space.fitness(neighbor);
      const delta = neighborFitness - currentFitness;

      if (delta > 0 || Math.random() < Math.exp(delta / t)) {
        current = neighbor;
        currentFitness = neighborFitness;
      }

      if (currentFitness > bestFitness) {
        best = current;
        bestFitness = currentFitness;
      }

      t *= cooling;
    }

    return best;
  }

  decide<T>(options: DecisionOption<T>[]): DecisionResult<T> {
    if (options.length === 0) throw new Error('No options to decide from');
    const sorted = [...options].sort((a, b) => b.score - a.score);
    const best = sorted[0];
    const totalScore = sorted.reduce((s, o) => s + o.score, 0);
    const confidence = totalScore > 0 ? best.score / totalScore : 0;
    return {
      selected: best,
      alternatives: sorted.slice(1),
      confidence: Math.min(1, confidence * options.length),
      rationale: `Optimization selected "${best.label}" with score ${best.score.toFixed(2)}`,
    };
  }

  private tournamentSelect<T>(population: { ind: T; fitness: number }[], tournamentSize: number): T {
    let best = population[Math.floor(Math.random() * population.length)];
    for (let i = 1; i < tournamentSize; i++) {
      const contender = population[Math.floor(Math.random() * population.length)];
      if (contender.fitness > best.fitness) best = contender;
    }
    return best.ind;
  }
}

export function createOptimizationEngine(): OptimizationEngine {
  return new OptimizationEngine();
}
