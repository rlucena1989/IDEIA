import { SimulationScenario } from './simulation-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('scenario-builder');

export function buildScenario(
  scenarioId: string,
  name: string,
  description: string,
  inputs: Record<string, string | number | boolean>,
  constraints: string[],
  expectedOutcome: string
): SimulationScenario {
  return {
    scenarioId,
    name,
    description,
    inputs,
    constraints,
    expectedOutcome,
  };
}
