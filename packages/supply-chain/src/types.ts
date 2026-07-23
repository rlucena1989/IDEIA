import { createHash } from 'crypto';

export interface ArtifactProvenance {
  id: string;
  name: string;
  version: string;
  hash: string;
  hashAlgorithm: string;
  createdAt: string;
  producedBy: string;
  buildEnvironment: string;
  dependencies: string[];
  attestation?: Attestation;
}

export interface Attestation {
  artifactId: string;
  commitHash: string;
  repoUrl: string;
  pipelineRunId: string;
  builderIdentity: string;
  timestamp: string;
  testsPassed: boolean;
  policiesApplied: string[];
  signature?: string;
}

export interface IntegrityCheck {
  artifactId: string;
  expectedHash: string;
  actualHash: string;
  match: boolean;
  error?: string;
}

export interface DependencyPolicy {
  name: string;
  allowedVersions: string[];
  blocked: boolean;
  requireAudit: boolean;
  maxAgeDays: number;
}

export interface BuildReproducibility {
  reproducible: boolean;
  differences: string[];
  buildConfig: Record<string, string>;
}
