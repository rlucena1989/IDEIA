import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { createCircuitBreaker, updateCircuitBreaker, resetCircuitBreaker } from '../resilience/circuit-breaker';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

let breaker = createCircuitBreaker('default', 3);

export function resilienceCommand(): Command {
  const cmd = new Command('resilience')
    .description('Status e controle de resiliência — Fase 15');

  cmd
    .command('status')
    .description('Exibe status atual dos circuit breakers')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const envelope = createEnvelope({
          ok: !breaker.open, command: 'resilience status', version: getCliVersion(),
          data: { breaker },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Status de Resiliência');
        printLine(`  Circuit breaker: ${breaker.name}`);
        printLine(`  Estado: ${breaker.open ? '🔴 ABERTO' : '🟢 FECHADO'}`);
        printLine(`  Falhas: ${breaker.failureCount}/${breaker.threshold}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no status: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('circuit')
    .description('Gerencia circuit breaker (fail/reset)')
    .argument('<action>', 'Ação: fail, reset')
    .option('--json', 'Saída em JSON')
    .action((action: string, opts) => {
      try {
        if (action === 'fail') {
          breaker = updateCircuitBreaker(breaker, true);
        } else if (action === 'reset') {
          breaker = resetCircuitBreaker(breaker);
        } else {
          console.error(`Ação desconhecida: ${action}. Use "fail" ou "reset".`);
          process.exit(1);
        }

        const envelope = createEnvelope({
          ok: !breaker.open, command: 'resilience circuit', version: getCliVersion(),
          data: { breaker },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Circuit Breaker');
        printLine(`  Ação: ${action}`);
        printLine(`  Estado: ${breaker.open ? '🔴 ABERTO' : '🟢 FECHADO'}`);
        printLine(`  Falhas: ${breaker.failureCount}/${breaker.threshold}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no circuit breaker: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('policy')
    .description('Exibe política de resiliência ativa')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const policy = { maxRetries: 3, circuitBreakerThreshold: 3, allowAutoRepair: true, requireApprovalForCritical: true };
        const envelope = createEnvelope({
          ok: true, command: 'resilience policy', version: getCliVersion(), data: { policy },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Política de Resiliência');
        printLine(`  Max retries: ${policy.maxRetries}`);
        printLine(`  Circuit breaker threshold: ${policy.circuitBreakerThreshold}`);
        printLine(`  Auto-repair: ${policy.allowAutoRepair ? 'Sim' : 'Não'}`);
        printLine(`  Aprovação para crítico: ${policy.requireApprovalForCritical ? 'Sim' : 'Não'}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao exibir política: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
