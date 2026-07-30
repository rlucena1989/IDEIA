import { createLogger } from '@ideia/logger'
import { SyncGateInput, SyncGateOutput } from './types'

const logger = createLogger('g0-g9-cycle:sync-gate')

export class SyncGate {
  evaluate(input: SyncGateInput): SyncGateOutput {
    const issues: string[] = []
    const filesToUpdate: string[] = []

    if (input.codeDiffersFromStudy) {
      issues.push('Implementação diverge do estudo — sincronização necessária')
      filesToUpdate.push(input.studyPath)
    }

    if (input.codeDiffersFromSpec) {
      issues.push('Implementação diverge da spec — sincronização necessária')
      filesToUpdate.push(input.specPath)
    }

    if (input.adrsOutdated) {
      issues.push('ADRs desatualizados — revisão necessária')
      filesToUpdate.push(`${input.studyPath.replace('estudo.md', 'adrs')}`)
    }

    const syncRequired = issues.length > 0
    const passed = !syncRequired

    return { passed, issues, syncRequired, filesToUpdate }
  }
}
