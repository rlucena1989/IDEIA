import { ABTestConfig, ABTestResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('context-pack-ab-tester');

export class ContextPackABTester {
  constructor(private _config: ABTestConfig = {
    minSampleSize: 30,
    confidenceLevel: 0.95,
    runLengthDays: 7,
    seasonalityPeriod: 24,
  }) {}

  private _bayesianBetaBinomial(
    successesA: number,
    trialsA: number,
    successesB: number,
    trialsB: number
  ): {
    meanA: number;
    meanB: number;
    probAGreater: number;
    credibleInterval: [number, number];
  } {
    const alphaA = 1 + successesA;
    const betaA = 1 + (trialsA - successesA);
    const alphaB = 1 + successesB;
    const betaB = 1 + (trialsB - successesB);

    const meanA = alphaA / (alphaA + betaA);
    const meanB = alphaB / (alphaB + betaB);

    const simulations = 10000;
    let countBGreater = 0;
    for (let i = 0; i < simulations; i++) {
      const sampleA = this._sampleBeta(alphaA, betaA);
      const sampleB = this._sampleBeta(alphaB, betaB);
      if (sampleB > sampleA) countBGreater++;
    }
    const probAGreater = 1 - countBGreater / simulations;

    const lifts: number[] = [];
    for (let i = 0; i < simulations; i++) {
      const sampleA = this._sampleBeta(alphaA, betaA);
      const sampleB = this._sampleBeta(alphaB, betaB);
      lifts.push((sampleB - sampleA) / Math.max(sampleA, 0.001));
    }
    lifts.sort((a, b) => a - b);
    const lowerIdx = Math.floor(simulations * 0.025);
    const upperIdx = Math.floor(simulations * 0.975);

    return {
      meanA,
      meanB,
      probAGreater,
      credibleInterval: [lifts[lowerIdx] ?? 0, lifts[upperIdx] ?? 0],
    };
  }

  private _sampleBeta(alpha: number, beta: number): number {
    let x = 0;
    let y = 0;
    for (let i = 0; i < Math.ceil(alpha); i++) {
      x += -Math.log(Math.random() + 1e-10);
    }
    for (let i = 0; i < Math.ceil(beta); i++) {
      y += -Math.log(Math.random() + 1e-10);
    }
    return x / (x + y);
  }

  private _computeCausalImpact(preData: number[], postData: number[]): number {
    if (preData.length < 10 || postData.length < 3) return 0;

    const preMean = preData.reduce((a, b) => a + b, 0) / preData.length;
    const preStd = Math.sqrt(
      preData.reduce((a, b) => a + (b - preMean) ** 2, 0) / preData.length
    );

    const trendSlope = (preData[preData.length - 1] - preData[0]) / Math.max(preData.length, 1);
    const counterfactual: number[] = [];
    for (let i = 0; i < postData.length; i++) {
      const predicted = preMean + trendSlope * (preData.length + i);
      const uncertainty = preStd * (1 + i * 0.2);
      counterfactual.push(predicted + (Math.random() - 0.5) * uncertainty);
    }

    const observedMean = postData.reduce((a, b) => a + b, 0) / postData.length;
    const counterfactualMean =
      counterfactual.reduce((a, b) => a + b, 0) / counterfactual.length;
    const causalImpact =
      (observedMean - counterfactualMean) / Math.max(counterfactualMean, 0.001);

    return causalImpact;
  }

  async runTest(
    packName: string,
    versionA: string,
    versionB: string,
    metricData: {
      versionA: { metricValues: number[]; successes: number; trials: number };
      versionB: { metricValues: number[]; successes: number; trials: number };
    },
    preExperimentMetric?: number[]
  ): Promise<ABTestResult> {
    const { meanA, meanB, probAGreater, credibleInterval } = this._bayesianBetaBinomial(
      metricData.versionA.successes,
      metricData.versionA.trials,
      metricData.versionB.successes,
      metricData.versionB.trials
    );

    const lift = (meanB - meanA) / Math.max(meanA, 0.001);
    const significant =
      probAGreater > this._config.confidenceLevel ||
      1 - probAGreater > this._config.confidenceLevel;

    const causalImpactVal = preExperimentMetric
      ? this._computeCausalImpact(preExperimentMetric, metricData.versionB.metricValues)
      : lift;

    let recommendation: ABTestResult['recommendation'];
    if (significant && lift > 0) recommendation = 'roll_out';
    else if (significant && lift < 0) recommendation = 'roll_back';
    else if (metricData.versionB.trials < this._config.minSampleSize)
      recommendation = 'continue_testing';
    else recommendation = 'inconclusive';

    return {
      packName,
      versionA,
      versionB,
      metricName: 'agent_success_rate',
      meanA,
      meanB,
      lift,
      posteriorProbability: probAGreater,
      credibleInterval,
      causalImpact: causalImpactVal,
      significant,
      recommendation,
      samplesA: metricData.versionA.trials,
      samplesB: metricData.versionB.trials,
    };
  }

  async batchTest(
    packUpdates: {
      packName: string;
      versionA: string;
      versionB: string;
      metricData: {
        versionA: { metricValues: number[]; successes: number; trials: number };
        versionB: { metricValues: number[]; successes: number; trials: number };
      };
      preExperimentMetric?: number[];
    }[]
  ): Promise<ABTestResult[]> {
    return Promise.all(
      packUpdates.map(p =>
        this.runTest(p.packName, p.versionA, p.versionB, p.metricData, p.preExperimentMetric)
      )
    );
  }
}
