import { PlatformState, PlatformPackage } from './platform-types';

export function packagePlatform(state: PlatformState): PlatformPackage {
  return {
    packageId: `package-${Date.now()}`,
    createdAt: new Date().toISOString(),
    version: state.version,
    contents: [...state.modules, ...state.policies],
  };
}
