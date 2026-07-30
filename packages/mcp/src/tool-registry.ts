import type { MCPTool } from './index';
import { createLogger } from '@ideia/logger';
const logger = createLogger('tool-registry');

export interface ToolRegistration {
  tool: MCPTool;
  source: string;
  registeredAt: string;
}

export class ToolRegistry {
  private tools: Map<string, ToolRegistration> = new Map();

  register(tool: MCPTool, source: string): void {
    this.tools.set(tool.name, { tool, source, registeredAt: new Date().toISOString() });
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): MCPTool | undefined {
    return this.tools.get(name)?.tool;
  }

  list(): MCPTool[] {
    return Array.from(this.tools.values()).map(r => r.tool);
  }

  search(query: string): MCPTool[] {
    const lower = query.toLowerCase();
    return Array.from(this.tools.values())
      .filter(r =>
        r.tool.name.toLowerCase().includes(lower) ||
        r.tool.description.toLowerCase().includes(lower)
      )
      .map(r => r.tool);
  }

  getBySource(source: string): MCPTool[] {
    return Array.from(this.tools.values())
      .filter(r => r.source === source)
      .map(r => r.tool);
  }

  getRegistrationInfo(name: string): ToolRegistration | undefined {
    return this.tools.get(name);
  }

  count(): number {
    return this.tools.size;
  }

  clear(): void {
    this.tools.clear();
  }
}

export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}
