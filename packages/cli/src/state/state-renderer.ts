import { DevkitState } from './state-types';

export function renderStateMarkdown(state: DevkitState): string {
  const lines: string[] = [];

  lines.push('# Estado consolidado do ai-devkit');
  lines.push('');
  lines.push('## Resumo');
  lines.push(state.summary);
  lines.push('');
  lines.push('## Blocos');
  for (const block of state.blocks) {
    lines.push(`### ${block.title}`);
    lines.push(`- Status: ${block.status}`);
    lines.push(`- Resumo: ${block.summary}`);
    lines.push('- Evidências:');
    for (const evidence of block.evidence) {
      lines.push(`  - ${evidence}`);
    }
    if (block.risks?.length) {
      lines.push('- Riscos:');
      for (const risk of block.risks) {
        lines.push(`  - ${risk}`);
      }
    }
    lines.push('');
  }

  lines.push('## Métricas');
  for (const metric of state.metrics) {
    lines.push(`- ${metric.name}: ${String(metric.value)}${metric.unit ? ` ${metric.unit}` : ''}`);
  }

  lines.push('');
  lines.push('## Artefatos');
  for (const artifact of state.artifacts) {
    lines.push(`- ${artifact.path} (${artifact.status}) — ${artifact.purpose}`);
  }

  lines.push('');
  lines.push('## Comandos');
  for (const command of state.commands) {
    lines.push(`- ${command.command} (${command.status}) — ${command.purpose}`);
  }

  lines.push('');
  lines.push('## Bloqueadores');
  for (const blocker of state.blockers) {
    lines.push(`- ${blocker}`);
  }

  lines.push('');
  lines.push('## Próximos passos');
  for (const step of state.nextSteps) {
    lines.push(`- ${step}`);
  }

  lines.push('');
  lines.push('## Atualizado em');
  lines.push(state.lastUpdated);

  return lines.join('\n');
}

export function renderStateJSON(state: DevkitState): string {
  return JSON.stringify(state, null, 2);
}
