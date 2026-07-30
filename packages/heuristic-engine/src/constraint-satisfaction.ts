export interface Constraint {
  type: 'deadline' | 'dependency' | 'resource' | 'quality' | 'custom'
  name: string
  evaluate(state: Record<string, unknown>): boolean
  weight?: number
}

export class ConstraintSatisfaction {
  private _constraints: Constraint[] = []

  addConstraint(constraint: Constraint): void {
    this._constraints.push(constraint)
  }

  addConstraints(constraints: Constraint[]): void {
    this._constraints.push(...constraints)
  }

  evaluate(state: Record<string, unknown>): { satisfied: Constraint[]; violated: Constraint[]; score: number } {
    const satisfied: Constraint[] = []
    const violated: Constraint[] = []
    for (const c of this._constraints) {
      if (c.evaluate(state)) satisfied.push(c)
      else violated.push(c)
    }
    const total = this._constraints.length
    const score = total > 0 ? satisfied.length / total : 1
    return { satisfied, violated, score }
  }

  findAllSolutions(initialStates: Record<string, unknown>[], maxSolutions = 10): Record<string, unknown>[] {
    const solutions: Record<string, unknown>[] = []
    for (const state of initialStates) {
      if (solutions.length >= maxSolutions) break
      const result = this.evaluate(state)
      if (result.violated.length === 0) {
        solutions.push(state)
      }
    }
    return solutions
  }

  findBestSolution(initialStates: Record<string, unknown>[]): { state: Record<string, unknown>; score: number } | null {
    let best: { state: Record<string, unknown>; score: number } | null = null
    for (const state of initialStates) {
      const result = this.evaluate(state)
      if (!best || result.score > best.score) {
        best = { state, score: result.score }
      }
    }
    return best
  }

  getConstraints(): Constraint[] {
    return [...this._constraints]
  }

  clear(): void {
    this._constraints = []
  }
}

export function createDeadlineConstraint(name: string, maxTimeMs: number, timeField: string): Constraint {
  return {
    type: 'deadline',
    name,
    evaluate: (state) => {
      const elapsed = state[timeField] as number | undefined
      return elapsed !== undefined && elapsed <= maxTimeMs
    },
  }
}

export function createResourceConstraint(name: string, resourceField: string, maxValue: number): Constraint {
  return {
    type: 'resource',
    name,
    evaluate: (state) => {
      const value = state[resourceField] as number | undefined
      return value !== undefined && value <= maxValue
    },
  }
}
