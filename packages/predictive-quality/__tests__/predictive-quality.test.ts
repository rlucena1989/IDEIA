import { ARIMAForecaster } from '../src/arima-forecaster';
import { PELTDetector } from '../src/pelt-detector';
import { ProphetForecaster } from '../src/prophet-forecaster';
import { BuildFailurePredictor, ChangeSet } from '../src/build-failure-predictor';
import { TimeSeriesCrossValidator } from '../src/time-series-cross-validator';

describe('predictive-quality', () => {
  describe('ARIMAForecaster', () => {
    it('should forecast with ARIMA(1,1,1)', async () => {
      const arima = new ARIMAForecaster();
      const values = [10, 12, 15, 14, 18, 20, 22, 25, 24, 28];
      const fc = await arima.forecast(values, 3);
      expect(fc.predictions.length).toBe(3);
      expect(fc.confidence95.length).toBe(3);
      expect(fc.metadata.modelType).toBe('ARIMA(1,1,1)');
    });
  });

  describe('PELTDetector', () => {
    it('should detect changepoints', () => {
      const pelt = new PELTDetector();
      const values = [...Array(50).fill(10), ...Array(50).fill(20)];
      const cps = pelt.detect(values);
      expect(cps.length).toBeGreaterThan(0);
    });

    it('should detect changepoints with significance', async () => {
      const pelt = new PELTDetector();
      const values = [...Array(30).fill(5), ...Array(30).fill(15)];
      const results = await pelt.detectWithSignificance(values);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('ProphetForecaster', () => {
    it('should forecast with seasonality', async () => {
      const prophet = new ProphetForecaster();
      const history = Array.from({ length: 100 }, (_, i) => ({
        date: i, value: 10 + Math.sin(i * 2 * Math.PI / 7) + Math.random() * 0.5,
      }));
      const result = await prophet.forecast(history, 14);
      expect(result.predictions.length).toBe(14);
      expect(result.components.weekly).toBeDefined();
    });
  });

  describe('BuildFailurePredictor', () => {
    it('should predict with heuristic fallback', async () => {
      const predictor = new BuildFailurePredictor();
      const changes: ChangeSet = {
        files: ['src/main.ts'], authors: ['dev1'], isWeekend: false,
        nightCommit: false, docsOnly: false, testChanges: 2, avgFileComplexity: 5,
        hasDependencyChange: true, lastBuildSuccessRate: 0.85, hour: 14,
      };
      const pred = await predictor.predict(changes);
      expect(pred.riskLevel).toBeDefined();
      expect(pred.topFactors.length).toBe(3);
    });

    it('should train with logistic regression', async () => {
      const predictor = new BuildFailurePredictor();
      const data = Array.from({ length: 50 }, (_, i) => ({
        changes: {
          files: [i > 40 ? 'big-file.ts' : 'small.ts'],
          authors: ['dev'],
          isWeekend: false,
          nightCommit: i > 45,
          docsOnly: false,
          testChanges: 1,
          avgFileComplexity: i > 35 ? 10 : 3,
          hasDependencyChange: i > 30,
          lastBuildSuccessRate: i > 20 ? 0.9 : 0.3,
          hour: 10,
        } as ChangeSet,
        buildFailed: i > 40,
      }));
      const metrics = await predictor.train(data);
      expect(metrics.accuracy).toBeGreaterThan(0);
    });
  });

  describe('TimeSeriesCrossValidator', () => {
    it('should perform time series cross-validation', async () => {
      const validator = new TimeSeriesCrossValidator();
      const arima = new ARIMAForecaster();
      const values = Array.from({ length: 60 }, (_, i) => 10 + i * 0.5 + Math.random());
      const result = await validator.validate(
        (train, h) => arima.forecast(train, h),
        values, 3
      );
      expect(result.folds.length).toBeGreaterThan(0);
      expect(result.meanMAPE).toBeGreaterThan(0);
    });
  });
});
