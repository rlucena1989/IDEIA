import { ArtifactProvenance, IntegrityCheck, Attestation } from './types';
import { createHash, randomUUID } from 'crypto';

export class ArtifactRegistry {
  private artifacts: Map<string, ArtifactProvenance> = new Map();

  register(name: string, version: string, content: string, producedBy: string, buildEnv: string, deps?: string[]): ArtifactProvenance {
    const hash = createHash('sha256').update(content).digest('hex');
    const id = randomUUID();
    const artifact: ArtifactProvenance = {
      id, name, version, hash, hashAlgorithm: 'sha256',
      createdAt: new Date().toISOString(),
      producedBy, buildEnvironment: buildEnv,
      dependencies: deps ?? [],
    };
    this.artifacts.set(id, artifact);
    return { ...artifact };
  }

  get(id: string): ArtifactProvenance | undefined {
    const a = this.artifacts.get(id);
    return a ? { ...a } : undefined;
  }

  addAttestation(artifactId: string, attestation: Attestation): ArtifactProvenance | undefined {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) return undefined;
    artifact.attestation = attestation;
    this.artifacts.set(artifactId, artifact);
    return { ...artifact };
  }

  verifyIntegrity(artifactId: string, actualContent: string): IntegrityCheck {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) return { artifactId, expectedHash: '', actualHash: '', match: false, error: 'Artifact not found' };

    const actualHash = createHash('sha256').update(actualContent).digest('hex');
    return {
      artifactId,
      expectedHash: artifact.hash,
      actualHash,
      match: actualHash === artifact.hash,
    };
  }

  findByHash(hash: string): ArtifactProvenance[] {
    return Array.from(this.artifacts.values())
      .filter(a => a.hash === hash)
      .map(a => ({ ...a }));
  }
}
