import * as crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('package-hasher');

export function computePackageChecksum(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

export function computePackageChecksumSHA256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf-8').digest('hex');
}
