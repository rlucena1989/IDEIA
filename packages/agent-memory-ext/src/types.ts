export interface AgentMemoryEntry { id: string; agentId: string; key: string; value: unknown; importance: number; ttl: number; createdAt: string; lastAccessed: string }
export interface AgentMemoryProfile { agentId: string; totalEntries: number; totalSize: number; avgImportance: number; topKeys: string[]; lastConsolidation: string }
export interface MemoryConsolidation { agentId: string; entriesBefore: number; entriesAfter: number; removed: string[]; merged: string[] }
export interface CrossAgentMemory { sourceAgent: string; targetAgent: string; sharedKeys: string[]; lastSync: string }
