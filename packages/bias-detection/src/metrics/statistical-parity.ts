// ==========================================================================
// metrics/statistical-parity.ts
// ==========================================================================

import type { Severity } from '../types';
import { DemographicParityMetric } from './demographic-parity';

export class StatisticalParityMetric {
  static compute(predictions: boolean[], _actual: boolean[], sensitive: boolean[]): number {
    return DemographicParityMetric.compute(predictions, _actual, sensitive);
  }

  static interpret(value: number, threshold: number): { interpretation: string; severity: Severity; recommendation: string } {
    return DemographicParityMetric.interpret(value, threshold);
  }
}
