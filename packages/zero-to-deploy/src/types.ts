export type WorkflowPhase =
  | 'requirements' | 'architecture' | 'implement'
  | 'testing' | 'build' | 'deploy' | 'verify'

export type WorkflowState =
  | 'entry' | 'requirements' | 'req_failed' | 'req_retry'
  | 'architecture' | 'arch_failed' | 'arch_retry'
  | 'implement' | 'impl_failed' | 'impl_retry'
  | 'testing' | 'tst_failed' | 'tst_fix'
  | 'build' | 'bld_failed' | 'bld_retry'
  | 'deploy' | 'dpl_failed' | 'dpl_retry'
  | 'verify' | 'vrf_failed' | 'vrf_retry'
  | 'completed' | 'cancelled'

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4

export interface Specification {
  id: string
  title: string
  description: string
  intent: 'feature' | 'bugfix' | 'refactor' | 'question'
  urgency: 'low' | 'medium' | 'high' | 'critical'
  entities: { domain: string; stack: string[]; requirements: string[] }
  userStories: Array<{
    id: string; role: string; want: string; benefit: string
    priority: 'MUST' | 'SHOULD' | 'COULD' | 'WONT'
    acceptanceCriteria: Array<{ scenario: string; given: string; when: string; then: string }>
  }>
  constraints: { time?: string; budget?: string; team?: string; external: string[] }
  definitionOfDone: string[]
}

export interface Architecture {
  id: string
  specificationId: string
  stack: {
    language: string; framework: string; database: string
    messaging: string; cache: string; deployment: string; observability: string
  }
  adrs: Array<{
    id: string; title: string; context: string; decision: string
    options: Array<{ name: string; pros: string[]; cons: string[] }>
    consequences: string; status: 'proposed' | 'accepted' | 'deprecated'
  }>
  risks: Array<{ id: string; description: string; probability: number; impact: number; score: number; mitigation: string; owner: string }>
}

export interface Artifact {
  id: string
  image: { registry: string; name: string; tag: string; digest: string; size: number }
  sbom: { format: 'cyclonedx' | 'spdx'; version: string; dependencies: number }
  signature: { tool: string; keyId: string; timestamp: string }
  checksums: Record<string, string>
}

export interface DeployReport {
  id: string
  status: 'success' | 'failed' | 'rolled-back'
  environment: 'local' | 'staging' | 'production'
  urls: { app?: string; api?: string; health?: string }
  health: { status: 'healthy' | 'degraded' | 'unhealthy'; checks: Array<{ name: string; endpoint: string; status: number; duration: number; healthy: boolean }> }
  timing: { total: number; pull: number; migrate: number; start: number; verify: number }
  rollback: { available: boolean; previousDigest: string; script: string; estimatedTime: number }
  logs: string[]
  recommendations: string[]
}

export interface HealthCheckResult {
  name: string
  endpoint: string
  status: number
  duration: number
  healthy: boolean
}

export interface ProgressivePhase {
  weight: number
  version: string
  startedAt: number
  status: string
  error?: string
}

export interface ProgressiveResult {
  success: boolean
  finalWeight: number
  phases: ProgressivePhase[]
  rollbackTriggered: boolean
}

export interface CloudProvider {
  name: string
  deploy(service: string, artifact: string, region: string): Promise<void>
  healthCheck(region: string): Promise<boolean>
  getRegions(): string[]
}

export interface MultiCloudResult {
  service: string
  artifact: string
  results: Array<{ region: string; provider: string; success: boolean; latency: number }>
  successRate: number
  avgLatency: number
}

export interface DeploymentSpec {
  name: string
  replicas: number
  healthCheck?: string
  rollbackStrategy?: string
  secretRefs?: string[]
}

export interface FormalProof {
  deploymentId: string
  verified: boolean
  checks: string[]
  proofs: string[]
  verificationTime: number
  verifier: string
  signature: string
}


export interface DeployPipeline {
  id: string;
  name: string;
  stages: DeployStage[];
  currentStage: number;
  status: DeployStatus;
  startedAt?: string;
  completedAt?: string;
}

export interface DeployStage {
  id: string;
  name: string;
  type: 'build' | 'test' | 'deploy' | 'verify';
  status: 'pending' | 'running' | 'completed' | 'failed';
  artifacts: DeployArtifact[];
}

export interface DeployArtifact {
  id: string;
  name: string;
  type: 'docker' | 'zip' | 'tar';
  checksum: string;
  size: number;
}

export interface DeployTarget {
  id: string;
  name: string;
  type: 'kubernetes' | 'docker' | 'vm';
  region: string;
  config: Record<string, unknown>;
  environment?: string;
}

export interface DeployResult {
  success: boolean;
  stage: string;
  message: string;
  timestamp: string;
  pipelineId?: string;
}

export type DeployStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rolled-back';


