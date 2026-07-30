import { spawnSync } from 'node:child_process';
import { createLogger } from '@ideia/logger';
const logger = createLogger('utils.gate.stages');
import { StageResult } from './checkpoint';

/** Interface que define a estrutura de stage def. */
export interface StageDef {
  name: string;
  command: string;
  args: string[];
  workDir?: string;
}

const STAGES: StageDef[] = [
  { name: 'lint', command: 'npx', args: ['eslint', 'packages/cli/src/', '--max-warnings', '200'] },
  { name: 'test', command: 'npx', args: ['jest', '--passWithNoTests'] },
  { name: 'security', command: 'npx', args: ['npm', 'audit', '--omit=dev'] },
  { name: 'build', command: 'npm', args: ['run', 'build'] },
  { name: 'architecture', command: 'npx', args: ['ai-devkit', 'drift', 'check'] },
  { name: 'deploy-readiness', command: 'npx', args: ['ai-devkit', 'scorecard'] },
];

/**
 * Obtém stages.
 * @param stageName - Valor name.
 * @returns O resultado da operação.
 */
export function getStages(stageName?: string): StageDef[] {
  if (!stageName) return STAGES;
  const index = STAGES.findIndex(s => s.name === stageName);
  if (index === -1) throw new Error(`Stage "${stageName}" not found. Available: ${STAGES.map(s => s.name).join(', ')}`);
  return STAGES.slice(index);
}

/**
 * Executa stages.
 * @param stages - Valor stages.
 * @param cwd - Valor cwd.
 * @param onStage - Valor stage.
 * @returns O resultado da operação.
 */
export function runStages(stages: StageDef[], cwd: string, onStage?: (result: StageResult) => void): StageResult[] {
  const results: StageResult[] = [];

  for (const stage of stages) {
    const start = Date.now();
    logger.info('\n[${stage.name}] Executando: ${stage.command} ${stage.args.join(\' \')}...');

    try {
      const result = spawnSync(stage.command, stage.args, {
        cwd: stage.workDir || cwd,
        encoding: 'utf-8',
        timeout: 120000,
        shell: process.platform === 'win32',
      });

      const stageResult: StageResult = {
        stage: stage.name,
        passed: result.status === 0,
        durationMs: Date.now() - start,
        output: result.stdout?.slice(0, 500) || '',
        exitCode: result.status ?? 1,
      };

      results.push(stageResult);

      if (stageResult.passed) {
        logger.info('  ✅ Passou (${stageResult.durationMs}ms)');
      } else {
        logger.info('  ❌ Falhou (${stageResult.durationMs}ms, exit: ${stageResult.exitCode})');
        logger.info('  ${result.stderr?.slice(0, 300) || result.stdout?.slice(0, 300) || \'\'}');
      }

      if (onStage) onStage(stageResult);

      // Stop pipeline if stage failed
      if (!stageResult.passed) break;

    } catch (err: unknown) {
      const stageResult: StageResult = {
        stage: stage.name,
        passed: false,
        durationMs: Date.now() - start,
        output: err instanceof Error ? err.message : String(err),
        exitCode: 1,
      };
      results.push(stageResult);
      if (onStage) onStage(stageResult);
      break;
    }
  }

  return results;
}
