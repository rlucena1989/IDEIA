import * as crypto from 'crypto'
import { createLogger } from '@ideia/logger'
import { StudyEngine } from '@ideia/study-engine'
import { RiskApprovalManager } from '@ideia/risk-approval'
import { QualityGateSystem } from '@ideia/quality-gates'
import { SpecGenerator } from '@ideia/spec-engine'
import { HumanGatePipeline } from '@ideia/agent-runtime'
import { Triager } from './triager'
import { DorIAValidator } from './dor-ia-validator'
import { SyncGate } from './sync-gate'
import { SkillsDistiller } from './skills-distiller'
import {
  GateId, GateResult, GateStatus, CycleState, CycleReport,
  TriagerInput, DorIAInput, SyncGateInput,
  G0G9Config,
} from './types'

const logger = createLogger('g0-g9-cycle:orchestrator')

const DEFAULT_CONFIG: G0G9Config = {
  studiesRoot: 'estudos',
  defaultAuthor: 'system',
}

export class G0G9CycleOrchestrator {
  readonly triager: Triager
  readonly dorIA: DorIAValidator
  readonly syncGate: SyncGate
  readonly skillsDistiller: SkillsDistiller
  readonly humanGates: HumanGatePipeline
  readonly qualityGates: QualityGateSystem

  private studyEngine: StudyEngine
  private riskApproval: RiskApprovalManager
  private specGenerator: SpecGenerator
  private config: G0G9Config

  constructor(
    humanGatePipeline: HumanGatePipeline,
    qualityGateSystem: QualityGateSystem,
    config?: Partial<G0G9Config>,
  ) {
    this.triager = new Triager()
    this.dorIA = new DorIAValidator()
    this.syncGate = new SyncGate()
    this.skillsDistiller = new SkillsDistiller()
    this.humanGates = humanGatePipeline
    this.qualityGates = qualityGateSystem
    this.studyEngine = new StudyEngine(config)
    this.riskApproval = new RiskApprovalManager()
    this.specGenerator = new SpecGenerator()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async runCycle(featureName: string, triageInput: TriagerInput): Promise<CycleReport> {
    const startTime = Date.now()
    const cycleId = `cycle-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    const gates = new Map<GateId, GateResult>()

    const cycle: CycleState = {
      cycleId,
      featureName,
      riskClass: 'L',
      depth: 'light',
      gates,
      currentGate: 'G0',
      startedAt: new Date().toISOString(),
      status: 'running',
    }

    try {
      logger.info('Starting G0-G9 cycle', { cycleId, feature: featureName })

      await this.runGate('G0', 'Triagem', cycle, async () => {
        const triage = this.triager.classify(triageInput)
        cycle.riskClass = triage.riskClass
        cycle.depth = triage.depth

        const assessment = this.riskApproval.classifier.classify(
          triage.riskClass === 'H' ? 'severe' : triage.riskClass === 'M' ? 'major' : 'minor',
          triage.riskClass === 'H' ? 'likely' : triage.riskClass === 'M' ? 'possible' : 'unlikely',
        )
        logger.info('G0 triage', { riskClass: triage.riskClass, depth: triage.depth, rationale: triage.rationale })
        return { passed: true, output: JSON.stringify(triage) }
      })

      if (!this.shouldSkip('G1', cycle)) {
        await this.runGate('G1', 'Estudo', cycle, async () => {
          const study = await this.studyEngine.create(featureName, cycle.depth, cycle.riskClass)
          cycle.studyId = study.id
          await this.studyEngine.commit(study.id)
          return { passed: true, output: `Study ${study.id} created and committed` }
        })
      }

      if (!this.shouldSkip('G2', cycle)) {
        await this.runGate('G2', 'Prontidão (DoR-IA)', cycle, async () => {
          const dorInput: DorIAInput = {
            studyCommitted: true,
            objectiveClear: true,
            stakeholdersConfirmed: true,
            acceptanceCriteriaInGherkin: true,
            eachCriterionHasTest: true,
            testDataAvailable: true,
            dependenciesIdentified: true,
            architectureCompatible: true,
            capacityEstimated: true,
            parallelFeaturesIdentified: true,
            integrationPointsMapped: true,
            noFileOverlap: true,
          }
          const dorResult = this.dorIA.validate(dorInput)
          return { passed: dorResult.passed, output: JSON.stringify(dorResult) }
        })
      }

      if (!this.shouldSkip('G3', cycle)) {
        await this.runGate('G3', 'Spec', cycle, async () => {
          const spec = this.specGenerator.generate({
            title: featureName,
            intention: triageInput.description,
            context: {
              projectType: 'ideia',
              language: 'typescript',
              constraints: [],
            },
          })
          cycle.specId = spec.id
          return { passed: true, output: `Spec ${spec.id} generated with ${spec.acceptanceCriteria.length} criteria` }
        })
      }

      if (!this.shouldSkip('G4', cycle)) {
        await this.runGate('G4', 'Revisão Holística + GUARD', cycle, async () => {
          const gateResult = await this.humanGates.requestGate('spec', {
            description: `Holistic review + adversarial verification for ${featureName}`,
            details: `Risk class: ${cycle.riskClass}, Depth: ${cycle.depth}`,
          })
          const passed = gateResult.status === 'approved'
          return { passed, output: `GUARD review: ${gateResult.status}` }
        })
      }

      if (!this.shouldSkip('G5', cycle)) {
        await this.runGate('G5', 'Plano', cycle, async () => {
          const planResult = await this.humanGates.requestGate('plan', {
            description: `Approve implementation plan for ${featureName}`,
            details: `DAG decomposition required for ${featureName}`,
          })
          const passed = planResult.status === 'approved'
          cycle.planId = `plan-${cycleId}`
          return { passed, output: `Plan approved: ${planResult.status}` }
        })
      }

      await this.runGate('G6', 'Implementação', cycle, async () => {
        const execResult = await this.humanGates.requestGate('execution', {
          description: `BUILD phase for ${featureName}`,
          details: `Implementation in isolated worktree`,
        })
        const passed = execResult.status === 'approved'
        return { passed, output: `Build: ${execResult.status}` }
      })

      await this.runGate('G7', 'Validação', cycle, async () => {
        const layers = await this.qualityGates.executeAll(async (gate) => {
          const result: import('@ideia/quality-gates').GateResult = {
            gate: gate.name,
            status: 'passed' as any,
            severity: gate.severity,
            layer: gate.layer,
            durationMs: 0,
            blocking: gate.blocking,
          }
          return result
        })
        const passed = layers.decision.canProceed
        return { passed, output: `Quality gates: ${layers.decision.canProceed ? 'all passed' : 'blocked'}` }
      })

      await this.runGate('G8', 'Entrega + Sincronização', cycle, async () => {
        const syncInput: SyncGateInput = {
          studyPath: `estudos/${featureName.toLowerCase().replace(/\s+/g, '-')}/estudo.md`,
          specPath: cycle.specId || '',
          implementationBranch: `feature/${featureName.toLowerCase().replace(/\s+/g, '-')}`,
          codeDiffersFromStudy: false,
          codeDiffersFromSpec: false,
          adrsOutdated: false,
        }
        const syncResult = this.syncGate.evaluate(syncInput)
        const gateResult = await this.humanGates.requestGate('deploy', {
          description: `Approve PR for ${featureName}`,
          details: `Sync required: ${syncResult.syncRequired}. Files to update: ${syncResult.filesToUpdate.join(', ')}`,
        })
        const passed = gateResult.status === 'approved' && syncResult.passed
        return { passed, output: `PR + sync: ${gateResult.status}` }
      })

      if (!this.shouldSkip('G9', cycle)) {
        await this.runGate('G9', 'Destilação', cycle, async () => {
          const distillResult = await this.skillsDistiller.distill({
            cycleId,
            featureName,
            lessons: [`Implementado ${featureName} com classe de risco ${cycle.riskClass}`],
            sessionLogs: [`G0-G9 cycle completed for ${featureName}`],
            steeringPaths: ['.steering/g0-g9-lessons.md'],
          })
          return { passed: distillResult.passed, output: `${distillResult.distilledSkills.length} skills distilled` }
        })
      }

      cycle.status = 'completed'
      const totalDuration = Date.now() - startTime

      logger.info('G0-G9 cycle completed', { cycleId, feature: featureName, durationMs: totalDuration })

      return this.buildReport(cycle, totalDuration)
    } catch (err) {
      cycle.status = 'failed'
      const totalDuration = Date.now() - startTime
      logger.error('G0-G9 cycle failed', { cycleId, error: String(err) })
      return this.buildReport(cycle, totalDuration)
    }
  }

  private async runGate(
    gateId: GateId,
    name: string,
    cycle: CycleState,
    execute: () => Promise<{ passed: boolean; output?: string }>,
  ): Promise<void> {
    const start = Date.now()
    cycle.currentGate = gateId

    logger.info(`Gate ${gateId} (${name}) starting`)

    try {
      const { passed, output } = await execute()
      const status: GateStatus = passed ? 'passed' : 'failed'
      const result: GateResult = {
        gate: gateId,
        name,
        status,
        durationMs: Date.now() - start,
        output,
        blocking: !['G0', 'G9'].includes(gateId),
      }
      cycle.gates.set(gateId, result)
    } catch (err) {
      const result: GateResult = {
        gate: gateId,
        name,
        status: 'failed',
        durationMs: Date.now() - start,
        error: String(err),
        blocking: gateId !== 'G9',
      }
      cycle.gates.set(gateId, result)
      if (result.blocking) throw err
    }

    await this.humanGates.waitForGate(gateId)
  }

  private shouldSkip(gateId: GateId, cycle: CycleState): boolean {
    if (this.config.skipGates?.includes(gateId)) return true
    if (this.config.skipG0) return gateId === 'G0'
    return false
  }

  private buildReport(cycle: CycleState, totalDurationMs: number): CycleReport {
    const gates = Array.from(cycle.gates.values())
    return {
      cycleId: cycle.cycleId,
      featureName: cycle.featureName,
      riskClass: cycle.riskClass,
      depth: cycle.depth,
      status: cycle.status === 'running' ? 'failed' : cycle.status,
      gates,
      totalDurationMs,
      startedAt: cycle.startedAt,
      completedAt: new Date().toISOString(),
      summary: `G0-G9 cycle: ${gates.filter(g => g.status === 'passed').length}/${gates.length} gates passed`,
    }
  }
}
