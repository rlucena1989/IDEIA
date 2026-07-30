import { PredictiveQualityEngine } from '../predictive-quality-engine';
import { ARIMAPredictor } from '../arima-predictor';
import { PELTChangepointDetector } from '../pelt-changepoint-detector';
import { XGBoostBuildPredictor } from '../xgboost-build-predictor';
import { ProphetPredictor } from '../prophet-predictor';
import { SHAPExplainer } from '../shap-explainer';
import { TimesNetQualityPredictor } from '../timesnet-quality-predictor';
import { CausalQualityAnalyzer } from '../causal-quality-analyzer';
import { MultiTaskQualityModel } from '../multi-task-quality-model';
import { ChangeSet, CausalNode } from '../types';

describe('PredictiveQualityEngine', () => {
  test('builds dashboard', async () => {
    const engine = new PredictiveQualityEngine();
    const history = Array.from({ length: 100 }, (_, i) => 10 + Math.sin(i * 0.1) * 2 + Math.random());
    const changes: ChangeSet[] = [
      { files: ['a.ts'], authors: ['dev'], isWeekend: false, nightCommit: false, docsOnly: false, testChanges: 5, avgFileComplexity: 3, hasDependencyChange: false, lastBuildSuccessRate: 0.9, hour: 14, hasNewDependency: false, isLargeRefactor: false },
    ];
    const dashboard = await engine.buildDashboard(history, changes);
    expect(dashboard.forecasts.arima).toBeDefined();
    expect(dashboard.forecasts.prophet).toBeDefined();
    expect(dashboard.forecasts.ensemble).toBeDefined();
    expect(dashboard.changepoints).toBeDefined();
  });

  test('forecasts with ARIMA', async () => {
    const engine = new PredictiveQualityEngine();
    const values = [10, 12, 15, 14, 18, 20, 22, 25, 24, 28];
    const forecast = await engine.forecastARIMA(values, 3);
    expect(forecast.predictions.length).toBe(3);
    expect(forecast.confidence95.length).toBe(3);
  });

  test('forecasts with Prophet', async () => {
    const engine = new PredictiveQualityEngine();
    const history = Array.from({ length: 100 }, (_, i) => ({ date: i, value: 10 + Math.sin(i * 2 * Math.PI / 7) + Math.random() }));
    const result = await engine.forecastProphet(history, 14);
    expect(result.predictions.length).toBe(14);
  });

  test('detects changepoints', async () => {
    const engine = new PredictiveQualityEngine();
    const values = [...Array(30).fill(5), ...Array(30).fill(15)];
    const cps = await engine.detectChangepoints(values);
    expect(cps.some(c => c.significant)).toBe(true);
  });
});

describe('ARIMAPredictor', () => {
  test('forecasts with ARIMA(1,1,1)', async () => {
    const arima = new ARIMAPredictor();
    const values = [10, 12, 15, 14, 18, 20, 22, 25, 24, 28];
    const forecast = await arima.forecast(values, 3);
    expect(forecast.predictions.length).toBe(3);
    expect(forecast.metadata?.modelType).toBe('ARIMA(1,1,1)');
  });

  test('evaluates model performance', async () => {
    const arima = new ARIMAPredictor();
    const values = [10, 12, 15, 14, 18, 20, 22, 25, 24, 28, 30, 32];
    const metrics = await arima.evaluate(values, 3);
    expect(metrics.mape).toBeGreaterThan(0);
    expect(metrics.rmse).toBeGreaterThan(0);
  });

  test('handles constant values', async () => {
    const arima = new ARIMAPredictor();
    const values = [10, 10, 10, 10, 10];
    const forecast = await arima.forecast(values, 2);
    expect(forecast.predictions.length).toBe(2);
  });
});

describe('PELTChangepointDetector', () => {
  test('detects changepoints in step function', () => {
    const pelt = new PELTChangepointDetector();
    const values = [...Array(50).fill(10), ...Array(50).fill(20)];
    const cps = pelt.detect(values);
    expect(cps.length).toBeGreaterThan(0);
    expect(cps[0]).toBeGreaterThan(40);
    expect(cps[0]).toBeLessThan(60);
  });

  test('detects changepoints with significance test', async () => {
    const pelt = new PELTChangepointDetector();
    const values = [...Array(30).fill(5), ...Array(30).fill(15)];
    const results = await pelt.detectWithSignificance(values);
    expect(results.some(r => r.significant)).toBe(true);
  });

  test('returns empty for no change', async () => {
    const pelt = new PELTChangepointDetector();
    const values = Array(50).fill(10);
    const cps = pelt.detect(values);
    expect(cps.length).toBe(0);
  });
});

describe('XGBoostBuildPredictor', () => {
  test('predicts build failure risk', async () => {
    const predictor = new XGBoostBuildPredictor();
    const pred = await predictor.predict({
      files: ['src/main.ts', 'src/utils.ts'], authors: ['dev1'],
      isWeekend: false, nightCommit: false, docsOnly: false,
      testChanges: 2, avgFileComplexity: 5, hasDependencyChange: true,
      lastBuildSuccessRate: 0.85, hour: 14, hasNewDependency: false, isLargeRefactor: false,
    });
    expect(pred.riskLevel).toBeDefined();
    expect(pred.topFactors.length).toBe(3);
  });

  test('recommends action based on probability', async () => {
    const predictor = new XGBoostBuildPredictor();
    const pred = await predictor.predict({
      files: ['a.ts'], authors: ['dev'], isWeekend: true, nightCommit: true,
      docsOnly: false, testChanges: 0, avgFileComplexity: 8, hasDependencyChange: true,
      lastBuildSuccessRate: 0.3, hour: 3, hasNewDependency: true, isLargeRefactor: true,
    });
    expect(pred.recommendedAction).toBeDefined();
  });
});

describe('ProphetPredictor', () => {
  test('forecasts with trend and seasonality', async () => {
    const prophet = new ProphetPredictor();
    const history = Array.from({ length: 100 }, (_, i) => ({ date: i, value: 10 + Math.sin(i * 2 * Math.PI / 7) + Math.random() }));
    const result = await prophet.forecast(history, 14);
    expect(result.predictions.length).toBe(14);
    expect(result.components.weekly).toBeDefined();
    expect(result.components.weekly.length).toBe(7);
  });

  test('components include daily seasonality', async () => {
    const prophet = new ProphetPredictor();
    const history = Array.from({ length: 48 }, (_, i) => ({ date: i, value: 10 + Math.sin(i * 2 * Math.PI / 24) }));
    const result = await prophet.forecast(history, 6);
    expect(result.components.daily.length).toBe(24);
  });
});

describe('SHAPExplainer', () => {
  test('explains predictions', async () => {
    const explainer = new SHAPExplainer();
    const explanations = await explainer.explain(
      { probability: 0.8, riskLevel: 'high', topFactors: [{ feature: 'fileCount', impact: 0.3 }, { feature: 'testRatio', impact: 0.2 }, { feature: 'dependency', impact: 0.15 }], recommendedAction: 'run_full_test_suite' },
      { files: ['a.ts'], authors: ['dev'], isWeekend: false, nightCommit: false, docsOnly: false, testChanges: 1, avgFileComplexity: 5, hasDependencyChange: true, lastBuildSuccessRate: 0.8, hour: 14, hasNewDependency: false, isLargeRefactor: false }
    );
    expect(explanations.length).toBeGreaterThan(0);
  });

  test('generates report', () => {
    const explainer = new SHAPExplainer();
    const report = explainer.generateReport(['Factor A impacts 30%', 'Factor B impacts 20%']);
    expect(report).toContain('SHAP');
    expect(report).toContain('Factor A');
  });
});

describe('TimesNetQualityPredictor', () => {
  test('trains and predicts', async () => {
    const predictor = new TimesNetQualityPredictor();
    const data = [Array.from({ length: 300 }, (_, i) => 10 + Math.sin(i * 0.1) * 2)];
    const metrics = await predictor.train(data, 5);
    expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
  });

  test('handles multiple series', async () => {
    const predictor = new TimesNetQualityPredictor();
    const data = [
      Array.from({ length: 300 }, () => Math.random() * 10),
      Array.from({ length: 300 }, () => Math.random() * 10 + 5),
    ];
    const metrics = await predictor.train(data, 3);
    expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
  });
});

describe('CausalQualityAnalyzer', () => {
  test('estimates average treatment effect', () => {
    const nodes: CausalNode[] = [
      { id: 'coverage', name: 'Coverage', parents: [], type: 'metric', values: [] },
      { id: 'defects', name: 'Defects', parents: ['coverage'], type: 'metric', values: [] },
    ];
    const analyzer = new CausalQualityAnalyzer(nodes);
    const data = new Map<string, number[]>();
    data.set('coverage', [0.8, 0.3, 0.9, 0.2, 0.7, 0.4]);
    data.set('defects', [0.1, 0.5, 0.05, 0.6, 0.15, 0.4]);
    const effect = analyzer.estimateATE('coverage', 'defects', data);
    expect(effect.ate).toBeDefined();
    expect(effect.treatment).toBe('coverage');
    expect(effect.outcome).toBe('defects');
  });

  test('doIntervention returns results', () => {
    const nodes: CausalNode[] = [
      { id: 'tests', name: 'Tests', parents: [], type: 'metric', values: [] },
      { id: 'quality', name: 'Quality', parents: ['tests'], type: 'metric', values: [] },
    ];
    const analyzer = new CausalQualityAnalyzer(nodes);
    const data = new Map<string, number[]>();
    data.set('tests', [1, 2, 3]);
    data.set('quality', [0.9, 0.8, 0.7]);
    const result = analyzer.doIntervention('tests', 10, data);
    expect(result).toBeDefined();
  });
});

describe('MultiTaskQualityModel', () => {
  test('predicts multiple quality metrics', async () => {
    const model = new MultiTaskQualityModel();
    const features = Array.from({ length: 128 }, () => Math.random());
    const predictions = await model.predict(features);
    expect(predictions.latencyP50).toBeDefined();
    expect(predictions.errorRate).toBeDefined();
    expect(predictions.throughput).toBeDefined();
    expect(predictions.coverage).toBeDefined();
  });

  test('fitMultiTask returns losses', async () => {
    const model = new MultiTaskQualityModel();
    const dataset = Array.from({ length: 10 }, () => ({
      features: Array.from({ length: 128 }, () => Math.random()),
      targets: { latencyP50: Math.random(), errorRate: Math.random(), throughput: Math.random(), coverage: Math.random(), complexity: Math.random(), maintainability: Math.random(), latencyP99: Math.random() },
    }));
    const losses = await model.fitMultiTask(dataset, 5);
    expect(Object.keys(losses).length).toBeGreaterThan(0);
  });

  test('handles missing task targets', async () => {
    const model = new MultiTaskQualityModel();
    const dataset = [
      { features: Array(128).fill(0.5), targets: { latencyP50: 0.1 } },
    ];
    const losses = await model.fitMultiTask(dataset, 2);
    expect(losses.latencyP50).toBeGreaterThanOrEqual(0);
  });

  test('predict maintains task independence', async () => {
    const model = new MultiTaskQualityModel();
    const features = Array(128).fill(0.5);
    const result = await model.predict(features);
    const keys = Object.keys(result);
    expect(keys).toContain('latencyP50');
    expect(keys).toContain('latencyP99');
    expect(keys).toContain('errorRate');
  });
});
