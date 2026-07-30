import type { ScorecardResult } from './scorecard';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.scorecard-display');
import { root, read, git, gitExists } from './scorecard-utils';

/**
 * Imprime print.
 * @param result - Valor result.
 */
export function print(result: ScorecardResult): void {
  const g = result.overallScore >= 90 ? '🟢' : result.overallScore >= 70 ? '🟡' : result.overallScore >= 50 ? '🟠' : '🔴';
  logger.info(`\n${'═'.repeat(57)}╗`);
  logger.info('║        AI-DEVKIT SCORECARD DE MATURIDADE v18              ║');
  logger.info(`╚${'═'.repeat(57)}╝\n`);
  logger.info(`  ${g} Score: ${result.overallScore}/100  |  Nivel ${result.maturityLevel}  |  ${result.meta.durationMs}ms`);
  logger.info(`  ${result.evolution.categories} categorias, ${result.evolution.items} itens  |  ${result.git.branch}@${result.git.commit}`);
  logger.info('  Badge: .ai/reports/scorecard/badge.svg');
  const customCount = result.categories.filter((c) => c.name.startsWith('Custom:')).length;
  if (customCount > 0) logger.info(`  Custom checks: ${customCount} categorias\n`);
  else console.log();

  for (const cat of result.categories) {
    if (cat.weight === 0 && cat.items.every((i) => i.passed)) continue;
    const bar = '█'.repeat(Math.round(cat.score / 10)) + '░'.repeat(10 - Math.round(cat.score / 10));
    logger.info(`  ${cat.name} (${cat.weight}%): ${bar} ${Math.round(cat.score)}/100`);
    for (const i of cat.items) {
      const v = i.value !== undefined ? ` (${i.value})` : '';
      logger.info(`    ${i.passed ? '✅' : '❌'} ${i.description}${v}`);
    }
    console.log();
  }
  if (result.correlationAlerts.length > 0) {
    logger.info('  CORRELAÇÕES:\n');
    result.correlationAlerts
      .slice(0, 3)
      .forEach((a) => logger.info(`  ${a.severity === 'critical' ? '🔴' : a.severity === 'warn' ? '🟡' : '🔵'} ${a.message}`));
    console.log();
  }
  if (result.forecast.history && result.forecast.history.length >= 3) {
    const arrow = result.forecast.trend === 'up' ? '📈' : result.forecast.trend === 'down' ? '📉' : '➡️';
    logger.info(`  ${arrow} Previsão 30d: ${result.forecast.forecast}/100 (${result.forecast.confidence})\n`);
  }
  if (result.alerts.length > 0) {
    logger.info('  ALERTAS:\n');
    result.alerts.slice(0, 5).forEach((a) => logger.info(`  🔴 [${a.category}] ${a.message}`));
    console.log();
  }
  if (result.recommendations.length > 0) {
    logger.info('  RECOMENDACOES (top 10):\n');
    result.recommendations.slice(0, 10).forEach((r, i) => logger.info(`  ${i + 1}. ${r.text}`));
    console.log();
  }
  if (result.trends.length >= 2) {
    const d = result.overallScore - result.trends[result.trends.length - 2].overallScore;
    logger.info(`  📈 Tendencia: ${d > 0 ? '+' : ''}${d} pontos desde o ultimo\n`);
  }
  logger.info(`  ${'═'.repeat(57)}`);
  logger.info(`  Maturidade: ${result.maturityLevel} (${result.overallScore}/100) — v${result.evolution.version}`);
  logger.info(`  ${'═'.repeat(57)}\n`);
}
