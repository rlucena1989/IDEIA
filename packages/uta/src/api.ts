import { DiscoveryRegistry, createRegistry } from './registry';
import { ToolExecutor } from './executor';
import { Tool, ToolCall } from './types';

export class UTApi {
  registry: DiscoveryRegistry;
  executor: ToolExecutor;

  constructor() {
    this.registry = createRegistry();
    this.executor = new ToolExecutor(this.registry);
  }

  async execute(call: ToolCall) {
    return this.executor.execute(call);
  }

  discover(category?: string) {
    return this.registry.listTools(category);
  }

  search(query: string) {
    return this.registry.search(query);
  }

  getAuditLog() {
    return this.executor.getAuditLog();
  }
}

export function createUTApi(): UTApi {
  return new UTApi();
}
