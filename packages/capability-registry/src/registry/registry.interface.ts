import type { Capability, CapabilityQuery, RegistryEvent } from '../types/capability';
import { createLogger } from '@ideia/logger';
const logger = createLogger('registry.interface');

export interface ICapabilityRegistry {
  register(cap: Capability): Promise<RegistryEvent>;
  get(id: string): Promise<Capability | null>;
  update(id: string, partial: Partial<Capability>): Promise<RegistryEvent>;
  remove(id: string): Promise<void>;
  list(query?: CapabilityQuery): Promise<Capability[]>;
  count(query?: CapabilityQuery): Promise<number>;
  search(text: string, limit?: number): Promise<Capability[]>;
  searchByTags(tags: string[], mode?: 'any' | 'all'): Promise<Capability[]>;
  searchByCategory(cat: string): Promise<Capability[]>;
  invalidate(id: string): Promise<void>;
  invalidateAll(): Promise<void>;
  onEvent(handler: (event: RegistryEvent) => void): void;
}
