export interface EdgeAgent { id: string; name: string; capabilities: string[]; status: 'idle' | 'running' | 'error'; lastHeartbeat: number }

export interface EdgeEvent { id: string; type: string; source: string; payload: unknown; priority: 'low' | 'normal' | 'high' | 'critical'; timestamp: number; ttl: number }

export interface SyncManifest { id: string; source: string; target: string; version: number; lastSync: number; conflicts: EdgeConflict[] }

export interface EdgeConflict { key: string; localValue: unknown; remoteValue: unknown; strategy: 'lww' | 'vector-clock' | 'merge' | 'manual'; resolved: boolean; resolvedAt?: number }

export interface EdgeModel { name: string; quantization: 'q4' | 'q8' | 'fp16'; sizeMb: number; status: 'available' | 'downloading' | 'error' }
