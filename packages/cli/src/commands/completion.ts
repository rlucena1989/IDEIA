import { Command } from 'commander';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { success } from '../types/cli-result';

import { createLogger } from '@ideia/logger';

const log = createLogger('cli:commands:completion');

const COMMANDS = [
  'init', 'doctor', 'feature', 'status', 'verify', 'sync', 'audit', 'context',
  'adapter', 'prove', 'hook', 'mode', 'detect', 'wizard', 'retrospective', 'mcp',
  'ci', 'compile', 'scorecard', 'timeline', 'learn', 'agents', 'hooks', 'drift',
  'plugin', 'attest', 'security', 'compliance', 'rules', 'ai', 'generate',
  'contract', 'release', 'pipeline', 'performance', 'feature-flag', 'ecosystem',
  'review', 'supply-chain', 'gate', 'knowledge', 'observability', 'prompt',
  'stream', 'worktree', 'snapshot', 'workflow', 'rag', 'engineer', 'pr-review',
  'optimize', 'design', 'experiment', 'mirror', 'simulate', 'appbuilder',
  'task-run', 'ide', 'github', 'test', 'scanner', 'patterns', 'consistency',
  'multimodal', 'low-level', 'preview', 'bootstrap', 'coprocess', 'orchestrate',
  'coverage-improve', 'test-fix-broken', 'test-autonomy', 'docs', 'plan',
  'coverage', 'state', 'harden', 'validate-generation', 'evolve', 'adaptive',
  'publish', 'distribute', 'telemetry', 'metrics', 'alerts', 'recover',
  'resilience', 'policy', 'approve', 'governance', 'agent', 'roadmap',
  'strategy', 'scenario', 'predict', 'consolidate', 'verdict', 'close-cycle',
  'autonomy', 'autonomous-run', 'autonomous-status', 'sync-context',
  'reconfigure', 'features', 'platform', 'finish', 'trust', 'authority',
  'memory', 'explain', 'decision', 'trace', 'risk', 'forecast', 'runbook',
  'legacy', 'archive', 'shutdown', 'restore', 'acceleration', 'anomaly',
  'complexity', 'polyglot', 'report', 'webhook', 'register-ideia', 'emergency',
  'config', 'evolution', 'radar', 'setup', 'notify', 'safety', 'catalog',
  'tutorial', 'lifecycle', 'audit-trail', 'cognitive', 'hardware', 'diagnostics',
  'schema',
];

function generateBashCompletion(): string {
  const cmds = COMMANDS.map(c => `    ${c})`).join('\n');
  return `# IDEIA CLI bash completion
_ideia_completions() {
    local cur prev opts
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    opts="${COMMANDS.join(' ')}"

    if [[ \${cur} == -* ]] ; then
        COMPREPLY=( $(compgen -W "--help --version --json --verbose --dry-run" -- "\${cur}") )
        return 0
    fi

    case "\${prev}" in
${cmds}
            COMPREPLY=( $(compgen -W "--help --json --verbose --dry-run" -- "\${cur}") )
            return 0
            ;;
    esac

    COMPREPLY=( $(compgen -W "\${opts}" -- "\${cur}") )
    return 0
}
complete -F _ideia_completions ideia
`;
}

function generateZshCompletion(): string {
  const cmds = COMMANDS.map(c => `  "${c}:IDEIA command"`).join(' \\\n');
  return `# IDEIA CLI zsh completion
#compdef ideia
_ideia_completions() {
  local state
  _arguments \\
${cmds} \\
    '--help[Show help]' \\
    '--version[Show version]' \\
    '--json[JSON output]' \\
    '--verbose[Verbose output]' \\
    '--dry-run[Simulate without executing]'
}
_ideia_completions "$@"
`;
}

function generatePowerShellCompletion(): string {
  const cmdList = COMMANDS.map(c => `'${c}'`).join(', ');
  return `# IDEIA CLI PowerShell completion
Register-ArgumentCompleter -Native -CommandName ideia -ScriptBlock {
    param($$wordToComplete, $$commandAst, $$cursorPosition)
    ${cmdList} | ForEach-Object {
        [System.Management.Automation.CompletionResult]::new($_, $$_, 'ParameterValue', $_)
    }
}
`;
}

export function completionCommand(): Command {
  const cmd = new Command('completion')
    .description('Generate shell completion scripts for IDEIA CLI');

  cmd.command('bash')
    .description('Generate bash completion script')
    .action((): void => {
      const script = generateBashCompletion();
      log.info(script);
    });

  cmd.command('zsh')
    .description('Generate zsh completion script')
    .action((): void => {
      const script = generateZshCompletion();
      log.info(script);
    });

  cmd.command('powershell')
    .description('Generate PowerShell completion script')
    .action((): void => {
      const script = generatePowerShellCompletion();
      log.info(script);
    });

  cmd.command('install')
    .description('Install completion script for the current shell')
    .option('--shell <shell>', 'Force a specific shell (bash|zsh|powershell)')
    .action((opts): void => {
      const shell = opts.shell || detectShell();
      const home = homedir();
      let targetPath = '';

      if (shell === 'bash') {
        targetPath = join(home, '.ideia-completion.bash');
        writeFileSync(targetPath, generateBashCompletion(), 'utf-8');
        log.info(`Completion script written to ${targetPath}`);
        log.info('Add to your ~/.bashrc:');
        log.info(`  source ${targetPath}`);
      } else if (shell === 'zsh') {
        const zshDir = join(home, '.zsh', 'completion');
        if (!existsSync(zshDir)) mkdirSync(zshDir, { recursive: true });
        targetPath = join(zshDir, '_ideia');
        writeFileSync(targetPath, generateZshCompletion(), 'utf-8');
        log.info(`Completion script written to ${targetPath}`);
        log.info('Ensure ~/.zsh/completion is in your fpath.');
      } else if (shell === 'powershell') {
        const profileDir = join(home, 'Documents', 'WindowsPowerShell');
        if (!existsSync(profileDir)) mkdirSync(profileDir, { recursive: true });
        targetPath = join(profileDir, 'ideia-completion.ps1');
        writeFileSync(targetPath, generatePowerShellCompletion(), 'utf-8');
        log.info(`Completion script written to ${targetPath}`);
        log.info('Add to your PowerShell profile:');
        log.info(`  . ${targetPath}`);
      } else {
        log.info(`Unsupported shell: ${shell}`);
        return;
      }

      log.info(`Installed: ${shell} -> ${targetPath}`);
    });

  return cmd;
}

function detectShell(): string {
  const shellEnv = process.env.SHELL || '';
  if (shellEnv.includes('zsh')) return 'zsh';
  if (shellEnv.includes('bash')) return 'bash';
  if (process.platform === 'win32') return 'powershell';
  return 'bash';
}
