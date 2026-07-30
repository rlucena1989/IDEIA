import { SelfServiceAction } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('actions');

export class SelfServiceRegistry {
  private actions: Map<string, SelfServiceAction> = new Map();

  register(action: SelfServiceAction): void { this.actions.set(action.id, action); }

  get(id: string): SelfServiceAction | undefined { return this.actions.get(id); }

  list(): SelfServiceAction[] { return Array.from(this.actions.values()); }

  filterByType(type: SelfServiceAction['type']): SelfServiceAction[] { return Array.from(this.actions.values()).filter(a => a.type === type); }

  execute(actionId: string, params: Record<string, unknown>): { success: boolean; output: string } {
    const action = this.actions.get(actionId);
    if (!action) return { success: false, output: `Action "${actionId}" not found` };
    const missing = action.params.filter(p => p.required && params[p.name] === undefined);
    if (missing.length > 0) return { success: false, output: `Missing required params: ${missing.map(p => p.name).join(', ')}` };
    return { success: true, output: `Executed "${action.name}" with ${Object.keys(params).length} params` };
  }

  count(): number { return this.actions.size; }
}
