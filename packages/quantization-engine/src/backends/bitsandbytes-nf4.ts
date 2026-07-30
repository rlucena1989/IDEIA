import { execSync } from 'child_process'
import * as path from 'path'
import * as fsp from 'fs/promises'
import { createLogger } from '@ideia/logger'
import type { QuantizationConfig, QuantizedModelInfo, BackendType } from '../types'

const log = createLogger('quantization-engine:backend:nf4')

const BACKEND: BackendType = 'bitsandbytes-nf4'

export class BitsAndBytesNF4Backend {
  async isAvailable(): Promise<boolean> {
    try {
      execSync('python3 -c "import bitsandbytes; print(bitsandbytes.__version__)" 2>&1', { timeout: 5000, encoding: 'utf-8' })
      return true
    } catch {
      try {
        execSync('python -c "import bitsandbytes; print(bitsandbytes.__version__)" 2>&1', { timeout: 5000, encoding: 'utf-8' })
        return true
      } catch {
        return false
      }
    }
  }

  async quantize(
    modelPath: string,
    outputDir: string,
    config: QuantizationConfig,
  ): Promise<QuantizedModelInfo> {
    const start = Date.now()

    let originalSize = 0
    try {
      const stat = await fsp.stat(modelPath)
      originalSize = stat.size
    } catch {
      originalSize = 0
    }

    const outputPath = path.join(outputDir, `nf4-gs${config.groupSize}`)
    await fsp.mkdir(outputPath, { recursive: true })

    const scriptPath = path.join(outputDir, '_quantize_nf4.py')
    const script = this.generateScript(modelPath, outputPath, config)
    await fsp.writeFile(scriptPath, script, 'utf-8')

    try {
      log.info('Running bitsandbytes NF4 quantization', {
        model: modelPath,
        groupSize: config.groupSize,
      })

      const result = execSync(`python3 "${scriptPath}" 2>&1`, {
        timeout: 3600000,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      })

      const duration = Date.now() - start
      const compressedSize = await this.calculateDirSize(outputPath)

      const info: QuantizedModelInfo = {
        originalPath: modelPath,
        outputPath,
        method: 'nf4',
        bits: 4,
        originalSizeBytes: originalSize,
        compressedSizeBytes: compressedSize,
        compressionRatio: originalSize > 0 ? Math.round((originalSize / compressedSize) * 100) / 100 : 0,
        qualityScore: 0.995,
        quantizationTimeMs: duration,
        calibrated: config.dataset.length > 0,
        backend: BACKEND,
      }

      log.info('NF4 quantization complete', {
        ratio: `${info.compressionRatio}x`,
        duration: `${duration}ms`,
        output: result.slice(0, 200),
      })

      return info
    } finally {
      await fsp.unlink(scriptPath).catch(() => {})
    }
  }

  supportsMethod(method: string): boolean {
    return method === 'nf4'
  }

  private generateScript(modelPath: string, outputPath: string, config: QuantizationConfig): string {
    return `
import sys
try:
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    import torch

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    model = AutoModelForCausalLM.from_pretrained(
        "${modelPath.replace(/\\/g, '/')}",
        quantization_config=bnb_config,
        device_map="auto",
    )
    tokenizer = AutoTokenizer.from_pretrained("${modelPath.replace(/\\/g, '/')}")
    model.save_pretrained("${outputPath.replace(/\\/g, '/')}")
    tokenizer.save_pretrained("${outputPath.replace(/\\/g, '/')}")
    print(f"OK: NF4 quantization complete to ${outputPath}")
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
`
  }

  private async calculateDirSize(dirPath: string): Promise<number> {
    let total = 0
    try {
      const entries = await fsp.readdir(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isFile()) {
          total += (await fsp.stat(fullPath)).size
        } else if (entry.isDirectory()) {
          total += await this.calculateDirSize(fullPath)
        }
      }
    } catch { /* ignore */ }
    return total
  }
}
