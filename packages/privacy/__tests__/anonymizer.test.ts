import { AnonymizationPipeline, AnonymizationReport } from '../src/anonymization-pipeline';

describe('AnonymizationPipeline', () => {
  let pipeline: AnonymizationPipeline;

  beforeEach(() => {
    pipeline = AnonymizationPipeline.createWithDefaultRules();
  });

  describe('addRule', () => {
    it('should add a custom rule', () => {
      pipeline.addRule('ssn', /\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****');
      const result = pipeline.anonymize('My SSN is 123-45-6789.');
      expect(result.text).toContain('***-**-****');
      expect(result.report.totalReplacements).toBe(1);
    });

    it('should override an existing rule with the same name', () => {
      pipeline.addRule('email', /\S+@\S+/g, '[HIDDEN]');
      const result = pipeline.anonymize('Contact me at user@example.com');
      expect(result.text).toBe('Contact me at [HIDDEN]');
    });
  });

  describe('anonymize with email', () => {
    it('should anonymize email addresses', () => {
      const result = pipeline.anonymize('Email: john.doe@example.com');
      expect(result.text).toBe('Email: ***@***');
      expect(result.report.rulesApplied[0].name).toBe('email');
      expect(result.report.rulesApplied[0].count).toBe(1);
    });

    it('should anonymize multiple emails', () => {
      const result = pipeline.anonymize('a@b.com and c@d.org');
      expect(result.text).toBe('***@*** and ***@***');
      expect(result.report.totalReplacements).toBe(2);
    });
  });

  describe('anonymize with CPF', () => {
    it('should anonymize CPF numbers', () => {
      const result = pipeline.anonymize('CPF: 123.456.789-00');
      expect(result.text).toBe('CPF: ***.***.***-**');
      expect(result.report.rulesApplied.some(r => r.name === 'cpf')).toBe(true);
    });
  });

  describe('anonymize with phone', () => {
    it('should anonymize phone numbers', () => {
      const result = pipeline.anonymize('Phone: (11) 99999-8888');
      expect(result.text).toBe('Phone: ****-****');
    });

    it('should anonymize international phone numbers', () => {
      const result = pipeline.anonymize('Call +55 11 91234-5678');
      expect(result.text).toBe('Call ****-****');
    });
  });

  describe('anonymize with credit card', () => {
    it('should anonymize credit card numbers', () => {
      const result = pipeline.anonymize('Card: 4111 1111 1111 1111');
      expect(result.text).toBe('Card: ****-****-****-****');
    });

    it('should anonymize dashed credit card numbers', () => {
      const result = pipeline.anonymize('Card: 4111-1111-1111-1111');
      expect(result.text).toBe('Card: ****-****-****-****');
    });
  });

  describe('anonymize with IP', () => {
    it('should anonymize IP addresses', () => {
      const result = pipeline.anonymize('IP: 192.168.1.1');
      expect(result.text).toBe('IP: *.*.*.*');
    });
  });

  describe('anonymize with API key', () => {
    it('should redact API keys', () => {
      const result = pipeline.anonymize('api_key=sk-1234567890abcdef12345678');
      expect(result.text).not.toContain('sk-1234567890abcdef12345678');
    });
  });

  describe('anonymizeJson', () => {
    it('should anonymize sensitive fields in JSON', () => {
      const data = {
        user: 'john',
        email: 'john@example.com',
        details: { phone: '(11) 99999-8888' },
      };
      const result = pipeline.anonymizeJson(data, ['email', 'details.phone']);
      expect(result.data.email).toBe('***@***');
      expect((result.data.details as Record<string, unknown>).phone).toBe('****-****');
      expect(result.data.user).toBe('john');
    });

    it('should handle non-string fields gracefully', () => {
      const data = { name: 'John', age: 30, active: true };
      const result = pipeline.anonymizeJson(data, ['name', 'age', 'active']);
      expect(result.data.age).toBe(30);
      expect(result.data.active).toBe(true);
    });
  });

  describe('getReport', () => {
    it('should return cumulative report across multiple calls', () => {
      pipeline.anonymize('Email: a@b.com');
      pipeline.anonymize('Email: c@d.org, Phone: 11999998888');
      const report = pipeline.getReport();
      expect(report.totalReplacements).toBe(3);
      const emailRule = report.rulesApplied.find(r => r.name === 'email');
      expect(emailRule?.count).toBe(2);
      const phoneRule = report.rulesApplied.find(r => r.name === 'phone');
      expect(phoneRule?.count).toBe(1);
    });

    it('should reset cumulative report on reset', () => {
      pipeline.anonymize('Email: a@b.com');
      pipeline.reset();
      const report = pipeline.getReport();
      expect(report.totalReplacements).toBe(0);
      expect(report.rulesApplied).toHaveLength(0);
    });
  });

  describe('report structure', () => {
    it('should include all fields in AnonymizationReport', () => {
      const result = pipeline.anonymize('Email: user@test.com');
      const report: AnonymizationReport = result.report;
      expect(report).toHaveProperty('totalReplacements');
      expect(report).toHaveProperty('rulesApplied');
      expect(report).toHaveProperty('originalLength');
      expect(report).toHaveProperty('anonymizedLength');
      expect(typeof report.totalReplacements).toBe('number');
      expect(Array.isArray(report.rulesApplied)).toBe(true);
    });
  });
});
