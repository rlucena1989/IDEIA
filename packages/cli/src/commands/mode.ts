import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { printLine, printResult } from "../utils/output";
import { getIO } from '../io';

/** Processa a l i d_ m o d e s. */
export const VALID_MODES = ['development', 'security', 'performance', 'migration', 'debugging', 'documentation'] as const;
/** Tipo que define session mode. */
export type SessionMode = typeof VALID_MODES[number];

const MODE_FILE = '.ai/session-mode.json';

/** Interface que define a estrutura de mode config. */
export interface ModeConfig {
  mode: SessionMode;
  updatedAt: string;
}

const DEFAULT_MODE: ModeConfig = {
  mode: 'development',
  updatedAt: new Date().toISOString(),
};

/**
 * Obtém mode.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function getMode(root?: string): ModeConfig {
  const base = root || process.cwd();
  const modePath = path.join(base, MODE_FILE);
  const ioFs = getIO().fs;
  if (!ioFs.exists(modePath)) return DEFAULT_MODE;
  try {
    const data = JSON.parse(ioFs.read(modePath, 'utf8')) as ModeConfig;
    if (VALID_MODES.includes(data.mode)) return data;
    return DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

/**
 * Define mode.
 * @param root - Valor root.
 * @param mode - Valor mode.
 */
export function setMode(root: string, mode: SessionMode): void {
  const modePath = path.join(root, MODE_FILE);
  const ioFs = getIO().fs;
  const config: ModeConfig = { mode, updatedAt: new Date().toISOString() };
  ioFs.mkDir(path.dirname(modePath), true);
  ioFs.write(modePath, JSON.stringify(config, null, 2));
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function modeSetAction(mode: string): void {
  if (!VALID_MODES.includes(mode as SessionMode)) {
    printResult(`Modo invalido: "${mode}". Validos: ${VALID_MODES.join(', ')}`, false);
    process.exitCode = 1;
    return;
  }
  setMode(process.cwd(), mode as SessionMode);
  printResult(`Modo alterado para: ${mode}`, true);
}

export function modeCurrentAction(): void {
  const { mode, updatedAt } = getMode();
  const descriptions: Record<SessionMode, string> = {
    development: 'Padrao — foco em implementacao',
    security: 'Revisor rigoroso, bloqueia vulnerabilidades',
    performance: 'Prioriza otimizacoes',
    migration: 'Foco em refatoracao, tolerancia zero para dead code',
    debugging: 'Permite logs extensivos, desativa lint',
    documentation: 'Prioriza geracao de docs, nao altera codigo',
  };
  printLine(`Modo atual: ${mode}`);
  printLine(`Descricao: ${descriptions[mode]}`);
  printLine(`Atualizado em: ${updatedAt}`);
}

export function modeCommand(): Command {
  const cmd = new Command('mode')
    .description('Gerencia modos de sessao da IA');

  cmd
    .command('set')
    .description('Define o modo de sessao')
    .argument('<mode>', `Modo: ${VALID_MODES.join(', ')}`)
    .action((mode: string) => modeSetAction(mode));
  cmd.command('current').description('Exibe o modo de sessao atual').action(modeCurrentAction);

  return cmd;
}
