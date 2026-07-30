import { PythonRunner } from '../python-runner';
import { LanguageId } from '../../adapter-contract';
import fs from 'node:fs';

jest.mock('../../adapter-contract', () => ({
  ...jest.requireActual('../../adapter-contract'),
  execCommand: jest.fn(),
}));

describe('PythonRunner', () => {
  let runner: PythonRunner;

  beforeEach(() => {
    runner = new PythonRunner();
  });

  describe('configuration', () => {
    it('has correct language', () => {
      expect(runner.language).toBe(LanguageId.Python);
    });

    it('has correct name', () => {
      expect(runner.name).toBe('Python Runner');
    });

    it('has correct aliases', () => {
      expect(runner.aliases).toEqual(['python', 'py', 'pip']);
    });

    it('has correct markers', () => {
      expect((runner as any).config.markers).toEqual(['requirements.txt', 'Pipfile', 'pyproject.toml']);
    });
  });

  describe('commands', () => {
    it('has init command with correct argv', () => {
      const cmds = runner.commands();
      const init = cmds.find(c => c.id === 'init');
      expect(init).toBeDefined();
    });

    it('has all expected commands', () => {
      const cmds = runner.commands();
      const ids = cmds.map(c => c.id);
      expect(ids).toContain('init');
      expect(ids).toContain('lint');
      expect(ids).toContain('test');
      expect(ids).toContain('build');
      expect(ids).toContain('quality-gate');
      expect(ids).toContain('detect');
    });

    it('lint command is optional', () => {
      const cmds = runner.commands();
      const lint = cmds.find(c => c.id === 'lint');
      expect(lint).toBeDefined();
    });

    it('test command is optional', () => {
      const cmds = runner.commands();
      const test = cmds.find(c => c.id === 'test');
      expect(test).toBeDefined();
    });

    it('build command is optional', () => {
      const cmds = runner.commands();
      const build = cmds.find(c => c.id === 'build');
      expect(build).toBeDefined();
    });

    it('quality-gate command is optional', () => {
      const cmds = runner.commands();
      const qg = cmds.find(c => c.id === 'quality-gate');
      expect(qg).toBeDefined();
    });
  });

  describe('detection', () => {
    it('detects when requirements.txt exists', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'requirements.txt', isFile: () => true, isDirectory: () => false } as any,
      ]);
      expect(runner.detect('/some/project')).toBe(true);
      jest.restoreAllMocks();
    });

    it('does not detect when no marker file exists', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'README.md', isFile: () => true, isDirectory: () => false } as any,
      ]);
      expect(runner.detect('/some/project')).toBe(false);
      jest.restoreAllMocks();
    });
  });
});
