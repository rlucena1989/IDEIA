import { Command } from 'commander';
import { buildPlatformState } from '../platform/platform-builder';
import { verifyPlatform } from '../platform/platform-verifier';
import { packagePlatform } from '../platform/platform-packager';
import { deployPlatform } from '../platform/platform-deployer';
import { planPlatformMaintenance } from '../platform/platform-maintenance';
import { finishPlatform } from '../platform/platform-finish';
import { buildPlatformReport } from '../platform/platform-report';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const ALL_MODULES = [
  'state', 'hardening', 'generation', 'prompts', 'evolution',
  'adaptive', 'context', 'publication', 'distribution',
  'telemetry', 'resilience', 'governance', 'agents',
  'strategy', 'simulation', 'consolidation', 'autonomous',
  'federation', 'self-evolution', 'platform',
];

const ALL_POLICIES = [
  'distribution-policy', 'context-policy', 'evolution-policy',
  'resilience-policy', 'telemetry-policy', 'strategy-policy',
  'scenario-policy', 'continuity-policy', 'agent-policy',
  'federation-policy', 'self-evolution-policy',
];

export function platformCommand(): Command {
  const cmd = new Command('platform')
    .description('Plataforma operacional completa — Fase 24');

  cmd
    .command('build')
    .description('Constrói estado da plataforma')
    .option('--name <name>', 'Nome', 'ai-devkit')
    .option('--version <version>', 'Versão', '24.0.0')
    .option('--health <score>', 'Health score', '92')
    .option('--autonomy <level>', 'Nível de autonomia', 'assisted')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const state = buildPlatformState({
          name: opts.name, version: opts.version,
          healthScore: parseInt(opts.health, 10),
          autonomyLevel: opts.autonomy,
          modules: ALL_MODULES,
          policies: ALL_POLICIES,
        });
        const envelope = createEnvelope({
          ok: true, command: 'platform build', version: getCliVersion(), data: state,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Plataforma');
        printLine(`  ${state.name} v${state.version}`);
        printLine(`  Status: ${state.status} | Saúde: ${state.healthScore}`);
        printLine(`  Autonomia: ${state.autonomyLevel}`);
        printLine(`  Módulos: ${state.modules.length}`);
        printLine(`  Políticas: ${state.policies.length}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao construir: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('verify')
    .description('Verifica integridade final da plataforma')
    .option('--health <score>', 'Health score', '92')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const state = buildPlatformState({
          name: 'ai-devkit', version: '24.0.0',
          healthScore: parseInt(opts.health, 10),
          autonomyLevel: 'assisted',
          modules: ALL_MODULES,
          policies: ALL_POLICIES,
        });
        const verification = verifyPlatform(state);
        const envelope = createEnvelope({
          ok: verification.ok, command: 'platform verify', version: getCliVersion(), data: verification,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Verificação Final');
        printResult('Integridade', verification.ok);
        for (const issue of verification.issues) printLine(`  ⚠ ${issue}`);
        for (const note of verification.notes) printLine(`  → ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na verificação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('package')
    .description('Empacota distribuição da plataforma')
    .option('--version <version>', 'Versão', '24.0.0')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const state = buildPlatformState({
          name: 'ai-devkit', version: opts.version,
          healthScore: 92, autonomyLevel: 'assisted',
          modules: ALL_MODULES, policies: ALL_POLICIES,
        });
        const pkg = packagePlatform(state);
        const envelope = createEnvelope({
          ok: true, command: 'platform package', version: getCliVersion(), data: pkg,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Pacote da Plataforma');
        printLine(`  Versão: ${pkg.version}`);
        printLine(`  Conteúdos: ${pkg.contents.length} itens`);
        printLine(`  ID: ${pkg.packageId.substring(0, 12)}...`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no pacote: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Relatório completo da plataforma')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const state = buildPlatformState({
          name: 'ai-devkit', version: '24.0.0',
          healthScore: 92, autonomyLevel: 'assisted',
          modules: ALL_MODULES, policies: ALL_POLICIES,
        });
        const verification = verifyPlatform(state);
        const pkg = packagePlatform(state);
        const maintenance = planPlatformMaintenance(state);
        const finish = finishPlatform(state);
        const report = buildPlatformReport({ state, verification, pkg, finish, maintenance });
        const envelope = createEnvelope({
          ok: verification.ok, command: 'platform report', version: getCliVersion(), data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório da Plataforma');
        for (const s of report.summary) printLine(`  ℹ ${s}`);
        printLine(`  Módulos: ${report.state.modules.length} carregados`);
        printLine(`  Políticas: ${report.state.policies.length} registradas`);
        printLine(`  Tarefas de manutenção: ${report.maintenance.length}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
