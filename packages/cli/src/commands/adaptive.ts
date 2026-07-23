import { Command } from 'commander';
import * as _crypto from 'node:crypto';
import { PatternStore } from '../adaptive/pattern-store';
import { analyzePatterns } from '../adaptive/pattern-analyzer';
import { computeAdaptiveScores } from '../adaptive/adaptive-score';
import { recommendActions } from '../adaptive/recommendation-engine';
import { controlCycle } from '../adaptive/cycle-controller';
import { buildAdaptiveReport } from '../adaptive/adaptive-report';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const store = new PatternStore();

function seedEvents(): void {
  store.clear();
  store.createAndAddEvent({ type: 'consistency', command: 'harden check', outcome: 'warning', scoreBefore: 70, scoreAfter: 72, metadata: { area: 'docs' } });
  store.createAndAddEvent({ type: 'consistency', command: 'harden check', outcome: 'warning', scoreBefore: 72, scoreAfter: 73, metadata: { area: 'docs' } });
  store.createAndAddEvent({ type: 'consistency', command: 'harden check', outcome: 'warning', scoreBefore: 73, scoreAfter: 71, metadata: { area: 'docs' } });
  store.createAndAddEvent({ type: 'evolution', command: 'evolve run repair', outcome: 'ok', scoreBefore: 65, scoreAfter: 80 });
  store.createAndAddEvent({ type: 'evolution', command: 'evolve run repair', outcome: 'ok', scoreBefore: 68, scoreAfter: 82 });
  store.createAndAddEvent({ type: 'generation', command: 'generate demand', outcome: 'failed', scoreBefore: 60, scoreAfter: 60, metadata: { reason: 'missing scope' } });
  store.createAndAddEvent({ type: 'generation', command: 'generate demand', outcome: 'failed', scoreBefore: 60, scoreAfter: 62, metadata: { reason: 'missing scope' } });
}

export function adaptiveCommand(): Command {
  const cmd = new Command('adaptive')
    .description('Autonomia assistida com ciclos adaptativos — Fase 11');

  cmd
    .command('events')
    .description('Lista eventos operacionais registrados')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula eventos de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedEvents();
        const events = store.listEvents();
        const envelope = createEnvelope({
          ok: true, command: 'adaptive events', version: getCliVersion(),
          data: { count: events.length, events },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Eventos Operacionais');
        printLine(`  Total: ${events.length}`);
        for (const event of events.slice(0, 10)) {
          const icon = event.outcome === 'ok' ? '✅' : event.outcome === 'warning' ? '⚠️' : event.outcome === 'blocked' ? '❌' : '🔥';
          printLine(`  ${icon} [${event.type}] ${event.command} → ${event.outcome}`);
          if (event.scoreBefore !== undefined) printLine(`     Score: ${event.scoreBefore} → ${event.scoreAfter}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar eventos: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('analyze')
    .description('Analisa eventos e detecta padrões recorrentes')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula eventos de exemplo antes de analisar')
    .action((opts) => {
      try {
        if (opts.seed) seedEvents();
        const events = store.listEvents();
        const patterns = analyzePatterns(events);
        store.setPatterns(patterns);
        const envelope = createEnvelope({
          ok: true, command: 'adaptive analyze', version: getCliVersion(),
          data: { patternCount: patterns.length, patterns },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Análise de Padrões');
        printLine(`  Eventos analisados: ${events.length}`);
        printLine(`  Padrões detectados: ${patterns.length}`);
        for (const pattern of patterns) {
          const icon = pattern.impact === 'critical' ? '❌' : pattern.impact === 'high' ? '⚠️' : pattern.impact === 'medium' ? '⚡' : '✅';
          printLine(`  ${icon} ${pattern.name}`);
          printLine(`     Frequência: ${pattern.frequency} | Confiança: ${(pattern.confidence * 100).toFixed(0)}%`);
          printLine(`     Ação recomendada: ${pattern.recommendedAction}`);
          printLine(`     Gatilhos: ${pattern.triggers.join(', ')}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na análise: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('recommend')
    .description('Gera recomendações baseadas em padrões')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula eventos de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedEvents();
        const events = store.listEvents();
        const patterns = analyzePatterns(events);
        const recommendations = recommendActions(patterns);
        const envelope = createEnvelope({
          ok: true, command: 'adaptive recommend', version: getCliVersion(),
          data: { recommendations },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Recomendações');
        for (const rec of recommendations) {
          const icon = rec.priority === 'critical' ? '❌' : rec.priority === 'high' ? '⚠️' : rec.priority === 'medium' ? '⚡' : '✅';
          printLine(`  ${icon} [${rec.priority}] ${rec.action}`);
          printLine(`     Motivo: ${rec.reason}`);
          printLine(`     Confiança: ${(rec.confidence * 100).toFixed(0)}%`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao gerar recomendações: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('cycle')
    .description('Controla ciclo adaptativo: analyze → recommend → control')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula eventos de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedEvents();
        const events = store.listEvents();
        const patterns = analyzePatterns(events);
        store.setPatterns(patterns);
        const scores = computeAdaptiveScores(patterns);
        const recommendations = recommendActions(patterns);
        const cycle = controlCycle(recommendations);
        const envelope = createEnvelope({
          ok: cycle.nextAction !== 'block', command: 'adaptive cycle', version: getCliVersion(),
          data: { scores, recommendations, cycle },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Ciclo Adaptativo');
        printLine(`  Próxima ação: ${cycle.nextAction}`);
        printLine(`  Repetir: ${cycle.shouldRepeat} | Escalar: ${cycle.shouldEscalate}`);
        printLine(`  Pesos adaptativos:`);
        printLine(`     Consistency: ${scores.consistencyWeight.toFixed(2)}`);
        printLine(`     Hardening: ${scores.hardeningWeight.toFixed(2)}`);
        printLine(`     Generation: ${scores.generationWeight.toFixed(2)}`);
        printLine(`     Evolution: ${scores.evolutionWeight.toFixed(2)}`);
        for (const note of cycle.notes) printLine(`  → ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no ciclo: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Gera relatório completo adaptativo')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula eventos de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedEvents();
        const events = store.listEvents();
        const patterns = analyzePatterns(events);
        store.setPatterns(patterns);
        const scores = computeAdaptiveScores(patterns);
        const recommendations = recommendActions(patterns);
        const cycle = controlCycle(recommendations);
        const report = buildAdaptiveReport({ events, patterns, scores, recommendations, cycleControl: cycle });
        const envelope = createEnvelope({
          ok: cycle.nextAction !== 'block', command: 'adaptive report', version: getCliVersion(),
          data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório Adaptativo');
        for (const s of report.summary) printLine(`  ℹ ${s}`);
        printLine(`  Gerado em: ${report.generatedAt}`);
        printResult('Status', cycle.nextAction !== 'block', cycle.nextAction);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
