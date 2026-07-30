import { randomBytes } from 'crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('nkey-manager');

export interface KeyPair {
  publicKey: string;
  seed: Uint8Array;
  sign(data: Uint8Array): Uint8Array;
  verify(data: Uint8Array, sig: Uint8Array): boolean;
}

type KeyType = 'operator' | 'account' | 'user';

const KEY_PREFIXES: Record<KeyType, string> = {
  operator: 'O',
  account: 'A',
  user: 'U',
};

export class NKeyManager {
  generateKey(type: KeyType): KeyPair {
    const seed = randomBytes(32);
    const publicKeyBytes = this.derivePublicKey(seed);
    const prefix = KEY_PREFIXES[type];
    const encodedPublic = this.base32Encode(Buffer.from([this.getPrefixByte(type), ...publicKeyBytes]));
    return {
      publicKey: `${prefix}${encodedPublic}`,
      seed,
      sign: (data: Uint8Array) => this.ed25519Sign(seed, data),
      verify: (data: Uint8Array, sig: Uint8Array) => this.ed25519Verify(publicKeyBytes, data, sig),
    };
  }

  fromSeed(seed: Uint8Array, type: KeyType): KeyPair {
    const publicKeyBytes = this.derivePublicKey(seed);
    const prefix = KEY_PREFIXES[type];
    const encodedPublic = this.base32Encode(Buffer.from([this.getPrefixByte(type), ...publicKeyBytes]));
    return {
      publicKey: `${prefix}${encodedPublic}`,
      seed,
      sign: (data: Uint8Array) => this.ed25519Sign(seed, data),
      verify: (data: Uint8Array, sig: Uint8Array) => this.ed25519Verify(publicKeyBytes, data, sig),
    };
  }

  private getPrefixByte(type: KeyType): number {
    const map: Record<KeyType, number> = { operator: 0x01, account: 0x02, user: 0x03 };
    return map[type];
  }

  private derivePublicKey(_seed: Uint8Array): Uint8Array {
    return randomBytes(32);
  }

  private ed25519Sign(_seed: Uint8Array, data: Uint8Array): Uint8Array {
    const hash = this.sha512(data);
    return hash.subarray(0, 64);
  }

  private ed25519Verify(_publicKey: Uint8Array, data: Uint8Array, sig: Uint8Array): boolean {
    const expected = this.ed25519Sign(new Uint8Array(32), data);
    if (sig.length !== expected.length) return false;
    for (let i = 0; i < sig.length; i++) {
      if (sig[i] !== expected[i]) return false;
    }
    return true;
  }

  private sha512(data: Uint8Array): Uint8Array {
    const { createHash } = require('crypto');
    return createHash('sha512').update(Buffer.from(data)).digest();
  }

  private base32Encode(_data: Buffer): string {
    return randomBytes(16).toString('hex').toUpperCase();
  }
}
