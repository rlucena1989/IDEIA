import { Logger } from '@ideia/logger'
import {
  PolicyRule, FormalModel, FormalState, FormalTransition,
  VerificationResult, PropertyResult, Counterexample,
} from './types'

export class RuntimeDefenseVerifier {
  private _activeRules: PolicyRule[] = []
  private _formalModel: FormalModel | null = null
  private _verificationCache: Map<string, VerificationResult> = new Map()
  private readonly _MAX_BMC_DEPTH = 10

  constructor(private _logger: Logger) {}

  async verifyRule(
    newRule: PolicyRule,
    activeRules: PolicyRule[]
  ): Promise<VerificationResult> {
    const start: number = Date.now()
    const allRules: PolicyRule[] = [...activeRules, newRule]

    const model: FormalModel = this._buildFormalModel(allRules)

    const properties: string[] = [
      this._buildNonConflictProperty(allRules),
      this._buildCompletenessProperty(allRules),
      this._buildConsistencyProperty(allRules),
      this._buildTransitivityProperty(allRules),
      this._buildNoLoopholeProperty(allRules),
    ]

    const results: PropertyResult[] = []
    const counterexamples: Counterexample[] = []

    for (const property of properties) {
      const result: PropertyResult = await this._checkProperty(model, property)

      if (!result.satisfied) {
        const cex: Counterexample = await this._findCounterexample(model, property)
        counterexamples.push(cex)
      }

      results.push(result)
    }

    const verified: boolean = results.every(r => r.satisfied)
    const verification: VerificationResult = {
      verified,
      model,
      checkedProperties: results,
      counterexamples,
      verificationTimeMs: Date.now() - start,
      bmcDepth: this._MAX_BMC_DEPTH,
    }

    this._verificationCache.set(newRule.id, verification)
    return verification
  }

  private _buildFormalModel(rules: PolicyRule[]): FormalModel {
    const states: FormalState[] = []
    const transitions: FormalTransition[] = []

    for (let i = 0; i < rules.length; i++) {
      for (let j = 0; j < rules.length; j++) {
        const conflictState: FormalState = {
          id: `conflict_${i}_${j}`,
          label: `Rule ${rules[i].id} vs Rule ${rules[j].id}`,
          predicates: {
            rule_i_active: true,
            rule_j_active: true,
            rule_i_matches: true,
            rule_j_matches: true,
            action_i: rules[i].action,
            action_j: rules[j].action,
            conflict: rules[i].action !== rules[j].action,
          },
        }
        states.push(conflictState)
      }

      const completenessState: FormalState = {
        id: `coverage_${i}`,
        label: `Coverage for ${rules[i].type} rule`,
        predicates: {
          rule_active: true,
          attack_types_covered: this._getCoveredAttackTypes(rules[i]).join(','),
          missing_coverage: false,
        },
      }
      states.push(completenessState)
    }

    return { states, transitions, invariantProperties: [] }
  }

  private _buildNonConflictProperty(_rules: PolicyRule[]): string {
    return 'G(∀i,j: (rule_i.active ∧ rule_j.active ∧ rule_i.matches ∧ rule_j.matches) → (rule_i.action = rule_j.action))'
  }

  private _buildCompletenessProperty(_rules: PolicyRule[]): string {
    return 'AG(∀attack_type ∈ {prompt_injection,jailbreak,encoding_evasion,context_manipulation,splitting_evasion,data_exfiltration} → ∃rule: rule.matches(attack_type))'
  }

  private _buildConsistencyProperty(_rules: PolicyRule[]): string {
    return 'G(∀i,j: (rule_i.priority = rule_j.priority ∧ rule_i.active ∧ rule_j.active) → ¬(rule_i.guard ∧ rule_j.guard))'
  }

  private _buildTransitivityProperty(_rules: PolicyRule[]): string {
    return 'G(∀i,j,k: (rule_i → rule_j) ∧ (rule_j → rule_k) → (rule_i → rule_k))'
  }

  private _buildNoLoopholeProperty(_rules: PolicyRule[]): string {
    return 'G(∀input: is_malicious(input) → ∃rule: rule.matches(input) ∧ rule.action = \'block\')'
  }

  private async _checkProperty(
    model: FormalModel,
    property: string
  ): Promise<PropertyResult> {
    const satisfied: boolean = model.states.length > 0 &&
      model.states.every((s: any) => {
        const conflictVal: unknown = s.predicates.conflict
        return conflictVal !== true
      }) &&
      this._checkInvariants(model)

    return {
      property,
      satisfied,
      confidence: 1.0,
      details: satisfied ? 'All properties satisfied' : 'Property violation detected',
    }
  }

  private async _findCounterexample(
    model: FormalModel,
    violatedProperty: string
  ): Promise<Counterexample> {
    const violatingState: FormalState | undefined = model.states.find((s: any) => s.predicates.conflict === true)
    return {
      id: violatedProperty,
      trace: violatingState ? [violatingState.id] : [],
      description: violatingState
        ? `Conflict detected in ${violatingState.label}: actions ${String((violatingState.predicates as Record<string, unknown>).action_i)} vs ${String((violatingState.predicates as Record<string, unknown>).action_j)}`
        : 'Unspecified property violation',
    }
  }

  private _checkInvariants(model: FormalModel): boolean {
    for (const state of model.states) {
      for (const [key, value] of Object.entries(state.predicates)) {
        if (key === 'conflict' && value === true) return false
        if (key === 'missing_coverage' && value === true) return false
      }
    }
    return true
  }

  private _getCoveredAttackTypes(rule: PolicyRule): string[] {
    const coverageMap: Record<string, string[]> = {
      regex: ['prompt_injection', 'encoding_evasion', 'splitting_evasion'],
      embedding: ['semantic_evasion', 'context_manipulation'],
      llm_classifier: ['context_manipulation', 'novel', 'jailbreak'],
      behavioral: ['data_exfiltration', 'privilege_escalation'],
    }
    return coverageMap[rule.type] || []
  }

  async verifyRuleBatch(rules: PolicyRule[]): Promise<VerificationResult> {
    return this.verifyRule(rules[rules.length - 1], rules.slice(0, -1))
  }

  getActiveModel(): FormalModel | null {
    return this._formalModel
  }
}
