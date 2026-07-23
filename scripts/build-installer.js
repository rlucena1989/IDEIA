/**
 * Build orchestrator — generates the IDEIA desktop installer
 * Usage: node scripts/build-installer.js [--platform win|mac|linux]
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLATFORM = process.argv.includes('--platform')
  ? process.argv[process.argv.indexOf('--platform') + 1]
  : process.platform === 'win32' ? 'win' : process.platform;

function run(cmd, cwd = ROOT) {
  console.log(`\n> ${cmd}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit', timeout: 600000 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[build-installer] Step failed: ${cmd.slice(0, 80)}`);
    console.error(`[build-installer] Error: ${msg}`);
    process.exit(1);
  }
}

console.log('=== IDEIA Installer Builder ===');
console.log(`Platform: ${PLATFORM}\n`);

// Step 1: Build plugin
console.log('--- Step 1/5: Building plugin ---');
run('npx tsc --project packages/ideia-plugin/tsconfig.json');

// Step 2: Build Theia app
console.log('--- Step 2/5: Building Theia app ---');
run('npx --package=@theia/cli theia build --app-dir apps/ideia-app');

// Step 3: Build Electron
console.log('--- Step 3/5: Building Electron ---');
run('npx tsc', path.join(ROOT, 'electron'));

// Step 4: Build installer
console.log('--- Step 4/5: Generating installer ---');
const builderFlag = PLATFORM === 'win' ? '--win' : PLATFORM === 'mac' ? '--mac' : '--linux';
run(`npx electron-builder ${builderFlag} --x64`, path.join(ROOT, 'electron'));

console.log('\n=== Installer generated successfully ===');
console.log(`Output: electron/dist-installer/`);
