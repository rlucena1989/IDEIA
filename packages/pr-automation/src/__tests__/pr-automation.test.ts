import { PRPipeline } from '../pr-pipeline'
import { PRRequest } from '../types'

describe('PRPipeline', () => {
  let pipeline: PRPipeline
  const request: PRRequest = {
    id: 'pr-42',
    title: 'Add login feature',
    description: 'Implement user login with JWT',
    branch: 'feature/login',
    baseBranch: 'main',
    repository: 'ideia/core',
    author: 'agent',
    files: ['src/auth.ts', 'src/login.tsx'],
  }

  beforeEach(() => {
    pipeline = new PRPipeline()
  })

  it('should execute full PR pipeline', async () => {
    const result = await pipeline.execute(request)
    expect(result.prId).toBe('pr-42')
    expect(result.success).toBe(true)
    expect(result.status).toBe('completed')
    expect(result.durationMs).toBeGreaterThan(0)
  })

  it('should create a plan', async () => {
    const plan = await pipeline.plan(request)
    expect(plan.prId).toBe('pr-42')
    expect(plan.steps).toContain('plan')
    expect(plan.steps).toContain('merge')
  })

  it('should implement changes', async () => {
    const plan = await pipeline.plan(request)
    const changes = await pipeline.implement(request, plan)
    expect(changes.length).toBe(2)
    expect(changes[0].file).toBe('src/auth.ts')
  })

  it('should run tests', async () => {
    const plan = await pipeline.plan(request)
    const changes = await pipeline.implement(request, plan)
    const tests = await pipeline.runTests(request, changes)
    expect(tests.length).toBeGreaterThan(0)
    expect(tests[0].passed).toBe(true)
  })

  it('should review changes', async () => {
    const plan = await pipeline.plan(request)
    const changes = await pipeline.implement(request, plan)
    const review = await pipeline.review(request, changes)
    expect(review.prId).toBe('pr-42')
    expect(review.comments.length).toBeGreaterThan(0)
    expect(review.overallScore).toBeGreaterThan(0)
  })

  it('should pass merge gate when review approved', async () => {
    const plan = await pipeline.plan(request)
    const changes = await pipeline.implement(request, plan)
    const review = await pipeline.review(request, changes)
    const gate = await pipeline.mergeGate(request, review)
    expect(gate.canMerge).toBe(true)
    expect(gate.checks.length).toBe(3)
  })
})
