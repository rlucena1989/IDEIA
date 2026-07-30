import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { buildVars, generateFiles, printGeneratorResult, GeneratorOptions, GeneratorResult, FileEntry } from '../engine';

describe('engine', () => {
  let existsSpy: ReturnType<typeof jest.spyOn>;
  let mkdirSpy: ReturnType<typeof jest.spyOn>;
  let writeSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
  });

  afterEach(() => {
    existsSpy.mockRestore();
    mkdirSpy.mockRestore();
    writeSpy.mockRestore();
  });

  const defaultVars: Record<string, string> = {
    name: 'user',
    Name: 'User',
    NAME: 'USER',
    name_kebab: 'user',
    name_plural: 'users',
    NamePlural: 'Users',
  };

  describe('buildVars', () => {
    it('returns pascal case Name', () => {
      expect(buildVars('user').Name).toBe('User');
      expect(buildVars('user-profile').Name).toBe('UserProfile');
      expect(buildVars('order_item').Name).toBe('OrderItem');
    });

    it('returns screaming snake case NAME', () => {
      expect(buildVars('user').NAME).toBe('USER');
      expect(buildVars('user-profile').NAME).toBe('USER_PROFILE');
      expect(buildVars('order_item').NAME).toBe('ORDER_ITEM');
    });

    it('returns kebab case name_kebab', () => {
      expect(buildVars('user').name_kebab).toBe('user');
      expect(buildVars('user_profile').name_kebab).toBe('user-profile');
      expect(buildVars('user-profile').name_kebab).toBe('user-profile');
    });

    it('returns plural forms', () => {
      const v = buildVars('category');
      expect(v.name_plural).toBe('categories');
      expect(v.NamePlural).toBe('Categories');
      expect(buildVars('user').name_plural).toBe('users');
    });
  });

  describe('interpolate (via generateFiles)', () => {
    it('replaces {{Name}} in path', () => {
      const files: FileEntry[] = [{ path: '{{Name}}.ts', content: '' }];
      generateFiles(files, defaultVars, { dryRun: false, force: false });
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringMatching(/User\.ts$/),
        expect.any(String),
        'utf-8',
      );
    });

    it('replaces {{name}} and {{Name}} in content', () => {
      const files: FileEntry[] = [{ path: 'out.ts', content: 'const {{name}} = new {{Name}}()' }];
      generateFiles(files, defaultVars, { dryRun: false, force: false });
      expect(writeSpy).toHaveBeenCalledWith(
        expect.any(String),
        'const user = new User()',
        'utf-8',
      );
    });

    it('replaces {{NAME}} with screaming case', () => {
      const files: FileEntry[] = [{ path: 'out.ts', content: 'export const {{NAME}}_KEY = "{{name}}"' }];
      generateFiles(files, defaultVars, { dryRun: false, force: false });
      expect(writeSpy).toHaveBeenCalledWith(
        expect.any(String),
        'export const USER_KEY = "user"',
        'utf-8',
      );
    });

    it('replaces {{name_plural}} in content', () => {
      const vars = buildVars('category');
      const files: FileEntry[] = [{ path: 'out.ts', content: '{{name_plural}}' }];
      generateFiles(files, vars, { dryRun: false, force: false });
      expect(writeSpy).toHaveBeenCalledWith(
        expect.any(String),
        'categories',
        'utf-8',
      );
    });
  });

  describe('generateFiles', () => {
    it('creates files when they do not exist', () => {
      const files: FileEntry[] = [{ path: 'src/{{Name}}.ts', content: 'export class {{Name}} {}' }];
      const result = generateFiles(files, defaultVars, { dryRun: false, force: false });

      expect(result.created).toHaveLength(1);
      expect(result.created[0]).toMatch(/User\.ts$/);
      expect(mkdirSpy).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringMatching(/User\.ts$/),
        'export class User {}',
        'utf-8',
      );
    });

    it('skips files when they exist and force is false', () => {
      existsSpy.mockReturnValue(true);
      const files: FileEntry[] = [{ path: 'exists.ts', content: 'content' }];
      const result = generateFiles(files, defaultVars, { dryRun: false, force: false });

      expect(result.skipped).toHaveLength(1);
      expect(result.created).toHaveLength(0);
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('overwrites files when force is true', () => {
      existsSpy.mockReturnValue(true);
      const files: FileEntry[] = [{ path: 'exists.ts', content: 'overwritten' }];
      const result = generateFiles(files, defaultVars, { dryRun: false, force: true });

      expect(result.overwritten).toHaveLength(1);
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringMatching(/exists\.ts$/),
        'overwritten',
        'utf-8',
      );
    });

    it('does not write files in dryRun mode', () => {
      const files: FileEntry[] = [{ path: 'new.ts', content: 'content' }];
      const result = generateFiles(files, defaultVars, { dryRun: true, force: false });

      expect(result.created).toHaveLength(1);
      expect(writeSpy).not.toHaveBeenCalled();
      expect(mkdirSpy).not.toHaveBeenCalled();
    });

    it('collects errors when mkdirSync throws', () => {
      mkdirSpy.mockImplementation(() => { throw new Error('permission denied'); });
      const files: FileEntry[] = [{ path: 'fail.ts', content: 'content' }];
      const result = generateFiles(files, defaultVars, { dryRun: false, force: false });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('permission denied');
    });

    it('uses options.cwd as root when provided', () => {
      const files: FileEntry[] = [{ path: 'test.ts', content: '' }];
      generateFiles(files, defaultVars, { dryRun: false, force: false, cwd: '/custom' });

      const expectedPath = path.resolve('/custom', 'test.ts');
      expect(writeSpy).toHaveBeenCalledWith(expectedPath, '', 'utf-8');
    });
  });

  describe('printGeneratorResult', () => {
    it('logs label and created count', () => {
      const log = jest.fn<(msg: string) => void>();
      const result: GeneratorResult = { created: ['a.ts'], skipped: [], overwritten: [], errors: [] };
      printGeneratorResult('Test', result, false, { log });

      expect(log).toHaveBeenCalledWith(expect.stringContaining('Test'));
      expect(log).toHaveBeenCalledWith(expect.stringContaining('Criados: 1'));
    });

    it('does not log created count when empty', () => {
      const log = jest.fn<(msg: string) => void>();
      const result: GeneratorResult = { created: [], skipped: ['b.ts'], overwritten: [], errors: [] };
      printGeneratorResult('Test', result, false, { log });

      expect(log).not.toHaveBeenCalledWith(expect.stringContaining('Criados:'));
      expect(log).toHaveBeenCalledWith(expect.stringContaining('Pulados'));
    });

    it('logs skipped count', () => {
      const log = jest.fn<(msg: string) => void>();
      const result: GeneratorResult = { created: [], skipped: ['b.ts'], overwritten: [], errors: [] };
      printGeneratorResult('Test', result, false, { log });

      expect(log).toHaveBeenCalledWith(expect.stringContaining('Pulados'));
    });

    it('logs overwritten count', () => {
      const log = jest.fn<(msg: string) => void>();
      const result: GeneratorResult = { created: [], skipped: [], overwritten: ['c.ts'], errors: [] };
      printGeneratorResult('Test', result, false, { log });

      expect(log).toHaveBeenCalledWith(expect.stringContaining('Sobrescritos'));
    });

    it('uses error logger for errors when available', () => {
      const log = jest.fn<(msg: string) => void>();
      const error = jest.fn<(msg: string) => void>();
      const result: GeneratorResult = { created: [], skipped: [], overwritten: [], errors: ['err'] };
      printGeneratorResult('Test', result, false, { log, error });

      expect(error).toHaveBeenCalledWith(expect.stringContaining('Erros'));
    });

    it('uses [DRY-RUN] prefix and lists created files', () => {
      const log = jest.fn<(msg: string) => void>();
      const result: GeneratorResult = { created: ['a.ts', 'b.ts'], skipped: [], overwritten: [], errors: [] };
      printGeneratorResult('Test', result, true, { log });

      expect(log).toHaveBeenCalledWith(expect.stringContaining('[DRY-RUN]'));
      expect(log).toHaveBeenCalledWith(expect.stringContaining('a.ts'));
      expect(log).toHaveBeenCalledWith(expect.stringContaining('b.ts'));
    });

    it('does not list created files in non-dry-run mode', () => {
      const log = jest.fn<(msg: string) => void>();
      const result: GeneratorResult = { created: ['a.ts'], skipped: [], overwritten: [], errors: [] };
      printGeneratorResult('Test', result, false, { log });

      expect(log).not.toHaveBeenCalledWith(expect.stringContaining('- a.ts'));
    });

    it('defaults to console when no logger provided', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const result: GeneratorResult = { created: ['a.ts'], skipped: [], overwritten: [], errors: [] };
      printGeneratorResult('Test', result, false);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
