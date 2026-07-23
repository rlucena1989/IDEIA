import { SimulationScenario } from './simulation-types';

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
