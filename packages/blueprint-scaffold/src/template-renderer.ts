import { createLogger } from '@ideia/logger'
import { ScaffoldContext } from './types'

const logger = createLogger('template-renderer')

export class TemplateRenderer {
  render(template: string, context: ScaffoldContext): string {
    let result = template

    result = result.replace(/\{\{projectName\}\}/g, context.projectName)
    result = result.replace(/\{\{projectDescription\}\}/g, context.projectDescription)

    result = result.replace(/\{\{pascalCase\}\}/g, this.toPascalCase(context.projectName))
    result = result.replace(/\{\{camelCase\}\}/g, this.toCamelCase(context.projectName))
    result = result.replace(/\{\{kebabCase\}\}/g, this.toKebabCase(context.projectName))
    result = result.replace(/\{\{snakeCase\}\}/g, this.toSnakeCase(context.projectName))

    for (const [key, value] of Object.entries(context.variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
    }

    return result
  }

  renderFile(templatePath: string, context: ScaffoldContext): Promise<string> {
    logger.info(`Rendering template`, { path: templatePath })
    return Promise.resolve(this.render(templatePath, context))
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^|[-_\s])(\w)/g, (_, c) => c.toUpperCase()).replace(/[-_\s]/g, '')
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str)
    return pascal.charAt(0).toLowerCase() + pascal.slice(1)
  }

  private toKebabCase(str: string): string {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  private toSnakeCase(str: string): string {
    return str.toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '')
  }
}
