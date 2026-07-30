jest.mock('../../io');
const path = require('path');

const ADAPTER_NAMES = [
  'dart', 'elixir', 'fastapi', 'go', 'haskell', 'java', 'kotlin',
  'nestjs', 'php', 'ruby', 'scala', 'swift', 'zig',
];

describe('All 13 Adapters', () => {
  for (const name of ADAPTER_NAMES) {
    describe(`@ideia/adapter-${name}`, () => {
      let mod: any;
      let loaded = false;
      let error: string = '';

      beforeAll(() => {
        const rootDir = path.resolve(__dirname, '..', '..', '..', '..', '..');
        const adapterPath = path.join(rootDir, `adapter-${name}`, 'src', 'index.ts');
        try {
          mod = require(adapterPath);
          loaded = true;
        } catch (e: any) {
          error = e.message;
          loaded = false;
        }
      });

      it('should be loadable', () => {
        expect({ loaded, error }).toEqual({ loaded: true, error: '' });
      });

      if (!loaded) return;

      it(`should export name as "${name}"`, () => expect(mod.name).toBe(name));
      it('should export capabilities array', () => expect(Array.isArray(mod.capabilities)).toBe(true));
      it('should export detect function', () => expect(typeof mod.detect).toBe('function'));
      it('should export init function', () => expect(typeof mod.init).toBe('function'));
      it('should export generateTemplate function', () => expect(typeof mod.generateTemplate).toBe('function'));
      it('should export runLint function', () => expect(typeof mod.runLint).toBe('function'));
      it('should export runTests function', () => expect(typeof mod.runTests).toBe('function'));
      it('should export runBuild function', () => expect(typeof mod.runBuild).toBe('function'));
      it('should export qualityGate function', () => expect(typeof mod.qualityGate).toBe('function'));
    });
  }
});
