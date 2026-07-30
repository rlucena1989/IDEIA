import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.scorecard');
import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { spawnSync, execSync } from 'node:child_process';
import { generateGranularScorecard } from "../utils/module-scorecard";

const log = createLogger('cli:commands:scorecard');
import { printHeader, printLine, finish } from "../utils/output";
import { queryLocalAI, loadPolicyGates, applyPolicyGates, runBenchmarks, buildAIAnalysisPrompt, shieldColor, calcScore, level, overallScore, buildRecommendations, buildAlerts, generateBadge, buildTrends, computeGit, crossCategoryAnalysis, forecastScore, validateYamlContent, generateFromTemplate, scoreDiffExport, loadCustomChecks, linkScoreToCommits, detectRegression, saveSnapshot, createTasksFromFailures, generateHTML, serveMode, publishResult, watchMode, cadenceMode, sendNotifications, root, read, git, npmAudit, coveragePct, pylintOk, golintOk, oldestDep, ex, hasContent, dirSize, jsonParse, runNode, runAllScripts, jestResultOk, Benchmarks } from './scorecard-utils';
import { print } from './scorecard-display';

// Re-export all utility functions for backward compatibility with tests
export * from './scorecard-utils';

import type { ScorecardItem, ScorecardCategory, ScorecardTrend, ScorecardAlert, CorrelationAlert, ScorecardResult } from './scorecard-types';
export type { ScorecardItem, ScorecardCategory, ScorecardTrend, ScorecardAlert, CorrelationAlert, ScorecardResult } from "./scorecard-types";
import { evalSecurity, evalQuality, evalArchitecture, evalDocs, evalOptimizer, evalAgents, evalEcosystem, evalExtensibility, evalRoadmap, evalGit, evalPackageHealth, evalProjectStructure, evalCodeQuality, evalCICD, evalDependencies, evalCodeDocs, evalProjectIntegrity, evalPipelineHealth } from "./scorecard-evaluators";

// --- Core -------------------------------------------------------------------────
/**
 * Processa scorecard.
 * @returns O resultado da operação.
 */
export function computeScorecard(): ScorecardResult {
  const start = Date.now();
  const categories = [evalSecurity(), evalQuality(), evalArchitecture(), evalDocs(), evalOptimizer(), evalAgents(), evalEcosystem(), evalExtensibility(), evalRoadmap(), evalGit(), evalPackageHealth(), evalProjectStructure(), evalCodeQuality(), evalCICD(), evalDependencies(), evalCodeDocs(), evalProjectIntegrity(), evalPipelineHealth(), ...loadCustomChecks()];
  const s = overallScore(categories);
  let history: ScorecardResult[] = [];
  try { history = JSON.parse(fs.readFileSync(path.join(root(), ".ai/reports/scorecard/history.json"), "utf8")); } catch { /* empty */ }
  const f = forecastScore(30);
  const base = { timestamp: new Date().toISOString(), overallScore: Math.round(s), maturityLevel: level(s), categories, recommendations: buildRecommendations(categories), evolution: { version: "18.0", categories: categories.length, items: categories.reduce((n, c) => n + c.items.length, 0) }, trends: buildTrends(history), alerts: buildAlerts(categories), correlationAlerts: [] as CorrelationAlert[], forecast: f, git: computeGit(), meta: { durationMs: Date.now() - start, scorecardVersion: "18.0" } };
  return { ...base, correlationAlerts: crossCategoryAnalysis(base) };
}

function saveAll(result: ScorecardResult): void {
  const dir = path.join(root(), ".ai/reports/scorecard");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  let history: ScorecardResult[] = [];
  try { history = JSON.parse(fs.readFileSync(path.join(dir, "history.json"), "utf8")); } catch { /* empty */ }
  history.push(result);
  fs.writeFileSync(path.join(dir, "history.json"), JSON.stringify(history, null, 2));
  fs.writeFileSync(path.join(dir, "latest.json"), JSON.stringify(result, null, 2));
  // badge
  const badge = generateBadge(result.overallScore);
  fs.writeFileSync(path.join(dir, "badge.svg"), badge);
  saveSnapshot(result as unknown as Record<string, unknown>);
  // markdown summary for CI
  const md = [
    "# Scorecard Report",
    `- **Score:** ${result.overallScore}/100 (${result.maturityLevel})`,
    `- **Versão:** ${result.evolution.version} — ${result.evolution.categories} categorias, ${result.evolution.items} itens`,
    `- **Git:** ${result.git.branch}@${result.git.commit}`,
    `- **Timestamp:** ${result.timestamp}`,
    `- **Duração:** ${result.meta.durationMs}ms`,
    "",
    "## Categorias",
    ...result.categories.filter(c => c.weight > 0).map(c => `- **${c.name}** (${c.weight}%): ${Math.round(c.score)}/100`),
    "",
    result.alerts.length > 0 ? "## Alertas\n" + result.alerts.map(a => `- 🔴 [${a.category}] ${a.message}`).join("\n") : "",
    result.recommendations.length > 0 ? "## Recomendações\n" + result.recommendations.slice(0, 10).map((r, i) => `${i + 1}. ${r.text}`).join("\n") : "",
    "---",
    result.correlationAlerts.length > 0 ? "## Correlações\n" + result.correlationAlerts.map(a => `- ${a.message}`).join("\n") : "",
    result.forecast.history && result.forecast.history.length >= 3 ? `## Previsão 30d\n- Score previsto: ${result.forecast.forecast}/100\n- Confiança: ${result.forecast.confidence}\n- Tendência: ${result.forecast.trend}` : "",
    result.alerts.length > 0 ? "## Alertas\n" + result.alerts.slice(0, 5).map(a => `- 🔴 ${a.message}`).join("\n") : "",
    "---",
    `_Gerado pelo AI-Devkit Scorecard v13_`,
  ].filter(Boolean).join("\n");
  fs.writeFileSync(path.join(dir, "report.md"), md);
}

// ─── Command ────────────────────────────────────────────────────────────────
/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function scorecardCommand(): Command {
  const cmd = new Command("scorecard")
    .description("Scorecard v8 — cross-category correlation, 30d forecast, schema validation, templates, json-diff, + 25 flags v1-v7")
    .option("--json", "JSON completo para CI")
    .option("--history", "Últimos 10 scores")
    .option("--diff", "Comparação com anterior")
    .option("--branch <name>", "Compara score com outra branch")
    .option("--trends", "Gráfico textual de tendência")
    .option("--watch [seconds]", "Modo observação (default 30s)", false)
    .option("--badge", "Gera badge SVG apenas")
    .option("--auto-fix", "Corrige itens automáticos via fixCommand")
    .option("--create-tasks", "Cria tasks no backlog para itens falhos")
    .option("--html", "Gera relatório HTML em .ai/reports/scorecard/report.html")
    .option("--serve [port]", "Inicia servidor HTTP com dashboard (default 3456)")
    .option("--changes", "Mostra diff detalhado desde o último scorecard")
    .option("--gate <threshold>", "Exit 1 se score < N (ex: 70)")
    .option("--webhook <url>", "POST resultado para webhook")
    .option("--ci", "Exit 1 se score < 50")
    .option("--ai [model]", "Analisa resultados com IA local (Ollama) e gera recomendações")
    .option("--benchmark", "Executa benchmarks (build, test, lint) e anexa ao resultado")
    .option("--remote <url>", "Envia resultado para aggregation server remoto")
    .option("--remote-benchmark <url>", "Compara score com benchmarks remotos (média da org)")
    .option("--cadence [minutes]", "Modo monitoramento contínuo (default 15min)", false)
    .option("--cadence-threshold <points>", "Limiar de regressão para cadence (default 5)", "5")
    .option("--git-trace", "Mostra histórico de score linkado a commits")
    .option("--notify-webhook <url>", "Webhook para notificações de regressão")
    .option("--snapshot", "Apenas gera snapshot do scorecard atual")
    .option("--regression-check", "Verifica regressão desde o último snapshot")
    .option("--correlation", "Mostra análise cruzada entre categorias")
    .option("--forecast", "Mostra previsão de score para 30 dias")
    .option("--json-diff <fromTimestamp>", "Exporta diff JSON entre dois snapshots (usa o timestamp do snapshot)")
    .option("--validate-yaml <file>", "Valida conteúdo de YAML contra chaves obrigatórias")
    .option("--template <name>", "Gera arquivo de governança a partir de template")
    .action(async (options) => {
      // ── Compute once ──
      const result = computeScorecard();
      saveAll(result);
      publishResult(result, options.webhook);

      // ── Policy gates ──
      const gates = loadPolicyGates();
      const gateResult = applyPolicyGates(result, gates);
      if (gateResult.blocked) { log.error("  Policy gate bloqueou."); process.exit(1); }
      if (gateResult.tasksCreated > 0) logger.info('  📋 ${gateResult.tasksCreated} tasks via policy gates.\n');

      // ── Correlation ──
      if (options.correlation) {
        const ca = crossCategoryAnalysis(result);
        if (ca.length > 0) { logger.info('\n  ANÁLISE CRUZADA:\n'); ca.forEach(a => logger.info('  ${a.severity === "critical" ? "🔴" : a.severity === "warn" ? "🟡" : "🔵"} [${a.severity.toUpperCase()}] ${a.message}\n')); }
        else logger.info('\n  ✅ Sem alertas de correlação entre categorias.\n');
      }

      // ── Forecast ──
      if (options.forecast) {
        const f = forecastScore(30);
        if (f.history.length >= 3) {
          const arrow = f.trend === "up" ? "📈" : f.trend === "down" ? "📉" : "➡️";
          logger.info('\n  PREVISÃO 30 DIAS:\n  ${arrow} ${f.forecast}/100 (confiança: ${f.confidence})\n  Tendência: ${f.trend}\n');
          logger.info('  Histórico (${f.history.length} pontos): ${f.history.slice(-10).join(" → ")}\n');
        } else { logger.info('\n  �  Dados insuficientes para previsão (mínimo 3 snapshots).\n'); }
      }

      // ── Validate YAML ──
      if (options.validateYaml) {
        const keys = ["version", "enabled", "name"];
        const result2 = validateYamlContent(options.validateYaml, keys);
        if (result2.valid) logger.info('\n  ✅ ${options.validateYaml}: válido (${keys.length}/${keys.length} chaves)\n');
        else logger.info('\n  �  ${options.validateYaml}: ${result2.missing.join(", ")} ausentes\n');
      }

      // ── Template generation ──
      if (options.template) {
        const content = generateFromTemplate(options.template, { version: "1.0", project: root().split(/[/\\]/).pop() || "projeto", agents: "agente1, agente2", network: "restrita", secrets: "gerenciadas", title: "Decisão Arquitetural", status: "proposto", context: "Descreva o contexto...", decision: "Descreva a decisão..." });
        const targetDir = path.join(root(), ".ai/scorecard/templates");
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        const targetFile = path.join(targetDir, `${options.template}.md`);
        fs.writeFileSync(targetFile, content, "utf8");
        log.info(`  Template gerado: ${targetFile}`);
      }

      // ── JSON diff ──
      if (options.jsonDiff) {
        const snapDir = path.join(root(), ".ai/reports/scorecard/snapshots");
        try {
    const files = fs.readdirSync(snapDir).filter((f: string) => f.endsWith(".json")).sort();
          const fromSnap = files.find((f: string) => f.includes(options.jsonDiff as string));
          const toSnap = files[files.length - 1];
          if (fromSnap && toSnap && fromSnap !== toSnap) {
            const r1 = JSON.parse(fs.readFileSync(path.join(snapDir, fromSnap), "utf8")) as ScorecardResult;
            const r2 = JSON.parse(fs.readFileSync(path.join(snapDir, toSnap), "utf8")) as ScorecardResult;
            const diff = scoreDiffExport(r1, r2);
            const diffPath = path.join(root(), ".ai/reports/scorecard/latest-diff.json");
            fs.writeFileSync(diffPath, diff, "utf8");
            log.info(`  Diff salvo: ${diffPath}`);
          } else { log.info("  Snapshot não encontrado."); }
        } catch { log.error("  Erro ao gerar diff."); }
      }

      // ── Remote ──

      // ── Benchmark ──
      let benchmarks: Benchmarks | undefined;
      if (options.benchmark) benchmarks = runBenchmarks();

      // ── AI analysis ──
      if (options.ai !== undefined && options.ai !== false) {
        const prompt = buildAIAnalysisPrompt(result, benchmarks);
        log.info("  Analisando com IA local...");
        const analysis = await queryLocalAI(prompt, typeof options.ai === "string" ? options.ai : undefined);
        if (analysis) {
          console.log("  " + "─".repeat(55));
          logger.info('  ANÁLISE DO SCORECARD:\n');
          for (const line of analysis.split("\n")) logger.info('  ${line}');
          console.log("\n  " + "─".repeat(55) + "\n");
        } else { log.warn("  IA local indisponivel (Ollama nao esta rodando?)"); }
        return;
      }

      if (options.benchmark && benchmarks) {
        logger.info('\n  BENCHMARKS:\n');
        logger.info('  Build:  ${benchmarks.buildTimeMs ? (benchmarks.buildTimeMs / 1000).toFixed(1) + "s" : "N/A"}');
        logger.info('  Test:   ${benchmarks.testTimeMs ? (benchmarks.testTimeMs / 1000).toFixed(1) + "s" : "N/A"}');
        logger.info('  Lint:   ${benchmarks.lintTimeMs ? (benchmarks.lintTimeMs / 1000).toFixed(1) + "s" : "N/A"}');
        logger.info('  Files:  ${benchmarks.totalFiles} arquivos .ts/.tsx\n');
        if (!options.ai) return;
      }

      // ── Cadence mode ──
      if (options.cadence !== false) {
        const interval = typeof options.cadence === "string" ? parseInt(options.cadence) || 15 : 15;
        const threshold = parseInt(options.cadenceThreshold) || 5;
        cadenceMode(interval, threshold, options.notifyWebhook);
        return;
      }

      // ── Git trace ──
      if (options.gitTrace) {
        const trace = linkScoreToCommits(result.overallScore, '.');
        if (trace.length > 0) {
          logger.info('\n  📜 Score x Commits:\n');
          trace.forEach((s: any, i: any) => logger.info('  ${i + 1}. ${s.commit} — ${s.score}/100'));
          console.log();
        } else { logger.info('  Sem dados de snapshot para git-trace.\n'); }
        return;
      }

      // ── Snapshot only ──
      if (options.snapshot) {
        log.info(`  ?? Snapshot salvo: ${result.timestamp.slice(0, 19)} � ${result.overallScore}/100`);
        return;
      }

      // ── Regression check ──
      if (options.regressionCheck) {
        const reg = detectRegression(result, 5);
        if (reg.regressed) {
          logger.info('\n  �  REGRESSÃO DETECTADA desde ${reg.sinceTimestamp?.slice(0, 19) || "?"}:\n');
          reg.drops.forEach(d => logger.info('  ↓ ${d.category}: ${d.from} → ${d.to}'));
          console.log();
        } else { logger.info('  ✅ Sem regressão significativa desde o último snapshot.\n'); }
        return;
      }

      // ── Watch mode ──
      if (options.watch !== false) {
        watchMode(typeof options.watch === "string" ? parseInt(options.watch) || 30 : 30);
        return;
      }

      // ── Badge only ──
      if (options.badge) {
        const b = generateBadge(result.overallScore);
        const p = path.join(root(), ".ai/reports/scorecard/badge.svg");
        if (!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, b); log.info(`  Badge: .ai/reports/scorecard/badge.svg (${result.overallScore}/100)`); return;
      }

      // ── Branch comparison ──
      if (options.branch) {
        const currentBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]) || "current";
        const targetBranch = options.branch;
        logger.info('\n  Comparando: ${currentBranch} vs ${targetBranch}\n');
        const stash = git(["stash"]) !== null;
        const checkoutOk = git(["checkout", targetBranch]) !== null;
        let branchScore: ScorecardResult | null = null;
        if (checkoutOk) { branchScore = computeScorecard(); git(["checkout", currentBranch]); if (stash) git(["stash", "pop"]); }
        else { git(["checkout", currentBranch]); if (stash) git(["stash", "pop"]); }
        if (!branchScore) { logger.info('  ❌ Branch "${targetBranch}" inacessível.\n'); return; }
        const diff = result.overallScore - branchScore.overallScore;
        logger.info('  ${currentBranch}: ${result.overallScore}/100 (${result.maturityLevel})');
        logger.info('  ${targetBranch}: ${branchScore.overallScore}/100 (${branchScore.maturityLevel})');
        logger.info('  Variação: ${diff > 0 ? "+" : ""}${diff} pontos\n');
        for (const cc of result.categories) {
          const bc = branchScore.categories.find(c => c.name === cc.name);
          if (bc) { const d = Math.round(cc.score - bc.score); if (d !== 0) logger.info('  ${cc.name}: ${d > 0 ? "+" : ""}${d}'); }
        }
        console.log(); return;
      }

      // ── Other display modes ──
      if (options.json) { console.log(JSON.stringify(result, null, 2)); return; }

      if (options.history) {
        const f = path.join(root(), ".ai/reports/scorecard/history.json");
        if (fs.existsSync(f)) {
          const h: ScorecardResult[] = JSON.parse(fs.readFileSync(f, "utf8"));
          logger.info('\n  Histórico:\n');
          h.slice(-10).forEach((e, i) => logger.info('  ${i + 1}. ${e.timestamp.slice(0, 19)} — ${e.overallScore}/100 ${e.maturityLevel} — v${e.evolution.version}'));
          console.log();
        } else { logger.info('  Nenhum histórico.\n'); }
        return;
      }

      if (options.diff) {
        const f = path.join(root(), ".ai/reports/scorecard/history.json");
        if (fs.existsSync(f)) {
          const h: ScorecardResult[] = JSON.parse(fs.readFileSync(f, "utf8"));
          if (h.length >= 2) {
            const p = h[h.length - 2]; const d = result.overallScore - p.overallScore;
            logger.info('\n  Anterior: ${p.overallScore}/100 ${p.maturityLevel} — v${p.evolution.version} — ${p.evolution.items} itens');
            logger.info('  Atual:    ${result.overallScore}/100 ${result.maturityLevel} — v${result.evolution.version} — ${result.evolution.items} itens');
            logger.info('  Variação: ${d > 0 ? "+" : ""}${d} pontos\n');
          } else { logger.info('  Histórico insuficiente.\n'); }
        }
        return;
      }

      if (options.trends) {
        const f = path.join(root(), ".ai/reports/scorecard/history.json");
        if (fs.existsSync(f)) {
          const h: ScorecardResult[] = JSON.parse(fs.readFileSync(f, "utf8"));
          const w = h.slice(-15);
          if (w.length >= 2) {
            logger.info('\n  Tendência:\n');
            const mx = Math.max(...w.map(e => e.overallScore), 100);
            w.forEach(e => logger.info('  ${e.timestamp.slice(0, 10)} ${"█".repeat(Math.round(e.overallScore / mx * 30))} ${e.overallScore}'));
            console.log();
          } else { logger.info('  Dados insuficientes.\n'); }
        }
        return;
      }

      if (options.autoFix) {
        log.info("  AUTO-FIX:"); let fixed = 0;
        for (const cat of result.categories) for (const item of cat.items) {
          if (!item.passed && item.fixCommand) {
            process.stdout.write(`  ?? ${item.id}... `);
            try { const r = spawnSync("node", [path.join(root(), item.fixCommand)], { cwd: root(), stdio: "pipe", timeout: 10000 }); if (r.status === 0) { fixed++; logger.info('?'); } else logger.info('?'); } catch { logger.info('?'); }
          }
        }
        log.info(`  ${fixed} corrigidos.`); return;
      }

      if (options.createTasks) { const n = createTasksFromFailures(result); log.info(`  ${n} tarefas criadas.`); return; }
      if (options.html) { const h = generateHTML(result); fs.writeFileSync(path.join(root(), ".ai/reports/scorecard/report.html"), h, "utf8"); log.info(`  HTML: .ai/reports/scorecard/report.html`); return; }
      if (options.serve !== undefined && options.serve !== false) { serveMode(typeof options.serve === "string" ? parseInt(options.serve) || 3456 : 3456); return; }

      if (options.changes) {
        const f = path.join(root(), ".ai/reports/scorecard/history.json");
        if (fs.existsSync(f)) {
          const h: ScorecardResult[] = JSON.parse(fs.readFileSync(f, "utf8"));
          if (h.length >= 2) {
            const prev = h[h.length - 2]; const d = result.overallScore - prev.overallScore;
            logger.info('\n  Mudanças desde ${prev.timestamp.slice(0, 19)}:\n');
            logger.info('  Score: ${prev.overallScore} → ${result.overallScore} (${d > 0 ? "+" : ""}${d})');
            logger.info('  Itens: ${prev.evolution.items} → ${result.evolution.items}');
            for (const cc of result.categories) {
              const pc = prev.categories.find(c => c.name === cc.name);
              if (pc) { const dd = Math.round(cc.score - pc.score); if (dd !== 0) logger.info('  ${dd > 0 ? "↑" : "↓"} ${cc.name}: ${Math.round(pc.score)} → ${Math.round(cc.score)} (${dd > 0 ? "+" : ""}${dd})'); }
              else logger.info('  ✚ ${cc.name}: ${Math.round(cc.score)}/100 (nova)');
            }
            console.log();
          } else { logger.info('  Histórico insuficiente.\n'); }
        }
        return;
      }

      // ── Default: print ──
      print(result);
      const threshold = options.gate ? parseInt(options.gate) : options.ci ? 50 : 0;
      if (threshold > 0 && result.overallScore < threshold) { log.error(`  Gate FAIL: score ${result.overallScore} < ${threshold}`); process.exit(1); }
    });

  cmd
    .command("modules")
    .description("Scorecard granular por funcionalidade/modulo")
    .option("--json", "Saida em JSON")
    .action((options) => {
      const cwd = process.cwd();
      const result = generateGranularScorecard(cwd);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      printHeader("Scorecard Granular por Modulo");

      printLine(`Overall: ${result.overall}/100`);
      printLine(`Melhor modulo: ${result.bestModule}`);
      printLine(`Pior modulo: ${result.worstModule}`);
      printLine(`Total de modulos: ${result.modules.length}`);
      printLine("");

      for (const mod of result.modules) {
        const icon = mod.status === "excellent" ? "✅" : mod.status === "good" ? "🟢" : mod.status === "warning" ? "🟡" : "🔴";
        printLine(`${icon} ${mod.name}: ${mod.overall}/100`);
        for (const [dim, score] of Object.entries(mod.dimensions)) {
          printLine(`   ${dim}: ${score}`);
        }
      }

      if (result.recommendations.length > 0) {
        printLine("");
        printLine("Recomendacoes:");
        for (const rec of result.recommendations) {
          printLine(`  \u2022 ${rec}`);
        }
      }

      finish({
        checkpoint: "scorecard_modules",
        ok: true,
        status: "passed",
        context_summary: `${result.modules.length} modulos, overall ${result.overall}/100`,
        data: { modules: result.modules.length, overall: result.overall },
      });
    });

  return cmd;
}
