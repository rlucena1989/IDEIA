import { createLogger } from '@ideia/logger'
import { PackageDep, LockEntry, AuditVuln, ResolutionResult } from './types'

const logger = createLogger('pkg-manager')

export class PackageManagerService {
  private deps: PackageDep[] = []
  private lock: Map<string, LockEntry> = new Map()

  addDep(dep: PackageDep): void { this.deps.push(dep) }
  addDeps(deps: PackageDep[]): void { this.deps.push(...deps) }
  getDeps(): PackageDep[] { return [...this.deps] }

  resolve(): ResolutionResult {
    const resolved: Record<string, string> = {}
    const conflicts: string[] = []
    const tree: Record<string, string[]> = {}

    for (const dep of this.deps) {
      if (resolved[dep.name] && resolved[dep.name] !== dep.version) {
        conflicts.push(`${dep.name}: ${resolved[dep.name]} vs ${dep.version}`)
      }
      resolved[dep.name] = dep.version
      tree[dep.name] = []
    }

    logger.info(`Resolution complete`, { deps: this.deps.length, conflicts: conflicts.length })
    return { resolved, conflicts, tree }
  }

  audit(): AuditVuln[] {
    const vulns: AuditVuln[] = []
    const criticalDeps = this.deps.filter(d => d.manager === 'npm')
    for (const dep of criticalDeps) {
      if (dep.version.startsWith('0.')) {
        vulns.push({ id: `vuln-${dep.name}`, package: dep.name, severity: 'low', fixAvailable: `^1.0.0` })
      }
    }
    return vulns
  }

  addToLock(entry: LockEntry): void { this.lock.set(entry.name, entry) }
  getLock(name: string): LockEntry | undefined { return this.lock.get(name) }
}
