import { PrivacyPolicyValidator, createPolicyValidator } from '../src/policy-validator';
import { type PrivacyPolicy, DEFAULT_PRIVACY_CONFIG } from '../src/privacy-layer';
import { type RetentionRule } from '../src/retention';

describe('PrivacyPolicyValidator', () => {
  const validator = new PrivacyPolicyValidator();
  const validPolicy: PrivacyPolicy = {
    id: 'test-policy',
    name: 'Test Policy',
    description: 'A test policy',
    patterns: [{ name: 'email', regex: /test@test\.com/, severity: 'medium', category: 'contact' }],
    action: 'mask',
    appliesTo: ['*'],
  };

  it('validates a valid policy', () => {
    const result = validator.validatePolicy(validPolicy);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects policy with missing id', () => {
    const result = validator.validatePolicy({ ...validPolicy, id: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'MISSING_ID')).toBe(true);
  });

  it('rejects policy with invalid id format', () => {
    const result = validator.validatePolicy({ ...validPolicy, id: 'Invalid ID!' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_ID')).toBe(true);
  });

  it('rejects policy with missing name', () => {
    const result = validator.validatePolicy({ ...validPolicy, name: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'MISSING_NAME')).toBe(true);
  });

  it('rejects policy with invalid action', () => {
    const result = validator.validatePolicy({ ...validPolicy, action: 'invalid' as 'mask' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_ACTION')).toBe(true);
  });

  it('rejects policy with no patterns', () => {
    const result = validator.validatePolicy({ ...validPolicy, patterns: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'NO_PATTERNS')).toBe(true);
  });

  it('warns when critical pattern uses mask action', () => {
    const result = validator.validatePolicy({ ...validPolicy, patterns: [{ name: 'ssn', regex: /\d{3}-\d{2}-\d{4}/, severity: 'critical', category: 'governmental' }], action: 'mask' });
    expect(result.warnings.some(w => w.code === 'LOW_ACTION_FOR_CRITICAL')).toBe(true);
  });

  it('validates retention rule', () => {
    const rule: RetentionRule = { id: 'ret-1', domain: 'users', maxAgeDays: 90, action: 'archive', priority: 1 };
    const errors = validator.validateRetentionRule(rule);
    expect(errors).toHaveLength(0);
  });

  it('rejects retention rule with negative maxAgeDays', () => {
    const rule: RetentionRule = { id: 'ret-1', domain: 'users', maxAgeDays: -1, action: 'archive', priority: 1 };
    const errors = validator.validateRetentionRule(rule);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('validates entire config', () => {
    const report = validator.validateConfig(DEFAULT_PRIVACY_CONFIG);
    expect(report.totalPolicies).toBeGreaterThan(0);
    expect(report.totalRetentionRules).toBeGreaterThanOrEqual(0);
    expect(report.policyResults.length).toBe(report.totalPolicies);
  });

  it('createPolicyValidator factory works', () => {
    expect(createPolicyValidator()).toBeInstanceOf(PrivacyPolicyValidator);
  });
});
