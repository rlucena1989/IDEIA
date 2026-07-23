import { toPascalCase, toCamelCase, resolveRef, tsTypeFromSchema } from '../contracts/generator';

describe('contracts - generator', () => {
  describe('toPascalCase', () => {
    it('deve converter kebab-case', () => {
      expect(toPascalCase('my-api')).toBe('MyApi');
    });
    it('deve converter snake_case', () => {
      expect(toPascalCase('user_profile')).toBe('UserProfile');
    });
    it('deve lidar com string vazia', () => {
      expect(toPascalCase('')).toBe('');
    });
    it('deve lidar com single word', () => {
      expect(toPascalCase('hello')).toBe('Hello');
    });
  });

  describe('toCamelCase', () => {
    it('deve converter kebab-case', () => {
      expect(toCamelCase('my-api')).toBe('myApi');
    });
    it('deve converter PascalCase', () => {
      expect(toCamelCase('MyApi')).toBe('myApi');
    });
    it('deve lidar com string vazia', () => {
      expect(toCamelCase('')).toBe('');
    });
  });

  describe('resolveRef', () => {
    it('deve resolver referencia simples', () => {
      const spec = { components: { schemas: { User: { type: 'object' } } } };
      const result = resolveRef('#/components/schemas/User', spec);
      expect(result).toEqual({ type: 'object' });
    });
    it('deve retornar null para referencia invalida', () => {
      const result = resolveRef('#/nonexistent', {});
      expect(result).toBeNull();
    });
  });

  describe('tsTypeFromSchema', () => {
    it('deve retornar string para type:string', () => {
      const result = tsTypeFromSchema({ type: 'string' }, {});
      expect(result).toBe('string');
    });
    it('deve retornar number para type:integer', () => {
      const result = tsTypeFromSchema({ type: 'integer' }, {});
      expect(result).toBe('number');
    });
    it('deve retornar boolean para type:boolean', () => {
      const result = tsTypeFromSchema({ type: 'boolean' }, {});
      expect(result).toBe('boolean');
    });
    it('deve retornar Record<string, unknown> para objeto vazio', () => {
      const result = tsTypeFromSchema({}, {});
      expect(result).toBe('Record<string, unknown>');
    });
  });
});

import { detectType } from '../contracts/validator';

describe('contracts - validator detectType', () => {
  it('deve detectar OpenAPI', () => {
    expect(detectType({ openapi: '3.0.0' })).toBe('openapi');
  });
  it('deve detectar AsyncAPI', () => {
    expect(detectType({ asyncapi: '2.0.0' })).toBe('asyncapi');
  });
  it('deve detectar GraphQL', () => {
    expect(detectType({ __schema: {} })).toBe('graphql');
    expect(detectType({ schema: {} })).not.toBe('openapi');
  });
  it('deve retornar unknown para spec desconhecida', () => {
    expect(detectType({ foo: 'bar' })).toBe('unknown');
  });
});

import { deepDiff, DiffEntry } from '../contracts/differ';

describe('contracts - differ deepDiff', () => {
  it('deve detectar campo adicionado', () => {
    const old = { a: 1 };
    const newObj = { a: 1, b: 2 };
    const diffs = deepDiff(old, newObj);
    expect(diffs.some((d: DiffEntry) => d.type === 'non-breaking' && d.field === 'b')).toBe(true);
  });
  it('deve detectar campo removido', () => {
    const old = { a: 1, b: 2 };
    const newObj = { a: 1 };
    const diffs = deepDiff(old, newObj);
    expect(diffs.some((d: DiffEntry) => d.change === 'removido')).toBe(true);
  });
  it('deve detectar campo alterado', () => {
    const old = { a: 1 };
    const newObj = { a: 2 };
    const diffs = deepDiff(old, newObj);
    expect(diffs.some((d: DiffEntry) => d.change.includes('modificado'))).toBe(true);
  });
  it('nao deve reportar description/summary como breaking', () => {
    const old = { description: 'old' };
    const newObj = { description: 'new' };
    const diffs = deepDiff(old, newObj);
    expect(diffs.filter((d: DiffEntry) => d.field === 'description')).toHaveLength(0);
  });
  it('deve retornar vazio para objetos identicos', () => {
    const obj = { a: 1, b: { c: 2 } };
    const diffs = deepDiff(obj, { ...obj });
    expect(diffs).toHaveLength(0);
  });
});