"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyLayers = void 0;
const node_events_1 = require("node:events");
class SafetyLayers extends node_events_1.EventEmitter {
    layerStatus = {};
    bypassReasons = new Map();
    constructor() {
        super();
        const layers = ['L1:RollbackReady', 'L2:AuditTrail', 'L3:ScopeIsolation', 'L4:ContractEnforce', 'L5:AutonomyPolicy', 'L6:SafetyCircuit', 'L7:HumanOverride'];
        for (const layer of layers) {
            this.layerStatus[layer] = { active: true, lastCheck: null, bypassed: false };
        }
    }
    async checkL1(_action) {
        return { layer: 'L1:RollbackReady', ok: true, reason: 'Rollback mechanism available' };
    }
    async checkL2(_action) {
        return { layer: 'L2:AuditTrail', ok: true, reason: 'Audit trail enabled' };
    }
    async checkL3(action) {
        if (action.scope && action.scope.includes('..')) {
            return { layer: 'L3:ScopeIsolation', ok: false, reason: `Cross-space path detected: ${action.scope}` };
        }
        return { layer: 'L3:ScopeIsolation', ok: true, reason: 'Scope is valid' };
    }
    async checkL4(action) {
        if (action.type === 'file:delete' || action.type === 'file:write') {
            const dangerousExtensions = ['.exe', '.dll', '.so', '.dylib', '.bat', '.cmd', '.ps1'];
            const ext = action.target.split('.').pop()?.toLowerCase();
            if (ext && dangerousExtensions.includes(`.${ext}`)) {
                return { layer: 'L4:ContractEnforce', ok: false, reason: `Contract violation: writing to ${ext} file requires signature` };
            }
        }
        return { layer: 'L4:ContractEnforce', ok: true, reason: 'Contract constraints satisfied' };
    }
    async checkL5(action) {
        if (action.risk === 'high') {
            return { layer: 'L5:AutonomyPolicy', ok: false, reason: 'High risk action requires autonomy policy approval' };
        }
        return { layer: 'L5:AutonomyPolicy', ok: true, reason: 'Risk within policy limits' };
    }
    async checkL6(action) {
        if (action.type === 'shell:exec') {
            return { layer: 'L6:SafetyCircuit', ok: false, reason: 'Shell execution requires safety circuit check' };
        }
        return { layer: 'L6:SafetyCircuit', ok: true, reason: 'No safety circuit violations' };
    }
    async checkL7(action) {
        if (action.type === 'policy:change' || action.type === 'config:security') {
            return { layer: 'L7:HumanOverride', ok: false, reason: 'Policy/security changes require human override' };
        }
        return { layer: 'L7:HumanOverride', ok: true, reason: 'No human override required' };
    }
    async checkAll(action) {
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
    bypassAll(action, reason) {
        const layers = ['L1:RollbackReady', 'L2:AuditTrail', 'L3:ScopeIsolation', 'L4:ContractEnforce', 'L5:AutonomyPolicy', 'L6:SafetyCircuit', 'L7:HumanOverride'];
        const results = layers.map(l => {
            if (this.layerStatus[l])
                this.layerStatus[l].bypassed = true;
            this.bypassReasons.set(l, reason);
            return { layer: l, ok: true, reason: `Bypassed: ${reason}` };
        });
        this.emit('safety:bypassed', { action, reason, timestamp: Date.now() });
        return { ok: true, results };
    }
    async check(layer, action) {
        if (this.layerStatus[layer]?.bypassed) {
            return { layer, ok: true, reason: `Layer bypassed: ${this.bypassReasons.get(layer) || 'no reason'}` };
        }
        const checkMap = {
            'L1:RollbackReady': this.checkL1.bind(this),
            'L2:AuditTrail': this.checkL2.bind(this),
            'L3:ScopeIsolation': this.checkL3.bind(this),
            'L4:ContractEnforce': this.checkL4.bind(this),
            'L5:AutonomyPolicy': this.checkL5.bind(this),
            'L6:SafetyCircuit': this.checkL6.bind(this),
            'L7:HumanOverride': this.checkL7.bind(this),
        };
        const result = await checkMap[layer](action);
        if (this.layerStatus[layer])
            this.layerStatus[layer].lastCheck = Date.now();
        return result;
    }
    bypass(layer, reason) {
        if (this.layerStatus[layer])
            this.layerStatus[layer].bypassed = true;
        this.bypassReasons.set(layer, reason);
        this.emit('safety:layer-bypassed', { layer, reason, timestamp: Date.now() });
    }
    getStatus() {
        return { ...this.layerStatus };
    }
    reset() {
        for (const key of Object.keys(this.layerStatus)) {
            if (this.layerStatus[key])
                this.layerStatus[key].bypassed = false;
        }
        this.bypassReasons.clear();
        this.emit('safety:reset', { timestamp: Date.now() });
    }
}
exports.SafetyLayers = SafetyLayers;
//# sourceMappingURL=safety-layers.js.map