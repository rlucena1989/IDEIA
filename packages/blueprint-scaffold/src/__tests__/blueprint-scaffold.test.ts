import * as path from 'path'
import * as fsp from 'fs/promises'
import { BlueprintParser } from '../blueprint-parser'
import { TemplateRenderer } from '../template-renderer'
import { DependencyInjector } from '../dependency-injector'
import { ConfigGenerator } from '../config-generator'
import { ContractGenerator } from '../contract-generator'
import { ADRGenerator } from '../adr-generator'
import { PipelineExecutor } from '../pipeline-executor'
import { BlueprintLibrary } from '../blueprint-library'
import { Blueprint, ScaffoldContext } from '../types'

describe('BlueprintParser', () => {
  it('should parse a valid blueprint from string', async () => {
    const parser = new BlueprintParser()
    const content = JSON.stringify({
      name: 'test-bp',
      version: '1.0.0',
      description: 'Test blueprint',
      structure: { directories: ['src'], files: [{ path: 'src/index.ts', content: '// test' }] },
    })
    const bp = await parser.parseFromString(content)
    expect(bp.name).toBe('test-bp')
    expect(bp.structure.directories).toContain('src')
  })

  it('should reject missing fields', async () => {
    const parser = new BlueprintParser()
    await expect(parser.parseFromString('{}')).rejects.toThrow('missing')
  })
})

describe('TemplateRenderer', () => {
  it('should replace variables in templates', () => {
    const renderer = new TemplateRenderer()
    const context: ScaffoldContext = {
      projectName: 'my-app',
      projectDescription: 'My app description',
      variables: { port: 3000 },
      outputDir: '/tmp',
    }
    const result = renderer.render('Project: {{projectName}}, Description: {{projectDescription}}, Port: {{port}}', context)
    expect(result).toContain('my-app')
    expect(result).toContain('My app description')
    expect(result).toContain('3000')
  })

  it('should convert case formats', () => {
    const renderer = new TemplateRenderer()
    const context: ScaffoldContext = {
      projectName: 'my-app',
      projectDescription: 'desc',
      variables: {},
      outputDir: '/tmp',
    }
    const result = renderer.render('{{pascalCase}} {{camelCase}} {{kebabCase}} {{snakeCase}}', context)
    expect(result).toBe('MyApp myApp my-app my_app')
  })
})

describe('DependencyInjector', () => {
  it('should resolve npm dependencies', () => {
    const injector = new DependencyInjector()
    const deps = [
      { name: 'express', version: '^4.18', type: 'npm' as const },
      { name: 'typescript', version: '^5.3', type: 'npm' as const, dev: true },
    ]
    const pkg = injector.generatePackageJson({ name: 'test', version: '1.0.0' }, deps)
    const parsed = JSON.parse(pkg)
    expect(parsed.dependencies.express).toBe('^4.18')
    expect(parsed.devDependencies.typescript).toBe('^5.3')
  })
})

describe('ConfigGenerator', () => {
  it('should generate tsconfig', () => {
    const gen = new ConfigGenerator()
    const ctx: ScaffoldContext = { projectName: 'test', projectDescription: 'desc', variables: {}, outputDir: '/tmp' }
    const tsconfig = gen.generateTsconfig(ctx)
    expect(tsconfig).toContain('ES2022')
    expect(tsconfig).toContain('strict')
  })

  it('should generate gitignore', () => {
    const gen = new ConfigGenerator()
    const gitignore = gen.generateGitignore()
    expect(gitignore).toContain('node_modules')
  })
})

describe('ContractGenerator', () => {
  it('should generate an interface', () => {
    const gen = new ContractGenerator()
    const result = gen.generate({
      name: 'User Contract',
      description: 'User entity contract',
      type: 'interface',
      fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string', required: true },
      ],
    })
    expect(result).toContain('interface')
    expect(result).toContain('UserContract')
    expect(result).toContain('id: string')
  })

  it('should generate a zod schema', () => {
    const gen = new ContractGenerator()
    const result = gen.generate({
      name: 'User Schema',
      description: 'User validation schema',
      type: 'schema',
      fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'age', type: 'number', required: false },
      ],
    })
    expect(result).toContain('z.object')
    expect(result).toContain('z.string()')
    expect(result).toContain('z.number().optional()')
  })
})

describe('ADRGenerator', () => {
  it('should generate an ADR markdown', () => {
    const gen = new ADRGenerator()
    const ctx: ScaffoldContext = { projectName: 'TestProj', projectDescription: 'desc', variables: {}, outputDir: '/tmp' }
    const result = gen.generate({
      title: 'Use Clean Architecture',
      context: 'Need maintainability',
      decision: 'Use Clean Architecture',
      consequences: ['Better testability'],
      status: 'Accepted',
    }, ctx)
    expect(result).toContain('ADR: Use Clean Architecture')
    expect(result).toContain('TestProj')
    expect(result).toContain('Clean Architecture')
  })
})

describe('BlueprintLibrary', () => {
  it('should have default blueprints', () => {
    const lib = new BlueprintLibrary()
    const all = lib.getAll()
    expect(all.length).toBeGreaterThan(0)
    expect(all.some(bp => bp.name === 'node-api')).toBe(true)
  })

  it('should register new blueprints', () => {
    const lib = new BlueprintLibrary([])
    lib.register({
      name: 'custom',
      version: '1.0.0',
      description: 'Custom',
      structure: { directories: [], files: [] },
    })
    expect(lib.get('custom')).toBeDefined()
  })

  it('should search blueprints', () => {
    const lib = new BlueprintLibrary()
    const results = lib.search('react')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(r => r.name === 'react-app')).toBe(true)
  })
})

describe('PipelineExecutor', () => {
  let tmpDir: string
  let executor: PipelineExecutor

  beforeEach(() => {
    tmpDir = path.join(require('os').tmpdir(), `bp-test-${Date.now()}`)
    executor = new PipelineExecutor()
  })

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('should execute blueprint scaffolding', async () => {
    const blueprint: Blueprint = {
      name: 'test',
      version: '1.0.0',
      description: 'Test',
      structure: {
        directories: ['src', 'src/components', 'tests'],
        files: [
          { path: 'src/index.ts', content: '// main entry' },
          { path: 'README.md', content: '# {{projectName}}' },
        ],
      },
      contracts: [
        { name: 'User', description: 'User entity', type: 'interface', fields: [{ name: 'id', type: 'string', required: true }] },
      ],
      postProcess: ['npm install'],
    }

    const context: ScaffoldContext = {
      projectName: 'test-app',
      projectDescription: 'Test application',
      variables: {},
      outputDir: tmpDir,
    }

    const result = await executor.execute(blueprint, context)
    expect(result.success).toBe(true)
    expect(result.directoriesCreated.length).toBe(3)
    expect(result.filesCreated.length).toBeGreaterThanOrEqual(2)
    expect(result.contractsGenerated).toBe(1)

    const readmePath = path.join(tmpDir, 'README.md')
    const content = await fsp.readFile(readmePath, 'utf-8')
    expect(content).toContain('test-app')
  })
})
