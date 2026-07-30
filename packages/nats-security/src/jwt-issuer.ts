import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import {
  type NKEYPair,
  type OperatorClaims,
  type AccountClaims,
  type UserClaims,
  type SubjectPermission,
  type AccountLimits,
  type StreamExport,
  type StreamImport,
} from './types';
const logger = createLogger('jwt-issuer');

function base64urlEncode(data: Buffer): string {
  return data.toString('base64url');
}

function base64urlDecode(str: string): Buffer {
  return Buffer.from(str, 'base64url');
}

export class JWTIssuer {
  issueOperatorJWT(operatorKey: NKEYPair, config: {
    name: string;
    signingKeys: string[];
    accountServerUrl: string;
    operatorServiceUrls?: string[];
    maxTokenTTL?: number;
    issuedAt?: number;
    expiresAt?: number;
  }): string {
    const now = config.issuedAt ?? Date.now();
    const exp = config.expiresAt ?? (now + 365 * 86400000);
    const payload: OperatorClaims = {
      jti: randomUUID(),
      iat: Math.floor(now / 1000),
      exp: Math.floor(exp / 1000),
      iss: operatorKey.publicKey,
      sub: operatorKey.publicKey,
      name: config.name,
      type: 'operator',
      nkey: operatorKey.publicKey,
      signingKeys: config.signingKeys,
      accountServerUrl: config.accountServerUrl,
      operatorServiceUrls: config.operatorServiceUrls ?? [],
      maxTokenTTL: config.maxTokenTTL ?? 0,
    };
    return this._sign(payload, operatorKey);
  }

  parseOperatorJWT(jwt: string): { payload: OperatorClaims; valid: boolean; reason?: string } {
    const result = this._parseAndValidate(jwt, 'operator');
    if (!result.valid) {
      return { payload: result.payload as unknown as OperatorClaims, valid: false, reason: result.reason };
    }
    return { payload: result.payload as unknown as OperatorClaims, valid: true };
  }

  issueAccountJWT(signingKey: NKEYPair, accountKey: NKEYPair, config: {
    name: string;
    signingKeys?: string[];
    limits?: Partial<AccountLimits>;
    exports?: StreamExport[];
    imports?: StreamImport[];
    revocations?: Record<string, number>;
    issuedAt?: number;
    expiresAt?: number;
  }): string {
    const now = config.issuedAt ?? Date.now();
    const exp = config.expiresAt ?? (now + 365 * 86400000);
    const payload: AccountClaims = {
      jti: randomUUID(),
      iat: Math.floor(now / 1000),
      exp: Math.floor(exp / 1000),
      iss: signingKey.publicKey,
      sub: accountKey.publicKey,
      name: config.name,
      type: 'account',
      nkey: accountKey.publicKey,
      signingKeys: config.signingKeys ?? [],
      limits: {
        subs: config.limits?.subs ?? 1000,
        data: config.limits?.data ?? -1,
        payload: config.limits?.payload ?? -1,
        imports: config.limits?.imports ?? 10,
        exports: config.limits?.exports ?? 10,
      },
      exports: config.exports ?? [],
      imports: config.imports ?? [],
      revocations: config.revocations ?? {},
    };
    return this._sign(payload, signingKey);
  }

  parseAccountJWT(jwt: string): { payload: AccountClaims; valid: boolean; reason?: string } {
    const result = this._parseAndValidate(jwt, 'account');
    if (!result.valid) {
      return { payload: result.payload as unknown as AccountClaims, valid: false, reason: result.reason };
    }
    return { payload: result.payload as unknown as AccountClaims, valid: true };
  }

  issueUserJWT(signingKey: NKEYPair, userKey: NKEYPair, accountKey: string, config: {
    name: string;
    pub?: SubjectPermission;
    sub?: SubjectPermission;
    subs?: number;
    data?: number;
    payload?: number;
    tags?: string[];
    issuedAt?: number;
    expiresAt?: number;
  }): string {
    const now = config.issuedAt ?? Date.now();
    const exp = config.expiresAt ?? (now + 30 * 86400000);
    const pubPerm = config.pub ?? { allow: [], deny: [] };
    const subPerm = config.sub ?? { allow: [], deny: [] };
    const payload: UserClaims = {
      jti: randomUUID(),
      iat: Math.floor(now / 1000),
      exp: Math.floor(exp / 1000),
      iss: signingKey.publicKey,
      sub: userKey.publicKey,
      name: config.name,
      type: 'user',
      nkey: userKey.publicKey,
      account: accountKey,
      pub: pubPerm,
      allow_sub: subPerm.allow,
      deny_sub: subPerm.deny,
      subs: config.subs ?? 0,
      data: config.data ?? 0,
      payload: config.payload ?? 0,
      tags: config.tags ?? [],
    };
    return this._sign(payload, signingKey);
  }

  parseUserJWT(jwt: string): { payload: UserClaims; valid: boolean; reason?: string } {
    const result = this._parseAndValidate(jwt, 'user');
    if (!result.valid) {
      return { payload: result.payload as unknown as UserClaims, valid: false, reason: result.reason };
    }
    return { payload: result.payload as unknown as UserClaims, valid: true };
  }

  verifyJWTSignature(jwt: string, publicKey: string, verifyFn: (data: Uint8Array, sig: Uint8Array) => boolean): {
    valid: boolean;
    reason?: string;
    payload?: Record<string, unknown>;
  } {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Invalid JWT format: expected 3 parts' };
    }
    try {
      const payload = JSON.parse(base64urlDecode(parts[1]).toString());
      if (payload.iss !== publicKey) {
        return { valid: false, reason: 'Issuer mismatch' };
      }
      const toVerify = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
      const sig = base64urlDecode(parts[2]);
      if (!verifyFn(toVerify, sig)) {
        return { valid: false, reason: 'Invalid signature' };
      }
      return { valid: true, payload };
    } catch {
      return { valid: false, reason: 'JWT parse error' };
    }
  }

  isExpired(jwt: string): boolean {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return true;
    }
    try {
      const payload = JSON.parse(base64urlDecode(parts[1]).toString());
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return true;
      }
      return false;
    } catch {
      return true;
    }
  }

  getExpiry(jwt: string): number | null {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return null;
    }
    try {
      const payload = JSON.parse(base64urlDecode(parts[1]).toString());
      return payload.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  private _sign(payload: object, key: NKEYPair): string {
    const header = base64urlEncode(Buffer.from(JSON.stringify({ typ: 'jwt', alg: 'ed25519-nkey' })));
    const body = base64urlEncode(Buffer.from(JSON.stringify(payload)));
    const toSign = new TextEncoder().encode(`${header}.${body}`);
    const sig = key.sign(toSign);
    const signature = base64urlEncode(Buffer.from(sig));
    return `${header}.${body}.${signature}`;
  }

  private _parseAndValidate(jwt: string, expectedType: string): {
    payload: Record<string, unknown>;
    valid: boolean;
    reason?: string;
  } {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return { payload: {}, valid: false, reason: 'Invalid JWT format' };
    }
    try {
      const payload = JSON.parse(base64urlDecode(parts[1]).toString());
      if (payload.type !== expectedType) {
        return { payload, valid: false, reason: `Expected type ${expectedType}, got ${payload.type}` };
      }
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return { payload, valid: false, reason: 'JWT expired' };
      }
      if (payload.iat && payload.iat * 1000 > Date.now() + 10000) {
        return { payload, valid: false, reason: 'JWT issued in the future' };
      }
      return { payload, valid: true };
    } catch {
      return { payload: {}, valid: false, reason: 'JWT parse error' };
    }
  }
}
