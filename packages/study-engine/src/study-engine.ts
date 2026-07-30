import * as path from 'path'
import * as fsp from 'fs/promises'
import { createLogger } from '@ideia/logger'
import {
  StudyArtifact, StudyADR, StudyDependency, StudyChange,
  StudyDepth, FeatureRiskClass, StudyStatus, StudyEngineConfig,
} from './types'

const logger = createLogger('study-engine')

const DEFAULT_CONFIG: StudyEngineConfig = {
  studiesRoot: 'estudos',
  defaultAuthor: 'system',
}

export class StudyEngine {
  private config: StudyEngineConfig

  constructor(config?: Partial<StudyEngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async create(
    featureName: string,
    depth: StudyDepth,
    riskClass: FeatureRiskClass,
    author?: string,
  ): Promise<StudyArtifact> {
    const now = new Date().toISOString()
    const id = `study-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const slug = this.toSlug(featureName)

    const study: StudyArtifact = {
      id,
      featureName,
      depth,
      riskClass,
      status: 'draft',
      summary: '',
      topics: [],
      adrs: [],
      dependencies: [],
      acceptanceCriteriaCount: 0,
      createdAt: now,
      updatedAt: now,
      version: 1,
      author: author ?? this.config.defaultAuthor,
      path: path.join(this.config.studiesRoot, `${slug}/`),
    }

    const dirPath = path.resolve(this.config.studiesRoot, slug)
    await fsp.mkdir(dirPath, { recursive: true })

    const filePath = path.join(dirPath, 'estudo.md')
    await fsp.writeFile(filePath, this.renderStudyMarkdown(study), 'utf-8')

    await this.save(study)

    logger.info('Study created', { id, feature: featureName, depth, risk: riskClass, path: filePath })
    return study
  }

  async addAdr(studyId: string, adr: StudyADR): Promise<StudyArtifact> {
    const study = await this.load(studyId)
    study.adrs.push(adr)
    study.version++
    study.updatedAt = new Date().toISOString()
    await this.save(study)
    logger.info('ADR added to study', { studyId, adrId: adr.id })
    return study
  }

  async addDependency(studyId: string, dep: StudyDependency): Promise<StudyArtifact> {
    const study = await this.load(studyId)
    study.dependencies.push(dep)
    study.version++
    study.updatedAt = new Date().toISOString()
    await this.save(study)
    return study
  }

  async updateSummary(studyId: string, summary: string): Promise<StudyArtifact> {
    const study = await this.load(studyId)
    study.summary = summary
    study.version++
    study.updatedAt = new Date().toISOString()
    await this.save(study)
    return study
  }

  async commit(studyId: string): Promise<StudyArtifact> {
    const study = await this.load(studyId)
    study.status = 'committed'
    study.version++
    study.updatedAt = new Date().toISOString()
    await this.save(study)
    logger.info('Study committed', { studyId, feature: study.featureName })
    return study
  }

  async load(studyId: string): Promise<StudyArtifact> {
    const filePath = path.resolve(this.config.studiesRoot, '.registry', `${studyId}.json`)
    const content = await fsp.readFile(filePath, 'utf-8')
    return JSON.parse(content) as StudyArtifact
  }

  private async save(study: StudyArtifact): Promise<void> {
    const registryDir = path.resolve(this.config.studiesRoot, '.registry')
    await fsp.mkdir(registryDir, { recursive: true })

    const filePath = path.join(registryDir, `${study.id}.json`)
    await fsp.writeFile(filePath, JSON.stringify(study, null, 2), 'utf-8')

    const mdPath = path.join(path.resolve(this.config.studiesRoot), this.toSlug(study.featureName), 'estudo.md')
    await fsp.writeFile(mdPath, this.renderStudyMarkdown(study), 'utf-8')
  }

  private renderStudyMarkdown(study: StudyArtifact): string {
    const lines: string[] = [
      `# Estudo: ${study.featureName}`,
      '',
      `**ID:** ${study.id}  `,
      `**Versão:** ${study.version}  `,
      `**Profundidade:** ${study.depth === 'full' ? '🔴 Completo' : '🟢 Leve'}  `,
      `**Classe de Risco:** ${study.riskClass}  `,
      `**Status:** ${study.status}  `,
      `**Criado em:** ${study.createdAt}  `,
      '',
      '---',
      '',
      '## Sumário',
      '',
      study.summary || '*Pendente*',
      '',
      '---',
      '',
      '## Tópicos',
      '',
    ]

    if (study.topics.length === 0) {
      lines.push('*Nenhum tópico registrado*')
    } else {
      study.topics.forEach(t => lines.push(`- ${t}`))
    }

    lines.push('', '---', '', '## Decisões Arquiteturais (ADRs)', '')

    if (study.adrs.length === 0) {
      lines.push('*Nenhum ADR registrado*')
    } else {
      study.adrs.forEach(adr => {
        lines.push(
          `### ADR-${adr.id} — ${adr.title}`,
          '',
          `**Status:** ${adr.status}  `,
          `**Data:** ${adr.date}  `,
          '',
          '**Contexto:**',
          '',
          adr.context,
          '',
          '**Decisão:**',
          '',
          adr.decision,
          '',
          '**Consequências:**',
          '',
          'Positivas:',
        )
        adr.consequences.positive.forEach(c => lines.push(`  - ${c}`))
        lines.push('', 'Negativas:')
        adr.consequences.negative.forEach(c => lines.push(`  - ${c}`))
        lines.push('', '**Alternativas:**')
        adr.alternatives.forEach(a => lines.push(`- ${a}`))
        lines.push('', '**Referências:**')
        adr.references.forEach(r => lines.push(`- ${r}`))
        lines.push('')
      })
    }

    lines.push('---', '', '## Dependências', '')

    if (study.dependencies.length === 0) {
      lines.push('*Nenhuma dependência identificada*')
    } else {
      lines.push('| Nome | Tipo | Obrigatória | Versão |')
      lines.push('|------|------|-------------|--------|')
      study.dependencies.forEach(d => {
        lines.push(`| ${d.name} | ${d.type} | ${d.required ? 'Sim' : 'Não'} | ${d.version ?? '-'} |`)
      })
    }

    lines.push('', '---', '', '## Critérios de Aceitação', '')
    lines.push(`**Total:** ${study.acceptanceCriteriaCount}`, '')

    return lines.join('\n')
  }

  async list(): Promise<StudyArtifact[]> {
    const registryDir = path.resolve(this.config.studiesRoot, '.registry')
    try {
      await fsp.access(registryDir)
    } catch {
      return []
    }
    const files = await fsp.readdir(registryDir)
    const studies: StudyArtifact[] = []
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fsp.readFile(path.join(registryDir, file), 'utf-8')
        studies.push(JSON.parse(content) as StudyArtifact)
      }
    }
    return studies.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}
