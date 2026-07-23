import type { HintsOutput, Hint, ProblemDescriptor, ContextInfo } from './types';

function classifyProblem(input: string): { type: string; keywords: string[] } {
  const lower = input.toLowerCase();

  const patterns = [
    { type: 'calculation', keywords: ['sum', 'mean', 'average', 'total', 'count', 'calculate', 'compute', 'soma', 'média', 'total', 'calcule'] },
    { type: 'validation', keywords: ['check', 'verify', 'validate', 'ensure', 'confirm', 'verifique', 'valide', 'confirme'] },
    { type: 'statistics', keywords: ['stddev', 'variance', 'correlation', 'regression', 'distribution', 'desvio', 'variância', 'correlação'] },
    { type: 'physics', keywords: ['force', 'energy', 'velocity', 'acceleration', 'mass', 'força', 'energia', 'velocidade'] },
    { type: 'comparison', keywords: ['compare', 'versus', 'vs', 'difference', 'diff', 'gap', 'compare', 'diferença'] },
    { type: 'ranking', keywords: ['rank', 'priority', 'prioritize', 'order', 'sort', 'ranqueie', 'prioridade', 'ordene'] },
    { type: 'simulation', keywords: ['simulate', 'what-if', 'scenario', 'forecast', 'predict', 'simule', 'cenário', 'preveja'] },
  ];

  for (const pattern of patterns) {
    if (pattern.keywords.some(k => lower.includes(k))) {
      return pattern;
    }
  }

  return { type: 'general', keywords: [] };
}

/**
 * Gera reasoning hints.
 * @param problem - Valor problem.
 * @param context - Valor context.
 * @returns O resultado da operação.
 */
export function generateReasoningHints(problem: ProblemDescriptor, context?: ContextInfo): HintsOutput {
  const hints: Hint[] = [];
  const deterministicPaths: string[] = [];
  const classification = classifyProblem(problem.input);

  switch (classification.type) {
    case 'calculation':
      hints.push({ type: 'calculation', message: 'Use o calculation-engine para resolver este problema numericamente', priority: 1 });
      hints.push({ type: 'constraint', message: 'Verifique se todos os valores de entrada são numéricos válidos', priority: 2 });
      deterministicPaths.push('calculation-engine.executeCalculation');
      break;

    case 'statistics':
      hints.push({ type: 'calculation', message: 'Use o stats-engine para análise estatística (summary, median, correlation)', priority: 1 });
      hints.push({ type: 'constraint', message: 'Verifique se há dados suficientes (n ≥ 2 para desvio padrão)', priority: 2 });
      deterministicPaths.push('stats-engine.summary', 'stats-engine.correlation');
      break;

    case 'physics':
      hints.push({ type: 'calculation', message: 'Use o physics-engine para cálculos de força, energia, etc.', priority: 1 });
      hints.push({ type: 'validation', message: 'Confira as unidades de medida antes de aplicar as fórmulas', priority: 2 });
      deterministicPaths.push('physics-engine.force', 'physics-engine.kineticEnergy');
      break;

    case 'validation':
      hints.push({ type: 'validation', message: 'Use validateAnswer() para verificar a resposta contra valores conhecidos', priority: 1 });
      hints.push({ type: 'constraint', message: 'Defina regras claras de validação (thresholds, intervalos esperados)', priority: 2 });
      deterministicPaths.push('cognitive-coprocessor.validateAnswer');
      break;

    case 'comparison':
      hints.push({ type: 'calculation', message: 'Use computeMetrics() em ambos os conjuntos e compare as métricas', priority: 1 });
      hints.push({ type: 'context', message: 'Calcule o delta e a diferença percentual entre os grupos', priority: 2 });
      deterministicPaths.push('cognitive-coprocessor.computeMetrics');
      break;

    case 'ranking':
      hints.push({ type: 'calculation', message: 'Use rankPriorities() com pesos configurados para cada critério', priority: 1 });
      hints.push({ type: 'constraint', message: 'Defina pesos para urgência, impacto e risco antes de ranquear', priority: 2 });
      deterministicPaths.push('cognitive-coprocessor.rankPriorities');
      break;

    case 'simulation':
      hints.push({ type: 'calculation', message: 'Use simulateOutcomes() para explorar cenários what-if', priority: 1 });
      hints.push({ type: 'context', message: 'Considere usar modo monte-carlo para cenários com incerteza', priority: 2 });
      deterministicPaths.push('cognitive-coprocessor.simulateOutcomes');
      break;

    default: {
      const hasNumber = /\d+/.test(problem.input);
      if (hasNumber) {
        hints.push({ type: 'calculation', message: 'O problema contém valores numéricos. Considere usar computeMetrics() para análise', priority: 2 });
        deterministicPaths.push('cognitive-coprocessor.computeMetrics');
      }
      hints.push({ type: 'context', message: 'Use normalizeInput() para estruturar a entrada antes de processar', priority: 3 });
      deterministicPaths.push('cognitive-coprocessor.normalizeInput');
    }
  }

  if (context?.thresholds) {
    const thresholdEntries = Object.entries(context.thresholds);
    if (thresholdEntries.length > 0) {
      hints.push({ type: 'constraint', message: `Verifique contra thresholds configurados: ${thresholdEntries.map(([k, v]) => `${k}=${v}`).join(', ')}`, priority: 1 });
    }
  }

  hints.sort((a, b) => a.priority - b.priority);

  return {
    hints,
    priority: hints.length > 0 ? Math.min(...hints.map(h => h.priority)) : 5,
    deterministicPaths: [...new Set(deterministicPaths)],
  };
}
