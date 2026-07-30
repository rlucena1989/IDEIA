"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsabilityProfileEngine = void 0;
const fs = __importStar(require("node:fs"));
const logger_1 = require("@ideia/logger");
const path = __importStar(require("node:path"));
const logger = (0, logger_1.createLogger)('usability-profile');
const DEFAULT_PROFILE_PATH = '.ai/usability-profile.json';
class UsabilityProfileEngine {
    profile;
    interactions = [];
    profilePath;
    teamPolicy = null;
    constructor(workspaceRoot) {
        this.profilePath = path.join(workspaceRoot, DEFAULT_PROFILE_PATH);
        this.profile = this.loadProfile();
    }
    loadProfile() {
        try {
            if (fs.existsSync(this.profilePath)) {
                const raw = fs.readFileSync(this.profilePath, 'utf-8');
                return JSON.parse(raw);
            }
        }
        catch { /* ignore */ }
        return this.defaultProfile();
    }
    defaultProfile() {
        return {
            preferredLevel: 'assisted',
            approvalRate: 0,
            responseTimeMs: 0,
            riskTolerance: 'medium',
            totalInteractions: 0,
            approvedActions: 0,
            rejectedActions: 0,
            lastUpdated: Date.now(),
            averageResponseTime: 0,
            preferredCategories: ['package', 'governance', 'quality'],
        };
    }
    saveProfile() {
        const dir = path.dirname(this.profilePath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.profilePath, JSON.stringify(this.profile, null, 2), 'utf-8');
    }
    recordInteraction(action, result, responseTimeMs) {
        const interaction = {
            action,
            result,
            responseTimeMs: responseTimeMs ?? 0,
            timestamp: Date.now(),
        };
        this.interactions.push(interaction);
        if (this.interactions.length > 1000)
            this.interactions.shift();
        this.profile.totalInteractions++;
        if (result === 'approved')
            this.profile.approvedActions++;
        if (result === 'rejected')
            this.profile.rejectedActions++;
        if (responseTimeMs) {
            const total = this.profile.averageResponseTime * (this.profile.totalInteractions - 1) + responseTimeMs;
            this.profile.averageResponseTime = total / this.profile.totalInteractions;
        }
        this.profile.approvalRate = this.profile.totalInteractions > 0
            ? this.profile.approvedActions / this.profile.totalInteractions
            : 0;
        this.profile.lastUpdated = Date.now();
        this.saveProfile();
    }
    getProfile() {
        return { ...this.profile };
    }
    getRecommendation() {
        const rate = this.profile.approvalRate;
        const avgTime = this.profile.averageResponseTime;
        const total = this.profile.totalInteractions;
        if (total < 5) {
            return {
                suggestedLevel: 'assisted',
                confidence: 0.3,
                reason: 'Insufficient interaction data (< 5)',
                suggestedRiskThreshold: 'medium',
            };
        }
        if (rate > 0.85 && avgTime < 10_000) {
            return {
                suggestedLevel: 'autonomous',
                confidence: rate,
                reason: `High approval rate (${(rate * 100).toFixed(0)}%) and fast responses (${Math.round(avgTime)}ms avg)`,
                suggestedRiskThreshold: 'high',
            };
        }
        if (rate > 0.6 && avgTime < 60_000) {
            return {
                suggestedLevel: 'assisted',
                confidence: rate,
                reason: `Moderate approval rate (${(rate * 100).toFixed(0)}%) with reasonable response time`,
                suggestedRiskThreshold: 'medium',
            };
        }
        return {
            suggestedLevel: 'passive',
            confidence: 1 - rate,
            reason: `Low approval rate (${(rate * 100).toFixed(0)}%) or slow responses`,
            suggestedRiskThreshold: 'low',
        };
    }
    reset() {
        this.profile = this.defaultProfile();
        this.interactions = [];
        this.saveProfile();
    }
    learnFromFeedback(action, approved) {
        const result = approved ? 'approved' : 'rejected';
        this.recordInteraction(action, result);
        this.saveProfile();
    }
    getSuggestedConfig() {
        const rec = this.getRecommendation();
        return {
            level: rec.suggestedLevel,
            riskThreshold: rec.suggestedRiskThreshold,
            autoFixCategories: this.profile.preferredCategories,
        };
    }
    setTeamPolicy(policy) {
        this.teamPolicy = policy;
        this.profile.teamPolicies = policy;
        this.saveProfile();
    }
    checkTeamPolicy(config) {
        const errors = [];
        const policy = this.teamPolicy;
        if (!policy)
            return { valid: true, errors: [] };
        const level = config['level'];
        if (level && policy.maxAutonomyLevel) {
            const levels = ['passive', 'assisted', 'autonomous'];
            if (levels.indexOf(level) > levels.indexOf(policy.maxAutonomyLevel)) {
                errors.push(`Level ${level} exceeds team max: ${policy.maxAutonomyLevel}`);
            }
        }
        const categories = config['autoFixCategories'];
        if (categories && policy.blockedCategories.length > 0) {
            for (const cat of categories) {
                if (policy.blockedCategories.includes(cat)) {
                    errors.push(`Category ${cat} is blocked by team policy`);
                }
            }
        }
        if (policy.mandatoryNotifications && config['notificationsEnabled'] === false) {
            errors.push('Notifications are mandatory per team policy');
        }
        return { valid: errors.length === 0, errors };
    }
    getTeamPolicy() {
        return this.teamPolicy ? { ...this.teamPolicy } : null;
    }
}
exports.UsabilityProfileEngine = UsabilityProfileEngine;
//# sourceMappingURL=usability-profile.js.map