import { PrivacyLayer, DEFAULT_PII_POLICIES, DEFAULT_PRIVACY_CONFIG } from './privacy-layer';

describe('PrivacyLayer', () => {
  describe('DEFAULT_PII_POLICIES', () => {
    it('should have 6 default policies', () => {
      expect(DEFAULT_PII_POLICIES).toHaveLength(6);
    });

    it('should cover all PII categories', () => {
      const categories = DEFAULT_PII_POLICIES.map(p => p.id);
      expect(categories).toContain('pii-credential');
      expect(categories).toContain('pii-governmental');
      expect(categories).toContain('pii-financial');
      expect(categories).toContain('pii-contact');
      expect(categories).toContain('pii-network');
      expect(categories).toContain('pii-address');
    });

    it('all policies should apply to all contexts', () => {
      for (const policy of DEFAULT_PII_POLICIES) {
        expect(policy.appliesTo).toContain('*');
      }
    });

    it('credential policy should use hash action', () => {
      const credPolicy = DEFAULT_PII_POLICIES.find(p => p.id === 'pii-credential');
      expect(credPolicy?.action).toBe('hash');
    });

    it('contact policy should use mask action', () => {
      const contactPolicy = DEFAULT_PII_POLICIES.find(p => p.id === 'pii-contact');
      expect(contactPolicy?.action).toBe('mask');
    });

    it('governmental policy should use redact action', () => {
      const govPolicy = DEFAULT_PII_POLICIES.find(p => p.id === 'pii-governmental');
      expect(govPolicy?.action).toBe('redact');
    });
  });

  describe('DEFAULT_PRIVACY_CONFIG', () => {
    it('should be enabled by default', () => {
      expect(DEFAULT_PRIVACY_CONFIG.enabled).toBe(true);
    });
  });

  describe('redact action', () => {
    it('should redact CPF', () => {
      const layer = new PrivacyLayer();
      const result = layer.sanitize('CPF: 123.456.789-00');
      expect(result.sanitized).toContain('[REDACTED:cpf]');
    });

    it('should redact credit card', () => {
      const layer = new PrivacyLayer();
      const result = layer.sanitize('Card: 4111 1111 1111 1111');
      expect(result.sanitized).toContain('[REDACTED:credit_card]');
    });
  });

  describe('mask action', () => {
    it('should mask email with asterisks', () => {
      const layer = new PrivacyLayer();
      const result = layer.sanitize('Email: user@example.com');
      expect(result.entitiesFound.length).toBe(1);
      expect(result.sanitized).not.toContain('user@example.com');
    });

    it('should mask phone number', () => {
      const layer = new PrivacyLayer();
      const result = layer.sanitize('Phone: (11) 99999-8888');
      expect(result.entitiesFound.length).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('(11) 99999-8888');
    });
  });

  describe('hash action (SHA-256)', () => {
    it('should hash JWT token using SHA-256', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3j6Vl5J3P5Q';
      const layer = new PrivacyLayer();
      const result = layer.sanitize(`token: ${jwt}`);
      expect(result.sanitized).toMatch(/\[HASH:[a-f0-9]{16}\]/);
      expect(result.sanitized).not.toContain(jwt);
    });

    it('should produce consistent hashes for same input', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3j6Vl5J3P5Q';
      const layer = new PrivacyLayer();
      const r1 = layer.sanitize(`Bearer ${jwt}`);
      const r2 = layer.sanitize(`Bearer ${jwt}`);
      const hash1 = r1.sanitized.match(/\[HASH:([a-f0-9]+)\]/);
      const hash2 = r2.sanitized.match(/\[HASH:([a-f0-9]+)\]/);
      expect(hash1?.[1]).toBe(hash2?.[1]);
    });

    it('should produce different hashes for different inputs', () => {
      const layer = new PrivacyLayer();
      const jwt1 = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.X';
      const jwt2 = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyIn0.Y';
      const r1 = layer.sanitize(`Bearer ${jwt1}`);
      const r2 = layer.sanitize(`Bearer ${jwt2}`);
      const hash1 = r1.sanitized.match(/\[HASH:([a-f0-9]+)\]/);
      const hash2 = r2.sanitized.match(/\[HASH:([a-f0-9]+)\]/);
      expect(hash1?.[1]).not.toBe(hash2?.[1]);
    });
  });

  describe('block action', () => {
    it('should remove blocked PII entirely', () => {
      const layer = new PrivacyLayer({
        policies: [{
          id: 'block-test',
          name: 'Block Test',
          description: '',
          patterns: [{ name: 'email', regex: /\S+@\S+/g, severity: 'critical', category: 'block' }],
          action: 'block',
          appliesTo: ['*'],
        }],
      });
      const result = layer.sanitize('Email: user@test.com');
      expect(result.sanitized).toBe('Email: ');
    });
  });

  describe('disabled', () => {
    it('should return original text when disabled', () => {
      const layer = new PrivacyLayer({ enabled: false });
      const result = layer.sanitize('My email is user@test.com');
      expect(result.sanitized).toBe('My email is user@test.com');
      expect(result.entitiesFound).toHaveLength(0);
      expect(result.entitiesMasked).toBe(0);
    });
  });

  describe('duplicate PII handling', () => {
    it('should handle multiple occurrences of the same PII type', () => {
      const layer = new PrivacyLayer();
      const result = layer.sanitize('Emails: a@a.com and b@b.com');
      expect(result.entitiesFound.length).toBe(2);
      expect(result.sanitized).not.toContain('a@a.com');
      expect(result.sanitized).not.toContain('b@b.com');
    });

    it('should handle identical PII values appearing multiple times', () => {
      const layer = new PrivacyLayer();
      const result = layer.sanitize('Same email twice: user@test.com and user@test.com');
      expect(result.entitiesFound.length).toBe(2);
    });
  });

  describe('setConfig', () => {
    it('should update config', () => {
      const layer = new PrivacyLayer();
      layer.setConfig({ enabled: false });
      const result = layer.sanitize('test@test.com');
      expect(result.sanitized).toBe('test@test.com');
    });
  });

  describe('getRetentionManager', () => {
    it('should return retention manager', () => {
      const layer = new PrivacyLayer();
      const mgr = layer.getRetentionManager();
      expect(mgr).toBeDefined();
    });
  });

  describe('SHA-256 direct call', () => {
    it('should produce hex output of length 16 (truncated)', () => {
      const layer = new PrivacyLayer();
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3j6Vl5J3P5Q';
      const result = layer.sanitize(jwt);
      const match = result.sanitized.match(/\[HASH:([a-f0-9]+)\]/);
      expect(match).toBeTruthy();
      expect(match?.[1].length).toBe(16);
    });
  });
});
