import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { spawnSync, execSync } from 'node:child_process';
import { generateGranularScorecard } from "../utils/module-scorecard";
import { printHeader, printLine, finish } from "../utils/output";
import { queryLocalAI, loadPolicyGates, applyPolicyGates, runBenchmarks, buildAIAnalysisPrompt, shieldColor, calcScore, level, overallScore, buildRecommendations, buildAlerts, generateBadge, buildTrends, computeGit, crossCategoryAnalysis, forecastScore, validateYamlContent, generateFromTemplate, scoreDiffExport, loadCustomChecks, linkScoreToCommits, detectRegression, saveSnapshot, createTasksFromFailures, generateHTML, serveMode, publishResult, watchMode, cadenceMode, sendNotifications, root, read, git, npmAudit, coveragePct, pylintOk, golintOk, oldestDep, ex, hasContent, dirSize, jsonParse, runNode, runAllScripts, jestResultOk, Benchmarks } from './scorecard-utils';
import { print } from './scorecard-display';

// Re-export all utility functions for backward compatibility with tests
export * from './scorecard-utils';

import type { ScorecardItem, ScorecardCategory, ScorecardTrend, ScorecardAlert, CorrelationAlert, ScorecardResult } from './scorecard-types';
export type { ScorecardItem, ScorecardCategory, ScorecardTrend, ScorecardAlert, CorrelationAlert, ScorecardResult } from "./scorecard-types";
import { evalSecurity, evalQuality, evalArchitecture, evalDocs, evalOptimizer, evalAgents, evalEcosystem, evalExtensibility, evalRoadmap, evalGit, evalPackageHealth, evalProjectStructure, evalCodeQuality, evalCICD, evalDependencies, evalCodeDocs, evalProjectIntegrity, evalPipelineHealth } from "./scorecard-evaluators";

// ─── Core ───────────────────────────────────────────────────────────────────â”€â”€â”€â”€
/**
 * Processa scorecard.
 * @returns O resultado da operaÃ§Ã£o.
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
  saveSnapshot(result);
  // markdown summary for CI
  const md = [
    "# Scorecard Report",
    `- **Score:** ${result.overallScore}/100 (${result.maturityLevel})`,
    `- **VersÃ£o:** ${result.evolution.version} â€” ${result.evolution.categories} categorias, ${result.evolution.items} itens`,
    `- **Git:** ${result.git.branch}@${result.git.commit}`,
    `- **Timestamp:** ${result.timestamp}`,
    `- **DuraÃ§Ã£o:** ${result.meta.durationMs}ms`,
    "",
    "## Categorias",
    ...result.categories.filter(c => c.weight > 0).map(c => `- **${c.name}** (${c.weight}%): ${Math.round(c.score)}/100`),
    "",
    result.alerts.length > 0 ? "## Alertas\n" + result.alerts.map(a => `- ðŸ”´ [${a.category}] ${a.message}`).join("\n") : "",
    result.recommendations.length > 0 ? "## RecomendaÃ§Ãµes\n" + result.recommendations.slice(0, 10).map((r, i) => `${i + 1}. ${r.text}`).join("\n") : "",
    "---",
    result.correlationAlerts.length > 0 ? "## CorrelaÃ§Ãµes\n" + result.correlationAlerts.map(a => `- ${a.message}`).join("\n") : "",
    result.forecast.history && result.forecast.history.length >= 3 ? `## PrevisÃ£o 30d\n- Score previsto: ${result.forecast.forecast}/100\n- ConfianÃ§a: ${result.forecast.confidence}\n- TendÃªncia: ${result.forecast.trend}` : "",
    result.alerts.length > 0 ? "## Alertas\n" + result.alerts.slice(0, 5).map(a => `- ðŸ”´ ${a.message}`).join("\n") : "",
    "---",
    `_Gerado pelo AI-Devkit Scorecard v13_`,
  ].filter(Boolean).join("\n");
  fs.writeFileSync(path.join(dir, "report.md"), md);
}

// â”€â”€â”€ Command â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Processa command.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function scorecardCommand(): Command {
  const cmd = new Command("scorecard")
    .description("Scorecard v8 â€” cross-category correlation, 30d forecast, schema validation, templates, json-diff, + 25 flags v1-v7")
    .option("--json", "JSON completo para CI")
    .option("--history", "Ãšltimos 10 scores")
    .option("--diff", "ComparaÃ§Ã£o com anterior")
    .option("--branch <name>", "Compara score com outra branch")
    .option("--trends", "GrÃ¡fico textual de tendÃªncia")
    .option("--watch [seconds]", "Modo observaÃ§Ã£o (default 30s)", false)
    .option("--badge", "Gera badge SVG apenas")
    .option("--auto-fix", "Corrige itens automÃ¡ticos via fixCommand")
    .option("--create-tasks", "Cria tasks no backlog para itens falhos")
    .option("--html", "Gera relatÃ³rio HTML em .ai/reports/scorecard/report.html")
    .option("--serve [port]", "Inicia servidor HTTP com dashboard (default 3456)")
    .option("--changes", "Mostra diff detalhado desde o Ãºltimo scorecard")
    .option("--gate <threshold>", "Exit 1 se score < N (ex: 70)")
    .option("--webhook <url>", "POST resultado para webhook")
    .option("--ci", "Exit 1 se score < 50")
    .option("--ai [model]", "Analisa resultados com IA local (Ollama) e gera recomendaÃ§Ãµes")
    .option("--benchmark", "Executa benchmarks (build, test, lint) e anexa ao resultado")
    .option("--remote <url>", "Envia resultado para aggregation server remoto")
    .option("--remote-benchmark <url>", "Compara score com benchmarks remotos (mÃ©dia da org)")
    .option("--cadence [minutes]", "Modo monitoramento contÃ­nuo (default 15min)", false)
    .option("--cadence-threshold <points>", "Limiar de regressÃ£o para cadence (default 5)", "5")
    .option("--git-trace", "Mostra histÃ³rico de score linkado a commits")
    .option("--notify-webhook <url>", "Webhook para notificaÃ§Ãµes de regressÃ£o")
    .option("--snapshot", "Apenas gera snapshot do scorecard atual")
    .option("--regression-check", "Verifica regressÃ£o desde o Ãºltimo snapshot")
    .option("--correlation", "Mostra anÃ¡lise cruzada entre categorias")
    .option("--forecast", "Mostra previsÃ£o de score para 30 dias")
    .option("--json-diff <fromTimestamp>", "Exporta diff JSON entre dois snapshots (usa o timestamp do snapshot)")
    .option("--validate-yaml <file>", "Valida conteÃºdo de YAML contra chaves obrigatÃ³rias")
    .option("--template <name>", "Gera arquivo de governanÃ§a a partir de template")
    .action(async (options) => {
      // â”€â”€ Compute once â”€â”€
      const result = computeScorecard();
      saveAll(result);
      publishResult(result, options.webhook);

      // â”€â”€ Policy gates â”€â”€
      const gates = loadPolicyGates();
      const gateResult = applyPolicyGates(result, gates);
      if (gateResult.blocked) { console.error("  ðŸ”´ Policy gate bloqueou.\n"); process.exit(1); }
      if (gateResult.tasksCreated > 0) console.log(`  ðŸ“‹ ${gateResult.tasksCreated} tasks via policy gates.\n`);

      // â”€â”€ Correlation â”€â”€
      if (options.correlation) {
        const ca = crossCategoryAnalysis(result);
        if (ca.length > 0) { console.log("\n  ANÃLISE CRUZADA:\n"); ca.forEach(a => console.log(`  ${a.severity === "critical" ? "ðŸ”´" : a.severity === "warn" ? "ðŸŸ¡" : "ðŸ”µ"} [${a.severity.toUpperCase()}] ${a.message}\n`)); }
        else console.log("\n  âœ… Sem alertas de correlaÃ§Ã£o entre categorias.\n");
      }

      // â”€â”€ Forecast â”€â”€
      if (options.forecast) {
        const f = forecastScore(30);
        if (f.history.length >= 3) {
          const arrow = f.trend === "up" ? "ðŸ“ˆ" : f.trend === "down" ? "ðŸ“‰" : "âž¡ï¸";
          console.log(`\n  PREVISÃƒO 30 DIAS:\n  ${arrow} ${f.forecast}/100 (confianÃ§a: ${f.confidence})\n  TendÃªncia: ${f.trend}\n`);
          console.log(`  HistÃ³rico (${f.history.length} pontos): ${f.history.slice(-10).join(" â†’ ")}\n`);
        } else { console.log("\n  âš  Dados insuficientes para previsÃ£o (mÃ­nimo 3 snapshots).\n"); }
      }

      // â”€â”€ Validate YAML â”€â”€
      if (options.validateYaml) {
        const keys = ["version", "enabled", "name"];
        const result2 = validateYamlContent(options.validateYaml, keys);
        if (result2.valid) console.log(`\n  âœ… ${options.validateYaml}: vÃ¡lido (${keys.length}/${keys.length} chaves)\n`);
        else console.log(`\n  âš  ${options.validateYaml}: ${result2.missing.join(", ")} ausentes\n`);
      }

      // â”€â”€ Template generation â”€â”€
      if (options.template) {
        const content = generateFromTemplate(options.template, { version: "1.0", project: root().split(/[/\\]/).pop() || "projeto", agents: "agente1, agente2", network: "restrita", secrets: "gerenciadas", title: "DecisÃ£o Arquitetural", status: "proposto", context: "Descreva o contexto...", decision: "Descreva a decisÃ£o..." });
        const targetDir = path.join(root(), ".ai/scorecard/templates");
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        const targetFile = path.join(targetDir, `${options.template}.md`);
        fs.writeFileSync(targetFile, content, "utf8");
        console.log(`\n  Template gerado: ${targetFile}\n`);
      }

      // â”€â”€ JSON diff â”€â”€
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
            console.log(`\n  Diff salvo: ${diffPath}\n`);
          } else { console.log("\n  Snapshot nÃ£o encontrado.\n"); }
        } catch { console.log("\n  Erro ao gerar diff.\n"); }
      }

      // â”€â”€ Remote â”€â”€

      // â”€â”€ Benchmark â”€â”€
      let benchmarks: Benchmarks | undefined;
      if (options.benchmark) benchmarks = runBenchmarks();

      // â”€â”€ AI analysis â”€â”€
      if (options.ai !== undefined && options.ai !== false) {
        const prompt = buildAIAnalysisPrompt(result, benchmarks);
        console.log("\n  ðŸ¤– Analisando com IA local...\n");
        const analysis = await queryLocalAI(prompt, typeof options.ai === "string" ? options.ai : undefined);
        if (analysis) {
          console.log("  " + "â”€".repeat(55));
          console.log("  ANÃLISE DO SCORECARD:\n");
          for (const line of analysis.split("\n")) console.log(`  ${line}`);
          console.log("\n  " + "â”€".repeat(55) + "\n");
        } else { console.log("  âš  IA local indisponÃ­vel (Ollama nÃ£o estÃ¡ rodando?)\n"); }
        return;
      }

      if (options.benchmark && benchmarks) {
        console.log(`\n  BENCHMARKS:\n`);
        console.log(`  Build:  ${benchmarks.buildTimeMs ? (benchmarks.buildTimeMs / 1000).toFixed(1) + "s" : "N/A"}`);
        console.log(`  Test:   ${benchmarks.testTimeMs ? (benchmarks.testTimeMs / 1000).toFixed(1) + "s" : "N/A"}`);
        console.log(`  Lint:   ${benchmarks.lintTimeMs ? (benchmarks.lintTimeMs / 1000).toFixed(1) + "s" : "N/A"}`);
        console.log(`  Files:  ${benchmarks.totalFiles} arquivos .ts/.tsx\n`);
        if (!options.ai) return;
      }

      // â”€â”€ Cadence mode â”€â”€
      if (options.cadence !== false) {
        const interval = typeof options.cadence === "string" ? parseInt(options.cadence) || 15 : 15;
        const threshold = parseInt(options.cadenceThreshold) || 5;
        cadenceMode(interval, threshold, options.notifyWebhook);
        return;
      }

      // â”€â”€ Git trace â”€â”€
      if (options.gitTrace) {
        const trace = linkScoreToCommits(result);
        if (trace.scoreHistory.length > 0) {
          console.log("\n  ðŸ“œ Score x Commits:\n");
          trace.scoreHistory.forEach((s, i) => console.log(`  ${i + 1}. ${s.commit} â€” ${s.score}/100`));
          console.log();
        } else { console.log("  Sem dados de snapshot para git-trace.\n"); }
        return;
      }

      // â”€â”€ Snapshot only â”€â”€
      if (options.snapshot) {
        console.log(`  ðŸ“¸ Snapshot salvo: ${result.timestamp.slice(0, 19)} â€” ${result.overallScore}/100\n`);
        return;
      }

      // â”€â”€ Regression check â”€â”€
      if (options.regressionCheck) {
        const reg = detectRegression(result, 5);
        if (reg.regressed) {
          console.log(`\n  âš  REGRESSÃƒO DETECTADA desde ${reg.sinceTimestamp?.slice(0, 19) || "?"}:\n`);
          reg.drops.forEach(d => console.log(`  â†“ ${d.category}: ${d.from} â†’ ${d.to}`));
          console.log();
        } else { console.log(`  âœ… Sem regressÃ£o significativa desde o Ãºltimo snapshot.\n`); }
        return;
      }

      // â”€â”€ Watch mode â”€â”€
      if (options.watch !== false) {
        watchMode(typeof options.watch === "string" ? parseInt(options.watch) || 30 : 30);
        return;
      }

      // â”€â”€ Badge only â”€â”€
      if (options.badge) {
        const b = generateBadge(result.overallScore);
        const p = path.join(root(), ".ai/reports/scorecard/badge.svg");
        if (!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, b); console.log(`  Badge: .ai/reports/scorecard/badge.svg (${result.overallScore}/100)\n`); return;
      }

      // â”€â”€ Branch comparison â”€â”€
      if (options.branch) {
        const currentBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]) || "current";
        const targetBranch = options.branch;
        console.log(`\n  Comparando: ${currentBranch} vs ${targetBranch}\n`);
        const stash = git(["stash"]) !== null;
        const checkoutOk = git(["checkout", targetBranch]) !== null;
        let branchScore: ScorecardResult | null = null;
        if (checkoutOk) { branchScore = computeScorecard(); git(["checkout", currentBranch]); if (stash) git(["stash", "pop"]); }
        else { git(["checkout", currentBranch]); if (stash) git(["stash", "pop"]); }
        if (!branchScore) { console.log(`  âŒ Branch "${targetBranch}" inacessÃ­vel.\n`); return; }
        const diff = result.overallScore - branchScore.overallScore;
        console.log(`  ${currentBranch}: ${result.overallScore}/100 (${result.maturityLevel})`);
        console.log(`  ${targetBranch}: ${branchScore.overallScore}/100 (${branchScore.maturityLevel})`);
        console.log(`  VariaÃ§Ã£o: ${diff > 0 ? "+" : ""}${diff} pontos\n`);
        for (const cc of result.categories) {
          const bc = branchScore.categories.find(c => c.name === cc.name);
          if (bc) { const d = Math.round(cc.score - bc.score); if (d !== 0) console.log(`  ${cc.name}: ${d > 0 ? "+" : ""}${d}`); }
        }
        console.log(); return;
      }

      // â”€â”€ Other display modes â”€â”€
      if (options.json) { console.log(JSON.stringify(result, null, 2)); return; }

      if (options.history) {
        const f = path.join(root(), ".ai/reports/scorecard/history.json");
        if (fs.existsSync(f)) {
          const h: ScorecardResult[] = JSON.parse(fs.readFileSync(f, "utf8"));
          console.log("\n  HistÃ³rico:\n");
          h.slice(-10).forEach((e, i) => console.log(`  ${i + 1}. ${e.timestamp.slice(0, 19)} â€” ${e.overallScore}/100 ${e.maturityLevel} â€” v${e.evolution.version}`));
          console.log();
        } else { console.log("  Nenhum histÃ³rico.\n"); }
        return;
      }

      if (options.diff) {
        const f = path.join(root(), ".ai/reports/scorecard/history.json");
        if (fs.existsSync(f)) {
          const h: ScorecardResult[] = JSON.parse(fs.readFileSync(f, "utf8"));
          if (h.length >= 2) {
            const p = h[h.length - 2]; const d = result.overallScore - p.overallScore;
            console.log(`\n  Anterior: ${p.overallScore}/100 ${p.maturityLevel} â€” v${p.evolution.version} â€” ${p.evolution.items} itens`);
            console.log(`  Atual:    ${result.overallScore}/100 ${result.maturityLevel} â€” v${result.evolution.version} â€” ${result.evolution.items} itens`);
            console.log(`  VariaÃ§Ã£o: ${d > 0 ? "+" : ""}${d} pontos\n`);
          } else { console.log("  HistÃ³rico insuficiente.\n"); }
        }
        return;
      }

      if (options.trends) {
        const f = path.join(root(), ".ai/reports/scorecard/history.json");
        if (fs.existsSync(f)) {
          const h: ScorecardResult[] = JSON.parse(fs.readFileSync(f, "utf8"));
          const w = h.slice(-15);
          if (w.length >= 2) {
            console.log("\n  TendÃªncia:\n");
            const mx = Math.max(...w.map(e => e.overallScore), 100);
            w.forEach(e => console.log(`  ${e.timestamp.slice(0, 10)} ${"â–ˆ".repeat(Math.round(e.overallScore / mx * 30))} ${e.overallScore}`));
            console.log();
          } else { console.log("  Dados insuficientes.\n"); }
        }
        return;
      }

      if (options.autoFix) {
        console.log("\n  AUTO-FIX:\n"); let fixed = 0;
        for (const cat of result.categories) for (const item of cat.items) {
          if (!item.passed && item.fixCommand) {
            process.stdout.write(`  ðŸ”§ ${item.id}... `);
            try { const r = spawnSync("node", [path.join(root(), item.fixCommand)], { cwd: root(), stdio: "pipe", timeout: 10000 }); if (r.status === 0) { fixed++; console.log("âœ…"); } else console.log("âŒ"); } catch { console.log("âŒ"); }
          }
        }
        console.log(`\n  ${fixed} corrigidos.\n`); return;
      }

      if (options.createTasks) { const n = createTasksFromFailures(result); console.log(`\n  ${n} tarefas criadas.\n`); return; }
      if (options.html) { const h = generateHTML(result); fs.writeFileSync(path.join(root(), ".ai/reports/scorecard/report.html"), h, "utf8"); console.log(`  HTML: .ai/reports/scorecard/report.html\n`); return; }
      if (options.serve !== undefined && options.serve !== false) { serveMode(typeof options.serve === "string" ? parseInt(options.serve) || 3456 : 3456); return; }

      if (options.changes) {
        const f = path.join(root(), ".ai/reports/scorecard/history.json");
        if (fs.existsSync(f)) {
          const h: ScorecardResult[] = JSON.parse(fs.readFileSync(f, "utf8"));
          if (h.length >= 2) {
            const prev = h[h.length - 2]; const d = result.overallScore - prev.overallScore;
            console.log(`\n  MudanÃ§as desde ${prev.timestamp.slice(0, 19)}:\n`);
            console.log(`  Score: ${prev.overallScore} â†’ ${result.overallScore} (${d > 0 ? "+" : ""}${d})`);
            console.log(`  Itens: ${prev.evolution.items} â†’ ${result.evolution.items}`);
            for (const cc of result.categories) {
              const pc = prev.categories.find(c => c.name === cc.name);
              if (pc) { const dd = Math.round(cc.score - pc.score); if (dd !== 0) console.log(`  ${dd > 0 ? "â†‘" : "â†“"} ${cc.name}: ${Math.round(pc.score)} â†’ ${Math.round(cc.score)} (${dd > 0 ? "+" : ""}${dd})`); }
              else console.log(`  âœš ${cc.name}: ${Math.round(cc.score)}/100 (nova)`);
            }
            console.log();
          } else { console.log("  HistÃ³rico insuficiente.\n"); }
        }
        return;
      }

      // â”€â”€ Default: print â”€â”€
      print(result);
      const threshold = options.gate ? parseInt(options.gate) : options.ci ? 50 : 0;
      if (threshold > 0 && result.overallScore < threshold) { console.error(`  Gate FAIL: score ${result.overallScore} < ${threshold}\n`); process.exit(1); }
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
        const icon = mod.status === "excellent" ? "âœ…" : mod.status === "good" ? "ðŸŸ¢" : mod.status === "warning" ? "ðŸŸ¡" : "ðŸ”´";
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
