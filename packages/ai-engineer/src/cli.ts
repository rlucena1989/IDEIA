import { Command } from 'commander';
import { createProviderFromEnv } from '@ideia/llm-provider';
import { createLogger } from '@ideia/logger';
import { AiEngineer } from './ai-engineer';

const logger = createLogger('ai-engineer:cli');

export function aiEngineerCommand(): Command {
  const cmd = new Command('engineer')
    .description('Unified AI Engineer — composes AgentCoordinator + LangGraph + LLM task decomposition');

  cmd
    .command('run')
    .description('Decomposes a high-level task and executes it through multi-agent coordination')
    .argument('<task>', 'High-level task description')
    .option('--sequential', 'Execute sub-tasks sequentially (default)', true)
    .option('--parallel', 'Execute sub-tasks in parallel')
    .option('--json', 'Output as JSON')
    .option('--verbose', 'Verbose output')
    .action(async (task: string, options: { sequential?: boolean; parallel?: boolean; json?: boolean; verbose?: boolean }) => {
      const llmProvider = createProviderFromEnv();
      const aiEngineer = new AiEngineer(llmProvider, undefined, {
        requireSequential: !options.parallel,
      });

      if (options.verbose) {
        logger.error('Initializing AI Engineer...');
        logger.error(`Task: "${task.substring(0, 100)}${task.length > 100 ? '...' : ''}"`);
        logger.error(`Mode: ${options.parallel ? 'parallel' : 'sequential'}`);
      }

      const result = await aiEngineer.executeTask(task);

      if (options.json) {
        logger.info(JSON.stringify(result, null, 2));
        return;
      }

      logger.info(`\nAI Engineer Result:`);
      logger.info(`  Task: ${task.substring(0, 80)}${task.length > 80 ? '...' : ''}`);
      logger.info(`  Status: ${result.status}`);
      logger.info(`  Duration: ${result.durationMs}ms`);
      logger.info(`  Sub-tasks: ${result.subTasks.length}`);

      for (const st of result.subTasks) {
        const icon = st.status === 'completed' ? '\u2705' : st.status === 'failed' ? '\u274C' : '\u23F3';
        logger.info(`    ${icon} [${st.agentRole}] ${st.description.substring(0, 60)}`);
      }

      if (options.verbose && result.coordinationState) {
        logger.info('\nCoordination State:');
        logger.info(`  Pipeline: ${result.coordinationState.pipeline.join(' -> ')}`);
        logger.info(`  Completed: ${result.coordinationState.completed.length}`);
        logger.info(`  Failed: ${result.coordinationState.failed.length}`);
      }

      logger.info(`\n${result.summary}`);
    });

  cmd
    .command('list')
    .description('Lists all AI Engineer tasks')
    .option('--json', 'Output as JSON')
    .action(() => {
      logger.info('Use: IDEIA engineer run <task> to execute a new task');
      logger.info('Current tasks are stored in memory during session.');
    });

  return cmd;
}
