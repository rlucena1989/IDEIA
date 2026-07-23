#!/usr/bin/env node
// IDEIA — One command to launch everything
// Starts Backend (AI engine) + Theia IDE, opens browser

const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..', '..');
const MONOREPO = path.join(ROOT, 'ai-devkit-v2');
const THEIA = path.resolve(__dirname, '..');

let backend, theia;

function log(msg) { console.log(`  ${msg}`); }
function ok(msg) { console.log(`  ✅ ${msg}`); }
function warn(msg) { console.log(`  ⚠️ ${msg}`); }

function waitForServer(url, maxRetries = 30) {
  return new Promise((resolve) => {
    const attempt = (retries) => {
      http.get(url, (res) => { resolve(true); res.resume(); })
        .on('error', () => {
          if (retries > 0) setTimeout(() => attempt(retries - 1), 1000);
          else resolve(false);
        });
    };
    attempt(maxRetries);
  });
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'start' :
              process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    execSync(`${cmd} ${url}`, { stdio: 'ignore', timeout: 3000 });
  } catch {}
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║           IDEIA — AI-Powered IDE         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  // Step 1: Build Theia plugin
  log('[1/4] Building IDEIA plugin...');
  try {
    execSync('npx tsc', { cwd: path.join(ROOT, 'ideia-theia'), stdio: 'pipe', timeout: 60000 });
    ok('Plugin compiled');
  } catch {
    warn('Plugin build had issues, continuing...');
  }

  // Step 2: Build Theia app
  log('[2/4] Building Theia IDE...');
  try {
    execSync('npx theia build', { cwd: THEIA, stdio: 'pipe', timeout: 120000 });
    ok('Theia built');
  } catch {
    warn('Theia build had issues, continuing...');
  }

  // Step 3: Start backend
  log('[3/4] Starting AI engine...');
  backend = spawn('npx', ['tsx', 'apps/api/src/index.ts'], {
    cwd: MONOREPO,
    stdio: 'pipe',
    env: { ...process.env, API_PORT: '3001' },
  });
  backend.stdout.on('data', d => process.stdout.write(`  ${d}`));
  backend.stderr.on('data', d => process.stderr.write(`  ${d}`));
  backend.on('error', e => warn(`Backend error: ${e.message}`));

  const backendReady = await waitForServer('http://localhost:3001/api/health');
  if (backendReady) ok('AI engine running');
  else warn('AI engine may not be ready');

  // Step 4: Start Theia IDE
  log('[4/4] Starting IDEIA interface...');
  theia = spawn('npx', ['theia', 'start', '--port=3030', `--root-workspace=${process.cwd()}`], {
    cwd: THEIA,
    stdio: 'inherit',
    env: { ...process.env },
  });
  theia.on('error', e => warn(`Theia error: ${e.message}`));
  theia.on('close', (code) => {
    log(`Theia exited (code ${code})`);
    if (backend) backend.kill();
    process.exit(code || 0);
  });

  // Wait for Theia then open browser
  const theiaReady = await waitForServer('http://localhost:3030');
  console.log('');
  console.log('══════════════════════════════════════════');
  console.log('  ✨ IDEIA está pronta!');
  console.log('══════════════════════════════════════════');
  console.log('');
  console.log('  📡 AI Engine:  http://localhost:3001');
  console.log('  🖥️  IDEIA IDE:  http://localhost:3030');
  console.log('');
  console.log('  Pressione Ctrl+C para parar tudo.');
  console.log('');

  if (theiaReady) openBrowser('http://localhost:3030');
}

process.on('SIGINT', () => {
  log('Parando IDEIA...');
  if (theia) theia.kill();
  if (backend) backend.kill();
  process.exit(0);
});

main().catch(e => {
  console.error('Erro:', e.message);
  if (backend) backend.kill();
  process.exit(1);
});
