import { Command } from 'commander'
import { createLogger } from '@ideia/logger';
import { QuantizationEngine, MoERouter } from '@ideia/local-ai'
import { getIO } from '../io'
const logger = createLogger('quantize');

export function quantizeCommand(): Command {
  const cmd = new Command('quantize')
    .description('Model quantization and compression')

  cmd
    .command('compress')
    .description('Compress a model using quantization')
    .argument('<model-path>', 'path to model file')
    .option('--method <method>', 'quantization method (gptq, awq, gguf, fp8, nf4)', 'awq')
    .option('--bits <bits>', 'bits per weight (4, 8)', '4')
    .option('--output <dir>', 'output directory', '.ai/quantized')
    .option('--calibration-dataset <path>', 'calibration dataset path')
    .option('--dry-run', 'estimate without compressing')
    .action(async (modelPath: string, opts: { method?: string; bits?: string; output?: string; calibrationDataset?: string; dryRun?: boolean }) => {
      const io = getIO()
      const engine = new QuantizationEngine()

      if (opts.dryRun) {
        const stat = await import('fs/promises')
        let size = 0
        try { size = (await stat.stat(modelPath)).size } catch { size = 10_000_000_000 }
        const estimate = await engine.estimate(size, (opts.method as 'gptq' | 'awq' | 'gguf' | 'fp8' | 'nf4') || 'awq')
        io.outputLines([
          `Estimate for ${modelPath}:`,
          `  Method: ${opts.method}`,
          `  Bits: ${opts.bits}`,
          `  Original: ${(size / 1e9).toFixed(2)}GB`,
          `  Compressed: ${(estimate.compressedSize / 1e9).toFixed(2)}GB`,
          `  Ratio: ${estimate.ratio}x`,
          `  Est. quality: ${Math.round(estimate.quality * 100)}%`,
        ])
        return
      }

      io.outputLines([`Quantizing ${modelPath} with ${opts.method} ${opts.bits}-bit...`])
      const result = await engine.quantize(modelPath, opts.output || '.ai/quantized', (opts.method as 'gptq' | 'awq' | 'gguf' | 'fp8' | 'nf4') || 'awq')
      io.outputLines([
        '✅ Quantization complete:',
        `  Output: ${result.outputPath}`,
        `  Original: ${(result.originalSizeBytes / 1e9).toFixed(2)}GB`,
        `  Compressed: ${(result.compressedSizeBytes / 1e9).toFixed(2)}GB`,
        `  Ratio: ${result.compressionRatio}x`,
        `  Quality: ${Math.round(result.qualityScore * 100)}%`,
        `  Time: ${(result.quantizationTimeMs / 1000).toFixed(1)}s`,
      ])
    })

  cmd
    .command('benchmark')
    .description('Compare quantization methods')
    .argument('<model-path>', 'path to model file')
    .action(async (modelPath: string) => {
      const io = getIO()
      const engine = new QuantizationEngine()

      io.outputLines([`Benchmarking quantization methods for ${modelPath}...`, ''])
      const results = await engine.benchmark(['awq', 'gptq', 'gguf', 'fp8', 'nf4'], modelPath)

      io.outputLines(['Method   │ Ratio  │ Quality │ Size'])
      io.outputLines(['─────────┼────────┼─────────┼──────'])
      for (const r of results) {
        io.outputLines([
          ` ${r.method.padEnd(7)} │ ${r.compressionRatio.toFixed(2)}x │ ${(r.qualityScore * 100).toFixed(0)}%    │ ${(r.compressedSizeBytes / 1e9).toFixed(2)}GB`,
        ])
      }

      const best = results[0]
      io.outputLines(['', `Recommended: ${best.method} (${Math.round(best.qualityScore * 100)}% quality, ${best.compressionRatio}x compression)`])
    })

  cmd
    .command('estimate')
    .description('Estimate compression for a model size')
    .argument('<size-gb>', 'model size in GB')
    .action(async (sizeGb: string) => {
      const io = getIO()
      const engine = new QuantizationEngine()
      const bytes = parseFloat(sizeGb) * 1e9

      io.outputLines([`Estimates for ${sizeGb}GB model:`, ''])
      for (const method of ['awq', 'gptq', 'gguf', 'fp8', 'nf4'] as const) {
        const est = await engine.estimate(bytes, method)
        io.outputLines([
          `  ${method.padEnd(5)} → ${(est.compressedSize / 1e9).toFixed(2)}GB (${est.ratio}x) — ${Math.round(est.quality * 100)}% quality`,
        ])
      }
    })

  cmd
    .command('moe-list')
    .description('List known MoE models and their requirements')
    .option('--vram <gb>', 'filter by available VRAM')
    .action(async (opts: { vram?: string }) => {
      const io = getIO()
      const router = new MoERouter()

      const models = opts.vram
        ? router.getRecommendedForVRAM(parseFloat(opts.vram))
        : (await import('@ideia/local-ai')).KNOWN_MOE_MODELS

      io.outputLines(['MoE Models:', ''])
      io.outputLines(['Model                │ Total  │ Active │ Experts │ VRAM need'])
      io.outputLines(['─────────────────────┼────────┼────────┼─────────┼──────────'])
      for (const m of models) {
        const vram = (m.totalParams * 0.5).toFixed(0)
        io.outputLines([
          ` ${m.id.padEnd(20)} │ ${String(m.totalParams).padStart(4)}B │ ${String(m.activeParams).padStart(4)}B │ ${String(m.numExperts).padStart(5)}  │ ~${vram}GB`,
        ])
      }
    })

  return cmd
}
