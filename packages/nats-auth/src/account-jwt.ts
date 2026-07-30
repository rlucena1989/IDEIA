import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { KeyPair } from './nkey-manager';
const logger = createLogger('account-jwt');

export interface ExportDef {
  name: string;
  subject: string;
  type: 'stream' | 'service';
  tokenReq: boolean;
  accountTokenPosition?: number;
  approvedAccounts?: string[];
}

export interface ImportDef {
  name: string;
  subject: string;
  account: string;
  type: 'stream' | 'service';
  localSubject?: string;
}

export interface AccountClaims {
  type: 'account';
  name: string;
  nkey: string;
  signingKeys: Array<{ key: string; kind: 'user' | 'account' }>;
  limits: { subs: number; data: number; payload: number; imports: number; exports: number };
  exports: ExportDef[];
  imports: ImportDef[];
  revocations: Record<string, number>;
  issuedAt: number;
  expiresAt: number;
}

export class AccountJWTGenerator {
  async generate(signingKey: KeyPair, accountKey: KeyPair, config: AccountClaims): Promise<string> {
    const payload = {
      jti: randomUUID(),
      iat: Math.floor(config.issuedAt / 1000),
      exp: Math.floor(config.expiresAt / 1000),
      iss: signingKey.publicKey,
      sub: accountKey.publicKey,
      name: config.name,
      type: 'account',
      nkey: accountKey.publicKey,
      signing_keys: config.signingKeys.map(sk => ({
        [sk.key]: { kind: sk.kind },
      })),
      limits: config.limits,
      exports: config.exports.map(e => ({
        name: e.name,
        subject: e.subject,
        type: e.type,
        token_req: e.tokenReq,
        ...(e.accountTokenPosition !== undefined ? { account_token_position: e.accountTokenPosition } : {}),
        ...(e.approvedAccounts ? { accounts: e.approvedAccounts } : {}),
      })),
      imports: config.imports.map(i => ({
        name: i.name,
        subject: i.subject,
        account: i.account,
        type: i.type,
        ...(i.localSubject ? { local_subject: i.localSubject } : {}),
      })),
      revocations: config.revocations,
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
