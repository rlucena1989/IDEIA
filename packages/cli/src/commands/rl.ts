import { Command } from 'commander'
import { createLogger } from '@ideia/logger';
import { RewardVerifier, GRPOTrainer } from '@ideia/agent-runtime'
import { getIO } from '../io'
const logger = createLogger('rl');

export function rlCommand(): Command {
  const cmd = new Command('rl')
    .description('Reinforcement learning training: GRPO, RLVR, test-time compute')

  cmd
    .command('train')
    .description('Run RL training step')
    .option('--algorithm <algo>', 'RL algorithm (grpo, ppo, reinforce)', 'grpo')
    .option('--group-size <n>', 'samples per prompt', '8')
    .option('--reward <type>', 'reward type (correctness, execution, llm-judge)', 'correctness')
    .option('--dry-run', 'show config without training')
    .action(async (opts: { algorithm?: string; groupSize?: string; reward?: string; dryRun?: boolean }) => {
      const io = getIO()

      if (opts.dryRun) {
        io.outputLines([
          'RL Training Config:',
          `  Algorithm: ${opts.algorithm}`,
          `  Group size: ${opts.groupSize}`,
          `  Reward type: ${opts.reward}`,
          `  Reward normalization: yes`,
          `  Policy epochs: 3`,
        ])
        return
      }

      const verifier = new RewardVerifier({ type: (opts.reward as 'correctness' | 'execution-based' | 'llm-judge') || 'correctness', source: 'cli', timeout: 30000 })
      const trainer = new GRPOTrainer({ algorithm: (opts.algorithm as 'grpo' | 'ppo' | 'reinforce') || 'grpo', groupSize: parseInt(opts.groupSize || '8') })

      const episode = await trainer.trainStep(
        'Solve: 2x + 5 = 13',
        async (prompt, n) => Array.from({ length: n }, (_, i) => `Step-by-step: ${prompt}\nAnswer: ${i % 2 === 0 ? 'x = 4' : 'x = 5'}`),
        verifier,
        'x = 4',
      )

      io.outputLines([
        'Training step complete:',
        `  Best reward: ${episode.bestReward.toFixed(3)}`,
        `  Avg reward: ${episode.avgReward.toFixed(3)}`,
        `  Samples: ${episode.responses.length}`,
        `  Episode: ${episode.id}`,
      ])
    })

  cmd
    .command('verify')
    .description('Verify a response against expected answer')
    .argument('<response>', 'model response')
    .argument('<expected>', 'expected answer')
    .option('--type <type>', 'verification type (correctness, execution, llm-judge)', 'correctness')
    .action(async (response: string, expected: string, opts: { type?: string }) => {
      const io = getIO()
      const verifier = new RewardVerifier({ type: (opts.type as 'correctness' | 'execution-based' | 'llm-judge') || 'correctness', source: 'cli', timeout: 30000 })
      const result = await verifier.verify(response, expected)
      io.outputLines([
        `Verification: ${result.correct ? '✅ PASS' : '❌ FAIL'}`,
        `  Score: ${result.score}`,
        `  Details: ${result.details}`,
      ])
    })

  cmd
    .command('history')
    .description('Show RL training history')
    .option('--json', 'output as JSON')
    .action(async (opts: { json?: boolean }) => {
      const io = getIO()
      const trainer = new GRPOTrainer({})
      const stats = trainer.getStats()

      if (opts.json) {
        io.output({ stats, history: trainer.getHistory() })
      } else {
        io.outputLines([
          'RL Training History:',
          `  Total episodes: ${stats.totalEpisodes}`,
          `  Average reward: ${stats.avgReward.toFixed(3)}`,
          `  Best reward: ${stats.bestReward.toFixed(3)}`,
        ])
      }
    })

  cmd
    .command('test-time-compute')
    .description('Configure test-time compute scaling')
    .option('--budget <tokens>', 'extra token budget for hard tasks', '4096')
    .option('--strategy <strategy>', 'strategy (best-of-n, search, majority-vote)', 'best-of-n')
    .option('--samples <n>', 'samples per request', '3')
    .action(async (opts: { budget?: string; strategy?: string; samples?: string }) => {
      const io = getIO()
      io.outputLines([
        'Test-Time Compute Config:',
        `  Budget: ${parseInt(opts.budget || '4096').toLocaleString()} tokens`,
        `  Strategy: ${opts.strategy}`,
        `  Samples: ${opts.samples}`,
        `  Estimated cost per hard request: ${(parseInt(opts.budget || '4096') * parseInt(opts.samples || '3') * 0.000003).toFixed(4)} USD`,
      ])
    })

  return cmd
}
