import { BlueprintDefinition } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('llm-blueprint-generator');

export class LLMBlueprintGenerator {
  async generateFromDescription(description: string): Promise<BlueprintDefinition> {
    const name = this._toSlug(description.split(' ').slice(0, 3).join('-'))
    return {
      name,
      version: '1.0.0',
      description,
      author: 'IDEIA LLM Generator',
      tags: ['auto-generated', 'llm'],
      extends: [],
      variables: [
        { name: 'projectName', type: 'string', description: 'Project name', required: true, validate: '^[a-z0-9-]+$' },
      ],
      structure: {
        'src/index.ts': { template: 'src/index.ts.ejs' },
        'package.json': { template: 'package.json.ejs' },
      },
      dependencies: {
        dependencies: {},
        devDependencies: { typescript: '^5.3.0' },
        peerDependencies: {},
        optionalDependencies: {},
      },
      postProcess: [],
    }
  }

  async evolveBlueprint(current: BlueprintDefinition, feedback: string): Promise<BlueprintDefinition> {
    const evolved = { ...current }
    evolved.version = this._bumpVersion(current.version, 'minor')
    evolved.description += ` (evolved: ${feedback.slice(0, 50)})`
    return evolved
  }

  private _bumpVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
    const parts = version.split('.').map(Number)
    if (type === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0 }
    else if (type === 'minor') { parts[1]++; parts[2] = 0 }
    else { parts[2]++ }
    return parts.join('.')
  }

  private _toSlug(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
}
