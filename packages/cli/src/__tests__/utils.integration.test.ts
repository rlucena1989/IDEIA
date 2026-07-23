import { checkPrerequisites } from '../utils/prerequisites';
import { getCliVersion } from '../utils/version';
import { findTemplateAiDir } from '../utils/template';

describe('checkPrerequisites', () => {
  it('does not throw when node >= 18', () => {
    expect(() => checkPrerequisites('/any')).not.toThrow();
  });
});

describe('getCliVersion', () => {
  it('returns a version string', () => {
    const v = getCliVersion();
    expect(typeof v).toBe('string');
    expect(v).toMatch(/\d+\.\d+\.\d+/);
  });
});

describe('findTemplateAiDir', () => {
  it('returns a template path', () => {
    const dir = findTemplateAiDir();
    expect(typeof dir).toBe('string');
  });
});
