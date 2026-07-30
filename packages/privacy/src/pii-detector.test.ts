import { PIIDetector, DEFAULT_PII_PATTERNS } from './pii-detector';

describe('PIIDetector', () => {
  const detector = new PIIDetector(DEFAULT_PII_PATTERNS);

  it('should detect email', () => {
    const result = detector.detect('Contact: user@example.com');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('email');
    expect(result[0].value).toBe('user@example.com');
  });

  it('should detect CPF', () => {
    const result = detector.detect('CPF: 123.456.789-09');
    expect(result.some(r => r.type === 'cpf')).toBe(true);
  });

  it('should detect credit card', () => {
    const result = detector.detect('Card: 4111 1111 1111 1111');
    expect(result.some(r => r.type === 'credit_card')).toBe(true);
  });

  it('should detect API key in api_key=value format', () => {
    const result = detector.detect('api_key=abc123def456ghi789jklmn');
    expect(result.some(r => r.type === 'api_key')).toBe(true);
  });

  it('should detect multiple PII in one string', () => {
    const result = detector.detect('Email: a@b.com, Phone: (11) 99999-8888');
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('should return empty for clean text', () => {
    const result = detector.detect('Hello world, this is clean text.');
    expect(result).toHaveLength(0);
  });
});
