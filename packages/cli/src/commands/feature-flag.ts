import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { printHeader, printLine, printResult, finish } from "../utils/output";
import { getIO } from '../io';

const FLAGS_CONFIG_PATH = '.ai/feature-flags/flags.yaml';

export interface FeatureFlag {
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'rolled-out';
  type: 'boolean' | 'percentage' | 'targeting';
  percentage?: number;
  targetingRules?: string[];
  createdAt: string;
  updatedAt: string;
}

export function loadFlags(root: string): FeatureFlag[] {
  const cfgPath = path.join(root, FLAGS_CONFIG_PATH);
  if (!getIO().fs.exists(cfgPath)) return [];
  const raw = getIO().fs.read(cfgPath, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFlags(root: string, flags: FeatureFlag[]): void {
  const cfgPath = path.join(root, FLAGS_CONFIG_PATH);
  getIO().fs.mkDir(path.dirname(cfgPath), true);
  getIO().fs.write(cfgPath, JSON.stringify(flags, null, 2));
}

export function featureFlagPlanAction(name: string): void {
  const root = process.cwd();
  printHeader(`Feature Flag Plan: ${name}`);

  const flags = loadFlags(root);
  if (flags.some(f => f.name === name)) {
    printResult('Erro', false, `Feature flag "${name}" ja existe`);
    finish({ checkpoint: 'feature_flag_plan', ok: false, status: 'failed', context_summary: `Flag "${name}" ja existe` });
    return;
  }

  const newFlag: FeatureFlag = {
    name,
    description: `Feature flag para ${name}`,
    status: 'inactive',
    type: 'boolean',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  flags.push(newFlag);
  saveFlags(root, flags);

  printLine(`Blueprint gerado para "${name}":`);
  printLine(`  Tipo: ${newFlag.type}`);
  printLine(`  Status: ${newFlag.status}`);
  printLine(`  Provider: boolean toggle`);

  finish({
    checkpoint: 'feature_flag_plan',
    ok: true,
    status: 'passed',
    context_summary: `Flag "${name}" criada com tipo boolean`,
    data: { name, type: 'boolean', status: 'inactive' },
  });
}

export function featureFlagListAction(): void {
  const root = process.cwd();
  printHeader('Feature Flags');

  const flags = loadFlags(root);
  if (flags.length === 0) {
    printLine('Nenhuma feature flag definida.');
    finish({ checkpoint: 'feature_flag_list', ok: true, status: 'passed', context_summary: 'Nenhuma flag', data: { total: 0 } });
    return;
  }

  for (const f of flags) {
    const icon = f.status === 'active' ? '✅' : f.status === 'rolled-out' ? '📦' : '⏸️';
    printLine(`${icon} ${f.name}: ${f.status} (${f.type})`);
    if (f.description) printLine(`   ${f.description}`);
  }

  finish({
    checkpoint: 'feature_flag_list',
    ok: true,
    status: 'passed',
    context_summary: `${flags.length} flag(s) encontrada(s)`,
    data: { total: flags.length, active: flags.filter(f => f.status === 'active').length },
  });
}

export function featureFlagStatusAction(name: string): void {
  const root = process.cwd();
  const flags = loadFlags(root);
  const flag = flags.find(f => f.name === name);

  if (!flag) {
    printResult('Erro', false, `Feature flag "${name}" nao encontrada`);
    finish({ checkpoint: 'feature_flag_status', ok: false, status: 'failed', context_summary: `Flag "${name}" nao encontrada` });
    return;
  }

  printHeader(`Feature Flag: ${flag.name}`);
  printLine(`  Descricao: ${flag.description}`);
  printLine(`  Status: ${flag.status}`);
  printLine(`  Tipo: ${flag.type}`);
  if (flag.percentage) printLine(`  Rollout: ${flag.percentage}%`);
  printLine(`  Criada: ${flag.createdAt}`);
  printLine(`  Atualizada: ${flag.updatedAt}`);

  finish({
    checkpoint: 'feature_flag_status',
    ok: true,
    status: 'passed',
    context_summary: `${flag.name}: ${flag.status}`,
    data: flag as unknown as Record<string, unknown>,
  });
}

/**
 * Processa flag command.
 * @returns O resultado da operação.
 */
export function featureFlagCommand(): Command {
  const cmd = new Command('feature-flag')
    .description('Gerenciamento de feature flags');

  cmd
    .command('plan')
    .description('Gera blueprint de uma nova feature flag')
    .argument('<name>', 'Nome da feature flag')
    .action((name: string) => featureFlagPlanAction(name));

  cmd
    .command('list')
    .description('Lista todas as feature flags')
    .action(() => featureFlagListAction());

  cmd
    .command('status')
    .description('Mostra status de uma feature flag')
    .argument('<name>', 'Nome da flag')
    .action((name: string) => featureFlagStatusAction(name));

  return cmd;
}
