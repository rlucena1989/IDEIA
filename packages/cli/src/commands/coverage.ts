import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.coverage');
import { handleCoverageAudit, handleCoverageGaps, handleCoverageRepair, handleCoverageStatus, CoverageRepairOutput, CoverageStatusOutput } from '../domain/coverage-service';

export function coverageCommand(): Command {
  const cmd = new Command('coverage');
  cmd.description('Autonomia de testes — audita, prioriza gaps e gerencia ciclo de reparo');

  cmd
    .command('audit')
    .description('Audita a cobertura atual e lista gaps')
    .option('--json', 'Saída em JSON')
    .action((options: { json?: boolean }) => {
      const result = handleCoverageAudit();
      if (!result.ok) {
        logger.info('⚠ ${result.message}');
        return;
      }
      if (!result.data) return;
      const data = result.data;
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      logger.info('📊 Cobertura geral: ${data.average}%');
      logger.info('   Lines: ${data.overall.lines}%');
      logger.info('   Branches: ${data.overall.branches}%');
      logger.info('   Functions: ${data.overall.functions}%');
      logger.info('   Statements: ${data.overall.statements}%');
      logger.info('\n📁 Arquivos: ${data.fileCount}');
      logger.info('🔴 Gaps encontrados: ${data.gaps.length}\n');

      if (data.gaps.length > 0) {
        const ranked: Record<string, typeof data.gaps> = { critical: [], important: [], optional: [], cosmetic: [] };
        for (const g of data.gaps) ranked[g.severity]?.push(g);
        for (const [severity, items] of Object.entries(ranked)) {
          if (items.length > 0) {
            const icon = severity === 'critical' ? '🔴' : severity === 'important' ? '🟠' : severity === 'optional' ? '🟡' : '🟢';
            logger.info('${icon} ${severity.toUpperCase()}: ${items.length}');
            for (const g of items.slice(0, 3)) {
              logger.info('     ${g.file} — ${g.reason.substring(0, 80)}');
            }
            if (items.length > 3) logger.info('     ... e mais ${items.length - 3} gaps');
          }
        }
      }
    });

  cmd
    .command('gaps')
    .description('Lista e prioriza gaps de cobertura')
    .option('--json', 'Saída em JSON')
    .option('--severity <severity>', 'Filtrar por severidade (critical|important|optional|cosmetic)')
    .action((options: { json?: boolean; severity?: string }) => {
      const result = handleCoverageGaps(options.severity);
      if (!result.ok) {
        logger.info('⚠ ${result.message}');
        return;
      }
      if (!result.data) return;
      const data = result.data;
      if (options.json) {
        console.log(JSON.stringify(data.gaps, null, 2));
        return;
      }
      if (data.gaps.length === 0) {
        logger.info('✅ Nenhum gap encontrado. Cobertura está dentro da meta.');
        return;
      }
      logger.info('📋 Gaps priorizados (${data.total}):\n');
      for (const g of data.gaps) {
        const icon = g.severity === 'critical' ? '🔴' : g.severity === 'important' ? '🟠' : g.severity === 'optional' ? '🟡' : '🟢';
        logger.info('${icon} [${g.severity.toUpperCase()}] ${g.file}');
        logger.info('   ${g.reason.substring(0, 100)}');
        logger.info('   Recomendação: ${g.recommendation}');
        console.log();
      }
    });

  cmd
    .command('repair')
    .description('Executa o ciclo de reparo de gaps')
    .option('-n, --max <number>', 'Número máximo de gaps para reparar', '3')
    .option('--json', 'Saída em JSON')
    .action((options: { max?: string; json?: boolean }) => {
      const maxIter = parseInt(options.max ?? '3', 10);
      const result = handleCoverageRepair(maxIter);
      if (!result.ok) {
        logger.info('⚠ ${result.message}');
        return;
      }
      if (!result.data) return;
      const data = result.data;
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      const repairStatus = data.status as { gapsFound: number; currentFocus?: string; nextAction: string; blocked: boolean };
      logger.info('🔧 Ciclo de reparo concluído');
      logger.info('   Gaps encontrados: ${repairStatus.gapsFound}');
      logger.info('   Gaps reparados: ${data.repaired.length}');
      logger.info('   Cobertura atual: ${data.coverage}%');
      logger.info('   Foco atual: ${repairStatus.currentFocus ?? \'N/A\'}');
      logger.info('   Próxima ação: ${repairStatus.nextAction}');
      logger.info('   Bloqueado: ${repairStatus.blocked ? \'Sim\' : \'Não\'}');
    });

  cmd
    .command('status')
    .description('Exibe o status atual da autonomia de testes')
    .option('--json', 'Saída em JSON')
    .action((options: { json?: boolean }) => {
      const result = handleCoverageStatus();
      if (options.json) {
        console.log(JSON.stringify(result.data, null, 2));
        return;
      }
      const data = result.data;
      if (!data) return;
      logger.info('📊 Status da Autonomia de Testes');
      logger.info('═══════════════════════════════════');
      logger.info('   Cobertura atual: ${data.current}%');
      logger.info('   Gaps: ${data.gaps}');
      logger.info('   Alvo: ${data.target}%');

      const persisted = data.persisted as { lastRunAt?: string; gapsResolved: number; currentFocus?: string; nextAction?: string; blocked: boolean; reason?: string } | null;
      if (persisted) {
        logger.info('\n   Último ciclo: ${persisted.lastRunAt ?? \'N/A\'}');
        logger.info('   Gaps resolvidos: ${persisted.gapsResolved}');
        logger.info('   Foco: ${persisted.currentFocus ?? \'N/A\'}');
        logger.info('   Próximo: ${persisted.nextAction ?? \'N/A\'}');
        logger.info('   Bloqueado: ${persisted.blocked ? \'🔴 Sim\' : \'✅ Não\'}');
        if (persisted.reason) logger.info('   Razão: ${persisted.reason}');
      } else {
        logger.info('\n   ⚠ Nenhum ciclo de reparo foi executado ainda.');
        logger.info('   Execute: ai-devkit coverage repair');
      }
    });

  return cmd;
}
