import { AnonymizationPipeline } from '../src/anonymization-pipeline';
import { Anonymizer } from '../src/anonymizer';
import { PIIDetector } from '../src/pii-detector';

describe('AnonymizationPipeline', () => {
  it('creates with default rules via factory', () => {
    const pipeline = AnonymizationPipeline.createWithDefaultRules();
    expect(pipeline).toBeInstanceOf(AnonymizationPipeline);
  });

  it('anonymizes text with credit card pattern', () => {
    const pipeline = AnonymizationPipeline.createWithDefaultRules();
    const result = pipeline.anonymize('My card is 4111 1111 1111 1111');
    expect(result.text).not.toContain('4111 1111 1111 1111');
    expect(result.report.totalReplacements).toBeGreaterThan(0);
  });

  it('anonymizes text with email pattern', () => {
    const pipeline = AnonymizationPipeline.createWithDefaultRules();
    const result = pipeline.anonymize('Email me at user@example.com');
    expect(result.text).toBe('Email me at ***@***');
    expect(result.report.rulesApplied.some(r => r.name === 'email')).toBe(true);
  });

  it('adds a custom rule', () => {
    const pipeline = AnonymizationPipeline.createWithDefaultRules();
    pipeline.addRule('custom_pii', /my-secret-value/g, '[HIDDEN]');
    const result = pipeline.anonymize('my-secret-value is sensitive');
    expect(result.text).toContain('[HIDDEN]');
  });

  it('replaces existing rule with same name', () => {
    const pipeline = AnonymizationPipeline.createWithDefaultRules();
    pipeline.addRule('email', /override/g, '[OVERRIDDEN]');
    const result = pipeline.anonymize('test@test.com');
    expect(result.text).toContain('test@test.com');
  });

  it('anonymizes JSON with sensitive fields', () => {
    const pipeline = AnonymizationPipeline.createWithDefaultRules();
    const data = { user: { email: 'john@example.com', name: 'John' } };
    const result = pipeline.anonymizeJson(data, ['user.email']);
    expect((result.data as Record<string, Record<string, string>>).user.email).toBe('***@***');
  });

  it('process method detects and anonymizes', async () => {
    const pipeline = AnonymizationPipeline.createWithDefaultRules();
    const data = { email: 'test@example.com', cpf: '123.456.789-09' };
    const result = await pipeline.process(data);
    expect(result.pipeline.piiDetected).toBeGreaterThan(0);
    expect(result.pipeline.piiAnonymized).toBeGreaterThan(0);
  });

  it('process fails on unsafe output when failOnUnsafeOutput is true', async () => {
    const pipeline = new AnonymizationPipeline(new Anonymizer(), new PIIDetector([{ name: 'test', regex: /FAIL_SAFE/g, severity: 'high', category: 'test' }]));
    const data = { value: 'FAIL_SAFE data' };
    await expect(pipeline.process(data)).rejects.toThrow('unsafe output');
  });

  it('processStream handles multiple items with progress', async () => {
    const pipeline = AnonymizationPipeline.createWithDefaultRules();
    const items = [{ email: 'a@b.com' }, { email: 'c@d.com' }];
    let progressCount = 0;
    const results = await pipeline.processStream(items, (p) => { progressCount = p; });
    expect(results.length).toBe(2);
    expect(progressCount).toBe(2);
  });

  it('getReport returns cumulative stats', () => {
    const pipeline = AnonymizationPipeline.createWithDefaultRules();
    pipeline.anonymize('email: a@b.com');
    pipeline.anonymize('card: 4111 1111 1111 1111');
    const report = pipeline.getReport();
    expect(report.totalReplacements).toBeGreaterThan(0);
    expect(report.originalLength).toBeGreaterThan(0);
  });

  it('reset clears cumulative stats', () => {
    const pipeline = AnonymizationPipeline.createWithDefaultRules();
    pipeline.anonymize('email: a@b.com');
    pipeline.reset();
    const report = pipeline.getReport();
    expect(report.totalReplacements).toBe(0);
  });

  it('getStats returns processed count', () => {
    const pipeline = AnonymizationPipeline.createWithDefaultRules();
    pipeline.anonymize('text');
    const stats = pipeline.getStats();
    expect(stats.processedCount).toBe(0);
  });

  it('setAnonymizer replaces the anonymizer', () => {
    const pipeline = AnonymizationPipeline.createWithDefaultRules();
    const newAnon = new Anonymizer();
    pipeline.setAnonymizer(newAnon);
    const result = pipeline.anonymize('test@test.com');
    expect(result.text).toBe('***@***');
  });
});
