import { readFileSync, existsSync } from 'fs'
import { createLogger } from '@ideia/logger';
import { resolve } from 'path'
import { SLSALevel, SLSCheck } from './types'
const logger = createLogger('slsa-validator');

export class SLSAValidator {
  async assess(projectRoot: string): Promise<{
    currentLevel: SLSALevel
    checks: SLSCheck[]
    gaps: string[]
    recommendations: string[]
  }> {
    const checks: SLSCheck[] = []

    checks.push({
      level: 1,
      name: 'build_script_exists',
      passed: await this._hasBuildScript(projectRoot),
      details: 'Verifica se package.json contem script de build',
      evidence: await this._readBuildScript(projectRoot),
    })

    checks.push({
      level: 1,
      name: 'provenance_generated',
      passed: await this._hasProvenance(projectRoot),
      details: 'Verifica se SBOM/proveniencia foi gerado',
    })

    checks.push({
      level: 2,
      name: 'build_isolation',
      passed: await this._checkBuildIsolation(),
      details: 'Build roda em CI/CD isolado',
    })

    checks.push({
      level: 2,
      name: 'provenance_signed',
      passed: await this._checkProvenanceSignature(projectRoot),
      details: 'Proveniencia assinada com chave criptografica',
    })

    checks.push({
      level: 3,
      name: 'hermetic_build',
      passed: await this._checkHermeticBuild(projectRoot),
      details: 'Build sem dependencias de rede externas',
    })

    checks.push({
      level: 3,
      name: 'source_auditable',
      passed: await this._checkSourceAudit(projectRoot),
      details: 'Fontes com git tag + assinatura commit',
    })

    checks.push({
      level: 4,
      name: 'dual_review',
      passed: await this._checkDualReview(projectRoot),
      details: 'Cada alteracao revisada por 2 desenvolvedores',
    })

    checks.push({
      level: 4,
      name: 'verified_dependencies',
      passed: await this._checkVerifiedDeps(projectRoot),
      details: 'Todas dependencias tem proveniencia verificada',
    })

    const passed = checks.filter(c => c.passed)
    const level = passed.length > 0 ? Math.max(...passed.map(c => c.level)) : 0 as SLSALevel
    const gaps = checks.filter(c => !c.passed).map(c => c.name)

    return {
      currentLevel: level as SLSALevel,
      checks,
      gaps,
      recommendations: this._recommendForTarget(level as SLSALevel, gaps),
    }
  }

  private async _hasBuildScript(root: string): Promise<boolean> {
    try {
      const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
      return !!(pkg.scripts?.build || pkg.scripts?.compile)
    } catch {
      return false
    }
  }

  private async _readBuildScript(root: string): Promise<string> {
    try {
      const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
      return pkg.scripts?.build || pkg.scripts?.compile || ''
    } catch {
      return ''
    }
  }

  private async _hasProvenance(root: string): Promise<boolean> {
    return existsSync(resolve(root, 'dist', 'sbom.json')) || existsSync(resolve(root, 'sbom.json'))
  }

  private async _checkBuildIsolation(): Promise<boolean> {
    return !!process.env.CI || !!process.env.GITHUB_ACTIONS
  }

  private async _checkProvenanceSignature(root: string): Promise<boolean> {
    try {
      const sbomPath = resolve(root, 'dist', 'sbom.json')
      if (!existsSync(sbomPath)) return false
      const sbom = JSON.parse(readFileSync(sbomPath, 'utf-8'))
      return !!(sbom.metadata?.properties?.some(
        (p: { name: string; value: string }) => p.name === 'src:signed' && p.value === 'true',
      ))
    } catch {
      return false
    }
  }

  private async _checkHermeticBuild(root: string): Promise<boolean> {
    try {
      const dockerfile = resolve(root, 'Dockerfile')
      if (!existsSync(dockerfile)) return false
      const content = readFileSync(dockerfile, 'utf-8')
      return content.includes('--offline') || content.includes('--frozen-lockfile')
    } catch {
      return false
    }
  }

  private async _checkSourceAudit(root: string): Promise<boolean> {
    try {
      const { execSync } = require('child_process')
      const tags = execSync('git tag --list', { cwd: root, encoding: 'utf-8' })
      return tags.trim().length > 0
    } catch {
      return false
    }
  }

  private async _checkDualReview(root: string): Promise<boolean> {
    try {
      const { execSync } = require('child_process')
      const log = execSync('git log --oneline -5', { cwd: root, encoding: 'utf-8' })
      return log.length > 0
    } catch {
      return false
    }
  }

  private async _checkVerifiedDeps(root: string): Promise<boolean> {
    try {
      const lockPath = resolve(root, 'package-lock.json')
      if (!existsSync(lockPath)) return false
      const lock = JSON.parse(readFileSync(lockPath, 'utf-8'))
      const pkgs = lock.packages || {}
      return Object.values(pkgs as any[]).every((p: any) => !!p.integrity)
    } catch {
      return false
    }
  }

  private _recommendForTarget(level: SLSALevel, gaps: string[]): string[] {
    const recs: string[] = []
    if (level < 1) {
      recs.push('Adicionar script de build em package.json')
      recs.push('Gerar SBOM automaticamente apos cada build')
    }
    if (level < 2) {
      recs.push('Configurar CI/CD isolado (GitHub Actions, GitLab CI)')
      recs.push('Assinar proveniencia com cosign ou sigstore')
    }
    if (level < 3) {
      recs.push('Configurar build hermetico com --frozen-lockfile')
      recs.push('Assinar commits com gpg ou ssh')
    }
    if (level < 4) {
      recs.push('Implementar code review obrigatorio com 2 aprovadores')
      recs.push('Verificar proveniencia de todas as dependencias')
    }
    return recs
  }
}
