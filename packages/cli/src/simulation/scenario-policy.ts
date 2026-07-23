export interface ScenarioPolicy {
  maxConstraints: number;
  blockOnCriticalRisk: boolean;
  requireValidationBeforeExecution: boolean;
}

export const DEFAULT_SCENARIO_POLICY: ScenarioPolicy = {
  maxConstraints: 10,
  blockOnCriticalRisk: true,
  requireValidationBeforeExecution: true,
};
