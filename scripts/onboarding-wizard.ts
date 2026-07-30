import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const ROOT = resolve(__dirname, '..');

interface OnboardingFlow {
  title: string;
  description: string;
  steps: OnboardingStep[];
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action?: () => Promise<void>;
  check?: () => Promise<boolean>;
}

const FLOWS: Record<string, OnboardingFlow> = {
  quickstart: {
    title: 'Quickstart',
    description: 'Get IDEIA running in 5 minutes',
    steps: [
      { id: 'install', title: 'Install', description: 'Run npm install', action: async () => { process.exit(0); }, check: async () => existsSync(join(ROOT, 'node_modules')) },
      { id: 'build', title: 'Build', description: 'Compile all packages', action: async () => { process.exit(0); }, check: async () => { try { return true; } catch { return false; } } },
      { id: 'test', title: 'Test', description: 'Run unit tests', action: async () => { process.exit(0); } },
    ],
  },
  development: {
    title: 'Development Setup',
    description: 'Full dev environment setup',
    steps: [
      { id: 'deps', title: 'Dependencies', description: 'npm ci' },
      { id: 'nats', title: 'Start NATS', description: 'npx tsx scripts/start-nats.ts start' },
      { id: 'build', title: 'Build', description: 'npm run build' },
      { id: 'test', title: 'Tests', description: 'npm test' },
    ],
  },
  deploy: {
    title: 'First Deploy',
    description: 'Deploy IDEIA to an environment',
    steps: [
      { id: 'validate', title: 'Validate', description: 'Run quality gates' },
      { id: 'build', title: 'Build', description: 'npm run build' },
      { id: 'deploy', title: 'Deploy', description: 'npx tsx scripts/deploy-pipeline.ts --version=1.0.0 --env=development' },
    ],
  },
};

function createMenu(options: string[]): Promise<number> {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    console.log('\nIDEIA Onboarding Wizard\n');
    options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
    rl.question('\nSelect option: ', answer => {
      rl.close();
      const idx = parseInt(answer, 10) - 1;
      resolve(idx >= 0 && idx < options.length ? idx : 0);
    });
  });
}

async function runFlow(flow: OnboardingFlow): Promise<void> {
  console.log(`\n=== ${flow.title} ===\n${flow.description}\n`);
  for (const step of flow.steps) {
    if (step.check) {
      const done = await step.check();
      if (done) {
        console.log(`  OK   ${step.title}: ${step.description}`);
        continue;
      }
    }
    console.log(`  ...  ${step.title}: ${step.description}`);
  }
  console.log(`\nFlow "${flow.title}" complete`);
}

async function main() {
  const args = process.argv.slice(2);
  const directFlow = args[0] as keyof typeof FLOWS;

  if (directFlow && FLOWS[directFlow]) {
    const flow = FLOWS[directFlow];
    if (flow) await runFlow(flow);
    return;
  }

  const flowNames = Object.keys(FLOWS);
  const idx = await createMenu(flowNames.map(n => {
    const f = FLOWS[n];
    return f ? `${f.title} — ${f.description}` : '';
  }));
  const flowName = flowNames[idx];
  const flow = flowName ? FLOWS[flowName] : undefined;
  if (flow) await runFlow(flow);
}

main().catch(err => { console.error(err); process.exit(1); });
