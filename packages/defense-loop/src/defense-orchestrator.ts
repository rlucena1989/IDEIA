import { Logger } from '@ideia/logger'
import {
  AttackScenario, BypassTechnique, PolicyRule, ActionSample,
  ABTestResult, DefenseCycleResult, CycleStatus,
  EventBus, PolicyEngine,
} from './types'
import { ThreatDetector } from './threat-detector'
import { BypassAnalyzer } from './bypass-analyzer'
import { DefenseRuleGenerator } from './defense-rule-generator'
import { RegressionTester } from './regression-tester'
import { PolicyAdapter } from './policy-adapter'
import { ResponsePlanner } from './response-planner'

export class DefenseOrchestrator {
  private _cycles: Map<string, DefenseCycleResult> = new Map()
  private _activePlaybooks: Map<string, unknown> = new Map()

  constructor(
    private _eventBus: EventBus,
    private _policyEngine: PolicyEngine,
    private _detector: ThreatDetector,
    private _analyzer: BypassAnalyzer,
    private _ruleGenerator: DefenseRuleGenerator,
    private _tester: RegressionTester,
    private _adapter: PolicyAdapter,
    private _planner: ResponsePlanner,
    private _logger: Logger
  ) {}

  async onBypassDetected(scenario: AttackScenario): Promise<DefenseCycleResult> {
    this._logger.info(`Defense cycle initiated for ${scenario.type} attack`)

    const analysis: BypassTechnique = await this._analyzer.analyze(
      scenario, await this._detector.getResult(scenario)
    )
    const responsePlan = await this._planner.plan(scenario, analysis)
    await this._planner.execute(responsePlan)

    const rule: PolicyRule = await this._ruleGenerator.generate(analysis)
    const legitimateSamples: ActionSample[] = await this._getLegitimateSamples()
    const regressionResult = await this._tester.test(rule, legitimateSamples)

    let status: CycleStatus = 'testing'
    let abResult: ABTestResult = { passed: false, fpRate: 1, confidence: 'low' }

    if (regressionResult.passed) {
      const trafficSample: ActionSample[] = await this._getTrafficSample()
      abResult = await this._tester.abTest(rule, trafficSample)
      status = abResult.fpRate < 0.01 ? 'active' : 'deploying'
      if (status === 'active') {
        await this._adapter.applyRule(rule)
        await this._eventBus.publish('security.defense.rule_deployed', {
          ruleId: rule.id,
          type: rule.type,
          attackType: scenario.type,
        })
      }
    }

    const cycle: DefenseCycleResult = {
      id: crypto.randomUUID(),
      scenario,
      analysis,
      rule,
      abTestResult: abResult,
      deployedAt: Date.now(),
      fpRate: abResult.fpRate,
      status,
    }

    this._cycles.set(cycle.id, cycle)
    await this._eventBus.publish('security.defense.cycle_completed', {
      cycleId: cycle.id,
      status: cycle.status,
      attackType: scenario.type,
    })

    return cycle
  }

  async monitorActiveCycles(): Promise<void> {
    for (const [id, cycle] of this._cycles) {
      if (cycle.status !== 'active') continue
      const currentFP: number = await this._measureFP(cycle.rule.id)
      if (currentFP > 0.05) {
        this._logger.warn(`FP rate exceeded for rule ${cycle.rule.id}, rolling back`)
        await this._adapter.removeRule(cycle.rule.id)
        cycle.status = 'rolled_back'
        await this._eventBus.publish('security.defense.rule_rolled_back', {
          ruleId: cycle.rule.id,
          fpRate: currentFP,
        })
      }
    }
  }

  getActiveCycles(): DefenseCycleResult[] {
    return Array.from(this._cycles.values())
  }

  private async _measureFP(_ruleId: string): Promise<number> {
    return 0.005
  }

  private async _getLegitimateSamples(): Promise<ActionSample[]> {
    return []
  }

  private async _getTrafficSample(): Promise<ActionSample[]> {
    return []
  }
}
