import type { ProfileConfig, FullConfig } from './config-types';
import { createLogger } from '@ideia/logger';
import type { ProfileId, ProfileStats } from './types';
import { validate } from './config-validator';
import { AuditTrail } from '@ideia/audit-trail';
import { EventBus } from '@ideia/event-bus';
import { makeProfile, PRESET_DEFINITIONS } from './profile-presets';

const logger = createLogger('profiles');

export class Profiles {
  private profiles: Map<string, ProfileConfig> = new Map();
  private eventBus: EventBus;
  private auditTrail: AuditTrail;

  constructor(eventBus: EventBus, auditTrail: AuditTrail) {
    this.eventBus = eventBus;
    this.auditTrail = auditTrail;
    for (const id of Object.keys(PRESET_DEFINITIONS)) this.profiles.set(id, makeProfile(id));
  }

  async apply(profileId: string): Promise<ProfileConfig> {
    const profile = this.profiles.get(profileId);
    if (!profile) throw new Error(`Profile not found: ${profileId}`);
    const result = validate(profile.config);
    if (!result.valid) throw new Error(`Profile validation failed for '${profileId}': ${result.errors.map(e => e.message).join('; ')}`);
    this.auditTrail.append({ actor: 'system', eventType: 'profile.apply', target: profileId, decision: 'approved', result: 'success', metadata: { profileId } });
    await this.eventBus.emit({ type: 'profile.applied', source: 'profiles', payload: { profileId, config: profile.config } as Record<string, unknown> });
    return profile;
  }

  get(id: string): ProfileConfig { const p = this.profiles.get(id); if (!p) throw new Error(`Profile not found: ${id}`); return p; }
  list(): ProfileConfig[] { return Array.from(this.profiles.values()).map(p => ({ ...p })); }

  create(name: string, configOverride: Partial<ProfileConfig>): ProfileConfig {
    const customBase = this.profiles.get('custom');
    if (!customBase) throw new Error('Custom base profile not found');
    const now = new Date().toISOString();
    const profile: ProfileConfig = { id: `custom-${Date.now()}`, name, description: configOverride.description ?? 'Custom profile', config: { ...customBase.config, ...configOverride.config }, createdAt: now, updatedAt: now };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  export(id: string): string { return JSON.stringify(this.get(id), null, 2); }

  import(data: string): ProfileConfig {
    const parsed = JSON.parse(data) as ProfileConfig;
    if (!parsed.id || !parsed.name || !parsed.config) throw new Error('Invalid profile data: missing id, name, or config');
    const result = validate(parsed.config);
    if (!result.valid) throw new Error(`Imported profile validation failed: ${result.errors.map(e => e.message).join('; ')}`);
    const now = new Date().toISOString();
    parsed.createdAt = parsed.createdAt || now;
    parsed.updatedAt = now;
    this.profiles.set(parsed.id, parsed);
    return parsed;
  }

  reset(id: string): void { if (PRESET_DEFINITIONS[id]) this.profiles.set(id, makeProfile(id)); else this.profiles.delete(id); }
  getPresetIds(): string[] { return Object.keys(PRESET_DEFINITIONS); }

  getDefaults(profileId: string): Record<string, unknown> {
    const config = PRESET_DEFINITIONS[profileId];
    if (!config) throw new Error(`No defaults for profile: ${profileId}`);
    const flat: Record<string, unknown> = {};
    for (const [section, values] of Object.entries(config)) {
      if (typeof values === 'object' && values !== null) {
        for (const [key, value] of Object.entries(values as Record<string, unknown>)) flat[`${section}.${key}`] = value;
      }
    }
    return flat;
  }

  getRecommendation(userStats: ProfileStats): { profileId: string; confidence: number; reason: string } {
    const { totalInteractions, errorRate, approvalRate, commandFrequency, featureDiversity, preferredAutonomy } = userStats;
    if (totalInteractions < 10) return { profileId: 'student', confidence: 0.5, reason: 'Not enough data — starting with student profile' };
    const recommendations = Object.entries(PRESET_DEFINITIONS).filter(([id]) => id !== 'custom').map(([id, config]) => {
      let score = 0; const reasons: string[] = [];
      if (preferredAutonomy === config.autonomy.level) { score += 20; reasons.push('autonomy match'); }
      if (errorRate < 0.1 && (config.autonomy.level === 'autonomous' || config.autonomy.level === 'assisted')) { score += 15; reasons.push('low error rate'); }
      if (approvalRate > 0.8 && config.autonomy.level === 'assisted') { score += 10; reasons.push('high approval'); }
      if (commandFrequency > 0.4 && config.autonomy.level === 'autonomous') { score += 10; reasons.push('frequent commands'); }
      if (featureDiversity > 0.6) { score += 5; reasons.push('high feature diversity'); }
      if (errorRate > 0.2 && config.autonomy.level !== 'passive') { score -= 10; reasons.push('high errors need passive'); }
      return { profileId: id, score, reasons };
    });
    recommendations.sort((a, b) => b.score - a.score);
    const best = recommendations[0];
    if (!best) return { profileId: 'solo-dev', confidence: 0.5, reason: 'Fallback to solo-dev' };
    return { profileId: best.profileId, confidence: Math.min(0.95, 0.3 + (best.score / 100)), reason: best.reasons.join(', ') };
  }
}

export function createProfiles(eventBus: EventBus, auditTrail: AuditTrail): Profiles {
  return new Profiles(eventBus, auditTrail);
}
