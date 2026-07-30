export type SBOMFormat = 'cyclonedx' | 'spdx'
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'none'
export type SLSALevel = 0 | 1 | 2 | 3 | 4

export interface DependencyInfo {
  name: string
  version: string
  purl: string
  ecosystem: string
  licenses: string[]
  isDev: boolean
  integrity?: string
  resolved?: string
}

export interface SBOMComponent {
  type: string
  name: string
  version: string
  purl?: string
  licenses: Array<{ license: { id: string } }>
  properties?: Array<{ name: string; value: string }>
}

export interface SBOMDocument {
  bomFormat: string
  specVersion: string
  version: number
  serialNumber: string
  metadata: {
    timestamp: string
    tools: Array<{ vendor: string; name: string; version: string }>
    component: { type: string; name: string; version: string }
    properties?: Array<{ name: string; value: string }>
  }
  components: SBOMComponent[]
}

export interface VulnerabilityInfo {
  id: string
  source: 'NVD' | 'OSV' | 'GHSA'
  url: string
  severity: Severity
  cvss: number
  epss: number
  cwe: string[]
  affected: Array<{ name: string; version: string; purl: string; ecosystem: string }>
  description: string
  fixVersion?: string
  published: string
  modified: string
  exploitability: string
  exploitMaturity?: string
}

export interface VulnerabilitySource {
  scanDependency(dep: DependencyInfo): Promise<VulnerabilityInfo[]>
}

export interface SLSCheck {
  level: SLSALevel
  name: string
  passed: boolean
  details: string
  evidence?: string
}

export interface InTotoStep {
  name: string
  materials: string[]
  products: string[]
  byProducts: Record<string, string>
  command: string[]
  threshold: number
  signatures: InTotoSignature[]
}

export interface InTotoSignature {
  keyid: string
  sig: string
  cert?: string
}

export interface InTotoLayout {
  _type: string
  keys: Record<string, { keytype: string; keyval: { public: string } }>
  steps: InTotoStep[]
  inspect: InTotoStep[]
  readme: string
}

export interface StepResult {
  step: string
  passed: boolean
  error?: string
}

export interface VerificationResult {
  totalSteps: number
  passed: number
  failed: number
  steps: StepResult[]
  verified: boolean
}

export interface ConflictEntry {
  package: string
  localVersion: string
  publicVersion: string
  risk: 'critical' | 'high' | 'medium'
  reason: string
}

export interface DependencyConfusionReport {
  totalConflicts: number
  criticalCount: number
  highCount: number
  conflicts: ConflictEntry[]
  recommendations: string[]
}

export interface NPMMaintainerInfo {
  name: string
  email: string
  has2FA: boolean
  packages: string[]
  lastLogin?: string
}

export interface PackageHealthReport {
  score: number
  issues: string[]
  details?: {
    name: string
    version?: string
    maintainerCount: number
    ageDays: number
    downloadsLast30: number
    hasProvenience: boolean
  }
}

export interface LockfileEntry {
  name: string
  version: string
  resolved: string
  integrity: string
  dependencies: string[]
  dev: boolean
  optional: boolean
  hasSubresourceIntegrity: boolean
}

export interface IntegrityReport {
  valid: boolean
  errors: string[]
  entries: LockfileEntry[]
  summary?: {
    total: number
    withIntegrity: number
    withoutIntegrity: number
    https: number
  }
}

export interface PackageBehaviorProfile {
  name: string
  version: string
  installScripts: string[]
  networkCalls: string[]
  fileSystemAccess: string[]
  obfuscationScore: number
  entropyScore: number
  dependencyDepth: number
  recentMaintainerChanges: boolean
  stalePeriod: number
  publishFrequency: number
}

export interface AIReport {
  packageName: string
  riskScore: number
  riskLevel: Severity
  flags: string[]
  recommendations: string[]
}
