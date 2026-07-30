import { ARIMAPredictor } from './arima-predictor';
import { createLogger } from '@ideia/logger';
import { PELTChangepointDetector } from './pelt-changepoint-detector';
import { ProphetPredictor } from './prophet-predictor';
import { XGBoostBuildPredictor } from './xgboost-build-predictor';
import { Alert, ChangeSet, ChangepointResult, DashboardData, Forecast, Prediction, ProphetResult } from './types';
const logger = createLogger('predictive-quality-engine');

export class PredictiveQualityEngine {
  private _arima: ARIMAPredictor;
  private _prophet: ProphetPredictor;
  private _pelt: PELTChangepointDetector;
  private _predictor: XGBoostBuildPredictor;

  constructor() {
    this._arima = new ARIMAPredictor();
    this._prophet = new ProphetPredictor();
    this._pelt = new PELTChangepointDetector();
    this._predictor = new XGBoostBuildPredictor();
  }

  async buildDashboard(metricHistory: number[], changes: ChangeSet[]): Promise<DashboardData> {
    const [arimaForecast, prophetForecast, changepoints] = await Promise.all([
      this._arima.forecast(metricHistory, 14),
      this._prophet.forecast(metricHistory.map((v, i) => ({ date: i, value: v })), 14),
      this._pelt.detectWithSignificance(metricHistory),
    ]);
    const riskForecast = await Promise.all(changes.slice(0, 10).map(c => this._predictor.predict(c)));
    return {
      forecasts: { arima: arimaForecast, prophet: prophetForecast, ensemble: this._ensembleForecast(arimaForecast, prophetForecast) },
      changepoints, risks: riskForecast, alerts: this._generateAlerts(changepoints, riskForecast),
    };
  }

  private _ensembleForecast(a: Forecast, p: ProphetResult): Forecast {
    return {
      predictions: a.predictions.map((v, i) => (v + (p.predictions[i] ?? 0)) / 2),
      confidence95: a.predictions.map((_, i) => [
        Math.min((a.confidence95[i]?.[0] ?? 0), (p.confidence95[i]?.[0] ?? 0)),
        Math.max((a.confidence95[i]?.[1] ?? 0), (p.confidence95[i]?.[1] ?? 0)),
      ]),
    };
  }

  private _generateAlerts(changepoints: ChangepointResult[], risks: Prediction[]): Alert[] {
    const alerts: Alert[] = [];
    for (const cp of changepoints) {
      if (cp.significant && cp.magnitude > 0.2) {
        alerts.push({ type: 'changepoint', severity: cp.magnitude > 0.5 ? 'high' : 'medium', message: `Quality changed at t=${cp.index}: ${(cp.magnitude * 100).toFixed(1)}%` });
      }
    }
    for (const risk of risks.slice(0, 3)) {
      if (risk.riskLevel === 'high') {
        alerts.push({ type: 'build_risk', severity: 'high', message: `Build has ${(risk.probability * 100).toFixed(0)}% failure risk` });
      }
    }
    return alerts;
  }

  async forecastARIMA(values: number[], horizon: number): Promise<Forecast> {
    return this._arima.forecast(values, horizon);
  }

  async forecastProphet(history: Array<{ date: number | string; value: number }>, horizon: number): Promise<ProphetResult> {
    return this._prophet.forecast(history, horizon);
  }

  async detectChangepoints(values: number[]): Promise<ChangepointResult[]> {
    return this._pelt.detectWithSignificance(values);
  }
}
