import fs from 'node:fs';
import { classifyComplexity } from './acceleration/classifier';
import { readHardwareProfile } from './acceleration/hardware-profile';
import { selectRoute } from './acceleration/route-selector';
import { executeCalculation, isLocallySolvable } from './acceleration/calculation-engine';
import { validateInput } from './acceleration/guardrails';
import { compressSmart } from './acceleration/context-compressor';
import { estimateTotal } from './acceleration/estimator';
import { runAllBenchmarks } from './acceleration/benchmark';
import { mockConsensus } from './acceleration/consensus';
import { clearAuditLog } from './acceleration/audit-log';
import { listFlags } from './acceleration/feature-flags';
import { summary } from './acceleration/stats-engine';
import { detectAnomalies, detectTrend } from './acceleration/anomaly-detector';
import { suggestOptimizations, optimizeMode } from './acceleration/optimizer';

const ROOT = process.cwd();

async function main() {
  console.log('\n=== EV-17 ADVANCED METRICS ===\n');

  const files = ['scripts/acceleration/engine.ts', 'scripts/evolve-all-metrics.ts', 'scripts/acceleration/orchestrator.ts', 'scripts/acceleration/loop.ts', 'scripts/ai-co-pilot.ts'];
  const report: Record<string, unknown> = { timestamp: new Date().toISOString() };

  // 1. File Classification
  console.log('--- 1. FILE CLASSIFICATION ---');
  report.classifications = files.map(f => {
    const content = fs.readFileSync(f, 'utf8').slice(0, 2000);
    const c = classifyComplexity(content);
    const est = estimateTotal(content, c.complexity, 'balanced', 'local');
    console.log(`  ${f}: ${c.complexity} (conf=${c.confidence}, tokens=${est.tokens}, time=${est.timeMs}ms, cost=$${est.costUsd})`);
    return { file: f, complexity: c, estimation: est };
  });

  // 2. Routing decisions
  console.log('\n--- 2. ROUTING ---');
  const modes = ['fast', 'balanced', 'deep'] as const;
  const inputs = [
    'calculate 2 + 2',
    'analyze this TypeScript code for security vulnerabilities and suggest fixes',
    'refactor the entire codebase to use Clean Architecture patterns with proper dependency injection, unit tests, documentation, and CI/CD pipelines'
  ];
  report.routes = inputs.flatMap(input =>
    modes.map(mode => {
      const route = selectRoute(input, mode);
      console.log(`  [${mode}] "${input.slice(0, 45)}..." → ${route.target}/${route.provider} (conf=${route.confidence}, $${route.estimatedCostUsd.toFixed(4)}, ${route.estimatedLatencyMs}ms)`);
      return { input: input.slice(0, 45), mode, route };
    })
  );

  // 3. Local calculations
  console.log('\n--- 3. LOCAL CALCULATION ---');
  const calculations = ['2 + 3 * 4', 'mean of [1,2,3,4,5]', 'stddev of [1,2,3,4,5]', 'force of mass 10 accel 9.8', 'bmi weight 70 height 1.75', 'correlation of [1,2,3] and [2,4,6]'];
  report.calculations = calculations.map(c => {
    const solvable = isLocallySolvable(c);
    const result = solvable ? executeCalculation({ type: 'auto', input: c }) : null;
    console.log(`  "${c}" → solvable=${solvable}${result ? ', result=' + JSON.stringify(result.result) : ''}`);
    return { input: c, solvable, result: result?.result ?? null };
  });

  // 4. Guardrails
  console.log('\n--- 4. GUARDRAILS ---');
  const testInputs = ['console.log("hello world")', 'DROP TABLE users; SELECT * FROM passwords', 'const apiKey = "sk-abc123def456"', 'eval(process.env.SECRET)', 'const x = require("child_process").exec'];
  report.guardrails = testInputs.map(ti => {
    const g = validateInput(ti);
    console.log(`  "${ti.slice(0, 50)}" → approved=${g.approved}${g.violations.length > 0 ? ', violations=' + g.violations.join(', ') : ''}`);
    return { input: ti.slice(0, 50), approved: g.approved, violations: g.violations };
  });

  // 5. Context compression on real files
  console.log('\n--- 5. CONTEXT COMPRESSION ---');
  report.compression = files.map(f => {
    const content = fs.readFileSync(f, 'utf8');
    const result = compressSmart(content);
    console.log(`  ${f}: ${result.originalChars}→${result.compressedChars} (${(result.ratio * 100).toFixed(0)}%) method=${result.method}`);
    return { file: f, originalChars: result.originalChars, compressedChars: result.compressedChars, ratio: result.ratio, method: result.method };
  });

  // 6. Benchmark
  console.log('\n--- 6. BENCHMARK (mock) ---');
  const benchResults = await runAllBenchmarks();
  report.benchmarks = benchResults;
  for (const br of benchResults) {
    console.log(`  ${br.provider}: score=${br.score}, latency=${br.avgLatencyMs}ms, success=${(br.successRate * 100).toFixed(0)}%`);
  }

  // 7. Consensus
  console.log('\n--- 7. CONSENSUS ---');
  const consensus = await mockConsensus('What is the best way to structure a TypeScript monorepo?');
  report.consensus = { question: 'TypeScript monorepo structure', decision: consensus.decision.slice(0, 100), confidence: consensus.confidence, participants: consensus.participants, agreements: consensus.agreements };
  console.log(`  decision=${consensus.decision.slice(0, 60)}...`);
  console.log(`  confidence=${consensus.confidence}, participants=${consensus.participants}, agreements=${consensus.agreements}`);

  // 8. Anomaly detection
  console.log('\n--- 8. ANOMALY DETECTION ---');
  const scoreHistory = [95, 96, 96, 95, 96, 96, 95, 96, 96];
  const anomalies = detectAnomalies(scoreHistory, 2);
  const fileSizes = files.map(f => fs.readFileSync(f, 'utf8').split('\n').length);
  const sizeAnomalies = detectAnomalies(fileSizes, 2.5);
  report.anomalies = {
    scoreHistory, scoreAnomalies: anomalies.filter(a => a.isAnomaly).length, scoreTrend: detectTrend(scoreHistory),
    fileSizes, fileSizeAnomalies: sizeAnomalies.filter(a => a.isAnomaly).length,
    fileStats: summary(fileSizes)
  };
  console.log(`  Score anomalies: ${anomalies.filter(a => a.isAnomaly).length}/${anomalies.length}, trend: ${detectTrend(scoreHistory)}`);
  console.log(`  File sizes: mean=${summary(fileSizes).mean.toFixed(0)}, median=${summary(fileSizes).median}`);

  // 9. Optimization
  console.log('\n--- 9. OPTIMIZATION ---');
  const optMode = optimizeMode({ avgQuality: 96, avgDuration: 5000, successRate: 0.95 });
  const suggestions = suggestOptimizations('balanced', []);
  report.optimization = { recommendedMode: optMode, suggestions, featureFlagsActive: listFlags().filter(f => f.enabled).length, featureFlagsTotal: listFlags().length };
  console.log(`  Mode: ${optMode}, suggestions: ${suggestions.length}, flags: ${listFlags().filter(f => f.enabled).length}/${listFlags().length}`);

  // 10. Write report
  console.log('\n--- 10. WRITING REPORT ---');
  clearAuditLog();
  fs.mkdirSync('.ai/reports/metrics-evolution', { recursive: true });
  const jsonPath = '.ai/reports/metrics-evolution/advanced-metrics.json';
  const mdPath = '.ai/reports/metrics-evolution/advanced-metrics.md';
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, generateMd(report, fileSizes));
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  MD:   ${mdPath}`);
  console.log('\n=== EV-17 ADVANCED METRICS COMPLETE ===');
}

function generateMd(r: Record<string, unknown>, fileSizes: number[]): string {
  const lines: string[] = [
    '# Advanced EV-17 Metrics Report',
    '',
    '**Timestamp:** ' + r.timestamp,
    '',
    '## 1. File Classification',
    '',
    '| File | Complexity | Confidence | Tokens | Est. Time | Est. Cost |',
    '|------|-----------|-----------|--------|-----------|-----------|'
  ];
  const cls = r.classifications as Array<Record<string, unknown>>;
  for (const c of cls) {
    const est = c.estimation as Record<string, unknown>;
    const comp = c.complexity as Record<string, unknown>;
    lines.push('| ' + c.file + ' | ' + comp.complexity + ' | ' + ((comp.confidence as number) * 100).toFixed(0) + '% | ' + est.tokens + ' | ' + est.timeMs + 'ms | $' + (est.costUsd as number).toFixed(4) + ' |');
  }

  lines.push('', '## 2. Routing Decisions', '', '| Input | Mode | Target | Provider | Confidence | Cost | Latency |');
  const routes = r.routes as Array<Record<string, unknown>>;
  for (const rt of routes) {
    const route = rt.route as Record<string, unknown>;
    lines.push('| ' + rt.input + ' | ' + rt.mode + ' | ' + route.target + ' | ' + route.provider + ' | ' + (route.confidence as number).toFixed(2) + ' | $' + (route.estimatedCostUsd as number).toFixed(4) + ' | ' + route.estimatedLatencyMs + 'ms |');
  }

  lines.push('', '## 3. Local Calculations', '', '| Input | Solvable | Result |');
  const calcs = r.calculations as Array<Record<string, unknown>>;
  for (const c of calcs) lines.push('| ' + c.input + ' | ' + c.solvable + ' | ' + JSON.stringify(c.result) + ' |');

  lines.push('', '## 4. Guardrails', '', '| Input | Approved | Violations |');
  const gs = r.guardrails as Array<Record<string, unknown>>;
  for (const g of gs) lines.push('| ' + g.input + ' | ' + g.approved + ' | ' + ((g.violations as string[]).join(', ') || 'none') + ' |');

  lines.push('', '## 5. Context Compression', '', '| File | Original | Compressed | Ratio | Method |');
  const comps = r.compression as Array<Record<string, unknown>>;
  for (const c of comps) lines.push('| ' + c.file + ' | ' + c.originalChars + ' | ' + c.compressedChars + ' | ' + ((c.ratio as number) * 100).toFixed(0) + '% | ' + c.method + ' |');

  lines.push('', '## 6. Benchmark', '', '| Provider | Score | Latency | Success | Tokens |');
  const benches = r.benchmarks as Array<Record<string, unknown>>;
  for (const b of benches) lines.push('| ' + b.provider + ' | ' + b.score + ' | ' + b.avgLatencyMs + 'ms | ' + ((b.successRate as number) * 100).toFixed(0) + '% | ' + b.tokensUsed + ' |');

  lines.push('', '## 7. Consensus', '', '| Field | Value |', '|---|---|');
  const cons = r.consensus as Record<string, unknown>;
  lines.push('| Question | ' + cons.question + ' |');
  lines.push('| Decision | ' + (cons.decision as string).slice(0, 100) + ' |');
  lines.push('| Confidence | ' + cons.confidence + ' |');
  lines.push('| Participants | ' + cons.participants + ' |');
  lines.push('| Agreements | ' + cons.agreements + ' |');

  lines.push('', '## 8. Anomalies', '', '| Metric | Value |', '|---|---|');
  const anom = r.anomalies as Record<string, unknown>;
  const fileStats = anom.fileStats as Record<string, unknown>;
  lines.push('| Score anomalies | ' + anom.scoreAnomalies + ' |');
  lines.push('| Score trend | ' + anom.scoreTrend + ' |');
  lines.push('| File size anomalies | ' + anom.fileSizeAnomalies + ' |');
  lines.push('| Files analyzed | ' + fileSizes.length + ' |');
  lines.push('| Total lines | ' + fileSizes.reduce((a, b) => a + b, 0) + ' |');
  lines.push('| Mean lines | ' + (fileStats.mean as number).toFixed(0) + ' |');
  lines.push('| Median lines | ' + (fileStats.median as number).toFixed(0) + ' |');

  lines.push('', '## 9. Optimization', '', '| Metric | Value |', '|---|---|');
  const opt = r.optimization as Record<string, unknown>;
  lines.push('| Mode | ' + opt.recommendedMode + ' |');
  lines.push('| Feature flags | ' + opt.featureFlagsActive + '/' + opt.featureFlagsTotal + ' |');

  lines.push('', '## 10. File Size Distribution', '', '| File | Lines |', '|---|---|');
  const clss = r.classifications as Array<Record<string, unknown>>;
  for (let i = 0; i < clss.length; i++) lines.push('| ' + clss[i].file + ' | ' + fileSizes[i] + ' |');

  lines.push('', '---', '*Generated by EV-17 Coprocessamento Cognitivo*');
  return lines.join('\n');
}

main().catch(err => { console.error(err); process.exit(1); });
