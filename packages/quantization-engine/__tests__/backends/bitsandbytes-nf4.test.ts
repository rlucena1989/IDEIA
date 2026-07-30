import { BitsAndBytesNF4Backend } from '../../src/backends/bitsandbytes-nf4'
import { execSync } from 'child_process'

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  execFileSync: jest.fn(),
}))

jest.mock('node:fs/promises', () => ({
  stat: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  readdir: jest.fn(),
}))

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))

describe('BitsAndBytesNF4Backend', () => {
  let backend: BitsAndBytesNF4Backend

  beforeEach(() => {
    backend = new BitsAndBytesNF4Backend()
    jest.clearAllMocks()
  })

  describe('supportsMethod', () => {
    it('returns true for nf4', () => {
      expect(backend.supportsMethod('nf4')).toBe(true)
    })

    it('returns false for awq', () => {
      expect(backend.supportsMethod('awq')).toBe(false)
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
  })

  describe('isAvailable', () => {
    it('returns true when python3 bitsandbytes import succeeds', async () => {
      ;(execSync as jest.Mock).mockReturnValue('0.44.0')
      const result = await backend.isAvailable()
      expect(result).toBe(true)
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('python3'),
        expect.any(Object)
      )
    })

    it('returns true when python bitsandbytes import succeeds (fallback)', async () => {
      ;(execSync as jest.Mock)
        .mockImplementationOnce(() => { throw new Error('python3 not found') })
        .mockImplementationOnce(() => '0.44.0')
      const result = await backend.isAvailable()
      expect(result).toBe(true)
      expect(execSync).toHaveBeenCalledTimes(2)
    })

    it('returns false when both python3 and python fail', async () => {
      ;(execSync as jest.Mock)
        .mockImplementation(() => { throw new Error('not found') })
      const result = await backend.isAvailable()
      expect(result).toBe(false)
    })
  })
})
