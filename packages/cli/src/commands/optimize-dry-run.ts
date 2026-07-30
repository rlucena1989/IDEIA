import path from 'node:path';
import { createLogger } from '@ideia/logger';
import { printHeader, printLine, finish } from "../utils/output";
import {
  buildPipeline,
  executeStages,
  formatPipelineReport,
  PipelineMode,
  PipelineRequest,
} from '../runtime/pipeline-orchestrator';
import { readRequestJson } from './optimize-pipeline';

export function handleOptimizeDryRun(
  requestFile: string,
  options: { pipeline?: string; json?: boolean },
): void {
  const cwd = process.cwd();
  const req = readRequestJson(path.resolve(cwd, requestFile));
  if (!req) {
    printLine('[ERROR] Request file not found or invalid');
    finish({ checkpoint: 'dryrun', ok: false, status: 'failed', context_summary: 'Request invalido' });
    return;
  }

  const modeOverride = options.pipeline as PipelineMode | undefined;
  const pipelineReq: PipelineRequest = {
    description: (req.description as string) || '',
    files: (req.files as string[]) || [],
    title: (req.title as string) || '',
    labels: (req.labels as string[]) || [],
  };

  const pipeline = buildPipeline(pipelineReq, modeOverride);
  const report = executeStages(pipeline, () => ({
    id: pipeline.stages[0]?.id || '',
    status: 'passed',
    durationMs: Math.floor(Math.random() * 150) + 20,
  }));

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHeader('Dry Run');
    printLine(formatPipelineReport(report));
  }

  finish({ checkpoint: 'dryrun', ok: true, status: 'passed', context_summary: `Dry-run ${pipeline.mode}: ${report.passed}/${report.stages.length} passed` });
}
