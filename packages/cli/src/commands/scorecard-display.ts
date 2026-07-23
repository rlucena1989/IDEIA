import type { ScorecardResult } from './scorecard';
import { root, read, git, gitExists } from './scorecard-utils';

/**
 * Imprime print.
 * @param result - Valor result.
 */
export function print(result: ScorecardResult): void {
  const g = result.overallScore >= 90 ? '🟢' : result.overallScore >= 70 ? '🟡' : result.overallScore >= 50 ? '🟠' : '🔴';
  console.log(`\n╔${'═'.repeat(57)}╗`);
  console.log(`║        AI-DEVKIT SCORECARD DE MATURIDADE v18              ║`);
  console.log(`╚${'═'.repeat(57)}╝\n`);
  console.log(`  ${g} Score: ${result.overallScore}/100  |  Nivel ${result.maturityLevel}  |  ${result.meta.durationMs}ms`);
  console.log(`  ${result.evolution.categories} categorias, ${result.evolution.items} itens  |  ${result.git.branch}@${result.git.commit}`);
  console.log(`  Badge: .ai/reports/scorecard/badge.svg`);
  const customCount = result.categories.filter(c => c.name.startsWith('Custom:')).length;
  if (customCount > 0) console.log(`  Custom checks: ${customCount} categorias\n`);
  else console.log();

  for (const cat of result.categories) {
    if (cat.weight === 0 && cat.items.every(i => i.passed)) continue;
    const bar = '█'.repeat(Math.round(cat.score / 10)) + '░'.repeat(10 - Math.round(cat.score / 10));
    console.log(`  ${cat.name} (${cat.weight}%): ${bar} ${Math.round(cat.score)}/100`);
    for (const i of cat.items) {
      const v = i.value !== undefined ? ` (${i.value})` : '';
      console.log(`    ${i.passed ? '✅' : '❌'} ${i.description}${v}`);
    }
    console.log();
  }
  if (result.correlationAlerts.length > 0) {
    console.log('  CORRELAÇÕES:\n');
    result.correlationAlerts.slice(0, 3).forEach(a => console.log(`  ${a.severity === 'critical' ? '🔴' : a.severity === 'warn' ? '🟡' : '🔵'} ${a.message}`));
    console.log();
  }
  if (result.forecast.history && result.forecast.history.length >= 3) {
    const arrow = result.forecast.trend === 'up' ? '📈' : result.forecast.trend === 'down' ? '📉' : '➡️';
    console.log(`  ${arrow} Previsão 30d: ${result.forecast.forecast}/100 (${result.forecast.confidence})\n`);
  }
  if (result.alerts.length > 0) {
    console.log('  ALERTAS:\n');
    result.alerts.slice(0, 5).forEach(a => console.log(`  🔴 [${a.category}] ${a.message}`));
    console.log();
  }
  if (result.recommendations.length > 0) {
    console.log('  RECOMENDACOES (top 10):\n');
    result.recommendations.slice(0, 10).forEach((r, i) => console.log(`  ${i + 1}. ${r.text}`));
    console.log();
  }
  if (result.trends.length >= 2) {
    const d = result.overallScore - result.trends[result.trends.length - 2].overallScore;
    console.log(`  📈 Tendencia: ${d > 0 ? '+' : ''}${d} pontos desde o ultimo\n`);
  }
  console.log(`  ${'═'.repeat(57)}`);
  console.log(`  Maturidade: ${result.maturityLevel} (${result.overallScore}/100) — v${result.evolution.version}`);
  console.log(`  ${'═'.repeat(57)}\n`);
}
