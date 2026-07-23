import { DocumentationArtifact } from './knowledge-types';

export interface SyncResult {
  syncedCount: number;
  artifacts: DocumentationArtifact[];
  timestamp: string;
}

export function syncDocumentation(artifacts: DocumentationArtifact[]): SyncResult {
  return {
    syncedCount: artifacts.length,
    artifacts: [...artifacts],
    timestamp: new Date().toISOString(),
  };
}
