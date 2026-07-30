export type DescriptionLevel = 'summary' | 'full' | 'detailed'
export type EnrichTarget = 'system-prompt' | 'api' | 'cli'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type AdapterStatus = 'stable' | 'beta' | 'alpha'
export type AutonomyLevel = 'N0' | 'N1' | 'N2' | 'N3' | 'N4'
export type OutputFormat = 'json' | 'yaml' | 'markdown' | 'text'

export interface Manifest {
  id: string
  version: string
  platformVersion: string
  generatedAt: string
  generatorVersion: string
  name: string
  description: string
  architecture: ArchitectureSection
  agents: AgentManifest[]
  capabilities: CapabilityManifest[]
  tools: ToolManifest[]
  commands: CommandManifest[]
  contextPacks: ContextPackManifest[]
  registries: RegistriesSection
  adapters: AdapterManifest[]
  workflows: WorkflowManifest[]
  limitations: LimitationsSection
}

export interface ArchitectureSection {
  pattern: string
  layers: LayerManifest[]
  messageBus: MessageBusInfo
  extensibility: ExtensibilityInfo
}

export interface LayerManifest {
  id: string
  name: string
  description: string
  packages: string[]
}

export interface MessageBusInfo {
  type: string
  implementation: string
  patterns: string[]
}

export interface ExtensibilityInfo {
  pluginSystem: boolean
  mcpSupport: boolean
  adapterArchitecture: boolean
}

export interface AgentManifest {
  id: string
  name: string
  role: string
  description?: string
  capabilities: string[]
  autonomyLevel: AutonomyLevel
  tools?: string[]
}

export interface CapabilityManifest {
  id: string
  name: string
  description: string
  category?: string
  riskLevel?: RiskLevel
}

export interface ToolManifest {
  id: string
  name: string
  description: string
  parameters: Record<string, ToolParameter>
  dangerous?: boolean
}

export interface ToolParameter {
  type: string
  description: string
  required: boolean
}

export interface CommandManifest {
  path: string
  description: string
  category: string
  aliases?: string[]
  examples?: string[]
}

export interface ContextPackManifest {
  level: DescriptionLevel
  tokenBudget: number
  sections: ContextSection[]
}

export interface ContextSection {
  id: string
  name: string
  maxTokens: number
  content?: string
}

export interface RegistriesSection {
  schemas: RegistryEntry[]
  events: RegistryEntry[]
  contracts: RegistryEntry[]
}

export interface RegistryEntry {
  name: string
  version: string
  url: string
  description?: string
}

export interface AdapterManifest {
  id: string
  language: string
  status: AdapterStatus
  capabilities: string[]
}

export interface WorkflowManifest {
  id: string
  name: string
  description?: string
  steps: WorkflowStep[]
}

export interface WorkflowStep {
  id: string
  agent: string
  action: string
  timeout?: number
}

export interface LimitationsSection {
  notImplemented: string[]
  experimental: string[]
  deprecated: string[]
  maxContextWindow: number
  maxTokens: number
  supportedModels: string[]
}

export interface ManifestSystem {
  generator: ManifestGenerator
  validator: ManifestValidator
  resolver: ManifestResolver
  store: ManifestStore
  enricher: ContextEnricher
}

export interface ManifestGenerator {
  generate(options?: GenerateOptions): Promise<Manifest>
  generateFromScan(scan: ScanResult): Promise<Manifest>
}

export interface ManifestValidator {
  validate(manifest: unknown): ValidationResult
  validateAgainstReality(manifest: Manifest): RealityValidationResult
}

export interface ManifestResolver {
  resolve<T>(query: ResolveQuery): Promise<T>
  resolveSection(section: string, level?: DescriptionLevel): Promise<object>
  resolveAgent(name: string): Promise<AgentManifest | null>
  resolveCommand(path: string): Promise<CommandManifest | null>
}

export interface ManifestStore {
  read(): Promise<Manifest | null>
  write(manifest: Manifest): Promise<void>
  invalidate(): Promise<void>
  getPath(): string
}

export interface ContextEnricher {
  enrich(level: DescriptionLevel, target: EnrichTarget): Promise<string>
  enrichSystemPrompt(prompt: string, level: DescriptionLevel): Promise<string>
}

export interface ScanResult {
  packages: string[]
  interfaces: string[]
  endpoints: string[]
  commands: string[]
  agents: string[]
  events: string[]
  tools: string[]
  adapters: string[]
}

export interface GenerateOptions {
  force?: boolean
  skipValidation?: boolean
  format?: OutputFormat
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  path: string
  message: string
  code: string
}

export interface ValidationWarning {
  path: string
  message: string
  code: string
}

export interface RealityValidationResult {
  valid: boolean
  missing: string[]
  extra: string[]
  inconsistencies: string[]
}

export interface ResolveQuery {
  all?: boolean
  section?: string
  level?: DescriptionLevel
}
