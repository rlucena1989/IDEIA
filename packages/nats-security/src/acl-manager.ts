import { type PermissionMap, type SubjectPermission } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('acl-manager');

export class ACLManager {
  private _rules: PermissionMap[] = [];
  private _defaultDeny = true;
  private _version = 0;

  addRule(rule: PermissionMap): void {
    this._rules.push(rule);
    this._rules.sort((a, b) => b.priority - a.priority);
    this._version++;
  }

  removeRule(identity: string): void {
    this._rules = this._rules.filter(r => r.identity !== identity);
    this._version++;
  }

  clearRules(): void {
    this._rules = [];
    this._version++;
  }

  setDefaultDeny(deny: boolean): void {
    this._defaultDeny = deny;
  }

  canPublish(identity: string, subject: string): { allowed: boolean; matchedRule?: PermissionMap } {
    const applicable = this._getApplicableRules(identity);
    if (applicable.length === 0) {
      return { allowed: !this._defaultDeny };
    }
    for (const rule of applicable) {
      if (this._matchAny(subject, rule.publish.deny)) {
        return { allowed: false, matchedRule: rule };
      }
      if (this._matchAny(subject, rule.publish.allow)) {
        return { allowed: true, matchedRule: rule };
      }
    }
    return { allowed: false };
  }

  canSubscribe(identity: string, subject: string, queueGroup?: string): {
    allowed: boolean;
    matchedRule?: PermissionMap;
  } {
    const applicable = this._getApplicableRules(identity);
    if (applicable.length === 0) {
      return { allowed: !this._defaultDeny };
    }
    for (const rule of applicable) {
      if (queueGroup && rule.queueGroup) {
        if (rule.queueGroup.deny.includes(queueGroup)) {
          return { allowed: false, matchedRule: rule };
        }
        if (rule.queueGroup.allow.length > 0 && !rule.queueGroup.allow.includes(queueGroup)) {
          return { allowed: false, matchedRule: rule };
        }
      }
      if (this._matchAny(subject, rule.subscribe.deny)) {
        return { allowed: false, matchedRule: rule };
      }
      if (this._matchAny(subject, rule.subscribe.allow)) {
        return { allowed: true, matchedRule: rule };
      }
    }
    return { allowed: false };
  }

  canReply(identity: string, replySubject: string): {
    allowed: boolean;
    maxMessages?: number;
    ttl?: number;
  } {
    const rules = this._rules
      .filter(r => r.identity === identity && r.response !== undefined)
      .filter(r => !r.expiresAt || r.expiresAt > Date.now());
    for (const rule of rules) {
      if (rule.response && this._matchAny(replySubject, rule.response.allow)) {
        return {
          allowed: true,
          maxMessages: rule.response.maxMessages,
          ttl: rule.response.ttl,
        };
      }
    }
    return { allowed: !this._defaultDeny };
  }

  getEffectivePermissions(identity: string): {
    publish: string[];
    subscribe: string[];
    queueGroups: string[];
  } {
    const publishes = new Set<string>();
    const subscribes = new Set<string>();
    const queueGroups = new Set<string>();
    for (const rule of this._rules.filter(r => r.identity === identity)) {
      for (const p of rule.publish.allow) {
        publishes.add(p);
      }
      for (const s of rule.subscribe.allow) {
        subscribes.add(s);
      }
      if (rule.queueGroup) {
        for (const q of rule.queueGroup.allow) {
          queueGroups.add(q);
        }
      }
    }
    return {
      publish: Array.from(publishes),
      subscribe: Array.from(subscribes),
      queueGroups: Array.from(queueGroups),
    };
  }

  evaluatePermission(identity: string, subject: string, operation: 'publish' | 'subscribe'): boolean {
    if (operation === 'publish') {
      return this.canPublish(identity, subject).allowed;
    }
    return this.canSubscribe(identity, subject).allowed;
  }

  getVersion(): number {
    return this._version;
  }

  getRuleCount(): number {
    return this._rules.length;
  }

  private _getApplicableRules(identity: string): PermissionMap[] {
    return this._rules
      .filter(r => r.identity === identity)
      .filter(r => !r.expiresAt || r.expiresAt > Date.now());
  }

  private _matchAny(subject: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (this._matchSubject(subject, pattern)) {
        return true;
      }
    }
    return false;
  }

  private _matchSubject(subject: string, pattern: string): boolean {
    const subjectParts = subject.split('.');
    const patternParts = pattern.split('.');
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '>') {
        return true;
      }
      if (patternParts[i] === '*') {
        continue;
      }
      if (i >= subjectParts.length) {
        return false;
      }
      if (patternParts[i] !== subjectParts[i]) {
        return false;
      }
    }
    return subjectParts.length === patternParts.length;
  }
}
