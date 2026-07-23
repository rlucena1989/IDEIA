import { classifyComplexity } from './acceleration/classifier';
import { selectRoute } from './acceleration/route-selector';
import { executeCalculation, isLocallySolvable } from './acceleration/calculation-engine';
import { validateInput, validateOutput } from './acceleration/guardrails';
import { readHardwareProfile } from './acceleration/hardware-profile';
import { estimateBudget } from './acceleration/budget';
import { estimateTotal } from './acceleration/estimator';
import { compressSmart } from './acceleration/context-compressor';
import { logAudit } from './acceleration/audit-log';
import { reachConsensus, mockConsensus } from './acceleration/consensus';
import { runBenchmark, runAllBenchmarks } from './acceleration/benchmark';
import { CoParticipantReport } from './acceleration/types';
import {
  searchWithRag,
  buildRagEnhancedInput,
  buildRagContext,
  formatRagAnswer,
  getRagStats,
  extractCitations,
  RagContext,
} from './acceleration/rag-connector';

function hasRagFlag(args: string[]): boolean {
  const idx = args.indexOf('--rag');
  if (idx === -1) return false;
  args.splice(idx, 1);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'classify': {
      const useRag = hasRagFlag(args);
      const input = args.slice(1).join(' ');
      const enriched = useRag ? buildRagEnhancedInput(input) : input;
      const result = classifyComplexity(enriched);
      if (useRag) {
        const ctx = searchWithRag(input);
        (result as any).ragContext = ctx.source !== 'none' ? { source: ctx.source, docsFound: ctx.results.length } : null;
      }
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'route': {
      const useRag = hasRagFlag(args);
      const input = args.slice(1).join(' ');
      const enriched = useRag ? buildRagEnhancedInput(input) : input;
      const mode = (process.env.AI_MODE as 'fast' | 'balanced' | 'deep') || 'balanced';
      const decision = selectRoute(enriched, mode);
      if (useRag) {
        const ctx = searchWithRag(input);
        (decision as any).ragContext = ctx.source !== 'none' ? { source: ctx.source, docsFound: ctx.results.length } : null;
      }
      console.log(JSON.stringify(decision, null, 2));
      break;
    }
    case 'calculate': {
      const input = args.slice(1).join(' ');
      if (isLocallySolvable(input)) {
        const result = executeCalculation({ type: 'auto', input });
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(JSON.stringify({ success: false, reason: 'not locally solvable' }));
      }
      break;
    }
    case 'guardrails': {
      const input = args.slice(1).join(' ');
      const validation = validateInput(input);
      console.log(JSON.stringify(validation, null, 2));
      break;
    }
    case 'compress': {
      const input = args.slice(1).join(' ');
      const result = compressSmart(input);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'estimate': {
      const input = args.slice(1).join(' ');
      const { complexity } = classifyComplexity(input);
      const mode = (process.env.AI_MODE as 'fast' | 'balanced' | 'deep') || 'balanced';
      const estimation = estimateTotal(input, complexity, mode, 'remote');
      console.log(JSON.stringify({ complexity, ...estimation }, null, 2));
      break;
    }
    case 'consensus': {
      const input = args.slice(1).join(' ');
      const result = await mockConsensus(input);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'benchmark': {
      const providerArg = args[1] as string | undefined;
      if (providerArg && providerArg !== 'all') {
        const result = await runBenchmark(providerArg as any);
        console.log(JSON.stringify(result, null, 2));
      } else {
        const results = await runAllBenchmarks();
        console.log(JSON.stringify(results, null, 2));
      }
      break;
    }
    case 'hardware': {
      const hw = readHardwareProfile();
      console.log(JSON.stringify(hw, null, 2));
      break;
    }
    case 'budget': {
      const input = args.slice(1).join(' ');
      const { complexity } = classifyComplexity(input || 'default');
      const depth = complexity === 'trivial' ? 1 : complexity === 'simple' ? 2 : complexity === 'moderate' ? 3 : complexity === 'hard' ? 5 : 8;
      const tokens = Math.ceil((input || 'default').length * 0.35) || 1000;
      const budget = estimateBudget(depth, tokens);
      console.log(JSON.stringify(budget, null, 2));
      break;
    }
    case 'audit': {
      const { getAuditLog, totalCost, totalTokens, successRate } = await import('./acceleration/audit-log');
      console.log(JSON.stringify({ entries: getAuditLog(), totalCost: totalCost(), totalTokens: totalTokens(), successRate: successRate() }, null, 2));
      break;
    }
    case 'query': {
      const input = args.slice(1).join(' ');
      if (!input) {
        console.log(JSON.stringify({ error: 'query text required' }));
        process.exit(1);
      }
      const ctx = searchWithRag(input);
      if (ctx.source === 'none') {
        const stats = getRagStats();
        console.log(JSON.stringify({
          error: 'No RAG context available',
          hint: 'Run `npm run ai:index` to index project docs first',
          stats,
        }, null, 2));
        process.exit(1);
      }
      const prompt = formatRagAnswer(input, ctx.results);
      const citations = extractCitations(input);
      console.log(JSON.stringify({
        query: input,
        ragSource: ctx.source,
        resultsCount: ctx.results.length,
        prompt,
        citations,
        stats: getRagStats(),
      }, null, 2));
      break;
    }
    case 'rag:stats': {
      const stats = getRagStats();
      console.log(JSON.stringify(stats, null, 2));
      break;
    }
    case 'full': {
      const useRag = hasRagFlag(args);
      const input = args.slice(1).join(' ');
      const enriched = useRag ? buildRagEnhancedInput(input || 'test') : (input || 'test');
      const mode = (process.env.AI_MODE as 'fast' | 'balanced' | 'deep') || 'balanced';
      const guardPre = validateInput(enriched);
      if (!guardPre.approved) {
        console.log(JSON.stringify({ error: 'guardrails blocked', violations: guardPre.violations }, null, 2));
        process.exit(1);
      }
      const { complexity, domain, confidence } = classifyComplexity(enriched);
      const route = selectRoute(enriched, mode);
      const estimation = estimateTotal(enriched, complexity, mode, route.target === 'local' ? 'local' : 'remote');
      const hw = readHardwareProfile();
      let calc = null;
      if (route.target === 'deterministic') calc = executeCalculation({ type: 'auto', input: enriched });
      const compressed = compressSmart(enriched);
      let ragInfo = null;
      if (useRag) {
        const ragCtx = searchWithRag(input || 'test');
        if (ragCtx.source !== 'none') {
          ragInfo = { source: ragCtx.source, docsFound: ragCtx.results.length, citations: extractCitations(input || 'test') };
        }
      }
      const report: CoParticipantReport & { ragContext?: typeof ragInfo } = {
        problem: { raw: input || 'test', fingerprint: '', complexity, estimatedTokens: estimation.tokens, estimatedTimeMs: estimation.timeMs, estimatedCostUsd: estimation.costUsd, domain, requiresExternal: route.target !== 'deterministic' },
        route, result: calc?.result ?? null,
        validation: guardPre,
        cost: { tokens: estimation.tokens, costUsd: estimation.costUsd, latencyMs: estimation.timeMs },
        quality: confidence, timestamp: new Date().toISOString(),
        ragContext: ragInfo,
      };
      logAudit({ action: 'co-pilot-full', provider: route.provider, tokens: estimation.tokens, costUsd: estimation.costUsd, latencyMs: estimation.timeMs, success: true, details: JSON.stringify({ complexity, target: route.target, ragSource: ragInfo?.source || 'none' }) });
      console.log(JSON.stringify(report, null, 2));
      break;
    }
    default:
      console.log(`AI Co-Pilot v2 — Comandos:
  classify [--rag] <text>  Classificar complexidade (com RAG opcional)
  route [--rag] <text>     Selecionar rota/provedor (com RAG opcional)
  calculate <expr>         Calcular localmente
  guardrails <text>        Validar entrada
  compress <text>          Comprimir contexto
  estimate <text>          Estimar tokens/custo/tempo
  consensus <text>         Consenso multi-provedor
  benchmark [provider]     Benchmark de provedores
  hardware                 Perfil de hardware
  budget <text>            Estimar orçamento
  audit                    Log de auditoria
  query <text>             Consulta com RAG (contexto vetorial do projeto)
  rag:stats                Estatísticas do RAG
  full [--rag] <text>      Pipeline completo (com RAG opcional)`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
