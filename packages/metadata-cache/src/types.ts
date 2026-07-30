export interface MetadataEntry {
  path: string;
  title?: string;
  tags: string[];
  links: string[];
  backlinks: string[];
  headings: string[];
  wordCount: number;
  lastModified: number;
  metadata: Record<string, unknown>;
}

export interface Backlink {
  from: string;
  to: string;
  context?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'tag' | 'heading' | 'external';
  metadata: Partial<MetadataEntry>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'link' | 'backlink' | 'tag' | 'heading';
  weight: number;
}

export interface TagGroup {
  tag: string;
  count: number;
  files: string[];
}

export interface CacheStats {
  entries: number;
  backlinks: number;
  tags: number;
  lastIndexed: string;
}
