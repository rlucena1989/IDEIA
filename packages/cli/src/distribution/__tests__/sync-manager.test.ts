import { describe, it, expect } from '@jest/globals';
import { synchronizePackage } from '../sync-manager';
import { createPackageMetadata } from '../package-types';
import { buildOperationalPackage } from '../package-builder';
import { computePackageChecksum } from '../package-hasher';

function makePkg(data: unknown): ReturnType<typeof buildOperationalPackage> {
  const payload = data;
  const checksum = computePackageChecksum(JSON.stringify(payload));
  const metadata = createPackageMetadata({ source: 'local', target: 'remote', kind: 'state' });
  return buildOperationalPackage(metadata, payload, checksum);
}

describe('sync-manager', () => {
  it('synchronizePackage should be defined', () => {
    expect(synchronizePackage).toBeDefined();
  });

  it('should return incremental for identical packages', () => {
    const pkg = makePkg({ data: 'same' });
    const result = synchronizePackage(pkg, pkg, 'remote');
    expect(result.syncType).toBe('incremental');
    expect(result.ok).toBe(true);
  });

  it('should return repair for diverged packages', () => {
    const local = makePkg({ data: 'local' });
    const remote = makePkg({ data: 'remote' });
    const result = synchronizePackage(local, remote, 'remote');
    expect(result.syncType).toBe('repair');
    expect(result.ok).toBe(false);
  });

  it('should return full for local-only package', () => {
    const local = makePkg({ data: 'only-local' });
    const result = synchronizePackage(local, undefined, 'remote');
    expect(result.syncType).toBe('full');
    expect(result.ok).toBe(true);
    expect(result.emission).toBeDefined();
  });
});
