import { createLogger } from '@ideia/logger'
import { Specification, ValidationIssue } from './types'

const logger = createLogger('spec-validator')

export class SpecValidator {
  validate(spec: Specification): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    if (!spec.overview || spec.overview.length < 10) {
      issues.push({ type: 'error', section: 'overview', message: 'Overview is too short or empty' })
    }

    if (spec.functionalRequirements.length === 0) {
      issues.push({ type: 'warning', section: 'functionalRequirements', message: 'No functional requirements defined' })
    }

    if (spec.userProfiles.length === 0) {
      issues.push({ type: 'warning', section: 'userProfiles', message: 'No user profiles defined' })
    }

    for (let i = 0; i < spec.functionalRequirements.length; i++) {
      const req = spec.functionalRequirements[i]
      if (req.description.length < 5) {
        issues.push({ type: 'error', section: `functionalRequirements[${i}]`, message: `Requirement ${req.id} description is too short` })
      }
      if (/rapido|eficiente|melhor|otimizado/i.test(req.description)) {
        issues.push({ type: 'warning', section: `functionalRequirements[${i}]`, message: `Requirement ${req.id} contains ambiguous term` })
      }
    }

    logger.info(`Validation complete`, { errors: issues.filter(i => i.type === 'error').length, warnings: issues.filter(i => i.type === 'warning').length })
    return issues
  }
}
