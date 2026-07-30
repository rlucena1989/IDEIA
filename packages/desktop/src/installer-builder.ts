import { createLogger } from '@ideia/logger';
import { DesktopPlatform, InstallerConfig, InstallerTarget, SigningConfig } from './types';

const logger = createLogger('installer-builder');

const PLATFORM_TARGETS: Record<DesktopPlatform, InstallerTarget[]> = {
  win32: ['msi', 'nsis'],
  darwin: ['dmg'],
  linux: ['appImage', 'deb', 'rpm', 'snap', 'flatpak'],
};

export class InstallerBuilder {
  private config: InstallerConfig;

  constructor(config?: Partial<InstallerConfig>) {
    this.config = {
      targets: [],
      signing: { enabled: false },
      silent: false,
      compression: 'zip',
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      perMachine: false,
      ...config,
    };
  }

  getTargets(platform: DesktopPlatform): InstallerTarget[] {
    const platformAvailable = PLATFORM_TARGETS[platform];
    return this.config.targets.filter((t) => platformAvailable.includes(t));
  }

  configureSigning(signing: SigningConfig): void {
    this.config.signing = signing;
    logger.info('Signing configured', { enabled: signing.enabled });
  }

  configureSilent(silent: boolean): void {
    this.config.silent = silent;
    logger.info('Silent mode', { silent });
  }

  setTargets(targets: InstallerTarget[]): void {
    this.config.targets = targets;
    logger.info('Targets set', { targets });
  }

  getConfig(): InstallerConfig {
    return { ...this.config };
  }

  getRecommendedTargets(platform: DesktopPlatform): InstallerTarget[] {
    return [...PLATFORM_TARGETS[platform]];
  }

  static getAvailableTargets(platform: DesktopPlatform): InstallerTarget[] {
    return [...PLATFORM_TARGETS[platform]];
  }
}
