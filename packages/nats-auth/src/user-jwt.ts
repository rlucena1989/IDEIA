import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { KeyPair } from './nkey-manager';
const logger = createLogger('user-jwt');

export interface UserClaims {
  type: 'user';
  name: string;
  nkey: string;
  account: string;
  pub: { allow: string[]; deny: string[] };
  sub: { allow: string[]; deny: string[] };
  tags: string[];
  issuedAt: number;
  expiresAt: number;
}

export class UserJWTGenerator {
  async generate(signingKey: KeyPair, userKey: KeyPair, accountKey: string, config: UserClaims): Promise<string> {
    const payload = {
      jti: randomUUID(),
      iat: Math.floor(config.issuedAt / 1000),
      exp: Math.floor(config.expiresAt / 1000),
      iss: signingKey.publicKey,
      sub: userKey.publicKey,
      name: config.name,
      type: 'user',
      nkey: userKey.publicKey,
      account: accountKey,
      pub: config.pub,
      allow_sub: config.sub.allow,
      deny_sub: config.sub.deny,
      tags: config.tags || [],
    };
    return this.signJWT(payload, signingKey);
  }

  private async signJWT(payload: Record<string, unknown>, key: KeyPair): Promise<string> {
    const header = Buffer.from(JSON.stringify({ typ: 'jwt', alg: 'ed25519-nkey' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const toSign = new TextEncoder().encode(`${header}.${body}`);
    const sig = key.sign(toSign);
    const signature = Buffer.from(sig).toString('base64url');
    return `${header}.${body}.${signature}`;
  }
}
