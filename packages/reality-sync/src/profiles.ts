import * as fs from 'node:fs';
import * as path from 'node:path';

export type ProfileLevel = 'passive' | 'assisted' | 'autonomous';
export type RiskThreshold = 'low' | 'medium' | 'high';

export interface ProfilePreset {
  name: string;
  label: string;
  description: string;
  level: ProfileLevel;
  riskThreshold: RiskThreshold;
  autoFixCategories: string[];
  confirmBeforeWrite: boolean;
  scanners: Record<string, boolean>;
}

const PRESETS: Record<string, ProfilePreset> = {
  soloDev: {
    name: 'soloDev',
    label: 'Solo Dev',
    description: 'Individual developer — balanced autonomy with safety nets',
    level: 'autonomous',
    riskThreshold: 'medium',
    autoFixCategories: ['package', 'governance', 'quality', 'testing'],
    confirmBeforeWrite: true,
    scanners: { versions: true, license: true, security: true, governance: true, quality: true, tests: false },
  },
  techLead: {
    name: 'techLead',
    label: 'Tech Lead',
    description: 'Technical lead — reviews all changes before applying',
    level: 'assisted',
    riskThreshold: 'low',
    autoFixCategories: ['package', 'governance'],
    confirmBeforeWrite: true,
    scanners: { versions: true, license: true, security: true, governance: true, quality: true, tests: true },
  },
  automator: {
    name: 'automator',
    label: 'Automator',
    description: 'Full automation — trusts the system to make decisions',
    level: 'autonomous',
    riskThreshold: 'high',
    autoFixCategories: ['package', 'legal', 'security', 'governance', 'quality', 'testing', 'documentation'],
    confirmBeforeWrite: false,
    scanners: { versions: true, license: true, security: true, governance: true, quality: true, tests: true },
  },
  enterprise: {
    name: 'enterprise',
    label: 'Enterprise',
    description: 'Enterprise-grade — strict policies, human-in-the-loop for all changes',
    level: 'passive',
    riskThreshold: 'low',
    autoFixCategories: [],
    confirmBeforeWrite: true,
    scanners: { versions: true, license: true, security: true, governance: true, quality: true, tests: true },
  },
  custom: {
    name: 'custom',
    label: 'Custom',
    description: 'Custom configuration — tweak every setting to your needs',
    level: 'assisted',
    riskThreshold: 'medium',
    autoFixCategories: ['package', 'governance'],
    confirmBeforeWrite: true,
    scanners: { versions: true, license: true, security: true, governance: true, quality: false, tests: false },
  },
};

const PROFILE_PATH = '.ai/profiles.json';

export function applyProfile(name: string, workspaceRoot: string): ProfilePreset | null {
  const profile = PRESETS[name];
  if (!profile) return null;

  const dir = path.join(workspaceRoot, '.ai');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const config = {
    level: profile.level,
    riskThreshold: profile.riskThreshold,
    autoFixCategories: profile.autoFixCategories,
    confirmBeforeWrite: profile.confirmBeforeWrite,
    scanners: profile.scanners,
  };

  fs.writeFileSync(path.join(dir, 'reality-sync.json'), JSON.stringify(config, null, 2), 'utf-8');

  const profilesPath = path.join(workspaceRoot, PROFILE_PATH);
  let profiles: Record<string, ProfilePreset> = {};
  if (fs.existsSync(profilesPath)) {
    try { profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8')); } catch { /* ignore */ }
  }
  profiles.active = profile;
  fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2), 'utf-8');

  console.log(`✓ Profile '${name}' applied: level=${profile.level}, risk=${profile.riskThreshold}`);
  return profile;
}

export function getProfile(name: string): ProfilePreset | undefined {
  return PRESETS[name];
}

export function listProfiles(): ProfilePreset[] {
  return Object.values(PRESETS);
}

export function customizeProfile(name: string, overrides: Partial<ProfilePreset>): ProfilePreset {
  const base = PRESETS[name];
  if (!base) throw new Error(`Profile not found: ${name}`);

  const customized: ProfilePreset = {
    ...base,
    ...overrides,
    name: base.name === 'custom' ? 'custom' : `custom_${name}`,
    label: base.name === 'custom' ? 'Custom' : `Custom (${base.label})`,
  };

  return customized;
}

export { PRESETS };
