import { createHash, createVerify } from 'crypto';
import { createLogger } from '@ideia/logger';
import { createReadStream } from 'fs';
const logger = createLogger('update-verifier');

export interface VerifyResult {
  valid: boolean;
  algorithm: string;
  error?: string;
}

export class UpdateVerifier {
  verifySha512(filePath: string, expectedHash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha512');
      const stream = createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex') === expectedHash));
      stream.on('error', reject);
    });
  }

  verifyEd25519(filePath: string, signature: string, publicKey: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => {
        try {
          const isVerified = createVerify('sha256')
            .update(hash.digest())
            .verify(publicKey, Buffer.from(signature, 'base64'));
          resolve(isVerified);
        } catch {
          resolve(false);
        }
      });
      stream.on('error', reject);
    });
  }
}
