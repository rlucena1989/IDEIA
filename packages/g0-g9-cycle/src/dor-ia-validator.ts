import { createLogger } from '@ideia/logger'
import { DorIAInput, DorIAOutput } from './types'

const logger = createLogger('g0-g9-cycle:dor-ia')

export class DorIAValidator {
  validate(input: DorIAInput): DorIAOutput {
    const failures: string[] = []
    const warnings: string[] = []

    if (!input.studyCommitted) {
      failures.push('Estudo não foi commitado — necessário estudos/NN-feature/')
    }
    if (!input.objectiveClear) {
      failures.push('Objetivo da feature não está claro em 1 frase')
    }
    if (!input.stakeholdersConfirmed) {
      warnings.push('Stakeholders/identidade do projeto não confirmados')
    }

    if (!input.acceptanceCriteriaInGherkin) {
      failures.push('Critérios de aceitação não estão em Given-When-Then')
    }
    if (!input.eachCriterionHasTest) {
      failures.push('Nem todo critério de aceitação tem teste correspondente')
    }
    if (!input.testDataAvailable) {
      warnings.push('Dados de teste não estão disponíveis')
    }

    if (!input.dependenciesIdentified) {
      failures.push('Dependências (libs, serviços, APIs) não identificadas')
    }
    if (!input.architectureCompatible) {
      failures.push('Arquitetura incompatível com decisões em ADRs vigentes')
    }
    if (!input.capacityEstimated) {
      warnings.push('Capacidade (compute/tempo) não estimada')
    }

    if (!input.parallelFeaturesIdentified) {
      warnings.push('Features paralelas em andamento não identificadas')
    }
    if (!input.integrationPointsMapped) {
      failures.push('Pontos de integração não mapeados')
    }
    if (!input.noFileOverlap) {
      failures.push('Sobreposição de arquivos/conceitos com trabalho paralelo detectada')
    }

    const score = this.calculateScore(failures.length, warnings.length)
    const passed = failures.length === 0

    return { passed, failures, warnings, score }
  }

  private calculateScore(failures: number, warnings: number): number {
    return Math.max(0, 100 - failures * 25 - warnings * 10)
  }
}
