import fs from 'node:fs';
import { ElixirRunner } from '../elixir-runner';
import { LanguageId, AdapterCommandId } from '../../adapter-contract';

jest.mock('../../adapter-contract', () => ({
  ...jest.requireActual('../../adapter-contract'),
  execCommand: jest.fn(),
}));

function mockDirent(name: string): any {
  return { name, isDirectory: () => false, isFile: () => true };
}

describe('ElixirRunner', () => {
  let runner: ElixirRunner;

  beforeEach(() => {
    runner = new ElixirRunner();
  });

  describe('configuration', () => {
    it('has correct language', () => {
      expect(runner.language).toBe(LanguageId.Elixir);
    });

    it('has correct name', () => {
      expect(runner.name).toBe('Elixir Runner');
    });

    it('has correct aliases', () => {
      expect(runner.aliases).toEqual(['elixir', 'ex']);
    });

    it('has correct markers', () => {
      expect((runner as any).config.markers).toEqual(['mix.exs']);
    });
  });

  describe('commands', () => {
    it('has init command with correct argv', () => {
      const cmds = runner.commands();
      const init = cmds.find(c => c.id === AdapterCommandId.Init);
      expect(init).toBeDefined();
      expect(init!.label).toBe('Get deps');
    });

    it('has lint command', () => {
      const cmds = runner.commands();
      const lint = cmds.find(c => c.id === AdapterCommandId.Lint);
      expect(lint).toBeDefined();
      expect(lint!.label).toBe('Format check');
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
      expect(build!.label).toBe('Compile');
    });

    it('has compile command', () => {
      const cmds = runner.commands();
      const compile = cmds.find(c => c.id === AdapterCommandId.Compile);
      expect(compile).toBeDefined();
      expect(compile!.label).toBe('Strict compile');
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

    it('returns true when marker exists', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([mockDirent('mix.exs')]);
      expect(runner.detect('/some/dir')).toBe(true);
    });

    it('returns false when marker does not exist', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([mockDirent('other.txt')]);
      expect(runner.detect('/some/dir')).toBe(false);
    });
  });
});
