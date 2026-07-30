import { VueRunner } from '../vue-runner';
import { LanguageId } from '../../adapter-contract';
import fs from 'node:fs';

jest.mock('../../adapter-contract', () => ({
  ...jest.requireActual('../../adapter-contract'),
  execCommand: jest.fn(),
}));

describe('VueRunner', () => {
  let runner: VueRunner;

  beforeEach(() => {
    runner = new VueRunner();
  });

  describe('configuration', () => {
    it('has correct language', () => {
      expect(runner.language).toBe(LanguageId.Vue);
    });

    it('has correct name', () => {
      expect(runner.name).toBe('Vue Runner');
    });

    it('has correct aliases', () => {
      expect(runner.aliases).toEqual(['vue', 'vuejs', 'nuxt']);
    });

    it('has empty markers (custom detect)', () => {
      expect(runner['config'].markers).toEqual([]);
    });
  });

  describe('commands', () => {
    it('has init command', () => {
      expect(runner['config'].commands.init).toBeDefined();
      expect(runner['config'].commands.init!.argv).toEqual(['npm', 'install']);
    });

    it('has lint command (optional)', () => {
      expect(runner['config'].commands.lint).toBeDefined();
      expect(runner['config'].commands.lint!.optional).toBe(true);
    });

    it('has test command (optional)', () => {
      expect(runner['config'].commands.test).toBeDefined();
      expect(runner['config'].commands.test!.optional).toBe(true);
    });

    it('has build command (optional)', () => {
      expect(runner['config'].commands.build).toBeDefined();
      expect(runner['config'].commands.build!.optional).toBe(true);
    });

    it('has quality-gate command', () => {
      expect(runner['config'].commands['quality-gate']).toBeDefined();
      expect(runner['config'].commands['quality-gate']!.argv).toEqual(['npx', 'vue-tsc', '--noEmit']);
    });
  });

  describe('detect', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns true when vue is in dependencies', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        dependencies: { vue: '^3.0.0' },
        devDependencies: {},
      }));
      expect(runner.detect('/fake/project')).toBe(true);
    });

    it('returns true when vue is in devDependencies', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        dependencies: {},
        devDependencies: { vue: '^3.0.0' },
      }));
      expect(runner.detect('/fake/project')).toBe(true);
    });

    it('returns false when vue is not in package.json dependencies', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        dependencies: { react: '^18.0.0' },
        devDependencies: {},
      }));
      jest.spyOn(fs, 'readdirSync').mockReturnValue([] as any);
      expect(runner.detect('/fake/project')).toBe(false);
    });

    it('returns false when package.json exists but is malformed', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue('not valid json');
      jest.spyOn(fs, 'readdirSync').mockReturnValue([] as any);
      expect(runner.detect('/fake/project')).toBe(false);
    });

    it('returns true when .vue files exist even without package.json', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      jest.spyOn(fs, 'readdirSync').mockReturnValue(['App.vue', 'index.ts'] as any);
      expect(runner.detect('/fake/project')).toBe(true);
    });

    it('returns false when package.json has no vue and no .vue files', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        dependencies: {},
        devDependencies: {},
      }));
      jest.spyOn(fs, 'readdirSync').mockReturnValue(['index.ts', 'main.ts'] as any);
      expect(runner.detect('/fake/project')).toBe(false);
    });

    it('handles readdirSync error gracefully', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      jest.spyOn(fs, 'readdirSync').mockImplementation(() => { throw new Error('permission denied'); });
      expect(runner.detect('/fake/project')).toBe(false);
    });
  });
});
