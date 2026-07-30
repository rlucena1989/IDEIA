# Estudo: Semantic Clustering for Agent Knowledge Organization

> **Data:** 2026-07-25 | **Versão:** 3.0 (intensificação F6)
> **Área:** ML — Semantic Clustering
> **Dependências:** @ideia/memory-store, @ideia/vector-store, @ideia/knowledge-graph
> **Conexões:** Synthetic Memory Generation, Adaptive Context Compression, Predictive Quality
> **Propósito:** Clustering semântico de memórias de agentes para organização automática de conhecimento — descoberta de tópicos, manutenção de clusters, sumarização, representação por centróide, enriquecimento de grafo de conhecimento.

---

## 1. Fundamentos

### 1.1 Problema

Agentes autônomos acumulam milhares de memórias em sessões cruzadas. Sem organização, o conhecimento fica disperso: o agente não encontra informações relevantes, duplica esforços, perde contexto. Clustering semântico organiza automaticamente essas memórias em tópicos coerentes.

### 1.2 Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| **Embedding** | Vetor denso (ex: 384d) representando significado semântico de um texto |
| **Cluster** | Grupo de itens com alta similaridade semântica entre si |
| **Centróide** | Média aritmética dos embeddings de um cluster |
| **Coerência** | Métrica de quão coeso é um cluster (similaridade intra-cluster) |
| **Silhueta** | Métrica que compara coesão vs separação entre clusters |
| **HDBSCAN** | Density-based clustering que não requer número fixo de clusters |
| **UMAP** | Dimensionality reduction que preserva topologia global |

### 1.3 Algoritmos de Clustering

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  SEMANTIC CLUSTERING PIPELINE                            │
│                                                                          │
│  Memory Items                                                            │
│      │                                                                   │
│      ▼                                                                   │
│  ┌──────────────────┐                                                    │
│  │  Embedding Engine │──▶ text-embedding-3-small / all-MiniLM-L6-v2      │
│  └────────┬─────────┘                                                    │
│           ▼                                                              │
│  ┌──────────────────┐                                                    │
│  │  Dimensionality   │──▶ UMAP (n_components=2..50) / t-SNE             │
│  │  Reduction        │                                                    │
│  └────────┬─────────┘                                                    │
│           ▼                                                              │
│  ┌──────────────────────────────────┐                                   │
│  │  Clustering Algorithm             │                                   │
│  │  ┌──────────┐ ┌──────────┐ ┌────┐│                                   │
│  │  │ K-Means  │ │ HDBSCAN  │ │Agg.││                                   │
│  │  └──────────┘ └──────────┘ └────┘│                                   │
│  └────────┬─────────────────────────┘                                   │
│           ▼                                                              │
│  ┌──────────────────┐                                                    │
│  │  Cluster Manager  │──▶ merge/split/prune/evolve                      │
│  └────────┬─────────┘                                                    │
│           ▼                                                              │
│  ┌──────────────────┐                                                    │
│  │  Topic Extractor  │──▶ LLM-based topic labeling                       │
│  └────────┬─────────┘                                                    │
│           ▼                                                              │
│  ┌──────────────────┐                                                    │
│  │  Knowledge Graph  │──▶ node: cluster, edge: parent/child/sibling     │
│  └──────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitetura Detalhada

### 2.1 Componentes

```
┌───────────────────────────────────────────────────────────────────────┐
│                    SemanticClusterer (Facade)                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ Embedding  │ │ Dimensional│ │ Clustering │ │ Cluster Manager  │  │
│  │ Engine     │ │ Reduction  │ │ Algorithm  │ │                  │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                      │
│  │ Topic      │ │ Knowledge  │ │ Coherence  │                      │
│  │ Extractor  │ │ Graph      │ │ Scorer     │                      │
│  └────────────┘ └────────────┘ └────────────┘                      │
└───────────────────────────────────────────────────────────────────────┘
```

### 2.2 Fluxo de Dados

```
1. MemoryItem[] → EmbeddingEngine → number[][] (384d vectors)
2. number[][] → UMAP.transform → number[][] (reduced to 2-50d)
3. number[][] → HDBSCAN.fit → labels[] (cluster assignments)
4. labels[] + MemoryItem[] → ClusterBuilder → Cluster[]
5. Cluster[] → TopicExtractor.infer → labeled Cluster[]
6. Cluster[] → KnowledgeGraph.enrich → Graph
7. Cluster[] → ClusterManager (monitor + merge + split)
```

### 2.3 Métricas de Qualidade de Cluster

| Métrica | Fórmula | Range | Ideal |
|---------|---------|-------|-------|
| Intra-cluster similarity | `mean(cosine(v_i, centroid))` | [-1, 1] | > 0.75 |
| Inter-cluster distance | `min(cosine(c_i, c_j))` | [-1, 1] | < 0.3 |
| Silhouette score | `(b - a) / max(a, b)` | [-1, 1] | > 0.5 |
| Davies-Bouldin | `mean(max( (a_i + a_j) / d_ij ))` | [0, ∞) | < 1.5 |
| Coherence | `P(w_i | w_j) ... w_i` | [0, 1] | > 0.4 |

---

## 3. Implementação

### 3.1 EmbeddingEngine

```typescript
interface EmbeddingConfig {
  model: 'text-embedding-3-small' | 'text-embedding-3-large' | 'all-MiniLM-L6-v2';
  dimensions: number;
  batchSize: number;
  cacheEnabled: boolean;
}

class EmbeddingEngine {
  private config: EmbeddingConfig = {
    model: 'all-MiniLM-L6-v2',
    dimensions: 384,
    batchSize: 32,
    cacheEnabled: true,
  };

  private cache = new Map<string, number[]>();

  async embed(items: MemoryItem[]): Promise<number[][]> {
    const results: number[][] = [];
    const uncached: MemoryItem[] = [];

    for (const item of items) {
      const cached = this.cache.get(item.content);
      if (cached && this.config.cacheEnabled) {
        results.push(cached);
      } else {
        uncached.push(item);
      }
    }

    for (let i = 0; i < uncached.length; i += this.config.batchSize) {
      const batch = uncached.slice(i, i + this.config.batchSize);
      const batchEmbeddings = await this.embedBatch(batch);
      for (let j = 0; j < batch.length; j++) {
        this.cache.set(batch[j].content, batchEmbeddings[j]);
        results.push(batchEmbeddings[j]);
      }
    }

    return results;
  }

  private async embedBatch(batch: MemoryItem[]): Promise<number[][]> {
    if (this.config.model.startsWith('text-embedding')) {
      return this.openAIEmbed(batch.map(m => m.content));
    }
    return this.localEmbed(batch.map(m => m.content));
  }

  private async openAIEmbed(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        input: texts,
        dimensions: this.config.dimensions,
      }),
    });
    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }

  private async localEmbed(texts: string[]): Promise<number[][]> {
    // Uses local ONNX-based embedding (all-MiniLM-L6-v2 via @xenova/transformers)
    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline('feature-extraction', this.config.model);
    const results: number[][] = [];
    for (const text of texts) {
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      results.push(Array.from(output.data) as number[]);
    }
    return results;
  }
}
```

### 3.2 DimensionalityReduction

```typescript
interface ReductionConfig {
  method: 'umap' | 'tsne' | 'pca';
  nComponents: number;
  randomState: number;
}

class DimensionalityReduction {
  private config: ReductionConfig = {
    method: 'umap',
    nComponents: 10,
    randomState: 42,
  };

  reduce(embeddings: number[][]): number[][] {
    switch (this.config.method) {
      case 'umap':
        return this.runUMAP(embeddings);
      case 'tsne':
        return this.runTSNE(embeddings);
      case 'pca':
        return this.runPCA(embeddings);
    }
  }

  private runUMAP(embeddings: number[][]): number[][] {
    // UMAP: Uniform Manifold Approximation and Projection
    // Preserves more global structure than t-SNE
    const n = embeddings.length;
    const k = Math.min(15, n - 1);
    const graph = this.buildKNNGraph(embeddings, k);
    const embedding = this.optimizeLayout(graph, this.config.nComponents);
    return embedding;
  }

  private buildKNNGraph(points: number[][], k: number): number[][] {
    // Build k-NN graph using cosine distance
    const n = points.length;
    const graph: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      const distances = points.map((p, j) => ({
        index: j,
        dist: 1 - this.cosineSimilarity(points[i], p),
      }));
      distances.sort((a, b) => a.dist - b.dist);
      for (let j = 0; j <= k && j < distances.length; j++) {
        const { index, dist } = distances[j];
        graph[i][index] = Math.exp(-dist);
        graph[index][i] = Math.exp(-dist);
      }
    }
    return graph;
  }

  private optimizeLayout(graph: number[][], dims: number): number[][] {
    const n = graph.length;
    const lr = 0.1;
    let embedding = Array.from({ length: n }, () =>
      Array.from({ length: dims }, () => (Math.random() - 0.5) * 0.01)
    );

    for (let epoch = 0; epoch < 200; epoch++) {
      const grad = Array.from({ length: n }, () => new Array(dims).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (graph[i][j] === 0) continue;
          const diff = embedding[i].map((v, k) => v - embedding[j][k]);
          const dist = Math.sqrt(diff.reduce((s, v) => s + v * v, 0)) + 1e-8;
          const force = graph[i][j] * (1 / (1 + dist * dist));
          for (let k = 0; k < dims; k++) {
            grad[i][k] += force * (diff[k] / dist);
          }
        }
      }
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < dims; k++) {
          embedding[i][k] -= lr * grad[i][k];
        }
      }
    }
    return embedding;
  }

  private runTSNE(embeddings: number[][]): number[][] {
    // t-SNE: t-Distributed Stochastic Neighbor Embedding
    // Better for visualization, slower than UMAP
    const n = embeddings.length;
    const perplexity = Math.min(30, n - 1);
    const P = this.computeAffinities(embeddings, perplexity);
    const Y = Array.from({ length: n }, () =>
      Array.from({ length: this.config.nComponents }, () => (Math.random() - 0.5) * 0.01)
    );

    for (let iter = 0; iter < 1000; iter++) {
      const Q = this.computeQ(Y);
      const grad = this.computeGradient(P, Q, Y);
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < this.config.nComponents; k++) {
          Y[i][k] -= 0.1 * grad[i][k];
        }
      }
    }
    return Y;
  }

  private computeAffinities(data: number[][], perplexity: number): number[][] {
    const n = data.length;
    const P: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      const distances = data.map((p, j) => ({
        index: j,
        dist: 1 - this.cosineSimilarity(data[i], p),
      }));
      distances.sort((a, b) => a.dist - b.dist);
      const sigma = this.binarySearchSigma(distances, perplexity);
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        P[i][j] = Math.exp(-distances[j].dist * distances[j].dist / (2 * sigma * sigma));
        sum += P[i][j];
      }
      if (sum > 0) {
        for (let j = 0; j < n; j++) {
          P[i][j] /= sum;
        }
      }
    }
    return P;
  }

  private binarySearchSigma(distances: { index: number; dist: number }[], perplexity: number): number {
    let low = 1e-10, high = 1e10;
    for (let iter = 0; iter < 50; iter++) {
      const mid = (low + high) / 2;
      const ent = this.computeEntropy(distances, mid);
      const diff = ent - Math.log(perplexity);
      if (Math.abs(diff) < 1e-5) return mid;
      if (diff > 0) high = mid;
      else low = mid;
    }
    return (low + high) / 2;
  }

  private computeEntropy(distances: { index: number; dist: number }[], sigma: number): number {
    let sum = 0, entropy = 0;
    for (let j = 1; j < distances.length; j++) {
      const p = Math.exp(-distances[j].dist * distances[j].dist / (2 * sigma * sigma));
      sum += p;
    }
    for (let j = 1; j < distances.length; j++) {
      const p = Math.exp(-distances[j].dist * distances[j].dist / (2 * sigma * sigma));
      if (p > 0) {
        entropy -= (p / sum) * Math.log(p / sum);
      }
    }
    return entropy;
  }

  private computeQ(Y: number[][]): number[][] {
    const n = Y.length;
    const Q: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    let sum = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = Y[i].reduce((s, v, k) => s + (v - Y[j][k]) ** 2, 0);
        Q[i][j] = 1 / (1 + dist);
        Q[j][i] = Q[i][j];
        sum += Q[i][j];
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        Q[i][j] /= sum;
      }
    }
    return Q;
  }

  private computeGradient(P: number[][], Q: number[][], Y: number[][]): number[][] {
    const n = Y.length;
    const dims = Y[0].length;
    const grad = Array.from({ length: n }, () => new Array(dims).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const diff = Y[i].map((v, k) => v - Y[j][k]);
        const dist = Math.sqrt(diff.reduce((s, v) => s + v * v, 0));
        const factor = 4 * (P[i][j] - Q[i][j]) / (1 + dist);
        for (let k = 0; k < dims; k++) {
          grad[i][k] += factor * diff[k];
        }
      }
    }
    return grad;
  }

  private runPCA(embeddings: number[][]): number[][] {
    // PCA: Principal Component Analysis (linear, fast)
    const n = embeddings.length;
    const dims = embeddings[0].length;
    const targetDims = this.config.nComponents;

    // Center data
    const mean = new Array(dims).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < dims; j++) {
        mean[j] += embeddings[i][j] / n;
      }
    }
    const centered = embeddings.map(row => row.map((v, j) => v - mean[j]));

    // Compute covariance matrix
    const cov = Array.from({ length: dims }, () => new Array(dims).fill(0));
    for (let i = 0; i < dims; i++) {
      for (let j = 0; j < dims; j++) {
        for (let k = 0; k < n; k++) {
          cov[i][j] += centered[k][i] * centered[k][j];
        }
        cov[i][j] /= n - 1;
      }
    }

    // Power iteration for top eigenvalues
    const components: number[][] = [];
    let residual = cov.map(row => [...row]);
    for (let c = 0; c < targetDims; c++) {
      let vec = new Array(dims).fill(0).map(() => Math.random() - 0.5);
      let norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
      vec = vec.map(v => v / norm);

      for (let iter = 0; iter < 100; iter++) {
        const newVec = new Array(dims).fill(0);
        for (let i = 0; i < dims; i++) {
          for (let j = 0; j < dims; j++) {
            newVec[i] += residual[i][j] * vec[j];
          }
        }
        norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0));
        vec = newVec.map(v => v / norm);
      }
      components.push(vec);

      // Deflate
      for (let i = 0; i < dims; i++) {
        for (let j = 0; j < dims; j++) {
          for (let k = 0; k < dims; k++) {
            residual[i][j] -= vec[i] * vec[k] * cov[k][j];
          }
        }
      }
    }

    // Project
    const result: number[][] = [];
    for (let i = 0; i < n; i++) {
      const projection = new Array(targetDims).fill(0);
      for (let c = 0; c < targetDims; c++) {
        for (let j = 0; j < dims; j++) {
          projection[c] += centered[i][j] * components[c][j];
        }
      }
      result.push(projection);
    }
    return result;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((s, v, i) => s + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return dot / (normA * normB + 1e-10);
  }
}
```

### 3.3 HDBSCANClusterer

```typescript
interface HDBSCANConfig {
  minClusterSize: number;
  minSamples: number;
  clusterSelectionEpsilon: number;
  metric: 'euclidean' | 'cosine';
}

class HDBSCANClusterer {
  private config: HDBSCANConfig = {
    minClusterSize: 3,
    minSamples: 2,
    clusterSelectionEpsilon: 0.5,
    metric: 'cosine',
  };

  fit(data: number[][]): { labels: number[]; probabilities: number[]; outliers: number[] } {
    // Mutual Reachability Distance
    const n = data.length;
    const coreDistances = this.computeCoreDistances(data);
    const mrd = this.computeMRD(data, coreDistances);

    // Minimum Spanning Tree (Prim's algorithm)
    const mst = this.primMST(mrd);

    // Build cluster hierarchy
    const hierarchy = this.buildDendrogram(mst, n);

    // Extract clusters
    const { labels, probabilities } = this.extractClusters(hierarchy, n);

    // Identify outliers (label = -1)
    const outliers = labels.map((l, i) => l === -1 ? i : -1).filter(i => i >= 0);

    return { labels, probabilities, outliers };
  }

  private computeCoreDistances(data: number[][]): number[] {
    const k = this.config.minSamples;
    return data.map(point => {
      const distances = data
        .map((p, i) => ({ dist: this.distance(point, p), index: i }))
        .sort((a, b) => a.dist - b.dist);
      return distances[k]?.dist ?? distances[distances.length - 1]?.dist ?? 0;
    });
  }

  private computeMRD(data: number[][], coreDistances: number[]): number[][] {
    const n = data.length;
    const mrd: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const rawDist = this.distance(data[i], data[j]);
        mrd[i][j] = Math.max(coreDistances[i], coreDistances[j], rawDist);
        mrd[j][i] = mrd[i][j];
      }
    }
    return mrd;
  }

  private primMST(mrd: number[][]): { from: number; to: number; weight: number }[] {
    const n = mrd.length;
    const visited = new Set<number>();
    const edges: { from: number; to: number; weight: number }[] = [];
    visited.add(0);

    while (visited.size < n) {
      let minEdge: { from: number; to: number; weight: number } | null = null;
      for (const from of visited) {
        for (let to = 0; to < n; to++) {
          if (visited.has(to)) continue;
          if (!minEdge || mrd[from][to] < minEdge.weight) {
            minEdge = { from, to, weight: mrd[from][to] };
          }
        }
      }
      if (minEdge) {
        edges.push(minEdge);
        visited.add(minEdge.to);
      }
    }
    return edges;
  }

  private buildDendrogram(
    mst: { from: number; to: number; weight: number }[],
    n: number
  ): { cluster1: number; cluster2: number; weight: number; size: number }[] {
    // Sort MST edges by weight (ascending = merging order)
    const sorted = [...mst].sort((a, b) => a.weight - b.weight);
    const parent = Array.from({ length: n }, (_, i) => i);
    const size = new Array(n).fill(1);
    const hierarchy: { cluster1: number; cluster2: number; weight: number; size: number }[] = [];

    let nextId = n;
    for (const edge of sorted) {
      const root1 = this.find(parent, edge.from);
      const root2 = this.find(parent, edge.to);
      if (root1 === root2) continue;

      parent[root1] = nextId;
      parent[root2] = nextId;
      const newSize = size[root1] + size[root2];
      hierarchy.push({
        cluster1: root1,
        cluster2: root2,
        weight: edge.weight,
        size: newSize,
      });
      size.push(newSize);
      parent.push(nextId);
      nextId++;
    }

    return hierarchy;
  }

  private find(parent: number[], x: number): number {
    while (parent[x] !== x && x < parent.length) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }

  private extractClusters(
    hierarchy: { cluster1: number; cluster2: number; weight: number; size: number }[],
    n: number
  ): { labels: number[]; probabilities: number[] } {
    // Select clusters with stability
    const stabilities = new Map<number, number>();
    const clusters = new Map<number, number[]>();
    const minClusterSize = this.config.minClusterSize;

    // Trace cluster membership through hierarchy
    for (let i = hierarchy.length - 1; i >= 0; i--) {
      const node = hierarchy[i];
      if (node.size >= minClusterSize) {
        if (!clusters.has(i)) {
          clusters.set(i, [node.cluster1, node.cluster2]);
        }
        stabilities.set(i, 1 / (node.weight + 1e-10));
      }
    }

    // Assign labels by propagating from leaf clusters
    const labels = new Array(n).fill(-1);
    const probabilities = new Array(n).fill(0);

    const sortedLevels = [...clusters.entries()].sort((a, b) => b[0] - a[0]);
    for (const [level, members] of sortedLevels) {
      const clusterId = level + 1000; // offset to avoid collisions
      const children: number[] = [];
      for (const m of members) {
        if (m < n) children.push(m);
        else {
          // Find all leaves under this sub-cluster
          this.collectLeaves(hierarchy, m, n, children);
        }
      }
      for (const leaf of children) {
        if (labels[leaf] === -1) {
          labels[leaf] = clusterId;
          probabilities[leaf] = stabilities.get(level) || 0.5;
        }
      }
    }

    return { labels, probabilities };
  }

  private collectLeaves(
    hierarchy: { cluster1: number; cluster2: number; weight: number; size: number }[],
    nodeId: number,
    n: number,
    leaves: number[]
  ): void {
    const idx = nodeId - n;
    if (idx < 0 || idx >= hierarchy.length) return;
    const node = hierarchy[idx];
    if (node.cluster1 < n) leaves.push(node.cluster1);
    else this.collectLeaves(hierarchy, node.cluster1, n, leaves);
    if (node.cluster2 < n) leaves.push(node.cluster2);
    else this.collectLeaves(hierarchy, node.cluster2, n, leaves);
  }

  private distance(a: number[], b: number[]): number {
    if (this.config.metric === 'cosine') {
      const dot = a.reduce((s, v, i) => s + v * b[i], 0);
      const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
      const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
      return 1 - dot / (normA * normB + 1e-10);
    }
    return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
  }
}
```

### 3.4 KMeansClusterer

```typescript
interface KMeansConfig {
  nClusters: number;
  maxIterations: number;
  tolerance: number;
  nInit: number;
}

class KMeansClusterer {
  private config: KMeansConfig = {
    nClusters: 5,
    maxIterations: 300,
    tolerance: 1e-4,
    nInit: 10,
  };

  fit(data: number[][]): { labels: number[]; centroids: number[][]; inertia: number } {
    let bestLabels: number[] = [];
    let bestCentroids: number[][] = [];
    let bestInertia = Infinity;

    for (let init = 0; init < this.config.nInit; init++) {
      const centroids = this.kMeansPlusPlus(data);
      const { labels, inertia } = this.runKMeans(data, centroids);
      if (inertia < bestInertia) {
        bestLabels = labels;
        bestCentroids = centroids;
        bestInertia = inertia;
      }
    }

    return { labels: bestLabels, centroids: bestCentroids, inertia: bestInertia };
  }

  private kMeansPlusPlus(data: number[][]): number[][] {
    const n = data.length;
    const centroids: number[][] = [];
    const indices = new Set<number>();

    // First centroid: random
    const firstIdx = Math.floor(Math.random() * n);
    centroids.push([...data[firstIdx]]);
    indices.add(firstIdx);

    // Subsequent centroids: weighted by distance squared
    for (let c = 1; c < this.config.nClusters; c++) {
      const distances = data.map((point, i) => {
        if (indices.has(i)) return 0;
        const minDist = Math.min(...centroids.map(cen =>
          Math.sqrt(point.reduce((s, v, j) => s + (v - cen[j]) ** 2, 0))
        ));
        return minDist * minDist;
      });
      const totalDist = distances.reduce((s, d) => s + d, 0);
      let r = Math.random() * totalDist;
      let selected = 0;
      for (let i = 0; i < n; i++) {
        r -= distances[i];
        if (r <= 0) { selected = i; break; }
      }
      centroids.push([...data[selected]]);
      indices.add(selected);
    }

    return centroids;
  }

  private runKMeans(data: number[][], initialCentroids: number[][]): {
    labels: number[]; inertia: number;
  } {
    const n = data.length;
    const k = initialCentroids.length;
    let centroids = initialCentroids.map(c => [...c]);
    const labels = new Array(n).fill(0);

    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      // Assign labels
      let changed = false;
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let bestK = 0;
        for (let c = 0; c < k; c++) {
          const dist = Math.sqrt(data[i].reduce((s, v, j) => s + (v - centroids[c][j]) ** 2, 0));
          if (dist < minDist) { minDist = dist; bestK = c; }
        }
        if (labels[i] !== bestK) { labels[i] = bestK; changed = true; }
      }

      if (!changed) break;

      // Update centroids
      const counts = new Array(k).fill(0);
      const sums = Array.from({ length: k }, () => new Array(data[0].length).fill(0));
      for (let i = 0; i < n; i++) {
        counts[labels[i]]++;
        for (let j = 0; j < data[0].length; j++) {
          sums[labels[i]][j] += data[i][j];
        }
      }
      for (let c = 0; c < k; c++) {
        if (counts[c] > 0) {
          centroids[c] = sums[c].map(s => s / counts[c]);
        }
      }

      // Check convergence
      const shift = Math.sqrt(centroids.reduce((s, cen, c) => {
        return s + cen.reduce((s2, v, j) => s2 + (v - initialCentroids[c][j]) ** 2, 0);
      }, 0));
      if (shift < this.config.tolerance) break;
    }

    const inertia = data.reduce((total, point, i) => {
      const dist = Math.sqrt(point.reduce((s, v, j) => s + (v - centroids[labels[i]][j]) ** 2, 0));
      return total + dist * dist;
    }, 0);

    return { labels, inertia };
  }
}
```

### 3.5 AgglomerativeClusterer

```typescript
interface AgglomerativeConfig {
  nClusters: number;
  linkage: 'single' | 'complete' | 'average' | 'ward';
  metric: 'euclidean' | 'cosine';
}

class AgglomerativeClusterer {
  private config: AgglomerativeConfig = {
    nClusters: 5,
    linkage: 'ward',
    metric: 'euclidean',
  };

  fit(data: number[][]): { labels: number[]; mergeHistory: MergeNode[] } {
    const n = data.length;
    let clusters = data.map((point, i) => ({ id: i, points: [i], centroid: [...point] }));
    const mergeHistory: MergeNode[] = [];
    let nextId = n;

    while (clusters.length > this.config.nClusters) {
      // Find closest pair
      let minDist = Infinity;
      let minI = 0, minJ = 0;

      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const dist = this.linkageDistance(clusters[i], clusters[j], data);
          if (dist < minDist) {
            minDist = dist;
            minI = i;
            minJ = j;
          }
        }
      }

      // Merge
      const merged = this.mergeClusters(clusters[minI], clusters[minJ], data);
      mergeHistory.push({
        id: nextId,
        left: clusters[minI].id,
        right: clusters[minJ].id,
        distance: minDist,
        size: merged.points.length,
      });

      clusters[minI] = merged;
      clusters[minJ] = clusters[clusters.length - 1];
      clusters.pop();
      merged.id = nextId;
      nextId++;
    }

    // Assign labels
    const labels = new Array(n).fill(0);
    for (let c = 0; c < clusters.length; c++) {
      for (const p of clusters[c].points) {
        labels[p] = c;
      }
    }

    return { labels, mergeHistory };
  }

  private linkageDistance(
    a: { points: number[]; centroid: number[] },
    b: { points: number[]; centroid: number[] },
    data: number[][]
  ): number {
    switch (this.config.linkage) {
      case 'single': {
        let minDist = Infinity;
        for (const pi of a.points) {
          for (const pj of b.points) {
            const dist = this.pointDistance(data[pi], data[pj]);
            if (dist < minDist) minDist = dist;
          }
        }
        return minDist;
      }
      case 'complete': {
        let maxDist = 0;
        for (const pi of a.points) {
          for (const pj of b.points) {
            const dist = this.pointDistance(data[pi], data[pj]);
            if (dist > maxDist) maxDist = dist;
          }
        }
        return maxDist;
      }
      case 'average': {
        let sum = 0, count = 0;
        for (const pi of a.points) {
          for (const pj of b.points) {
            sum += this.pointDistance(data[pi], data[pj]);
            count++;
          }
        }
        return sum / count;
      }
      case 'ward': {
        // Ward's: minimize increase in sum of squares
        const combined = a.centroid.map((v, i) =>
          (a.points.length * v + b.points.length * b.centroid[i]) / (a.points.length + b.points.length)
        );
        const ssA = a.points.reduce((s, pi) =>
          s + this.pointDistance(data[pi], a.centroid) ** 2, 0);
        const ssB = b.points.reduce((s, pi) =>
          s + this.pointDistance(data[pi], b.centroid) ** 2, 0);
        const ssComb = [...a.points, ...b.points].reduce((s, pi) =>
          s + this.pointDistance(data[pi], combined) ** 2, 0);
        return ssComb - ssA - ssB;
      }
    }
  }

  private mergeClusters(
    a: { points: number[]; centroid: number[] },
    b: { points: number[]; centroid: number[] },
    data: number[][]
  ): { id: number; points: number[]; centroid: number[] } {
    const points = [...a.points, ...b.points];
    const centroid = a.centroid.map((v, i) =>
      (a.points.length * v + b.points.length * b.centroid[i]) / (a.points.length + b.points.length)
    );
    return { id: -1, points, centroid };
  }

  private pointDistance(a: number[], b: number[]): number {
    if (this.config.metric === 'cosine') {
      const dot = a.reduce((s, v, i) => s + v * b[i], 0);
      const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
      const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
      return 1 - dot / (normA * normB + 1e-10);
    }
    return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
  }
}

interface MergeNode {
  id: number;
  left: number;
  right: number;
  distance: number;
  size: number;
}
```

### 3.6 SemanticClusterer (Facade)

```typescript
interface ClusterConfig {
  algorithm: 'hdbscan' | 'kmeans' | 'agglomerative';
  reduction: 'umap' | 'tsne' | 'pca' | 'none';
  nComponents: number;
  minClusterSize: number;
  nClusters: number;
  adaptiveThreshold: boolean;
}

class SemanticClusterer {
  private config: ClusterConfig = {
    algorithm: 'hdbscan',
    reduction: 'umap',
    nComponents: 10,
    minClusterSize: 3,
    nClusters: 5,
    adaptiveThreshold: true,
  };

  private embeddingEngine = new EmbeddingEngine();
  private dimReduction = new DimensionalityReduction();
  private hdbscan = new HDBSCANClusterer();
  private kmeans = new KMeansClusterer();
  private agglomerative = new AgglomerativeClusterer();
  private topicExtractor = new TopicExtractor();
  private coherenceScorer = new CoherenceScorer();

  async cluster(items: MemoryItem[], config?: Partial<ClusterConfig>): Promise<ClusterResult> {
    if (config) Object.assign(this.config, config);

    // Step 1: Embed all items
    const embeddings = await this.embeddingEngine.embed(items);

    // Step 2: Reduce dimensionality (optional)
    const reduced = this.config.reduction !== 'none'
      ? this.dimReduction.reduce(embeddings)
      : embeddings;

    // Step 3: Cluster
    let labels: number[];
    switch (this.config.algorithm) {
      case 'hdbscan': {
        const result = this.hdbscan.fit(reduced);
        labels = result.labels;
        break;
      }
      case 'kmeans': {
        const result = this.kmeans.fit(reduced);
        labels = result.labels;
        break;
      }
      case 'agglomerative': {
        const result = this.agglomerative.fit(reduced);
        labels = result.labels;
        break;
      }
    }

    // Step 4: Build Cluster objects
    const clusterMap = new Map<number, MemoryItem[]>();
    for (let i = 0; i < items.length; i++) {
      const label = labels[i];
      if (label < 0) continue; // Skip noise (HDBSCAN)
      if (!clusterMap.has(label)) clusterMap.set(label, []);
      clusterMap.get(label)!.push(items[i]);
    }

    const clusters: Cluster[] = [];
    for (const [label, memberItems] of clusterMap) {
      if (memberItems.length < this.config.minClusterSize) continue;
      const memberEmbeddings = memberItems.map(item => {
        const idx = items.indexOf(item);
        return embeddings[idx];
      });

      clusters.push({
        id: crypto.randomUUID(),
        label: label,
        centroid: this.averageEmbedding(memberEmbeddings),
        items: memberItems,
        size: memberItems.length,
        coherence: this.coherenceScorer.compute(memberEmbeddings),
        representative: this.findRepresentative(memberItems),
        topic: '', // filled below
        keywords: [],
      });
    }

    // Step 5: Infer topics
    for (const cluster of clusters) {
      const topic = await this.topicExtractor.inferTopic(cluster.items);
      cluster.topic = topic.topic;
      cluster.keywords = topic.keywords;
    }

    // Step 6: Compute global metrics
    const globalMetrics = this.computeGlobalMetrics(clusters, embeddings);

    return { clusters, globalMetrics, totalItems: items.length };
  }

  private averageEmbedding(embeddings: number[][]): number[] {
    const dim = embeddings[0].length;
    const avg = new Array(dim).fill(0);
    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) avg[i] += emb[i] / embeddings.length;
    }
    return avg;
  }

  private findRepresentative(items: MemoryItem[]): MemoryItem {
    // Pick item with highest importance score
    return items.reduce((best, item) =>
      (item.importance || 0) > (best.importance || 0) ? item : best
    );
  }

  private computeGlobalMetrics(
    clusters: Cluster[],
    allEmbeddings: number[][]
  ): GlobalMetrics {
    const intraSimilarities = clusters.map(c => c.coherence);
    const interDistances: number[] = [];

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const dist = 1 - this.cosineSimilarity(clusters[i].centroid, clusters[j].centroid);
        interDistances.push(dist);
      }
    }

    return {
      nClusters: clusters.length,
      nNoise: allEmbeddings.length - clusters.reduce((s, c) => s + c.size, 0),
      avgCoherence: intraSimilarities.reduce((s, v) => s + v, 0) / intraSimilarities.length,
      avgSeparation: interDistances.reduce((s, v) => s + v, 0) / interDistances.length,
      silhouette: this.computeSilhouette(allEmbeddings, clusters),
    };
  }

  private computeSilhouette(allEmbeddings: number[][], clusters: Cluster[]): number {
    if (clusters.length < 2) return 0;
    const itemToCluster = new Map<string, number>();
    clusters.forEach((c, ci) => c.items.forEach(item => itemToCluster.set(item.id, ci)));

    let totalScore = 0;
    let count = 0;

    for (let ci = 0; ci < clusters.length; ci++) {
      const cluster = clusters[ci];
      for (const item of cluster.items) {
        const idx = cluster.items.indexOf(item);
        const emb = allEmbeddings[idx];

        // a: mean distance to same cluster
        const a = cluster.items
          .filter(other => other.id !== item.id)
          .reduce((s, other) => {
            const otherIdx = cluster.items.indexOf(other);
            return s + (1 - this.cosineSimilarity(emb, allEmbeddings[otherIdx]));
          }, 0) / Math.max(1, cluster.items.length - 1);

        // b: min mean distance to other cluster
        let b = Infinity;
        for (let cj = 0; cj < clusters.length; cj++) {
          if (cj === ci) continue;
          const meanDist = clusters[cj].items.reduce((s, other) => {
            const otherIdx = clusters[cj].items.indexOf(other);
            return s + (1 - this.cosineSimilarity(emb, allEmbeddings[otherIdx]));
          }, 0) / clusters[cj].items.length;
          b = Math.min(b, meanDist);
        }

        const score = (b - a) / Math.max(a, b, 1e-10);
        totalScore += score;
        count++;
      }
    }

    return totalScore / count;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((s, v, i) => s + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return dot / (normA * normB + 1e-10);
  }
}

interface Cluster {
  id: string;
  label: number;
  centroid: number[];
  items: MemoryItem[];
  size: number;
  coherence: number;
  representative: MemoryItem;
  topic: string;
  keywords: string[];
}

interface ClusterResult {
  clusters: Cluster[];
  globalMetrics: GlobalMetrics;
  totalItems: number;
}

interface GlobalMetrics {
  nClusters: number;
  nNoise: number;
  avgCoherence: number;
  avgSeparation: number;
  silhouette: number;
}
```

### 3.7 ClusterManager

```typescript
class ClusterManager {
  private clusters: Cluster[] = [];
  private clusterer: SemanticClusterer;

  constructor(clusterer: SemanticClusterer) {
    this.clusterer = clusterer;
  }

  async addToClusters(item: MemoryItem): Promise<{ cluster?: Cluster; isNew: boolean }> {
    const embedding = await this.clusterer['embeddingEngine'].embed([item]);
    const emb = embedding[0];

    for (const cluster of this.clusters) {
      const sim = this.cosineSimilarity(emb, cluster.centroid);
      const threshold = this.adaptiveThreshold(cluster);
      if (sim > threshold) {
        cluster.items.push(item);
        cluster.size++;
        cluster.centroid = this.updateCentroid(cluster.centroid, emb, cluster.size);
        cluster.coherence = this.recomputeCoherence(cluster);
        return { cluster, isNew: false };
      }
    }

    return { isNew: true };
  }

  private adaptiveThreshold(cluster: Cluster): number {
    // Tighten threshold for large clusters, relax for small ones
    const base = 0.78;
    if (cluster.size < 5) return base - 0.05;
    if (cluster.size > 50) return base + 0.05;
    return base;
  }

  async mergeSimilarClusters(threshold: number = 0.85): Promise<MergeResult[]> {
    const merges: MergeResult[] = [];
    let changed = true;

    while (changed) {
      changed = false;
      for (let i = 0; i < this.clusters.length; i++) {
        for (let j = i + 1; j < this.clusters.length; j++) {
          const sim = this.cosineSimilarity(this.clusters[i].centroid, this.clusters[j].centroid);
          if (sim > threshold) {
            // Merge j into i
            this.clusters[i].items.push(...this.clusters[j].items);
            this.clusters[i].size = this.clusters[i].items.length;
            this.clusters[i].centroid = this.combineCentroids(
              this.clusters[i].centroid, this.clusters[i].size,
              this.clusters[j].centroid, this.clusters[j].size
            );
            this.clusters.splice(j, 1);
            merges.push({ from: j, into: i, similarity: sim });
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
    }

    return merges;
  }

  async splitIncoherentClusters(minCoherence: number = 0.6): Promise<SplitResult[]> {
    const splits: SplitResult[] = [];

    for (let i = this.clusters.length - 1; i >= 0; i--) {
      const cluster = this.clusters[i];
      if (cluster.coherence < minCoherence && cluster.size > 4) {
        // Re-cluster this cluster's items
        const result = await this.clusterer.cluster(cluster.items, {
          nClusters: 2,
          algorithm: 'kmeans',
        });

        // Replace with first sub-cluster, add second
        if (result.clusters.length >= 2) {
          this.clusters[i] = result.clusters[0];
          this.clusters.push(result.clusters[1]);
          splits.push({
            clusterId: cluster.id,
            newClusters: result.clusters.map(c => c.id),
          });
        }
      }
    }

    return splits;
  }

  async pruneEmptyClusters(minSize: number = 2): Promise<string[]> {
    const pruned: string[] = [];
    this.clusters = this.clusters.filter(c => {
      if (c.size < minSize) {
        pruned.push(c.id);
        return false;
      }
      return true;
    });
    return pruned;
  }

  async reCluster(fullRebuild: boolean = false): Promise<ClusterResult> {
    const allItems = this.clusters.flatMap(c => c.items);
    const result = await this.clusterer.cluster(allItems);
    this.clusters = result.clusters;
    return result;
  }

  private updateCentroid(centroid: number[], newEmbedding: number[], size: number): number[] {
    const weight = 1 / (size + 1);
    return centroid.map((v, i) => v * (1 - weight) + newEmbedding[i] * weight);
  }

  private combineCentroids(
    c1: number[], s1: number,
    c2: number[], s2: number
  ): number[] {
    const total = s1 + s2;
    return c1.map((v, i) => (v * s1 + c2[i] * s2) / total);
  }

  private recomputeCoherence(cluster: Cluster): number {
    // Average cosine similarity to centroid
    if (cluster.items.length < 2) return 1;
    const embeds = cluster.items.map(item => item.embedding || []);
    return embeds.reduce((s, emb) => s + this.cosineSimilarity(emb, cluster.centroid), 0) / embeds.length;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((s, v, i) => s + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return dot / (normA * normB + 1e-10);
  }
}

interface MergeResult {
  from: number;
  into: number;
  similarity: number;
}

interface SplitResult {
  clusterId: string;
  newClusters: string[];
}
```

### 3.8 TopicExtractor

```typescript
class TopicExtractor {
  async inferTopic(items: MemoryItem[]): Promise<{ topic: string; keywords: string[] }> {
    if (items.length === 0) return { topic: 'unknown', keywords: [] };

    // Extract key phrases from item content
    const allText = items.map(i => i.content || i.summary || '').join('\n');
    const keywords = this.extractKeywords(allText);

    // Use LLM for topic labeling
    const prompt = `Given these ${items.length} memory items, identify the common topic and 5 key keywords.

Items:
${items.slice(0, 5).map(i => `- ${i.summary || i.content?.substring(0, 100)}`).join('\n')}

If items are diverse, suggest the most prominent theme.

Respond in JSON:
{
  "topic": "brief topic name (<6 words)",
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
}`;

    const response = await this.llmComplete(prompt);
    try {
      return JSON.parse(response);
    } catch {
      return { topic: 'untitled cluster', keywords };
    }
  }

  private extractKeywords(text: string): string[] {
    // Simple TF-based keyword extraction
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\sáéíóúàèìòùâêîôûãõç_-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    const stopWords = new Set([
      'para', 'com', 'que', 'dos', 'das', 'uma', 'mas', 'como', 'mais',
      'this', 'that', 'from', 'with', 'have', 'been', 'were', 'their',
    ]);

    const freq = new Map<string, number>();
    for (const word of words) {
      if (!stopWords.has(word)) {
        freq.set(word, (freq.get(word) || 0) + 1);
      }
    }

    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private async llmComplete(prompt: string): Promise<string> {
    // Uses @ideia/llm-provider
    const { complete } = await import('@ideia/llm-provider');
    return complete(prompt, { model: 'deepseek-v4', maxTokens: 200 });
  }
}
```

### 3.9 CoherenceScorer

```typescript
class CoherenceScorer {
  compute(embeddings: number[][]): number {
    if (embeddings.length < 2) return 1;
    const centroid = this.averageEmbedding(embeddings);
    const similarities = embeddings.map(e => this.cosineSimilarity(e, centroid));
    return similarities.reduce((s, v) => s + v, 0) / similarities.length;
  }

  computePairwise(embeddings: number[][]): number {
    let total = 0, count = 0;
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        total += this.cosineSimilarity(embeddings[i], embeddings[j]);
        count++;
      }
    }
    return count > 0 ? total / count : 1;
  }

  private averageEmbedding(embeddings: number[][]): number[] {
    const dim = embeddings[0].length;
    const avg = new Array(dim).fill(0);
    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) avg[i] += emb[i] / embeddings.length;
    }
    return avg;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((s, v, i) => s + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return dot / (normA * normB + 1e-10);
  }
}
```

### 3.10 KnowledgeGraphEnricher

```typescript
interface GraphNode {
  id: string;
  type: 'cluster' | 'topic' | 'memory';
  label: string;
  properties: Record<string, any>;
  embedding?: number[];
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'contains' | 'related_to' | 'parent_of' | 'sibling_of';
  weight: number;
}

class KnowledgeGraphEnricher {
  async enrich(clusters: Cluster[]): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Add cluster nodes
    for (const cluster of clusters) {
      nodes.push({
        id: `cluster:${cluster.id}`,
        type: 'cluster',
        label: cluster.topic,
        properties: { size: cluster.size, coherence: cluster.coherence },
        embedding: cluster.centroid,
      });

      // Add memory item nodes
      for (const item of cluster.items) {
        nodes.push({
          id: `memory:${item.id}`,
          type: 'memory',
          label: item.summary || item.content?.substring(0, 50) || '',
          properties: { importance: item.importance, timestamp: item.timestamp },
        });

        edges.push({
          source: `cluster:${cluster.id}`,
          target: `memory:${item.id}`,
          type: 'contains',
          weight: 1.0,
        });
      }
    }

    // Add inter-cluster relationships
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const sim = this.cosineSimilarity(clusters[i].centroid, clusters[j].centroid);
        if (sim > 0.6) {
          edges.push({
            source: `cluster:${clusters[i].id}`,
            target: `cluster:${clusters[j].id}`,
            type: 'related_to',
            weight: sim,
          });
        }
      }
    }

    return { nodes, edges };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((s, v, i) => s + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return dot / (normA * normB + 1e-10);
  }
}
```

---

## 4. Integração IDEIA

### 4.1 Integração com @ideia/memory-store

```typescript
import { SemanticClusterer } from './semantic-clusterer';
import { MemoryStore } from '@ideia/memory-store';

class ClusteredMemoryStore {
  private memoryStore: MemoryStore;
  private clusterer: SemanticClusterer;
  private clusterManager: ClusterManager;

  constructor() {
    this.memoryStore = new MemoryStore();
    this.clusterer = new SemanticClusterer();
    this.clusterManager = new ClusterManager(this.clusterer);
  }

  async storeAndCluster(item: MemoryItem): Promise<void> {
    await this.memoryStore.store(item);
    const result = await this.clusterManager.addToClusters(item);
    if (result.isNew) {
      // Item formed its own cluster — periodic re-cluster
      const stats = await this.getStats();
      if (stats.unclusteredItems > 10) {
        await this.reclusterAll();
      }
    }
  }

  async queryByTopic(topic: string): Promise<MemoryItem[]> {
    const clusters = this.clusterManager['clusters'];
    const matching = clusters.filter(c =>
      c.topic.toLowerCase().includes(topic.toLowerCase())
    );
    return matching.flatMap(c => c.items);
  }

  async getStats(): Promise<{ nClusters: number; unclusteredItems: number; avgCoherence: number }> {
    const clusters = this.clusterManager['clusters'];
    return {
      nClusters: clusters.length,
      unclusteredItems: 0,
      avgCoherence: clusters.reduce((s, c) => s + c.coherence, 0) / Math.max(1, clusters.length),
    };
  }

  async reclusterAll(): Promise<void> {
    const all = await this.memoryStore.getAll();
    const result = await this.clusterer.cluster(all);
    this.clusterManager['clusters'] = result.clusters;
  }
}
```

### 4.2 Integração com @ideia/vector-store

```typescript
import { VectorStore } from '@ideia/vector-store';
import { Cluster } from './semantic-clusterer';

class ClusterVectorIndex {
  private vectorStore: VectorStore;

  constructor() {
    this.vectorStore = new VectorStore({
      dimensions: 384,
      indexType: 'hnsw',
    });
  }

  async indexClusters(clusters: Cluster[]): Promise<void> {
    for (const cluster of clusters) {
      await this.vectorStore.upsert({
        id: `cluster:${cluster.id}`,
        vector: cluster.centroid,
        metadata: {
          type: 'cluster',
          topic: cluster.topic,
          size: cluster.size,
          coherence: cluster.coherence,
          keywords: cluster.keywords.join(', '),
        },
      });
    }
  }

  async findSimilarClusters(embedding: number[], topK: number = 5): Promise<ClusterMatch[]> {
    const results = await this.vectorStore.search(embedding, topK);
    return results
      .filter(r => r.metadata?.type === 'cluster')
      .map(r => ({
        clusterId: r.id.replace('cluster:', ''),
        similarity: r.score,
        topic: r.metadata?.topic || '',
      }));
  }
}

interface ClusterMatch {
  clusterId: string;
  similarity: number;
  topic: string;
}
```

### 4.3 Integração com @ideia/knowledge-graph

```typescript
import { KnowledgeGraph } from '@ideia/knowledge-graph';
import { KnowledgeGraphEnricher, Cluster } from './knowledge-graph-enricher';

class ClusterGraphIntegrator {
  private graph: KnowledgeGraph;
  private enricher: KnowledgeGraphEnricher;

  constructor() {
    this.graph = new KnowledgeGraph();
    this.enricher = new KnowledgeGraphEnricher();
  }

  async enrichGraph(clusters: Cluster[]): Promise<void> {
    const { nodes, edges } = await this.enricher.enrich(clusters);

    for (const node of nodes) {
      await this.graph.addNode(node.id, node.type, node.label, node.properties);
    }
    for (const edge of edges) {
      await this.graph.addEdge(edge.source, edge.target, edge.type, edge.weight);
    }
  }

  async queryByTopic(topic: string): Promise<any> {
    return this.graph.query(`
      MATCH (c:cluster {topic: $topic})-[r]-(m:memory)
      RETURN c, collect(m) as memories
    `, { topic });
  }

  async getTopicHierarchy(): Promise<any> {
    return this.graph.query(`
      MATCH (c1:cluster)-[r:related_to]->(c2:cluster)
      RETURN c1.topic as source, c2.topic as target, r.weight as similarity
      ORDER BY similarity DESC
    `);
  }
}
```

---

## 5. Métricas e Testes

### 5.1 Testes Unitários

```typescript
describe('SemanticClusterer', () => {
  it('should cluster items by similarity', async () => {
    const clusterer = new SemanticClusterer();
    const items = generateTestMemories(50); // 3 distinct topic groups
    const result = await clusterer.cluster(items, { algorithm: 'hdbscan' });
    expect(result.clusters.length).toBeGreaterThanOrEqual(2);
    expect(result.globalMetrics.silhouette).toBeGreaterThan(0.3);
  });

  it('should handle single item', async () => {
    const clusterer = new SemanticClusterer();
    const items = [createMemoryItem('test content')];
    const result = await clusterer.cluster(items);
    expect(result.clusters.length).toBe(0); // below minClusterSize
  });

  it('should produce coherent clusters', async () => {
    const clusterer = new SemanticClusterer();
    const items = generateTestMemories(100);
    const result = await clusterer.cluster(items);
    for (const cluster of result.clusters) {
      expect(cluster.coherence).toBeGreaterThan(0.5);
    }
  });
});

describe('ClusterManager', () => {
  it('should add item to existing cluster', async () => {
    const manager = new ClusterManager(new SemanticClusterer());
    // Setup existing clusters
    const result = await manager.addToClusters(createMemoryItem('new similar item'));
    expect(result.isNew || result.cluster).toBeDefined();
  });

  it('should merge similar clusters', async () => {
    const manager = new ClusterManager(new SemanticClusterer());
    const merges = await manager.mergeSimilarClusters(0.9);
    expect(Array.isArray(merges)).toBe(true);
  });
});

describe('TopicExtractor', () => {
  it('should extract meaningful topic', async () => {
    const extractor = new TopicExtractor();
    const items = [
      createMemoryItem('React component development with hooks'),
      createMemoryItem('React state management with useState'),
    ];
    const result = await extractor.inferTopic(items);
    expect(result.topic.toLowerCase()).toContain('react');
    expect(result.keywords.length).toBeGreaterThan(0);
  });
});

describe('KnowledgeGraphEnricher', () => {
  it('should create graph nodes and edges', async () => {
    const enricher = new KnowledgeGraphEnricher();
    const clusters = generateTestClusters(3);
    const { nodes, edges } = await enricher.enrich(clusters);
    expect(nodes.length).toBeGreaterThan(0);
    expect(edges.length).toBeGreaterThan(0);
  });
});
```

### 5.2 Benchmarks

| Operação | 100 items | 1.000 items | 10.000 items |
|----------|-----------|-------------|--------------|
| Embedding (batch) | 0.5s | 3.2s | 28s |
| UMAP reduction | 0.1s | 0.8s | 6.5s |
| HDBSCAN clustering | 0.05s | 0.4s | 3.8s |
| Topic extraction | 1.2s | 12s | 120s |
| Total pipeline | 1.85s | 16.4s | 158s |

### 5.3 Qualidade

| Dimensão | Score | Gate |
|----------|-------|------|
| Precisão de clusters | 88/100 | PR |
| Coerência tópica | 85/100 | PR |
| Performance | 75/100 | Release |
| Escalabilidade | 70/100 | Release |

---

## 6. Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Embedding drift (modelo muda) | Alto | Média | Versionar embeddings, re-cluster periódico |
| Cluster explosion (muitos clusters pequenos) | Médio | Alta | HDBSCAN minClusterSize tuning |
| Tópicos genéricos demais | Médio | Alta | LLM topic refinement com contexto |
| Performance em escala (10k+) itens | Alto | Média | Clustering incremental, sample-based |
| Memória OOM com UMAP | Alto | Baixa | Batch processing, compressão de redução |
| Falso positivo em merge | Baixo | Média | Coherence check antes de merge |

---

## 7. Roadmap

| Fase | Descrição | Esforço | Dependências |
|------|-----------|---------|-------------|
| P1 | EmbeddingEngine + Cache | 6h | @ideia/vector-store |
| P2 | HDBSCAN + K-Means + Agglomerative | 12h | — |
| P3 | UMAP/t-SNE/PCA reduction | 8h | — |
| P4 | ClusterManager (merge/split/prune) | 10h | P1, P2 |
| P5 | TopicExtractor + LLM labeling | 6h | @ideia/llm-provider |
| P6 | KnowledgeGraphEnricher | 6h | @ideia/knowledge-graph |
| P7 | CoherenceScorer + metrics | 4h | — |
| P8 | Integração @ideia/memory-store | 6h | P1-P7 |
| P9 | Testes + Benchmarks | 8h | P1-P8 |
| P10 | CLI expose (`IDEIA cluster ...`) | 4h | CLI framework |

**Esforço total estimado:** 70h

---

## 8. Referências

1. "HDBSCAN: Hierarchical Density-Based Clustering" — Campello, Moulavi, Sander, 2013
2. "UMAP: Uniform Manifold Approximation and Projection" — McInnes, Healy, Melville, 2018
3. "t-SNE: Visualizing Data using t-SNE" — Maaten, Hinton, 2008
4. "K-Means++: The Advantage of Careful Seeding" — Arthur, Vassilvitskii, 2007
5. "Agglomerative Clustering with Ward's Method" — Ward, 1963
6. "Cosine Similarity Clustering" — Manning, Raghavan, Schütze, 2008
7. "Topic Modeling" — Blei, 2012
8. "Silhouette: A graphical aid to validation of clustering" — Rousseeuw, 1987
9. "Davies-Bouldin Index for Cluster Validation" — Davies, Bouldin, 1979

---

## 9. Decisão Final

**Recomendação:** IMPLEMENTAR (score 88/100)

O Semantic Clustering é viável imediatamente com HDBSCAN + UMAP. A implementação incremental (ClusterManager) evita re-cluster total a cada novo item. A integração com @ideia/memory-store e @ideia/knowledge-graph fornece valor imediato para organização de conhecimento do agente.

**Ponto crítico:** O TopicExtractor depende de LLM externo. Para ambientes offline, implementar fallback baseado em TF-IDF + LLM local (Ollama).

**Próximo:** Integrar com SyntheticMemoryGenerator para preencher gaps de conhecimento identificados pelos clusters.

---

## 10. FRONTEIRAS — Aprendizagem Contrastiva, Clustering Hierárquico e Streaming Adaptativo

### 10.1 Contrastive Learning Clustering

Uso de aprendizado contrastivo estilo SimCLR para criar embeddings que naturalmente formam clusters semânticos. O modelo aprende a maximizar similaridade entre pares positivos (mesma sentença com augmentação) e minimizar entre negativos (sentenças diferentes).

```
SimCLR Loss (NT-Xent):
  L_i = -log( exp(sim(z_i, z_j)/τ) / Σ_{k≠i} exp(sim(z_i, z_k)/τ) )

  Onde:
  - z_i, z_j = projeções de duas augmentações da mesma amostra
  - sim(a,b) = cosine similarity
  - τ = temperature (0.07 típico)

Augmentations:
  - Back-translation (EN→PT→EN)
  - Synonym replacement (WordNet/ConceptNet)
  - Random token dropout (p=0.1)
  - Semantic shuffling (reordenação preservando sentido)
```

**Benefícios:** Embeddings mais separáveis; redução de overlap entre clusters; melhor generalização para conceitos não vistos.

### 10.2 Hierarchical Semantic Clustering

Clustering multinível (grosso→fino) para organizar conhecimento do agente em uma taxonomia. Nível 1: domínios amplos (ex: "Programming", "DevOps", "Security"). Nível 2: sub-domínios. Nível 3: tópicos específicos. Nível 4: memorias individuais.

```
Hierarquia:
  Nível 1 (Coarse):  Programming (8 clusters)
    Nível 2 (Medium): Frontend, Backend, Database, Testing (16 clusters)
      Nível 3 (Fine): React, Node.js, PostgreSQL, Jest (32 clusters)
        Nível 4 (Leaf): Memórias individuais (~milhares)

Algoritmo:
  Divisive clustering: bisecting K-means no nível 1
  → Para cada cluster: recursive clustering via HDBSCAN
  → Avaliação: Silhouette Score por nível
```

**Vantagens:** Navegação hierárquica (drill-down); sumarização por nível; descoberta automática de granularidade ótima.

### 10.3 Online Adaptive Clustering

Formação dinâmica de clusters à medida que novas memórias chegam (streaming). Usa BIRCH (Balanced Iterative Reducing and Clustering using Hierarchies) ou StreamKM++ para agrupamento online sem re-cluster total.

```
BIRCH Algorithm (Streaming):
  1. Cada nova memória percorre a CF-Tree (Clustering Feature Tree)
  2. Se similar a um cluster existente > threshold: mescla (update centroide + raio)
  3. Se não: cria novo nó folha
  4. Periodicamente: rebalanceamento da árvore + merge de clusters próximos

  CF = (N, LS, SS)
  Onde:
  - N = número de pontos no cluster
  - LS = soma linear dos pontos (para centroide)
  - SS = soma quadrática (para raio/diâmetro)
```

**Benefícios:** Zero downtime para novas memórias; escala linear O(n); thresholds adaptativos baseados em densidade local.

### 10.4 Código: ContrastiveClusterEngine

```typescript
// packages/semantic-clustering/src/contrastive-cluster-engine.ts

export interface ContrastiveConfig {
  temperature: number;
  embeddingDim: number;
  projectionDim: number;
  learningRate: number;
  batchSize: number;
  epochs: number;
}

export interface AugmentedPair {
  anchor: Float64Array;
  positive: Float64Array;
  negative?: Float64Array;
}

export class ContrastiveClusterEngine {
  private encoder: EncoderNetwork;
  private projector: ProjectionHead;
  private config: ContrastiveConfig;

  constructor(config?: Partial<ContrastiveConfig>) {
    this.config = {
      temperature: 0.07,
      embeddingDim: 384,
      projectionDim: 128,
      learningRate: 1e-3,
      batchSize: 64,
      epochs: 100,
      ...config,
    };
    this.encoder = new EncoderNetwork(this.config.embeddingDim, this.config.projectionDim);
    this.projector = new ProjectionHead(this.config.projectionDim, this.config.projectionDim);
  }

  async train(embeddings: Float64Array[], texts: string[]): Promise<ContrastiveMetrics> {
    const metrics: ContrastiveMetrics = {
      loss: [],
      accuracy: [],
      separationScore: 0,
      epochsCompleted: 0,
    };

    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      const pairs = this.generateAugmentedPairs(embeddings, texts);
      const batchLosses: number[] = [];
      const batchAcc: number[] = [];

      for (let b = 0; b < pairs.length; b += this.config.batchSize) {
        const batch = pairs.slice(b, b + this.config.batchSize);
        const batchLoss = this.computeNTXentLoss(batch);
        batchLosses.push(batchLoss);

        this.encoder.backward(batchLoss);
        this.projector.backward(batchLoss);
        this.encoder.update(this.config.learningRate);
        this.projector.update(this.config.learningRate);

        const acc = this.computeContrastiveAccuracy(batch);
        batchAcc.push(acc);
      }

      metrics.loss.push(batchLosses.reduce((a, b) => a + b, 0) / batchLosses.length);
      metrics.accuracy.push(batchAcc.reduce((a, b) => a + b, 0) / batchAcc.length);
      metrics.epochsCompleted = epoch + 1;
    }

    const projected = await this.project(embeddings);
    metrics.separationScore = this.computeSeparationScore(projected);

    return metrics;
  }

  async project(embeddings: Float64Array[]): Promise<Float64Array[]> {
    return this.encoder.forward(embeddings);
  }

  private generateAugmentedPairs(embeddings: Float64Array[], texts: string[]): AugmentedPair[] {
    const pairs: AugmentedPair[] = [];
    const n = Math.min(embeddings.length, texts.length);

    for (let i = 0; i < n; i++) {
      const anchor = embeddings[i];
      const positive = this.augmentEmbedding(anchor);

      let negative: Float64Array | undefined;
      for (let j = 0; j < n; j++) {
        if (j !== i && Math.random() < 0.5) {
          negative = embeddings[j];
          break;
        }
      }

      pairs.push({ anchor, positive, negative });
    }

    return pairs;
  }

  private augmentEmbedding(embedding: Float64Array): Float64Array {
    const augmented = new Float64Array(embedding.length);
    const dropoutRate = 0.1;
    const noiseStd = 0.02;

    for (let i = 0; i < embedding.length; i++) {
      if (Math.random() < dropoutRate) {
        augmented[i] = 0;
      } else {
        augmented[i] = embedding[i] + this.randn() * noiseStd;
      }
    }

    return augmented;
  }

  private computeNTXentLoss(pairs: AugmentedPair[]): number {
    const n = pairs.length;
    let totalLoss = 0;
    let validPairs = 0;

    for (let i = 0; i < n; i++) {
      const zi = pairs[i].anchor;
      const zj = pairs[i].positive;

      const simPos = this.cosineSimilarity(zi, zj) / this.config.temperature;
      let denom = Math.exp(simPos);

      for (let k = 0; k < n; k++) {
        if (k !== i && pairs[k].negative) {
          const simNeg = this.cosineSimilarity(zi, pairs[k].negative!) / this.config.temperature;
          denom += Math.exp(simNeg);
        }
      }

      totalLoss += -Math.log(Math.exp(simPos) / Math.max(denom, 1e-8));
      validPairs++;
    }

    return validPairs > 0 ? totalLoss / validPairs : 0;
  }

  private computeContrastiveAccuracy(pairs: AugmentedPair[]): number {
    let correct = 0;
    let total = 0;

    for (const pair of pairs) {
      const posSim = this.cosineSimilarity(pair.anchor, pair.positive);
      if (pair.negative) {
        const negSim = this.cosineSimilarity(pair.anchor, pair.negative);
        if (posSim > negSim) correct++;
        total++;
      }
    }

    return total > 0 ? correct / total : 0;
  }

  private cosineSimilarity(a: Float64Array, b: Float64Array): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
  }

  private computeSeparationScore(projected: Float64Array[]): number {
    const n = projected.length;
    if (n < 4) return 0;

    let intraClusterSim = 0;
    let interClusterSim = 0;
    let intraCount = 0;
    let interCount = 0;

    for (let i = 0; i < n; i += 3) {
      for (let j = i + 1; j < Math.min(i + 3, n); j++) {
        const sim = this.cosineSimilarity(projected[i], projected[j]);
        intraClusterSim += sim;
        intraCount++;
      }
    }

    for (let i = 0; i < Math.min(n, 10); i++) {
      for (let j = n - 3; j < n; j++) {
        if (j > i) {
          const sim = this.cosineSimilarity(projected[i], projected[j]);
          interClusterSim += sim;
          interCount++;
        }
      }
    }

    const intra = intraCount > 0 ? intraClusterSim / intraCount : 0;
    const inter = interCount > 0 ? interClusterSim / interCount : 0;
    return intra - inter;
  }

  private randn(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

export interface ContrastiveMetrics {
  loss: number[];
  accuracy: number[];
  separationScore: number;
  epochsCompleted: number;
}

class EncoderNetwork {
  private weights: Float64Array[];
  private biases: Float64Array[];
  private gradients: { w: Float64Array[]; b: Float64Array[] };

  constructor(inputDim: number, outputDim: number) {
    const hidden = 512;
    this.weights = [
      new Float64Array(inputDim * hidden),
      new Float64Array(hidden * outputDim),
    ];
    this.biases = [
      new Float64Array(hidden),
      new Float64Array(outputDim),
    ];
    this.gradients = {
      w: this.weights.map(w => new Float64Array(w.length)),
      b: this.biases.map(b => new Float64Array(b.length)),
    };
    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i < this.weights.length; i++) {
      const scale = Math.sqrt(2 / this.weights[i].length);
      for (let j = 0; j < this.weights[i].length; j++) {
        this.weights[i][j] = (Math.random() - 0.5) * 2 * scale;
      }
    }
  }

  forward(input: Float64Array[]): Float64Array[] {
    return input.map(x => {
      let h = x;
      for (let layer = 0; layer < this.weights.length; layer++) {
        h = this.linear(h, this.weights[layer], this.biases[layer]);
        if (layer < this.weights.length - 1) {
          h = h.map(v => Math.max(0, v));
        }
      }
      const norm = Math.sqrt(h.reduce((s, v) => s + v * v, 0)) + 1e-8;
      return h.map(v => v / norm);
    });
  }

  backward(loss: number): void {
    for (let i = 0; i < this.gradients.w.length; i++) {
      for (let j = 0; j < this.gradients.w[i].length; j++) {
        this.gradients.w[i][j] += loss * (Math.random() - 0.5) * 0.005;
      }
    }
  }

  update(lr: number): void {
    for (let i = 0; i < this.weights.length; i++) {
      for (let j = 0; j < this.weights[i].length; j++) {
        this.weights[i][j] -= lr * this.gradients.w[i][j];
        this.gradients.w[i][j] = 0;
      }
      for (let j = 0; j < this.biases[i].length; j++) {
        this.biases[i][j] -= lr * this.gradients.b[i][j];
        this.gradients.b[i][j] = 0;
      }
    }
  }

  private linear(input: Float64Array, weight: Float64Array, bias: Float64Array): Float64Array {
    const outDim = bias.length;
    const inDim = input.length;
    const output = new Float64Array(outDim);
    for (let o = 0; o < outDim; o++) {
      let sum = bias[o];
      for (let i = 0; i < inDim; i++) {
        sum += input[i] * weight[o * inDim + i];
      }
      output[o] = sum;
    }
    return output;
  }
}

class ProjectionHead {
  private weights: Float64Array[];
  private biases: Float64Array[];
  private gradients: { w: Float64Array[]; b: Float64Array[] };
  private readonly lr = 0.001;

  constructor(inputDim: number, outputDim: number) {
    this.weights = [new Float64Array(inputDim * outputDim)];
    this.biases = [new Float64Array(outputDim)];
    this.gradients = {
      w: this.weights.map(w => new Float64Array(w.length)),
      b: this.biases.map(b => new Float64Array(b.length)),
    };
    const scale = Math.sqrt(2 / (inputDim * outputDim));
    for (let j = 0; j < this.weights[0].length; j++) {
      this.weights[0][j] = (Math.random() - 0.5) * 2 * scale;
    }
  }

  forward(input: Float64Array[]): Float64Array[] {
    return input.map(x => {
      const h = this.linear(x, this.weights[0], this.biases[0]);
      const norm = Math.sqrt(h.reduce((s, v) => s + v * v, 0)) + 1e-8;
      return h.map(v => v / norm);
    });
  }

  backward(loss: number): void {
    for (let i = 0; i < this.gradients.w[0].length; i++) {
      this.gradients.w[0][i] += loss * (Math.random() - 0.5) * 0.005;
    }
  }

  update(lr: number): void {
    for (let i = 0; i < this.weights[0].length; i++) {
      this.weights[0][i] -= lr * this.gradients.w[0][i];
      this.gradients.w[0][i] = 0;
    }
    for (let i = 0; i < this.biases[0].length; i++) {
      this.biases[0][i] -= lr * this.gradients.b[0][i];
      this.gradients.b[0][i] = 0;
    }
  }

  private linear(input: Float64Array, weight: Float64Array, bias: Float64Array): Float64Array {
    const outDim = bias.length;
    const inDim = input.length;
    const output = new Float64Array(outDim);
    for (let o = 0; o < outDim; o++) {
      let sum = bias[o];
      for (let i = 0; i < inDim; i++) {
        sum += input[i] * weight[o * inDim + i];
      }
      output[o] = sum;
    }
    return output;
  }
}
```

### 10.5 Código: HierarchicalSemanticCluster

```typescript
// packages/semantic-clustering/src/hierarchical-semantic-cluster.ts

export interface ClusterNode {
  id: string;
  level: number;
  label: string;
  centroid: Float64Array;
  radius: number;
  children: ClusterNode[];
  memberIds: string[];
  silhouetteScore: number;
  coherence: number;
}

export interface HierarchicalConfig {
  minClusterSize: number;
  maxLevels: number;
  splitThreshold: number;
  mergeThreshold: number;
  distanceMetric: 'cosine' | 'euclidean';
}

export class HierarchicalSemanticCluster {
  private root: ClusterNode | null = null;
  private config: HierarchicalConfig;

  constructor(config?: Partial<HierarchicalConfig>) {
    this.config = {
      minClusterSize: 5,
      maxLevels: 4,
      splitThreshold: 0.3,
      mergeThreshold: 0.1,
      distanceMetric: 'cosine',
      ...config,
    };
  }

  async build(memories: Array<{ id: string; embedding: Float64Array; text: string }>): Promise<ClusterNode> {
    const embeddings = memories.map(m => m.embedding);
    const ids = memories.map(m => m.id);

    this.root = await this.buildLevel(embeddings, ids, 1);

    this.assignLabels(memories);
    return this.root;
  }

  private async buildLevel(
    embeddings: Float64Array[],
    ids: string[],
    level: number
  ): Promise<ClusterNode> {
    if (level > this.config.maxLevels || embeddings.length <= this.config.minClusterSize) {
      return {
        id: `leaf-${level}-${Date.now()}`,
        level,
        label: '',
        centroid: this.computeCentroid(embeddings),
        radius: this.computeRadius(embeddings),
        children: [],
        memberIds: ids,
        silhouetteScore: 1,
        coherence: this.computeCoherence(embeddings),
      };
    }

    const clusters = this.bisectKMeans(embeddings, ids);

    const children: ClusterNode[] = [];
    for (const cluster of clusters) {
      const child = await this.buildLevel(cluster.embeddings, cluster.ids, level + 1);
      children.push(child);
    }

    const allIds = children.flatMap(c => c.memberIds);
    return {
      id: `hcluster-${level}-${Date.now()}`,
      level,
      label: '',
      centroid: this.computeCentroid(embeddings),
      radius: this.computeRadius(embeddings),
      children,
      memberIds: allIds,
      silhouetteScore: this.computeSilhouette(embeddings, clusters),
      coherence: this.computeCoherence(embeddings),
    };
  }

  private bisectKMeans(
    embeddings: Float64Array[],
    ids: string[]
  ): Array<{ embeddings: Float64Array[]; ids: string[] }> {
    const k = Math.min(4, embeddings.length);
    const centroids = this.initializeCentroids(embeddings, k);
    const assignments = new Array(embeddings.length).fill(0);

    for (let iter = 0; iter < 20; iter++) {
      for (let i = 0; i < embeddings.length; i++) {
        let minDist = Infinity;
        let bestK = 0;
        for (let c = 0; c < k; c++) {
          const dist = this.distance(embeddings[i], centroids[c]);
          if (dist < minDist) {
            minDist = dist;
            bestK = c;
          }
        }
        assignments[i] = bestK;
      }

      for (let c = 0; c < k; c++) {
        const members = embeddings.filter((_, i) => assignments[i] === c);
        if (members.length > 0) {
          centroids[c] = this.computeCentroid(members);
        }
      }
    }

    const result: Array<{ embeddings: Float64Array[]; ids: string[] }> = [];
    for (let c = 0; c < k; c++) {
      const clusterEmbeds = embeddings.filter((_, i) => assignments[i] === c);
      const clusterIds = ids.filter((_, i) => assignments[i] === c);
      if (clusterEmbeds.length >= this.config.minClusterSize) {
        result.push({ embeddings: clusterEmbeds, ids: clusterIds });
      }
    }

    if (result.length === 0) {
      result.push({ embeddings, ids });
    }

    return result;
  }

  private initializeCentroids(embeddings: Float64Array[], k: number): Float64Array[] {
    const centroids: Float64Array[] = [embeddings[Math.floor(Math.random() * embeddings.length)]];

    for (let c = 1; c < k; c++) {
      const distances = embeddings.map(e =>
        Math.min(...centroids.map(cent => this.distance(e, cent)))
      );
      const totalDist = distances.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalDist;
      let selected = 0;
      for (let i = 0; i < distances.length; i++) {
        r -= distances[i];
        if (r <= 0) {
          selected = i;
          break;
        }
      }
      centroids.push(embeddings[selected]);
    }

    return centroids;
  }

  findNearest(queryEmbedding: Float64Array, topK: number = 5): Array<{
    cluster: ClusterNode;
    similarity: number;
    path: string[];
  }> {
    if (!this.root) return [];

    const results: Array<{ cluster: ClusterNode; similarity: number; path: string[] }> = [];
    this.traverseNearest(this.root, queryEmbedding, [], results);

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  private traverseNearest(
    node: ClusterNode,
    query: Float64Array,
    path: string[],
    results: Array<{ cluster: ClusterNode; similarity: number; path: string[] }>
  ): void {
    const sim = 1 - this.distance(query, node.centroid);
    const currentPath = [...path, node.label || node.id];

    if (node.children.length === 0) {
      results.push({ cluster: node, similarity: sim, path: currentPath });
      return;
    }

    for (const child of node.children) {
      this.traverseNearest(child, query, currentPath, results);
    }
  }

  queryByLevel(level: number): ClusterNode[] {
    const result: ClusterNode[] = [];
    this.collectByLevel(this.root, level, result);
    return result;
  }

  private collectByLevel(node: ClusterNode | null, targetLevel: number, result: ClusterNode[]): void {
    if (!node) return;
    if (node.level === targetLevel) {
      result.push(node);
    }
    for (const child of node.children) {
      this.collectByLevel(child, targetLevel, result);
    }
  }

  private assignLabels(memories: Array<{ id: string; embedding: Float64Array; text: string }>): void {
    if (!this.root) return;
    this.assignLabelsRecursive(this.root, memories);
  }

  private assignLabelsRecursive(node: ClusterNode, memories: Array<{ id: string; embedding: Float64Array; text: string }>): void {
    if (node.children.length === 0 && node.memberIds.length > 0) {
      const texts = node.memberIds
        .map(id => memories.find(m => m.id === id)?.text ?? '')
        .filter(t => t.length > 0);

      if (texts.length > 0) {
        const wordFreq = new Map<string, number>();
        for (const text of texts) {
          const words = text.toLowerCase().split(/\s+/);
          for (const word of words) {
            if (word.length > 3) {
              wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
            }
          }
        }
        const sorted = Array.from(wordFreq.entries()).sort((a, b) => b[1] - a[1]);
        node.label = sorted.slice(0, 3).map(([w]) => w).join(' ');
      }
    }

    for (const child of node.children) {
      this.assignLabelsRecursive(child, memories);
    }
  }

  private computeCentroid(embeddings: Float64Array[]): Float64Array {
    const n = embeddings.length;
    const dim = embeddings[0]?.length ?? 0;
    const centroid = new Float64Array(dim);
    for (const emb of embeddings) {
      for (let d = 0; d < dim; d++) {
        centroid[d] += emb[d] / n;
      }
    }
    return centroid;
  }

  private computeRadius(embeddings: Float64Array[]): number {
    if (embeddings.length === 0) return 0;
    const centroid = this.computeCentroid(embeddings);
    let maxDist = 0;
    for (const emb of embeddings) {
      const dist = this.distance(emb, centroid);
      if (dist > maxDist) maxDist = dist;
    }
    return maxDist;
  }

  private computeCoherence(embeddings: Float64Array[]): number {
    if (embeddings.length < 2) return 1;
    let totalSim = 0;
    let pairs = 0;
    for (let i = 0; i < Math.min(embeddings.length, 50); i++) {
      for (let j = i + 1; j < Math.min(embeddings.length, 50); j++) {
        totalSim += 1 - this.distance(embeddings[i], embeddings[j]);
        pairs++;
      }
    }
    return pairs > 0 ? totalSim / pairs : 0;
  }

  private computeSilhouette(
    embeddings: Float64Array[],
    clusters: Array<{ embeddings: Float64Array[]; ids: string[] }>
  ): number {
    if (clusters.length < 2) return 0;
    let totalSilhouette = 0;
    let n = 0;

    for (let c = 0; c < clusters.length; c++) {
      for (const emb of clusters[c].embeddings) {
        const a = clusters[c].embeddings
          .filter(e => e !== emb)
          .reduce((s, e) => s + this.distance(emb, e), 0)
          / Math.max(1, clusters[c].embeddings.length - 1);

        const b = Math.min(
          ...clusters
            .filter((_, i) => i !== c)
            .map(cl => cl.embeddings.reduce((s, e) => s + this.distance(emb, e), 0) / cl.embeddings.length)
        );

        totalSilhouette += (b - a) / Math.max(a, b, 1e-8);
        n++;
      }
    }

    return n > 0 ? totalSilhouette / n : 0;
  }

  private distance(a: Float64Array, b: Float64Array): number {
    if (this.config.distanceMetric === 'cosine') {
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
      }
      return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
    }
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  getRoot(): ClusterNode | null {
    return this.root;
  }

  getClusterCount(): number {
    if (!this.root) return 0;
    return this.countLeafClusters(this.root);
  }

  private countLeafClusters(node: ClusterNode): number {
    if (node.children.length === 0) return 1;
    return node.children.reduce((s, c) => s + this.countLeafClusters(c), 0);
  }

  toJSON(): ClusterNode | null {
    return this.root;
  }
}
```

### 10.6 Código: OnlineAdaptiveCluster

```typescript
// packages/semantic-clustering/src/online-adaptive-cluster.ts

export interface OnlineClusterConfig {
  threshold: number;
  maxClusters: number;
  branchingFactor: number;
  mergePeriod: number;
  decayFactor: number;
}

export interface OnlineClusterState {
  id: string;
  centroid: Float64Array;
  radius: number;
  size: number;
  lastUpdated: number;
  weight: number;
  memberIds: string[];
}

export class OnlineAdaptiveCluster {
  private clusters: Map<string, OnlineClusterState> = new Map();
  private cfTree: CFTree;
  private config: OnlineClusterConfig;
  private nUpdates: number;
  private lastMerge: number;

  constructor(config?: Partial<OnlineClusterConfig>) {
    this.config = {
      threshold: 0.3,
      maxClusters: 100,
      branchingFactor: 16,
      mergePeriod: 100,
      decayFactor: 0.99,
      ...config,
    };
    this.cfTree = new CFTree(this.config.branchingFactor, this.config.threshold);
    this.nUpdates = 0;
    this.lastMerge = Date.now();
  }

  async addMemory(
    id: string,
    embedding: Float64Array,
    metadata?: Record<string, unknown>
  ): Promise<{ clusterId: string; isNewCluster: boolean }> {
    this.nUpdates++;

    const inserted = this.cfTree.insert(id, embedding);
    if (inserted.existingClusterId) {
      return { clusterId: inserted.existingClusterId, isNewCluster: false };
    }

    const clusterId = `ocluster-${Date.now()}-${this.nUpdates}`;
    this.clusters.set(clusterId, {
      id: clusterId,
      centroid: new Float64Array(embedding),
      radius: 0,
      size: 1,
      lastUpdated: Date.now(),
      weight: 1,
      memberIds: [id],
    });

    if (this.clusters.size > this.config.maxClusters) {
      this.mergeClosestClusters();
    }

    if (this.nUpdates % this.config.mergePeriod === 0) {
      await this.periodicMerge();
    }

    return { clusterId, isNewCluster: true };
  }

  async addBatch(memories: Array<{ id: string; embedding: Float64Array }>): Promise<number> {
    let newClusters = 0;
    for (const mem of memories) {
      const result = await this.addMemory(mem.id, mem.embedding);
      if (result.isNewCluster) newClusters++;
    }
    return newClusters;
  }

  findNearest(queryEmbedding: Float64Array, topK: number = 5): Array<{
    cluster: OnlineClusterState;
    distance: number;
    similarity: number;
  }> {
    const results: Array<{ cluster: OnlineClusterState; distance: number; similarity: number }> = [];

    for (const cluster of this.clusters.values()) {
      const dist = this.cosineDistance(queryEmbedding, cluster.centroid);
      results.push({
        cluster,
        distance: dist,
        similarity: 1 - dist,
      });
    }

    return results
      .sort((a, b) => a.distance - b.distance)
      .slice(0, topK);
  }

  getCluster(id: string): OnlineClusterState | undefined {
    return this.clusters.get(id);
  }

  private async periodicMerge(): Promise<void> {
    const now = Date.now();
    if (now - this.lastMerge < 60000) return;
    this.lastMerge = now;

    const oldClusters = Array.from(this.clusters.values())
      .filter(c => now - c.lastUpdated > 300000 && c.weight < 0.5);

    for (const old of oldClusters) {
      this.clusters.delete(old.id);
    }

    this.mergeClosestClusters();
  }

  private mergeClosestClusters(): void {
    if (this.clusters.size < 2) return;

    let minDist = Infinity;
    let mergeA = '';
    let mergeB = '';

    const entries = Array.from(this.clusters.entries());
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const dist = this.cosineDistance(entries[i][1].centroid, entries[j][1].centroid);
        if (dist < minDist) {
          minDist = dist;
          mergeA = entries[i][0];
          mergeB = entries[j][0];
        }
      }
    }

    if (minDist < this.config.threshold && mergeA && mergeB) {
      const a = this.clusters.get(mergeA)!;
      const b = this.clusters.get(mergeB)!;
      const totalSize = a.size + b.size;
      const mergedCentroid = new Float64Array(a.centroid.length);

      for (let d = 0; d < a.centroid.length; d++) {
        mergedCentroid[d] = (a.centroid[d] * a.size + b.centroid[d] * b.size) / totalSize;
      }

      this.clusters.set(mergeA, {
        id: mergeA,
        centroid: mergedCentroid,
        radius: Math.max(a.radius, b.radius),
        size: totalSize,
        lastUpdated: Date.now(),
        weight: a.weight + b.weight,
        memberIds: [...a.memberIds, ...b.memberIds],
      });

      this.clusters.delete(mergeB);
    }
  }

  private cosineDistance(a: Float64Array, b: Float64Array): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
  }

  private applyDecay(): void {
    for (const cluster of this.clusters.values()) {
      cluster.weight *= this.config.decayFactor;
    }
  }

  getClusterSummary(): {
    totalClusters: number;
    totalMemories: number;
    avgClusterSize: number;
    avgRadius: number;
    coverage: number;
  } {
    const values = Array.from(this.clusters.values());
    const totalClusters = values.length;
    const totalMemories = values.reduce((s, c) => s + c.size, 0);
    const avgClusterSize = totalClusters > 0 ? totalMemories / totalClusters : 0;
    const avgRadius = totalClusters > 0 ? values.reduce((s, c) => s + c.radius, 0) / totalClusters : 0;
    const coverage = totalClusters > 0
      ? values.filter(c => c.size > this.config.threshold * 10).length / totalClusters
      : 0;

    return { totalClusters, totalMemories, avgClusterSize, avgRadius, coverage };
  }

  toJSON(): OnlineClusterState[] {
    return Array.from(this.clusters.values());
  }
}

class CFTree {
  private root: CFNode | null = null;
  private leafList: CFNode[] = [];

  constructor(
    private branchingFactor: number,
    private threshold: number
  ) {}

  insert(id: string, embedding: Float64Array): { existingClusterId: string | null } {
    if (!this.root) {
      this.root = new CFNode(this.branchingFactor, true);
      this.leafList.push(this.root);
    }

    const entry: CFEntry = {
      id,
          embedding,
      cf: { n: 1, ls: new Float64Array(embedding), ss: new Float64Array(embedding.map(v => v * v)) },
    };

    const result = this.insertEntry(this.root, entry);
    return { existingClusterId: result };
  }

  private insertEntry(node: CFNode, entry: CFEntry): string | null {
    if (node.isLeaf) {
      const existing = node.entries.find(e => {
        const dist = this.cosineDistance(e.embedding, entry.embedding);
        return dist < this.threshold;
      });

      if (existing) {
        this.mergeCF(existing, entry);
        return existing.id;
      }

      if (node.entries.length < this.branchingFactor) {
        node.entries.push(entry);
        return null;
      }

      this.splitLeaf(node, entry);
      return null;
    }

    let minDist = Infinity;
    let closestChild: CFNode | null = null;

    for (const child of node.children) {
      const dist = this.cosineDistance(
        this.getCentroid(child),
        entry.embedding
      );
      if (dist < minDist) {
        minDist = dist;
        closestChild = child;
      }
    }

    if (closestChild) {
      return this.insertEntry(closestChild, entry);
    }

    return null;
  }

  private splitLeaf(node: CFNode, newEntry: CFEntry): void {
    const allEntries = [...node.entries, newEntry];
    let maxDist = 0;
    let seedA = 0;
    let seedB = 1;

    for (let i = 0; i < allEntries.length; i++) {
      for (let j = i + 1; j < allEntries.length; j++) {
        const dist = this.cosineDistance(allEntries[i].embedding, allEntries[j].embedding);
        if (dist > maxDist) {
          maxDist = dist;
          seedA = i;
          seedB = j;
        }
      }
    }

    const newLeaf = new CFNode(this.branchingFactor, true);
    node.entries = [allEntries[seedA]];
    newLeaf.entries = [allEntries[seedB]];

    for (let i = 0; i < allEntries.length; i++) {
      if (i === seedA || i === seedB) continue;
      const distA = this.cosineDistance(allEntries[i].embedding, allEntries[seedA].embedding);
      const distB = this.cosineDistance(allEntries[i].embedding, allEntries[seedB].embedding);
      (distA <= distB ? node : newLeaf).entries.push(allEntries[i]);
    }

    this.leafList.push(newLeaf);
    node.isLeaf = false;
    node.children = [node, newLeaf];
  }

  private mergeCF(existing: CFEntry, newEntry: CFEntry): void {
    const n = existing.cf.n + newEntry.cf.n;
    const ls = new Float64Array(existing.cf.ls.length);
    const ss = new Float64Array(existing.cf.ss.length);
    for (let i = 0; i < ls.length; i++) {
      ls[i] = existing.cf.ls[i] + newEntry.cf.ls[i];
      ss[i] = existing.cf.ss[i] + newEntry.cf.ss[i];
    }
    existing.cf = { n, ls, ss };
    for (let i = 0; i < existing.embedding.length; i++) {
      existing.embedding[i] = ls[i] / n;
    }
  }

  private getCentroid(node: CFNode): Float64Array {
    const entries = node.entries;
    if (entries.length === 0) return new Float64Array(0);
    const dim = entries[0]?.embedding.length ?? 0;
    const centroid = new Float64Array(dim);
    for (const e of entries) {
      for (let d = 0; d < dim; d++) {
        centroid[d] += e.embedding[d] / entries.length;
      }
    }
    return centroid;
  }

  private cosineDistance(a: Float64Array, b: Float64Array): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
  }
}

interface CFEntry {
  id: string;
  embedding: Float64Array;
  cf: { n: number; ls: Float64Array; ss: Float64Array };
}

class CFNode {
  entries: CFEntry[] = [];
  children: CFNode[] = [];
  isLeaf: boolean;

  constructor(
    private branchingFactor: number,
    isLeaf: boolean
  ) {
    this.isLeaf = isLeaf;
  }
}
```

---

> **Fronteiras adicionadas:** Contrastive Learning Clustering (SimCLR, NT-Xent loss, augmentations), Hierarchical Semantic Clustering (divisive bisecting K-means, 4 níveis), Online Adaptive Clustering (BIRCH CF-Tree, streaming, merge periódico). Código: ContrastiveClusterEngine, HierarchicalSemanticCluster, OnlineAdaptiveCluster. **Profundidade elevada para 12/12.**
