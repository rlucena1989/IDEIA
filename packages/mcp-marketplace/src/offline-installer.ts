import * as crypto from 'crypto';
import { createLogger } from '@ideia/logger';
import { OfflineBundle, InstallStatus } from './types';
const logger = createLogger('offline-installer');

export class OfflineInstaller {
  private _installed: Map<string, { bundle: OfflineBundle; status: InstallStatus; installedAt: Date }> = new Map();
  private _verifySignatures: boolean;

  constructor(verifySignatures = true) {
    this._verifySignatures = verifySignatures;
  }

  async install(bundle: OfflineBundle): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    const validationErrors = await this._validate(bundle);
    errors.push(...validationErrors);
    if (errors.length > 0) {
      return { success: false, errors };
    }
    const key = `${bundle.packageName}@${bundle.version}`;
    this._installed.set(key, { bundle, status: 'installed', installedAt: new Date() });
    return { success: true, errors: [] };
  }

  async installFromPath(_bundlePath: string): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    return { success: errors.length === 0, errors };
  }

  uninstall(packageName: string, version?: string): boolean {
    if (version) {
      return this._installed.delete(`${packageName}@${version}`);
    }
    const keys = Array.from(this._installed.keys()).filter(k => k.startsWith(`${packageName}@`));
    let removed = false;
    for (const key of keys) {
      if (this._installed.delete(key)) removed = true;
    }
    return removed;
  }

  getInstalled(packageName: string, version?: string): OfflineBundle | undefined {
    if (version) {
      return this._installed.get(`${packageName}@${version}`)?.bundle;
    }
    const versions = this.getInstalledVersions(packageName);
    return versions.length > 0 ? versions[versions.length - 1] : undefined;
  }

  getInstalledVersions(packageName: string): OfflineBundle[] {
    return Array.from(this._installed.entries())
      .filter(([k]) => k.startsWith(`${packageName}@`))
      .map(([, v]) => v.bundle);
  }

  listInstalled(): OfflineBundle[] {
    return Array.from(this._installed.values()).map(v => v.bundle);
  }

  verifyIntegrity(packageName: string, version: string): boolean {
    const installed = this._installed.get(`${packageName}@${version}`);
    if (!installed) return false;
    for (const file of installed.bundle.files) {
      if (file.sha256.length !== 64) return false;
    }
    return true;
  }

  exportBundle(packageName: string, version: string): OfflineBundle | undefined {
    return this.getInstalled(packageName, version);
  }

  clear(): void {
    this._installed.clear();
  }

  private async _validate(bundle: OfflineBundle): Promise<string[]> {
    const errors: string[] = [];
    if (!bundle.formatVersion) errors.push('Missing formatVersion');
    if (!bundle.packageName) errors.push('Missing packageName');
    if (!bundle.version) errors.push('Missing version');
    if (!bundle.files || bundle.files.length === 0) errors.push('No files in bundle');
    for (const file of bundle.files) {
      if (!file.sha256 || file.sha256.length !== 64) {
        errors.push(`Invalid SHA256 for ${file.path}`);
      }
    }
    if (this._verifySignatures && bundle.signature) {
      const valid = this._verifySignature(bundle);
      if (!valid) errors.push('Invalid bundle signature');
    }
    return errors;
  }

  private _verifySignature(bundle: OfflineBundle): boolean {
    if (!bundle.signature) return false;
    try {
      const verify = crypto.createVerify('sha256');
      const manifestCopy = { ...bundle, signature: undefined };
      verify.update(JSON.stringify(manifestCopy));
      return verify.verify(bundle.signature.keyId, bundle.signature.value, 'hex');
    } catch {
      return false;
    }
  }
}
