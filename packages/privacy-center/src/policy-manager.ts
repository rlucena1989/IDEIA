import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@ideia/logger';
import type { PrivacyPolicy } from './types';

const logger = createLogger('privacy-center:policy');

export class PolicyManager {
  private policies: Map<string, PrivacyPolicy> = new Map();

  createPolicy(title: string, content: string): PrivacyPolicy {
    const policy: PrivacyPolicy = {
      id: uuidv4(),
      version: '1.0.0',
      title,
      content,
      effectiveDate: new Date(),
      status: 'draft',
    };
    this.policies.set(policy.id, policy);
    logger.info('Privacy policy created', { id: policy.id, title, version: policy.version });
    return policy;
  }

  activatePolicy(id: string): PrivacyPolicy | undefined {
    const policy = this.policies.get(id);
    if (!policy) {
      logger.warn('Policy not found for activation', { id });
      return undefined;
    }
    this.deactivateCurrentActive();
    policy.status = 'active';
    policy.effectiveDate = new Date();
    logger.info('Privacy policy activated', { id, title: policy.title });
    return policy;
  }

  archivePolicy(id: string): PrivacyPolicy | undefined {
    const policy = this.policies.get(id);
    if (!policy) {
      logger.warn('Policy not found for archiving', { id });
      return undefined;
    }
    policy.status = 'archived';
    logger.info('Privacy policy archived', { id, title: policy.title });
    return policy;
  }

  getActivePolicy(): PrivacyPolicy | undefined {
    return Array.from(this.policies.values()).find(p => p.status === 'active');
  }

  getPolicy(id: string): PrivacyPolicy | undefined {
    return this.policies.get(id);
  }

  listPolicies(status?: 'active' | 'draft' | 'archived'): PrivacyPolicy[] {
    const all = Array.from(this.policies.values());
    if (status) {
      return all.filter(p => p.status === status);
    }
    return all;
  }

  compareVersions(idA: string, idB: string): { idA: PrivacyPolicy | undefined; idB: PrivacyPolicy | undefined; same: boolean } {
    const a = this.policies.get(idA);
    const b = this.policies.get(idB);
    return {
      idA: a,
      idB: b,
      same: a?.content === b?.content,
    };
  }

  private deactivateCurrentActive(): void {
    for (const policy of this.policies.values()) {
      if (policy.status === 'active') {
        policy.status = 'draft';
      }
    }
  }
}
