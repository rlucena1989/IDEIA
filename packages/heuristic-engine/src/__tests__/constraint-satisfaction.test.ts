import { ConstraintSatisfaction, createDeadlineConstraint, createResourceConstraint, Constraint } from '../constraint-satisfaction'

describe('ConstraintSatisfaction', () => {
  let cs: ConstraintSatisfaction

  beforeEach(() => { cs = new ConstraintSatisfaction() })

  it('evaluates satisfied constraints', () => {
    cs.addConstraint({ type: 'custom', name: 'test', evaluate: () => true })
    const result = cs.evaluate({})
    expect(result.satisfied).toHaveLength(1)
    expect(result.violated).toHaveLength(0)
    expect(result.score).toBe(1)
  })

  it('evaluates violated constraints', () => {
    cs.addConstraint({ type: 'custom', name: 'test', evaluate: () => false })
    const result = cs.evaluate({})
    expect(result.violated).toHaveLength(1)
    expect(result.score).toBe(0)
  })

  it('finds all solutions', () => {
    cs.addConstraint({ type: 'custom', name: 'even', evaluate: (s) => (s['x'] as number) % 2 === 0 })
    const solutions = cs.findAllSolutions([{ x: 1 }, { x: 2 }, { x: 4 }])
    expect(solutions).toHaveLength(2)
  })

  it('finds best solution', () => {
    cs.addConstraint({ type: 'custom', name: 'positive', evaluate: (s) => (s['x'] as number) > 0 })
    cs.addConstraint({ type: 'custom', name: 'small', evaluate: (s) => (s['x'] as number) < 10 })
    const best = cs.findBestSolution([{ x: -1 }, { x: 5 }, { x: 15 }])
    expect(best).not.toBeNull()
    expect(best!.state['x']).toBe(5)
    expect(best!.score).toBe(1)
  })

  it('returns empty solutions when none match', () => {
    cs.addConstraint({ type: 'custom', name: 'impossible', evaluate: () => false })
    expect(cs.findAllSolutions([{ x: 1 }, { x: 2 }])).toHaveLength(0)
  })
})

describe('createDeadlineConstraint', () => {
  it('passes when within deadline', () => {
    const c = createDeadlineConstraint('deadline', 100, 'time')
    expect(c.evaluate({ time: 50 })).toBe(true)
  })

  it('fails when over deadline', () => {
    const c = createDeadlineConstraint('deadline', 100, 'time')
    expect(c.evaluate({ time: 150 })).toBe(false)
  })
})

describe('createResourceConstraint', () => {
  it('passes when within limit', () => {
    const c = createResourceConstraint('cpu', 'cpuUsage', 80)
    expect(c.evaluate({ cpuUsage: 50 })).toBe(true)
  })

  it('fails when over limit', () => {
    const c = createResourceConstraint('cpu', 'cpuUsage', 80)
    expect(c.evaluate({ cpuUsage: 90 })).toBe(false)
  })
})
