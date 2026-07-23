/**
 * Post-Migration Verification Script
 * Verifica integridade da estrutura IDEIA/ após migração
 * Usage: node scripts/verify-migration.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;
let warnings = 0;

function check(condition, label) {
  if (condition) { passed++; console.log(`  ✅ ${label}`); }
  else { failed++; console.log(`  ❌ ${label}`); }
}

function warn(condition, label) {
  if (!condition) { warnings++; console.log(`  ⚠️  ${label}`); }
  else { console.log(`  ✅ ${label}`); }
}

console.log('=== IDEIA Post-Migration Verification ===\n');

// === STRUCTURE ===
console.log('[Structure]');
check(fs.existsSync(path.join(ROOT, 'package.json')), 'Root package.json');
check(fs.existsSync(path.join(ROOT, 'tsconfig.base.json')), 'tsconfig.base.json');
check(fs.existsSync(path.join(ROOT, 'tsconfig.json')), 'tsconfig.json (solution)');
check(fs.existsSync(path.join(ROOT, '.gitignore')), '.gitignore');
check(fs.existsSync(path.join(ROOT, '.editorconfig')), '.editorconfig');

// === PACKAGES ===
console.log('\n[Packages]');
const packagesDir = path.join(ROOT, 'packages');
const pluginDir = path.join(packagesDir, 'ideia-plugin');
check(fs.existsSync(pluginDir), 'ideia-plugin exists');

const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
check(rootPkg.workspaces.includes('packages/*'), 'workspaces configured');
check(rootPkg.workspaces.includes('apps/*'), 'apps workspace configured');

// Count packages
const pkgNames = fs.readdirSync(packagesDir, { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);
check(pkgNames.length >= 64, `${pkgNames.length} packages (expect 64+)`);

// Check no web-ui
check(!pkgNames.includes('web-ui'), 'web-ui NOT present');
check(!pkgNames.includes('e2e-tests'), 'e2e-tests NOT present');

// Check no @ai-devkit references in source files
console.log('\n[No @ai-devkit remnants]');
  const isWin = process.platform === 'win32';
  const grepCmd = isWin
    ? `findstr /S /M "@ai-devkit/" "${ROOT}\\packages\\ideia-plugin\\src\\*.ts" "${ROOT}\\packages\\ideia-plugin\\src\\*.tsx" 2>nul || echo none`
    : `grep -r -l "@ai-devkit/" "${ROOT}/packages/ideia-plugin/src/" 2>/dev/null || echo "none"`;
  const grepResult = require('child_process').execSync(grepCmd, { encoding: 'utf-8', cwd: ROOT });
  check(grepResult.includes('none') || grepResult.trim() === '', 'No @ai-devkit in plugin src');

// === PLUGIN ===
console.log('\n[Plugin]');
const pluginPkg = JSON.parse(fs.readFileSync(path.join(pluginDir, 'package.json'), 'utf-8'));
check(pluginPkg.name === '@ideia/plugin', 'Plugin name: @ideia/plugin');
check(pluginPkg.theiaExtensions.length >= 1 && pluginPkg.theiaExtensions[0].frontend && pluginPkg.theiaExtensions[0].backend, 'theiaExtensions configured (frontend + backend)');
check(fs.existsSync(path.join(pluginDir, 'lib', 'browser', 'ideia-frontend-module.js')), 'Frontend module compiled');
check(fs.existsSync(path.join(pluginDir, 'lib', 'node', 'ideia-backend-module.js')), 'Backend module compiled');
check(fs.existsSync(path.join(pluginDir, 'lib', 'browser', 'ideia-chat-widget.js')), 'Chat widget compiled');
check(fs.existsSync(path.join(pluginDir, 'lib', 'browser', 'ideia-dashboard-widget.js')), 'Dashboard widget compiled');
check(fs.existsSync(path.join(pluginDir, 'lib', 'browser', 'ideia-approval-widget.js')), 'Approval widget compiled');
check(fs.existsSync(path.join(pluginDir, 'lib', 'browser', 'ideia-studies-widget.js')), 'Studies widget compiled');
check(fs.existsSync(path.join(pluginDir, 'lib', 'browser', 'ideia-suggestions-widget.js')), 'Suggestions widget compiled');

// Plugin dependencies use workspace protocol
const pluginDeps = pluginPkg.dependencies || {};
const badDeps = Object.keys(pluginDeps).filter(d => typeof pluginDeps[d] === 'string' && pluginDeps[d].startsWith('file:'));
check(badDeps.length === 0, `No file: dependencies (found ${badDeps.length})`);

// === THEIA APP ===
console.log('\n[Theia App]');
const appDir = path.join(ROOT, 'apps', 'ideia-app');
check(fs.existsSync(path.join(appDir, 'package.json')), 'app package.json');
check(fs.existsSync(path.join(appDir, 'lib', 'frontend', 'bundle.js')), 'Frontend bundle.js');
check(fs.existsSync(path.join(appDir, 'lib', 'frontend', 'bundle.css')), 'Frontend bundle.css');
check(fs.existsSync(path.join(appDir, 'lib', 'frontend', 'index.html')), 'Frontend index.html');
check(fs.existsSync(path.join(appDir, 'lib', 'backend', 'main.js')), 'Backend main.js');

// Check plugin is in the bundle
const backendBundle = fs.readFileSync(path.join(appDir, 'lib', 'backend', 'main.js'), 'utf-8');
// Check plugin is bundled (esbuild inlines the code, check for service names)
check(backendBundle.includes('IDEIA_ChatBackendService'), 'ChatService in bundle');
check(backendBundle.includes('IDEIA_TaskRunner'), 'TaskRunner in bundle');
check(backendBundle.includes('IDEIA_AgentBackendService'), 'AgentService in bundle');
check(backendBundle.includes('IDEIA_MemoryBackendService'), 'MemoryService in bundle');
check(backendBundle.includes('IDEIA_DashboardBackendService'), 'DashboardService in bundle');

// Check frontend bundle
const frontendBundle = fs.readFileSync(path.join(appDir, 'lib', 'frontend', 'bundle.js'), 'utf-8');
check(frontendBundle.includes('IDEIA_ChatWidget'), 'ChatWidget in frontend bundle');

// === ELECTRON ===
console.log('\n[Electron]');
const electronDir = path.join(ROOT, 'electron');
check(fs.existsSync(path.join(electronDir, 'package.json')), 'electron package.json');
check(fs.existsSync(path.join(electronDir, 'dist', 'main.js')), 'Electron main.js compiled');
check(fs.existsSync(path.join(electronDir, 'dist', 'preload.js')), 'Electron preload.js compiled');
check(fs.existsSync(path.join(electronDir, 'dist', 'installer.js')), 'Electron installer.js compiled');
check(fs.existsSync(path.join(electronDir, 'assets', 'icon.png')), 'App icon');

// === MOCKUP ===
console.log('\n[Mockup]');
check(fs.existsSync(path.join(ROOT, 'mockup', 'ideia-theia-mockup-v2.html')), 'Mockup v2 exists');

// === DOCS ===
console.log('\n[Documentation]');
check(fs.existsSync(path.join(ROOT, 'README.md')), 'README.md');
check(fs.existsSync(path.join(ROOT, 'AGENTS.md')), 'AGENTS.md');
check(fs.existsSync(path.join(ROOT, 'docs', 'governance', 'REALITY-MANIFEST.md')), 'REALITY-MANIFEST.md');
check(fs.existsSync(path.join(ROOT, 'docs', 'governance', 'document-registry.md')), 'document-registry.md');
check(fs.existsSync(path.join(ROOT, 'PLANO-REESTRUTURACAO-COMPLETO.md')), 'Plano de reestruturação');
check(fs.existsSync(path.join(ROOT, 'docs', 'estudos-analise', 'ESTUDO-ANALISE-CONSOLIDADA-MESTRE.md')), 'Análise consolidada');
check(fs.existsSync(path.join(ROOT, 'docs', 'estudos-analise', 'PLANO-EXECUCAO-INTEGRAL.md')), 'Plano de execução');

// === NO OLD ARTIFACTS ===
console.log('\n[Clean workspace root]');
const rootFiles = fs.readdirSync(path.resolve(ROOT, '..'));
const oldArtifacts = rootFiles.filter(f =>
  /^start-|^iniciar-|^IDEIA\.(bat|exe)/.test(f) ||
  f === 'GUIA-EXECUCAO-IDEIA.md'
);
check(oldArtifacts.length === 0, `No old launcher scripts (found ${oldArtifacts.length})`);

// === SUMMARY ===
console.log(`\n${'='.repeat(50)}`);
console.log(`  PASSED:   ${passed}`);
console.log(`  FAILED:   ${failed}`);
console.log(`  WARNINGS: ${warnings}`);
console.log(`  ${failed === 0 ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}`);
console.log(`${'='.repeat(50)}`);

process.exit(failed > 0 ? 1 : 0);
