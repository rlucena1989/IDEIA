import { BuildReproducibility } from './types';
import { createHash } from 'crypto';

export class BuildVerifier {
  verify(inputs: Record<string, string>, buildConfig: Record<string, string>, expectedOutputHash: string): BuildReproducibility {
    const serialized = this.serialize(inputs) + this.serialize(buildConfig);
    const actualHash = createHash('sha256').update(serialized).digest('hex');
    const differences: string[] = [];

    if (actualHash !== expectedOutputHash) {
      differences.push('output hash mismatch');
    }

    const lockedDeps = Object.entries(buildConfig).filter(([k, _v]) => k.includes('version') || k.includes('lock'));
    if (lockedDeps.length === 0) {
      differences.push('no locked dependencies found in build config');
    }

    return {
      reproducible: differences.length === 0,
      differences,
      buildConfig,
    };
  }

  private serialize(obj: Record<string, string>): string {
    return Object.entries(obj)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('|');
  }
}
