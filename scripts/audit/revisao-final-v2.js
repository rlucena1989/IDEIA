const fs = require('fs');
const path = require('path');

let ok = 0, warn = 0, err = 0;
function check(cond, msg) { if (cond) { ok++; } else { err++; console.log('  [ERRO] ' + msg); } }
function warnMsg(msg) { warn++; console.log('  [AVISO] ' + msg); }

console.log('=== REVISAO FINAL PRE-IMPLEMENTACAO ===\n');

const ROOT = 'F:/PROJETOS/ai-devkit-workspace';
const V2 = ROOT + '/ai-devkit-v2';

// 1. CRITICAL FILES
console.log('1. ARQUIVOS CRITICOS:');
const files = [
  'AGENTS.md', 'HANDOFF-NEXT-SESSION.md', 'TASKS-IMPLEMENTACAO-DIRETA.md',
  'TASKS-ESTUDOS-INTENSIFICACAO.md', 'PLANO-IMPLEMENTACAO-CONSOLIDADO.md',
  'docs/governance/GAPS-PRODUCAO-IDE.md', 'docs/governance/REALITY-MANIFEST.md',
  'docs/governance/document-registry.md', 'docs/governance/TESTES-DOS-ESTUDOS.md',
  'docs/ESTUDOS/IDEIA-MASTER.md',
  'docs/adr/ADR-016-seguranca-camadas.md',
];
files.forEach(f => {
  const exists = fs.existsSync(ROOT + '/' + f) || fs.existsSync(V2 + '/' + f);
  check(exists, f + ' existe');
});

// 2. ADRs
const adrDir = ROOT + '/docs/adr';
const adrs = fs.readdirSync(adrDir).filter(f => f.endsWith('.md'));
console.log('\n2. ADRs (' + adrs.length + '):');
adrs.forEach(f => {
  const c = fs.readFileSync(path.join(adrDir, f), 'utf-8');
  check(c.includes('## Decision'), f + ' tem Decision');
  check(c.includes('## Consequences'), f + ' tem Consequences');
  check(c.includes('## Context'), f + ' tem Context');
});

// 3. Registry
const registry = fs.readFileSync(ROOT + '/docs/governance/document-registry.md', 'utf-8');
const regEntries = registry.split('\n').filter(l => l.match(/^\| \d+ \|/)).length;
console.log('\n3. REGISTRY: ' + regEntries + ' entradas');
check(regEntries >= 50, 'Registry com ' + regEntries + ' entradas');

// 4. GAPS
const gaps = fs.readFileSync(ROOT + '/docs/governance/GAPS-PRODUCAO-IDE.md', 'utf-8');
const gMatch = gaps.match(/Resolvidos[^*]*\*{2}\s*:\s*(\d+)/);
const gCount = gMatch ? parseInt(gMatch[1]) : 0;
console.log('\n4. GAPS: ' + gCount + ' resolvidos');
check(gCount >= 70, 'GAPS com ' + gCount + ' (esperado 70)');

// 5. ESTUDOS
const estudosDir = ROOT + '/docs/ESTUDOS';
const estudos = fs.readdirSync(estudosDir).filter(f => f.endsWith('.md'));
const plan = fs.readFileSync(ROOT + '/PLANO-IMPLEMENTACAO-CONSOLIDADO.md', 'utf-8');
console.log('\n5. ESTUDOS: ' + estudos.length);
check(plan.includes('44/44'), 'Plano cobre 44/44');
check(plan.includes('TASK-IDEIA-513'), 'Plano com tasks 513+');
check(plan.includes('Fase 15'), 'Plano com 15 fases');

// 6. Scan studies
try {
  const engine = require(V2 + '/packages/reality-sync/dist/initiative-engine').ProactiveInitiativeEngine;
  const inst = new engine(V2);
  const results = inst.scanStudies();
  const avg = results.reduce((a, r) => a + r.score, 0) / results.length;
  const below5 = results.filter(r => r.score < 5);
  console.log('\n6. STUDY SCANNER: media ' + avg.toFixed(2));
  check(avg >= 4.5, 'Score medio >= 4.5');
  if (below5.length > 0) warnMsg(below5.length + ' estudos com score < 5: ' + below5.map(r => r.name.substring(0, 30)).join(', '));
} catch (e) {
  warnMsg('StudyScanner: ' + e.message);
}

// 7. AGENTS.md
const agents = fs.readFileSync(ROOT + '/AGENTS.md', 'utf-8');
console.log('\n7. AGENTS.MD:');
check(agents.includes('70/70'), '70/70 gaps');
check(agents.includes('44 documentos') || agents.includes('44 estudos'), '44 documentos');
check(agents.includes('S1-S25'), 'Range S1-S25');

// 8. PACKAGES
const pkgsDir = V2 + '/packages';
const pkgs = fs.readdirSync(pkgsDir).filter(d => {
  try { return fs.statSync(path.join(pkgsDir, d)).isDirectory() && !d.startsWith('adapter'); }
  catch { return false; }
});
const adapters = fs.readdirSync(pkgsDir).filter(d => {
  try { return fs.statSync(path.join(pkgsDir, d)).isDirectory() && d.startsWith('adapter'); }
  catch { return false; }
});
console.log('\n8. PACKAGES: ' + pkgs.length + ' core + ' + adapters.length + ' adapters');
check(pkgs.length >= 40, pkgs.length + ' packages core');
check(adapters.length === 13, adapters.length + ' adapters');

// 9. REALITY-MANIFEST
const manifest = fs.readFileSync(ROOT + '/docs/governance/REALITY-MANIFEST.md', 'utf-8');
console.log('\n9. REALITY-MANIFEST:');
check(manifest.includes('Electron') && manifest.includes('G9'), 'Electron referenciado');
check(manifest.includes('Debug Adapter') || manifest.includes('DAP'), 'DAP referenciado');
check(manifest.includes('adapter-go') && manifest.includes('Full'), 'adapters com status Full');

// SUMMARY
console.log('\n=== RESUMO ===');
console.log('  OK: ' + ok);
console.log('  AVISOS: ' + warn);
console.log('  ERROS: ' + err);
if (err === 0) {
  console.log('\n✅ PRONTO PARA INICIAR IMPLEMENTACAO');
} else {
  console.log('\n❌ CORRIGIR ' + err + ' ERRO(S) ANTES DE IMPLEMENTAR');
}
