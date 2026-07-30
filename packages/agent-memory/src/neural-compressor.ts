import { MemoryEntry, CompressedMemory } from './types'

export class NeuralMemoryCompressor {
  compress(entries: MemoryEntry[], targetRatio = 0.5): CompressedMemory {
    const originalSize = entries.length
    const targetSize = Math.max(1, Math.floor(originalSize * (1 - targetRatio)))
    const sorted = entries.filter(e => e.status === 'active').sort((a, b) => b.importance - a.importance)
    const compressed = sorted.slice(0, targetSize)
    const archivedEntries = sorted.slice(targetSize).map(e => ({ ...e, status: 'archived' as const }))
    return { originalLength: originalSize, compressedLength: compressed.length, ratio: 1 - targetRatio, summary: `Compressed ${originalSize} to ${compressed.length} entries`, signature: '', entries: compressed, archived: archivedEntries } as CompressedMemory
  }

  decompress(compressed: CompressedMemory, archive: MemoryEntry[]): MemoryEntry[] {
    const merged = [...(compressed.entries ?? []), ...archive]
    return merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }
}
