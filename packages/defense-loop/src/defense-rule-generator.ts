import { createLogger } from '@ideia/logger';
import {  BypassTechnique, PolicyRule, RuleGenerationStrategy, EventBus,
} from './types'
const logger = createLogger('defense-rule-generator');

export class DefenseRuleGenerator {
  private _strategies: RuleGenerationStrategy[] = []
  private _generatedRules: Map<string, PolicyRule> = new Map()

  constructor(private _eventBus?: EventBus) {
    this._registerDefaults()
  }

  private _registerDefaults(): void {
    this._strategies.push(new RegexRuleStrategy())
    this._strategies.push(new EmbeddingRuleStrategy())
    this._strategies.push(new BehavioralRuleStrategy())
    this._strategies.sort((a, b) => a.priority - b.priority)
  }

  registerStrategy(strategy: RuleGenerationStrategy): void {
    this._strategies.push(strategy)
    this._strategies.sort((a, b) => a.priority - b.priority)
  }

  async generate(analysis: BypassTechnique): Promise<PolicyRule> {
    for (const strategy of this._strategies) {
      try {
        const rule: PolicyRule = await strategy.generate(analysis)
        if (this._isValidRule(rule)) {
          this._generatedRules.set(rule.id, rule)
          void this._eventBus?.publish('security.defense.rule_generated', {
            ruleId: rule.id,
            type: rule.type,
            strategy: strategy.name,
            severity: rule.severity,
          })
          return rule
        }
      } catch {
        continue
      }
    }
    return this._fallbackRule(analysis)
  }

  async generateFromMultiple(analyses: BypassTechnique[]): Promise<PolicyRule[]> {
    const rules: PolicyRule[] = []
    for (const analysis of analyses) {
      const existing: PolicyRule[] = Array.from(this._generatedRules.values())
      const rule: PolicyRule = await this.generate(analysis)
      const isDuplicate: boolean = existing.some(r =>
        r.type === rule.type && r.pattern === rule.pattern
      )
      if (!isDuplicate) rules.push(rule)
    }
    return rules
  }

  private _isValidRule(rule: PolicyRule): boolean {
    if (!rule.id || !rule.type || !rule.severity) return false
    if (rule.type === 'regex' && !rule.pattern) return false
    if (!['block', 'review', 'log'].includes(rule.action)) return false
    return true
  }

  private _fallbackRule(analysis: BypassTechnique): PolicyRule {
    return {
      id: `fallback-${crypto.randomUUID().slice(0, 8)}`,
      type: 'regex',
      pattern: analysis.bypassVector.join('|').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      action: analysis.severity === 'critical' ? 'block' : 'review',
      severity: analysis.severity,
      source: 'auto_generated',
      createdAt: new Date(),
    }
  }

  getGeneratedRules(): PolicyRule[] {
    return Array.from(this._generatedRules.values())
  }

  clearGeneratedRules(): void {
    this._generatedRules.clear()
  }
}

export class RegexRuleStrategy implements RuleGenerationStrategy {
  name = 'regex'
  priority = 1

  async generate(analysis: BypassTechnique): Promise<PolicyRule> {
    let pattern = ''
    switch (analysis.type) {
      case 'encoding_evasion':
        pattern = `(?:${analysis.bypassVector.filter(v => /\\[xun]|base64|percent/i.test(v)).join('|')})`
        break
      case 'semantic_evasion':
        pattern = '(?:educational|hypothetical|simulation|security audit)'
        break
      case 'contextual_evasion':
        pattern = '(?:ignore\\s+(?:all\\s+)?previous|new\\s+instructions|override)'
        break
      case 'splitting_evasion':
        pattern = '(?:\\[SPLIT\\]|\\[PART_\\d\\]|<!--\\s*split\\s*-->)'
        break
      default:
        pattern = analysis.bypassVector.join('|')
    }
    return {
      id: `D-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      type: 'regex',
      pattern,
      action: analysis.severity === 'critical' ? 'block' : 'review',
      severity: analysis.severity,
      source: 'auto_generated',
      createdAt: new Date(),
    }
  }
}

export class EmbeddingRuleStrategy implements RuleGenerationStrategy {
  name = 'embedding'
  priority = 2

  async generate(analysis: BypassTechnique): Promise<PolicyRule> {
    const reference: number[] = analysis.embedding || new Array(384).fill(0)
    return {
      id: `EMB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      type: 'embedding',
      reference,
      threshold: 0.85,
      action: 'review',
      severity: analysis.severity,
      source: 'auto_generated',
      createdAt: new Date(),
    }
  }
}

export class BehavioralRuleStrategy implements RuleGenerationStrategy {
  name = 'behavioral'
  priority = 3

  async generate(analysis: BypassTechnique): Promise<PolicyRule> {
    return {
      id: `BEH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      type: 'behavioral',
      threshold: 0.75,
      action: 'log',
      severity: analysis.severity,
      source: 'auto_generated',
      createdAt: new Date(),
    }
  }
}
