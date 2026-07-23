/**
 * canary-publish.js — Publica pacotes canary no npm com provenance
 *
 * Uso:
 *   node scripts/canary-publish.js                  # Publica @ideia/cli canary
 *   node scripts/canary-publish.js --all             # Publica todos os pacotes
 *   node scripts/canary-publish.js --dry-run         # Simula sem publicar
 *   node scripts/canary-publish.js --tag next        # Tag personalizada
 *   node scripts/canary-publish.js --otp 123456      # 2FA code
 *
 * Requer:
 *   - npm login (com 2FA configurado)
 *   - GitHub Actions: NPM_TOKEN + GITHUB_TOKEN secrets
 *   - Node.js 20+ (para `--provenance`)
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

interface PackageInfo {
  name: string;
  version: string;
  path: string;
}

function getPackages(): PackageInfo[] {
  const packages: PackageInfo[] = [];
  const packagesDir = resolve(ROOT, 'packages');

  try {
    const { readdirSync } = require('node:fs');
    const dirs = readdirSync(packagesDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      const pkgPath = resolve(packagesDir, dir.name, 'package.json');
      if (!existsSync(pkgPath)) continue;
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.private) continue;
        packages.push({ name: pkg.name, version: pkg.version, path: dir.name });
      } catch { /* skip invalid */ }
    }
  } catch { /* skip */ }

  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

function getCanaryVersion(baseVersion: string): string {
  const date = new Date();
  const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, '');
  const hhmm = date.toISOString().slice(11, 16).replace(/:/g, '');
  const commit = process.env.GITHUB_SHA?.slice(0, 7) || 'local';
  return `${baseVersion}-canary.${yymmdd}.${hhmm}.${commit}`;
}

async function publish() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const publishAll = args.includes('--all');
  const tag = args.includes('--tag') ? args[args.indexOf('--tag') + 1] : 'canary';
  const otp = args.includes('--otp') ? args[args.indexOf('--otp') + 1] : undefined;

  const provenance = process.env.CI === 'true' && process.env.GITHUB_ACTIONS === 'true';

  console.log('┌─────────────────────────────────────────────┐');
  console.log('│  IDEIA Canary Publisher                      │');
  console.log(`│  Tag: ${tag.padEnd(34)}│`);
  console.log(`│  Mode: ${(dryRun ? 'DRY RUN' : 'LIVE').padEnd(32)}│`);
  console.log(`│  Provenance: ${String(provenance).padEnd(27)}│`);
  console.log('└─────────────────────────────────────────────┘\n');

  let packages: PackageInfo[];
  let targetPackage: string;

  if (publishAll) {
    packages = getPackages();
    console.log(`Found ${packages.length} packages:\n`);
  } else {
    packages = [{ name: '@ideia/cli', version: '1.0.0', path: 'cli' }];
    console.log('Publishing @ideia/cli only.\n');
  }

  for (const pkg of packages) {
    const canaryVersion = getCanaryVersion(pkg.version);
    const pkgDir = resolve(ROOT, 'packages', pkg.path);

    console.log(`  ${pkg.name}@${canaryVersion}`);

    if (dryRun) {
      console.log('    → SKIPPED (dry-run)');
      continue;
    }

    const publishArgs = [
      'publish',
      '--tag', tag,
      '--access', 'public',
    ];

    if (provenance) publishArgs.push('--provenance');
    if (otp) publishArgs.push('--otp', otp);

    try {
      // Temporarily update version
      const pkgJsonPath = resolve(pkgDir, 'package.json');
      const originalPkg = readFileSync(pkgJsonPath, 'utf-8');
      const pkgJson = JSON.parse(originalPkg);
      pkgJson.version = canaryVersion;
      require('node:fs').writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');

      execFileSync('npm', publishArgs, {
        cwd: pkgDir,
        stdio: 'pipe',
        encoding: 'utf-8',
        env: {
          ...process.env,
          NODE_AUTH_TOKEN: process.env.NPM_TOKEN || undefined,
        },
      });

      // Restore original version
      require('node:fs').writeFileSync(pkgJsonPath, originalPkg);

      console.log(`    ✅ Published`);
    } catch (err) {
      // Restore original version on failure
      const pkgJsonPath = resolve(pkgDir, 'package.json');
      const original = readFileSync(pkgJsonPath, 'utf-8');
      const pkgJson = JSON.parse(original);
      pkgJson.version = canaryVersion;
      require('node:fs').writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');

      console.error(`    ❌ Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('\nDone.');
}

publish().catch(err => {
  console.error('Publish failed:', err);
  process.exit(1);
});
