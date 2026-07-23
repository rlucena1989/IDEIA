import { readHardwareProfile, tierFromHardware } from './acceleration/hardware-profile';
import { classifyComplexity, complexityToDepth } from './acceleration/classifier';
import { estimateBudget } from './acceleration/budget';
import { estimateTokens } from './acceleration/estimator';
import { logAudit, clearAuditLog } from './acceleration/audit-log';
import { suggestOptimizations, optimizeMode } from './acceleration/optimizer';
import { listFlags } from './acceleration/feature-flags';
import { ensureDir, REPORT_DIR, DEVKIT_DIR } from './evolve-metrics/helpers';
import { collectSourceMetrics, logSourceMetrics } from './evolve-metrics/source-metrics';
import { collectCoverageMetrics, logCoverageMetrics } from './evolve-metrics/coverage-metrics';
import { collectScorecardMetrics, logScorecardMetrics } from './evolve-metrics/scorecard-metrics';
import { collectHealthMetrics, logHealthMetrics, logHealthAnomalies } from './evolve-metrics/health-metrics';
import { buildReport, saveReport, saveAuditLog } from './evolve-metrics/report-builder';

async function main() {
  clearAuditLog();
  const startTime = Date.now();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║    Evolução Completa de Métricas — EV-17 Powered        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  ensureDir(REPORT_DIR);
  ensureDir(DEVKIT_DIR);

  // 1. HARDWARE PROFILE
  console.log('\n[1/8] Perfil de Hardware...');
  const hw = readHardwareProfile() as unknown as Record<string, unknown>;
  const tier = tierFromHardware(hw as any);
  console.log(`  CPU: ${hw.cpuCores} cores (${((hw.cpuUsage as number) * 100).toFixed(0)}%)`);
  console.log(`  RAM: ${hw.ramFreeGb}/${hw.ramTotalGb} GB free`);
  console.log(`  Disk: ${hw.diskFreeGb} GB free`);
  console.log(`  Tier: ${tier}`);
  logAudit({ action: 'hardware-profile', provider: 'local', tokens: 0, costUsd: 0, latencyMs: 0, success: true, details: JSON.stringify(hw) });

  // 2. PROJECT CLASSIFICATION
  console.log('\n[2/8] Classificação do Projeto...');
  const projectDesc = 'ai-devkit monorepo TypeScript with CLI, adapters, acceleration engine, audit tools, tests, coverage';
  const classification = classifyComplexity(projectDesc);
  const depth = complexityToDepth(classification.complexity);
  const estTokens = estimateTokens(projectDesc);
  const budget = estimateBudget(depth, estTokens);
  console.log(`  Complexidade: ${classification.complexity}`);
  console.log(`  Domínios: ${classification.domain.join(', ') || 'general'}`);
  console.log(`  Confiança: ${(classification.confidence * 100).toFixed(0)}%`);
  console.log(`  Profundidade: ${depth}`);
  console.log(`  Budget: tokens=${budget.tokensMax}, custo=$${budget.costMaxUsd.toFixed(4)}, latência=${budget.latencyMaxMs}ms`);
  logAudit({ action: 'classify-project', provider: 'local', tokens: estTokens, costUsd: 0, latencyMs: 100, success: true, details: JSON.stringify(classification) });

  // 3. SOURCE CODE METRICS
  console.log('\n[3/8] Métricas de Código Fonte...');
  const sourceMetrics = collectSourceMetrics();
  logSourceMetrics(sourceMetrics);
  logAudit({ action: 'source-metrics', provider: 'local', tokens: 0, costUsd: 0, latencyMs: 50, success: true, details: JSON.stringify({ tsFiles: sourceMetrics.tsFiles, tsLines: sourceMetrics.tsLines, testFiles: sourceMetrics.testFiles }) });

  // 4. COVERAGE GENERATION
  console.log('\n[4/8] Geração de Cobertura...');
  const coverage = collectCoverageMetrics();
  if (coverage) {
    logCoverageMetrics(coverage);
    console.log(`  Histórico de cobertura atualizado`);
  } else {
    console.log('  WARNING: coverage-final.json não encontrado');
  }
  logAudit({ action: 'coverage-analysis', provider: 'local', tokens: 0, costUsd: 0, latencyMs: 200, success: !!coverage, details: JSON.stringify(coverage ?? { total: 0 }) });

  // 5. SCORECARD ANALYSIS
  console.log('\n[5/8] Análise de Scorecard e Anomalias...');
  const scorecardMetrics = collectScorecardMetrics();
  logScorecardMetrics(scorecardMetrics);
  if (scorecardMetrics.score > 0 && scorecardMetrics.anomalyCount === 0 && scorecardMetrics.trend === 'insufficient-data') {
    console.log('  Histórico insuficiente para anomalias');
  }
  logAudit({ action: 'scorecard-read', provider: 'local', tokens: 0, costUsd: 0, latencyMs: 50, success: scorecardMetrics.score > 0, details: `score=${scorecardMetrics.score}` });

  // 6. PROJECT HEALTH
  console.log('\n[6/8] Métricas de Saúde do Projeto...');
  const healthMetrics = collectHealthMetrics();
  logHealthMetrics(healthMetrics);
  logHealthAnomalies(healthMetrics, sourceMetrics.tsLines);
  logAudit({ action: 'project-health', provider: 'local', tokens: 0, costUsd: 0, latencyMs: 30, success: true, details: JSON.stringify({ totalDeps: healthMetrics.totalDeps, totalScripts: healthMetrics.totalScripts, healthScore: healthMetrics.healthScore }) });

  // 7. OPTIMIZATION SUGGESTIONS
  console.log('\n[7/8] Sugestões de Otimização...');
  const optMode = optimizeMode({ avgQuality: scorecardMetrics.score, avgDuration: 5000, successRate: 0.95 });
  const suggestions = suggestOptimizations('balanced', []);
  const flags = listFlags();

  console.log(`  Modo recomendado: ${optMode}`);
  for (const s of suggestions) console.log(`  → ${s.parameter}: ${s.currentValue} → ${s.suggestedValue} (${s.reason})`);
  console.log(`  Feature Flags ativas: ${flags.filter(f => f.enabled).length}/${flags.length}`);
  logAudit({ action: 'optimization', provider: 'local', tokens: 0, costUsd: 0, latencyMs: 10, success: true, details: JSON.stringify({ optMode, suggestions }) });

  // 8. REPORT
  console.log('\n[8/8] Gerando Relatório Final...');

  const report = buildReport({
    startTime,
    hw,
    tier,
    classification: classification as unknown as Record<string, unknown>,
    depth,
    budget: budget as unknown as Record<string, unknown>,
    sourceMetrics,
    coverage,
    scorecardMetrics,
    healthMetrics,
    optMode,
    suggestions,
    featureFlags: flags.map(f => ({ key: f.key, enabled: f.enabled })),
  });

  const { reportPath, mdPath } = saveReport(report);
  const auditPath = saveAuditLog();

  console.log(`\n✔ Relatório salvo: ${reportPath}`);
  console.log(`✔ Markdown: ${mdPath}`);
  console.log(`✔ Tempo total: ${Date.now() - startTime}ms`);
  console.log(`✔ Audit log: ${auditPath}`);

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  RESUMO: ${sourceMetrics.totalSrcFiles} arquivos | ${sourceMetrics.totalSrcLines.toLocaleString()} linhas | ${sourceMetrics.testFiles} testes    ║`);
  console.log(`║  Coverage: ${coverage?.total ?? 'N/A'}% | Scorecard: ${scorecardMetrics.score}/100 | Health: ${Math.round(healthMetrics.healthScore)}% ║`);
  console.log(`║  Complexidade: ${classification.complexity} | Tier: ${tier} | Modo: ${optMode}        ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
}

main().catch(err => { console.error('ERRO:', err); process.exit(1); });
