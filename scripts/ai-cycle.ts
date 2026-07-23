import { runEngineOnce } from './acceleration/engine';
import { loadConfig } from './acceleration/config';

async function main() {
  const config = loadConfig();
  console.log(`[ai-cycle] starting in ${config.mode} mode`);
  const report = await runEngineOnce();
  console.log(`[ai-cycle] done: success=${report.success} quality=${report.quality.score}`);
  process.exit(report.success ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
