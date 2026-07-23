import { describe, it, expect } from '@jest/globals';
import { computePackageChecksum, computePackageChecksumSHA256 } from '../package-hasher';

describe('package-hasher', () => {
  it('computePackageChecksum should be defined', () => {
    expect(computePackageChecksum).toBeDefined();
  });

  it('should produce consistent hashes', () => {
    const hash1 = computePackageChecksum('hello');
    const hash2 = computePackageChecksum('hello');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = computePackageChecksum('hello');
    const hash2 = computePackageChecksum('world');
    expect(hash1).not.toBe(hash2);
  });

  it('computePackageChecksumSHA256 should be defined', () => {
    expect(computePackageChecksumSHA256).toBeDefined();
  });

  it('should produce consistent SHA256 hashes', () => {
    const hash1 = computePackageChecksumSHA256('test data');
    const hash2 = computePackageChecksumSHA256('test data');
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });
});
