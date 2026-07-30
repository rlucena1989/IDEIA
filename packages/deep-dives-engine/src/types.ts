export type ComplexityLevel = 'basic' | 'intermediate' | 'advanced' | 'expert'
export type AnalysisDimension = 'code' | 'performance' | 'security' | 'architecture' | 'ux' | 'data'

export interface DeepDiveRequest {
  topic: string
  context: string
  targetDepth: ComplexityLevel
  dimensions: AnalysisDimension[]
  existingContent?: string
}

export interface DeepDiveResult {
  topic: string
  depth: ComplexityLevel
  sections: DeepDiveSection[]
  totalLines: number
  codeBlocks: number
  qualityScore: number
}

export interface DeepDiveSection {
  title: string
  content: string
  codeExamples: CodeExample[]
  references: string[]
  complexity: ComplexityLevel
}

export interface CodeExample {
  language: string
  code: string
  description: string
  lines: number
}

export interface ComplexityAnalysis {
  overallLevel: ComplexityLevel
  scoresByDimension: Record<AnalysisDimension, number>
  recommendations: string[]
  estimatedImplementationHours: number
}

export interface CodeQualityMetrics {
  maintainability: number
  testability: number
  readability: number
  complexity: number
  coverage: number
}
