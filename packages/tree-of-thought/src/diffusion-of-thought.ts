import { ThoughtDistribution, Thought, ThoughtState } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('diffusion-of-thought');

export class DiffusionOfThought {
  private readonly _T = 100;
  private readonly _betaStart = 0.0001;
  private readonly _betaEnd = 0.02;
  private _betas: number[];
  private _alphas: number[];
  private _alphaBars: number[];

  constructor() {
    this._betas = Array.from(
      { length: this._T },
      (_, i) => this._betaStart + (this._betaEnd - this._betaStart) * (i / this._T)
    );
    this._alphas = this._betas.map(b => 1 - b);
    this._alphaBars = this._alphas.map((_, i) =>
      this._alphas.slice(0, i + 1).reduce((p, a) => p * a, 1)
    );
  }

  forward(goal: string, steps?: number): ThoughtDistribution {
    const goalEmbed = this._encodeGoal(goal);
    let noisy = [...goalEmbed];
    const usedSteps = Math.min(steps ?? this._T, this._T);

    for (let t = 0; t < usedSteps; t++) {
      const noise = this._gaussianNoise(goalEmbed.length);
      const alphaBar = this._alphaBars[t];
      noisy = noisy.map((x, i) => {
        const value = Math.sqrt(alphaBar) * x + Math.sqrt(1 - alphaBar) * noise[i];
        return isFinite(value) ? value : x;
      });
    }

    return {
      mean: noisy,
      variance: noisy.map(v => Math.abs(v) * 0.1),
      temperature: 1.0,
      step: usedSteps,
    };
  }

  reverse(noisy: ThoughtDistribution, steps?: number): Thought {
    let current = [...noisy.mean];
    const usedSteps = Math.min(steps ?? this._T, this._T);

    for (let t = usedSteps - 1; t >= 0; t--) {
      const alpha = this._alphas[t];
      const alphaBar = this._alphaBars[t];
      const beta = this._betas[t];

      const predictedNoise = this._predictNoise(current, t);

      const denoised = current.map((x, i) => {
        const sqrtAlpha = Math.sqrt(Math.max(alpha, 1e-8));
        const sqrtOneMinusAlphaBar = Math.sqrt(Math.max(1 - alphaBar, 1e-8));
        const mean = (1 / sqrtAlpha) * (
          x - (beta / sqrtOneMinusAlphaBar) * predictedNoise[i]
        );
        const noise = this._gaussianNoise(1)[0] * Math.sqrt(beta);
        const value = mean + (t > 0 ? noise : 0);
        return isFinite(value) ? value : 0;
      });

      current = denoised;
    }

    return this._decodePlan(current);
  }

  sample(goal: string, numSamples: number): Thought[] {
    const samples: Thought[] = [];

    for (let i = 0; i < numSamples; i++) {
      const noisy = this.forward(goal, this._T);
      const plan = this.reverse(noisy, this._T);

      samples.push({
        ...plan,
        id: `diff_${Date.now()}_${i}`,
        diffusionSeed: i,
      });
    }

    return samples;
  }

  private _encodeGoal(goal: string): number[] {
    const vec = new Array(128).fill(0);
    const words = goal.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const hash = DiffusionOfThought._hashCode(words[i]) % 128;
      vec[Math.abs(hash)] += 1.0 / words.length;
    }
    return vec;
  }

  private _decodePlan(embedding: number[]): Thought {
    const safeValues = embedding.filter(v => isFinite(v) && !isNaN(v));
    const avgActivation = safeValues.length > 0
      ? safeValues.reduce((s, v) => s + Math.abs(v), 0) / safeValues.length
      : 0.5;
    const planText = avgActivation > 0.3
      ? `[DIFFUSION-PLAN] Generated plan (confidence: ${avgActivation.toFixed(2)})`
      : `[DIFFUSION-PLAN] Low-confidence plan (confidence: ${avgActivation.toFixed(2)}), review recommended`;

    return {
      id: `plan_${Date.now()}`,
      content: planText,
      depth: 0,
      children: [],
      diffusionConfidence: avgActivation,
      metadata: { coverage: avgActivation, granularity: avgActivation, cost: 0.5 },
      state: ThoughtState.ACTIVE,
      value: avgActivation,
      visits: 0,
    };
  }

  private _predictNoise(x: number[], _t: number): number[] {
    const windowSize = 3;
    const predicted = new Array(x.length).fill(0);

    for (let i = 0; i < x.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = -windowSize; j <= windowSize; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < x.length) {
          sum += x[idx];
          count++;
        }
      }
      predicted[i] = x[i] - (sum / count);
    }

    return predicted;
  }

  private _gaussianNoise(dim: number): number[] {
    return Array.from({ length: dim }, () => {
      const u1 = Math.random();
      const u2 = Math.random();
      return Math.sqrt(-2 * Math.log(u1 + 0.0001)) * Math.cos(2 * Math.PI * u2);
    });
  }

  private static _hashCode(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
