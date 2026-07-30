import { getPreset, getPresetIds } from './presets';
import { ProfileConfig } from './config-types';
import { ProfileId } from './types';
import { createLogger } from '@ideia/logger';
import * as fs from 'fs';
import * as path from 'path';

function safeJsonParse<T>(text: string, fallback: T): T {
  try { return JSON.parse(text) as T; }
  catch { return fallback; }
}

const fsp = fs.promises;
const log = createLogger('profiles:manager');
export interface ActiveProfile {
  id: ProfileId;
  label: string;
  config: ProfileConfig;
  isCustom: boolean;
  activatedAt: string;
}

const PROFILE_LABELS: Record<ProfileId, string> = {
  'solo-dev': 'Solo Developer',
  'tech-lead': 'Tech Lead',
  'automator': 'Automator',
  'enterprise': 'Enterprise',
  'custom': 'Custom',
  'student': 'Student',
  'reviewer': 'Reviewer',
};

export class ProfileManager {
  private activeProfile: ActiveProfile;
  private customProfiles: Map<string, ProfileConfig> = new Map();
  private configDir: string;
  private _saveQueue: Promise<void> = Promise.resolve();

  constructor(configDir?: string) {
    this.configDir = configDir ?? path.join(process.cwd(), '.ai', 'profiles');
    this.activeProfile = this.loadActive();
    this.loadCustom();
  }

  private enqueueSave(fn: () => Promise<void>): void {
    this._saveQueue = this._saveQueue.then(fn).catch(() => {});
  }

  async flush(): Promise<void> {
    await this._saveQueue;
  }

  activate(id: ProfileId): ActiveProfile {
    if (id === 'custom') {
      throw new Error('Cannot activate "custom" directly. Use activateCustom() instead.');
    }
    const config = getPreset(id);
    this.activeProfile = {
      id,
      label: PROFILE_LABELS[id],
      config,
      isCustom: false,
      activatedAt: new Date().toISOString(),
    };
    this.saveActive();
    log.info('Profile activated: ' + id);
    return this.activeProfile;
  }

  activateCustom(name: string, basePreset?: ProfileId): ActiveProfile {
    const baseConfig = basePreset ? getPreset(basePreset) : getPreset('solo-dev');
    const customId = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    this.customProfiles.set(customId, { ...baseConfig });
    this.activeProfile = {
      id: 'custom',
      label: name,
      config: { ...baseConfig } as ProfileConfig,
      isCustom: true,
      activatedAt: new Date().toISOString(),
    };
    this.saveActive();
    this.saveCustomProfiles();
    log.info('Custom profile activated: ' + name + ' (based on ' + (basePreset ?? 'solo-dev') + ')');
    return this.activeProfile;
  }

  getActive(): ActiveProfile {
    return this.activeProfile;
  }

  updateConfig(updates: Partial<ProfileConfig>): void {
    this.activeProfile.config = { ...this.activeProfile.config, ...updates } as ProfileConfig;
    if (this.activeProfile.isCustom) {
      this.customProfiles.set('custom-' + this.activeProfile.label.toLowerCase().replace(/[^a-z0-9]/g, '-'), this.activeProfile.config);
      this.saveCustomProfiles();
    }
    this.saveActive();
  }

  listPresets(): Array<{ id: ProfileId; label: string }> {
    return getPresetIds().filter(id => id !== 'custom').map(id => ({ id, label: PROFILE_LABELS[id] }));
  }

  listCustom(): Array<{ id: string; label: string }> {
    return Array.from(this.customProfiles.keys()).map(id => ({
      id,
      label: id.replace(/^custom-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    }));
  }

  deleteCustom(id: string): boolean {
    if (!this.customProfiles.has(id)) return false;
    this.customProfiles.delete(id);
    this.saveCustomProfiles();
    return true;
  }

  resetToDefault(): void {
    this.activate('solo-dev');
  }

  private loadActive(): ActiveProfile {
    try {
      const filePath = path.join(this.configDir, 'active.json');
      if (fs.existsSync(filePath)) {
        return safeJsonParse(fs.readFileSync(filePath, 'utf-8'), { id: 'solo-dev', label: 'Solo Developer', config: getPreset('solo-dev'), isCustom: false, activatedAt: new Date().toISOString() });
      }
    } catch (err) {
      log.error('Failed to load active profile', { error: String(err) });
    }
    return { id: 'solo-dev', label: 'Solo Developer', config: getPreset('solo-dev'), isCustom: false, activatedAt: new Date().toISOString() };
  }

  private saveActive(): void {
    const filePath = path.join(this.configDir, 'active.json');
    const data = JSON.stringify(this.activeProfile, null, 2);
    this.enqueueSave(async () => {
      try {
        await fsp.mkdir(this.configDir, { recursive: true });
        await fsp.writeFile(filePath, data, 'utf-8');
      } catch (err) {
        log.error('Failed to save active profile', { error: String(err) });
      }
    });
  }

  private loadCustom(): void {
    try {
      const filePath = path.join(this.configDir, 'custom.json');
      if (fs.existsSync(filePath)) {
        this.customProfiles = new Map(Object.entries(safeJsonParse(fs.readFileSync(filePath, 'utf-8'), {})));
      }
    } catch (err) {
      log.error('Failed to load custom profiles', { error: String(err) });
    }
  }

  private saveCustomProfiles(): void {
    const filePath = path.join(this.configDir, 'custom.json');
    const data = JSON.stringify(Object.fromEntries(this.customProfiles), null, 2);
    this.enqueueSave(async () => {
      try {
        await fsp.mkdir(this.configDir, { recursive: true });
        await fsp.writeFile(filePath, data, 'utf-8');
      } catch (err) {
        log.error('Failed to save custom profiles', { error: String(err) });
      }
    });
  }
}

export function createProfileManager(configDir?: string): ProfileManager {
  return new ProfileManager(configDir);
}
