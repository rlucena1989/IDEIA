import { EventEmitter } from 'node:events';
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
    [key: string]: {
        active: boolean;
        lastCheck: number | null;
        bypassed: boolean;
    };
}
export declare class SafetyLayers extends EventEmitter {
    private layerStatus;
    private bypassReasons;
    constructor();
    private checkL1;
    private checkL2;
    private checkL3;
    private checkL4;
    private checkL5;
    private checkL6;
    private checkL7;
    checkAll(action: SafetyAction): Promise<{
        ok: boolean;
        results: LayerCheckResult[];
    }>;
    bypassAll(action: SafetyAction, reason: string): {
        ok: boolean;
        results: LayerCheckResult[];
    };
    check(layer: LayerName, action: SafetyAction): Promise<LayerCheckResult>;
    bypass(layer: LayerName, reason: string): void;
    getStatus(): SafetyLayersStatus;
    reset(): void;
}
//# sourceMappingURL=safety-layers.d.ts.map