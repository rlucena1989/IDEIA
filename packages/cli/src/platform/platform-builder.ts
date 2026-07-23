import { PlatformState } from './platform-types';

export function buildPlatformState(input: {
  platformId?: string;
  name: string;
  version: string;
  healthScore: number;
  autonomyLevel: PlatformState['autonomyLevel'];
  modules: string[];
  policies: string[];
}): PlatformState {
  return {
    platformId: input.platformId ?? `platform-${Date.now()}`,
    name: input.name,
    version: input.version,
    status: input.healthScore >= 80 ? 'operational' : 'maintenance',
    healthScore: input.healthScore,
    autonomyLevel: input.autonomyLevel,
    modules: input.modules,
    policies: input.policies,
    updatedAt: new Date().toISOString(),
  };
}
