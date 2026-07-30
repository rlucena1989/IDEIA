import { classify, extractRouting, TaskType } from './classifier';
import { createLogger } from '@ideia/logger';
import { BudgetConfig, checkBudget, formatBudgetReport } from './budget';

/** Tipo que define pipeline mode. */
export type PipelineMode = 'short' | 'full' | 'forensic';

/** Interface que define a estrutura de pipeline stage. */
export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  required: boolean;
  durationMs?: number;
  status: 'pending' | 'running' | 'passed' | 'skipped' | 'failed';
  output?: string;
}

/** Interface que define a estrutura de pipeline config. */
export interface PipelineConfig {
  mode: PipelineMode;
  taskType: TaskType;
  stages: PipelineStage[];
}

/** Interface que define a estrutura de pipeline request. */
export interface PipelineRequest {
  description: string;
  files: string[];
  title?: string;
  labels?: string[];
  budget?: Partial<BudgetConfig>;
}

/** Interface que define a estrutura de pipeline report. */
export interface PipelineReport {
  timestamp: string;
  mode: PipelineMode;
  taskType: TaskType;
  stages: PipelineStage[];
  totalDurationMs: number;
  passed: number;
  failed: number;
  skipped: number;
  allPassed: boolean;
  budget?: { allowed: number; consumed: number; estimated: number };
  modeReason: string;
}

const STAGE_EXTRA: Record<string, { full: string[]; short: string[]; forensic: string[] }> = {
  classify:            { full: ['classify'],            short: ['classify'],            forensic: ['classify'] },
  route:               { full: ['route'],               short: [],                      forensic: ['route'] },
  budget:              { full: ['budget'],              short: ['budget'],              forensic: ['budget'] },
  context_minimize:    { full: ['context_minimize'],    short: ['context_minimize'],    forensic: ['context_minimize'] },
  memory_query:        { full: ['memory_query'],        short: [],                      forensic: ['memory_query'] },
  redundancy_check:    { full: ['redundancy_check'],    short: [],                      forensic: ['redundancy_check'] },
  patch_generate:      { full: ['patch_generate'],      short: ['patch_generate'],      forensic: ['patch_generate'] },
  quality_score:       { full: ['quality_score'],       short: ['quality_score'],       forensic: ['quality_score'] },
  risk_score:          { full: ['risk_score'],           short: [],                      forensic: ['risk_score'] },
  approval_gate:       { full: ['approval_gate'],       short: [],                      forensic: ['approval_gate'] },
  apply_changes:       { full: ['apply_changes'],       short: ['apply_changes'],       forensic: ['apply_changes'] },
  report:              { full: ['report'],              short: ['report'],              forensic: ['report'] },
};

const STAGE_META: Record<string, { name: string; description: string; required: boolean }> = {
  classify:            { name: 'Classificar',            description: 'Classificacao automatica do tipo de tarefa', required: true },
  route:               { name: 'Roteamento',             description: 'Roteamento baseado no tipo de tarefa', required: false },
  budget:              { name: 'Orcamento',              description: 'Verificacao de orcamento e limites', required: false },
  context_minimize:    { name: 'Minimizar Contexto',     description: 'Minimizacao de contexto para LLM', required: true },
  memory_query:        { name: 'Memoria',                description: 'Consulta a base de conhecimento e padroes', required: false },
  redundancy_check:    { name: 'Redundancia',            description: 'Verificacao de duplicacao', required: false },
  patch_generate:      { name: 'Gerar Patch',            description: 'Geracao de patch/codigo', required: true },
  quality_score:       { name: 'Qualidade',              description: 'Score de qualidade do resultado', required: true },
  risk_score:          { name: 'Risco',                  description: 'Score de risco da alteracao', required: false },
  approval_gate:       { name: 'Aprovacao',              description: 'Gate de aprovacao para aplicar', required: false },
  apply_changes:       { name: 'Aplicar',                description: 'Aplicacao das mudancas no repositorio', required: false },
  report:              { name: 'Relatorio',              description: 'Geracao de relatorio do pipeline', required: true },
};

/**
 * Obtém stages for mode.
 * @param mode - Valor mode.
 * @returns O resultado da operação.
 */
export function getStagesForMode(mode: PipelineMode): string[] {
  return Object.keys(STAGE_EXTRA).filter(key => {
    const map = STAGE_EXTRA[key];
    if (mode === 'short') return map.short.includes(key);
    if (mode === 'forensic') return map.forensic.includes(key);
    return map.full.includes(key);
  });
}

/**
 * Processa pipeline mode.
 * @param taskType - Valor type.
 * @param budget - Valor budget.
 * @returns O resultado da operação.
 */
export function selectPipelineMode(taskType: TaskType, budget?: Partial<BudgetConfig>): { mode: PipelineMode; reason: string } {
  const forensicTypes: TaskType[] = ['security_review', 'incident_response', 'cleanup'];
  const shortTypes: TaskType[] = ['bugfix', 'test_only', 'dependency_update'];

  if (forensicTypes.includes(taskType)) {
    return { mode: 'forensic', reason: `Tipo "${taskType}" requer pipeline forense completo` };
  }

  if (shortTypes.includes(taskType)) {
    if (budget && budget.max_tokens && budget.max_tokens < 50000) {
      return { mode: 'short', reason: `Tipo "${taskType}" com orcamento limitado (${budget.max_tokens} tokens)` };
    }
    return { mode: 'short', reason: `Tipo "${taskType}" usa pipeline curto por padrão` };
  }

  if (budget && budget.max_tokens && budget.max_tokens < 100000) {
    return { mode: 'short', reason: `Orcamento limitado (${budget.max_tokens} tokens) — pipeline curto` };
  }

  return { mode: 'full', reason: `Tipo "${taskType}" usa pipeline completo (feature/refatoracao)` };
}

/**
 * Constrói pipeline.
 * @param request - Valor request.
 * @param modeOverride - Valor override.
 * @returns O resultado da operação.
 */
export function buildPipeline(request: PipelineRequest, modeOverride?: PipelineMode): PipelineConfig {
  const classificationReq = { description: request.description, files: request.files, title: request.title || '', labels: request.labels || [] };
  const classification = classify(classificationReq);
  const _routing = extractRouting(classification.taskType);

  const mode = modeOverride || selectPipelineMode(classification.taskType, request.budget).mode;
  const stageKeys = getStagesForMode(mode);

  const stages: PipelineStage[] = stageKeys.map((key, i) => ({
    id: `${i + 1}-${key}`,
    name: STAGE_META[key]?.name || key,
    description: STAGE_META[key]?.description || '',
    required: STAGE_META[key]?.required || false,
    status: 'pending' as const,
  }));

  return { mode, taskType: classification.taskType, stages };
}

/**
 * Processa run pipeline.
 * @param request - Valor request.
 * @param modeOverride - Valor override.
 * @returns O resultado da operação.
 */
export function dryRunPipeline(request: PipelineRequest, modeOverride?: PipelineMode): PipelineReport {
  const pipeline = buildPipeline(request, modeOverride);
  const selection = selectPipelineMode(pipeline.taskType, request.budget);

  return {
    timestamp: new Date().toISOString(),
    mode: pipeline.mode,
    taskType: pipeline.taskType,
    stages: pipeline.stages.map(s => ({ ...s })),
    totalDurationMs: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    allPassed: true,
    modeReason: selection.reason,
  };
}

/**
 * Formata pipeline report.
 * @param report - Valor report.
 * @returns O resultado da operação.
 */
export function formatPipelineReport(report: PipelineReport): string {
  const lines: string[] = [];
  lines.push('=== Pipeline Report ===');
  lines.push(`Mode: ${report.mode}`);
  lines.push(`Task Type: ${report.taskType}`);
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push(`Duration: ${report.totalDurationMs}ms`);
  lines.push(`Mode Reason: ${report.modeReason}`);
  lines.push('');

  for (const stage of report.stages) {
    const statusIcon =
      stage.status === 'passed' ? '✅' :
      stage.status === 'failed' ? '❌' :
      stage.status === 'skipped' ? '⏭️' :
      stage.status === 'running' ? '🔄' : '⏳';
    const duration = stage.durationMs ? ` (${stage.durationMs}ms)` : '';
    lines.push(`  ${statusIcon} ${stage.name}: ${stage.status}${duration}`);
  }

  lines.push('');
  lines.push(`Summary: ${report.passed} passed, ${report.failed} failed, ${report.skipped} skipped`);
  lines.push(`All passed: ${report.allPassed ? '✅ Yes' : '❌ No'}`);

  if (report.budget) {
    lines.push('');
    lines.push(`Budget: allowed=${report.budget.allowed}, consumed=${report.budget.consumed}, estimated=${report.budget.estimated}`);
  }

  return lines.join('\n');
}

/** Interface que define a estrutura de simulated stage result. */
export interface SimulatedStageResult {
  id: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
}

/**
 * Processa stages.
 * @param totalStages - Valor stages.
 * @param failStage - Valor stage.
 * @returns O resultado da operação.
 */
export function simulateStages(totalStages: number, failStage?: number): SimulatedStageResult[] {
  return Array.from({ length: totalStages }, (_, i) => ({
    id: String(i + 1),
    status: failStage === (i + 1) ? 'failed' as const : 'passed' as const,
    durationMs: Math.floor(50 + Math.random() * 200),
  }));
}

/**
 * Executa stages.
 * @param pipeline - Valor pipeline.
 * @param simulateFn - Valor fn.
 * @returns O resultado da operação.
 */
export function executeStages(
  pipeline: PipelineConfig,
  simulateFn?: (stage: PipelineStage) => SimulatedStageResult,
): PipelineReport {
  const startTotal = Date.now();

  const resolvedStages = pipeline.stages.map(stage => {
    const s = { ...stage };
    if (s.status !== 'pending') return s;

    try {
      s.status = 'running';
      if (simulateFn) {
        const sim = simulateFn(s);
        s.status = sim.status;
        s.durationMs = sim.durationMs;
      } else {
        s.status = 'passed';
        s.durationMs = 10;
      }
    } catch {
      s.status = 'failed';
      s.durationMs = 0;
    }

    return s;
  });

  const totalDurationMs = Date.now() - startTotal;
  const passed = resolvedStages.filter(s => s.status === 'passed').length;
  const failed = resolvedStages.filter(s => s.status === 'failed').length;
  const skipped = resolvedStages.filter(s => s.status === 'skipped').length;

  return {
    timestamp: new Date().toISOString(),
    mode: pipeline.mode,
    taskType: pipeline.taskType,
    stages: resolvedStages,
    totalDurationMs,
    passed,
    failed,
    skipped,
    allPassed: failed === 0,
    modeReason: `Pipeline ${pipeline.mode} executado com ${resolvedStages.length} etapas`,
  };
}

/**
 * Estima tokens saved.
 * @param mode - Valor mode.
 * @param fullStages - Valor stages.
 * @param currentStages - Valor stages.
 * @returns O resultado da operação.
 */
export function estimateTokensSaved(mode: PipelineMode, fullStages: number, currentStages: number): number {
  const tokensPerStage = 15000;
  const skipped = fullStages - currentStages;
  return mode === 'full' ? 0 : skipped * tokensPerStage;
}

/**
 * Processa label.
 * @param mode - Valor mode.
 * @returns O resultado da operação.
 */
export function modeLabel(mode: PipelineMode): string {
  const labels: Record<PipelineMode, string> = {
    short: 'Curto (bugfix/dependencias/testes)',
    full: 'Completo (features/refatoracoes)',
    forensic: 'Forense (seguranca/incidentes)',
  };
  return labels[mode];
}
