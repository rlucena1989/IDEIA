import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { execFile } from 'child_process';
import { createLogger } from '@ideia/logger';

const log = createLogger('duckdb-analytics');

export class DuckDbAnalytics {
  private dbPath: string;

  constructor(dbPath = '.ai/analytics/ideia.duckdb') {
    this.dbPath = resolve(dbPath);
  }

  query(sql: string, params: unknown[] = []): Promise<unknown[]> {
    const dir = dirname(this.dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    return new Promise((resolvePromise) => {
      const safeSql = sql.replace(/$(\d+)/g, () => '?');
      const paramsJson = JSON.stringify(params);
      const script = [
        `const d = require('duckdb');`,
        `const db = new d.Database(${JSON.stringify(this.dbPath)});`,
        `const params = ${paramsJson};`,
        `db.all(${JSON.stringify(safeSql)}, ...params, (e, r) => {`,
        `  if (e) { console.error(e.message); process.exit(1); }`,
        `  console.log(JSON.stringify(r || []));`,
        `});`,
      ].join('\n');

      execFile('node', ['-e', script], {
        timeout: 10000,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      }, (err, stdout) => {
        if (err) {
          log.error('Query failed', { sql: sql.slice(0, 100), error: err.message });
          resolvePromise([]);
          return;
        }
        try {
          resolvePromise(JSON.parse(stdout.trim() || '[]'));
        } catch {
          resolvePromise([]);
        }
      });
    });
  }

  async recordMetric(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    await this.query(
      `CREATE TABLE IF NOT EXISTS metrics (name VARCHAR, value DOUBLE, tags JSON, ts TIMESTAMP DEFAULT now())`
    );
    await this.query(
      `INSERT INTO metrics (name, value, tags) VALUES ($1, $2, $3::json)`,
      [name, value, JSON.stringify(tags || {})]
    );
  }

  async getMetrics(name: string, since?: string): Promise<unknown[]> {
    if (since) {
      return this.query(
        `SELECT * FROM metrics WHERE name = $1 AND ts >= $2::timestamp ORDER BY ts DESC LIMIT 100`,
        [name, since]
      );
    }
    return this.query(
      `SELECT * FROM metrics WHERE name = $1 ORDER BY ts DESC LIMIT 100`,
      [name]
    );
  }

  getTopSlowQueries(_limit = 10): unknown[] {
    return [];
  }

  getCoverageTrend(_days = 30): unknown[] {
    return [];
  }
}
