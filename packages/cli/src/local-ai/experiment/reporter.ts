import { ExperimentRun, ExperimentReport } from './types';

/**
 * Constrói report.
 * @param run - Executa run.
 * @returns O resultado da operação.
 */
export function buildReport(run: ExperimentRun): ExperimentReport {
  const successful = run.results.filter(r => r.status === 'success');
  const fastest = successful.reduce((a, b) => a.latencyMs < b.latencyMs ? a : b, successful[0]);
  const cheapest = successful.reduce((a, b) => a.costUsd < b.costUsd ? a : b, successful[0]);
  const mostTokens = successful.reduce((a, b) => a.tokensOut > b.tokensOut ? a : b, successful[0]);
  const ranking = [...run.results].filter(r => r.qualityScore !== undefined).sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));

  return {
    experimentId: run.id,
    promptHash: run.promptHash,
    totalModels: run.results.length,
    fastest: fastest ? { modelId: fastest.modelId, latencyMs: fastest.latencyMs } : { modelId: '(nenhum)', latencyMs: 0 },
    cheapest: cheapest ? { modelId: cheapest.modelId, costUsd: cheapest.costUsd } : { modelId: '(nenhum)', costUsd: 0 },
    mostTokens: mostTokens ? { modelId: mostTokens.modelId, tokensOut: mostTokens.tokensOut } : { modelId: '(nenhum)', tokensOut: 0 },
    results: run.results,
    ranking: ranking.length > 0 ? ranking : undefined,
  };
}

/**
 * Formata report markdown.
 * @param report - Valor report.
 * @returns O resultado da operação.
 */
export function formatReportMarkdown(report: ExperimentReport): string {
  const lines: string[] = [];
  lines.push('# Relatório de Experimento A/B');
  lines.push('');
  lines.push(`**Experimento:** \`${report.experimentId}\``);
  lines.push(`**Prompt Hash:** \`${report.promptHash}\``);
  lines.push(`**Modelos testados:** ${report.totalModels}`);
  lines.push('');
  lines.push('## Resumo');
  lines.push('');
  lines.push(`| Métrica | Modelo | Valor |`);
  lines.push(`|---------|-------|------|`);
  lines.push(`| ⚡ Mais rápido | \`${report.fastest.modelId}\` | ${report.fastest.latencyMs}ms |`);
  lines.push(`| 💰 Mais barato | \`${report.cheapest.modelId}\` | $${report.cheapest.costUsd.toFixed(6)} |`);
  lines.push(`| 📝 Mais tokens | \`${report.mostTokens.modelId}\` | ${report.mostTokens.tokensOut} tokens |`);
  lines.push('');

  if (report.ranking) {
    lines.push('## Ranking por Qualidade');
    lines.push('');
    lines.push('| # | Modelo | Provider | Quality Score | Latência | Custo |');
    lines.push('|---|--------|----------|---------------|----------|-------|');
    report.ranking.forEach((r, i) => {
      lines.push(`| ${i + 1} | \`${r.modelId}\` | ${r.provider} | ${r.qualityScore ?? '-'} | ${r.latencyMs}ms | $${r.costUsd.toFixed(6)} |`);
    });
    lines.push('');
  }

  lines.push('## Resultados Detalhados');
  lines.push('');
  for (const r of report.results) {
    const status = r.status === 'success' ? '✅' : r.status === 'timeout' ? '⏰' : '❌';
    lines.push(`### ${status} \`${r.modelId}\` (${r.provider})`);
    lines.push('');
    lines.push(`- **Status:** ${r.status}`);
    if (r.status === 'success') {
      lines.push(`- **Latência:** ${r.latencyMs}ms`);
      lines.push(`- **Tokens In/Out:** ${r.tokensIn}/${r.tokensOut}`);
      lines.push(`- **Custo:** $${r.costUsd.toFixed(6)}`);
      if (r.qualityScore !== undefined) lines.push(`- **Quality Score:** ${r.qualityScore}/100`);
      lines.push(`- **Resposta (primeiros 300 chars):**`);
      lines.push(`  \`\`\``);
      lines.push(`  ${r.response.substring(0, 300).replace(/`/g, '\\`')}`);
      lines.push(`  \`\`\``);
    } else {
      lines.push(`- **Erro:** ${r.error || 'desconhecido'}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Formata report json.
 * @param report - Valor report.
 * @returns O resultado da operação.
 */
export function formatReportJson(report: ExperimentReport): string {
  return JSON.stringify(report, null, 2);
}
