export interface Forecast {
  predictions: number[];
  confidence95: number[][];
  metadata: { phi1: number; theta1: number; stdError: number; modelType: string };
}

export interface ModelMetrics { mape: number; rmse: number; forecasts: number[] }

export class ARIMAForecaster {
  async forecast(values: number[], horizon: number): Promise<Forecast> {
    const diff = values.slice(1).map((v, i) => v - values[i]);
    const phi1 = this.autocorrelation(diff, 1);
    const residuals = diff.slice(1).map((v, i) => v - phi1 * diff[i]);
    const theta1 = this.autocorrelation(residuals, 1);

    const predictions: number[] = [];
    let lastValue = values[values.length - 1];
    let lastDiff = diff[diff.length - 1] || 0;
    let lastError = 0;

    for (let i = 0; i < horizon; i++) {
      const predDiff = phi1 * lastDiff + theta1 * lastError;
      const prediction = lastValue + predDiff;
      predictions.push(prediction);
      lastValue = prediction;
      lastDiff = predDiff;
      lastError = 0;
    }

    const stdErr = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);

    return {
      predictions,
      confidence95: predictions.map(p => [p - 1.96 * stdErr, p + 1.96 * stdErr]),
      metadata: { phi1, theta1, stdError: stdErr, modelType: 'ARIMA(1,1,1)' },
    };
  }

  async evaluate(values: number[], testSize: number): Promise<ModelMetrics> {
    const train = values.slice(0, -testSize);
    const test = values.slice(-testSize);
    const fc = await this.forecast(train, testSize);
    const mape = test.reduce((sum, actual, i) => sum + Math.abs((actual - fc.predictions[i]) / actual), 0) / testSize;
    const rmse = Math.sqrt(test.reduce((sum, actual, i) => sum + (actual - fc.predictions[i]) ** 2, 0) / testSize);
    return { mape, rmse, forecasts: fc.predictions };
  }

  private autocorrelation(values: number[], lag: number): number {
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const num = values.slice(lag).reduce((s, v, i) => s + (v - mean) * (values[i] - mean), 0);
    const den = values.reduce((s, v) => s + (v - mean) ** 2, 0);
    return den === 0 ? 0 : num / den;
  }
}
