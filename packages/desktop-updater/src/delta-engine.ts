import { createHash } from 'crypto';
import { createLogger } from '@ideia/logger';
import { createReadStream } from 'fs';
const logger = createLogger('delta-engine');

export interface PatchManifest {
  fromVersion: string;
  toVersion: string;
  patchUrl: string;
  patchSize: number;
  patchSha256: string;
  platform: string;
  arch: string;
}

export class DeltaUpdateEngine {
  async getDeltaManifest(from: string, to: string, platform: string, baseUrl: string): Promise<PatchManifest | null> {
    try {
      const response = await fetch(`${baseUrl}/delta/${platform}/${from}/${to}/manifest.json`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Delta check failed: ${response.status}`);
      return response.json();
    } catch {
      return null;
    }
  }

  async applyPatch(patchPath: string, fromBinary: string, outputPath: string): Promise<void> {
    const { execSync } = await import('child_process');
    execSync(`bspatch "${fromBinary}" "${outputPath}" "${patchPath}"`, { timeout: 120000 });
  }

  async verifyPatch(patchPath: string, expectedHash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(patchPath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex') === expectedHash));
      stream.on('error', reject);
    });
  }
}
