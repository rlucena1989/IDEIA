import { createLogger } from '@ideia/logger';
import {  AttackScenario, PolicyRule, ConstitutionalPrinciple, PrincipleViolation,
  ConstitutionalCritique, ConstitutionalHealth, Severity, RuleAction,
} from './types'
const logger = createLogger('constitutional-defense-engine');

export class ConstitutionalDefenseEngine {
  private _constitution: ConstitutionalPrinciple[] = []
  private _critiqueHistory: Map<string, ConstitutionalCritique[]> = new Map()

  constructor() {
    this._registerDefaultPrinciples()
  }

  private _registerDefaultPrinciples(): void {
    this._constitution.push(new MinimalFPPrinciple())
    this._constitution.push(new ProportionalityPrinciple())
    this._constitution.push(new AuditabilityPrinciple())
    this._constitution.push(new ReversibilityPrinciple())
    this._constitution.push(new NonDiscriminationPrinciple())
  }

  registerPrinciple(principle: ConstitutionalPrinciple): void {
    this._constitution.push(principle)
  }

  async generateDefense(attack: AttackScenario, principles?: ConstitutionalPrinciple[]): Promise<PolicyRule> {
    const activePrinciples: ConstitutionalPrinciple[] = principles || this._constitution
    const initialRule: PolicyRule = this._createInitialRule(attack)

    let currentRule: PolicyRule = initialRule
    let bestScore = 0
    let bestRule: PolicyRule = initialRule

    for (let round = 0; round < 5; round++) {
      const critiques: ConstitutionalCritique[] = await this.critique(currentRule, activePrinciples)
      const score: number = this._computeConstitutionalScore(critiques)

      if (score > bestScore) {
        bestScore = score
        bestRule = { ...currentRule }
      }

      if (critiques.every(c => c.violations.length === 0)) break

      currentRule = await this._revise(currentRule, critiques, activePrinciples)
    }

    return bestRule
  }

  async critique(rule: PolicyRule, principles: ConstitutionalPrinciple[]): Promise<ConstitutionalCritique[]> {
    const critiques: ConstitutionalCritique[] = []

    for (const principle of principles) {
      const violations: PrincipleViolation[] = await principle.verify(rule)
      const score: number = violations.length === 0 ? 1.0 : Math.max(0, 1.0 - violations.length * 0.2)
      critiques.push({
        violations,
        overallScore: score,
        recommendation: score >= 0.8 ? 'approve' : score >= 0.5 ? 'revise' : 'reject',
      })
    }

    const ruleId: string = rule.id
    const existing: ConstitutionalCritique[] = this._critiqueHistory.get(ruleId) || []
    existing.push(...critiques)
    this._critiqueHistory.set(ruleId, existing)

    return critiques
  }

  async _revise(rule: PolicyRule, critiques: ConstitutionalCritique[], _principles: ConstitutionalPrinciple[]): Promise<PolicyRule> {
    const revised: PolicyRule = { ...rule }
    const allViolations: PrincipleViolation[] = critiques.flatMap(c => c.violations)

    for (const violation of allViolations) {
      switch (violation.principleId) {
        case 'min_fp':
          if (revised.pattern) {
            const parts: string[] = revised.pattern.split('|')
            revised.pattern = parts.slice(0, Math.max(1, parts.length - 1)).join('|')
          }
          if (revised.threshold) revised.threshold *= 1.1
          break
        case 'proportionality':
          if (revised.severity === 'critical') revised.severity = 'high'
          else if (revised.severity === 'high') revised.severity = 'medium'
          break
        case 'auditability':
          revised.metadata = {
            ...revised.metadata,
            constitutionalJustification: allViolations
              .filter(v => v.fixSuggestion)
              .map(v => v.fixSuggestion)
              .join('; '),
          }
          break
        case 'reversibility':
          revised.rollbackPlan = {
            steps: ['remove_rule', 'restore_previous', 'notify_security'],
            estimatedTimeMs: 5000,
          }
          break
        case 'non_discrimination':
          if (revised.pattern) {
            const biasedTerms: string[] = ['native_language', 'country_code', 'religious', 'political']
            for (const term of biasedTerms) {
              revised.pattern = revised.pattern.replace(new RegExp(term, 'gi'), '[SANITIZED]')
            }
          }
          break
      }
    }

    return revised
  }

  async selfPlay(rounds: number = 10): Promise<PolicyRule[]> {
    const improvedRules: PolicyRule[] = []
    const attackTypes: AttackScenario['type'][] = [
      'prompt_injection', 'jailbreak', 'encoding_evasion',
      'context_manipulation', 'novel',
    ]

    for (let round = 0; round < rounds; round++) {
      for (const attackType of attackTypes) {
        const scenario: AttackScenario = {
          id: `selfplay-${round}-${attackType}`,
          type: attackType,
          payload: `Self-play generated ${attackType} payload round ${round}`,
          target: 'self-play',
          timestamp: Date.now(),
          source: 'red_team',
        }

        const rule: PolicyRule = await this.generateDefense(scenario)
        improvedRules.push(rule)
      }
    }

    return improvedRules
  }

  private _createInitialRule(attack: AttackScenario): PolicyRule {
    const severity: Severity = 'medium'
    const action: RuleAction = 'review'
    return {
      id: `CONST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      type: 'regex',
      pattern: attack.type === 'encoding_evasion'
        ? '(?:\\\\x[0-9a-f]{2}|\\\\u[0-9a-f]{4}|base64)'
        : attack.payload.slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      action,
      severity,
      source: 'constitutional',
      createdAt: new Date(),
      metadata: { generationMethod: 'constitutional' },
    }
  }

  private _computeConstitutionalScore(critiques: ConstitutionalCritique[]): number {
    if (critiques.length === 0) return 0
    return critiques.reduce((s, c) => s + c.overallScore, 0) / critiques.length
  }

  getConstitutionalHealth(): ConstitutionalHealth {
    const allCritiques: ConstitutionalCritique[] = Array.from(this._critiqueHistory.values()).flat()
    const avgScore: number = allCritiques.length > 0
      ? allCritiques.reduce((s, c) => s + c.overallScore, 0) / allCritiques.length
      : 0

    return {
      totalRulesCritiqued: this._critiqueHistory.size,
      averageConstitutionalScore: avgScore,
      mostViolatedPrinciple: this._findMostViolatedPrinciple(),
      rulesApproved: allCritiques.filter(c => c.recommendation === 'approve').length,
      rulesRevised: allCritiques.filter(c => c.recommendation === 'revise').length,
    }
  }

  private _findMostViolatedPrinciple(): string {
    const counts: Map<string, number> = new Map()
    for (const critiques of this._critiqueHistory.values()) {
      for (const critique of critiques) {
        for (const violation of critique.violations) {
          counts.set(violation.principleId, (counts.get(violation.principleId) || 0) + 1)
        }
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'
  }

  getConstitution(): ConstitutionalPrinciple[] {
    return this._constitution
  }
}

export class MinimalFPPrinciple implements ConstitutionalPrinciple {
  id = 'min_fp'
  name = 'Minimo Falso Positivo'
  description = 'Nenhuma regra pode bloquear mais que 1% de trafego legitimo'
  severity: 'must' = 'must'

  async verify(rule: PolicyRule): Promise<PrincipleViolation[]> {
    const violations: PrincipleViolation[] = []
    if (rule.type === 'regex' && rule.pattern) {
      const patternParts: string[] = rule.pattern.split('|')
      if (patternParts.length > 5) {
        violations.push({
          principleId: this.id,
          ruleId: rule.id,
          description: `Pattern with ${patternParts.length} alternatives likely causes FP`,
          fixSuggestion: `Reduce alternatives from ${patternParts.length} to max 5`,
        })
      }
    }
    return violations
  }
}

export class ProportionalityPrinciple implements ConstitutionalPrinciple {
  id = 'proportionality'
  name = 'Proporcionalidade'
  description = 'Severidade da resposta deve ser proporcional ao ataque'
  severity: 'must' = 'must'

  async verify(rule: PolicyRule): Promise<PrincipleViolation[]> {
    const violations: PrincipleViolation[] = []
    if (rule.severity === 'critical' && rule.action !== 'block') {
      violations.push({
        principleId: this.id,
        ruleId: rule.id,
        description: 'Critical severity rule should use block action',
        fixSuggestion: `Change action from '${rule.action}' to 'block'`,
      })
    }
    return violations
  }
}

export class AuditabilityPrinciple implements ConstitutionalPrinciple {
  id = 'auditability'
  name = 'Auditabilidade'
  description = 'Toda regra deve ter justificativa rastreavel'
  severity: 'should' = 'should'

  async verify(rule: PolicyRule): Promise<PrincipleViolation[]> {
    const violations: PrincipleViolation[] = []
    const meta: Record<string, unknown> | undefined = rule.metadata
    if (!meta?.constitutionalJustification) {
      violations.push({
        principleId: this.id,
        ruleId: rule.id,
        description: 'Rule lacks constitutional justification metadata',
        fixSuggestion: 'Add constitutionalJustification with reasoning chain',
      })
    }
    return violations
  }
}

export class ReversibilityPrinciple implements ConstitutionalPrinciple {
  id = 'reversibility'
  name = 'Reversibilidade'
  description = 'Toda regra deve ter rollback testado antes do deploy'
  severity: 'should' = 'should'

  async verify(rule: PolicyRule): Promise<PrincipleViolation[]> {
    const violations: PrincipleViolation[] = []
    if (!rule.rollbackPlan) {
      violations.push({
        principleId: this.id,
        ruleId: rule.id,
        description: 'No rollback plan defined for this rule',
        fixSuggestion: 'Add rollbackPlan with remove_rule and restore_previous steps',
      })
    }
    return violations
  }
}

export class NonDiscriminationPrinciple implements ConstitutionalPrinciple {
  id = 'non_discrimination'
  name = 'Nao-Discriminacao'
  description = 'Regras nao podem conter vies demografico ou linguistico'
  severity: 'must' = 'must'

  async verify(rule: PolicyRule): Promise<PrincipleViolation[]> {
    const violations: PrincipleViolation[] = []
    const biasedPatterns: RegExp[] = [
      /nativ(e|es?)\s+(language|tongue)/i,
      /foreign\s+(language|accent)/i,
      /religious\s+(text|term|word)/i,
      /political\s+(view|opinion|statement)/i,
    ]

    if (rule.pattern) {
      for (const bp of biasedPatterns) {
        if (bp.test(rule.pattern)) {
          violations.push({
            principleId: this.id,
            ruleId: rule.id,
            description: `Pattern may contain discriminatory term: ${bp.source}`,
            fixSuggestion: 'Replace biased pattern with content-agnostic alternative',
          })
        }
      }
    }
    return violations
  }
}
