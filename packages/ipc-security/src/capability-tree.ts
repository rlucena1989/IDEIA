import { CapabilityToken, issueToken } from './capability-checker';
import { createLogger } from '@ideia/logger';
const logger = createLogger('capability-tree');

export interface CapabilityNode {
  token: string;
  permissions: string[];
  children: CapabilityNode[];
  scope: Record<string, string[]>;
  maxDepth: number;
}

export class CapabilityHierarchy {
  deriveChildToken(
    parentToken: CapabilityToken,
    subId: string,
    reducedPermissions: string[],
    reducedScope?: Record<string, string[]>,
  ): string {
    const allowed = reducedPermissions.filter(p => {
      const [domain, action] = p.split(':');
      return parentToken.permissions.some(pp => {
        const [pd, pa] = pp.split(':');
        return pd === domain && (pa === '*' || pa === action);
      });
    });
    return issueToken(
      subId,
      allowed,
      reducedScope || parentToken.scope,
      1800,
      parentToken.source,
    );
  }
}
