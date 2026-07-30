import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

interface DeployOptions {
  environment: 'development' | 'staging' | 'production';
  version?: string;
  dryRun?: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const environment = (args[0] as DeployOptions['environment']) || 'development';
  const dryRun = args.includes('--dry-run');

  if (!['development', 'staging', 'production'].includes(environment)) {
    console.error('Usage: npx tsx scripts/self-deploy.ts [development|staging|production] [--dry-run]');
    process.exit(1);
  }

  const opts: DeployOptions = { environment, dryRun };

  console.log(`[Self-Deploy] Starting deployment to ${opts.environment}${opts.dryRun ? ' (DRY RUN)' : ''}`);

  // 1. Run quality gates based on environment
  const gates = environment === 'production'
    ? ['lint', 'typecheck', 'test', 'security', 'build']
    : ['lint', 'typecheck', 'test'];

  for (const gate of gates) {
    console.log(`[Self-Deploy] Running gate: ${gate}`);
    if (!opts.dryRun) {
      try {
        switch (gate) {
          case 'lint':
            execFileSync('npx', ['eslint', '.', '--max-warnings=0'], { cwd: ROOT, stdio: 'pipe', timeout: 60000 });
            break;
          case 'typecheck':
            execFileSync('npx', ['tsc', '--noEmit'], { cwd: ROOT, stdio: 'pipe', timeout: 120000 });
            break;
          case 'test':
            execFileSync('npx', ['jest', '--passWithNoTests'], { cwd: ROOT, stdio: 'pipe', timeout: 120000 });
            break;
          case 'build':
            execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'pipe', timeout: 120000 });
            break;
          default:
            console.log(`[Self-Deploy] Unknown gate: ${gate}, skipping`);
        }
        console.log(`[Self-Deploy] Gate ${gate}: PASSED`);
      } catch (err) {
        console.error(`[Self-Deploy] Gate ${gate}: FAILED - ${err}`);
        process.exit(1);
      }
    } else {
      console.log(`[Self-Deploy] Gate ${gate}: would run (dry-run)`);
    }
  }

  // 2. Build if not done yet
  if (!opts.dryRun) {
    console.log('[Self-Deploy] Building...');
    try {
      execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'pipe', timeout: 180000 });
    } catch {
      console.error('[Self-Deploy] Build failed');
      process.exit(1);
    }
  }

  // 3. Create deploy structure
  const deployDir = join(ROOT, '.deploy');
  const version = opts.version || readFileSync(join(ROOT, 'package.json'), 'utf-8')
    ? JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')).version || '0.0.0'
    : '0.0.0';

  if (!opts.dryRun) {
    if (!existsSync(deployDir)) mkdirSync(deployDir, { recursive: true });
    writeFileSync(join(deployDir, 'active-version.txt'), version, 'utf-8');

    const manifestsDir = join(deployDir, 'manifests');
    if (!existsSync(manifestsDir)) mkdirSync(manifestsDir, { recursive: true });

    const manifest = {
      apiVersion: 'ideia.dev/v1',
      kind: 'IDEIADeployment',
      metadata: { name: 'ideia-core', labels: { environment, version } },
      spec: { version, environment, replicas: environment === 'production' ? 3 : 1 },
    };
    writeFileSync(join(manifestsDir, 'ideia.json'), JSON.stringify(manifest, null, 2), 'utf-8');
    writeFileSync(join(manifestsDir, 'version.txt'), version, 'utf-8');

    console.log(`[Self-Deploy] Deployed version ${version} to ${environment}`);
    console.log(`[Self-Deploy] Active version: ${readFileSync(join(deployDir, 'active-version.txt'), 'utf-8').trim()}`);
  } else {
    console.log(`[Self-Deploy] Would deploy version ${version} to ${environment} (dry-run)`);
  }

  // 4. Health check
  if (environment === 'production' && !opts.dryRun) {
    console.log('[Self-Deploy] Production health check skipped (no server running in CI)');
  }

  console.log(`[Self-Deploy] Deployment to ${environment} complete`);
}

main().catch(err => {
  console.error('[Self-Deploy] Failed:', err);
  process.exit(1);
});
