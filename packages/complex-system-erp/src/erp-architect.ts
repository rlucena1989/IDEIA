import { createLogger } from '@ideia/logger'
import { DomainEntity, BusinessProcess, ProcessStep, ERPModule, IntegrationPattern, SystemArchitecture } from './types'

const logger = createLogger('erp-architect')

export class ERPArchitect {
  private modules: ERPModule[] = []

  addModule(module: ERPModule): void { this.modules.push(module); logger.info(`Module added`, { name: module.name }) }

  addEntity(moduleName: string, entity: DomainEntity): void {
    const mod = this.modules.find(m => m.name === moduleName)
    if (mod) { mod.entities.push(entity); logger.info(`Entity added to ${moduleName}`, { entity: entity.name }) }
  }

  addProcess(moduleName: string, process: BusinessProcess): void {
    const mod = this.modules.find(m => m.name === moduleName)
    if (mod) mod.processes.push(process)
  }

  getArchitecture(): SystemArchitecture {
    const integrations: IntegrationPattern[] = []
    for (const mod of this.modules) {
      for (const int of mod.integrations) {
        const parts = int.split(':')
        if (parts.length === 2) integrations.push({ from: mod.name, to: parts[0], type: 'async', protocol: parts[1] || 'nats', contract: `${mod.name}-${parts[0]}` })
      }
    }
    return { modules: [...this.modules], integrations, patterns: ['event-driven', 'cqrs', 'saga'] }
  }

  detectProcessDependencies(processId: string): string[] {
    const deps: string[] = []
    for (const mod of this.modules) {
      for (const proc of mod.processes) {
        for (const step of proc.steps) {
          if (processId === step.entity) deps.push(proc.id)
        }
      }
    }
    return [...new Set(deps)]
  }
}
