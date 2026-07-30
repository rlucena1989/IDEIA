import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { runTestLoop, formatTestReport } from '../runtime/test-loop';
import { printLine, printResult, finish } from '../utils/output';

/**
 * Testa command.
 * @returns O resultado da operação.
 */
export function testLoopRunAction(): void {
  printLine('🧪 Executando pipeline de testes...\n');
  const report = runTestLoop();
  printLine(formatTestReport(report));
  printLine('');
  printLine(`Relatorio salvo: .ai/reports/test-loop/${report.sessionId}.json`);
  finish({
    checkpoint: 'test_loop',
    ok: report.overallPassed,
    status: report.overallPassed ? 'passed' : 'failed',
    context_summary: report.overallPassed ? 'Todos os testes passaram' : 'Falhas detectadas',
    data: { sessionId: report.sessionId, passed: report.overallPassed, phases: report.results.length },
  });
}

export function testCommand(): Command {
  const cmd = new Command('test-loop')
    .description('Executa pipeline de testes: lint, typecheck, unit, build, security');

  cmd
    .command('run')
    .description('Executa todos os testes e gera relatorio')
    .action(testLoopRunAction);

  return cmd;
}