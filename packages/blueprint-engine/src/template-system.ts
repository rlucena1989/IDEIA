import * as fsp from 'fs/promises'
import { createLogger } from '@ideia/logger';
import { TemplateContext } from './types'
const logger = createLogger('template-system');

export class TemplateSystem {
  async render(templatePath: string, context: TemplateContext): Promise<string> {
    const content = await fsp.readFile(templatePath, 'utf-8')
    return this._renderString(content, context)
  }

  async renderString(template: string, context: TemplateContext): Promise<string> {
    return this._renderString(template, context)
  }

  private _renderString(template: string, context: TemplateContext): string {
    return template.replace(/<%=?\s*([\w.]+)\s*%>/g, (_match: string, key: string) => {
      const value = this._resolveKey(key, context)
      return value !== undefined ? String(value) : _match
    })
  }

  private _resolveKey(key: string, context: TemplateContext): unknown {
    const parts = key.split('.')
    let current: unknown = context
    for (const part of parts) {
      if (current === null || current === undefined) return undefined
      current = (current as Record<string, unknown>)[part]
    }
    return current
  }

  readonly helpers = {
    pascalCase: (s: string): string => s.replace(/([-_]\w)/g, g => g[1].toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase()),
    camelCase: (s: string): string => s.replace(/([-_]\w)/g, g => g[1].toUpperCase()),
    kebabCase: (s: string): string => s.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[_]/g, '-'),
    snakeCase: (s: string): string => s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/[-]/g, '_'),
    pluralize: (s: string): string => {
      if (['person', 'child', 'mouse'].includes(s)) return s.replace(/person/, 'people').replace(/child/, 'children').replace(/mouse/, 'mice')
      if (s.endsWith('s') || s.endsWith('x') || s.endsWith('z')) return s + 'es'
      if (s.endsWith('y') && !/[aeiou]y$/.test(s)) return s.slice(0, -1) + 'ies'
      return s + 's'
    },
    date: (format = 'ISO'): string => {
      const d = new Date()
      if (format === 'YYYY-MM-DD') return d.toISOString().split('T')[0]
      return d.toISOString()
    },
  }
}
