import { execSync } from 'child_process'
import * as fsp from 'fs/promises'
import { VLLMBackend } from '../../src/backends/vllm'

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn(),
  execFileSync: jest.fn(),
}))
jest.mock('fs/promises', () => ({
  stat: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  readdir: jest.fn(),
}))
jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}))

const execSyncMock = execSync as jest.Mock
const fspStatMock = fsp.stat as jest.Mock
const fspMkdirMock = fsp.mkdir as jest.Mock
const fspWriteFileMock = fsp.writeFile as jest.Mock
const fspUnlinkMock = fsp.unlink as jest.Mock
const fspReaddirMock = fsp.readdir as jest.Mock

describe('VLLMBackend', () => {
  let backend: VLLMBackend

  beforeEach(() => {
    backend = new VLLMBackend()
    jest.clearAllMocks()
  })

  describe('isAvailable', () => {
    it('returns true when vllm CLI succeeds', async () => {
      execSyncMock.mockReturnValue('vllm help output')
      const result = await backend.isAvailable()
      expect(result).toBe(true)
      expect(execSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('vllm --help'),
        expect.objectContaining({ timeout: 5000 }),
      )
    })

    it('returns true when python3 import vllm succeeds', async () => {
      execSyncMock
        .mockImplementationOnce(() => { throw new Error('vllm CLI not found') })
        .mockReturnValueOnce('vllm imported')
      const result = await backend.isAvailable()
      expect(result).toBe(true)
    })

    it('returns false when all checks fail', async () => {
      execSyncMock
        .mockImplementationOnce(() => { throw new Error('not found') })
        .mockImplementationOnce(() => { throw new Error('not found') })
      const result = await backend.isAvailable()
      expect(result).toBe(false)
      expect(execSyncMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('supportsMethod', () => {
    it('returns true for fp8', () => {
      expect(backend.supportsMethod('fp8')).toBe(true)
    })

    it('returns true for awq', () => {
      expect(backend.supportsMethod('awq')).toBe(true)
    })

    it('returns true for gptq', () => {
      expect(backend.supportsMethod('gptq')).toBe(true)
    })

    it('returns false for gguf', () => {
      expect(backend.supportsMethod('gguf')).toBe(false)
    })
  })

  describe('quantize', () => {
    const baseConfig = {
      method: 'fp8' as const,
      bits: 8 as const,
      groupSize: 32,
      dataset: 'test-dataset',
      dampPercent: 0.01,
      descAct: true,
      sym: true,
      trueSequential: false,
    }

    it('generates FP8 Python script for fp8 method', async () => {
      fspStatMock.mockResolvedValue({ size: 2000 })
      fspMkdirMock.mockResolvedValue(undefined)
      fspWriteFileMock.mockResolvedValue(undefined)
      fspUnlinkMock.mockResolvedValue(undefined)
      fspReaddirMock.mockResolvedValue([])
      execSyncMock.mockReturnValue('FP8 conversion complete')

      const result = await backend.quantize('/path/to/model', '/output', baseConfig)

      expect(fsp.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('_convert_fp8.py'),
        expect.stringContaining('torch.float8_e4m3fn'),
        'utf-8',
      )
      expect(execSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('python3'),
        expect.objectContaining({ timeout: 7200000 }),
      )
      expect(fsp.unlink).toHaveBeenCalledWith(expect.stringContaining('_convert_fp8.py'))
      expect(result.method).toBe('fp8')
      expect(result.backend).toBe('vllm')
    })

    it('copies config for awq method', async () => {
      fspStatMock.mockResolvedValue({ size: 2000 })
      fspMkdirMock.mockResolvedValue(undefined)
      fspWriteFileMock.mockResolvedValue(undefined)
      fspReaddirMock.mockResolvedValue([])
      execSyncMock.mockReturnValue('')

      const config = { ...baseConfig, method: 'awq' as const, bits: 4 as const }
      const result = await backend.quantize('/path/to/model', '/output', config)

      expect(fsp.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('quantize_config.json'),
        expect.stringContaining('"quant_method": "awq"'),
        'utf-8',
      )
      expect(result.method).toBe('awq')
    })

    it('copies config for gptq method', async () => {
      fspStatMock.mockResolvedValue({ size: 2000 })
      fspMkdirMock.mockResolvedValue(undefined)
      fspWriteFileMock.mockResolvedValue(undefined)
      fspReaddirMock.mockResolvedValue([])
      execSyncMock.mockReturnValue('')

      const config = { ...baseConfig, method: 'gptq' as const, bits: 4 as const }
      const result = await backend.quantize('/path/to/model', '/output', config)

      expect(fsp.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('quantize_config.json'),
        expect.stringContaining('"quant_method": "gptq"'),
        'utf-8',
      )
      expect(result.method).toBe('gptq')
    })
  })
})
