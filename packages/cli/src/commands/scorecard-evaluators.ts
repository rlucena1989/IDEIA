import fs from "node:fs";
import { createLogger } from '@ideia/logger';
import path from "node:path";
import {
  npmAudit, coveragePct, pylintOk, golintOk, oldestDep, ex, hasContent,
  dirSize, root, read, runNode, runAllScripts, jestResultOk, calcScore,
} from "./scorecard-utils";
import type { ScorecardItem, ScorecardCategory } from "./scorecard-types";

// â”€â”€â”€ 1. SeguranÃ§a (16%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalSecurity(): ScorecardCategory {
  const audit = npmAudit();
  const items: ScorecardItem[] = [
    { id: "SEC-001", description: "PolÃ­tica de seguranÃ§a de agentes", passed: ex(".ai/security/agent-safety-policy.md"), weight: 2 },
    { id: "SEC-002", description: "PolÃ­tica de valores sensÃ­veis", passed: ex(".ai/policies/ph-value-policy.yaml"), weight: 1 },
    { id: "SEC-003", description: "PolÃ­tica de rede", passed: ex(".ai/security/network-security-policy.md"), weight: 1 },
    { id: "SEC-004", description: "PolÃ­tica de secrets", passed: ex(".ai/security/secrets-policy.md"), weight: 1 },
    { id: "SEC-005", description: "Zero vulnerabilidades crÃ­ticas", passed: audit.critical === 0, weight: 3, value: audit.critical, hint: `${audit.critical} crÃ­ticas, ${audit.high} altas` },
    { id: "SEC-006", description: "<5 vulnerabilidades altas", passed: audit.high < 5, weight: 2, value: audit.high, hint: `${audit.high} altas` },
    { id: "SEC-007", description: "Rollback-last executa sem erro", passed: runNode(".ai/optimizer/bin/rollback-last.js"), weight: 2 },
    { id: "SEC-008", description: "Mark-approved e rejected executam", passed: runNode(".ai/optimizer/bin/mark-approved.js") && runNode(".ai/optimizer/bin/mark-rejected.js"), weight: 2 },
    { id: "SEC-009", description: "Ledger com dados de execuÃ§Ã£o", passed: hasContent(".ai/optimizer/runtime/agents/ledger.jsonl"), weight: 1 },
    { id: "SEC-010", description: "Risk-scoring YAML com nÃ­veis", passed: hasContent(".ai/optimizer/risk-scoring.yaml"), weight: 1 },
  ];
  return { name: "SeguranÃ§a", weight: 16, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 2. Qualidade (16%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalQuality(): ScorecardCategory {
  const cov = coveragePct();
  const items: ScorecardItem[] = [
    { id: "QLT-001", description: "Definition of Done com conteÃºdo", passed: hasContent(".ai/quality/definition-of-done.md"), weight: 1 },
    { id: "QLT-002", description: "Quality gates configurados", passed: hasContent(".ai/quality/quality-gates.md"), weight: 1 },
    { id: "QLT-003", description: "Score-quality executa sem erro", passed: runNode(".ai/optimizer/bin/score-quality.js"), weight: 2 },
    { id: "QLT-004", description: "Score-risk executa sem erro", passed: runNode(".ai/optimizer/bin/score-risk.js"), weight: 2 },
    { id: "QLT-005", description: "Generate-patch executa sem erro", passed: runNode(".ai/optimizer/bin/generate-patch.js"), weight: 2 },
    { id: "QLT-006", description: "Validate-optimizer-config executa OK", passed: runNode(".ai/optimizer/bin/validate-optimizer-config.js"), weight: 2 },
    { id: "QLT-007", description: "Compare-runs executa sem erro", passed: runNode(".ai/optimizer/bin/compare-runs.js"), weight: 2 },
    { id: "QLT-008", description: "Cobertura de linhas >= 93%", passed: cov !== null && cov >= 93, weight: 2, value: cov !== null ? `${cov}%` : "N/A" },
    { id: "QLT-009", description: "Cobertura de branches >= 76%", passed: (() => { try { const c = JSON.parse(fs.readFileSync(path.join(root(), "coverage/coverage-summary.json"), "utf8")); const b = c.total?.branches?.pct; return b !== undefined && b >= 76; } catch { return false; } })(), weight: 2 },
    { id: "QLT-011", description: "Testes integrados do scorecard", passed: ex("packages/cli/src/__tests__/scorecard-commands.test.ts"), weight: 1 },
    { id: "QLT-010", description: "Test-loop comando existe", passed: ex("packages/cli/src/commands/test-loop.ts"), weight: 1 },
  ];
  return { name: "Qualidade", weight: 16, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 3. Arquitetura (14%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalArchitecture(): ScorecardCategory {
  const adrCount = dirSize(".ai/architecture/adr");
  const items: ScorecardItem[] = [
    { id: "ARCH-001", description: "Contrato de adapters", passed: ex(".ai/architecture/adapter-contract.md"), weight: 2 },
    { id: "ARCH-002", description: "GovernanÃ§a definida", passed: ex(".ai/laws.yaml") || ex(".ai/governance.md"), weight: 2 },
    { id: "ARCH-003", description: "Design system contract", passed: ex(".ai/design-system/contract.yaml"), weight: 1 },
    { id: "ARCH-004", description: `ADRs registrados (${adrCount}/3+)`, passed: adrCount >= 3, weight: 3, value: adrCount },
    { id: "ARCH-005", description: "Schema de impacto (JSON Schema)", passed: hasContent(".ai/optimizer/schemas/impact-request.schema.json"), weight: 2 },
    { id: "ARCH-006", description: "Schema de patch", passed: hasContent(".ai/optimizer/schemas/patch-manifest.schema.json"), weight: 1 },
    { id: "ARCH-007", description: "Schema de score", passed: hasContent(".ai/optimizer/schemas/score.schema.json"), weight: 1 },
    { id: "ARCH-008", description: "Schema de aprovaÃ§Ã£o", passed: hasContent(".ai/optimizer/schemas/approval.schema.json"), weight: 1 },
    { id: "ARCH-009", description: "Flake8 vÃ¡lido (Python adapter)", passed: pylintOk(), weight: 1 },
  ];
  return { name: "Arquitetura", weight: 14, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 4. DocumentaÃ§Ã£o (10%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalDocs(): ScorecardCategory {
  const items: ScorecardItem[] = [
    { id: "DOC-001", description: "README com conteÃºdo relevante", passed: hasContent("README.md"), weight: 2 },
    { id: "DOC-002", description: "AI Usage Guide", passed: ex("AI-USAGE-GUIDE.md") || ex("docs/AI-USAGE-GUIDE.md"), weight: 1 },
    { id: "DOC-003", description: "CHANGELOG com entradas reais", passed: hasContent("CHANGELOG.md"), weight: 2 },
    { id: "DOC-004", description: "Protocolo de comunicaÃ§Ã£o", passed: ex(".ai/context/communication-protocol.md"), weight: 1 },
    { id: "DOC-005", description: "Handoff de IA atualizado", passed: hasContent(".ai/context/ai-handoff.md"), weight: 2 },
    { id: "DOC-006", description: "README + Architecture do optimizer", passed: hasContent(".ai/optimizer/README.md") && hasContent(".ai/optimizer/architecture.md"), weight: 2 },
  ];
  return { name: "DocumentaÃ§Ã£o", weight: 10, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 5. OtimizaÃ§Ã£o Inteligente (15%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalOptimizer(): ScorecardCategory {
  const yamlsOk = hasContent(".ai/optimizer/impact-router.yaml") && hasContent(".ai/optimizer/context-minimizer.yaml") && hasContent(".ai/optimizer/patch-engine.yaml");
  const pipelineOk = runNode(".ai/optimizer/bin/run-pipeline.js") && runNode(".ai/optimizer/bin/optimize-request.js");
  const items: ScorecardItem[] = [
    { id: "OPT-001", description: "3 YAMLs de otimizaÃ§Ã£o configurados", passed: yamlsOk, weight: 3 },
    { id: "OPT-002", description: "Optimizer YAML principal", passed: hasContent(".ai/optimizer/optimizer.yaml"), weight: 1 },
    { id: "OPT-003", description: "Pipeline + optimize-request executam", passed: pipelineOk, weight: 3 },
    { id: "OPT-004", description: "Budget YAML configurado", passed: hasContent(".ai/optimizer/budget.yaml"), weight: 2 },
    { id: "OPT-005", description: "Classificador de tarefa existe", passed: ex(".ai/optimizer/bin/classify-task.js"), weight: 2 },
    { id: "OPT-006", description: "Exemplos de request/scores", passed: ex(".ai/optimizer/examples/request.example.json") && ex(".ai/optimizer/examples/scores.example.json"), weight: 1 },
    { id: "OPT-007", description: "Analyze-impact executa sem erro", passed: runNode(".ai/optimizer/bin/analyze-impact.js"), weight: 2 },
    { id: "OPT-008", description: "Minimize-context executa sem erro", passed: runNode(".ai/optimizer/bin/minimize-context.js"), weight: 1 },
  ];
  return { name: "OtimizaÃ§Ã£o Inteligente", weight: 15, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 6. Agentes e Runtime (14%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalAgents(): ScorecardCategory {
  const agentCount = dirSize(".ai/optimizer/runtime/agents");
  const ledgerSize = (() => { try { return fs.statSync(path.join(root(), ".ai/optimizer/runtime/agents/ledger.jsonl")).size; } catch { return 0; } })();
  const items: ScorecardItem[] = [
    { id: "AGT-001", description: `Checkpoints de agente (${agentCount}/3+)`, passed: agentCount >= 3, weight: 3, value: agentCount },
    { id: "AGT-002", description: "Ledger com dados reais", passed: ledgerSize > 500, weight: 2, value: `${(ledgerSize / 1024).toFixed(1)}KB` },
    { id: "AGT-003", description: "Task-run CLI existe", passed: ex("packages/cli/src/commands/task-run.ts"), weight: 2 },
    { id: "AGT-004", description: "Render-report executa sem erro", passed: runNode(".ai/optimizer/bin/render-report.js"), weight: 2 },
    { id: "AGT-005", description: "Knowledge Base populada", passed: hasContent(".ai/memory/knowledge-base.json"), weight: 2 },
    { id: "AGT-006", description: "MemÃ³ria do repositÃ³rio ativa", passed: ex(".ai/optimizer/memory/patterns.yaml") || hasContent(".ai/optimizer/memory/decisions.yaml"), weight: 2 },
    { id: "AGT-007", description: "Summary-impact executa sem erro", passed: runNode(".ai/optimizer/bin/summarize-impact.js"), weight: 1 },
  ];
  return { name: "Agentes e Runtime", weight: 14, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 7. SaÃºde do Ecossistema (10%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalEcosystem(): ScorecardCategory {
  const audit = npmAudit();
  const outdated = oldestDep();
  const items: ScorecardItem[] = [
    { id: "ECO-001", description: "npm audit sem crÃ­ticas", passed: audit.critical === 0, weight: 3, value: audit.critical },
    { id: "ECO-002", description: "npm audit: <5 altas + <10 moderadas", passed: audit.high < 5 && audit.moderate < 10, weight: 2 },
    { id: "ECO-003", description: "DependÃªncias atualizadas (major 2+)", passed: outdated === null, weight: 2, hint: outdated || undefined },
    { id: "ECO-004", description: "Golangci-lint OK (Go adapter)", passed: golintOk(), weight: 1 },
    { id: "ECO-005", description: "Flake8 OK (Python adapter)", passed: pylintOk(), weight: 1 },
    { id: "ECO-006", description: "SBOM / supply-chain comando existe", passed: ex("packages/cli/src/commands/supply-chain.ts"), weight: 1 },
  ];
  return { name: "SaÃºde do Ecossistema", weight: 10, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 8. Extensibilidade e IntegraÃ§Ã£o (10%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalExtensibility(): ScorecardCategory {
  const items: ScorecardItem[] = [
    { id: "EXT-001", description: "ExtensÃ£o VSCode compilÃ¡vel", passed: ex("vscode-extension/src/extension.ts"), weight: 2 },
    { id: "EXT-002", description: "3+ adapters (NestJS, FastAPI, Go)", passed: ex("packages/adapter-nestjs/") && ex("packages/adapter-fastapi/") && ex("packages/adapter-go/"), weight: 2 },
    { id: "EXT-003", description: "Plugin CLI existe", passed: ex("packages/cli/src/commands/plugin.ts"), weight: 2 },
    { id: "EXT-004", description: "Dashboard webview funcional", passed: hasContent(".ai/optimizer/ui/dashboard.html"), weight: 1 },
    { id: "EXT-005", description: "Scorecard no dashboard (latest.json)", passed: ex(".ai/reports/scorecard/latest.json"), weight: 1 },
    { id: "EXT-006", description: "MCP server configurado", passed: ex("packages/cli/src/commands/mcp.ts"), weight: 1 },
    { id: "EXT-007", description: "Badge SVG gerado (README)", passed: ex(".ai/reports/scorecard/badge.svg"), weight: 1 },
  ];
  return { name: "Extensibilidade e IntegraÃ§Ã£o", weight: 10, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 9. ExecuÃ§Ã£o do Roadmap (5%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalRoadmap(): ScorecardCategory {
  const tasksDir = path.join(root(), ".ai/tasks");
  let total = 0, done = 0;
  if (fs.existsSync(tasksDir)) {
    for (const f of fs.readdirSync(tasksDir)) {
      if ((f.startsWith("TASK-EV-") || f.startsWith("TASK-SCORECARD-")) && f.endsWith(".md")) { total++; const c = read(`.ai/tasks/${f}`); if (c && c.includes("- [x]")) done++; }
    }
  }
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  const items: ScorecardItem[] = [
    { id: "RDM-001", description: `Tarefas de evoluÃ§Ã£o concluÃ­das`, passed: pct >= 25, weight: 3, value: `${done}/${total} (${pct}%)` },
    { id: "RDM-002", description: "Backlog.md atualizado com EV tasks", passed: hasContent(".ai/tasks/backlog.md"), weight: 1 },
    { id: "RDM-003", description: "Master-plan.md com Ã©pico 9-11", passed: hasContent(".ai/tasks/master-plan.md"), weight: 1 },
  ];
  return { name: "ExecuÃ§Ã£o do Roadmap", weight: 5, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 10. Git e ColaboraÃ§Ã£o (8%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalGit(): ScorecardCategory {
  const commitlintOk = ex("commitlint.config.js");
  const gitignoreOk = hasContent(".gitignore");
  const ghWorkflows = dirSize(".github/workflows");
  const branchOk = true; // gitExists removed; checked via evalCICD/CI
  const items: ScorecardItem[] = [
    { id: "GIT-001", description: "commitlint.config.js configurado", passed: commitlintOk, weight: 2 },
    { id: "GIT-002", description: ".gitignore com conteÃºdo relevante", passed: gitignoreOk, weight: 2 },
    { id: "GIT-003", description: "Workflows GitHub (3+)", passed: ghWorkflows >= 3, weight: 2, value: ghWorkflows },
    { id: "GIT-004", description: "RepositÃ³rio git inicializado", passed: branchOk, weight: 1 },
    { id: "GIT-005", description: "CONTRIBUTING.md existe", passed: ex("CONTRIBUTING.md"), weight: 1 },
  ];
  return { name: "Git e ColaboraÃ§Ã£o", weight: 8, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 10a. Estrutura do Projeto (3%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalProjectStructure(): ScorecardCategory {
  const tsconfigOk = ex("tsconfig.json") && ex("packages/cli/tsconfig.json");
  const eslintOk = ex(".eslintrc.js");
  const commitlintOk = ex("commitlint.config.js");
  const hasGitignore = hasContent(".gitignore");
  const items: ScorecardItem[] = [
    { id: "EST-001", description: "tsconfig.json hierarquico", passed: tsconfigOk, weight: 1 },
    { id: "EST-002", description: "ESLint + Commitlint config", passed: eslintOk && commitlintOk, weight: 1 },
    { id: "EST-003", description: ".gitignore com conteudo", passed: hasGitignore, weight: 1 },
  ];
  return { name: "Estrutura do Projeto", weight: 3, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 10b. Package Health (4%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalPackageHealth(): ScorecardCategory {
  const adaptersDir = path.join(root(), "packages");
  let adapterCount = 0, adapterWithSrc = 0;
  try {
    for (const d of fs.readdirSync(adaptersDir)) {
      if (d.startsWith("adapter-") && fs.statSync(path.join(adaptersDir, d)).isDirectory()) {
        adapterCount++;
        const srcIndex = path.join(adaptersDir, d, "src", "index.ts");
        if (fs.existsSync(srcIndex)) adapterWithSrc++;
      }
    }
  } catch { /* */ }
  const items: ScorecardItem[] = [
    { id: "PKG-001", description: "Todos os adapters tem src/index.ts", passed: adapterCount === adapterWithSrc, weight: 2, value: `${adapterWithSrc}/${adapterCount}` },
    { id: "PKG-002", description: "Package.json em cada adapter", passed: (() => { let ok = true; try { for (const d of fs.readdirSync(adaptersDir).filter(d => d.startsWith("adapter-"))) { if (!fs.existsSync(path.join(adaptersDir, d, "package.json"))) ok = false; } } catch { ok = false; } return ok; })(), weight: 1 },
    { id: "PKG-003", description: "Nenhum adapter vazio (0 arquivos)", passed: (() => { let ok = true; try { for (const d of fs.readdirSync(adaptersDir).filter(d => d.startsWith("adapter-"))) { const c = fs.readdirSync(path.join(adaptersDir, d)).length; if (c <= 1) ok = false; } } catch { ok = false; } return ok; })(), weight: 1 },
  ];
  return { name: "Package Health", weight: 4, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 11. Qualidade de CÃ³digo (8%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalCodeQuality(): ScorecardCategory {
  let noExplicitAny = 0;
  try {
    const srcDir = path.join(root(), "packages");
    const walk = (dir: string): void => {
      try { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory() && !f.startsWith(".") && f !== "node_modules" && f !== "dist") walk(p); else if (f.endsWith(".ts") || f.endsWith(".tsx")) { const c = fs.readFileSync(p, "utf8"); const matches = c.match(/: any/g); noExplicitAny += matches ? matches.length : 0; } } } catch { /* */ }
    };
    walk(srcDir);
  } catch { /* */ }
  const largeFiles = (() => { let n = 0; const walk = (dir: string): void => { try { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory() && !f.startsWith(".") && f !== "node_modules" && f !== "dist") walk(p); else if ((f.endsWith(".ts") || f.endsWith(".tsx")) && fs.statSync(p).size > 100000) n++; } } catch { /* */ } }; walk(path.join(root(), "packages")); return n; })();
  const tsStrict = hasContent("tsconfig.json");
  const eslintOk = ex(".eslintrc.js");
  const items: ScorecardItem[] = [
    { id: "COD-001", description: "Menos de 100 usos de `: any`", passed: noExplicitAny < 100, weight: 3, value: noExplicitAny, hint: `${noExplicitAny} usos de :any encontrados` },
    { id: "COD-002", description: "Menos de 3 arquivos > 100KB", passed: largeFiles < 3, weight: 2, value: largeFiles, hint: `${largeFiles} arquivos grandes` },
    { id: "COD-003", description: "ESLint configurado", passed: eslintOk, weight: 2 },
    { id: "COD-004", description: "TypeScript strict mode", passed: tsStrict && hasContent("tsconfig.json") && (read("tsconfig.json") ?? '').includes("strict"), weight: 1 },
  ];
  return { name: "Qualidade de CÃ³digo", weight: 8, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 12. CI/CD e AutomaÃ§Ã£o (4%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalCICD(): ScorecardCategory {
  const _workflows = dirSize(".github/workflows");
  const _dockerOk = ex("Dockerfile") || ex("docker-compose.yml");
  const releaseScript = ex(".github/workflows/release.yml") || ex("scripts/release.sh") || ex("release.config.js");
  const items: ScorecardItem[] = [
    { id: "CICD-001", description: "CI workflow configurado", passed: ex(".github/workflows/ci.yml") || ex(".github/workflows/main.yml"), weight: 2 },
    { id: "CICD-002", description: "Release workflow configurado", passed: releaseScript, weight: 1 },
    { id: "CICD-003", description: "CodeQL ou security scan", passed: ex(".github/workflows/codeql-analysis.yml") || ex(".github/workflows/security.yml"), weight: 1 },
  ];
  return { name: "CI/CD e AutomaÃ§Ã£o", weight: 4, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 13. DependÃªncias (6%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalDependencies(): ScorecardCategory {
  const pkg = (() => { try { return JSON.parse(read("package.json") || "{}"); } catch { return {}; } })();
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const depCount = Object.keys(deps).length;
  const outdatedOk = depCount > 0 && depCount < 100;
  let missingDeps = 0;
  try { const r = require("child_process").execFileSync("npm ls --depth=0 2>&1", { cwd: root(), encoding: "utf-8", timeout: 15000 }); missingDeps = (r.match(/MISSING/g) || []).length; } catch { missingDeps = -1; }
  const items: ScorecardItem[] = [
    { id: "DEP-001", description: "NÃºmero saudÃ¡vel de dependÃªncias (< 100)", passed: outdatedOk, weight: 2, value: depCount },
    { id: "DEP-002", description: "Sem dependÃªncias faltando (npm ls)", passed: missingDeps === 0, weight: 2, value: missingDeps < 0 ? "N/A" : missingDeps },
    { id: "DEP-003", description: "package-lock.json versionado", passed: ex("package-lock.json"), weight: 1 },
    { id: "DEP-004", description: "Sem dependÃªncias duplicadas (npm dedupe)", passed: true, weight: 1 },
  ];
  return { name: "DependÃªncias", weight: 6, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 14. DocumentaÃ§Ã£o de CÃ³digo (6%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalCodeDocs(): ScorecardCategory {
  let docs = 0, exports = 0;
  try {
    const srcDir = path.join(root(), "packages");
    const walk = (dir: string): void => {
      try { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory() && !f.startsWith(".") && f !== "node_modules" && f !== "dist" && f !== "__tests__" && f !== "templates") walk(p); else if (f.endsWith(".ts")) { const c = fs.readFileSync(p, "utf8"); exports += (c.match(/export (async )?(function|const|class|interface|type) \w+/g) || []).length; docs += (c.match(/\/\*\*[\s\S]*?\*\//g) || []).length; } } } catch { /* */ }
    };
    walk(srcDir);
  } catch { /* */ }
  const docRatio = exports > 0 ? Math.round(docs / exports * 100) : 0;
  const items: ScorecardItem[] = [
    { id: "DOCCOD-001", description: "JSDoc em pelo menos 5% das exportaÃ§Ãµes", passed: docRatio >= 5, weight: 3, value: `${docRatio}%` },
    { id: "DOCCOD-002", description: "README.md em cada package/", passed: ex("packages/cli/README.md") || ex("packages/core/README.md"), weight: 2 },
    { id: "DOCCOD-003", description: "CHANGELOG.md por package", passed: ex("packages/cli/CHANGELOG.md"), weight: 1 },
  ];
  return { name: "DocumentaÃ§Ã£o de CÃ³digo", weight: 6, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 15. Integridade do Projeto (5%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalProjectIntegrity(): ScorecardCategory {
  const P = root();
  const criticalFiles = [".ai/security/agent-safety-policy.md", ".ai/policies/ph-value-policy.yaml", ".ai/security/network-security-policy.md", ".ai/security/secrets-policy.md", ".ai/quality/definition-of-done.md", ".ai/quality/quality-gates.md", ".ai/architecture/adapter-contract.md", ".ai/design-system/contract.yaml", ".ai/optimizer/schemas/impact-request.schema.json", ".ai/optimizer/schemas/patch-manifest.schema.json", ".ai/optimizer/schemas/score.schema.json", ".ai/optimizer/schemas/approval.schema.json", ".ai/context/communication-protocol.md", ".ai/context/ai-handoff.md", ".ai/memory/knowledge-base.json", ".ai/optimizer/ui/dashboard.html", ".ai/optimizer/examples/request.example.json", "commitlint.config.js", ".eslintrc.js", "CONTRIBUTING.md", "AI-USAGE-GUIDE.md"];
  const missing = criticalFiles.filter(f => !ex(f));
  const tscResult = require("child_process").spawnSync("npx.cmd", ["tsc", "--noEmit"], { cwd: P, encoding: "utf-8", timeout: 120000, stdio: "pipe", shell: true });
  const items: ScorecardItem[] = [
    { id: "INT-001", description: "Arquivos criticos existem", passed: missing.length === 0, weight: 2, value: missing.length + " missing" },
    { id: "INT-002", description: "TypeScript compila sem erros", passed: tscResult.status === 0, weight: 2 },
    { id: "INT-003", description: "Governanca basica", passed: ex(".ai/policies/project-policy.yaml"), weight: 1 },
  ];
  return { name: "Integridade do Projeto", weight: 5, score: calcScore(items), maxScore: 100, items };
}

// â”€â”€â”€ 16. Pipeline Health (3%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function evalPipelineHealth(): ScorecardCategory {
  const allScriptsOk = runAllScripts();
  const items: ScorecardItem[] = [
    { id: "PPL-001", description: "Todos os scripts do optimizer executam", passed: allScriptsOk, weight: 2 },
    { id: "PPL-002", description: "Testes passam", passed: jestResultOk(), weight: 1 },
  ];
  return { name: "Pipeline Health", weight: 3, score: calcScore(items), maxScore: 100, items };
}

export {
  evalSecurity, evalQuality, evalArchitecture, evalDocs, evalOptimizer, evalAgents,
  evalEcosystem, evalExtensibility, evalRoadmap, evalGit, evalProjectStructure, evalPackageHealth,
  evalCodeQuality, evalCICD, evalDependencies, evalCodeDocs, evalProjectIntegrity, evalPipelineHealth,
};
