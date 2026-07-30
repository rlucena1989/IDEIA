import { randomUUID } from 'crypto'
import { Workflow, WorkflowStep, WorkflowStatus } from './types'
import { createLogger } from '@ideia/logger'

const log = createLogger('workflow-engine:branching')

export interface BranchPoint {
  id: string
  workflowId: string
  parentStepId: string
  branches: Branch[]
  createdAt: string
  resolved: boolean
  resolvedBranchId?: string
}

export interface Branch {
  id: string
  name: string
  steps: WorkflowStep[]
  status: 'active' | 'completed' | 'abandoned'
  createdAt: string
}

export interface BacktrackPoint {
  id: string
  workflowId: string
  stepId: string
  snapshot: WorkflowStep[]
  reason: string
  restoredAt?: string
}

export class BranchingManager {
  private branchPoints: Map<string, BranchPoint> = new Map()
  private backtrackPoints: Map<string, BacktrackPoint> = new Map()

  createBranch(workflowId: string, parentStepId: string, branchName: string, steps: Array<{ name: string; dependsOn?: string[] }>): Branch {
    const branchId = randomUUID()
    const branch: Branch = {
      id: branchId,
      name: branchName,
      steps: steps.map((s, i) => ({
        id: randomUUID(),
        name: s.name,
        status: 'pending',
        dependsOn: s.dependsOn || [],
        tags: [`branch:${branchName}`],
      })),
      status: 'active',
      createdAt: new Date().toISOString(),
    }

    const existing = this.branchPoints.get(workflowId)
    if (existing) {
      existing.branches.push(branch)
    } else {
      this.branchPoints.set(workflowId, {
        id: randomUUID(),
        workflowId,
        parentStepId,
        branches: [branch],
        createdAt: new Date().toISOString(),
        resolved: false,
      })
    }

    log.info('Branch created', { workflowId, branchName, branchId, steps: steps.length })
    return branch
  }

  resolveBranch(workflowId: string, selectedBranchId: string): BranchPoint | null {
    const bp = this.branchPoints.get(workflowId)
    if (!bp) return null

    const selected = bp.branches.find(b => b.id === selectedBranchId)
    if (!selected) return null

    selected.status = 'completed'
    for (const branch of bp.branches) {
      if (branch.id !== selectedBranchId && branch.status === 'active') {
        branch.status = 'abandoned'
      }
    }

    bp.resolved = true
    bp.resolvedBranchId = selectedBranchId
    log.info('Branch resolved', { workflowId, selectedBranchId })
    return bp
  }

  getBranchPoint(workflowId: string): BranchPoint | undefined {
    return this.branchPoints.get(workflowId)
  }

  snapshotForBacktrack(workflow: Workflow, stepId: string, reason: string): BacktrackPoint {
    const point: BacktrackPoint = {
      id: randomUUID(),
      workflowId: workflow.id,
      stepId,
      snapshot: JSON.parse(JSON.stringify(workflow.steps)),
      reason,
    }
    this.backtrackPoints.set(point.id, point)
    log.info('Backtrack snapshot created', { workflowId: workflow.id, stepId, reason })
    return point
  }

  restoreFromBacktrack(workflow: Workflow, pointId: string): boolean {
    const point = this.backtrackPoints.get(pointId)
    if (!point) return false

    workflow.steps = JSON.parse(JSON.stringify(point.snapshot))
    point.restoredAt = new Date().toISOString()
    workflow.status = 'active'
    log.info('Workflow restored from backtrack', { workflowId: workflow.id, pointId })
    return true
  }

  listBranchPoints(workflowId?: string): BranchPoint[] {
    const points = Array.from(this.branchPoints.values())
    return workflowId ? points.filter(p => p.workflowId === workflowId) : points
  }

  listBacktrackPoints(workflowId?: string): BacktrackPoint[] {
    const points = Array.from(this.backtrackPoints.values())
    return workflowId ? points.filter(p => p.workflowId === workflowId) : points
  }
}
