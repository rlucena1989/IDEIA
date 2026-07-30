#!/usr/bin/env node
import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { ideaCommand } from './ideia/idea-command';
import { ideiaInitCommand } from './ideia/init-command';
import { ideiaStatusCommand } from './ideia/status-command';
import { ideiaAgentCommand } from './ideia/agent-command';
import { ideiaMemoryCommand } from './ideia/memory-command';
import { ideiaDeployCommand } from './ideia/deploy-command';
import { ideiaQualityCommand } from './ideia/quality-command';
import { ideiaConfigCommand } from './ideia/config-command';

const IDEIA_VERSION = '1.0.0';

export function ideiaCommand(): Command {
  const program = new Command('ideia')
    .version(IDEIA_VERSION)
    .description('IDEIA — Dê a ideia, nós entregamos a solução.')
    .addCommand(ideaCommand())
    .addCommand(ideiaInitCommand())
    .addCommand(ideiaStatusCommand())
    .addCommand(ideiaAgentCommand())
    .addCommand(ideiaMemoryCommand())
    .addCommand(ideiaDeployCommand())
    .addCommand(ideiaQualityCommand())
    .addCommand(ideiaConfigCommand());

  return program;
}

export function registerIdeiaCommand(program: Command): void {
  program.addCommand(ideiaCommand());
}
