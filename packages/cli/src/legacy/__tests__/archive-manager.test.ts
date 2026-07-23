import { describe, it, expect } from '@jest/globals';
import { archiveItems, verifyArchive } from '../archive-manager';

describe('archive-manager', () => {
  it('archiveItems should be defined', () => {
    expect(archiveItems).toBeDefined();
  });

  it('should create archive bundle with items', () => {
    const bundle = archiveItems(['memory', 'docs', 'policies']);
    expect(bundle.bundleId).toContain('bundle-');
    expect(bundle.items).toEqual(['memory', 'docs', 'policies']);
    expect(bundle.checksum).toContain('checksum-');
  });

  it('should verify valid bundle', () => {
    const bundle = archiveItems(['item1']);
    expect(verifyArchive(bundle)).toBe(true);
  });

  it('should fail verification for corrupted bundle', () => {
    const bundle = archiveItems(['item1']);
    bundle.checksum = 'tampered';
    expect(verifyArchive(bundle)).toBe(false);
  });
});
