import { ArtifactRegistry } from './artifact-registry';
import { createLogger } from '@ideia/logger';
import { DependencyPolicyManager } from './dependency-policy';
import { BuildVerifier } from './build-verifier';
import { ArtifactProvenance, IntegrityCheck, DependencyPolicy, BuildReproducibility } from './types';

export class SupplyChainManager {
  readonly artifactRegistry: ArtifactRegistry;
  readonly dependencyPolicy: DependencyPolicyManager;
  readonly buildVerifier: BuildVerifier;

  constructor() {
    this.artifactRegistry = new ArtifactRegistry();
    this.dependencyPolicy = new DependencyPolicyManager();
    this.buildVerifier = new BuildVerifier();
  }

  registerArtifact(name: string, version: string, content: string, producedBy: string, buildEnv: string, deps?: string[]): ArtifactProvenance {
    return this.artifactRegistry.register(name, version, content, producedBy, buildEnv, deps);
  }

  verify(id: string, content: string): IntegrityCheck {
    return this.artifactRegistry.verifyIntegrity(id, content);
  }

  checkDependency(name: string, version: string, ageDays: number): { allowed: boolean; reasons: string[] } {
    return this.dependencyPolicy.check(name, version, ageDays);
  }

  verifyBuild(inputs: Record<string, string>, config: Record<string, string>, expectedHash: string): BuildReproducibility {
    return this.buildVerifier.verify(inputs, config, expectedHash);
  }
}

export function createSupplyChainManager(): SupplyChainManager {
  return new SupplyChainManager();
}
