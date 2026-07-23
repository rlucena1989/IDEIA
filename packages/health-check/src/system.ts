import * as os from 'os';
import { HealthChecker, ComponentHealth } from './types';

export class SystemChecker implements HealthChecker {
  readonly name = 'system';

  async check(): Promise<ComponentHealth> {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpuLoad = os.loadavg();

    const issues: string[] = [];
    if (freeMem / totalMem < 0.1) issues.push('Low memory');
    if (cpuLoad[0] > os.cpus().length * 0.9) issues.push('High CPU load');

    return {
      name: 'system',
      status: issues.length === 0 ? 'healthy' : 'degraded',
      message: issues.length > 0 ? issues.join('; ') : 'All system metrics OK',
      metadata: {
        memory: { total: totalMem, free: freeMem, usage: process.memoryUsage() },
        cpu: { loadAvg: cpuLoad, cores: os.cpus().length },
        uptime: os.uptime(),
        platform: os.platform(),
      },
    };
  }
}

export class ProcessChecker implements HealthChecker {
  readonly name = 'process';

  async check(): Promise<ComponentHealth> {
    return {
      name: 'process',
      status: 'healthy',
      message: `PID ${process.pid}, uptime ${process.uptime().toFixed(0)}s`,
      metadata: {
        pid: process.pid,
        uptime: process.uptime(),
        versions: process.versions,
        memoryUsage: process.memoryUsage(),
      },
    };
  }
}
