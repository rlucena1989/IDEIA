import { Command } from "commander";
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
    console.log('\n📦 Status do Backup do Ledger\n');
    console.log(`Uso: ${s.sizeMB} MB / ${s.quotaMB} MB (${s.percentUsed}%)`);
    console.log(`GitHub configurado: ${s.githubEnabled ? '✅ Sim -> ' + s.githubRemote : '❌ Não'}`);
    console.log(`Arquivos de histórico frio (.gz): ${s.archiveCount}`);
  } catch (_e) {
    console.log('Módulo backup-manager.js ausente ou com falha na carga.', e);
  }
}

export function backupConfigureGithubAction(url: string): void {
  const bkpPath = path.join(process.cwd(), ".ai/bin/backup-manager.js");
  try {
    const backupManager = require(bkpPath);
    backupManager.configureGithub(url);
    console.log(`✅ GitHub configurado como espelho: ${url}`);
  } catch (_e) {
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
