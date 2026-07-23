export interface ContextSource { name: string; path: string; lastUpdated: string; hash: string; size: number; }
export interface ContextValidation { source: string; valid: boolean; age: number; rawAge: number; hashMatch: boolean; issues: string[]; }
export interface TrustReport { total: number; valid: number; invalid: number; stale: number; validations: ContextValidation[]; score: number; }
