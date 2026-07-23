import type { ICapabilityRegistry } from './registry.interface';
import type { Capability, CapabilityQuery, RegistryEvent } from '../types/capability';

export class CapabilityRegistryService implements ICapabilityRegistry {
  private store: Map<string, Capability> = new Map();
  private cache: Map<string, { cap: Capability; ts: number }> = new Map();
  private listeners: Array<(event: RegistryEvent) => void> = [];
  private readonly CACHE_TTL = 60_000;

  async register(cap: Capability): Promise<RegistryEvent> {
    const existing = this.store.get(cap.id);
    if (existing) return this.update(cap.id, cap);
    this.store.set(cap.id, { ...cap, createdAt: cap.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
    const event: RegistryEvent = { type: 'registered', capability: cap, timestamp: new Date().toISOString() };
    this.emit(event);
    return event;
  }

  async get(id: string): Promise<Capability | null> {
    const cached = this.cache.get(id);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) return cached.cap;
    const cap = this.store.get(id) || null;
    if (cap) this.cache.set(id, { cap, ts: Date.now() });
    return cap;
  }

  async update(id: string, partial: Partial<Capability>): Promise<RegistryEvent> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Capability ${id} not found`);
    const updated: Capability = { ...existing, ...partial, updatedAt: new Date().toISOString() };
    this.store.set(id, updated);
    this.cache.delete(id);
    const event: RegistryEvent = { type: 'updated', capability: updated, timestamp: updated.updatedAt };
    this.emit(event);
    return event;
  }

  async remove(id: string): Promise<void> {
    this.store.delete(id);
    this.cache.delete(id);
    this.emit({ type: 'removed', capability: { id } as Capability, timestamp: new Date().toISOString() });
  }

  async list(query?: CapabilityQuery): Promise<Capability[]> {
    let caps = Array.from(this.store.values());
    if (query) {
      if (query.category) caps = caps.filter(c => c.category === query.category);
      if (query.subcategory) caps = caps.filter(c => c.subcategory === query.subcategory);
      if (query.status) caps = caps.filter(c => c.status === query.status);
      if (query.tags?.length) caps = caps.filter(c => query.tags.some(t => c.tags.includes(t)));
    }
    return caps;
  }

  async count(query?: CapabilityQuery): Promise<number> {
    const list = await this.list(query);
    return list.length;
  }

  async search(text: string, limit = 20): Promise<Capability[]> {
    const q = text.toLowerCase();
    const caps = Array.from(this.store.values()).filter(c =>
      c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q))
    );
    return caps.slice(0, limit);
  }

  async searchByTags(tags: string[], mode: 'any' | 'all' = 'any'): Promise<Capability[]> {
    return Array.from(this.store.values()).filter(cap => {
      const capTags = new Set(cap.tags);
      return mode === 'all' ? tags.every(t => capTags.has(t)) : tags.some(t => capTags.has(t));
    });
  }

  async searchByCategory(cat: string): Promise<Capability[]> {
    return Array.from(this.store.values()).filter(c => c.category === cat);
  }

  async invalidate(id: string): Promise<void> { this.cache.delete(id); }
  async invalidateAll(): Promise<void> { this.cache.clear(); }
  onEvent(handler: (event: RegistryEvent) => void): void { this.listeners.push(handler); }

  private emit(event: RegistryEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch { }
    }
  }
}
