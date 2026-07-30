import { ReactRunner } from '../react-runner';
import { LanguageId } from '../../adapter-contract';
import fs from 'node:fs';

jest.mock('../../adapter-contract', () => ({
  ...jest.requireActual('../../adapter-contract'),
  execCommand: jest.fn(),
}));

describe('ReactRunner', () => {
  let runner: ReactRunner;

  beforeEach(() => {
    runner = new ReactRunner();
  });

  describe('configuration', () => {
    it('has correct language', () => {
      expect(runner.language).toBe(LanguageId.React);
    });

    it('has correct name', () => {
      expect(runner.name).toBe('React Runner');
    });

    it('has correct aliases', () => {
      expect(runner.aliases).toEqual(['react', 'reactjs', 'next', 'nextjs', 'remix', 'gatsby']);
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

    it('has quality-gate command (optional)', () => {
      expect(runner['config'].commands['quality-gate']).toBeDefined();
      expect(runner['config'].commands['quality-gate']!.argv).toEqual(['npx', 'tsc', '--noEmit']);
    });
  });

  describe('detect', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns true when react is in dependencies', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        dependencies: { react: '^18.0.0' },
        devDependencies: {},
      }));
      expect(runner.detect('/fake/project')).toBe(true);
    });

    it('returns true when react is in devDependencies', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        dependencies: {},
        devDependencies: { react: '^18.0.0' },
      }));
      expect(runner.detect('/fake/project')).toBe(true);
    });

    it('returns false when react is not in dependencies', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        dependencies: { vue: '^3.0.0' },
        devDependencies: {},
      }));
      expect(runner.detect('/fake/project')).toBe(false);
    });

    it('returns false when package.json is malformed', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue('not valid json');
      expect(runner.detect('/fake/project')).toBe(false);
    });

    it('falls back to super.detect when package.json does not exist', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const baseDetect = jest.spyOn(ReactRunner.prototype, 'detect');
      runner.detect('/fake/project');
      baseDetect.mockRestore();
    });
  });
});
