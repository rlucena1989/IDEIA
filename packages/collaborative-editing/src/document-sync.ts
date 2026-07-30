import { DocumentSnapshot, ConflictResolution } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('document-sync');

interface DocumentStore {
  content: string;
  version: number;
  lastEditorId: string;
}

export class DocumentSyncManager {
  private documents: Map<string, DocumentStore> = new Map();
  private snapshots: Map<string, DocumentSnapshot[]> = new Map();

  pushChanges(documentId: string, content: string, editorId: string): number {
    const existing = this.documents.get(documentId) ?? { content: '', version: 0, lastEditorId: '' };
    existing.content = content;
    existing.version += 1;
    existing.lastEditorId = editorId;
    this.documents.set(documentId, existing);
    return existing.version;
  }

  pullChanges(documentId: string): { content: string; version: number; lastEditorId: string } | null {
    const doc = this.documents.get(documentId);
    if (!doc) return null;
    return { content: doc.content, version: doc.version, lastEditorId: doc.lastEditorId };
  }

  getVersion(documentId: string): number {
    return this.documents.get(documentId)?.version ?? 0;
  }

  resolveConflict(documentId: string, strategy: ConflictResolution['strategy'], resolvedBy: string): ConflictResolution {
    const resolution: ConflictResolution = {
      strategy,
      resolvedBy,
      timestamp: new Date(),
    };
    return resolution;
  }

  createSnapshot(documentId: string): DocumentSnapshot | null {
    const doc = this.documents.get(documentId);
    if (!doc) return null;
    const snapshot: DocumentSnapshot = {
      id: crypto.randomUUID(),
      content: doc.content,
      version: doc.version,
      timestamp: new Date(),
      lastEditorId: doc.lastEditorId,
    };
    const existing = this.snapshots.get(documentId) ?? [];
    existing.push(snapshot);
    this.snapshots.set(documentId, existing);
    return snapshot;
  }

  restoreSnapshot(snapshotId: string): DocumentSnapshot | null {
    for (const [, snapshots] of this.snapshots) {
      const found = snapshots.find((s) => s.id === snapshotId);
      if (found) {
        const doc = this.documents.get(found.lastEditorId);
        if (doc) {
          doc.content = found.content;
          doc.version = found.version;
        }
        return found;
      }
    }
    return null;
  }
}
