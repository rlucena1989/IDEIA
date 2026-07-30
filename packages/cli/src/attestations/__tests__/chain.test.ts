import crypto from 'node:crypto';
import * as fs from 'node:fs';
import type { Attestation } from '../chain';
import { createAttestation, loadChain, validateChain, revokeAttestation } from '../chain';

jest.mock('node:fs');
const mockFs = fs as jest.Mocked<typeof fs>;

function makeAttestation(overrides: Partial<Attestation> = {}): Attestation {
  return {
    id: 'test-id',
    timestamp: '2026-01-01T00:00:00.000Z',
    check_type: 'test',
    result: 'pass',
    signature: 'fixed-signature',
    prev_signature: 'genesis',
    ...overrides,
  };
}

describe('attestations chain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('fixed-uuid' as never);
    jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.alloc(32, 0x61) as never);
    const mockHmac = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('fixed-signature'),
    };
    jest.spyOn(crypto, 'createHmac').mockReturnValue(mockHmac as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('createAttestation', () => {
    it('writes chain file and returns a signed attestation', () => {
      mockFs.existsSync.mockReturnValue(false);

      const att = createAttestation('/root', 'security', 'pass', 'all good');

      expect(att.id).toBe('fixed-uuid');
      expect(att.check_type).toBe('security');
      expect(att.result).toBe('pass');
      expect(att.details).toBe('all good');
      expect(att.prev_signature).toBe('genesis');
      expect(att.signature).toBe('fixed-signature');
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadChain', () => {
    it('returns empty array when no chain file exists', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(loadChain('/root')).toEqual([]);
    });

    it('reads and parses existing chain file', () => {
      const entry = makeAttestation({ id: '1' });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(entry) + '\n');

      const chain = loadChain('/root');
      expect(chain).toHaveLength(1);
      expect(chain[0].id).toBe('1');
    });
  });

  describe('validateChain', () => {
    it('returns valid=true for an untampered chain', () => {
      const entry = makeAttestation({ id: '1' });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(entry) + '\n');

      const result = validateChain('/root');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.attestations).toBe(1);
    });

    it('detects tampered signature and returns valid=false', () => {
      const entry = makeAttestation({ id: '1', signature: 'tampered-sig' });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(entry) + '\n');

      const result = validateChain('/root');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('ADULTERADA');
    });

    it('reports invalid prev_signature for broken chain link', () => {
      const first = makeAttestation({ id: '1', signature: 'sig-a' });
      const second = makeAttestation({ id: '2', prev_signature: 'wrong-prev', signature: 'sig-b' });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        [JSON.stringify(first), JSON.stringify(second)].join('\n') + '\n'
      );

      const result = validateChain('/root');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('prev_signature'))).toBe(true);
    });
  });

  describe('revokeAttestation', () => {
    it('marks attestation as revoked and rewrites chain', () => {
      const entry = makeAttestation({ id: 'target-id' });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(entry) + '\n');

      const result = revokeAttestation('/root', 'target-id', 'because');
      expect(result).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);

      const written = mockFs.writeFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(written.trim()) as Attestation;
      expect(parsed.revoked).toBe(true);
      expect(parsed.revoke_reason).toBe('because');
    });

    it('returns false for non-existent attestation id', () => {
      const entry = makeAttestation({ id: 'other-id' });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(entry) + '\n');

      const result = revokeAttestation('/root', 'missing-id');
      expect(result).toBe(false);
    });
  });
});
