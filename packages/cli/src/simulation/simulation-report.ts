import { SimulationScenario } from './simulation-types';
import { SimulationResult, SimulationComparison } from './simulation-types';
import { ValidationResult } from './simulation-validator';

export interface SimulationReport {
  generatedAt: string;
  scenario: SimulationScenario;
  result: SimulationResult;
  validation: ValidationResult;
  comparison?: SimulationComparison;
  summary: string[];
}

export function buildSimulationReport(params: {
  scenario: SimulationScenario;
  result: SimulationResult;
  validation: ValidationResult;
  comparison?: SimulationComparison;
}): SimulationReport {
  const summary: string[] = [
    `Cenário: ${params.scenario.name}`,
    `Resultado: ${params.result.ok ? 'OK' : 'Falhou'} (risco: ${params.result.riskLevel})`,
    `Validação: ${params.validation.valid ? 'Aprovado' : 'Rejeitado'}`,
  ];

  if (params.comparison) {
    summary.push(`Comparação: ${params.comparison.winners.length} vencedore(s)`);
  }

  return {
    generatedAt: new Date().toISOString(),
    ...params,
    summary,
  };
}
