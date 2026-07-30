import { Triager } from '../triager'
import { DorIAValidator } from '../dor-ia-validator'
import { SyncGate } from '../sync-gate'
import { SkillsDistiller } from '../skills-distiller'

describe('Triager (G0)', () => {
  const triager = new Triager()

  it('classifies auth feature as H (high risk)', () => {
    const result = triager.classify({
      featureName: 'Login',
      description: 'User authentication',
      touchesAuth: true,
    })
    expect(result.riskClass).toBe('H')
    expect(result.depth).toBe('full')
  })

  it('classifies cosmetic feature as L (low risk)', () => {
    const result = triager.classify({
      featureName: 'Button Color',
      description: 'Change button color',
      isCosmetic: true,
    })
    expect(result.riskClass).toBe('L')
    expect(result.depth).toBe('light')
  })

  it('classifies payment feature as H', () => {
    const result = triager.classify({
      featureName: 'Checkout',
      description: 'Payment processing',
      touchesPayment: true,
    })
    expect(result.riskClass).toBe('H')
  })

  it('classifies medium-risk feature correctly', () => {
    const result = triager.classify({
      featureName: 'New API',
      description: 'New feature in stable module',
      isNewFeatureInStable: true,
      touchesData: true,
    })
    expect(result.riskClass).toBe('M')
    expect(result.depth).toBe('full')
  })

  it('skips G4 and G9 for low risk', () => {
    const result = triager.classify({
      featureName: 'Text Fix',
      description: 'Fix typo',
      isTextChange: true,
    })
    expect(result.gatesToSkip).toContain('G4')
    expect(result.gatesToSkip).toContain('G9')
  })

  it('generates rationale text', () => {
    const result = triager.classify({
      featureName: 'Security Patch',
      description: 'Fix security vulnerability',
      touchesSecurity: true,
    })
    expect(result.rationale).toContain('Risco')
    expect(result.rationale).toContain('segurança')
  })
})

describe('DorIAValidator (G2)', () => {
  const validator = new DorIAValidator()

  it('passes when all criteria met', () => {
    const result = validator.validate({
      studyCommitted: true,
      objectiveClear: true,
      stakeholdersConfirmed: true,
      acceptanceCriteriaInGherkin: true,
      eachCriterionHasTest: true,
      testDataAvailable: true,
      dependenciesIdentified: true,
      architectureCompatible: true,
      capacityEstimated: true,
      parallelFeaturesIdentified: true,
      integrationPointsMapped: true,
      noFileOverlap: true,
    })
    expect(result.passed).toBe(true)
    expect(result.failures).toHaveLength(0)
    expect(result.score).toBeGreaterThanOrEqual(90)
  })

  it('fails when study not committed', () => {
    const result = validator.validate({
      studyCommitted: false,
      objectiveClear: true,
      stakeholdersConfirmed: true,
      acceptanceCriteriaInGherkin: true,
      eachCriterionHasTest: true,
      testDataAvailable: true,
      dependenciesIdentified: true,
      architectureCompatible: true,
      capacityEstimated: true,
      parallelFeaturesIdentified: true,
      integrationPointsMapped: true,
      noFileOverlap: true,
    })
    expect(result.passed).toBe(false)
    expect(result.failures).toContain('Estudo não foi commitado — necessário estudos/NN-feature/')
  })

  it('fails when acceptance criteria not in Gherkin', () => {
    const result = validator.validate({
      studyCommitted: true,
      objectiveClear: true,
      stakeholdersConfirmed: true,
      acceptanceCriteriaInGherkin: false,
      eachCriterionHasTest: true,
      testDataAvailable: true,
      dependenciesIdentified: true,
      architectureCompatible: true,
      capacityEstimated: true,
      parallelFeaturesIdentified: true,
      integrationPointsMapped: true,
      noFileOverlap: true,
    })
    expect(result.passed).toBe(false)
    expect(result.failures).toContain('Critérios de aceitação não estão em Given-When-Then')
  })

  it('detects file overlap', () => {
    const result = validator.validate({
      studyCommitted: true,
      objectiveClear: true,
      stakeholdersConfirmed: true,
      acceptanceCriteriaInGherkin: true,
      eachCriterionHasTest: true,
      testDataAvailable: true,
      dependenciesIdentified: true,
      architectureCompatible: true,
      capacityEstimated: true,
      parallelFeaturesIdentified: true,
      integrationPointsMapped: true,
      noFileOverlap: false,
    })
    expect(result.passed).toBe(false)
    expect(result.failures).toContain('Sobreposição de arquivos/conceitos com trabalho paralelo detectada')
  })
})

describe('SyncGate (G8)', () => {
  const syncGate = new SyncGate()

  it('passes when study and code are in sync', () => {
    const result = syncGate.evaluate({
      studyPath: 'estudos/feature/estudo.md',
      specPath: 'estudos/feature/spec.md',
      implementationBranch: 'feature/test',
      codeDiffersFromStudy: false,
      codeDiffersFromSpec: false,
      adrsOutdated: false,
    })
    expect(result.passed).toBe(true)
    expect(result.syncRequired).toBe(false)
  })

  it('fails when code differs from study', () => {
    const result = syncGate.evaluate({
      studyPath: 'estudos/feature/estudo.md',
      specPath: 'estudos/feature/spec.md',
      implementationBranch: 'feature/test',
      codeDiffersFromStudy: true,
      codeDiffersFromSpec: false,
      adrsOutdated: false,
    })
    expect(result.passed).toBe(false)
    expect(result.syncRequired).toBe(true)
    expect(result.filesToUpdate).toContain('estudos/feature/estudo.md')
  })

  it('detects outdated ADRs', () => {
    const result = syncGate.evaluate({
      studyPath: 'estudos/feature/estudo.md',
      specPath: 'estudos/feature/spec.md',
      implementationBranch: 'feature/test',
      codeDiffersFromStudy: false,
      codeDiffersFromSpec: false,
      adrsOutdated: true,
    })
    expect(result.passed).toBe(false)
    expect(result.filesToUpdate).toContain('estudos/feature/adrs')
  })
})

describe('SkillsDistiller (G9)', () => {
  const distiller = new SkillsDistiller()

  it('returns passed false when no lessons', async () => {
    const result = await distiller.distill({
      cycleId: 'test-cycle',
      featureName: 'Test Feature',
      lessons: [],
      sessionLogs: ['log1'],
      steeringPaths: ['.steering/test.md'],
    })
    expect(result.passed).toBe(false)
    expect(result.lessonsCount).toBe(0)
  })

  it('distills skills from lessons', async () => {
    const result = await distiller.distill({
      cycleId: 'test-cycle',
      featureName: 'Auth Feature',
      lessons: ['Always validate tokens server-side'],
      sessionLogs: ['Implementing token validation'],
      steeringPaths: ['.steering/test.md'],
    })
    expect(result.passed).toBe(true)
    expect(result.distilledSkills).toHaveLength(1)
    expect(result.lessonsCount).toBe(1)
  })
})
