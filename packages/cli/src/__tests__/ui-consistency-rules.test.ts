import { UIConsistencyValidator, UIConsistencyViolation, DEFAULT_CONSISTENCY_RULES } from '../runtime/ui-consistency-rules';

describe('UIConsistencyValidator', () => {
  let validator: UIConsistencyValidator;

  beforeEach(() => {
    validator = new UIConsistencyValidator();
  });

  it('should detect raw px spacing values', () => {
    const code = '.box { padding: 16px; margin: 8px; }';
    const result = validator.validate(code, 'test.css');
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.warnings).toBeGreaterThan(0);
  });

  it('should detect raw hex colors', () => {
    const code = '.btn { color: #2563eb; background: #fff; }';
    const result = validator.validate(code, 'test.css');
    const colorViolations = result.violations.filter(v => v.ruleId === 'color-raw-hex');
    expect(colorViolations.length).toBeGreaterThan(0);
  });

  it('should detect raw typography values', () => {
    const code = '.text { font-size: 16px; font-weight: 400; }';
    const result = validator.validate(code, 'test.css');
    const typoViolations = result.violations.filter(v => v.ruleId === 'typography-raw');
    expect(typoViolations.length).toBeGreaterThan(0);
  });

  it('should detect inline styles in JSX', () => {
    const code = 'const el = <div style={{ color: "red" }}>text</div>;';
    const result = validator.validate(code, 'Component.tsx');
    const inlineViolations = result.violations.filter(v => v.ruleId === 'inline-styles');
    expect(inlineViolations.length).toBeGreaterThan(0);
  });

  it('should detect missing alt text on images', () => {
    const code = 'const el = <img src="photo.jpg" />;';
    const result = validator.validate(code, 'Component.tsx');
    const altViolations = result.violations.filter(v => v.ruleId === 'a11y-img-alt');
    expect(altViolations.length).toBeGreaterThan(0);
  });

  it('should score 100 for clean code', () => {
    const code = 'const x = 42; export function add(a: number, b: number) { return a + b; }';
    const result = validator.validate(code, 'clean.ts');
    expect(result.score).toBe(100);
    expect(result.violations.length).toBe(0);
  });

  it('should penalize errors heavily in score', () => {
    const code = '<img src="x.jpg" /><input name="email" />';
    const result = validator.validate(code, 'bad.tsx');
    expect(result.errors).toBeGreaterThanOrEqual(2);
    expect(result.score).toBeLessThan(80);
  });

  it('should create custom validator with specific rules', () => {
    const singleRule = DEFAULT_CONSISTENCY_RULES.filter(r => r.id === 'inline-styles');
    const custom = new UIConsistencyValidator(singleRule);
    const code = '<div style={{color:"red"}} />';
    const result = custom.validate(code, 'test.tsx');
    expect(result.violations.length).toBe(1);
  });

  it('should report correct violation structure', () => {
    const code = '.x { padding: 10px; }';
    const result = validator.validate(code, 'test.css');
    if (result.violations.length > 0) {
      const v = result.violations[0];
      expect(v.ruleId).toBeDefined();
      expect(v.filePath).toBe('test.css');
      expect(v.line).toBeGreaterThan(0);
      expect(v.suggestion).toBeDefined();
    }
  });
});
