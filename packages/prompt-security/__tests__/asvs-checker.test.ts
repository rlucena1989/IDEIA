import { AsvsChecker, formatAsvsReport } from '../src/asvs-checker';
import { runAllV1Checks, checkV1_1_1, checkV1_1_2, checkV1_2_1, checkV1_4_1, checkV1_5_1, checkV1_6_1, checkV1_7_1, checkV1_8_1 } from '../src/asvs-v1-architecture';
import { runAllV2Checks, checkV2_1_1, checkV2_1_2, checkV2_5_1, checkV2_8_1, checkV2_10_1 } from '../src/asvs-v2-auth';
import { runAllV3Checks, checkV3_1_1 } from '../src/asvs-v3-session';
import { runAllV4Checks, checkV4_1_1, checkV4_1_2, checkV4_2_2, checkV4_3_3 } from '../src/asvs-v4-access-control';
import { runAllV5Checks, checkV5_1_1, checkV5_1_2, checkV5_3_1 } from '../src/asvs-v5-validation';
import { runAllV6Checks, checkV6_2_1, checkV6_2_2, checkV6_2_3 } from '../src/asvs-v6-crypto';
import { runAllV7Checks, checkV7_1_1, checkV7_1_2 } from '../src/asvs-v7-errors';
import { runAllV8Checks, checkV8_1_1, checkV8_3_1 } from '../src/asvs-v8-data';
import { runAllV9Checks, checkV9_1_1, checkV9_2_1 } from '../src/asvs-v9-comm';
import { runAllV10Checks, checkV10_1_1, checkV10_3_1 } from '../src/asvs-v10-malicious';
import { runAllV11Checks, checkV11_1_1 } from '../src/asvs-v11-logic';
import { runAllV12Checks, checkV12_1_1, checkV12_3_1 } from '../src/asvs-v12-files';
import { runAllV13Checks, checkV13_1_1, checkV13_1_2, checkV13_1_3, checkV13_2_1, checkV13_2_2, checkV13_3_1, checkV13_3_2, checkV13_4_1 } from '../src/asvs-v13-api';
import { ASVS_CATEGORIES } from '../src/asvs-types';

const TEST_ROOT = process.cwd();

describe('ASVS V2 — Authentication', () => {
  it('runAllV2Checks returns 12 checks', () => {
    const checks = runAllV2Checks(TEST_ROOT);
    expect(checks).toHaveLength(12);
  });

  it('each V2 check has required fields', () => {
    const checks = runAllV2Checks(TEST_ROOT);
    for (const c of checks) {
      expect(c.id).toBeDefined();
      expect(c.name).toBeDefined();
      expect(typeof c.passed).toBe('boolean');
      expect(typeof c.evidence).toBe('string');
    }
  });

  it('V2.1.1 validates authentication requirement', () => {
    const check = checkV2_1_1(TEST_ROOT);
    expect(check.id).toBe('2.1.1');
    expect(check.category).toBe('V2');
  });

  it('V2.1.2 validates password strength', () => {
    const check = checkV2_1_2(TEST_ROOT);
    expect(check.id).toBe('2.1.2');
  });

  it('V2.5.1 validates API key auth', () => {
    const check = checkV2_5_1(TEST_ROOT);
    expect(check.id).toBe('2.5.1');
  });

  it('V2.8.1 validates credential recovery', () => {
    const check = checkV2_8_1(TEST_ROOT);
    expect(check.id).toBe('2.8.1');
  });

  it('V2.10.1 validates MFA configuration', () => {
    const check = checkV2_10_1(TEST_ROOT);
    expect(check.id).toBe('2.10.1');
  });
});

describe('ASVS V5 — Validation/Sanitization', () => {
  it('runAllV5Checks returns 10 checks', () => {
    const checks = runAllV5Checks(TEST_ROOT);
    expect(checks).toHaveLength(10);
    expect(checks.every(c => c.category === 'V5')).toBe(true);
  });

  it('V5.1.1 validates input validation', () => {
    const check = checkV5_1_1(TEST_ROOT);
    expect(check.id).toBe('5.1.1');
  });

  it('V5.1.2 validates output encoding', () => {
    const check = checkV5_1_2(TEST_ROOT);
    expect(check.id).toBe('5.1.2');
  });

  it('V5.3.1 validates anti-automation', () => {
    const check = checkV5_3_1(TEST_ROOT);
    expect(check.id).toBe('5.3.1');
  });
});

describe('ASVS V6 — Storage Cryptography', () => {
  it('runAllV6Checks returns 9 checks', () => {
    const checks = runAllV6Checks(TEST_ROOT);
    expect(checks).toHaveLength(9);
    expect(checks.every(c => c.category === 'V6')).toBe(true);
  });

  it('V6.2.1 validates data-at-rest encryption', () => {
    const check = checkV6_2_1(TEST_ROOT);
    expect(check.id).toBe('6.2.1');
  });

  it('V6.2.2 validates modern algorithm', () => {
    const check = checkV6_2_2(TEST_ROOT);
    expect(check.id).toBe('6.2.2');
  });

  it('V6.2.3 validates key management', () => {
    const check = checkV6_2_3(TEST_ROOT);
    expect(check.id).toBe('6.2.3');
  });

  it('V6.2.2 should detect AES-256-GCM in crypto-utils', () => {
    const check = checkV6_2_2(TEST_ROOT);
    expect(check.passed).toBe(true);
    expect(check.evidence).toContain('AES-256-GCM');
  });
});

describe('ASVS V8 — Data Protection', () => {
  it('runAllV8Checks returns 8 checks', () => {
    const checks = runAllV8Checks(TEST_ROOT);
    expect(checks).toHaveLength(8);
    expect(checks.every(c => c.category === 'V8')).toBe(true);
  });

  it('V8.1.1 validates sensitive data classification', () => {
    const check = checkV8_1_1(TEST_ROOT);
    expect(check.id).toBe('8.1.1');
  });

  it('V8.3.1 validates encryption at rest', () => {
    const check = checkV8_3_1(TEST_ROOT);
    expect(check.id).toBe('8.3.1');
  });
});

describe('ASVS V9 — Communications', () => {
  it('runAllV9Checks returns 7 checks', () => {
    const checks = runAllV9Checks(TEST_ROOT);
    expect(checks).toHaveLength(7);
    expect(checks.every(c => c.category === 'V9')).toBe(true);
  });

  it('V9.1.1 validates TLS usage', () => {
    const check = checkV9_1_1(TEST_ROOT);
    expect(check.id).toBe('9.1.1');
  });

  it('V9.2.1 validates TLS 1.3 enforcement', () => {
    const check = checkV9_2_1(TEST_ROOT);
    expect(check.id).toBe('9.2.1');
  });

  it('V9.2.1 should detect TLS 1.3 in crypto-utils', () => {
    const check = checkV9_2_1(TEST_ROOT);
    expect(check.passed).toBe(true);
    expect(check.evidence).toContain('TLS 1.3');
  });
});

describe('ASVS V1 — Architecture', () => {
  it('runAllV1Checks returns 8 checks', () => {
    const checks = runAllV1Checks(TEST_ROOT);
    expect(checks).toHaveLength(8);
    expect(checks.every(c => c.category === 'V1')).toBe(true);
  });

  it('V1.1.1 validates SDLC', () => {
    const check = checkV1_1_1(TEST_ROOT);
    expect(check.id).toBe('1.1.1');
    expect(check.category).toBe('V1');
    expect(check.level).toBe(1);
  });

  it('V1.1.2 validates threat modeling', () => {
    const check = checkV1_1_2(TEST_ROOT);
    expect(check.id).toBe('1.1.2');
  });

  it('V1.8.1 validates component inventory', () => {
    const check = checkV1_8_1(TEST_ROOT);
    expect(check.id).toBe('1.8.1');
  });
});

describe('ASVS V3 — Session Management', () => {
  it('runAllV3Checks returns 7 checks', () => {
    const checks = runAllV3Checks(TEST_ROOT);
    expect(checks).toHaveLength(7);
    expect(checks.every(c => c.category === 'V3')).toBe(true);
  });

  it('V3.1.1 validates session management', () => {
    const check = checkV3_1_1(TEST_ROOT);
    expect(check.id).toBe('3.1.1');
    expect(check.level).toBe(1);
  });
});

describe('ASVS V4 — Access Control', () => {
  it('runAllV4Checks returns 8 checks', () => {
    const checks = runAllV4Checks(TEST_ROOT);
    expect(checks).toHaveLength(8);
    expect(checks.every(c => c.category === 'V4')).toBe(true);
  });

  it('V4.1.1 validates least privilege', () => {
    const check = checkV4_1_1(TEST_ROOT);
    expect(check.id).toBe('4.1.1');
    expect(check.level).toBe(1);
  });

  it('V4.2.2 validates RBAC', () => {
    const check = checkV4_2_2(TEST_ROOT);
    expect(check.id).toBe('4.2.2');
  });

  it('V4.3.3 validates API auth', () => {
    const check = checkV4_3_3(TEST_ROOT);
    expect(check.id).toBe('4.3.3');
  });
});

describe('ASVS V7 — Error Handling', () => {
  it('runAllV7Checks returns 7 checks', () => {
    const checks = runAllV7Checks(TEST_ROOT);
    expect(checks).toHaveLength(7);
    expect(checks.every(c => c.category === 'V7')).toBe(true);
  });

  it('V7.1.1 validates unhandled rejection', () => {
    const check = checkV7_1_1(TEST_ROOT);
    expect(check.id).toBe('7.1.1');
    expect(check.level).toBe(1);
  });

  it('V7.1.2 validates stack trace leakage', () => {
    const check = checkV7_1_2(TEST_ROOT);
    expect(check.id).toBe('7.1.2');
    expect(check.level).toBe(1);
  });
});

describe('ASVS V10 — Malicious Code', () => {
  it('runAllV10Checks returns 7 checks', () => {
    const checks = runAllV10Checks(TEST_ROOT);
    expect(checks).toHaveLength(7);
    expect(checks.every(c => c.category === 'V10')).toBe(true);
  });

  it('V10.1.1 validates code integrity', () => {
    const check = checkV10_1_1(TEST_ROOT);
    expect(check.id).toBe('10.1.1');
    expect(check.level).toBe(1);
  });

  it('V10.3.1 validates anti-tampering', () => {
    const check = checkV10_3_1(TEST_ROOT);
    expect(check.id).toBe('10.3.1');
    expect(check.level).toBe(1);
  });
});

describe('ASVS V11 — Business Logic', () => {
  it('runAllV11Checks returns 6 checks', () => {
    const checks = runAllV11Checks(TEST_ROOT);
    expect(checks).toHaveLength(6);
    expect(checks.every(c => c.category === 'V11')).toBe(true);
  });

  it('V11.1.1 validates business rules', () => {
    const check = checkV11_1_1(TEST_ROOT);
    expect(check.id).toBe('11.1.1');
    expect(check.level).toBe(1);
  });
});

describe('ASVS V12 — File Upload', () => {
  it('runAllV12Checks returns 7 checks', () => {
    const checks = runAllV12Checks(TEST_ROOT);
    expect(checks).toHaveLength(7);
    expect(checks.every(c => c.category === 'V12')).toBe(true);
  });

  it('V12.1.1 validates file upload validation', () => {
    const check = checkV12_1_1(TEST_ROOT);
    expect(check.id).toBe('12.1.1');
    expect(check.level).toBe(1);
  });

  it('V12.3.1 validates size limits', () => {
    const check = checkV12_3_1(TEST_ROOT);
    expect(check.id).toBe('12.3.1');
    expect(check.level).toBe(1);
  });
});

describe('ASVS V13 — API', () => {
  it('runAllV13Checks returns 8 checks', () => {
    const checks = runAllV13Checks(TEST_ROOT);
    expect(checks).toHaveLength(8);
    expect(checks.every(c => c.category === 'V13')).toBe(true);
  });

  it('V13.1.1 validates API auth', () => {
    const check = checkV13_1_1(TEST_ROOT);
    expect(check.id).toBe('13.1.1');
    expect(check.level).toBe(1);
  });

  it('V13.3.2 validates API rate limiting', () => {
    const check = checkV13_3_2(TEST_ROOT);
    expect(check.id).toBe('13.3.2');
    expect(check.level).toBe(1);
  });
});

describe('AsvsChecker — Integration', () => {
  it('runAll returns report with 13 categories', () => {
    const checker = new AsvsChecker(TEST_ROOT);
    const report = checker.runAll();
    expect(report.categories).toHaveLength(13);
    expect(report.l1Summary.total).toBeGreaterThan(0);
    expect(report.summary.total).toBeGreaterThan(0);
  });

  it('report has correct category names for all V1-V13', () => {
    const checker = new AsvsChecker(TEST_ROOT);
    const report = checker.runAll();
    const catNames = report.categories.map(c => c.category);
    expect(catNames).toContain('V1');
    expect(catNames).toContain('V2');
    expect(catNames).toContain('V3');
    expect(catNames).toContain('V4');
    expect(catNames).toContain('V5');
    expect(catNames).toContain('V6');
    expect(catNames).toContain('V7');
    expect(catNames).toContain('V8');
    expect(catNames).toContain('V9');
    expect(catNames).toContain('V10');
    expect(catNames).toContain('V11');
    expect(catNames).toContain('V12');
    expect(catNames).toContain('V13');
  });

  it('formatAsvsReport produces readable output with all categories', () => {
    const checker = new AsvsChecker(TEST_ROOT);
    const report = checker.runAll();
    const output = formatAsvsReport(report);
    expect(output).toContain('OWASP ASVS Compliance Report');
    expect(output).toContain('L1 Summary:');
    expect(output).toContain('V1');
    expect(output).toContain('V2');
    expect(output).toContain('V3');
    expect(output).toContain('V4');
    expect(output).toContain('V5');
    expect(output).toContain('V6');
    expect(output).toContain('V7');
    expect(output).toContain('V8');
    expect(output).toContain('V9');
    expect(output).toContain('V10');
    expect(output).toContain('V11');
    expect(output).toContain('V12');
    expect(output).toContain('V13');
  });

  it('ASVS_CATEGORIES contains all 13 categories', () => {
    expect(Object.keys(ASVS_CATEGORIES)).toHaveLength(13);
    expect(ASVS_CATEGORIES.V1).toBe('Architecture/Design/Threat Modeling');
    expect(ASVS_CATEGORIES.V2).toBe('Authentication');
    expect(ASVS_CATEGORIES.V3).toBe('Session Management');
    expect(ASVS_CATEGORIES.V4).toBe('Access Control');
    expect(ASVS_CATEGORIES.V5).toBe('Validation/Sanitization');
    expect(ASVS_CATEGORIES.V6).toBe('Storage Cryptography');
    expect(ASVS_CATEGORIES.V7).toBe('Error Handling');
    expect(ASVS_CATEGORIES.V8).toBe('Data Protection');
    expect(ASVS_CATEGORIES.V9).toBe('Communications');
    expect(ASVS_CATEGORIES.V10).toBe('Malicious Code');
    expect(ASVS_CATEGORIES.V11).toBe('Business Logic');
    expect(ASVS_CATEGORIES.V12).toBe('Secure File Upload');
    expect(ASVS_CATEGORIES.V13).toBe('API and Web Service');
  });
});
