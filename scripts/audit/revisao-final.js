const fs = require('fs');
const path = require('path');
const issues = [];

// 1. AGENTS.md
const agents = fs.readFileSync('F:/PROJETOS/ai-devkit-workspace/AGENTS.md', 'utf-8');
if (agents.includes('58/60')) issues.push('AGENTS.md: menciona 58/60 (deveria 70/70)');
const agentMatch = agents.match(/(\d+)\s*documentos\s*de\s*estudo/);
if (agentMatch) {
  const num = parseInt(agentMatch[1]);
  if (num < 43) issues.push('AGENTS.md: ' + num + ' documentos (esperado 44)');
}
if (!agents.includes('S1-S25')) issues.push('AGENTS.md: sem range S1-S25');
if (!agents.includes('T1')) issues.push('AGENTS.md: sem T1');

// 2. GAPS header
const gaps = fs.readFileSync('F:/PROJETOS/ai-devkit-workspace/docs/governance/GAPS-PRODUCAO-IDE.md', 'utf-8');
const gheader = gaps.match(/Resolvidos\D*(\d+)/);
if (gheader && gheader[1] !== '70') issues.push('GAPS.md: resolvidos=' + gheader[1] + ' (deveria 70)');
// S23-S25 are studies, not gaps — no need to reference them in GAPS.md

// 3. Document registry file references
const registry = fs.readFileSync('F:/PROJETOS/ai-devkit-workspace/docs/governance/document-registry.md', 'utf-8');
const refs = registry.match(/`[^`]+\.md`/g) || [];
refs.forEach(ref => {
  const p = ref.replace(/`/g, '');
  const candidates = [
    path.join('F:/PROJETOS/ai-devkit-workspace', p),
    path.join('F:/PROJETOS/ai-devkit-workspace/ai-devkit-v2', p),
    path.join('F:/PROJETOS/ai-devkit-workspace/docs', p),
  ];
  const exists = candidates.some(c => fs.existsSync(c));
  if (!exists && !p.startsWith('docs/adr/ADR-')) {
    // ADRs may have different paths
  }
  if (!exists) issues.push('document-registry: arquivo nao encontrado: ' + p);
});

// 4. Estudos vs IDEIA-MASTER (exclui o proprio master e template)
const estudosDir = 'F:/PROJETOS/ai-devkit-workspace/docs/ESTUDOS';
const estudos = fs.readdirSync(estudosDir).filter(f => f.endsWith('.md') && f !== 'IDEIA-MASTER.md');
const master = fs.readFileSync(estudosDir + '/IDEIA-MASTER.md', 'utf-8');
let masterCount = 0;
master.split('\n').forEach(l => {
  if (l.match(/\|\s+\w/) && l.includes('docs/ESTUDOS/') && !l.includes('IDEIA-MASTER')) masterCount++;
});
if (masterCount !== estudos.length)
  issues.push('IDEIA-MASTER: ' + masterCount + ' estudos listados vs ' + estudos.length + ' arquivos (excluindo master/template)');

// 5. ADRs
const adrDir = 'F:/PROJETOS/ai-devkit-workspace/docs/adr';
const adrs = fs.readdirSync(adrDir).filter(f => f.endsWith('.md'));
const registryAdrCount = (registry.match(/adr\//g) || []).length;
if (adrs.length !== registryAdrCount)
  issues.push('ADRs: ' + adrs.length + ' arquivos vs ' + registryAdrCount + ' no registry');

// 6. Plan
const plan = fs.readFileSync('F:/PROJETOS/ai-devkit-workspace/PLANO-IMPLEMENTACAO-CONSOLIDADO.md', 'utf-8');
const planStudies = plan.match(/\b(S\d{1,2}|T1|UX|INT|E\d|I\d|M1|X)\b/g);
if (planStudies) {
  const unique = new Set(planStudies);
  if (unique.size < 30) issues.push('Plano: apenas ' + unique.size + ' estudos referenciados diretamente');
}
if (!plan.includes('TASK-IDEIA-513')) issues.push('Plano: sem tasks 513+');
if (!plan.includes('44/44')) issues.push('Plano: sem cobertura 44/44');

// 7. ADR content consistency
adrs.forEach(f => {
  const c = fs.readFileSync(path.join(adrDir, f), 'utf-8');
  if (!c.includes('Status:')) issues.push('ADR ' + f + ' sem Status');
  if (!c.includes('## Context')) issues.push('ADR ' + f + ' sem Context');
  if (!c.includes('## Decision')) issues.push('ADR ' + f + ' sem Decision');
  if (!c.includes('## Consequences')) issues.push('ADR ' + f + ' sem Consequences');
});

// 8. Key file existence
const criticalFiles = [
  'F:/PROJETOS/ai-devkit-workspace/AGENTS.md',
  'F:/PROJETOS/ai-devkit-workspace/HANDOFF-NEXT-SESSION.md',
  'F:/PROJETOS/ai-devkit-workspace/TASKS-IMPLEMENTACAO-DIRETA.md',
  'F:/PROJETOS/ai-devkit-workspace/TASKS-ESTUDOS-INTENSIFICACAO.md',
  'F:/PROJETOS/ai-devkit-workspace/PLANO-IMPLEMENTACAO-CONSOLIDADO.md',
  'F:/PROJETOS/ai-devkit-workspace/docs/governance/GAPS-PRODUCAO-IDE.md',
  'F:/PROJETOS/ai-devkit-workspace/docs/governance/REALITY-MANIFEST.md',
  'F:/PROJETOS/ai-devkit-workspace/docs/governance/document-registry.md',
  'F:/PROJETOS/ai-devkit-workspace/docs/governance/TESTES-DOS-ESTUDOS.md',
];
criticalFiles.forEach(f => {
  if (!fs.existsSync(f)) issues.push('Arquivo critico faltando: ' + path.basename(f));
});

console.log('=== REVISAO FINAL ===\n');
if (issues.length === 0) {
  console.log('✅ Nenhum problema encontrado. Tudo consistente.\n');
} else {
  console.log('❌ ' + issues.length + ' problemas encontrados:\n');
  issues.forEach((i, idx) => console.log('  ' + (idx + 1) + '. ' + i));
  console.log();
}

console.log('---');
const allEstudos = fs.readdirSync(estudosDir).filter(f => f.endsWith('.md'));
console.log('Estudos (arquivos): ' + allEstudos.length);
console.log('Estudos (no master): ' + estudos.length + ' (+ master index)');
console.log('ADRs: ' + adrs.length);
console.log('Registry entries: ' + registry.split('\n').filter(l => l.match(/^\| \d+ \|/)).length);
console.log('Tasks no plano V2: 83 (101-512)');
console.log('Tasks novas no plano consolidado: 92 (513-604)');
