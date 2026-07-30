import { spawn } from 'child_process';
import { resolve } from 'path';

const TARGET = process.argv[2] || 'packages/cli/src/index.ts';
const DURATION = parseInt(process.env.PROFILE_DURATION || '30000', 10);
const TOOL = process.env.PROFILE_TOOL || 'clinic';

const tools = {
  clinic: {
    cmd: 'npx',
    args: ['clinic', 'doctor', '--on-port', '--', 'node', '--import', 'tsx', TARGET],
    label: 'Clinic.js Doctor',
  },
  flame: {
    cmd: 'npx',
    args: ['clinic', 'flame', '--', 'node', '--import', 'tsx', TARGET],
    label: 'Clinic.js Flame',
  },
  heap: {
    cmd: 'node',
    args: ['--heap-prof', '--import', 'tsx', TARGET],
    label: 'V8 Heap Profile',
  },
};

const config = tools[TOOL] || tools.clinic;

console.log(`\n=== Profiling with ${config.label} ===`);
console.log(`Target: ${resolve(TARGET)}`);
console.log(`Duration: ${DURATION}ms\n`);

const proc = spawn(config.cmd, config.args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    IDEIA_CACHE_SIZE: '1000',
    IDEIA_LOG_LEVEL: 'error',
  },
  shell: true,
});

const timeout = setTimeout(() => {
  console.log('\nProfile duration reached, terminating...');
  proc.kill('SIGTERM');
}, DURATION);

proc.on('exit', (code) => {
  clearTimeout(timeout);
  console.log(`\nProfile completed (exit code: ${code})`);
  process.exit(code ?? 0);
});
