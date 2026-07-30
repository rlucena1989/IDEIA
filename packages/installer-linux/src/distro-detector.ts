import { readFileSync, existsSync } from 'fs';
import { createLogger } from '@ideia/logger';
const logger = createLogger('distro-detector');

export interface DistroInfo {
  id: string;
  name: string;
  version: string;
  idLike: string;
  arch: string;
  packageFormat: 'deb' | 'rpm' | 'arch' | 'other';
  packageManager: string;
}

export class LinuxDistroDetector {
  detect(): DistroInfo {
    const osRelease = this.parseOsRelease();
    const arch = process.arch === 'x64' ? 'amd64' : process.arch;
    const id = osRelease.id || 'unknown';
    const idLike = osRelease.id_like || '';

    let packageFormat: DistroInfo['packageFormat'] = 'other';
    let packageManager = 'unknown';

    if (id === 'ubuntu' || id === 'debian' || id === 'linuxmint' || id === 'pop' || idLike.includes('debian')) {
      packageFormat = 'deb'; packageManager = 'apt';
    } else if (id === 'fedora' || id === 'rhel' || id === 'centos' || idLike.includes('fedora') || idLike.includes('rhel')) {
      packageFormat = 'rpm'; packageManager = 'dnf';
    } else if (id === 'arch' || idLike.includes('arch')) {
      packageFormat = 'other'; packageManager = 'pacman';
    }

    return {
      id, name: osRelease.name || id,
      version: osRelease.version_id || '0',
      idLike, arch,
      packageFormat, packageManager,
    };
  }

  getBestInstallFormat(): string {
    const distro = this.detect();
    const formatMap: Record<string, string> = { deb: 'deb', rpm: 'rpm' };
    if (distro.packageFormat in formatMap) return formatMap[distro.packageFormat];
    if (existsSync('/snap')) return 'snap';
    if (existsSync('/.flatpak-info')) return 'flatpak';
    return 'AppImage';
  }

  private parseOsRelease(): Record<string, string> {
    const paths = ['/etc/os-release', '/usr/lib/os-release'];
    for (const p of paths) {
      try {
        const content = readFileSync(p, 'utf-8');
        const result: Record<string, string> = {};
        for (const line of content.split('\n')) {
          const match = line.match(/^([^=]+)="?(.*?)"?$/);
          if (match) result[match[1].toLowerCase()] = match[2];
        }
        return result;
      } catch {}
    }
    return {};
  }
}
