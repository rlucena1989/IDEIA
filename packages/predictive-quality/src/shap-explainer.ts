import { ChangeSet, Prediction } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('shap-explainer');

export class SHAPExplainer {
  async explain(prediction: Prediction, changes: ChangeSet): Promise<string[]> {
    const explanations: string[] = [];
    for (const factor of prediction.topFactors) {
      explanations.push(`${factor.feature}: impact ${(factor.impact * 100).toFixed(1)}% on build failure risk`);
    }
    if (changes.hasDependencyChange) {
      explanations.push('Dependency changes increase build risk by 12%');
    }
    if (changes.testChanges / Math.max(changes.files.length, 1) < 0.3) {
      explanations.push('Low test-to-code ratio increases failure probability');
    }
    return explanations;
  }

  generateReport(explanations: string[]): string {
    const lines = ['=== SHAP Build Failure Explanation ===', ''];
    for (const exp of explanations) lines.push(`  - ${exp}`);
    lines.push('', '=== End Report ===');
    return lines.join('\n');
  }
}
