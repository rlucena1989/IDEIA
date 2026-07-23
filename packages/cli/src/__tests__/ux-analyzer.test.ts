import { analyzeUX } from '../runtime/ux-analyzer';

describe('ux-analyzer', () => {
  it('should detect missing alt text', () => {
    const code = '<img src="photo.jpg" />';
    const report = analyzeUX(code, 'test.tsx');
    const altFindings = report.findings.filter(f => f.category === 'accessibility');
    expect(altFindings.length).toBeGreaterThan(0);
    expect(report.errors).toBeGreaterThan(0);
  });

  it('should detect inline styles', () => {
    const code = '<div style={{ color: "red" }}>text</div>';
    const report = analyzeUX(code, 'test.tsx');
    const styleFindings = report.findings.filter(f => f.issue.includes('inline'));
    expect(styleFindings.length).toBeGreaterThan(0);
  });

  it('should score clean code highly', () => {
    const code = 'const x = 42; function add(a, b) { return a + b; }';
    const report = analyzeUX(code, 'clean.ts');
    expect(report.score).toBe(100);
    expect(report.errors).toBe(0);
  });

  it('should provide summary', () => {
    const code = '<img src="x.jpg" /><div style={{color:"red"}} />';
    const report = analyzeUX(code, 'test.tsx');
    expect(report.summary).toContain('UX Score');
  });
});
