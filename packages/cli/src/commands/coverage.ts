import { Command } from 'commander';
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
        console.log(`⚠ ${result.message}`);
        return;
      }
      if (!result.data) return;
      const data = result.data;
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      console.log(`📊 Cobertura geral: ${data.average}%`);
      console.log(`   Lines: ${data.overall.lines}%`);
      console.log(`   Branches: ${data.overall.branches}%`);
      console.log(`   Functions: ${data.overall.functions}%`);
      console.log(`   Statements: ${data.overall.statements}%`);
      console.log(`\n📁 Arquivos: ${data.fileCount}`);
      console.log(`🔴 Gaps encontrados: ${data.gaps.length}\n`);

      if (data.gaps.length > 0) {
        const ranked: Record<string, typeof data.gaps> = { critical: [], important: [], optional: [], cosmetic: [] };
        for (const g of data.gaps) ranked[g.severity]?.push(g);
        for (const [severity, items] of Object.entries(ranked)) {
          if (items.length > 0) {
            const icon = severity === 'critical' ? '🔴' : severity === 'important' ? '🟠' : severity === 'optional' ? '🟡' : '🟢';
            console.log(`${icon} ${severity.toUpperCase()}: ${items.length}`);
            for (const g of items.slice(0, 3)) {
              console.log(`     ${g.file} — ${g.reason.substring(0, 80)}`);
            }
            if (items.length > 3) console.log(`     ... e mais ${items.length - 3} gaps`);
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
        console.log(`⚠ ${result.message}`);
        return;
      }
      if (!result.data) return;
      const data = result.data;
      if (options.json) {
        console.log(JSON.stringify(data.gaps, null, 2));
        return;
      }
      if (data.gaps.length === 0) {
        console.log('✅ Nenhum gap encontrado. Cobertura está dentro da meta.');
        return;
      }
      console.log(`📋 Gaps priorizados (${data.total}):\n`);
      for (const g of data.gaps) {
        const icon = g.severity === 'critical' ? '🔴' : g.severity === 'important' ? '🟠' : g.severity === 'optional' ? '🟡' : '🟢';
        console.log(`${icon} [${g.severity.toUpperCase()}] ${g.file}`);
        console.log(`   ${g.reason.substring(0, 100)}`);
        console.log(`   Recomendação: ${g.recommendation}`);
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
        console.log(`⚠ ${result.message}`);
        return;
      }
      if (!result.data) return;
      const data = result.data;
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      const repairStatus = data.status as { gapsFound: number; currentFocus?: string; nextAction: string; blocked: boolean };
      console.log(`🔧 Ciclo de reparo concluído`);
      console.log(`   Gaps encontrados: ${repairStatus.gapsFound}`);
      console.log(`   Gaps reparados: ${data.repaired.length}`);
      console.log(`   Cobertura atual: ${data.coverage}%`);
      console.log(`   Foco atual: ${repairStatus.currentFocus ?? 'N/A'}`);
      console.log(`   Próxima ação: ${repairStatus.nextAction}`);
      console.log(`   Bloqueado: ${repairStatus.blocked ? 'Sim' : 'Não'}`);
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
      console.log('📊 Status da Autonomia de Testes');
      console.log('═══════════════════════════════════');
      console.log(`   Cobertura atual: ${data.current}%`);
      console.log(`   Gaps: ${data.gaps}`);
      console.log(`   Alvo: ${data.target}%`);

      const persisted = data.persisted as { lastRunAt?: string; gapsResolved: number; currentFocus?: string; nextAction?: string; blocked: boolean; reason?: string } | null;
      if (persisted) {
        console.log(`\n   Último ciclo: ${persisted.lastRunAt ?? 'N/A'}`);
        console.log(`   Gaps resolvidos: ${persisted.gapsResolved}`);
        console.log(`   Foco: ${persisted.currentFocus ?? 'N/A'}`);
        console.log(`   Próximo: ${persisted.nextAction ?? 'N/A'}`);
        console.log(`   Bloqueado: ${persisted.blocked ? '🔴 Sim' : '✅ Não'}`);
        if (persisted.reason) console.log(`   Razão: ${persisted.reason}`);
      } else {
        console.log('\n   ⚠ Nenhum ciclo de reparo foi executado ainda.');
        console.log('   Execute: ai-devkit coverage repair');
      }
    });

  return cmd;
}
