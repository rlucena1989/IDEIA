import { Command } from "commander";
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.backup');
import path from "path";

/**
 * Processa status command.
 * @returns O resultado da operação.
 */
export function backupStatusAction(): void {
  const bkpPath = path.join(process.cwd(), ".ai/bin/backup-manager.js");
  try {
    const backupManager = require(bkpPath);
    const s = backupManager.status();
    logger.info('\n📦 Status do Backup do Ledger\n');
    logger.info('Uso: ${s.sizeMB} MB / ${s.quotaMB} MB (${s.percentUsed}%)');
    logger.info('GitHub configurado: ${s.githubEnabled ? \'✅ Sim -> \' + s.githubRemote : \'❌ Não\'}');
    logger.info('Arquivos de histórico frio (.gz): ${s.archiveCount}');
  } catch (e) {
    console.log('Módulo backup-manager.js ausente ou com falha na carga.', e);
  }
}

export function backupConfigureGithubAction(url: string): void {
  const bkpPath = path.join(process.cwd(), ".ai/bin/backup-manager.js");
  try {
    const backupManager = require(bkpPath);
    backupManager.configureGithub(url);
    logger.info('✅ GitHub configurado como espelho: ${url}');
  } catch (e) {
    console.log('Módulo backup-manager.js ausente ou com falha na carga.', e);
  }
}

export function backupStatusCommand(): Command {
    return new Command("backup-status")
        .description("Exibe o status do Backup do Ledger")
        .action(backupStatusAction);
}

export function backupConfigureGithubCommand(): Command {
    return new Command("backup-configure-github")
        .description("Configura GitHub para espelho do Backup")
        .argument("<url>")
        .action((url: string) => backupConfigureGithubAction(url));
}
