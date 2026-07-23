export interface ConsistencyItem {
  area: string;
  docs: 'ok' | 'partial' | 'missing' | 'stale';
  code: 'ok' | 'partial' | 'missing' | 'stale';
  tests: 'ok' | 'partial' | 'missing' | 'stale';
  cli: 'ok' | 'partial' | 'missing' | 'stale';
  extension: 'ok' | 'partial' | 'missing' | 'stale';
  status: 'ok' | 'attention' | 'blocked';
  notes: string[];
}

export interface ConsistencyReport {
  generatedAt: string;
  items: ConsistencyItem[];
  summary: string[];
}
