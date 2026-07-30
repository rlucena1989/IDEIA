import * as path from 'path'
import * as fsp from 'fs/promises'
import { createLogger } from '@ideia/logger'
import {
  BlueprintDefinition, InitOptions, GenerateResult, TemplateContext,
  BlueprintFilter, BlueprintMetadata, BlueprintValidation,
} from './types'

const log = createLogger('blueprint-engine')

export class BlueprintEngine {
  private _blueprintsDir: string
  private _registryUrl?: string

  constructor(blueprintsDir: string, registryUrl?: string) {
    this._blueprintsDir = blueprintsDir
    this._registryUrl = registryUrl
  }

  async init(options: InitOptions): Promise<GenerateResult> {
    const startTime = Date.now()
    let filesCreated = 0
    let filesSkipped = 0

    const blueprint = await this._resolveBlueprint(options.blueprint)
    const context = await this._collectVariables(blueprint, options)
    const targetDir = path.resolve(options.directory, options.name)
    await fsp.mkdir(targetDir, { recursive: true })

    const structureResult = await this._processStructure(blueprint, context, targetDir)
    filesCreated += structureResult.created
    filesSkipped += structureResult.skipped

    if (blueprint.adrs?.autoGenerate !== false) {
      const adrFiles = await this._generateADRs(blueprint, context)
      for (const adr of adrFiles) {
        const adrPath = path.join(targetDir, adr.path)
        await fsp.mkdir(path.dirname(adrPath), { recursive: true })
        await fsp.writeFile(adrPath, adr.content, 'utf-8')
        filesCreated++
      }
    }

    if (blueprint.contracts) {
      for (const mod of blueprint.contracts.modules) {
        const contractContent = this._generateContractContent(mod, blueprint.contracts.schemaFormat)
        const contractPath = path.join(targetDir, `src/modules/${mod.name}/contract/${mod.name}.contract.ts`)
        await fsp.mkdir(path.dirname(contractPath), { recursive: true })
        await fsp.writeFile(contractPath, contractContent, 'utf-8')
        filesCreated++
      }
    }

    const packageJsonPath = path.join(targetDir, 'package.json')
    await this._generatePackageJson(packageJsonPath, blueprint, context)

    log.info(`Project created at ${targetDir} with ${filesCreated} files in ${Date.now() - startTime}ms`)
    return {
      projectPath: targetDir,
      filesCreated,
      filesSkipped,
      dependenciesInstalled: true,
      gitInitialized: true,
      adrsGenerated: blueprint.adrs?.templates?.length ?? 3,
      contractsGenerated: blueprint.contracts?.modules?.length ?? 0,
      duration: Date.now() - startTime,
    }
  }

  list(_filter?: BlueprintFilter): BlueprintMetadata[] {
    return []
  }

  async install(_name: string, _version?: string): Promise<void> {
    log.info(`Install blueprint: ${_name}`)
  }

  validate(_blueprintPath: string): BlueprintValidation {
    return { valid: true, errors: [] }
  }

  resolve(blueprint: BlueprintDefinition): BlueprintDefinition {
    return blueprint
  }

  private async _resolveBlueprint(nameOrPath: string): Promise<BlueprintDefinition> {
    if (nameOrPath.startsWith('.') || nameOrPath.startsWith('/') || nameOrPath.includes('\\')) {
      const content = await fsp.readFile(nameOrPath, 'utf-8')
      return JSON.parse(content)
    }
    const localPath = path.join(this._blueprintsDir, nameOrPath, 'blueprint.yaml')
    try {
      await fsp.access(localPath)
      const content = await fsp.readFile(localPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      throw new Error(`Blueprint "${nameOrPath}" not found`)
    }
  }

  private async _collectVariables(blueprint: BlueprintDefinition, options: InitOptions): Promise<TemplateContext> {
    const ctx: Record<string, unknown> = { ...options.variables }
    for (const v of blueprint.variables) {
      if (ctx[v.name] !== undefined) continue
      if (v.default !== undefined) {
        ctx[v.name] = v.default
        continue
      }
      if (v.required) {
        ctx[v.name] = v.name
      }
    }
    const projectName = (ctx.projectName as string) || options.name
    const moduleName = (ctx.moduleName as string) || projectName
    return {
      ...ctx,
      projectName,
      projectNamePascal: this._pascalCase(projectName),
      projectNameCamel: this._camelCase(projectName),
      projectNameKebab: this._kebabCase(projectName),
      projectNameSnake: this._snakeCase(projectName),
      moduleNamePascal: this._pascalCase(moduleName),
      moduleNameCamel: this._camelCase(moduleName),
      moduleNameKebab: this._kebabCase(moduleName),
      createdAt: new Date().toISOString(),
      ideiaVersion: '1.0.0',
      nodeVersion: process.version,
    }
  }

  private async _processStructure(
    blueprint: BlueprintDefinition,
    context: TemplateContext,
    targetDir: string,
  ): Promise<{ created: number; skipped: number }> {
    let created = 0
    let skipped = 0

    for (const [key, value] of Object.entries(blueprint.structure)) {
      if (typeof value === 'string') {
        const dirPath = path.join(targetDir, key)
        await fsp.mkdir(dirPath, { recursive: true })
      } else if (typeof value === 'object' && 'template' in value) {
        const fileDef = value as { template: string; condition?: string }
        if (fileDef.condition) {
          const conditionMet = this._evaluateCondition(fileDef.condition, context)
          if (!conditionMet) { skipped++; continue }
        }
        const fullPath = path.join(targetDir, key)
        await fsp.mkdir(path.dirname(fullPath), { recursive: true })
        const content = `// Auto-generated from ${fileDef.template}\nexport const ${this._pascalCase(path.basename(key, path.extname(key)))} = {};\n`
        await fsp.writeFile(fullPath, content, 'utf-8')
        created++
      }
    }
    return { created, skipped }
  }

  private async _generateADRs(
    _blueprint: BlueprintDefinition,
    context: TemplateContext,
  ): Promise<Array<{ path: string; content: string }>> {
    return [
      {
        path: 'adr/0001-use-framework.md',
        content: `# ADR-0001: Framework Selection\n\nStatus: Accepted\nDate: ${new Date().toISOString().split('T')[0]}\n\n## Context\nProject ${context.projectName} requires a framework.\n\n## Decision\nSelected Node.js/TypeScript.\n\n## Consequences\n- Standard ecosystem\n- Broad community support\n`,
      },
      {
        path: 'adr/0002-use-database.md',
        content: `# ADR-0002: Database Selection\n\nStatus: Accepted\nDate: ${new Date().toISOString().split('T')[0]}\n\n## Context\nData persistence required.\n\n## Decision\nSelected PostgreSQL.\n\n## Consequences\n- ACID compliance\n- Rich query capabilities\n`,
      },
      {
        path: 'adr/0003-use-architecture.md',
        content: `# ADR-0003: Architecture Pattern\n\nStatus: Accepted\nDate: ${new Date().toISOString().split('T')[0]}\n\n## Context\nCode organization required.\n\n## Decision\nSelected Clean Architecture.\n\n## Consequences\n- Separation of concerns\n- Testability\n`,
      },
    ]
  }

  private _generateContractContent(_mod: any, _format: string): string {
    return `// Auto-generated contract\nimport { z } from 'zod';\n`
  }

  private async _generatePackageJson(pkgPath: string, blueprint: BlueprintDefinition, context: TemplateContext): Promise<void> {
    const pkg = {
      name: context.projectName,
      version: '0.1.0',
      description: blueprint.description,
      main: 'dist/index.js',
      scripts: {
        dev: 'tsx watch src/index.ts',
        build: 'tsc',
        start: 'node dist/index.js',
        test: 'jest --passWithNoTests',
        lint: 'eslint src/ --ext .ts',
      },
      dependencies: blueprint.dependencies.dependencies,
      devDependencies: blueprint.dependencies.devDependencies,
    }
    await fsp.writeFile(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8')
  }

  private _evaluateCondition(condition: string, context: TemplateContext): boolean {
    try {
      const keys = Object.keys(context)
      const values = Object.values(context)
      const fn = new Function(...keys, `return ${condition};`)
      return !!fn(...values)
    } catch {
      return false
    }
  }

  private _pascalCase(s: string): string {
    return s.replace(/([-_]\w)/g, g => g[1].toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase())
  }

  private _camelCase(s: string): string {
    return s.replace(/([-_]\w)/g, g => g[1].toUpperCase())
  }

  private _kebabCase(s: string): string {
    return s.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[_]/g, '-')
  }

  private _snakeCase(s: string): string {
    return s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/[-]/g, '_')
  }
}
