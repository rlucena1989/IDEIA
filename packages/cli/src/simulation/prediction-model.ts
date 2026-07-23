export interface PredictionModel {
  modelId: string;
  name: string;
  accuracy: number;
  lastRunAt?: string;
}

export function createPredictionModel(name: string, accuracy: number = 0.85): PredictionModel {
  return {
    modelId: `model-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    accuracy,
  };
}
