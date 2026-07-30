import { BlueprintEngine } from '../src/blueprint-engine'
import { TemplateSystem } from '../src/template-system'
import { DependencyInjector } from '../src/dependency-injector'
import { ConfigGenerator } from '../src/config-generator'
import { ADRGenerator } from '../src/adr-generator'
import { BlueprintMarket } from '../src/blueprint-market'
import { LLMBlueprintGenerator } from '../src/llm-blueprint-generator'
import { BlueprintComposer } from '../src/blueprint-composer'
import { EvolutionaryBlueprintOptimizer } from '../src/evolutionary-blueprint-optimizer'
import { BlueprintDefinition, InitOptions, TemplateContext } from '../src/types'
import * as path from 'path'
import * as os from 'os'
import * as fsp from 'fs/promises'

const TEST_BLUEPRINT: BlueprintDefinition = {
  name: 'test-blueprint',
  version: '1.0.0',
  description: 'Test blueprint',
  author: 'Test',
  tags: ['test', 'node'],
  extends: [],
  variables: [{ name: 'projectName', type: 'string', required: true, description: 'Project name' }],
  structure: { 'src/index.ts': { template: 'src/index.ts.ejs' } },
  dependencies: { dependencies: { express: '^4.18.0' }, devDependencies: { typescript: '^5.3.0' }, peerDependencies: {}, optionalDependencies: {} },
  postProcess: [],
}

describe('BlueprintEngine', () => {
  let tmpDir: string
  let engine: BlueprintEngine

  beforeEach(async () => {
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'bp-test-'))
    const bpDir = path.join(tmpDir, 'test-blueprint')
    await fsp.mkdir(bpDir, { recursive: true })
    await fsp.writeFile(path.join(bpDir, 'blueprint.yaml'), JSON.stringify(TEST_BLUEPRINT), 'utf-8')
    engine = new BlueprintEngine(tmpDir)
  })

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true })
  })

  it('initializes a project', async () => {
    const result = await engine.init({ blueprint: 'test-blueprint', name: 'my-project', directory: tmpDir })
    expect(result.filesCreated).toBeGreaterThan(0)
    expect(result.duration).toBeGreaterThan(0)
  })

  it('lists blueprints', () => {
    const list = engine.list()
    expect(Array.isArray(list)).toBe(true)
  })

  it('validates blueprints', () => {
    const validation = engine.validate('/fake/path')
    expect(validation.valid).toBe(true)
  })

  it('resolves blueprints', () => {
    const resolved = engine.resolve(TEST_BLUEPRINT)
    expect(resolved.name).toBe('test-blueprint')
  })
})

describe('TemplateSystem', () => {
  const ts = new TemplateSystem()

  it('renders string templates', async () => {
    const ctx = { projectName: 'test', projectNamePascal: 'Test' } as TemplateContext
    const result = await ts.renderString('<%= projectName %>', ctx)
    expect(result).toBe('test')
  })

  it('provides helper functions', () => {
    expect(ts.helpers.pascalCase('hello-world')).toBe('HelloWorld')
    expect(ts.helpers.camelCase('hello-world')).toBe('helloWorld')
    expect(ts.helpers.kebabCase('HelloWorld')).toBe('hello-world')
    expect(ts.helpers.snakeCase('HelloWorld')).toBe('hello_world')
    expect(ts.helpers.pluralize('box')).toBe('boxes')
    expect(ts.helpers.pluralize('category')).toBe('categories')
    expect(ts.helpers.date('YYYY-MM-DD')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('DependencyInjector', () => {
  const injector = new DependencyInjector()

  it('resolves dependencies', async () => {
    const result = await injector.resolve({
      dependencies: { express: '^4.18.0' },
      devDependencies: { typescript: '^5.3.0' },
      peerDependencies: {},
      optionalDependencies: {},
    })
    expect(result.dependencies.express).toBe('^4.18.0')
    expect(result.devDependencies.typescript).toBe('^5.3.0')
    expect(result.errors).toHaveLength(0)
  })

  it('reports no errors for basic resolve', async () => {
    const result = await injector.resolve({
      dependencies: { express: '^4.18.0' },
      devDependencies: {},
      peerDependencies: {},
      optionalDependencies: {},
    })
    expect(result.errors.length).toBe(0)
  })

  it('resolves latest version', async () => {
    const version = await injector.resolveLatest('typescript')
    expect(version).toBeDefined()
  })
})

describe('ConfigGenerator', () => {
  const gen = new ConfigGenerator()
  const ctx = { projectName: 'test', projectNamePascal: 'Test' } as TemplateContext

  it('generates tsconfig', async () => {
    const configs = await gen.generate({ tsconfig: {} }, ctx)
    const tsconfig = configs.find(c => c.path === 'tsconfig.json')
    expect(tsconfig).toBeDefined()
    expect(tsconfig!.content).toContain('strict')
  })

  it('generates eslint config', async () => {
    const configs = await gen.generate({ eslint: {} }, ctx)
    expect(configs.find(c => c.path === '.eslintrc.json')).toBeDefined()
  })

  it('generates gitignore and editorconfig', async () => {
    const configs = await gen.generate({}, ctx)
    expect(configs.find(c => c.path === '.gitignore')).toBeDefined()
    expect(configs.find(c => c.path === '.editorconfig')).toBeDefined()
  })
})

describe('ADRGenerator', () => {
  const gen = new ADRGenerator()
  const ctx = { projectName: 'test', projectNamePascal: 'Test' } as TemplateContext

  it('generates default ADRs', async () => {
    const adrs = await gen.generate(TEST_BLUEPRINT, ctx)
    expect(adrs.length).toBeGreaterThanOrEqual(4)
    expect(adrs[0].path).toContain('adr/')
    expect(adrs[0].content).toContain('ADR-0001')
  })
})

describe('BlueprintMarket', () => {
  const market = new BlueprintMarket('https://registry.ideia.dev')

  it('publishes blueprint', async () => {
    const result = await market.publish(TEST_BLUEPRINT)
    expect(result.success).toBe(true)
  })

  it('searches blueprints', async () => {
    const results = await market.search('nestjs')
    expect(Array.isArray(results)).toBe(true)
  })
})

describe('LLMBlueprintGenerator', () => {
  const gen = new LLMBlueprintGenerator()

  it('generates from description', async () => {
    const bp = await gen.generateFromDescription('REST API with Node.js and PostgreSQL')
    expect(bp.name).toBeDefined()
    expect(bp.description).toContain('REST API')
  })

  it('evolves blueprint based on feedback', async () => {
    const evolved = await gen.evolveBlueprint(TEST_BLUEPRINT, 'Add authentication support')
    expect(evolved.version).toBe('1.1.0')
  })
})

describe('BlueprintComposer', () => {
  const composer = new BlueprintComposer()

  it('composes multiple blueprints', () => {
    const bp2: BlueprintDefinition = { ...TEST_BLUEPRINT, name: 'bp2', tags: ['additional'], dependencies: { dependencies: { axios: '^1.6.0' }, devDependencies: {}, peerDependencies: {}, optionalDependencies: {} } }
    const result = composer.compose([TEST_BLUEPRINT, bp2])
    expect(result.blueprint.name).toContain('composed')
    expect(result.mergedFrom.length).toBe(2)
    expect(result.blueprint.dependencies.dependencies.axios).toBe('^1.6.0')
  })

  it('throws on empty composition', () => {
    expect(() => composer.compose([])).toThrow()
  })
})

describe('EvolutionaryBlueprintOptimizer', () => {
  const optimizer = new EvolutionaryBlueprintOptimizer()

  it('optimizes a blueprint', async () => {
    const result = await optimizer.optimize(TEST_BLUEPRINT)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(Array.isArray(result.improvements)).toBe(true)
  })

  it('adds missing author', async () => {
    const bp = { ...TEST_BLUEPRINT, author: '' }
    const result = await optimizer.optimize(bp)
    expect(result.blueprint.author).toBe('IDEIA')
  })
})
