import { LoRAConfig, TrainingRunConfig } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('lora-fine-tuner');

interface TrainingPair {
  input: string;
  output: string;
}

export class LoRAFineTuner {
  private _config: LoRAConfig;
  private _trained = false;

  constructor(config: LoRAConfig) {
    this._config = config;
  }

  async train(data: TrainingPair[], _runConfig: TrainingRunConfig): Promise<void> {
    if (data.length === 0) throw new Error('No training data provided');
    this._trained = true;
  }

  async generate(prompt: string): Promise<string> {
    if (!this._trained) return `Untrained: ${prompt}`;
    return `Adapted(${this._config.baseModel}): ${prompt}`;
  }

  isTrained(): boolean { return this._trained; }

  getRank(): number { return this._config.rank; }

  getAlpha(): number { return this._config.alpha; }
}
