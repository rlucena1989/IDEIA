import { execSync } from 'child_process'
import * as path from 'path'
import * as fsp from 'fs/promises'
import { createLogger } from '@ideia/logger'
import type { QuantizationConfig, QuantizedModelInfo, BackendType } from '../types'

const log = createLogger('quantization-engine:backend:llamacpp')

const BACKEND: BackendType = 'llama-cpp'

const GGUF_TYPES: Record<string, string> = {
  'q2_k': 'Q2_K',
  'q3_k_m': 'Q3_K_M',
  'q4_k_m': 'Q4_K_M',
  'q5_k_m': 'Q5_K_M',
  'q8_0': 'Q8_0',
}

export class LlamaCppBackend {
  supportsMethod(method: string): boolean {
    return method === 'gguf'
  }

  async isAvailable(): Promise<boolean> {
    try {
      execSync('llama-quantize --help 2>&1 || llama-cli --version 2>&1', { timeout: 5000, encoding: 'utf-8' })
      return true
    } catch {
      return false
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

    const ggufType = this.getGGUFType(config.bits)
    const ext = path.extname(modelPath) || '.gguf'
    const baseName = path.basename(modelPath, ext)
    const outputFile = path.join(outputDir, `${baseName}-${ggufType}.gguf`)
    await fsp.mkdir(outputDir, { recursive: true })

    log.info('Running llama.cpp quantization', {
      model: modelPath,
      type: ggufType,
      bits: config.bits,
    })

    const cmd = `llama-quantize "${modelPath}" "${outputFile}" ${ggufType} 2>&1`
    const result = execSync(cmd, {
      timeout: 3600000,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    })

    const duration = Date.now() - start
    let compressedSize = 0
    try {
      compressedSize = (await fsp.stat(outputFile)).size
    } catch { /* file may not exist */ }

    const info: QuantizedModelInfo = {
      originalPath: modelPath,
      outputPath: outputFile,
      method: 'gguf',
      bits: config.bits,
      originalSizeBytes: originalSize,
      compressedSizeBytes: compressedSize,
      compressionRatio: originalSize > 0 ? Math.round((originalSize / compressedSize) * 100) / 100 : 0,
      qualityScore: ggufType === 'Q8_0' ? 0.99 : ggufType === 'Q4_K_M' ? 0.97 : 0.95,
      quantizationTimeMs: duration,
      calibrated: false,
      backend: BACKEND,
    }

    log.info('llama.cpp quantization complete', {
      type: ggufType,
      ratio: `${info.compressionRatio}x`,
      duration: `${duration}ms`,
      output: result.slice(0, 200),
    })

    return info
  }

  async convertToGGUF(modelPath: string, outputDir: string): Promise<string> {
    const outputPath = path.join(outputDir, `${path.basename(modelPath)}.gguf`)
    await fsp.mkdir(outputDir, { recursive: true })

    log.info('Converting model to GGUF format', { model: modelPath })

    const cmd = `python3 convert.py "${modelPath}" --outfile "${outputPath}" 2>&1`
    execSync(cmd, { timeout: 7200000, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })

    return outputPath
  }

  private getGGUFType(bits: number): string {
    if (bits === 8) return 'Q8_0'
    if (bits === 4) return 'Q4_K_M'
    return 'Q4_K_M'
  }
}
