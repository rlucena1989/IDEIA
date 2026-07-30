import { Logger } from '@ideia/logger'
import {
  PolicyRule, ActionVariant, CounterfactualExplanation, PolicyEngine,
} from './types'

export class CounterfactualDefenseExplainer {
  private readonly _MAX_VARIANTS = 10
  private readonly _MIN_EDIT_DISTANCE = 1
  private readonly _MAX_EDIT_DISTANCE = 5

  constructor(private _policyEngine: PolicyEngine, private _logger: Logger) {}

  async explain(
    action: string,
    blockedBy: PolicyRule
  ): Promise<CounterfactualExplanation> {
    const candidates: string[] = this._generateCandidates(action)
    const counterfactuals: ActionVariant[] = []

    for (const candidate of candidates) {
      if (counterfactuals.length >= this._MAX_VARIANTS) break
      const result: ActionVariant = await this._evaluateVariant(candidate, action)
      counterfactuals.push(result)
    }

    const allowed: ActionVariant[] = counterfactuals.filter(c => c.allowed)
    const minimalChange: ActionVariant = allowed.sort((a, b) => a.editDistance - b.editDistance)[0] ||
      this._createNoViableExplanation(action)

    const narrative: string = this._generateNarrative(action, blockedBy, minimalChange)

    return {
      action,
      blockedBy,
      counterfactuals,
      minimalChange,
      narrative,
      timestamp: Date.now(),
    }
  }

  private _generateCandidates(original: string): string[] {
    const candidates: string[] = []
    const words: string[] = original.split(/\s+/)

    for (let i = 0; i < words.length; i++) {
      const variant: string = words.filter((_, idx) => idx !== i).join(' ')
      if (this._isValidEditDistance(original, variant)) {
        candidates.push(variant)
      }
    }

    const synonyms: Record<string, string[]> = {
      ignore: ['review', 'check', 'examine', 'display', 'show'],
      delete: ['read', 'view', 'list', 'show'],
      execute: ['simulate', 'display', 'show'],
      override: ['update', 'modify', 'change', 'set'],
      all: ['the', 'current', 'these'],
      previous: ['current', 'these', 'existing', 'above'],
      instructions: ['content', 'text', 'information', 'data', 'file'],
    }

    for (let i = 0; i < words.length; i++) {
      const wordLower: string = words[i].toLowerCase()
      const replacements: string[] | undefined = synonyms[wordLower]
      if (!replacements) continue

      for (const replacement of replacements) {
        const variantArr: string[] = [...words]
        variantArr[i] = replacement
        const variantStr: string = variantArr.join(' ')
        if (this._isValidEditDistance(original, variantStr) &&
            !candidates.includes(variantStr)) {
          candidates.push(variantStr)
        }
      }
    }

    const clauses: string[] = original.split(/[,;]/).map(c => c.trim())
    if (clauses.length >= 2) {
      for (let i = 1; i < clauses.length; i++) {
        const reordered: string = [...clauses.slice(i), ...clauses.slice(0, i)].join(' ')
        if (this._isValidEditDistance(original, reordered)) {
          candidates.push(reordered)
        }
      }
    }

    const safePrefixes: string[] = [
      'I need help to',
      'Please show me',
      'Can you explain',
      'For documentation purposes,',
      'As part of my work,',
    ]
    for (const prefix of safePrefixes) {
      const variant: string = `${prefix} ${original.toLowerCase()}`
      candidates.push(variant)
    }

    candidates.sort((a, b) => this._levenshteinDistance(original, a) -
      this._levenshteinDistance(original, b))

    return candidates
  }

  private async _evaluateVariant(
    variant: string,
    original: string
  ): Promise<ActionVariant> {
    const result = await this._policyEngine.evaluate({
      action: 'agent:execute',
      context: { prompt: variant },
    })

    const editDist: number = this._levenshteinDistance(original, variant)
    const allowed: boolean = !(result as any).denied

    return {
      variant,
      allowed,
      rulesMatched: allowed ? [] : [(result as any).blockedBy || 'unknown'],
      editDistance: editDist,
      changeDescription: this._describeChange(original, variant),
    }
  }

  private _describeChange(original: string, variant: string): string {
    const origWords: string[] = original.split(/\s+/)
    const varWords: string[] = variant.split(/\s+/)

    const removed: string[] = origWords.filter(w => !varWords.includes(w))
    const added: string[] = varWords.filter(w => !origWords.includes(w))
    const changed: string[] = origWords.filter((w, i) => varWords[i] && w !== varWords[i])

    const parts: string[] = []
    if (removed.length > 0) parts.push(`remove "${removed.join(' ')}"`)
    if (added.length > 0) parts.push(`add "${added.join(' ')}"`)
    if (changed.length > 0) {
      const idx: number = origWords.indexOf(changed[0])
      parts.push(`replace "${changed[0]}" with "${varWords[idx]}"`)
    }

    return parts.join(', ') || 'minor rephrasing'
  }

  private _generateNarrative(
    action: string,
    blockedBy: PolicyRule,
    minimalChange: ActionVariant
  ): string {
    if (!minimalChange.allowed) {
      return `Sua acao foi bloqueada pela regra **${blockedBy.id}** (${blockedBy.type}: \`${blockedBy.pattern || 'N/A'}\`). Nenhuma variacao simples encontrada que permita a acao. Consulte o time de seguranca para revisao manual.`
    }

    return [
      `## Acao Bloqueada`,
      `**Acao:** \`${action}\``,
      `**Regra:** ${blockedBy.id} (${blockedBy.type}: \`${(blockedBy.pattern || '').slice(0, 50) || 'N/A'}\`)`,
      ``,
      `## Modificacao Minima Permitida`,
      `**Variante:** \`${minimalChange.variant}\``,
      `**Mudanca:** ${minimalChange.changeDescription}`,
      `**Distancia de edicao:** ${minimalChange.editDistance} caracteres`,
      ``,
      `## Como Resolver`,
      `1. Substitua sua acao original por:`,
      `   \`${minimalChange.variant}\``,
      `2. Ou modifique a acao original: ${minimalChange.changeDescription}`,
      `3. Se precisar da acao original, solicite excecao ao time de seguranca`,
    ].join('\n')
  }

  private _isValidEditDistance(original: string, variant: string): boolean {
    const dist: number = this._levenshteinDistance(original, variant)
    return dist >= this._MIN_EDIT_DISTANCE && dist <= this._MAX_EDIT_DISTANCE
  }

  private _levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost: number = a[j - 1] === b[i - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        )
      }
    }

    return matrix[b.length][a.length]
  }

  private _createNoViableExplanation(action: string): ActionVariant {
    return {
      variant: action,
      allowed: false,
      rulesMatched: ['multiple'],
      editDistance: 0,
      changeDescription: 'Nenhuma variacao viavel encontrada',
    }
  }
}
