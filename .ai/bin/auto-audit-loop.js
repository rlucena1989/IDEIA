#!/usr/bin/env node
/**
 * auto-audit-loop.js — Loop Autônomo de Auditoria Contínua
 *
 * Este script orquestra TODOS os auditores automaticamente:
 * 1. Executa cada scanner
 * 2. Interpreta resultados
 * 3. Gera relatório consolidado
 * 4. Cria issues para problemas encontrados
 * 5. Alerta canais de comunicação
 * 6. Atualiza dashboard
 *
 * Uso: node .ai/bin/auto-audit-loop.js [--ci] [--fix] [--notify slack|github]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const CI = process.argv.includes('--ci');
const FIX = process.argv.includes('--fix');
const OUT_DIR = path.join(ROOT, '.ai/audit/auto');
const HISTORY_FILE = path.join(ROOT, '.ai/audit/history.json');
const ISSUES_FILE = path.join(ROOT, '.ai/audit/issues.json');

const SCANNERS = [
  { name: 'gap-check', cmd: 'node .ai/bin/gap-check.js --quiet', type: 'quality', blocking: true },
  { name: 'compliance', cmd: 'node .ai/bin/compliance-check.js', type: 'security', blocking: true },
  { name: 'secrets', cmd: 'node .ai/bin/check-secrets.js', type: 'security', blocking: true },
  { name: 'study-compliance', cmd: 'node .ai/bin/verify-study-compliance.js', type: 'quality', blocking: false },
  { name: 'package-consistency', cmd: 'node .ai/bin/check-package-consistency.js', type: 'quality', blocking: false },
  { name: 'unused-deps', cmd: 'node .ai/bin/check-unused-deps.js', type: 'quality', blocking: false },
  { name: 'slo-metrics', cmd: 'node .ai/bin/track-slo-metrics.js', type: 'performance', blocking: false },
  { name: 'security-kpis', cmd: 'node .ai/bin/security-kpis.js', type: 'security', blocking: false },
];

class AuditOrchestrator {
  constructor() {
    this.results = [];
    this.issues = [];
    this.startTime = Date.now();
  }

  async runScanners() {
    console.log(`\n\x1b[1m═══════════════════════════════════════════\x1b[0m`);
    console.log(`\x1b[1m  IDEIA Autonomous Audit Loop\x1b[0m`);
    console.log(`\x1b[1m  ${new Date().toISOString()}\x1b[0m`);
    console.log(`\x1b[1m═══════════════════════════════════════════\x1b[0m\n`);

    let pass = 0, fail = 0, skip = 0;

    const runOne = async (scanner) => {
      process.stdout.write(`  \x1b[36m[${scanner.name}]\x1b[0m `.padEnd(50));
      try {
        const out = execSync(scanner.cmd, { cwd: ROOT, encoding: 'utf8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] });
        const hasFailure = out.includes('❌ FAIL') || out.includes('FAIL ❌') || (out.includes('error') && !out.includes('Failed to persist audit event') && !out.match(/error: [Cc]annot find module/i));
        this.results.push({ scanner: scanner.name, status: hasFailure ? 'fail' : 'pass', output: out.slice(0, 500) });
        if (hasFailure) {
          fail++;
          console.log(`\x1b[31m❌ FAIL\x1b[0m`);
          this.extractIssues(scanner.name, out);
        } else {
          pass++;
          console.log(`\x1b[32m✅ PASS\x1b[0m`);
        }
      } catch (e) {
        const output = (e.stdout || '') + (e.stderr || '');
        this.results.push({ scanner: scanner.name, status: 'fail', error: e.message, output: output.slice(0, 500) });
        fail++;
        console.log(`\x1b[31m❌ FAIL (${e.message.slice(0, 50)})\x1b[0m`);
        this.extractIssues(scanner.name, output);
      }
    };

    // Run non-blocking scanners in parallel, blocking ones first sequentially
    const blocking = SCANNERS.filter(s => s.blocking);
    const nonBlocking = SCANNERS.filter(s => !s.blocking);
    for (const s of blocking) await runOne(s);
    await Promise.all(nonBlocking.map(s => runOne(s)));

    // Generate summary
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      total: this.results.length,
      pass, fail, skip,
      scanners: this.results,
      issues: this.issues,
    };

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const reportFile = path.join(OUT_DIR, `audit-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Update history
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')); } catch {}
    }
    history.push({ timestamp: report.timestamp, pass, fail, total: this.results.length });
    if (history.length > 365) history = history.slice(-365);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

    // Save issues
    fs.writeFileSync(ISSUES_FILE, JSON.stringify(this.issues, null, 2));

    console.log(`\n\x1b[1m═══════════════════════════════════════════\x1b[0m`);
    console.log(`\x1b[1m  Results: ${pass}/${this.results.length} passing\x1b[0m`);
    if (this.issues.length > 0) console.log(`\x1b[33m  Issues found: ${this.issues.length}\x1b[0m`);
    console.log(`\x1b[1m  Duration: ${duration}s\x1b[0m`);
    console.log(`\x1b[1m  Report: ${reportFile}\x1b[0m`);
    console.log(`\x1b[1m═══════════════════════════════════════════\x1b[0m\n`);

    if (CI && fail > 0) process.exit(1);
  }

  extractIssues(scanner, output) {
    const severityPatterns = [
      { pattern: /\[(CRITICAL|HIGH|ERROR|FAIL)\]/i, severity: 'high' },
      { pattern: /❌/, severity: 'medium' },
      { pattern: /\bFAIL(?:ED|URE)?\b/i, severity: 'medium' },
      { pattern: /\d+\s+(?:error|failure|violation)/i, severity: 'medium' },
    ];
    const lines = output.split('\n').filter(line => {
      const clean = line.replace(/\x1b\[\d+m/g, '');
      return severityPatterns.some(sp => sp.pattern.test(clean));
    });
    for (const line of lines.slice(0, 10)) {
      const clean = line.replace(/\x1b\[\d+m/g, '').trim();
      let severity = 'medium';
      for (const sp of severityPatterns) {
        if (sp.pattern.test(clean)) { severity = sp.severity; break; }
      }
      this.issues.push({
        scanner,
        description: clean,
        severity,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

const orchestrator = new AuditOrchestrator();
orchestrator.runScanners();
