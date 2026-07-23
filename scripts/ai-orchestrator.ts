import { runOrchestrator } from './acceleration/orchestrator';

async function main() {
  const result = await runOrchestrator();
  process.exit(result.success ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
