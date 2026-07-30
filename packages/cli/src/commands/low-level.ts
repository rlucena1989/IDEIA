import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.low-level');
import { analyzeMemory } from '../runtime/memory-analyzer';
import { analyzeConcurrency } from '../runtime/concurrency-analyzer';
import { getPlatformInfo, validatePlatform } from '../runtime/platform-analyzer';
import * as fs from 'fs';

/**
 * Cria low level command.
 * @returns O resultado da operação.
 */
export function lowLevelMemoryAction(file: string, opts: { json?: boolean }): void {
  if (!fs.existsSync(file)) { console.error('Arquivo nao encontrado:', file); return; }
  const content = fs.readFileSync(file, 'utf-8');
  const report = analyzeMemory(content);
  if (opts.json) { console.log(JSON.stringify(report, null, 2)); return; }
  logger.info('\nAnalise de Memoria — "${file}":');
  logger.info('  ${report.summary}');
  for (const m of report.metrics) {
    const icon = m.status === 'critical' ? 'C' : m.status === 'warning' ? 'W' : ' ';
    logger.info('  [${icon}] ${m.name.padEnd(25)} ${m.value}/${m.threshold} — ${m.suggestion}');
  }
  for (const l of report.leakSignals) logger.info('  Leak: ${l}');
}

export function lowLevelConcurrencyAction(file: string, opts: { json?: boolean }): void {
  if (!fs.existsSync(file)) { console.error('Arquivo nao encontrado:', file); return; }
  const content = fs.readFileSync(file, 'utf-8');
  const report = analyzeConcurrency(content);
  if (opts.json) { console.log(JSON.stringify(report, null, 2)); return; }
  logger.info('\nAnalise de Concorrencia — "${file}":');
  logger.info('  ${report.summary}');
  for (const f of report.findings) {
    const icon = f.severity === 'error' ? 'E' : f.severity === 'warning' ? 'W' : 'I';
    logger.info('  [${icon}] L${f.line}: ${f.name} — ${f.suggestion}');
  }
}

export function lowLevelPlatformAction(opts: { json?: boolean }): void {
  const info = getPlatformInfo();
  const validation = validatePlatform(info);
  if (opts.json) { console.log(JSON.stringify(validation, null, 2)); return; }
  logger.info('\nPlataforma:');
  logger.info('  OS: ${info.os} (${info.arch})');
  logger.info('  Node: ${info.nodeVersion}');
  logger.info('  Shell: ${info.shell}');
  logger.info('  ${validation.summary}');
  for (const r of validation.rules) {
    logger.info('  [${r.pass ? \'OK\' : \'XX\'}] ${r.id}: ${r.message}');
  }
}

export function createLowLevelCommand(): Command {
  const command = new Command('low-level')
    .description('Analise de Baixo Nivel — Fase 11');

  command
    .command('memory <file>')
    .description('Analisa problemas de memoria no codigo')
    .option('--json', 'Saida em JSON')
    .action((file, opts) => lowLevelMemoryAction(file, opts));
  command.command('concurrency <file>').description('Analisa problemas de concorrencia no codigo').option('--json', 'Saida em JSON').action((file, opts) => lowLevelConcurrencyAction(file, opts));
  command.command('platform').description('Exibe informacoes da plataforma e validacao').option('--json', 'Saida em JSON').action((opts) => lowLevelPlatformAction(opts));

  return command;
}

// createLowLevelCommand is already exported above