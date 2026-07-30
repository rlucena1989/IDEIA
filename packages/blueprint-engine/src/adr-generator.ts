import { BlueprintDefinition, TemplateContext, GenerateADR } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('adr-generator');

export class ADRGenerator {
  async generate(blueprint: BlueprintDefinition, context: TemplateContext): Promise<GenerateADR[]> {
    const adrs: GenerateADR[] = []

    adrs.push(this._generateFrameworkADR(blueprint, context))
    adrs.push(this._generateDatabaseADR(context))
    adrs.push(this._generateArchitectureADR())
    adrs.push(this._generatePackageManagerADR())

    if (blueprint.adrs?.templates) {
      for (const tpl of blueprint.adrs.templates) {
        adrs.push(await this._renderCustomADR(tpl, context))
      }
    }

    return adrs
  }

  private _generateFrameworkADR(_blueprint: BlueprintDefinition, context: TemplateContext): GenerateADR {
    return {
      path: 'adr/0001-use-framework.md',
      content: `# ADR-0001: Framework Selection\n\nStatus: Accepted\nDate: ${new Date().toISOString().split('T')[0]}\n\n## Context\nProject ${context.projectName} requires a framework.\n\n## Decision\nSelected Node.js/TypeScript as the primary framework.\n\n## Consequences\n- Mature ecosystem with broad community support\n- Strong typing with TypeScript\n- Extensive package availability via npm\n`,
    }
  }

  private _generateDatabaseADR(_context: TemplateContext): GenerateADR {
    return {
      path: 'adr/0002-use-database.md',
      content: `# ADR-0002: Database Selection\n\nStatus: Accepted\nDate: ${new Date().toISOString().split('T')[0]}\n\n## Context\nPersistent data storage required.\n\n## Decision\nSelected PostgreSQL as the primary database.\n\n## Consequences\n- ACID compliance for data integrity\n- Rich query capabilities and indexing\n- Strong ecosystem with ORMs like Prisma\n`,
    }
  }

  private _generateArchitectureADR(): GenerateADR {
    return {
      path: 'adr/0003-use-architecture.md',
      content: `# ADR-0003: Architecture Pattern\n\nStatus: Proposed\nDate: ${new Date().toISOString().split('T')[0]}\n\n## Context\nCode organization pattern required for maintainability.\n\n## Decision\nAdopt Clean Architecture with separated layers.\n\n## Consequences\n- Clear separation of concerns\n- Improved testability\n- Independence from frameworks\n`,
    }
  }

  private _generatePackageManagerADR(): GenerateADR {
    return {
      path: 'adr/0004-use-package-manager.md',
      content: `# ADR-0004: Package Manager\n\nStatus: Accepted\nDate: ${new Date().toISOString().split('T')[0]}\n\n## Context\nPackage manager required for dependency management.\n\n## Decision\nUse pnpm for package management.\n\n## Consequences\n- Fast installation with content-addressable storage\n- Disk space efficiency\n- Built-in workspace support\n`,
    }
  }

  private async _renderCustomADR(tpl: { title: string; template: string }, _context: TemplateContext): Promise<GenerateADR> {
    return {
      path: `adr/${this._kebabCase(tpl.title)}.md`,
      content: `# ${tpl.title}\n\nStatus: Proposed\nDate: ${new Date().toISOString().split('T')[0]}\n\n## Context\nCustom ADR from template: ${tpl.template}\n\n## Decision\nTBD\n\n## Consequences\nTBD\n`,
    }
  }

  private _kebabCase(s: string): string {
    return s.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }
}
