import { execSync } from 'child_process'
import * as fsp from 'fs/promises'
import { LlamaCppBackend } from '../../src/backends/llama-cpp'

jest.mock('child_process', () => ({
  execSync: jest.fn(),
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

describe('LlamaCppBackend', () => {
  let backend: LlamaCppBackend

  beforeEach(() => {
    backend = new LlamaCppBackend()
    jest.clearAllMocks()
  })

  describe('isAvailable', () => {
    it('returns true when llama-quantize --help succeeds', async () => {
      execSyncMock.mockReturnValue('help output')
      const result = await backend.isAvailable()
      expect(result).toBe(true)
      expect(execSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('llama-quantize --help'),
        expect.objectContaining({ timeout: 5000, encoding: 'utf-8' }),
      )
    })

    it('returns false when llama-quantize throws', async () => {
      execSyncMock.mockImplementation(() => { throw new Error('not found') })
      const result = await backend.isAvailable()
      expect(result).toBe(false)
    })
  })

  describe('supportsMethod', () => {
    it('returns true for gguf', () => {
      expect(backend.supportsMethod('gguf')).toBe(true)
    })

    it('returns false for awq', () => {
      expect(backend.supportsMethod('awq')).toBe(false)
    })
  })

  describe('quantize', () => {
    const defaultConfig = {
      method: 'gguf' as const,
      bits: 4 as const,
      groupSize: 32,
      dataset: '',
      dampPercent: 0.01,
      descAct: false,
      sym: true,
      trueSequential: true,
    }

    it('executes the correct llama-quantize command', async () => {
      fspStatMock.mockResolvedValue({ size: 1000 })
      fspMkdirMock.mockResolvedValue(undefined)
      execSyncMock.mockReturnValue('quantization complete')

      const result = await backend.quantize('/path/to/model.bin', '/output', defaultConfig)

      expect(execSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('llama-quantize'),
        expect.objectContaining({ timeout: 3600000, encoding: 'utf-8' }),
      )
      expect(execSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('Q4_K_M'),
        expect.anything(),
      )
      expect(result.method).toBe('gguf')
      expect(result.bits).toBe(4)
      expect(result.backend).toBe('llama-cpp')
    })

    it('uses Q8_0 for 8 bits', async () => {
      fspStatMock.mockResolvedValue({ size: 1000 })
      fspMkdirMock.mockResolvedValue(undefined)
      execSyncMock.mockReturnValue('done')

      await backend.quantize('/path/to/model.bin', '/output', { ...defaultConfig, bits: 8 })

      expect(execSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('Q8_0'),
        expect.anything(),
      )
    })
  })

  describe('getGGUFType', () => {
    it('returns Q4_K_M for 4 bits', () => {
      expect((backend as any).getGGUFType(4)).toBe('Q4_K_M')
    })

    it('returns Q8_0 for 8 bits', () => {
      expect((backend as any).getGGUFType(8)).toBe('Q8_0')
    })
  })

  describe('convertToGGUF', () => {
    it('calls python3 convert.py script', async () => {
      fspMkdirMock.mockResolvedValue(undefined)
      execSyncMock.mockReturnValue('conversion done')

      const result = await backend.convertToGGUF('/path/to/model', '/output')

      expect(execSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('python3 convert.py'),
        expect.objectContaining({ timeout: 7200000, encoding: 'utf-8' }),
      )
      expect(result).toContain('.gguf')
    })
  })
})
