import { ActiveProfile } from './profile-manager';
import { createLogger } from '@ideia/logger';

const log = createLogger('profiles:serializer');

export interface SerializedProfile {
  version: string;
  profile: ActiveProfile;
  exportedAt: string;
  metadata: {
    origin: string;
    ideiaVersion: string;
  };
}

export class ProfileSerializer {
  serialize(profile: ActiveProfile): string {
    const data: SerializedProfile = {
      version: '1.0.0',
      profile,
      exportedAt: new Date().toISOString(),
      metadata: {
        origin: 'IDEIA Profile Manager',
        ideiaVersion: process.env.NODE_ENV ?? 'development',
      },
    };
    return JSON.stringify(data, null, 2);
  }

  deserialize(json: string): ActiveProfile | null {
    try {
      const data = JSON.parse(json) as SerializedProfile;
      if (!data.profile || !data.profile.id || !data.profile.config) {
        log.warn('Invalid profile format');
        return null;
      }
      return data.profile;
    } catch (error) {
      log.error('Failed to deserialize profile', { error: String(error) });
      return null;
    }
  }

  toYaml(profile: ActiveProfile): string {
    const lines: string[] = [
      `# IDEIA Profile: ${profile.label}`,
      `# Exported: ${new Date().toISOString()}`,
      `# Version: 1.0.0`,
      '',
      `profile:`,
      `  id: ${profile.id}`,
      `  label: "${profile.label}"`,
      `  isCustom: ${profile.isCustom}`,
      '',
      `config:`,
    ];
    const config = profile.config as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(config)) {
      lines.push(`  ${key}:`);
      if (typeof value === 'object' && value !== null) {
        const lines2 = this.yamlify(value as unknown as Record<string, unknown>, 4);
        lines.push(...lines2);
      } else {
        lines.push(`    value: ${value}`);
      }
    }
    return lines.join('\n');
  }

  private yamlify(obj: Record<string, unknown>, indent: number): string[] {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        lines.push(`${' '.repeat(indent)}${key}:`);
        lines.push(...this.yamlify(value as Record<string, unknown>, indent + 2));
      } else {
        lines.push(`${' '.repeat(indent)}${key}: ${value}`);
      }
    }
    return lines;
  }
}

export function createProfileSerializer(): ProfileSerializer {
  return new ProfileSerializer();
}

