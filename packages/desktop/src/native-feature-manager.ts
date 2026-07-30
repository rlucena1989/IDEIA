import { DesktopShellType, NativeFeatures, SHELL_FEATURES } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('native-feature-manager');

type NativeFeatureKey = keyof NativeFeatures;

export class NativeFeatureManager {
  private features: NativeFeatures;
  private permissions: Partial<Record<NativeFeatureKey, boolean>>;

  constructor(shell: DesktopShellType) {
    this.features = { ...SHELL_FEATURES[shell] };
    this.permissions = {};
  }

  hasFeature(feature: NativeFeatureKey): boolean {
    return this.features[feature];
  }

  getAvailableFeatures(): NativeFeatureKey[] {
    const available: NativeFeatureKey[] = [];
    const keys: NativeFeatureKey[] = [
      'fileDialogs', 'notifications', 'globalShortcuts', 'powerMonitor',
      'clipboard', 'shell', 'tray', 'webview', 'gpuAcceleration',
      'autoUpdate', 'protocolHandler',
    ];
    for (const key of keys) {
      if (this.features[key]) {
        available.push(key);
      }
    }
    return available;
  }

  requestPermission(feature: NativeFeatureKey): boolean {
    if (!this.features[feature]) return false;
    this.permissions[feature] = true;
    return true;
  }

  revokePermission(feature: NativeFeatureKey): void {
    delete this.permissions[feature];
  }

  hasPermission(feature: NativeFeatureKey): boolean {
    return this.permissions[feature] === true;
  }

  getFeatureProfile(): NativeFeatures {
    return { ...this.features };
  }
}
