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
exports.PRESETS = void 0;
exports.applyProfile = applyProfile;
exports.getProfile = getProfile;
exports.listProfiles = listProfiles;
exports.customizeProfile = customizeProfile;
const fs = __importStar(require("node:fs"));
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('reality-sync-profiles');
const path = __importStar(require("node:path"));
const PRESETS = {
    soloDev: {
        name: 'soloDev',
        label: 'Solo Dev',
        description: 'Individual developer — balanced autonomy with safety nets',
        level: 'autonomous',
        riskThreshold: 'medium',
        autoFixCategories: ['package', 'governance', 'quality', 'testing'],
        confirmBeforeWrite: true,
        scanners: { versions: true, license: true, security: true, governance: true, quality: true, tests: false },
    },
    techLead: {
        name: 'techLead',
        label: 'Tech Lead',
        description: 'Technical lead — reviews all changes before applying',
        level: 'assisted',
        riskThreshold: 'low',
        autoFixCategories: ['package', 'governance'],
        confirmBeforeWrite: true,
        scanners: { versions: true, license: true, security: true, governance: true, quality: true, tests: true },
    },
    automator: {
        name: 'automator',
        label: 'Automator',
        description: 'Full automation — trusts the system to make decisions',
        level: 'autonomous',
        riskThreshold: 'high',
        autoFixCategories: ['package', 'legal', 'security', 'governance', 'quality', 'testing', 'documentation'],
        confirmBeforeWrite: false,
        scanners: { versions: true, license: true, security: true, governance: true, quality: true, tests: true },
    },
    enterprise: {
        name: 'enterprise',
        label: 'Enterprise',
        description: 'Enterprise-grade — strict policies, human-in-the-loop for all changes',
        level: 'passive',
        riskThreshold: 'low',
        autoFixCategories: [],
        confirmBeforeWrite: true,
        scanners: { versions: true, license: true, security: true, governance: true, quality: true, tests: true },
    },
    custom: {
        name: 'custom',
        label: 'Custom',
        description: 'Custom configuration — tweak every setting to your needs',
        level: 'assisted',
        riskThreshold: 'medium',
        autoFixCategories: ['package', 'governance'],
        confirmBeforeWrite: true,
        scanners: { versions: true, license: true, security: true, governance: true, quality: false, tests: false },
    },
};
exports.PRESETS = PRESETS;
const PROFILE_PATH = '.ai/profiles.json';
function applyProfile(name, workspaceRoot) {
    const profile = PRESETS[name];
    if (!profile)
        return null;
    const dir = path.join(workspaceRoot, '.ai');
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    const config = {
        level: profile.level,
        riskThreshold: profile.riskThreshold,
        autoFixCategories: profile.autoFixCategories,
        confirmBeforeWrite: profile.confirmBeforeWrite,
        scanners: profile.scanners,
    };
    fs.writeFileSync(path.join(dir, 'reality-sync.json'), JSON.stringify(config, null, 2), 'utf-8');
    const profilesPath = path.join(workspaceRoot, PROFILE_PATH);
    let profiles = {};
    if (fs.existsSync(profilesPath)) {
        try {
            profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
        }
        catch { /* ignore */ }
    }
    profiles.active = profile;
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2), 'utf-8');
    logger.info('✓ Profile \'${name}\' applied: level=${profile.level}, risk=${profile.riskThreshold}');
    return profile;
}
function getProfile(name) {
    return PRESETS[name];
}
function listProfiles() {
    return Object.values(PRESETS);
}
function customizeProfile(name, overrides) {
    const base = PRESETS[name];
    if (!base)
        throw new Error(`Profile not found: ${name}`);
    const customized = {
        ...base,
        ...overrides,
        name: base.name === 'custom' ? 'custom' : `custom_${name}`,
        label: base.name === 'custom' ? 'Custom' : `Custom (${base.label})`,
    };
    return customized;
}
//# sourceMappingURL=profiles.js.map