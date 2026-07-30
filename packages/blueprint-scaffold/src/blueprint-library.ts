import { createLogger } from '@ideia/logger'
import { Blueprint, BlueprintRegistryEntry } from './types'

const logger = createLogger('blueprint-library')

const DEFAULT_BLUEPRINTS: Blueprint[] = [
  {
    name: 'node-api',
    version: '1.0.0',
    description: 'Node.js API with Express, TypeScript, and Clean Architecture',
    tags: ['node', 'api', 'typescript', 'express'],
    structure: {
      directories: ['src', 'src/controllers', 'src/services', 'src/repositories', 'src/middleware', 'src/types', 'tests', 'docs'],
      files: [
        { path: 'src/index.ts', content: `import express from 'express'\n\nconst app = express()\nconst port = process.env.PORT || 3000\n\napp.get('/health', (req, res) => res.json({ status: 'ok' }))\n\napp.listen(port, () => logger.info(\`Server running on port \${port}\`))` },
        { path: 'README.md', content: '# {{projectName}}\n\n{{projectDescription}}' },
      ],
    },
    variables: [
      { name: 'port', type: 'number', label: 'Port', default: 3000, required: true },
    ],
    dependencies: [
      { name: 'express', version: '^4.18', type: 'npm' },
      { name: 'typescript', version: '^5.3', type: 'npm', dev: true },
      { name: '@types/express', version: '^4.17', type: 'npm', dev: true },
    ],
  },
  {
    name: 'react-app',
    version: '1.0.0',
    description: 'React application with TypeScript and Vite',
    tags: ['react', 'frontend', 'typescript', 'vite'],
    structure: {
      directories: ['src', 'src/components', 'src/pages', 'src/hooks', 'src/services', 'public'],
      files: [
        { path: 'src/App.tsx', content: `import React from 'react'\n\nconst App: React.FC = () => {\n  return <div>Hello {{projectName}}</div>\n}\n\nexport default App` },
      ],
    },
    dependencies: [
      { name: 'react', version: '^18.2', type: 'npm' },
      { name: 'react-dom', version: '^18.2', type: 'npm' },
      { name: 'vite', version: '^5.0', type: 'npm', dev: true },
      { name: '@vitejs/plugin-react', version: '^4.2', type: 'npm', dev: true },
    ],
  },
]

export class BlueprintLibrary {
  private items: Map<string, Blueprint>

  constructor(blueprints?: Blueprint[]) {
    this.items = new Map()
    const source = blueprints ?? DEFAULT_BLUEPRINTS
    for (const bp of source) {
      this.items.set(bp.name, bp)
    }
  }

  get(name: string): Blueprint | undefined {
    return this.items.get(name)
  }

  getAll(): Blueprint[] {
    return [...this.items.values()]
  }

  register(blueprint: Blueprint): void {
    this.items.set(blueprint.name, blueprint)
    logger.info(`Blueprint registered`, { name: blueprint.name })
  }

  search(query: string): BlueprintRegistryEntry[] {
    const q = query.toLowerCase()
    return this.getAll()
      .filter(bp =>
        bp.name.toLowerCase().includes(q) ||
        bp.description.toLowerCase().includes(q) ||
        (bp.tags && bp.tags.some(t => t.toLowerCase().includes(q)))
      )
      .map(bp => ({
        name: bp.name,
        version: bp.version,
        description: bp.description,
        tags: bp.tags ?? [],
        source: 'local',
      }))
  }
}
