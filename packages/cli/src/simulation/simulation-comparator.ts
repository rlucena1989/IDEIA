import { SimulationResult, SimulationComparison } from './simulation-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('simulation-comparator');

export function compareSimulations(results: SimulationResult[]): SimulationComparison {
  const winners = results
    .filter(r => r.ok)
    .sort((a, b) => {
      const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    })
    .map(r => r.scenarioId);

  const differences = results.map(r => `${r.scenarioId}:${r.riskLevel}`);

  return {
    comparisonId: `comparison-${Date.now()}`,
    comparedAt: new Date().toISOString(),
    winners,
    differences,
  };
}
