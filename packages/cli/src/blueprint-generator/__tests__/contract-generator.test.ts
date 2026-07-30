import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { ContractDefinition } from '../types';
import { ContractGenerator } from '../contract-generator';

jest.mock('../template-engine', () => {
  const actual = jest.requireActual<typeof import('../template-engine')>('../template-engine');
  return {
    TemplateEngine: actual.TemplateEngine,
  };
});

describe('ContractGenerator', () => {
  let generator: ContractGenerator;

  beforeEach(() => {
    generator = new ContractGenerator();
  });

  const userModule: ContractDefinition = {
    name: 'user',
    version: '1.0.0',
    schema: 'z.object({})',
    description: 'User module contracts',
    interfaces: [
      {
        name: 'IUserService',
        methods: [
          {
            name: 'findById',
            params: [{ name: 'id', type: 'string' }],
            returns: 'Promise<UserDto>',
          },
          {
            name: 'create',
            params: [{ name: 'data', type: 'CreateUserDto' }],
            returns: 'Promise<UserDto>',
          },
        ],
      },
    ],
    events: [
      { name: 'user.created', payload: 'userId: string; email: string' },
    ],
  };

  const minimalModule: ContractDefinition = {
    name: 'ping',
    version: '0.1.0',
    schema: 'z.object({})',
  };

  describe('generate', () => {
    it('returns empty array for empty modules', async () => {
      const result = await generator.generate([], 'zod');
      expect(result).toEqual([]);
    });

    it('generates schema and interface for each module', async () => {
      const result = await generator.generate([minimalModule], 'zod');
      expect(result.length).toBe(3);
      expect(result[0].path).toContain('ping.contract.zod.ts');
      expect(result[1].path).toContain('ping.interfaces.ts');
    });

    it('generates schema with zod format', async () => {
      const result = await generator.generate([minimalModule], 'zod');
      const schema = result[0];
      expect(schema.content).toContain("import { z } from 'zod'");
      expect(schema.format).toBe('zod');
    });

    it('generates schema with valibot format', async () => {
      const result = await generator.generate([minimalModule], 'valibot');
      const schema = result[0];
      expect(schema.content).toContain("import { object, string");
      expect(schema.format).toBe('valibot');
    });

    it('generates schema with typescript format', async () => {
      const result = await generator.generate([minimalModule], 'typescript');
      const schema = result[0];
      expect(schema.format).toBe('typescript');
    });

    it('generates events when module has events', async () => {
      const result = await generator.generate([userModule], 'zod');
      const eventFiles = result.filter(r => r.path.includes('.events.ts'));
      expect(eventFiles.length).toBe(1);
      expect(eventFiles[0].content).toContain('UserEventTypes');
    });

    it('generates test files when generateTests is true', async () => {
      const result = await generator.generate([userModule], 'zod', { generateTests: true });
      const testFiles = result.filter(r => r.path.includes('.test.ts'));
      expect(testFiles.length).toBe(1);
      expect(testFiles[0].content).toContain("describe('user Module Contract'");
    });

    it('does not generate test files when generateTests is false', async () => {
      const result = await generator.generate([userModule], 'zod', { generateTests: false });
      const testFiles = result.filter(r => r.path.includes('.test.ts'));
      expect(testFiles.length).toBe(0);
    });

    it('generates OpenAPI spec when generateOpenAPI is true', async () => {
      const result = await generator.generate([userModule], 'zod', { generateOpenAPI: true });
      const openApiFiles = result.filter(r => r.path.includes('openapi'));
      expect(openApiFiles.length).toBe(1);
      expect(openApiFiles[0].format).toBe('openapi');
    });

    it('does not generate OpenAPI spec when generateOpenAPI is false', async () => {
      const result = await generator.generate([userModule], 'zod');
      const openApiFiles = result.filter(r => r.path.includes('openapi'));
      expect(openApiFiles.length).toBe(0);
    });

    it('generates registry entry for each module', async () => {
      const result = await generator.generate([userModule], 'zod');
      const registryFiles = result.filter(r => r.path.endsWith('/index.ts'));
      expect(registryFiles.length).toBe(1);
      expect(registryFiles[0].content).toContain('ContractRegistry');
    });

    it('includes DTO schemas for method params', async () => {
      const result = await generator.generate([userModule], 'zod');
      const schemaFile = result[0];
      expect(schemaFile.content).toContain('FindByIdDto');
      expect(schemaFile.content).toContain('CreateDto');
    });

    it('generates interfaces with method signatures', async () => {
      const result = await generator.generate([userModule], 'zod');
      const ifaceFile = result[1];
      expect(ifaceFile.content).toContain('export interface IUserService');
      expect(ifaceFile.content).toContain('findById(id: string): Promise<UserDto>');
    });

    it('includes event payload interfaces', async () => {
      const result = await generator.generate([userModule], 'zod');
      const ifaceFile = result[1];
      expect(ifaceFile.content).toContain('User.createdEventPayload');
      expect(ifaceFile.content).toContain('UserEvents');
    });
  });
});
