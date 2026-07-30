import { TransformerConfig, AnomalyScore } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('transformer-anomaly-detector');

class LinearLayer {
  private _weight: Float64Array[];
  private _bias: Float64Array;

  constructor(inDim: number, outDim: number) {
    this._weight = Array.from({ length: outDim }, () => {
      const w = new Float64Array(inDim);
      const scale = Math.sqrt(2 / inDim);
      for (let i = 0; i < inDim; i++) w[i] = (Math.random() - 0.5) * 2 * scale;
      return w;
    });
    this._bias = new Float64Array(outDim);
  }

  forward(input: Float64Array[]): number[][] {
    return input.map((vec) => {
      return this._weight.map((w, o) => {
        let sum = this._bias[o];
        for (let i = 0; i < vec.length && i < w.length; i++) {
          sum += vec[i] * w[i];
        }
        return sum;
      });
    });
  }
}

class Conv2DLayer {
  private _kernel: Float64Array[];
  private _bias: Float64Array;

  constructor(inChannels: number, outChannels: number, kernelSize: number) {
    this._kernel = Array.from({ length: outChannels }, () => {
      const k = new Float64Array(inChannels * kernelSize * kernelSize);
      const scale = Math.sqrt(2 / (inChannels * kernelSize * kernelSize));
      for (let i = 0; i < k.length; i++) k[i] = (Math.random() - 0.5) * 2 * scale;
      return k;
    });
    this._bias = new Float64Array(outChannels);
  }

  forward(input: number[][]): number[][] {
    return input.map((row) => {
      const output: number[] = [];
      for (let oc = 0; oc < this._kernel.length; oc++) {
        let sum = this._bias[oc];
        for (let ic = 0; ic < Math.min(row.length, this._kernel[oc].length); ic++) {
          sum += row[ic] * this._kernel[oc][ic];
        }
        output.push(sum);
      }
      return output;
    });
  }
}

class LayerNorm {
  private _gamma: Float64Array;
  private _beta: Float64Array;

  constructor(dim: number) {
    this._gamma = new Float64Array(dim).fill(1);
    this._beta = new Float64Array(dim);
  }

  forward(input: number[][]): number[][] {
    return input.map((row) => {
      const mean = row.reduce((a, b) => a + b, 0) / row.length;
      const variance = row.reduce((a, b) => a + (b - mean) ** 2, 0) / row.length;
      const std = Math.sqrt(variance + 1e-8);
      return row.map((v, i) => {
        const g = this._gamma[i] ?? 1;
        const b = this._beta[i] ?? 0;
        return g * (v - mean) / std + b;
      });
    });
  }
}

class TimesNetEncoder {
  private _periods: number[] = [];
  private _conv2d: Conv2DLayer;
  private _layerNorm: LayerNorm;
  private _config: TransformerConfig;

  constructor(config: TransformerConfig) {
    this._config = config;
    this._conv2d = new Conv2DLayer(config.dModel, config.dModel, 3);
    this._layerNorm = new LayerNorm(config.dModel);
  }

  forward(sequence: number[][]): Float64Array[] {
    const T = sequence.length;
    const D = sequence[0]?.length ?? this._config.inputDim;

    const input = sequence.map((s) => new Float64Array(s));
    const freqs = this._computeFFT(input);
    this._periods = this._detectPeriods(freqs, T);

    if (this._periods.length === 0) {
      return input;
    }

    const period = this._periods[0] ?? 1;
    const height = period;
    const width = Math.ceil(T / period);
    const reshaped = this._reshape2D(input, height, width);

    const convolved = this._conv2d.forward(reshaped);
    const normalized = this._layerNorm.forward(convolved);
    const activated = normalized.map((row) => row.map((v) => Math.max(0, v)));

    const truncated = this._truncate(activated, T);
    return truncated.map((row) => new Float64Array(row));
  }

  private _computeFFT(sequence: Float64Array[]): Float64Array {
    const n = sequence.length;
    const real = new Float64Array(n);
    const imag = new Float64Array(n);

    for (let k = 0; k < n; k++) {
      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * k * t) / n;
        real[k] = (real[k] ?? 0) + (sequence[t]?.[0] ?? 0) * Math.cos(angle);
        imag[k] = (imag[k] ?? 0) - (sequence[t]?.[0] ?? 0) * Math.sin(angle);
      }
    }

    const magnitude = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      magnitude[i] = Math.sqrt((real[i] ?? 0) * (real[i] ?? 0) + (imag[i] ?? 0) * (imag[i] ?? 0));
    }
    return magnitude;
  }

  private _detectPeriods(freqs: Float64Array, maxPeriod: number): number[] {
    const topK = 3;
    const periods: Array<{ period: number; amplitude: number }> = [];

    for (let i = 1; i < Math.min(freqs.length / 2, maxPeriod); i++) {
      if ((freqs[i] ?? 0) > 0.1) {
        periods.push({ period: Math.ceil(maxPeriod / i), amplitude: freqs[i] ?? 0 });
      }
    }

    return periods
      .sort((a, b) => b.amplitude - a.amplitude)
      .slice(0, topK)
      .map((p) => p.period)
      .filter((p) => p > 1);
  }

  private _reshape2D(sequence: Float64Array[], height: number, width: number): number[][] {
    const D = sequence[0]?.length ?? this._config.inputDim;
    const reshaped: number[][] = [];

    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        const idx = h * width + w;
        if (idx < sequence.length) {
          const seq = sequence[idx];
          if (seq) {
            for (let d = 0; d < D; d++) {
              reshaped.push([seq[d] ?? 0]);
            }
          }
        }
      }
    }

    return reshaped.length > 0 ? reshaped : [[0]];
  }

  private _truncate(activated: number[][], targetLen: number): number[][] {
    const flattened: number[] = [];
    for (const row of activated) {
      for (const v of row) {
        flattened.push(v);
        if (flattened.length >= targetLen) break;
      }
    }

    const result: number[][] = [];
    for (let i = 0; i < Math.min(flattened.length, targetLen); i++) {
      result.push([flattened[i] ?? 0]);
    }
    return result;
  }
}

export class TransformerAnomalyDetector {
  private _encoder: TimesNetEncoder;
  private _projection: LinearLayer;
  private _threshold: number;
  private _config: TransformerConfig;

  constructor(config?: Partial<TransformerConfig>) {
    this._config = {
      inputDim: 64,
      dModel: 128,
      nHeads: 8,
      nLayers: 4,
      dropout: 0.1,
      maxSeqLen: 512,
      learningRate: 1e-3,
      ...config,
    };
    this._encoder = new TimesNetEncoder(this._config);
    this._projection = new LinearLayer(this._config.dModel, 1);
    this._threshold = 0.5;
  }

  async detect(sequence: number[][]): Promise<AnomalyScore[]> {
    const padded = this._padSequence(sequence, this._config.maxSeqLen);
    const encoded = this._encoder.forward(padded);
    const scores = this._projection.forward(encoded);

    const results: AnomalyScore[] = [];
    for (let t = 0; t < scores.length; t++) {
      const scoreVal = 1 / (1 + Math.exp(-(scores[t]?.[0] ?? 0)));
      const encodedRow = encoded[t];
      const inputRow = padded[t];
      const recError = this._computeReconstructionError(
        inputRow ?? [],
        encodedRow ?? new Float64Array(),
      );
      results.push({
        timestamp: Date.now() + t,
        agentId: 'agent-unknown',
        score: scoreVal,
        isAnomaly: scoreVal > this._threshold,
        threshold: this._threshold,
        componentScores: {
          timesnet: scoreVal,
          reconstruction: recError,
        },
      });
    }

    return results;
  }

  updateThreshold(newThreshold: number): void {
    this._threshold = Math.max(0, Math.min(1, newThreshold));
  }

  async adapt(sequence: number[][], labels: boolean[]): Promise<number> {
    const predictions = await this.detect(sequence);
    let loss = 0;

    for (let t = 0; t < predictions.length; t++) {
      const pred = predictions[t]?.score ?? 0.5;
      const label = labels[t] ? 1 : 0;
      loss +=
        -label * Math.log(Math.max(pred, 1e-8)) -
        (1 - label) * Math.log(Math.max(1 - pred, 1e-8));
    }

    return loss / predictions.length;
  }

  private _padSequence(sequence: number[][], maxLen: number): number[][] {
    const dim = sequence[0]?.length ?? this._config.inputDim;
    if (sequence.length >= maxLen) return sequence.slice(-maxLen);
    const padding: number[][] = Array.from({ length: maxLen - sequence.length }, () =>
      new Array(dim).fill(0),
    );
    return [...padding, ...sequence];
  }

  private _computeReconstructionError(input: number[], encoded: Float64Array): number {
    let error = 0;
    const len = Math.min(input.length, encoded.length);
    for (let i = 0; i < len; i++) {
      error += Math.pow((input[i] ?? 0) - (encoded[i] ?? 0), 2);
    }
    return Math.sqrt(error / Math.max(len, 1));
  }

  getThreshold(): number {
    return this._threshold;
  }
}
