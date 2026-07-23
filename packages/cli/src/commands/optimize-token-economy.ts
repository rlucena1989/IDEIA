import path from 'node:path';
import { printHeader, printLine, finish } from "../utils/output";
import { getIO } from '../io';
import { TaskType } from '../runtime/classifier';
import { TokenEconomyEngine } from '../runtime/token-economy-engine';
import { createContextItem, estimateTokens } from '../runtime/context-store';
import type { ContextItem } from '../runtime/context-store';
import { readJson, estimateTokensFromRequest } from './optimize-pipeline';

export function handleTokenEconomyAnalyze(
  requestFile: string,
  options: { budget?: string; mode?: string; json?: boolean },
): void {
  const cwd = process.cwd();
  const inputPath = path.resolve(cwd, requestFile);
  const req = readJson(inputPath);

  if (!req) {
    printLine('[ERROR] Request file not found or invalid');
    finish({ checkpoint: 'token_economy_analyze', ok: false, status: 'failed', context_summary: 'Request invalido' });
    return;
  }

  const engine = new TokenEconomyEngine();
  const taskType = (req.taskType as TaskType) || 'feature';
  const description = (req.description as string) || '';
  const files = (req.files as string[]) || [];
  const contextTokens = estimateTokensFromRequest(req);

  const tokensBudget = options.budget ? parseInt(options.budget, 10) : undefined;
  const report = engine.optimize(taskType, description, files, contextTokens, tokensBudget);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHeader('Token Economy Analysis');
    printLine(engine.formatReport(report));
  }

  finish({ checkpoint: 'token_economy_analyze', ok: true, status: 'passed', context_summary: `Analise: modo ${report.selectedMode}, ${report.tokensSaved} tokens saved` });
}

export function handleTokenEconomyEstimate(
  text: string,
  options: { type?: string; files?: string; json?: boolean },
): void {
  const engine = new TokenEconomyEngine();
  const taskType = (options.type as TaskType) || 'feature';
  const fileCount = parseInt(options.files || '5', 10);
  const estimate = engine.estimateSavings(text, taskType, fileCount);

  if (options.json) {
    console.log(JSON.stringify(estimate, null, 2));
  } else {
    printHeader('Token Savings Estimate');
    printLine(engine.formatSavings(estimate));
  }

  finish({ checkpoint: 'token_economy_estimate', ok: true, status: 'passed', context_summary: `Estimativa: ${estimate.tokensSaved} tokens saved (${estimate.reductionPercent}%)` });
}

export function handleTokenEconomyContextAdd(
  source: string,
  content: string,
  options: { type?: string; priority?: string },
): void {
  const engine = new TokenEconomyEngine();
  const item = createContextItem(source, content, (options.type as ContextItem['type']) || 'file', [], parseInt(options.priority || '5', 10));
  engine.getContextStore().add(item);
  printLine(`[OK] Context item added: ${item.id} (${item.tokens} tokens)`);
  finish({ checkpoint: 'token_economy_context_add', ok: true, status: 'passed', context_summary: `Context item ${item.id} added` });
}

export function handleTokenEconomyCacheAdd(
  id: string,
  decision: string,
  context: string,
  outcome: string,
  options: { type?: string },
): void {
  const engine = new TokenEconomyEngine();
  engine.getDecisionCache().add({
    id,
    decision,
    context,
    outcome,
    timestamp: Date.now(),
    taskType: options.type || 'feature',
    tags: [],
    tokenCost: estimateTokens(context + decision + outcome),
  });
  printLine(`[OK] Decision cached: ${id}`);
  finish({ checkpoint: 'token_economy_cache_add', ok: true, status: 'passed', context_summary: `Decision ${id} cached` });
}

export function handleTokenEconomyStatus(): void {
  const engine = new TokenEconomyEngine();
  const stats = engine.getStats();
  printHeader('Token Economy Engine Status');
  printLine(`Context Items:  ${stats.contextItems}`);
  printLine(`Context Tokens: ${stats.contextTokens}`);
  printLine(`Cache Entries:  ${stats.cacheEntries}`);
  printLine(`Cache Hit Rate: ${stats.cacheHitRate}%`);
  printLine(`Tokens Saved:   ${stats.totalTokensSaved}`);
  finish({ checkpoint: 'token_economy_status', ok: true, status: 'passed', context_summary: 'Token economy status' });
}
