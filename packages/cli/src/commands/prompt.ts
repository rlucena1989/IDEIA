import { Command } from 'commander';
import path from 'node:path';
import { printHeader, printLine, printResult, finish } from "../utils/output";
import { getIO } from '../io';

// ============================================================
// TASK-GAP-12: Prompt Management & Versioning
// ============================================================

const PROMPTS_DIR = '.ai/prompts/versions';

interface PromptVersion {
  version: string;
  name: string;
  content: string;
  created_at: string;
  hash: string;
  description?: string;
}

function getVersionsDir(root: string): string {
  return path.join(root, PROMPTS_DIR);
}

function getVersionPath(root: string, name: string, version: string): string {
  return path.join(getVersionsDir(root), name, `${version}.md`);
}

function getIndexPath(root: string, name: string): string {
  return path.join(getVersionsDir(root), name, 'index.json');
}

function ensureDir(p: string): void {
  getIO().fs.mkDir(p, true);
}

function computeHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function readVersions(root: string, name: string): PromptVersion[] {
  const indexPath = getIndexPath(root, name);
  if (!getIO().fs.exists(indexPath)) return [];
  try {
    return JSON.parse(getIO().fs.read(indexPath, 'utf8'));
  } catch {
    return [];
  }
}

function writeVersions(root: string, name: string, versions: PromptVersion[]): void {
  const indexPath = getIndexPath(root, name);
  ensureDir(path.dirname(indexPath));
  getIO().fs.write(indexPath, JSON.stringify(versions, null, 2));
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function promptCommand(): Command {
  const cmd = new Command('prompt')
    .description('Prompt Management & Versioning');

  cmd
    .command('save <name>')
    .description('Salva uma nova versao de prompt')
    .requiredOption('--content <content>', 'Conteudo do prompt')
    .option('--version <version>', 'Versao semantica (ex: 1.0.0)', '1.0.0')
    .option('--description <desc>', 'Descricao da versao')
    .option('--file <path>', 'Caminho para arquivo com conteudo do prompt')
    .action((name: string, options) => {
      const root = process.cwd();
      const content = options.file
        ? getIO().fs.read(path.resolve(root, options.file), 'utf8')
        : options.content;

      if (!content) {
        printResult('save', false, 'Conteudo do prompt nao fornecido');
        finish({
          checkpoint: 'prompt_save',
          ok: false,
          status: 'failed',
          context_summary: 'No content provided',
        });
        return;
      }

      const version: PromptVersion = {
        version: options.version,
        name,
        content,
        created_at: new Date().toISOString(),
        hash: computeHash(content),
        description: options.description,
      };

      const versionPath = getVersionPath(root, name, options.version);
      ensureDir(path.dirname(versionPath));
      getIO().fs.write(versionPath, content);

      const versions = readVersions(root, name);
      versions.push(version);
      writeVersions(root, name, versions);

      printResult('save', true, `${name}@${options.version} (${content.length} chars)`);
      finish({
        checkpoint: 'prompt_save',
        ok: true,
        status: 'passed',
        context_summary: `Saved ${name}@${options.version}`,
        data: { name, version: options.version, hash: version.hash, chars: content.length },
      });
    });

  cmd
    .command('list [name]')
    .description('Lista prompts ou versoes de um prompt')
    .action((name?: string) => {
      const root = process.cwd();
      const versionsDir = getVersionsDir(root);

      if (!getIO().fs.exists(versionsDir)) {
        printLine('No prompts found');
        finish({
          checkpoint: 'prompt_list',
          ok: true,
          status: 'passed',
          context_summary: 'No prompts found',
        });
        return;
      }

      if (name) {
        const versions = readVersions(root, name);
        printHeader(`Prompt: ${name}`);
        for (const v of versions) {
          printLine(`  ${v.version} — ${v.created_at} (${v.content.length} chars) ${v.description ? `— ${v.description}` : ''}`);
        }
        printLine(`\nTotal versions: ${versions.length}`);
      } else {
        const dirs = getIO().fs.readDirEntries(versionsDir)
          .filter(d => d.isDirectory())
          .map(d => d.name);

        printHeader('Prompts');
        for (const dir of dirs) {
          const versions = readVersions(root, dir);
          const latest = versions[versions.length - 1];
          printLine(`  ${dir} — ${versions.length} versions ${latest ? `(latest: ${latest.version})` : ''}`);
        }
        printLine(`\nTotal prompts: ${dirs.length}`);
      }

      finish({
        checkpoint: 'prompt_list',
        ok: true,
        status: 'passed',
        context_summary: `Listed prompts`,
      });
    });

  cmd
    .command('show <name>')
    .description('Exibe o conteudo de uma versao de prompt')
    .option('--version <version>', 'Versao a exibir', 'latest')
    .action((name: string, options) => {
      const root = process.cwd();
      const versions = readVersions(root, name);

      if (versions.length === 0) {
        printResult('show', false, `Prompt "${name}" nao encontrado`);
        finish({
          checkpoint: 'prompt_show',
          ok: false,
          status: 'failed',
          context_summary: `Prompt "${name}" not found`,
        });
        return;
      }

      const version = options.version === 'latest'
        ? versions[versions.length - 1]
        : versions.find(v => v.version === options.version);

      if (!version) {
        printResult('show', false, `Versao "${options.version}" nao encontrada`);
        finish({
          checkpoint: 'prompt_show',
          ok: false,
          status: 'failed',
          context_summary: `Version "${options.version}" not found`,
        });
        return;
      }

      printHeader(`${name}@${version.version}`);
      printLine(`Description: ${version.description || 'N/A'}`);
      printLine(`Created: ${version.created_at}`);
      printLine(`Hash: ${version.hash}`);
      printLine(`Chars: ${version.content.length}`);
      printLine('');
      printLine(version.content);

      finish({
        checkpoint: 'prompt_show',
        ok: true,
        status: 'passed',
        context_summary: `Showed ${name}@${version.version}`,
        data: { name, version: version.version, hash: version.hash },
      });
    });

  cmd
    .command('diff <name>')
    .description('Mostra diff entre duas versoes de prompt')
    .requiredOption('--from <version>', 'Versao base')
    .requiredOption('--to <version>', 'Versao alvo')
    .action((name: string, options) => {
      const root = process.cwd();
      const versions = readVersions(root, name);

      const fromVersion = versions.find(v => v.version === options.from);
      const toVersion = versions.find(v => v.version === options.to);

      if (!fromVersion || !toVersion) {
        printResult('diff', false, 'Uma ou ambas as versoes nao encontradas');
        finish({
          checkpoint: 'prompt_diff',
          ok: false,
          status: 'failed',
          context_summary: 'Versions not found',
        });
        return;
      }

      const fromLines = fromVersion.content.split('\n');
      const toLines = toVersion.content.split('\n');

      printHeader(`Diff: ${name} ${options.from} → ${options.to}`);
      printLine(`From: ${fromVersion.created_at} (${fromVersion.content.length} chars)`);
      printLine(`To: ${toVersion.created_at} (${toVersion.content.length} chars)`);
      printLine('');

      let changes = 0;
      const maxLines = Math.max(fromLines.length, toLines.length);
      for (let i = 0; i < maxLines; i++) {
        if (fromLines[i] !== toLines[i]) {
          if (i < fromLines.length) {
            printLine(`- ${fromLines[i]}`);
            changes++;
          }
          if (i < toLines.length) {
            printLine(`+ ${toLines[i]}`);
            changes++;
          }
        }
      }

      if (changes === 0) {
        printLine('No differences found');
      } else {
        printLine(`\n${changes} line changes`);
      }

      finish({
        checkpoint: 'prompt_diff',
        ok: true,
        status: 'passed',
        context_summary: `Diff ${name}: ${changes} changes`,
        data: { name, from: options.from, to: options.to, changes },
      });
    });

  cmd
    .command('rollback <name>')
    .description('Restaura uma versao anterior do prompt')
    .requiredOption('--version <version>', 'Versao para restaurar')
    .action((name: string, options) => {
      const root = process.cwd();
      const versions = readVersions(root, name);

      const targetVersion = versions.find(v => v.version === options.version);
      if (!targetVersion) {
        printResult('rollback', false, `Versao "${options.version}" nao encontrada`);
        finish({
          checkpoint: 'prompt_rollback',
          ok: false,
          status: 'failed',
          context_summary: 'Version not found',
        });
        return;
      }

      // Create a new version with rollback content
      const newVersion: PromptVersion = {
        version: `${options.version}-rollback-${Date.now()}`,
        name,
        content: targetVersion.content,
        created_at: new Date().toISOString(),
        hash: computeHash(targetVersion.content),
        description: `Rollback to ${options.version}`,
      };

      const versionPath = getVersionPath(root, name, newVersion.version);
      ensureDir(path.dirname(versionPath));
      getIO().fs.write(versionPath, newVersion.content);

      versions.push(newVersion);
      writeVersions(root, name, versions);

      printResult('rollback', true, `${name} rolled back to ${options.version}`);
      finish({
        checkpoint: 'prompt_rollback',
        ok: true,
        status: 'passed',
        context_summary: `Rolled back ${name} to ${options.version}`,
        data: { name, version: options.version, newVersion: newVersion.version },
      });
    });

  return cmd;
}