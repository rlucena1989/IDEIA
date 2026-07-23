import type { ValidateOutput, Issue, Rule } from './types';
import { detectInconsistencies } from './inconsistencies';
import { computeMetrics } from './metrics';

function structuralCheck(answer: unknown): Issue[] {
  const issues: Issue[] = [];
  if (answer === null || answer === undefined) {
    issues.push({ layer: 'structural', message: 'Resposta vazia ou nula', severity: 'high' });
    return issues;
  }
  if (typeof answer === 'object' && !Array.isArray(answer)) {
    if (Object.keys(answer as Record<string, unknown>).length === 0) {
      issues.push({ layer: 'structural', message: 'Objeto vazio sem propriedades', severity: 'medium' });
    }
  }
  if (typeof answer === 'string' && answer.trim().length === 0) {
    issues.push({ layer: 'structural', message: 'String vazia', severity: 'high' });
  }
  return issues;
}

function numericalCheck(answer: unknown, groundTruth?: unknown): Issue[] {
  const issues: Issue[] = [];
  const answerMetrics = computeMetrics(answer);
  if (answerMetrics.metrics.length === 0) return issues;

  if (groundTruth !== undefined) {
    const truthMetrics = computeMetrics(groundTruth);
    if (truthMetrics.metrics.length > 0) {
      const aMean = answerMetrics.metrics.find(m => m.label === 'mean');
      const tMean = truthMetrics.metrics.find(m => m.label === 'mean');
      if (aMean && tMean && Math.abs(aMean.value - tMean.value) > 0.01) {
        issues.push({ layer: 'numerical', message: `Média difere do valor esperado: ${aMean.value} vs ${tMean.value}`, severity: 'high' });
      }
      const aSum = answerMetrics.metrics.find(m => m.label === 'sum');
      const tSum = truthMetrics.metrics.find(m => m.label === 'sum');
      if (aSum && tSum && Math.abs(aSum.value - tSum.value) > 0.01) {
        issues.push({ layer: 'numerical', message: `Soma difere do valor esperado: ${aSum.value} vs ${tSum.value}`, severity: 'medium' });
      }
      const aCount = answerMetrics.metrics.find(m => m.label === 'count');
      const tCount = truthMetrics.metrics.find(m => m.label === 'count');
      if (aCount && tCount && aCount.value !== tCount.value) {
        issues.push({ layer: 'numerical', message: `Contagem difere: ${aCount.value} vs ${tCount.value}`, severity: 'medium' });
      }
    }
  }
  return issues;
}

/**
 * Valida answer.
 * @param answer - Valor answer.
 * @param groundTruth - Valor truth.
 * @param rules - Valor rules.
 * @returns O resultado da operação.
 */
export function validateAnswer(answer: unknown, groundTruth?: unknown, rules?: Rule[]): ValidateOutput {
  const structural = structuralCheck(answer);
  const numerical = numericalCheck(answer, groundTruth);
  const inconsistencyResult = detectInconsistencies(answer, rules);
  const logical = inconsistencyResult.inconsistencies.map(i => ({
    layer: 'logical' as const,
    message: i.message,
    severity: i.severity,
  }));

  const allIssues = [...structural, ...numerical, ...logical];

  const hasHigh = allIssues.some(i => i.severity === 'high');
  const hasMedium = allIssues.some(i => i.severity === 'medium');

  const maxScore = allIssues.length;
  const penalty = hasHigh ? 0.5 : hasMedium ? 0.25 : 0;
  const score = maxScore === 0 ? 100 : Math.round(Math.max(0, (1 - penalty) * 100));

  const suggestionParts: string[] = [];
  if (hasHigh) suggestionParts.push('Corrija os problemas de alta severidade primeiro');
  if (hasMedium) suggestionParts.push('Revise as inconsistências de média severidade');
  if (allIssues.length === 0) suggestionParts.push('Nenhum problema encontrado');

  return {
    valid: allIssues.length === 0,
    score,
    issues: allIssues,
    suggestions: suggestionParts.join('. ') + '.',
  };
}
