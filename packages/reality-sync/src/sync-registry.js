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
exports.syncRegistry = syncRegistry;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
function readLines(p) {
    return fs.readFileSync(p, 'utf-8').split('\n');
}
function writeLines(p, lines) {
    fs.writeFileSync(p, lines.join('\n'), 'utf-8');
}
function findRegistryEntry(lines, keyword) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.toLowerCase().includes(keyword.toLowerCase()))
            return i;
    }
    return -1;
}
function scanPackages(packagesDir) {
    const results = [];
    try {
        for (const dir of fs.readdirSync(packagesDir)) {
            const pkgPath = path.join(packagesDir, dir);
            if (!fs.statSync(pkgPath).isDirectory())
                continue;
            const pkgJsonPath = path.join(pkgPath, 'package.json');
            if (!fs.existsSync(pkgJsonPath))
                continue;
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
                const name = pkg.name || dir;
                const testDir = path.join(pkgPath, '__tests__');
                const srcTestDir = path.join(pkgPath, 'src', '__tests__');
                const hasTests = fs.existsSync(testDir) || fs.existsSync(srcTestDir);
                let testCount = 0;
                if (hasTests) {
                    const td = fs.existsSync(testDir) ? testDir : srcTestDir;
                    testCount = fs.readdirSync(td).filter(f => f.endsWith('.ts') || f.endsWith('.js')).length;
                }
                results.push({ name, hasTests, testCount });
            }
            catch { /* skip invalid package.json */ }
        }
    }
    catch { /* skip unreadable dir */ }
    return results;
}
function syncRegistry(config) {
    const start = Date.now();
    const actions = [];
    const errors = [];
    try {
        if (!fs.existsSync(config.registryPath)) {
            errors.push(`Registry not found at ${config.registryPath}`);
            return { ok: false, actions, errors, durationMs: Date.now() - start };
        }
        const packages = scanPackages(config.packagesDir);
        const lines = readLines(config.registryPath);
        let changed = false;
        const untested = packages.filter(p => !p.hasTests);
        const untestedLine = untested.map(p => `\`${p.name}\``).join(', ');
        if (untested.length > 0) {
            const idx = findRegistryEntry(lines, 'packages with no tests');
            if (idx >= 0) {
                const newLine = `| | ${packages.length} packages | ${untested.length} without tests: ${untestedLine} |`;
                if (lines[idx] !== newLine) {
                    lines[idx] = newLine;
                    changed = true;
                    actions.push(`Updated package health: ${untested.length} untested`);
                }
            }
        }
        if (changed) {
            writeLines(config.registryPath, lines);
            actions.push(`Saved updated registry to ${config.registryPath}`);
        }
    }
    catch (_err) {
        errors.push(`Sync registry error: ${_err instanceof Error ? _err.message : String(_err)}`);
    }
    return { ok: errors.length === 0, actions, errors, durationMs: Date.now() - start };
}
//# sourceMappingURL=sync-registry.js.map