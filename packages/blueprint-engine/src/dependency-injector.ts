import { BlueprintDependencies } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('dependency-injector');

export interface ResolvedDependencies {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
  optionalDependencies: Record<string, string>
  errors: Array<{ code: string; package: string; message: string }>
  warnings: string[]
}

export class DependencyInjector {
  async resolve(
    blueprintDeps: BlueprintDependencies,
    existingDeps?: Record<string, string>,
  ): Promise<ResolvedDependencies> {
    const allDeps: Record<string, { version: string; type: string; conflict?: boolean }> = {}

    for (const [name, version] of Object.entries(blueprintDeps.dependencies)) {
      allDeps[name] = { version, type: 'dependency' }
    }
    for (const [name, version] of Object.entries(blueprintDeps.devDependencies)) {
      allDeps[name] = { version, type: 'devDependency' }
    }
    for (const [name, version] of Object.entries(blueprintDeps.peerDependencies)) {
      allDeps[name] = { version, type: 'peerDependency' }
    }
    for (const [name, version] of Object.entries(blueprintDeps.optionalDependencies)) {
      allDeps[name] = { version, type: 'optionalDependency' }
    }

    if (existingDeps) {
      for (const [name, version] of Object.entries(existingDeps)) {
        if (allDeps[name]) {
          allDeps[name] = {
            ...allDeps[name],
            version,
            conflict: allDeps[name].version !== version,
          }
        }
      }
    }

    const errors: Array<{ code: string; package: string; message: string }> = []
    for (const [name, entry] of Object.entries(allDeps)) {
      if (entry.type === 'peerDependency' && !allDeps[name]) {
        errors.push({ code: 'MISSING_PEER', package: name, message: `Peer dependency ${name}@${entry.version} not found` })
      }
    }

    return {
      dependencies: this._filterByType(allDeps, 'dependency'),
      devDependencies: this._filterByType(allDeps, 'devDependency'),
      peerDependencies: this._filterByType(allDeps, 'peerDependency'),
      optionalDependencies: this._filterByType(allDeps, 'optionalDependency'),
      errors,
      warnings: [],
    }
  }

  async resolveLatest(packageName: string): Promise<string> {
    try {
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`)
      if (!res.ok) return 'latest'
      const data = await res.json() as any
      return data.version || 'latest'
    } catch {
      return 'latest'
    }
  }

  private _filterByType(deps: Record<string, { version: string; type: string }>, type: string): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [name, entry] of Object.entries(deps)) {
      if (entry.type === type) result[name] = entry.version
    }
    return result
  }
}
