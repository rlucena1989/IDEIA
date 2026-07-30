import { createLogger } from '@ideia/logger'
import { DeepDiveRequest, DeepDiveResult, DeepDiveSection, CodeExample, ComplexityAnalysis, ComplexityLevel, AnalysisDimension } from './types'

const logger = createLogger('deep-dives-engine')

export class DeepDiveEngine {
  async analyze(request: DeepDiveRequest): Promise<DeepDiveResult> {
    const sections: DeepDiveSection[] = []

    for (const dim of request.dimensions) {
      const section = await this.generateSection(request.topic, dim, request.targetDepth)
      sections.push(section)
    }

    const totalLines = sections.reduce((s, sec) => s + sec.content.split('\n').length, 0)
    const codeBlocks = sections.reduce((s, sec) => s + sec.codeExamples.length, 0)

    logger.info(`Deep dive generated`, { topic: request.topic, sections: sections.length, totalLines })

    return {
      topic: request.topic,
      depth: request.targetDepth,
      sections,
      totalLines,
      codeBlocks,
      qualityScore: this.calculateQuality(sections),
    }
  }

  async generateSection(topic: string, dimension: AnalysisDimension, depth: ComplexityLevel): Promise<DeepDiveSection> {
    const codeExamples = this.generateCodeExamples(topic, dimension, depth)
    return {
      title: `${dimension.toUpperCase()} Deep Dive: ${topic}`,
      content: this.generateContent(topic, dimension, depth),
      codeExamples,
      references: this.getReferences(dimension),
      complexity: depth,
    }
  }

  analyzeComplexity(code: string): ComplexityAnalysis {
    const lines = code.split('\n').length
    const hasClasses = /class\s/.test(code)
    const hasGenerics = /<[A-Z]\w*>/.test(code)
    const hasAsync = /async|await/.test(code)
    const hasDecorators = /@\w+/.test(code)

    const scores: Record<AnalysisDimension, number> = {
      code: hasGenerics ? 80 : 50,
      performance: hasAsync ? 70 : 40,
      security: 50,
      architecture: hasClasses ? 75 : 40,
      ux: 30,
      data: 50,
    }

    let overallLevel: ComplexityLevel
    const avg = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
    if (avg > 80) overallLevel = 'expert'
    else if (avg > 65) overallLevel = 'advanced'
    else if (avg > 45) overallLevel = 'intermediate'
    else overallLevel = 'basic'

    return {
      overallLevel,
      scoresByDimension: scores,
      recommendations: lines > 200 ? ['Consider splitting into smaller modules'] : [],
      estimatedImplementationHours: Math.ceil(lines / 50),
    }
  }

  private calculateQuality(sections: DeepDiveSection[]): number {
    if (sections.length === 0) return 0
    const scores = sections.map(s => {
      let score = 50
      score += Math.min(s.codeExamples.length * 10, 30)
      score += s.references.length > 0 ? 10 : 0
      score += s.content.length > 500 ? 10 : 0
      return score
    })
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  private generateContent(topic: string, dimension: AnalysisDimension, depth: ComplexityLevel): string {
    return [
      `## ${dimension} Analysis for "${topic}"`,
      '',
      `This section provides a ${depth}-level deep dive into the ${dimension} aspects of ${topic}.`,
      '',
      `### Key Considerations`,
      '',
      `- Architectural alignment with existing IDEIA patterns`,
      `- ${dimension === 'performance' ? 'Performance budgets and SLAs' : 'Best practices and standards'}`,
      `- Integration points with existing packages`,
      '',
      `### Implementation Details`,
      '',
      `The ${dimension} dimension requires careful attention to:`,
      `1. Existing codebase conventions`,
      `2. TypeScript strict mode compliance`,
      `3. Test coverage requirements`,
      `4. Documentation standards`,
    ].join('\n')
  }

  private generateCodeExamples(topic: string, dimension: AnalysisDimension, depth: ComplexityLevel): CodeExample[] {
    return [
      {
        language: 'typescript',
        code: `// ${dimension} implementation for ${topic}\nexport class ${topic.replace(/\s+/g, '')}Engine {\n  async execute(): Promise<void> {\n    // Implementation\n  }\n}`,
        description: `Core ${dimension} engine implementation`,
        lines: 8,
      },
    ]
  }

  private getReferences(dimension: AnalysisDimension): string[] {
    const refs: Record<AnalysisDimension, string[]> = {
      code: ['Clean Code (Martin)', 'TypeScript Deep Dive (Basarat)'],
      performance: ['High Performance Browser Networking (Grigorik)', 'Web Performance in Action'],
      security: ['OWASP Top 10', 'Security Engineering (Anderson)'],
      architecture: ['Clean Architecture (Martin)', 'Building Evolutionary Architectures'],
      ux: ["Don't Make Me Think (Krug)", 'The Design of Everyday Things (Norman)'],
      data: ['Designing Data-Intensive Applications (Kleppmann)', 'Database Internals'],
    }
    return refs[dimension] || []
  }
}
