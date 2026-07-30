import { createLogger } from '@ideia/logger'
import { Specification, ScopeDefinition, UserProfile, Requirement, UseCase, Criterion, AmbiguityResult } from './types'
import { AmbiguityDetector } from './ambiguity-detector'

const logger = createLogger('spec-generator')

export class SpecGenerator {
  private ambiguityDetector: AmbiguityDetector

  constructor(ambiguityDetector?: AmbiguityDetector) {
    this.ambiguityDetector = ambiguityDetector ?? new AmbiguityDetector()
  }

  async generate(title: string, rawText: string): Promise<Specification> {
    const ambiguities = this.ambiguityDetector.detect(rawText)

    const now = new Date().toISOString()
    const spec: Specification = {
      id: `spec-${Date.now()}`,
      title,
      overview: rawText.slice(0, 500),
      objectives: this.extractObjectives(rawText),
      scope: this.extractScope(rawText),
      userProfiles: this.extractUserProfiles(rawText),
      functionalRequirements: this.extractFunctionalRequirements(rawText),
      nonFunctionalRequirements: this.extractNonFunctionalRequirements(rawText),
      useCases: this.extractUseCases(rawText),
      acceptanceCriteria: this.extractAcceptanceCriteria(rawText),
      suggestedArchitecture: { pattern: 'Clean Architecture' },
      createdAt: now,
      version: '1.0.0',
    }

    logger.info(`Spec generated`, { id: spec.id, title, ambiguities: ambiguities.length })
    return spec
  }

  private extractObjectives(text: string): string[] {
    const objectives: string[] = []
    const lines = text.split('\n')
    let inObjectives = false
    for (const line of lines) {
      if (/objetivos?|objectives?|goal/i.test(line)) { inObjectives = true; continue }
      if (inObjectives && /^[-*]\s/.test(line)) { objectives.push(line.replace(/^[-*]\s/, '')) }
      if (inObjectives && /^[A-Z][a-z]+:/.test(line)) { objectives.push(line.trim()) }
      if (inObjectives && line.trim() === '') { inObjectives = false }
    }
    return objectives.length > 0 ? objectives : ['Implement ' + text.split(' ').slice(0, 5).join(' ')]
  }

  private extractScope(text: string): ScopeDefinition {
    const inScope: string[] = []
    const outOfScope: string[] = []
    const lines = text.split('\n')
    let current: 'in' | 'out' | null = null
    for (const line of lines) {
      if (/in-scope|in scope|escopo/i.test(line)) { current = 'in'; continue }
      if (/out.of.scope|out of scope|fora.do.escopo/i.test(line)) { current = 'out'; continue }
      if (current === 'in' && /^[-*]\s/.test(line)) { inScope.push(line.replace(/^[-*]\s/, '')) }
      if (current === 'out' && /^[-*]\s/.test(line)) { outOfScope.push(line.replace(/^[-*]\s/, '')) }
      if (line.trim() === '') { current = null }
    }
    return { inScope, outOfScope, constraints: [] }
  }

  private extractUserProfiles(text: string): UserProfile[] {
    const profiles: UserProfile[] = []
    const lines = text.split('\n')
    for (const line of lines) {
      const match = line.match(/^(?:usuário|usuario|user|perfil)\s*[:\-]?\s*(.+)/i)
      if (match) {
        profiles.push({ name: match[1].trim(), role: match[1].trim(), description: match[1].trim() })
      }
    }
    if (profiles.length === 0) {
      profiles.push({ name: 'End User', role: 'end-user', description: 'Primary user of the system' })
    }
    return profiles
  }

  private extractFunctionalRequirements(text: string): Requirement[] {
    const reqs: Requirement[] = []
    const lines = text.split('\n')
    let counter = 0
    for (const line of lines) {
      if (/^(?:RF|FR|funcional|requisito|must|shall)\b/i.test(line.trim())) {
        counter++
        reqs.push({
          id: `FR-${counter}`,
          type: 'functional',
          description: line.trim(),
          priority: 'essential',
        })
      }
    }
    if (reqs.length === 0) {
      reqs.push({ id: 'FR-1', type: 'functional', description: 'System shall support the described functionality', priority: 'essential' })
    }
    return reqs
  }

  private extractNonFunctionalRequirements(text: string): Requirement[] {
    const reqs: Requirement[] = []
    const lines = text.split('\n')
    let counter = 0
    for (const line of lines) {
      if (/^(?:RNF|NFR|nao.funcional|não.funcional|performance|segurança|seguranca)\b/i.test(line.trim())) {
        counter++
        reqs.push({ id: `NFR-${counter}`, type: 'non-functional', description: line.trim(), priority: 'important' })
      }
    }
    return reqs
  }

  private extractUseCases(text: string): UseCase[] {
    return []
  }

  private extractAcceptanceCriteria(text: string): Criterion[] {
    const criteria: Criterion[] = []
    const lines = text.split('\n')
    let counter = 0
    for (const line of lines) {
      if (/^(?:CA|AC|criterio|criterion|acceptance)\b/i.test(line.trim())) {
        counter++
        criteria.push({
          id: `CA-${counter}`,
          description: line.trim(),
          type: 'functional',
          verify: 'test',
        })
      }
    }
    return criteria
  }
}
