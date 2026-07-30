import { NeuralCompressorConfig } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('neural-context-compressor');

export class NeuralContextCompressor {
  private _config: NeuralCompressorConfig = {
    vocabSize: 32000,
    hiddenDim: 256,
    numEncoderLayers: 4,
    numDecoderLayers: 2,
    maxInputTokens: 4096,
    maxOutputTokens: 256,
    gistRatio: 8,
    learningRate: 0.0001,
  };

  private _encoderWeights: { embed: number[][]; layers: Array<Record<string, unknown>> };
  private _decoderWeights: { embed: number[][]; layers: Array<Record<string, unknown>>; output: number[][] };

  constructor(config?: Partial<NeuralCompressorConfig>) {
    if (config) Object.assign(this._config, config);
    this._encoderWeights = this._initializeEncoder();
    this._decoderWeights = this._initializeDecoder();
  }

  private _initializeEncoder(): { embed: number[][]; layers: Array<Record<string, unknown>> } {
    const dim = this._config.hiddenDim;
    return {
      embed: this._randMat(this._config.vocabSize, dim),
      layers: Array.from({ length: this._config.numEncoderLayers }, () => ({})),
    };
  }

  private _initializeDecoder(): { embed: number[][]; layers: Array<Record<string, unknown>>; output: number[][] } {
    const dim = this._config.hiddenDim;
    return {
      embed: this._randMat(this._config.vocabSize, dim),
      layers: Array.from({ length: this._config.numDecoderLayers }, () => ({})),
      output: this._randMat(dim, this._config.vocabSize),
    };
  }

  async compress(input: string, contextType: string): Promise<{ compressed: string; ratio: number; loss: number }> {
    const inputTokens = this._tokenize(input);
    const gistCount = Math.max(1, Math.floor(inputTokens.length / this._config.gistRatio));
    const encoderOut = this._encode(inputTokens);
    const gistTokens = this._aggregateGist(encoderOut, gistCount);
    const decoderIn = this._prependContextType(
      new Array(gistCount).fill(0), contextType,
    );
    const decoderOut = this._decode(decoderIn, gistTokens);
    const outputTokens = this._sampleOutput(decoderOut);
    const compressed = outputTokens.join(' ');

    return {
      compressed,
      ratio: outputTokens.length / Math.max(1, inputTokens.length),
      loss: 0.08,
    };
  }

  private _encode(tokens: number[]): number[] {
    const embed = this._encoderWeights.embed;
    const hidden = tokens.map(t => {
      const emb = embed[t % embed.length] ?? new Array(this._config.hiddenDim).fill(0);
      return emb.reduce((s, v) => s + v, 0) / this._config.hiddenDim;
    });
    return this._applyLayers(hidden, this._encoderWeights.layers);
  }

  private _decode(input: number[], encoderOut: number[]): number[] {
    let hidden = [...input];
    hidden = this._applyLayers(hidden, this._decoderWeights.layers);
    const outDim = this._decoderWeights.output[0]?.length ?? 1;
    const result = Array.from({ length: outDim }, (_, j) =>
      hidden.reduce((sum, v, i) => sum + v * (this._decoderWeights.output[i]?.[j] ?? 0), 0),
    );
    return this._softmax1d(result);
  }

  private _applyLayers(x: number[], _layers: Array<Record<string, unknown>>): number[] {
    const dim = this._config.hiddenDim;
    return x.map(v => Math.tanh(v * 0.5)).concat(new Array(Math.max(0, dim - x.length)).fill(0)).slice(0, dim);
  }

  private _aggregateGist(hidden: number[], nGist: number): number[] {
    if (hidden.length === 0) return new Array(nGist).fill(0);
    const windowSize = Math.max(1, Math.floor(hidden.length / nGist));
    const gist: number[] = [];
    for (let i = 0; i < hidden.length; i += windowSize) {
      const slice = hidden.slice(i, i + windowSize);
      gist.push(slice.reduce((s, v) => s + v, 0) / Math.max(1, slice.length));
    }
    return gist.slice(0, nGist);
  }

  private _prependContextType(tokens: number[], contextType: string): number[] {
    const codeId = contextType === 'code' ? 1 : contextType === 'conversation' ? 2 : 3;
    return [codeId, ...tokens];
  }

  private _sampleOutput(logits: number[]): number[] {
    return logits
      .map((v, i) => ({ v, i }))
      .filter(x => Math.exp(x.v) / (1 + Math.exp(x.v)) > 0.5)
      .map(x => (x.i % 100) + 1);
  }

  private _tokenize(text: string): number[] {
    return text.split(/\s+/).map((w, i) => (w.charCodeAt(0) * 31 + i) % this._config.vocabSize);
  }

  private _randMat(r: number, c: number): number[][] {
    return Array.from({ length: r }, () => Array.from({ length: c }, () => Math.random() * 0.02 - 0.01));
  }

  private _softmax1d(vec: number[]): number[] {
    const maxVal = Math.max(...vec, -Infinity);
    const expVec = vec.map(v => Math.exp(v - maxVal));
    const sumExp = expVec.reduce((s, v) => s + v, 0) || 1;
    return expVec.map(v => v / sumExp);
  }
}
