import {
  suggestIndexes,
  generateCreateIndexSQL,
  generateAllIndexesSQL,
  analyzeQuery,
  optimizeQuery,
  IndexDefinition,
} from '../src/query-optimizer';

describe('suggestIndexes', () => {
  it('should return all suggested indexes when no table filter', () => {
    const indexes = suggestIndexes();
    expect(indexes.length).toBeGreaterThanOrEqual(10);
  });

  it('should filter by table name', () => {
    const indexes = suggestIndexes('decisions');
    expect(indexes.every(idx => idx.table === 'decisions')).toBe(true);
  });

  it('should return empty array for unknown table', () => {
    const indexes = suggestIndexes('nonexistent');
    expect(indexes).toEqual([]);
  });

  it('should include ivfflat index for vectors table', () => {
    const indexes = suggestIndexes('vectors');
    expect(indexes.some(idx => idx.type === 'ivfflat')).toBe(true);
  });

  it('should include unique index for memory_entries.key', () => {
    const indexes = suggestIndexes('memory_entries');
    expect(indexes.some(idx => idx.unique === true)).toBe(true);
  });

  it('should return copy of array (immutable)', () => {
    const indexes = suggestIndexes();
    const original = suggestIndexes();
    expect(indexes).toEqual(original);
  });
});

describe('generateCreateIndexSQL', () => {
  it('should generate CREATE INDEX SQL', () => {
    const index: IndexDefinition = { name: 'idx_test', table: 'test', columns: ['col1'] };
    const sql = generateCreateIndexSQL(index);
    expect(sql).toContain('CREATE');
    expect(sql).toContain('INDEX IF NOT EXISTS idx_test');
    expect(sql).toContain('ON test');
    expect(sql).toContain('col1');
  });

  it('should include UNIQUE when specified', () => {
    const index: IndexDefinition = { name: 'idx_uq', table: 't', columns: ['c'], unique: true };
    const sql = generateCreateIndexSQL(index);
    expect(sql).toContain('UNIQUE');
  });

  it('should include USING clause when type specified', () => {
    const index: IndexDefinition = { name: 'idx_ivfflat', table: 'vectors', columns: ['embedding'], type: 'ivfflat' };
    const sql = generateCreateIndexSQL(index);
    expect(sql).toContain('USING ivfflat');
  });

  it('should handle composite indexes', () => {
    const index: IndexDefinition = { name: 'idx_comp', table: 'events', columns: ['type', 'timestamp'], type: 'btree' };
    const sql = generateCreateIndexSQL(index);
    expect(sql).toContain('type, timestamp');
  });

  it('should generate valid SQL for hash index', () => {
    const index: IndexDefinition = { name: 'idx_hash', table: 'test', columns: ['user_id'], type: 'hash' };
    const sql = generateCreateIndexSQL(index);
    expect(sql).toContain('USING hash');
  });

  it('should generate valid SQL for gin index', () => {
    const index: IndexDefinition = { name: 'idx_gin', table: 'test', columns: ['data'], type: 'gin' };
    const sql = generateCreateIndexSQL(index);
    expect(sql).toContain('USING gin');
  });
});

describe('generateAllIndexesSQL', () => {
  it('should generate SQL for all indexes', () => {
    const sql = generateAllIndexesSQL();
    expect(sql).toContain('CREATE');
    expect(sql.split('\n').length).toBeGreaterThanOrEqual(10);
  });

  it('should contain all expected index names', () => {
    const sql = generateAllIndexesSQL();
    expect(sql).toContain('idx_decisions_timestamp');
    expect(sql).toContain('idx_memory_entries_key');
    expect(sql).toContain('idx_vectors_embedding');
  });
});

describe('analyzeQuery', () => {
  it('should flag missing indexes', () => {
    const plan = analyzeQuery('select', 'unknown_table');
    expect(plan.suggestions.length).toBeGreaterThan(0);
    expect(plan.suggestions[0]).toContain('No indexes found');
  });

  it('should flag vector search without ivfflat', () => {
    const plan = analyzeQuery('vector_search', 'decisions', ['embedding']);
    expect(plan.suggestions.some(s => s.includes('ivfflat'))).toBe(true);
  });

  it('should flag missing composite indexes', () => {
    const plan = analyzeQuery('select', 'events', ['type', 'timestamp', 'extra_col']);
    expect(plan.suggestions.some(s => s.includes('composite'))).toBe(true);
  });

  it('should return no suggestions for well-indexed query', () => {
    const plan = analyzeQuery('select', 'decisions', ['action_type']);
    expect(plan.suggestions.length).toBe(0);
  });

  it('should set hasIndex correctly', () => {
    const withIndex = analyzeQuery('select', 'decisions');
    expect(withIndex.hasIndex).toBe(true);

    const withoutIndex = analyzeQuery('select', 'phantom');
    expect(withoutIndex.hasIndex).toBe(false);
  });

  it('should handle vector_search type correctly', () => {
    const plan = analyzeQuery('vector_search', 'vectors', ['embedding']);
    expect(plan.type).toBe('vector_search');
    expect(plan.hasIndex).toBe(true);
  });

  it('should set indexColumns when indexes exist', () => {
    const plan = analyzeQuery('select', 'decisions');
    expect(plan.indexColumns).toBeDefined();
    expect(plan.indexColumns!.length).toBeGreaterThan(0);
  });

  it('should return empty indexColumns when no indexes', () => {
    const plan = analyzeQuery('select', 'phantom_table');
    expect(plan.indexColumns).toBeUndefined();
  });

  it('should set estimatedRows to 0', () => {
    const plan = analyzeQuery('select', 'decisions');
    expect(plan.estimatedRows).toBe(0);
  });
});

describe('optimizeQuery', () => {
  it('should add LIMIT 1000 to SELECT without limit', () => {
    const result = optimizeQuery('SELECT * FROM users');
    expect(result).toContain('LIMIT 1000');
  });

  it('should replace SELECT * with comment', () => {
    const result = optimizeQuery('SELECT * FROM users');
    expect(result).toContain('explicit columns recommended');
  });

  it('should not modify non-SELECT queries', () => {
    const result = optimizeQuery('DELETE FROM users');
    expect(result).toBe('DELETE FROM users');
  });

  it('should not add LIMIT if already present', () => {
    const result = optimizeQuery('SELECT name FROM users LIMIT 10');
    expect(result).not.toContain('LIMIT 1000');
  });

  it('should handle lowercase select', () => {
    const result = optimizeQuery('select * from users');
    expect(result).toContain('LIMIT 1000');
  });

  it('should preserve trailing semicolon', () => {
    const result = optimizeQuery('SELECT * FROM users;');
    expect(result).toContain('LIMIT 1000');
    expect(result).toMatch(/LIMIT 1000;?$/);
  });

  it('should generate plan for insert type', () => {
    const plan = analyzeQuery('insert', 'decisions');
    expect(plan.type).toBe('insert');
    expect(plan.table).toBe('decisions');
  });

  it('should generate plan for update type', () => {
    const plan = analyzeQuery('update', 'memory_entries');
    expect(plan.type).toBe('update');
    expect(plan.table).toBe('memory_entries');
  });

  it('should generate plan for delete type', () => {
    const plan = analyzeQuery('delete', 'events');
    expect(plan.type).toBe('delete');
    expect(plan.table).toBe('events');
  });
});
