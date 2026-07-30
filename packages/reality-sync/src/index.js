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
exports.createAutoStudyGenerator = exports.AutoStudyGenerator = exports.renderTemplate = exports.getTemplate = exports.getTemplateNames = exports.createADRValidator = exports.ADRValidator = exports.createADRGenerator = exports.ADRGenerator = exports.expectAllowed = exports.expectViolation = exports.createPathValidator = exports.ScopeViolationError = exports.PathValidator = exports.createTechRadarAPI = exports.createTechRadar = exports.TechRadar = exports.TechRadarAPI = exports.validateConfigFile = exports.validate = exports.customizeProfile = exports.listProfiles = exports.getProfile = exports.applyProfile = exports.SafetyLayers = exports.DecisionContinuityEngine = exports.UsabilityProfileEngine = exports.BHPProtocol = exports.SafetyCircuit = exports.createStudyScanner = exports.StudyScanner = exports.StudyIntensifier = exports.ProactiveInitiativeEngine = exports.syncRegistry = exports.syncGaps = exports.syncManifest = exports.RealitySyncDaemon = void 0;
exports.createDefaultConfig = createDefaultConfig;
var watcher_1 = require("./watcher");
Object.defineProperty(exports, "RealitySyncDaemon", { enumerable: true, get: function () { return watcher_1.RealitySyncDaemon; } });
var sync_manifest_1 = require("./sync-manifest");
Object.defineProperty(exports, "syncManifest", { enumerable: true, get: function () { return sync_manifest_1.syncManifest; } });
var sync_gaps_1 = require("./sync-gaps");
Object.defineProperty(exports, "syncGaps", { enumerable: true, get: function () { return sync_gaps_1.syncGaps; } });
var sync_registry_1 = require("./sync-registry");
Object.defineProperty(exports, "syncRegistry", { enumerable: true, get: function () { return sync_registry_1.syncRegistry; } });
var initiative_engine_1 = require("./initiative-engine");
Object.defineProperty(exports, "ProactiveInitiativeEngine", { enumerable: true, get: function () { return initiative_engine_1.ProactiveInitiativeEngine; } });
var study_intensifier_1 = require("./study-intensifier");
Object.defineProperty(exports, "StudyIntensifier", { enumerable: true, get: function () { return study_intensifier_1.StudyIntensifier; } });
var study_scanner_1 = require("./study-scanner");
Object.defineProperty(exports, "StudyScanner", { enumerable: true, get: function () { return study_scanner_1.StudyScanner; } });
Object.defineProperty(exports, "createStudyScanner", { enumerable: true, get: function () { return study_scanner_1.createStudyScanner; } });
var safety_circuit_1 = require("./safety-circuit");
Object.defineProperty(exports, "SafetyCircuit", { enumerable: true, get: function () { return safety_circuit_1.SafetyCircuit; } });
var bhp_protocol_1 = require("./bhp-protocol");
Object.defineProperty(exports, "BHPProtocol", { enumerable: true, get: function () { return bhp_protocol_1.BHPProtocol; } });
var usability_profile_1 = require("./usability-profile");
Object.defineProperty(exports, "UsabilityProfileEngine", { enumerable: true, get: function () { return usability_profile_1.UsabilityProfileEngine; } });
var decision_continuity_1 = require("./decision-continuity");
Object.defineProperty(exports, "DecisionContinuityEngine", { enumerable: true, get: function () { return decision_continuity_1.DecisionContinuityEngine; } });
var safety_layers_1 = require("./safety-layers");
Object.defineProperty(exports, "SafetyLayers", { enumerable: true, get: function () { return safety_layers_1.SafetyLayers; } });
var profiles_1 = require("./profiles");
Object.defineProperty(exports, "applyProfile", { enumerable: true, get: function () { return profiles_1.applyProfile; } });
Object.defineProperty(exports, "getProfile", { enumerable: true, get: function () { return profiles_1.getProfile; } });
Object.defineProperty(exports, "listProfiles", { enumerable: true, get: function () { return profiles_1.listProfiles; } });
Object.defineProperty(exports, "customizeProfile", { enumerable: true, get: function () { return profiles_1.customizeProfile; } });
var config_validator_1 = require("./config-validator");
Object.defineProperty(exports, "validate", { enumerable: true, get: function () { return config_validator_1.validate; } });
Object.defineProperty(exports, "validateConfigFile", { enumerable: true, get: function () { return config_validator_1.validateConfigFile; } });
var tech_radar_1 = require("./tech-radar");
Object.defineProperty(exports, "TechRadarAPI", { enumerable: true, get: function () { return tech_radar_1.TechRadarAPI; } });
Object.defineProperty(exports, "TechRadar", { enumerable: true, get: function () { return tech_radar_1.TechRadar; } });
Object.defineProperty(exports, "createTechRadar", { enumerable: true, get: function () { return tech_radar_1.createTechRadar; } });
Object.defineProperty(exports, "createTechRadarAPI", { enumerable: true, get: function () { return tech_radar_1.createTechRadarAPI; } });
var path_validator_1 = require("./path-validator");
Object.defineProperty(exports, "PathValidator", { enumerable: true, get: function () { return path_validator_1.PathValidator; } });
Object.defineProperty(exports, "ScopeViolationError", { enumerable: true, get: function () { return path_validator_1.ScopeViolationError; } });
Object.defineProperty(exports, "createPathValidator", { enumerable: true, get: function () { return path_validator_1.createPathValidator; } });
Object.defineProperty(exports, "expectViolation", { enumerable: true, get: function () { return path_validator_1.expectViolation; } });
Object.defineProperty(exports, "expectAllowed", { enumerable: true, get: function () { return path_validator_1.expectAllowed; } });
var adr_generator_1 = require("./adr-generator");
Object.defineProperty(exports, "ADRGenerator", { enumerable: true, get: function () { return adr_generator_1.ADRGenerator; } });
Object.defineProperty(exports, "createADRGenerator", { enumerable: true, get: function () { return adr_generator_1.createADRGenerator; } });
var adr_validator_1 = require("./adr-validator");
Object.defineProperty(exports, "ADRValidator", { enumerable: true, get: function () { return adr_validator_1.ADRValidator; } });
Object.defineProperty(exports, "createADRValidator", { enumerable: true, get: function () { return adr_validator_1.createADRValidator; } });
var adr_templates_1 = require("./adr-templates");
Object.defineProperty(exports, "getTemplateNames", { enumerable: true, get: function () { return adr_templates_1.getTemplateNames; } });
Object.defineProperty(exports, "getTemplate", { enumerable: true, get: function () { return adr_templates_1.getTemplate; } });
Object.defineProperty(exports, "renderTemplate", { enumerable: true, get: function () { return adr_templates_1.renderTemplate; } });
var auto_study_1 = require("./auto-study");
Object.defineProperty(exports, "AutoStudyGenerator", { enumerable: true, get: function () { return auto_study_1.AutoStudyGenerator; } });
Object.defineProperty(exports, "createAutoStudyGenerator", { enumerable: true, get: function () { return auto_study_1.createAutoStudyGenerator; } });
const path = __importStar(require("node:path"));
function createDefaultConfig(workspaceRoot) {
    return {
        workspaceRoot,
        docsDir: path.join(workspaceRoot, 'docs'),
        packagesDir: path.join(workspaceRoot, 'packages'),
        manifestPath: path.join(workspaceRoot, 'docs', 'governance', 'REALITY-MANIFEST.md'),
        gapsPath: path.join(workspaceRoot, 'docs', 'governance', 'GAPS-PRODUCAO-IDE.md'),
        registryPath: path.join(workspaceRoot, 'docs', 'governance', 'document-registry.md'),
        watchPaths: [
            path.join(workspaceRoot, 'packages'),
            path.join(workspaceRoot, 'docs'),
            path.join(workspaceRoot, 'docs', 'governance'),
        ],
        ignorePatterns: ['node_modules', 'dist', '.git', 'coverage', '.ai'],
    };
}
//# sourceMappingURL=index.js.map