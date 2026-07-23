import { Command } from 'commander';
import { listIssues, createPR, commentOnPR, addLabels, createIssue } from '../runtime/git-provider';
import { printLine, printResult, finish } from '../utils/output';

/**
 * Builds the `github` CLI command (issues, PRs, labels integration).
 * @returns The configured Commander command.
 */
export function githubCommand(): Command {
  const cmd = new Command('github')
    .description('Integracao com GitHub/GitLab — issues, PRs e automacao');

  cmd
    .command('issues')
    .description('Lista issues do repositorio')
    .option('--closed', 'Lista issues fechadas')
    .option('--gitlab', 'Usa GitLab em vez de GitHub')
    .action(async (options: { closed?: boolean; gitlab?: boolean }) => {
      const type = options.gitlab ? 'gitlab' : 'github';
      try {
        const issues = await listIssues(type, options.closed ? 'closed' : 'open');
        printLine(`Issues ${options.closed ? 'fechadas' : 'abertas'} (${issues.length}):\n`);
        for (const issue of issues) {
          printLine(`  #${issue.number} ${issue.state === 'open' ? '🔵' : '⚪'} ${issue.title}`);
          printLine(`     Labels: ${issue.labels.join(', ') || 'nenhuma'}`);
          printLine('');
        }
        finish({ checkpoint: 'github_issues', ok: true, status: 'passed', context_summary: `${issues.length} issues listadas`, data: { count: issues.length } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        printResult('Erro', false, message);
        finish({ checkpoint: 'github_issues', ok: false, status: 'failed', context_summary: message });
      }
    });

  cmd
    .command('issue-create')
    .description('Cria uma nova issue')
    .argument('<title>', 'Titulo da issue')
    .argument('[body]', 'Corpo da issue')
    .option('--labels <labels>', 'Labels separadas por virgula')
    .option('--gitlab', 'Usa GitLab')
    .action(async (title: string, body: string | undefined, options: { labels?: string; gitlab?: boolean }) => {
      const type = options.gitlab ? 'gitlab' : 'github';
      const labels = options.labels ? options.labels.split(',').map(l => l.trim()) : [];
      try {
        const issue = await createIssue(type, title, body || '', labels);
        printResult(`Issue #${issue.number} criada`, true);
        finish({ checkpoint: 'github_issue_create', ok: true, status: 'passed', context_summary: `Issue #${issue.number}`, data: { number: issue.number } });
      } catch (err: unknown) {
        printResult('Erro', false, err instanceof Error ? err.message : String(err));
      }
    });

  cmd
    .command('pr-create')
    .description('Cria um Pull Request')
    .argument('<title>', 'Titulo do PR')
    .argument('<body>', 'Descricao do PR')
    .argument('<head>', 'Branch de origem')
    .option('--base <branch>', 'Branch de destino', 'main')
    .option('--gitlab', 'Usa GitLab')
    .action(async (title: string, body: string, head: string, options: { base?: string; gitlab?: boolean }) => {
      const type = options.gitlab ? 'gitlab' : 'github';
      try {
        const pr = await createPR(type, title, body, head, options.base);
        printResult(`PR #${pr.number} criado`, true, pr.url);
        finish({ checkpoint: 'github_pr_create', ok: true, status: 'passed', context_summary: `PR #${pr.number}`, data: { number: pr.number, url: pr.url } });
      } catch (err: unknown) {
        printResult('Erro', false, err instanceof Error ? err.message : String(err));
      }
    });

  cmd
    .command('pr-comment')
    .description('Comenta em um PR')
    .argument('<pr-number>', 'Numero do PR')
    .argument('<body>', 'Texto do comentario')
    .option('--gitlab', 'Usa GitLab')
    .action(async (prNumber: string, body: string, options: { gitlab?: boolean }) => {
      try {
        await commentOnPR(options.gitlab ? 'gitlab' : 'github', parseInt(prNumber, 10), body);
        printResult('Comentario adicionado', true);
      } catch (err: unknown) {
        printResult('Erro', false, err instanceof Error ? err.message : String(err));
      }
    });

  cmd
    .command('label')
    .description('Adiciona labels a uma issue')
    .argument('<issue-number>', 'Numero da issue')
    .argument('<labels>', 'Labels separadas por virgula')
    .option('--gitlab', 'Usa GitLab')
    .action(async (issueNumber: string, labels: string, options: { gitlab?: boolean }) => {
      try {
        await addLabels(options.gitlab ? 'gitlab' : 'github', parseInt(issueNumber, 10), labels.split(',').map(l => l.trim()));
        printResult('Labels adicionadas', true);
      } catch (err: unknown) {
        printResult('Erro', false, err instanceof Error ? err.message : String(err));
      }
    });

  return cmd;
}