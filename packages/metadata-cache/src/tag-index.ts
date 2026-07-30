import type { MetadataEntry, TagGroup } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('tag-index');

export class TagIndex {
  private tagMap = new Map<string, Set<string>>();
  private fileTags = new Map<string, string[]>();

  index(entries: MetadataEntry[]): void {
    this.tagMap.clear();
    this.fileTags.clear();

    for (const entry of entries) {
      this.fileTags.set(entry.path, [...entry.tags]);
      for (const tag of entry.tags) {
        const normalized = tag.toLowerCase().trim();
        if (!this.tagMap.has(normalized)) {
          this.tagMap.set(normalized, new Set());
        }
        this.tagMap.get(normalized)?.add(entry.path);
      }
    }
  }

  getTagGroups(): TagGroup[] {
    const groups: TagGroup[] = [];
    for (const [tag, files] of this.tagMap) {
      groups.push({ tag, count: files.size, files: [...files] });
    }
    return groups.sort((a, b) => b.count - a.count);
  }

  getFilesByTag(tag: string): string[] {
    const normalized = tag.toLowerCase().trim();
    const files = this.tagMap.get(normalized);
    return files ? [...files] : [];
  }

  getRelatedTags(tag: string): TagGroup[] {
    const normalized = tag.toLowerCase().trim();
    const files = this.tagMap.get(normalized);
    if (!files || files.size === 0) return [];

    const coOccurrences = new Map<string, Set<string>>();
    for (const file of files) {
      const tags = this.fileTags.get(file) ?? [];
      for (const t of tags) {
        const tn = t.toLowerCase().trim();
        if (tn === normalized) continue;
        if (!coOccurrences.has(tn)) {
          coOccurrences.set(tn, new Set());
        }
        coOccurrences.get(tn)?.add(file);
      }
    }

    return [...coOccurrences.entries()]
      .map(([t, fs]) => ({ tag: t, count: fs.size, files: [...fs] }))
      .sort((a, b) => b.count - a.count);
  }

  searchTags(query: string): TagGroup[] {
    const q = query.toLowerCase().trim();
    const results: TagGroup[] = [];
    for (const [tag, files] of this.tagMap) {
      if (tag.includes(q)) {
        results.push({ tag, count: files.size, files: [...files] });
      }
    }
    return results.sort((a, b) => b.count - a.count);
  }
}
