import { lintSpec, LintIssue } from '../contracts/linter';

jest.mock('node:fs', () => ({
  readFileSync: jest.fn(),
}));
jest.mock('yaml', () => ({
  parse: jest.fn(),
}));

const mockReadFileSync = jest.requireMock('node:fs').readFileSync;
const mockYamlParse = jest.requireMock('yaml').parse;

beforeEach(() => {
  jest.clearAllMocks();
});

function makeOpenApiSpec(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    servers: [{ url: 'https://api.example.com' }],
    paths: {
      '/users': {
        get: {
          operationId: 'listUsers',
          responses: { '200': { description: 'OK' } },
        },
      },
    },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
    ...overrides,
  };
}

describe('lintSpec (OpenAPI)', () => {
  it('deve aprovar spec valida', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(makeOpenApiSpec()));
    const result = lintSpec('/fake/spec.json');
    expect(result.specType).toBe('openapi');
    expect(result.issues).toHaveLength(0);
    expect(result.score).toBe(100);
  });

  it('deve emitir warning se nao tiver servers', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(makeOpenApiSpec({ servers: undefined })));
    const result = lintSpec('/fake/spec.json');
    expect(result.issues.some(i => i.rule === 'no-servers')).toBe(true);
  });

  it('deve emitir warning se nao tiver securitySchemes', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(makeOpenApiSpec({ components: {} })));
    const result = lintSpec('/fake/spec.json');
    expect(result.issues.some(i => i.rule === 'security')).toBe(true);
  });

  it('deve validar operationId em endpoints', () => {
    const spec = makeOpenApiSpec({
      paths: {
        '/users': {
          get: {
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    });
    mockReadFileSync.mockReturnValue(JSON.stringify(spec));
    const result = lintSpec('/fake/spec.json');
    expect(result.issues.some(i => i.rule === 'operation-id')).toBe(true);
  });

  it('deve emitir error se responses estiver ausente', () => {
    const spec = makeOpenApiSpec({
      paths: {
        '/users': {
          get: { operationId: 'listUsers' },
        },
      },
    });
    mockReadFileSync.mockReturnValue(JSON.stringify(spec));
    const result = lintSpec('/fake/spec.json');
    expect(result.issues.some(i => i.rule === 'responses' && i.severity === 'error')).toBe(true);
  });

  it('deve emitir warning se GET tiver requestBody', () => {
    const spec = makeOpenApiSpec({
      paths: {
        '/search': {
          get: {
            operationId: 'search',
            requestBody: { content: { 'application/json': { schema: {} } } },
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    });
    mockReadFileSync.mockReturnValue(JSON.stringify(spec));
    const result = lintSpec('/fake/spec.json');
    expect(result.issues.some(i => i.rule === 'get-body')).toBe(true);
  });

  it('deve emitir info para POST sem 201', () => {
    const spec = makeOpenApiSpec({
      paths: {
        '/users': {
          post: {
            operationId: 'createUser',
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    });
    mockReadFileSync.mockReturnValue(JSON.stringify(spec));
    const result = lintSpec('/fake/spec.json');
    expect(result.issues.some(i => i.rule === 'created-response')).toBe(true);
    expect(result.issues.some(i => i.rule === 'validation-response')).toBe(true);
    expect(result.issues.some(i => i.rule === 'unprocessable-response')).toBe(true);
  });

  it('deve emitir warning quando nao tem resposta de sucesso', () => {
    const spec = makeOpenApiSpec({
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            responses: { '302': { description: 'Redirect' } },
          },
        },
      },
    });
    mockReadFileSync.mockReturnValue(JSON.stringify(spec));
    const result = lintSpec('/fake/spec.json');
    expect(result.issues.some(i => i.rule === 'success-response')).toBe(true);
  });

  it('deve calcular score baseado em gravidade dos issues', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(makeOpenApiSpec({
      components: {},
      paths: {
        '/users': {
          post: { responses: {} },
        },
      },
    })));
    const result = lintSpec('/fake/spec.json');
    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe('lintSpec (AsyncAPI)', () => {
  it('deve detectar AsyncAPI', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      asyncapi: '2.0.0',
      channels: {
        'user/signedup': {
          subscribe: { message: {} },
        },
      },
      components: { securitySchemes: {} },
    }));
    const result = lintSpec('/fake/asyncapi.json');
    expect(result.specType).toBe('asyncapi');
  });

  it('deve emitir error se channels vazio', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      asyncapi: '2.0.0',
      channels: {},
      components: { securitySchemes: {} },
    }));
    const result = lintSpec('/fake/asyncapi.json');
    expect(result.issues.some(i => i.rule === 'no-channels')).toBe(true);
  });

  it('deve emitir warning se subscribe sem message', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      asyncapi: '2.0.0',
      channels: {
        'user/signedup': {
          subscribe: {},
          publish: { message: {} },
        },
      },
      components: { securitySchemes: {} },
    }));
    const result = lintSpec('/fake/asyncapi.json');
    expect(result.issues.some(i => i.rule === 'channel-message' && i.path.includes('subscribe'))).toBe(true);
  });

  it('deve emitir error se channel sem subscribe nem publish', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      asyncapi: '2.0.0',
      channels: {
        'user/signedup': {},
      },
      components: { securitySchemes: {} },
    }));
    const result = lintSpec('/fake/asyncapi.json');
    expect(result.issues.some(i => i.rule === 'channel-operation')).toBe(true);
  });
});

describe('lintSpec (GraphQL)', () => {
  it('deve detectar GraphQL', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      __schema: {
        queryType: { name: 'Query' },
        types: [
          { name: 'Query', kind: 'OBJECT', fields: [{ name: 'hello', description: 'Hello field' }] },
        ],
      },
    }));
    const result = lintSpec('/fake/graphql.json');
    expect(result.specType).toBe('graphql');
  });

  it('deve emitir error se nao tiver Query type', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      __schema: {
        queryType: { name: 'Query' },
        types: [
          { name: 'Mutation', kind: 'OBJECT', fields: [] },
        ],
      },
    }));
    const result = lintSpec('/fake/graphql.json');
    expect(result.issues.some(i => i.rule === 'no-query')).toBe(true);
  });

  it('deve emitir info se nao tiver Mutation type', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      __schema: {
        queryType: { name: 'Query' },
        types: [
          { name: 'Query', kind: 'OBJECT', fields: [{ name: 'hello' }] },
        ],
      },
    }));
    const result = lintSpec('/fake/graphql.json');
    expect(result.issues.some(i => i.rule === 'no-mutation')).toBe(true);
  });

  it('deve emitir warning para tipo sem campos', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      __schema: {
        queryType: { name: 'Query' },
        types: [
          { name: 'Query', kind: 'OBJECT', fields: [] },
          { name: 'User', kind: 'OBJECT', fields: [] },
        ],
      },
    }));
    const result = lintSpec('/fake/graphql.json');
    expect(result.issues.some(i => i.rule === 'empty-type')).toBe(true);
  });

  it('deve emitir info para campo sem descricao', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({
      __schema: {
        queryType: { name: 'Query' },
        types: [
          { name: 'Query', kind: 'OBJECT', fields: [{ name: 'hello', description: 'Hello query' }] },
          { name: 'User', kind: 'OBJECT', fields: [{ name: 'name' }, { name: 'email', description: 'Email address' }] },
        ],
      },
    }));
    const result = lintSpec('/fake/graphql.json');
    expect(result.issues.some(i => i.rule === 'field-documentation')).toBe(true);
  });
});

describe('lintSpec (unknown type)', () => {
  it('deve retornar error para tipo desconhecido', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ name: 'unknown' }));
    const result = lintSpec('/fake/unknown.json');
    expect(result.specType).toBe('unknown');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].rule).toBe('unknown-type');
  });

  it('deve carregar spec YAML corretamente', () => {
    mockReadFileSync.mockReturnValue('openapi: "3.0.0"\ninfo:\n  title: Test\n  version: "1.0.0"\npaths: {}\ncomponents:\n  securitySchemes:\n    bearerAuth:\n      type: http\n');
    mockYamlParse.mockReturnValue(makeOpenApiSpec());
    const result = lintSpec('/fake/spec.yaml');
    expect(result.specType).toBe('openapi');
  });
});

describe('lintSpec (score calculation)', () => {
  it('deve retornar score 100 quando nao ha issues', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(makeOpenApiSpec()));
    const result = lintSpec('/fake/spec.json');
    expect(result.score).toBe(100);
  });

  it('deve retornar score < 100 com issues', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(makeOpenApiSpec({ components: {} })));
    const result = lintSpec('/fake/spec.json');
    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
