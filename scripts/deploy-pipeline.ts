import { DeliveryOrchestrator, GitOpsManager } from '@ideia/delivery-orchestrator';
import { createBus } from '@ideia/event-bus';
import { resolve } from 'node:path';

export interface DeployPipelineOptions {
  version: string;
  environment: 'development' | 'staging' | 'production';
  artifacts?: string[];
  cwd?: string;
  autoDeploy?: boolean;
  reviewedBy?: string;
  dryRun?: boolean;
  gitOpsRepoPath?: string;
}

export interface DeployPipelineResult {
  success: boolean;
  release: { version: string; environment: string; artifacts: string[] };
  deployId?: string;
  gitOpsResult?: { manifestApplied: boolean; workflowGenerated: boolean };
  error?: string;
}

export async function runDeployPipeline(options: DeployPipelineOptions): Promise<DeployPipelineResult> {
  const cwd = options.cwd ?? process.cwd();
  const artifacts = options.artifacts ?? ['dist'];
  const eventBus = await createBus();

  const gitOpsManager = new GitOpsManager({
    repoPath: options.gitOpsRepoPath ?? cwd,
    enabled: !options.dryRun,
    autoCommit: !options.dryRun,
  });

  const orchestrator = new DeliveryOrchestrator({
    cwd,
    eventBus,
    gitOpsManager,
    autoGenerateWorkflow: !options.dryRun,
  });

  if (options.dryRun) {
    console.log('[DRY-RUN] Would deploy v%s to %s', options.version, options.environment);
    console.log('[DRY-RUN] Artifacts: %s', artifacts.join(', '));
    console.log('[DRY-RUN] GitOps repo: %s', options.gitOpsRepoPath ?? cwd);
    return {
      success: true,
      release: { version: options.version, environment: options.environment, artifacts },
    };
  }

  const _release = orchestrator.createRelease(options.version, options.environment, artifacts, options.autoDeploy);

  try {
    const deploy = orchestrator.deploy(options.version, options.environment, artifacts, options.reviewedBy);

    if (deploy.reviewRequired) {
      console.log('[Deploy] Review required for v%s to %s — deployId: %s', options.version, options.environment, deploy.id);
      return {
        success: true,
        release: { version: options.version, environment: options.environment, artifacts },
        deployId: deploy.id,
      };
    }

    console.log('[Deploy] v%s deployed to %s successfully', options.version, options.environment);
    return {
      success: true,
      release: { version: options.version, environment: options.environment, artifacts },
      deployId: deploy.id,
      gitOpsResult: { manifestApplied: true, workflowGenerated: true },
    };
  } catch (_err) {
    const msg = _err instanceof Error ? _err.message : String(_err);
    console.error('[Deploy] Failed: %s', msg);
    return {
      success: false,
      release: { version: options.version, environment: options.environment, artifacts },
      error: msg,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const version = args.find(a => a.startsWith('--version='))?.split('=')[1];
  const environment = (args.find(a => a.startsWith('--env='))?.split('=')[1] ?? 'development') as DeployPipelineOptions['environment'];
  const dryRun = args.includes('--dry-run');
  const reviewedBy = args.find(a => a.startsWith('--reviewed-by='))?.split('=')[1];
  const gitOpsRepoPath = args.find(a => a.startsWith('--gitops-repo='))?.split('=')[1];

  if (!version) {
    console.error('Usage: npx tsx scripts/deploy-pipeline.ts --version=1.0.0 [--env=staging] [--dry-run] [--reviewed-by=admin] [--gitops-repo=./repo]');
    process.exit(1);
  }

  const result = await runDeployPipeline({
    version,
    environment,
    dryRun,
    reviewedBy,
    gitOpsRepoPath: gitOpsRepoPath ? resolve(process.cwd(), gitOpsRepoPath) : undefined,
  });

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

if (require.main === module || import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}
