import { readFileSync } from 'fs'
import { createLogger } from '@ideia/logger';
import { resolve } from 'path'
import { ConflictEntry, DependencyConfusionReport } from './types'
const logger = createLogger('dependency-confusion-detector');

export class DependencyConfusionDetector {
  private readonly _HIGH_RISK_ECOSYSTEMS = new Set(['npm', 'pypi', 'rubygems'])
  private readonly _SUSPICIOUS_PATTERNS = [
    /^\d+\.\d+\.\d+$/,
    /^[0-9]{4,}/,
    /^v?\d+\.\d+\.\d+-/,
  ]

  async detect(projectRoot: string): Promise<DependencyConfusionReport> {
    const pkgPath = resolve(projectRoot, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const conflicts: ConflictEntry[] = []
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }

    for (const [name, version] of Object.entries(allDeps)) {
      const v = version as string
      const scoped = name.startsWith('@')

      if (!scoped) {
        const internalExists = await this._checkInternalRegistry(name)
        if (internalExists) {
          const publicInfo = await this._checkPublicRegistry(name)
          if (publicInfo && this._isSuspiciousVersion(publicInfo.latestVersion)) {
            conflicts.push({
              package: name,
              localVersion: v,
              publicVersion: publicInfo.latestVersion,
              risk: 'critical',
              reason: 'Pacote sem escopo existe internamente — versao publica suspeita',
            })
          }
        }
      }

      for (const pattern of this._SUSPICIOUS_PATTERNS) {
        if (pattern.test(v)) {
          conflicts.push({
            package: name,
            localVersion: v,
            publicVersion: v,
            risk: 'high',
            reason: `Versao suspeita: ${v} corresponde ao padrao ${pattern}`,
          })
        }
      }
    }

    return {
      totalConflicts: conflicts.length,
      criticalCount: conflicts.filter(c => c.risk === 'critical').length,
      highCount: conflicts.filter(c => c.risk === 'high').length,
      conflicts: conflicts.slice(0, 20),
      recommendations: this._generateRecommendations(conflicts),
    }
  }

  private _isSuspiciousVersion(version: string): boolean {
    return this._SUSPICIOUS_PATTERNS.some(p => p.test(version))
  }

  private async _checkInternalRegistry(name: string): Promise<boolean> {
    try {
      const r = await fetch(`http://internal-registry/-/package/${name}`)
      return r.ok
    } catch {
      return false
    }
  }

  private async _checkPublicRegistry(name: string): Promise<{ latestVersion: string } | null> {
    try {
      const r = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`)
      if (!r.ok) return null
      const data = await r.json() as any
      return { latestVersion: data['dist-tags']?.latest || '0.0.0' }
    } catch {
      return null
    }
  }

  private _generateRecommendations(conflicts: ConflictEntry[]): string[] {
    const recs: string[] = []
    if (conflicts.some(c => c.risk === 'critical')) {
      recs.push('Usar escopo @ para todos os pacotes internos (ex: @acme/ ao inves de acme-)')
    }
    if (conflicts.some(c => c.risk === 'high')) {
      recs.push('Configurar .npmrc com @scope:registry apontando para registry privado')
    }
    recs.push('Adicionar verificacao de dependency confusion no CI/CD')
    recs.push('Usar npm audit --audit-level=critical nos pipelines')
    return recs
  }
}
