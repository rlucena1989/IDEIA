import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { KeyPair } from './nkey-manager';
const logger = createLogger('operator-jwt');

export interface OperatorClaims {
  type: 'operator';
  name: string;
  nkey: string;
  signingKeys: string[];
  accountServerUrl: string;
  operatorServiceUrls: string[];
  maxTokenTTL: number;
  issuedAt: number;
  expiresAt: number;
}

export class OperatorJWTGenerator {
  async generate(operatorKey: KeyPair, config: OperatorClaims): Promise<string> {
    const payload = {
      jti: randomUUID(),
      iat: Math.floor(config.issuedAt / 1000),
      exp: Math.floor(config.expiresAt / 1000),
      iss: operatorKey.publicKey,
      sub: operatorKey.publicKey,
      name: config.name,
      type: 'operator',
      nkey: operatorKey.publicKey,
      signing_keys: config.signingKeys,
      account_server_url: config.accountServerUrl,
      operator_service_urls: config.operatorServiceUrls || [],
      max_token_ttl: config.maxTokenTTL || 0,
    };
    return this.signJWT(payload, operatorKey);
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
