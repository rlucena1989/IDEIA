import { Hook, HookEvent, HookAction } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('hook-engine');

export type HookHandler = (hook: Hook, context: HookContext) => Promise<HookResult>

export interface HookContext {
  event: HookEvent
  toolType?: string
  filePath?: string
  projectPath: string
  metadata: Record<string, unknown>
}

export interface HookResult {
  passed: boolean
  message: string
  details?: string
  durationMs: number
}

export class HookEngine {
  private hooks: Hook[] = []
  private handlers: Map<HookAction, HookHandler> = new Map()

  register(hook: Hook): void {
    this.hooks = this.hooks.filter(h => h.name !== hook.name)
    this.hooks.push(hook)
  }

  unregister(name: string): void {
    this.hooks = this.hooks.filter(h => h.name !== name)
  }

  on(action: HookAction, handler: HookHandler): void {
    this.handlers.set(action, handler)
  }

  async fire(event: HookEvent, context: HookContext): Promise<HookResult[]> {
    const matching = this.hooks.filter(h => h.enabled && h.when.event === event)
    if (matching.length === 0) return []

    const results: HookResult[] = []
    for (const hook of matching) {
      if (hook.when.toolTypes && context.toolType && !hook.when.toolTypes.includes(context.toolType)) continue
      if (hook.when.filePatterns && context.filePath) {
        const fp = context.filePath
        const matches = hook.when.filePatterns.some(p => fp.endsWith(p.replace('*', '')))
        if (!matches) continue
      }

      const handler = this.handlers.get(hook.then.action)
      if (handler) {
        const start = Date.now()
        try {
          const result = await handler(hook, context)
          result.durationMs = Date.now() - start
          results.push(result)
        } catch (err) {
          results.push({
            passed: false,
            message: `Hook ${hook.name} failed: ${err instanceof Error ? err.message : String(err)}`,
            durationMs: Date.now() - start,
          })
        }
      }
    }
    return results
  }

  getAll(): Hook[] {
    return [...this.hooks]
  }

  getEnabled(): Hook[] {
    return this.hooks.filter(h => h.enabled)
  }

  enable(name: string): void {
    const hook = this.hooks.find(h => h.name === name)
    if (hook) hook.enabled = true
  }

  disable(name: string): void {
    const hook = this.hooks.find(h => h.name === name)
    if (hook) hook.enabled = false
  }

  clear(): void {
    this.hooks = []
  }
}
