export interface Blueprint {
  name: string
  version: string
  description: string
  author?: string
  tags?: string[]
  extends?: string
  compatibility?: string[]
  structure: BlueprintStructure
  variables?: BlueprintVariable[]
  dependencies?: BlueprintDependency[]
  configurations?: Record<string, unknown>
  contracts?: BlueprintContract[]
  adrs?: BlueprintADR[]
  postProcess?: string[]
}

export interface BlueprintStructure {
  directories: string[]
  files: BlueprintFileSpec[]
}

export interface BlueprintFileSpec {
  path: string
  template?: string
  content?: string
  permission?: string
  skipIfExists?: boolean
}

export interface BlueprintVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect'
  label: string
  description?: string
  default?: unknown
  required?: boolean
  options?: string[]
  validate?: string
}

export interface BlueprintDependency {
  name: string
  version: string
  type: 'npm' | 'pip' | 'cargo' | 'go'
  dev?: boolean
  optional?: boolean
}

export interface BlueprintContract {
  name: string
  description: string
  type: 'interface' | 'type' | 'schema' | 'event'
  fields?: ContractField[]
}

export interface ContractField {
  name: string
  type: string
  required: boolean
  description?: string
}

export interface BlueprintADR {
  title: string
  context: string
  decision: string
  consequences: string[]
  status: 'Proposed' | 'Accepted'
}

export interface ScaffoldContext {
  projectName: string
  projectDescription: string
  variables: Record<string, unknown>
  outputDir: string
}

export interface ScaffoldResult {
  success: boolean
  filesCreated: string[]
  directoriesCreated: string[]
  contractsGenerated: number
  adrsGenerated: number
  postProcessResults: string[]
  errors: string[]
}

export interface BlueprintRegistryEntry {
  name: string
  version: string
  description: string
  tags: string[]
  source: string
}
