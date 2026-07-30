import os from 'node:os';
import { createLogger } from '@ideia/logger';
import { execSync } from 'node:child_process';
const logger = createLogger('hardware-detector');

export interface HardwareSpecs {
  totalRamGB: number;
  freeRamGB: number;
  cpuCores: number;
  cpuModel: string;
  gpu: GpuInfo | null;
  recommendedModelSize: ModelSize;
}

export type ModelSize = '7B' | '13B' | '70B';

export interface GpuInfo {
  vendor: string;
  model: string;
  vramGB: number;
  cudaCores?: number;
}

const GPU_VRAM_THRESHOLDS: Record<ModelSize, number> = {
  '7B': 6,
  '13B': 16,
  '70B': 48,
};

const RAM_THRESHOLDS: Record<ModelSize, number> = {
  '7B': 8,
  '13B': 32,
  '70B': 128,
};

function detectNvidiaGpu(): GpuInfo | null {
  try {
    const output = execSync('nvidia-smi --query-gpu=name,memory.total,compute_cap --format=csv,noheader,nounits', {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    if (!output) return null;

    const lines = output.split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;

    const parts = lines[0].split(',').map(s => s.trim());
    const model = parts[0] || 'Unknown NVIDIA GPU';
    const vramMB = parseInt(parts[1], 10);
    const vramGB = isNaN(vramMB) ? 0 : Math.round(vramMB / 1024);

    return {
      vendor: 'NVIDIA',
      model,
      vramGB,
    };
  } catch {
    return null;
  }
}

function detectAmdGpu(): GpuInfo | null {
  try {
    if (process.platform === 'win32') {
      const output = execSync('wmic path win32_VideoController get name /format:value', {
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();

      const match = output.match(/Name=(.+)/);
      if (match && (match[1].includes('AMD') || match[1].includes('Radeon'))) {
        return {
          vendor: 'AMD',
          model: match[1].trim(),
          vramGB: 0,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function detectAppleGpu(): GpuInfo | null {
  if (process.platform !== 'darwin') return null;
  try {
    const output = execSync('system_profiler SPHardwareDataType 2>/dev/null | grep "Chip:"', {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    if (output) {
      const chip = output.replace('Chip:', '').trim();
      return {
        vendor: 'Apple',
        model: chip,
        vramGB: 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function detectHardware(): HardwareSpecs {
  const totalRamGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  const freeRamGB = Math.round(os.freemem() / (1024 * 1024 * 1024));
  const cpus = os.cpus();
  const cpuCores = cpus.length;
  const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : 'Unknown';

  const nvidiaGpu = detectNvidiaGpu();
  const amdGpu = detectAmdGpu();
  const appleGpu = detectAppleGpu();
  const gpu = nvidiaGpu || amdGpu || appleGpu;

  return {
    totalRamGB,
    freeRamGB,
    cpuCores,
    cpuModel,
    gpu,
    recommendedModelSize: recommendModelSize(totalRamGB, gpu),
  };
}

export function recommendModelSize(totalRamGB: number, gpu: GpuInfo | null): ModelSize {
  const gpuVRAM = gpu?.vramGB || 0;

  if ((gpuVRAM >= GPU_VRAM_THRESHOLDS['70B'] && totalRamGB >= RAM_THRESHOLDS['70B']) ||
      totalRamGB >= RAM_THRESHOLDS['70B'] * 2) {
    return '70B';
  }

  if ((gpuVRAM >= GPU_VRAM_THRESHOLDS['13B'] && totalRamGB >= RAM_THRESHOLDS['13B']) ||
      totalRamGB >= RAM_THRESHOLDS['13B']) {
    return '13B';
  }

  return '7B';
}

export function formatHardwareReport(specs: HardwareSpecs): string {
  const lines: string[] = [];
  lines.push(`CPU: ${specs.cpuCores} cores — ${specs.cpuModel}`);
  lines.push(`RAM: ${specs.totalRamGB} GB total, ${specs.freeRamGB} GB free`);

  if (specs.gpu) {
    lines.push(`GPU: ${specs.gpu.vendor} ${specs.gpu.model}${specs.gpu.vramGB > 0 ? ` (${specs.gpu.vramGB} GB VRAM)` : ''}`);
  } else {
    lines.push('GPU: No discrete GPU detected');
  }

  lines.push(`Recommended model size: ${specs.recommendedModelSize}`);

  const modelMap: Record<ModelSize, string> = {
    '7B': 'Llama 3.2 7B / Qwen2.5-Coder 7B',
    '13B': 'Llama 3.1 13B / CodeLlama 13B',
    '70B': 'Llama 3.3 70B / DeepSeek-Coder-V2 70B',
  };
  lines.push(`Suggested models: ${modelMap[specs.recommendedModelSize]}`);

  return lines.join('\n');
}
