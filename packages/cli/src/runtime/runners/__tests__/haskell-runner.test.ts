import fs from 'node:fs';
import { HaskellRunner } from '../haskell-runner';
import { LanguageId, AdapterCommandId } from '../../adapter-contract';

jest.mock('../../adapter-contract', () => ({
  ...jest.requireActual('../../adapter-contract'),
  execCommand: jest.fn(),
}));

function mockDirent(name: string): any {
  return { name, isDirectory: () => false, isFile: () => true };
}

describe('HaskellRunner', () => {
  let runner: HaskellRunner;

  beforeEach(() => {
    runner = new HaskellRunner();
  });

  describe('configuration', () => {
    it('has correct language', () => {
      expect(runner.language).toBe(LanguageId.Haskell);
    });

    it('has correct name', () => {
      expect(runner.name).toBe('Haskell Runner');
    });

    it('has correct aliases', () => {
      expect(runner.aliases).toEqual(['haskell', 'hs']);
    });

    it('has correct markers', () => {
      expect((runner as any).config.markers).toEqual(['stack.yaml', '*.cabal', 'package.yaml']);
    });
  });

  describe('commands', () => {
    it('has init command with correct argv', () => {
      const cmds = runner.commands();
      const init = cmds.find(c => c.id === AdapterCommandId.Init);
      expect(init).toBeDefined();
      expect(init!.label).toBe('Build deps');
    });

    it('has lint command', () => {
      const cmds = runner.commands();
      const lint = cmds.find(c => c.id === AdapterCommandId.Lint);
      expect(lint).toBeDefined();
      expect(lint!.label).toBe('HLint');
    });

    it('has test command', () => {
      const cmds = runner.commands();
      const test = cmds.find(c => c.id === AdapterCommandId.Test);
      expect(test).toBeDefined();
      expect(test!.label).toBe('Test');
    });

    it('has build command', () => {
      const cmds = runner.commands();
      const build = cmds.find(c => c.id === AdapterCommandId.Build);
      expect(build).toBeDefined();
      expect(build!.label).toBe('Build');
    });

    it('has compile command', () => {
      const cmds = runner.commands();
      const compile = cmds.find(c => c.id === AdapterCommandId.Compile);
      expect(compile).toBeDefined();
      expect(compile!.label).toBe('Build (compile)');
    });

    it('has quality-gate command', () => {
      const cmds = runner.commands();
      const qg = cmds.find(c => c.id === AdapterCommandId.QualityGate);
      expect(qg).toBeDefined();
      expect(qg!.label).toBe('Quality gate');
    });

    it('has detect command', () => {
      const cmds = runner.commands();
      const detect = cmds.find(c => c.id === AdapterCommandId.Detect);
      expect(detect).toBeDefined();
      expect(detect!.label).toBe('Detect');
    });
  });

  describe('detect', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns true when stack.yaml exists', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([mockDirent('stack.yaml')]);
      expect(runner.detect('/some/dir')).toBe(true);
    });

    it('returns true when *.cabal file exists', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([mockDirent('my-package.cabal')]);
      expect(runner.detect('/some/dir')).toBe(true);
    });

    it('returns true when package.yaml exists', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([mockDirent('package.yaml')]);
      expect(runner.detect('/some/dir')).toBe(true);
    });

    it('returns false when no marker exists', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([mockDirent('other.txt')]);
      expect(runner.detect('/some/dir')).toBe(false);
    });
  });
});
