export interface SearchState {
  taskId: string
  completed: Set<string>
  currentAgent: string
  elapsedTime: number
  quality: number
}

export class SearchNode {
  constructor(
    public state: SearchState,
    public parent: SearchNode | null = null,
    public action: string | null = null,
    public pathCost: number = 0,
    public heuristicCost: number = 0,
  ) {}

  get totalCost(): number {
    return this.pathCost + this.heuristicCost
  }

  reconstructPath(): SearchNode[] {
    const path: SearchNode[] = []
    let current: SearchNode | null = this
    while (current) {
      path.unshift(current)
      current = current.parent
    }
    return path
  }

  isGoal(goalState: SearchState): boolean {
    if (this.state.completed.size !== goalState.completed.size) return false
    for (const item of goalState.completed) {
      if (!this.state.completed.has(item)) return false
    }
    return true
  }
}

export interface DomainHeuristic {
  name: string
  estimate(node: SearchNode, goal: SearchState): number
  weight: number
}

export class DeveloperSpeedHeuristic implements DomainHeuristic {
  name = 'developerSpeed'
  weight = 0.3

  estimate(node: SearchNode, goal: SearchState): number {
    const remaining = goal.completed.size - node.state.completed.size
    return remaining * 15
  }
}

export class FileAccessCostHeuristic implements DomainHeuristic {
  name = 'fileAccessCost'
  weight = 0.25

  estimate(node: SearchNode, goal: SearchState): number {
    const unvisited = [...goal.completed].filter(t => !node.state.completed.has(t))
    return unvisited.length * 5
  }
}

export class GraphHeuristic {
  private _heuristics: DomainHeuristic[] = []

  add(h: DomainHeuristic): void {
    this._heuristics.push(h)
  }

  estimate(node: SearchNode, goal: SearchState): number {
    let total = 0
    let totalWeight = 0
    for (const h of this._heuristics) {
      total += h.estimate(node, goal) * h.weight
      totalWeight += h.weight
    }
    return totalWeight > 0 ? total / totalWeight : 0
  }
}

export class AStarSearch {
  constructor(
    private _heuristic: GraphHeuristic,
    private _maxNodes: number = 10000,
  ) {}

  solve(start: SearchNode, goal: SearchState): SearchNode[] {
    const openSet: SearchNode[] = [start]
    const closedSet = new Set<string>()
    let nodesExpanded = 0

    while (openSet.length > 0 && nodesExpanded < this._maxNodes) {
      openSet.sort((a, b) => a.totalCost - b.totalCost)
      const current = openSet.shift()!

      if (current.isGoal(goal)) return current.reconstructPath()

      const key = JSON.stringify([...current.state.completed].sort())
      if (closedSet.has(key)) continue
      closedSet.add(key)
      nodesExpanded++

      const successors = this._expand(current)
      for (const succ of successors) {
        const skey = JSON.stringify([...succ.state.completed].sort())
        if (!closedSet.has(skey)) {
          succ.heuristicCost = this._heuristic.estimate(succ, goal)
          openSet.push(succ)
        }
      }
    }
    return []
  }

  private _expand(node: SearchNode): SearchNode[] {
    const successors: SearchNode[] = []
    const completed = node.state.completed
    const allTasks = ['task-A', 'task-B', 'task-C', 'task-D', 'task-E']
    const remaining = allTasks.filter(t => !completed.has(t))

    for (const task of remaining) {
      const newCompleted = new Set(completed)
      newCompleted.add(task)
      const cost = this._getTaskCost(task)

      const newState: SearchState = {
        taskId: task, completed: newCompleted, currentAgent: node.state.currentAgent,
        elapsedTime: node.state.elapsedTime + cost, quality: node.state.quality + 10,
      }
      successors.push(new SearchNode(newState, node, task, node.pathCost + cost, 0))
    }
    return successors
  }

  private _getTaskCost(task: string): number {
    const costs: Record<string, number> = { 'task-A': 10, 'task-B': 20, 'task-C': 15, 'task-D': 25, 'task-E': 5 }
    return costs[task] ?? 10
  }
}
