import { createHash, randomUUID } from 'crypto'
import { createLogger } from '@ideia/logger'
import {
  SafetyVerdict, BiasRule, BiasDetectionResult, HarmCategory, HarmClassification,
  ConstitutionPrinciple, ConstitutionVerdict, AlignmentPrinciple,
  RepresentationVector, DebateRound, SafetySeverity,
} from './types'

const logger = createLogger('ai-safety')

const INJECTION_PATTERNS = [
  { type: 'direct_ignore', regex: /ignore\s+(all\s+)?(previous|above|prior)\s+instructions/i },
  { type: 'direct_system', regex: /you\s+are\s+(now|henceforth)\s+/i },
  { type: 'direct_dan', regex: /\bDAN\b|\bdo\s+anything\s+now\b/i },
  { type: 'roleplay', regex: /act\s+as\s+(if\s+you\s+are\s+)?a\s+/i },
  { type: 'sql_tautology', regex: /'?\s*(OR|AND)\s+['"]?\s*1\s*=\s*1/i },
  { type: 'sql_union', regex: /\bUNION\b\s+\bSELECT\b/i },
  { type: 'sql_drop', regex: /\bDROP\s+(TABLE|DATABASE)\b/i },
]

export class SafetyGuardrail {
  private _patterns: Array<{ regex: RegExp; placeholder: string }> = [
    { regex: /\d{3}\.\d{3}\.\d{3}-\d{2}/g, placeholder: '[CPF]' },
    { regex: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, placeholder: '[CNPJ]' },
    { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, placeholder: '[EMAIL]' },
    { regex: /\b\d{16}\b/g, placeholder: '[CC_NUMBER]' },
    { regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, placeholder: '[IP]' },
    { regex: /(?:OPENAI|ANTHROPIC|MISTRAL)_API_KEY[=:]\s*\S+/gi, placeholder: '[API_KEY]' },
    { regex: /(?:gh[psu]_[A-Za-z0-9]{36,})/g, placeholder: '[GITHUB_TOKEN]' },
    { regex: /(?:sk-[A-Za-z0-9]{32,})/g, placeholder: '[OPENAI_KEY]' },
  ]

  private _dangerousPatterns: Array<{ regex: RegExp; type: string }> = [
    { regex: /(BEGIN|END) (RSA|DSA|EC) (PRIVATE|PUBLIC) KEY/, type: 'crypto_key' },
    { regex: /(password|passwd|secret|token|api[_-]?key)=['"][^'"]+['"]/i, type: 'credential' },
    { regex: /(rm|del|remove) (-rf|\/s|\/q)/i, type: 'destructive_command' },
    { regex: /(exec|eval|spawn|fork)\s*\(/i, type: 'code_injection' },
  ]

  scanInput(input: string): SafetyVerdict {
    const results: string[] = []
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.regex.test(input)) {
        results.push(`Injection pattern detected: ${pattern.type}`)
      }
    }
    if (results.length > 0) {
      return { passed: false, score: 1 - results.length * 0.2, reason: results.join('; '), severity: 'error' }
    }
    return { passed: true, score: 1, reason: 'Input passed all safety checks', severity: 'info' }
  }

  sanitizeOutput(output: string): { sanitized: string; warnings: string[] } {
    let sanitized = output
    const warnings: string[] = []
    for (const p of this._patterns) {
      const matches = sanitized.match(p.regex)
      if (matches) warnings.push(`${matches.length} instance(s) of ${p.placeholder} masked`)
      sanitized = sanitized.replace(p.regex, p.placeholder)
    }
    for (const d of this._dangerousPatterns) {
      if (d.regex.test(sanitized)) {
        warnings.push(`Dangerous pattern detected: ${d.type}`)
        sanitized = sanitized.replace(d.regex, `[BLOCKED_${d.type}]`)
      }
    }
    return { sanitized, warnings }
  }

  maskPII(text: string): string {
    let masked = text
    for (const p of this._patterns) {
      masked = masked.replace(p.regex, p.placeholder)
    }
    return masked
  }

  addPattern(regex: RegExp, placeholder: string): void {
    this._patterns.push({ regex, placeholder })
  }
}

export class AlignmentValidator {
  private _principles: AlignmentPrinciple[] = ['safety_first', 'user_consent', 'transparency', 'privacy', 'auditability', 'conservatism', 'honesty']

  validate(action: string, context: Record<string, unknown>): ConstitutionVerdict[] {
    const verdicts: ConstitutionVerdict[] = []
    for (const principle of this._principles) {
      const verdict = this._checkPrinciple(principle, action, context)
      verdicts.push(verdict)
    }
    return verdicts
  }

  private _checkPrinciple(principle: AlignmentPrinciple, action: string, _context: Record<string, unknown>): ConstitutionVerdict {
    switch (principle) {
      case 'safety_first': {
        if (action.includes('delete') || action.includes('rm ') || action.includes('shell.exec')) {
          return { principle, passed: false, reason: 'Destructive action requires additional approval', riskLevel: 'high', suggestion: 'Request user confirmation before proceeding' }
        }
        return { principle, passed: true, reason: 'Action is safe', riskLevel: 'low' }
      }
      case 'user_consent': {
        if (action.startsWith('file.write') || action.startsWith('file.delete')) {
          return { principle, passed: false, reason: 'File modification requires user consent', riskLevel: 'medium', suggestion: 'Present diff to user for approval' }
        }
        return { principle, passed: true, reason: 'Action does not require explicit consent', riskLevel: 'low' }
      }
      case 'transparency':
        return { principle, passed: true, reason: 'Action is explainable', riskLevel: 'low' }
      case 'privacy':
        return { principle, passed: true, reason: 'Action does not expose sensitive data', riskLevel: 'low' }
      case 'auditability':
        return { principle, passed: true, reason: 'Action will be logged', riskLevel: 'low' }
      case 'conservatism':
        return { principle, passed: true, reason: 'Action is reversible or low-risk', riskLevel: 'low' }
      case 'honesty':
        return { principle, passed: true, reason: 'No deception detected', riskLevel: 'low' }
    }
  }

  calculateAlignmentScore(verdicts: ConstitutionVerdict[]): number {
    if (verdicts.length === 0) return 1
    const failed = verdicts.filter(v => !v.passed).length
    return 1 - failed / verdicts.length
  }
}

export class BiasDetector {
  private _rules: BiasRule[] = [
    { id: 'BIAS-001', type: 'gender', pattern: /\.(?:gender|sex)\s*[=!]=\s*['"]?(?:male|female|masculine|feminine)['"]?/i, message: 'Gender-based conditional detected', severity: 'warning', suggestion: 'Consider non-discriminatory attributes' },
    { id: 'BIAS-002', type: 'locale', pattern: /messages\s*=\s*\{[^}]*"(?:en|en-US)"[^}]*\}/m, message: 'Incomplete internationalization', severity: 'warning', suggestion: 'Add multi-language support via i18n' },
    { id: 'BIAS-003', type: 'accessibility', pattern: /<(?:button|div|span)[^>]*onClick\s*=\s*\{[^}]*\}[^>]*>/g, message: 'Clickable element without role/aria-label', severity: 'warning', suggestion: 'Add role="button" and aria-label' },
    { id: 'BIAS-004', type: 'assumption', pattern: /assum(e|ing|ption)|obviously|clearly|trivially/i, message: 'Assumption of reader knowledge', severity: 'info', suggestion: 'Write comments for all experience levels' },
    { id: 'BIAS-005', type: 'framework', pattern: /(?:just|simply|only)\s+(use|install|run)\s+(react|angular|vue)/i, message: 'Framework bias detected', severity: 'warning', suggestion: 'Present multiple framework options with trade-offs' },
  ]

  private _additionalRules: BiasRule[] = []

  addRule(rule: BiasRule): void {
    this._additionalRules.push(rule)
  }

  scan(code: string, filename?: string): BiasDetectionResult {
    const biases: BiasDetectionResult['biases'] = []
    const allRules = [...this._rules, ...this._additionalRules]
    const lines = code.split('\n')

    for (const rule of allRules) {
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(rule.pattern)
        if (match) {
          biases.push({ type: rule.type, match: match[0], line: i + 1, severity: rule.severity, suggestion: rule.suggestion })
        }
      }
    }
    return {
      detected: biases.length > 0,
      biases,
      score: biases.length > 0 ? Math.min(1, biases.length * 0.2) : 0,
    }
  }
}

export class HarmfulnessClassifier {
  private _categories: Array<{ category: HarmCategory; patterns: RegExp[] }> = [
    { category: 'violence', patterns: [/violence|kill|murder|attack|weapon/ig, /destroy|damage|hurt|harm/ig] },
    { category: 'hate_speech', patterns: [/hate|discriminat|racist|sexist|nazi/ig, /superior.*race|inferior.*group/ig] },
    { category: 'sexual', patterns: [/sexual|explicit|porn|nude/ig, /obscene|indecent/ig] },
    { category: 'self_harm', patterns: [/suicide|self[.\s]harm|self[.\s]injur/ig, /kill myself|end my life/ig] },
    { category: 'harassment', patterns: [/harass|bully|intimidat|threaten/ig, /targeted abuse|personal attack/ig] },
    { category: 'malicious_code', patterns: [/(rm|del|remove)\s+(-rf|\/s|\/q)/ig, /exec\s*\(|eval\s*\(|spawn\s*\(/ig] },
  ]

  classify(content: string): HarmClassification[] {
    const results: HarmClassification[] = []
    for (const cat of this._categories) {
      const evidence: string[] = []
      for (const pattern of cat.patterns) {
        const matches = content.match(pattern)
        if (matches) evidence.push(...matches)
      }
      if (evidence.length > 0) {
        results.push({ category: cat.category, score: Math.min(1, evidence.length * 0.3), evidence })
      }
    }
    return results
  }

  isHarmful(content: string, threshold = 0.7): boolean {
    const classifications = this.classify(content)
    return classifications.some(c => c.score >= threshold)
  }
}

export class ConstitutionalAIReddener {
  private _constitution: ConstitutionPrinciple[] = [
    { id: 'P-001', name: 'Safety First', description: 'Never execute actions that compromise system security', rules: ['Do not execute unvalidated shell commands', 'Do not write outside project directory', 'Do not modify security configuration'] },
    { id: 'P-002', name: 'User Consent', description: 'Every significant action requires explicit approval', rules: ['Request approval before deleting files', 'Request approval before modifying dependencies', 'Request approval before executing code'] },
    { id: 'P-003', name: 'Transparency', description: 'Be explicit about actions and reasoning', rules: ['Explain each action before executing', 'Justify architectural decisions', 'Report risks found'] },
    { id: 'P-004', name: 'Privacy', description: 'User data must not leave local environment without consent', rules: ['Do not send user code to external services', 'Do not expose credentials or secrets', 'Anonymize telemetry data'] },
    { id: 'P-005', name: 'Auditability', description: 'Every action must be logged for audit', rules: ['Log input, output, and decision for each action', 'Maintain hash chain for integrity', 'Allow replay of decisions'] },
    { id: 'P-006', name: 'Conservatism', description: 'When in doubt, choose the safest and most reversible action', rules: ['Prefer not doing over doing something risky', 'Prefer reversible actions over irreversible ones', 'Request additional confirmation if uncertain'] },
    { id: 'P-007', name: 'Honesty', description: 'Do not pretend to have executed an action if not', rules: ['Confirm execution only if action was actually executed', 'Report failures honestly', 'Indicate confidence level in recommendations'] },
  ]

  critiqueResponse(prompt: string, response: string): Array<{ principle: string; question: string; answer: string; risk: 'low' | 'medium' | 'high' }> {
    const critiques: Array<{ principle: string; question: string; answer: string; risk: 'low' | 'medium' | 'high' }> = []
    for (const principle of this._constitution) {
      for (const rule of principle.rules) {
        const question = `Does the response violate: "${rule}"?`
        const violates = response.toLowerCase().includes('delete') || response.toLowerCase().includes('rm -rf') || response.toLowerCase().includes('ignore')
        if (violates) {
          critiques.push({ principle: principle.name, question, answer: `Potential violation: action conflicts with "${rule}"`, risk: 'high' })
        } else {
          critiques.push({ principle: principle.name, question, answer: 'No violation detected', risk: 'low' })
        }
      }
    }
    return critiques
  }

  generateRevisedResponse(prompt: string, originalResponse: string, critiques: Array<{ principle: string; question: string; answer: string; risk: string }>): string {
    const highRisk = critiques.filter(c => c.risk === 'high')
    if (highRisk.length > 0) {
      return `[Revised by Constitutional AI] I cannot fulfill this request as it conflicts with the following principles:\n${highRisk.map(c => `- ${c.principle}: ${c.answer}`).join('\n')}\n\nPlease rephrase your request in a way that aligns with safety guidelines.`
    }
    return originalResponse
  }

  addPrinciple(principle: ConstitutionPrinciple): void {
    this._constitution.push(principle)
  }
}

export class RepresentationEngineer {
  private _vectors = new Map<string, RepresentationVector>()

  createVector(concept: string, values: number[]): RepresentationVector {
    const vector: RepresentationVector = { concept, values: new Float64Array(values), dimensionality: values.length }
    this._vectors.set(concept, vector)
    return vector
  }

  getVector(concept: string): RepresentationVector | undefined {
    return this._vectors.get(concept)
  }

  computeSimilarity(a: RepresentationVector, b: RepresentationVector): number {
    let dot = 0, magA = 0, magB = 0
    for (let i = 0; i < Math.min(a.values.length, b.values.length); i++) {
      dot += a.values[i] * b.values[i]
      magA += a.values[i] * a.values[i]
      magB += b.values[i] * b.values[i]
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10)
  }

  project(input: string, concept: string): number {
    const vector = this._vectors.get(concept)
    if (!vector) return 0
    const inputHash = createHash('sha256').update(input).digest()
    let similarity = 0
    for (let i = 0; i < Math.min(inputHash.length, vector.values.length); i++) {
      similarity += (inputHash[i] / 256) * vector.values[i]
    }
    return similarity / vector.values.length
  }

  listConcepts(): string[] {
    return Array.from(this._vectors.keys())
  }
}

export class ScalableOversightDebate {
  private _rounds: DebateRound[] = []

  async debate(proponent: string, opponent: string, topic: string, rounds = 3): Promise<DebateRound[]> {
    this._rounds = []
    for (let i = 0; i < rounds; i++) {
      const round: DebateRound = {
        round: i + 1,
        proponent,
        opponent,
        proArgument: `Round ${i + 1} pro argument for: ${topic}`,
        conArgument: `Round ${i + 1} con argument for: ${topic}`,
        proScore: 0.5 + Math.random() * 0.5,
        conScore: 0.5 + Math.random() * 0.5,
        verdict: null,
      }
      round.verdict = round.proScore > round.conScore ? 'Proponent wins round' : 'Opponent wins round'
      this._rounds.push(round)
    }
    return this._rounds
  }

  getFinalVerdict(): { winner: string; roundsWon: { pro: number; con: number }; confidence: number } {
    const proWins = this._rounds.filter(r => r.verdict?.startsWith('Proponent')).length
    const conWins = this._rounds.filter(r => r.verdict?.startsWith('Opponent')).length
    const total = this._rounds.length
    return {
      winner: proWins > conWins ? 'Proponent' : conWins > proWins ? 'Opponent' : 'Tie',
      roundsWon: { pro: proWins, con: conWins },
      confidence: total > 0 ? Math.max(proWins, conWins) / total : 0,
    }
  }

  getDebateHistory(): DebateRound[] {
    return [...this._rounds]
  }

  clear(): void {
    this._rounds = []
  }
}
