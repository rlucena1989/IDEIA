import { ContextStore, ContextQuery, ContextItem, estimateTokens, createContextItem, DEFAULT_CONTEXT_STORE_CONFIG } from './context-store';
import { createLogger } from '@ideia/logger';
import { DecisionCache, ProjectSummary, summarizeProject, DEFAULT_SUMMARIZER_CONFIG } from './context-summarizer';
import { OutputMode, PromptRoute, OutputBudget, routePrompt, selectOutputMode, getOutputBudget, formatOutputBudget, DEFAULT_PROMPT_ROUTER_CONFIG } from './prompt-router';
import { TaskType } from './classifier';

/** Interface que define a estrutura de token economy config. */
export interface TokenEconomyConfig {
  contextStore: typeof DEFAULT_CONTEXT_STORE_CONFIG;
  summarizer: typeof DEFAULT_SUMMARIZER_CONFIG;
  promptRouter: typeof DEFAULT_PROMPT_ROUTER_CONFIG;
}

/** Interface que define a estrutura de token economy report. */
export interface TokenEconomyReport {
  timestamp: string;
  taskType: string;
  selectedMode: OutputMode;
  promptRoute: PromptRoute;
  outputBudget: OutputBudget;
  contextBefore: number;
  contextAfter: number;
  tokensSaved: number;
  reductionPercent: number;
  cacheHits: number;
  cacheHitRate: number;
  decisionsReused: number;
  filteredItems: number;
}

/** Interface que define a estrutura de token savings estimate. */
export interface TokenSavingsEstimate {
  totalOriginalTokens: number;
  totalOptimizedTokens: number;
  tokensSaved: number;
  reductionPercent: number;
  contextReduction: number;
  cacheSavings: number;
  routingSavings: number;
}

/** Processa e f a u l t_ t o k e n_ e c o n o m y_ c o n f i g. */
export const DEFAULT_TOKEN_ECONOMY_CONFIG: TokenEconomyConfig = {
  contextStore: DEFAULT_CONTEXT_STORE_CONFIG,
  summarizer: DEFAULT_SUMMARIZER_CONFIG,
  promptRouter: DEFAULT_PROMPT_ROUTER_CONFIG,
};

/** Classe responsável por processa economy engine. */
export class TokenEconomyEngine {
  private contextStore: ContextStore;
  private decisionCache: DecisionCache;
  private config: TokenEconomyConfig;

  constructor(config: Partial<TokenEconomyConfig> = {}) {
    this.config = { ...DEFAULT_TOKEN_ECONOMY_CONFIG, ...config };
    this.contextStore = new ContextStore(this.config.contextStore);
    this.decisionCache = new DecisionCache();
  }

  getContextStore(): ContextStore {
    return this.contextStore;
  }

  getDecisionCache(): DecisionCache {
    return this.decisionCache;
  }

  optimize(
    taskType: TaskType,
    description: string,
    files: string[],
    contextTokens: number,
    budgetTokens?: number,
  ): TokenEconomyReport {
    const confidence = 85;
    const outputMode = selectOutputMode(taskType, confidence, budgetTokens);
    const promptRoute = routePrompt(taskType, outputMode);
    const outputBudget = getOutputBudget(outputMode);

    const query: ContextQuery = {
      taskType,
      keywords: description.split(/\s+/).filter(w => w.length > 3),
      files,
      maxItems: outputMode === 'compact' ? 5 : outputMode === 'forensic' ? 50 : 20,
      minRelevance: outputMode === 'compact' ? 0.5 : 0.1,
    };

    const filtered = this.contextStore.filterRelevance(query);
    const contextAfter = filtered.totalTokens;

    const cacheStats = this.decisionCache.getStats();
    const decisionFound = this.decisionCache.find(description, taskType);

    const tokensSaved = contextTokens - contextAfter + (decisionFound ? 500 : 0);
    const reductionPercent = contextTokens > 0
      ? Math.round((tokensSaved / contextTokens) * 10000) / 100
      : 0;

    return {
      timestamp: new Date().toISOString(),
      taskType,
      selectedMode: outputMode,
      promptRoute,
      outputBudget,
      contextBefore: contextTokens,
      contextAfter,
      tokensSaved: Math.max(0, tokensSaved),
      reductionPercent: Math.min(100, Math.max(0, reductionPercent)),
      cacheHits: cacheStats.totalHits,
      cacheHitRate: cacheStats.hitRate,
      decisionsReused: decisionFound ? 1 : 0,
      filteredItems: filtered.filteredOut,
    };
  }

  estimateSavings(
    originalPrompt: string,
    taskType: TaskType,
    _fileCount: number,
  ): TokenSavingsEstimate {
    const originalTokens = estimateTokens(originalPrompt);
    const outputMode = selectOutputMode(taskType, 85);
    const route = routePrompt(taskType, outputMode);
    const budget = getOutputBudget(outputMode);

    const maxInputAllowed = Math.min(route.maxInputTokens, budget.maxTokens * 4);
    const contextReduction = originalTokens > maxInputAllowed
      ? originalTokens - maxInputAllowed
      : Math.round(originalTokens * 0.15);

    const cacheStats = this.decisionCache.getStats();
    const cacheSavings = cacheStats.totalHits * 500;

    const optimizedTokens = Math.max(100, originalTokens - contextReduction);
    const routingSavings = Math.round(originalTokens * 0.1);

    return {
      totalOriginalTokens: originalTokens,
      totalOptimizedTokens: optimizedTokens,
      tokensSaved: contextReduction + cacheSavings + routingSavings,
      reductionPercent: Math.round(((contextReduction + cacheSavings + routingSavings) / originalTokens) * 10000) / 100,
      contextReduction,
      cacheSavings,
      routingSavings,
    };
  }

  getStats(): {
    contextItems: number;
    contextTokens: number;
    cacheEntries: number;
    cacheHitRate: number;
    totalTokensSaved: number;
  } {
    const ctxStats = this.contextStore.getStats();
    const cacheStats = this.decisionCache.getStats();
    return {
      contextItems: ctxStats.count,
      contextTokens: ctxStats.totalTokens,
      cacheEntries: cacheStats.totalEntries,
      cacheHitRate: cacheStats.hitRate,
      totalTokensSaved: cacheStats.totalTokensSaved,
    };
  }

  formatReport(report: TokenEconomyReport): string {
    const lines: string[] = [];
    lines.push('=== Token Economy Report ===');
    lines.push(`Task Type: ${report.taskType}`);
    lines.push(`Selected Mode: ${report.selectedMode}`);
    lines.push(`Template: ${report.promptRoute.template}`);
    lines.push(`Context Strategy: ${report.promptRoute.contextStrategy}`);
    lines.push('');
    lines.push('--- Output Budget ---');
    lines.push(`  Max Input Tokens: ${report.promptRoute.maxInputTokens}`);
    lines.push(`  Max Output Tokens: ${report.promptRoute.maxOutputTokens}`);
    lines.push('');
    lines.push('--- Context Optimization ---');
    lines.push(`  Before: ${report.contextBefore} tokens`);
    lines.push(`  After:  ${report.contextAfter} tokens`);
    lines.push(`  Saved:  ${report.tokensSaved} tokens (${report.reductionPercent}%)`);
    lines.push(`  Items filtered: ${report.filteredItems}`);
    lines.push('');
    lines.push('--- Cache ---');
    lines.push(`  Cache hits: ${report.cacheHits}`);
    lines.push(`  Hit rate: ${report.cacheHitRate}%`);
    lines.push(`  Decisions reused: ${report.decisionsReused}`);
    return lines.join('\n');
  }

  formatSavings(estimate: TokenSavingsEstimate): string {
    return [
      '=== Token Savings Estimate ===',
      `Original tokens: ${estimate.totalOriginalTokens}`,
      `Optimized tokens: ${estimate.totalOptimizedTokens}`,
      `Tokens saved: ${estimate.tokensSaved}`,
      `Reduction: ${estimate.reductionPercent}%`,
      '',
      'Breakdown:',
      `  Context reduction: ${estimate.contextReduction}`,
      `  Cache savings:     ${estimate.cacheSavings}`,
      `  Routing savings:   ${estimate.routingSavings}`,
    ].join('\n');
  }
}
