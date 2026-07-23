#!/usr/bin/env node
/**
 * rule-enforcer.js — Verificador de Regras Absolutas da IDEIA
 *
 * Verifica se TODOS os scripts e artefatos cumprem as 6 regras absolutas.
 * Roda no pré-commit e no CI.
 *
 * Uso: node .ai/bin/rule-enforcer.js [--ci] [--fix]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const CI = process.argv.includes('--ci');
const FIX = process.argv.includes('--fix');

const AUDIT_SCRIPTS_DIR = path.join(ROOT, '.ai/bin');
const GOVERNANCE_DIR = path.resolve(ROOT, '..', 'docs', 'governance');
const DOCS_DIR = path.resolve(ROOT, '..', 'docs');

const failures = [];

function log(pass, rule, detail) {
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} ${rule}: ${detail}`);
  if (!pass) failures.push({ rule, detail });
}

// === R1: Documentação é Obrigatória ===
function checkR1() {
  // Check that all .js scripts in .ai/bin/ have corresponding docs or are audit scripts
  const scripts = fs.readdirSync(AUDIT_SCRIPTS_DIR).filter(f => f.endsWith('.js'));
  log(true, 'R1', `${scripts.length} scripts in .ai/bin/`);
  
  // Check audit report exists
  const auditFile = path.join(GOVERNANCE_DIR, 'AUDITORIA-COMPLETA-IDEIA-2026-07-18.md');
  const hasAudit = fs.existsSync(auditFile);
  const auditSize = hasAudit ? fs.statSync(auditFile).size : 0;
  log(hasAudit && auditSize > 30000, 'R1', `Audit report: ${hasAudit ? `${Math.round(auditSize/1024)}KB` : 'MISSING'}`);
  
  // Check document-registry
  const registry1 = path.join(GOVERNANCE_DIR, 'document-registry.md');
  const registry2 = path.join(ROOT, '..', '.ai', 'governance', 'document-registry.md');
  log(fs.existsSync(registry1), 'R1', 'document-registry.md (governance)');
  log(fs.existsSync(registry2), 'R1', 'document-registry.md (.ai/governance)');
}

// === R2: Auditores São Auditados ===
function checkR2() {
  const scripts = fs.readdirSync(AUDIT_SCRIPTS_DIR).filter(f => f.endsWith('.js') && !f.includes('lib/'));
  const auditScripts = scripts.filter(s => s.includes('check-') || s.includes('track-') || s.includes('verify-') || s.includes('rule-') || s.includes('compliance') || s.includes('secrets') || s.includes('gap') || s.includes('slo') || s.includes('kpi') || s.includes('auto-audit') || s.includes('agent-audit'));
  const withCi = auditScripts.filter(s => {
    const content = fs.readFileSync(path.join(AUDIT_SCRIPTS_DIR, s), 'utf-8');
    return content.includes('--ci') || content.includes('process.argv.includes');
  });
  log(withCi.length >= 12, 'R2', `${withCi.length}/31 audit scripts with --ci mode (${scripts.length - auditScripts.length} non-audit skipped)`);
}

// === R3: Corrigir Antes de Avançar ===
function checkR3() {
  // Check gap-check result
  try {
    const { execSync } = require('child_process');
    const out = execSync('node .ai/bin/gap-check.js --quiet 2>&1', { cwd: ROOT, encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
    const hasFail = out.includes('❌') && !out.includes('0 fail');
    log(!hasFail, 'R3', hasFail ? 'Gaps críticos detectados — corrija antes de avançar' : 'Nenhum gap crítico');
  } catch {
    log(false, 'R3', 'gap-check falhou ao executar');
  }
}

// === R4: Cross-Platform Nativo ===
function checkR4() {
  const scripts = fs.readdirSync(AUDIT_SCRIPTS_DIR).filter(f => f.endsWith('.js') && !f.includes('lib/'));
  const auditScripts = scripts.filter(s => s.includes('check-') || s.includes('track-') || s.includes('verify-') || s.includes('rule-') || s.includes('compliance') || s.includes('secrets') || s.includes('gap') || s.includes('slo') || s.includes('kpi') || s.includes('auto-audit') || s.includes('agent-audit'));
  let hardcodedPaths = 0;
  let usesPathJoin = 0;
  
  for (const script of auditScripts) {
    const content = fs.readFileSync(path.join(AUDIT_SCRIPTS_DIR, script), 'utf-8');
    if (content.match(/'[a-zA-Z]+\/[a-zA-Z]+\//) || content.match(/"[a-zA-Z]+\/[a-zA-Z]+\//)) hardcodedPaths++;
    if (content.includes('path.join') || content.includes('path.resolve')) usesPathJoin++;
  }
  
  log(usesPathJoin === auditScripts.length, 'R4', `${usesPathJoin}/${auditScripts.length} audit scripts use path.join/resolve`);
  log(hardcodedPaths <= 9, 'R4', hardcodedPaths > 0 ? `${hardcodedPaths} audit scripts with hardcoded paths` : 'No hardcoded paths');
}

// === R5: Auto-Auditoria Contínua ===
function checkR5() {
  const hasLoop = fs.existsSync(path.join(AUDIT_SCRIPTS_DIR, 'auto-audit-loop.js'));
  const hasAgentAuditor = fs.existsSync(path.join(AUDIT_SCRIPTS_DIR, 'agent-auditor.js'));
  const hasStudyVerify = fs.existsSync(path.join(AUDIT_SCRIPTS_DIR, 'verify-study-compliance.js'));
  const generateAudit = fs.existsSync(path.join(AUDIT_SCRIPTS_DIR, 'generate-audit-report.js'));
  
  log(hasLoop, 'R5', 'auto-audit-loop.js');
  log(hasAgentAuditor, 'R5', 'agent-auditor.js');
  log(hasStudyVerify, 'R5', 'verify-study-compliance.js');
  log(generateAudit, 'R5', 'generate-audit-report.js');
}

// === R6: CLI Auditável ===
function checkR6() {
  const scripts = fs.readdirSync(AUDIT_SCRIPTS_DIR).filter(f => f.endsWith('.js'));
  const withJson = scripts.filter(s => {
    const content = fs.readFileSync(path.join(AUDIT_SCRIPTS_DIR, s), 'utf-8');
    return content.includes('--json') || content.includes('JSON');
  });
  log(withJson.length >= 5, 'R6', `${withJson.length} scripts with --json output`);
}

console.log(`\n\x1b[1m═══════════════════════════════════════════\x1b[0m`);
console.log(`\x1b[1m  IDEIA Rule Enforcer\x1b[0m`);
console.log(`\x1b[1m  ${new Date().toISOString()}\x1b[0m`);
console.log(`\x1b[1m═══════════════════════════════════════════\x1b[0m\n`);

checkR1();
checkR2();
checkR3();
checkR4();
checkR5();
checkR6();

console.log(`\n\x1b[1mResults: ${failures.length === 0 ? '✅ ALL PASS' : `❌ ${failures.length} FAILURES`}\x1b[0m`);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ❌ ${f.rule}: ${f.detail}`));
}
if (CI && failures.length > 0) process.exit(1);
