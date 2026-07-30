import { createLogger } from '@ideia/logger'
import { BlueprintDependency } from './types'

const logger = createLogger('dependency-injector')

export class DependencyInjector {
  resolve(deps: BlueprintDependency[]): Record<string, string> {
    const resolved: Record<string, string> = {}
    const npmDeps: string[] = []
    const devDeps: string[] = []

    for (const dep of deps) {
      if (dep.type !== 'npm') {
        resolved[dep.name] = dep.version
        continue
      }
      if (dep.dev) {
        devDeps.push(`"${dep.name}": "${dep.version}"`)
      } else {
        npmDeps.push(`"${dep.name}": "${dep.version}"`)
      }
    }

    resolved.npmDependencies = `{ ${npmDeps.join(', ')} }`
    resolved.devDependencies = `{ ${devDeps.join(', ')} }`

    logger.info(`Dependencies resolved`, { total: deps.length })
    return resolved
  }

  generatePackageJson(base: Record<string, unknown>, deps: BlueprintDependency[]): string {
    const pkg: Record<string, unknown> = { ...base }
    const npmDeps: Record<string, string> = {}
    const devDeps: Record<string, string> = {}

    for (const dep of deps) {
      if (dep.type === 'npm') {
        if (dep.dev) {
          devDeps[dep.name] = dep.version
        } else {
          npmDeps[dep.name] = dep.version
        }
      }
    }

    if (Object.keys(npmDeps).length > 0) pkg.dependencies = npmDeps
    if (Object.keys(devDeps).length > 0) pkg.devDependencies = devDeps

    return JSON.stringify(pkg, null, 2)
  }
}
