import { runEngineOnce } from './engine';
import { createLogger } from '@ideia/logger';
import { runEngineLoop } from './loop';
const logger = createLogger('orchestrator');

export interface OrchestratorResult {
  success: boolean;
}

export async function runOrchestrator(): Promise<OrchestratorResult> {
  const loop = process.env.AI_LOOP === 'true';

  if (loop) {
    await runEngineLoop();
    return { success: true };
  }

  const report = await runEngineOnce();
  return { success: report.success };
}
