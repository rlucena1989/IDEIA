import { SpecDrivenDevelopment, createSpecDrivenDevelopment } from '../src/spec-integration'
import { SpecGenerator } from '../src/spec-generator'
import { SteeringFileManager } from '../src/steering-file-manager'
import { HookEngine } from '../src/hook-engine'

describe('SpecDrivenDevelopment', () => {
  let sdd: SpecDrivenDevelopment

  beforeEach(() => {
    sdd = createSpecDrivenDevelopment({ projectRoot: '/tmp/test-project' })
  })

  it('should create instance', () => {
    expect(sdd).toBeInstanceOf(SpecDrivenDevelopment)
  })

  it('should initialize and load steering files', async () => {
    await sdd.initialize()
    expect(sdd.getSteeringFileManager()).toBeInstanceOf(SteeringFileManager)
    expect(sdd.getHookEngine()).toBeInstanceOf(HookEngine)
  })

  it('should generate a spec', async () => {
    const spec = await sdd.generateSpec({
      title: 'Test Feature',
      intention: 'Implement a test feature',
      context: { projectType: 'library', language: 'TypeScript' },
    })
    expect(spec.id).toBeTruthy()
    expect(spec.title).toBe('Test Feature')
    expect(spec.status).toBe('draft')
    expect(spec.tasks.length).toBeGreaterThan(0)
    expect(spec.requirements.length).toBeGreaterThan(0)
  })

  it('should execute spec without runtime connection', async () => {
    const spec = await sdd.generateSpec({
      title: 'Auto-Execute Test',
      intention: 'Test auto-execution',
      context: { projectType: 'app', language: 'TypeScript' },
    })
    const result = await sdd.executeSpec(spec)
    expect(result).toBe(true)
    expect(spec.status).toBe('done')
  })

  it('should verify tool use without spec', async () => {
    const result = await sdd.verifyToolUse('write', '/tmp/test.ts')
    expect(result.allowed).toBe(true)
  })

  it('should handle task completion', async () => {
    await sdd.initialize()
    const spec = await sdd.generateSpec({
      title: 'Task Test',
      intention: 'Test task tracking',
      context: { projectType: 'lib', language: 'TypeScript' },
    })
    await sdd.onTaskComplete(spec.tasks[0].id, true)
    const updated = sdd.getCurrentSpec()
    expect(updated?.tasks[0].status).toBe('done')
  })

  it('should handle session end', async () => {
    await sdd.initialize()
    const spec = await sdd.generateSpec({
      title: 'Session Test',
      intention: 'Test end of session',
      context: { projectType: 'lib', language: 'TypeScript' },
    })
    const result = await sdd.onSessionEnd()
    expect(result.summary).toBeTruthy()
    expect(Array.isArray(result.remainingTasks)).toBe(true)
  })

  it('should return steering context', async () => {
    await sdd.initialize()
    const context = sdd.getSteeringContext()
    expect(context).toContain('Steering Context')
  })

  it('should report runtime connection status', () => {
    expect(sdd.hasRuntimeConnection()).toBe(false)
  })
})

describe('SpecGenerator', () => {
  let generator: SpecGenerator

  beforeEach(() => {
    generator = new SpecGenerator()
  })

  it('should generate spec with requirements', () => {
    const spec = generator.generate({
      title: 'My Feature',
      intention: 'Build something',
      context: { projectType: 'web', language: 'TypeScript', constraints: ['Must be fast', 'Must be secure'] },
    })
    expect(spec.requirements.length).toBe(3)
    expect(spec.requirements[1].description).toContain('Must be fast')
    expect(spec.tasks.length).toBe(3)
    expect(spec.acceptanceCriteria.length).toBe(1)
  })
})

describe('SteeringFileManager', () => {
  let manager: SteeringFileManager

  beforeEach(() => {
    manager = new SteeringFileManager()
  })

  it('should register and retrieve steering files', () => {
    manager.register({
      path: 'CONVENTIONS.md',
      mode: 'always',
      content: '# Conventions\n- Use TypeScript',
      description: 'Project conventions',
    })
    expect(manager.getAll().length).toBe(1)
    expect(manager.getByMode('always').length).toBe(1)
  })

  it('should match files by pattern', () => {
    manager.register({
      path: 'src/**/*.ts',
      mode: 'fileMatch',
      fileMatch: ['src/**/*.ts'],
      content: 'TypeScript rules',
      description: 'TS files',
    })
    const matched = manager.getForFileContext('src/app.ts')
    expect(matched.length).toBe(1)
    const noMatch = manager.getForFileContext('test.py')
    expect(noMatch.length).toBe(0)
  })

  it('should always return always-mode files', () => {
    manager.register({
      path: 'AGENTS.md',
      mode: 'always',
      content: '# Always',
      description: 'Always active',
    })
    const matched = manager.getForFileContext('random.py')
    expect(matched.length).toBe(1)
  })
})

describe('HookEngine', () => {
  let engine: HookEngine

  beforeEach(() => {
    engine = new HookEngine()
  })

  it('should register hooks', () => {
    engine.register({
      name: 'test-hook',
      description: 'Test hook',
      when: { event: 'preToolUse' },
      then: { action: 'runCommand', command: 'echo test' },
      enabled: true,
    })
    expect(engine.getAll().length).toBe(1)
  })

  it('should fire hooks and get results', async () => {
    engine.on('runCommand', async (hook, ctx) => ({
      passed: true,
      message: `Running: ${hook.then.command}`,
      durationMs: 0,
    }))

    engine.register({
      name: 'cmd-hook',
      description: 'Command hook',
      when: { event: 'fileSaved' },
      then: { action: 'runCommand', command: 'npm test' },
      enabled: true,
    })

    const results = await engine.fire('fileSaved', {
      event: 'fileSaved',
      projectPath: '/tmp',
      metadata: {},
    })

    expect(results.length).toBe(1)
    expect(results[0].passed).toBe(true)
  })

  it('should respect disabled hooks', async () => {
    engine.register({
      name: 'disabled-hook',
      description: 'Should not fire',
      when: { event: 'preToolUse' },
      then: { action: 'runTests' },
      enabled: false,
    })
    const results = await engine.fire('preToolUse', {
      event: 'preToolUse',
      projectPath: '/tmp',
      metadata: {},
    })
    expect(results.length).toBe(0)
  })

  it('should filter by tool type', async () => {
    engine.on('runTests', async (_hook, _ctx) => ({
      passed: true,
      message: 'Tests run',
      durationMs: 0,
    }))

    engine.register({
      name: 'tool-hook',
      description: 'Write-only hook',
      when: { event: 'preToolUse', toolTypes: ['write'] },
      then: { action: 'runTests' },
      enabled: true,
    })
    const writeResult = await engine.fire('preToolUse', {
      event: 'preToolUse',
      toolType: 'write',
      projectPath: '/tmp',
      metadata: {},
    })
    expect(writeResult.length).toBe(1)

    const readResult = await engine.fire('preToolUse', {
      event: 'preToolUse',
      toolType: 'read',
      projectPath: '/tmp',
      metadata: {},
    })
    expect(readResult.length).toBe(0)
  })
})
