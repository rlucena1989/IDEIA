import { describe, it, expect } from '@jest/globals';
import { reconcilePackages } from '../package-reconciler';
import { createPackageMetadata } from '../package-types';
import { buildOperationalPackage } from '../package-builder';
import { computePackageChecksum } from '../package-hasher';

function makePkg(data: unknown): ReturnType<typeof buildOperationalPackage> {
  const payload = data;
  const checksum = computePackageChecksum(JSON.stringify(payload));
  const metadata = createPackageMetadata({ source: 'test', target: 'test', kind: 'state' });
  return buildOperationalPackage(metadata, payload, checksum);
}

describe('package-reconciler', () => {
  it('reconcilePackages should be defined', () => {
    expect(reconcilePackages).toBeDefined();
  });

  it('should return missing when both are undefined', () => {
    const result = reconcilePackages(undefined, undefined);
    expect(result.status).toBe('missing');
    expect(result.ok).toBe(false);
  });

  it('should return identical when checksums match', () => {
    const pkg = makePkg({ data: 'test' });
    const result = reconcilePackages(pkg, pkg);
    expect(result.status).toBe('identical');
    expect(result.ok).toBe(true);
  });

  it('should return newer when only local exists', () => {
    const pkg = makePkg({ data: 'local' });
    const result = reconcilePackages(pkg, undefined);
    expect(result.status).toBe('newer');
  });

  it('should return older when only remote exists', () => {
    const pkg = makePkg({ data: 'remote' });
    const result = reconcilePackages(undefined, pkg);
    expect(result.status).toBe('older');
  });

  it('should return diverged when checksums differ', () => {
    const local = makePkg({ data: 'local' });
    const remote = makePkg({ data: 'remote' });
    const result = reconcilePackages(local, remote);
    expect(result.status).toBe('diverged');
    expect(result.ok).toBe(false);
  });
});
