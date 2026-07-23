#!/usr/bin/env node
/**
 * gap-check.js — Gap Check Permanente
 *
 * Verifica automaticamente se os gaps catalogados em GAPS-PRODUCAO-IDE.md
 * foram resolvidos. Cada gap tem uma função de verificação.
 *
 * Usage:
 *   node .ai/bin/gap-check.js              # full check
 *   node .ai/bin/gap-check.js --ci         # exit 1 se falhar
 *   node .ai/bin/gap-check.js --verbose    # detalhado
 *
 * Integração:
 *   npm run ai:gap:check
 *   npm run ai:quality:gate  (pré-commit hook)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const GAPS_DOC = path.resolve(ROOT, '..', 'docs/governance/GAPS-PRODUCAO-IDE.md');

const results = { pass: 0, fail: 0, warn: 0 };

function run(cmd) {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' }).trim(); } catch { return ''; }
}

function ok(label, details = '') {
  results.pass++;
  if (!process.argv.includes('--quiet')) console.log(`   ✅ ${label}${details ? ': ' + details : ''}`);
}

function fail(label, details) {
  results.fail++;
  console.log(`   ❌ ${label}: ${details}`);
}

function warn(label, details) {
  results.warn++;
  console.log(`   ⚠️  ${label}: ${details}`);
}

// ============ CHECKS ============

function checkG1_VersionInPackages() {
  const pkgsDir = path.join(ROOT, 'packages');
  if (!fs.existsSync(pkgsDir)) return;
  const missing = fs.readdirSync(pkgsDir)
    .filter(d => fs.statSync(path.join(pkgsDir, d)).isDirectory())
    .filter(d => {
      try {
        const j = JSON.parse(fs.readFileSync(path.join(pkgsDir, d, 'package.json'), 'utf-8'));
        return !j.version;
      } catch { return false; }
    });
  if (missing.length === 0) ok('G1', 'Todos os packages têm version');
  else fail('G1 — Sem versão', `${missing.length} packages sem version: ${missing.join(', ')}`);
}

function checkG2_License() {
  const has = fs.existsSync(path.join(ROOT, 'LICENSE')) || fs.existsSync(path.join(ROOT, 'LICENSE.md'));
  if (has) ok('G2', 'LICENSE existe');
  else fail('G2 — Sem LICENSE', 'Arquivo LICENSE não encontrado. Adicionar (MIT recomendado).');
}

function checkG3_DotEnvNotTracked() {
  if (!fs.existsSync(path.join(ROOT, '.git'))) return;
  const tracked = run('git ls-files .env');
  if (tracked) fail('G3 — .env versionado', '`.env` está no git. Execute `git rm --cached .env` e crie `.env.example`.');
  else ok('G3', '.env não está trackeado no git');
}

function checkG4_SecurityAndConduct() {
  const hasSecurity = fs.existsSync(path.join(ROOT, 'SECURITY.md'));
  const hasConduct = fs.existsSync(path.join(ROOT, 'CODE_OF_CONDUCT.md'));
  if (hasSecurity && hasConduct) ok('G4', 'SECURITY.md + CODE_OF_CONDUCT.md presentes');
  else {
    const missing = [];
    if (!hasSecurity) missing.push('SECURITY.md');
    if (!hasConduct) missing.push('CODE_OF_CONDUCT.md');
    fail('G4 — Faltam arquivos', missing.join(', '));
  }
}

function checkG13_PreCommitHooks() {
  const hasHusky = fs.existsSync(path.join(ROOT, '.husky'));
  const hasLintStaged = run('node -e "try{require.resolve(\'lint-staged\');console.log(1)}catch{}"');
  if (hasHusky && hasLintStaged) ok('G13', 'Husky + lint-staged configurados');
  else if (hasHusky) warn('G13 — Husky sem lint-staged', 'Husky existe mas lint-staged não está instalado');
  else warn('G13 — Sem pre-commit hooks', 'Husky não configurado. Execute `npx husky init`');
}

function checkG15_FormatterAndEditorConfig() {
  const hasPrettier = fs.existsSync(path.join(ROOT, '.prettierrc')) || fs.existsSync(path.join(ROOT, '.prettierrc.json')) || fs.existsSync(path.join(ROOT, '.prettierrc.js'));
  const hasEditorConfig = fs.existsSync(path.join(ROOT, '.editorconfig'));
  if (hasPrettier) ok('G15a', '.prettierrc presente');
  else warn('G15a — Sem Prettier', '.prettierrc não encontrado');
  if (hasEditorConfig) ok('G15b', '.editorconfig presente');
  else warn('G15b — Sem EditorConfig', '.editorconfig não encontrado');
}

function checkG16_NodeVersionPinned() {
  const hasNvmrc = fs.existsSync(path.join(ROOT, '.nvmrc'));
  const hasNodeVersion = fs.existsSync(path.join(ROOT, '.node-version'));
  if (hasNvmrc || hasNodeVersion) ok('G16', '.nvmrc ou .node-version presente');
  else warn('G16 — Sem pinning Node', 'Sem .nvmrc ou .node-version. Adicionar para consistência.');
}

function checkG17_ContributingFilled() {
  const cp = path.join(ROOT, 'CONTRIBUTING.md');
  if (!fs.existsSync(cp)) { warn('G17', 'CONTRIBUTING.md não existe'); return; }
  const c = fs.readFileSync(cp, 'utf-8');
  if (c.includes('{{Name}}') || c.includes('{{')) fail('G17 — CONTRIBUTING.md placeholder', 'Contém `{{Name}}` ou template placeholder não preenchido');
  else ok('G17', 'CONTRIBUTING.md preenchido');
}

function checkG18_Codeowners() {
  const has = fs.existsSync(path.join(ROOT, '.github/CODEOWNERS')) || fs.existsSync(path.join(ROOT, 'CODEOWNERS'));
  if (has) ok('G18', 'CODEOWNERS presente');
  else warn('G18 — Sem CODEOWNERS', '.github/CODEOWNERS não encontrado');
}

function checkG19_Funding() {
  const has = fs.existsSync(path.join(ROOT, '.github/FUNDING.yml'));
  if (has) ok('G19', 'FUNDING.yml presente');
  else warn('G19 — Sem FUNDING.yml', 'GitHub Sponsors não configurado');
}

function checkG20_Support() {
  const has = fs.existsSync(path.join(ROOT, 'SUPPORT.md'));
  if (has) ok('G20', 'SUPPORT.md presente');
  else warn('G20 — Sem SUPPORT.md', 'SUPPORT.md não encontrado');
}

function checkG21_GitAttributes() {
  const has = fs.existsSync(path.join(ROOT, '.gitattributes'));
  if (has) ok('G21', '.gitattributes presente');
  else warn('G21 — Sem .gitattributes', 'Necessário para normalização de line-ending cross-platform');
}

function checkG5_LSP() {
  const hasLspDep = fs.existsSync(path.join(ROOT, 'node_modules/typescript-language-server'));
  const hasLspClient = fs.existsSync(path.join(ROOT, 'packages/cli/src/ide/lsp-bridge.ts'));
  const hasMonacoProviders = fs.existsSync(path.join(ROOT, 'packages/ideia-plugin/src/browser/lsp-client.ts'));
  if (hasLspDep && hasLspClient && hasMonacoProviders) ok('G5', 'LSP integrado (typescript-language-server + WebSocket relay + Monaco providers)');
  else warn('G5 — LSP incompleto', 'Componentes faltando');
}

function checkG6_PTY() {
  const hasNodePty = fs.existsSync(path.join(ROOT, 'node_modules/node-pty'));
  const hasXterm = fs.existsSync(path.join(ROOT, 'node_modules/@xterm/xterm'));
  const hasPtyEndpoint = fs.existsSync(path.join(ROOT, 'packages/cli/src/ide/terminal-bridge.ts'));
  const hasXtermComponent = fs.existsSync(path.join(ROOT, 'packages/ideia-plugin/src/browser/components/Terminal.tsx'));
  if (hasNodePty && hasXterm && hasPtyEndpoint && hasXtermComponent) ok('G6', 'PTY terminal integrado (node-pty + WebSocket + xterm.js)');
  else warn('G6 — PTY incompleto', 'Componentes faltando');
}

function checkG7_Chokidar() {
  const hasChokidar = fs.existsSync(path.join(ROOT, 'node_modules/chokidar'));
  if (hasChokidar) ok('G7', 'Chokidar disponível');
  else warn('G7 — Sem watcher nativo', 'chokidar não instalado. File watching usa polling (2s).');
}

function checkG10_Coverage() {
  const jc = path.join(ROOT, 'jest.config.js');
  if (!fs.existsSync(jc)) { warn('G10', 'jest.config.js não encontrado'); return; }
  const c = fs.readFileSync(jc, 'utf-8');
  const threshold = c.match(/lines:\s*(\d+)/);
  if (threshold && parseInt(threshold[1]) >= 80) ok('G10a', `Coverage threshold: ${threshold[1]}%`);
  else if (threshold) warn('G10a — Threshold baixo', `jest.config.js: lines ${threshold[1]}% (alvo: 20%)`);
}

function checkG12_Semver() {
  const hasChangesets = fs.existsSync(path.join(ROOT, '.changeset/config.json'));
  const hasChangesetCli = fs.existsSync(path.join(ROOT, 'node_modules/@changesets/cli'));
  if (hasChangesets && hasChangesetCli) ok('G12', 'Changesets configurado para versionamento semântico');
  else warn('G12 — Sem semver automation', 'Changesets não configurado');
}

// ============ EXPORTABLE WRAPPERS ============

function checkGaps() {
  checkG1_VersionInPackages();
  checkG2_License();
  checkG3_DotEnvNotTracked();
  checkG4_SecurityAndConduct();
  checkG5_LSP();
  checkG6_PTY();
  checkG7_Chokidar();
  checkG10_Coverage();
  checkG12_Semver();
  checkG13_PreCommitHooks();
  checkG15_FormatterAndEditorConfig();
  checkG16_NodeVersionPinned();
  checkG17_ContributingFilled();
  checkG18_Codeowners();
  checkG19_Funding();
  checkG20_Support();
  checkG21_GitAttributes();
  return { pass: results.pass, fail: results.fail, warn: results.warn };
}

function checkGapCI() {
  const r = checkGaps();
  if (r.fail > 0) {
    console.error('❌ Gaps críticos detectados.');
    return false;
  }
  return true;
}

// ============ MAIN ============

function main() {
  const args = process.argv.slice(2);
  const ci = args.includes('--ci');

  console.log('\n🔎 gap-check.js — Verificação Permanente de Gaps\n');

  if (!fs.existsSync(GAPS_DOC)) {
    console.log('❌ docs/governance/GAPS-PRODUCAO-IDE.md não encontrado. Execute o estudo primeiro.');
    process.exit(1);
  }

  console.log(`📋 Referência: ${path.relative(ROOT, GAPS_DOC)}\n`);

  // 🔴 Críticos
  console.log('── 🔴 Críticos ──');
  checkG1_VersionInPackages();
  checkG2_License();
  checkG3_DotEnvNotTracked();
  checkG4_SecurityAndConduct();

  // 🟠 IDE
  console.log('\n── 🟠 IDE ──');
  checkG5_LSP();
  checkG6_PTY();
  checkG7_Chokidar();

  // 🟠 Engenharia
  console.log('\n── 🟠 Engenharia ──');
  checkG10_Coverage();
  checkG12_Semver();
  checkG13_PreCommitHooks();

  // 🟡 Qualidade
  console.log('\n── 🟡 Qualidade ──');
  checkG15_FormatterAndEditorConfig();
  checkG16_NodeVersionPinned();
  checkG17_ContributingFilled();
  checkG18_Codeowners();
  checkG19_Funding();
  checkG20_Support();
  checkG21_GitAttributes();

  // 🟢 Resolvidos nesta sessão
  console.log('\n── 🟢 Sessão Final ──');
  checkG8_DAP();
  checkG25_Provenance();
  checkG27_VsCodeCommands();
  checkG47_SseBackpressure();
  checkG55_AsNeverCasts();
  checkG58_WidgetPerformance();
  checkG59_Adapters();
  checkRealitySync();

  // Resultado
  console.log(`\n── Resultado ──`);
  console.log(`   ✅ ${results.pass} pass | ❌ ${results.fail} fail | ⚠️  ${results.warn} warn\n`);

  if (results.fail > 0) {
    console.log('❌ Gaps críticos detectados. Consulte docs/governance/GAPS-PRODUCAO-IDE.md para plano de ação.\n');
    if (ci) process.exit(1);
  } else if (results.warn > 0) {
    console.log('⚠️  Aprovado com avisos. Gaps não-críticos pendentes.\n');
  } else {
    console.log('✅ Todos os gaps verificados estão resolvidos.\n');
  }
}

main();

module.exports = { checkGaps, checkGapCI };

function checkG8_DAP() {
  const hasBridge = fs.existsSync(path.join(ROOT, 'packages/cli/src/ide/dap-bridge.ts'));
  const hasClient = fs.existsSync(path.join(ROOT, 'packages/ideia-plugin/src/browser/dap-client.ts'));
  const hasPanel = fs.existsSync(path.join(ROOT, 'packages/ideia-plugin/src/browser/components/DebugPanel.tsx'));
  if (hasBridge && hasClient && hasPanel) ok('G8', 'DAP: bridge + client + DebugPanel');
  else fail('G8 � DAP incompleto', 'bridge='+hasBridge+' client='+hasClient+' panel='+hasPanel);
}

function checkG25_Provenance() {
  const s = path.join(ROOT, 'scripts/canary-publish.ts');
  if (fs.existsSync(s) && fs.readFileSync(s, 'utf-8').includes('--provenance')) ok('G25', 'npm --provenance');
  else fail('G25 � Sem provenance', 'canary-publish.ts sem --provenance');
}

function checkG27_VsCodeCommands() {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'vscode-extension/package.json'), 'utf-8'));
    const n = p.contributes?.commands?.length || 0;
    if (n >= 50) ok('G27', 'VS Code: '+n+' comandos');
    else fail('G27 � VS Code', 'Apenas '+n+' comandos');
  } catch { fail('G27 � VS Code', 'package.json nao encontrado'); }
}

function checkG47_SseBackpressure() {
  const s = path.join(ROOT, '..', 'ideia-theia', 'src', 'node', 'ideia-chat-service.ts');
  const c = path.join(ROOT, '..', 'ideia-theia', 'src', 'browser', 'ideia-service-client.ts');
  const hb = fs.existsSync(s) && fs.readFileSync(s, 'utf-8').includes('heartbeat');
  const ab = fs.existsSync(c) && fs.readFileSync(c, 'utf-8').includes('AbortController');
  if (hb && ab) ok('G47', 'SSE: heartbeat + AbortController');
  else fail('G47 � SSE sem protecao', 'heartbeat='+hb+' abort='+ab);
}

function checkG55_AsNeverCasts() {
  let total = 0;
  function walk(d) { try { fs.readdirSync(d).forEach(function(e) { var p = path.join(d, e); if (fs.statSync(p).isDirectory() && e!=='node_modules' && e!=='dist' && e!=='legacy' && e!=='__tests__') walk(p); else if (p.endsWith('.ts') && !p.includes('__tests__') && !p.includes('.test.')) { var c = fs.readFileSync(p, 'utf-8'); var m = c.match(/as never/g); if (m) total += m.length; } }); } catch {} }
  walk(ROOT);
  if (total <= 1) ok('G55', 'Apenas '+total+' as never (mcp test esperado)');
  else fail('G55 � as never casts', total+' encontrados');
}

function checkG58_WidgetPerformance() {
  var w = path.join(ROOT, '..', 'ideia-theia', 'src', 'browser', 'ideia-chat-widget.tsx');
  var memo = fs.existsSync(w) && fs.readFileSync(w, 'utf-8').includes('React.memo(function ChatRow');
  var split = fs.existsSync(w) && fs.readFileSync(w, 'utf-8').includes('MessagesState');
  if (memo && split) ok('G58', 'Widget: React.memo + state split');
  else fail('G58 � Widget perf', 'memo='+memo+' split='+split);
}

function checkG59_Adapters() {
  var adps = ['adapter-dart','adapter-elixir','adapter-fastapi','adapter-go','adapter-haskell','adapter-java','adapter-kotlin','adapter-nestjs','adapter-php','adapter-ruby','adapter-scala','adapter-swift','adapter-zig'];
  var s = path.join(ROOT, 'packages', 'contracts', 'src', 'schemas.ts');
  var hasSchema = fs.existsSync(s) && fs.readFileSync(s, 'utf-8').includes('AdapterConfigSchema');
  var ex = adps.filter(function(a) { return fs.existsSync(path.join(ROOT, 'packages', a, 'index.js')); });
  if (ex.length === 13 && hasSchema) ok('G59', '13/13 adapters + Zod schema');
  else fail('G59 � Adapters', ex.length+'/13 schema='+hasSchema);
}

function checkRealitySync() {
  var p = fs.existsSync(path.join(ROOT, 'packages', 'reality-sync', 'package.json'));
  var c = fs.existsSync(path.join(ROOT, 'packages', 'cli', 'src', 'commands', 'reality-sync.ts'));
  if (p && c) ok('R1', 'RealitySync Engine instalado');
  else warn('R1', 'RealitySync nao encontrado');
}

