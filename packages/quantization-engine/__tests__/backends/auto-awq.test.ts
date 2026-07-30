import * as path from 'path'
import { execSync } from 'child_process'
import * as fsp from 'fs/promises'
import { AutoAWQBackend } from '../../src/backends/auto-awq'
import type { QuantizationConfig } from '../../src/types'

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}))

jest.mock('fs/promises', () => ({
  stat: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readdir: jest.fn(),
  unlink: jest.fn(),
}))

const execSyncMock = execSync as jest.Mock
const statMock = fsp.stat as jest.Mock
const mkdirMock = fsp.mkdir as jest.Mock
const writeFileMock = fsp.writeFile as jest.Mock
const readdirMock = fsp.readdir as jest.Mock
const unlinkMock = fsp.unlink as jest.Mock

function makeConfig(overrides: Partial<QuantizationConfig> = {}): QuantizationConfig {
  return {
    method: 'awq',
    bits: 4,
    groupSize: 128,
    dataset: '',
    dampPercent: 0.01,
    descAct: true,
    sym: true,
    trueSequential: true,
    ...overrides,
  }
}

describe('AutoAWQBackend', () => {
  let backend: AutoAWQBackend

  beforeEach(() => {
    backend = new AutoAWQBackend()
    jest.clearAllMocks()
  })

  describe('supportsMethod', () => {
    it('returns true for awq', () => {
      expect(backend.supportsMethod('awq')).toBe(true)
    })

    it('returns false for gptq', () => {
      expect(backend.supportsMethod('gptq')).toBe(false)
    })

    it('returns false for gguf', () => {
      expect(backend.supportsMethod('gguf')).toBe(false)
    })

    it('returns false for fp8', () => {
      expect(backend.supportsMethod('fp8')).toBe(false)
    })

    it('returns false for nf4', () => {
      expect(backend.supportsMethod('nf4')).toBe(false)
    })
  })

  describe('isAvailable', () => {
    it('returns true when python3 import succeeds', async () => {
      execSyncMock.mockReturnValueOnce('')
      const result = await backend.isAvailable()
      expect(result).toBe(true)
      expect(execSyncMock).toHaveBeenCalledTimes(1)
      expect(execSyncMock).toHaveBeenCalledWith(
        'python3 -c "import awq" 2>&1',
        expect.objectContaining({ timeout: 5000, encoding: 'utf-8' }),
      )
    })

    it('returns true when python import succeeds after python3 fails', async () => {
      execSyncMock
        .mockImplementationOnce(() => { throw new Error('not found') })
        .mockReturnValueOnce('')
      const result = await backend.isAvailable()
      expect(result).toBe(true)
      expect(execSyncMock).toHaveBeenCalledTimes(2)
      expect(execSyncMock).toHaveBeenNthCalledWith(
        1,
        'python3 -c "import awq" 2>&1',
        expect.objectContaining({ timeout: 5000, encoding: 'utf-8' }),
      )
      expect(execSyncMock).toHaveBeenNthCalledWith(
        2,
        'python -c "import awq" 2>&1',
        expect.objectContaining({ timeout: 5000, encoding: 'utf-8' }),
      )
    })

    it('returns false when both python3 and python fail', async () => {
      execSyncMock
        .mockImplementationOnce(() => { throw new Error('not found') })
        .mockImplementationOnce(() => { throw new Error('not found') })
      const result = await backend.isAvailable()
      expect(result).toBe(false)
      expect(execSyncMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('quantize', () => {
    const modelPath = '/models/llama'
    const outputDir = '/output'
    const config = makeConfig({ dataset: 'wikitext2' })
    const originalSize = 2_000_000_000
    const compressedSize = 600_000_000

    beforeEach(() => {
      const now = 2_000_000_000
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now + 120_000)

      statMock.mockImplementation((path: string) => {
        if (path === modelPath) {
          return Promise.resolve({ size: originalSize } as any)
        }
        if (path.endsWith('model.safetensors')) {
          return Promise.resolve({ size: compressedSize } as any)
        }
        return Promise.reject(new Error('not found'))
      })

      mkdirMock.mockResolvedValue(undefined)
      writeFileMock.mockResolvedValue(undefined)
      execSyncMock.mockReturnValue('OK: AWQ quantization complete to /output/awq-4bit-gs128')
      readdirMock.mockResolvedValue([
        { name: 'model.safetensors', isFile: () => true, isDirectory: () => false } as any,
      ])
      unlinkMock.mockResolvedValue(undefined)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('returns QuantizedModelInfo with correct metadata', async () => {
      const info = await backend.quantize(modelPath, outputDir, config)

      expect(info.originalPath).toBe(modelPath)
      expect(info.outputPath).toBe(path.join('/output', 'awq-4bit-gs128'))
      expect(info.method).toBe('awq')
      expect(info.bits).toBe(4)
      expect(info.originalSizeBytes).toBe(originalSize)
      expect(info.compressedSizeBytes).toBe(compressedSize)
      expect(info.compressionRatio).toBeCloseTo(3.33, 1)
      expect(info.qualityScore).toBe(0.995)
      expect(info.quantizationTimeMs).toBe(120_000)
      expect(info.calibrated).toBe(true)
      expect(info.backend).toBe('auto-awq')
    })

    it('writes and removes the Python script', async () => {
      await backend.quantize(modelPath, outputDir, config)

      expect(mkdirMock).toHaveBeenCalledWith(
        path.join('/output', 'awq-4bit-gs128'),
        { recursive: true },
      )
      expect(writeFileMock).toHaveBeenCalledWith(
        path.join('/output', '_quantize_awq.py'),
        expect.stringContaining('from awq import AutoAWQForCausalLM'),
        'utf-8',
      )
      expect(unlinkMock).toHaveBeenCalledWith(path.join('/output', '_quantize_awq.py'))
    })

    it('sets calibrated false when dataset is empty', async () => {
      const cfg = makeConfig({ dataset: '' })
      const info = await backend.quantize(modelPath, outputDir, cfg)
      expect(info.calibrated).toBe(false)
    })

    it('handles original stat error and sets originalSizeBytes to 0', async () => {
      statMock.mockImplementation((path: string) => {
        if (path === modelPath) {
          return Promise.reject(new Error('ENOENT'))
        }
        return Promise.resolve({ size: compressedSize } as any)
      })

      const info = await backend.quantize(modelPath, outputDir, config)
      expect(info.originalSizeBytes).toBe(0)
      expect(info.compressionRatio).toBe(0)
    })

    it('propagates error when execSync throws', async () => {
      execSyncMock.mockImplementation(() => { throw new Error('Python error') })
      await expect(backend.quantize(modelPath, outputDir, config))
        .rejects.toThrow('Python error')
    })

    it('cleans up script even when execSync fails', async () => {
      execSyncMock.mockImplementation(() => { throw new Error('fail') })
      await expect(backend.quantize(modelPath, outputDir, config))
        .rejects.toThrow('fail')
      expect(unlinkMock).toHaveBeenCalledWith(path.join('/output', '_quantize_awq.py'))
    })
  })
})
