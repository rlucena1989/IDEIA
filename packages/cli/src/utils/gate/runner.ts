import { Checkpoint, StageResult, saveGateCheckpoint, loadLatestGateCheckpoint } from './checkpoint';
import { createLogger } from '@ideia/logger';
import { getStages, runStages, StageDef } from './stages';

const logger = createLogger('cli-gate-runner');

/**
 * Executa pipeline.
 * @param cwd - Valor cwd.
 * @param startStage - Inicia stage.
 * @param resume - Valor resume.
 * @param json - Valor json.
 */
export function runPipeline(cwd: string, startStage?: string, resume?: boolean, json?: boolean): void {
  let stages: StageDef[];

  if (resume) {
    const checkpoint = loadLatestGateCheckpoint(cwd);
    if (checkpoint) {
      const failedStage = checkpoint.stages.find((s: StageResult) => !s.passed);
      if (failedStage) {
        stages = getStages(failedStage.stage);
      } else {
        logger.info('Pipeline ja foi concluida com sucesso.');
        if (json) logger.info(JSON.stringify(checkpoint, null, 2));
        return;
      }
    } else {
      logger.info('Nenhum checkpoint encontrado. Iniciando do inicio.');
      stages = getStages();
    }
  } else {
    stages = startStage ? getStages(startStage) : getStages();
  }

  const checkpoint: Checkpoint = {
    id: `gate-${Date.now()}`,
    timestamp: new Date().toISOString(),
    stages: [],
    currentStage: 0,
    completed: false,
  };

  const results = runStages(stages, cwd, (result) => {
    checkpoint.stages.push(result);
    checkpoint.currentStage++;
    saveGateCheckpoint(cwd, checkpoint);
  });

  const allPassed = results.every(r => r.passed);
  checkpoint.completed = allPassed;
  saveGateCheckpoint(cwd, checkpoint);

  const failed = results.filter(r => !r.passed).length;

  if (json) {
    logger.info(JSON.stringify(checkpoint, null, 2));
  } else {
    logger.info('\n=== Quality Gate Pipeline ===');
    logger.info('Estagios: ${results.length}');
    logger.info('Passaram: ${results.filter(r => r.passed).length}');
    logger.info('Falharam: ${failed}');
    logger.info('Status: ${allPassed ? \'✅ TODOS OK\' : \'❌ FALHAS DETECTADAS\'}');
  }

  process.exit(failed);
}

/**
 * Imprime status.
 * @param cwd - Valor cwd.
 * @param json - Valor json.
 */
export function printStatus(cwd: string, json?: boolean): void {
  const cp = loadLatestGateCheckpoint(cwd);
  if (!cp) {
    logger.info('Nenhum checkpoint encontrado. Execute "ai-devkit gate run" primeiro.');
    return;
  }

  if (json) {
    logger.info(JSON.stringify(cp, null, 2));
    return;
  }

  logger.info('\n=== Quality Gate Status ===');
  logger.info('Ultima execucao: ${cp.timestamp}');
  logger.info('Estagios: ${cp.stages.length}/${getStages().length}');
  logger.info('Completo: ${cp.completed}');
  logger.info('');

  for (const stage of cp.stages) {
    const icon = stage.passed ? '✅' : '❌';
    logger.info('  ${icon} ${stage.stage} (${stage.durationMs}ms)');
  }
}

export { listGateCheckpoints as listAllCheckpoints } from './checkpoint';
