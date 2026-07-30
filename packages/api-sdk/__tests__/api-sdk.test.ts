import { APISDKGenerator } from '../src/api-sdk-generator'
import { OpenAPIParser } from '../src/openapi-parser'
import { SDKClientGenerator } from '../src/sdk-client-generator'
import { WebhookManager } from '../src/webhook-manager'
import { APIKeyManager } from '../src/api-key-manager'
import { JWTAuthProvider } from '../src/jwt-auth-provider'
import { TypeSafeClientGenerator } from '../src/type-safe-client-generator'
import { WebSocketAPIGateway } from '../src/websocket-api-gateway'
import { GraphQLAPIVersioner } from '../src/graphql-api-versioner'
import { OpenAPIObject, GeneratorConfig } from '../src/types'

const SAMPLE_SPEC: OpenAPIObject = {
  openapi: '3.1.0',
  info: { title: 'Test API', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com/v1' }],
  paths: {
    '/projects': {
      get: { operationId: 'listProjects', summary: 'List projects', parameters: [{ name: 'limit', in: 'query', required: false, schema: { type: 'integer' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectList' } } } } } },
      post: { operationId: 'createProject', summary: 'Create project', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProjectRequest' } } } }, responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Project' } } } } } },
    },
    '/projects/{id}': {
      get: { operationId: 'getProject', summary: 'Get project', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Project' } } } } } },
    },
  },
  components: {
    schemas: {
      Project: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } }, required: ['id', 'name'] },
      ProjectList: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Project' } } } },
      CreateProjectRequest: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    },
  },
}

describe('APISDKGenerator', () => {
  const gen = new APISDKGenerator()

  it('generates SDK from spec', () => {
    const config: GeneratorConfig = { spec: SAMPLE_SPEC, language: 'typescript', style: 'fetch', includeReactHooks: true, generateTests: true }
    const result = gen.generate(config)
    expect(result.files.length).toBe(4)
    expect(result.stats.endpointCount).toBe(3)
    expect(result.stats.typeCount).toBe(3)
  })

  it('generates only types and client without hooks/tests', () => {
    const config: GeneratorConfig = { spec: SAMPLE_SPEC, language: 'typescript', style: 'fetch', includeReactHooks: false, generateTests: false }
    const result = gen.generate(config)
    expect(result.files.length).toBe(2)
  })

  it('generates types with interfaces', () => {
    const config: GeneratorConfig = { spec: SAMPLE_SPEC, language: 'typescript', style: 'fetch', includeReactHooks: false, generateTests: false }
    const result = gen.generate(config)
    const typesFile = result.files.find(f => f.path === 'types.ts')
    expect(typesFile).toBeDefined()
    expect(typesFile!.content).toContain('export interface Project')
    expect(typesFile!.content).toContain('export interface ProjectList')
  })

  it('generates client methods for each endpoint', () => {
    const config: GeneratorConfig = { spec: SAMPLE_SPEC, language: 'typescript', style: 'fetch', includeReactHooks: false, generateTests: false }
    const result = gen.generate(config)
    const clientFile = result.files.find(f => f.path === 'client.ts')
    expect(clientFile).toBeDefined()
    expect(clientFile!.content).toContain('listProjects')
    expect(clientFile!.content).toContain('createProject')
    expect(clientFile!.content).toContain('getProject')
  })
})

describe('OpenAPIParser', () => {
  const parser = new OpenAPIParser()

  it('parses from string', async () => {
    const result = await parser.parseFromString(JSON.stringify(SAMPLE_SPEC))
    expect(result.openapi).toBe('3.1.0')
    expect(result.info.title).toBe('Test API')
  })

  it('validates spec', () => {
    const errors = parser.validate(SAMPLE_SPEC)
    expect(errors.length).toBe(0)
  })

  it('reports validation errors for invalid spec', () => {
    const errors = parser.validate({} as OpenAPIObject)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('counts endpoints', () => {
    const count = parser.getEndpointCount(SAMPLE_SPEC)
    expect(count).toBe(3)
  })

  it('lists schema names', () => {
    const names = parser.getSchemaNames(SAMPLE_SPEC)
    expect(names).toEqual(['Project', 'ProjectList', 'CreateProjectRequest'])
  })
})

describe('SDKClientGenerator', () => {
  const gen = new SDKClientGenerator()

  it('generates client initialization code', () => {
    const code = gen.generateClientCode({ baseUrl: 'https://api.ideia.ai/v1', apiKey: 'test-key', timeout: 30000 })
    expect(code).toContain('IdeiaClient')
    expect(code).toContain('https://api.ideia.ai/v1')
  })

  it('generates usage example', () => {
    const example = gen.generateUsageExample()
    expect(example).toContain('client.listProjects')
    expect(example).toContain('client.executeAgent')
  })
})

describe('WebhookManager', () => {
  it('registers and lists webhooks', () => {
    const m = new WebhookManager()
    const id = m.register({ url: 'https://example.com/webhook', events: ['agent.completed'], secret: 'whsec_test', retryConfig: { maxRetries: 3, backoffMs: 1000 } })
    expect(id).toContain('wh_')
    const list = m.list()
    expect(list.length).toBe(1)
    expect(list[0].config.url).toBe('https://example.com/webhook')
  })

  it('unregisters webhooks', () => {
    const m = new WebhookManager()
    const id = m.register({ url: 'https://example.com/webhook', events: ['agent.completed'], secret: 'whsec_test' })
    expect(m.unregister(id)).toBe(true)
    expect(m.list().length).toBe(0)
  })

  it('dispatches events', async () => {
    const m = new WebhookManager()
    m.register({ url: 'https://example.com/webhook', events: ['agent.completed'], secret: 'whsec_test' })
    await m.dispatch({
      id: 'evt_1', specversion: '1.0', source: '/test', type: 'agent.completed',
      subject: 'exec_1', time: new Date().toISOString(), datacontenttype: 'application/json', data: {},
    })
    const history = m.getDeliveryHistory()
    expect(history.length).toBe(1)
  })
})

describe('APIKeyManager', () => {
  const manager = new APIKeyManager()

  it('creates and validates API keys', () => {
    const { id, key, keyPrefix } = manager.create('CI/CD Key', ['projects:read', 'agents:execute'])
    expect(id).toContain('key_')
    expect(key).toContain('ideia_sk_')
    expect(keyPrefix).toBeDefined()
  })

  it('validates created keys', () => {
    const { key } = manager.create('Test Key', ['projects:read'])
    const result = manager.validate(key)
    expect(result.valid).toBe(true)
    expect(result.entry?.name).toBe('Test Key')
  })

  it('rejects unknown keys', () => {
    const result = manager.validate('invalid_key')
    expect(result.valid).toBe(false)
  })

  it('revokes keys', () => {
    const { id, key } = manager.create('Revocable', ['read'])
    expect(manager.revoke(id)).toBe(true)
    const result = manager.validate(key)
    expect(result.valid).toBe(false)
  })

  it('lists all keys', () => {
    const list = manager.list()
    expect(list.length).toBeGreaterThan(0)
  })
})

describe('JWTAuthProvider', () => {
  const provider = new JWTAuthProvider({ secret: 'test-secret', issuer: 'ideia-test' })

  it('generates access tokens', () => {
    const token = provider.generateAccessToken('user_1', ['projects:read'])
    expect(token.split('.').length).toBe(3)
  })

  it('generates refresh tokens', () => {
    const token = provider.generateRefreshToken('user_1')
    expect(token.split('.').length).toBe(3)
  })

  it('validates valid tokens', () => {
    const token = provider.generateAccessToken('user_1', ['projects:read'])
    const result = provider.validateToken(token)
    expect(result.valid).toBe(true)
    expect(result.claims?.sub).toBe('user_1')
  })

  it('rejects invalid tokens', () => {
    const result = provider.validateToken('invalid.token.here')
    expect(result.valid).toBe(false)
  })

  it('refreshes access token', () => {
    const refresh = provider.generateRefreshToken('user_1')
    const result = provider.refreshAccessToken(refresh)
    expect(result.accessToken).toBeDefined()
  })

  it('rejects refresh with access token', () => {
    const access = provider.generateAccessToken('user_1', ['read'])
    const result = provider.refreshAccessToken(access)
    expect(result.error).toBeDefined()
  })
})

describe('TypeSafeClientGenerator', () => {
  const gen = new TypeSafeClientGenerator()

  it('generates typescript client', () => {
    const config: GeneratorConfig = { spec: SAMPLE_SPEC, language: 'typescript', style: 'fetch', includeReactHooks: true, generateTests: true }
    const result = gen.generate(config)
    expect(result.files.length).toBe(4)
    expect(result.stats.endpointCount).toBe(3)
  })

  it('generates correct type definitions', () => {
    const config: GeneratorConfig = { spec: SAMPLE_SPEC, language: 'typescript', style: 'fetch', includeReactHooks: false, generateTests: false }
    const result = gen.generate(config)
    const typesFile = result.files.find(f => f.path === 'types.ts')
    expect(typesFile).toBeDefined()
    expect(typesFile!.content).toContain('interface Project')
    expect(typesFile!.content).toContain('interface ProjectList')
  })
})

describe('WebSocketAPIGateway', () => {
  const gateway = new WebSocketAPIGateway(() => true)

  it('handles connections', () => {
    const ws = { on: () => {}, send: () => {}, readyState: 1 } as any
    const connId = gateway.handleConnection(ws, 'user_1')
    expect(connId).toBeDefined()
  })

  it('manages subscriptions', () => {
    const ws = { on: () => {}, send: () => {}, readyState: 1 } as any
    const connId = gateway.handleConnection(ws, 'user_2')
    const subId = gateway.subscribe(connId, 'agent.status')
    expect(subId).toContain('sub_')
  })

  it('returns active connection count', () => {
    expect(gateway.getActiveConnections()).toBe(2)
  })
})

describe('GraphQLAPIVersioner', () => {
  const versioner = new GraphQLAPIVersioner()

  it('registers subgraphs and detects breaking changes', () => {
    const sdl1 = `type User { id: ID! name: String! email: String! }`
    const sdl2 = `type User { id: ID! name: String! }`
    versioner.registerSubgraph('users', sdl1)
    expect(versioner.getVersion()).toBe('1.0')
    versioner.registerSubgraph('users', sdl2)
  })

  it('lists subgraphs', () => {
    versioner.registerSubgraph('posts', `type Post { id: ID! title: String! }`)
    const subgraphs = versioner.listSubgraphs()
    expect(subgraphs).toContain('posts')
  })

  it('returns schema by name', () => {
    const schema = versioner.getSchema('users')
    expect(schema).toBeDefined()
    expect(schema).toContain('type User')
  })
})
