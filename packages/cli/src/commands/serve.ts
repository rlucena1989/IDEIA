import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { InferenceAutoOptimizer } from '@ideia/local-ai';
import { VLLMEngine } from '@ideia/local-ai';
import { getIO } from '../io';
const logger = createLogger('serve');

export function serveCommand(): Command {
  const cmd = new Command('serve').description('Serve a model with auto-optimized configuration');

  cmd
    .command('start')
    .description('Start model server with auto-optimization')
    .argument('<model>', 'model name or path (e.g., Qwen2.5-7B)')
    .option('--auto-optimize', 'auto-detect hardware and configure optimally')
    .option('--engine <engine>', 'inference engine (vllm, ollama, llamacpp)', 'auto')
    .option('--quantization <type>', 'weight quantization (awq, gptq, fp8, gguf)')
    .option('--kv-cache-fp8', 'enable KV cache FP8 quantization')
    .option('--port <port>', 'server port', '8000')
    .option('--host <host>', 'server host', '127.0.0.1')
    .option('--speculative <model>', 'draft model for speculative decoding')
    .option('--dry-run', 'show config without starting')
    .action(
      async (
        model: string,
        opts: {
          autoOptimize?: boolean;
          engine?: string;
          quantization?: string;
          kvCacheFp8?: boolean;
          port?: string;
          host?: string;
          speculative?: string;
          dryRun?: boolean;
        },
      ) => {
        const io = getIO();

        if (opts.autoOptimize) {
          io.outputLines([`🔍 Detecting hardware for model: ${model}`]);
          const optimizer = new InferenceAutoOptimizer();
          const hw = await optimizer.detectHardware();
          io.outputLines([
            `  Platform: ${hw.platform}`,
            `  CPU: ${hw.cpuCores} cores`,
            `  RAM: ${hw.totalMemoryGb}GB total, ${hw.freeMemoryGb}GB free`,
            `  GPU: ${hw.gpuDevices.length > 0 ? hw.gpuDevices.map((g) => `${g.name} (${g.memoryGb}GB)`).join(', ') : 'none'}`,
          ]);

          const sizeMatch = model.match(/(\d+)b/i);
          const modelSize = sizeMatch ? parseInt(sizeMatch[1] ?? '7') : 7;
          io.outputLines([`  Model size: ~${modelSize}B parameters`]);

          const suggestion = await optimizer.suggestConfig(modelSize);
          io.outputLines([
            '',
            `📋 Suggested configuration (confidence: ${Math.round(suggestion.confidence * 100)}%):`,
            `  Engine: ${suggestion.config.engine}`,
            `  Weights quantization: ${suggestion.config.quantization.weights}`,
            `  KV cache: ${suggestion.config.quantization.kvCache}`,
            `  Batching: ${suggestion.config.batching.type} (max ${suggestion.config.batching.maxNumSeqs} seqs)` +
              `, ${suggestion.config.batching.maxNumBatchedTokens} tokens`,
            `  Prefix caching: ${suggestion.config.prefixCaching ? 'yes' : 'no'}`,
            `  Chunked prefill: ${suggestion.config.chunkedPrefill ? 'yes' : 'no'}`,
            `  Speculative decoding: ${suggestion.config.speculativeDecoding ? `yes (${suggestion.config.speculativeDecoding.draftModel})` : 'no'}`,
            `  Expected tokens/s: ${suggestion.expectedTokensPerSecond}`,
            `  Estimated VRAM: ${suggestion.expectedVRAMUsage}GB`,
            '',
            '  Reasoning:',
            ...suggestion.reasoning.map((r) => `    • ${r}`),
          ]);

          if (opts.dryRun) {
            io.outputLines(['', '⚠ Dry run — no server started. Use --no-dry-run to serve.']);
            return;
          }

          if (suggestion.config.engine === 'vllm') {
            io.outputLines(['', `🚀 Starting vLLM server on ${opts.host}:${opts.port}...`]);
            const vllm = new VLLMEngine({
              model,
              quantization: suggestion.config.quantization.weights !== 'none' ? suggestion.config.quantization.weights : undefined,
              kvCacheDtype: suggestion.config.quantization.kvCache !== 'none' ? suggestion.config.quantization.kvCache : undefined,
              enablePrefixCaching: suggestion.config.prefixCaching,
              enableChunkedPrefill: suggestion.config.chunkedPrefill,
              speculativeModel: suggestion.config.speculativeDecoding?.draftModel,
              numSpeculativeTokens: suggestion.config.speculativeDecoding?.numSpeculativeTokens,
              maxNumSeqs: suggestion.config.batching.maxNumSeqs,
              maxNumBatchedTokens: suggestion.config.batching.maxNumBatchedTokens,
              port: parseInt(opts.port || '8000'),
              host: opts.host || 'localhost',
            });
            await vllm.start();
            io.outputLines(['✅ vLLM server is running']);
          } else {
            io.outputLines([`ℹ Use Ollama/llama.cpp for engine: ${suggestion.config.engine}`]);
          }
        } else {
          io.outputLines([`ℹ Starting ${model} with manual configuration...`]);
          const vllm = new VLLMEngine({
            model,
            quantization: opts.quantization,
            kvCacheDtype: opts.kvCacheFp8 ? 'fp8' : undefined,
            speculativeModel: opts.speculative,
            port: parseInt(opts.port || '8000'),
            host: opts.host || 'localhost',
          });
          await vllm.start();
          io.outputLines([`✅ Server running on ${opts.host || 'localhost'}:${opts.port}`]);
        }
      },
    );

  cmd
    .command('status')
    .description('Check running server status')
    .option('--port <port>', 'server port', '8000')
    .action(async (opts: { port?: string }) => {
      const io = getIO();
      try {
        const resp = await fetch(`http://127.0.0.1:${opts.port || '8000'}/v1/models`, { signal: AbortSignal.timeout(2000) });
        if (resp.ok) {
          const data = (await resp.json()) as { data: Array<{ id: string }> };
          io.outputLines(['✅ vLLM server is running', `  Models: ${data.data.map((m: { id: string }) => m.id).join(', ')}`]);
        } else {
          io.outputLines(['⚠ Server responded but with unexpected status']);
        }
      } catch {
        io.outputLines(['❌ No vLLM server running on port ' + (opts.port || '8000')]);
      }
    });

  cmd
    .command('benchmark')
    .description('Quick benchmark to find optimal configuration')
    .argument('<model>', 'model name')
    .option('--quick', 'quick benchmark (fewer samples)')
    .option('--engines <engines>', 'comma-separated engines to test (vllm,ollama,llamacpp)')
    .action(async (model: string, opts: { quick?: boolean; engines?: string }) => {
      const io = getIO();
      const optimizer = new InferenceAutoOptimizer();
      io.outputLines([`🔬 Benchmarking ${model}...`]);

      const sizeMatch = model.match(/(\d+)b/i);
      const modelSize = sizeMatch ? parseInt(sizeMatch[1] ?? '7') : 7;
      const suggestion = await optimizer.suggestConfig(modelSize);

      const engineTypes = opts.engines?.split(',').map((s) => s.trim()) || [suggestion.config.engine];
      const candidateConfigs: import('@ideia/local-ai').InferenceEngineConfig[] = [];

      for (const engine of engineTypes) {
        if (engine === 'vllm' || engine === suggestion.config.engine) {
          candidateConfigs.push(suggestion.config);
        }
        if (engine === 'ollama' || (engine === 'auto' && suggestion.config.engine !== 'ollama')) {
          candidateConfigs.push({
            engine: 'ollama',
            quantization: { weights: 'none', kvCache: 'none' },
            batching: { type: 'static', maxNumSeqs: 1, maxNumBatchedTokens: 2048 },
            prefixCaching: false,
            chunkedPrefill: false,
          });
        }
      }

      const results = await optimizer.benchmark(candidateConfigs, model);
      io.outputLines(['', '📊 Benchmark Results:']);
      if (results.length === 0) {
        io.outputLines(['  No benchmark results. Ensure the inference engine is installed and running.']);
        return;
      }
      for (const r of results) {
        const best = results.indexOf(r) === 0 ? ' ★ BEST' : '';
        io.outputLines([
          `  ${r.config.engine} (${r.config.quantization.weights})${best}`,
          `    Tokens/s:  ${r.tokensPerSecond}`,
          `    TTFT:      ${r.ttft}ms`,
          `    P50:       ${r.p50}ms`,
          `    P99:       ${r.p99}ms`,
          `    VRAM:      ${r.vramUsage}GB`,
          `    Total:     ${r.totalTokens} tokens in ${(r.totalTimeMs / 1000).toFixed(1)}s`,
        ]);
      }
      io.outputLines([
        '',
        `💡 Recommendation: Use ${results[0]?.config.engine} with ${results[0]?.config.quantization.weights} quantization`,
      ]);
    });

  return cmd;
}
