import { normalizeInput } from '../normalize';

describe('normalizeInput', () => {
  it('trims whitespace from strings', () => {
    const result = normalizeInput('  hello world  ');
    expect(result.normalized).toBe('hello world');
  });

  it('collapses multiple spaces in strings', () => {
    const result = normalizeInput('hello    world');
    expect(result.normalized).toBe('hello world');
  });

  it('filters null/undefined from arrays', () => {
    const result = normalizeInput([1, null, 2, undefined, 3]);
    expect(result.normalized).toEqual([1, 2, 3]);
  });

  it('detects NaN as anomaly', () => {
    const result = normalizeInput(NaN);
    expect(result.anomalies.length).toBeGreaterThanOrEqual(1);
    expect(result.anomalies.some(a => a.type === 'out_of_range')).toBe(true);
  });

  it('detects Infinity as anomaly', () => {
    const result = normalizeInput(Infinity);
    expect(result.anomalies.length).toBeGreaterThanOrEqual(1);
  });

  it('detects null root anomaly', () => {
    const result = normalizeInput(null);
    expect(result.anomalies.length).toBeGreaterThanOrEqual(1);
    expect(result.anomalies[0].type).toBe('null');
    expect(result.metadata.inputType).toBe('null');
  });

  it('detects empty array anomaly', () => {
    const result = normalizeInput([]);
    expect(result.anomalies.some(a => a.type === 'inconsistent')).toBe(true);
  });

  it('extracts features from objects', () => {
    const result = normalizeInput({ a: 1, b: 2, c: 'x' });
    const fc = result.features.find(f => f.name === 'field_count');
    expect(fc?.value).toBe(3);
  });

  it('extracts string features', () => {
    const result = normalizeInput('hello world');
    const wc = result.features.find(f => f.name === 'word_count');
    expect(wc?.value).toBe(2);
    const sl = result.features.find(f => f.name === 'string_length');
    expect(sl?.value).toBe(11);
  });

  it('extracts array numeric statistics', () => {
    const result = normalizeInput([1, 5, 10]);
    const nmin = result.features.find(f => f.name === 'numeric_min');
    const nmax = result.features.find(f => f.name === 'numeric_max');
    expect(nmin?.value).toBe(1);
    expect(nmax?.value).toBe(10);
  });

  it('returns schemaValid=false when schema validation fails', () => {
    const failingSchema = { validate: () => ({ success: false, error: 'Invalid' }) };
    const result = normalizeInput({ x: 1 }, failingSchema);
    expect(result.metadata.schemaValid).toBe(false);
    expect(result.anomalies.some(a => a.type === 'type_mismatch')).toBe(true);
  });

  it('returns schemaValid=true when schema validation passes', () => {
    const passingSchema = { validate: () => ({ success: true }) };
    const result = normalizeInput({ x: 1 }, passingSchema);
    expect(result.metadata.schemaValid).toBe(true);
  });

  it('sets recordCount for arrays', () => {
    const result = normalizeInput([1, 2, 3]);
    expect(result.metadata.recordCount).toBe(3);
  });

  it('sets recordCount to 1 for non-arrays', () => {
    const result = normalizeInput('hello');
    expect(result.metadata.recordCount).toBe(1);
  });

  it('deeply recurses into nested objects for anomalies', () => {
    const result = normalizeInput({ nested: { value: null } });
    expect(result.anomalies.some(a => a.field.includes('nested.value'))).toBe(true);
  });
});
