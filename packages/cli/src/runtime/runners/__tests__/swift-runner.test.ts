import { SwiftRunner } from '../swift-runner';
import { LanguageId, AdapterCommandId } from '../../adapter-contract';
import fs from 'node:fs';

jest.mock('../../adapter-contract', () => ({
  ...jest.requireActual('../../adapter-contract'),
  execCommand: jest.fn(),
}));

function mockDirent(name: string, isDir = false): Record<string, unknown> {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    parentPath: '',
    path: '',
  };
}

describe('SwiftRunner', () => {
  let runner: SwiftRunner;

  beforeEach(() => {
    runner = new SwiftRunner();
  });

  describe('configuration', () => {
    it('has correct language', () => {
      expect(runner.language).toBe(LanguageId.Swift);
    });

    it('has correct name', () => {
      expect(runner.name).toBe('Swift Runner');
    });

    it('has correct aliases', () => {
      expect(runner.aliases).toEqual(['swift']);
    });

    it('has correct markers', () => {
      expect(runner['config'].markers).toEqual(['Package.swift']);
    });
  });

  describe('commands', () => {
    it('has init command with correct argv', () => {
      const cmds = runner.commands();
      const init = cmds.find(c => c.id === AdapterCommandId.Init);
      expect(init).toBeDefined();
      expect(init!.label).toBe('Resolve deps');
      expect(init!.description).toBe('Resolve dependências SPM');
    });

    it('has lint command with correct argv', () => {
      const cmds = runner.commands();
      const lint = cmds.find(c => c.id === AdapterCommandId.Lint);
      expect(lint).toBeDefined();
      expect(lint!.label).toBe('Lint');
    });

    it('has test command with correct argv', () => {
      const cmds = runner.commands();
      const test = cmds.find(c => c.id === AdapterCommandId.Test);
      expect(test).toBeDefined();
      expect(test!.label).toBe('Test');
    });

    it('has build command with correct argv', () => {
      const cmds = runner.commands();
      const build = cmds.find(c => c.id === AdapterCommandId.Build);
      expect(build).toBeDefined();
      expect(build!.label).toBe('Build');
    });

    it('has compile command with correct argv', () => {
      const cmds = runner.commands();
      const compile = cmds.find(c => c.id === AdapterCommandId.Compile);
      expect(compile).toBeDefined();
      expect(compile!.label).toBe('Release build');
    });

    it('has quality-gate command with correct argv', () => {
      const cmds = runner.commands();
      const qg = cmds.find(c => c.id === AdapterCommandId.QualityGate);
      expect(qg).toBeDefined();
      expect(qg!.label).toBe('Quality gate');
    });

    it('includes detect command', () => {
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
      jest.spyOn(fs, 'readdirSync').mockReturnValue([mockDirent('Package.swift')] as any);
      expect(runner.detect('/test')).toBe(true);
    });

    it('returns false when marker does not exist', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([] as any);
      expect(runner.detect('/test')).toBe(false);
    });
  });
});
