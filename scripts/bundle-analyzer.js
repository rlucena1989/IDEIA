import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const META_FILE = resolve(ROOT, 'dist', 'meta.json');

function formatBytes(bytes) {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function ensureMetafile() {
  if (existsSync(META_FILE)) return;
  console.log('No metafile found. Running esbuild build first...\n');
  try {
    execSync('node esbuild.mjs', { cwd: ROOT, stdio: 'inherit' });
  } catch {
    console.error('esbuild build failed. Cannot analyze bundle.');
    process.exit(1);
  }
}

function analyze() {
  ensureMetafile();

  const meta = JSON.parse(readFileSync(META_FILE, 'utf-8'));
  const outputs = meta.outputs || {};
  const inputs = meta.inputs || {};

  console.log('Bundle Analyzer Report');
  console.log('='.repeat(60));
  console.log();

  const outputEntries = Object.entries(outputs)
    .map(([name, info]) => ({ name, bytes: info.bytes, entryPoint: info.entryPoint }))
    .sort((a, b) => b.bytes - a.bytes);

  const totalBytes = outputEntries.reduce((sum, e) => sum + e.bytes, 0);

  console.log(`Outputs (${outputEntries.length}):`);
  console.log('-'.repeat(70));
  for (const entry of outputEntries) {
    const pct = ((entry.bytes / totalBytes) * 100).toFixed(1);
    console.log(`  ${formatBytes(entry.bytes).padStart(10)}  ${pct.padStart(5)}%  ${entry.name}${entry.entryPoint ? ` (entry: ${entry.entryPoint})` : ''}`);
  }
  console.log('-'.repeat(70));
  console.log(`  ${formatBytes(totalBytes).padStart(10)}  TOTAL\n`);

  const inputEntries = Object.entries(inputs)
    .map(([name, info]) => ({ name, bytes: info.bytes }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 20);

  console.log(`Top 20 largest inputs (of ${Object.keys(inputs).length} total):`);
  console.log('-'.repeat(70));
  for (const entry of inputEntries) {
    const pkg = entry.name.includes('node_modules/') ? entry.name.split('node_modules/')[1]?.split('/')[0] : '';
    console.log(`  ${formatBytes(entry.bytes).padStart(10)}  ${pkg ? `[${pkg}] ` : ''}${entry.name}`);
  }

  const modules = Object.keys(inputs).filter(f => f.includes('node_modules'));
  const moduleCounts = {};
  for (const m of modules) {
    const parts = m.split('node_modules/')[1];
    if (parts) {
      const pkg = parts.split('/')[0];
      moduleCounts[pkg] = (moduleCounts[pkg] || 0) + 1;
    }
  }

  console.log('\nTop dependencies by file count:');
  console.log('-'.repeat(40));
  const sorted = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [pkg, count] of sorted) {
    const estSize = formatBytes(count * 5000);
    console.log(`  ${count.toString().padStart(5)} files  ${estSize.padStart(10)}  ${pkg}`);
  }

  const nodeModulesTotal = modules.reduce((sum, m) => sum + (inputs[m]?.bytes || 0), 0);
  const appTotal = totalBytes - nodeModulesTotal;
  console.log('\nSize breakdown:');
  console.log(`  App code:      ${formatBytes(appTotal).padStart(10)}`);
  console.log(`  node_modules:  ${formatBytes(nodeModulesTotal).padStart(10)}`);
  console.log(`  Total:         ${formatBytes(totalBytes).padStart(10)}`);

  if (totalBytes > 10_000_000) {
    const oversized = outputEntries.filter(e => e.bytes > 500_000);
    if (oversized.length > 0) {
      console.log('\nCode splitting opportunities:');
      for (const entry of oversized) {
        console.log(`  ${entry.name} (${formatBytes(entry.bytes)}) — consider splitting into chunks`);
      }
    }
  }

  // G17 Diagnostic — Bundle Size Analysis
  if (totalBytes > 5_000_000) {
    console.log('\n=== G17 Diagnostic: Bundle Size ===');
    if (totalBytes > 15_000_000) {
      console.log(`🔴 CRITICAL: Bundle is ${formatBytes(totalBytes)} (target: <5MB)`);
    } else if (totalBytes > 10_000_000) {
      console.log(`🟠 HIGH: Bundle is ${formatBytes(totalBytes)} (target: <5MB)`);
    } else {
      console.log(`🟡 MEDIUM: Bundle is ${formatBytes(totalBytes)} (target: <5MB)`);
    }
    const topDeps = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log('Top 5 bloated dependencies:');
    for (const [pkg, count] of topDeps) {
      console.log(`  ${pkg}: ${count} files (est. ${formatBytes(count * 5000)})`);
    }
    console.log('Recommendations:');
    console.log('  - Lazy-load heavy dependencies');
    console.log('  - Use dynamic import() for rarely-used features');
    console.log('  - Check for duplicate dependencies (npm dedupe)');
    console.log('  - Consider replacing large libs with lighter alternatives');
  }

  const jsonOutput = process.argv.includes('--json');
  if (jsonOutput) {
    const result = {
      totalBytes,
      outputCount: outputEntries.length,
      inputCount: Object.keys(inputs).length,
      appCode: appTotal,
      nodeModules: nodeModulesTotal,
      largestOutputs: outputEntries.slice(0, 5).map(e => ({ name: e.name, bytes: e.bytes })),
      g17Diagnostic: totalBytes > 5_000_000 ? {
        severity: totalBytes > 15_000_000 ? 'critical' : totalBytes > 10_000_000 ? 'high' : 'medium',
        targetBytes: 5_000_000,
        topDeps: Object.entries(moduleCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p, c]) => ({ name: p, files: c })),
      } : null,
    };
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(result, null, 2));
    }
  }
}

analyze();
