"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('base-repo');
const PG_PLACEHOLDER = (i) => `$${i + 1}`;
const SQLITE_PLACEHOLDER = () => '?';
class BaseRepository {
    adapter;
    dbType;
    constructor(adapter, dbType = 'sqlite') {
        this.adapter = adapter;
        this.dbType = dbType;
    }
    ph(i) {
        return this.dbType === 'postgres' ? PG_PLACEHOLDER(i) : SQLITE_PLACEHOLDER();
    }
    param(value) {
        if (this.dbType === 'postgres')
            return value;
        if (typeof value === 'object' && value !== null)
            return JSON.stringify(value);
        return value;
    }
    supportsReturning() {
        return this.dbType === 'postgres';
    }
    now() {
        return this.dbType === 'postgres' ? 'NOW()' : "datetime('now')";
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=base-repo.js.map