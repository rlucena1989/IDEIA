import { DiscoveryRegistry } from './registry';
import { Tool, ToolCall, ToolResult, ToolHandler } from './types';

export class ToolExecutor {
  private auditLog: ToolResult[] = [];
  private maxLogSize: number;

  constructor(private registry: DiscoveryRegistry, options: { maxLogSize?: number } = {}) {
    this.maxLogSize = options.maxLogSize ?? 1000;
  }

  async execute(call: ToolCall): Promise<ToolResult> {
    const start = Date.now();
    const tool = this.registry.getTool(call.toolId);
    if (!tool) {
      return this.logResult({
        success: false, toolId: call.toolId,
        error: `Tool not found: ${call.toolId}`,
        duration: Date.now() - start,
      });
    }

    const handler = this.registry.getHandler(call.toolId);
    if (!handler) {
      return this.logResult({
        success: false, toolId: call.toolId,
        error: `No handler for tool: ${call.toolId}`,
        duration: Date.now() - start,
      });
    }

    try {
      const data = await handler(call.params);
      return this.logResult({
        success: true, toolId: call.toolId, data,
        duration: Date.now() - start,
      });
    } catch (_err) {
      return this.logResult({
        success: false, toolId: call.toolId,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - start,
      });
    }
  }

  getAuditLog(): ToolResult[] {
    return [...this.auditLog];
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }

  private logResult(result: ToolResult): ToolResult {
    this.auditLog.push(result);
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog.shift();
    }
    return result;
  }
}
