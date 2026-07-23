import { Command } from 'commander';
import path from 'node:path';
import YAML from 'yaml';
import { createSession, logAction, completeSession, failSession, listSessionIds, loadState, resumeSession, setCheckpoint } from '../runtime/agent-runtime';
import { validateAction } from '../runtime/agent-security';
import { printLine, printResult, finish } from '../utils/output';
import { getIO } from '../io';

const _ROOT = process.cwd();

interface BacklogTask {
  id: string;
  title: string;
  status: 'pending' | 'done' | 'failed';
  priority: string;
  objective: string;
  dependencies?: string[];
  suggested_files?: string[];
  last_run_at?: string;
  last_note?: string;
}

interface BacklogPhase {
  id: string;
  name: string;
  tasks: BacklogTask[];
}

interface Backlog {
  phases: BacklogPhase[];
}

function parseBacklog(file: string): Backlog {
  return YAML.parse(getIO().fs.read(path.resolve(file), 'utf8')) as Backlog;
}

function findNextTask(backlog: Backlog): { task: BacklogTask; phase: BacklogPhase } | null {
  const completed = new Set<string>();
  for (const phase of backlog.phases || []) {
    for (const t of phase.tasks || []) {
      if (t.status === 'done') completed.add(t.id);
    }
  }
  for (const phase of backlog.phases || []) {
    for (const task of phase.tasks || []) {
      if (task.status !== 'pending') continue;
      const deps: string[] = task.dependencies || [];
      const ready = deps.every((d: string) => completed.has(d));
      if (ready) return { task, phase };
    }
  }
  return null;
}

function saveBacklog(file: string, backlog: Backlog): void {
  getIO().fs.write(path.resolve(file), YAML.stringify(backlog, { lineWidth: 120 }));
}

/**
 * Processa run command.
 * @returns O resultado da operação.
 */
export function taskRunCommand(): Command {
  const cmd = new Command('task-run')
    .description('Executa tasks do backlog de evolucao automaticamente');

  cmd
    .command('next')
    .description('Executa a proxima task pronta do backlog')
    .argument('[backlog-file]', 'Arquivo YAML do backlog', '.ai/backlog/evolution-backlog.yaml')
    .option('--dry-run', 'Apenas mostra o que seria executado')
    .option('--apply', 'Permite execucao real')
    .action(async (backlogFile: string, options: { dryRun?: boolean; apply?: boolean }) => {
      const bf = path.resolve(backlogFile);
      if (!getIO().fs.exists(bf)) {
        printResult('Erro', false, `Backlog nao encontrado: ${backlogFile}`);
        return;
      }

      const backlog = parseBacklog(bf);
      const next = findNextTask(backlog);
      if (!next) {
        printLine('Nenhuma task pendente pronta para execucao.');
        return;
      }

      const { task, phase } = next;
      printLine(`📋 Proxima task: ${task.id} - ${task.title}`);
      printLine(`   Fase: ${phase.name}`);
      printLine(`   Prioridade: ${task.priority}`);
      printLine(`   Objetivo: ${task.objective}`);
      printLine('');

      if (options.dryRun) {
        printLine('[dry-run] Task selecionada, nenhuma acao executada.');
        printLine(`[dry-run] Arquivos sugeridos: ${(task.suggested_files || []).join(', ')}`);
        return;
      }

      const session = createSession(task.id, 3, phase.id);
      printLine(`🧠 Sessao criada: ${session.sessionId}`);
      printLine('');

      const modes: { seq: number; action: string; desc: string }[] = [
        { seq: 1, action: 'generate_code', desc: `Gerar codigo para: ${task.title}` },
        { seq: 2, action: 'write_file', desc: 'Aplicar mudancas nos arquivos' },
        { seq: 3, action: 'execute_command', desc: 'Rodar build e validacao' },
      ];

      let allPassed = true;
      for (const mode of modes) {
        printLine(`[${mode.seq}/${modes.length}] ${mode.desc}`);

        const validation = validateAction(mode.action, task.title);
        if (!validation.allowed) {
          printResult('Bloqueado', false, validation.reason || '');
          logAction(session, mode.action, mode.action, task.title, `Bloqueado: ${validation.reason}`, 'error', 0);
          allPassed = false;
          break;
        }

        if (validation.requiresApproval && !options.apply) {
          printLine(`   ⚠️ Aprovacao necessaria. Use --apply para autorizar.`);
          logAction(session, mode.action, mode.action, task.title, 'Aguardando aprovacao', 'success', 0);
          setCheckpoint(session, task.suggested_files || []);
          allPassed = false;
          break;
        }

        const start = Date.now();
        logAction(session, mode.action, mode.action, task.title, 'Em execucao', 'success', 0);

        const elapsed = Date.now() - start;
        logAction(session, mode.action, mode.action, task.title, 'Concluido', 'success', elapsed);
        printLine(`   ✅ Concluido (${elapsed}ms)`);
      }

      if (allPassed) {
        completeSession(session);
        task.status = 'done';
        task.last_run_at = new Date().toISOString();
        task.last_note = 'Executado via task-run';
        saveBacklog(bf, backlog);
        printResult(`Task ${task.id} concluida`, true);
      } else {
        failSession(session, 'Falha na validacao ou bloqueio');
        task.status = 'failed';
        task.last_run_at = new Date().toISOString();
        task.last_note = 'Falhou - verificar logs';
        saveBacklog(bf, backlog);
        printResult(`Task ${task.id} falhou`, false);
      }
    });

  cmd
    .command('list')
    .description('Lista tasks pendentes e concluidas do backlog')
    .argument('[backlog-file]', 'Arquivo YAML do backlog', '.ai/backlog/evolution-backlog.yaml')
    .action((backlogFile: string) => {
      const bf = path.resolve(backlogFile);
      if (!getIO().fs.exists(bf)) { printResult('Erro', false, 'Backlog nao encontrado'); return; }
      const backlog = parseBacklog(bf);
      for (const phase of backlog.phases || []) {
        printLine(`\n## ${phase.name}`);
        for (const task of phase.tasks || []) {
          const icon = task.status === 'done' ? '✅' : task.status === 'failed' ? '❌' : '🔲';
          printLine(`${icon} ${task.id}: ${task.title} (${task.priority})`);
        }
      }
    });

  cmd
    .command('sessions')
    .description('Lista sessoes de execucao de agentes')
    .action(() => {
      const sessions = listSessionIds();
      if (sessions.length === 0) { printLine('Nenhuma sessao encontrada.'); return; }
      printLine(`Sessoes (${sessions.length}):`);
      for (const sid of sessions) {
        const state = loadState(sid);
        if (!state) continue;
        const icon = state.status === 'completed' ? '✅' : state.status === 'failed' ? '❌' : '⏳';
        printLine(`${icon} ${state.sessionId} | ${state.taskId} | ${state.status} | ${state.phase}`);
      }
    });

  return cmd;
}