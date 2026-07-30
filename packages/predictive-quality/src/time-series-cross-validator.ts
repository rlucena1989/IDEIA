import { Forecast } from './arima-forecaster';
import { createLogger } from '@ideia/logger';
const logger = createLogger('time-series-cross-validator');

export interface FoldResult {
  fold: number;
  trainSize: number;
  testSize: number;
  mape: number;
  rmse: number;
}

export interface CrossValidationResult {
  folds: FoldResult[];
  meanMAPE: number;
  meanRMSE: number;
  stdMAPE: number;
}

export class TimeSeriesCrossValidator {
  async validate(
    modelFn: (train: number[], testLen: number) => Promise<Forecast>,
    values: number[],
    nSplits = 5
  ): Promise<CrossValidationResult> {
    const totalSize = values.length;
    const foldSize = Math.floor(totalSize / (nSplits + 1));
    const foldResults: FoldResult[] = [];

    for (let i = 0; i < nSplits; i++) {
      const trainEnd = (i + 1) * foldSize;
      const testEnd = Math.min(trainEnd + foldSize, totalSize);
      const train = values.slice(0, trainEnd);
      const test = values.slice(trainEnd, testEnd);
      if (test.length === 0) continue;

      const fc = await modelFn(train, test.length);
      const mape = test.reduce((sum, actual, j) => sum + Math.abs((actual - fc.predictions[j]) / actual), 0) / test.length;
      const rmse = Math.sqrt(test.reduce((sum, actual, j) => sum + (actual - fc.predictions[j]) ** 2, 0) / test.length);
      foldResults.push({ fold: i, trainSize: train.length, testSize: test.length, mape, rmse });
    }

    const n = foldResults.length;
    const meanMAPE = foldResults.reduce((s, f) => s + f.mape, 0) / n;
    const meanRMSE = foldResults.reduce((s, f) => s + f.rmse, 0) / n;
    const stdMAPE = Math.sqrt(foldResults.reduce((s, f) => s + (f.mape - meanMAPE) ** 2, 0) / n);

    return { folds: foldResults, meanMAPE, meanRMSE, stdMAPE };
  }
}
