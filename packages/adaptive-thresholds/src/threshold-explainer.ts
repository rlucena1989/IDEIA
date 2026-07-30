import { SHAPExplanation } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('threshold-explainer');

export class ThresholdExplainer {
  private _backgroundData: number[][] = [];
  private _featureNames: string[];

  constructor(featureNames: string[]) {
    this._featureNames = featureNames;
  }

  setBackground(data: number[][]): void {
    this._backgroundData = data;
  }

  async explain(
    features: number[],
    baseThreshold: number,
    model: { predict: (features: number[]) => Promise<{ threshold: number; confidence: number }> }
  ): Promise<SHAPExplanation> {
    const prediction = await model.predict(features);
    const expectedValue = await this._computeExpectedValue(model);
    const contributions = await this._computeSHAPValues(features, model, expectedValue);
    const interactions = await this._computeInteractionEffects(features, model);
    const topFactors = contributions
      .filter(c => Math.abs(c.shapValue) > 0.01)
      .sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue))
      .slice(0, 5)
      .map(c => `${c.name}=${c.value.toFixed(2)} (${(c.shapValue * 100).toFixed(1)}%)`);
    return {
      metricName: 'threshold', baseThreshold, adjustedThreshold: prediction.threshold,
      featureContributions: contributions, expectedValue, interactionEffects: interactions,
      confidence: prediction.confidence, topFactors,
    };
  }

  private async _computeExpectedValue(model: { predict: (features: number[]) => Promise<{ threshold: number }> }): Promise<number> {
    if (this._backgroundData.length === 0) return 0.5;
    let sum = 0;
    for (const bg of this._backgroundData.slice(0, 50)) {
      const pred = await model.predict(bg);
      sum += pred.threshold;
    }
    return sum / Math.min(this._backgroundData.length, 50);
  }

  private async _computeSHAPValues(
    features: number[],
    model: { predict: (features: number[]) => Promise<{ threshold: number }> },
    expectedValue: number
  ): Promise<Array<{ name: string; value: number; shapValue: number; direction: 'up' | 'down' | 'none' }>> {
    const contributions: Array<{ name: string; value: number; shapValue: number; direction: 'up' | 'down' | 'none' }> = [];
    for (let i = 0; i < features.length; i++) {
      let shapValue = 0;
      const nPermutations = Math.min(25, 2 ** features.length);
      for (let p = 0; p < nPermutations; p++) {
        const subset = this._randomSubset(features.length, i);
        const withFeature = await this._predictWithSubset(features, subset, i, true, model);
        const withoutFeature = await this._predictWithSubset(features, subset, i, false, model);
        shapValue += withFeature - withoutFeature;
      }
      shapValue /= nPermutations;
      const direction = shapValue > 0.01 ? 'up' : shapValue < -0.01 ? 'down' : 'none';
      contributions.push({
        name: this._featureNames[i] ?? `feature_${i}`,
        value: features[i],
        shapValue: Math.round(shapValue * 10000) / 10000,
        direction,
      });
    }
    const totalShap = contributions.reduce((s, c) => s + c.shapValue, 0);
    const scale = totalShap !== 0 ? 1 / totalShap : 1;
    for (const c of contributions) c.shapValue *= scale;
    return contributions;
  }

  private async _predictWithSubset(
    features: number[], subset: number[], featureIdx: number, includeFeature: boolean,
    model: { predict: (features: number[]) => Promise<{ threshold: number }> }
  ): Promise<number> {
    const maskedFeatures = features.map((f, i) => {
      if (i === featureIdx) return includeFeature ? f : 0;
      if (subset.includes(i)) return f;
      return this._backgroundData.length > 0
        ? this._backgroundData[Math.floor(Math.random() * this._backgroundData.length)]?.[i] ?? 0 : 0;
    });
    const pred = await model.predict(maskedFeatures);
    return pred.threshold;
  }

  private async _computeInteractionEffects(
    features: number[],
    model: { predict: (features: number[]) => Promise<{ threshold: number }> }
  ): Promise<Array<{ featureA: string; featureB: string; interactionValue: number }>> {
    const interactions: Array<{ featureA: string; featureB: string; interactionValue: number }> = [];
    for (let i = 0; i < Math.min(features.length, 5); i++) {
      for (let j = i + 1; j < Math.min(features.length, 5); j++) {
        const fI = [...features]; fI[i] = features[i] + 0.1; fI[j] = features[j] + 0.1;
        const bothHigh = await model.predict(fI);
        const fJ = [...features]; fJ[j] = features[j] + 0.1;
        const onlyJ = await model.predict(fJ);
        const fI2 = [...features]; fI2[i] = features[i] + 0.1;
        const onlyI = await model.predict(fI2);
        const base = await model.predict(features);
        interactions.push({
          featureA: this._featureNames[i] ?? `feature_${i}`,
          featureB: this._featureNames[j] ?? `feature_${j}`,
          interactionValue: Math.round((bothHigh.threshold - onlyI.threshold - onlyJ.threshold + base.threshold) * 10000) / 10000,
        });
      }
    }
    return interactions;
  }

  private _randomSubset(n: number, excludeIndex: number): number[] {
    const subset: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i !== excludeIndex && Math.random() > 0.5) subset.push(i);
    }
    return subset;
  }

  generateExplanationReport(explanation: SHAPExplanation): string {
    const lines = [
      '=== Threshold Explanation Report ===',
      `Metric: ${explanation.metricName}`,
      `Base threshold: ${explanation.baseThreshold.toFixed(2)}`,
      `Adjusted threshold: ${explanation.adjustedThreshold.toFixed(2)}`,
      `Delta: ${(explanation.adjustedThreshold - explanation.baseThreshold).toFixed(2)}`,
      `Confidence: ${(explanation.confidence * 100).toFixed(0)}%`,
      '', 'SHAP Feature Contributions (sorted by absolute impact):',
    ];
    const sorted = [...explanation.featureContributions].sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
    for (const c of sorted) {
      const icon = c.direction === 'up' ? 'UP' : c.direction === 'down' ? 'DOWN' : '--';
      lines.push(`  ${icon} ${c.name}: ${(c.shapValue * 100).toFixed(1)}% (value=${c.value.toFixed(3)})`);
    }
    if (explanation.interactionEffects.length > 0) {
      lines.push('', 'Interaction Effects:');
      for (const ix of explanation.interactionEffects) {
        lines.push(`  ${ix.featureA} x ${ix.featureB}: ${ix.interactionValue.toFixed(4)}`);
      }
    }
    lines.push('', 'Top factors driving this adjustment:');
    for (const factor of explanation.topFactors) lines.push(`  - ${factor}`);
    lines.push('', '=== End Report ===');
    return lines.join('\n');
  }
}
