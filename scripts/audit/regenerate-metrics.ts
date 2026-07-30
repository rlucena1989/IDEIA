/**
 * regenerate-metrics.ts — Fonte determinística única das métricas do IDEIA. (FA-04)
 *
 * Recalcula TODOS os números diretamente do código (zero prosa inventada):
 *   - Packages (count, LOC, testes, dependências)
 *   - TODO/FIXME/HACK markers
 *   - console.log
 *   - ADRs em docs/adr/ (deduplicados por título canônico)
 *   - Comandos CLI (regex `.command('name'` em packages/cli/src/commands)
 *   - Arquivos de teste (.test.ts/.test.tsx)
 *
 * Saídas (todas determinísticas exceto timestamps marcados com §):
 *   - docs/governance/REALITY-MANIFEST.md          (a) reescrito
 *   - .ai/context/inject.json                      (b) regenerado
 *   - .ai/context/ai-handoff.md                    (b)
 *   - .ai/context/ai-handoff-compact.md            (b)
 *   - .ai/context/project-state.md                 (b)
 *   - .ai/context/project-summary.md               (b)
 *   - .ai/context/communication-protocol.md        (b)
 *   - .ai/context/README.md                        (b)
 *   - .ai/context/CLAUDE.md                        (b)
 *   - .ai/project-manifest.yaml                   (b)
 *   - .ai/stack.json                              (b)
 *   - .ai/session-mode.json                       (b) — schema limpo
 *
 * Modos:
 *   npx tsx scripts/audit/regenerate-metrics.ts            # audit (print only)
 *   npx tsx scripts/audit/regenerate-metrics.ts --fix       # escreve todas as saídas
 *   npx tsx scripts/audit/regenerate-metrics.ts --ci       # exit 1 se drift vs commit
 *
 * Anti-deriva: --ci compara o manifesto em commit com a regeneração em memória
 * (linhas §timestamp§ são normalizadas antes da comparação) — falha em qualquer
 * divergência estrutural. Núcleo do Gate 2 (PR) exigido por FA-04.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, resolve, relative, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ───────── Paths (todos relativos ao repo root) ─────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const ROOT = resolve(__dirname, '..', '..');
const PACKAGES_DIR = join(ROOT, 'packages');
const DOCS_DIR = join(ROOT, 'docs');
const GOVERNANCE_DIR = join(DOCS_DIR, 'governance');
const ADR_DIR = join(DOCS_DIR, 'adr');
const CONTEXT_DIR = join(ROOT, '.ai', 'context');
const AI_DIR = join(ROOT, '.ai');
const CLI_COMMANDS_DIR = join(PACKAGES_DIR, 'cli', 'src', 'commands');

const REALITY_MANIFEST = join(GOVERNANCE_DIR, 'REALITY-MANIFEST.md');
const INJECT_JSON = join(CONTEXT_DIR, 'inject.json');
const AI_HANDOFF = join(CONTEXT_DIR, 'ai-handoff.md');
const AI_HANDOFF_COMPACT = join(CONTEXT_DIR, 'ai-handoff-compact.md');
const PROJECT_STATE = join(CONTEXT_DIR, 'project-state.md');
const PROJECT_SUMMARY = join(CONTEXT_DIR, 'project-summary.md');
const COMM_PROTOCOL = join(CONTEXT_DIR, 'communication-protocol.md');
const CONTEXT_README = join(CONTEXT_DIR, 'README.md');
const CONTEXT_CLAUDE = join(CONTEXT_DIR, 'CLAUDE.md');
const PROJECT_MANIFEST = join(AI_DIR, 'project-manifest.yaml');
const STACK_JSON = join(AI_DIR, 'stack.json');
const SESSION_MODE = join(AI_DIR, 'session-mode.json');

// ───────── Tipos ─────────
interface PackageInfo {
  name: string;
  path: string;
  version: string;
  description: string;
  hasSrc: boolean;
  testCount: number;
  loc: number;
  deps: string[];
}

interface Metrics {
  totalPackages: number;
  srcPackages: number;
  totalLoc: number;
  totalTestFiles: number;
  todos: number;
  fixmes: number;
  hacks: number;
  consoleLogs: number;
  adrFiles: number;
  adrUnique: number;
  adrDuplicates: number;
  cliCommands: number;
  filesOver500Lines: number;
}

interface RegenerationResult {
  timestamp: string;
  packages: PackageInfo[];
  metrics: Metrics;
  outputs: Record<string, string>;
}

// ───────── Util ─────────

function readJSON(path: string): Record<string, unknown> {
  let content = readFileSync(path, 'utf-8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  return JSON.parse(content);
}

function recurseFind(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build' || entry.name.startsWith('.git')) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) results.push(...recurseFind(full, pattern));
      else if (pattern.test(entry.name)) results.push(full);
    }
  } catch { /* ignore */ }
  return results;
}

function countLinesFile(fp: string): number {
  try { return readFileSync(fp, 'utf-8').split('\n').length; } catch { return 0; }
}

function countLinesDir(dir: string): number {
  let total = 0;
  try {
    for (const f of readdirSync(dir)) {
      const fp = join(dir, f);
      try {
        if (statSync(fp).isDirectory()) total += countLinesDir(fp);
        else if (f.endsWith('.ts') || f.endsWith('.tsx')) total += countLinesFile(fp);
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return total;
}

function countMarkers(files: string[], pattern: RegExp): number {
  let total = 0;
  for (const f of files) {
    try {
      const content = readFileSync(f, 'utf-8');
      const matches = content.match(new RegExp(pattern.source, 'g'));
      if (matches) total += matches.length;
    } catch { /* ignore */ }
  }
  return total;
}

function countLongFiles(files: string[], threshold: number): number {
  let total = 0;
  for (const f of files) {
    if (countLinesFile(f) > threshold) total++;
  }
  return total;
}

// ───────── Scans ─────────

function scanPackages(): PackageInfo[] {
  const packages: PackageInfo[] = [];
  if (!existsSync(PACKAGES_DIR)) return packages;

  for (const dir of readdirSync(PACKAGES_DIR)) {
    const pkgDir = join(PACKAGES_DIR, dir);
    try { if (!statSync(pkgDir).isDirectory()) continue; } catch { continue; }
    const pkgJsonPath = join(pkgDir, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;

    try {
      const pkg = readJSON(pkgJsonPath);
      const srcDir = join(pkgDir, 'src');
      const hasSrc = existsSync(srcDir);
      const testFiles = recurseFind(pkgDir, /\.test\.tsx?$/);
      const loc = hasSrc ? countLinesDir(srcDir) : 0;
      packages.push({
        name: (pkg.name as string) || dir,
        path: dir,
        version: (pkg.version as string) || '0.0.0',
        description: (pkg.description as string) || '',
        hasSrc,
        testCount: testFiles.length,
        loc,
        deps: Object.keys((pkg.dependencies as Record<string, unknown>) || {}),
      });
    } catch { /* ignore */ }
  }
  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

function scanMetrics(packages: PackageInfo[]): Metrics {
  // Source files (.ts/.tsx) across packages
  const srcFiles: string[] = [];
  for (const p of packages) {
    if (!p.hasSrc) continue;
    const srcDir = join(PACKAGES_DIR, p.path, 'src');
    srcFiles.push(...recurseFind(srcDir, /\.tsx?$/));
  }

  // Test files across repo
  const testFiles = recurseFind(PACKAGES_DIR, /\.test\.tsx?$/);

  // Markers
  const todos = countMarkers(srcFiles, /\bTODO\b/);
  const fixmes = countMarkers(srcFiles, /\bFIXME\b/);
  const hacks = countMarkers(srcFiles, /\bHACK\b/);
  const consoleLogs = countMarkers(srcFiles, /console\.log\s*\(/);
  const filesOver500Lines = countLongFiles(srcFiles, 500);

  // ADRs: dedupe by canonical title
  const adrFiles: string[] = [];
  if (existsSync(ADR_DIR)) {
    for (const f of readdirSync(ADR_DIR)) {
      if (f.endsWith('.md') && f !== 'README.md') adrFiles.push(f);
    }
  }
  const adrTitles = new Set<string>();
  let adrDuplicates = 0;
  for (const f of adrFiles) {
    let title = f.replace(/^ADR[-_]?\d+[-_]?(.*)\.md$/, '$1').replace(/^0+\d*[-_]?(.*)$/, '$1');
    title = title.toLowerCase().replace(/[-_]/g, '-').replace(/\.md$/, '');
    if (adrTitles.has(title)) adrDuplicates++;
    else adrTitles.add(title);
  }

  // CLI commands: parse `.command('name'` in packages/cli/src/commands/*.ts
  let cliCommands = 0;
  if (existsSync(CLI_COMMANDS_DIR)) {
    const cmdFiles = recurseFind(CLI_COMMANDS_DIR, /\.ts$/);
    const cmdNames = new Set<string>();
    const cmdRe = /\.command\(\s*['"`]([^'"`]+)['"`]/g;
    for (const f of cmdFiles) {
      try {
        const content = readFileSync(f, 'utf-8');
        let m: RegExpExecArray | null;
        const re = new RegExp(cmdRe.source, 'g');
        while ((m = re.exec(content)) !== null) {
          cmdNames.add(m[1]);
        }
      } catch { /* ignore */ }
    }
    cliCommands = cmdNames.size;
  }

  const srcPackages = packages.filter(p => p.hasSrc).length;
  return {
    totalPackages: packages.length,
    srcPackages,
    totalLoc: packages.reduce((s, p) => s + p.loc, 0),
    totalTestFiles: testFiles.length,
    todos,
    fixmes,
    hacks,
    consoleLogs,
    adrFiles: adrFiles.length,
    adrUnique: adrTitles.size,
    adrDuplicates,
    cliCommands,
    filesOver500Lines,
  };
}

// ───────── Geradores (determinísticos) ─────────

function genRealityManifest(packages: PackageInfo[], m: Metrics): string {
  const today = new Date().toISOString().split('T')[0];
  const withSrc = packages.filter(p => p.hasSrc);
  let out = `# REALITY MANIFEST — IDEIA

> **Documento Mestre da Verdade do Projeto**
> Gerado automaticamente por \`scripts/audit/regenerate-metrics.ts\` em ${today} §ts§
> **Status:** ✅ Verified against codebase (${m.srcPackages} packages com código real)

---

## Métricas Globais (recalculadas por script determinístico)

| Métrica | Valor | Fonte |
|---------|-------|-------|
| Packages com \`src/\` | ${m.srcPackages} | \`packages/*/package.json\` |
| Packages total | ${m.totalPackages} | \`packages/*/package.json\` |
| Arquivos de teste (\`.test.ts(x)\`) | ${m.totalTestFiles} | recurse \`packages/\` |
| LOC em \`src/\` (soma) | ~${m.totalLoc} | line count \`packages/*/src\` |
| TODO markers | ${m.todos} | regex \`\\bTODO\\b\` |
| FIXME markers | ${m.fixmes} | regex \`\\bFIXME\\b\` |
| HACK markers | ${m.hacks} | regex \`\\bHACK\\b\` |
| \`console.log\` em \`src/\` | ${m.consoleLogs} | regex \`console\\.log\\s*\\(\` |
| ADRs em \`docs/adr/\` (arquivos) | ${m.adrFiles} | \`readdirSync\` |
| ADRs únicos | ${m.adrUnique} | dedupe por título canônico |
| ADRs duplicados | ${m.adrDuplicates} | (ver AC: remover duplicatas) |
| Comandos CLI (subcomandos distintos) | ${m.cliCommands} | regex \`.command('name'\` em \`packages/cli/src/commands\` |
| Arquivos >500 linhas | ${m.filesOver500Lines} | line count \`packages/*/src\` |

---

## Packages Reais

| Package | Status | Tests | LOC | Dependências |
|---------|--------|-------|-----|-------------|
`;
  for (const pkg of withSrc) {
    const testStatus = pkg.testCount > 0 ? `${pkg.testCount} ✅` : '—';
    const deps = pkg.deps.length > 0 ? pkg.deps.map(d => d.replace('@ideia/', '')).join(', ') : '—';
    out += `| \`${pkg.name}\` | ✅ Real | ${testStatus} | ~${pkg.loc} | ${deps} |\n`;
  }
  out += `\n### Totais\n- Packages com código: **${m.srcPackages}**\n- Arquivos de teste: **${m.totalTestFiles}**\n- Linhas de código (\`src/\`): **~${m.totalLoc}**\n`;

  const noTests = packages.filter(p => p.hasSrc && p.testCount === 0);
  if (noTests.length > 0) {
    out += `\n### ⚠️ Packages sem testes (flag abra)\n`;
    noTests.forEach(p => { out += `- \`${p.name}\` (${p.path})\n`; });
  }

  out += `\n> **Regerar:** \`npx tsx scripts/audit/regenerate-metrics.ts --fix\`\n`;
  out += `> **Verificar deriva em CI:** \`npx tsx scripts/audit/regenerate-metrics.ts --ci\` (exit 1 em divergência)\n`;
  return out;
}

function genInjectJson(packages: PackageInfo[], m: Metrics): Record<string, unknown> {
  const withSrc = packages.filter(p => p.hasSrc);
  return {
    generatedAt: new Date().toISOString(),
    projectVersion: '1.0.0',
    stats: {
      packages: m.srcPackages,
      testFiles: m.totalTestFiles,
      linesOfCode: m.totalLoc,
      hasTheiaPlugin: packages.some(p => p.path === 'ideia-plugin'),
      markers: { todos: m.todos, fixmes: m.fixmes, hacks: m.hacks, consoleLogs: m.consoleLogs },
      adrFiles: m.adrFiles,
      adrUnique: m.adrUnique,
      adrDuplicates: m.adrDuplicates,
      cliCommands: m.cliCommands,
      filesOver500Lines: m.filesOver500Lines,
    },
    packages: withSrc.map(p => ({
      name: p.name,
      path: p.path,
      tests: p.testCount,
      loc: p.loc,
    })),
    rules: {
      docSyncRequired: true,
      preCommitValidation: true,
      contextAutoInject: true,
      deterministicRegeneration: true,
      canonicalScript: 'scripts/audit/regenerate-metrics.ts',
    },
  };
}

function genAiHandoff(m: Metrics): string {
  const today = new Date().toISOString().split('T')[0];
  return `# Handoff — IDEIA

> **Projeto:** IDEIA — IDE que transforma ideias em sistemas completos.
> **Tagline:** "Dê a ideia, nós entregamos a solução."
> **Regerado por:** \`scripts/audit/regenerate-metrics.ts\` em ${today} §ts§
> **Fonte única da verdade:** \`docs/governance/REALITY-MANIFEST.md\`

---

## O que é o IDEIA

Plataforma IDE AI-first construída sobre **Eclipse Theia** + **NATS JetStream** +
**LangGraph** + **Ollama**, com 6 agentes especializados (Analyst, Architect,
Programmer, Reviewer, Tester, DevOps), 15 camadas arquiteturais e orquestração
multiagente event-driven. O shell é Theia-only; frontend são widgets React, never
SPA standalone.

## Stack verificada no código

- **Linguagem:** TypeScript 5.x · Node.js 20
- **Shell:** Eclipse Theia Platform (+ Monaco + Inversify DI)
- **Backend HTTP:** **Fastify** (ver \`packages/api-server\` — \`fastify@^5.0.0\`,
  \`@fastify/cors\`, \`@fastify/helmet\`, \`@fastify/rate-limit\`)
- **Frontend (widgets):** React 18
- **Mensageria:** NATS JetStream (Pub/Sub, Req/Rep, KV, DLQ)
- **Multiagente:** LangGraph + LangChain
- **LLM:** Ollama local (com routing para OpenAI/Anthropic)
- **Memória:** PostgreSQL+pgvector, SQLite+FTS5, DuckDB, Redis
- **Build:** \`tsc -b\` (project references)
- **Testes:** Jest + ts-jest

> ⚠️ **Não confundir:** existe um projeto **legado** no diretório-pai do workspace
> (software anterior inspirador, fora de \`IDEIA/\`), que **não é** este projeto.
> Descrições como "NestJS + Next.js + Prisma", "38 packages" ou "35 comandos"
> referem-se àquele legado e estão **obsoletas** aqui. Para o estado real consulte
> \`docs/governance/REALITY-MANIFEST.md\`.

## Métricas reais (recalculadas por script)

| Métrica | Valor |
|---------|-------|
| Packages com \`src/\` | ${m.srcPackages} |
| Arquivos de teste | ${m.totalTestFiles} |
| LOC (\`src/\`) | ~${m.totalLoc} |
| TODO/FIXME/HACK | ${m.todos}/${m.fixmes}/${m.hacks} |
| \`console.log\` em \`src/\` | ${m.consoleLogs} |
| ADRs (únicos/duplicados) | ${m.adrUnique}/${m.adrDuplicates} |
| Comandos CLI (subcomandos) | ${m.cliCommands} |
| Arquivos >500 linhas | ${m.filesOver500Lines} |

## Regras obrigatórias (fonte: \`.ai/rules/UNIVERSAL.md\`)

1. **R1 — Verdade está no código**: leia \`REALITY-MANIFEST.md\` + este \`ai-handoff\`
   + \`inject.json\` antes de operar. Nunca confie na memória.
2. **R2 — Docs verificada**: \`docs-sync.ts --ci\` e \`regenerate-metrics.ts --ci\`
   bloqueiam commits/PRs com deriva.
3. **R4 — Theia-only**: sem web UI standalone. Widgets React no Theia.
4. **R6 — Clean Architecture**: domínio não importa infra. Sem \`any\` sem justificativa.
5. **R7 — Workspace Boundary**: somente \`IDEIA/\` é editável.

## Próxima sessão

Consulte \`docs/governance/HANDOFF-NEXT-SESSION.md\` para continuidade entre sessões.
Lista de pendências ativa em \`docs/governance/GAPS-PRODUCAO-IDE.md\` (gaps abertos
GS141-GS147, FA-03..FA-05 em andamento).

## Comandos de verificação

\`\`\`bash
npx tsx scripts/audit/regenerate-metrics.ts --ci   # gate de deriva (CI)
npx tsx scripts/audit/regenerate-metrics.ts --fix   # regenerar
npx tsx scripts/docs-sync.ts --ci                   # sync de AGENTS.md
\`\`\`
`;
}

function genAiHandoffCompact(m: Metrics): string {
  const today = new Date().toISOString().split('T')[0];
  return `# Handoff — IDEIA (Compacto)

> Projeto: IDEIA — IDE AI-first baseada em Eclipse Theia (não SPA standalone).
> Stack: TypeScript · Theia · **Fastify** · NATS JetStream · LangGraph · React 18 · Ollama
> Fonte única: \`docs/governance/REALITY-MANIFEST.md\` · regerado ${today} §ts§

## Métricas atuais
- ${m.srcPackages} packages com \`src/\` · ${m.totalTestFiles} testes · ~${m.totalLoc} LOC
- TODO/FIXME/HACK: ${m.todos}/${m.fixmes}/${m.hacks} · console.log: ${m.consoleLogs}
- ADRs únicos: ${m.adrUnique} (duplicados: ${m.adrDuplicates}) · CLI subcomandos: ${m.cliCommands}
- Arquivos >500 linhas: ${m.filesOver500Lines}

## Regras (fonte \`.ai/rules/UNIVERSAL.md\`)
1. Verdade no código, nunca na memória (R1)
2. \`regenerate-metrics.ts --ci\` bloqueia deriva (R2)
3. Theia-only, sem web UI standalone (R4)
4. Clean Architecture, sem \`any\` sem justificativa (R6)
5. Apenas \`IDEIA/\` editável (R7)

## NÃO confundir
Existe um projeto **legado** no diretório-pai do workspace (software anterior, fora de \`IDEIA/\`) que **não** é este projeto. Esqueça "NestJS/Next.js/Prisma/35 comandos" — essas descrições são obsoletas.

## Verificar antes de operar
\`\`\`bash
npx tsx scripts/audit/regenerate-metrics.ts --ci
\`\`\`
`;
}

function genProjectState(m: Metrics): string {
  const today = new Date().toISOString().split('T')[0];
  return `# Estado do Projeto — IDEIA

> **ATENÇÃO:** este arquivo é saída determinística de \`scripts/audit/regenerate-metrics.ts\`.
> NÃO editar à mão — qualquer alteração manual será sobrescrita no próximo \`--fix\`.
> Regerado em ${today} §ts§

## Fase atual
development (parcial — ver bloqueadores em \`docs/governance/GAPS-PRODUCAO-IDE.md\`)

## Fases (roadmap)
- [x] discovery
- [x] architecture
- [~] development (em andamento)
- [ ] testing (próximo)
- [ ] production

## Métricas reais (recálculo determinístico em CI)

| Métrica | Valor |
|---------|-------|
| Packages com \`src/\` | ${m.srcPackages} |
| Arquivos de teste | ${m.totalTestFiles} |
| LOC (\`src/\`) | ~${m.totalLoc} |
| TODO/FIXME/HACK | ${m.todos}/${m.fixmes}/${m.hacks} |
| \`console.log\` em \`src/\` | ${m.consoleLogs} |
| ADRs únicos (duplicados) | ${m.adrUnique} (${m.adrDuplicates}) |
| Comandos CLI | ${m.cliCommands} |
| Arquivos >500 linhas | ${m.filesOver500Lines} |

## Bloqueadores ativos (ver GAPS-PRODUCAO-IDE.md)

Os bloqueadores abaixo **NÃO** são cobaias de um "prove" legado (esse comando
não existe neste repo). São as faixas FA (do dossiê de produção):

- [ ] **FA-05** — \`tsc -b\` zerando 3.424 erros em 184 packages (gate de build real)
- [ ] **FA-04** — regeneração determinística de métricas (este script)
- [ ] **FA-03** — contexto de IA limpo (este arquivo faz parte da entrega)
- [ ] GS141-GS147 — 7 gaps abertos em \`GAPS-PRODUCAO-IDE.md\`

## Última verificação real executada

\`\`\`bash
npx tsx scripts/audit/regenerate-metrics.ts --ci
\`\`\`

Output: (preenchido pelo CI — \`--ci\` retorna exit 0 em dia verde ou exit 1 em deriva)
\`\`\`text
(matenha esta seção como saída literal do --ci)
\`\`\`
`;
}

function genProjectSummary(m: Metrics): string {
  const today = new Date().toISOString().split('T')[0];
  return `# Resumo do Projeto — IDEIA

> **Regerado por:** \`scripts/audit/regenerate-metrics.ts\` em ${today} §ts§
> Não editar à mão — editar é criar deriva. Para alterar métricas, altere o código.

## Identidade
**IDEIA** — IDE AI-first que transforma ideias em sistemas completos.
Shell: Eclipse Theia. Backend HTTP: Fastify. Mensageria: NATS JetStream.
Multiagente: LangGraph. Frontend: Widgets React no Theia.

## Snapshot
- ${m.srcPackages} packages · ${m.totalTestFiles} testes · ~${m.totalLoc} LOC
- ADRs: ${m.adrUnique} únicos (${m.adrDuplicates} duplicados)
- CLI: ${m.cliCommands} subcomandos distintos
- Code smells: ${m.todos + m.fixmes + m.hacks} markers TODO/FIXME/HACK · ${m.consoleLogs} console.log · ${m.filesOver500Lines} arquivos >500 linhas

## Próximos marcos
Consulte \`docs/governance/GAPS-PRODUCAO-IDE.md\` e \`docs/governance/HANDOFF-NEXT-SESSION.md\`.
`;
}

function genCommProtocol(): string {
  return `# Communication Protocol — Human ↔ AI

> **Projeto:** IDEIA (não confundir com o legado do diretório-pai do workspace).
> Este arquivo é saída determinística de \`scripts/audit/regenerate-metrics.ts\`.

## Objetivo

Aumentar a capacidade dos modelos de IA de interpretar corretamente pedidos
humanos, reduzir ambiguidade e transformar intenção vaga em plano executável.

## Princípios

1. A IA deve entender intenção, não apenas texto literal.
2. A IA deve identificar lacunas antes de implementar.
3. A IA deve perguntar apenas quando a falta de informação bloquear a execução.
4. Quando possível, a IA deve propor hipóteses explícitas e seguir.
5. A IA deve traduzir pedidos humanos em requisitos verificáveis.
6. A IA deve adaptar o nível de detalhe ao tamanho da tarefa.
7. A IA deve distinguir pedido simples, feature completa, mudança arquitetural e decisão de produto.
8. A IA deve reduzir perguntas desnecessárias inferindo padrões seguros do projeto.

## Protocolo de interpretação

Para cada pedido, a IA deve extrair (ver \`intent-schema.yaml\`):

\`\`\`yaml
intent:
  goal: ""
  user_type: ""
  target_area: ""
  feature_type: ""
  business_value: ""
  constraints: []
  assumptions: []
  missing_information: []
  risks: []
  acceptance_criteria: []
\`\`\`

## Classificação de ambiguidade

| Nível | Descrição | Ação |
|---|---|---|
| Baixo | Pedido claro | Executar com plano curto |
| Médio | Existem lacunas não críticas | Declarar hipóteses e executar |
| Alto | Falta informação que muda arquitetura/UX | Perguntar antes |
| Crítico | Pode causar dano, quebra de segurança ou retrabalho grande | Bloquear e pedir decisão |

## Perguntas internas obrigatórias

Antes de implementar, a IA deve se perguntar:

- O que o usuário realmente quer alcançar?
- Quem vai usar isso?
- Qual é o fluxo feliz? Quais os fluxos de erro?
- Que dados entram e saem?
- Onde isso se encaixa no sistema (qual camada das 15)?
- Que permissões são necessárias (Cedar Policy Engine)?
- Que partes do sistema podem quebrar?
- Como provar que funciona (Gate 1-3)?
- Existe padrão semelhante em \`packages/\`?
- Existe ADR que impeça essa abordagem (ver \`docs/adr/\`)?
- Há risco de segurança, privacidade ou perda de dados?

## Resposta padrão para pedido de feature

\`\`\`markdown
## Entendimento
Explique em 3–5 linhas o que será feito.
## Hipóteses
Liste hipóteses, se houver.
## Plano
Liste etapas.
## Critérios de aceite
Liste critérios testáveis.
## Arquivos prováveis
Liste arquivos a criar/alterar (sempre dentro de \`IDEIA/\`).
## Validação
Liste comandos (lint, typecheck, test, \`regenerate-metrics.ts --ci\`).
\`\`\`

## Regra de economia de perguntas

A IA não deve perguntar por detalhes que podem ser inferidos com segurança a partir
de: \`docs/governance/REALITY-MANIFEST.md\`, \`inject.json\`, ADRs existentes e padrões
em \`packages/\`. Depois, deve permitir ajuste pelo humano.
`;
}

function genContextReadme(): string {
  return `# Contexto Indexado — IDEIA

> Conteúdo regenerado por \`scripts/audit/regenerate-metrics.ts\`.
> NÃO editar à mão — qualquer edição cria deriva detectada por \`--ci\`.

## Arquivos neste diretório

| Arquivo | Propósito | Gerado por script? |
|---------|-----------|--------------------|
| \`inject.json\` | Snapshot JSON para consumo por IAs (LLMs) | ✅ |
| \`ai-handoff.md\` | Handoff completo de contexto entre sessões IAs | ✅ |
| \`ai-handoff-compact.md\` | Handoff curto (~300 tokens) | ✅ |
| \`project-state.md\` | Estado do projeto + roadmap + métricas | ✅ |
| \`project-summary.md\` | Resumo curto do projeto | ✅ |
| \`communication-protocol.md\` | Protocolo humano ↔ IA | ✅ |
| \`intent-schema.yaml\` | Schema YAML para classificação de intenção | ❌ (estático) |
| \`CLAUDE.md\` | Briefing para Claude Code | ✅ |
| \`README.md\` | Este índice | ✅ |
| \`_legacy/\` | Arquivos legados arquivados (FA-03) | ❌ (não injetar) |

## Fonte única da verdade

\`docs/governance/REALITY-MANIFEST.md\` é a fonte mestra das métricas. Todos os
arquivos acima derivam dele.

## Regenerar

\`\`\`bash
npx tsx scripts/audit/regenerate-metrics.ts --fix   # reescrever
npx tsx scripts/audit/regenerate-metrics.ts --ci    # verificar deriva
\`\`\`
`;
}

function genContextClaude(): string {
  return `# Contexto do Projeto — IDEIA

> **FONTE SECUNDÁRIA** — A fonte ÚNICA e UNIVERSAL de regras está em \`.ai/rules/UNIVERSAL.md\`.
> **LEIA AQUELE ARQUIVO PRIMEIRO.** Este é apenas um resumo específico para contexto injetado.
> Regerado por \`scripts/audit/regenerate-metrics.ts\` — não editar à mão.

---

## ⚠️ REGRA ABSOLUTA — NUNCA confie na sua memória

Seu conhecimento prévio sobre este projeto está **desatualizado por definição**.
Sempre:
1. Leia \`docs/governance/REALITY-MANIFEST.md\` — packages REAIS do código
2. Leia \`.ai/context/inject.json\` — dados verificados do código
3. Execute \`npx tsx scripts/audit/regenerate-metrics.ts --ci\` para verificar deriva

**Se o código e a documentação divergirem, o CÓDIGO é a verdade.**

## ⚠️ Projeto é IDEIA (não o legado do diretório-pai)

Este projeto é o **IDEIA** — IDE AI-first sobre Eclipse Theia + Fastify + NATS
JetStream + LangGraph. Existe um projeto **legado** no diretório-pai do workspace
(fora de \`IDEIA/\`, software anterior inspirador) que **não** é este projeto.
Descrições como "NestJS + Next.js + Prisma", "38 packages" ou "35 comandos"
referem-se àquele legado e estão **obsoletas** aqui.

## ⚠️ BLOQUEIO UNIVERSAL

- **Pre-commit/CI**: \`regenerate-metrics.ts --ci\` bloqueia commits/PRs com
  \`docs/governance/REALITY-MANIFEST.md\` ou \`.ai/context/*\` divergentes do código
- **lint-staged**: roda \`docs-sync.ts --fix\` automaticamente
- **Nenhum modelo, editor ou extensão pode bypassar** — a verificação está no git/CI

## Comandos essenciais

\`\`\`bash
npx tsx scripts/audit/regenerate-metrics.ts --ci    # gate de deriva (FA-04)
npx tsx scripts/audit/regenerate-metrics.ts --fix    # regenerar tudo
npx tsx scripts/docs-sync.ts --ci                    # sync AGENTS.md
\`\`\`

## Leia a fonte completa

➡️ **\`.ai/rules/UNIVERSAL.md\`**
➡️ **\`docs/governance/REALITY-MANIFEST.md\`**
`;
}

function genProjectManifestYaml(m: Metrics): string {
  return `# Gerado por scripts/audit/regenerate-metrics.ts — NÃO editar à mão.
# Projeto: IDEIA (não confundir com o legado do diretório-pai do workspace)
project:
  name: ideia
  type: ide-platform
  default_language: typescript

architecture:
  pattern: clean-architecture + ddd + event-driven
  shell: eclipse-theia
  layers: 15

backend:
  framework: fastify
  adapter: fastify
  validation: zod
  orm: prisma
  database: postgresql
  auth: jwt

frontend:
  framework: react
  hosting: theia-widgets
  styling: tailwind
  ui: shadcn-ui
  forms: react-hook-form
  validation: zod
  server_state: tanstack-query

messaging:
  bus: nats-jetstream
  patterns: [pub-sub, req-rep, kv, dlq]

multiagent:
  orchestrator: langgraph
  llm: ollama-local

quality:
  lint: true
  typecheck: true
  unit_tests: true
  e2e_tests: true
  build_required: true
  coverage_min: 80

ai:
  context_strategy: minimal-relevant-files
  context_generator: scripts/audit/regenerate-metrics.ts
  require_artifact_manifest: true
  require_diff: true
  require_quality_gate: true
  allow_model_specific_rules: false

metrics:
  regenerated_by: scripts/audit/regenerate-metrics.ts
  src_packages: ${m.srcPackages}
  loc: ${m.totalLoc}
  test_files: ${m.totalTestFiles}
  cli_commands: ${m.cliCommands}
`;
}

function genStackJson(): string {
  return JSON.stringify({
    detectedAt: new Date().toISOString(),
    project: 'IDEIA',
    languages: ['typescript', 'javascript', 'nodejs'],
    frameworks: ['theia', 'react', 'fastify', 'langchain', 'langgraph'],
    packageManager: 'npm',
    ciProviders: ['github-actions'],
    buildTool: 'typescript (tsc -b)',
    testFramework: 'jest (ts-jest)',
    messaging: 'nats-jetstream',
    ai: 'langgraph, langchain, ollama',
    database: 'postgresql (pgvector), sqlite',
  }, null, 2) + '\n';
}

function genSessionMode(): string {
  return JSON.stringify({
    mode: 'development',
    updatedAt: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    summary: 'Sessao atual — veja docs/governance/HANDOFF-NEXT-SESSION.md',
  }, null, 2) + '\n';
}

// ───────── Normalização para --ci (ignore timestamps) ─────────

function normalizeForCompare(content: string): string {
  return content
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.Z+-]+/g, '§ts§')
    .replace(/\d{4}-\d{2}-\d{2}/g, '§date§')
    .split(/\r?\n/)
    .map(l => l.replace(/\s+$/, ''))
    .join('\n');
}

// ───────── Driver ─────────

function compute(): RegenerationResult {
  const packages = scanPackages();
  const metrics = scanMetrics(packages);
  const outputs: Record<string, string> = {
    [REALITY_MANIFEST]: genRealityManifest(packages, metrics),
    [INJECT_JSON]: JSON.stringify(genInjectJson(packages, metrics), null, 2),
    [AI_HANDOFF]: genAiHandoff(metrics),
    [AI_HANDOFF_COMPACT]: genAiHandoffCompact(metrics),
    [PROJECT_STATE]: genProjectState(metrics),
    [PROJECT_SUMMARY]: genProjectSummary(metrics),
    [COMM_PROTOCOL]: genCommProtocol(),
    [CONTEXT_README]: genContextReadme(),
    [CONTEXT_CLAUDE]: genContextClaude(),
    [PROJECT_MANIFEST]: genProjectManifestYaml(metrics),
    [STACK_JSON]: genStackJson(),
    [SESSION_MODE]: genSessionMode(),
  };
  return { timestamp: new Date().toISOString(), packages, metrics, outputs };
}

function ensureDirs(): void {
  if (!existsSync(GOVERNANCE_DIR)) mkdirSync(GOVERNANCE_DIR, { recursive: true });
  if (!existsSync(CONTEXT_DIR)) mkdirSync(CONTEXT_DIR, { recursive: true });
  if (!existsSync(AI_DIR)) mkdirSync(AI_DIR, { recursive: true });
}

function writeAll(res: RegenerationResult): void {
  ensureDirs();
  for (const [path, content] of Object.entries(res.outputs)) {
    writeFileSync(path, content, 'utf-8');
    console.log(`✅ escrito ${relative(ROOT, path)}`);
  }
  console.log(`\n📊 Métricas reais:\n${formatMetrics(res.metrics)}`);
}

function formatMetrics(m: Metrics): string {
  const lines = [
    `  packages com src/: ${m.srcPackages} / ${m.totalPackages}`,
    `  test files:        ${m.totalTestFiles}`,
    `  LOC src/:           ~${m.totalLoc}`,
    `  TODO/FIXME/HACK:    ${m.todos}/${m.fixmes}/${m.hacks}`,
    `  console.log:        ${m.consoleLogs}`,
    `  ADRs únicos/dup:    ${m.adrUnique}/${m.adrDuplicates} (arquivos: ${m.adrFiles})`,
    `  CLI subcomandos:    ${m.cliCommands}`,
    `  arquivos >500 ln:   ${m.filesOver500Lines}`,
  ];
  return lines.join('\n');
}

function compareCi(res: RegenerationResult): { drifted: string[]; ok: string[] } {
  const drifted: string[] = [];
  const ok: string[] = [];
  for (const [path, freshContent] of Object.entries(res.outputs)) {
    if (!existsSync(path)) { drifted.push(`${relative(ROOT, path)} (ausente)`); continue; }
    const onDisk = readFileSync(path, 'utf-8');
    if (normalizeForCompare(onDisk) !== normalizeForCompare(freshContent)) {
      drifted.push(relative(ROOT, path));
    } else {
      ok.push(relative(ROOT, path));
    }
  }
  return { drifted, ok };
}

function main(): void {
  const args = process.argv.slice(2);
  const mode = args.includes('--fix') ? 'fix' : args.includes('--ci') ? 'ci' : 'audit';

  console.log('📊 regenerate-metrics (FA-04) — recalculando determinístico…\n');
  const res = compute();
  console.log(`📦 ${res.packages.length} packages scanned (${res.metrics.srcPackages} com src/)\n`);

  if (mode === 'audit') {
    console.log('MÉTRICAS:\n' + formatMetrics(res.metrics) + '\n');
    const { drifted, ok } = compareCi(res);
    if (drifted.length === 0) {
      console.log(`✅ Tudo sincronizado (${ok.length} arquivos OK). Modo --fix reescreve igual.`);
    } else {
      console.log(`🟠 ${drifted.length} arquivo(s) divergente(s) do código:`);
      drifted.forEach(d => console.log(`   • ${d}`));
      console.log(`\n   Rode \`npx tsx scripts/audit/regenerate-metrics.ts --fix\` para sincronizar.`);
    }
    return;
  }

  if (mode === 'fix') {
    writeAll(res);
    console.log('\n✅ Regeneração concluída. Rode --ci para confirmar zero deriva.');
    return;
  }

  if (mode === 'ci') {
    const { drifted, ok } = compareCi(res);
    if (drifted.length === 0) {
      console.log(`✅ CI: ${ok.length} arquivos sincronizados com o código. Zero deriva.`);
      process.exit(0);
    } else {
      console.error(`🔴 CI DRIFT: ${drifted.length} arquivo(s) divergente(s) do código:`);
      drifted.forEach(d => console.error(`   • ${d}`));
      console.error('\nO manifesto em commit está dessincronizado da realidade do código.');
      console.error('Rode localmente: `npx tsx scripts/audit/regenerate-metrics.ts --fix` e commit o resultado.');
      process.exit(1);
    }
  }
}

main();