export interface BlueprintVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'multi-select'
  description?: string
  prompt?: string
  default?: string | number | boolean | string[]
  required?: boolean
  validate?: string
  options?: string[]
}

export interface BlueprintFile {
  template: string
  generate?: 'always'
  condition?: string
}

export interface BlueprintStructure {
  [key: string]: string | BlueprintFile | BlueprintStructure
}

export interface BlueprintDependencies {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
  optionalDependencies: Record<string, string>
}

export interface BlueprintModuleContract {
  name: string
  interfaces: Array<{
    name: string
    methods: Array<{
      name: string
      params: Array<{ name: string; type: string }>
      returns: string
    }>
  }>
}

export interface BlueprintPostProcess {
  command: string
  description?: string
  condition?: string
  timeout?: number
}

export interface BlueprintDefinition {
  name: string
  version: string
  description: string
  author?: string
  tags: string[]
  extends: string[]
  compatibility?: { ideia?: string; node?: string; pnpm?: string }
  variables: BlueprintVariable[]
  structure: BlueprintStructure
  dependencies: BlueprintDependencies
  configs?: {
    tsconfig?: Record<string, unknown>
    eslint?: Record<string, unknown>
    prettier?: Record<string, unknown>
    jest?: Record<string, unknown>
    vitest?: Record<string, unknown>
  }
  contracts?: {
    modules: BlueprintModuleContract[]
    schemaFormat: 'zod' | 'valibot' | 'typescript'
    generateTests: boolean
    generateOpenAPI: boolean
  }
  adrs?: {
    autoGenerate: boolean
    templates: Array<{ title: string; template: string }>
  }
  postProcess: BlueprintPostProcess[]
}

export interface InitOptions {
  blueprint: string
  name: string
  directory: string
  variables?: Record<string, unknown>
  force?: boolean
  skipNpmInstall?: boolean
  skipGitInit?: boolean
  ci?: boolean
}

export interface GenerateResult {
  projectPath: string
  filesCreated: number
  filesSkipped: number
  dependenciesInstalled: boolean
  gitInitialized: boolean
  adrsGenerated: number
  contractsGenerated: number
  duration: number
}

export interface TemplateContext {
  [key: string]: unknown
  projectName: string
  projectNamePascal: string
  projectNameCamel: string
  projectNameKebab: string
  projectNameSnake: string
  moduleNamePascal: string
  moduleNameCamel: string
  moduleNameKebab: string
  createdAt: string
  ideiaVersion: string
  nodeVersion: string
}

export interface GeneratedConfig {
  path: string
  content: string
}

export interface GeneratedContract {
  path: string
  content: string
}

export interface GenerateADR {
  path: string
  content: string
}

export interface BlueprintMetadata {
  name: string
  version: string
  description: string
  tags: string[]
  downloads?: number
  rating?: number
}

export interface BlueprintValidation {
  valid: boolean
  errors: string[]
}

export interface BlueprintFilter {
  tags?: string[]
  query?: string
}
