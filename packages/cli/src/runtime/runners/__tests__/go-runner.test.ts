import { GoRunner } from '../go-runner';
import { LanguageId } from '../../adapter-contract';
import fs from 'node:fs';

jest.mock('../../adapter-contract', () => ({
  ...jest.requireActual('../../adapter-contract'),
  execCommand: jest.fn(),
}));

describe('GoRunner', () => {
  let runner: GoRunner;

  beforeEach(() => {
    runner = new GoRunner();
  });

  describe('configuration', () => {
    it('has correct language', () => {
      expect(runner.language).toBe(LanguageId.Go);
    });

    it('has correct name', () => {
      expect(runner.name).toBe('Go Runner');
    });

    it('has correct aliases', () => {
      expect(runner.aliases).toEqual(['go', 'golang']);
    });

    it('has correct markers', () => {
      expect((runner as any).config.markers).toEqual(['go.mod']);
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

    it('has mandatory commands', () => {
      const cmds = runner.commands();
      expect(cmds.find(c => c.id === 'init')).toBeDefined();
      expect(cmds.find(c => c.id === 'lint')).toBeDefined();
      expect(cmds.find(c => c.id === 'test')).toBeDefined();
      expect(cmds.find(c => c.id === 'build')).toBeDefined();
      expect(cmds.find(c => c.id === 'compile')).toBeDefined();
      expect(cmds.find(c => c.id === 'quality-gate')).toBeDefined();
    });

    it('init uses go mod download', () => {
      const cmds = runner.commands();
      const init = cmds.find(c => c.id === 'init');
      expect(init).toBeDefined();
    });

    it('lint uses go vet', () => {
      const cmds = runner.commands();
      const lint = cmds.find(c => c.id === 'lint');
      expect(lint).toBeDefined();
    });

    it('test uses go test', () => {
      const cmds = runner.commands();
      const test = cmds.find(c => c.id === 'test');
      expect(test).toBeDefined();
    });

    it('build uses go build', () => {
      const cmds = runner.commands();
      const build = cmds.find(c => c.id === 'build');
      expect(build).toBeDefined();
    });

    it('compile uses go build -o bin/app', () => {
      const cmds = runner.commands();
      const compile = cmds.find(c => c.id === 'compile');
      expect(compile).toBeDefined();
    });

    it('quality-gate uses go vet', () => {
      const cmds = runner.commands();
      const qg = cmds.find(c => c.id === 'quality-gate');
      expect(qg).toBeDefined();
    });
  });

  describe('detection', () => {
    it('detects when go.mod exists', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'go.mod', isFile: () => true, isDirectory: () => false } as any,
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
