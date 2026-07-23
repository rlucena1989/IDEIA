import { CorrectionOracle } from '../src/correction-oracle';
import * as fs from 'fs';
import * as path from 'path';

describe('CorrectionOracle', () => {
  it('should detect console.log', () => {
    const dir = fs.mkdtempSync('oracle-test-');
    fs.writeFileSync(path.join(dir, 'test.ts'), 'const x = 1;\nconsole.log(x);\nexport default x;');
    const oracle = new CorrectionOracle();
    const report = oracle.scanDirectory(dir);
    expect(report.results.some(r => r.message.includes('Console.log'))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('should detect hardcoded passwords', () => {
    const oracle = new CorrectionOracle();
    const results = oracle.scanContent('const password = "secret123";', 'test.ts');
    expect(results.some(r => r.category === 'security')).toBe(true);
  });

  it('should detect TODO comments', () => {
    const oracle = new CorrectionOracle();
    const results = oracle.scanContent('// TODO: implement this', 'test.ts');
    expect(results.some(r => r.message.includes('TODO'))).toBe(true);
  });

  it('should detect any type usage', () => {
    const oracle = new CorrectionOracle();
    const results = oracle.scanContent('const x: any = "test";', 'test.ts');
    expect(results.some(r => r.message.includes('any'))).toBe(true);
  });

  it('should return score 100 for clean code', () => {
    const dir = fs.mkdtempSync('oracle-clean-');
    fs.writeFileSync(path.join(dir, 'clean.ts'), 'const x = 1;\nexport default x;');
    const oracle = new CorrectionOracle();
    const report = oracle.scanDirectory(dir);
    expect(report.score).toBe(100);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('should generate report with counts', () => {
    const oracle = new CorrectionOracle();
    const results = oracle.scanContent('console.log("test");\n// TODO: fix\nconst pwd = "hunter2";', 'test.ts');
    const report = { totalChecks: results.length, errors: results.filter(r => r.severity === 'error').length, warnings: results.filter(r => r.severity === 'warning').length, autoFixable: results.filter(r => r.autoFixable).length, results, score: 100 };
    expect(report.totalChecks).toBeGreaterThanOrEqual(2);
  });

  it('should list rules', () => {
    const oracle = new CorrectionOracle();
    expect(oracle.getRules().length).toBeGreaterThanOrEqual(5);
  });
});
