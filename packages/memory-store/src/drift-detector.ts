/**
 * drift-detector.ts — Embedding Drift Detection (Item 38)
 *
 * Monitora drift de embeddings ao longo do tempo.
 * Compara distância cosseno entre versões de documentos.
 * Gera alertas quando drift excede threshold.
 */

export interface DriftRecord {
  documentId: string;
  previousEmbedding: number[];
  currentEmbedding: number[];
  cosineDelta: number;
  detectedAt: string;
}

export class DriftDetector {
  private snapshots = new Map<string, number[]>();
  private driftHistory: DriftRecord[] = [];
  private threshold: number;

  constructor(threshold = 0.15) {
    this.threshold = threshold;
  }

  check(docId: string, currentEmbedding: number[]): DriftRecord | null {
    const previous = this.snapshots.get(docId);
    if (!previous) {
      this.snapshots.set(docId, currentEmbedding);
      return null;
    }

    const delta = 1 - this.cosineSimilarity(previous, currentEmbedding);
    const record: DriftRecord = {
      documentId: docId,
      previousEmbedding: previous,
      currentEmbedding,
      cosineDelta: delta,
      detectedAt: new Date().toISOString(),
    };

    if (delta > this.threshold) {
      this.driftHistory.push(record);
      this.snapshots.set(docId, currentEmbedding);
      return record;
    }

    return null;
  }

  getDriftHistory(docId?: string): DriftRecord[] {
    if (docId) return this.driftHistory.filter(d => d.documentId === docId);
    return this.driftHistory;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
