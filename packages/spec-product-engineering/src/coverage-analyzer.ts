import { createLogger } from '@ideia/logger'
import { TraceLink, TraceabilityMatrix, CoverageReport, ChangeImpact, Requirement } from './types'

const logger = createLogger('coverage-analyzer')

export class TraceabilityManager {
  private links: TraceLink[] = []

  addLink(link: TraceLink): void {
    this.links.push(link)
  }

  getLinks(): TraceLink[] {
    return [...this.links]
  }

  getLinksForRequirement(id: string): TraceLink[] {
    return this.links.filter(l => l.sourceId === id || l.targetId === id)
  }
}

export class CoverageAnalyzer {
  analyze(requirements: Requirement[], links: TraceLink[]): CoverageReport {
    const covered = new Set<string>()
    const uncovered: string[] = []
    const byType: Record<string, number> = {}

    for (const req of requirements) {
      const hasLink = links.some(l => l.sourceId === req.id || l.targetId === req.id)
      if (hasLink) {
        covered.add(req.id)
        byType[req.type] = (byType[req.type] || 0) + 1
      } else {
        uncovered.push(req.id)
      }
    }

    const total = requirements.length
    const report: CoverageReport = {
      totalRequirements: total,
      covered: covered.size,
      uncovered,
      coveragePercent: total > 0 ? Math.round((covered.size / total) * 100) : 0,
      byType,
    }

    logger.info(`Coverage analysis complete`, { total, covered: covered.size, percent: report.coveragePercent })
    return report
  }

  generateMatrix(requirements: Requirement[], links: TraceLink[]): TraceabilityMatrix {
    const testLinks = links.filter(l => l.targetType === 'test' || l.sourceType === 'test')
    const testIds = [...new Set(testLinks.map(l => l.sourceId === 'test' ? l.targetId : l.sourceId))]

    const coverage = requirements.map(req => {
      const reqLinks = testLinks.filter(l => l.sourceId === req.id || l.targetId === req.id)
      return {
        requirementId: req.id,
        testIds: reqLinks.map(l => l.sourceId === req.id ? l.targetId : l.sourceId),
        covered: reqLinks.length > 0,
        coveragePercent: reqLinks.length > 0 ? 100 : 0,
      }
    })

    const totalCoverage = requirements.length > 0 ? coverage.filter(c => c.covered).length / requirements.length * 100 : 0

    return {
      requirements: requirements.map(r => r.id),
      tests: testIds,
      coverage,
      totalCoverage: Math.round(totalCoverage),
    }
  }
}

export class ImpactAnalyzer {
  analyze(requirementId: string, graph: Map<string, string[]>): ChangeImpact {
    const visited = new Set<string>()
    const queue = [requirementId]
    const affectedRequirements: string[] = []
    const affectedUseCases: string[] = []
    const affectedTests: string[] = []

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      if (current !== requirementId) affectedRequirements.push(current)
      const deps = graph.get(current) || []
      for (const dep of deps) {
        if (!visited.has(dep)) queue.push(dep)
      }
    }

    return {
      requirementId,
      affectedRequirements,
      affectedUseCases,
      affectedTests,
      affectedCode: [],
      severity: affectedRequirements.length > 5 ? 'high' as const : affectedRequirements.length > 2 ? 'medium' as const : 'low' as const,
      estimatedEffort: affectedRequirements.length === 0 ? 'small' as const : affectedRequirements.length > 5 ? 'large' as const : 'medium' as const,
    }
  }
}
