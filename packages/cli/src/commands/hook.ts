import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.hook');
import path from 'node:path';
import { getIO } from '../io';

export function getGitHookDir(projectRoot: string): string {
  try {
    const result = getIO().shell.execString('git rev-parse --git-common-dir', projectRoot);
    if (result.status === 0) {
      return path.resolve(projectRoot, result.stdout.trim(), 'hooks');
    }
  } catch { /* fallback */ }
  return path.join(projectRoot, '.git', 'hooks');
}

export function hookContent(): string {
  return `#!/bin/sh

# AI-Devkit pre-commit hook
# Instalado por: ai-devkit hook install

if [ -n "$SKIP_AI_VERIFY" ]; then
  echo "[ai-devkit] SKIP_AI_VERIFY detectado. Pulando verificacao."
  exit 0
fi

echo "[ai-devkit] Executando quality gates antes do commit..."

if command -v ai-devkit > /dev/null 2>&1; then
  ai-devkit verify
  RESULT=$?
else
  echo "[ai-devkit] ai-devkit nao encontrado no PATH. Tentando npm run..."
  if [ -f "package.json" ]; then
    npm run ai:quality:gate
    RESULT=$?
  else
    echo "[ai-devkit] AVISO: ai-devkit nao disponivel. Pulando verificacao."
    exit 0
  fi
fi

if [ $RESULT -ne 0 ]; then
  echo ""
  echo "========================================"
  echo "  QUALITY GATE FALHOU!"
  echo "  Corrija os problemas acima ou use:"
  echo "    SKIP_AI_VERIFY=1 git commit"
  echo "========================================"
  exit 1
fi

echo "[ai-devkit] Quality gates OK."
exit 0
`;
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function hookCommand(): Command {
  const cmd = new Command('hook')
    .description('Gerencia hooks git do AI-Devkit');

  cmd
    .command('install')
    .description('Instala pre-commit hook que executa ai-devkit verify')
    .action(() => {
      const root = process.cwd();
      const ioFs = getIO().fs;
      const hooksDir = getGitHookDir(root);
      const hookPath = path.join(hooksDir, 'pre-commit');

      if (!ioFs.exists(hooksDir)) {
        ioFs.mkDir(hooksDir, true);
      }

      if (ioFs.exists(hookPath)) {
        console.error(`[ai-devkit] AVISO: ${hookPath} ja existe. Use "ai-devkit hook uninstall" primeiro.`);
        process.exitCode = 1;
        return;
      }

      ioFs.write(hookPath, hookContent());
      logger.info('[ai-devkit] Pre-commit hook instalado em: ${hookPath}');
      logger.info('[ai-devkit] Hook executara "ai-devkit verify" antes de cada commit.');
      logger.info('[ai-devkit] Para pular: SKIP_AI_VERIFY=1 git commit');
    });

  cmd
    .command('uninstall')
    .description('Remove o pre-commit hook do AI-Devkit')
    .action(() => {
      const root = process.cwd();
      const ioFs = getIO().fs;
      const hooksDir = getGitHookDir(root);
      const hookPath = path.join(hooksDir, 'pre-commit');

      if (!ioFs.exists(hookPath)) {
        logger.info('[ai-devkit] Nenhum pre-commit hook encontrado.');
        return;
      }

      const content = ioFs.read(hookPath, 'utf8');
      if (!content.includes('AI-Devkit pre-commit hook')) {
        console.error('[ai-devkit] AVISO: O hook existente nao foi instalado pelo ai-devkit. Remocao manual necessaria.');
        process.exitCode = 1;
        return;
      }

      ioFs.remove(hookPath);
      logger.info('[ai-devkit] Pre-commit hook removido: ${hookPath}');
    });

  return cmd;
}
