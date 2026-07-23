import { loadConfig } from './config';
import { runEngineOnce } from './engine';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runEngineLoop() {
  const config = loadConfig();

  for (;;) {
    const report = await runEngineOnce();

    if (!report.success && config.stopOnFailure) {
      console.error('[loop] stopping on failure');
      break;
    }

    const delay = report.success ? 100 : 500;
    await sleep(delay);

    if (!config.loop) break;
  }
}
