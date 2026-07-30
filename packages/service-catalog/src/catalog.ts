import { ServiceDefinition } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('catalog');

export class ServiceCatalog {
  private services: Map<string, ServiceDefinition> = new Map();

  register(service: ServiceDefinition): void { this.services.set(service.id, service); }

  get(id: string): ServiceDefinition | undefined { return this.services.get(id); }

  list(): ServiceDefinition[] { return Array.from(this.services.values()); }

  search(query: string): ServiceDefinition[] {
    const q = query.toLowerCase();
    return Array.from(this.services.values()).filter(s =>
      s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  filter(criteria: Partial<ServiceDefinition>): ServiceDefinition[] {
    return Array.from(this.services.values()).filter(s =>
      Object.entries(criteria).every(([key, value]) => (s as unknown as Record<string, unknown>)[key] === value)
    );
  }

  count(): number { return this.services.size; }

  getByOwner(owner: string): ServiceDefinition[] { return Array.from(this.services.values()).filter(s => s.owner === owner); }

  getStats(): { total: number; active: number; deprecated: number; planned: number; languages: number } {
    const list = Array.from(this.services.values());
    return {
      total: list.length,
      active: list.filter(s => s.status === 'active').length,
      deprecated: list.filter(s => s.status === 'deprecated').length,
      planned: list.filter(s => s.status === 'planned').length,
      languages: new Set(list.map(s => s.language)).size,
    };
  }
}
