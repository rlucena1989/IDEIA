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
exports.PgAdapter = void 0;
class PgAdapter {
    pool = null;
    connected = false;
    async connect(config) {
        try {
            const { Pool } = await Promise.resolve().then(() => __importStar(require('pg')));
            this.pool = new Pool({
                host: config.host || 'localhost',
                port: config.port || 5432,
                database: config.database || 'ideia',
                user: config.user || 'ideia',
                password: config.password || 'ideia',
                max: config.maxConnections || 10,
            });
            const client = await this.pool.connect();
            client.release();
            this.connected = true;
        }
        catch {
            throw new Error('PostgreSQL not available. Install pg package or use sqlite adapter.');
        }
    }
    async disconnect() {
        if (this.pool)
            await this.pool.end();
        this.connected = false;
    }
    async query(sql, params) {
        if (!this.pool || !this.connected)
            throw new Error('Not connected');
        const start = Date.now();
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, params);
            return { rows: result.rows, rowCount: result.rowCount, durationMs: Date.now() - start };
        }
        finally {
            client.release();
        }
    }
    async migrate(migrations) {
        await this.query(`CREATE TABLE IF NOT EXISTS ideia_migrations (version INT PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ DEFAULT NOW())`);
        for (const m of migrations) {
            const existing = await this.query('SELECT version FROM ideia_migrations WHERE version = $1', [m.version]);
            if (existing.rows.length > 0)
                continue;
            await this.query(m.up);
            await this.query('INSERT INTO ideia_migrations (version, name) VALUES ($1, $2)', [m.version, m.name]);
        }
    }
    isConnected() { return this.connected; }
}
exports.PgAdapter = PgAdapter;
//# sourceMappingURL=pg-adapter.js.map