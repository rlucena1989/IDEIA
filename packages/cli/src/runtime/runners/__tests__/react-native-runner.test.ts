import { ReactNativeRunner } from '../react-native-runner';
import { LanguageId } from '../../adapter-contract';
import fs from 'node:fs';

jest.mock('../../adapter-contract', () => ({
  ...jest.requireActual('../../adapter-contract'),
  execCommand: jest.fn(),
}));

describe('ReactNativeRunner', () => {
  let runner: ReactNativeRunner;

  beforeEach(() => {
    runner = new ReactNativeRunner();
  });

  describe('configuration', () => {
    it('has correct language', () => {
      expect(runner.language).toBe(LanguageId.ReactNative);
    });

    it('has correct name', () => {
      expect(runner.name).toBe('React Native Runner');
    });

    it('has correct aliases', () => {
      expect(runner.aliases).toEqual(['react-native', 'rn', 'expo']);
    });

    it('has empty markers', () => {
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
      expect(runner['config'].commands.lint!.argv).toEqual(['npx', 'eslint', '.']);
      expect(runner['config'].commands.lint!.optional).toBe(true);
    });

    it('has test command (optional)', () => {
      expect(runner['config'].commands.test).toBeDefined();
      expect(runner['config'].commands.test!.optional).toBe(true);
    });

    it('has build command (optional)', () => {
      expect(runner['config'].commands.build).toBeDefined();
      expect(runner['config'].commands.build!.argv).toEqual(['npx', 'react-native', 'build-android']);
    });

    it('has quality-gate command (optional)', () => {
      expect(runner['config'].commands['quality-gate']).toBeDefined();
      expect(runner['config'].commands['quality-gate']!.argv).toEqual(['npx', 'tsc', '--noEmit']);
    });
  });

  describe('detect', () => {
    it('returns false with empty markers (no custom detect override)', () => {
      expect(runner.detect('/fake/project')).toBe(false);
    });
  });
});
