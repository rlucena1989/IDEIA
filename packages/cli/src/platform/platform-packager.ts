import { PlatformState, PlatformPackage } from './platform-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('platform-packager');

export function packagePlatform(state: PlatformState): PlatformPackage {
  return {
    packageId: `package-${Date.now()}`,
    createdAt: new Date().toISOString(),
    version: state.version,
    contents: [...state.modules, ...state.policies],
  };
}
