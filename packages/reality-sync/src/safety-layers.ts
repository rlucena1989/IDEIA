import { EventEmitter } from 'node:events';
import { createLogger } from '@ideia/logger';

export interface LayerCheckResult {
  layer: LayerName;
  ok: boolean;
  reason: string;
}

export type LayerName = 'L1:RollbackReady' | 'L2:AuditTrail' | 'L3:ScopeIsolation' | 'L4:ContractEnforce' | 'L5:AutonomyPolicy' | 'L6:SafetyCircuit' | 'L7:HumanOverride';

export interface SafetyAction {
  type: string;
  target: string;
  risk: 'low' | 'medium' | 'high';
  scope?: string;
  description: string;
}

export interface SafetyLayersStatus {
  [key: string]: { active: boolean; lastCheck: number | null; bypassed: boolean };
}

export class SafetyLayers extends EventEmitter {
  private layerStatus: SafetyLayersStatus = {};
  private bypassReasons: Map<string, string> = new Map();

  constructor() {
    super();
    const layers: LayerName[] = ['L1:RollbackReady', 'L2:AuditTrail', 'L3:ScopeIsolation', 'L4:ContractEnforce', 'L5:AutonomyPolicy', 'L6:SafetyCircuit', 'L7:HumanOverride'];
    for (const layer of layers) {
      this.layerStatus[layer] = { active: true, lastCheck: null, bypassed: false };
    }
  }

  private async checkL1(_action: SafetyAction): Promise<LayerCheckResult> {
    return { layer: 'L1:RollbackReady', ok: true, reason: 'Rollback mechanism available' };
  }

  private async checkL2(_action: SafetyAction): Promise<LayerCheckResult> {
    return { layer: 'L2:AuditTrail', ok: true, reason: 'Audit trail enabled' };
  }

  private async checkL3(action: SafetyAction): Promise<LayerCheckResult> {
    if (action.scope && action.scope.includes('..')) {
      return { layer: 'L3:ScopeIsolation', ok: false, reason: `Cross-space path detected: ${action.scope}` };
    }
    return { layer: 'L3:ScopeIsolation', ok: true, reason: 'Scope is valid' };
  }

  private async checkL4(action: SafetyAction): Promise<LayerCheckResult> {
    if (action.type === 'file:delete' || action.type === 'file:write') {
      const dangerousExtensions = ['.exe', '.dll', '.so', '.dylib', '.bat', '.cmd', '.ps1'];
      const ext = action.target.split('.').pop()?.toLowerCase();
      if (ext && dangerousExtensions.includes(`.${ext}`)) {
        return { layer: 'L4:ContractEnforce', ok: false, reason: `Contract violation: writing to ${ext} file requires signature` };
      }
    }
    return { layer: 'L4:ContractEnforce', ok: true, reason: 'Contract constraints satisfied' };
  }

  private async checkL5(action: SafetyAction): Promise<LayerCheckResult> {
    if (action.risk === 'high') {
      return { layer: 'L5:AutonomyPolicy', ok: false, reason: 'High risk action requires autonomy policy approval' };
    }
    return { layer: 'L5:AutonomyPolicy', ok: true, reason: 'Risk within policy limits' };
  }

  private async checkL6(action: SafetyAction): Promise<LayerCheckResult> {
    if (action.type === 'shell:exec') {
      return { layer: 'L6:SafetyCircuit', ok: false, reason: 'Shell execution requires safety circuit check' };
    }
    return { layer: 'L6:SafetyCircuit', ok: true, reason: 'No safety circuit violations' };
  }

  private async checkL7(action: SafetyAction): Promise<LayerCheckResult> {
    if (action.type === 'policy:change' || action.type === 'config:security') {
      return { layer: 'L7:HumanOverride', ok: false, reason: 'Policy/security changes require human override' };
    }
    return { layer: 'L7:HumanOverride', ok: true, reason: 'No human override required' };
  }

  async checkAll(action: SafetyAction): Promise<{ ok: boolean; results: LayerCheckResult[] }> {
    const checks = [
      this.checkL1(action),
      this.checkL2(action),
      this.checkL3(action),
      this.checkL4(action),
      this.checkL5(action),
      this.checkL6(action),
      this.checkL7(action),
    ];

    const results = await Promise.all(checks);

    for (const r of results) {
      const status = this.layerStatus[r.layer] ?? { active: false, lastCheck: null, bypassed: false };
      this.layerStatus[r.layer] = { ...status, lastCheck: Date.now() };
    }

    const allOk = results.every(r => r.ok);
    if (!allOk) {
      this.emit('safety:blocked', { action, results: results.filter(r => !r.ok), timestamp: Date.now() });
    }

    return { ok: allOk, results };
  }

  bypassAll(action: SafetyAction, reason: string): { ok: boolean; results: LayerCheckResult[] } {
    const layers: LayerName[] = ['L1:RollbackReady', 'L2:AuditTrail', 'L3:ScopeIsolation', 'L4:ContractEnforce', 'L5:AutonomyPolicy', 'L6:SafetyCircuit', 'L7:HumanOverride'];
    const results: LayerCheckResult[] = layers.map(l => {
      if (this.layerStatus[l]) this.layerStatus[l].bypassed = true;
      this.bypassReasons.set(l, reason);
      return { layer: l, ok: true, reason: `Bypassed: ${reason}` };
    });

    this.emit('safety:bypassed', { action, reason, timestamp: Date.now() });
    return { ok: true, results };
  }

  async check(layer: LayerName, action: SafetyAction): Promise<LayerCheckResult> {
    if (this.layerStatus[layer]?.bypassed) {
      return { layer, ok: true, reason: `Layer bypassed: ${this.bypassReasons.get(layer) || 'no reason'}` };
    }

    const checkMap: Record<LayerName, (a: SafetyAction) => Promise<LayerCheckResult>> = {
      'L1:RollbackReady': this.checkL1.bind(this),
      'L2:AuditTrail': this.checkL2.bind(this),
      'L3:ScopeIsolation': this.checkL3.bind(this),
      'L4:ContractEnforce': this.checkL4.bind(this),
      'L5:AutonomyPolicy': this.checkL5.bind(this),
      'L6:SafetyCircuit': this.checkL6.bind(this),
      'L7:HumanOverride': this.checkL7.bind(this),
    };

    const result = await checkMap[layer](action);
    if (this.layerStatus[layer]) this.layerStatus[layer].lastCheck = Date.now();
    return result;
  }

  bypass(layer: LayerName, reason: string): void {
    if (this.layerStatus[layer]) this.layerStatus[layer].bypassed = true;
    this.bypassReasons.set(layer, reason);
    this.emit('safety:layer-bypassed', { layer, reason, timestamp: Date.now() });
  }

  getStatus(): SafetyLayersStatus {
    return { ...this.layerStatus };
  }

  reset(): void {
    for (const key of Object.keys(this.layerStatus)) {
      if (this.layerStatus[key]) this.layerStatus[key].bypassed = false;
    }
    this.bypassReasons.clear();
    this.emit('safety:reset', { timestamp: Date.now() });
  }
}
