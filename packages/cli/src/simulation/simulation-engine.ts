import { SimulationResult, SimulationScenario } from './simulation-types';

export function runSimulation(scenario: SimulationScenario): SimulationResult {
  const hasCriticalConstraint = scenario.constraints.some(c =>
    c.toLowerCase().includes('critical') || c.toLowerCase().includes('no-go')
  );
  const riskLevel: SimulationResult['riskLevel'] =
    hasCriticalConstraint ? 'critical' :
    scenario.constraints.length > 3 ? 'high' : 'medium';

  return {
    scenarioId: scenario.scenarioId,
    simulatedAt: new Date().toISOString(),
    ok: riskLevel !== 'critical',
    riskLevel,
    notes: ['Simulation executed in dry-run mode.'],
    projection: {
      expectedOutcome: scenario.expectedOutcome,
      inputCount: Object.keys(scenario.inputs).length,
      constraintCount: scenario.constraints.length,
    },
  };
}
