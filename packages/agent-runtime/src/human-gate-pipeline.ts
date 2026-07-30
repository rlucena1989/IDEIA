import { HumanInTheLoop, ActionRequiringApproval } from './human-loop'
import { createLogger } from '@ideia/logger';
const logger = createLogger('human-gate-pipeline');

export interface PipelineGatePoint {
  phase: string
  description: string
  requiredRole: 'dev' | 'tech-lead' | 'security'
  timeoutMs: number
  autoApprove: boolean
}

export interface PipelineGateState {
  gateId: string
  phase: string
  status: 'waiting' | 'approved' | 'rejected' | 'timeout'
  action?: ActionRequiringApproval
  approvedBy?: string
  timestamp: string
}

export class HumanGatePipeline {
  private humanLoop: HumanInTheLoop
  private gates: Map<string, PipelineGateState> = new Map()
  private gatePoints: PipelineGatePoint[] = []

  constructor(humanLoop: HumanInTheLoop) {
    this.humanLoop = humanLoop
  }

  registerGatePoint(point: PipelineGatePoint): void {
    this.gatePoints.push(point)
  }

  setDefaultGates(): void {
    this.registerGatePoint({
      phase: 'G0', description: 'G0 Triagem — approve risk classification',
      requiredRole: 'dev', timeoutMs: 120000, autoApprove: false,
    })
    this.registerGatePoint({
      phase: 'G1', description: 'G1 Estudo — approve versioned research artifact',
      requiredRole: 'dev', timeoutMs: 300000, autoApprove: false,
    })
    this.registerGatePoint({
      phase: 'G2', description: 'G2 DoR-IA — approve Definition of Ready checklist',
      requiredRole: 'dev', timeoutMs: 120000, autoApprove: false,
    })
    this.registerGatePoint({
      phase: 'G3', description: 'G3 Spec — approve specification with Gherkin criteria',
      requiredRole: 'dev', timeoutMs: 300000, autoApprove: false,
    })
    this.registerGatePoint({
      phase: 'G4', description: 'G4 Revisão Holística + GUARD adversarial',
      requiredRole: 'tech-lead', timeoutMs: 600000, autoApprove: false,
    })
    this.registerGatePoint({
      phase: 'G5', description: 'G5 Plano — approve DAG decomposition',
      requiredRole: 'dev', timeoutMs: 300000, autoApprove: false,
    })
    this.registerGatePoint({
      phase: 'G6', description: 'G6 Implementação — BUILD em worktree isolada',
      requiredRole: 'dev', timeoutMs: 600000, autoApprove: false,
    })
    this.registerGatePoint({
      phase: 'G7', description: 'G7 Validação — approve test results + E2E',
      requiredRole: 'dev', timeoutMs: 600000, autoApprove: false,
    })
    this.registerGatePoint({
      phase: 'G8', description: 'G8 Entrega — approve PR + study sync',
      requiredRole: 'security', timeoutMs: 900000, autoApprove: false,
    })
    this.registerGatePoint({
      phase: 'G9', description: 'G9 Destilação — approve lessons → skills',
      requiredRole: 'dev', timeoutMs: 120000, autoApprove: true,
    })
    this.registerGatePoint({
      phase: 'destructive', description: 'Confirm destructive operation (delete, reset)',
      requiredRole: 'security', timeoutMs: 600000, autoApprove: false,
    })
    this.registerGatePoint({
      phase: 'config-change', description: 'Approve global configuration change',
      requiredRole: 'tech-lead', timeoutMs: 300000, autoApprove: false,
    })
  }

  async requestGate(phase: string, context: { description: string; details: string }): Promise<PipelineGateState> {
    const point = this.gatePoints.find(g => g.phase === phase)
    if (!point) {
      const autoState: PipelineGateState = {
        gateId: `gate-auto-${Date.now()}`,
        phase,
        status: 'approved',
        timestamp: new Date().toISOString(),
        approvedBy: 'auto (no gate point configured)',
      }
      this.gates.set(autoState.gateId, autoState)
      return autoState
    }

    if (point.autoApprove) {
      const autoState: PipelineGateState = {
        gateId: `gate-auto-${Date.now()}`,
        phase,
        status: 'approved',
        timestamp: new Date().toISOString(),
        approvedBy: 'auto (autoApprove=true)',
      }
      this.gates.set(autoState.gateId, autoState)
      return autoState
    }

    const action = this.humanLoop.requestApproval(
      `pipeline.${phase}`,
      context.description,
      point.requiredRole === 'security' ? 'critical' : point.requiredRole === 'tech-lead' ? 'high' : 'low',
      'pipeline',
      context,
    )

    const state: PipelineGateState = {
      gateId: action.id,
      phase,
      status: 'waiting',
      action,
      timestamp: new Date().toISOString(),
    }

    this.gates.set(state.gateId, state)

    return new Promise((resolve) => {
      const check = setInterval(() => {
        const current = this.humanLoop.getStatus(action.id)
        if (current === 'approved') {
          clearInterval(check)
          state.status = 'approved'
          state.approvedBy = 'human'
          resolve(state)
        } else if (current === 'rejected' || current === 'timeout') {
          clearInterval(check)
          state.status = current === 'rejected' ? 'rejected' : 'timeout'
          resolve(state)
        }
      }, 1000)

      setTimeout(() => {
        clearInterval(check)
        if (state.status === 'waiting') {
          state.status = 'timeout'
          resolve(state)
        }
      }, point.timeoutMs + 1000)
    })
  }

  async waitForGate(phase: string, timeoutMs?: number): Promise<PipelineGateState> {
    const point = this.gatePoints.find(g => g.phase === phase)
    if (!point) {
      return {
        gateId: `gate-skip-${Date.now()}`,
        phase,
        status: 'approved',
        timestamp: new Date().toISOString(),
        approvedBy: 'auto (no gate)',
      }
    }

    const pending = Array.from(this.gates.values())
      .find(g => g.phase === phase && g.status === 'waiting')

    if (!pending) {
      return {
        gateId: `gate-unknown-${Date.now()}`,
        phase,
        status: 'approved',
        timestamp: new Date().toISOString(),
        approvedBy: 'auto (no pending gate)',
      }
    }

    return new Promise((resolve) => {
      const check = setInterval(() => {
        const current = this.humanLoop.getStatus(pending.gateId)
        if (current === 'approved' || current === 'rejected' || current === 'timeout') {
          clearInterval(check)
          pending.status = current === 'approved' ? 'approved' : current === 'rejected' ? 'rejected' : 'timeout'
          resolve(pending)
        }
      }, 500)

      const maxWait = timeoutMs || 600000
      setTimeout(() => {
        clearInterval(check)
        if (pending.status === 'waiting') {
          pending.status = 'timeout'
          resolve(pending)
        }
      }, maxWait)
    })
  }

  getGatesByPhase(phase: string): PipelineGateState[] {
    return Array.from(this.gates.values()).filter(g => g.phase === phase)
  }

  getAllGates(): PipelineGateState[] {
    return Array.from(this.gates.values())
  }

  getPendingGates(): PipelineGateState[] {
    return Array.from(this.gates.values()).filter(g => g.status === 'waiting')
  }

  reset(): void {
    this.gates.clear()
  }
}
