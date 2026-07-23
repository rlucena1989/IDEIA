"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPolicyFile = loadPolicyFile;
exports.loadPolicyDirectory = loadPolicyDirectory;
exports.policyToInput = policyToInput;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const DEFAULT_POLICY_DIR = path_1.default.resolve(process.cwd(), 'policies');
function loadPolicyFile(filePath) {
    const raw = fs_1.default.readFileSync(filePath, 'utf-8');
    const doc = js_yaml_1.default.load(raw);
    if (!doc.version || !doc.rules || !Array.isArray(doc.rules)) {
        throw new Error(`Invalid policy file: ${filePath}. Must have 'version' and 'rules[]'`);
    }
    return doc;
}
function loadPolicyDirectory(dirPath = DEFAULT_POLICY_DIR) {
    const policies = new Map();
    if (!fs_1.default.existsSync(dirPath)) {
        return policies;
    }
    const files = fs_1.default.readdirSync(dirPath).filter(f => f.endsWith('.policy.yaml') || f.endsWith('.policy.yml'));
    for (const file of files) {
        try {
            const doc = loadPolicyFile(path_1.default.join(dirPath, file));
            policies.set(doc.metadata.name || file.replace(/\.policy\.ya?ml$/, ''), doc);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[PolicyLoader] Skipping ${file}: ${msg}`);
        }
    }
    return policies;
}
function policyToInput(rule) {
    return {
        actionType: rule.actionPattern || '*',
        resource: rule.resourcePattern,
        riskLevel: rule.riskLevel,
    };
}
//# sourceMappingURL=policy-loader.js.map