import { loadConfig } from './config';
import { createLogger } from '@ideia/logger';
import { runEngineOnce } from './engine';
const logger = createLogger('loop');

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runEngineLoop() {
  const config = loadConfig();

  for (;;) {
    const report = await runEngineOnce();

    if (!report.success && config.stopOnFailure) {
      logger.error('stopping on failure');
      break;
    }

    const delay = report.success ? 100 : 500;
    await sleep(delay);

    if (!config.loop) break;
  }
}
