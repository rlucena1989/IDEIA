"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteAdapter = void 0;
class SqliteAdapter {
    db = null;
    connected = false;
    async connect(config) {
        try {
            const mod = await Promise.resolve().then(() => __importStar(require('better-sqlite3')));
            const Database = mod.default || mod;
            this.db = new Database(config.sqlitePath || ':memory:');
            this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
            this.connected = true;
        }
        catch {
            throw new Error('SQLite not available. Install better-sqlite3 or provide a custom adapter.');
        }
    }
    async disconnect() {
        if (this.db)
            this.db.close();
        this.connected = false;
    }
    async query(sql, params) {
        if (!this.db || !this.connected)
            throw new Error('Not connected');
        const start = Date.now();
        const trimmed = sql.trim();
        if (trimmed.includes(';\n') || trimmed.endsWith(';')) {
            this.db.exec(trimmed);
            return { rows: [], rowCount: 0, durationMs: Date.now() - start };
        }
        if (/^(SELECT|WITH|PRAGMA)\b/i.test(trimmed)) {
            const rows = this.db.prepare(sql).all(...(params || []));
            return { rows, rowCount: rows.length, durationMs: Date.now() - start };
        }
        this.db.prepare(sql).run(...(params || []));
        return { rows: [], rowCount: 0, durationMs: Date.now() - start };
    }
    async migrate(migrations) {
        if (!this.db)
            return;
        this.db.exec(`CREATE TABLE IF NOT EXISTS ideia_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT DEFAULT (datetime('now')))`);
        for (const m of migrations) {
            if (!m.up || m.up.trim().startsWith('--'))
                continue;
            const existing = this.db.prepare('SELECT version FROM ideia_migrations WHERE version = ?').get(m.version);
            if (existing)
                continue;
            this.db.exec(m.up);
            this.db.prepare('INSERT INTO ideia_migrations (version, name) VALUES (?, ?)').run(m.version, m.name);
        }
    }
    isConnected() { return this.connected; }
}
exports.SqliteAdapter = SqliteAdapter;
//# sourceMappingURL=sqlite-adapter.js.map