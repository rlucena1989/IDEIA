import { randomBytes, createHash } from 'crypto';
import { createLogger } from '@ideia/logger';
import { type NKEYPair, type KeyType, KEY_PREFIXES } from './types';
const logger = createLogger('nkey-manager');

const KEY_TYPE_BYTE: Record<KeyType, number> = {
  operator: 0x01,
  account: 0x02,
  user: 0x03,
};

function base32Encode(data: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let bitCount = 0;
  const result: string[] = [];
  for (const byte of data) {
    bits = (bits << 8) | byte;
    bitCount += 8;
    while (bitCount >= 5) {
      bitCount -= 5;
      result.push(alphabet[(bits >> bitCount) & 31]);
    }
  }
  if (bitCount > 0) {
    result.push(alphabet[(bits << (5 - bitCount)) & 31]);
  }
  return result.join('');
}

export class NKEYManager {
  generateKey(type: KeyType): NKEYPair {
    const seed = randomBytes(32);
    return this._createPair(seed, type);
  }

  fromSeed(seed: Uint8Array, type: KeyType): NKEYPair {
    return this._createPair(new Uint8Array(seed), type);
  }

  private _createPair(seed: Uint8Array, type: KeyType): NKEYPair {
    const publicKeyBytes = this._derivePublicKey(seed);
    const prefixByte = KEY_TYPE_BYTE[type];
    const prefix = KEY_PREFIXES[type];
    const encodedPublic = base32Encode(Buffer.from([prefixByte, ...publicKeyBytes]));
    const manager = this;
    return {
      publicKey: `${prefix}${encodedPublic}`,
      seed: new Uint8Array(seed),
      sign(data: Uint8Array): Uint8Array {
        return manager._ed25519Sign(seed, data);
      },
      verify(data: Uint8Array, sig: Uint8Array): boolean {
        return manager._ed25519Verify(publicKeyBytes, data, sig);
      },
    };
  }

  private _derivePublicKey(seed: Uint8Array): Uint8Array {
    const hash = createHash('sha512').update(Buffer.from(seed)).digest();
    const clamped = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      clamped[i] = hash[i];
    }
    clamped[0] &= 248;
    clamped[31] &= 127;
    clamped[31] |= 64;
    return clamped;
  }

  private _ed25519Sign(seed: Uint8Array, data: Uint8Array): Uint8Array {
    const prefix = createHash('sha512').update(Buffer.from(seed)).digest().subarray(0, 32);
    const rHash = createHash('sha512')
      .update(Buffer.from(prefix))
      .update(Buffer.from(data))
      .digest();
    const r = this._reduceModL(rHash);
    const publicKey = this._derivePublicKey(seed);
    const sHash = createHash('sha512')
      .update(Buffer.from(r))
      .update(Buffer.from(publicKey))
      .update(Buffer.from(data))
      .digest();
    const s = this._reduceModL(sHash);
    const signature = new Uint8Array(64);
    for (let i = 0; i < 32; i++) {
      signature[i] = r[i];
    }
    for (let i = 0; i < 32; i++) {
      signature[32 + i] = s[i];
    }
    return signature;
  }

  private _ed25519Verify(publicKey: Uint8Array, data: Uint8Array, sig: Uint8Array): boolean {
    if (sig.length !== 64) {
      return false;
    }
    const r = sig.subarray(0, 32);
    const s = sig.subarray(32, 64);
    const sHash = createHash('sha512')
      .update(Buffer.from(r))
      .update(Buffer.from(publicKey))
      .update(Buffer.from(data))
      .digest();
    const expectedS = this._reduceModL(sHash);
    for (let i = 0; i < 32; i++) {
      if (s[i] !== expectedS[i]) {
        return false;
      }
    }
    return true;
  }

  private _reduceModL(data: Uint8Array): Uint8Array {
    const l = BigInt('7237005577332262213973186563042994240857116359379907606001950938285454250989');
    let value = BigInt(0);
    for (const byte of data) {
      value = (value << 8n) | BigInt(byte);
    }
    const reduced = value % l;
    const result = new Uint8Array(32);
    let temp = reduced;
    for (let i = 31; i >= 0; i--) {
      result[i] = Number(temp & 0xffn);
      temp >>= 8n;
    }
    return result;
  }

  sign(keyPair: NKEYPair, data: Uint8Array): Uint8Array {
    return keyPair.sign(data);
  }

  verify(keyPair: NKEYPair, data: Uint8Array, sig: Uint8Array): boolean {
    return keyPair.verify(data, sig);
  }

  getPublicKey(keyPair: NKEYPair): string {
    return keyPair.publicKey;
  }

  getSeed(keyPair: NKEYPair): Uint8Array {
    return new Uint8Array(keyPair.seed);
  }
}
