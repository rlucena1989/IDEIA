import { AutonomyLevel, PhaseId, RiskLevel, TaskNode } from './orchestration-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('autonomy-policy');

/** Interface que define a estrutura de autonomy config. */
export interface AutonomyConfig {
  baseLevel: AutonomyLevel;
  confidenceThreshold: number;
  autoExecuteRiskThreshold: RiskLevel;
  requireValidationForPhases: string[];
  autoRetryOnFailure: boolean;
  maxRetries: number;
}

/** Interface que define a estrutura de risk factor. */
export interface RiskFactor {
  name: string;
  weight: number;
  score: number;
  contribution: number;
}

/** Interface que define a estrutura de risk score. */
export interface RiskScore {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
}

const PHASE_ORDER: PhaseId[] = [
  'diagnosis', 'structuring', 'parallelization', 'checkpoint',
  'multi-model', 'decision-routing', 'full-autonomous',
  'adaptive-governance', 'industrial-autonomy',
];

/**
 * Calcula risk score.
 * @param task - Valor task.
 * @param _config - Valor _config.
 * @returns O resultado da operação.
 */
export function calculateRiskScore(task: TaskNode, _config?: Partial<AutonomyConfig>): RiskScore {
  const factors: RiskFactor[] = [];

  const riskLevelMap: Record<RiskLevel, number> = { low: 20, medium: 55, high: 85 };
  const riskLevelScore = riskLevelMap[task.riskLevel];
  factors.push({ name: 'riskLevel', weight: 0.4, score: riskLevelScore, contribution: riskLevelScore * 0.4 });

  const effortMap: Record<string, number> = { hours: 30, days: 60, weeks: 85 };
  const effortScore = effortMap[task.estimatedEffort] ?? 30;
  factors.push({ name: 'estimatedEffort', weight: 0.15, score: effortScore, contribution: effortScore * 0.15 });

  const depCount = task.dependsOn.length;
  const depScore = depCount === 0 ? 10 : depCount === 1 ? 30 : depCount === 2 ? 50 : 70;
  factors.push({ name: 'dependsOn', weight: 0.15, score: depScore, contribution: depScore * 0.15 });

  const llmScore = task.requiresLLM ? 40 : 10;
  factors.push({ name: 'requiresLLM', weight: 0.1, score: llmScore, contribution: llmScore * 0.1 });

  const detScore = task.isDeterministic ? 10 : 50;
  factors.push({ name: 'isDeterministic', weight: 0.1, score: detScore, contribution: detScore * 0.1 });

  const phaseIdx = PHASE_ORDER.indexOf(task.phase);
  const totalPhases = PHASE_ORDER.length;
  let phaseScore: number;
  if (phaseIdx < 0) {
    phaseScore = 50;
  } else if (phaseIdx < totalPhases / 3) {
    phaseScore = 20;
  } else if (phaseIdx < (totalPhases * 2) / 3) {
    phaseScore = 50;
  } else {
    phaseScore = 80;
  }
  factors.push({ name: 'phase', weight: 0.1, score: phaseScore, contribution: phaseScore * 0.1 });

  const rawScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  const score = Math.round(rawScore);

  let level: RiskLevel;
  if (score <= 33) level = 'low';
  else if (score <= 66) level = 'medium';
  else level = 'high';

  return { score, level, factors };
}

/**
 * Formata risk profile.
 * @param riskScore - Valor score.
 * @returns O resultado da operação.
 */
export function formatRiskProfile(riskScore: RiskScore): string {
  const sorted = [...riskScore.factors].sort((a, b) => b.contribution - a.contribution);
  const top3 = sorted.slice(0, 3);
  const levelLabel = riskScore.level === 'high' ? 'ALTO' : riskScore.level === 'medium' ? 'MEDIO' : 'BAIXO';
  const factorsStr = top3.map(f => `${f.name}(${f.score})`).join(', ');
  return `Risco ${riskScore.score}/100 (${levelLabel}) — Fatores: ${factorsStr}`;
}

const DEFAULT_CONFIG: AutonomyConfig = {
  baseLevel: 'guided',
  confidenceThreshold: 0.7,
  autoExecuteRiskThreshold: 'low',
  requireValidationForPhases: ['diagnosis', 'full-autonomous', 'industrial-autonomy'],
  autoRetryOnFailure: true,
  maxRetries: 2,
};

/**
 * Obtém effective autonomy level.
 * @param config - Valor config.
 * @param systemConfidence - Valor confidence.
 * @param recentFailureRate - Valor failure rate.
 * @param riskScore - Valor score.
 * @returns O resultado da operação.
 */
export function getEffectiveAutonomyLevel(
  config: Partial<AutonomyConfig>,
  systemConfidence: number,
  recentFailureRate: number,
  riskScore?: number,
): AutonomyLevel {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (recentFailureRate > 0.5) return 'blocked';
  if (riskScore !== undefined && riskScore >= 85) return 'blocked';
  if (riskScore !== undefined && riskScore >= 60 && riskScore < 85 && systemConfidence < 0.7) return 'guided';
  if (riskScore !== undefined && riskScore < 60 && systemConfidence >= 0.7 && recentFailureRate <= 0.5) return cfg.baseLevel;
  if (systemConfidence < cfg.confidenceThreshold) return 'guided';
  return cfg.baseLevel;
}

/**
 * Processa auto execute.
 * @param task - Valor task.
 * @param autonomyLevel - Valor level.
 * @param config - Valor config.
 * @param riskScore - Valor score.
 * @returns O resultado da operação.
 */
export function shouldAutoExecute(
  task: TaskNode,
  autonomyLevel: AutonomyLevel,
  config?: Partial<AutonomyConfig>,
  riskScore?: number,
): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (riskScore !== undefined && riskScore >= 85) return false;
  if (autonomyLevel === 'blocked') return false;
  if (autonomyLevel === 'autonomous') return true;
  if (riskScore !== undefined && riskScore < 60) return true;

  if (task.riskLevel === 'high') return false;
  if (task.riskLevel === 'medium' && autonomyLevel === 'guided') return false;

  const riskOrder: RiskLevel[] = ['low', 'medium', 'high'];
  const thresholdOrder: RiskLevel[] = ['low', 'medium', 'high'];
  const taskRiskIdx = riskOrder.indexOf(task.riskLevel);
  const thresholdIdx = thresholdOrder.indexOf(cfg.autoExecuteRiskThreshold);

  return taskRiskIdx <= thresholdIdx;
}

/**
 * Processa request human decision.
 * @param task - Valor task.
 * @param autonomyLevel - Valor level.
 * @param config - Valor config.
 * @returns O resultado da operação.
 */
export function shouldRequestHumanDecision(
  task: TaskNode,
  autonomyLevel: AutonomyLevel,
  config?: Partial<AutonomyConfig>,
): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (autonomyLevel === 'autonomous') return false;
  if (autonomyLevel === 'blocked') return true;

  if (task.riskLevel === 'high') return true;

  if (cfg.requireValidationForPhases.includes(task.phase)) return true;

  return false;
}

/**
 * Processa retry.
 * @param attemptNumber - Valor number.
 * @param task - Valor task.
 * @param config - Valor config.
 * @returns O resultado da operação.
 */
export function shouldRetry(
  attemptNumber: number,
  task: TaskNode,
  config?: Partial<AutonomyConfig>,
): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  if (!cfg.autoRetryOnFailure) return false;
  return attemptNumber < cfg.maxRetries;
}

/**
 * Processa autonomy for phase.
 * @param phase - Valor phase.
 * @param systemConfidence - Valor confidence.
 * @param completedTasks - Valor tasks.
 * @param totalTasks - Valor tasks.
 * @returns O resultado da operação.
 */
export function adaptAutonomyForPhase(
  phase: string,
  systemConfidence: number,
  completedTasks: number,
  totalTasks: number,
): AutonomyLevel {
  if (systemConfidence < 0.3) return 'blocked';
  if (systemConfidence < 0.6) return 'guided';

  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;

  if (progress < 0.3) return 'guided';
  if (progress < 0.7) return 'autonomous';

  return 'autonomous';
}

/**
 * Calcula system confidence.
 * @param recentSuccessRate - Valor success rate.
 * @param qualityScore - Valor score.
 * @param checkpointPassRate - Valor pass rate.
 * @returns O resultado da operação.
 */
export function calculateSystemConfidence(
  recentSuccessRate: number,
  qualityScore: number,
  checkpointPassRate: number,
): number {
  const weights = { successRate: 0.4, qualityScore: 0.35, checkpointRate: 0.25 };
  return (
    recentSuccessRate * weights.successRate +
    (qualityScore / 100) * weights.qualityScore +
    checkpointPassRate * weights.checkpointRate
  );
}

/**
 * Constrói autonomy summary.
 * @param level - Valor level.
 * @param confidence - Valor confidence.
 * @returns O resultado da operação.
 */
export function buildAutonomySummary(level: AutonomyLevel, confidence: number): string {
  const labels: Record<AutonomyLevel, string> = {
    autonomous: 'Execucao autonoma — sem intervencao humana',
    guided: 'Execucao guiada — decisao humana em pontos de risco',
    blocked: 'Execucao bloqueada — requer decisao humana para continuar',
  };
  return `${labels[level]} (confianca: ${(confidence * 100).toFixed(0)}%)`;
}
