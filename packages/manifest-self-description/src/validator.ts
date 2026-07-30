import { createLogger } from '@ideia/logger'
import { Manifest, ValidationResult, RealityValidationResult, ValidationError, ValidationWarning } from './types'

const logger = createLogger('manifest-validator')

export class ManifestValidator {
  validate(manifest: unknown): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (!manifest || typeof manifest !== 'object') {
      errors.push({ path: '', message: 'Manifest must be a non-null object', code: 'INVALID_TYPE' })
      return { valid: false, errors, warnings }
    }

    const m = manifest as Record<string, unknown>

    const requiredFields = ['id', 'version', 'name', 'description', 'architecture', 'agents', 'capabilities', 'tools', 'commands', 'contextPacks', 'registries', 'adapters', 'workflows', 'limitations']
    for (const field of requiredFields) {
      if (!(field in m)) {
        errors.push({ path: field, message: `Missing required field: ${field}`, code: 'MISSING_FIELD' })
      }
    }

    if (m.id !== undefined && typeof m.id !== 'string') {
      errors.push({ path: 'id', message: 'id must be a string', code: 'INVALID_TYPE' })
    }

    if (m.version !== undefined && !/^\d+\.\d+\.\d+$/.test(String(m.version))) {
      errors.push({ path: 'version', message: 'version must follow semver (x.y.z)', code: 'INVALID_FORMAT' })
    }

    if (m.agents !== undefined && Array.isArray(m.agents)) {
      for (let i = 0; i < m.agents.length; i++) {
        const agent = m.agents[i] as Record<string, unknown>
        if (!agent.id) {
          warnings.push({ path: `agents[${i}]`, message: 'Agent without id', code: 'MISSING_AGENT_ID' })
        }
      }
    }

    if (m.description !== undefined && typeof m.description === 'string' && m.description.toString().length > 2000) {
      warnings.push({ path: 'description', message: 'Description exceeds 2000 characters', code: 'TOO_LONG' })
    }

    return { valid: errors.length === 0, errors, warnings }
  }

  validateAgainstReality(manifest: Manifest): RealityValidationResult {
    const missing: string[] = []
    const extra: string[] = []
    const inconsistencies: string[] = []

    if (manifest.agents.length < 6) {
      missing.push(`Expected 6 agents, found ${manifest.agents.length}`)
    }

    if (manifest.limitations.maxContextWindow < 128000) {
      inconsistencies.push(`maxContextWindow ${manifest.limitations.maxContextWindow} is below minimum 128000`)
    }

    logger.info('Reality validation complete', { valid: missing.length === 0 && inconsistencies.length === 0 })
    return {
      valid: missing.length === 0 && extra.length === 0 && inconsistencies.length === 0,
      missing,
      extra,
      inconsistencies,
    }
  }
}
