import { describe, it, expect } from '@jest/globals';
import { validateOperationalPackage } from '../package-validator';
import { createPackageMetadata } from '../package-types';
import { buildOperationalPackage } from '../package-builder';
import { computePackageChecksum } from '../package-hasher';

describe('package-validator', () => {
  it('validateOperationalPackage should be defined', () => {
    expect(validateOperationalPackage).toBeDefined();
  });

  it('should pass for valid package', () => {
    const payload = { data: 'test' };
    const checksum = computePackageChecksum(JSON.stringify(payload));
    const metadata = createPackageMetadata({ source: 'src', target: 'dst', kind: 'state' });
    const pkg = buildOperationalPackage(metadata, payload, checksum);
    const result = validateOperationalPackage(pkg);
    expect(result.ok).toBe(true);
  });

  it('should fail on checksum mismatch', () => {
    const payload = { data: 'test' };
    const metadata = createPackageMetadata({ source: 'src', target: 'dst', kind: 'state' });
    const pkg = buildOperationalPackage(metadata, payload, 'wrong-checksum');
    const result = validateOperationalPackage(pkg);
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.includes('Checksum'))).toBe(true);
  });

  it('should fail on empty packageId', () => {
    const payload = {};
    const checksum = computePackageChecksum(JSON.stringify(payload));
    const metadata = createPackageMetadata({ source: 'src', target: 'dst', kind: 'state' });
    metadata.packageId = '';
    const pkg = buildOperationalPackage(metadata, payload, checksum);
    const result = validateOperationalPackage(pkg);
    expect(result.ok).toBe(false);
  });
});
