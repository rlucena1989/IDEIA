import { DatabaseAdapter } from '../types';
export type DbType = 'postgres' | 'sqlite';
export declare abstract class BaseRepository {
    protected adapter: DatabaseAdapter;
    protected dbType: DbType;
    constructor(adapter: DatabaseAdapter, dbType?: DbType);
    protected ph(i: number): string;
    protected param(value: unknown): unknown;
    protected supportsReturning(): boolean;
    protected now(): string;
}
//# sourceMappingURL=base-repo.d.ts.map