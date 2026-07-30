import { AStarSearch, SearchNode, GraphHeuristic, DeveloperSpeedHeuristic, FileAccessCostHeuristic, SearchState } from '../astar-search'

describe('SearchNode', () => {
  it('computes total cost', () => {
    const node = new SearchNode({ taskId: '', completed: new Set(), currentAgent: 'a', elapsedTime: 0, quality: 0 }, null, null, 10, 5)
    expect(node.totalCost).toBe(15)
  })

  it('reconstructs path', () => {
    const root = new SearchNode({ taskId: '', completed: new Set(), currentAgent: 'a', elapsedTime: 0, quality: 0 })
    const child = new SearchNode({ taskId: 'task-A', completed: new Set(['task-A']), currentAgent: 'a', elapsedTime: 10, quality: 10 }, root, 'task-A')
    const path = child.reconstructPath()
    expect(path).toHaveLength(2)
  })

  it('checks goal state', () => {
    const completed = new Set(['task-A'])
    const node = new SearchNode({ taskId: 'task-A', completed, currentAgent: 'a', elapsedTime: 10, quality: 10 })
    const goal: SearchState = { taskId: '', completed, currentAgent: 'a', elapsedTime: 0, quality: 0 }
    expect(node.isGoal(goal)).toBe(true)
  })
})

describe('GraphHeuristic', () => {
  it('estimates cost using domain heuristics', () => {
    const h = new GraphHeuristic()
    h.add(new DeveloperSpeedHeuristic())
    const node = new SearchNode({ taskId: '', completed: new Set(), currentAgent: 'a', elapsedTime: 0, quality: 0 })
    const goal: SearchState = { taskId: '', completed: new Set(['task-A', 'task-B']), currentAgent: 'a', elapsedTime: 0, quality: 0 }
    expect(h.estimate(node, goal)).toBeGreaterThan(0)
  })
})

describe('AStarSearch', () => {
  let heuristic: GraphHeuristic
  let solver: AStarSearch

  beforeEach(() => {
    heuristic = new GraphHeuristic()
    heuristic.add(new DeveloperSpeedHeuristic())
    solver = new AStarSearch(heuristic)
  })

  it('finds path to goal', () => {
    const start = new SearchNode({ taskId: '', completed: new Set(), currentAgent: 'a', elapsedTime: 0, quality: 0 })
    const goal: SearchState = { taskId: '', completed: new Set(['task-A']), currentAgent: 'a', elapsedTime: 0, quality: 10 }
    const path = solver.solve(start, goal)
    expect(path.length).toBeGreaterThan(0)
  })

  it('handles empty goal', () => {
    const start = new SearchNode({ taskId: '', completed: new Set(), currentAgent: 'a', elapsedTime: 0, quality: 0 })
    const goal: SearchState = { taskId: '', completed: new Set(), currentAgent: 'a', elapsedTime: 0, quality: 0 }
    const path = solver.solve(start, goal)
    expect(path.length).toBe(1)
  })
})
