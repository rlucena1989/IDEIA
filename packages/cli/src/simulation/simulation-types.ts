import * as _crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('simulation-types');

export interface SimulationScenario {
  scenarioId: string;
  name: string;
  description: string;
  inputs: Record<string, string | number | boolean>;
  constraints: string[];
  expectedOutcome: string;
}

export interface SimulationResult {
  scenarioId: string;
  simulatedAt: string;
  ok: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  notes: string[];
  projection: Record<string, unknown>;
}

export interface SimulationComparison {
  comparisonId: string;
  comparedAt: string;
  winners: string[];
  differences: string[];
}
