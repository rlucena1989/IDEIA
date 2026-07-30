import { readFileSync, existsSync } from 'fs'
import { createLogger } from '@ideia/logger';
import { resolve } from 'path'
import { DependencyInfo } from './types'
const logger = createLogger('dependency-scanner');

export interface ScanResult {
  dependencies: DependencyInfo[]
  totalCount: number
  directCount: number
  transitiveCount: number
  errors: string[]
}

export class DependencyScanner {
  async scan(projectRoot: string): Promise<ScanResult> {
    const deps: DependencyInfo[] = []
    const errors: string[] = []

    const pkgPath = resolve(projectRoot, 'package.json')
    const lockPath = resolve(projectRoot, 'package-lock.json')

    if (!existsSync(pkgPath)) {
      return { dependencies: [], totalCount: 0, directCount: 0, transitiveCount: 0, errors: ['package.json not found'] }
    }

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const directDeps = new Set([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ])

    if (existsSync(lockPath)) {
      const lock = JSON.parse(readFileSync(lockPath, 'utf-8'))
      const packages = lock.packages || {}
      for (const [key, info] of Object.entries(packages)) {
        if (key === '') continue
        const entry = info as any
        const name = key.replace('node_modules/', '')
        deps.push({
          name,
          version: entry.version || '0.0.0',
          purl: `pkg:npm/${encodeURIComponent(name)}@${entry.version || '0.0.0'}`,
          ecosystem: 'npm',
          licenses: entry.license ? [entry.license] : [],
          isDev: entry.dev === true,
          integrity: entry.integrity,
          resolved: entry.resolved,
        })
      }
    } else {
      for (const dep of directDeps) {
        deps.push({
          name: dep,
          version: pkg.dependencies?.[dep] || pkg.devDependencies?.[dep] || 'unknown',
          purl: `pkg:npm/${encodeURIComponent(dep)}`,
          ecosystem: 'npm',
          licenses: [],
          isDev: !!pkg.devDependencies?.[dep],
        })
      }
    }

    return {
      dependencies: deps,
      totalCount: deps.length,
      directCount: directDeps.size,
      transitiveCount: deps.length - directDeps.size,
      errors,
    }
  }

  async scanSyft(projectRoot: string): Promise<ScanResult> {
    try {
      const { execSync } = require('child_process')
      const output = execSync(`syft packages:dir:${projectRoot} -o json --quiet`, { encoding: 'utf-8', timeout: 30000 })
      const data = JSON.parse(output)
      const artifacts = data.artifacts || []
      const deps: DependencyInfo[] = artifacts.map((a: any) => ({
        name: a.name,
        version: a.version || '0.0.0',
        purl: a.purl || '',
        ecosystem: a.type || 'npm',
        licenses: a.licenses || [],
        isDev: false,
      }))
      return {
        dependencies: deps,
        totalCount: deps.length,
        directCount: deps.length,
        transitiveCount: 0,
        errors: [],
      }
    } catch (err) {
      return { dependencies: [], totalCount: 0, directCount: 0, transitiveCount: 0, errors: [`Syft scan failed: ${err}`] }
    }
  }

  async scanTrivy(projectRoot: string): Promise<ScanResult> {
    try {
      const { execSync } = require('child_process')
      const output = execSync(`trivy fs --quiet --format json ${projectRoot}`, { encoding: 'utf-8', timeout: 60000 })
      const data = JSON.parse(output)
      const results = data.Results || []
      const deps: DependencyInfo[] = []
      for (const result of results) {
        const packages = result.Packages || []
        for (const p of packages) {
          deps.push({
            name: p.Name,
            version: p.Version || '0.0.0',
            purl: p.PURL || '',
            ecosystem: p.Ecosystem || 'npm',
            licenses: p.Licenses || [],
            isDev: false,
          })
        }
      }
      return {
        dependencies: deps,
        totalCount: deps.length,
        directCount: deps.length,
        transitiveCount: 0,
        errors: [],
      }
    } catch (err) {
      return { dependencies: [], totalCount: 0, directCount: 0, transitiveCount: 0, errors: [`Trivy scan failed: ${err}`] }
    }
  }
}
