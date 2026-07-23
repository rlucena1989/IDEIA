#!/usr/bin/env node
/**
 * enforce-document-flow.js — v2.0
 *
 * Validação automatizada do fluxo documental do ai-devkit v2.
 * Verifica: registro, classificação (type+status+tags), duplicatas,
 * consistência, e reality-check (código existe ou não).
 *
 * Usage:
 *   node .ai/bin/enforce-document-flow.js              # full audit
 *   node .ai/bin/enforce-document-flow.js --verbose     # detailed
 *   node .ai/bin/enforce-document-flow.js --fix         # auto-clean
 *
 * Exit: 0 = aprovado, 1 = violações bloqueantes
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const REGISTRY_PATH = path.join(ROOT, 'docs/governance/document-registry.md');
const CONFLICT_PATH = path.join(ROOT, 'docs/governance/conflict-resolution.md');

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', '.venv', 'coverage', '__pycache__',
  '.test-gen', 'templates',
]);
const IGNORE_PREFIXES = ['.amazonq', '.windsurf', '.ai-devkit'];



// Valores válidos para type e status
const VALID_TYPES = new Set([
  'task', 'plan', 'study', 'policy', 'reference', 'template', 'guide',
  'procedure', 'metric', 'roadmap', 'audit', 'report', 'protocol', 'cache',
  'script',
]);
const VALID_STATUSES = new Set([
  'implemented', 'planned', 'study-only', 'auto-generated', 'cache', 'deprecated', 'partial',
]);

// ---- HELPERS ----

function shouldIgnore(relPath) {
  const parts = relPath.split(/[/\\]/);
  for (const p of parts) if (IGNORE_DIRS.has(p)) return true;
  for (const prefix of IGNORE_PREFIXES) if (relPath.startsWith(prefix)) return true;
  return false;
}

function getAllMdFiles() {
  const results = [];
  function walk(dir, relative) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (IGNORE_DIRS.has(e.name)) continue;
      const fp = path.join(dir, e.name);
      const rp = relative ? `${relative}/${e.name}` : e.name;
      if (IGNORE_PREFIXES.some(p => rp.startsWith(p))) continue;
      if (e.isDirectory()) walk(fp, rp);
      else if (e.name.endsWith('.md')) results.push({ path: rp, fullPath: fp, basename: e.name });
    }
  }
  walk(ROOT, '');
  return results;
}

function parseRegistryTable(content) {
  const entries = [];
  const lines = content.split('\n');
  let inTable = false;
  for (const line of lines) {
    if (line.includes('| Path | Type | Status | Tags |')) inTable = true;
    if (!inTable) continue;
    if (line.trim().startsWith('|---')) continue;
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
    if (m) entries.push({ path: m[1], type: m[2].trim(), status: m[3].trim(), tags: m[4].trim() });
  }
  return entries;
}

// ---- CHECKS ----

const violations = [];
const warnings = [];

function checkRegistryExists() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    violations.push({ severity: 'CRITICAL', check: 'registry_exists',
      message: `document-registry.md não encontrado` });
    return false;
  }
  return true;
}

function checkClassification(entries) {
  for (const e of entries) {
    if (!VALID_TYPES.has(e.type)) {
      violations.push({ severity: 'MEDIUM', check: 'invalid_type',
        message: `"${e.path}" tem type inválido: "${e.type}". Válidos: ${[...VALID_TYPES].join(', ')}` });
    }
    if (!VALID_STATUSES.has(e.status)) {
      violations.push({ severity: 'MEDIUM', check: 'invalid_status',
        message: `"${e.path}" tem status inválido: "${e.status}". Válidos: ${[...VALID_STATUSES].join(', ')}` });
    }
    if (!e.tags || e.tags.length < 3) {
      warnings.push({ severity: 'WARN', check: 'missing_tags',
        message: `"${e.path}" tem tags curtas ou ausentes: "${e.tags}"` });
    }
  }
}

function checkReality(entries) {
  for (const e of entries) {
    if (e.status === 'cache' || e.status === 'auto-generated') continue;

    const fullPath = path.join(ROOT, e.path.replace(/\\/g, '/'));
    const fileExists = fs.existsSync(fullPath);

    if (e.status === 'implemented' && !fileExists) {
      violations.push({ severity: 'HIGH', check: 'reality_check',
        message: `"${e.path}" = implemented mas arquivo não existe.` });
    }
    // "planned" ou "study-only": o arquivo .md existe (é o documento de planejamento),
    // mas descreve trabalho futuro. Isso é esperado e correto.
    if (e.status === 'study-only' && !fileExists) {
      violations.push({ severity: 'HIGH', check: 'reality_check',
        message: `"${e.path}" = study-only mas arquivo não existe.` });
    }
  }
}

function findConflicts(allDocs, registryEntries) {
  const pathMap = {};
  for (const e of registryEntries) {
    if (pathMap[e.path]) {
      violations.push({ severity: 'HIGH', check: 'registry_duplicate',
        message: `Path "${e.path}" registrado mais de uma vez no registry.` });
    }
    pathMap[e.path] = true;
  }

  // Check for cross-directory duplicates in same functional area
  const knownSameDirDups = [
    ['plans/devkit-adjustments-f04.md', 'plans/future/devkit-adjustments-f04.md'],
  ];
  for (const [a, b] of knownSameDirDups) {
    const pa = path.join(ROOT, a);
    if (fs.existsSync(pa)) {
      violations.push({ severity: 'MEDIUM', check: 'known_duplicate',
        message: `Duplicata confirmada não removida: ${a} (cópia de ${b}). Execute Remove-Item para limpar.` });
    }
  }
}

function checkMasterPlan() {
  const mp = path.join(ROOT, '.ai/tasks/master-plan.md');
  if (!fs.existsSync(mp)) return;
  const c = fs.readFileSync(mp, 'utf-8');
  const hasAllDone = /✅\s*TODAS\s*AS\s*FRENTES\s*CONCLUÍDAS/.test(c);
  const redCount = (c.match(/🔴/g) || []).length;
  if (hasAllDone && redCount > 5) {
    violations.push({ severity: 'HIGH', check: 'master_plan_contradiction',
      message: `master-plan.md diz "✅ TODAS CONCLUÍDAS" mas tem ${redCount} 🔴 pendentes.` });
  } else if (redCount > 3) {
    warnings.push({ severity: 'WARN', check: 'master_plan_pending',
      message: `master-plan.md: ${redCount} itens 🔴 pendentes.` });
  }
}

function checkBacklog() {
  const bp = path.join(ROOT, '.ai/tasks/backlog.md');
  if (!fs.existsSync(bp)) return;
  const c = fs.readFileSync(bp, 'utf-8');
  for (const rm of c.match(/TASK-ROADMAP-\d+/g) || []) {
    const taskId = rm.match(/\d+/);
    const tp = path.join(ROOT, `.ai/tasks/${rm.toLowerCase()}.md`);
    if (!fs.existsSync(tp)) continue;
    const tc = fs.readFileSync(tp, 'utf-8');
    const hasCode = /\[x\]/i.test(tc);
    const line = c.split('\n').find(l => l.includes(rm));
    const markedDone = line && /\[x\]/i.test(line);
    if (markedDone && !hasCode) {
      violations.push({ severity: 'MEDIUM', check: 'backlog_inaccurate',
        message: `backlog.md marca ${rm} como [x] mas task real não tem subtarefas.` });
    }
  }
}

function checkDuplicates() {
  const known = [
    ['plans/AUDITORIA-COMPLETA.md', 'AUDITORIA-COMPLETA.md (root)'],
    ['plans/devkit-adjustments-f04.md', 'plans/future/devkit-adjustments-f04.md'],
  ];
  for (const [a, b] of known) {
    const pa = path.join(ROOT, a);
    if (fs.existsSync(pa)) {
      warnings.push({ severity: 'WARN', check: 'stale_duplicate',
        message: `Arquivo ainda existe: ${a}. Deveria ter sido removido (duplicata de ${b}).` });
    }
  }
}

function checkReports() {
  const dir = path.join(ROOT, '.ai/reports');
  if (!fs.existsSync(dir)) return;
  const r = fs.readdirSync(dir).filter(f => /^review-\d+\.md$/.test(f));
  if (r.length > 10) {
    warnings.push({ severity: 'WARN', check: 'too_many_reports',
      message: `${r.length} review reports. Máx: 10.` });
  }
}

function checkGapDoc() {
  const gap = path.join(ROOT, 'docs/governance/GAPS-PRODUCAO-IDE.md');
  if (!fs.existsSync(gap)) {
    violations.push({ severity: 'HIGH', check: 'gap_doc_missing',
      message: `docs/governance/GAPS-PRODUCAO-IDE.md não existe. Regra de projeto exige gap analysis permanente.` });
    return;
  }
  const c = fs.readFileSync(gap, 'utf-8');
  if (!c.includes('🔴') || !c.includes('Crítico')) {
    violations.push({ severity: 'MEDIUM', check: 'gap_doc_incomplete',
      message: `GAPS-PRODUCAO-IDE.md incompleto — deve conter seções 🔴 Crítico e 🟠 Alto.` });
  }
  if (!c.includes('🟠') || !c.includes('Alto')) {
    violations.push({ severity: 'MEDIUM', check: 'gap_doc_incomplete',
      message: `GAPS-PRODUCAO-IDE.md incompleto — deve conter seções 🔴 Crítico e 🟠 Alto.` });
  }
}

function checkProjectControl() {
  const ctrl = path.join(ROOT, '.ai/project-control/control.md');
  if (!fs.existsSync(ctrl)) {
    violations.push({ severity: 'MEDIUM', check: 'project_control_missing',
      message: `.ai/project-control/control.md não existe. Execute node .ai/bin/control-snapshot.js para gerar.` });
    return;
  }
  const content = fs.readFileSync(ctrl, 'utf-8');
  const markers = ['AUTO-SNAPSHOT', 'AUTO-SCANNED-CLI', 'AUTO-SCANNED-ADAPTERS', 'AUTO-SCANNED-PACKAGES'];
  for (const m of markers) {
    if (!content.includes(`<!-- ${m} -->`)) {
      violations.push({ severity: 'MEDIUM', check: 'project_control_marker',
        message: `control.md não contém marcador <!-- ${m} -->. Execute control-snapshot.js.` });
    }
  }
}

function checkRootGovernanceFiles() {
  const patterns = [
    /^AUDITORIA/i,
    /^ANALISE/i,
    /^CONFRONTACAO/i,
    /^SECURITY-GOVERNANCE/i,
    /^SISTEMA-AUTONOMIA/i,
    /^IDE-(?!.*\/)/,
  ];
  const rootFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.md'));
  for (const f of rootFiles) {
    for (const pat of patterns) {
      if (pat.test(f)) {
        violations.push({ severity: 'HIGH', check: 'root_governance_file',
          message: `"${f}" na raiz do projeto. Documentos de governança devem estar em docs/governance/.` });
        break;
      }
    }
  }
}

function checkGitignore() {
  const gi = path.join(ROOT, '.gitignore');
  if (!fs.existsSync(gi)) return;
  const c = fs.readFileSync(gi, 'utf-8');
  const required = ['.ai/context/cache/', '.ai/optimizer/runtime/', '.ai/reports/review-*.md'];
  for (const r of required) {
    if (!c.includes(r)) {
      warnings.push({ severity: 'WARN', check: 'gitignore_missing',
        message: `.gitignore não inclui "${r}". Auto-generated caches devem ser ignorados.` });
    }
  }
}

// ---- MAIN ----

function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const fix = args.includes('--fix');

  console.log('\n🔍 enforce-document-flow.js v2.0 — Auditoria Documental\n');

  const allDocs = getAllMdFiles();
  console.log(`📂 ${allDocs.length} arquivos .md elegíveis`);

  if (!checkRegistryExists()) { printResults(); process.exit(1); }

  const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  const entries = parseRegistryTable(content);
  console.log(`📋 ${entries.length} documentos registrados\n`);

  checkClassification(entries);
  checkReality(entries);
  findConflicts(allDocs, entries);
  checkMasterPlan();
  checkBacklog();
  checkGapDoc();
  checkProjectControl();
  checkReports();
  checkGitignore();
  checkRootGovernanceFiles();

  printResults();
}

function printResults() {
  if (warnings.length === 0 && violations.length === 0) {
    console.log('✅ AUDITORIA APROVADA — Nenhuma violação.');
    process.exit(0);
  }

  if (violations.length > 0) {
    console.log(`\n❌ ${violations.length} VIOLAÇÃO(ÕES):\n`);
    for (const v of violations) {
      const icon = v.severity === 'CRITICAL' ? '🔴' : v.severity === 'HIGH' ? '🟠' : '🟡';
      console.log(`   ${icon} [${v.severity}] ${v.check}\n      ${v.message}\n`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} AVISO(S):\n`);
    for (const w of warnings) {
      console.log(`   ⚠️  [${w.severity}] ${w.check}\n      ${w.message}\n`);
    }
  }

  if (violations.length > 0) {
    console.log('\n❌ REPROVADO — Corrija as violações.');
    process.exit(1);
  } else {
    console.log('\n⚠️  APROVADO COM AVISOS.');
    process.exit(0);
  }
}

main();

module.exports = { checkRegistryExists, checkClassification, checkReality, findConflicts, checkMasterPlan, checkBacklog };
