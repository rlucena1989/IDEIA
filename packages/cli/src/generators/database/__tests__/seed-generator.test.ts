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

import { seed } from '../seed-generator';
import { generateFiles } from '../../engine';
const mockGenerateFiles = generateFiles as jest.Mock;

function getFiles(): FileEntry[] {
  return mockGenerateFiles.mock.calls[0][0] as FileEntry[];
}

function getOptions(): GeneratorOptions {
  return mockGenerateFiles.mock.calls[0][2] as GeneratorOptions;
}

describe('seed generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls generateFiles with seed and config file entries', () => {
    seed('user', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalledTimes(1);
    const files = getFiles();
    expect(files).toHaveLength(2);
    expect(files[0]).toMatchObject({ path: 'prisma/seed.ts' });
    expect(files[1]).toMatchObject({ path: 'prisma/seed.config.ts' });
  });

  it('passes options to generateFiles', () => {
    seed('user', { dryRun: true, force: true, cwd: '/proj' });
    const options = getOptions();
    expect(options).toMatchObject({ dryRun: true, force: true, cwd: '/proj' });
  });

  it('defaults to 10 records when count is not specified', () => {
    seed('user', { dryRun: false, force: false });
    const files = getFiles();
    expect(files[0].content).toContain('Seeding 10');
  });

  it('uses custom count when provided', () => {
    seed('user', { dryRun: false, force: false, count: '100' });
    const files = getFiles();
    expect(files[0].content).toContain('Seeding 100');
    expect(files[1].content).toContain('count: 100');
  });

  it('defaults to title,description fields', () => {
    seed('user', { dryRun: false, force: false });
    const files = getFiles();
    expect(files[0].content).toContain('title: string;');
    expect(files[0].content).toContain('description: string;');
    expect(files[1].content).toContain("fields: ['title', 'description']");
  });

  it('uses custom fields when provided', () => {
    seed('user', { dryRun: false, force: false, fields: 'name,email,age' });
    const files = getFiles();
    expect(files[0].content).toContain('name: string;');
    expect(files[0].content).toContain('email: string;');
    expect(files[0].content).toContain('age: string;');
    expect(files[1].content).toContain("fields: ['name', 'email', 'age']");
  });

  it('generates faker-based field assignments', () => {
    seed('user', { dryRun: false, force: false });
    const files = getFiles();
    expect(files[0].content).toContain('faker.lorem.sentence()');
  });

  it('generates seed file with PrismaClient and faker imports', () => {
    seed('user', { dryRun: false, force: false });
    const files = getFiles();
    const content = files[0].content;
    expect(content).toContain("import { PrismaClient } from '@prisma/client'");
    expect(content).toContain("import { faker } from '@faker-js/faker'");
  });

  it('calls prisma create inside loop', () => {
    seed('user', { dryRun: false, force: false });
    const files = getFiles();
    expect(files[0].content).toContain('prisma.user.create({ data: item })');
  });

  it('uses entity name in model reference', () => {
    seed('my-entity', { dryRun: false, force: false });
    const files = getFiles();
    expect(files[0].content).toContain('prisma.my-entity.create');
    expect(files[1].content).toContain("model: 'MyEntity'");
  });

  it('generates seed interface with entity name', () => {
    seed('my-entity', { dryRun: false, force: false });
    const files = getFiles();
    expect(files[0].content).toContain('interface MyEntitySeed {');
  });

  it('includes error handling in seed file', () => {
    seed('user', { dryRun: false, force: false });
    const files = getFiles();
    const content = files[0].content;
    expect(content).toContain('.catch(');
    expect(content).toContain('process.exit(1)');
    expect(content).toContain('prisma.$disconnect');
  });
});
