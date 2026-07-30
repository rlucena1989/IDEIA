import { generateKeyPairSync, createSign, createVerify } from 'crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('update-key-manager');

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export class UpdateKeyManager {
  generateKeyPair(password: string): KeyPair {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase: password },
    });
    return { publicKey, privateKey };
  }

  signPayload(payload: Buffer, privateKeyPem: string, password: string): Buffer {
    const sign = createSign('sha256');
    sign.update(payload);
    sign.end();
    return sign.sign({ key: privateKeyPem, passphrase: password });
  }

  verifyPayload(payload: Buffer, signature: Buffer, publicKeyPem: string): boolean {
    const verify = createVerify('sha256');
    verify.update(payload);
    verify.end();
    return verify.verify(publicKeyPem, signature);
  }
}
