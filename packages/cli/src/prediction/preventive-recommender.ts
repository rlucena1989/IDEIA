import { PredictionResult } from './prediction-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('preventive-recommender');

export function recommendPrevention(prediction: PredictionResult): string[] {
  if (prediction.riskLevel === 'critical') {
    return ['Pause autonomous changes', 'Trigger human review', 'Run preventive maintenance immediately'];
  }

  if (prediction.riskLevel === 'high') {
    return ['Increase monitoring', 'Reduce autonomy level', 'Schedule preventive maintenance'];
  }

  if (prediction.riskLevel === 'moderate') {
    return ['Watch trend closely', 'Prepare maintenance plan'];
  }

  return ['Continue normal supervision'];
}
