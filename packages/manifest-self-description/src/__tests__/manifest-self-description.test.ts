import * as fsp from 'fs/promises'
import * as path from 'path'
import { ManifestGenerator } from '../generator'
import { ManifestValidator } from '../validator'
import { ManifestResolver } from '../resolver'
import { ManifestStore } from '../store'
import { ContextEnricher } from '../enricher'
import { SelfDescriptionAPI } from '../api'
import { CodeScanner } from '../scanner'
import { Manifest, DescriptionLevel, AutonomyLevel } from '../types'

function createTestManifest(): Manifest {
  const now = new Date().toISOString()
  return {
    id: 'test-platform',
    version: '1.0.0',
    platformVersion: '0.5.0',
    generatedAt: now,
    generatorVersion: '1.0.0',
    name: 'IDEIA',
    description: 'Test platform',
    architecture: {
      pattern: 'Clean Architecture',
      layers: [{ id: 'test', name: 'Test', description: 'Test layer', packages: ['packages/test'] }],
      messageBus: { type: 'event-driven', implementation: 'NATS', patterns: ['pub/sub'] },
      extensibility: { pluginSystem: true, mcpSupport: true, adapterArchitecture: true },
    },
    agents: [
      { id: 'agent1', name: 'Agent1', role: 'Test agent', capabilities: ['test'], autonomyLevel: 'N1' as AutonomyLevel, tools: ['read'] },
      { id: 'agent2', name: 'Agent2', role: 'Test agent 2', capabilities: ['test2'], autonomyLevel: 'N2' as AutonomyLevel, tools: ['write'] },
      { id: 'agent3', name: 'Agent3', role: 'Test agent 3', capabilities: ['test3'], autonomyLevel: 'N1' as AutonomyLevel },
      { id: 'agent4', name: 'Agent4', role: 'Test agent 4', capabilities: ['test4'], autonomyLevel: 'N2' as AutonomyLevel },
      { id: 'agent5', name: 'Agent5', role: 'Test agent 5', capabilities: ['test5'], autonomyLevel: 'N1' as AutonomyLevel },
      { id: 'agent6', name: 'Agent6', role: 'Test agent 6', capabilities: ['test6'], autonomyLevel: 'N2' as AutonomyLevel },
    ],
    capabilities: [{ id: 'cap-test', name: 'Test', description: 'Test capability', category: 'test', riskLevel: 'low' }],
    tools: [{ id: 'read', name: 'read', description: 'Read tool', parameters: { path: { type: 'string', description: 'file path', required: true } }, dangerous: false }],
    commands: [{ path: 'test cmd', description: 'Test command', category: 'test' }],
    contextPacks: [
      { level: 'summary' as DescriptionLevel, tokenBudget: 500, sections: [{ id: 'identity', name: 'Identity', maxTokens: 100 }] },
      { level: 'full' as DescriptionLevel, tokenBudget: 4000, sections: [{ id: 'agents', name: 'Agents', maxTokens: 500 }] },
    ],
    registries: { schemas: [], events: [], contracts: [] },
    adapters: [{ id: 'adapter-ts', language: 'TypeScript', status: 'stable' as const, capabilities: ['generation'] }],
    workflows: [{ id: 'wf-test', name: 'Test Workflow', steps: [{ id: 'step1', agent: 'agent1', action: 'test', timeout: 1000 }] }],
    limitations: {
      notImplemented: ['NATS nativo'],
      experimental: ['Self-Opt'],
      deprecated: [],
      maxContextWindow: 128000,
      maxTokens: 4096,
      supportedModels: ['ollama/*'],
    },
  }
}

async function setupManifestStore(storePath?: string): Promise<ManifestStore> {
  const store = new ManifestStore(storePath)
  const manifest = createTestManifest()
  await store.write(manifest)
  return store
}

describe('ManifestGenerator', () => {
  let generator: ManifestGenerator

  beforeEach(() => {
    generator = new ManifestGenerator()
  })

  it('should generate a manifest from scan', async () => {
    const scan = {
      packages: ['cli', 'logger'],
      interfaces: [],
      endpoints: [],
      commands: ['command-list.ts'],
      agents: [],
      events: [],
      tools: [],
      adapters: [],
    }
    const manifest = await generator.generateFromScan(scan)
    expect(manifest).toBeDefined()
    expect(manifest.id).toBe('ideia-platform')
    expect(manifest.version).toBe('1.0.0')
    expect(manifest.agents.length).toBe(6)
    expect(manifest.tools.length).toBe(3)
    expect(manifest.commands.length).toBe(5)
    expect(manifest.architecture.layers.length).toBe(10)
  })

  it('should include all required sections', async () => {
    const scan = { packages: [], interfaces: [], endpoints: [], commands: [], agents: [], events: [], tools: [], adapters: [] }
    const manifest = await generator.generateFromScan(scan)
    expect(manifest.architecture).toBeDefined()
    expect(manifest.agents).toBeDefined()
    expect(manifest.capabilities).toBeDefined()
    expect(manifest.tools).toBeDefined()
    expect(manifest.commands).toBeDefined()
    expect(manifest.contextPacks).toBeDefined()
    expect(manifest.registries).toBeDefined()
    expect(manifest.adapters).toBeDefined()
    expect(manifest.workflows).toBeDefined()
    expect(manifest.limitations).toBeDefined()
  })
})

describe('ManifestValidator', () => {
  let validator: ManifestValidator

  beforeEach(() => {
    validator = new ManifestValidator()
  })

  it('should validate a valid manifest', () => {
    const manifest = {
      id: 'test',
      version: '1.0.0',
      name: 'test',
      description: 'test',
      architecture: { pattern: 'test', layers: [], messageBus: { type: 'test', implementation: 'test', patterns: [] }, extensibility: { pluginSystem: false, mcpSupport: false, adapterArchitecture: false } },
      agents: [],
      capabilities: [],
      tools: [],
      commands: [],
      contextPacks: [],
      registries: { schemas: [], events: [], contracts: [] },
      adapters: [],
      workflows: [],
      limitations: { notImplemented: [], experimental: [], deprecated: [], maxContextWindow: 128000, maxTokens: 4096, supportedModels: [] },
    }
    const result = validator.validate(manifest)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject manifest missing required fields', () => {
    const result = validator.validate({})
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should warn on description too long', () => {
    const manifest = {
      id: 'test',
      version: '1.0.0',
      name: 'test',
      description: 'x'.repeat(2001),
      architecture: { pattern: 'test', layers: [], messageBus: { type: 'test', implementation: 'test', patterns: [] }, extensibility: { pluginSystem: false, mcpSupport: false, adapterArchitecture: false } },
      agents: [],
      capabilities: [],
      tools: [],
      commands: [],
      contextPacks: [],
      registries: { schemas: [], events: [], contracts: [] },
      adapters: [],
      workflows: [],
      limitations: { notImplemented: [], experimental: [], deprecated: [], maxContextWindow: 128000, maxTokens: 4096, supportedModels: [] },
    }
    const result = validator.validate(manifest)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('should validate against reality', () => {
    const manifest = {
      id: 'test',
      version: '1.0.0',
      platformVersion: '0.5.0',
      generatedAt: new Date().toISOString(),
      generatorVersion: '1.0.0',
      name: 'IDEIA',
      description: 'test',
      architecture: { pattern: 'test', layers: [], messageBus: { type: 'test', implementation: 'test', patterns: [] }, extensibility: { pluginSystem: false, mcpSupport: false, adapterArchitecture: false } },
      agents: [],
      capabilities: [],
      tools: [],
      commands: [],
      contextPacks: [],
      registries: { schemas: [], events: [], contracts: [] },
      adapters: [],
      workflows: [],
      limitations: { notImplemented: [], experimental: [], deprecated: [], maxContextWindow: 64000, maxTokens: 4096, supportedModels: [] },
    }
    const result = validator.validateAgainstReality(manifest)
    expect(result.valid).toBe(false)
    expect(result.missing.length).toBeGreaterThan(0)
  })
})

describe('ManifestResolver', () => {
  let resolver: ManifestResolver
  let mockStore: ManifestStore

  beforeEach(() => {
    mockStore = new ManifestStore()
    resolver = new ManifestResolver(mockStore)
  })

  it('should throw when no manifest exists', async () => {
    await expect(resolver.resolve({ all: true })).rejects.toThrow('No manifest found')
  })
})

describe('ContextEnricher', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = path.join(require('os').tmpdir(), `manifest-test-${Date.now()}`)
  })

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('should produce summary level output', async () => {
    const store = await setupManifestStore(path.join(tmpDir, 'summary.yaml'))
    const resolver = new ManifestResolver(store)
    const enricher = new ContextEnricher(resolver)
    const result = await enricher.enrich('summary', 'api')
    expect(result).toContain('IDEIA')
    expect(result).toContain('Platform -- Summary')
  })

  it('should produce full level output', async () => {
    const store = await setupManifestStore(path.join(tmpDir, 'full.yaml'))
    const resolver = new ManifestResolver(store)
    const enricher = new ContextEnricher(resolver)
    const result = await enricher.enrich('full', 'api')
    expect(result).toContain('Full Description')
    expect(result).toContain('Agents')
  })

  it('should produce detailed level output', async () => {
    const store = await setupManifestStore(path.join(tmpDir, 'detailed.yaml'))
    const resolver = new ManifestResolver(store)
    const enricher = new ContextEnricher(resolver)
    const result = await enricher.enrich('detailed', 'api')
    expect(result).toContain('Capabilities')
    expect(result).toContain('Workflows')
  })

  it('should enrich a system prompt', async () => {
    const store = await setupManifestStore(path.join(tmpDir, 'prompt.yaml'))
    const resolver = new ManifestResolver(store)
    const enricher = new ContextEnricher(resolver)
    const result = await enricher.enrichSystemPrompt('You are an IDEIA agent.', 'summary')
    expect(result).toContain('You are an IDEIA agent.')
    expect(result).toContain('IDEIA Platform Context')
  })
})

describe('SelfDescriptionAPI', () => {
  let api: SelfDescriptionAPI
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = path.join(require('os').tmpdir(), `manifest-api-test-${Date.now()}`)
    const store = await setupManifestStore(path.join(tmpDir, 'manifest.yaml'))
    const resolver = new ManifestResolver(store)
    const enricher = new ContextEnricher(resolver)
    api = new SelfDescriptionAPI(resolver, enricher)
  })

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('should return full manifest', async () => {
    const response = await api.getFull()
    expect(response.status).toBe('ok')
    expect(response.data).toBeDefined()
  })

  it('should return agents', async () => {
    const response = await api.getAgents()
    expect(response.status).toBe('ok')
    const agents = response.data as Array<{ id: string }>
    expect(agents.length).toBe(6)
  })

  it('should return capabilities', async () => {
    const response = await api.getCapabilities()
    expect(response.status).toBe('ok')
  })

  it('should return commands', async () => {
    const response = await api.getCommands()
    expect(response.status).toBe('ok')
  })

  it('should return context pack by level', async () => {
    const response = await api.getContextPack('summary')
    expect(response.status).toBe('ok')
  })

  it('should return health', async () => {
    const response = await api.getHealth()
    expect(response.status).toBe('ok')
  })
})

describe('CodeScanner', () => {
  let scanner: CodeScanner

  beforeEach(() => {
    scanner = new CodeScanner()
  })

  it('should scan packages directory', async () => {
    const result = await scanner.scan()
    expect(result.packages).toBeDefined()
    expect(Array.isArray(result.packages)).toBe(true)
  })
})
