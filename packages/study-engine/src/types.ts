export type StudyDepth = 'light' | 'full'
export type StudyStatus = 'draft' | 'committed' | 'reviewing' | 'superseded'
export type FeatureRiskClass = 'L' | 'M' | 'H'

export interface StudyADR {
  id: string
  title: string
  status: 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded'
  date: string
  context: string
  decision: string
  consequences: { positive: string[]; negative: string[] }
  alternatives: string[]
  references: string[]
}

export interface StudyDependency {
  name: string
  type: 'library' | 'service' | 'api' | 'infra'
  required: boolean
  version?: string
}

export interface StudyArtifact {
  id: string
  featureName: string
  depth: StudyDepth
  riskClass: FeatureRiskClass
  status: StudyStatus
  summary: string
  topics: string[]
  adrs: StudyADR[]
  dependencies: StudyDependency[]
  acceptanceCriteriaCount: number
  createdAt: string
  updatedAt: string
  version: number
  author: string
  path: string
}

export interface StudyChange {
  version: number
  date: string
  author: string
  description: string
}

export interface StudyEngineConfig {
  studiesRoot: string
  defaultAuthor: string
}
