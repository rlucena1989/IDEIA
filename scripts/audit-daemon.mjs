#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { mkdirSync, existsSync, appendFileSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const AUDIT_DIR = join(ROOT, '.ai', 'audit');
const LOG_FILE = join(AUDIT_DIR, 'audit-daemon.log');
const TIMELINE_FILE = join(AUDIT_DIR, 'timeline.jsonl');
const PID_FILE = join(AUDIT_DIR, 'daemon.pid');

const INTERVAL_MS = parseInt(process.env.AUDIT_DAEMON_INTERVAL || '600000', 10);
const CONTINUOUS = process.argv.includes('--daemon');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    mkdirSync(AUDIT_DIR, { recursive: true });
    appendFileSync(LOG_FILE, line + '\n', 'utf-8');
  } catch {}
}

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function getLastHash() {
  if (!existsSync(TIMELINE_FILE)) return null;
  const content = readFileSync(TIMELINE_FILE, 'utf-8').trim();
  if (!content) return null;
  const lastLine = content.split('\n').filter(l => l.trim()).pop();
  if (!lastLine) return null;
  try {
    return JSON.parse(lastLine).hash;
  } catch {
    return null;
  }
}

function appendTimeline(entry) {
  mkdirSync(AUDIT_DIR, { recursive: true });
  const prevHash = getLastHash() || '0'.repeat(64);
  const record = { ...entry, prev_hash: prevHash, hash: sha256(JSON.stringify(entry) + prevHash), id: randomUUID() };
  appendFileSync(TIMELINE_FILE, JSON.stringify(record) + '\n', 'utf-8');
  return record;
}

function runCheck(name, command, args) {
  try {
    const shell = process.platform === 'win32';
    const fullCmd = [command, ...args].join(' ');
    const output = execSync(fullCmd, {
      cwd: ROOT, encoding: 'utf8', timeout: 60000, stdio: 'pipe', windowsHide: true, shell,
    });
    return { ok: true, output: output.trim() };
  } catch (err) {
    return { ok: false, output: err.stderr?.trim() || err.message };
  }
}

function writePid() {
  mkdirSync(AUDIT_DIR, { recursive: true });
  writeFileSync(PID_FILE, String(process.pid), 'utf8');
}

function removePid() {
  try { unlinkSync(PID_FILE); } catch {}
}

function isRunning() {
  if (!existsSync(PID_FILE)) return false;
  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10);
    process.kill(pid, 0);
    return true;
  } catch {
    removePid();
    return false;
  }
}

async function runCycle() {
  log('Starting audit cycle...');

  const checks = [
    { name: 'tsc-compile', command: 'npx', args: ['tsc', '--noEmit', '--project', 'tsconfig.json'] },
    { name: 'git-dirty', command: 'git', args: ['diff', '--stat'] },
    { name: 'disk-usage', command: 'du', args: ['-sh', '.ai', 'packages'] },
  ];

  const results = {};
  let allPassed = true;

  for (const check of checks) {
    const result = runCheck(check.name, check.command, check.args);
    results[check.name] = result.ok ? 'passed' : 'failed';
    if (!result.ok) allPassed = false;
    log(`  ${check.name}: ${result.ok ? 'PASS' : 'FAIL'}`);
  }

  const entry = {
    timestamp: new Date().toISOString(),
    type: 'audit-cycle',
    status: allPassed ? 'passed' : 'failed',
    results,
  };

  appendTimeline(entry);
  log(allPassed ? 'All checks passed.' : 'Cycle completed with failures.');
  return allPassed;
}

function printUsage() {
  console.log(`
Usage: node scripts/audit-daemon.mjs [options]

Options:
  --daemon         Run in continuous monitoring mode
  --interval <ms>  Check interval in milliseconds (default: 600000 = 10min)
  --once           Run a single audit cycle and exit (default)
  --status         Check if daemon is running

Environment:
  AUDIT_DAEMON_INTERVAL  Interval override (ms)
`);
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  if (process.argv.includes('--status')) {
    if (isRunning()) {
      const pid = readFileSync(PID_FILE, 'utf8').trim();
      console.log(`Audit daemon is RUNNING (PID: ${pid})`);
      process.exit(0);
    } else {
      console.log('Audit daemon is NOT running');
      process.exit(1);
    }
  }

  log(`Audit Daemon v1.0.0`);
  log(`Root: ${ROOT}`);
  log(`Interval: ${INTERVAL_MS}ms`);
  log(`Mode: ${CONTINUOUS ? 'Continuous' : 'Single-run'}`);

  process.on('SIGTERM', () => { log('Shutting down...'); removePid(); process.exit(0); });
  process.on('SIGINT', () => { log('Interrupted.'); removePid(); process.exit(0); });

  if (CONTINUOUS) {
    writePid();
    log('Starting continuous monitoring...');
    try {
      while (true) {
        await runCycle();
        await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
      }
    } finally {
      removePid();
    }
  } else {
    const ok = await runCycle();
    process.exit(ok ? 0 : 1);
  }
}

main().catch(err => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
