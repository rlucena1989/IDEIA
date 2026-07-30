# @ideia/metadata-cache

Metadata cache for Obsidian-like features: backlinks, graph view, tag indexing.

## Usage

```ts
import { MemoryCache } from '@ideia/cache';
import { MetadataCache, BacklinkIndex, GraphBuilder, TagIndex } from '@ideia/metadata-cache';

const cache = new MemoryCache();
const metadataCache = new MetadataCache(cache);

await metadataCache.set('/path/to/file.md', {
  path: '/path/to/file.md',
  title: 'My File',
  tags: ['typescript', 'docs'],
  links: ['/other/file.md'],
  backlinks: [],
  headings: ['Introduction', 'Details'],
  wordCount: 1200,
  lastModified: Date.now(),
  metadata: {},
});
```

## API

- **MetadataCache** — CRUD for metadata entries with fuzzy search and tag filtering
- **BacklinkIndex** — Bidirectional link map with rebuild support
- **GraphBuilder** — Build graph nodes/edges from entries, BFS traversal, tag sub-graphs
- **TagIndex** — Tag indexing with co-occurrence analysis and search
