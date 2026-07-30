import { HardwareInfo, HardwareBackend } from './types';
import { ConfigManager } from '@ideia/config-engine';
import { createLogger } from '@ideia/logger';
import * as os from 'os';
const config = ConfigManager.getInstance();


const log = createLogger('local-ai:hardware');

export class HardwareDetector {
  detect(): HardwareInfo {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();

    const info: HardwareInfo = {
      platform: os.platform(),
      cpuCores: cpus.length,
      cpuModel: cpus[0]?.model ?? 'unknown',
      totalMemoryGb: Math.round(totalMem / (1024 ** 3) * 100) / 100,
      freeMemoryGb: Math.round(freeMem / (1024 ** 3) * 100) / 100,
      hasCuda: false,
      hasRocm: false,
      hasMps: os.platform() === 'darwin',
      gpuDevices: [],
      recommendedBackend: 'cpu',
      recommendedMaxModelSize: this.estimateModelSize(totalMem),
    };

    if (config.get('CUDA_VISIBLE_DEVICES')) {
      info.hasCuda = true;
      info.recommendedBackend = 'cuda';
    }

    if (config.get('ROCM_VISIBLE_DEVICES')) {
      info.hasRocm = true;
      info.recommendedBackend = info.hasCuda ? 'cuda' : 'rocm';
    }

    if (info.totalMemoryGb >= 16) {
      info.recommendedMaxModelSize = '7b';
    }
    if (info.totalMemoryGb >= 32) {
      info.recommendedMaxModelSize = '13b';
    }
    if (info.totalMemoryGb >= 64) {
      info.recommendedMaxModelSize = '34b';
    }

    log.info('Hardware detected', {
      platform: info.platform,
      cpuCores: info.cpuCores,
      memory: `${info.totalMemoryGb}GB`,
      backend: info.recommendedBackend,
    });

    return info;
  }

  private estimateModelSize(totalMemoryBytes: number): string {
    const gb = totalMemoryBytes / (1024 ** 3);
    if (gb >= 64) return '34b';
    if (gb >= 32) return '13b';
    if (gb >= 16) return '7b';
    if (gb >= 8) return '3b';
    return '1b';
  }

  isBackendAvailable(backend: HardwareBackend): boolean {
    if (backend === 'cpu') return true;
    if (backend === 'cuda') return !!config.get('CUDA_VISIBLE_DEVICES');
    if (backend === 'rocm') return !!config.get('ROCM_VISIBLE_DEVICES');
    if (backend === 'mps') return os.platform() === 'darwin';
    return true;
  }
}

export function createHardwareDetector(): HardwareDetector {
  return new HardwareDetector();
}
