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
exports.syncManifest = syncManifest;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
function readLines(p) {
    return fs.readFileSync(p, 'utf-8').split('\n');
}
function writeLines(p, lines) {
    fs.writeFileSync(p, lines.join('\n'), 'utf-8');
}
function replaceTableRow(lines, prefix, newRow) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.startsWith(prefix)) {
            lines[i] = newRow;
            return i;
        }
    }
    return -1;
}
function countPackages(packagesDir) {
    try {
        return fs.readdirSync(packagesDir).filter(d => fs.statSync(path.join(packagesDir, d)).isDirectory()).length;
    }
    catch {
        return 0;
    }
}
function countTestFiles(root) {
    let count = 0;
    function walk(dir) {
        try {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist')
                    walk(full);
                else if (entry.isFile() && (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.ts')))
                    count++;
            }
        }
        catch { /* skip unreadable dirs */ }
    }
    walk(root);
    return count;
}
function syncManifest(config) {
    const start = Date.now();
    const actions = [];
    const errors = [];
    try {
        if (!fs.existsSync(config.manifestPath)) {
            errors.push(`Manifest not found at ${config.manifestPath}`);
            return { ok: false, actions, errors, durationMs: Date.now() - start };
        }
        const lines = readLines(config.manifestPath);
        let changed = false;
        const pkgCount = countPackages(config.packagesDir);
        const testCount = countTestFiles(config.workspaceRoot);
        if (pkgCount > 0) {
            const pkgRow = `| **Packages** | | ${pkgCount} packages in workspace |`;
            const found = replaceTableRow(lines, '| **Packages** |', pkgRow);
            if (found >= 0) {
                actions.push(`Updated package count to ${pkgCount}`);
                changed = true;
            }
        }
        if (testCount > 0) {
            const testRow = `| **Tests** | | ${testCount} test files found |`;
            const found = replaceTableRow(lines, '| **Tests** |', testRow);
            if (found >= 0) {
                actions.push(`Updated test count to ${testCount}`);
                changed = true;
            }
        }
        if (changed) {
            writeLines(config.manifestPath, lines);
            actions.push(`Saved updated manifest to ${config.manifestPath}`);
        }
    }
    catch (_err) {
        errors.push(`Sync manifest error: ${_err instanceof Error ? _err.message : String(_err)}`);
    }
    return { ok: errors.length === 0, actions, errors, durationMs: Date.now() - start };
}
//# sourceMappingURL=sync-manifest.js.map