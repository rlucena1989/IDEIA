const PG_AVAILABLE = (() => {
  try { require('pg'); return true; } catch { return false; }
})();

const HAS_PG_URL = !!process.env.DATABASE_URL;

const describeOrSkip = (PG_AVAILABLE && HAS_PG_URL) ? describe : describe.skip;

describeOrSkip('PostgreSQL + pgvector E2E', () => {
  let pool: any;
  const TEST_TABLE = 'test_vectors';

  beforeAll(async () => {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
    await pool.query(`CREATE TABLE ${TEST_TABLE} (id SERIAL PRIMARY KEY, content TEXT, embedding vector(3))`);
  });

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
    await pool.end();
  });

  it('should insert and query vector data', async () => {
    await pool.query(
      `INSERT INTO ${TEST_TABLE} (content, embedding) VALUES ($1, $2)`,
      ['test document', '[0.1, 0.2, 0.3]']
    );
    const result = await pool.query(`SELECT * FROM ${TEST_TABLE}`);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].content).toBe('test document');
  });

  it('should perform vector similarity search', async () => {
    await pool.query(`INSERT INTO ${TEST_TABLE} (content, embedding) VALUES ($1, $2)`, ['apple', '[1, 0, 0]']);
    await pool.query(`INSERT INTO ${TEST_TABLE} (content, embedding) VALUES ($1, $2)`, ['orange', '[0.9, 0.1, 0]']);
    await pool.query(`INSERT INTO ${TEST_TABLE} (content, embedding) VALUES ($1, $2)`, ['car', '[0, 0, 1]']);

    const result = await pool.query(
      `SELECT content, embedding <-> '[1, 0, 0]'::vector AS distance FROM ${TEST_TABLE} ORDER BY distance LIMIT 2`
    );
    expect(result.rows[0].content).toBe('apple');
    expect(Number(result.rows[0].distance)).toBeLessThan(0.1);
  });

  it('should use cosine similarity via pgvector', async () => {
    const result = await pool.query(
      `SELECT content, 1 - (embedding <=> '[1, 0, 0]'::vector) AS similarity FROM ${TEST_TABLE} ORDER BY similarity DESC LIMIT 1`
    );
    expect(result.rows[0].content).toBe('apple');
    expect(Number(result.rows[0].similarity)).toBeGreaterThan(0.9);
  });

  it('should create and use ivfflat index', async () => {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_test_vectors ON ${TEST_TABLE} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 1)`);
    const idxResult = await pool.query(`SELECT indexname FROM pg_indexes WHERE tablename = '${TEST_TABLE}'`);
    expect(idxResult.rows.some((r: any) => r.indexname === 'idx_test_vectors')).toBe(true);
  });
});
