export { DataLayer, createDataLayer } from './data-layer';
export { VectorStore } from './vector-store';
export { DecisionRepository } from './repositories/decision-repo';
export { SessionRepository } from './repositories/session-repo';
export { AuditRepository } from './repositories/audit-repo';
export { VectorRepository } from './repositories/vector-repo';
export { MemoryPgAdapter } from './memory-pg-adapter';
export { AuditPgAdapter } from './audit-pg-adapter';
export { PostgresBackup, createPostgresBackup } from './backup';
export type { DataLayerConfig, Migration, QueryResult, DatabaseAdapter } from './types';
export type { DecisionRecord, DecisionQuery } from './repositories/decision-repo';
export type { SessionRecord } from './repositories/session-repo';
export type { AuditRecord, AuditQuery } from './repositories/audit-repo';
export type { VectorRecord, VectorSearchResult } from './repositories/vector-repo';
export type { MemoryRow } from './memory-pg-adapter';
export type { BackupConfig, BackupResult } from './backup';
//# sourceMappingURL=index.d.ts.map