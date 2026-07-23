import { runSelfHealingLoop } from './acceleration/self-healing-loop';

async function main() {
  await runSelfHealingLoop();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
