import { Command } from 'commander';
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
  console.log(`\nAnalise de Memoria — "${file}":`);
  console.log(`  ${report.summary}`);
  for (const m of report.metrics) {
    const icon = m.status === 'critical' ? 'C' : m.status === 'warning' ? 'W' : ' ';
    console.log(`  [${icon}] ${m.name.padEnd(25)} ${m.value}/${m.threshold} — ${m.suggestion}`);
  }
  for (const l of report.leakSignals) console.log(`  Leak: ${l}`);
}

export function lowLevelConcurrencyAction(file: string, opts: { json?: boolean }): void {
  if (!fs.existsSync(file)) { console.error('Arquivo nao encontrado:', file); return; }
  const content = fs.readFileSync(file, 'utf-8');
  const report = analyzeConcurrency(content);
  if (opts.json) { console.log(JSON.stringify(report, null, 2)); return; }
  console.log(`\nAnalise de Concorrencia — "${file}":`);
  console.log(`  ${report.summary}`);
  for (const f of report.findings) {
    const icon = f.severity === 'error' ? 'E' : f.severity === 'warning' ? 'W' : 'I';
    console.log(`  [${icon}] L${f.line}: ${f.name} — ${f.suggestion}`);
  }
}

export function lowLevelPlatformAction(opts: { json?: boolean }): void {
  const info = getPlatformInfo();
  const validation = validatePlatform(info);
  if (opts.json) { console.log(JSON.stringify(validation, null, 2)); return; }
  console.log('\nPlataforma:');
  console.log(`  OS: ${info.os} (${info.arch})`);
  console.log(`  Node: ${info.nodeVersion}`);
  console.log(`  Shell: ${info.shell}`);
  console.log(`  ${validation.summary}`);
  for (const r of validation.rules) {
    console.log(`  [${r.pass ? 'OK' : 'XX'}] ${r.id}: ${r.message}`);
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