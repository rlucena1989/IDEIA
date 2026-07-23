const { execSync } = require('child_process');
const { existsSync, mkdirSync, writeFileSync } = require('fs');
const { join, resolve } = require('path');

const ROOT = resolve(__dirname, '..');
const LOG_DIR = join(ROOT, 'electron', 'build-logs');
const ELECTRON_DIR = join(ROOT, 'electron');

const BUILD_TARGETS = [
  { platform: 'win', arch: 'x64', command: 'build:win', label: 'Windows x64' },
  { platform: 'mac', arch: 'x64', command: 'build:mac', label: 'macOS x64' },
  { platform: 'mac', arch: 'arm64', command: 'build:mac', label: 'macOS ARM64' },
  { platform: 'linux', arch: 'x64', command: 'build:linux', label: 'Linux x64' },
];

async function buildAll() {
  console.log('=== IDEIA Cross-Platform Build ===\n');

  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

  const startTime = Date.now();
  const results = [];

  for (const target of BUILD_TARGETS) {
    console.log(`Building for ${target.label}...`);
    const logFile = join(LOG_DIR, `build-${target.platform}-${target.arch}.log`);
    const stepStart = Date.now();

    try {
      const output = execSync(`npm run ${target.command}`, {
        cwd: ELECTRON_DIR,
        encoding: 'utf-8',
        timeout: 600000,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          ELECTRON_BUILDER_ARCH: target.arch,
        },
      });

      writeFileSync(logFile, output);
      const duration = ((Date.now() - stepStart) / 1000).toFixed(1);
      results.push({ target: target.label, status: 'OK', duration: `${duration}s` });
      console.log(`  OK (${duration}s)`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      writeFileSync(logFile, errorMsg);
      results.push({ target: target.label, status: 'FAIL', error: errorMsg.substring(0, 200) });
      console.error(`  FAIL: ${errorMsg.substring(0, 100)}`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n=== Build Summary ===');
  console.log(`Total time: ${totalTime}s`);
  console.log('');

  const successCount = results.filter(r => r.status === 'OK').length;
  for (const r of results) {
    const icon = r.status === 'OK' ? '✅' : '❌';
    console.log(`  ${icon} ${r.target}: ${r.status}${r.duration ? ` (${r.duration})` : ''}`);
  }
  console.log(`\n${successCount}/${results.length} successful`);
  console.log(`Logs: ${LOG_DIR}`);

  const summary = {
    timestamp: new Date().toISOString(),
    totalTime: `${totalTime}s`,
    results,
    successCount,
    totalCount: results.length,
  };
  writeFileSync(join(LOG_DIR, 'build-summary.json'), JSON.stringify(summary, null, 2));

  process.exit(successCount === results.length ? 0 : 1);
}

buildAll().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
