import type { CliCommandResult } from '../types/cli-result';
import { createLogger } from '@ideia/logger';
import { success, failure } from '../types/cli-result';
const logger = createLogger('profile-use-case');

export interface ProfileConfig {
  id: string;
  name: string;
  role: 'developer' | 'architect' | 'devops' | 'security' | 'tester';
  autonomyLevel: number;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class ProfileUseCase {
  private profiles: Map<string, ProfileConfig> = new Map();

  createProfile(name: string, role: ProfileConfig['role'], autonomyLevel: number): CliCommandResult<ProfileConfig> {
    try {
      const profile: ProfileConfig = {
        id: `profile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name,
        role,
        autonomyLevel: Math.max(0, Math.min(4, autonomyLevel)),
        preferences: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.profiles.set(profile.id, profile);
      return success(`Profile "${name}" created`, profile);
    } catch (err) {
      return failure(`Failed to create profile: ${err instanceof Error ? err.message : String(err)}`) as CliCommandResult<ProfileConfig>;
    }
  }

  getProfile(profileId: string): CliCommandResult<ProfileConfig> {
    const profile = this.profiles.get(profileId);
    if (!profile) return failure(`Profile not found: ${profileId}`, 1) as CliCommandResult<ProfileConfig>;
    return success('Profile found', profile);
  }

  listProfiles(): CliCommandResult<ProfileConfig[]> {
    const all = Array.from(this.profiles.values());
    return success(`Found ${all.length} profiles`, all);
  }

  updatePreferences(profileId: string, preferences: Record<string, unknown>): CliCommandResult<ProfileConfig> {
    const profile = this.profiles.get(profileId);
    if (!profile) return failure(`Profile not found: ${profileId}`, 1) as CliCommandResult<ProfileConfig>;

    profile.preferences = { ...profile.preferences, ...preferences };
    profile.updatedAt = new Date().toISOString();
    this.profiles.set(profileId, profile);

    return success(`Profile "${profile.name}" preferences updated`, profile);
  }

  setAutonomyLevel(profileId: string, level: number): CliCommandResult<ProfileConfig> {
    const profile = this.profiles.get(profileId);
    if (!profile) return failure(`Profile not found: ${profileId}`, 1) as CliCommandResult<ProfileConfig>;

    profile.autonomyLevel = Math.max(0, Math.min(4, level));
    profile.updatedAt = new Date().toISOString();
    this.profiles.set(profileId, profile);

    return success(`Profile "${profile.name}" autonomy set to N${level}`, profile);
  }

  deleteProfile(profileId: string): CliCommandResult<void> {
    const profile = this.profiles.get(profileId);
    if (!profile) return failure(`Profile not found: ${profileId}`, 1) as CliCommandResult<void>;

    this.profiles.delete(profileId);
    return success(`Profile "${profile.name}" deleted`);
  }
}

export function createProfileUseCase(): ProfileUseCase {
  return new ProfileUseCase();
}
