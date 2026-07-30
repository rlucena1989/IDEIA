import { spawnSync } from 'node:child_process';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { printLine } from "../utils/output";
import { getIO } from '../io';
import {
  BudgetConfig,
  DEFAULT_BUDGET,
  parseBudgetFromJson,
  createDefaultConsumption,
  checkBudget,
  formatBudgetReport,
} from '../runtime/budget';
import type { ContextItem } from '../runtime/context-store';

export function runOptimizerPipeline(inputPath: string, cwd: string): boolean {
  const steps = [
    '.ai/optimizer/bin/validate-request.js',
    '.ai/optimizer/bin/analyze-impact.js',
    '.ai/optimizer/bin/get-repository-memory.js',
    '.ai/optimizer/bin/read-git-diff.js',
    '.ai/optimizer/bin/minimize-context.js',
    '.ai/optimizer/bin/summarize-impact.js',
    '.ai/optimizer/bin/generate-patch.js',
    '.ai/optimizer/bin/score-quality.js',
    '.ai/optimizer/bin/score-risk.js'
  ];

  for (const step of steps) {
    const scriptPath = path.join(cwd, step);
    if (!getIO().fs.exists(scriptPath)) {
      printLine(`[SKIP] ${step} — not found`);
      continue;
    }
    const result = spawnSync('node', [scriptPath, inputPath], { cwd, stdio: 'inherit', encoding: 'utf-8' });
    if (result.status !== 0) {
      printLine(`[FAIL] ${step} — exit code ${result.status}`);
      return false;
    }
  }
  return true;
}

export function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(getIO().fs.read(filePath, 'utf8'));
  } catch { return null; }
}

export function loadBudgetConfig(cwd: string): BudgetConfig {
  const budgetYamlPath = path.join(cwd, '.ai/optimizer/budget.yaml');
  const globalBudget = { ...DEFAULT_BUDGET };
  if (getIO().fs.exists(budgetYamlPath)) {
    try {
      const content = getIO().fs.read(budgetYamlPath, 'utf8');
      const parsed = parseBudgetFromJson(JSON.parse(content));
      Object.assign(globalBudget, parsed);
    } catch { /* use defaults */ }
  }
  return globalBudget;
}

export function readRequestJson(inputPath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(getIO().fs.read(inputPath, 'utf8'));
  } catch { return null; }
}

export function runWithBudgetEnforcement(
  inputPath: string,
  cwd: string,
  budgetConfig: BudgetConfig,
): boolean {
  const steps = [
    '.ai/optimizer/bin/validate-request.js',
    '.ai/optimizer/bin/analyze-impact.js',
    '.ai/optimizer/bin/get-repository-memory.js',
    '.ai/optimizer/bin/read-git-diff.js',
    '.ai/optimizer/bin/minimize-context.js',
    '.ai/optimizer/bin/summarize-impact.js',
    '.ai/optimizer/bin/generate-patch.js',
    '.ai/optimizer/bin/score-quality.js',
    '.ai/optimizer/bin/score-risk.js',
  ];

  const consumption = createDefaultConsumption();
  for (const step of steps) {
    const scriptPath = path.join(cwd, step);
    if (!getIO().fs.exists(scriptPath)) {
      printLine(`[SKIP] ${step} — not found`);
      continue;
    }

    consumption.agents_spawned += 1;
    if (consumption.agents_spawned > budgetConfig.max_agents) {
      printLine(`[BUDGET] Agent limit reached (${budgetConfig.max_agents})`);
      return false;
    }

    const stepStarted = Date.now();
    const result = spawnSync('node', [scriptPath, inputPath], { cwd, stdio: 'inherit', encoding: 'utf-8' });
    const elapsed = (Date.now() - stepStarted) / 1000;
    consumption.runtime_seconds += elapsed;

    if (consumption.runtime_seconds > budgetConfig.max_runtime_seconds) {
      printLine(`[BUDGET] Runtime limit reached (${budgetConfig.max_runtime_seconds}s)`);
      return false;
    }

    if (result.status !== 0) {
      printLine(`[FAIL] ${step} — exit code ${result.status}`);
      return false;
    }
  }

  consumption.agents_spawned = Math.min(consumption.agents_spawned, steps.length);

  const decision = readRequestJson(path.join(cwd, '.ai/optimizer/runtime/latest-decision.json'));
  if (decision) {
    const tokens = decision.estimated_tokens as number | undefined;
    if (tokens) consumption.tokens_used = tokens;
    const files = decision.estimated_files as number | undefined;
    if (files) consumption.files_modified = files;
    const ctxBytes = decision.context_size as number | undefined;
    if (ctxBytes) consumption.context_size_bytes = ctxBytes;
  }

  const quality = readRequestJson(path.join(cwd, '.ai/reports/latest/quality-score.json'));
  if (quality && typeof quality.score === 'number') consumption.quality_score = quality.score;

  const risk = readRequestJson(path.join(cwd, '.ai/reports/latest/risk-score.json'));
  if (risk && typeof risk.score === 'number') consumption.risk_level = risk.score;

  const report = checkBudget(budgetConfig, consumption);
  printLine('');
  printLine(formatBudgetReport(report));

  if (!report.withinBudget) {
    printLine('[BUDGET] Pipeline falhou — violacoes de orcamento encontradas');
    return false;
  }

  if (report.warnings.length > 0) {
    printLine('[BUDGET] Orcamento dentro do limite, mas com avisos');
  }

  return true;
}

export function estimateTokensFromRequest(req: Record<string, unknown>): number {
  let total = 0;
  if (typeof req.description === 'string') total += req.description.length * 0.25;
  if (typeof req.title === 'string') total += req.title.length * 0.25;
  if (Array.isArray(req.files)) {
    for (const f of req.files) {
      if (typeof f === 'string') total += f.length * 0.25;
    }
  }
  if (typeof req.labels === 'string') total += req.labels.length * 0.25;
  if (Array.isArray(req.labels)) {
    for (const l of req.labels) {
      if (typeof l === 'string') total += l.length * 0.25;
    }
  }
  return Math.ceil(total);
}
