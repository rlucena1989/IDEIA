import type { SimulateOutput, Scenario, Outcome, SimConfig } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('simulate');

function deterministicRun(scenario: Scenario): number {
  const vars = scenario.variables;
  if (scenario.rules && scenario.rules.length > 0) {
    let result = 0;
    for (const rule of scenario.rules) {
      const match = rule.condition.match(/^(\w+)\s*([><=!]+)\s*(\d+\.?\d*)$/);
      if (match) {
        const varName = match[1];
        const op = match[2];
        const threshold = parseFloat(match[3]);
        const val = vars[varName] ?? 0;
        const conditionMet = op === '>' ? val > threshold : op === '<' ? val < threshold : op === '>=' ? val >= threshold : op === '<=' ? val <= threshold : val === threshold;
        if (conditionMet) {
          result += rule.weight ?? 1;
        }
      }
    }
    return result;
  }
  return Object.values(vars).reduce((a, b) => a + b, 0);
}

function heuristicRun(scenario: Scenario): number {
  const vars = scenario.variables;
  let score = 0;
  for (const [key, val] of Object.entries(vars)) {
    const weight = key === 'risk' ? 0.3 : key === 'effort' ? 0.2 : key === 'impact' ? 0.4 : key === 'confidence' ? 0.1 : 0.25;
    score += val * weight;
  }
  return Math.round(score * 100) / 100;
}

function monteCarloRun(scenario: Scenario, iterations: number): Outcome[] {
  const outcomes: Outcome[] = [];
  const baseVars = { ...scenario.variables };

  for (let i = 0; i < iterations; i++) {
    const perturbed: Record<string, number> = {};
    for (const [key, val] of Object.entries(baseVars)) {
      const noise = val * 0.1 * (Math.random() * 2 - 1);
      perturbed[key] = Math.round((val + noise) * 100) / 100;
    }
    const result = deterministicRun({ ...scenario, variables: perturbed });
    outcomes.push({
      scenario: `iteration_${i + 1}`,
      result: Math.round(result * 100) / 100,
      probability: 1 / iterations,
      variables: perturbed,
    });
  }

  outcomes.sort((a, b) => b.result - a.result);
  return outcomes;
}

/**
 * Processa outcomes.
 * @param scenario - Valor scenario.
 * @param config - Valor config.
 * @returns O resultado da operação.
 */
export function simulateOutcomes(scenario: Scenario, config?: SimConfig): SimulateOutput {
  const mode = config?.mode || 'deterministic';
  const iterations = config?.iterations || 100;

  let outcomes: Outcome[];

  switch (mode) {
    case 'heuristic': {
      const result = heuristicRun(scenario);
      outcomes = [{ scenario: scenario.name, result, probability: 1, variables: scenario.variables }];
      break;
    }
    case 'monte-carlo': {
      outcomes = monteCarloRun(scenario, iterations);
      break;
    }
    case 'deterministic':
    default: {
      const result = deterministicRun(scenario);
      outcomes = [{ scenario: scenario.name, result, probability: 1, variables: scenario.variables }];
      break;
    }
  }

  const avgResult = outcomes.length > 0
    ? outcomes.reduce((s, o) => s + o.result, 0) / outcomes.length
    : 0;

  const confidence = mode === 'deterministic' ? 1 : mode === 'heuristic' ? 0.7 : Math.min(0.5 + outcomes.length * 0.005, 0.9);

  const recommendations: string[] = [];
  if (outcomes.length > 0) {
    const best = outcomes.reduce((a, b) => a.result > b.result ? a : b);
    recommendations.push(`Melhor cenário: "${best.scenario}" com resultado ${best.result}`);
    if (mode === 'monte-carlo' && avgResult > 0) {
      recommendations.push(`Resultado médio esperado: ${Math.round(avgResult * 100) / 100}`);
    }
  }
  if (mode === 'deterministic' && Object.keys(scenario.variables).length > 0) {
    recommendations.push('Considere usar modo heurístico ou monte-carlo para explorar variações.');
  }

  return { outcomes, confidence: Math.round(confidence * 100) / 100, recommendations };
}
