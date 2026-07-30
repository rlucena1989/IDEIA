import { FlutterRunner } from '../flutter-runner';
import { LanguageId } from '../../adapter-contract';
import fs from 'node:fs';

jest.mock('../../adapter-contract', () => ({
  ...jest.requireActual('../../adapter-contract'),
  execCommand: jest.fn(),
}));

describe('FlutterRunner', () => {
  let runner: FlutterRunner;

  beforeEach(() => {
    runner = new FlutterRunner();
  });

  describe('configuration', () => {
    it('has correct language', () => {
      expect(runner.language).toBe(LanguageId.Flutter);
    });

    it('has correct name', () => {
      expect(runner.name).toBe('Flutter Runner');
    });

    it('has correct aliases', () => {
      expect(runner.aliases).toEqual(['flutter', 'dart']);
    });

    it('has pubspec.yaml as marker', () => {
      expect(runner['config'].markers).toEqual(['pubspec.yaml']);
    });
  });

  describe('commands', () => {
    it('has init command', () => {
      expect(runner['config'].commands.init).toBeDefined();
      expect(runner['config'].commands.init!.argv).toEqual(['flutter', 'pub', 'get']);
    });

    it('has lint command', () => {
      expect(runner['config'].commands.lint).toBeDefined();
      expect(runner['config'].commands.lint!.argv).toEqual(['flutter', 'analyze']);
    });

    it('has test command', () => {
      expect(runner['config'].commands.test).toBeDefined();
      expect(runner['config'].commands.test!.argv).toEqual(['flutter', 'test']);
    });

    it('has build command (optional)', () => {
      expect(runner['config'].commands.build).toBeDefined();
      expect(runner['config'].commands.build!.argv).toEqual(['flutter', 'build', 'apk']);
      expect(runner['config'].commands.build!.optional).toBe(true);
    });

    it('has compile command (optional)', () => {
      expect(runner['config'].commands.compile).toBeDefined();
      expect(runner['config'].commands.compile!.argv).toEqual(['dart', 'compile', 'exe']);
      expect(runner['config'].commands.compile!.optional).toBe(true);
    });

    it('has quality-gate command', () => {
      expect(runner['config'].commands['quality-gate']).toBeDefined();
      expect(runner['config'].commands['quality-gate']!.argv).toEqual(['flutter', 'analyze', '--fatal-infos']);
    });
  });

  describe('detect', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns true when pubspec.yaml exists in cwd', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'pubspec.yaml', isDirectory: () => false } as any,
      ]);
      expect(runner.detect('/fake/project')).toBe(true);
    });

    it('returns true when pubspec.yaml exists in subdirectory', () => {
      const mockDirEntry = (name: string, isDir: boolean) =>
        ({ name, isDirectory: () => isDir } as any);

      jest.spyOn(fs, 'readdirSync')
        .mockReturnValueOnce([mockDirEntry('subdir', true)])
        .mockReturnValueOnce([mockDirEntry('pubspec.yaml', false)]);

      expect(runner.detect('/fake/project')).toBe(true);
    });

    it('returns false when pubspec.yaml does not exist', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'main.dart', isDirectory: () => false } as any,
      ]);
      expect(runner.detect('/fake/project')).toBe(false);
    });

    it('returns false on readdir error', () => {
      jest.spyOn(fs, 'readdirSync').mockImplementation(() => { throw new Error('ENOENT'); });
      expect(runner.detect('/fake/project')).toBe(false);
    });
  });
});
