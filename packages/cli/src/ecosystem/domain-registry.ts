import { DomainNode } from './ecosystem-types';

export class DomainRegistry {
  private domains: DomainNode[] = [];

  upsert(domain: DomainNode): void {
    const index = this.domains.findIndex(d => d.domainId === domain.domainId);
    if (index >= 0) {
      this.domains[index] = domain;
    } else {
      this.domains.push(domain);
    }
  }

  get(domainId: string): DomainNode | undefined {
    return this.domains.find(d => d.domainId === domainId);
  }

  list(): DomainNode[] {
    return [...this.domains];
  }

  remove(domainId: string): void {
    this.domains = this.domains.filter(d => d.domainId !== domainId);
  }

  count(): number {
    return this.domains.length;
  }
}
