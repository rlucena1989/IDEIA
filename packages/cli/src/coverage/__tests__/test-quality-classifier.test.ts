import { classifyTestGap, isCosmetic, isCriticalCoverage } from '../test-quality-classifier';
import type { CoverageGap } from '../types';

function makeGap(
  reason: string,
  impact: string,
  recommendation: string,
): CoverageGap {
  return {
    id: 'g1',
    file: 'src/core/test.ts',
    module: 'core',
    severity: 'optional',
    reason,
    impact,
    recommendation,
  };
}

describe('classifyTestGap', () => {
  describe('critical severity', () => {
    it('classifies gaps mentioning auth', () => {
      expect(classifyTestGap(makeGap('auth missing', 'security risk', 'add auth tests'))).toBe('critical');
    });

    it('classifies gaps mentioning execução crítica', () => {
      expect(classifyTestGap(makeGap('execução crítica sem teste', 'system may crash', 'add coverage'))).toBe('critical');
    });

    it('classifies gaps mentioning data loss', () => {
      expect(classifyTestGap(makeGap('data loss risk', 'user data at risk', 'add tests'))).toBe('critical');
    });

    it('classifies as critical when auth appears in recommendation', () => {
      expect(classifyTestGap(makeGap('missing coverage', 'high risk', 'implement auth tests'))).toBe('critical');
    });

    it('classifies as critical when auth appears in impact', () => {
      expect(classifyTestGap(makeGap('low coverage', 'auth bypass possible', 'add tests'))).toBe('critical');
    });
  });

  describe('important severity', () => {
    it('classifies gaps mentioning core', () => {
      expect(classifyTestGap(makeGap('core logic untested', 'regression risk', 'add coverage'))).toBe('important');
    });

    it('classifies gaps mentioning regression', () => {
      expect(classifyTestGap(makeGap('regression risk', 'breaks existing features', 'add regression tests'))).toBe('important');
    });

    it('classifies gaps mentioning command', () => {
      expect(classifyTestGap(makeGap('command handler missing tests', 'CLI may break', 'add command tests'))).toBe('important');
    });
  });

  describe('cosmetic severity', () => {
    it('classifies gaps mentioning nice to have', () => {
      expect(classifyTestGap(makeGap('nice to have', 'minor improvement', 'add if time permits'))).toBe('cosmetic');
    });

    it('classifies gaps mentioning visual', () => {
      expect(classifyTestGap(makeGap('visual inconsistency', 'UI polish', 'add visual tests'))).toBe('cosmetic');
    });

    it('classifies as cosmetic when visual appears in impact', () => {
      expect(classifyTestGap(makeGap('missing test', 'visual glitch on edge case', 'add test'))).toBe('cosmetic');
    });
  });

  describe('optional severity (default)', () => {
    it('returns optional for unmatched content', () => {
      expect(classifyTestGap(makeGap('random reason', 'some impact', 'some recommendation'))).toBe('optional');
    });

    it('handles empty strings', () => {
      expect(classifyTestGap(makeGap('', '', ''))).toBe('optional');
    });

    it('handles single character strings', () => {
      expect(classifyTestGap(makeGap('a', 'b', 'c'))).toBe('optional');
    });
  });

  describe('keyword prioritization', () => {
    it('critical takes priority over important when both match', () => {
      const gap = makeGap('auth core regression', 'data loss risk', 'add tests');
      expect(classifyTestGap(gap)).toBe('critical');
    });

    it('critical takes priority over cosmetic when both match', () => {
      const gap = makeGap('auth is nice to have', 'visual and secure', 'add auth tests');
      expect(classifyTestGap(gap)).toBe('critical');
    });

    it('important takes priority over cosmetic when both match', () => {
      const gap = makeGap('core is nice to have', 'regression visual', 'add command tests');
      expect(classifyTestGap(gap)).toBe('important');
    });
  });

  describe('case insensitivity', () => {
    it('handles uppercase AUTH', () => {
      expect(classifyTestGap(makeGap('AUTH missing', 'SECURITY', 'fix'))).toBe('critical');
    });
    it('handles mixed case', () => {
      expect(classifyTestGap(makeGap('Data Loss risk', 'Critical', 'mitigate'))).toBe('critical');
    });
    it('handles uppercase CORE', () => {
      expect(classifyTestGap(makeGap('CORE logic', 'regression', 'fix'))).toBe('important');
    });
  });
});

describe('isCosmetic', () => {
  it('returns true for cosmetic gaps', () => {
    expect(isCosmetic(makeGap('nice to have', 'visual polish', 'add if time'))).toBe(true);
  });

  it('returns false for critical gaps', () => {
    expect(isCosmetic(makeGap('auth breach', 'data loss', 'fix now'))).toBe(false);
  });

  it('returns false for important gaps', () => {
    expect(isCosmetic(makeGap('core logic', 'regression risk', 'add tests'))).toBe(false);
  });

  it('returns false for optional gaps', () => {
    expect(isCosmetic(makeGap('random', 'minor', 'fix later'))).toBe(false);
  });
});

describe('isCriticalCoverage', () => {
  it('returns true for critical gaps', () => {
    expect(isCriticalCoverage(makeGap('auth missing', 'data loss', 'add tests'))).toBe(true);
  });

  it('returns false for important gaps', () => {
    expect(isCriticalCoverage(makeGap('core logic', 'regression risk', 'add tests'))).toBe(false);
  });

  it('returns false for cosmetic gaps', () => {
    expect(isCriticalCoverage(makeGap('nice to have', 'visual bug', 'fix later'))).toBe(false);
  });

  it('returns false for optional gaps', () => {
    expect(isCriticalCoverage(makeGap('random', 'minor', 'fix later'))).toBe(false);
  });
});
