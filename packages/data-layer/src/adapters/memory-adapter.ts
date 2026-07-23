import { DatabaseAdapter, DataLayerConfig, Migration, QueryResult } from '../types';

export class MemoryAdapter implements DatabaseAdapter {
  private connected = false;
  private tables = new Map<string, { columns: string[]; rows: Map<string, unknown>[] }>();

  async connect(_config: DataLayerConfig): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.tables.clear();
    this.connected = false;
  }

  async query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (!this.connected) throw new Error('Not connected');
    const start = Date.now();
    const trimmed = sql.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH') || trimmed.startsWith('PRAGMA');

    if (isSelect) {
      const rows = this.simulateSelect<T>(sql, params);
      return { rows, rowCount: rows.length, durationMs: Date.now() - start };
    }

    if (trimmed.startsWith('CREATE TABLE')) {
      const name = this.extractTableName(sql);
      if (!this.tables.has(name)) this.tables.set(name, { columns: ['id'], rows: [] });
      return { rows: [], rowCount: 0, durationMs: Date.now() - start };
    }

    if (trimmed.startsWith('INSERT')) {
      const name = this.extractTableName(sql);
      const table = this.tables.get(name);
      if (table) {
        const row = new Map<string, unknown>();
        const values = params || [];
        const cols = this.extractColumns(sql);
        const hasOnConflict = sql.includes('ON CONFLICT');
        let keyCol = '';
        let keyIdx = -1;
        if (hasOnConflict) {
          const kcMatch = sql.match(/ON CONFLICT\s*\((\w+)\)/i);
          if (kcMatch) {
            keyCol = kcMatch[1];
            keyIdx = cols.indexOf(keyCol);
          }
        }
        cols.forEach((col, i) => row.set(col, values[i] ?? null));
        if (hasOnConflict && keyIdx >= 0) {
          const keyVal = values[keyIdx];
          if (keyVal !== undefined && keyVal !== null) {
            const existingIdx = table.rows.findIndex(r => Object.fromEntries(r)[keyCol] === keyVal);
            if (existingIdx >= 0) {
              for (const [k, v] of row) {
                if (k !== keyCol) table.rows[existingIdx].set(k, v);
              }
              return { rows: [], rowCount: 1, durationMs: Date.now() - start };
            }
          }
        }
        table.rows.push(row);
      }
      return { rows: [], rowCount: 1, durationMs: Date.now() - start };
    }

    if (trimmed.startsWith('CREATE INDEX')) {
      return { rows: [], rowCount: 0, durationMs: Date.now() - start };
    }

    if (trimmed.startsWith('UPDATE')) {
      const name = this.extractTableName(sql);
      const table = this.tables.get(name);
      if (table) {
        const setMatch = sql.match(/SET\s+(.+?)(?:WHERE|$)/i);
        if (setMatch) {
          const setClauses = setMatch[1].split(',').map(s => s.trim());
          const whereMatch = sql.match(/WHERE\s+(.+?)$/i);
          let paramIndex = 0;
          for (const row of table.rows) {
            const rowObj = Object.fromEntries(row);
            let matched = true;
            if (whereMatch) {
              const wc = whereMatch[1].trim();
              const wm = wc.match(/^(\w+)\s*=\s*(.+)$/i);
              if (wm) {
                const col = wm[1];
                const rhs = wm[2].replace(/['"]/g, '');
                if (rhs === '?' || /^$\d+$/.test(rhs)) {
                  const paramVal = params ? params[paramIndex++] : undefined;
                  matched = String(rowObj[col]) === String(paramVal);
                } else {
                  matched = String(rowObj[col]) === rhs;
                }
              }
            }
            if (!matched) continue;
            for (const clause of setClauses) {
              const sm = clause.match(/^(\w+)\s*=\s*(.+)$/i);
              if (sm) {
                let val: unknown = sm[2].replace(/^['"]|['"]$/g, '');
                if (val === 'datetime(\'now\')' || val === 'NOW()') val = new Date().toISOString();
                row.set(sm[1], val);
              }
            }
          }
        }
      }
      return { rows: [], rowCount: 1, durationMs: Date.now() - start };
    }

    if (trimmed.startsWith('DELETE')) {
      const name = this.extractTableName(sql);
      const table = this.tables.get(name);
      if (table) {
        const whereMatch = sql.match(/WHERE\s+(.+?)$/i);
        if (whereMatch && params && params.length > 0) {
          const wm = whereMatch[1].match(/^(\w+)\s*(<|>|=|LIKE)\s*(\?|$\d+)/i);
          if (wm) {
            const col = wm[1];
            const val = params[0];
            table.rows = table.rows.filter(row => String(Object.fromEntries(row)[col]) !== String(val));
          }
        } else {
          table.rows = [];
        }
      }
      return { rows: [], rowCount: 1, durationMs: Date.now() - start };
    }

    return { rows: [], rowCount: 0, durationMs: Date.now() - start };
  }

  async migrate(migrations: Migration[]): Promise<void> {
    for (const m of migrations) {
      if (!m.up || m.up.trim().startsWith('--')) continue;
      for (const stmt of m.up.split(';').filter(s => s.trim().length > 0)) {
        await this.query(stmt);
      }
    }
  }

  isConnected(): boolean { return this.connected; }

  get supportsPgVectors(): boolean { return false; }

  private extractTableName(sql: string): string {
    const trimmed = sql.trim();
    if (/^CREATE\s+TABLE/i.test(trimmed)) {
      const m = trimmed.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      return m?.[1] || 'unknown';
    }
    if (/^UPDATE\s+/i.test(trimmed)) {
      const m = trimmed.match(/^UPDATE\s+(\w+)/i);
      return m?.[1] || 'unknown';
    }
    const m = trimmed.match(/ (?:TABLE|INTO|FROM)\s+(\w+)/i);
    return m?.[1] || 'unknown';
  }

  private extractColumns(sql: string): string[] {
    const parenStack: string[] = [];
    let depth = 0;
    let current = '';
    for (let i = 0; i < sql.length; i++) {
      const ch = sql[i];
      if (ch === '(') { depth++; if (depth === 1) { current = ''; continue; } }
      if (ch === ')') { depth--; if (depth === 0) { parenStack.push(current); continue; } }
      if (depth === 1) current += ch;
    }
    const insertParen = parenStack.find(p => /^\s*\w/.test(p));
    if (!insertParen) return ['id'];
    return insertParen.split(',').map(c => c.trim().split(/\s+/)[0].replace(/["']/g, ''));
  }

  private simulateSelect<T>(sql: string, params?: unknown[]): T[] {
    const isCount = /COUNT\s*\(\*/i.test(sql);
    const hasGroupBy = /GROUP\s+BY/i.test(sql);

    if (isCount && !hasGroupBy) {
      const tableName = this.extractTableName(sql);
      const table = this.tables.get(tableName);
      if (!table) return [{ count: 0 }] as T[];
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:GROUP BY|ORDER BY|LIMIT|$)/is);
      if (whereMatch && params && params.length > 0) {
        const wm = whereMatch[1].match(/^(\w+)\s*=\s*['"]?(.+?)['"]?$/i);
        if (wm) {
          const col = wm[1];
          const val = wm[2].replace(/['"]/g, '');
          const count = table.rows.filter(r => String(Object.fromEntries(r)[col]) === val).length;
          return [{ count }] as T[];
        }
      }
      return [{ count: table.rows.length }] as T[];
    }

    if (isCount && hasGroupBy) {
      const tableName = this.extractTableName(sql);
      const table = this.tables.get(tableName);
      if (!table) return [];
      const groupColMatch = sql.match(/GROUP\s+BY\s+(\w+)/i);
      if (!groupColMatch) return [];
      const groupCol = groupColMatch[1];
      const countColMatch = sql.match(/COUNT\s*\(\s*\*?\s*\)\s+(?:as\s+)?(\w+)/is);
      const countAlias = countColMatch ? countColMatch[1] : 'count';
      const selectColMatch = sql.match(/SELECT\s+(\w+)/i);
      const selectCol = selectColMatch ? selectColMatch[1] : groupCol;
      const grouped = new Map<string, number>();
      for (const row of table.rows) {
        const val = String(Object.fromEntries(row)[selectCol] ?? '');
        grouped.set(val, (grouped.get(val) || 0) + 1);
      }
      return Array.from(grouped.entries()).map(([key, cnt]) => ({
        [selectCol]: key, [countAlias]: cnt,
      })) as T[];
    }

    const tableName = this.extractTableName(sql);
    const table = this.tables.get(tableName);
    if (!table) return [];

    const columnAliases = this.extractColumnAliases(sql);
    let rows = [...table.rows];

    const whereClause = sql.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|$)/is);
    if (whereClause && params && params.length > 0) {
      rows = rows.filter(row => {
        const rowObj = Object.fromEntries(row);
        const conditions = whereClause[1].split(/\s+AND\s+/i);
        return conditions.every((cond, ci) => {
          const match = cond.trim().match(/^(\w+)\s*(=|LIKE|>=|<=)\s*(\?|$\d+)/i);
          if (!match) return true;
          const col = match[1];
          const val = params?.[ci];
          const rowVal = rowObj[col];
          if (rowVal === undefined) return val === null || val === undefined;
          if (match[2] === 'LIKE') {
            const pattern = String(val).replace(/%/g, '.*').replace(/_/g, '.');
            return new RegExp(`^${pattern}$`, 'i').test(String(rowVal));
          }
          return String(rowVal) === String(val);
        });
      });
    }

    if (sql.includes('ORDER BY') && sql.includes('DESC')) {
      rows = [...rows].reverse();
    }

    if (sql.includes('LIMIT')) {
      const limitMatch = sql.match(/LIMIT\s+(\d+|\?|$\d+)/i);
      let limit = 10;
      if (limitMatch) {
        const limRef = limitMatch[1];
        if (limRef === '?' || /^$\d+$/.test(limRef)) {
          const paramIdx = params ? params.length - (sql.includes('OFFSET') ? 2 : 1) : -1;
          if (paramIdx >= 0 && params) limit = Number(params[paramIdx]) || 10;
        } else {
          limit = parseInt(limRef, 10);
        }
      }
      if (sql.includes('OFFSET')) {
        const offsetMatch = sql.match(/OFFSET\s+(\d+|\?|$\d+)/i);
        if (offsetMatch) {
          const offsetRef = offsetMatch[1];
          let offset = 0;
          if (offsetRef === '?' || /^$\d+$/.test(offsetRef)) {
            if (params) offset = Number(params[params.length - 1]) || 0;
          } else {
            offset = parseInt(offsetRef, 10);
          }
          rows = rows.slice(offset, offset + limit);
        }
      } else {
        rows = rows.slice(0, limit);
      }
    }

    return rows.map(r => {
      const obj = Object.fromEntries(r);
      const aliased: Record<string, unknown> = {};
      for (const [col, alias] of Object.entries(columnAliases)) {
        aliased[alias] = obj[col];
      }
      return (Object.keys(columnAliases).length > 0 ? aliased : obj)  as T;
    });
  }

  private extractColumnAliases(sql: string): Record<string, string> {
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
    if (!selectMatch) return {};
    const cols = selectMatch[1].split(',');
    const aliases: Record<string, string> = {};
    for (const col of cols) {
      const m = col.trim().match(/(\w+)\s+(?:as\s+)?["']?(\w+)["']?/i);
      if (m) {
        aliases[m[1]] = m[2];
      }
    }
    return aliases;
  }
}
