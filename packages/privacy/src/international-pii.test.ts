import { PIIDetector, DEFAULT_PII_PATTERNS } from './pii-detector';

describe('PIIDetector — International PII Patterns', () => {
  const detector = new PIIDetector(DEFAULT_PII_PATTERNS);

  describe('International phone formats', () => {
    it('detects UK phone number (+44)', () => {
      const r = detector.detect('Call me at +44 7123 456789');
      expect(r.some(p => p.type === 'uk_phone')).toBe(true);
    });

    it('detects French phone number (+33)', () => {
      const r = detector.detect('Contact: +33 6 12 34 56 78');
      expect(r.some(p => p.type === 'fr_phone')).toBe(true);
    });

    it('detects German phone number (+49)', () => {
      const r = detector.detect('Tel: +49 30 12345678');
      expect(r.some(p => p.type === 'de_phone')).toBe(true);
    });

    it('detects Brazilian phone number (+55)', () => {
      const r = detector.detect('WhatsApp: +55 11 99999-8888');
      expect(r.some(p => p.type === 'br_phone')).toBe(true);
    });

    it('detects Indian phone number (+91)', () => {
      const r = detector.detect('Mobile: +91 9876543210');
      expect(r.some(p => p.type === 'in_phone')).toBe(true);
    });

    it('detects Japanese phone number (+81)', () => {
      const r = detector.detect('Phone: +81 3 1234 5678');
      expect(r.some(p => p.type === 'jp_phone')).toBe(true);
    });
  });

  describe('International ID formats', () => {
    it('detects UK National Insurance number', () => {
      const r = detector.detect('NI: AB 12 34 56 C');
      expect(r.some(p => p.type === 'uk_ni_number')).toBe(true);
    });

    it('detects Indian Aadhaar number', () => {
      const r = detector.detect('Aadhaar: 2345 6789 1234');
      expect(r.some(p => p.type === 'in_aadhaar')).toBe(true);
    });

    it('detects Chinese ID number', () => {
      const r = detector.detect('ID: 110101199001011234');
      expect(r.some(p => p.type === 'cn_id')).toBe(true);
    });
  });

  describe('Passport and travel documents', () => {
    it('detects UK passport number', () => {
      const r = detector.detect('Passport: 123456789');
      expect(r.some(p => p.type === 'passport_uk')).toBe(true);
    });

    it('detects US passport number', () => {
      const r = detector.detect('Passport: A12345678');
      expect(r.some(p => p.type === 'passport_us')).toBe(true);
    });
  });

  describe('Financial international', () => {
    it('detects IBAN', () => {
      const r = detector.detect('IBAN: GB82WEST12345698765432');
      expect(r.some(p => p.type === 'iban')).toBe(true);
    });

    it('detects SWIFT/BIC code', () => {
      const r = detector.detect('SWIFT: DEUTDEFFXXX');
      expect(r.some(p => p.type === 'swift_bic')).toBe(true);
    });
  });

  describe('International tax IDs', () => {
    it('detects EU VAT number', () => {
      const r = detector.detect('VAT: DE123456789');
      expect(r.some(p => p.type === 'eu_vat')).toBe(true);
    });

    it('detects Indian GST number', () => {
      const r = detector.detect('GST: 27AAPFU0939F1ZV');
      expect(r.some(p => p.type === 'in_gst')).toBe(true);
    });
  });

  it('detects multiple international PII types in mixed text', () => {
    const r = detector.detect('User: +44 7123 456789, IBAN: GB82WEST12345698765432, Aadhaar: 2345 6789 1234');
    expect(r.length).toBeGreaterThanOrEqual(3);
  });

  it('returns expected pattern count in DEFAULT_PII_PATTERNS', () => {
    expect(DEFAULT_PII_PATTERNS.length).toBeGreaterThanOrEqual(27);
  });
});
