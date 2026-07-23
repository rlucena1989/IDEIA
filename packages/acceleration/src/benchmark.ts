import { ProviderKind, BenchmarkResult } from './types';
import { LLMAdapter } from './llm-adapter';
import { MOCK_ADAPTER } from './llm-adapter';
import { OPENAI_ADAPTER, ANTHROPIC_ADAPTER, GOOGLE_ADAPTER } from './remote-model-adapter';
import { OLLAMA_ADAPTER, LOCAL_MOCK_ADAPTER } from './local-model-adapter';
import { mean, stddev } from './numerical-engine';

const TEST_PROMPTS = [
  'Explain what is TypeScript in one paragraph.',
  'Write a function to reverse a linked list.',
  'Summarize: clean architecture is a software design philosophy.',
  'What is the difference between var, let and const?',
  'Write a regex to validate email addresses.'
];

export async function runBenchmark(provider: ProviderKind, iterations = 3): Promise<BenchmarkResult | null> {
  const adapters: Record<ProviderKind, LLMAdapter> = {
    openai: OPENAI_ADAPTER, anthropic: ANTHROPIC_ADAPTER, google: GOOGLE_ADAPTER,
    local: LOCAL_MOCK_ADAPTER, ollama: OLLAMA_ADAPTER, mock: MOCK_ADAPTER
  };
  const adapter = adapters[provider];
  if (!adapter || !adapter.isAvailable()) return null;

  const latencies: number[] = [];
  let totalTokens = 0;
  let successes = 0;

  for (const prompt of TEST_PROMPTS) {
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const resp = await adapter.send({ model: 'default', prompt, maxTokens: 200, temperature: 0.5, stream: false });
      latencies.push(Date.now() - start);
      if (resp.success) {
        successes++;
        totalTokens += resp.tokensUsed;
      }
    }
  }

  const totalRuns = TEST_PROMPTS.length * iterations;
  const avgLatency = mean(latencies);
  const latencyScore = Math.max(0, 10 - avgLatency / 100);
  const successRate = successes / totalRuns;

  return {
    provider,
    model: 'default',
    avgLatencyMs: Math.round(avgLatency),
    costPerRun: 0.001,
    tokensUsed: totalTokens,
    successRate: Math.round(successRate * 100) / 100,
    score: Math.round((latencyScore * 0.4 + successRate * 60) * 100) / 100
  };
}

export async function runAllBenchmarks(): Promise<BenchmarkResult[]> {
  const providers: ProviderKind[] = ['mock', 'local', 'ollama', 'openai', 'anthropic', 'google'];
  const results: BenchmarkResult[] = [];

  for (const p of providers) {
    const r = await runBenchmark(p);
    if (r) results.push(r);
  }

  return results;
}
