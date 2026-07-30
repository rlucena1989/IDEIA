import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { RbacService, AbacService, AbacSubject, AbacResource, AbacPolicy, AbacCondition, JwtService, JwtPayload, ApiKey } from './types';

export class DefaultRbacService implements RbacService {
  private userRoles = new Map<string, Set<string>>();
  private onChangedEmitter = new Emitter<{ userId: string; roles: string[] }>();

  get onRolesChanged() { return this.onChangedEmitter.event; }

  hasRole(userId: string, role: string): boolean {
    const roles = this.userRoles.get(userId);
    return roles ? roles.has(role) : false;
  }

  addRole(userId: string, role: string): void {
    const roles = this.userRoles.get(userId) || new Set();
    roles.add(role);
    this.userRoles.set(userId, roles);
    this.onChangedEmitter.fire({ userId, roles: Array.from(roles) });
  }

  removeRole(userId: string, role: string): void {
    const roles = this.userRoles.get(userId);
    if (roles) {
      roles.delete(role);
      this.onChangedEmitter.fire({ userId, roles: Array.from(roles) });
    }
  }

  getRoles(userId: string): string[] {
    return Array.from(this.userRoles.get(userId) || []);
  }

  checkAccess(userId: string, resource: string, action: string): boolean {
    const roles = this.userRoles.get(userId);
    if (!roles) return false;
    if (roles.has('admin')) return true;
    if (roles.has('user') && action === 'read') return true;
    return false;
  }
}

export class DefaultAbacService implements AbacService {
  private policies: AbacPolicy[] = [];

  registerPolicy(policy: AbacPolicy): import('@ideia/core-contributions').Disposable {
    this.policies.push(policy);
    return { dispose: () => this.unregisterPolicy(policy.id) };
  }

  async evaluate(subject: AbacSubject, resource: AbacResource, action: string, context: Record<string, unknown>): Promise<boolean> {
    for (const policy of this.policies) {
      if (!policy.subjects.includes('*') && !policy.subjects.some(s => subject.roles.includes(s))) continue;
      if (!policy.resources.includes('*') && !policy.resources.includes(resource.type)) continue;
      if (!policy.actions.includes('*') && !policy.actions.includes(action)) continue;

      if (policy.conditions) {
        const conditionsMet = policy.conditions.every(c => this.evaluateCondition(c, { ...subject.attributes, ...resource.attributes, ...context }));
        if (!conditionsMet) continue;
      }

      return policy.effect === 'allow';
    }
    return false;
  }

  private evaluateCondition(condition: AbacCondition, context: Record<string, unknown>): boolean {
    const value = context[condition.attribute];
    switch (condition.operator) {
      case 'eq': return value === condition.value;
      case 'neq': return value !== condition.value;
      case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
      case 'contains': return typeof value === 'string' && value.includes(String(condition.value));
      case 'gt': return typeof value === 'number' && typeof condition.value === 'number' && value > condition.value;
      case 'lt': return typeof value === 'number' && typeof condition.value === 'number' && value < condition.value;
      default: return false;
    }
  }

  private unregisterPolicy(id: string): void {
    this.policies = this.policies.filter(p => p.id !== id);
  }
}

export class DefaultJwtService implements JwtService {
  sign(payload: JwtPayload, secret: string, expiresIn: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.parseExpiresIn(expiresIn);
    const data = { ...payload, iat: now, exp };
    const encoded = Buffer.from(JSON.stringify(header)).toString('base64url') + '.' +
                   Buffer.from(JSON.stringify(data)).toString('base64url');
    const signature = Buffer.from(encoded + secret).toString('base64url');
    return `${encoded}.${signature}`;
  }

  verify(token: string, secret: string): JwtPayload {
    return this.decode(token);
  }

  decode(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as JwtPayload;
  }

  private parseExpiresIn(input: string): number {
    const match = input.match(/^(\d+)([smhd])$/);
    if (!match) return 3600;
    const val = parseInt(match[1]);
    switch (match[2]) {
      case 's': return val;
      case 'm': return val * 60;
      case 'h': return val * 3600;
      case 'd': return val * 86400;
      default: return 3600;
    }
  }
}

export class DefaultApiKeyService {
  private keys = new Map<string, ApiKey>();

  async createKey(userId: string, name: string, scopes: string[], expiresIn?: string): Promise<ApiKey> {
    const id = `key-${Date.now()}`;
    const key = `ideia_${Buffer.from(id + Math.random()).toString('base64').slice(0, 32)}`;
    const entry: ApiKey = { id, name, key, scopes, userId, createdAt: new Date(), expiresAt: expiresIn ? new Date(Date.now() + 86400000) : undefined, revoked: false };
    this.keys.set(key, entry);
    return entry;
  }

  async revokeKey(keyId: string): Promise<void> {
    for (const [, entry] of this.keys) {
      if (entry.id === keyId) { entry.revoked = true; break; }
    }
  }

  async validateKey(key: string): Promise<{ valid: boolean; key?: ApiKey; error?: string }> {
    const entry = this.keys.get(key);
    if (!entry) return { valid: false, error: 'Invalid key' };
    if (entry.revoked) return { valid: false, error: 'Key revoked' };
    if (entry.expiresAt && entry.expiresAt < new Date()) return { valid: false, error: 'Key expired' };
    return { valid: true, key: entry };
  }

  async listKeys(userId: string): Promise<ApiKey[]> {
    return Array.from(this.keys.values()).filter(k => k.userId === userId);
  }
}
