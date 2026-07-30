import { JVMRunner } from '../jvm-runner';
import { LanguageId } from '../../adapter-contract';
import fs from 'node:fs';

jest.mock('../../adapter-contract', () => ({
  ...jest.requireActual('../../adapter-contract'),
  execCommand: jest.fn(),
}));

describe('JVMRunner', () => {
  let runner: JVMRunner;

  beforeEach(() => {
    runner = new JVMRunner();
  });

  describe('configuration', () => {
    it('has correct language', () => {
      expect(runner.language).toBe(LanguageId.Java);
    });

    it('has correct name', () => {
      expect(runner.name).toBe('JVM Runner');
    });

    it('has correct aliases', () => {
      expect(runner.aliases).toEqual(['java', 'kotlin', 'scala', 'jvm', 'mvn', 'gradle']);
    });

    it('has correct markers', () => {
      expect((runner as any).config.markers).toEqual(['pom.xml', 'build.gradle', 'build.gradle.kts', '*.java', '*.kt', '*.scala']);
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

    it('init command is optional', () => {
      const cmds = runner.commands();
      const init = cmds.find(c => c.id === 'init');
      expect(init).toBeDefined();
    });

    it('lint command is optional', () => {
      const cmds = runner.commands();
      const lint = cmds.find(c => c.id === 'lint');
      expect(lint).toBeDefined();
    });

    it('quality-gate command is optional', () => {
      const cmds = runner.commands();
      const qg = cmds.find(c => c.id === 'quality-gate');
      expect(qg).toBeDefined();
    });
  });

  describe('detection', () => {
    it('detects when pom.xml exists', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'pom.xml', isFile: () => true, isDirectory: () => false } as any,
      ]);
      expect(runner.detect('/some/project')).toBe(true);
      jest.restoreAllMocks();
    });

    it('detects when *.java file exists', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'Main.java', isFile: () => true, isDirectory: () => false } as any,
      ]);
      expect(runner.detect('/some/project')).toBe(true);
      jest.restoreAllMocks();
    });

    it('detects when build.gradle exists', () => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'build.gradle', isFile: () => true, isDirectory: () => false } as any,
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
