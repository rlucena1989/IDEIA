import path from 'node:path';
import { printHeader, printLine, finish } from "../utils/output";
import { getIO } from '../io';
import {
  TASK_TYPE_BUDGETS,
  mergeBudgets,
  validateBudgetConfig,
  parseBudgetFromJson,
  createDefaultConsumption,
  checkBudget,
  formatBudgetReport,
} from '../runtime/budget';
import { loadBudgetConfig, readRequestJson } from './optimize-pipeline';

export function handleBudgetCalculate(requestFile: string): void {
  const cwd = process.cwd();
  const inputPath = path.resolve(cwd, requestFile);
  const request = readRequestJson(inputPath);
  if (!request) {
    printLine('[ERROR] Nao foi possivel ler o request JSON');
    finish({ checkpoint: 'budget_calculate', ok: false, status: 'failed', context_summary: 'Request invalido' });
    return;
  }

  const taskType = (request.task_type as string) || 'feature';
  const overrideBudget = parseBudgetFromJson((request.budget as Record<string, unknown>) || {});
  const globalBudget = loadBudgetConfig(cwd);
  const taskTypeBudget = TASK_TYPE_BUDGETS[taskType] || null;
  const merged = mergeBudgets(globalBudget, taskTypeBudget, overrideBudget);

  const errors = validateBudgetConfig(merged);
  if (errors.length > 0) {
    printLine('[ERROR] Orcamento invalido:');
    for (const e of errors) printLine(`  - ${e}`);
    finish({ checkpoint: 'budget_calculate', ok: false, status: 'failed', context_summary: 'Orcamento invalido' });
    return;
  }

  const consumption = createDefaultConsumption();
  if (request.estimated_tokens) consumption.tokens_used = request.estimated_tokens as number;
  if (request.estimated_files) consumption.files_modified = request.estimated_files as number;
  if (request.estimated_context_size) consumption.context_size_bytes = request.estimated_context_size as number;

  const report = checkBudget(merged, consumption);
  printHeader('Budget Calculation');
  printLine(`Task type: ${taskType}`);
  printLine(formatBudgetReport(report));

  const reportPath = path.join(cwd, '.ai/optimizer/runtime/latest-budget.json');
  getIO().fs.mkDir(path.dirname(reportPath), true);
  getIO().fs.write(reportPath, JSON.stringify({ report, task_type: taskType, calculatedAt: new Date().toISOString() }, null, 2));

  finish({
    checkpoint: 'budget_calculate',
    ok: report.withinBudget,
    status: report.withinBudget ? 'passed' : 'failed',
    context_summary: report.withinBudget ? `Orcamento OK para ${taskType}` : `Orcamento excedido para ${taskType}`,
    data: { report, task_type: taskType },
  });
}

export function handleBudgetCheck(): void {
  const cwd = process.cwd();
  const globalBudget = loadBudgetConfig(cwd);
  const errors = validateBudgetConfig(globalBudget);
  if (errors.length > 0) {
    printLine('[ERROR] Budget config invalido:');
    for (const e of errors) printLine(`  - ${e}`);
    finish({ checkpoint: 'budget_check', ok: false, status: 'failed', context_summary: 'Config invalida' });
    return;
  }

  const consumption = createDefaultConsumption();
  const decision = readRequestJson(path.join(cwd, '.ai/optimizer/runtime/latest-decision.json'));
  if (decision) {
    if (decision.estimated_tokens) consumption.tokens_used = decision.estimated_tokens as number;
    if (decision.estimated_files) consumption.files_modified = decision.estimated_files as number;
    if (decision.estimated_context_size) consumption.context_size_bytes = decision.estimated_context_size as number;
  }

  const quality = readRequestJson(path.join(cwd, '.ai/reports/latest/quality-score.json'));
  if (quality && typeof quality.score === 'number') consumption.quality_score = quality.score;

  const risk = readRequestJson(path.join(cwd, '.ai/reports/latest/risk-score.json'));
  if (risk && typeof risk.score === 'number') consumption.risk_level = risk.score;

  const report = checkBudget(globalBudget, consumption);
  printHeader('Budget Check');
  printLine(formatBudgetReport(report));

  finish({
    checkpoint: 'budget_check',
    ok: report.withinBudget,
    status: report.withinBudget ? 'passed' : 'failed',
    context_summary: report.withinBudget ? 'Orcamento dentro do limite' : 'Orcamento excedido',
    data: { report },
  });
}
