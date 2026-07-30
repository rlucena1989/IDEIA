import { createLogger } from '@ideia/logger'
import { AgentMemoryEntry, AgentMemoryProfile, MemoryConsolidation, CrossAgentMemory } from './types'

const logger = createLogger('agent-memory')

export class AgentMemoryManager {
  private entries = new Map<string, AgentMemoryEntry>()

  store(entry: AgentMemoryEntry): void {
    this.entries.set(entry.id, entry)
    logger.info(`Memory stored`, { agentId: entry.agentId, key: entry.key })
  }

  retrieve(agentId: string, key: string): AgentMemoryEntry | undefined {
    const entry = [...this.entries.values()].find(e => e.agentId === agentId && e.key === key)
    if (entry) entry.lastAccessed = new Date().toISOString()
    return entry
  }

  getByAgent(agentId: string): AgentMemoryEntry[] {
    return [...this.entries.values()].filter(e => e.agentId === agentId)
  }

  getProfile(agentId: string): AgentMemoryProfile {
    const agentEntries = this.getByAgent(agentId)
    const totalSize = agentEntries.reduce((s, e) => s + JSON.stringify(e.value).length, 0)
    return {
      agentId,
      totalEntries: agentEntries.length,
      totalSize,
      avgImportance: agentEntries.length > 0 ? Math.round(agentEntries.reduce((s, e) => s + e.importance, 0) / agentEntries.length * 10) / 10 : 0,
      topKeys: agentEntries.sort((a, b) => b.importance - a.importance).slice(0, 5).map(e => e.key),
      lastConsolidation: new Date().toISOString(),
    }
  }

  consolidate(agentId: string): MemoryConsolidation {
    const before = this.getByAgent(agentId)
    const removed: string[] = []
    const now = Date.now()

    for (const entry of before) {
      const age = (now - new Date(entry.createdAt).getTime()) / 1000
      if (entry.importance < 3 && age > entry.ttl) {
        this.entries.delete(entry.id)
        removed.push(entry.key)
      }
    }

    return { agentId, entriesBefore: before.length, entriesAfter: before.length - removed.length, removed, merged: [] }
  }

  share(sourceAgent: string, targetAgent: string, keys: string[]): CrossAgentMemory {
    for (const key of keys) {
      const entry = this.retrieve(sourceAgent, key)
      if (entry) {
        this.store({ ...entry, id: `${targetAgent}-${key}`, agentId: targetAgent })
      }
    }
    return { sourceAgent, targetAgent, sharedKeys: keys, lastSync: new Date().toISOString() }
  }
}
