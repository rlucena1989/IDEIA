import { PlatformFinishResult, PlatformState } from './platform-types';

export function finishPlatform(state: PlatformState): PlatformFinishResult {
  return {
    finishId: `finish-${Date.now()}`,
    finishedAt: new Date().toISOString(),
    closed: true,
    summary: `Platform ${state.name} closed in status ${state.status}.`,
  };
}
