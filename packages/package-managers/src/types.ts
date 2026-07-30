export type PackageManager = 'npm' | 'pip' | 'cargo' | 'go'
export interface PackageDep { name: string; version: string; manager: PackageManager; dev: boolean }
export interface LockEntry { name: string; version: string; resolved: string; integrity: string; dependencies: Record<string, string> }
export interface AuditVuln { id: string; package: string; severity: string; fixAvailable: string }
export interface ResolutionResult { resolved: Record<string, string>; conflicts: string[]; tree: Record<string, string[]> }
