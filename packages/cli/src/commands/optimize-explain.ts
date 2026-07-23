import path from 'node:path';
import { printHeader, printLine, finish } from "../utils/output";
import { dryRunPipeline, modeLabel, estimateTokensSaved, PipelineRequest } from '../runtime/pipeline-orchestrator';
import { readRequestJson } from './optimize-pipeline';

export function handleOptimizeExplain(
  requestFile: string,
  options: { json?: boolean },
): void {
  const cwd = process.cwd();
  const req = readRequestJson(path.resolve(cwd, requestFile));
  if (!req) {
    printLine('[ERROR] Request file not found or invalid');
    finish({ checkpoint: 'explain', ok: false, status: 'failed', context_summary: 'Request invalido' });
    return;
  }

  const pipelineReq: PipelineRequest = {
    description: (req.description as string) || '',
    files: (req.files as string[]) || [],
    title: (req.title as string) || '',
    labels: (req.labels as string[]) || [],
  };

  const report = dryRunPipeline(pipelineReq);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHeader('Pipeline Explanation');
    printLine(`Task Type: ${report.taskType}`);
    printLine(`Pipeline Mode: ${report.mode} (${modeLabel(report.mode)})`);
    printLine(`Reason: ${report.modeReason}`);
    printLine('');
    printLine(`Stages (${report.stages.length}):`);
    for (const stage of report.stages) {
      printLine(`  ▶ ${stage.name}: ${stage.description}`);
    }
    printLine('');

    if (report.mode !== 'full') {
      const saved = estimateTokensSaved(report.mode, 12, report.stages.length);
      printLine(`Tokens saved vs full pipeline: ~${saved.toLocaleString()}`);
    }
  }

  finish({ checkpoint: 'explain', ok: true, status: 'passed', context_summary: `Pipeline ${report.mode} com ${report.stages.length} etapas` });
}
