import { StudyEngine } from '../study-engine'
import * as path from 'path'
import * as fsp from 'fs/promises'

describe('StudyEngine', () => {
  const tmpDir = path.join(__dirname, '..', '..', 'tmp-test-studies')

  beforeEach(async () => {
    await fsp.mkdir(tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true })
  })

  it('creates a study with correct defaults', async () => {
    const engine = new StudyEngine({ studiesRoot: tmpDir, defaultAuthor: 'test' })
    const study = await engine.create('Test Feature', 'light', 'L', 'test-user')

    expect(study.featureName).toBe('Test Feature')
    expect(study.depth).toBe('light')
    expect(study.riskClass).toBe('L')
    expect(study.status).toBe('draft')
    expect(study.author).toBe('test-user')
    expect(study.version).toBe(1)

    const files = await fsp.readdir(path.join(tmpDir, '.registry'))
    expect(files).toContain(`${study.id}.json`)
  })

  it('adds ADR to study', async () => {
    const engine = new StudyEngine({ studiesRoot: tmpDir, defaultAuthor: 'test' })
    const study = await engine.create('ADR Test', 'full', 'M')

    const updated = await engine.addAdr(study.id, {
      id: 'ADR-001',
      title: 'Test ADR',
      status: 'Accepted',
      date: new Date().toISOString(),
      context: 'Testing context',
      decision: 'Use test',
      consequences: { positive: ['Easy testing'], negative: ['Not production'] },
      alternatives: ['Option B'],
      references: ['test.md'],
    })

    expect(updated.adrs).toHaveLength(1)
    expect(updated.adrs[0].title).toBe('Test ADR')
    expect(updated.version).toBe(2)
  })

  it('adds dependency to study', async () => {
    const engine = new StudyEngine({ studiesRoot: tmpDir, defaultAuthor: 'test' })
    const study = await engine.create('Dep Test', 'full', 'H')

    const updated = await engine.addDependency(study.id, {
      name: 'test-lib',
      type: 'library',
      required: true,
      version: '^1.0.0',
    })

    expect(updated.dependencies).toHaveLength(1)
    expect(updated.dependencies[0].name).toBe('test-lib')
  })

  it('commits a study', async () => {
    const engine = new StudyEngine({ studiesRoot: tmpDir, defaultAuthor: 'test' })
    const study = await engine.create('Commit Test', 'light', 'L')

    const committed = await engine.commit(study.id)
    expect(committed.status).toBe('committed')
  })

  it('lists studies in reverse chronological order', async () => {
    const engine = new StudyEngine({ studiesRoot: tmpDir, defaultAuthor: 'test' })
    await engine.create('First', 'light', 'L')
    await new Promise(r => setTimeout(r, 10))
    await engine.create('Second', 'full', 'H')

    const list = await engine.list()
    expect(list.length).toBeGreaterThanOrEqual(1)
    if (list.length >= 2) {
      expect(list[0].createdAt >= list[1].createdAt).toBe(true)
    }
  })
})
