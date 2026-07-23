# @ideia/memory-graph

Unified Knowledge Graph for IDEIA — connects memory silos, crawler, query layer.

## Features

- **MemoryGraph** — in-memory graph storage with nodes, edges, query, and path finding
- **GraphCrawler** — crawls 5 memory silos (MemoryStore, PatternLearner, KnowledgeBase, TraceRegistry, AuditTrail)
- **Zod Schemas** — typed validation for GraphNode, GraphEdge, GraphQuery, GraphPath
- **BFS Path Finding** — weighted shortest path discovery up to configurable depth

## Usage

```typescript
import { MemoryGraph, GraphCrawler } from '@ideia/memory-graph';

const graph = new MemoryGraph();
const id = graph.addNode({ type: 'memory', label: 'User session', properties: {}, tags: ['session'] });
graph.addEdge({ source: id, target: otherId, relation: 'references', weight: 0.9 });
const paths = graph.findPath(id, otherId);

const crawler = new GraphCrawler(graph);
crawler.crawlAll();
```

## API

### MemoryGraph
- `addNode(node)` — add node, returns id
- `addEdge(edge)` — add edge between nodes
- `getNode(id)` — get node by id
- `query(filters, limit?)` — search nodes by type/tag/text
- `findPath(from, to, maxDepth?)` — BFS path finding
- `removeNode(id)` — remove node and connected edges
- `getStats()` — node/edge counts by type

### GraphCrawler
- `crawlAll()` — crawl all 5 silos and add to graph
- Individual crawl methods per silo

## Tests

17 tests covering graph operations and crawler simulation.
