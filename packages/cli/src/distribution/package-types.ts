import * as crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('package-types');

export interface OperationalPackageMetadata {
  packageId: string;
  version: string;
  createdAt: string;
  source: string;
  target: string;
  kind: 'state' | 'context' | 'publication' | 'generation' | 'audit';
  tags: string[];
}

export interface OperationalPackage<T = unknown> {
  metadata: OperationalPackageMetadata;
  payload: T;
  checksum: string;
}

export interface PackageEmissionResult {
  ok: boolean;
  emittedAt: string;
  target: string;
  checksum: string;
  notes: string[];
}

export function createPackageMetadata(params: {
  version?: string;
  source: string;
  target: string;
  kind: OperationalPackageMetadata['kind'];
  tags?: string[];
}): OperationalPackageMetadata {
  return {
    packageId: crypto.randomUUID(),
    version: params.version ?? '1.0.0',
    createdAt: new Date().toISOString(),
    source: params.source,
    target: params.target,
    kind: params.kind,
    tags: params.tags ?? [],
  };
}
