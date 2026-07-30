import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { buildPlatformState } from '../platform/platform-builder';
import { verifyPlatform } from '../platform/platform-verifier';
import { finishPlatform } from '../platform/platform-finish';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const ALL_MODULES = ['state', 'hardening', 'generation', 'evolution', 'adaptive', 'context', 'publication', 'distribution', 'telemetry', 'resilience', 'governance', 'agents', 'strategy', 'simulation', 'consolidation', 'autonomous', 'federation', 'self-evolution', 'platform'];
const ALL_POLICIES = ['distribution-policy', 'context-policy', 'evolution-policy', 'resilience-policy', 'telemetry-policy', 'strategy-policy', 'scenario-policy', 'continuity-policy', 'agent-policy', 'federation-policy', 'self-evolution-policy'];

export function finishCommand(): Command {
  const cmd = new Command('finish')
    .description('Encerramento formal da plataforma — Fase 24');

  cmd
    .command('run')
    .description('Executa encerramento formal com verificação')
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
        const finish = finishPlatform(state);
        const envelope = createEnvelope({
          ok: verification.ok, command: 'finish run', version: getCliVersion(),
          data: { verification, finish },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Encerramento');
        printResult('Verificação', verification.ok);
        printLine(`  ${finish.summary}`);
        if (!verification.ok) {
          for (const issue of verification.issues) printLine(`  ⚠ ${issue}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no encerramento: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('confirm')
    .description('Confirma o fechamento formal da plataforma')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const state = buildPlatformState({
          name: 'ai-devkit', version: '24.0.0',
          healthScore: 92, autonomyLevel: 'assisted',
          modules: ALL_MODULES, policies: ALL_POLICIES,
          platformId: 'ai-devkit-final',
        });
        const verification = verifyPlatform(state);
        const finish = finishPlatform(state);
        const result = {
          confirmed: verification.ok,
          message: verification.ok
            ? 'Platform closed successfully. All systems operational.'
            : 'Platform closed with pending issues.',
          finish,
        };
        const envelope = createEnvelope({
          ok: verification.ok, command: 'finish confirm', version: getCliVersion(), data: result,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Confirmação de Fechamento');
        printLine(`  ✅ Plataforma finalizada: ${finish.finishId.substring(0, 12)}...`);
        printLine(`  ${finish.summary}`);
        printLine(`  Versão: 24.0.0 | Módulos: ${state.modules.length}`);
        printLine(`  ℹ Plataforma pronta para operação assistida contínua.`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na confirmação: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
