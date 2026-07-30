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

import { schema, generatePrismaSchema, generateTypeScriptTypes, FieldDef, ModelDef } from '../schema-generator';
import { generateFiles } from '../../engine';
const mockGenerateFiles = generateFiles as jest.Mock;

function getFiles(): FileEntry[] {
  return mockGenerateFiles.mock.calls[0][0] as FileEntry[];
}

function getOptions(): GeneratorOptions {
  return mockGenerateFiles.mock.calls[0][2] as GeneratorOptions;
}

describe('schema generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleModels: ModelDef[] = [
    {
      name: 'User',
      fields: [
        { name: 'email', type: 'String', unique: true },
        { name: 'name', type: 'String' },
        { name: 'age', type: 'Int', optional: true },
      ],
    },
    {
      name: 'Post',
      fields: [
        { name: 'title', type: 'String' },
        { name: 'published', type: 'Boolean', default: 'false' },
      ],
    },
  ];

  describe('generatePrismaSchema', () => {
    it('generates schema with generator and datasource blocks', () => {
      const output = generatePrismaSchema([sampleModels[0]]);
      expect(output).toContain('generator client');
      expect(output).toContain('provider = "prisma-client-js"');
      expect(output).toContain('datasource db');
      expect(output).toContain('provider = "postgresql"');
      expect(output).toContain('url      = env("DATABASE_URL")');
    });

    it('includes model block with id and timestamps', () => {
      const output = generatePrismaSchema([sampleModels[0]]);
      expect(output).toContain('model User {');
      expect(output).toContain('id    Int     @id @default(autoincrement())');
      expect(output).toContain('createdAt DateTime @default(now())');
      expect(output).toContain('updatedAt DateTime @updatedAt');
    });

    it('adds field attributes (unique, default, optional)', () => {
      const output = generatePrismaSchema(sampleModels);
      expect(output).toContain('email String @unique');
      expect(output).toContain('age Int?');
      expect(output).toContain('published Boolean @default(false)');
    });
  });

  describe('generateTypeScriptTypes', () => {
    it('generates interface with id and timestamps', () => {
      const output = generateTypeScriptTypes([sampleModels[0]]);
      expect(output).toContain('export interface User {');
      expect(output).toContain('id: number;');
      expect(output).toContain('createdAt: string;');
      expect(output).toContain('updatedAt: string;');
    });

    it('maps DateTime to string and Int to number', () => {
      const output = generateTypeScriptTypes([sampleModels[0]]);
      expect(output).toContain('email: String;');
      expect(output).toContain('name: String;');
      expect(output).toContain('age?: number;');
    });

    it('separates multiple models with blank line', () => {
      const output = generateTypeScriptTypes(sampleModels);
      const interfaces = output.split('\n\n');
      expect(interfaces.length).toBe(2);
      expect(interfaces[0]).toContain('User');
      expect(interfaces[1]).toContain('Post');
    });
  });

  describe('schema function', () => {
    it('calls generateFiles with prisma and types file entries', () => {
      schema('user', { dryRun: false, force: false });
      expect(generateFiles).toHaveBeenCalledTimes(1);
      const files = getFiles();
      expect(files).toHaveLength(2);
      expect(files[0]).toMatchObject({ path: 'prisma/schema.prisma' });
      expect(files[1]).toMatchObject({ path: 'src/generated/types.ts' });
    });

    it('passes options to generateFiles', () => {
      schema('user', { dryRun: true, force: true, cwd: '/proj' });
      const options = getOptions();
      expect(options).toMatchObject({ dryRun: true, force: true, cwd: '/proj' });
    });

    it('parses default input when no input provided', () => {
      schema('post', { dryRun: false, force: false });
      const files = getFiles();
      expect(files[0].content).toContain('model Post {');
      expect(files[1].content).toContain('export interface Post {');
    });

    it('parses custom input string', () => {
      const input = 'model Article {\n  title String\n  body String?\n}';
      schema('article', { dryRun: false, force: false, input });
      const files = getFiles();
      expect(files[0].content).toContain('model Article {');
      expect(files[1].content).toContain('export interface Article {');
      expect(files[1].content).toContain('body?: String?;');
    });

    it('parses multiple models from input', () => {
      const input = 'model A {\n  x String\n}\nmodel B {\n  y Int\n}';
      schema('multi', { dryRun: false, force: false, input });
      const files = getFiles();
      expect(files[0].content).toContain('model A {');
      expect(files[0].content).toContain('model B {');
    });

    it('generates prisma schema content with correct model structure', () => {
      schema('user', { dryRun: false, force: false });
      const files = getFiles();
      const prisma = files[0].content;
      expect(prisma).toContain('generator client {');
      expect(prisma).toContain('datasource db {');
      expect(prisma).toContain('model User {');
    });

    it('generates typescript types content', () => {
      schema('user', { dryRun: false, force: false });
      const files = getFiles();
      const types = files[1].content;
      expect(types).toContain('export interface User {');
      expect(types).toContain('id: number;');
      expect(types).toContain('createdAt: string;');
    });
  });
});
