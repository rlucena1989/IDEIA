import { BlueprintDefinition, BlueprintVariable, BlueprintStructure } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('blueprint-composer');

export interface CompositionResult {
  blueprint: BlueprintDefinition
  conflicts: string[]
  mergedFrom: string[]
}

export class BlueprintComposer {
  compose(blueprints: BlueprintDefinition[]): CompositionResult {
    if (blueprints.length === 0) throw new Error('No blueprints to compose')

    const base = JSON.parse(JSON.stringify(blueprints[0])) as BlueprintDefinition
    const conflicts: string[] = []
    const mergedFrom: string[] = [base.name]

    for (let i = 1; i < blueprints.length; i++) {
      const current = blueprints[i]
      mergedFrom.push(current.name)

      base.tags = [...new Set([...base.tags, ...current.tags])]

      base.variables = this._mergeVariables(base.variables, current.variables, conflicts)
      base.structure = { ...base.structure, ...current.structure }
      base.dependencies = this._mergeDependencies(base.dependencies, current.dependencies, conflicts)
    }

    base.name = `${base.name}-composed`
    base.description = `Composition of: ${mergedFrom.join(', ')}`

    return { blueprint: base, conflicts, mergedFrom }
  }

  private _mergeVariables(base: BlueprintVariable[], incoming: BlueprintVariable[], conflicts: string[]): BlueprintVariable[] {
    const merged = new Map(base.map(v => [v.name, v]))
    for (const v of incoming) {
      if (merged.has(v.name)) {
        conflicts.push(`Variable "${v.name}" defined in multiple blueprints, using first definition`)
      } else {
        merged.set(v.name, v)
      }
    }
    return Array.from(merged.values())
  }

  private _mergeDependencies(base: any, incoming: any, conflicts: string[]): any {
    const merged = { ...base }
    for (const [key, value] of Object.entries(incoming)) {
      if (typeof value === 'object' && value !== null) {
        if (!merged[key]) merged[key] = {}
        for (const [depName, depVersion] of Object.entries(value as Record<string, string>)) {
          if (merged[key][depName] && merged[key][depName] !== depVersion) {
            conflicts.push(`Dependency "${depName}" version conflict: ${merged[key][depName]} vs ${depVersion}, using first`)
          } else {
            merged[key][depName] = depVersion
          }
        }
      }
    }
    return merged
  }
}
