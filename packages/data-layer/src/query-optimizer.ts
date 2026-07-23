export interface QueryPlan {
  type: 'select' | 'insert' | 'update' | 'delete' | 'vector_search';
  table: string;
  estimatedRows: number;
  hasIndex: boolean;
  indexColumns?: string[];
  suggestions: string[];
}

export interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist' | 'ivfflat';
}

const SUGGESTED_INDEXES: IndexDefinition[] = [
  { name: 'idx_decisions_timestamp', table: 'decisions', columns: ['timestamp'], type: 'btree' },
  { name: 'idx_decisions_action_type', table: 'decisions', columns: ['action_type'], type: 'btree' },
  { name: 'idx_decisions_user_id', table: 'decisions', columns: ['user_id'], type: 'hash' },
  { name: 'idx_memory_entries_key', table: 'memory_entries', columns: ['key'], type: 'hash', unique: true },
  { name: 'idx_memory_entries_created', table: 'memory_entries', columns: ['created_at'], type: 'btree' },
  { name: 'idx_events_type_timestamp', table: 'events', columns: ['type', 'timestamp'], type: 'btree' },
  { name: 'idx_events_source', table: 'events', columns: ['source'], type: 'hash' },
  { name: 'idx_audit_trail_timestamp', table: 'audit_trail', columns: ['timestamp'], type: 'btree' },
  { name: 'idx_audit_trail_action', table: 'audit_trail', columns: ['action'], type: 'btree' },
  { name: 'idx_vectors_embedding', table: 'vectors', columns: ['embedding'], type: 'ivfflat' },
];

export function suggestIndexes(table?: string): IndexDefinition[] {
  if (table) {
    return SUGGESTED_INDEXES.filter(idx => idx.table === table);
  }
  return [...SUGGESTED_INDEXES];
}

export function generateCreateIndexSQL(index: IndexDefinition): string {
  const unique = index.unique ? 'UNIQUE ' : '';
  const using = index.type ? ` USING ${index.type}` : '';
  const cols = index.columns.join(', ');
  return `CREATE ${unique}INDEX IF NOT EXISTS ${index.name} ON ${index.table}${using} (${cols});`;
}

export function generateAllIndexesSQL(): string {
  return SUGGESTED_INDEXES.map(generateCreateIndexSQL).join('\n');
}

export function analyzeQuery(type: QueryPlan['type'], table: string, columns?: string[]): QueryPlan {
  const relevantIndexes = SUGGESTED_INDEXES.filter(idx => idx.table === table);
  const hasIndex = relevantIndexes.length > 0;
  const suggestions: string[] = [];

  if (!hasIndex) {
    suggestions.push(`No indexes found for table "${table}". Consider adding indexes for query performance.`);
  }

  if (type === 'vector_search' && !relevantIndexes.some(idx => idx.type === 'ivfflat')) {
    suggestions.push('Vector search without ivfflat index will be slow. Add an ivfflat index on the embedding column.');
  }

  if (columns && columns.length > 1) {
    const hasComposite = relevantIndexes.some(idx =>
      idx.columns.length > 1 && columns.every(c => idx.columns.includes(c))
    );
    if (!hasComposite) {
      suggestions.push(`Query filters on multiple columns (${columns.join(', ')}) but no composite index covers them.`);
    }
  }

  return {
    type,
    table,
    estimatedRows: 0,
    hasIndex,
    indexColumns: hasIndex ? relevantIndexes.flatMap(idx => idx.columns) : undefined,
    suggestions,
  };
}

export function optimizeQuery(query: string): string {
  let optimized = query;

  // Replace SELECT * with explicit columns (example pattern)
  optimized = optimized.replace(/SELECT \*/gi, 'SELECT /* explicit columns recommended */');

  // Add LIMIT if missing (safety)
  if (/^SELECT\b/i.test(optimized) && !/\bLIMIT\b/i.test(optimized)) {
    optimized = optimized.replace(/;?\s*$/, ' LIMIT 1000');
  }

  return optimized;
}
