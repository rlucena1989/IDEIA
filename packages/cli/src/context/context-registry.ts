import * as crypto from 'node:crypto';
import { OperationalContext } from './context-types';

export class ContextRegistry {
  private contexts: OperationalContext[] = [];

  register(context: OperationalContext): void {
    const index = this.contexts.findIndex(c => c.contextId === context.contextId);
    if (index >= 0) {
      this.contexts[index] = { ...context, updatedAt: new Date().toISOString() };
      return;
    }
    this.contexts.push(context);
  }

  createAndRegister(params: {
    name: string;
    type: OperationalContext['type'];
    status?: OperationalContext['status'];
    priority?: number;
    source: string;
    tags?: string[];
    dependencies?: string[];
    summary: string;
  }): OperationalContext {
    const context: OperationalContext = {
      contextId: crypto.randomUUID(),
      name: params.name,
      type: params.type,
      status: params.status ?? 'active',
      priority: params.priority ?? 5,
      source: params.source,
      tags: params.tags ?? [],
      dependencies: params.dependencies ?? [],
      summary: params.summary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.contexts.push(context);
    return context;
  }

  list(): OperationalContext[] {
    return [...this.contexts];
  }

  get(contextId: string): OperationalContext | undefined {
    return this.contexts.find(c => c.contextId === contextId);
  }

  filterByType(type: OperationalContext['type']): OperationalContext[] {
    return this.contexts.filter(c => c.type === type);
  }

  count(): number {
    return this.contexts.length;
  }
}
