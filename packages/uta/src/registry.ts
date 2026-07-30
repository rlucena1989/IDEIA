import { Tool, ToolHandler } from './types';
import { createLogger } from '@ideia/logger';

export class DiscoveryRegistry {
  private tools: Map<string, { tool: Tool; handler: ToolHandler }> = new Map();

  register(tool: Tool, handler: ToolHandler): void {
    this.tools.set(tool.id, { tool, handler });
  }

  unregister(toolId: string): void {
    this.tools.delete(toolId);
  }

  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId)?.tool;
  }

  getHandler(toolId: string): ToolHandler | undefined {
    return this.tools.get(toolId)?.handler;
  }

  listTools(category?: string): Tool[] {
    const all = [...this.tools.values()].map(t => t.tool);
    return category ? all.filter(t => t.category === category) : all;
  }

  search(query: string): Tool[] {
    const lower = query.toLowerCase();
    return [...this.tools.values()]
      .map(t => t.tool)
      .filter(t =>
        t.name.toLowerCase().includes(lower) ||
        t.description.toLowerCase().includes(lower) ||
        t.category.toLowerCase().includes(lower)
      );
  }

  count(): number {
    return this.tools.size;
  }
}

export function createRegistry(): DiscoveryRegistry {
  return new DiscoveryRegistry();
}
