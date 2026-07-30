import { GeneratorNetwork } from './generator-network';
import { createLogger } from '@ideia/logger';
const logger = createLogger('evolutionary-gan');

export class EvolutionaryGAN {
  private _population: GeneratorNetwork[] = [];
  private _fitnessHistory: number[][] = [];

  constructor(
    populationSize = 10,
    private _noiseDim = 128,
    private _embedDim = 768,
    private _conditionDim = 32
  ) {
    for (let i = 0; i < populationSize; i++) {
      this._population.push(new GeneratorNetwork(_noiseDim, _embedDim, _conditionDim));
    }
  }

  evaluateFitness(generator: GeneratorNetwork, attackSuccessFn: (embeddings: number[][]) => number, nSamples = 32): number {
    const noise = Array.from({ length: nSamples }, () =>
      Array.from({ length: this._noiseDim }, () => Math.random() * 2 - 1)
    );
    const embeddings = noise.map(n => generator.forward(n));
    return attackSuccessFn(embeddings);
  }

  evolve(attackSuccessFn: (embeddings: number[][]) => number, generations = 100, eliteRatio = 0.3): GeneratorNetwork {
    for (let gen = 0; gen < generations; gen++) {
      const fitnessScores = this._population.map(g => this.evaluateFitness(g, attackSuccessFn));
      this._fitnessHistory.push(fitnessScores);

      const sortedIdx = fitnessScores
        .map((score, idx) => ({ score, idx }))
        .sort((a, b) => b.score - a.score)
        .map(item => item.idx);

      const eliteCount = Math.max(2, Math.floor(this._population.length * eliteRatio));
      const elites = sortedIdx.slice(0, eliteCount).map(i => this._population[i]);

      const newPopulation: GeneratorNetwork[] = [...elites.map(e => e.copy())];
      while (newPopulation.length < this._population.length) {
        const p1 = elites[Math.floor(Math.random() * elites.length)];
        const p2 = elites[Math.floor(Math.random() * elites.length)];
        const child = p1.crossover(p2);
        child.mutate(0.01, 0.1);
        newPopulation.push(child);
      }

      this._population = newPopulation;
    }

    const bestIdx = this._population
      .map((g, i) => ({ fitness: this.evaluateFitness(g, attackSuccessFn), idx: i }))
      .sort((a, b) => b.fitness - a.fitness)[0].idx;

    return this._population[bestIdx];
  }

  getDiversityMetric(): number {
    if (this._population.length < 2) return 1;
    const representations = this._population.map(g => {
      const w = g.getWeights();
      return Object.values(w).flat();
    });
    const mean = representations[0].map((_, i) =>
      representations.reduce((sum, r) => sum + (r[i] ?? 0), 0) / representations.length
    );
    const variance = representations.reduce((sum, r) => {
      return sum + r.reduce((s, v, i) => s + Math.pow(v - (mean[i] ?? 0), 2), 0);
    }, 0) / (representations.length * mean.length);
    return variance;
  }

  getBestGenerator(attackSuccessFn: (embeddings: number[][]) => number): GeneratorNetwork {
    const fitness = this._population.map(g => this.evaluateFitness(g, attackSuccessFn));
    return this._population[fitness.indexOf(Math.max(...fitness))];
  }

  getPopulationSize(): number {
    return this._population.length;
  }

  getFitnessHistory(): number[][] {
    return this._fitnessHistory.map(row => [...row]);
  }
}
