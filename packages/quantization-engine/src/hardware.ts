import { execSync } from 'child_process'
import { createLogger } from '@ideia/logger'
import type { HardwareProfile, GPUDeviceInfo } from './types'

const log = createLogger('quantization-engine:hardware')

export class HardwareDetector {
  async detect(): Promise<HardwareProfile> {
    const os = await import('os')
    const totalMem = os.totalmem()
    const freeMem = os.freemem()

    const gpuDevices: GPUDeviceInfo[] = []
    let hasCuda = false
    let hasRocm = false
    let cudaVersion: string | undefined

    try {
      const cudaInfo = this.detectCuda()
      if (cudaInfo.length > 0) {
        hasCuda = true
        gpuDevices.push(...cudaInfo)
      }
    } catch { /* no CUDA */ }

    try {
      if (process.env.ROCM_VISIBLE_DEVICES) {
        hasRocm = true
      }
    } catch { /* no ROCm */ }

    const hasMps = process.platform === 'darwin'

    try {
      const output = execSync('nvidia-smi --query-gpu=index,name,memory.total,compute_cap --format=csv,noheader,nounits 2>&1', {
        timeout: 5000,
        encoding: 'utf-8',
      })
      const lines = output.trim().split('\n').filter(Boolean)
      for (const line of lines) {
        const parts = line.split(', ').map(s => s.trim())
        if (parts.length >= 3) {
          hasCuda = true
          const idx = parseInt(parts[0], 10)
          const name = parts[1] || 'unknown'
          const memGb = parseFloat(parts[2]) / 1024
          const cc = parts.length >= 4 ? parts[3] : undefined
          gpuDevices.push({ name, memoryGb: memGb, computeCapability: cc, index: idx })
        }
      }
    } catch { /* nvidia-smi not available */ }

    try {
      const nvcc = execSync('nvcc --version 2>&1', { timeout: 3000, encoding: 'utf-8' })
      const match = nvcc.match(/release (\d+\.\d+)/)
      if (match) cudaVersion = match[1]
    } catch { /* no nvcc */ }

    return {
      platform: process.platform,
      cpuCores: os.cpus().length,
      totalMemoryGb: Math.round(totalMem / (1024 ** 3) * 100) / 100,
      freeMemoryGb: Math.round(freeMem / (1024 ** 3) * 100) / 100,
      hasCuda,
      hasRocm,
      hasMps,
      cudaVersion,
      gpuDevices,
    }
  }

  private detectCuda(): GPUDeviceInfo[] {
    const cudaVisible = process.env.CUDA_VISIBLE_DEVICES
    if (!cudaVisible) return []

    const devices: GPUDeviceInfo[] = []
    const indices = cudaVisible.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))

    try {
      for (let i = 0; i < (indices.length || 1); i++) {
        const idx = indices[i] ?? i
        const name = execSync(`nvidia-smi --id=${idx} --query-gpu=name --format=csv,noheader,nounits 2>&1`, {
          timeout: 3000,
          encoding: 'utf-8',
        }).trim()
        const memStr = execSync(`nvidia-smi --id=${idx} --query-gpu=memory.total --format=csv,noheader,nounits 2>&1`, {
          timeout: 3000,
          encoding: 'utf-8',
        }).trim()
        devices.push({
          name: name || `GPU-${idx}`,
          memoryGb: parseFloat(memStr) / 1024 || 0,
          index: idx,
        })
      }
    } catch { /* fallback to env var parsing */ }

    return devices
  }

  private detectPythonPackage(pkg: string): boolean {
    try {
      execSync(`python3 -c "import ${pkg}" 2>&1`, { timeout: 5000, encoding: 'utf-8' })
      return true
    } catch {
      try {
        execSync(`python -c "import ${pkg}" 2>&1`, { timeout: 5000, encoding: 'utf-8' })
        return true
      } catch {
        return false
      }
    }
  }

  async detectBackendAvailability(): Promise<{
    autoGptq: boolean; autoAwq: boolean; llamaCpp: boolean; vllm: boolean
  }> {
    const [autoGptq, autoAwq, llamaCpp, vllm] = await Promise.all([
      this.checkCommand('auto-gptq'),
      this.checkCommand('autoawq'),
      this.checkLlamaCpp(),
      this.checkCommand('vllm'),
    ])
    return { autoGptq, autoAwq, llamaCpp, vllm }
  }

  private async checkCommand(name: string): Promise<boolean> {
    try {
      execSync(`which ${name} 2>&1 || where ${name} 2>nul`, { timeout: 3000, encoding: 'utf-8' })
      return true
    } catch {
      return this.detectPythonPackage(name.replace('-', '_'))
    }
  }

  private async checkLlamaCpp(): Promise<boolean> {
    try {
      execSync('llama-cli --version 2>&1', { timeout: 3000, encoding: 'utf-8' })
      return true
    } catch {
      try {
        execSync('llama-server --version 2>&1', { timeout: 3000, encoding: 'utf-8' })
        return true
      } catch {
        return false
      }
    }
  }

  estimateMaxModelSize(totalMemoryGb: number): string {
    if (totalMemoryGb >= 64) return '34b'
    if (totalMemoryGb >= 32) return '13b'
    if (totalMemoryGb >= 16) return '7b'
    if (totalMemoryGb >= 8) return '3b'
    return '1b'
  }
}
