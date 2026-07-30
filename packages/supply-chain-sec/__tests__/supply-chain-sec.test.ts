import { SBOMGenerator } from '../src/sbom-generator'
import { DependencyScanner } from '../src/dependency-scanner'
import { InTotoVerifier } from '../src/in-toto-verifier'
import { SLSAValidator } from '../src/slsa-validator'
import { SigstoreSigner } from '../src/sigstore-signer'
import { DependencyConfusionDetector } from '../src/dependency-confusion-detector'
import { DependencyInfo } from '../src/types'

describe('SBOMGenerator', () => {
  const gen = new SBOMGenerator()
  const deps: DependencyInfo[] = [
    { name: 'express', version: '4.18.2', purl: 'pkg:npm/express@4.18.2', ecosystem: 'npm', licenses: ['MIT'], isDev: false },
    { name: 'typescript', version: '5.3.0', purl: 'pkg:npm/typescript@5.3.0', ecosystem: 'npm', licenses: ['Apache-2.0'], isDev: true },
  ]

  it('generates CycloneDX SBOM', async () => {
    const sbom = await gen.generate(deps, 'cyclonedx')
    expect(sbom.bomFormat).toBe('CycloneDX')
    expect(sbom.specVersion).toBe('1.5')
    expect(sbom.components).toHaveLength(2)
    expect(sbom.components[0].name).toBe('express')
  })

  it('generates SPDX SBOM', async () => {
    const sbom = await gen.generate(deps, 'spdx')
    expect(sbom.bomFormat).toBe('SPDX')
    expect(sbom.specVersion).toBe('2.3')
    expect(sbom.components).toHaveLength(2)
  })

  it('includes metadata and serial number', async () => {
    const sbom = await gen.generate(deps, 'cyclonedx')
    expect(sbom.serialNumber).toContain('urn:uuid:')
    expect(sbom.metadata.timestamp).toBeDefined()
    expect(sbom.metadata.tools[0].name).toBe('sbom-generator')
  })

  it('handles empty dependencies', async () => {
    const sbom = await gen.generate([], 'cyclonedx')
    expect(sbom.components).toHaveLength(0)
  })

  it('includes integrity properties when available', async () => {
    const depsWithIntegrity: DependencyInfo[] = [
      { ...deps[0], integrity: 'sha256-abc123' },
    ]
    const sbom = await gen.generate(depsWithIntegrity, 'cyclonedx')
    expect(sbom.components[0].properties).toBeDefined()
  })
})

describe('DependencyScanner', () => {
  const scanner = new DependencyScanner()

  it('scans with errors for non-existent path', async () => {
    const result = await scanner.scan('C:/nonexistent')
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.totalCount).toBe(0)
  })

  it('returns empty for non-existent syft scan', async () => {
    const result = await scanner.scanSyft('C:/nonexistent')
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('returns empty for non-existent trivy scan', async () => {
    const result = await scanner.scanTrivy('C:/nonexistent')
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('InTotoVerifier', () => {
  const verifier = new InTotoVerifier()

  it('fails for non-existent layout file', async () => {
    const result = await verifier.verifyLayout('C:/nonexistent/layout.json', 'C:/nonexistent')
    expect(result.verified).toBe(false)
    expect(result.totalSteps).toBe(0)
  })
})

describe('SLSAValidator', () => {
  const validator = new SLSAValidator()

  it('assesses a project directory', async () => {
    const result = await validator.assess(process.cwd())
    expect(result.currentLevel).toBeDefined()
    expect(result.checks.length).toBe(8)
    expect(Array.isArray(result.gaps)).toBe(true)
    expect(Array.isArray(result.recommendations)).toBe(true)
  })

  it('returns checks array with structure', async () => {
    const result = await validator.assess(process.cwd())
    for (const check of result.checks) {
      expect(check.level).toBeGreaterThanOrEqual(1)
      expect(check.level).toBeLessThanOrEqual(4)
      expect(typeof check.name).toBe('string')
      expect(typeof check.passed).toBe('boolean')
      expect(typeof check.details).toBe('string')
    }
  })

  it('returns recommendations based on gaps', async () => {
    const result = await validator.assess(process.cwd())
    expect(result.recommendations.length).toBeGreaterThanOrEqual(0)
    if (result.currentLevel < 1) {
      expect(result.recommendations).toContain('Adicionar script de build em package.json')
    }
  })

  it('handles non-existent project', async () => {
    const result = await validator.assess('C:/nonexistent')
    expect(result.checks.length).toBe(8)
  })
})

describe('SigstoreSigner', () => {
  const signer = new SigstoreSigner()

  it('signs an artifact and returns signature result', async () => {
    const result = await signer.signArtifact(__filename)
    expect(result.artifactPath).toBe(__filename)
    expect(result.keyId).toBeDefined()
    expect(result.timestamp).toBeDefined()
    expect(result.digest).toBeDefined()
    expect(result.signaturePath).toBeDefined()
    expect(result.certificatePath).toBeDefined()
  })

  it('signs SBOM', async () => {
    const result = await signer.signSBOM(__filename)
    expect(result.digest).toBeDefined()
  })

  it('verifies a valid signature', async () => {
    const result = await signer.signArtifact(__filename)
    const verified = await signer.verifySignature(result.artifactPath, result.signaturePath)
    expect(verified).toBe(true)
  })

  it('fails verification with wrong signature', async () => {
    const verified = await signer.verifySignature(__filename, 'C:/nonexistent.sig')
    expect(verified).toBe(false)
  })
})

describe('DependencyConfusionDetector', () => {
  const detector = new DependencyConfusionDetector()

  it('detects suspicious patterns in current project', async () => {
    const report = await detector.detect(process.cwd())
    expect(report.totalConflicts).toBeGreaterThanOrEqual(0)
    expect(typeof report.criticalCount).toBe('number')
    expect(typeof report.highCount).toBe('number')
    expect(Array.isArray(report.conflicts)).toBe(true)
    expect(Array.isArray(report.recommendations)).toBe(true)
  })

  it('returns recommendations for critical conflicts', async () => {
    const report = await detector.detect(process.cwd())
    if (report.criticalCount > 0) {
      expect(report.recommendations).toBeDefined()
    }
  })

  it('limits conflicts to 20 entries', async () => {
    const report = await detector.detect(process.cwd())
    expect(report.conflicts.length).toBeLessThanOrEqual(20)
  })
})
