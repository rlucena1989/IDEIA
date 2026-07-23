import { describe, it, expect } from '@jest/globals';
import { buildOperationalPackage } from '../package-builder';
import { createPackageMetadata } from '../package-types';

describe('package-builder', () => {
  it('buildOperationalPackage should be defined', () => {
    expect(buildOperationalPackage).toBeDefined();
  });

  it('should include metadata, payload and checksum', () => {
    const metadata = createPackageMetadata({ source: 'src', target: 'dst', kind: 'audit' });
    const payload = { version: '1.0', items: [1, 2, 3] };
    const checksum = 'abc';
    const pkg = buildOperationalPackage(metadata, payload, checksum);
    expect(pkg.metadata.source).toBe('src');
    expect(pkg.metadata.target).toBe('dst');
    expect(pkg.metadata.kind).toBe('audit');
    expect(pkg.payload).toEqual(payload);
    expect(pkg.checksum).toBe('abc');
  });
});
