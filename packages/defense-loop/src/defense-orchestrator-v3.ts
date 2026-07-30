import { Logger } from '@ideia/logger'
import {
  AttackScenario, BypassTechnique, PolicyRule, ActionSample,
  ABTestResult, FrontierTechnique, DefenseCycleV3Result,
  FrontierCycleMetrics, AnomalyReport, AdaptedPolicy,
  ATLState, CounterfactualExplanation, VerificationResult,
  ConstitutionalCritique, AgentAction,
} from './types'
import { DefenseOrchestrator } from './defense-orchestrator'
import { AdversarialTrainingLoop } from './adversarial-training-loop'
import { ConstitutionalDefenseEngine } from './constitutional-defense-engine'
import { MetaDefenseAdapter } from './meta-defense-adapter'
import { GNNDefenseDetector } from './gnn-defense-detector'
import { FederatedDefenseLearner } from './federated-defense-learner'
import { RuntimeDefenseVerifier } from './runtime-defense-verifier'
import { CounterfactualDefenseExplainer } from './counterfactual-defense-explainer'

export class DefenseOrchestratorV3 {
  private _activeCycles: Map<string, DefenseCycleV3Result> = new Map()
  private _enabledTechniques: Set<FrontierTechnique>

  constructor(
    private _atl: AdversarialTrainingLoop,
    private _constitutional: ConstitutionalDefenseEngine,
    private _metaAdapter: MetaDefenseAdapter,
    private _gnnDetector: GNNDefenseDetector,
    private _federatedLearner: FederatedDefenseLearner,
    private _formalVerifier: RuntimeDefenseVerifier,
    private _counterfactualExplainer: CounterfactualDefenseExplainer,
    private _standardOrchestrator: DefenseOrchestrator,
    private _logger: Logger
  ) {
    this._enabledTechniques = new Set<FrontierTechnique>([
      'adversarial_training_loop',
      'constitutional_defense',
      'meta_learning',
      'gnn_detection',
      'federated_learning',
      'formal_verification',
      'counterfactual_explanation',
    ])
  }

  enableTechnique(technique: FrontierTechnique): void {
    this._enabledTechniques.add(technique)
  }

  disableTechnique(technique: FrontierTechnique): void {
    this._enabledTechniques.delete(technique)
  }

  getEnabledTechniques(): FrontierTechnique[] {
    return Array.from(this._enabledTechniques)
  }

  async runFullCycle(attack: AttackScenario): Promise<DefenseCycleV3Result> {
    this._logger.info(`DefenseOrchestratorV3: Full cycle for ${attack.type} attack`)
    const appliedTechniques: FrontierTechnique[] = []

    const standardResult = await this._standardOrchestrator['_detector'].detect(
      attack.payload, { target: attack.target }
    )

    let gnnAnomaly: AnomalyReport | undefined
    if (this._enabledTechniques.has('gnn_detection')) {
      const actions: AgentAction[] = this._buildAgentActions(attack)
      gnnAnomaly = await this._gnnDetector.detectAnomalies(actions)
      appliedTechniques.push('gnn_detection')
    }

    const bypassTechnique: BypassTechnique = await this._standardOrchestrator['_analyzer'].analyze(
      attack, standardResult
    )

    let constitutionalCritique: ConstitutionalCritique[] | undefined
    if (this._enabledTechniques.has('constitutional_defense')) {
      const tempRule: PolicyRule = this._buildTempRule(attack, bypassTechnique)
      constitutionalCritique = await this._constitutional.critique(
        tempRule, this._constitutional.getConstitution()
      )
      appliedTechniques.push('constitutional_defense')
    }

    let rule: PolicyRule = await this._standardOrchestrator['_ruleGenerator'].generate(bypassTechnique)

    if (this._enabledTechniques.has('constitutional_defense')) {
      rule = await this._constitutional.generateDefense(attack)
      appliedTechniques.push('constitutional_defense')
    }

    let metaAdaptation: AdaptedPolicy | undefined
    if (this._enabledTechniques.has('meta_learning')) {
      const attackSample: ActionSample = {
        id: attack.id, action: 'malicious',
        malicious: true, payload: attack.payload,
      }
      metaAdaptation = await this._metaAdapter.adapt(
        await this._metaAdapter.metaTrain([]),
        attackSample
      )
      appliedTechniques.push('meta_learning')
    }

    let formalVerification: VerificationResult
    if (this._enabledTechniques.has('formal_verification')) {
      formalVerification = await this._formalVerifier.verifyRule(rule, [])
      appliedTechniques.push('formal_verification')
    } else {
      formalVerification = {
        verified: true,
        model: { states: [], transitions: [], invariantProperties: [] },
        checkedProperties: [],
        counterexamples: [],
        verificationTimeMs: 0,
        bmcDepth: 0,
      }
    }

    const legitSamples: ActionSample[] = await this._standardOrchestrator['_getLegitimateSamples']()
    const regressionResult = await this._standardOrchestrator['_tester'].test(rule, legitSamples)

    let abTestResult: ABTestResult = { passed: false, fpRate: 1, confidence: 'low' }
    let strategy: 'closed' | 'open' | 'hybrid' = 'closed'

    if (regressionResult.passed && formalVerification.verified) {
      const trafficSample: ActionSample[] = await this._standardOrchestrator['_getTrafficSample']()
      abTestResult = await this._standardOrchestrator['_tester'].abTest(rule, trafficSample)
      strategy = abTestResult.fpRate < 0.01 ? 'closed' : 'hybrid'
    }

    let counterfactual: CounterfactualExplanation | undefined
    if (this._enabledTechniques.has('counterfactual_explanation') && !abTestResult.passed) {
      counterfactual = await this._counterfactualExplainer.explain(
        attack.payload,
        {
          id: rule.id, type: 'regex', pattern: rule.pattern,
          action: 'block', severity: 'medium',
          source: 'auto_generated', createdAt: new Date(),
        }
      )
      appliedTechniques.push('counterfactual_explanation')
    }

    let atlState: ATLState | undefined
    if (this._enabledTechniques.has('adversarial_training_loop')) {
      atlState = await this._atl.runIteration()
      appliedTechniques.push('adversarial_training_loop')
    }

    let federatedRound: number | undefined
    if (this._enabledTechniques.has('federated_learning')) {
      const globalState = await this._federatedLearner.beginRound()
      federatedRound = globalState.roundNumber
      appliedTechniques.push('federated_learning')
    }

    const cycle: DefenseCycleV3Result = {
      id: crypto.randomUUID(),
      attack,
      detection: { standardResult, gnnAnomaly },
      analysis: { bypassTechnique, constitutionalCritique },
      adaptation: { rule, metaAdaptation, formalVerification },
      deployment: { strategy, abTestResult, deployedAt: Date.now() },
      feedback: { counterfactual, federatedRound, atlState },
      techniquesApplied: [...new Set(appliedTechniques)],
    }

    this._activeCycles.set(cycle.id, cycle)
    this._logger.info(`DefenseOrchestratorV3: Cycle ${cycle.id} completed with ${cycle.techniquesApplied.length} techniques`)

    return cycle
  }

  private _buildAgentActions(attack: AttackScenario): AgentAction[] {
    return [
      {
        id: 'attack-1',
        type: 'execute',
        target: attack.payload,
        timestamp: attack.timestamp,
        metadata: { source: attack.source, type: attack.type },
      },
      {
        id: 'attack-2',
        type: 'eval',
        target: attack.payload,
        timestamp: attack.timestamp + 10,
        parentActionId: 'attack-1',
        metadata: {},
      },
    ]
  }

  private _buildTempRule(attack: AttackScenario, technique: BypassTechnique): PolicyRule {
    return {
      id: `TEMP-${crypto.randomUUID().slice(0, 8)}`,
      type: 'regex',
      pattern: technique.pattern || attack.payload.slice(0, 30),
      action: technique.severity === 'critical' ? 'block' : 'review',
      severity: technique.severity,
      source: 'auto_generated',
      createdAt: new Date(),
    }
  }

  async getCycleMetrics(): Promise<FrontierCycleMetrics> {
    const cycles: DefenseCycleV3Result[] = Array.from(this._activeCycles.values())
    const techniqueCounts: Record<string, number> = {}

    for (const cycle of cycles) {
      for (const tech of cycle.techniquesApplied) {
        techniqueCounts[tech] = (techniqueCounts[tech] || 0) + 1
      }
    }

    return {
      cycleNumber: cycles.length,
      detectionRate: cycles.filter(c => c.detection?.gnnAnomaly?.detected).length / Math.max(1, cycles.length),
      fpRate: 0,
      avgResponseTime: 0,
      techniquesUsed: Array.from(this._enabledTechniques),
      totalCycles: cycles.length,
      techniquesEnabled: this._enabledTechniques.size,
      byTechnique: techniqueCounts,
      averageTimePerCycle: cycles.length > 0
        ? cycles.reduce((s, c) => s + c.deployment.deployedAt - c.attack.timestamp, 0) / cycles.length
        : 0,
      deploymentRate: cycles.filter(c => c.deployment.abTestResult.passed).length /
        Math.max(1, cycles.length),
    }
  }
}
