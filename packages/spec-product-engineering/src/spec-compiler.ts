import { createLogger } from '@ideia/logger'
import { Token, SpecAST, MetaNode, BodyNode, RequirementListNode, RequirementNode, UseCaseListNode, UseCaseNode, AcceptanceListNode, CriterionNode, ArchitectureNode, CompiledOutput, Specification } from './types'

const logger = createLogger('spec-compiler')

export class SpecLexer {
  tokenize(input: string): Token[] {
    const tokens: Token[] = []
    const lines = input.split('\n')
    let pos = 0
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) { pos += line.length + 1; continue }
      if (/^#/.test(trimmed)) {
        tokens.push({ type: 'HEADING', value: trimmed.replace(/^#+\s*/, ''), position: pos })
      } else if (/^-\s/.test(trimmed)) {
        tokens.push({ type: 'LIST_ITEM', value: trimmed.replace(/^-\s*/, ''), position: pos })
      } else if (/^\d+\.\s/.test(trimmed)) {
        tokens.push({ type: 'ORDERED_LIST', value: trimmed.replace(/^\d+\.\s*/, ''), position: pos })
      } else if (/^RF-|^FR-|^NFR-|^CA-/i.test(trimmed)) {
        tokens.push({ type: 'REQUIREMENT', value: trimmed, position: pos })
      } else if (/^UC-/i.test(trimmed)) {
        tokens.push({ type: 'USECASE', value: trimmed, position: pos })
      } else {
        tokens.push({ type: 'TEXT', value: trimmed, position: pos })
      }
      pos += line.length + 1
    }
    logger.info(`Lexer complete`, { tokens: tokens.length })
    return tokens
  }
}

export class SpecParser {
  parse(tokens: Token[]): SpecAST {
    let meta: MetaNode = { type: 'Meta', title: 'Untitled', version: '1.0.0' }
    const requirements: RequirementNode[] = []
    const useCases: UseCaseNode[] = []
    const criteria: CriterionNode[] = []
    const architecture: Record<string, string> = {}

    for (const token of tokens) {
      if (token.type === 'REQUIREMENT') {
        const parts = token.value.split(/[:\-]/).map(s => s.trim())
        requirements.push({ type: 'Requirement', reqType: parts[0].startsWith('NFR') ? 'non-functional' : 'functional', id: parts[0] || 'REQ', description: parts[1] || token.value, props: {} })
      } else if (token.type === 'USECASE') {
        const parts = token.value.split(/[:\-]/).map(s => s.trim())
        useCases.push({ type: 'UseCase', id: parts[0] || 'UC', name: parts[1] || token.value, actor: 'User', precondition: '', steps: [] })
      } else if (token.type === 'HEADING') {
        if (/architect|arquitetura/i.test(token.value)) {
          architecture.pattern = token.value
        }
      }
    }

    const reqList: RequirementListNode = { type: 'RequirementList', items: requirements }
    const ucList: UseCaseListNode = { type: 'UseCaseList', items: useCases }
    const critList: AcceptanceListNode = { type: 'AcceptanceList', items: criteria }
    const archNode: ArchitectureNode = { type: 'Architecture', entries: architecture }

    return {
      type: 'Spec',
      meta,
      body: { type: 'Body', requirements: reqList, useCases: ucList, criteria: critList, architecture: archNode },
    }
  }
}

export class SpecCompiler {
  private lexer: SpecLexer
  private parser: SpecParser

  constructor(lexer?: SpecLexer, parser?: SpecParser) {
    this.lexer = lexer ?? new SpecLexer()
    this.parser = parser ?? new SpecParser()
  }

  compile(input: string, title: string): CompiledOutput {
    const tokens = this.lexer.tokenize(input)
    const ast = this.parser.parse(tokens)
    const spec: Specification = {
      id: `compiled-${Date.now()}`,
      title,
      overview: input.slice(0, 500),
      objectives: [],
      scope: { inScope: [], outOfScope: [], constraints: [] },
      userProfiles: [],
      functionalRequirements: ast.body.requirements.items.filter(r => r.reqType === 'functional').map(r => ({ id: r.id, type: 'functional' as const, description: r.description, priority: 'essential' as const })),
      nonFunctionalRequirements: ast.body.requirements.items.filter(r => r.reqType === 'non-functional').map(r => ({ id: r.id, type: 'non-functional' as const, description: r.description, priority: 'important' as const })),
      useCases: ast.body.useCases.items.map(uc => ({ id: uc.id, name: uc.name, actor: uc.actor, precondition: uc.precondition, steps: uc.steps })),
      acceptanceCriteria: ast.body.criteria.items.map(c => ({ id: c.id, description: c.description, type: 'functional' as const, verify: 'test' as const })),
      suggestedArchitecture: ast.body.architecture.entries,
      createdAt: new Date().toISOString(),
      version: '1.0.0',
    }

    logger.info(`Compilation complete`, { specId: spec.id, tokens: tokens.length })
    return { spec, ast, tokens, warnings: [] }
  }
}
