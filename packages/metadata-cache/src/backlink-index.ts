import type { Backlink, MetadataEntry } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('backlink-index');

export class BacklinkIndex {
  private inbound = new Map<string, Backlink[]>();
  private outbound = new Map<string, string[]>();

  addLink(from: string, to: string, context?: string): void {
    let outLinks = this.outbound.get(from);
    if (!outLinks) {
      outLinks = [];
      this.outbound.set(from, outLinks);
    }
    if (!outLinks.includes(to)) {
      outLinks.push(to);
    }

    let inLinks = this.inbound.get(to);
    if (!inLinks) {
      inLinks = [];
      this.inbound.set(to, inLinks);
    }
    const exists = inLinks.some(b => b.from === from);
    if (!exists) {
      inLinks.push({ from, to, context });
    }
  }

  removeFile(path: string): void {
    const outLinks = this.outbound.get(path);
    if (outLinks) {
      for (const target of outLinks) {
        const inLinks = this.inbound.get(target);
        if (inLinks) {
          const idx = inLinks.findIndex(b => b.from === path);
          if (idx !== -1) inLinks.splice(idx, 1);
        }
      }
    }
    this.outbound.delete(path);
    this.inbound.delete(path);
    for (const [, inLinks] of this.inbound) {
      const idx = inLinks.findIndex(b => b.to === path);
      if (idx !== -1) inLinks.splice(idx, 1);
    }
  }

  getBacklinks(path: string): Backlink[] {
    return this.inbound.get(path) ?? [];
  }

  getOutboundLinks(path: string): string[] {
    return this.outbound.get(path) ?? [];
  }

  rebuild(entries: MetadataEntry[]): void {
    this.inbound.clear();
    this.outbound.clear();
    for (const entry of entries) {
      for (const link of entry.links) {
        this.addLink(entry.path, link);
      }
    }
  }

  stats(): { totalLinks: number; filesWithLinks: number } {
    const filesWithLinks = [...this.outbound].filter(([, links]) => links.length > 0).length;
    let totalLinks = 0;
    for (const [, links] of this.outbound) {
      totalLinks += links.length;
    }
    return { totalLinks, filesWithLinks };
  }
}
