import { AsvsChecker, formatAsvsReport } from '../src/asvs-checker';
import type { AsvsCategory } from '../src/asvs-types';

describe('ASVS Checker - All Categories', () => {
  const checker = new AsvsChecker(process.cwd());
  const report = checker.runAll();

  it('runs all 13 categories (V1-V13) without errors', () => {
    const categoryIds = report.categories.map(c => c.category).sort((a, b) => {
      const numA = parseInt(a.replace('V', ''), 10);
      const numB = parseInt(b.replace('V', ''), 10);
      return numA - numB;
    });
    expect(categoryIds).toEqual([
      'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7',
      'V8', 'V9', 'V10', 'V11', 'V12', 'V13',
    ]);
  });

  it('each category returns at least 5 checks', () => {
    for (const cat of report.categories) {
      expect(cat.total).toBeGreaterThanOrEqual(5);
    }
  });

  it('total checks >= 100', () => {
    expect(report.summary.total).toBeGreaterThanOrEqual(100);
  });

  it('L1, L2, L3 levels are properly reported', () => {
    expect(report.l1Summary.total).toBeGreaterThan(0);
    expect(report.l2Summary.total).toBeGreaterThan(0);
    expect(report.l3Summary.total).toBeGreaterThan(0);

    const allChecks = report.categories.flatMap(c => c.checks);
    const levels = new Set(allChecks.map(c => c.level));
    expect(levels.has(1)).toBe(true);
    expect(levels.has(2)).toBe(true);
    expect(levels.has(3)).toBe(true);
  });
});

describe('ASVS Checker - Per Category', () => {
  const checker = new AsvsChecker(process.cwd());

  it.each([
    ['V1', 'Architecture/Design/Threat Modeling'],
    ['V2', 'Authentication'],
    ['V3', 'Session Management'],
    ['V4', 'Access Control'],
    ['V5', 'Validation/Sanitization'],
    ['V6', 'Storage Cryptography'],
    ['V7', 'Error Handling'],
    ['V8', 'Data Protection'],
    ['V9', 'Communications'],
    ['V10', 'Malicious Code'],
    ['V11', 'Business Logic'],
    ['V12', 'Secure File Upload'],
    ['V13', 'API and Web Service'],
  ] as [AsvsCategory, string][])('category %s (%s) has the correct name', (cat, expectedName) => {
    const result = checker.runCategories([cat]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(expectedName);
  });
});

describe('ASVS Checker - Level Distribution', () => {
  const checker = new AsvsChecker(process.cwd());
  const report = checker.runAll();
  const allChecks = report.categories.flatMap(c => c.checks);

  it('each check has a valid level (1, 2, or 3)', () => {
    for (const check of allChecks) {
      expect([1, 2, 3]).toContain(check.level);
    }
  });

  it('each check has a non-empty id', () => {
    for (const check of allChecks) {
      expect(check.id).toBeTruthy();
    }
  });

  it('each check has a non-empty name', () => {
    for (const check of allChecks) {
      expect(check.name).toBeTruthy();
    }
  });

  it('each check has evidence string', () => {
    for (const check of allChecks) {
      expect(typeof check.evidence).toBe('string');
    }
  });
});

describe('ASVS Checker - formatAsvsReport', () => {
  const checker = new AsvsChecker(process.cwd());
  const report = checker.runAll();
  const formatted = formatAsvsReport(report);

  it('contains expected headers', () => {
    expect(formatted).toContain('OWASP ASVS Compliance Report');
    expect(formatted).toContain('L1 Summary');
    expect(formatted).toContain('L2 Summary');
    expect(formatted).toContain('L3 Summary');
    expect(formatted).toContain('Overall');
  });

  it('contains all 13 category IDs', () => {
    expect(formatted).toContain('V1');
    expect(formatted).toContain('V2');
    expect(formatted).toContain('V3');
    expect(formatted).toContain('V4');
    expect(formatted).toContain('V5');
    expect(formatted).toContain('V6');
    expect(formatted).toContain('V7');
    expect(formatted).toContain('V8');
    expect(formatted).toContain('V9');
    expect(formatted).toContain('V10');
    expect(formatted).toContain('V11');
    expect(formatted).toContain('V12');
    expect(formatted).toContain('V13');
  });
});

describe('ASVS Checker - Category Coverage', () => {
  const checker = new AsvsChecker(process.cwd());
  const report = checker.runAll();

  it('V1 Architecture has all 8 checks', () => {
    const cat = report.categories.find(c => c.category === 'V1')!;
    expect(cat.total).toBe(8);
  });

  it('V4 Access Control has all 8 checks', () => {
    const cat = report.categories.find(c => c.category === 'V4')!;
    expect(cat.total).toBe(8);
  });

  it('V13 API has all 8 checks', () => {
    const cat = report.categories.find(c => c.category === 'V13')!;
    expect(cat.total).toBe(8);
  });
});
