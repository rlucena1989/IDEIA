import * as fsp from 'fs/promises'
import * as path from 'path'
import { createLogger } from '@ideia/logger'
import { Blueprint, ScaffoldContext, ScaffoldResult } from './types'
import { BlueprintParser } from './blueprint-parser'
import { TemplateRenderer } from './template-renderer'
import { DependencyInjector } from './dependency-injector'
import { ConfigGenerator } from './config-generator'
import { ContractGenerator } from './contract-generator'
import { ADRGenerator } from './adr-generator'

const logger = createLogger('pipeline-executor')

export class PipelineExecutor {
  private parser: BlueprintParser
  private renderer: TemplateRenderer
  private depInjector: DependencyInjector
  private configGen: ConfigGenerator
  private contractGen: ContractGenerator
  private adrGen: ADRGenerator

  constructor(
    parser?: BlueprintParser,
    renderer?: TemplateRenderer,
    depInjector?: DependencyInjector,
    configGen?: ConfigGenerator,
    contractGen?: ContractGenerator,
    adrGen?: ADRGenerator,
  ) {
    this.parser = parser ?? new BlueprintParser()
    this.renderer = renderer ?? new TemplateRenderer()
    this.depInjector = depInjector ?? new DependencyInjector()
    this.configGen = configGen ?? new ConfigGenerator()
    this.contractGen = contractGen ?? new ContractGenerator()
    this.adrGen = adrGen ?? new ADRGenerator()
  }

  async execute(blueprint: Blueprint, context: ScaffoldContext): Promise<ScaffoldResult> {
    const result: ScaffoldResult = {
      success: true,
      filesCreated: [],
      directoriesCreated: [],
      contractsGenerated: 0,
      adrsGenerated: 0,
      postProcessResults: [],
      errors: [],
    }

    try {
      await this.createDirectories(blueprint, context, result)
      await this.createFiles(blueprint, context, result)
      await this.generateContracts(blueprint, context, result)
      await this.generateADRs(blueprint, context, result)
      await this.generateConfigs(blueprint, context, result)
      await this.runPostProcess(blueprint, context, result)
    } catch (err) {
      result.success = false
      result.errors.push(String(err))
      logger.error(`Pipeline execution failed`, { error: String(err) })
    }

    logger.info(`Pipeline execution complete`, { success: result.success, files: result.filesCreated.length })
    return result
  }

  private async createDirectories(blueprint: Blueprint, context: ScaffoldContext, result: ScaffoldResult): Promise<void> {
    for (const dir of blueprint.structure.directories) {
      const fullPath = path.join(context.outputDir, dir)
      await fsp.mkdir(fullPath, { recursive: true })
      result.directoriesCreated.push(fullPath)
    }
  }

  private async createFiles(blueprint: Blueprint, context: ScaffoldContext, result: ScaffoldResult): Promise<void> {
    for (const file of blueprint.structure.files) {
      const fullPath = path.join(context.outputDir, file.path)
      if (file.skipIfExists) {
        try {
          await fsp.access(fullPath)
          continue
        } catch { /* file does not exist */ }
      }
      let rawContent = file.content || '// Auto-generated\n'
      if (file.template) {
        rawContent = await this.renderer.renderFile(file.template, context)
      }
      const content = this.renderer.render(rawContent, context)
      await fsp.mkdir(path.dirname(fullPath), { recursive: true })
      await fsp.writeFile(fullPath, content, 'utf-8')
      result.filesCreated.push(fullPath)
    }
  }

  private async generateContracts(blueprint: Blueprint, context: ScaffoldContext, result: ScaffoldResult): Promise<void> {
    if (!blueprint.contracts) return
    for (const contract of blueprint.contracts) {
      const content = this.contractGen.generate(contract)
      const filename = `contracts/${contract.name.toLowerCase().replace(/\s+/g, '-')}.ts`
      const fullPath = path.join(context.outputDir, filename)
      await fsp.mkdir(path.dirname(fullPath), { recursive: true })
      await fsp.writeFile(fullPath, content, 'utf-8')
      result.contractsGenerated++
    }
  }

  private async generateADRs(blueprint: Blueprint, context: ScaffoldContext, result: ScaffoldResult): Promise<void> {
    if (blueprint.adrs && blueprint.adrs.length > 0) {
      for (const adr of blueprint.adrs) {
        const content = this.adrGen.generate(adr, context)
        const filename = `adr/${this.slugify(adr.title)}.md`
        const fullPath = path.join(context.outputDir, filename)
        await fsp.mkdir(path.dirname(fullPath), { recursive: true })
        await fsp.writeFile(fullPath, content, 'utf-8')
        result.adrsGenerated++
      }
    } else {
      const defaults = this.adrGen.generateDefaultADRs(context)
      for (const adr of defaults) {
        const fullPath = path.join(context.outputDir, adr.filename)
        await fsp.mkdir(path.dirname(fullPath), { recursive: true })
        await fsp.writeFile(fullPath, adr.content, 'utf-8')
        result.adrsGenerated++
      }
    }
  }

  private async generateConfigs(blueprint: Blueprint, context: ScaffoldContext, result: ScaffoldResult): Promise<void> {
    const tsconfig = this.configGen.generateTsconfig(context)
    await fsp.writeFile(path.join(context.outputDir, 'tsconfig.json'), tsconfig, 'utf-8')
    result.filesCreated.push(path.join(context.outputDir, 'tsconfig.json'))

    const gitignore = this.configGen.generateGitignore()
    await fsp.writeFile(path.join(context.outputDir, '.gitignore'), gitignore, 'utf-8')
    result.filesCreated.push(path.join(context.outputDir, '.gitignore'))
  }

  private async runPostProcess(blueprint: Blueprint, context: ScaffoldContext, result: ScaffoldResult): Promise<void> {
    if (!blueprint.postProcess) return
    for (const script of blueprint.postProcess) {
      result.postProcessResults.push(`Would run: ${script}`)
    }
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }
}
