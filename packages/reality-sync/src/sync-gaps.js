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
exports.syncGaps = syncGaps;
const fs = __importStar(require("node:fs"));
function readLines(p) {
    return fs.readFileSync(p, 'utf-8').split('\n');
}
function writeLines(p, lines) {
    fs.writeFileSync(p, lines.join('\n'), 'utf-8');
}
function _updateGapStatus(lines, gapId, status) {
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (line.includes(`G${gapId} —`) || line.includes(`G${gapId} `)) {
            if (!line.includes('✅') && status === 'resolved') {
                lines[i] = line.replace(/^(#+.*?)(\n|$)/, `$1 ✅`);
                changed = true;
            }
            break;
        }
    }
    return changed;
}
function updateResolvedCount(lines) {
    let resolved = 0;
    for (const line of lines) {
        if (line.includes('✅ **RESOLVIDO**') || line.includes('✅ Resolvido'))
            resolved++;
    }
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const match = line.match(/\*\*Resolvidos?\*\*:\s*(\d+)/);
        if (match) {
            const current = parseInt(match[1] ?? '0', 10);
            if (current !== resolved) {
                lines[i] = line.replace(/\*\*Resolvidos?\*\*:\s*\d+/, `**Resolvidos**: ${resolved}`);
                return true;
            }
        }
    }
    return false;
}
function syncGaps(config) {
    const start = Date.now();
    const actions = [];
    const errors = [];
    try {
        const lines = readLines(config.gapsPath);
        let changed = false;
        if (updateResolvedCount(lines))
            changed = true;
        if (changed)
            writeLines(config.gapsPath, lines);
        return { ok: errors.length === 0, actions, errors, durationMs: Date.now() - start };
    }
    catch (_err) {
        return { ok: false, actions, errors: [String(_err)], durationMs: Date.now() - start };
    }
}
//# sourceMappingURL=sync-gaps.js.map