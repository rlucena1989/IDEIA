import fs from 'node:fs';
import path from 'node:path';
import { cosineSimilarityDense, normalizeVector } from './embeddings';
import { RAG_DIR } from './vector-store';
import type { DenseVectorDoc } from './vector-store';

export interface ClusterCentroid {
  id: number;
  centroid: number[];
  docIds: string[];
}

export interface IVFIndex {
  centroids: ClusterCentroid[];
  numClusters: number;
  dimensions: number;
  model: string;
  builtAt: string;
}

const INDEX_FILE = 'ivf-index.json';
const _DEFAULT_NUM_CLUSTERS = 8;
const DEFAULT_NUM_PROBES = 3;

function getIndexPath(root: string): string {
  return path.join(root, RAG_DIR, INDEX_FILE);
}

export function getDefaultNumClusters(totalDocs: number): number {
  if (totalDocs <= 10) return 2;
  if (totalDocs <= 50) return 4;
  if (totalDocs <= 200) return 8;
  if (totalDocs <= 1000) return 16;
  return 32;
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function closestCentroid(vector: number[], centroids: ClusterCentroid[]): number {
  let bestIdx = 0;
  let bestDist = euclideanDistance(vector, centroids[0]?.centroid ?? []);
  for (let i = 1; i < centroids.length; i++) {
    const dist = euclideanDistance(vector, centroids[i]?.centroid ?? []);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function computeCentroid(docVectors: number[][]): number[] {
  if (docVectors.length === 0) return [];
  const dims = docVectors[0]?.length ?? 0;
  const sum = new Array(dims).fill(0);
  for (const vec of docVectors) {
    for (let i = 0; i < dims; i++) {
      sum[i] += vec[i];
    }
  }
  return normalizeVector(sum.map((v) => v / docVectors.length));
}

function kMeansIteration(
  docs: DenseVectorDoc[],
  centroids: ClusterCentroid[]
): { assignments: number[][]; newCentroids: ClusterCentroid[] } {
  const assignments: number[][] = Array.from({ length: centroids.length }, () => []);
  for (const doc of docs) {
    const idx = closestCentroid(doc.vector, centroids);
    assignments[idx]?.push(docs.indexOf(doc));
  }

  const newCentroids: ClusterCentroid[] = centroids.map((c, i) => {
    const memberDocs = assignments[i]?.map((docIdx) => docs[docIdx]) ?? [];
    const docVectors = memberDocs.map((d) => d.vector);
    const newCentroid = docVectors.length > 0 ? computeCentroid(docVectors) : c.centroid;
    return {
      id: c.id,
      centroid: newCentroid,
      docIds: memberDocs.map((d) => d.id),
    };
  });

  return { assignments, newCentroids };
}

export function buildIndex(
  docs: DenseVectorDoc[],
  numClusters?: number,
  maxIterations: number = 20
): IVFIndex {
  const nClusters = numClusters ?? getDefaultNumClusters(docs.length);
  const effectiveClusters = Math.min(nClusters, docs.length);

  const shuffled = [...docs].sort(() => Math.random() - 0.5);
  const initialCentroids: ClusterCentroid[] = [];
  for (let i = 0; i < effectiveClusters; i++) {
    const sample = shuffled[i % shuffled.length];
    initialCentroids.push({
      id: i,
      centroid: [...sample.vector],
      docIds: [],
    });
  }

  let centroids = initialCentroids;
  for (let iter = 0; iter < maxIterations; iter++) {
    const { newCentroids } = kMeansIteration(docs, centroids);
    let changed = false;
    for (let i = 0; i < centroids.length; i++) {
      const c = centroids[i];
      const nc = newCentroids[i];
      if (!c || !nc) break;
      const dist = euclideanDistance(c.centroid, nc.centroid);
      if (dist > 0.001) changed = true;
    }
    centroids = newCentroids;
    if (!changed) break;
  }

  const firstDoc = docs.length > 0 ? docs[0] : undefined;
  return {
    centroids,
    numClusters: effectiveClusters,
    dimensions: firstDoc?.vector.length ?? 0,
    model: firstDoc?.model ?? 'none',
    builtAt: new Date().toISOString(),
  };
}

export function searchIndex(
  queryVector: number[],
  index: IVFIndex,
  docs: DenseVectorDoc[],
  maxResults: number = 10,
  numProbes?: number
): Array<{ doc: DenseVectorDoc; score: number }> {
  if (index.centroids.length === 0) return [];
  const probes = numProbes ?? Math.min(DEFAULT_NUM_PROBES, index.centroids.length);

  const qv = normalizeVector(queryVector);
  const scoredCentroids = index.centroids
    .map((c) => ({ centroid: c, dist: euclideanDistance(qv, c.centroid) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, probes);

  const candidateIds = new Set<string>();
  for (const { centroid } of scoredCentroids) {
    for (const docId of centroid.docIds) {
      candidateIds.add(docId);
    }
  }

  const docMap = new Map<string, DenseVectorDoc>();
  for (const doc of docs) {
    docMap.set(doc.id, doc);
  }

  const results: Array<{ doc: DenseVectorDoc; score: number }> = [];
  for (const id of candidateIds) {
    const doc = docMap.get(id);
    if (!doc) continue;
    const dv = normalizeVector(doc.vector);
    const score = cosineSimilarityDense(qv, dv);
    results.push({ doc, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}

export function addToIndex(
  index: IVFIndex,
  newDocs: DenseVectorDoc[]
): void {
  const allMemberVectors: number[][][] = index.centroids.map(() => []);
  for (const doc of newDocs) {
    const idx = closestCentroid(doc.vector, index.centroids);
    index.centroids[idx]?.docIds.push(doc.id);
    allMemberVectors[idx]?.push(doc.vector);
  }
  for (let i = 0; i < index.centroids.length; i++) {
    const existingVectors = allMemberVectors[i];
    if (existingVectors && existingVectors.length > 0) {
      const memberVectors = existingVectors;
      const allVectors = [...memberVectors];
      if (allVectors.length > 0) {
        const centroid = index.centroids[i];
        if (centroid) {
          centroid.centroid = computeCentroid(allVectors);
        }
      }
    }
  }
}

export function removeFromIndex(
  index: IVFIndex,
  pathsToRemove: string[],
  docs: DenseVectorDoc[]
): void {
  const pathSet = new Set(pathsToRemove);
  const removedIds = new Set<string>();
  for (const doc of docs) {
    if (pathSet.has(doc.path)) {
      removedIds.add(doc.id);
    }
  }
  for (const centroid of index.centroids) {
    centroid.docIds = centroid.docIds.filter((id) => !removedIds.has(id));
  }
}

export function saveIndex(root: string, index: IVFIndex): void {
  const fp = getIndexPath(root);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(index, null, 2));
}

export function loadIndex(root: string): IVFIndex | null {
  const fp = getIndexPath(root);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8')) as IVFIndex;
  } catch {
    return null;
  }
}

export function getIndexStats(index: IVFIndex | null): {
  built: boolean;
  numClusters: number;
  dimensions: number;
  model: string;
  totalDocs: number;
  builtAt: string;
  avgDocsPerCluster: number;
} {
  if (!index || index.centroids.length === 0) {
    return { built: false, numClusters: 0, dimensions: 0, model: 'none', totalDocs: 0, builtAt: '', avgDocsPerCluster: 0 };
  }
  const totalDocs = index.centroids.reduce((s, c) => s + c.docIds.length, 0);
  return {
    built: true,
    numClusters: index.numClusters,
    dimensions: index.dimensions,
    model: index.model,
    totalDocs,
    builtAt: index.builtAt,
    avgDocsPerCluster: Math.round(totalDocs / index.centroids.length),
  };
}
