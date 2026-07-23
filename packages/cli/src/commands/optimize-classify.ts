import path from 'node:path';
import { printHeader, printLine, finish } from "../utils/output";
import { classify, classifyAndExplain, TASK_TYPE_LABELS, extractRouting } from '../runtime/classifier';
import { readRequestJson } from './optimize-pipeline';

export function handleOptimizeClassify(
  requestFile: string,
  options: { explain?: boolean; json?: boolean },
): void {
  const cwd = process.cwd();
  const req = readRequestJson(path.resolve(cwd, requestFile));
  if (!req) {
    printLine('[ERROR] Arquivo de request invalido ou nao encontrado');
    finish({ checkpoint: 'classify', ok: false, status: 'failed', context_summary: 'Request invalido' });
    return;
  }

  const classificationReq = {
    description: (req.description as string) || '',
    files: (req.files as string[]) || [],
    title: (req.title as string) || '',
    labels: (req.labels as string[]) || [],
  };

  if (options.explain) {
    const { result, explanation } = classifyAndExplain(classificationReq);
    if (options.json) {
      console.log(JSON.stringify({ result, explanation }, null, 2));
    } else {
      printHeader('Classificacao de Tarefa');
      console.log(explanation);
    }
    finish({ checkpoint: 'classify', ok: true, status: 'passed', context_summary: `Classificado como ${result.taskType} (${result.confidence}%)` });
    return;
  }

  const result = classify(classificationReq);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const routing = extractRouting(result.taskType);
    printHeader('Classificacao de Tarefa');
    printLine(`Tipo: ${TASK_TYPE_LABELS[result.taskType]} (${result.taskType})`);
    printLine(`Confianca: ${result.confidence}%`);
    if (result.requiresManualReview) printLine('⚠ Confianca baixa — revisao manual recomendada');
    printLine('');
    printLine('Pipeline:');
    for (const step of routing.pipeline) printLine(`  - ${step}`);
    printLine('');
    printLine(`Contexto: ${routing.context}`);
    printLine(`Agentes: ${routing.agents.join(', ')}`);
    printLine(`Budget: ${routing.budget}`);
    printLine(`Risco: ${routing.risk}`);
    if (result.secondaryTypes.length > 0) {
      printLine('');
      printLine('Tipos secundarios:');
      for (const s of result.secondaryTypes) printLine(`  - ${TASK_TYPE_LABELS[s.taskType]}: ${s.confidence}%`);
    }
  }

  finish({ checkpoint: 'classify', ok: true, status: 'passed', context_summary: `Classificado como ${result.taskType} (${result.confidence}%)` });
}
