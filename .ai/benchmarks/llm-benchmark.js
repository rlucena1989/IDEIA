#!/usr/bin/env node

/**
 * LLM Benchmark Suite — Tests LLM providers for performance metrics
 *
 * Metrics: TTFT (time to first token), TPS (tokens per second), latency P50/P95/P99
 *
 * Usage:
 *   node .ai/benchmarks/llm-benchmark.js                          # run all benchmarks
 *   node .ai/benchmarks/llm-benchmark.js --provider ollama         # specific provider
 *   node .ai/benchmarks/llm-benchmark.js --compare                 # compare multiple providers
 *   node .ai/benchmarks/llm-benchmark.js --output report.json      # save results
 */

const BENCHMARK_PROMPTS = [
  'Explain what clean architecture is in one paragraph.',
  'Write a hello world function in TypeScript.',
  'What are the benefits of domain-driven design?',
  'Describe the difference between REST and GraphQL.',
  'List 5 principles of secure software development.',
];

const PROVIDER_CONFIGS = {
  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2',
    type: 'ollama',
  },
  openai: {
    url: process.env.OPENAI_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY,
    type: 'openai',
  },
  deepseek: {
    url: process.env.DEEPSEEK_URL || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY,
    type: 'openai',
  },
};

async function benchmarkProvider(provider, model, prompts) {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const results = [];
  const latencies = [];

  for (const prompt of prompts) {
    const startTime = Date.now();
    let firstTokenTime = 0;
    let totalTokens = 0;

    try {
      const response = await callLLM(config, prompt, {
        onToken: () => {
          if (firstTokenTime === 0) firstTokenTime = Date.now();
          totalTokens++;
        },
      });

      const endTime = Date.now();
      const totalLatency = endTime - startTime;
      const ttft = firstTokenTime > 0 ? firstTokenTime - startTime : totalLatency;
      const tps = totalLatency > 0 && totalTokens > 0 ? (totalTokens / (totalLatency / 1000)) : 0;

      latencies.push(totalLatency);

      results.push({
        provider,
        model,
        prompt: prompt.slice(0, 50),
        ttft,
        tps: Math.round(tps * 100) / 100,
        totalLatency,
        totalTokens,
        success: true,
      });
    } catch (err) {
      results.push({
        provider,
        model,
        prompt: prompt.slice(0, 50),
        error: err.message,
        success: false,
      });
    }
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const stats = {
    provider,
    model,
    totalRequests: prompts.length,
    successfulRequests: results.filter(r => r.success).length,
    failedRequests: results.filter(r => !r.success).length,
    ttft: results.filter(r => r.success).reduce((s, r) => s + r.ttft, 0) / Math.max(1, results.filter(r => r.success).length),
    tps: results.filter(r => r.success).reduce((s, r) => s + r.tps, 0) / Math.max(1, results.filter(r => r.success).length),
    latencyMs: {
      p50: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] || sorted[sorted.length - 1] : 0,
      p95: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1] : 0,
      p99: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1] : 0,
      avg: latencies.length > 0 ? latencies.reduce((s, v) => s + v, 0) / latencies.length : 0,
    },
  };

  return { results, stats };
}

async function callLLM(config, prompt, callbacks) {
  const { onToken } = callbacks || {};

  if (config.type === 'ollama') {
    const res = await fetch(`${config.url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.model, prompt, stream: false }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (onToken) onToken();
    return data.response || '';
  }

  if (config.type === 'openai') {
    if (!config.apiKey) throw new Error(`API key not configured for ${config.url}`);
    const res = await fetch(`${config.url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (onToken) {
      const tokens = content.split(/\s+/).length;
      for (let i = 0; i < tokens; i++) onToken();
    }
    return content;
  }

  throw new Error(`Unsupported provider type: ${config.type}`);
}

async function compareProviders(configs) {
  const allResults = [];

  for (const [name, _config] of Object.entries(configs)) {
    try {
      console.error(`Benchmarking ${name}...`);
      const result = await benchmarkProvider(name, _config.model, BENCHMARK_PROMPTS);
      allResults.push(result);
    } catch (err) {
      console.error(`Failed to benchmark ${name}: ${err.message}`);
    }
  }

  return {
    comparison: allResults.map(r => ({
      provider: r.stats.provider,
      model: r.stats.model,
      ttft: Math.round(r.stats.ttft),
      tps: r.stats.tps,
      latencyP50: r.stats.latencyMs.p50,
      latencyP95: r.stats.latencyMs.p95,
      latencyP99: r.stats.latencyMs.p99,
      successRate: `${r.stats.successfulRequests}/${r.stats.totalRequests}`,
    })),
    results: allResults,
    generatedAt: new Date().toISOString(),
  };
}

async function run() {
  const args = process.argv.slice(2);
  const providerFlag = args.find(a => a.startsWith('--provider='))?.split('=')[1];
  const compareMode = args.includes('--compare');
  const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1];

  let report;

  if (compareMode) {
    report = await compareProviders(PROVIDER_CONFIGS);
  } else if (providerFlag) {
    const config = PROVIDER_CONFIGS[providerFlag];
    if (!config) {
      console.error(`Unknown provider: ${providerFlag}. Available: ${Object.keys(PROVIDER_CONFIGS).join(', ')}`);
      process.exit(1);
    }
    report = await benchmarkProvider(providerFlag, config.model, BENCHMARK_PROMPTS);
  } else {
    const singleResults = [];
    for (const [name, _config] of Object.entries(PROVIDER_CONFIGS)) {
      try {
        console.error(`Benchmarking ${name}...`);
        const result = await benchmarkProvider(name, _config.model, BENCHMARK_PROMPTS);
        singleResults.push(result);
      } catch (err) {
        console.error(`Failed to benchmark ${name}: ${err.message}`);
      }
    }
    report = {
      comparison: singleResults.map(r => ({
        provider: r.stats.provider,
        model: r.stats.model,
        ttft: Math.round(r.stats.ttft),
        tps: r.stats.tps,
        latencyP50: r.stats.latencyMs.p50,
        latencyP95: r.stats.latencyMs.p95,
        latencyP99: r.stats.latencyMs.p99,
        successRate: `${r.stats.successfulRequests}/${r.stats.totalRequests}`,
      })),
      results: singleResults,
      generatedAt: new Date().toISOString(),
    };
  }

  if (outputFile) {
    const fs = require('fs');
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.error(`Report saved to ${outputFile}`);
  }

  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (require.main === module) {
  run().catch(err => {
    console.error('Benchmark failed:', err.message);
    process.exit(1);
  });
}

module.exports = { benchmarkProvider, compareProviders, PROVIDER_CONFIGS, BENCHMARK_PROMPTS };
