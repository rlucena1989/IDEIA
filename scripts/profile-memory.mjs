import { spawn, execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const TARGET = process.argv.includes('--target') ? process.argv[process.argv.indexOf('--target') + 1] : 'packages/cli/src/index.ts';
const DURATION = parseInt(process.env.PROFILE_DURATION || '30000', 10);
const MODE = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : 'heap';
const IS_JSON = process.argv.includes('--json');

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = resolve(ROOT, '.ai', 'profiles');
const OUT_FILE = resolve(OUT_DIR, `profile-${MODE}-${TIMESTAMP}`);
const GC_FILE = `${OUT_FILE}.gc.log`;
const HEAP_SNAPSHOT_FILE = `${OUT_FILE}.heapsnapshot`;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const WITH_GC = process.argv.includes('--gc');
const WITH_SNAPSHOT = process.argv.includes('--snapshot') || process.argv.includes('--heap-snapshot');

const heapArgs = ['--heap-prof', '--heap-prof-name', `${OUT_FILE}.heapprofile`];
if (WITH_GC) heapArgs.push('--trace-gc', '--trace-gc-ignore-scavenger');
if (WITH_SNAPSHOT) heapArgs.push('--heapsnapshot-near-heap-limit=3', `--heapsnapshot-signal=SIGUSR2`);
heapArgs.push('--import', 'tsx', TARGET);

const modes = {
  heap: {
    cmd: 'node',
    args: heapArgs,
    label: 'V8 Heap Profile',
    ext: '.heapprofile',
    parseOutput: () => {
      const raw = execSync(`npx tsx ${resolve(__dirname, 'memory-profile.js')}`, { encoding: 'utf-8', cwd: ROOT });
      return { summary: raw.trim().split('\n').pop() || '' };
    },
  },
  gc: {
    cmd: 'node',
    args: ['--trace-gc', '--trace-gc-verbose', '--import', 'tsx', TARGET],
    label: 'V8 GC Trace',
    ext: '.gc.log',
    parseOutput: () => {
      const stats = { totalGcTime: 0, gcCount: 0, scavengeCount: 0, markSweepCount: 0 };
      try {
        const content = execSync(`type "${GC_FILE}"`, { encoding: 'utf-8', shell: true });
        for (const line of content.split('\n')) {
          const timeMatch = line.match(/(\d+\.?\d*)\s*ms/);
          if (timeMatch) stats.totalGcTime += parseFloat(timeMatch[1]);
          if (line.includes('Scavenge')) stats.scavengeCount++;
          if (line.includes('Mark-sweep')) stats.markSweepCount++;
          stats.gcCount++;
        }
        return { summary: `GC: ${stats.gcCount} pauses, ${stats.totalGcTime.toFixed(1)}ms total, ${stats.scavengeCount} scavenge, ${stats.markSweepCount} mark-sweep` };
      } catch { return { summary: 'GC trace collected' }; }
    },
  },
  snapshot: {
    cmd: 'node',
    args: ['--heapsnapshot-near-heap-limit=2', '--import', 'tsx', TARGET],
    label: 'V8 Heap Snapshot',
    ext: '.heapsnapshot',
    parseOutput: () => ({ summary: `Heap snapshot: ${HEAP_SNAPSHOT_FILE}` }),
  },
  cpu: {
    cmd: 'npx',
    args: ['clinic', 'doctor', '--on-port', '--', 'node', '--import', 'tsx', TARGET],
    label: 'Clinic.js Doctor (CPU)',
    ext: '.clinic-doctor',
    parseOutput: () => ({ summary: '' }),
  },
  flame: {
    cmd: 'npx',
    args: ['clinic', 'flame', '--', 'node', '--import', 'tsx', TARGET],
    label: 'Clinic.js Flame',
    ext: '.clinic-flame',
    parseOutput: () => ({ summary: '' }),
  },
};

const config = modes[MODE] || modes.heap;

console.log(`Profile: ${config.label}`);
console.log(`Target:  ${resolve(TARGET)}`);
console.log(`Output:  ${OUT_FILE}${config.ext}`);
console.log(`Elapsed: ${DURATION}ms`);
console.log('');

if (IS_JSON) {
  const result = { mode: MODE, target: TARGET, duration: DURATION, outputPath: OUT_FILE, startTime: TIMESTAMP };
  console.log(JSON.stringify(result));
}

const proc = spawn(config.cmd, config.args, {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production', IDEIA_CACHE_SIZE: '1000', IDEIA_LOG_LEVEL: 'error' },
  shell: true,
});

const gcStream = WITH_GC ? appendFileSync(GC_FILE, '') : null;

const timeout = setTimeout(() => {
  console.log('\nDuration reached, terminating...');
  proc.kill('SIGTERM');
}, DURATION);

proc.on('exit', (code) => {
  clearTimeout(timeout);
  let summary = config.parseOutput();
  const report = {
    mode: MODE, target: TARGET, duration: DURATION, exitCode: code,
    outputPath: `${OUT_FILE}${config.ext}`,
    gcPath: WITH_GC ? GC_FILE : undefined,
    snapshotPath: WITH_SNAPSHOT ? HEAP_SNAPSHOT_FILE : undefined,
    timestamp: TIMESTAMP, summary: summary.summary,
  };
  writeFileSync(`${OUT_FILE}.report.json`, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${OUT_FILE}.report.json`);
  if (IS_JSON) console.log(JSON.stringify(report));
  process.exit(code ?? 0);
});
