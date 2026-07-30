import { createLogger } from '@ideia/logger'
import { BlueprintContract } from './types'

const logger = createLogger('contract-generator')

export class ContractGenerator {
  generate(contract: BlueprintContract): string {
    const lines: string[] = [
      `// ${contract.name}`,
      `// ${contract.description}`,
      '',
    ]

    if (contract.type === 'interface') {
      lines.push(`export interface ${this.toInterfaceName(contract.name)} {`)
      if (contract.fields) {
        for (const field of contract.fields) {
          const opt = field.required ? '' : '?'
          lines.push(`  ${field.name}${opt}: ${field.type}${field.description ? ` // ${field.description}` : ''}`)
        }
      }
      lines.push('}')
    } else if (contract.type === 'type') {
      lines.push(`export type ${this.toInterfaceName(contract.name)} = {`)
      if (contract.fields) {
        for (const field of contract.fields) {
          const opt = field.required ? '' : '?'
          lines.push(`  ${field.name}${opt}: ${field.type}`)
        }
      }
      lines.push('}')
    } else if (contract.type === 'schema') {
      lines.push(`import { z } from 'zod'`)
      lines.push('')
      lines.push(`export const ${this.toCamelCase(contract.name)}Schema = z.object({`)
      if (contract.fields) {
        for (const field of contract.fields) {
          const zodType = this.toZodType(field.type, field.required)
          lines.push(`  ${field.name}: ${zodType},`)
        }
      }
      lines.push('})')
    }

    lines.push('')
    logger.info(`Contract generated`, { name: contract.name, type: contract.type })
    return lines.join('\n')
  }

  private toInterfaceName(name: string): string {
    return name.replace(/(?:^|[-_\s])(\w)/g, (_, c) => c.toUpperCase()).replace(/[-_\s]/g, '')
  }

  private toCamelCase(name: string): string {
    const pascal = this.toInterfaceName(name)
    return pascal.charAt(0).toLowerCase() + pascal.slice(1)
  }

  private toZodType(tsType: string, required: boolean): string {
    const mapping: Record<string, string> = {
      string: 'z.string()',
      number: 'z.number()',
      boolean: 'z.boolean()',
      date: 'z.date()',
      'string[]': 'z.array(z.string())',
      'number[]': 'z.array(z.number())',
    }
    const zod = mapping[tsType] || 'z.unknown()'
    return required ? zod : `${zod}.optional()`
  }
}
