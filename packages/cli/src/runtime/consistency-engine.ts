import { PatternRegistry, PatternDefinition, PatternCategory, PatternMatch } from './pattern-registry';
import { PatternObserver, PatternSignal, inferPattern } from './pattern-observer';

/** Tipo que define engine mode. */
export type EngineMode = 'preserve' | 'adapt' | 'replace' | 'create';

/** Tipo que define change intent. */
export type ChangeIntent = 'new_feature' | 'bugfix' | 'refactor' | 'optimization' | 'security' | 'docs' | 'unknown';

/** Interface que define a estrutura de consistency context. */
export interface ConsistencyContext {
  intent: ChangeIntent;
  filePath: string;
  existingPatterns: PatternMatch[];
  code: string;
  complexity: number;
  risk: 'low' | 'medium' | 'high';
}

/** Interface que define a estrutura de engine decision. */
export interface EngineDecision {
  patternId: string;
  mode: EngineMode;
  confidence: number;
  reason: string;
  alternatives: string[];
  upgradeSuggestion?: string;
  riskWarning?: string;
}

/** Interface que define a estrutura de engine report. */
export interface EngineReport {
  decisions: EngineDecision[];
  overallMode: EngineMode;
  preserveCount: number;
  adaptCount: number;
  replaceCount: number;
  createCount: number;
  summary: string;
}

/**
 * Processa intent.
 * @param code - Valor code.
 * @param filePath - Valor path.
 * @returns O resultado da operação.
 */
function classifyIntent(code: string, _filePath: string): ChangeIntent {
  const lower = code.toLowerCase();
  if (lower.includes('fix') || lower.includes('bug') || lower.includes('error') || lower.includes('issue')) return 'bugfix';
  if (lower.includes('refactor') || lower.includes('rename') || lower.includes('extract') || lower.includes('move')) return 'refactor';
  if (lower.includes('optimize') || lower.includes('perf') || lower.includes('speed') || lower.includes('cache')) return 'optimization';
  if (lower.includes('auth') || lower.includes('token') || lower.includes('password') || lower.includes('security') || lower.includes('sanitize')) return 'security';
  if (lower.includes('doc') || lower.includes('readme') || lower.includes('comment') || lower.includes('jsdoc')) return 'docs';
  if (lower.includes('add') || lower.includes('create') || lower.includes('new') || lower.includes('implement') || lower.includes('feature')) return 'new_feature';
  return 'unknown';
}

/**
 * Estima complexity.
 * @param code - Valor code.
 * @returns O resultado da operação.
 */
function estimateComplexity(code: string): number {
  const lines = code.split('\n').length;
  const branches = (code.match(/\bif\b|\belse\b|\bswitch\b|\bcase\b|\bfor\b|\bwhile\b/g) || []).length;
  const functions = (code.match(/\bfunction\b|\b=>\b|^\s*(async\s+)?\w+\s*\([^)]*\)\s*\{/gm) || []).length;
  return Math.min(10, Math.round((lines * 0.1 + branches * 0.5 + functions * 0.8)));
}

/**
 * Calcula risk.
 * @param intent - Valor intent.
 * @param complexity - Valor complexity.
 * @param patterns - Valor patterns.
 * @returns O resultado da operação.
 */
function calculateRisk(intent: ChangeIntent, complexity: number, patterns: number): 'low' | 'medium' | 'high' {
  let score = complexity * 0.2 + patterns * 0.1;
  if (intent === 'security') score += 3;
  if (intent === 'bugfix') score += 2;
  if (intent === 'refactor') score += 1;
  if (score >= 5) return 'high';
  if (score >= 2.5) return 'medium';
  return 'low';
}

function matchToDecision(
  match: PatternMatch,
  pattern: PatternDefinition | undefined,
  context: ConsistencyContext,
): EngineDecision {
  const mode: EngineMode = context.intent === 'refactor' || context.intent === 'optimization'
    ? 'adapt'
    : context.intent === 'new_feature'
      ? 'create'
      : 'preserve';

  const riskMsg = context.risk === 'high'
    ? `Risco alto (complexidade ${context.complexity}/10, ${context.existingPatterns.length} padrões afetados).`
    : undefined;

  return {
    patternId: match.patternId,
    mode,
    confidence: pattern ? pattern.confidence * (context.risk === 'low' ? 1 : 0.8) : 0.5,
    reason: `Intenção "${context.intent}" → modo "${mode}" para padrão "${match.patternId}". ${pattern?.description || 'Padrão não encontrado no registry.'}`,
    alternatives: pattern ? pattern.tags : [],
    upgradeSuggestion: mode === 'adapt' ? `Considere evoluir o padrão "${match.patternId}" para a nova versão.` : undefined,
    riskWarning: riskMsg,
  };
}

/** Classe responsável por processa engine. */
export class ConsistencyEngine {
  private registry: PatternRegistry;
  private observer: PatternObserver;

  constructor(registry?: PatternRegistry, observer?: PatternObserver) {
    this.registry = registry || new PatternRegistry();
    this.observer = observer || new PatternObserver(this.registry);
  }

  evaluate(code: string, filePath: string): EngineReport {
    const intent = classifyIntent(code, filePath);
    const observation = this.observer.observe(code, filePath);
    const complexity = estimateComplexity(code);
    const risk = calculateRisk(intent, complexity, observation.matches.length);

    const context: ConsistencyContext = {
      intent,
      filePath,
      existingPatterns: observation.matches,
      code,
      complexity,
      risk,
    };

    const decisions: EngineDecision[] = [];

    for (const match of observation.matches) {
      const pattern = this.registry.get(match.patternId);
      decisions.push(matchToDecision(match, pattern, context));
    }

    if (decisions.length === 0) {
      const inferences = inferPattern(this.registry.getAll(), observation.signals, 0.3);
      for (const inf of inferences) {
        decisions.push({
          patternId: inf.patternId,
          mode: 'create',
          confidence: inf.confidence * (risk === 'low' ? 1 : 0.9),
          reason: `Padrão "${inf.patternId}" sugerido (confiança ${Math.round(inf.confidence * 100)}%). ${inf.recommendation}`,
          alternatives: [],
          upgradeSuggestion: undefined,
          riskWarning: risk === 'high' ? 'Implementação com risco alto — considere revisão.' : undefined,
        });
      }
    }

    const preserveCount = decisions.filter(d => d.mode === 'preserve').length;
    const adaptCount = decisions.filter(d => d.mode === 'adapt').length;
    const replaceCount = decisions.filter(d => d.mode === 'replace').length;
    const createCount = decisions.filter(d => d.mode === 'create').length;

    let overallMode: EngineMode = 'preserve';
    const modeScore = { preserve: preserveCount, adapt: adaptCount, replace: replaceCount, create: createCount };
    const maxCount = Math.max(...Object.values(modeScore));
    if (maxCount > 0) {
      overallMode = (Object.entries(modeScore).find(([, v]) => v === maxCount)?.[0] as EngineMode) || 'preserve';
    }

    const summary = `Intenção: ${intent} | Risco: ${risk} | Complexidade: ${complexity}/10 | ` +
      `Preserve: ${preserveCount} | Adapt: ${adaptCount} | Replace: ${replaceCount} | Create: ${createCount} | ` +
      `Modo geral: ${overallMode}`;

    return { decisions, overallMode, preserveCount, adaptCount, replaceCount, createCount, summary };
  }
}

export { classifyIntent, estimateComplexity, calculateRisk };
