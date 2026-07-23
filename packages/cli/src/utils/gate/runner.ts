import { Checkpoint, StageResult, saveGateCheckpoint, loadLatestGateCheckpoint } from './checkpoint';
import { getStages, runStages, StageDef } from './stages';

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
        console.log('Pipeline ja foi concluida com sucesso.');
        if (json) console.log(JSON.stringify(checkpoint, null, 2));
        return;
      }
    } else {
      console.log('Nenhum checkpoint encontrado. Iniciando do inicio.');
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
    console.log(JSON.stringify(checkpoint, null, 2));
  } else {
    console.log(`\n=== Quality Gate Pipeline ===`);
    console.log(`Estagios: ${results.length}`);
    console.log(`Passaram: ${results.filter(r => r.passed).length}`);
    console.log(`Falharam: ${failed}`);
    console.log(`Status: ${allPassed ? '✅ TODOS OK' : '❌ FALHAS DETECTADAS'}`);
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
    console.log('Nenhum checkpoint encontrado. Execute "ai-devkit gate run" primeiro.');
    return;
  }

  if (json) {
    console.log(JSON.stringify(cp, null, 2));
    return;
  }

  console.log(`\n=== Quality Gate Status ===`);
  console.log(`Ultima execucao: ${cp.timestamp}`);
  console.log(`Estagios: ${cp.stages.length}/${getStages().length}`);
  console.log(`Completo: ${cp.completed}`);
  console.log('');

  for (const stage of cp.stages) {
    const icon = stage.passed ? '✅' : '❌';
    console.log(`  ${icon} ${stage.stage} (${stage.durationMs}ms)`);
  }
}

export { listGateCheckpoints as listAllCheckpoints } from './checkpoint';
