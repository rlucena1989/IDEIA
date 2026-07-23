import { PlatformState, PlatformVerification } from './platform-types';

export function verifyPlatform(state: PlatformState): PlatformVerification {
  const issues: string[] = [];

  if (state.healthScore < 70) issues.push('Health score below threshold.');
  if (!state.modules.length) issues.push('No modules registered.');
  if (!state.policies.length) issues.push('No policies loaded.');
  if (state.status === 'closed' && state.autonomyLevel !== 'assisted') {
    issues.push('Closed platform should remain assisted or none.');
  }

  return {
    verificationId: `verification-${Date.now()}`,
    verifiedAt: new Date().toISOString(),
    ok: issues.length === 0,
    issues,
    notes: issues.length === 0 ? ['Platform verified successfully.'] : ['Platform requires attention.'],
  };
}
