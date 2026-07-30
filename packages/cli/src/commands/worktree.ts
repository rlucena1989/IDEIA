import { Command } from 'commander';
import { createLogger } from '@ideia/logger';

import path from 'node:path';
import { printHeader, printLine, printResult, finish } from "../utils/output";
import { getIO } from '../io';

// ============================================================
// TASK-GAP-14: Worktree Isolation para Agentes
// ============================================================

const WORKTREE_DIR = '.ai/worktrees';

/**
 * Obtém worktree path.
 * @param root - Valor root.
 * @param agentName - Valor name.
 * @returns O resultado da operação.
 */
export function getWorktreePath(root: string, agentName: string): string {
  return path.join(root, WORKTREE_DIR, agentName);
}

/**
 * Verifica se git repo.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function isGitRepo(root: string): boolean {
  return getIO().fs.exists(path.join(root, '.git'));
}

/**
 * Executa git.
 * @param root - Valor root.
 * @param args - Valor args.
 * @returns O resultado da operação.
 */
export function runGit(root: string, args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const r = getIO().shell.execString(`git ${args.join(' ')}`, root);
  return { stdout: r.stdout.trim(), stderr: '', exitCode: r.status };
}

/**
 * Cria agent worktree.
 * @param root - Valor root.
 * @param agent - Valor agent.
 * @param branchName - Valor name.
 */
export function createAgentWorktree(root: string, agent: string, branchName: string): void {
  if (!isGitRepo(root)) {
    printResult('create', false, 'Not a git repository');
    finish({ checkpoint: 'worktree_create', ok: false, status: 'failed', context_summary: 'Not a git repository' });
    return;
  }
  const worktreePath = getWorktreePath(root, agent);
  if (getIO().fs.exists(worktreePath)) {
    printResult('create', false, `Worktree for "${agent}" already exists`);
    finish({ checkpoint: 'worktree_create', ok: false, status: 'failed', context_summary: `Worktree for ${agent} already exists` });
    return;
  }
  const branchCheck = runGit(root, ['rev-parse', '--verify', branchName]);
  if (branchCheck.exitCode === 0) {
    const result = runGit(root, ['worktree', 'add', worktreePath, branchName]);
    if (result.exitCode !== 0) { printResult('create', false, result.stderr); finish({ checkpoint: 'worktree_create', ok: false, status: 'failed', context_summary: result.stderr }); return; }
  } else {
    const result = runGit(root, ['worktree', 'add', '-b', branchName, worktreePath, 'HEAD']);
    if (result.exitCode !== 0) { printResult('create', false, result.stderr); finish({ checkpoint: 'worktree_create', ok: false, status: 'failed', context_summary: result.stderr }); return; }
  }
  printResult('create', true, `Worktree created at ${worktreePath} (branch: ${branchName})`);
  finish({ checkpoint: 'worktree_create', ok: true, status: 'passed', context_summary: `Created worktree for ${agent}`, data: { agent, path: worktreePath, branch: branchName } });
}

/**
 * Processa agent worktrees.
 * @param root - Valor root.
 */
export function listAgentWorktrees(root: string): void {
  if (!isGitRepo(root)) { printLine('Not a git repository'); finish({ checkpoint: 'worktree_list', ok: true, status: 'passed', context_summary: 'Not a git repository' }); return; }
  const result = runGit(root, ['worktree', 'list']);
  if (result.exitCode !== 0) { printLine('No worktrees found'); finish({ checkpoint: 'worktree_list', ok: true, status: 'passed', context_summary: 'No worktrees' }); return; }
  printHeader('Git Worktrees'); printLine(result.stdout); printLine(''); printLine('Agent worktrees:');
  const worktreesDir = path.join(root, WORKTREE_DIR);
  if (getIO().fs.exists(worktreesDir)) {
    const agents = getIO().fs.readDirEntries(worktreesDir).filter(d => d.isDirectory()).map(d => d.name);
    if (agents.length === 0) { printLine('  No agent worktrees found'); }
    else { for (const agent of agents) { const p = path.join(worktreesDir, agent); const b = runGit(p, ['rev-parse', '--abbrev-ref', 'HEAD']); printLine(`  ${agent.padEnd(15)} → ${p} (branch: ${b.exitCode === 0 ? b.stdout : 'unknown'})`); } }
  } else { printLine('  No agent worktrees found'); }
  finish({ checkpoint: 'worktree_list', ok: true, status: 'passed', context_summary: 'Listed worktrees' });
}

/**
 * Remove agent worktree.
 * @param root - Valor root.
 * @param agent - Valor agent.
 * @param force - Valor force.
 */
export function removeAgentWorktree(root: string, agent: string, force: boolean): void {
  const worktreePath = getWorktreePath(root, agent);
  if (!getIO().fs.exists(worktreePath)) { printResult('remove', false, `Worktree for "${agent}" not found`); finish({ checkpoint: 'worktree_remove', ok: false, status: 'failed', context_summary: `Worktree for ${agent} not found` }); return; }
  const args = ['worktree', 'remove']; if (force) args.push('--force'); args.push(worktreePath);
  const result = runGit(root, args);
  if (result.exitCode !== 0) { printResult('remove', false, result.stderr); finish({ checkpoint: 'worktree_remove', ok: false, status: 'failed', context_summary: result.stderr }); return; }
  if (getIO().fs.exists(worktreePath)) { getIO().fs.remove(worktreePath, { recursive: true, force: true }); }
  printResult('remove', true, `Worktree for "${agent}" removed`); finish({ checkpoint: 'worktree_remove', ok: true, status: 'passed', context_summary: `Removed worktree for ${agent}`, data: { agent } });
}

/**
 * Mescla agent worktree.
 * @param root - Valor root.
 * @param agent - Valor agent.
 * @param target - Valor target.
 * @param doPush - Valor push.
 */
export function mergeAgentWorktree(root: string, agent: string, target: string, doPush: boolean): void {
  const worktreePath = getWorktreePath(root, agent);
  if (!getIO().fs.exists(worktreePath)) { printResult('merge', false, `Worktree for "${agent}" not found`); finish({ checkpoint: 'worktree_merge', ok: false, status: 'failed', context_summary: `Worktree for ${agent} not found` }); return; }
  const branchResult = runGit(worktreePath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branchResult.exitCode !== 0) { printResult('merge', false, 'Could not determine branch'); finish({ checkpoint: 'worktree_merge', ok: false, status: 'failed', context_summary: 'Could not determine branch' }); return; }
  const agentBranch = branchResult.stdout;
  runGit(root, ['fetch', '--all']);
  const checkoutResult = runGit(root, ['checkout', target]);
  if (checkoutResult.exitCode !== 0) { printResult('merge', false, checkoutResult.stderr); finish({ checkpoint: 'worktree_merge', ok: false, status: 'failed', context_summary: checkoutResult.stderr }); return; }
  runGit(root, ['pull']);
  const mergeResult = runGit(root, ['merge', agentBranch, '--no-edit']);
  if (mergeResult.exitCode !== 0) { printResult('merge', false, `Merge conflict: ${mergeResult.stderr}`); finish({ checkpoint: 'worktree_merge', ok: false, status: 'failed', context_summary: `Merge conflict merging ${agentBranch}` }); return; }
  if (doPush) { const pushResult = runGit(root, ['push']); if (pushResult.exitCode !== 0) printLine(`Warning: Push failed: ${pushResult.stderr}`); }
  printResult('merge', true, `Merged "${agentBranch}" into "${target}"`);
  finish({ checkpoint: 'worktree_merge', ok: true, status: 'passed', context_summary: `Merged ${agentBranch} into ${target}`, data: { agent, fromBranch: agentBranch, toBranch: target } });
}

/**
 * Processa agent worktrees.
 * @param root - Valor root.
 */
export function statusAgentWorktrees(root: string): void {
  const worktreesDir = path.join(root, WORKTREE_DIR);
  if (!getIO().fs.exists(worktreesDir)) { printLine('No agent worktrees found'); finish({ checkpoint: 'worktree_status', ok: true, status: 'passed', context_summary: 'No worktrees' }); return; }
  const agents = getIO().fs.readDirEntries(worktreesDir).filter(d => d.isDirectory()).map(d => d.name);
  printHeader('Agent Worktrees Status');
  for (const agent of agents) {
    const agentPath = path.join(worktreesDir, agent);
    const branch = runGit(agentPath, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout || 'unknown';
    const hasChanges = runGit(agentPath, ['status', '--porcelain']).stdout.length > 0;
    const ahead = parseInt(runGit(agentPath, ['rev-list', '--count', `${branch}..origin/${branch}`, '--']).stdout, 10) || 0;
    const behind = parseInt(runGit(agentPath, ['rev-list', '--count', `origin/${branch}..${branch}`, '--']).stdout, 10) || 0;
    printLine(`${hasChanges ? '⚠️' : '✅'} ${agent}`); printLine(`   Path: ${agentPath}`); printLine(`   Branch: ${branch}`);
    printLine(`   Status: ${hasChanges ? 'Uncommitted changes' : 'Clean'}`);
    if (ahead > 0 || behind > 0) printLine(`   Remote: ${ahead > 0 ? `${ahead} ahead` : ''}${ahead > 0 && behind > 0 ? ', ' : ''}${behind > 0 ? `${behind} behind` : ''}`);
    printLine('');
  }
  finish({ checkpoint: 'worktree_status', ok: true, status: 'passed', context_summary: `Status checked for ${agents.length} worktrees`, data: { agents: agents.length } });
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function worktreeCommand(): Command {
  const cmd = new Command('worktree').description('Worktree Isolation para Agentes');
  cmd.command('create <agent>').description('Cria uma worktree isolada').option('--branch <branch>', 'Branch', 'feature/agent-<agent>')
    .action((agent, opts) => createAgentWorktree(process.cwd(), agent, opts.branch.replace('<agent>', agent)));
  cmd.command('list').description('Lista worktrees').action(() => listAgentWorktrees(process.cwd()));
  cmd.command('remove <agent>').description('Remove worktree').option('--force', 'Forcar remocao')
    .action((agent, opts) => removeAgentWorktree(process.cwd(), agent, !!opts.force));
  cmd.command('merge <agent>').description('Merge worktree').option('--target <b>', 'Branch alvo', 'main').option('--no-push', 'Sem push')
    .action((agent, opts) => mergeAgentWorktree(process.cwd(), agent, opts.target, opts.push !== false));
  cmd.command('status').description('Status das worktrees').action(() => statusAgentWorktrees(process.cwd()));
  return cmd;
}