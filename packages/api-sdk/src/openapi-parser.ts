import { OpenAPIObject } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('openapi-parser');

export class OpenAPIParser {
  async parseFromUrl(url: string): Promise<OpenAPIObject> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch OpenAPI spec: ${response.status}`)
    return response.json() as Promise<OpenAPIObject>
  }

  async parseFromString(content: string): Promise<OpenAPIObject> {
    try {
      return JSON.parse(content)
    } catch {
      throw new Error('Invalid OpenAPI specification format')
    }
  }

  validate(spec: OpenAPIObject): string[] {
    const errors: string[] = []
    if (!spec.openapi) errors.push('Missing openapi version field')
    if (!spec.info?.title) errors.push('Missing info.title')
    if (!spec.info?.version) errors.push('Missing info.version')
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      errors.push('No paths defined')
    }
    return errors
  }

  getEndpointCount(spec: OpenAPIObject): number {
    let count = 0
    const paths = spec.paths || {}
    for (const methods of Object.values(paths)) {
      for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
        if ((methods as any)?.[method]) count++
      }
    }
    return count
  }

  getSchemaNames(spec: OpenAPIObject): string[] {
    return Object.keys(spec.components?.schemas || {})
  }
}
