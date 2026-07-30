import { getCliVersion } from '../version';

describe('version', () => {
  describe('getCliVersion', () => {
    it('should return a string', () => {
      const version = getCliVersion();
      expect(typeof version).toBe('string');
    });

    it('should return a valid semver string', () => {
      expect(getCliVersion()).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should return 1.0.0 as fallback when package.json is missing', () => {
      jest.isolateModules(() => {
        jest.doMock('node:fs', () => ({
          existsSync: () => false,
          readFileSync: () => '{}',
        }));
        const { getCliVersion: gcv } = require('../version');
        expect(gcv()).toBe('1.0.0');
      });
    });
  });
});
