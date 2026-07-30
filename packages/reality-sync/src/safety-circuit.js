"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyCircuit = void 0;
const node_events_1 = require("node:events");
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('safety-circuit');
class SafetyCircuit extends node_events_1.EventEmitter {
    loopFixCounts = new Map();
    triggerStatus = {
        loopDetection: { active: false, count: 0, lastTriggered: null },
        regressionSpike: { active: false, coverageDrop: 0, lastTriggered: null },
        breakageChain: { active: false, brokenContracts: 0, lastTriggered: null },
        resourceLimit: { active: false, memoryPercent: 0, cpuPercent: 0, lastTriggered: null },
        userOverride: { active: false, reason: null, lastTriggered: null },
    };
    rollbackPoints = [];
    paused = false;
    stopped = false;
    log(msg) {
        logger.info('[SafetyCircuit] ${msg}');
    }
    check() {
        this.checkLoopDetection();
        this.checkRegressionSpike();
        this.checkBreakageChain();
        this.checkResourceLimit();
        const activeTriggers = Object.entries(this.triggerStatus)
            .filter(([, v]) => v.active)
            .map(([k]) => k);
        return { tripped: activeTriggers.length > 0, activeTriggers };
    }
    checkLoopDetection() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        let totalFixes = 0;
        for (const [, entry] of this.loopFixCounts) {
            if (now - entry.firstSeen < oneHour)
                totalFixes += entry.count;
        }
        if (totalFixes > 5) {
            this.trip('loopDetection');
        }
    }
    checkRegressionSpike() {
        if (this.triggerStatus.regressionSpike.coverageDrop > 5) {
            this.trip('regressionSpike');
        }
    }
    checkBreakageChain() {
        if (this.triggerStatus.breakageChain.brokenContracts >= 3) {
            this.trip('breakageChain');
        }
    }
    checkResourceLimit() {
        if (this.triggerStatus.resourceLimit.memoryPercent > 80 || this.triggerStatus.resourceLimit.cpuPercent > 90) {
            this.trip('resourceLimit');
        }
    }
    trip(trigger) {
        const prev = this.triggerStatus[trigger];
        if (prev.active)
            return;
        prev.active = true;
        prev.lastTriggered = Date.now();
        this.log(`Circuit tripped: ${trigger}`);
        this.emit('tripped', { trigger, timestamp: Date.now() });
    }
    reset(trigger) {
        if (trigger) {
            const t = this.triggerStatus[trigger];
            if ('active' in t)
                t.active = false;
            this.log(`Reset trigger: ${trigger}`);
        }
        else {
            for (const key of Object.keys(this.triggerStatus)) {
                const t = this.triggerStatus[key];
                if ('active' in t)
                    t.active = false;
            }
            this.loopFixCounts.clear();
            this.paused = false;
            this.stopped = false;
            this.log('All triggers reset');
        }
        this.emit('reset', { trigger: trigger ?? 'all', timestamp: Date.now() });
    }
    getStatus() {
        return { ...this.triggerStatus };
    }
    recordFix(filePath) {
        const now = Date.now();
        const existing = this.loopFixCounts.get(filePath);
        if (existing && now - existing.firstSeen < 60 * 60 * 1000) {
            existing.count++;
        }
        else {
            this.loopFixCounts.set(filePath, { count: 1, firstSeen: now });
        }
        this.checkLoopDetection();
    }
    setCoverageDrop(dropPercent) {
        this.triggerStatus.regressionSpike.coverageDrop = dropPercent;
        this.checkRegressionSpike();
    }
    recordBrokenContract() {
        this.triggerStatus.breakageChain.brokenContracts++;
        this.checkBreakageChain();
    }
    setResourceUsage(memoryPercent, cpuPercent) {
        this.triggerStatus.resourceLimit.memoryPercent = memoryPercent;
        this.triggerStatus.resourceLimit.cpuPercent = cpuPercent;
        this.checkResourceLimit();
    }
    userOverride(reason) {
        this.triggerStatus.userOverride = {
            active: true,
            reason,
            lastTriggered: Date.now(),
        };
        this.emit('warning', { message: `User override: ${reason}`, timestamp: Date.now() });
    }
    emergencyStop() {
        this.stopped = true;
        this.paused = false;
        this.log('EMERGENCY STOP activated');
        this.emit('tripped', { trigger: 'userOverride', type: 'emergencyStop', timestamp: Date.now() });
    }
    emergencyPause() {
        this.paused = true;
        this.stopped = false;
        this.log('EMERGENCY PAUSE activated');
        this.emit('warning', { type: 'emergencyPause', timestamp: Date.now() });
    }
    emergencyRollback(pointId) {
        const point = this.rollbackPoints.find(p => p.id === pointId);
        if (!point) {
            this.log(`Rollback point not found: ${pointId}`);
            return null;
        }
        this.log(`Rolling back to point: ${pointId} — ${point.description}`);
        this.emit('warning', { type: 'emergencyRollback', pointId, timestamp: Date.now() });
        return point;
    }
    saveRollbackPoint(description, snapshot) {
        const point = {
            id: `rp_${Date.now()}`,
            timestamp: Date.now(),
            description,
            snapshot,
        };
        this.rollbackPoints.push(point);
        if (this.rollbackPoints.length > 50)
            this.rollbackPoints.shift();
        return point;
    }
    getRollbackPoints() {
        return [...this.rollbackPoints];
    }
    isPaused() { return this.paused; }
    isStopped() { return this.stopped; }
}
exports.SafetyCircuit = SafetyCircuit;
//# sourceMappingURL=safety-circuit.js.map