import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { TemplateContext } from '../types';
import { ConfigGenerator } from '../config-generator';

jest.mock('../template-engine', () => {
  const actual = jest.requireActual<typeof import('../template-engine')>('../template-engine');
  return {
    TemplateEngine: actual.TemplateEngine,
  };
});

describe('ConfigGenerator', () => {
  let generator: ConfigGenerator;
  let context: TemplateContext;

  beforeEach(() => {
    generator = new ConfigGenerator();
    context = {
      projectName: 'test-app',
      projectNamePascal: 'TestApp',
      projectNameCamel: 'testApp',
      projectNameKebab: 'test-app',
      projectNameSnake: 'test_app',
      description: 'A test app',
      features: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      ideiaVersion: '1.0.0',
      nodeVersion: 'v20.0.0',
    };
  });

  describe('generate', () => {
    it('returns only gitignore for empty configs', async () => {
      const result = await generator.generate({}, context);
      expect(result.length).toBe(1);
      expect(result[0].path).toBe('.gitignore');
    });

    function byPath(files: { path: string; content?: string }[], target: string) {
      return files.find(f => f.path === target);
    }

    it('generates tsconfig', async () => {
      const result = await generator.generate({ tsconfig: {} }, context);
      const tsconfig = byPath(result, 'tsconfig.json');
      expect(tsconfig).toBeDefined();
      const content = JSON.parse(tsconfig!.content as string);
      expect(content.compilerOptions.target).toBe('ES2022');
      expect(content.compilerOptions.strict).toBe(true);
    });

    it('generates tsconfig with monorepo paths', async () => {
      const monorepoCtx = { ...context, features: ['monorepo'] };
      const result = await generator.generate({ tsconfig: {} }, monorepoCtx);
      const tsconfig = byPath(result, 'tsconfig.json');
      const content = JSON.parse(tsconfig!.content as string);
      expect(content.compilerOptions.paths).toEqual({ '@/*': ['./packages/*/src'] });
    });

    it('generates tsconfig with path aliases', async () => {
      const pathsCtx = { ...context, features: ['paths'] };
      const result = await generator.generate({ tsconfig: {} }, pathsCtx);
      const tsconfig = byPath(result, 'tsconfig.json');
      const content = JSON.parse(tsconfig!.content as string);
      expect(content.compilerOptions.paths).toEqual({ '@/*': ['./src/*'] });
    });

    it('generates eslint config', async () => {
      const result = await generator.generate({ eslint: {} }, context);
      const eslint = byPath(result, '.eslintrc.json');
      expect(eslint).toBeDefined();
      const content = JSON.parse(eslint!.content as string);
      expect(content.root).toBe(true);
      expect(content.rules['@typescript-eslint/no-explicit-any']).toBe('error');
    });

    it('generates prettier config', async () => {
      const result = await generator.generate({ prettier: {} }, context);
      const prettier = byPath(result, '.prettierrc');
      expect(prettier).toBeDefined();
      const content = JSON.parse(prettier!.content as string);
      expect(content.semi).toBe(true);
      expect(content.singleQuote).toBe(true);
    });

    it('merges user options into prettier config', async () => {
      const result = await generator.generate({ prettier: { semi: false } }, context);
      const prettier = byPath(result, '.prettierrc');
      const content = JSON.parse(prettier!.content as string);
      expect(content.semi).toBe(false);
    });

    it('generates jest config', async () => {
      const result = await generator.generate({ jest: {} }, context);
      const jestCfg = byPath(result, 'jest.config.ts');
      expect(jestCfg).toBeDefined();
      expect(jestCfg!.content).toContain('preset');
      expect(jestCfg!.content).toContain('ts-jest');
    });

    it('generates vitest config', async () => {
      const result = await generator.generate({ vitest: {} }, context);
      const vitest = byPath(result, 'vitest.config.ts');
      expect(vitest).toBeDefined();
      expect(vitest!.content).toContain('defineConfig');
    });

    it('generates docker-compose', async () => {
      const result = await generator.generate({ dockerCompose: {} }, context);
      const dc = byPath(result, 'docker-compose.yml');
      expect(dc).toBeDefined();
      expect(dc!.content).toContain('services');
    });

    it('generates docker-compose with postgres feature', async () => {
      const dbCtx = { ...context, features: ['postgresql'] };
      const result = await generator.generate({ dockerCompose: {} }, dbCtx);
      const dc = byPath(result, 'docker-compose.yml');
      expect(dc!.content).toContain('postgres');
    });

    it('generates docker-compose with redis feature', async () => {
      const redisCtx = { ...context, features: ['redis'] };
      const result = await generator.generate({ dockerCompose: {} }, redisCtx);
      const dc = byPath(result, 'docker-compose.yml');
      expect(dc!.content).toContain('redis:7-alpine');
    });

    it('generates Dockerfile', async () => {
      const result = await generator.generate({ dockerfile: {} }, context);
      const df = byPath(result, 'Dockerfile');
      expect(df).toBeDefined();
      expect(df!.content).toContain('FROM node:20-alpine');
    });

    it('generates env example', async () => {
      const result = await generator.generate({ envExample: {} }, context);
      const env = byPath(result, '.env.example');
      expect(env).toBeDefined();
      expect(env!.content).toContain('NODE_ENV');
    });

    it('generates editorconfig', async () => {
      const result = await generator.generate({ editorconfig: {} }, context);
      const ec = byPath(result, '.editorconfig');
      expect(ec).toBeDefined();
      expect(ec!.content).toContain('indent_style');
    });

    it('generates gitignore by default', async () => {
      const result = await generator.generate({}, context);
      const gitignore = result.find(r => r.path === '.gitignore');
      expect(gitignore).toBeDefined();
    });

    it('skips gitignore when explicitly false', async () => {
      const result = await generator.generate({ gitignore: false }, context);
      const gitignore = result.find(r => r.path === '.gitignore');
      expect(gitignore).toBeUndefined();
    });

    it('generates multiple configs in one call', async () => {
      const result = await generator.generate({
        tsconfig: {},
        eslint: {},
        prettier: {},
      }, context);
      expect(result.length).toBe(4);
      const paths = result.map(r => r.path);
      expect(paths).toContain('tsconfig.json');
      expect(paths).toContain('.eslintrc.json');
      expect(paths).toContain('.prettierrc');
      expect(paths).toContain('.gitignore');
    });
  });
});
