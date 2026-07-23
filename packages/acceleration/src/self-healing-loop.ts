import { runEngineOnce } from './engine';
import { getRetryDecision } from './retry-policy';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runSelfHealingLoop() {
  let attempt = 0;

  for (;;) {
    const report = await runEngineOnce();

    if (report.success) {
      attempt = 0;
      continue;
    }

    attempt += 1;
    const retry = getRetryDecision(attempt);

    if (!retry.shouldRetry) {
      console.error('[self-healing] max retries reached');
      break;
    }

    console.log(`[self-healing] retrying in ${retry.delayMs}ms (attempt ${retry.attempt + 1})`);
    await sleep(retry.delayMs);
  }
}
