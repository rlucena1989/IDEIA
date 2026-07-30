import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { BlueprintManifest, TemplateContext } from '../types';
import { ADRGenerator } from '../adr-generator';

jest.mock('../template-engine', () => {
  const actual = jest.requireActual<typeof import('../template-engine')>('../template-engine');
  return {
    TemplateEngine: actual.TemplateEngine,
    defaultHelpers: actual.defaultHelpers,
  };
});

describe('ADRGenerator', () => {
  let generator: ADRGenerator;
  let context: TemplateContext;

  beforeEach(() => {
    generator = new ADRGenerator();
    context = {
      projectName: 'test-app',
      projectNamePascal: 'TestApp',
      projectNameCamel: 'testApp',
      projectNameKebab: 'test-app',
      projectNameSnake: 'test_app',
      description: 'A test application',
      features: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      ideiaVersion: '1.0.0',
      nodeVersion: 'v20.0.0',
    };
  });

  const emptyManifest: BlueprintManifest = {
    name: 'test-app',
    version: '1.0.0',
    description: 'A test application',
  };

  describe('generate', () => {
    it('returns array of GeneratedADR', async () => {
      const result = await generator.generate(emptyManifest, context);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('each ADR has required fields', async () => {
      const result = await generator.generate(emptyManifest, context);
      for (const adr of result) {
        expect(adr).toHaveProperty('path');
        expect(adr).toHaveProperty('content');
        expect(adr).toHaveProperty('title');
        expect(adr).toHaveProperty('id');
        expect(adr.path).toContain('docs/adr/');
        expect(adr.id).toMatch(/^ADR-\d{4}$/);
      }
    });

    it('generates framework ADR as first entry', async () => {
      const result = await generator.generate(emptyManifest, context);
      expect(result[0].title).toContain('Main Framework');
      expect(result[0].id).toBe('ADR-0001');
    });

    it('detects NestJS framework from dependencies', async () => {
      const manifest: BlueprintManifest = {
        ...emptyManifest,
        dependencies: { dependencies: { '@nestjs/core': '^10.0.0' } },
      };
      const result = await generator.generate(manifest, context);
      expect(result[0].title).toContain('NestJS');
    });

    it('detects Express framework', async () => {
      const manifest: BlueprintManifest = {
        ...emptyManifest,
        dependencies: { dependencies: { express: '^4.0.0' } },
      };
      const result = await generator.generate(manifest, context);
      expect(result[0].title).toContain('Express');
    });

    it('detects React framework', async () => {
      const manifest: BlueprintManifest = {
        ...emptyManifest,
        dependencies: { dependencies: { react: '^18.0.0' } },
      };
      const result = await generator.generate(manifest, context);
      expect(result[0].title).toContain('React');
    });

    it('generates database ADR when features include database', async () => {
      const dbContext = { ...context, features: ['database'] };
      const result = await generator.generate(emptyManifest, dbContext);
      const dbAdr = result.find(r => r.title.includes('Database'));
      expect(dbAdr).toBeDefined();
    });

    it('generates database ADR when features include postgresql', async () => {
      const pgContext = { ...context, features: ['postgresql'] };
      const result = await generator.generate(emptyManifest, pgContext);
      const dbAdr = result.find(r => r.title.includes('PostgreSQL'));
      expect(dbAdr).toBeDefined();
    });

    it('generates architecture ADR', async () => {
      const result = await generator.generate(emptyManifest, context);
      const archAdr = result.find(r => r.title.includes('Clean Architecture'));
      expect(archAdr).toBeDefined();
    });

    it('generates package manager ADR', async () => {
      const result = await generator.generate(emptyManifest, context);
      const pmAdr = result.find(r => r.title.includes('pnpm'));
      expect(pmAdr).toBeDefined();
    });

    it('generates test framework ADR', async () => {
      const result = await generator.generate(emptyManifest, context);
      const testAdr = result.find(r => r.title.includes('Test Framework'));
      expect(testAdr).toBeDefined();
    });

    it('detects Vitest as test framework', async () => {
      const manifest: BlueprintManifest = {
        ...emptyManifest,
        dependencies: { devDependencies: { vitest: '^1.0.0' } },
      };
      const result = await generator.generate(manifest, context);
      const testAdr = result.find(r => r.title.includes('Test Framework'));
      expect(testAdr?.title).toContain('Vitest');
    });

    it('generates API protocol ADR when features include api', async () => {
      const apiContext = { ...context, features: ['api'] };
      const result = await generator.generate(emptyManifest, apiContext);
      const apiAdr = result.find(r => r.title.includes('API Protocol'));
      expect(apiAdr).toBeDefined();
    });

    it('generates auth ADR when features include auth', async () => {
      const authContext = { ...context, features: ['auth'] };
      const result = await generator.generate(emptyManifest, authContext);
      const authAdr = result.find(r => r.title.includes('Authentication'));
      expect(authAdr).toBeDefined();
    });

    it('generates auth ADR when features include jwt', async () => {
      const jwtContext = { ...context, features: ['jwt'] };
      const result = await generator.generate(emptyManifest, jwtContext);
      const authAdr = result.find(r => r.title.includes('Authentication'));
      expect(authAdr).toBeDefined();
    });

    it('generates monorepo ADR when features include monorepo', async () => {
      const monoContext = { ...context, features: ['monorepo'] };
      const result = await generator.generate(emptyManifest, monoContext);
      const monoAdr = result.find(r => r.title.includes('Monorepo'));
      expect(monoAdr).toBeDefined();
    });

    it('generates custom ADRs from manifest templates', async () => {
      const manifest: BlueprintManifest = {
        ...emptyManifest,
        adrs: {
          templates: [
            { title: 'Custom Decision' },
            { title: 'Another Decision' },
          ],
        },
      };
      const result = await generator.generate(manifest, context);
      const customAdrs = result.filter(r => r.title === 'Custom Decision' || r.title === 'Another Decision');
      expect(customAdrs.length).toBe(2);
    });

    it('respects existingAdrCount parameter', async () => {
      const result = await generator.generate(emptyManifest, context, 10);
      expect(result[0].id).toBe('ADR-0010');
    });

    it('sets status Proposed for custom ADRs', async () => {
      const manifest: BlueprintManifest = {
        ...emptyManifest,
        adrs: {
          templates: [{ title: 'New Decision' }],
        },
      };
      const result = await generator.generate(manifest, context);
      const customAdr = result.find(r => r.title === 'New Decision');
      expect(customAdr?.content).toContain('Status: Proposed');
    });

    it('uses GraphQL for API protocol when feature present', async () => {
      const graphqlContext = { ...context, features: ['api', 'graphql'] };
      const result = await generator.generate(emptyManifest, graphqlContext);
      const apiAdr = result.find(r => r.title.includes('GraphQL'));
      expect(apiAdr).toBeDefined();
    });

    it('uses OAuth 2.0 when features include oauth', async () => {
      const oauthContext = { ...context, features: ['auth', 'oauth'] };
      const result = await generator.generate(emptyManifest, oauthContext);
      const authAdr = result.find(r => r.title.includes('OAuth 2.0'));
      expect(authAdr).toBeDefined();
    });
  });
});
