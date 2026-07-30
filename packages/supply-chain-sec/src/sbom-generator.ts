import * as crypto from 'crypto'
import { createLogger } from '@ideia/logger';
import { DependencyInfo, SBOMDocument, SBOMFormat } from './types'
const logger = createLogger('sbom-generator');

export class SBOMGenerator {
  async generate(deps: DependencyInfo[], format: SBOMFormat): Promise<SBOMDocument> {
    if (format === 'cyclonedx') return this._generateCycloneDX(deps)
    return this._generateSPDX(deps)
  }

  async generateFromLockfile(lockfilePath: string, format: SBOMFormat): Promise<SBOMDocument> {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const content = readFileSync(resolve(lockfilePath), 'utf-8')
    const lock = JSON.parse(content)
    const packages = lock.packages || {}
    const deps: DependencyInfo[] = []
    for (const [key, info] of Object.entries(packages)) {
      if (key === '') continue
      const pkg = info as any
      deps.push({
        name: key.replace('node_modules/', ''),
        version: pkg.version || '0.0.0',
        purl: `pkg:npm/${encodeURIComponent(key.replace('node_modules/', ''))}@${pkg.version || '0.0.0'}`,
        ecosystem: 'npm',
        licenses: pkg.license ? [pkg.license] : [],
        isDev: pkg.dev === true,
        integrity: pkg.integrity,
        resolved: pkg.resolved,
      })
    }
    return this.generate(deps, format)
  }

  private _generateCycloneDX(deps: DependencyInfo[]): SBOMDocument {
    return {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      version: Date.now(),
      serialNumber: `urn:uuid:${crypto.randomUUID()}`,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{ vendor: 'IDEIA', name: 'sbom-generator', version: '1.0.0' }],
        component: { type: 'application', name: '@ideia/supply-chain-sec', version: '1.0.0' },
        properties: [{ name: 'src:signed', value: 'true' }],
      },
      components: deps.map(d => ({
        type: 'library',
        name: d.name,
        version: d.version,
        purl: d.purl,
        licenses: d.licenses.map(l => ({ license: { id: l } })),
        properties: d.integrity ? [{ name: 'src:integrity', value: d.integrity }] : undefined,
      })),
    }
  }

  private _generateSPDX(deps: DependencyInfo[]): SBOMDocument {
    return {
      bomFormat: 'SPDX',
      specVersion: '2.3',
      version: Date.now(),
      serialNumber: `SPDXRef-DOCUMENT-${crypto.randomUUID().slice(0, 8)}`,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{ vendor: 'IDEIA', name: 'sbom-generator', version: '1.0.0' }],
        component: { type: 'application', name: '@ideia/supply-chain-sec', version: '1.0.0' },
      },
      components: deps.map(d => ({
        type: 'library',
        name: d.name,
        version: d.version,
        purl: d.purl,
        licenses: d.licenses.map(l => ({ license: { id: l } })),
      })),
    }
  }
}
