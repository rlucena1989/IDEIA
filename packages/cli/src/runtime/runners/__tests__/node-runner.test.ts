import { NodeRunner } from '../node-runner';
import { LanguageId } from '../../adapter-contract';
import fs from 'node:fs';

jest.mock('../../adapter-contract', () => ({
  ...jest.requireActual('../../adapter-contract'),
  execCommand: jest.fn(),
}));

describe('NodeRunner', () => {
  let runner: NodeRunner;

  beforeEach(() => {
    runner = new NodeRunner();
  });

  describe('configuration', () => {
    it('has correct language', () => {
      expect(runner.language).toBe(LanguageId.Node);
    });

    it('has correct name', () => {
      expect(runner.name).toBe('Node Runner');
    });

    it('has correct aliases', () => {
      expect(runner.aliases).toEqual(['node', 'js', 'javascript', 'ts', 'typescript', 'npm']);
    });

    it('has correct markers', () => {
      expect((runner as any).config.markers).toEqual(['package.json', 'tsconfig.json']);
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
      expect(ids).toContain('compile');
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

    it('compile command is optional', () => {
      const cmds = runner.commands();
      const compile = cmds.find(c => c.id === 'compile');
      expect(compile).toBeDefined();
    });

    it('quality-gate command is optional', () => {
      const cmds = runner.commands();
      const qg = cmds.find(c => c.id === 'quality-gate');
      expect(qg).toBeDefined();
    });
  });

  describe('detection', () => {
    it('detects when package.json exists', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'package.json', isFile: () => true, isDirectory: () => false } as any,
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
