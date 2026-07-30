import { PrivacyLayer, DEFAULT_PII_POLICIES } from '../src/privacy-layer';
import { PIIDetector } from '../src/pii-detector';

describe('PrivacyLayer Edge Cases', () => {
  let privacy: PrivacyLayer;

  beforeEach(() => {
    privacy = new PrivacyLayer();
  });

  describe('empty strings', () => {
    it('should handle empty string input', () => {
      const result = privacy.sanitize('');
      expect(result.original).toBe('');
      expect(result.sanitized).toBe('');
      expect(result.entitiesFound).toHaveLength(0);
      expect(result.entitiesMasked).toBe(0);
    });

    it('should handle string with only whitespace', () => {
      const result = privacy.sanitize('   ');
      expect(result.sanitized).toBe('   ');
      expect(result.entitiesFound).toHaveLength(0);
    });
  });

  describe('null and undefined handling', () => {
    it('should handle null text gracefully', () => {
      expect(() => privacy.sanitize(null as never)).toThrow();
    });

    it('should handle undefined text gracefully', () => {
      expect(() => privacy.sanitize(undefined as never)).toThrow();
    });
  });

  describe('very long strings', () => {
    it('should sanitize very long strings without performance degradation', () => {
      const longStr = 'A'.repeat(100000);
      const result = privacy.sanitize(longStr);
      expect(result.sanitized).toBe(longStr);
      expect(result.entitiesFound).toHaveLength(0);
    });

    it('should sanitize long string with PII embedded', () => {
      const prefix = 'X'.repeat(5000);
      const suffix = 'Y'.repeat(5000);
      const text = `${prefix} email: user@example.com ${suffix}`;
      const result = privacy.sanitize(text);
      expect(result.entitiesFound.length).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('user@example.com');
    });
  });

  describe('special characters', () => {
    it('should handle strings with only special characters', () => {
      const result = privacy.sanitize('!@#$%^&*()_+-=[]{}|;:,.<>?');
      expect(result.entitiesFound).toHaveLength(0);
    });

    it('should handle unicode and emoji', () => {
      const text = 'Hello 世界 🌍 email: test@test.com';
      const result = privacy.sanitize(text);
      expect(result.entitiesFound.length).toBeGreaterThan(0);
    });
  });

  describe('disabled privacy layer', () => {
    it('should return original text when disabled', () => {
      const disabled = new PrivacyLayer({ enabled: false });
      const result = disabled.sanitize('My email is user@test.com');
      expect(result.sanitized).toBe('My email is user@test.com');
      expect(result.entitiesMasked).toBe(0);
    });
  });

  describe('masking char customization', () => {
    it('should use custom masking character', () => {
      const custom = new PrivacyLayer({ maskingChar: '#' });
      const result = custom.sanitize('email: a@b.com');
      expect(result.sanitized).not.toContain('a@b.com');
    });
  });
});

describe('All 13 PII Policies', () => {
  let privacy: PrivacyLayer;
  let _detector: PIIDetector;

  beforeEach(() => {
    privacy = new PrivacyLayer();
    _detector = new PIIDetector();
  });

  it('pii-cpf: Brazilian CPF', () => {
    const result = privacy.sanitize('CPF: 123.456.789-00');
    expect(result.entitiesFound.some(e => e.type === 'cpf')).toBe(true);
    expect(result.policyApplied).toContain('pii-cpf');
    expect(result.sanitized).not.toContain('123.456.789-00');
  });

  it('pii-cnpj: Brazilian CNPJ', () => {
    const result = privacy.sanitize('CNPJ: 12.345.678/0001-90');
    expect(result.entitiesFound.some(e => e.type === 'cnpj')).toBe(true);
    expect(result.policyApplied).toContain('pii-cnpj');
  });

  it('pii-ssn: US SSN', () => {
    const result = privacy.sanitize('SSN: 987-65-4321');
    expect(result.entitiesFound.some(e => e.type === 'ssn')).toBe(true);
    expect(result.policyApplied).toContain('pii-ssn');
    expect(result.sanitized).not.toContain('987-65-4321');
  });

  it('pii-creditcard: Credit Card', () => {
    const result = privacy.sanitize('Card: 4111 1111 1111 1111');
    expect(result.entitiesFound.some(e => e.type === 'credit_card')).toBe(true);
    expect(result.policyApplied).toContain('pii-creditcard');
    expect(result.sanitized).not.toContain('4111');
  });

  it('pii-email: Email address', () => {
    const result = privacy.sanitize('Email: user@example.com');
    expect(result.entitiesFound.some(e => e.type === 'email')).toBe(true);
    expect(result.policyApplied).toContain('pii-email');
    expect(result.sanitized).not.toContain('user@example.com');
  });

  it('pii-phone: Phone number', () => {
    const result = privacy.sanitize('Phone: (11) 99999-8888');
    expect(result.entitiesFound.some(e => e.type === 'phone' || e.type === 'br_phone')).toBe(true);
    expect(result.policyApplied).toContain('pii-phone');
  });

  it('pii-ip: IP Address', () => {
    const result = privacy.sanitize('IP: 192.168.1.1');
    expect(result.entitiesFound.some(e => e.type === 'ip_address')).toBe(true);
    expect(result.policyApplied).toContain('pii-ip');
    expect(result.sanitized).not.toContain('192.168.1.1');
  });

  it('pii-credential: API keys, tokens, passwords', () => {
    const result = privacy.sanitize('api_key=sk-1234567890abcdef12345678');
    const credentialPolicies = result.policyApplied.filter(p => p.startsWith('pii-credential'));
    expect(credentialPolicies.length).toBeGreaterThanOrEqual(1);
    expect(result.sanitized).not.toContain('sk-1234567890abcdef12345678');
  });

  it('pii-governmental: Governmental IDs (UK NI, IN Aadhaar)', () => {
    const text = 'Aadhaar: 2345 6789 0123';
    const result = privacy.sanitize(text);
    const govPolicies = result.policyApplied.filter(p => p.startsWith('pii-governmental'));
    expect(govPolicies.length).toBeGreaterThanOrEqual(1);
  });

  it('pii-financial: Financial data (IBAN, SWIFT)', () => {
    const text = 'IBAN: GB29 NWBK 6016 1331 9268 19';
    const result = privacy.sanitize(text);
    const finPolicies = result.policyApplied.filter(p => p.startsWith('pii-financial'));
    expect(finPolicies.length).toBeGreaterThanOrEqual(1);
  });

  it('pii-contact: Contact info', () => {
    const result = privacy.sanitize('Phone: +55 11 91234-5678');
    const contactPolicies = result.policyApplied.filter(p => p.startsWith('pii-contact') || p === 'pii-phone' || p.startsWith('pii-network'));
    expect(contactPolicies.length).toBeGreaterThan(0);
  });

  it('pii-network: Network info', () => {
    const result = privacy.sanitize('IP: 10.0.0.1');
    const netPolicies = result.policyApplied.filter(p => p.startsWith('pii-network') || p === 'pii-ip');
    expect(netPolicies.length).toBeGreaterThan(0);
  });

  it('pii-address: Address/CEP', () => {
    const result = privacy.sanitize('CEP: 01310-100');
    expect(result.entitiesFound.some(e => e.type === 'cep')).toBe(true);
    expect(result.policyApplied).toContain('pii-address');
    expect(result.sanitized).not.toContain('01310-100');
  });

  it('should have exactly 13 policies', () => {
    expect(DEFAULT_PII_POLICIES.length).toBe(13);
    const ids = DEFAULT_PII_POLICIES.map(p => p.id);
    expect(ids).toContain('pii-cpf');
    expect(ids).toContain('pii-cnpj');
    expect(ids).toContain('pii-ssn');
    expect(ids).toContain('pii-creditcard');
    expect(ids).toContain('pii-email');
    expect(ids).toContain('pii-phone');
    expect(ids).toContain('pii-ip');
    expect(ids).toContain('pii-credential');
    expect(ids).toContain('pii-governmental');
    expect(ids).toContain('pii-financial');
    expect(ids).toContain('pii-contact');
    expect(ids).toContain('pii-network');
    expect(ids).toContain('pii-address');
  });
});
