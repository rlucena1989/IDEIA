import * as fsp from 'fs/promises'
import { createLogger } from '@ideia/logger'
import { Blueprint } from './types'

const logger = createLogger('blueprint-parser')

const REQUIRED_FIELDS = ['name', 'version', 'description', 'structure']

export class BlueprintParser {
  async parse(path: string): Promise<Blueprint> {
    const content = await fsp.readFile(path, 'utf-8')
    return this.parseFromString(content)
  }

  async parseFromString(content: string): Promise<Blueprint> {
    const parsed = JSON.parse(content)

    for (const field of REQUIRED_FIELDS) {
      if (!(field in parsed)) {
        throw new Error(`Blueprint missing required field: ${field}`)
      }
    }

    if (!parsed.structure || typeof parsed.structure !== 'object') {
      throw new Error('Blueprint structure must be a non-null object')
    }

    const struct = parsed.structure as { directories: unknown; files: unknown }
    if (!struct.directories || !Array.isArray(struct.directories)) {
      throw new Error('Blueprint structure must contain a directories array')
    }
    if (!struct.files || !Array.isArray(struct.files)) {
      throw new Error('Blueprint structure must contain a files array')
    }

    const blueprint = parsed as Blueprint
    logger.info(`Blueprint parsed`, { name: blueprint.name, version: blueprint.version })
    return blueprint
  }
}
