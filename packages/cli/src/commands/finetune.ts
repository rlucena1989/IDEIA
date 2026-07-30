import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { PEFTExecutor } from '@ideia/finetuning-pipeline';
import { getIO } from '../io';
const logger = createLogger('finetune');

export function finetuneCommand(): Command {
  const cmd = new Command('finetune').description('Fine-tuning operations: adapt, train, manage adapters');

  cmd
    .command('adapt')
    .description('Create a LoRA adapter from project history')
    .option('--method <method>', 'PEFT method (lora, qlora, dora)', 'qlora')
    .option('--rank <rank>', 'LoRA rank', '16')
    .option('--base-model <model>', 'base model', 'Qwen2.5-7B')
    .option('--dataset <path>', 'training dataset path')
    .option('--dry-run', 'show config without training')
    .action(async (opts: { method?: string; rank?: string; baseModel?: string; dataset?: string; dryRun?: boolean }) => {
      const io = getIO();
      io.outputLines([
        'Preparing fine-tuning run:',
        `  Method: ${opts.method}`,
        `  Rank: ${opts.rank}`,
        `  Base model: ${opts.baseModel}`,
        `  Dataset: ${opts.dataset || 'auto (from project history)'}`,
      ]);

      if (opts.dryRun) {
        io.outputLines(['', '⚠ Dry-run mode. Use --no-dry-run to train.']);
        return;
      }

      const executor = new PEFTExecutor();
      const run = await executor.prepare({
        baseModel: opts.baseModel || 'Qwen2.5-7B',
        dataset: opts.dataset || '.ai/finetune-data.jsonl',
        peftConfig: {
          method: (opts.method as 'lora' | 'qlora' | 'dora') || 'qlora',
          rank: parseInt(opts.rank || '16'),
          alpha: 32,
          dropout: 0.05,
          targetModules: ['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'],
        },
        hyperparameters: {
          learningRate: 2e-4,
          batchSize: 4,
          epochs: 3,
          gradientAccumulationSteps: 8,
          bf16: true,
          warmupRatio: 0.1,
          maxSeqLength: 2048,
        },
      });

      io.outputLines([`Run ${run.id} prepared. Executing...`]);
      const result = await executor.execute(run.id);
      io.outputLines([
        `Run ${result.id}: ${result.status}`,
        `  Perplexity: ${result.metrics?.perplexity?.toFixed(2) || 'N/A'}`,
        `  Loss: ${result.metrics?.trainLoss?.slice(-1)[0]?.toFixed(4) || 'N/A'}`,
        `  Adapter: ${result.outputAdapter || 'N/A'}`,
      ]);
    });

  cmd
    .command('list')
    .description('List fine-tuning runs')
    .action(async () => {
      const io = getIO();
      const executor = new PEFTExecutor();
      const runs = await executor.listRuns();
      if (runs.length === 0) {
        io.outputLines(['No fine-tuning runs found.']);
      } else {
        io.outputLines(['Fine-tuning runs:']);
        for (const run of runs) {
          const lines = [`  ${run.id}: ${run.baseModel} (${run.peftConfig.method}) — ${run.status}`];
          if (run.metrics) {
            lines.push(`    Perplexity: ${run.metrics.perplexity.toFixed(2)}`);
          }
          io.outputLines(lines);
        }
      }
    });

  cmd
    .command('status')
    .description('Show fine-tuning system status')
    .option('--json', 'output as JSON')
    .action(async (opts: { json?: boolean }) => {
      const io = getIO();
      const executor = new PEFTExecutor();
      const runs = await executor.listRuns();
      const active = runs.filter((r) => r.status === 'training' || r.status === 'preparing');
      const completed = runs.filter((r) => r.status === 'completed');

      if (opts.json) {
        io.output({ totalRuns: runs.length, active: active.length, completed: completed.length });
      } else {
        io.outputLines([
          'Fine-tuning Status:',
          `  Total runs: ${runs.length}`,
          `  Active: ${active.length}`,
          `  Completed: ${completed.length}`,
          `  Failed: ${runs.filter((r) => r.status === 'failed').length}`,
        ]);
      }
    });

  cmd
    .command('continuous')
    .description('Start continuous fine-tuning monitor')
    .option('--base-model <model>', 'base model', 'Qwen2.5-7B')
    .option('--interval <ms>', 'check interval ms', '3600000')
    .option('--once', 'run once and exit')
    .action(async (opts: { baseModel?: string; interval?: string; once?: boolean }) => {
      const io = getIO();
      const executor = new PEFTExecutor();

      io.outputLines([
        'Continuous Fine-tuning Monitor',
        `  Base model: ${opts.baseModel}`,
        `  Interval: ${(parseInt(opts.interval || '3600000') / 60000).toFixed(0)} min`,
        opts.once ? '  Mode: single run' : '  Mode: continuous (Ctrl+C to stop)',
      ]);

      const { ContinuousFinetuning } = await import('@ideia/finetuning-pipeline');
      const monitor = new ContinuousFinetuning(executor, {
        baseModel: opts.baseModel,
        checkIntervalMs: parseInt(opts.interval || '3600000'),
        autoTrain: true,
      });

      const run = await monitor.checkAndTrain();
      if (run) {
        io.outputLines([`Training completed: ${run.id}`]);
      } else {
        io.outputLines(['No training needed (no drift detected).']);
      }
    });

  return cmd;
}
