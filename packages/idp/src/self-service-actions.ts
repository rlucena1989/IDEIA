import { ActionDefinition, ActionParameter, ActionResult, ApprovalLevel } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('self-service-actions');

export class SelfServiceActions {
  private _actions: Map<string, ActionDefinition> = new Map();

  constructor() {
    this._registerDefaults();
  }

  register(action: ActionDefinition): void {
    this._actions.set(action.name, action);
  }

  get(name: string): ActionDefinition | undefined {
    return this._actions.get(name);
  }

  list(): ActionDefinition[] {
    return Array.from(this._actions.values());
  }

  listByCategory(category: string): ActionDefinition[] {
    return this.list().filter(a => a.category === category);
  }

  find(query: string): ActionDefinition[] {
    const lower = query.toLowerCase();
    return this.list().filter(a =>
      a.name.toLowerCase().includes(lower) ||
      a.description.toLowerCase().includes(lower),
    );
  }

  execute(actionName: string, params: Record<string, string>, context: { user: string; role: string }): ActionResult {
    const def = this._actions.get(actionName);
    if (!def) {
      return { success: false, action: actionName, output: '', duration: 0, timestamp: Date.now(), error: `Action "${actionName}" not found` };
    }
    const validationErrors = this._validateParams(def, params);
    if (validationErrors.length > 0) {
      return { success: false, action: actionName, output: '', duration: 0, timestamp: Date.now(), error: validationErrors.join('; ') };
    }
    const approved = this._checkApproval(def.requiredApproval, context.role);
    if (!approved) {
      return { success: false, action: actionName, output: '', duration: 0, timestamp: Date.now(), error: 'Insufficient permissions' };
    }
    const start = Date.now();
    try {
      const output = this._runAction(def, params);
      return { success: true, action: actionName, output, duration: Date.now() - start, timestamp: Date.now() };
    } catch (err) {
      return { success: false, action: actionName, output: '', duration: Date.now() - start, timestamp: Date.now(), error: err instanceof Error ? err.message : String(err) };
    }
  }

  unregister(name: string): boolean {
    return this._actions.delete(name);
  }

  clear(): void {
    this._actions.clear();
    this._registerDefaults();
  }

  private _registerDefaults(): void {
    const defaultActions: ActionDefinition[] = [
      { name: 'create-api', description: 'Scaffold new API service from template', category: 'scaffolding', parameters: [
        { name: 'name', type: 'string', description: 'Service name', required: true },
        { name: 'template', type: 'string', description: 'Template name', required: false, default: 'node-express' },
      ], requiredApproval: 'none', timeout: 30000, runner: 'local' },
      { name: 'add-monitoring', description: 'Add monitoring to a service', category: 'observability', parameters: [
        { name: 'service', type: 'string', description: 'Service name', required: true },
        { name: 'type', type: 'choice', description: 'Monitoring type', required: false, default: 'prometheus', choices: ['prometheus', 'datadog', 'grafana'] },
      ], requiredApproval: 'dev', timeout: 30000, runner: 'local' },
      { name: 'setup-ci', description: 'Configure CI/CD pipeline', category: 'pipeline', parameters: [
        { name: 'service', type: 'string', description: 'Service name', required: true },
        { name: 'provider', type: 'choice', description: 'CI provider', required: false, default: 'github-actions', choices: ['github-actions', 'gitlab-ci', 'jenkins'] },
      ], requiredApproval: 'dev', timeout: 60000, runner: 'local' },
      { name: 'publish-docs', description: 'Generate and publish documentation', category: 'documentation', parameters: [
        { name: 'service', type: 'string', description: 'Service name', required: true },
        { name: 'source', type: 'string', description: 'Source directory', required: false, default: 'docs' },
      ], requiredApproval: 'none', timeout: 60000, runner: 'local' },
      { name: 'deploy-canary', description: 'Deploy canary release', category: 'delivery', parameters: [
        { name: 'service', type: 'string', description: 'Service name', required: true },
        { name: 'percentage', type: 'string', description: 'Canary percentage', required: false, default: '10' },
      ], requiredApproval: 'tech-lead', timeout: 120000, runner: 'pipeline' },
      { name: 'add-dependency', description: 'Add internal service dependency', category: 'dependencies', parameters: [
        { name: 'service', type: 'string', description: 'Service name', required: true },
        { name: 'dependency', type: 'string', description: 'Dependency service name', required: true },
      ], requiredApproval: 'dev', timeout: 30000, runner: 'local' },
    ];
    for (const action of defaultActions) {
      this._actions.set(action.name, action);
    }
  }

  private _validateParams(def: ActionDefinition, params: Record<string, string>): string[] {
    const errors: string[] = [];
    for (const p of def.parameters) {
      const value = params[p.name];
      if (p.required && !value) errors.push(`Missing required parameter: ${p.name}`);
      if (value && p.validator && !p.validator(value)) errors.push(`Invalid value for ${p.name}: ${value}`);
      if (value && p.type === 'choice' && p.choices && !p.choices.includes(value)) {
        errors.push(`Invalid choice for ${p.name}: ${value}. Allowed: ${p.choices.join(', ')}`);
      }
    }
    return errors;
  }

  private _checkApproval(required: ApprovalLevel, role: string): boolean {
    if (required === 'none') return true;
    if (role === 'admin') return true;
    const hierarchy: Record<string, number> = { none: 0, dev: 1, 'tech-lead': 2, security: 3 };
    const requiredLevel = hierarchy[required] ?? 99;
    const userLevel = hierarchy[role] ?? 0;
    return userLevel >= requiredLevel;
  }

  private _runAction(def: ActionDefinition, _params: Record<string, string>): string {
    switch (def.name) {
      case 'create-api': return `API scaffolded with template ${_params['template'] ?? 'default'}`;
      case 'add-monitoring': return `Monitoring added to ${_params['service']}`;
      case 'setup-ci': return `CI configured for ${_params['service']}`;
      case 'publish-docs': return `Documentation published for ${_params['service']}`;
      case 'deploy-canary': return `Canary deploy ${_params['percentage']}% for ${_params['service']}`;
      case 'add-dependency': return `Dependency ${_params['dependency']} added to ${_params['service']}`;
      default: return `Action ${def.name} executed`;
    }
  }
}
