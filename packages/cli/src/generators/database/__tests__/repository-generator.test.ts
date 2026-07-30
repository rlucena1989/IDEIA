import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { FileEntry, GeneratorOptions, GeneratorResult } from '../../engine';

jest.mock('../../engine', () => {
  const actual = jest.requireActual('../../engine');
  return {
    ...(actual as Record<string, unknown>),
    generateFiles: jest.fn<() => GeneratorResult>().mockReturnValue({
      created: [], skipped: [], overwritten: [], errors: [],
    }),
  };
});

import { repository } from '../repository-generator';
import { generateFiles } from '../../engine';
const mockGenerateFiles = generateFiles as jest.Mock;

function getFiles(): FileEntry[] {
  return mockGenerateFiles.mock.calls[0][0] as FileEntry[];
}

function getVars(): Record<string, string> {
  return mockGenerateFiles.mock.calls[0][1] as Record<string, string>;
}

function getOptions(): GeneratorOptions {
  return mockGenerateFiles.mock.calls[0][2] as GeneratorOptions;
}

describe('repository generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls generateFiles with repository file entry', () => {
    repository('user', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalledTimes(1);
    const files = getFiles();
    expect(files).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: expect.stringContaining('UserRepository') }),
    ]));
  });

  it('passes options to generateFiles', () => {
    repository('user', { dryRun: true, force: true, cwd: '/test' });
    const options = getOptions();
    expect(options).toMatchObject({ dryRun: true, force: true, cwd: '/test' });
  });

  it('uses prisma ORM by default', () => {
    repository('user', { dryRun: false, force: false });
    const files = getFiles();
    expect(files[0].content).toContain('PrismaClient');
    expect(files[0].content).toContain('findMany');
    expect(files[0].content).toContain('findUnique');
  });

  it('generates typeorm code when orm=typeorm', () => {
    repository('user', { dryRun: false, force: false, orm: 'typeorm' });
    const files = getFiles();
    expect(files[0].content).toContain('EntityRepository');
    expect(files[0].content).toContain('UserRepository');
    expect(files[0].content).toContain('Repository');
  });

  it('falls back to prisma for unknown ORM', () => {
    repository('user', { dryRun: false, force: false, orm: 'drizzle' as never });
    const files = getFiles();
    expect(files[0].content).toContain('PrismaClient');
  });

  it('builds correct vars from entity name', () => {
    repository('my-entity', { dryRun: false, force: false });
    const vars = getVars();
    expect(vars.Name).toBe('MyEntity');
    expect(vars.name_kebab).toBe('my-entity');
  });

  it('generates file path using Name variable', () => {
    repository('my-entity', { dryRun: false, force: false });
    const files = getFiles();
    expect(files[0].path).toBe('src/repositories/MyEntityRepository.ts');
  });

  it('includes CRUD methods in prisma template', () => {
    repository('product', { dryRun: false, force: false });
    const files = getFiles();
    const content = files[0].content;
    expect(content).toContain('findMany');
    expect(content).toContain('findById');
    expect(content).toContain('create');
    expect(content).toContain('update');
    expect(content).toContain('remove');
  });

  it('includes CRUD methods in typeorm template', () => {
    repository('product', { dryRun: false, force: false, orm: 'typeorm' });
    const files = getFiles();
    const content = files[0].content;
    expect(content).toContain('findMany');
    expect(content).toContain('findById');
    expect(content).toContain('create');
    expect(content).not.toContain('update');
    expect(content).not.toContain('remove');
  });
});
