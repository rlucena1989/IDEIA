import { createLogger } from '@ideia/logger'
import { Requirement, DependencyEdge, ImpactReport, CycleReport, ConflictReport, ConflictReport as ConflictReportType } from './types'

const logger = createLogger('requirement-graph')

export class RequirementGraph {
  private edges: DependencyEdge[] = []

  addEdge(edge: DependencyEdge): void {
    this.edges.push(edge)
  }

  getEdges(): DependencyEdge[] {
    return [...this.edges]
  }

  getDependents(id: string): string[] {
    return this.edges.filter(e => e.to === id).map(e => e.from)
  }

  getDependencies(id: string): string[] {
    return this.edges.filter(e => e.from === id).map(e => e.to)
  }

  detectCycles(): CycleReport {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const cycle: string[] = []

    const dfs = (node: string): boolean => {
      if (recursionStack.has(node)) {
        cycle.push(node)
        return true
      }
      if (visited.has(node)) return false
      visited.add(node)
      recursionStack.add(node)
      const neighbors = this.getDependencies(node)
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) {
          cycle.push(node)
          return true
        }
      }
      recursionStack.delete(node)
      return false
    }

    const nodes = new Set(this.edges.flatMap(e => [e.from, e.to]))
    for (const node of nodes) {
      if (!visited.has(node)) {
        if (dfs(node)) {
          return { hasCycle: true, cycle: cycle.reverse() }
        }
      }
    }
    return { hasCycle: false }
  }

  analyzeImpact(id: string): ImpactReport {
    const affected: string[] = []
    const queue = [id]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      const dependents = this.getDependents(current)
      for (const dep of dependents) {
        if (!visited.has(dep)) {
          affected.push(dep)
          queue.push(dep)
        }
      }
    }

    return {
      requirementId: id,
      affected,
      severity: affected.length > 5 ? 'high' as const : affected.length > 2 ? 'medium' as const : 'low' as const,
      suggestedAction: affected.length === 0 ? 'Safe to change' : `Review ${affected.length} dependent requirements`,
    }
  }
}

export class ConflictDetector {
  detectConflicts(requirements: Requirement[], edges: DependencyEdge[]): ConflictReportType {
    const conflicts: ConflictReportType['conflicts'] = []

    for (const edge of edges) {
      if (edge.type === 'conflicts') {
        const reqA = requirements.find(r => r.id === edge.from)
        const reqB = requirements.find(r => r.id === edge.to)
        if (reqA && reqB) {
          conflicts.push({
            a: reqA.id,
            b: reqB.id,
            reason: `Conflict between ${reqA.description.slice(0, 50)} and ${reqB.description.slice(0, 50)}`,
            severity: 'medium' as const,
          })
        }
      }
    }

    return { hasConflict: conflicts.length > 0, conflicts }
  }
}
