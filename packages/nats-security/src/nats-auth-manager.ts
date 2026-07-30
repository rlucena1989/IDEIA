import type { Logger } from '@ideia/logger';
import { NKEYManager } from './nkey-manager';
import { JWTIssuer } from './jwt-issuer';
import { ACLManager } from './acl-manager';
import { type NKEYPair, type KeyType, type SubjectPermission, type TenantConfig, type UserJWT } from './types';

export interface AuthManagerConfig {
  operatorName: string;
  accountServerUrl: string;
  operatorServiceUrls?: string[];
  maxTokenTTL?: number;
}

export class NATSAuthManager {
  private _nkeyManager: NKEYManager;
  private _jwtIssuer: JWTIssuer;
  private _aclManager: ACLManager;
  private _logger: Logger;
  private _operatorKey: NKEYPair | null = null;
  private _operatorName: string = '';
  private _accountServerUrl: string = '';
  private _accounts: Map<string, AccountState> = new Map();
  private _activeTokens: Map<string, string> = new Map();
  private _revokedTokens: Set<string> = new Set();
  private _revokedNKeys: Map<string, number> = new Map();

  constructor(logger: Logger) {
    this._nkeyManager = new NKEYManager();
    this._jwtIssuer = new JWTIssuer();
    this._aclManager = new ACLManager();
    this._logger = logger;
  }

  initialize(config: AuthManagerConfig): { operatorKey: NKEYPair; operatorJWT: string } {
    this._operatorName = config.operatorName;
    this._accountServerUrl = config.accountServerUrl;
    const operatorKey = this._nkeyManager.generateKey('operator');
    this._operatorKey = operatorKey;
    const operatorJWT = this._jwtIssuer.issueOperatorJWT(operatorKey, {
      name: config.operatorName,
      signingKeys: [operatorKey.publicKey],
      accountServerUrl: config.accountServerUrl,
      operatorServiceUrls: config.operatorServiceUrls ?? [],
      maxTokenTTL: config.maxTokenTTL ?? 0,
    });
    this._logger.info('NATSAuthManager initialized', {
      operator: config.operatorName,
    });
    return { operatorKey, operatorJWT };
  }

  generateAccountJWT(accountName: string, signingKey?: NKEYPair): string {
    const operatorKey = this._operatorKey;
    if (!operatorKey) {
      throw new Error('NATSAuthManager not initialized');
    }
    const accountKey = this._nkeyManager.generateKey('account');
    const sk = signingKey ?? operatorKey;
    const jwt = this._jwtIssuer.issueAccountJWT(sk, accountKey, {
      name: accountName,
    });
    this._accounts.set(accountName, {
      key: accountKey,
      name: accountName,
      signingKey: sk,
      users: [],
      exports: [],
      imports: [],
      jwt,
    });
    return jwt;
  }

  generateUserJWT(
    accountName: string,
    identity: string,
    permissions?: {
      pub?: SubjectPermission;
      sub?: SubjectPermission;
    },
    options?: {
      ttlMs?: number;
      tags?: string[];
      subs?: number;
    },
  ): UserJWT {
    const operatorKey = this._operatorKey;
    if (!operatorKey) {
      throw new Error('NATSAuthManager not initialized');
    }
    const account = this._accounts.get(accountName);
    if (!account) {
      throw new Error(`Account "${accountName}" not found`);
    }
    const userKey = this._nkeyManager.generateKey('user');
    const jwtStr = this._jwtIssuer.issueUserJWT(
      account.signingKey,
      userKey,
      account.key.publicKey,
      {
        name: identity,
        pub: permissions?.pub ?? { allow: [], deny: [] },
        sub: permissions?.sub ?? { allow: [], deny: [] },
        subs: options?.subs ?? 0,
        tags: options?.tags ?? [],
        issuedAt: Date.now(),
        expiresAt: Date.now() + (options?.ttlMs ?? 86400000),
      },
    );
    const parsed = this._jwtIssuer.parseUserJWT(jwtStr);
    const userJWT: UserJWT = {
      jwt: jwtStr,
      payload: parsed.payload,
    };
    this._activeTokens.set(identity, jwtStr);
    return userJWT;
  }

  validateToken(jwt: string): { valid: boolean; reason?: string } {
    if (this._revokedTokens.has(jwt)) {
      return { valid: false, reason: 'Token revoked' };
    }
    if (this._jwtIssuer.isExpired(jwt)) {
      return { valid: false, reason: 'Token expired' };
    }
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Invalid JWT format' };
    }
    return { valid: true };
  }

  revokeToken(identity: string): boolean {
    const token = this._activeTokens.get(identity);
    if (token) {
      this._revokedTokens.add(token);
      this._activeTokens.delete(identity);
      this._logger.info('Token revoked', { identity });
      return true;
    }
    return false;
  }

  revokeNKey(nkey: string): void {
    this._revokedNKeys.set(nkey, Date.now());
    this._logger.info('NKey revoked', { nkey });
  }

  isNKeyRevoked(nkey: string, issuedAt: number): boolean {
    const revokedAt = this._revokedNKeys.get(nkey);
    if (!revokedAt) {
      return false;
    }
    return issuedAt < revokedAt;
  }

  createAccount(
    name: string,
    tenantConfig?: Partial<TenantConfig>,
  ): { accountKey: NKEYPair; jwt: string } {
    const accountKey = this._nkeyManager.generateKey('account');
    const operatorKey = this._operatorKey;
    if (!operatorKey) {
      throw new Error('NATSAuthManager not initialized');
    }
    const jwt = this._jwtIssuer.issueAccountJWT(operatorKey, accountKey, {
      name,
      signingKeys: tenantConfig?.signingKeys,
      limits: tenantConfig?.limits,
      exports: tenantConfig?.exports,
      imports: tenantConfig?.imports,
    });
    this._accounts.set(name, {
      key: accountKey,
      name,
      signingKey: operatorKey,
      users: (tenantConfig?.users ?? []).map(u => ({
        identity: u.identity,
        pubAllow: u.pubAllow,
        pubDeny: u.pubDeny,
        subAllow: u.subAllow,
        subDeny: u.subDeny,
        tags: u.tags ?? [],
        ttlMs: u.ttlMs,
      })),
      exports: tenantConfig?.exports ?? [],
      imports: tenantConfig?.imports ?? [],
      jwt,
    });
    return { accountKey, jwt };
  }

  getAccount(name: string): AccountState | undefined {
    return this._accounts.get(name);
  }

  getAccounts(): AccountState[] {
    return Array.from(this._accounts.values());
  }

  getActiveTokens(): Map<string, string> {
    return new Map(this._activeTokens);
  }

  getRevokedCount(): number {
    return this._revokedTokens.size + this._revokedNKeys.size;
  }

  getNKeyManager(): NKEYManager {
    return this._nkeyManager;
  }

  getJWTIssuer(): JWTIssuer {
    return this._jwtIssuer;
  }

  getACLManager(): ACLManager {
    return this._aclManager;
  }

  getOperatorKey(): NKEYPair | null {
    return this._operatorKey;
  }
}

export interface AccountState {
  key: NKEYPair;
  name: string;
  signingKey: NKEYPair;
  users: Array<{
    identity: string;
    pubAllow: string[];
    pubDeny: string[];
    subAllow: string[];
    subDeny: string[];
    tags: string[];
    ttlMs: number;
  }>;
  exports: Array<{ name: string; subject: string; type: 'stream' | 'service'; tokenReq: boolean; approvedAccounts?: string[] }>;
  imports: Array<{ name: string; subject: string; account: string; type: 'stream' | 'service' }>;
  jwt: string;
}
