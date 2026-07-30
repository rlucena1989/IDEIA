import { BlueprintDefinition } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('evolutionary-blueprint-optimizer');

export interface OptimizationResult {
  blueprint: BlueprintDefinition
  improvements: string[]
  score: number
}

export class EvolutionaryBlueprintOptimizer {
  async optimize(blueprint: BlueprintDefinition): Promise<OptimizationResult> {
    const improvements: string[] = []
    let score = 50

    if (!blueprint.author) {
      blueprint.author = 'IDEIA'
      improvements.push('Added missing author field')
      score += 5
    }

    if (blueprint.variables.length === 0) {
      improvements.push('Blueprint has no variables - added projectName')
      blueprint.variables.push({ name: 'projectName', type: 'string', required: true, description: 'Project name', validate: '^[a-z0-9-]+$' })
      score += 10
    }

    for (const v of blueprint.variables) {
      if (v.required && !v.validate) {
        improvements.push(`Variable "${v.name}" has no validation pattern`)
        score -= 5
      }
    }

    if (!blueprint.configs?.tsconfig) {
      improvements.push('No tsconfig configuration defined')
      score -= 10
    }

    if (!blueprint.postProcess?.length) {
      improvements.push('No post-processing steps defined (git init, npm install)')
      score -= 5
    }

    if (blueprint.extends?.length > 3) {
      improvements.push('Deep inheritance chain (>3 levels) may cause complexity')
      score -= 5
    }

    const depCount = Object.keys(blueprint.dependencies.dependencies).length +
      Object.keys(blueprint.dependencies.devDependencies).length
    if (depCount === 0) {
      improvements.push('No dependencies defined')
      score -= 15
    } else {
      score += Math.min(15, depCount)
    }

    return { blueprint, improvements, score: Math.max(0, Math.min(100, score)) }
  }
}
