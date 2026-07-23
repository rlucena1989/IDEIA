import { A11yScanner } from '../src/a11y-scanner';
import * as fs from 'fs';
import * as path from 'path';

describe('A11yScanner', () => {
  it('should detect missing alt text', () => {
    const scanner = new A11yScanner();
    const dir = fs.mkdtempSync('a11y-test-');
    fs.writeFileSync(path.join(dir, 'test.tsx'), '<img src="photo.jpg" />');
    const report = scanner.scanDirectory(dir);
    expect(report.violations.some(v => v.ruleId === 'img-alt')).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('should detect missing input labels', () => {
    const scanner = new A11yScanner();
    const dir = fs.mkdtempSync('a11y-test-');
    fs.writeFileSync(path.join(dir, 'form.tsx'), '<input type="text" />');
    const report = scanner.scanDirectory(dir);
    expect(report.violations.some(v => v.ruleId === 'input-label')).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('should detect keyboard navigation issues', () => {
    const scanner = new A11yScanner();
    const dir = fs.mkdtempSync('a11y-test-');
    fs.writeFileSync(path.join(dir, 'button.tsx'), '<div onClick={() => {}}>Click</div>');
    const report = scanner.scanDirectory(dir);
    expect(report.violations.some(v => v.ruleId === 'keyboard-nav')).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('should detect empty links', () => {
    const scanner = new A11yScanner();
    const violations = scanner.scanContent('<a href="/test"></a>', 'test.tsx');
    expect(violations.some(v => v.ruleId === 'link-text')).toBe(true);
  });

  it('should detect missing lang attribute', () => {
    const scanner = new A11yScanner();
    const violations = scanner.scanContent('<html><head></head></html>', 'index.html');
    expect(violations.some(v => v.ruleId === 'lang-attr')).toBe(true);
  });

  it('should return score 100 for clean code', () => {
    const scanner = new A11yScanner();
    const dir = fs.mkdtempSync('a11y-test-');
    fs.writeFileSync(path.join(dir, 'clean.tsx'), '<img src="photo.jpg" alt="Photo" /><input aria-label="Name" />');
    const report = scanner.scanDirectory(dir);
    expect(report.score).toBeGreaterThanOrEqual(90);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('should list all WCAG rules', () => {
    const scanner = new A11yScanner();
    expect(scanner.getRules().length).toBeGreaterThan(10);
    expect(scanner.getRules().some(r => r.category === 'perceivable')).toBe(true);
  });

  it('should build report with categories', () => {
    const scanner = new A11yScanner();
    const dir = fs.mkdtempSync('a11y-test-');
    fs.writeFileSync(path.join(dir, 'test.tsx'), '<img src="x" /><input /><div onClick={()=>{}} />');
    const report = scanner.scanDirectory(dir);
    expect(report.totalViolations).toBeGreaterThan(0);
    expect(report.bySeverity).toBeDefined();
    expect(report.byWCAGLevel).toBeDefined();
    expect(report.byCategory).toBeDefined();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
