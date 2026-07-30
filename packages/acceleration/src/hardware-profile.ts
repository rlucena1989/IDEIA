import os from 'node:os';
import { createLogger } from '@ideia/logger';
import { HardwareProfile } from './types';
import { execSync } from 'node:child_process';

export function readHardwareProfile(): HardwareProfile {
  const cpus = os.cpus();
  const load = os.loadavg();
  const cpuUsage = load.length > 0 ? Math.min(load[0] / cpus.length, 1) : 0;

  return {
    cpuCores: cpus.length,
    cpuUsage: Math.round(cpuUsage * 100) / 100,
    ramTotalGb: parseFloat((os.totalmem() / 1_073_741_824).toFixed(1)),
    ramFreeGb: parseFloat((os.freemem() / 1_073_741_824).toFixed(1)),
    diskFreeGb: readDiskFree(),
    nodeVersion: process.version,
    platform: os.platform()
  };
}

function readDiskFree(): number {
  try {
    const platform = os.platform();
    if (platform === 'win32') {
      const out = execSync('wmic logicaldisk where caption="C:" get freespace /value', { stdio: 'pipe', timeout: 5000 }).toString();
      const match = out.match(/FreeSpace=(\d+)/);
      if (match) return parseFloat((parseInt(match[1], 10) / 1_073_741_824).toFixed(1));
    } else {
      const out = execSync('df -k / | tail -1', { stdio: 'pipe', timeout: 5000 }).toString();
      const parts = out.trim().split(/\s+/);
      if (parts.length >= 4) return parseFloat((parseInt(parts[3], 10) / 1_048_576).toFixed(1));
    }
  } catch {
    return 0;
  }
  return 0;
}

export function tierFromHardware(hw: HardwareProfile): 'low' | 'medium' | 'high' {
  const score = hw.cpuCores * 2 + hw.ramTotalGb * 0.5 + hw.diskFreeGb * 0.1;
  if (score >= 50) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}
