import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { createTargetState } from '../strategy/target-state';
import { buildRoadmap } from '../strategy/roadmap-builder';
import { analyzeGaps } from '../strategy/gap-analyzer';
import { prioritizeStrategy } from '../strategy/strategy-prioritizer';
import { buildEvolutionPlan } from '../strategy/evolution-roadmap';
import { buildStrategyReport } from '../strategy/strategy-report';
import { RoadmapItem } from '../strategy/roadmap-types';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function strategyCommand(): Command {
  const cmd = new Command('strategy')
    .description('Projeção estratégica e evolução assistida — Fase 18');

  cmd
    .command('target')
    .description('Exibe o estado alvo atual')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const target = createTargetState({
          name: 'CLI Consolidado',
          description: 'Sistema operacional completo com governança, agentes e estratégia',
          capabilities: [
            { id: 'state', name: 'Estado', description: 'Estado consolidado', required: true },
            { id: 'generation', name: 'Geração', description: 'Geração sob demanda', required: true },
            { id: 'governance', name: 'Governança', description: 'Governança operacional', required: true },
            { id: 'agents', name: 'Agentes', description: 'Coordenação multiagente', required: true },
            { id: 'strategy', name: 'Estratégia', description: 'Projeção estratégica', required: true },
          ],
        });
        const envelope = createEnvelope({
          ok: true, command: 'strategy target', version: getCliVersion(), data: target,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Estado Alvo');
        printLine(`  Nome: ${target.name}`);
        printLine(`  Capacidades: ${target.capabilities.length}`);
        for (const cap of target.capabilities) {
          printLine(`  ${cap.required ? '✅' : '📋'} ${cap.name}: ${cap.description}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no target: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('gaps')
    .description('Analisa gaps entre capacidades atuais e alvo')
    .argument('<current-caps>', 'Capacidades atuais em JSON array string')
    .option('--json', 'Saída em JSON')
    .action((capsStr: string, opts) => {
      try {
        const current: string[] = JSON.parse(capsStr);
        const target = createTargetState({
          name: 'CLI Consolidado', description: '',
          capabilities: [
            { id: 'state', name: 'Estado', required: true, description: '' },
            { id: 'generation', name: 'Geração', required: true, description: '' },
            { id: 'governance', name: 'Governança', required: true, description: '' },
            { id: 'agents', name: 'Agentes', required: true, description: '' },
            { id: 'strategy', name: 'Estratégia', required: true, description: '' },
          ],
        });
        const gaps = analyzeGaps(target, current);
        const envelope = createEnvelope({
          ok: true, command: 'strategy gaps', version: getCliVersion(), data: { gaps },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Gaps Estratégicos');
        printLine(`  Gaps: ${gaps.length}`);
        for (const gap of gaps) {
          printLine(`  ❌ ${gap.description} (${gap.severity})`);
        }
        if (gaps.length === 0) printLine('  ✅ Nenhum gap — estado alvo atingido!');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro nos gaps: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('plan')
    .description('Gera plano de evolução completo')
    .argument('<items>', 'Items do roadmap em JSON array string')
    .argument('<current-caps>', 'Capacidades atuais em JSON array string')
    .option('--json', 'Saída em JSON')
    .option('--target-name <name>', 'Nome do alvo', 'CLI Consolidado')
    .action((itemsStr: string, capsStr: string, opts) => {
      try {
        const items: RoadmapItem[] = JSON.parse(itemsStr);
        const current: string[] = JSON.parse(capsStr);
        const target = createTargetState({
          name: opts.targetName, description: '',
          capabilities: [
            { id: 'state', name: 'Estado', required: true, description: '' },
            { id: 'generation', name: 'Geração', required: true, description: '' },
            { id: 'governance', name: 'Governança', required: true, description: '' },
            { id: 'agents', name: 'Agentes', required: true, description: '' },
            { id: 'strategy', name: 'Estratégia', required: true, description: '' },
          ],
        });
        const gaps = analyzeGaps(target, current);
        const roadmap = buildRoadmap(target, items);
        const prioritized = prioritizeStrategy(gaps, roadmap.items);
        const prioritizedRoadmap = { ...roadmap, items: prioritized };
        const evolution = buildEvolutionPlan(prioritizedRoadmap, gaps);
        const envelope = createEnvelope({
          ok: true, command: 'strategy plan', version: getCliVersion(), data: evolution,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Plano de Evolução');
        printLine(`  Gaps: ${evolution.gaps.length}`);
        printLine(`  Roadmap: ${evolution.roadmap.items.length} itens`);
        printLine(`  Próximas ações:`);
        for (const action of evolution.nextActions) printLine(`  → ${action}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no plano: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Relatório completo de estratégia')
    .argument('<items>', 'Items do roadmap em JSON array string')
    .argument('<current-caps>', 'Capacidades atuais em JSON array string')
    .option('--json', 'Saída em JSON')
    .action((itemsStr: string, capsStr: string, opts) => {
      try {
        const items: RoadmapItem[] = JSON.parse(itemsStr);
        const current: string[] = JSON.parse(capsStr);
        const target = createTargetState({
          name: 'CLI Consolidado', description: 'Sistema completo de governança e agentes',
          capabilities: [
            { id: 'state', name: 'Estado', required: true, description: '' },
            { id: 'generation', name: 'Geração', required: true, description: '' },
            { id: 'governance', name: 'Governança', required: true, description: '' },
          ],
        });
        const gaps = analyzeGaps(target, current);
        const roadmap = buildRoadmap(target, items);
        const evolution = buildEvolutionPlan(roadmap, gaps);
        const report = buildStrategyReport({ target, gaps, roadmap, evolution });
        const envelope = createEnvelope({
          ok: true, command: 'strategy report', version: getCliVersion(), data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório Estratégico');
        for (const s of report.summary) printLine(`  ℹ ${s}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
