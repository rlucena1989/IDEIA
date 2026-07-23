import { Command } from 'commander';
import { createTargetState, TargetState, TargetCapability } from '../strategy/target-state';
import { buildRoadmap } from '../strategy/roadmap-builder';
import { RoadmapItem, Roadmap } from '../strategy/roadmap-types';
import { analyzeGaps } from '../strategy/gap-analyzer';
import { prioritizeStrategy } from '../strategy/strategy-prioritizer';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function roadmapCommand(): Command {
  const cmd = new Command('roadmap')
    .description('Roadmap estratégico e evolução — Fase 18');

  cmd
    .command('define')
    .description('Define um estado alvo')
    .argument('<name>', 'Nome do estado alvo')
    .argument('<description>', 'Descrição')
    .option('--risk <risk>', 'Nível de risco', 'medium')
    .option('--json', 'Saída em JSON')
    .action((name: string, description: string, opts) => {
      try {
        const target = createTargetState({ name, description, riskLevel: opts.risk });
        const envelope = createEnvelope({
          ok: true, command: 'roadmap define', version: getCliVersion(), data: target,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Estado Alvo');
        printLine(`  Nome: ${target.name}`);
        printLine(`  Risco: ${target.riskLevel}`);
        printLine(`  ID: ${target.targetId.substring(0, 12)}...`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao definir: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('analyze')
    .description('Analisa gaps entre estado atual e alvo')
    .argument('<capabilities>', 'Capacidades atuais em JSON array string')
    .option('--json', 'Saída em JSON')
    .action((capsStr: string, opts) => {
      try {
        const currentCaps: string[] = JSON.parse(capsStr);
        const target = createTargetState({
          name: 'CLI Consolidado', description: 'Sistema completo',
          capabilities: [
            { id: 'state', name: 'Estado', description: 'Estado consolidado', required: true },
            { id: 'generation', name: 'Geração', description: 'Geração de artefatos', required: true },
            { id: 'governance', name: 'Governança', description: 'Governança', required: true },
          ],
        });
        const gaps = analyzeGaps(target, currentCaps);
        const envelope = createEnvelope({
          ok: true, command: 'roadmap analyze', version: getCliVersion(), data: { gaps, target },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Análise de Gaps');
        printLine(`  Capacidades atuais: ${currentCaps.length}`);
        printLine(`  Gaps encontrados: ${gaps.length}`);
        for (const gap of gaps) {
          const icon = gap.severity === 'critical' ? '❌' : gap.severity === 'high' ? '⚠️' : '⚡';
          printLine(`  ${icon} [${gap.category}] ${gap.description}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na análise: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('build')
    .description('Constrói roadmap a partir de items')
    .argument('<items>', 'Items do roadmap em JSON array string')
    .option('--target-name <name>', 'Nome do alvo', 'CLI Consolidado')
    .option('--json', 'Saída em JSON')
    .action((itemsStr: string, opts) => {
      try {
        const items: RoadmapItem[] = JSON.parse(itemsStr);
        const target = createTargetState({ name: opts.targetName, description: '' });
        const roadmap = buildRoadmap(target, items);
        const envelope = createEnvelope({
          ok: true, command: 'roadmap build', version: getCliVersion(), data: roadmap,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Roadmap');
        printLine(`  ID: ${roadmap.roadmapId.substring(0, 12)}...`);
        printLine(`  Items: ${roadmap.items.length}`);
        for (const item of roadmap.items) {
          printLine(`  ${item.priority}. ${item.title} (esforço: ${item.effort}, risco: ${item.risk})`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao construir: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('prioritize')
    .description('Prioriza items do roadmap com base em gaps')
    .argument('<items>', 'Items em JSON array string')
    .option('--critical-gap', 'Simula gap crítico', false)
    .option('--json', 'Saída em JSON')
    .action((itemsStr: string, opts) => {
      try {
        const items: RoadmapItem[] = JSON.parse(itemsStr);
        const gaps = opts.criticalGap
          ? [{ gapId: 'g1', category: 'functional' as const, description: 'Critical gap', severity: 'critical' as const }]
          : [];
        const prioritized = prioritizeStrategy(gaps, items);
        const envelope = createEnvelope({
          ok: true, command: 'roadmap prioritize', version: getCliVersion(), data: { prioritized },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Priorização Estratégica');
        for (const item of prioritized) {
          printLine(`  ${item.priority}. ${item.title} (valor: ${item.value})`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na priorização: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
